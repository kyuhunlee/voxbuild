import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { SceneSchema, type CommandBatch, type Scene } from "../src/lib/schema";

type JsonObject = Record<string, unknown>;
type ResponseData = { status: number; payload: JsonObject; durationMs: number };
type CheckResult = { id: string; outcome: "passed" | "failed" | "blocked"; durationMs: number; issues: string[]; evidence?: JsonObject };
type Verification = { issues: string[]; evidence?: JsonObject };

const TIMEOUT_MS = 20_000;
const CHECK_IDS = [
  "owned-read", "owned-list", "foreign-read", "foreign-command", "invalid-schema",
  "out-of-bounds", "concurrent-duplicate", "reused-command-id", "concurrent-conflict", "canonical-winner",
] as const;

class BlockedError extends Error {}

function record(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
}
const issue = (condition: boolean, message: string) => condition ? [] : [message];
const equal = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

function required<T>(value: T | null, message: string): T {
  if (value === null) throw new Error(message);
  return value;
}

function parseScene(value: unknown): Scene {
  const result = SceneSchema.safeParse(value);
  // Do not print an unexpected response body: it might contain diagnostics or secrets.
  if (!result.success) throw new Error("The response did not contain a valid canonical scene.");
  return result.data;
}

function changedOnlyColor(before: Scene, after: Scene, objectId: string, color: string): string[] {
  const expected = before.objects.map((object) => object.id === objectId ? { ...object, color } : object);
  return [
    ...issue(after.id === before.id, "The scene ID changed."),
    ...issue(after.schemaVersion === before.schemaVersion, "The schema version changed."),
    ...issue(equal(after.room, before.room), "Unmentioned room properties changed."),
    ...issue(equal(after.objects, expected), "The result changed objects beyond the requested target color, or did not apply that color."),
  ];
}

/** Each client has an independent, private cookie jar. Cookies are never returned,
 * persisted to the report, printed, or forwarded across redirects. */
function createClient(base: URL) {
  const cookieJar = new Map<string, string>();
  return {
    hasCookie: () => cookieJar.size > 0,
    async request(path: string, body?: unknown): Promise<ResponseData> {
      const url = new URL(path, base);
      if (url.origin !== base.origin) throw new Error("A verification request attempted to leave BASE_URL.");
      const started = performance.now();
      let response: Response;
      try {
        response = await fetch(url, {
          method: body === undefined ? "GET" : "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: base.origin,
            ...(cookieJar.size ? { Cookie: [...cookieJar].map(([name, value]) => `${name}=${value}`).join("; ") } : {}),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
          redirect: "error",
          cache: "no-store",
        });
        for (const header of response.headers.getSetCookie()) {
          const pair = header.split(";", 1)[0];
          const separator = pair.indexOf("=");
          if (separator > 0) cookieJar.set(pair.slice(0, separator), pair.slice(separator + 1));
        }
        const payload = record(await response.json());
        if (!payload) throw new Error("NON_JSON_OBJECT");
        return { status: response.status, payload, durationMs: Math.round(performance.now() - started) };
      } catch (error) {
        if (error instanceof SyntaxError || (error instanceof Error && error.message === "NON_JSON_OBJECT")) {
          throw new BlockedError(`The ${path.split("?")[0]} response was not a JSON object. Use the public deployment or a reachable local server; deployment protection may block this check.`);
        }
        throw new BlockedError(`The ${path.split("?")[0]} request could not complete within the ${TIMEOUT_MS / 1000}-second limit or was blocked by the connection. No automatic retry was made; a timed-out write may have committed.`);
      }
    },
  };
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log([
      "Usage: BASE_URL=https://your-public-demo.vercel.app npx tsx scripts/verify-storage.ts",
      "PowerShell: $env:BASE_URL = 'https://your-public-demo.vercel.app'; npx tsx scripts/verify-storage.ts",
      "Optional STORAGE_REPORT_PATH overrides .local/evidence/storage-<timestamp>-<id>.json.",
      "Runs 10 storage/isolation/idempotency checks using two new anonymous sessions and one new studio.",
      "Makes no model calls. Never edits preexisting rooms. Leaves its own fixture for inspection.",
      "Requires live database capability; local sample mode cannot pass. Every request has a 20-second timeout.",
      "Exit codes: 0 passed; 1 semantic failure; 2 blocked by configuration, connectivity, or prerequisites.",
      "Cookies and session credentials stay in memory and are not included in output or reports.",
    ].join("\n"));
    return;
  }
  if (process.argv.slice(2).length) throw new Error("Unknown argument. Use --help for storage verification usage.");

  let base: URL;
  try { base = new URL(process.env.BASE_URL || "http://localhost:3000"); }
  catch { throw new Error("BASE_URL must be an HTTP(S) origin without credentials, path, query, or fragment."); }
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.pathname !== "/" || base.search || base.hash) {
    throw new Error("BASE_URL must be an HTTP(S) origin without credentials, path, query, or fragment.");
  }

  const runId = `storage-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const reportPath = resolve(process.env.STORAGE_REPORT_PATH || `.local/evidence/${runId}.json`);
  const results: CheckResult[] = [];
  let fixtureSceneId: string | null = null;
  let capabilities: { database: boolean; gateway: boolean; voice: boolean } | null = null;
  let prerequisiteReason: string | null = null;

  const finish = async () => {
    const passed = results.filter((result) => result.outcome === "passed").length;
    const failed = results.filter((result) => result.outcome === "failed").length;
    const blocked = results.filter((result) => result.outcome === "blocked").length;
    const status = failed ? "failed" : prerequisiteReason || blocked || passed !== CHECK_IDS.length ? "blocked" : "passed";
    const report = {
      runId, baseUrl: base.origin, status, reason: prerequisiteReason, capabilities, fixtureSceneId,
      checksPlanned: CHECK_IDS.length, checksRun: results.length, passed, failed, blocked,
      checksNotRun: CHECK_IDS.filter((id) => !results.some((result) => result.id === id)),
      notes: [
        "Uses two fresh, independent anonymous sessions and one studio created specifically by this run. No preexisting scene is modified.",
        "No AI/model endpoint is called. This verifies live HTTP/database semantics, not voice, model quality, rendering, or physical fit.",
        "Canonical reads verify saved state; concurrent requests have identical or deliberately competing revisions as specified per check.",
        "The fixture is intentionally retained for inspection; there is no delete API. Cookies are not written to this report, so the runner's ownership session cannot be resumed from the evidence file.",
        "No automatic retries are made. A timed-out write may have committed; inspect the fixture scene ID before rerunning.",
      ],
      results,
    };
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, JSON.stringify(report, null, 2), { encoding: "utf8", flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ ...report, notes: undefined, results: undefined, reportPath }, null, 2));
    process.exitCode = status === "passed" ? 0 : status === "failed" ? 1 : 2;
  };

  async function check(id: typeof CHECK_IDS[number], verify: () => Promise<Verification>): Promise<boolean> {
    const started = performance.now();
    let result: CheckResult;
    try {
      const verified = await verify();
      result = { id, outcome: verified.issues.length ? "failed" : "passed", durationMs: Math.round(performance.now() - started), ...verified };
    } catch (error) {
      result = { id, outcome: error instanceof BlockedError ? "blocked" : "failed", durationMs: Math.round(performance.now() - started), issues: [error instanceof Error ? error.message : "Unexpected verification failure."] };
    }
    results.push(result);
    console.error(`${result.outcome.toUpperCase()} ${id}${result.issues.length ? `: ${result.issues.join(" ")}` : ""}`);
    return result.outcome === "passed";
  }

  const owner = createClient(base);
  const foreign = createClient(base);
  try {
    const ownerSession = await owner.request("/api/session", {});
    const available = record(ownerSession.payload.capabilities);
    capabilities = available ? { database: available.database === true, gateway: available.gateway === true, voice: available.voice === true } : null;
    if (ownerSession.status !== 200 || !capabilities?.database || typeof ownerSession.payload.sessionId !== "string" || !owner.hasCookie()) {
      throw new BlockedError(`Live database capability and an anonymous session are required (session HTTP ${ownerSession.status}). Local sample mode cannot verify Atlas persistence.`);
    }
    const foreignSession = await foreign.request("/api/session", {});
    if (foreignSession.status !== 200 || record(foreignSession.payload.capabilities)?.database !== true || typeof foreignSession.payload.sessionId !== "string" || !foreign.hasCookie()) {
      throw new BlockedError(`A second independent anonymous session could not be initialized (HTTP ${foreignSession.status}).`);
    }
    if (ownerSession.payload.sessionId === foreignSession.payload.sessionId) {
      results.push({ id: "foreign-read", outcome: "failed", durationMs: 0, issues: ["Two fresh clients received the same anonymous session ID; ownership isolation cannot be verified."] });
      await finish(); return;
    }

    // Only this freshly created scene ID is used by every write below.
    const created = await owner.request("/api/scenes", { preset: "studio" });
    if (created.status !== 201) throw new BlockedError(`The new storage fixture could not be created (HTTP ${created.status}). No existing scene was used.`);
    const baseline = parseScene(created.payload.scene);
    fixtureSceneId = baseline.id;
    const scenePath = `/api/scenes?id=${encodeURIComponent(baseline.id)}`;
    const sofa = baseline.objects.find((object) => object.id === "studio-sofa" && object.sku === "nook-sofa");
    if (!sofa || baseline.revision !== 0) {
      results.push({ id: "owned-read", outcome: "failed", durationMs: 0, issues: ["The new studio fixture did not have the expected sofa and initial revision zero."] });
      await finish(); return;
    }
    const readOwn = async () => {
      const response = await owner.request(scenePath);
      if (response.status !== 200) throw new Error(`Canonical owned-scene read returned HTTP ${response.status}; expected 200.`);
      return parseScene(response.payload.scene);
    };
    const batch = (color: string, revision: number, commandId: string = randomUUID()): CommandBatch => ({
      sceneId: baseline.id, commandId, expectedRevision: revision, operations: [{ type: "recolor", objectId: sofa.id, color }],
    });

    if (!await check("owned-read", async () => {
      const after = await readOwn();
      return { issues: issue(equal(after, baseline), "The owned-scene read did not exactly match the created scene."), evidence: { revision: after.revision, objects: after.objects.length } };
    })) { await finish(); return; }

    if (!await check("owned-list", async () => {
      const listed = await owner.request("/api/scenes");
      const scenes = Array.isArray(listed.payload.scenes) ? listed.payload.scenes.map(parseScene) : [];
      const matching = scenes.filter((scene) => scene.id === baseline.id);
      return { issues: [
        ...issue(listed.status === 200, `Owned-scene list returned HTTP ${listed.status}; expected 200.`),
        ...issue(matching.length === 1 && equal(matching[0], baseline), "The owned-scene list did not contain exactly one matching canonical fixture."),
      ], evidence: { httpStatus: listed.status, fixtureMatches: matching.length } };
    })) { await finish(); return; }

    if (!await check("foreign-read", async () => {
      const [response, listed] = await Promise.all([foreign.request(scenePath), foreign.request("/api/scenes")]);
      const foreignScenes = Array.isArray(listed.payload.scenes) ? listed.payload.scenes : [];
      return { issues: [
        ...issue(response.status === 404, `Foreign read returned HTTP ${response.status}; expected 404.`),
        ...issue(response.payload.scene === undefined, "Foreign read disclosed a scene body."),
        ...issue(listed.status === 200 && Array.isArray(listed.payload.scenes), "The independent session could not read its own scene list."),
        ...issue(!foreignScenes.some((scene) => record(scene)?.id === baseline.id), "The owner's fixture was disclosed in the foreign session's scene list."),
      ], evidence: { foreignReadStatus: response.status, foreignListStatus: listed.status, fixtureDisclosed: foreignScenes.some((scene) => record(scene)?.id === baseline.id) } };
    })) { await finish(); return; }

    if (!await check("foreign-command", async () => {
      const response = await foreign.request("/api/commands", batch("#687761", baseline.revision));
      const after = await readOwn();
      return { issues: [
        ...issue(response.status === 404, `Foreign command returned HTTP ${response.status}; expected 404.`),
        ...issue(response.payload.scene === undefined, "Foreign command disclosed a scene body."),
        ...issue(equal(after, baseline), "A foreign command changed the owner's saved scene."),
      ], evidence: { httpStatus: response.status, revision: after.revision, unchanged: equal(after, baseline) } };
    })) { await finish(); return; }

    if (!await check("invalid-schema", async () => {
      const response = await owner.request("/api/commands", { ...batch("#687761", baseline.revision), operations: [{ type: "move", objectId: sofa.id, position: [0, 0] }] });
      const after = await readOwn();
      return { issues: [
        ...issue(response.status === 400, `Invalid schema returned HTTP ${response.status}; expected 400.`),
        ...issue(equal(after, baseline), "A schema-invalid command changed saved state."),
      ], evidence: { httpStatus: response.status, errorCode: typeof response.payload.code === "string" ? response.payload.code : null, unchanged: equal(after, baseline) } };
    })) { await finish(); return; }

    if (!await check("out-of-bounds", async () => {
      const response = await owner.request("/api/commands", { ...batch("#687761", baseline.revision), operations: [
        { type: "recolor", objectId: sofa.id, color: "#687761" },
        { type: "move", objectId: sofa.id, position: [100, 0, 0] },
      ] });
      const after = await readOwn();
      return { issues: [
        ...issue(response.status === 422, `Out-of-bounds command returned HTTP ${response.status}; expected 422.`),
        ...issue(response.payload.code === "OUT_OF_BOUNDS", "The command was not rejected by the room-bounds validator."),
        ...issue(equal(after, baseline), "A rejected batch partially applied its valid recolor before the out-of-bounds move."),
      ], evidence: { httpStatus: response.status, errorCode: typeof response.payload.code === "string" ? response.payload.code : null, unchanged: equal(after, baseline) } };
    })) { await finish(); return; }

    const identical = batch("#687761", baseline.revision);
    let duplicateCanonical: Scene | null = null;
    if (!await check("concurrent-duplicate", async () => {
      const responses = await Promise.all([owner.request("/api/commands", identical), owner.request("/api/commands", identical)]);
      const after = await readOwn();
      const returnedScenes = responses.filter((response) => response.status === 200).map((response) => parseScene(response.payload.scene));
      const duplicateFlags = responses.map((response) => response.payload.duplicate);
      duplicateCanonical = after;
      return { issues: [
        ...issue(responses.every((response) => response.status === 200), "Both identical concurrent requests must return 200."),
        ...issue(duplicateFlags.filter((flag) => flag === true).length === 1 && duplicateFlags.filter((flag) => flag === false).length === 1, "Exactly one concurrent response must be a duplicate receipt and one a new commit."),
        ...issue(after.revision === baseline.revision + 1, "Identical concurrent requests advanced the revision more or less than once."),
        ...changedOnlyColor(baseline, after, sofa.id, "#687761"),
        ...issue(returnedScenes.length === 2 && returnedScenes.every((returned) => equal(returned, after)), "A duplicate/new response differs from the canonical persisted scene."),
      ], evidence: { commandId: identical.commandId, statuses: responses.map((response) => response.status), duplicateFlags, revisionBefore: baseline.revision, revisionAfter: after.revision, targetColor: after.objects.find((object) => object.id === sofa.id)?.color } };
    })) { await finish(); return; }

    const afterDuplicate = required<Scene>(duplicateCanonical, "The duplicate-request check did not return a canonical scene.");
    if (!await check("reused-command-id", async () => {
      const response = await owner.request("/api/commands", batch("#446a87", baseline.revision, identical.commandId));
      const after = await readOwn();
      return { issues: [
        ...issue(response.status === 409, `Reusing the command ID with a different payload returned HTTP ${response.status}; expected 409.`),
        ...issue(response.payload.code === "COMMAND_ID_REUSED", "The mismatch was not rejected as command-ID reuse."),
        ...issue(equal(after, afterDuplicate), "Reusing a command ID with a different payload changed saved state."),
      ], evidence: { commandId: identical.commandId, httpStatus: response.status, errorCode: typeof response.payload.code === "string" ? response.payload.code : null, revision: after.revision, unchanged: equal(after, afterDuplicate) } };
    })) { await finish(); return; }

    const contenders = [batch("#446a87", afterDuplicate.revision), batch("#e7dfce", afterDuplicate.revision)];
    let winner: { commandId: string; color: string; scene: Scene } | null = null;
    if (!await check("concurrent-conflict", async () => {
      const responses = await Promise.all(contenders.map((command) => owner.request("/api/commands", command)));
      const winningIndex = responses.findIndex((response) => response.status === 200);
      if (winningIndex >= 0) {
        const winningCommand = contenders[winningIndex];
        const operation = winningCommand.operations[0];
        winner = { commandId: winningCommand.commandId, color: operation.type === "recolor" ? operation.color : "", scene: parseScene(responses[winningIndex].payload.scene) };
      }
      const winningResponse = winningIndex >= 0 ? responses[winningIndex] : null;
      return { issues: [
        ...issue(responses.filter((response) => response.status === 200).length === 1 && responses.filter((response) => response.status === 409).length === 1, "Two different commands with the same revision must produce exactly one 200 and one 409."),
        ...issue(winningResponse?.payload.duplicate === false, "The winning distinct command must be a new commit, not a duplicate."),
        ...issue(responses.filter((response) => response.status === 409).every((response) => response.payload.code === "REVISION_CONFLICT"), "The losing command was not rejected as a revision conflict."),
        ...(winner ? [
          ...issue(winner.scene.revision === afterDuplicate.revision + 1, "The winner did not advance the revision exactly once."),
          ...changedOnlyColor(afterDuplicate, winner.scene, sofa.id, winner.color),
        ] : ["No valid winning response was returned."]),
      ], evidence: { commandIds: contenders.map((command) => command.commandId), statuses: responses.map((response) => response.status), expectedRevision: afterDuplicate.revision, winnerCommandId: winner?.commandId ?? null } };
    })) { await finish(); return; }

    const acceptedWinner = required<{ commandId: string; color: string; scene: Scene }>(winner, "The concurrency check did not return a winning command.");
    await check("canonical-winner", async () => {
      const final = await readOwn();
      return { issues: [
        ...issue(equal(final, acceptedWinner.scene), "Canonical reread differs from the winning response."),
        ...issue(final.revision === baseline.revision + 2, "The complete run must have committed exactly two scene revisions."),
        ...changedOnlyColor(baseline, final, sofa.id, acceptedWinner.color),
        ...issue(final.objects.length === baseline.objects.length, "The verification created or deleted an unrequested object."),
      ], evidence: { winningCommandId: acceptedWinner.commandId, winningColor: acceptedWinner.color, finalRevision: final.revision, preservedObjects: baseline.objects.length - 1, preservedRoom: equal(final.room, baseline.room), matchesWinningResponse: equal(final, acceptedWinner.scene) } };
    });
  } catch (error) {
    if (error instanceof BlockedError) prerequisiteReason = error.message;
    else results.push({ id: results.length ? "canonical-winner" : "owned-read", outcome: "failed", durationMs: 0, issues: [error instanceof Error ? error.message : "Unexpected verification failure."] });
  }
  await finish();
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Storage verification could not start.");
  process.exitCode = 2;
});

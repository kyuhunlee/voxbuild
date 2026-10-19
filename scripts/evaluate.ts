import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { SceneSchema, type Scene, type SceneObject } from "../src/lib/schema";

type EvaluationCase = {
  id: string;
  prompt: string;
  unchanged?: boolean;
  check: (before: Scene, after: Scene) => string[];
};
type JsonObject = Record<string, unknown>;

const object = (scene: Scene, id: string) => scene.objects.find((item) => item.id === id);
const near = (actual: number, expected: number) => Math.abs(actual - expected) < 0.025;
const issue = (condition: boolean, message: string) => condition ? [] : [message];
const unchangedExcept = (before: Scene, after: Scene, ids: string[]) => before.objects
  .filter((item) => !ids.includes(item.id))
  .flatMap((item) => issue(JSON.stringify(item) === JSON.stringify(object(after, item.id)), `Unmentioned object ${item.id} changed.`));

function edit(id: string, prompt: string, target: string, allowed: (keyof SceneObject)[], check: (item: SceneObject | undefined, before: Scene) => boolean): EvaluationCase {
  return { id, prompt, check: (before, after) => [
    ...issue(after.objects.length === before.objects.length, "An edit added or removed an object."),
    ...issue(check(object(after, target), before), "The requested property did not match."),
    ...Object.keys(object(before, target)!).filter((key) => !allowed.includes(key as keyof SceneObject)).flatMap((key) => issue(JSON.stringify(object(before, target)?.[key as keyof SceneObject]) === JSON.stringify(object(after, target)?.[key as keyof SceneObject]), `An unrequested ${key} property changed on ${target}.`)),
    ...unchangedExcept(before, after, [target]),
  ] };
}

export const CASES: EvaluationCase[] = [
  edit("sofa-sage", "Make the sofa sage green.", "studio-sofa", ["color"], (item) => item?.color === "#687761"),
  edit("sofa-blue", "Change the sofa upholstery to blue.", "studio-sofa", ["color"], (item) => item?.color === "#446a87"),
  edit("chair-left", "Move the lounge chair exactly half a meter to the left. Keep its other coordinates unchanged.", "studio-chair", ["position"], (item, before) => Boolean(item && near(item.position[0], object(before, "studio-chair")!.position[0] - 0.5) && item.position[1] === 0 && near(item.position[2], object(before, "studio-chair")!.position[2]))),
  edit("sofa-window", "Move the sofa exactly 0.2 meters toward the back window, in negative Z. Keep its X coordinate unchanged.", "studio-sofa", ["position"], (item, before) => Boolean(item && near(item.position[2], object(before, "studio-sofa")!.position[2] - 0.2) && item.position[1] === 0 && near(item.position[0], object(before, "studio-sofa")!.position[0]))),
  edit("chair-rotation", "Set the existing lounge chair's rotation to 90 degrees around the vertical axis.", "studio-chair", ["rotation"], (item) => Boolean(item && near(item.rotation, Math.PI / 2))),
  { id: "remove-lamp", prompt: "Remove the floor lamp.", check: (before, after) => [
    ...issue(!object(after, "studio-lamp") && after.objects.length === before.objects.length - 1, "The lamp was not removed exactly once."),
    ...unchangedExcept(before, after, ["studio-lamp"]),
  ] },
  { id: "add-desk", prompt: "Add one Line writing desk at x=0, y=0, z=1.5 meters, with zero rotation and its default light oak finish. Keep all existing furniture.", check: (before, after) => {
    const added = after.objects.filter((item) => !before.objects.some((old) => old.id === item.id));
    return [...issue(added.length === 1 && added[0].sku === "line-desk" && added[0].color === "#d8bc91" && near(added[0].position[0], 0) && added[0].position[1] === 0 && near(added[0].position[2], 1.5) && near(added[0].rotation, 0), "The desk was not added with the requested catalog properties."), ...unchangedExcept(before, after, [])];
  } },
  { id: "add-chair", prompt: "Add one additional sage Arc lounge chair at x=1.6, y=0, z=0.8 meters with zero rotation. Keep the existing chair and all other furniture.", check: (before, after) => {
    const added = after.objects.filter((item) => !before.objects.some((old) => old.id === item.id));
    return [...issue(added.length === 1 && added[0].sku === "arc-chair" && added[0].color === "#687761" && near(added[0].position[0], 1.6) && added[0].position[1] === 0 && near(added[0].position[2], 0.8) && near(added[0].rotation, 0), "The additional chair was not added as requested."), ...unchangedExcept(before, after, [])];
  } },
  edit("plant-pot", "Change the olive plant's pot to cream.", "studio-plant", ["color"], (item) => item?.color === "#e7dfce"),
  edit("rug-sage", "Make the area rug sage.", "studio-rug", ["color"], (item) => item?.color === "#929b82"),
  edit("table-position", "Move the existing coffee table to x=0.2, y=0, z=-0.45 meters.", "studio-table", ["position"], (item) => Boolean(item && near(item.position[0], 0.2) && item.position[1] === 0 && near(item.position[2], -0.45))),
  { id: "two-edits", prompt: "Make the sofa sage and remove the existing lounge chair. Leave everything else unchanged.", check: (before, after) => [
    ...issue(object(after, "studio-sofa")?.color === "#687761" && !object(after, "studio-chair") && after.objects.length === before.objects.length - 1, "The two requested edits were not both applied."),
    ...issue(JSON.stringify(object(after, "studio-sofa")) === JSON.stringify({ ...object(before, "studio-sofa"), color: "#687761" }), "The sofa changed beyond the requested color."),
    ...unchangedExcept(before, after, ["studio-sofa", "studio-chair"]),
  ] },
  { id: "unknown-sku", prompt: "Add catalog SKU 'unknown-hover-bed-999' exactly. Do not substitute another product; if this exact SKU is unavailable, leave the room unchanged.", unchanged: true, check: (before, after) => issue(JSON.stringify(before) === JSON.stringify(after), "Unknown SKU request changed the scene.") },
  { id: "out-of-bounds", prompt: "Move the sofa to x=100, y=0, z=0 meters exactly. Do not clamp or substitute another position; if this is invalid, leave the room unchanged.", unchanged: true, check: (before, after) => issue(JSON.stringify(before) === JSON.stringify(after), "Out-of-bounds request changed the scene.") },
];

function record(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
}
function percentile(values: number[], fraction: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log("Usage: BASE_URL=https://your-public-demo.vercel.app npx tsx scripts/evaluate.ts\nOptional EVAL_REPORT_PATH=artifacts/eval.json\nUse --list to inspect the 14 fixtures without network requests.\nA live run creates isolated scenes, invokes billable AI, and leaves its own fixture scenes for inspection.");
    return;
  }
  if (process.argv.includes("--list")) { console.log(JSON.stringify(CASES.map(({ id, prompt, unchanged }) => ({ id, prompt, expectsUnchanged: Boolean(unchanged) })), null, 2)); return; }

  const base = new URL(process.env.BASE_URL || "http://localhost:3000");
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.pathname !== "/" || base.search || base.hash) throw new Error("BASE_URL must be an HTTP(S) origin without credentials, path, query, or fragment.");
  const runId = `eval-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const reportPath = resolve(process.env.EVAL_REPORT_PATH || `artifacts/${runId}.json`);
  const cookieJar = new Map<string, string>();
  const request = async (path: string, body?: JsonObject) => {
    const started = performance.now();
    const response = await fetch(new URL(path, base), {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", Origin: base.origin, ...(cookieJar.size ? { Cookie: [...cookieJar].map(([name, value]) => `${name}=${value}`).join("; ") } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(65_000),
      redirect: "error",
    });
    for (const header of response.headers.getSetCookie()) {
      const pair = header.split(";", 1)[0];
      const separator = pair.indexOf("=");
      if (separator > 0) cookieJar.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    const payload = record(await response.json().catch(() => null));
    if (!payload) throw new Error(`HTTP ${response.status} from ${path} was not a JSON object. Use a reachable public demo or your local server.`);
    return { status: response.status, payload, durationMs: Math.round(performance.now() - started) };
  };

  const session = await request("/api/session", {});
  const capabilities = record(session.payload.capabilities);
  if (session.status !== 200 || !capabilities?.database || !capabilities.gateway || !session.payload.sessionId || !cookieJar.size) {
    const report = { runId, baseUrl: base.origin, status: "blocked", reason: "A live database, configured Gateway, and anonymous session are required. Sample mode cannot pass this evaluation.", httpStatus: session.status, capabilities, serverError: session.payload.error ?? null, casesRun: 0 };
    await mkdir(dirname(reportPath), { recursive: true }); await writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, reportPath }, null, 2)); process.exitCode = 2; return;
  }

  const results: JsonObject[] = [];
  for (const evaluation of CASES) {
    const started = performance.now();
    const commandId = randomUUID();
    let sceneId: string | null = null;
    try {
      // Each fixture is newly created under this runner's fresh cookie. Existing designs are never enumerated or modified.
      const created = await request("/api/scenes", { preset: "studio" });
      if (created.status !== 201) throw new Error(`Fixture creation failed: HTTP ${created.status}; ${String(created.payload.error ?? "unknown error")}`);
      const before = SceneSchema.parse(created.payload.scene); sceneId = before.id;
      const result = await request("/api/scene-agent", { sceneId, commandId, expectedRevision: before.revision, prompt: evaluation.prompt });
      const reread = await request(`/api/scenes?id=${encodeURIComponent(sceneId)}`);
      if (reread.status !== 200) throw new Error(`Persistence verification failed: HTTP ${reread.status}.`);
      const after = SceneSchema.parse(reread.payload.scene);
      const issues = [
        ...issue(evaluation.unchanged ? [200, 400, 422].includes(result.status) : result.status === 200, `Unexpected agent HTTP status ${result.status}.`),
        ...evaluation.check(before, after),
        ...issue(after.revision === before.revision + (evaluation.unchanged ? 0 : 1), "Revision did not match one atomic command."),
      ];
      if (result.status === 200) issues.push(...issue(JSON.stringify(result.payload.scene) === JSON.stringify(after), "The response scene differs from the subsequent database read."));
      const telemetry = record(result.payload.telemetry);
      results.push({ id: evaluation.id, prompt: evaluation.prompt, sceneId, commandId, passed: issues.length === 0, issues, httpStatus: result.status, durationMs: result.durationMs, fixtureAndVerificationMs: Math.round(performance.now() - started), revision: after.revision, message: result.payload.message ?? result.payload.error ?? null, telemetry: telemetry ?? null });
      console.error(`${issues.length ? "FAIL" : "PASS"} ${evaluation.id} (${result.durationMs} ms)${issues.length ? `: ${issues.join(" ")}` : ""}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected evaluation error.";
      results.push({ id: evaluation.id, prompt: evaluation.prompt, sceneId, commandId, passed: false, issues: [message], fixtureAndVerificationMs: Math.round(performance.now() - started), telemetry: null });
      console.error(`FAIL ${evaluation.id}: ${message}`);
    }
  }

  const passed = results.filter((item) => item.passed).length;
  const durations = results.map((item) => item.durationMs).filter((value): value is number => typeof value === "number");
  const usages = results.map((item) => record(record(item.telemetry)?.usage)).filter((item): item is JsonObject => Boolean(item));
  const inputTokens = usages.map((usage) => usage.inputTokens).filter((value): value is number => typeof value === "number");
  const outputTokens = usages.map((usage) => usage.outputTokens).filter((value): value is number => typeof value === "number");
  const costs = results.map((item) => record(record(item.telemetry)?.gateway)?.cost).filter((value): value is number | string => (typeof value === "number" || (typeof value === "string" && value.trim().length > 0)) && Number.isFinite(Number(value)));
  const report = {
    runId, baseUrl: base.origin, status: passed === CASES.length ? "passed" : "failed", casesRun: results.length, passed, failed: results.length - passed,
    successRate: passed / CASES.length,
    latencyMs: { p50: percentile(durations, 0.5), p95: percentile(durations, 0.95), samples: durations.length },
    returnedUsage: { requestsWithUsage: usages.length, inputTokenCoverage: inputTokens.length, outputTokenCoverage: outputTokens.length, inputTokens: inputTokens.length ? inputTokens.reduce((sum, value) => sum + value, 0) : null, outputTokens: outputTokens.length ? outputTokens.reduce((sum, value) => sum + value, 0) : null },
    returnedCost: { requestsWithCost: costs.length, sum: costs.length ? costs.reduce<number>((sum, cost) => sum + Number(cost), 0) : null, note: "Only returned Gateway costs are included. Missing or failed-request cost is unknown; this is not total account spend." },
    notes: ["One new anonymous session and one fresh studio per case; fixture scene IDs are retained below.", "Tests check semantic results and a subsequent persisted read. They do not certify visual quality, real furniture fit, voice recognition, live fallback, or browser interaction.", "No retries are automatic; a timeout may have committed. Inspect the recorded scene ID before retrying."],
    results,
  };
  await mkdir(dirname(reportPath), { recursive: true }); await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, results: undefined, reportPath }, null, 2));
  if (passed !== CASES.length) process.exitCode = 1;
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : "Evaluation failed."); process.exitCode = 2; });

"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Activity, AlertCircle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Box, Check, ChevronDown, ChevronRight, Cloud, Code2, Database, Grid2X2, Layers, LoaderCircle, Maximize2, Mic, MicOff, MousePointer2, PanelLeft, Plus, RefreshCw, RotateCcw, RotateCw, Ruler, Search, Send, SlidersHorizontal, Sparkles, Trash2, X } from "lucide-react";
import { CATALOG, getCatalogItem } from "@/lib/catalog-data";
import { createScene, PRESETS, type PresetId } from "@/lib/presets";
import { applyOperations } from "@/lib/scene-engine";
import { SceneSchema, type CatalogItem, type Operation, type Scene, type SceneObject } from "@/lib/schema";
import { useVoice, type VoiceEvent } from "@/hooks/useVoice";

const RoomCanvas = dynamic(() => import("./canvas/RoomCanvas"), { ssr: false, loading: () => <div className="canvas-loading"><Box size={28} strokeWidth={1.25} /><span>Opening your room…</span></div> });

type Capabilities = { database: boolean; gateway: boolean; voice: boolean };
type WorkspaceMode = "loading" | "sample" | "live" | "error";
type Notice = { id: number; message: string; kind: "success" | "error" | "info" };
type ActivityEntry = { id: string; time: string; title: string; source: string; status: "success" | "error" | "info"; detail?: unknown; duration?: number };
type CommandResult = { scene: Scene; message?: string; duplicate?: boolean; operations?: Operation[]; telemetry?: unknown };

const EMPTY_CAPABILITIES: Capabilities = { database: false, gateway: false, voice: false };
const PROMPTS = ["Make the sofa sage", "Add a floor lamp", "Move the sofa left"];
const COLOR_NAMES: Record<string, string> = {
  "#cc7656": "Terracotta", "#e7dfce": "Cream", "#687761": "Sage", "#446a87": "Blue", "#404448": "Charcoal", "#aa7953": "Oak", "#d8bc91": "Light oak", "#584336": "Walnut", "#c4a267": "Brass", "#b87858": "Terracotta", "#e5d6ba": "Natural", "#929b82": "Sage", "#b97861": "Clay", "#69828c": "Blue",
};

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...options, headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers } });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : data?.error?.message ?? data?.message ?? `The request could not finish (${response.status}). Please try again.`;
    throw new Error(message);
  }
  return data as T;
}

function estimateBounds(object: SceneObject) {
  const item = getCatalogItem(object.sku);
  if (!item) return null;
  const [w, , d] = item.dimensions;
  const c = Math.abs(Math.cos(object.rotation));
  const s = Math.abs(Math.sin(object.rotation));
  return { halfWidth: (w * c + d * s) / 2, halfDepth: (w * s + d * c) / 2 };
}

function findPlacement(scene: Scene, item: CatalogItem): [number, number, number] {
  const [w, h, d] = item.dimensions;
  if (w > scene.room.width || d > scene.room.depth || h > scene.room.height) throw new Error(`${item.name} does not fit in this room.`);
  if (item.category === "rug") return [0, 0, 0];
  const positions: [number, number, number][] = [];
  for (let x = -scene.room.width / 2 + w / 2 + 0.08; x <= scene.room.width / 2 - w / 2 - 0.07; x += 0.25) {
    for (let z = -scene.room.depth / 2 + d / 2 + 0.08; z <= scene.room.depth / 2 - d / 2 - 0.07; z += 0.25) positions.push([Math.round(x * 100) / 100, 0, Math.round(z * 100) / 100]);
  }
  positions.sort((a, b) => Math.hypot(a[0] - 1.25, a[2] - 1.1) - Math.hypot(b[0] - 1.25, b[2] - 1.1));
  const free = positions.find(([x, , z]) => scene.objects.every((object) => {
    if (getCatalogItem(object.sku)?.category === "rug") return true;
    const bounds = estimateBounds(object);
    return !bounds || Math.abs(x - object.position[0]) >= w / 2 + bounds.halfWidth + 0.07 || Math.abs(z - object.position[2]) >= d / 2 + bounds.halfDepth + 0.07;
  }));
  if (!free) throw new Error(`There isn’t a clear spot for another ${item.name.toLowerCase()}. Move or remove a piece first.`);
  return free;
}

function FurnitureIllustration({ category, color }: Pick<CatalogItem, "category"> & { color: string }) {
  return <svg viewBox="0 0 110 72" fill="none" aria-hidden="true" className="furniture-illustration">
    <ellipse cx="55" cy="60" rx={category === "lamp" || category === "plant" ? 20 : 39} ry="5" fill="black" opacity=".18" />
    {category === "sofa" && <>
      <path d="M21 46H88V60H84V51H27V60H23L21 46Z" fill="#74533e" />
      <rect x="22" y="17" width="66" height="34" rx="7" fill={color} />
      <rect x="27" y="20" width="26" height="25" rx="5" fill="white" fillOpacity=".1" /><rect x="56" y="20" width="26" height="25" rx="5" fill="white" fillOpacity=".1" />
      <rect x="20" y="39" width="70" height="15" rx="4" fill={color} /><path d="M25 42H85" stroke="black" strokeOpacity=".15" /><path d="M55 42V50" stroke="black" strokeOpacity=".16" />
      <rect x="15" y="32" width="12" height="23" rx="4" fill={color} /><rect x="83" y="32" width="12" height="23" rx="4" fill={color} />
      <rect x="30" y="28" width="13" height="15" rx="3" transform="rotate(-10 30 28)" fill="#e2d7c3" />
    </>}
    {category === "table" && <>
      <path d="M27 36L29 60M82 36L80 60M39 31L39 51M72 31L72 51" stroke="#7b583e" strokeWidth="5" />
      <path d="M18 31C18 24 34 20 55 20C76 20 92 24 92 31V36C92 43 18 43 18 36V31Z" fill={color} /><ellipse cx="55" cy="30" rx="37" ry="10" fill="white" fillOpacity=".12" />
      <path d="M40 27L58 26L65 31L46 33Z" fill="#e4dac5" /><path d="M40 30L46 35L65 33" stroke="#82907c" strokeWidth="3" />
    </>}
    {category === "chair" && <>
      <path d="M34 40L29 61M77 40L82 61M40 33L39 54M70 33L71 54" stroke="#926f4f" strokeWidth="4" />
      <path d="M30 21C30 15 41 13 55 13C69 13 80 15 80 21L76 39H34L30 21Z" fill={color} /><path d="M35 20C45 17 65 17 75 20" stroke="white" strokeOpacity=".15" strokeWidth="3" />
      <path d="M31 39C31 33 79 33 79 39V46C79 52 31 52 31 46V39Z" fill={color} /><ellipse cx="55" cy="39" rx="24" ry="6" fill="white" fillOpacity=".13" />
    </>}
    {category === "lamp" && <>
      <ellipse cx="55" cy="60" rx="16" ry="3" fill={color} /><path d="M55 22V58" stroke={color} strokeWidth="3" /><path d="M43 10H67L77 33C68 39 42 39 33 33L43 10Z" fill="#e8deca" /><ellipse cx="55" cy="33" rx="22" ry="4" fill="#c3ad85" /><ellipse cx="55" cy="11" rx="12" ry="2" fill="#f3ead9" />
    </>}
    {category === "plant" && <>
      <path d="M54 46L51 16M55 40L67 21M53 36L35 24M54 29L68 10" stroke="#778a58" strokeWidth="2" />
      <ellipse cx="44" cy="17" rx="6" ry="12" transform="rotate(-36 44 17)" fill="#7f9261" /><ellipse cx="67" cy="22" rx="7" ry="12" transform="rotate(37 67 22)" fill="#607c4d" /><ellipse cx="36" cy="27" rx="6" ry="11" transform="rotate(-60 36 27)" fill="#597346" /><ellipse cx="62" cy="10" rx="5" ry="10" transform="rotate(40 62 10)" fill="#829762" />
      <path d="M39 42H70L65 62C63 66 47 66 45 62L39 42Z" fill={color} /><ellipse cx="54.5" cy="42" rx="15.5" ry="4" fill="#9b674e" /><ellipse cx="54.5" cy="42" rx="12" ry="2.5" fill="#554333" />
    </>}
    {category === "rug" && <>
      <path d="M13 43L65 19L99 39L47 64L13 43Z" fill={color} /><path d="M24 43L64 25L88 39L48 58L24 43Z" stroke="#917e65" strokeWidth="1" opacity=".5" /><path d="M27 40L51 55M34 37L58 52M41 34L65 49M48 31L72 46M55 28L79 43" stroke="#a2947b" opacity=".35" />
      <path d="M13 43L9 46M19 47L15 50M25 50L21 53M31 54L27 57M37 57L33 60M43 61L39 64" stroke={color} strokeWidth="2" />
    </>}
    {category === "desk" && <>
      <path d="M22 33V62M86 33V62M31 27V51M77 27V51" stroke="#77766c" strokeWidth="3" /><path d="M17 31L76 22L94 32L35 42L17 35V31Z" fill={color} /><path d="M17 31L76 22L94 32L35 38L17 31Z" fill="white" fillOpacity=".15" />
      <path d="M37 27L56 25L60 33L41 35L37 27Z" fill="#a9adab" /><path d="M36 11L56 9L58 27L38 29L36 11Z" fill="#464d4a" /><path d="M39 13L54 12L55 24L40 26L39 13Z" fill="#9cafaa" />
    </>}
  </svg>;
}

class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="canvas-loading canvas-failed"><Box size={34} strokeWidth={1.3} /><strong>The 3D preview couldn’t open</strong><p>Enable WebGL in your browser and reload. You can still edit furniture with the side panels.</p><button className="button" onClick={() => window.location.reload()}><RefreshCw size={14} /> Reload preview</button></div>;
    return this.props.children;
  }
}

export default function VoxBuildApp() {
  const [scene, setScene] = useState<Scene>(() => createScene("sample-preview", "studio"));
  const sceneRef = useRef(scene);
  const [mode, setMode] = useState<WorkspaceMode>("loading");
  const modeRef = useRef<WorkspaceMode>("loading");
  const [capabilities, setCapabilities] = useState<Capabilities>(EMPTY_CAPABILITIES);
  const [preset, setPreset] = useState<PresetId>("studio");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"perspective" | "top">("perspective");
  const [showDimensions, setShowDimensions] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [architectureOpen, setArchitectureOpen] = useState(false);
  const [testFallback, setTestFallback] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(0);
  const inFlight = useRef(false);
  const noticeCounter = useRef(0);

  const notify = useCallback((message: string, kind: Notice["kind"] = "info") => setNotice({ id: ++noticeCounter.current, message, kind }), []);
  const record = useCallback((entry: Omit<ActivityEntry, "id" | "time">) => {
    setActivity((entries) => [{ ...entry, id: crypto.randomUUID(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }, ...entries].slice(0, 35));
  }, []);
  const accept = useCallback((next: Scene) => {
    const validated = SceneSchema.parse(next);
    sceneRef.current = validated;
    setScene(validated);
    setSelectedId((id) => validated.objects.some((object) => object.id === id) ? id : null);
    return validated;
  }, []);
  const changeMode = useCallback((next: WorkspaceMode) => { modeRef.current = next; setMode(next); }, []);

  const initialize = useCallback(async (signal?: AbortSignal) => {
    changeMode("loading");
    try {
      const session = await request<{ capabilities: Capabilities; sessionId: string }>("/api/session", { method: "POST", signal });
      if (signal?.aborted) return;
      setCapabilities(session.capabilities);
      if (!session.capabilities.database) {
        accept(createScene(`sample-${crypto.randomUUID()}`, "studio"));
        setPreset("studio");
        changeMode("sample");
        record({ title: "Local sample opened", source: "Browser", status: "info", detail: { persistence: "This tab only", ai: "Not used", catalog: "Demo fixture" } });
        return;
      }
      const saved = await request<{ scenes: Scene[] }>("/api/scenes", { signal });
      const next = saved.scenes[0] ?? (await request<{ scene: Scene }>("/api/scenes", { method: "POST", body: JSON.stringify({ preset: "studio" }), signal })).scene;
      if (signal?.aborted) return;
      accept(next);
      setPreset(PRESETS.find((entry) => entry.room.width === next.room.width && entry.room.depth === next.room.depth)?.id ?? "studio");
      changeMode("live");
      record({ title: saved.scenes.length ? "Saved room restored" : "New room saved", source: "MongoDB Atlas", status: "success", detail: { sceneId: next.id, revision: next.revision } });
    } catch (error) {
      if (signal?.aborted) return;
      changeMode("error");
      notify(error instanceof Error ? error.message : "The workspace could not connect. Try again.", "error");
    }
  }, [accept, changeMode, notify, record]);

  useEffect(() => { const controller = new AbortController(); void initialize(controller.signal); return () => controller.abort(); }, [initialize]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice((current) => current?.id === notice.id ? null : current), notice.kind === "error" ? 10000 : 6500);
    return () => clearTimeout(timer);
  }, [notice]);

  const enqueue = useCallback(<T,>(work: (current: Scene) => Promise<T>): Promise<T> => {
    pending.current += 1;
    setBusy(true);
    const task = queue.current.catch(() => undefined).then(async () => {
      if (modeRef.current !== "sample" && modeRef.current !== "live") throw new Error("Connect the workspace before editing your room.");
      inFlight.current = true;
      try { return await work(sceneRef.current); }
      finally { inFlight.current = false; }
    });
    queue.current = task;
    return task.finally(() => { pending.current -= 1; setBusy(pending.current > 0); });
  }, []);

  const executeOperations = useCallback((operations: Operation[], commandId = crypto.randomUUID(), source = "Manual controls") => enqueue(async (current) => {
    const started = performance.now();
    if (modeRef.current === "sample") {
      const next = accept(applyOperations(current, operations));
      record({ title: "Preview applied", source: "Local preview", status: "success", detail: { operations, revision: next.revision, persisted: false } });
      return { scene: next, message: "Preview updated. Changes stay in this tab." };
    }
    try {
      const result = await request<CommandResult>("/api/commands", { method: "POST", body: JSON.stringify({ sceneId: current.id, commandId, expectedRevision: current.revision, operations }) });
      const next = accept(result.scene);
      record({ title: result.duplicate ? "Command already accepted" : "Scene change saved", source, status: "success", duration: performance.now() - started, detail: { operations, revision: next.revision, telemetry: result.telemetry, persistence: "MongoDB Atlas" } });
      return { scene: next, message: result.duplicate ? "This change was already saved." : "Room updated and saved." };
    } catch (error) {
      record({ title: error instanceof Error ? error.message : "Command rejected", source, status: "error", duration: performance.now() - started, detail: { operations, expectedRevision: current.revision } });
      throw error;
    }
  }), [accept, enqueue, record]);

  const voiceEvent = useCallback((event: VoiceEvent) => {
    record({ title: event.message, source: "OpenAI direct", status: event.kind === "error" ? "error" : "info", detail: event.detail });
    if (event.kind === "error") notify(event.message, "error");
    else if (event.message.startsWith("You:")) notify(event.message, "info");
  }, [notify, record]);
  const voice = useVoice({ scene, enabled: mode === "live" && capabilities.voice, onOperations: (operations, commandId) => executeOperations(operations, commandId, "OpenAI direct"), onEvent: voiceEvent });
  const voiceActive = !["idle", "error"].includes(voice.status);

  const handle = useCallback(async (task: Promise<{ scene: Scene; message: string }>) => {
    try { const result = await task; notify(result.message, "success"); }
    catch (error) { notify(error instanceof Error ? error.message : "This change could not be applied. Please try again.", "error"); }
  }, [notify]);

  function addFurniture(item: CatalogItem) {
    if (pending.current) return;
    try {
      const current = sceneRef.current;
      const position = findPlacement(current, item);
      void executeOperations([{ type: "add", sku: item.sku, position, rotation: 0, color: item.defaultColor }]).then((result) => {
        const added = result.scene.objects.find((object) => !current.objects.some((previous) => previous.id === object.id));
        if (added) { setSelectedId(added.id); setInspectorOpen(true); }
        notify(`${item.name} added${modeRef.current === "sample" ? " to the preview" : " and saved"}.`, "success");
      }).catch((error: unknown) => notify(error instanceof Error ? error.message : "Furniture could not be added.", "error"));
    } catch (error) { notify(error instanceof Error ? error.message : "Furniture could not be added.", "error"); }
  }

  function changePreset(nextPreset: PresetId) {
    if (pending.current) return;
    voice.stop();
    void enqueue(async () => {
      const next = modeRef.current === "sample" ? createScene(`sample-${crypto.randomUUID()}`, nextPreset) : (await request<{ scene: Scene }>("/api/scenes", { method: "POST", body: JSON.stringify({ preset: nextPreset }) })).scene;
      accept(next);
      setPreset(nextPreset);
      setSelectedId(null);
      setView("perspective");
      setCameraKey((key) => key + 1);
      record({ title: `${PRESETS.find((entry) => entry.id === nextPreset)?.name ?? "Room"} opened`, source: modeRef.current === "sample" ? "Local preview" : "MongoDB Atlas", status: "success", detail: { sceneId: next.id, revision: next.revision } });
      return { scene: next, message: modeRef.current === "sample" ? "New local preview opened." : "New room created and saved." };
    }).then((result) => notify(result.message, "success")).catch((error: unknown) => notify(error instanceof Error ? error.message : "The new room could not be opened.", "error"));
  }

  function reloadScene() {
    if (pending.current) return;
    if (mode === "sample") { notify("This is a local sample. Changes stay in this tab; choose a room above to start a fresh preview."); return; }
    void handle(enqueue(async (current) => {
      const result = await request<{ scene: Scene }>(`/api/scenes?id=${encodeURIComponent(current.id)}`);
      const next = accept(result.scene);
      record({ title: "Saved room reloaded", source: "MongoDB Atlas", status: "success", detail: { revision: next.revision } });
      return { scene: next, message: "Loaded the latest saved room." };
    }));
  }

  function samplePrompt(text: string): Operation[] {
    const current = sceneRef.current;
    const sofa = current.objects.find((object) => getCatalogItem(object.sku)?.category === "sofa");
    if (text === PROMPTS[1]) {
      const lamp = getCatalogItem("stem-lamp")!;
      return [{ type: "add", sku: lamp.sku, position: findPlacement(current, lamp), rotation: 0, color: lamp.defaultColor }];
    }
    if (!sofa) throw new Error("Add a sofa from the catalog to try this preview.");
    if (text === PROMPTS[0]) return [{ type: "recolor", objectId: sofa.id, color: "#687761" }];
    return [{ type: "move", objectId: sofa.id, position: [sofa.position[0] - 0.25, sofa.position[1], sofa.position[2]] }];
  }

  async function submitPrompt(text: string, canned = false) {
    const trimmed = text.trim();
    if (!trimmed || pending.current) return;
    if (mode === "sample") {
      if (!canned) { notify("Free-form AI isn’t connected in this sample. Try a preview below or use the furniture controls."); return; }
      try { await handle(executeOperations(samplePrompt(trimmed), crypto.randomUUID(), "Local preview")); }
      catch (error) { notify(error instanceof Error ? error.message : "The preview could not be applied.", "error"); }
      return;
    }
    if (!capabilities.gateway) { notify("Text AI isn’t connected yet. You can still add and edit furniture with the controls."); return; }
    const requestFallback = testFallback;
    setTestFallback(false);
    setPrompt("");
    void handle(enqueue(async (current) => {
      const started = performance.now();
      try {
        const result = await request<CommandResult>("/api/scene-agent", { method: "POST", body: JSON.stringify({ sceneId: current.id, commandId: crypto.randomUUID(), expectedRevision: current.revision, prompt: trimmed, testFallback: requestFallback }) });
        const next = accept(result.scene);
        record({ title: result.message ?? "Text command accepted", source: "AI Gateway", status: "success", duration: performance.now() - started, detail: { prompt: trimmed, operations: result.operations, revision: next.revision, telemetry: result.telemetry } });
        return { scene: next, message: result.message ?? "Room updated and saved." };
      } catch (error) {
        record({ title: error instanceof Error ? error.message : "Text command failed", source: "AI Gateway", status: "error", duration: performance.now() - started, detail: { prompt: trimmed } });
        setPrompt(trimmed);
        throw error;
      }
    }));
  }

  const selectObject = useCallback((id: string | null) => { setSelectedId(id); if (id) setInspectorOpen(true); }, []);
  const selected = scene.objects.find((object) => object.id === selectedId);
  const selectedItem = selected ? getCatalogItem(selected.sku) : undefined;
  const catalog = useMemo(() => CATALOG.filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(search.toLowerCase())), [search]);
  const locked = busy || mode === "loading" || mode === "error";
  const total = scene.objects.reduce((sum, object) => sum + (getCatalogItem(object.sku)?.price ?? 0), 0);
  const area = scene.room.width * scene.room.depth;
  const roomName = PRESETS.find((entry) => entry.id === preset)?.name ?? "Your apartment";

  function nudge(x: number, z: number) {
    if (!selected || pending.current) return;
    void handle(executeOperations([{ type: "move", objectId: selected.id, position: [Math.round((selected.position[0] + x) * 100) / 100, selected.position[1], Math.round((selected.position[2] + z) * 100) / 100] }]));
  }

  return <div className="app-shell">
    <header className="app-header">
      <a className="brand" href="/" aria-label="VoxBuild home"><span className="brand-mark"><Box size={21} strokeWidth={1.6} /></span><span>Vox<span className="brand-light">Build</span></span><span className="beta-label">Beta</span></a>
      <div className="header-divider" /><span className="workspace-label">Apartment planner</span>
      <div className="header-actions">
        <span className={`save-status ${mode === "sample" ? "sample-status" : ""}`} title={mode === "sample" ? "This sample is local to this tab. No AI or cloud storage is used." : "Accepted changes are saved to MongoDB Atlas."}>
          {busy || mode === "loading" ? <LoaderCircle className="spin" size={13} /> : mode === "live" ? <Cloud size={14} /> : mode === "error" ? <AlertCircle size={14} /> : <span className="status-dot" />}
          {busy ? mode === "sample" ? "Updating preview" : "Saving changes" : mode === "loading" ? "Connecting" : mode === "live" ? "All changes saved" : mode === "error" ? "Connection issue" : "Local sample"}
        </span>
        <button className={`button architecture-button ${architectureOpen ? "is-active" : ""}`} onClick={() => setArchitectureOpen((open) => !open)} aria-label="Architecture" aria-expanded={architectureOpen}><Code2 size={15} /><span>Architecture</span></button>
        <span className="avatar" title="Your private visitor session">You</span>
      </div>
    </header>

    <div className="workspace">
      <aside className={`catalog-panel ${catalogOpen ? "mobile-open" : ""}`} aria-label="Furniture catalog">
        <div className="panel-heading"><div><h2>Furniture</h2><p>A few good pieces.</p></div><button className="icon-button mobile-close" onClick={() => setCatalogOpen(false)} aria-label="Close furniture catalog"><X size={17} /></button><span className="count-badge">{CATALOG.length}</span></div>
        <label className="catalog-search"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a piece…" aria-label="Search furniture" /><span>⌕</span></label>
        <div className="catalog-filter"><span>All furniture</span><span>Curated collection</span></div>
        <div className="catalog-grid">
          {catalog.map((item) => <button key={item.sku} className="catalog-card" disabled={locked} onClick={() => addFurniture(item)} aria-label={`Add ${item.name}`}>
            <div className="catalog-preview"><FurnitureIllustration category={item.category} color={item.defaultColor} /><span className="add-piece"><Plus size={12} /></span></div>
            <span className="catalog-item-name">{item.name}</span><span className="catalog-item-price">${item.price.toLocaleString()}</span>
          </button>)}
          {!catalog.length && <p className="empty-search">No pieces match “{search}”.</p>}
        </div>
        <div className="catalog-note"><MousePointer2 size={15} /><p>Click a piece to add it.<br /><span>Select it in your room to make it yours.</span></p></div>
        <div className="catalog-footer"><span className="catalog-source-dot" />Demo furnishing catalog<small>Dimensions and finishes included</small></div>
      </aside>

      <main className="room-workspace">
        <div className="room-toolbar">
          <div className="room-picker"><span className="room-picker-icon"><Layers size={16} /></span><div><label htmlFor="room-preset">Your space</label><div className="select-wrap"><select id="room-preset" value={preset} onChange={(event) => changePreset(event.target.value as PresetId)} disabled={locked}>{PRESETS.map((entry) => <option value={entry.id} key={entry.id}>{entry.name}</option>)}</select><ChevronDown size={13} /></div></div></div>
          <div className="room-toolbar-actions"><button className="icon-button" onClick={reloadScene} disabled={locked} aria-label="Reload saved room" title="Reload saved room"><RefreshCw size={15} /></button><span className="toolbar-divider" /><span className="room-size">{area.toFixed(0)} m²</span><span className="object-count">{scene.objects.length} pieces</span></div>
        </div>
        <div className="stage">
          <div className="stage-topline"><div className="stage-caption"><span className="stage-caption-dot" />Sample apartment<span className="stage-caption-separator">/</span>{scene.room.width.toFixed(1)} × {scene.room.depth.toFixed(1)} m</div><div className="stage-view-controls"><button className={view === "perspective" ? "active" : ""} onClick={() => setView("perspective")} aria-label="Perspective view" title="Perspective view" aria-pressed={view === "perspective"}><Box size={15} /></button><button className={view === "top" ? "active" : ""} onClick={() => setView("top")} aria-label="Top view" title="Top view" aria-pressed={view === "top"}><Grid2X2 size={15} /></button></div></div>
          <div className="canvas-wrap"><CanvasBoundary><RoomCanvas key={cameraKey} scene={scene} selectedId={selectedId} onSelect={selectObject} view={view} showDimensions={showDimensions} /></CanvasBoundary></div>
          <div className="stage-side-controls"><button className={showDimensions ? "active" : ""} onClick={() => setShowDimensions((show) => !show)} aria-label="Toggle room dimensions" title="Room dimensions" aria-pressed={showDimensions}><Ruler size={16} /></button><button onClick={() => { setView("perspective"); setCameraKey((key) => key + 1); }} aria-label="Reset camera" title="Reset camera"><Maximize2 size={15} /></button></div>
          <div className="stage-navigation"><MousePointer2 size={12} /><span>Drag to orbit</span><span className="navigation-dot" /> <span>Scroll to zoom</span></div>
          <div className="mobile-panel-buttons"><button onClick={() => setCatalogOpen(true)}><PanelLeft size={14} />Furniture</button><button onClick={() => setInspectorOpen(true)}><SlidersHorizontal size={14} />{selected ? "Edit piece" : "Room details"}</button></div>

          {(mode === "loading" || mode === "error") && <div className="workspace-connection"><span>{mode === "loading" ? <LoaderCircle size={15} className="spin" /> : <AlertCircle size={15} />}{mode === "loading" ? "Connecting your workspace…" : "Your workspace is unavailable."}</span>{mode === "error" && <button onClick={() => void initialize()}>Try again</button>}</div>}

          <div className="composer-area">
            {notice && <div key={notice.id} className={`notice notice-${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>{notice.kind === "error" ? <AlertCircle size={15} /> : notice.kind === "success" ? <Check size={15} /> : <Sparkles size={15} />}<span>{notice.message}</span><button onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={13} /></button></div>}
            <div className="command-composer">
              <div className="composer-heading"><span className="composer-spark"><Sparkles size={14} /></span><span>{voiceActive ? voice.status === "connecting" ? "Connecting your microphone…" : voice.status === "thinking" ? "Working on your room…" : voice.status === "speaking" ? "Your room, in conversation" : "Listening. Make yourself at home." : "A little change. A whole new room."}</span><span className="composer-mode">{mode === "sample" ? "Local preview" : voiceActive ? "Voice connected" : "Room assistant"}</span></div>
              <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submitPrompt(prompt); }} className="command-form">
                <button type="button" className={`microphone-button ${voiceActive ? "listening" : ""}`} aria-label={voiceActive ? "Stop voice conversation" : "Start voice conversation"} title={voiceActive ? "Stop voice" : "Talk to your room"} disabled={mode === "loading" || mode === "error"} onClick={() => {
                  if (voiceActive) voice.stop();
                  else if (mode !== "live" || !capabilities.voice) notify("Live voice isn’t connected in this workspace. Try a sample prompt or edit a piece with the controls.");
                  else void voice.start();
                }}>{voice.status === "connecting" ? <LoaderCircle size={18} className="spin" /> : voiceActive ? <MicOff size={18} /> : <Mic size={18} />}</button>
                <input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="“Make the sofa sage and add a reading lamp”" aria-label="Describe a change to your room" disabled={locked} maxLength={1000} autoComplete="off" />
                {voiceActive && <div className="voice-level" aria-hidden="true">{[0.5, 0.85, 1, 0.65, 0.4].map((factor, index) => <span key={index} style={{ height: 3 + voice.level * factor * 20 }} />)}</div>}
                <button className="send-button" type="submit" disabled={locked || !prompt.trim()} aria-label="Apply room prompt">{busy ? <LoaderCircle size={16} className="spin" /> : <ArrowUp size={17} />}</button>
              </form>
              <div className="prompt-suggestions"><span>{mode === "sample" ? "Try a preview" : "Try asking"}</span>{PROMPTS.map((text) => <button key={text} disabled={locked} onClick={() => void submitPrompt(text, true)}>{text}<Plus size={11} /></button>)}</div>
            </div>
            <div className="composer-footnote">{mode === "sample" ? <><span className="small-status-dot" />Local sample · Changes stay in this tab · No AI connected</> : <><span className="small-status-dot live" />{voiceActive ? "Microphone is on. Click the mic to end your conversation." : "Every accepted change is validated and saved."}</>}</div>
          </div>
        </div>
      </main>

      <aside className={`inspector-panel ${inspectorOpen ? "mobile-open" : ""}`} aria-label={selected ? "Selected furniture inspector" : "Room details"}>
        <div className="inspector-heading"><h2>{selected ? "Make it yours" : "Room details"}</h2><button className="icon-button" onClick={() => { if (selected) setSelectedId(null); setInspectorOpen(false); }} aria-label={selected ? "Deselect furniture and close inspector" : "Close room details"}>{selected || inspectorOpen ? <X size={15} /> : <SlidersHorizontal size={15} />}</button></div>
        {selected && selectedItem ? <>
          <div className="inspector-preview"><FurnitureIllustration category={selectedItem.category} color={selected.color} /><span>Selected piece</span></div>
          <div className="selected-title"><h3>{selectedItem.name}</h3><span>${selectedItem.price.toLocaleString()}</span><p>{selectedItem.dimensions[0]} × {selectedItem.dimensions[2]} × {selectedItem.dimensions[1]} m <span>W × D × H</span></p></div>
          <section className="inspector-section"><div className="section-label"><h4>Finish</h4><span>{COLOR_NAMES[selected.color] ?? selected.color}</span></div><div className="color-swatches">{selectedItem.colors.map((color) => <button key={color} style={{ backgroundColor: color }} className={color === selected.color ? "selected" : ""} aria-label={`Set ${selectedItem.name} to ${COLOR_NAMES[color] ?? color}`} title={COLOR_NAMES[color] ?? color} aria-pressed={color === selected.color} disabled={locked} onClick={() => void handle(executeOperations([{ type: "recolor", objectId: selected.id, color }]))}>{color === selected.color && <Check size={12} color={color === "#404448" || color === "#584336" || color === "#446a87" ? "white" : "#34342e"} />}</button>)}</div></section>
          <section className="inspector-section"><div className="section-label"><h4>Position</h4><span>0.25 m steps</span></div><div className="position-values"><span><small>X</small>{selected.position[0].toFixed(2)}<small>m</small></span><span><small>Z</small>{selected.position[2].toFixed(2)}<small>m</small></span></div><div className="nudge-controls"><button disabled={locked} onClick={() => nudge(-0.25, 0)} aria-label="Move selected furniture left"><ArrowLeft size={16} /></button><button disabled={locked} onClick={() => nudge(0, -0.25)} aria-label="Move selected furniture toward back wall"><ArrowUp size={16} /></button><button disabled={locked} onClick={() => nudge(0, 0.25)} aria-label="Move selected furniture toward front"><ArrowDown size={16} /></button><button disabled={locked} onClick={() => nudge(0.25, 0)} aria-label="Move selected furniture right"><ArrowRight size={16} /></button></div></section>
          <section className="inspector-section rotation-section"><div className="section-label"><h4>Rotation</h4><span>{Math.round(selected.rotation * 180 / Math.PI)}°</span></div><button className="button full-width" disabled={locked} onClick={() => void handle(executeOperations([{ type: "rotate", objectId: selected.id, rotation: (selected.rotation + Math.PI / 2) % (Math.PI * 2) }]))}><RotateCw size={14} />Rotate 90°</button></section>
          <div className="inspector-bottom"><button className="remove-button" disabled={locked} onClick={() => void handle(executeOperations([{ type: "remove", objectId: selected.id }]))}><Trash2 size={14} />Remove from room</button><p>Changes apply to your {mode === "sample" ? "local preview" : "saved room"}.</p></div>
        </> : <>
          <div className="room-overview"><span className="room-overview-icon"><Box size={27} strokeWidth={1.3} /></span><h3>{roomName}</h3><p>A little space for your next chapter.</p><div className="room-metrics"><div><strong>{area.toFixed(1)}<span> m²</span></strong><small>Floor area</small></div><div><strong>{scene.room.height.toFixed(1)}<span> m</span></strong><small>Ceiling height</small></div></div></div>
          <section className="room-inventory"><div className="section-label"><h4>In your room</h4><span>{scene.objects.length} pieces</span></div><div className="inventory-list">{scene.objects.map((object) => { const item = getCatalogItem(object.sku); return item ? <button key={object.id} onClick={() => selectObject(object.id)}><span className="inventory-swatch" style={{ background: object.color }} /><span>{item.name}</span><ChevronRight size={13} /></button> : null; })}{!scene.objects.length && <p className="empty-inventory">Your room is ready. Add your first piece from the catalog.</p>}</div></section>
          <div className="estimate-total"><span>Furniture estimate</span><strong>${total.toLocaleString()}</strong><p>Illustrative catalog prices. No purchase is made.</p></div>
          <div className="inspector-help"><MousePointer2 size={17} /><p>Select any piece to change its finish, move it, or try a different angle.</p></div>
        </>}
        <div className="inspector-footer"><span className="revision-label">Revision {scene.revision}</span><span>{mode === "live" ? "Cloud saved" : "Local sample"}</span></div>
      </aside>

      {architectureOpen && <aside className="architecture-drawer" aria-label="Architecture and observed activity">
        <div className="architecture-heading"><div><Code2 size={18} /><h2>Under the hood</h2></div><button className="icon-button" onClick={() => setArchitectureOpen(false)} aria-label="Close architecture"><X size={17} /></button></div>
        <div className="architecture-content"><p className="architecture-intro">A scene you can inspect.<br />A system you can explain.</p>
          <div className="architecture-path"><span>Browser</span><ChevronRight size={13} /><span>Vercel</span><ChevronRight size={13} /><span>AI + Atlas</span></div>
          <div className="integration-list">
            <div><span className="integration-icon"><Layers size={15} /></span><span><strong>Vercel Functions</strong><small>Validate commands · commit scene revisions</small></span><span className={`integration-dot ${mode !== "error" && mode !== "loading" ? "connected" : ""}`} /></div>
            <div><span className="integration-icon"><Sparkles size={15} /></span><span><strong>AI Gateway</strong><small>Structured text commands</small></span><span className={`integration-dot ${capabilities.gateway && mode === "live" ? "connected" : ""}`} title={capabilities.gateway ? "Configured" : "Not connected"} /></div>
            <div><span className="integration-icon"><Mic size={15} /></span><span><strong>OpenAI direct</strong><small>WebRTC voice · shared command executor</small></span><span className={`integration-dot ${voiceActive ? "connected" : ""}`} title={voiceActive ? "Voice connected" : capabilities.voice ? "Ready to connect" : "Not configured"} /></div>
            <div><span className="integration-icon"><Database size={15} /></span><span><strong>MongoDB Atlas</strong><small>{mode === "live" ? "Owned scenes · atomic revisions + receipts" : "Not connected · sample stays in this tab"}</small></span><span className={`integration-dot ${mode === "live" ? "connected" : ""}`} /></div>
          </div>
          <div className="architecture-catalog"><Box size={14} /><span>Catalog: explicit local fixture</span><span>7 SKUs</span></div>
          <label className="fallback-test"><span><strong>Test Gateway fallback</strong><small>Excludes the primary provider by policy on the next text request. This is a routing test, not a provider outage.</small></span><input type="checkbox" checked={testFallback} disabled={!capabilities.gateway || mode !== "live" || busy} onChange={(event) => setTestFallback(event.target.checked)} /><span className="toggle-track" aria-hidden="true" /></label>
          <div className="activity-heading"><h3><Activity size={14} />Observed activity</h3><span>{activity.length} events</span></div>
          <p className="activity-note">Real events from this tab. Timings are measured browser round trips. Expand an event for returned metadata.</p>
          <div className="activity-list">{activity.map((entry) => <details key={entry.id} className={`activity-entry activity-${entry.status}`}><summary><span className="event-dot" /><div><span className="event-title">{entry.title}</span><span className="event-meta">{entry.source}<span>{entry.duration !== undefined ? `${Math.round(entry.duration)} ms · ` : ""}{entry.time}</span></span></div><ChevronDown size={12} /></summary>{entry.detail !== undefined && <pre>{JSON.stringify(entry.detail, null, 2)}</pre>}</details>)}{!activity.length && <p className="empty-inventory">Your first scene event will appear here.</p>}</div>
        </div><div className="architecture-footer">Models propose. The server validates and saves.</div>
      </aside>}
    </div>
  </div>;
}

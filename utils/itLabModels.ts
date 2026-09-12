/** Bounded, deterministic teaching models. Only domain edits are persisted; no clocks or telemetry. */
export const labScenarios = {
  "input-output": "io-machine",
  "inside-computer": "io-machine",
  "change-rule": "io-machine",
  "bits-values": "bit-lab",
  "text-bytes": "bit-lab",
  "pixel-icon": "bit-lab",
  "save-restart": "file-workspace",
  "paths-formats": "file-workspace",
  "backup-restore": "file-workspace",
  "program-process": "file-workspace",
  "resource-limits": "file-workspace",
  permissions: "file-workspace",
  "test-hypothesis": "file-workspace",
  "project-recover": "file-workspace",
  sequence: "step-machine",
  "state-conditions": "step-machine",
  "repeat-state": "step-machine",
  "project-generator": "step-machine",
  "local-network": "network-lab",
  "addresses-routes": "network-lab",
  "reliable-transfer": "network-lab",
  "dns-url": "network-lab",
  "request-response": "network-lab",
  "https-access": "network-lab",
  "verify-repair": "network-lab",
  "project-publish": "network-lab",
} as const;
export type LabScenario = keyof typeof labScenarios;
export type LabFamily = (typeof labScenarios)[LabScenario];
export type LabAction = { type: string; value?: string | number };
export type LabTape = { tape: LabAction[] };
export interface Machine {
  value: number;
  text: string;
  operation: string;
  order: string[];
  inclusive: boolean;
  resetInside: boolean;
  dataset: string;
  steps: number;
}
export interface MachineTrace {
  instruction: string;
  value: number;
  sum: number;
  count: number;
  output: string[];
}
export interface FileNode {
  path: string;
  data: string;
  format: "text" | "pixel" | "program";
  writable: boolean;
}
export interface Process {
  id: number;
  file: string;
  draft: string;
  cost: number;
  job: boolean;
}
export interface Workspace {
  files: FileNode[];
  processes: Process[];
  active: number;
  selected: string;
  backup: FileNode[];
  backupLabel: string;
  notice: string;
  nextId: number;
}
export interface BitModel {
  bits: number[];
  text: string;
  latin: boolean;
  pixels: number[];
  depth: number;
  colour: number;
  cell: number;
  notice: string;
}
export interface NetworkModel {
  local: boolean;
  uplink: boolean;
  route: boolean;
  dns: boolean;
  tls: boolean;
  allowed: boolean;
  image: boolean;
  path: string;
  target: string;
  received: number[];
  missing: boolean;
  tested: string;
  report: string[];
  testedConfig: string;
}
export interface LabModel {
  machine?: Machine;
  bits?: BitModel;
  workspace?: Workspace;
  network?: NetworkModel;
}
const own = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const integer = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const shortText = (v: unknown, max = 160): v is string =>
  typeof v === "string" && v.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
export function isLabScenario(v: unknown): v is LabScenario {
  return typeof v === "string" && Object.hasOwn(labScenarios, v);
}
export const LAB_MAX_ACTIONS = 192;
export const LAB_MAX_TAPE_BYTES = 32768;
const byteSize = (text: string) => new TextEncoder().encode(text).length;
export const PROJECT_TITLE = "Grüße vom Treffpunkt";
export const projectFiles = (): FileNode[] => [
  { path: "/projekt/notiz.txt", data: `${PROJECT_TITLE} · 19:00`, format: "text", writable: true },
  { path: "/projekt/daten.txt", data: "2,3,0", format: "text", writable: true },
  { path: "/projekt/icon.pix", data: "0000011001100000", format: "pixel", writable: true },
  {
    path: "/projekt/generator.txt",
    data: "sum = 0; for each quantity >= 1: add quantity; output sum",
    format: "program",
    writable: true,
  },
];
export function initialLab(scenario: LabScenario): LabModel {
  const family = labScenarios[scenario];
  if (family === "io-machine" || family === "step-machine")
    return {
      machine: {
        value:
          scenario === "inside-computer"
            ? 2
            : scenario === "state-conditions"
              ? 1
              : scenario === "change-rule"
                ? 4
                : 3,
        text: "Hallo",
        operation:
          scenario === "input-output" ? "text" : scenario === "inside-computer" ? "add" : "double",
        order: ["read", "double", "emit"],
        inclusive: scenario !== "project-generator",
        resetInside: scenario === "project-generator",
        dataset: scenario === "project-generator" ? "project" : "sum",
        steps: 0,
      },
    };
  if (family === "bit-lab")
    return {
      bits: {
        bits: [0, 0, 0, 0],
        text: "Aä",
        latin: false,
        pixels: Array(16).fill(0),
        depth: 1,
        colour: 1,
        cell: 0,
        notice: "",
      },
    };
  if (family === "file-workspace") {
    const shared = scenario === "permissions" || scenario === "test-hypothesis";
    const files: FileNode[] =
      scenario === "project-recover"
        ? projectFiles().filter((f) => f.format !== "pixel")
        : [
            {
              path: shared ? "/geteilt/plan.txt" : "/projekt/notiz.txt",
              data: "18:00",
              format: "text",
              writable: !shared,
            },
          ];
    if (["program-process", "resource-limits"].includes(scenario))
      files.push({
        path: "/projekt/editor.app",
        data: "Editor: open → edit → save",
        format: "program",
        writable: false,
      });
    return {
      workspace: {
        files,
        processes: [
          {
            id: 1,
            file: files[0].path,
            draft: scenario === "project-recover" ? "Zusatznotiz · 20:00" : files[0].data,
            cost: 2,
            job: false,
          },
        ],
        active: 1,
        selected: files[0].path,
        backup: scenario === "project-recover" ? projectFiles() : [],
        backupLabel: scenario === "project-recover" ? "complete" : "",
        notice: "",
        nextId: 2,
      },
    };
  }
  return {
    network: {
      local: true,
      uplink: true,
      route: true,
      dns: scenario !== "project-publish",
      tls: true,
      allowed: true,
      image: !["verify-repair", "project-publish"].includes(scenario),
      path: "/start",
      target: "server",
      received: [],
      missing: true,
      tested: "",
      report: [],
      testedConfig: "",
    },
  };
}
function addFile(w: Workspace, file: FileNode) {
  const old = w.files.find((f) => f.path === file.path);
  if (old) {
    w.notice = "exists";
    return;
  }
  if (
    w.files.length >= 16 ||
    w.files.reduce((n, f) => n + byteSize(f.data), 0) + byteSize(file.data) > 4096
  ) {
    w.notice = "storageFull";
    return;
  }
  w.files.push({ ...file });
  w.selected = file.path;
  w.notice = "copied";
}
export function workspaceUsage(w: Workspace) {
  return {
    ram: w.processes.reduce((n, p) => n + p.cost, 0),
    cpu: w.processes.some((p) => p.job) ? 4 : Math.min(4, w.processes.length),
    storage: w.files.reduce((n, f) => n + new TextEncoder().encode(f.data).length, 0),
  };
}
export function activeProcess(w: Workspace) {
  return w.processes.find((p) => p.id === w.active);
}
export function selectedFile(w: Workspace) {
  return w.files.find((f) => f.path === w.selected);
}
export function bitValue(b: BitModel) {
  return b.bits.reduce((v, bit) => v * 2 + bit, 0);
}
export function textBytes(b: BitModel) {
  return Array.from(new TextEncoder().encode(b.text));
}
export function decodedText(b: BitModel) {
  return b.latin
    ? textBytes(b)
        .map((n) => String.fromCodePoint(n))
        .join("")
    : b.text;
}
export function networkConfig(n: NetworkModel) {
  return JSON.stringify([
    n.local,
    n.uplink,
    n.route,
    n.dns,
    n.tls,
    n.allowed,
    n.image,
    n.path,
    n.target,
  ]);
}
export function networkReport(n: NetworkModel, target = n.target): string[] {
  if (!n.local) return ["localDown"];
  if (target === "printer") return ["localOk", "printerOk"];
  const stages = ["localOk"];
  if (target === "web") {
    if (!n.dns) return [...stages, "dnsFailed"];
    stages.push("dnsOk");
  }
  if (!n.uplink || !n.route) return [...stages, "routeFailed"];
  stages.push("routeOk");
  if (target === "server") return stages;
  if (!n.tls) return [...stages, "tlsFailed"];
  stages.push("tlsOk");
  if (!n.allowed) return [...stages, "http403"];
  if (n.path === "/missing") return [...stages, "http404"];
  return [...stages, "html200", n.image ? "image200" : "image404"];
}
export function machineInput(m: Machine) {
  return m.dataset === "empty"
    ? []
    : m.dataset === "boundary"
      ? [1]
      : m.dataset === "project"
        ? [2, 3, 0]
        : [2, 3, 1];
}
/** Every visible step executes an actual state operation; the trace is always recomputed. */
export function machineTrace(scenario: LabScenario, m: Machine): MachineTrace[] {
  const trace: MachineTrace[] = [];
  let value = 0,
    sum = 0,
    count = 0;
  let condition = false;
  const output: string[] = [];
  const step = (instruction: string, apply: () => void) => {
    apply();
    trace.push({ instruction, value, sum, count, output: [...output] });
  };
  if (scenario === "input-output") {
    step("read", () => {
      value = 0;
    });
    step("text", () => {});
    step("emit", () => {
      output.push(m.text);
    });
  } else if (
    scenario === "inside-computer" ||
    scenario === "change-rule" ||
    scenario === "sequence"
  ) {
    const order = scenario === "sequence" ? m.order : ["read", m.operation, "emit"];
    for (const op of order)
      step(op, () => {
        if (op === "read") value = m.value;
        if (op === "double") value *= 2;
        if (op === "add") value += 3;
        if (op === "emit") output.push(String(value));
      });
  } else if (scenario === "state-conditions") {
    step("read", () => {
      value = m.value;
    });
    step(m.inclusive ? "gte1" : "gt1", () => {
      condition = m.inclusive ? value >= 1 : value > 1;
    });
    step("emit", () => {
      output.push(condition ? "present" : "empty");
    });
  } else {
    step("initialise", () => {
      sum = 0;
      count = 0;
    });
    for (const input of machineInput(m)) {
      step("readItem", () => {
        value = input;
      });
      if (m.resetInside)
        step("resetSum", () => {
          sum = 0;
        });
      if (scenario === "project-generator")
        step(m.inclusive ? "gte1" : "gt1", () => {
          condition = m.inclusive ? value >= 1 : value > 1;
        });
      else condition = true;
      step("accumulate", () => {
        if (condition) {
          sum += value;
          count++;
        }
      });
    }
    step("emit", () => {
      output.push(String(sum));
    });
  }
  return trace.slice(0, 200);
}
export function machineNow(scenario: LabScenario, m: Machine) {
  return (
    machineTrace(scenario, m)[m.steps - 1] || {
      instruction: "ready",
      value: 0,
      sum: 0,
      count: 0,
      output: [],
    }
  );
}
const allowed: Record<LabScenario, string[]> = {
  "input-output": ["text", "step", "run", "restart"],
  "inside-computer": ["value", "step", "run", "restart"],
  "change-rule": ["value", "operation", "step", "run", "restart"],
  "bits-values": ["bit"],
  "text-bytes": ["text", "decoder"],
  "pixel-icon": ["cell", "paint", "colour", "depth", "remap"],
  "save-restart": ["select", "open", "edit", "save", "power"],
  "paths-formats": ["select", "open", "edit", "save", "copy", "rename", "viewImage"],
  "backup-restore": ["select", "open", "edit", "save", "backup", "delete", "restore", "syncDelete"],
  "program-process": ["select", "open", "edit", "switch", "close"],
  "resource-limits": ["select", "open", "switch", "close", "job"],
  permissions: ["select", "open", "edit", "save", "saveCopy"],
  "test-hypothesis": ["select", "open", "edit", "save", "saveCopy"],
  "project-recover": ["select", "open", "edit", "saveCopy", "backupChoice", "restore"],
  sequence: ["value", "move", "step", "run", "restart"],
  "state-conditions": ["value", "inclusive", "step", "run", "restart"],
  "repeat-state": ["dataset", "resetInside", "step", "run", "restart"],
  "project-generator": ["dataset", "resetInside", "inclusive", "step", "run", "restart"],
  "local-network": ["local", "uplink", "target", "test"],
  "addresses-routes": ["route", "target", "test"],
  "reliable-transfer": ["deliver", "retry", "clearTransfer"],
  "dns-url": ["path", "dns", "test"],
  "request-response": ["image", "path", "test"],
  "https-access": ["tls", "access", "test"],
  "verify-repair": ["image", "test"],
  "project-publish": ["dns", "image", "test"],
};
export function allowedLabActions(s: LabScenario) {
  return [...allowed[s]];
}
function canonicalAction(s: LabScenario, input: unknown): LabAction | null {
  const a = own(input);
  if (typeof a.type !== "string" || !allowed[s].includes(a.type)) return null;
  const t = a.type,
    v = a.value;
  if (
    [
      "step",
      "run",
      "restart",
      "open",
      "save",
      "power",
      "copy",
      "rename",
      "viewImage",
      "backup",
      "delete",
      "restore",
      "syncDelete",
      "close",
      "job",
      "saveCopy",
      "test",
      "retry",
      "clearTransfer",
      "remap",
      "paint",
    ].includes(t)
  )
    return { type: t };
  if (t === "text" || t === "edit") return shortText(v) ? { type: t, value: v } : null;
  if (t === "select")
    return shortText(v, 80) &&
      /^\/(projekt|archiv|eigen|geteilt|wiederhergestellt)\/[a-z0-9.-]+$/.test(v)
      ? { type: t, value: v }
      : null;
  if (["value", "bit", "cell", "colour", "depth", "move", "switch", "deliver"].includes(t)) {
    const ranges: Record<string, number[]> = {
      value: [0, 30],
      bit: [0, 3],
      cell: [0, 15],
      colour: [0, 3],
      depth: [1, 2],
      move: [0, 1],
      switch: [1, 200],
      deliver: [0, 2],
    };
    return integer(v, ranges[t][0], ranges[t][1]) ? { type: t, value: v } : null;
  }
  const enums: Record<string, string[]> = {
    operation: ["double", "add"],
    decoder: ["utf8", "latin"],
    dataset: ["sum", "empty", "boundary", "project"],
    inclusive: ["yes", "no"],
    resetInside: ["yes", "no"],
    backupChoice: ["old", "complete"],
    local: ["on", "off"],
    uplink: ["on", "off"],
    route: ["on", "off"],
    dns: ["on", "off"],
    tls: ["on", "off"],
    access: ["on", "off"],
    image: ["on", "off"],
    target: ["printer", "server"],
    path: ["/start", "/hilfe", "/missing"],
  };
  return typeof v === "string" && enums[t]?.includes(v) ? { type: t, value: v } : null;
}
function applyAction(s: LabScenario, model: LabModel, a: LabAction) {
  const t = a.type,
    v = a.value;
  if (model.machine) {
    const m = model.machine;
    if (t === "value") m.value = v as number;
    if (t === "text") m.text = v as string;
    if (t === "operation") m.operation = v as string;
    if (t === "inclusive") m.inclusive = v === "yes";
    if (t === "resetInside") m.resetInside = v === "yes";
    if (t === "dataset") m.dataset = v as string;
    if (t === "move") {
      const i = v as number;
      [m.order[i], m.order[i + 1]] = [m.order[i + 1], m.order[i]];
    }
    if (!["step", "run"].includes(t)) m.steps = 0;
    if (t === "step") m.steps = Math.min(machineTrace(s, m).length, m.steps + 1);
    if (t === "run") m.steps = machineTrace(s, m).length;
  }
  if (model.bits) {
    const b = model.bits;
    b.notice = "";
    if (t === "bit") b.bits[v as number] = 1 - b.bits[v as number];
    if (t === "text") b.text = v as string;
    if (t === "decoder") b.latin = v === "latin";
    if (t === "cell") b.cell = v as number;
    if (t === "colour" && (v as number) < 2 ** b.depth) b.colour = v as number;
    if (t === "paint") b.pixels[b.cell] = b.colour;
    if (t === "depth") {
      if (v === 1 && b.pixels.some((p) => p > 1)) b.notice = "paletteLoss";
      else {
        b.depth = v as number;
        b.colour = Math.min(b.colour, 2 ** b.depth - 1);
      }
    }
    if (t === "remap") {
      b.pixels = b.pixels.map((p) => (p > 1 ? 1 : p));
      b.depth = 1;
      b.colour = Math.min(1, b.colour);
    }
  }
  if (model.workspace) {
    const w = model.workspace;
    w.notice = "";
    const p = activeProcess(w),
      f = selectedFile(w);
    if (t === "select" && w.files.some((f) => f.path === v)) w.selected = v as string;
    if (t === "open" && f) {
      if (workspaceUsage(w).ram + 2 > 8) {
        w.notice = "ramFull";
        return;
      }
      const id = w.nextId++;
      w.processes.push({ id, file: f.path, draft: f.data, cost: 2, job: false });
      w.active = id;
      w.notice = "opened";
    }
    if (t === "edit" && p && !p.job) p.draft = v as string;
    if (t === "save" && p) {
      const target = w.files.find((f) => f.path === p.file);
      if (!target) {
        w.notice = "missingFile";
        return;
      }
      if (!target.writable) {
        w.notice = "readOnly";
        return;
      }
      if (
        w.files.reduce((n, f) => n + (f === target ? 0 : byteSize(f.data)), 0) + byteSize(p.draft) >
        4096
      ) {
        w.notice = "storageFull";
        return;
      }
      target.data = p.draft;
      w.notice = "saved";
    }
    if (t === "power") {
      w.processes = [];
      w.active = 0;
      w.notice = "powerLoss";
    }
    if (t === "switch" && w.processes.some((p) => p.id === v)) w.active = v as number;
    if (t === "close" && p) {
      w.processes = w.processes.filter((q) => q.id !== p.id);
      w.active = w.processes[0]?.id || 0;
      w.notice = "closed";
    }
    if (t === "job") {
      if (workspaceUsage(w).ram + 1 > 8) {
        w.notice = "ramFull";
        return;
      }
      const id = w.nextId++;
      w.processes.push({ id, file: "", draft: "", cost: 1, job: true });
      w.active = id;
      w.notice = "jobStarted";
    }
    if (t === "copy" && f) addFile(w, { ...f, path: "/archiv/notiz.txt", writable: true });
    if (t === "saveCopy" && p)
      addFile(w, { path: "/eigen/entwurf.txt", data: p.draft, format: "text", writable: true });
    if (t === "rename" && f) {
      const path = f.path.replace(/\.[^.]+$/, ".png");
      if (w.files.some((q) => q !== f && q.path === path)) {
        w.notice = "exists";
        return;
      }
      const old = f.path;
      f.path = path;
      w.selected = path;
      for (const p of w.processes) if (p.file === old) p.file = path;
      w.notice = "renamed";
    }
    if (t === "viewImage" && f) w.notice = f.format === "pixel" ? "imageOpened" : "wrongFormat";
    if (t === "backup") {
      w.backup = w.files.map((f) => ({ ...f }));
      w.backupLabel = "savedSnapshot";
      w.notice = "backupMade";
    }
    if (t === "delete" && f) {
      w.files = w.files.filter((q) => q.path !== f.path);
      w.selected = w.files[0]?.path || "";
      w.notice = "deleted";
    }
    if (t === "syncDelete") {
      w.files = [];
      w.backup = [];
      w.selected = "";
      w.backupLabel = "syncedDeletion";
      w.notice = "syncedDeletion";
    }
    if (t === "backupChoice") {
      w.backup = projectFiles().filter((f) => v === "complete" || f.format !== "pixel");
      w.backupLabel = v as string;
    }
    if (t === "restore") {
      if (!w.backup.length) {
        w.notice = "noBackup";
        return;
      }
      const copies = w.backup.map((f) => ({
        ...f,
        path: f.path.replace(/^\/[^/]+\//, "/wiederhergestellt/"),
      }));
      if (copies.some((c) => w.files.some((f) => f.path === c.path))) {
        w.notice = "exists";
        return;
      }
      if (
        w.files.length + copies.length > 16 ||
        [...w.files, ...copies].reduce((n, f) => n + byteSize(f.data), 0) > 4096
      ) {
        w.notice = "storageFull";
        return;
      }
      w.files.push(...copies);
      w.selected = copies[0].path;
      w.notice = "restored";
    }
  }
  if (model.network) {
    const n = model.network;
    if (["local", "uplink", "route", "dns", "tls", "image"].includes(t))
      (n as unknown as Record<string, unknown>)[t] = v === "on";
    if (t === "access") n.allowed = v === "on";
    if (t === "path") n.path = v as string;
    if (t === "target") n.target = v as string;
    if (t === "test") {
      const web = !["local-network", "addresses-routes"].includes(s);
      n.tested = web ? "web" : n.target;
      n.report = networkReport(n, n.tested);
      n.testedConfig = networkConfig(n);
    }
    if (t === "deliver" && v !== 1 && !n.received.includes(v as number))
      n.received.push(v as number);
    if (t === "retry" && !n.received.includes(1)) {
      n.received.push(1);
      n.missing = false;
    }
    if (t === "clearTransfer") {
      n.received = [];
      n.missing = true;
    }
  }
}
/** Never trust stored outputs, file snapshots, step counts or arbitrary action objects. */
export function readLab(
  s: LabScenario,
  raw: unknown
): { model: LabModel; tape: LabAction[]; invalid: boolean } {
  const data = own(raw),
    model = initialLab(s);
  const tape: LabAction[] = [];
  let invalid = false;
  if (data.tape !== undefined && (!Array.isArray(data.tape) || data.tape.length > LAB_MAX_ACTIONS))
    return { model, tape, invalid: true };
  for (const input of Array.isArray(data.tape) ? data.tape : []) {
    const a = canonicalAction(s, input);
    if (!a) {
      invalid = true;
      break;
    }
    applyAction(s, model, a);
    tape.push(a);
  }
  if (byteSize(JSON.stringify({ tape })) > LAB_MAX_TAPE_BYTES)
    return { model: initialLab(s), tape: [], invalid: true };
  return { model, tape, invalid };
}
export function editLab(s: LabScenario, raw: unknown, input: unknown): LabTape | null {
  const current = readLab(s, raw),
    a = canonicalAction(s, input);
  if (!a || current.invalid || current.tape.length >= LAB_MAX_ACTIONS) return null;
  // Coalesce successive typing edits. Other domain actions preserve their causal order.
  if (
    ["text", "edit", "value", "cell", "colour"].includes(a.type) &&
    current.tape.at(-1)?.type === a.type
  )
    current.tape.pop();
  const next = { tape: [...current.tape, a] };
  return byteSize(JSON.stringify(next)) <= LAB_MAX_TAPE_BYTES ? next : null;
}
export interface LabCheck {
  id: string;
  question: string;
  options: { id: string; text: string }[];
  answer: string;
  explanation: string;
}
export interface LabContent {
  schema: "it-lab/1";
  family: LabFamily;
  scenario: LabScenario;
  intro: string;
  task: string;
  observe: string;
  worldNote: string;
  checks: LabCheck[];
}
export function parseLabContent(raw: unknown): LabContent | null {
  const c = own(raw);
  if (
    c.schema !== "it-lab/1" ||
    !isLabScenario(c.scenario) ||
    c.family !== labScenarios[c.scenario]
  )
    return null;
  if (
    ![c.intro, c.task, c.observe, c.worldNote].every(
      (v) => typeof v === "string" && v.length > 0 && v.length <= 2400
    )
  )
    return null;
  if (!Array.isArray(c.checks) || c.checks.length < 1 || c.checks.length > 4) return null;
  const ids = new Set<string>();
  for (const input of c.checks) {
    const q = own(input);
    if (typeof q.id !== "string" || !/^[a-z][a-z0-9-]{0,39}$/.test(q.id) || ids.has(q.id))
      return null;
    ids.add(q.id);
    if (
      ![q.question, q.explanation].every(
        (v) => typeof v === "string" && v.length > 0 && v.length <= 1200
      ) ||
      !Array.isArray(q.options) ||
      q.options.length < 2 ||
      q.options.length > 4
    )
      return null;
    const options = q.options.map(own);
    if (
      options.some(
        (o) =>
          typeof o.id !== "string" ||
          !/^[a-z0-9-]{1,40}$/.test(o.id) ||
          typeof o.text !== "string" ||
          !o.text ||
          o.text.length > 600
      )
    )
      return null;
    if (
      new Set(options.map((o) => o.id)).size !== options.length ||
      !options.some((o) => o.id === q.answer)
    )
      return null;
  }
  return c as unknown as LabContent;
}
export function labAnswers(content: LabContent, raw: unknown): Record<string, string> | null {
  const input = own(raw),
    answer: Record<string, string> = {};
  for (const q of content.checks) {
    if (input[q.id] !== q.answer) return null;
    answer[q.id] = q.answer;
  }
  return answer;
}

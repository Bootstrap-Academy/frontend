import { canonicalJson, cloneJson, validateSchema, type Schema } from "./schema";
import { validateManifest, validateMessage } from "./validation";
import { ProtocolError, type Envelope, type Manifest, type Transport } from "./types";

export interface PackageDescriptor {
  id: string;
  api_version: 2;
  entry_url: string;
  manifest_url: string;
  manifest_hash: string;
  package_hash: string;
}
export interface VerifiedPackage {
  descriptor: PackageDescriptor;
  origin: string;
  manifest: Manifest;
  stateSchema: Schema;
  validateState(state: unknown): void;
}
const hex = /^[a-f0-9]{64}$/;
/** Parse sources, rather than accepting restrictive-looking substrings in a permissive policy. */
export function validateLessonCsp(policy: string, appOrigin: string) {
  const directives = new Map<string, string[]>();
  const rejected = () => new ProtocolError("no_access", "Content security policy mismatch.");
  for (const part of policy.split(";")) {
    const [name, ...values] = part.trim().split(/\s+/);
    if (!name) continue;
    if (directives.has(name)) throw rejected();
    directives.set(name, values);
  }
  const sources: Record<string, string> = {
    "default-src": "'none'",
    "script-src": "'self'",
    "style-src": "'self'",
    "img-src": "'self'",
    "connect-src": "'none'",
    "object-src": "'none'",
    "frame-src": "'none'",
    "base-uri": "'none'",
    "form-action": "'none'",
  };
  for (const [name, source] of Object.entries(sources)) {
    const values = directives.get(name);
    if (values?.length !== 1 || values[0] !== source) throw rejected();
    directives.delete(name);
  }
  const parents = directives.get("frame-ancestors");
  const approved = new Set([
    appOrigin,
    "https://test.bootstrap.academy",
    "https://bootstrap.academy",
    "http://localhost:58761",
  ]);
  if (!parents?.includes(appOrigin) || parents.some((source) => !approved.has(source)))
    throw rejected();
  directives.delete("frame-ancestors");
  if (directives.size) throw rejected();
}
export async function sha256(bytes: Uint8Array): Promise<string> {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>)),
    (byte) => byte.toString(16).padStart(2, "0")
  ).join("");
}
export function packageLocation(
  descriptor: PackageDescriptor,
  contentOrigin: string,
  appOrigin: string
) {
  const origin = new URL(contentOrigin);
  const app = new URL(appOrigin);
  const local =
    origin.protocol === "http:" &&
    origin.hostname === "127.0.0.2" &&
    ["localhost", "127.0.0.1"].includes(app.hostname);
  if (
    origin.href !== origin.origin + "/" ||
    (!local && origin.protocol !== "https:") ||
    origin.username ||
    origin.password ||
    origin.hostname === app.hostname ||
    origin.hostname.endsWith(".bootstrap.academy") ||
    origin.hostname === "bootstrap.academy"
  )
    throw new ProtocolError("no_access", "Content needs a session-free origin.");
  if (
    descriptor.api_version !== 2 ||
    !hex.test(descriptor.manifest_hash) ||
    !hex.test(descriptor.package_hash)
  )
    throw new ProtocolError("invalid_message", "Missing package binding.");
  const base = `${origin.origin}/packages/${descriptor.package_hash}/`;
  if (descriptor.manifest_url !== base + "manifest.json" || !descriptor.entry_url.startsWith(base))
    throw new ProtocolError("no_access", "Package location mismatch.");
  return { origin: origin.origin, base };
}
/** Called only for an authenticated server-selected descriptor, never route content. */
export async function verifyLessonPackage(
  descriptor: PackageDescriptor,
  contentOrigin: string,
  appOrigin: string,
  signal: AbortSignal,
  load: typeof fetch = fetch
): Promise<VerifiedPackage> {
  const { origin, base } = packageLocation(descriptor, contentOrigin, appOrigin);
  const read = async (url: string, mediaType: string, maxBytes: number) => {
    const response = await load(url, {
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "error",
      signal,
      cache: "default",
    });
    const actualType = response.headers.get("content-type")?.split(";")[0]?.trim();
    if (
      !response.ok ||
      response.url !== url ||
      (actualType !== mediaType &&
        !(mediaType === "text/javascript" && actualType === "application/javascript"))
    )
      throw new ProtocolError("no_access", "Asset response mismatch.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = response.body!.getReader();
    try {
      for (;;) {
        const result = await reader.read();
        if (result.done) break;
        size += result.value.byteLength;
        if (size > maxBytes) throw new ProtocolError("too_large", "Asset too large.");
        chunks.push(result.value);
      }
    } finally {
      await reader.cancel();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return { bytes, response };
  };
  const bytes = (await read(descriptor.manifest_url, "application/json", 65536)).bytes;
  if ((await sha256(bytes)) !== descriptor.manifest_hash)
    throw new ProtocolError("no_access", "Manifest hash mismatch.");
  const manifest = validateManifest(
    JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes))
  );
  if (
    manifest.id !== descriptor.id ||
    descriptor.entry_url !== base + manifest.entry.replace(/(?:index)?\.html$/, "") ||
    manifest.protocol.minor !== 0
  )
    throw new ProtocolError("unsupported", "Package binding mismatch.");
  // The package digest covers the complete ordered resource inventory, independently of the manifest digest.
  if (
    (await sha256(new TextEncoder().encode(canonicalJson(manifest.assets)))) !==
    descriptor.package_hash
  )
    throw new ProtocolError("no_access", "Package hash mismatch.");
  let total = 0;
  let stateSchema: Schema | undefined;
  for (const asset of manifest.assets as (Manifest["assets"][number] & {
    sha256: string;
    bytes: number;
  })[]) {
    const url = new URL(
      asset.path === manifest.entry ? asset.path.replace(/(?:index)?\.html$/, "") : asset.path,
      base
    );
    if (
      !url.href.startsWith(base) ||
      url.href !== (asset.path === manifest.entry ? descriptor.entry_url : base + asset.path) ||
      url.search ||
      url.hash ||
      asset.bytes > 1572864 ||
      (total += asset.bytes) > 1572864
    )
      throw new ProtocolError("no_access", "Asset outside package.");
    const actual = await read(url.href, asset.mediaType, asset.bytes);
    if (actual.bytes.length !== asset.bytes || (await sha256(actual.bytes)) !== asset.sha256)
      throw new ProtocolError("no_access", "Asset hash mismatch.");
    if (asset.path === manifest.entry) {
      const csp = actual.response.headers.get("content-security-policy") || "";
      validateLessonCsp(csp, appOrigin);
    }
    if (asset.path === manifest.state.schema)
      stateSchema = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(actual.bytes));
  }
  if (stateSchema === undefined) throw new ProtocolError("no_access", "Missing state schema.");
  return {
    descriptor: cloneJson(descriptor),
    origin,
    manifest,
    stateSchema,
    validateState: (state) => validateSchema(stateSchema!, state),
  };
}

/** Frame-side bootstrap: exactly one port from the approved parent document. */
export function createLessonWindowTransport(
  target: Window,
  parentOrigin: string | readonly string[]
): Transport & { connection: Promise<Envelope> } {
  const origins = typeof parentOrigin === "string" ? [parentOrigin] : parentOrigin;
  if (
    !origins.length ||
    origins.some((origin) => origin === "*" || new URL(origin).origin !== origin)
  )
    throw new ProtocolError("no_access", "Invalid host origin.");
  let port: MessagePort | undefined;
  let receive: ((value: unknown) => void) | undefined;
  let closed = false;
  let first: Envelope | undefined;
  let resolveConnection: (message: Envelope) => void;
  const connection = new Promise<Envelope>((resolve) => {
    resolveConnection = resolve;
  });
  const bootstrap = (event: MessageEvent) => {
    if (
      closed ||
      port ||
      !origins.includes(event.origin) ||
      event.source !== target.parent ||
      event.ports.length !== 1
    )
      return;
    try {
      const message = validateMessage(event.data, { sender: "host" });
      if (message.type !== "host.connect" || message.payload.transport !== "message-port") return;
      const connected = event.ports[0]!;
      port = connected;
      target.removeEventListener("message", bootstrap);
      connected.onmessage = (event) => receive?.(event.data);
      connected.start();
      first = message;
      resolveConnection(message);
      receive?.(message);
    } catch {
      /* Foreign/bootstrap noise never opens a bridge. */
    }
  };
  target.addEventListener("message", bootstrap);
  return {
    connection,
    send(message) {
      if (!closed && port) port.postMessage(message);
    },
    subscribe(listener) {
      receive = listener;
      if (first)
        queueMicrotask(() => {
          if (!closed && receive === listener) listener(first);
        });
      return () => {
        receive = undefined;
      };
    },
    close() {
      closed = true;
      target.removeEventListener("message", bootstrap);
      if (port) {
        port.onmessage = null;
        port.close();
      }
      receive = undefined;
    },
  };
}

export function createLessonFrame(
  surface: HTMLElement,
  verified: VerifiedPackage,
  failed: () => void
): { transport: Transport; dispose(): void; load: Promise<void> } {
  const frame = surface.ownerDocument.createElement("iframe");
  frame.title = verified.manifest.id;
  frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
  frame.setAttribute(
    "allow",
    "camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'; fullscreen 'none'; payment 'none'; usb 'none'"
  );
  frame.referrerPolicy = "no-referrer";
  frame.style.width = "100%";
  frame.style.height = "540px";
  frame.style.border = "0";
  const channel = new MessageChannel();
  let closed = false;
  let loaded = false;
  let receive: ((value: unknown) => void) | undefined;
  let rejectLoad: (error: Error) => void;
  const load = new Promise<void>((resolve, reject) => {
    rejectLoad = reject;
    frame.onload = () => {
      if (closed) return;
      if (loaded) {
        dispose();
        failed();
        return;
      }
      loaded = true;
      resolve();
    };
    frame.onerror = () => {
      dispose();
      failed();
    };
  });
  channel.port1.onmessage = (event) => {
    if (!closed) receive?.(event.data);
  };
  channel.port1.onmessageerror = () => {
    dispose();
    failed();
  };
  channel.port1.start();
  function dispose() {
    if (closed) return;
    closed = true;
    channel.port1.onmessage = null;
    channel.port1.onmessageerror = null;
    channel.port1.close();
    channel.port2.close();
    frame.onload = frame.onerror = null;
    frame.remove();
    receive = undefined;
    rejectLoad?.(new ProtocolError("cancelled", "Document closed."));
  }
  frame.src = verified.descriptor.entry_url;
  surface.replaceChildren(frame);
  let connected = false;
  return {
    load,
    dispose,
    transport: {
      send(message: Envelope) {
        if (closed) return;
        if (message.type === "host.connect" && !connected) {
          connected = true;
          // contentWindow is this exact iframe; the receiver checks both origin and parent source.
          frame.contentWindow!.postMessage(message, verified.origin, [channel.port2]);
        } else if (connected) channel.port1.postMessage(message);
      },
      subscribe(listener) {
        receive = listener;
        return () => {
          receive = undefined;
        };
      },
      close: dispose,
    },
  };
}

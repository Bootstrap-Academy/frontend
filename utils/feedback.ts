/** Deliberately independent of account/session helpers and browser persistence. */
export const FEEDBACK_IMAGE_BYTES = 3 * 1024 * 1024;
export const FEEDBACK_IMAGE_PIXELS = 8 * 1024 * 1024;
export type FeedbackDiagnostics = {
  app_build: string;
  browser: string;
  os: string;
  viewport: string;
  language: string;
  theme: string;
  reduced_motion: boolean;
};
export type FeedbackPayload = {
  request_id: string;
  kind: "bug" | "feature";
  title: string;
  description: string;
  diagnostics_consent: boolean;
  diagnostics?: FeedbackDiagnostics;
  screenshot?: { data_url: string };
};
export type FeedbackResult =
  | { status: "created"; issue_url: string }
  | { status: "pending"; request_id: string };

export function browserSummary(agent: string) {
  for (const [name, expression] of [
    ["Edge", /Edg(?:A|iOS)?\/([\d.]+)/],
    ["Firefox", /(?:Firefox|FxiOS)\/([\d.]+)/],
    ["Opera", /OPR\/([\d.]+)/],
    ["Chrome", /(?:Chrome|CriOS)\/([\d.]+)/],
    ["Safari", /Version\/([\d.]+).*Safari/],
  ] as const) {
    const match = expression.exec(agent);
    if (match) return name + " " + match[1].slice(0, 24);
  }
  return "unavailable";
}

export function osSummary(agent: string) {
  // Do not expose the raw user agent, device model, architecture or build identifier.
  if (/Android/.test(agent)) return "Android";
  if (/(iPhone|iPad|iPod)/.test(agent)) return "iOS or iPadOS";
  if (/Windows/.test(agent)) return "Windows";
  if (/Macintosh|Mac OS X/.test(agent)) return "macOS";
  if (/CrOS/.test(agent)) return "ChromeOS";
  if (/Linux/.test(agent)) return "Linux";
  return "unavailable";
}

export function feedbackPayload(
  draft: Pick<FeedbackPayload, "request_id" | "kind" | "title" | "description">,
  consent: boolean,
  diagnostics: FeedbackDiagnostics | null,
  screenshot: { data_url: string } | null
): FeedbackPayload {
  const payload: FeedbackPayload = {
    request_id: draft.request_id,
    kind: draft.kind,
    title: draft.title.trim(),
    description: draft.description.trim(),
    diagnostics_consent: consent,
  };
  if (consent && diagnostics) {
    // Explicit field selection also prevents accidental future account data spreading.
    payload.diagnostics = {
      app_build: diagnostics.app_build,
      browser: diagnostics.browser,
      os: diagnostics.os,
      viewport: diagnostics.viewport,
      language: diagnostics.language,
      theme: diagnostics.theme,
      reduced_motion: diagnostics.reduced_motion,
    };
  }
  if (screenshot) payload.screenshot = { data_url: screenshot.data_url };
  return payload;
}

export class FeedbackSendError extends Error {
  constructor(
    public readonly code: string,
    public readonly ambiguous: boolean
  ) {
    super(code);
  }
}

export async function sendFeedback(
  api: string,
  payload: FeedbackPayload,
  transport: typeof fetch = fetch,
  timeout = 25_000
): Promise<FeedbackResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await transport(api.replace(/\/$/, "") + "/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      referrerPolicy: "no-referrer",
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await response.json();
    if (
      response.status === 200 &&
      body?.status === "created" &&
      typeof body.issue_url === "string" &&
      /^https:\/\/github\.com\/Bootstrap-Academy\/Bootstrap-Academy\/issues\/[1-9]\d*$/.test(
        body.issue_url
      )
    ) {
      return { status: "created", issue_url: body.issue_url };
    }
    if (
      response.status === 202 &&
      body?.status === "pending" &&
      body.request_id === payload.request_id
    ) {
      return { status: "pending", request_id: payload.request_id };
    }
    if (
      [400, 413, 422, 429].includes(response.status) &&
      ["invalid_request", "rate_limited", "unavailable", "capacity_exceeded"].includes(body?.error)
    ) {
      throw new FeedbackSendError(body.error, false);
    }
    throw new FeedbackSendError(response.status === 409 ? "request_conflict" : "uncertain", true);
  } catch (error) {
    if (error instanceof FeedbackSendError) throw error;
    throw new FeedbackSendError("uncertain", true);
  } finally {
    clearTimeout(timer);
  }
}

export function imageDimensions(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1)
    throw new Error("invalid_image");
  const scale = Math.min(
    1,
    4096 / width,
    4096 / height,
    Math.sqrt(FEEDBACK_IMAGE_PIXELS / (width * height))
  );
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}

export type ImageRegion = { x: number; y: number; width: number; height: number };

/** These views also show private text outside editable form fields. */
export function isPrivateFeedbackPath(pathname: string) {
  return /^\/(account|profile|moderation|billing|purchase|premium|orders|subscription|vertrag-kuendigen|vertrag-widerrufen)(\/|$)/.test(
    pathname
  );
}

export function boundedRegion(region: ImageRegion, width: number, height: number): ImageRegion {
  const x = Math.max(0, Math.min(width - 1, Math.floor(region.x)));
  const y = Math.max(0, Math.min(height - 1, Math.floor(region.y)));
  return {
    x,
    y,
    width: Math.max(1, Math.min(width - x, Math.floor(region.width))),
    height: Math.max(1, Math.min(height - y, Math.floor(region.height))),
  };
}

export function arrowPoints(region: ImageRegion, width: number, height: number) {
  const clampX = (value: number) => Math.max(0, Math.min(width - 1, Math.round(value)));
  const clampY = (value: number) => Math.max(0, Math.min(height - 1, Math.round(value)));
  return {
    x: clampX(region.x),
    y: clampY(region.y),
    endX: clampX(region.x + region.width),
    endY: clampY(region.y + region.height),
  };
}

/** Mutates actual pixels, never CSS or an exportable annotation layer. */
export function applyImageEdit(canvas: HTMLCanvasElement, tool: string, raw: ImageRegion) {
  const region = boundedRegion(raw, canvas.width, canvas.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("invalid_image");
  if (tool === "crop") {
    const pixels = context.getImageData(region.x, region.y, region.width, region.height);
    canvas.width = region.width;
    canvas.height = region.height;
    canvas.getContext("2d")!.putImageData(pixels, 0, 0);
  } else if (tool === "redact") {
    context.fillStyle = "#000000";
    context.fillRect(region.x, region.y, region.width, region.height);
  } else {
    context.strokeStyle = "#ff3b30";
    context.lineWidth = Math.max(3, Math.round(canvas.width / 300));
    if (tool === "arrow") {
      const { x, y, endX, endY } = arrowPoints(raw, canvas.width, canvas.height);
      const angle = Math.atan2(endY - y, endX - x);
      const tip = Math.max(12, context.lineWidth * 4);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(endX, endY);
      context.moveTo(
        endX - tip * Math.cos(angle - Math.PI / 6),
        endY - tip * Math.sin(angle - Math.PI / 6)
      );
      context.lineTo(endX, endY);
      context.lineTo(
        endX - tip * Math.cos(angle + Math.PI / 6),
        endY - tip * Math.sin(angle + Math.PI / 6)
      );
      context.stroke();
    } else {
      context.strokeRect(region.x, region.y, region.width, region.height);
    }
  }
}

export function rasterizeScreenshot(canvas: HTMLCanvasElement): string {
  if (
    canvas.width > 4096 ||
    canvas.height > 4096 ||
    canvas.width * canvas.height > FEEDBACK_IMAGE_PIXELS
  )
    throw new Error("large_image");
  // Flatten transparency and encode only current pixels. Never send originals/layers.
  const raster = document.createElement("canvas");
  for (let attempt = 0; attempt < 12; attempt++) {
    const scale = Math.pow(0.8, attempt);
    raster.width = Math.max(1, Math.floor(canvas.width * scale));
    raster.height = Math.max(1, Math.floor(canvas.height * scale));
    const context = raster.getContext("2d")!;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, raster.width, raster.height);
    context.drawImage(canvas, 0, 0, raster.width, raster.height);
    const data = raster.toDataURL("image/png");
    const base64 = data.slice(data.indexOf(",") + 1);
    const bytes =
      (base64.length * 3) / 4 - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
    // Leave headroom for the server's independent PNG encoding.
    if (data.startsWith("data:image/png;") && bytes <= Math.floor(FEEDBACK_IMAGE_BYTES * 0.85))
      return data;
  }
  throw new Error("large_image");
}

import { cloneJson, validateSchema, type Schema } from "./schema";
import type { JsonObject } from "./types";

/** Streaming chunks are text at every boundary, even split HTML or SVG. */
export function appendLessonText(target: Node, text: string): void {
  target.appendChild(target.ownerDocument!.createTextNode(text));
}
export function setLessonText(target: Node, text: string): void {
  target.textContent = text;
}
/** Parsed/schema-checked data never dispatches an action or constructs a URL. */
export function parseLessonOutput(text: string, schema: Schema): JsonObject {
  const data: unknown = JSON.parse(text);
  validateSchema(schema, data);
  return cloneJson(data as JsonObject);
}

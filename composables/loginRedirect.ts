/**
 * The path the login follows afterwards, or an empty string. Only a path of
 * this site counts: one leading slash, no second slash or backslash after it
 * that a browser would read as another host, and no control characters.
 */
export function internalPath(value: unknown): string {
  return typeof value === "string" && /^\/(?![/\\])[^\\\u0000-\u001f]*$/.test(value) ? value : "";
}

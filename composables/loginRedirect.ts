/**
 * The path the login follows afterwards, or an empty string. Only a path of
 * this site counts: one leading slash, no second slash or backslash after it
 * that a browser would read as another host, and no control characters.
 *
 * The router decodes the path once before it uses it. So the decoded path,
 * the part before `?` or `#`, must hold no `//`, no backslash, no control
 * character and no `..` segment either. The query and the anchor are left as
 * they are.
 */
export function internalPath(value: unknown): string {
  if (typeof value !== "string" || !/^\/(?![/\\])[^\\\u0000-\u001f]*$/.test(value)) return "";
  const end = value.search(/[?#]/);
  let path: string;
  try {
    path = decodeURIComponent(end < 0 ? value : value.slice(0, end));
  } catch {
    // A path that cannot be decoded is not one this site hands out.
    return "";
  }
  return /\/\/|[\\\u0000-\u001f]|(?:^|\/)\.\.(?:\/|$)/.test(path) ? "" : value;
}

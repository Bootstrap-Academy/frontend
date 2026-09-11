/** Public documents and declarations must stay usable when a session fails. */
export function isPublicLegalRoute(path: string) {
  // Vue Router matches these fixed routes case-insensitively, including on direct entry.
  const pathname = path.split(/[?#]/, 1)[0].toLowerCase().replace(/\/+$/, "") || "/";

  return (
    pathname === "/moderation" ||
    pathname.startsWith("/moderation/") ||
    pathname === "/oauth/callback" ||
    pathname === "/docs" ||
    pathname.startsWith("/docs/") ||
    pathname === "/vertrag-kuendigen" ||
    pathname === "/vertrag-widerrufen"
  );
}

/** Use the router's current destination, including before the first page mounts. */
export function isOnPublicLegalRoute() {
  const route = useRouter().currentRoute.value;
  const path = import.meta.client && !route.matched.length ? window.location.pathname : route.path;

  return isPublicLegalRoute(path);
}

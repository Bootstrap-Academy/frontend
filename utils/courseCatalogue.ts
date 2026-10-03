export interface CourseCatalogueFilters {
  free?: boolean;
  recent_first?: boolean;
  search_term?: string;
}

export function courseCatalogueUrl(filters: CourseCatalogueFilters) {
  const query = new URLSearchParams();
  const search = filters.search_term && filters.search_term !== "---" ? filters.search_term : "";
  if (filters.recent_first) query.set("recent_first", "true");
  if (search) {
    query.set("search_term", search);
    if (filters.free) query.set("free", "true");
  }
  return `/skills/courses${query.size ? "?" + query : ""}`;
}

export function createCourseCatalogue<T extends { price?: number }>(
  fetchCourses: (url: string) => Promise<T[]>,
  identity: () => string
) {
  const pending = new Map<string, Promise<T[]>>();
  return async (filters: CourseCatalogueFilters = {}): Promise<T[]> => {
    const owner = identity();
    const url = courseCatalogueUrl(filters);
    const key = JSON.stringify([owner, url]);
    let request = pending.get(key);
    if (!request) {
      request = fetchCourses(url);
      pending.set(key, request);
    }
    let courses;
    try {
      courses = await request;
    } finally {
      if (pending.get(key) === request) pending.delete(key);
    }
    if (owner !== identity()) throw new Error("session_changed");
    // Free is a sort option: without a search it keeps every course reachable.
    // A searched free list keeps the server's filter and ordering unchanged.
    if (filters.free && (!filters.search_term || filters.search_term === "---"))
      return [
        ...courses.filter((course) => course.price === 0),
        ...courses.filter((course) => course.price !== 0),
      ];
    return courses;
  };
}

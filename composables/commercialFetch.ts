import type { $Fetch } from "ofetch";

/** Keep a received personal/learning denial visible to the existing proof guards. */
export function createCommercialFetch(parent: $Fetch): $Fetch {
  const native = parent.native;
  return parent.create(
    {},
    {
      fetch: async (request, options) => {
        const response = await native(request, options);
        if (response.status !== 401) return response;
        const denied = new Response(null, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
        try {
          // Cleanup must not hold or replace the known status. Normal responses
          // retain the parent's parsing and existing timeout behavior.
          void response.body?.cancel().catch(() => {});
        } catch {
          // A synchronous cleanup failure does not change the received denial.
        }
        return denied;
      },
    }
  );
}

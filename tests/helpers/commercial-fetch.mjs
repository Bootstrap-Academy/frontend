import { createFetch } from "ofetch";

// Adapt the existing decoded fixture handlers to the real ofetch/native seam.
// These handlers test application contracts; automatic JSON transport headers
// are omitted from their legacy options view, and tested at the native boundary
// in commercial-fetch.test.mjs instead.
export function fixtureFetch(handler) {
  if (handler.create && handler.native) return handler;
  return createFetch({
    fetch: async (request, options = {}) => {
      const url = new URL(request, "https://synthetic.invalid");
      const headers = Object.fromEntries(
        [...new Headers(options.headers)]
          .filter(([name]) => !["accept", "content-type"].includes(name))
          .map(([name, value]) => [name === "authorization" ? "Authorization" : name, value])
      );
      const legacy = { ...options, headers };
      delete legacy.signal;
      if (
        typeof legacy.body === "string" &&
        new Headers(options.headers).get("content-type")?.includes("application/json")
      )
        legacy.body = JSON.parse(legacy.body);
      let value;
      try {
        value = await handler(url.pathname + url.search, legacy);
      } catch (error) {
        const status = error?.response?.status ?? error?.statusCode;
        if (!status) throw error;
        return new Response(JSON.stringify(error.data ?? {}), {
          status,
          headers: { "content-type": "application/json" },
        });
      }
      if (value instanceof Response) return value;
      if (value instanceof Blob)
        return new Response(value, { headers: { "content-type": value.type } });
      return new Response(value === undefined ? null : JSON.stringify(value), {
        headers: { "content-type": "application/json" },
      });
    },
  });
}

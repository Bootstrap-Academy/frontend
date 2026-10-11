/**
 * What search engines and link previews read from the built site.
 *
 * It stands here and not in `nuxt.config.ts`, because part of it needs the address of the
 * site (`BASE_WEB_URL` of the runtime config), and no address is written into the code.
 *
 * - The head of the built HTML: language, the title and description of the start page, and
 *   the preview of a shared link with its image.
 * - For the pages listed in `builtHeads`, their own title, description and address in the
 *   HTML that is built for them. Every other address is answered with the HTML of the start
 *   page; there the app sets the head of the page once it has loaded.
 * - `robots.txt`.
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { defineNuxtModule } from "nuxt/kit";
import { SITE_NAME, builtHeads, canonicalUrl, siteHead } from "../utils/siteHead";

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** The built HTML of one page with its own title, description and address in the head. */
export function withHead(html: string, head: { title: string; description: string }, url: string) {
  const swaps: [RegExp, string][] = [
    [/<title>[^<]*<\/title>/, `<title>${escape(head.title)}</title>`],
    [
      /<meta name="description" content="[^"]*">/,
      `<meta name="description" content="${escape(head.description)}">`,
    ],
    [
      /<meta property="og:title" content="[^"]*">/,
      `<meta property="og:title" content="${escape(head.title)}">`,
    ],
    [
      /<meta property="og:description" content="[^"]*">/,
      `<meta property="og:description" content="${escape(head.description)}">`,
    ],
    [
      /<\/head>/,
      `<link rel="canonical" href="${escape(url)}"><meta property="og:url" content="${escape(url)}"></head>`,
    ],
  ];
  for (const [pattern, replacement] of swaps) {
    // A head that no longer has the expected shape stops the build. It must not ship unnoticed.
    if ((html.match(new RegExp(pattern.source, "g")) ?? []).length !== 1)
      throw new Error(`Built HTML: expected exactly one ${pattern.source}`);
    html = html.replace(pattern, () => replacement);
  }
  return html;
}

export const robotsTxt = () => ["User-agent: *", "Allow: /", ""].join("\n");

export default defineNuxtModule({
  meta: { name: "discoverable" },
  setup(_options, nuxt) {
    const web = String(nuxt.options.runtimeConfig.public.BASE_WEB_URL || "").replace(/\/+$/, "");
    if (!/^https:\/\/[^/]+$/.test(web)) throw new Error("BASE_WEB_URL must be an https origin");

    const head = nuxt.options.app.head;
    const { title, description } = siteHead.de.home;
    head.htmlAttrs = { ...head.htmlAttrs, lang: "de" };
    head.title = title;
    (head.meta ||= []).push(
      { key: "description", name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:locale", content: "de_DE" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:image", content: `${web}/images/preview.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" }
    );

    nuxt.hook("nitro:init", (nitro) => {
      nitro.hooks.hook("prerender:generate", (route) => {
        const own = builtHeads[route.route.replace(/\/$/, "") || "/"];
        if (own && typeof route.contents === "string")
          route.contents = withHead(route.contents, own, canonicalUrl(web, route.route));
      });
    });

    nuxt.hook("nitro:build:public-assets", async (nitro) => {
      await writeFile(join(nitro.options.output.publicDir, "robots.txt"), robotsTxt());
    });
  },
});

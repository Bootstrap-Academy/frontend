import fs from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
process.umask(0o077);
const [origin, graphFile, outputFile] = process.argv.slice(2);
assert(
  origin && graphFile && outputFile,
  "Usage: markdown.browser.mjs ORIGIN BUNDLE_GRAPH OUTPUT_JSON"
);
const graph = JSON.parse(await fs.readFile(graphFile, "utf8"));
const chunk = (name) =>
  graph.chunks.find((c) => c.modules.some((m) => m.id === `utils/markdown/${name}.ts`))?.file;
assert(chunk("renderer"));
assert(chunk("math"));
assert(chunk("highlight"));
const report = { at: new Date().toISOString(), origin, cases: [], passed: false };
const browser = await chromium.launch({
  executablePath: "/run/current-system/sw/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-background-networking"],
});
try {
  for (const width of [390, 1280])
    for (const locale of ["de", "en-US"]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, locale });
      const page = await context.newPage();
      const loaded = [];
      page.on("request", (r) => loaded.push(new URL(r.url()).pathname));
      try {
        await context.addCookies([{ name: "locale", value: locale, url: origin }]);
        await page.goto(origin + "/", { waitUntil: "networkidle" });
        const upfront = [chunk("renderer"), chunk("highlight"), chunk("math")].filter((f) =>
          loaded.includes("/" + f)
        );
        assert.equal(upfront.length, 0, "Markdown, Highlight and KaTeX stay out of guest startup");
        const outputs = await page.evaluate(
          async ({ file, mathFile, codeFile }) => {
            const render = Object.values(await import("/" + file)).find(
              (v) => typeof v === "function"
            );
            const plain = await render("**Grüße** & *learning* — [Link](https://example.org)");
            const plainRequests = performance
              .getEntriesByType("resource")
              .filter(
                (r) => r.name.endsWith("/" + mathFile) || r.name.endsWith("/" + codeFile)
              ).length;
            const code = await render('```python\nprint("<script>alert(1)</script>")\n```');
            const typed = await render("```ts\nconst n: number = 2;\n```");
            const unknown = await render(
              "```unregistered-language\n<img src=x onerror=alert(1)>\n```"
            );
            const math = await render("$x^2 + \\frac{1}{2}$");
            const inline = await render("Vorher $x^2$ danach");
            const display = await render("$$x^2$$");
            const invalid = await render("$\\unknowncommand{x}$");
            const unmatched = await render("Unvollständig $x^2");
            const evil = await render(
              "<img src=x onerror=alert(1)> [bad](javascript:alert(1)) $\\href{javascript:alert(1)}{bad}$"
            );
            const holder = document.createElement("div");
            holder.innerHTML = [code, unknown, evil, math].join("");
            return {
              plain,
              plainRequests,
              code,
              typed,
              unknown,
              math,
              inline,
              display,
              invalid,
              unmatched,
              evil,
              unsafe: !!holder.querySelector(
                'script,img,[onerror],[onclick],a[href^="javascript:"]'
              ),
            };
          },
          { file: chunk("renderer"), mathFile: chunk("math"), codeFile: chunk("highlight") }
        );
        assert(outputs.plain.includes("<strong>Grüße</strong>"));
        assert.equal(outputs.plainRequests, 0);
        assert(outputs.code.includes("hljs-string"));
        assert(outputs.code.includes("&lt;script&gt;"));
        assert(outputs.typed.includes("hljs-keyword"));
        assert(outputs.math.includes('class="katex"'));
        assert(outputs.inline.includes("Vorher ") && outputs.inline.includes(" danach"));
        assert(outputs.display.includes("katex-display"));
        assert(outputs.unmatched.includes("$x^2"));
        assert(outputs.invalid.includes("unknowncommand"));
        assert.equal(outputs.unsafe, false);
        report.cases.push({ width, locale, upfront, outputs });
      } finally {
        await context.close();
      }
    }
  report.passed = true;
} catch (e) {
  report.error = e.message;
  process.exitCode = 1;
} finally {
  await browser.close();
  report.browserClosed = true;
  await fs.writeFile(outputFile, JSON.stringify(report, null, 2) + "\n");
}
console.log(
  JSON.stringify({ passed: report.passed, cases: report.cases.length, error: report.error })
);

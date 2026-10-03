import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";

export async function renderMarkdown(source: string): Promise<string> {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false });
  const tokens = md.parse(source, {});
  const hasCode = tokens.some((token) => token.type === "fence" || token.type === "code_block");
  const hasMath = tokens.some((token) =>
    token.children?.some((child) => child.type === "text" && /\$[^\n]+\$/.test(child.content))
  );
  await Promise.all([
    hasCode
      ? import("./highlight").then(({ highlightCode }) => {
          md.options.highlight = highlightCode;
        })
      : undefined,
    hasMath ? import("./math").then(({ addMathematics }) => addMathematics(md)) : undefined,
  ]);
  return DOMPurify.sanitize(md.render(source));
}

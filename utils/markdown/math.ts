import type MarkdownIt from "markdown-it";
import katex from "katex";
import "katex/dist/katex.min.css";

export function addMathematics(md: MarkdownIt) {
  md.inline.ruler.before("escape", "katex", (state, silent) => {
    if (silent || state.src[state.pos] !== "$") return false;
    const displayMode = state.src[state.pos + 1] === "$";
    const delimiter = displayMode ? "$$" : "$";
    const start = state.pos + delimiter.length;
    let end = start;
    while (end < state.posMax) {
      if (state.src[end] === "\n") return false;
      if (state.src.startsWith(delimiter, end) && state.src[end - 1] !== "\\") break;
      end++;
    }
    if (end === start || end >= state.posMax) return false;
    try {
      const tex = state.src
        .slice(start, end)
        .replace(/[^a-zA-Z0-9{}()\\^_\/\+\-\=\[\] \:\;\.,]/g, "");
      const html = katex.renderToString(tex, { displayMode, trust: false });
      const token = state.push("html_inline", "", 0);
      token.content = html;
      state.pos = end + delimiter.length;
      return true;
    } catch {
      return false;
    }
  });
}

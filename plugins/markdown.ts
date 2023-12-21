import MarkdownIt from 'markdown-it';
import katex from 'katex';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';

export default defineNuxtPlugin((app) => {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: false,
    highlight: (str, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return (
            '<pre class="hljs"><code>' +
						hljs.highlight(lang, str, true).value +
						'</code></pre>'
          );
        } catch (__) {}
      }

      return (
        '<pre class="hljs"><code>' +
				hljs.highlightAuto(str).value +
				'</code></pre>'
      );
    },
  });

  md.inline.ruler.before('escape', 'katex', (state, silent) => {
    if (silent) return false;

    const start = state.pos;
    const end = state.posMax;

    if (state.src[start] !== '$' || state.src[start + 1] !== '$') return false;
    if (state.src[end - 1] !== '$' || state.src[end - 2] !== '$') return false;

    state.pos = start + 2;
    while (state.pos < end - 2) {
      if (state.src[state.pos] === '$' && state.src[state.pos + 1] === '$')
        break;
      state.pos++;
    }
    state.pos += 2;

    const tex = state.src.slice(start + 2, state.pos - 2);

    try {
      const html = katex.renderToString(tex);
      const sanitizedHtml = DOMPurify.sanitize(html);
      const token = state.push('html_inline', '', 0);
      token.content = sanitizedHtml;
    } catch (err) {
      if (!silent) console.error(err);
      return false;
    }

    return true;
  });

  app.provide('md', md);
});

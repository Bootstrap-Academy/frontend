import MarkdownIt from 'markdown-it';
import katex from 'katex';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import 'katex/dist/katex.min.css';

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
    let tex = '';
    let isDisplayMath = false;

    /* Display math is surrounded by $$. Inline math is surrounded by $. */
    if (state.src[start] === '$' && state.src[end - 1] === '$') {
      if (state.src[start + 1] === '$' && state.src[end - 2] === '$') {
        isDisplayMath = true;
        state.pos += 2;

        while (state.pos < end - 2) {
          if (state.src[state.pos] === '$' && state.src[state.pos + 1] === '$')
            break;
          tex += state.src[state.pos++];
        }
      } else {
        isDisplayMath = false;
        state.pos++;

        while (state.pos < end - 1) {
          if (state.src[state.pos] === '$')
            break;
          tex += state.src[state.pos++];
        }
      }

      try {
        /* Remove invalid characters from input. Then try rendering. */
        const cleanedTex = tex.replace(/[^a-zA-Z0-9{}()\\^_\/\+\-\=\[\] \:\;\.,]/g, '');
        const html = katex.renderToString(cleanedTex, { displayMode: isDisplayMath });
        const sanitizedHtml = DOMPurify.sanitize(html);
        const token = state.push('html_inline', '', 0);
        token.content = sanitizedHtml;
      } catch (err) {
        if (!silent) console.error(err);
        return false;
      }

      return true;
    }

    return false;
  });

  app.provide('md', md);
});

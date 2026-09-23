// A small browser module for the host.llm/host.project check. Not published course content.
export const apiVersion = 1;

const copy = {
  de: {
    ask: "Frag Klingel",
    prompt: "Deine Frage an den Tresen-Bot",
    send: "Fragen",
    waiting: "Klingel denkt nach …",
    example: "Samstags haben wir von 9 bis 14 Uhr offen.",
    project: "Deine Bot-Karte",
    name: "Name deines Bots",
    save: "Bot-Karte speichern",
    empty: "Noch nichts gespeichert.",
    saved: (revision, name) => `Gespeichert als „${name}“ (Stand ${revision}).`,
    conflict: "Die Karte wurde woanders geändert. Neu geladen, bitte nochmal speichern.",
    reply: "Deine Antwort an Frau Berg",
    grade: "Prüfen lassen",
    grading: "Wird geprüft …",
    passed: "Bestanden",
    failed: "Noch nicht ganz",
    next: "Weiter",
    done: "Abgeschlossen.",
  },
  en: {
    ask: "Ask Klingel",
    prompt: "Your question for the counter bot",
    send: "Ask",
    waiting: "Klingel is thinking …",
    example: "On Saturdays we're open from 9 to 2.",
    project: "Your bot card",
    name: "Your bot's name",
    save: "Save bot card",
    empty: "Nothing saved yet.",
    saved: (revision, name) => `Saved as “${name}” (version ${revision}).`,
    conflict: "The card changed elsewhere. Reloaded, please save again.",
    reply: "Your reply to Ms Berg",
    grade: "Check my reply",
    grading: "Checking …",
    passed: "Passed",
    failed: "Not quite yet",
    next: "Continue",
    done: "Completed.",
  },
};

const style = `
.llm-check { display: grid; gap: 1.25rem; }
.llm-check section { display: grid; gap: 0.6rem; padding: 1rem; border-radius: 0.75rem;
  background: rgba(127, 127, 127, 0.12); min-width: 0; }
.llm-check h2 { margin: 0; font-size: 1.1rem; }
.llm-check textarea, .llm-check input { width: 100%; box-sizing: border-box; font: inherit;
  padding: 0.6rem; border-radius: 0.5rem; border: 1px solid rgba(127, 127, 127, 0.6);
  background: transparent; color: inherit; }
.llm-check textarea { min-height: 5.5rem; resize: vertical; }
.llm-check button { min-height: 44px; width: fit-content; padding: 0.6rem 1rem; font: inherit;
  border-radius: 0.5rem; border: 0; background: #2f6fed; color: #fff; cursor: pointer; }
.llm-check button:disabled { opacity: 0.6; }
.llm-check .bubble { display: grid; gap: 0.4rem; justify-items: start; padding: 0.75rem;
  border-radius: 0.75rem; background: rgba(47, 111, 237, 0.14); overflow-wrap: anywhere; }
.llm-check .bubble:empty, .llm-check [hidden] { display: none; }
.llm-check p { margin: 0; overflow-wrap: anywhere; }
.llm-check mark { background: #ffe58a; color: #1d1d1d; padding: 0 0.1em; border-radius: 0.2em; }
.llm-check ul { margin: 0; padding-left: 1.2rem; display: grid; gap: 0.3rem; }
.llm-check .note { font-size: 0.9rem; opacity: 0.85; }
`;

export function mount(element, host) {
  const doc = element.ownerDocument;
  const node = (tag, props = {}, ...children) => {
    const item = doc.createElement(tag);
    Object.assign(item, props);
    item.append(...children);
    return item;
  };
  let t = copy[host.context.locale.startsWith("de") ? "de" : "en"];
  const root = node("div", { className: "llm-check" });
  root.append(node("style", { textContent: style }));

  // 1. Streaming answer
  const prompt = node("textarea", { id: "prompt", value: "Wann habt ihr am Samstag offen?" });
  const ask = node("button", { id: "ask", type: "button" });
  const bubble = node("div", { id: "answer-box", className: "bubble" });
  bubble.setAttribute("aria-live", "polite");
  const note = node("p", { id: "answer-note", className: "note" });
  const askHeading = node("h2");
  const promptLabel = node("label", {}, node("span"), prompt);
  root.append(node("section", {}, askHeading, promptLabel, ask, bubble, note));

  // 2. Course-wide project state
  const name = node("input", { id: "bot-name", value: "Klingel" });
  const save = node("button", { id: "save", type: "button" });
  const project = node("p", { id: "project" });
  const projectHeading = node("h2");
  const nameLabel = node("label", {}, node("span"), name);
  root.append(node("section", {}, projectHeading, nameLabel, save, project));

  // 3. Graded free text
  const reply = node("textarea", {
    id: "reply",
    value: "Hallo Frau Berg, danke für Ihre Nachricht. Ihr Rad ist morgen fertig.",
  });
  const grade = node("button", { id: "grade", type: "button" });
  const result = node("div", { id: "grade-box", className: "bubble" });
  const next = node("button", { id: "continue", type: "button", hidden: true });
  const gradeHeading = node("h2");
  const replyLabel = node("label", {}, node("span"), reply);
  root.append(node("section", {}, gradeHeading, replyLabel, grade, result, next));
  element.append(root);

  let revision = 0;
  let stored = null;

  function texts() {
    askHeading.textContent = t.ask;
    promptLabel.firstChild.textContent = t.prompt;
    ask.textContent = t.send;
    projectHeading.textContent = t.project;
    nameLabel.firstChild.textContent = t.name;
    save.textContent = t.save;
    project.textContent = stored ? t.saved(revision, stored.bot.name) : t.empty;
    gradeHeading.textContent = t.reply;
    grade.textContent = t.grade;
    next.textContent = t.next;
  }

  function showExample(message) {
    bubble.replaceChildren(host.llm.label("example"), node("p", { textContent: t.example }));
    note.textContent = message;
  }

  ask.addEventListener(
    "click",
    async () => {
      if (!host.llm) return showExample("");
      ask.disabled = true;
      note.textContent = t.waiting;
      const text = node("p", { id: "answer" });
      bubble.replaceChildren(host.llm.label("live"), text);
      host.setBusy(true);
      const answer = await host.llm.respond(
        { profile: "klingel-chat", input: [{ role: "user", content: prompt.value }] },
        { onDelta: (delta) => (text.textContent += delta.text), signal: host.signal }
      );
      host.setBusy(false);
      ask.disabled = false;
      if (answer.ok) {
        text.textContent = answer.outputs[0].text;
        note.textContent = `${answer.model.id} · ${answer.usage.output_tokens} Tokens`;
      } else if (answer.error.fallback) showExample(answer.error.message);
      else note.textContent = answer.error.message;
    },
    { signal: host.signal }
  );

  save.addEventListener(
    "click",
    async () => {
      if (!host.project) return;
      save.disabled = true;
      try {
        const current = await host.project.get();
        const state = { ...current.state, bot: { ...(current.state.bot || {}), name: name.value } };
        const saved = await host.project.save(state, current.revision);
        revision = saved.revision;
        stored = saved.state;
        texts();
      } catch (error) {
        project.textContent = error?.code === "conflict" ? t.conflict : String(error?.code);
      } finally {
        save.disabled = false;
      }
    },
    { signal: host.signal }
  );

  // The learner's own text with each quoted piece of evidence marked.
  function marked(answer, criteria) {
    const quotes = criteria.map((c) => c.evidence).filter((q) => q && answer.includes(q));
    const paragraph = node("p", { id: "marked-answer" });
    let rest = answer;
    while (rest) {
      const hits = quotes.map((q) => [rest.indexOf(q), q]).filter(([i]) => i >= 0);
      if (!hits.length) {
        paragraph.append(rest);
        break;
      }
      const [index, quote] = hits.sort((a, b) => a[0] - b[0])[0];
      paragraph.append(rest.slice(0, index), node("mark", { textContent: quote }));
      rest = rest.slice(index + quote.length);
    }
    return paragraph;
  }

  grade.addEventListener(
    "click",
    async () => {
      if (!host.llm) return;
      grade.disabled = true;
      next.hidden = true;
      result.replaceChildren(node("p", { textContent: t.grading }));
      host.change({ reply: reply.value });
      await host.save();
      const graded = await host.llm.grade(reply.value);
      grade.disabled = false;
      if (!graded.ok) {
        result.replaceChildren(node("p", { textContent: graded.error.message }));
        return;
      }
      result.replaceChildren(
        host.llm.label("grading"),
        node("p", {
          id: "verdict",
          textContent: `${graded.passed ? t.passed : t.failed} · ${graded.score}/${graded.maxScore}`,
        }),
        node("p", { id: "reason", textContent: graded.reason }),
        marked(
          reply.value,
          graded.criteria.filter((c) => c.met)
        ),
        node(
          "ul",
          { id: "criteria" },
          ...graded.criteria.map((c) => node("li", { textContent: `${c.met ? "✓" : "✗"} ${c.id}` }))
        )
      );
      next.hidden = !graded.counts;
    },
    { signal: host.signal }
  );

  next.addEventListener(
    "click",
    () => {
      host.complete({ reply: reply.value });
      next.hidden = true;
      result.append(node("p", { id: "done", textContent: t.done }));
    },
    { signal: host.signal }
  );

  function update(context) {
    t = copy[context.locale.startsWith("de") ? "de" : "en"];
    for (const control of [ask, save, grade, prompt, name, reply])
      control.disabled = context.disabled;
    texts();
  }
  update(host.context);
  root.dataset.ready = host.capabilities.join(",");
  return { update, dispose: () => element.replaceChildren() };
}

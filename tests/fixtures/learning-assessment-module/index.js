// An isolated integration fixture using the same assessment bridge as a custom lesson.
export const apiVersion = 1;

export function mount(element, host) {
  const question = document.createElement("p");
  const label = document.createElement("label");
  const caption = document.createElement("span");
  const input = document.createElement("input");
  const result = document.createElement("output");
  const button = document.createElement("button");
  input.type = "range";
  input.min = "0";
  input.max = "6";
  input.step = "1";
  button.type = "button";
  label.append(caption, input);
  element.append(question, label, result, button);
  let context;
  function update(next) {
    context = next;
    const phase = next.assessment?.view.phase || "loading";
    const de = next.locale.startsWith("de");
    question.textContent = next.assessment?.view.data?.question || "";
    caption.textContent = de ? "Deine Zahl" : "Your number";
    input.value = String(next.state.value ?? 0);
    input.disabled = next.disabled || !["ready", "incorrect"].includes(phase);
    result.dataset.phase = phase;
    result.value = `${input.value}: ${phase}`;
    button.disabled = next.disabled || !["ready", "incorrect", "correct"].includes(phase);
    button.textContent =
      phase === "correct" ? (de ? "Weiter" : "Continue") : de ? "Prüfen" : "Check";
  }
  input.addEventListener(
    "input",
    () => {
      const state = { value: Number(input.value) };
      update({ ...context, state });
      host.change(state);
    },
    { signal: host.signal }
  );
  button.addEventListener(
    "click",
    () => {
      if (context.assessment?.view.phase === "correct") host.complete({});
      else
        void host.assessment.submit({
          answers: [Number(input.value) === 3, Number(input.value) !== 3],
        });
    },
    { signal: host.signal }
  );
  update(host.context);
  return { update, dispose: () => element.replaceChildren() };
}

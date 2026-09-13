// An independently loaded browser module used by integration checks, not published course content.
export const apiVersion = 1;

export function mount(element, host) {
  const label = document.createElement("label");
  const input = document.createElement("input");
  const output = document.createElement("output");
  const complete = document.createElement("button");
  input.type = "range";
  input.min = "0";
  input.max = "10";
  input.step = "1";
  complete.type = "button";
  const caption = document.createElement("span");
  label.append(caption, input);
  element.append(label, output, complete);
  let context = host.context;
  function update(next) {
    context = next;
    const de = context.locale.startsWith("de");
    caption.textContent = de ? "Wähle eine Zahl" : "Choose a number";
    input.value = String(context.state.value ?? 0);
    input.disabled = context.disabled;
    output.value = `${input.value} × 2 = ${Number(input.value) * 2}`;
    complete.textContent = de ? "Prüfen" : "Check";
    complete.disabled = context.disabled;
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
  complete.addEventListener("click", () => host.complete({ value: Number(input.value) }), {
    signal: host.signal,
  });
  update(context);
  return { update, dispose: () => element.replaceChildren() };
}

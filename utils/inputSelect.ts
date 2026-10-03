/** Preserve the selected value and legacy second-option default for ordinary lists. */
export function selectInitialValue(current: string, options: readonly { value: string }[]): string {
  return current || (options[1]?.value ?? options[0]?.value ?? "");
}

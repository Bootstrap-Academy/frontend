export interface GuidedCheck {
  id: string;
  question: string;
  options: { value: string; text: string }[];
  answer: string;
  correct: string;
  tryAgain: string;
}

export interface GuidedExperiment {
  id: string;
  label: string;
  min: number;
  max: number;
  initial: number;
  resultLabel: string;
  operation:
    | { kind: "multiply"; factor: number }
    | { kind: "threshold"; threshold: number; below: number; atLeast: number };
  code?: string;
}

export interface GuidedStep {
  id: string;
  title: string;
  body: string;
  code?: string;
  output?: string;
  stdin?: string;
  note?: string;
  experiment?: GuidedExperiment;
  check?: GuidedCheck;
}

export interface GuidedLesson {
  steps: GuidedStep[];
}

export function guidedStage(value: unknown, count: number): number {
  return typeof value === "number" && Number.isInteger(value)
    ? Math.max(0, Math.min(Math.max(0, count - 1), value))
    : 0;
}

export function experimentInput(experiment: GuidedExperiment, value: unknown): number {
  const number = typeof value === "number" && Number.isFinite(value) ? value : experiment.initial;
  return Math.min(experiment.max, Math.max(experiment.min, Math.round(number)));
}

export function experimentResult(experiment: GuidedExperiment, value: unknown): number {
  const input = experimentInput(experiment, value);
  const operation = experiment.operation;
  return operation.kind === "multiply"
    ? input * operation.factor
    : input >= operation.threshold
      ? operation.atLeast
      : operation.below;
}

export function lessonAnswers(lesson: GuidedLesson, value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const answers = value as Record<string, unknown>;
  const checked: Record<string, string> = {};
  for (const step of lesson.steps) {
    if (!step.check) continue;
    const answer = answers[step.check.id];
    if (answer !== step.check.answer) return null;
    checked[step.check.id] = answer as string;
  }
  return checked;
}

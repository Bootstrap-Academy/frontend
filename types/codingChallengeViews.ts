export interface ExampleDraft {
  name: string;
  input: string;
  output: string;
}

export interface TaskDraft {
  name: string;
  totalPoints: number | string;
  description: string;
}

export interface CodingFeedback {
  title_key?: string;
  body_key?: string;
  body_params?: Record<string, string | number>;
  detail?: string;
}

export interface CodingProcess {
  stderr?: string;
  stdout?: string;
}

export interface CodingResult {
  verdict: string;
  message?: CodingFeedback | null;
  compile?: CodingProcess | null;
  run?: CodingProcess | null;
}

// Fields displayed from the Challenges service's CodingChallengeSummary and Submission.
export interface CodingTaskView {
  id: string;
  description: string;
  xp: number;
}

export interface ChallengeCategoryView {
  id: string;
  title: string;
  description: string;
}

export interface CodingSubmissionView {
  id: string;
  creation_timestamp: string;
  environment: string;
  result: CodingResult | null;
  /** Closed without a verdict after technical failures; absent on older services. */
  technical_failure?: boolean;
}

export interface CodingExampleView {
  id: string;
  input: string;
  output: string;
  explanation?: string | null;
  state: "pending" | "solved" | "error";
  verdict: string | null;
  message: CodingFeedback | null;
  detail: string;
  compile: CodingProcess | null;
  run: CodingProcess | null;
  stdout: string;
  stderr: string;
  loading: boolean;
}

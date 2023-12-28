export type matchingOptionArray = Array<string>;

export type matchingSolutionArray = Array<number>;

export type subTasksType = "MATCHING" | "CODING_CHALLENGE" | "MCQ";

export type matching = {
  left: matchingOptionArray;
  right: matchingOptionArray;
  solution: matchingSolutionArray;
  creator: string;
  coins: number;
  enabled: boolean;
  rated: boolean;
  retired: boolean;
  solved: boolean;
  task_id: string;
  type: subTasksType;
  xp: number;
  id: string;
};

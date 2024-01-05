export type matchingOptionArray = Array<string>;

export type matchingSolutionArray = Array<number>;

export type subTasksType = "MATCHING" | "CODING_CHALLENGE" | "MCQ";

export class Matching {
  left: matchingOptionArray = [];
  right: matchingOptionArray = [];
  solution: matchingSolutionArray = [];
  creator: string = "";
  coins: number = 0;
  enabled: boolean = false;
  rated: boolean = false;
  retired: boolean = false;
  solved: boolean = false;
  task_id: string = "";
  type: subTasksType = "MATCHING";
  xp: number = 0;
  id: string = "";
}

export class MatchingForSections {
  constructor(public sectionId: string = '', public lectureId: string = '', public matching: Matching = new Matching()) {}
}


export class SkillTree<T> {
  rows: number = 0;
  columns: number = 0;
  skills: T[] = [];
}

export class RootSkill{
  row: number = 0;
  column: number = 0;
  id: string = "";
  name: string = "";
  dependencies: string[] = [];
  dependents: string[] = [];
  skills: string [] = [];
  sub_tree_rows: number = 0;
  sub_tree_columns: number = 0;
  icon: string = "";
}

export class SubSkill{
  id: string = "";
  parent_id: string = "";
  name: string = "";
  icon: string = "";
  row: number = 0;
  column: number = 0;
  courses: string[] = [];
  dependencies: string[] = [];
  dependents: string[] = [];
}
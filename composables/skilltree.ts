import { ref } from "vue";
import { SkillTree, RootSkill, SubSkill } from "~/types/skillTreeTypes";

export const useSubSkillTree = () =>
  useState<SkillTree<SubSkill>>(
    "subSkillTree",
    () => new SkillTree<SubSkill>()
  );
export const useRootSkillTree = () =>
  useState<SkillTree<RootSkill>>(
    "rootSkillTree",
    () => new SkillTree<RootSkill>()
  );

export async function getRootSkillTree() {
  try {
    const response = await GET("/skills/skilltree");

    const rootSkillTree = useRootSkillTree();
    rootSkillTree.value = response;

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function getSubSkillTree(id: string) {
  try {
    if (!!!id) {
      throw { data: { detail: "Missing sub skill id" } };
    }

    const response = await GET(`/skills/skilltree/${id}`);

    const subSkillTree = useSubSkillTree();
    subSkillTree.value = response;

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export function createPathwaysForTree(map: any, nodes: any[], nodeSize: any) {
  if (!!!map[0] || !!!map[0][0]) return [];

  let arr: any[] = [];

  nodes.forEach((node) => {
    let startNodeRef = map[node.row][node.column];

    if (!!!startNodeRef) return;

    node.dependencies.forEach((dependency: any) => {
      let parentNode = nodes.find((n) => n.id == dependency);
      if (!!!parentNode) return;

      let parentNodeRef = map[parentNode.row][parentNode.column];

      let x1 = startNodeRef?.getAttribute("x") ?? 0;
      let y1 = startNodeRef?.getAttribute("y") ?? 0;
      let x2 = parentNodeRef?.getAttribute("x") ?? 0;
      let y2 = parentNodeRef?.getAttribute("y") ?? 0;

      let space = nodeSize * 0.5;

      if (x1 != 0 && y1 != 0 && x2 != 0 && y2 != 0) {
        arr.push({
          node: node.id,
          parent: parentNode.id,
          path: `M${parseInt(x1) + space} ${parseInt(y1) + space} L${
            parseInt(x2) + space
          } ${parseInt(y2) + space}`,
        });
      }
    });
  });

  return arr;
}

export function scrollMapToNode(
  map: any,
  mapRef: any,
  nodeSize: number,
  zoomLevel: number,
  row: number,
  column: number,
  smooth: boolean
) {
  if (!!!map[row] || !!!map[row][column]) return;

  let ref = map[row][column];

  if (!!!ref) return;

  let shiftBy;
  if (zoomLevel == 5) {
    shiftBy = nodeSize * 0.5;
  } else if (zoomLevel == 4) {
    shiftBy = nodeSize * 0.5;
  } else if (zoomLevel == 3) {
    shiftBy = nodeSize * 0.5;
  } else if (zoomLevel == 2) {
    shiftBy = nodeSize * 0.5;
  } else {
    shiftBy = nodeSize * 0.5;
  }

  let cx = parseInt(ref.getAttribute("x") ?? 0) + shiftBy;
  let cy = parseInt(ref.getAttribute("y") ?? 0) + shiftBy;
  let screenCenterLeft = mapRef.clientWidth * 0.5;
  let screenCenterTop = mapRef.clientHeight * 0.5;
  let centerTop = cy - screenCenterTop;
  let centerLeft = cx - screenCenterLeft;

  mapRef.scroll({
    top: centerTop,
    left: centerLeft,
    behavior: smooth ? "smooth" : "auto",
  });
}

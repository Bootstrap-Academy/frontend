import { ref } from 'vue';

export const useSkillTree = () => useState('skillTree', () => null);
export const useSkillTreeId = () => useState('skillTreeId', () => '');
export const useCertificates = () => useState('certificates', () => []);

export async function getSkillTree(id: string) {
	const skillTreeId = useSkillTreeId();
	skillTreeId.value = id;

	try {
		if (!!!skillTreeId.value) {
			throw { data: { detail: 'Missing root skill id' } };
		}

		let url =
			skillTreeId.value == 'root'
				? `/skills/skilltree`
				: `/skills/skilltree/${skillTreeId.value}`;

		const response = await GET(url);

		const skillTree = useSkillTree();
		skillTree.value = response;

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function updateSkillTreeSettings(body: any) {
	const skillTreeId = useSkillTreeId();

	try {
		if (!!!skillTreeId.value) {
			throw { data: { detail: 'Missing root skill id' } };
		}

		let url =
			skillTreeId.value == 'root'
				? `/skills/skilltree`
				: `/skills/skilltree/${skillTreeId.value}`;

		const response = await PATCH(url, body);

		// const skillTree = useSkillTree();
		// skillTree.value = response;

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function addSkill(body: any) {
	const skillTreeId = useSkillTreeId();

	try {
		if (!!!skillTreeId.value) {
			throw { data: { detail: 'Missing root skill id' } };
		}

		let url =
			skillTreeId.value == 'root'
				? `/skills/skilltree`
				: `/skills/skilltree/${skillTreeId.value}`;

		const response = await POST(url, body);

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function updateSkill(id: string, body: any) {
	const skillTreeId = useSkillTreeId();

	try {
		if (!!!skillTreeId.value) {
			throw { data: { detail: 'Missing root skill id' } };
		}

		let url =
			skillTreeId.value == 'root'
				? `/skills/skilltree/${id}`
				: `/skills/skilltree/${skillTreeId.value}/${id}`;

		const response = await PATCH(url, body);

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function deleteSkill(id: string) {
	const skillTreeId = useSkillTreeId();

	try {
		if (!!!skillTreeId.value) {
			throw { data: { detail: 'Missing root skill id' } };
		}

		let url =
			skillTreeId.value == 'root'
				? `/skills/skilltree/${id}`
				: `/skills/skilltree/${skillTreeId.value}/${id}`;

		const response = await DELETE(url);

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

			let x1 = startNodeRef?.getAttribute('x') ?? 0;
			let y1 = startNodeRef?.getAttribute('y') ?? 0;
			let x2 = parentNodeRef?.getAttribute('x') ?? 0;
			let y2 = parentNodeRef?.getAttribute('y') ?? 0;

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
		shiftBy = nodeSize * 0.45;
	}

	let cx = parseInt(ref.getAttribute('x') ?? 0) + shiftBy;
	let cy = parseInt(ref.getAttribute('y') ?? 0) + shiftBy;
	let screenCenterLeft = mapRef.clientWidth * 0.5;
	let screenCenterTop = mapRef.clientHeight * 0.5;
	let centerTop = cy - screenCenterTop;
	let centerLeft = cx - screenCenterLeft;

	mapRef.scroll({
		top: centerTop,
		left: centerLeft,
		behavior: smooth ? 'smooth' : 'auto',
	});
}

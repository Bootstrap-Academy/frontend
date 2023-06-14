import { Ref } from 'nuxt/dist/app/compat/capi';

export const useAllCodingChallengesInATask: () => Ref<any[]> = () =>
    useState('allCodingChallengesInATask', () => []);


export async function getAllCodingChallengesInATask(taskId: string) {
    try {
        const response = await GET(`/challenges/tasks/${taskId}/coding_challenges`);

        const allCodingChallengesInATask = useAllCodingChallengesInATask();
        allCodingChallengesInATask.value = response ?? [];

        return [response, null];
    } catch (error: any) {
        return [null, error.data];
    }
}


export async function getEvaluator(taskId: string, subTaskId: any) {
    try {
        const response = await GET(`/challenges/tasks/${taskId}/coding_challenges/${subTaskId}/evaluator`);
        return [response, null];
    } catch (error: any) {
        return [null, error.data];
    }
}


export async function getSolution(taskId: string, subTaskId: any) {
    try {
        const response = await GET(`/challenges/tasks/${taskId}/coding_challenges/${subTaskId}/solution`);
        return [response, null];
    } catch (error: any) {
        return [null, error.data];
    }
}




export async function createCodingChallenge(taskId: string, body: any) {
    try {
        const response = await POST(`/challenges/tasks/${taskId}/coding_challenges`, body);
        await getAllCodingChallengesInATask(taskId)
        return [response, null];

    } catch (error: any) {
        return [null, error.data];
    }
}


export async function deleteCodingChallenge(taskId: string, subTaskId: any) {
    try {
        const response = await DELETE(`/challenges/tasks/${taskId}/coding_challenges/${subTaskId}`);
        await getAllCodingChallengesInATask(taskId)
        return [response, null];

    } catch (error: any) {
        return [null, error.data];
    }
}

export async function updateCodingChallenge(taskId: string, subTaskId: any, body: any) {
    try {
        const response = await PATCH(`/challenges/tasks/${taskId}/coding_challenges/${subTaskId}`,
            body
        );
        await getAllCodingChallengesInATask(taskId)
        return [response, null];

    } catch (error: any) {
        return [null, error.data];
    }
}

import { Ref } from 'nuxt/dist/app/compat/capi';

export const useAllCodingChallengesInATask: () => Ref<any[]> = () =>
    useState('challengesCategories', () => []);


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

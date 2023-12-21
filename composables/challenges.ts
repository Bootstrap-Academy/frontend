import type { Ref } from 'vue';
import { description } from '~~/description';

export const useMyChallengesStats: () => Ref<any> = () =>
  useState('myChallengesStats', () => null);

export const useChallengesCategories: () => Ref<any[]> = () =>
  useState('challengesCategories', () => []);

export const useChallengeCategory: () => Ref<any> = () =>
  useState('challengeCategory', () => null);

export const useChallenges: () => Ref<any[]> = () =>
  useState('challenges', () => []);

export const useChallenge: () => Ref<any> = () =>
  useState('challenge', () => null);

// export const useCategoryStats: () => Ref<any> = () =>
// 	useState("useCategoryStats", () => null)

export async function getMyChallengesStats() {
  try {
    const response = await GET('/auth/sessions/challenges/login_url');
    // const response = await GET('/challenges/categories');

    const myChallengesStats = useMyChallengesStats();
    // myChallengesStats.value = response ?? '';
    myChallengesStats.value = {
      rank: 3,
      score: {
        current: 350,
        total: 500,
      },
      challenges: {
        total: 35,
        solved: 1,
        incorrect: 1,
        untried: 4,
        unlocked: 4,
        locked: 29,
      },
      categories: {
        completed: 4,
        total: 7,
      },
    };

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function getChallengesCategories() {
  try {
    const response = await GET('/challenges/categories');

    const challengesCategories = useChallengesCategories();
    challengesCategories.value = response ?? [];


    return [response, null];
  } catch (error: any) {
    let msg = error?.data?.error
    if (msg == "unverified") {
      openSnackbar("error", "Error.VerifyToGetChallenges")
      return [null, error.data];
    }
    return [null, error.data];
  }
}

export async function getChallengeCategory(categoryID: string) {
  try {
    const response = await GET(`/challenges/categories/${categoryID}`);

    const category = useChallengeCategory();
    category.value = response ?? null;

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function getChallengesByCategory(categoryID: string) {
  try {
    const response = await GET(
      `/challenges/categories/${categoryID}/challenges`
    );

    const challenges = useChallenges();
    challenges.value = response ?? [];

    return [response, null];
  } catch (error: any) {
    let msg = error?.data?.error
    if (msg == "unverified") {
      openSnackbar("error", "Error.VerifyToGetChallenges")
      return [null, error.data]
    } return [null, error.data];
  }
}

export async function getChallenge(categoryID: string, challengeID: string) {
  try {
    const response = await GET(
      `/challenges/categories/${categoryID}/challenges/${challengeID}`
    );

    const challenge = useChallenge();
    challenge.value = response ?? null;

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function updateChallenge(categoryID: string, challengeID: string, body: any) {
  try {
    const response = await PATCH(
      `/challenges/categories/${categoryID}/challenges/${challengeID}`,
      body
    );

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function deleteChallenge(categoryID: string, challengeID: string) {
  try {
    const response = await DELETE(
      `/challenges/categories/${categoryID}/challenges/${challengeID}`,
    );
    // getChallengesByCategory(categoryID)
    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function createChallenge(categoryID: string, body: any) {
  try {
    const response = await POST(
      `/challenges/categories/${categoryID}/challenges`,
      body
    );

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function getStatsCategoryWiseForCodingChallenges(categoryId: any) {
  try {
    const res = await GET(`/challenges/categories/${categoryId}/stats?category_id=${categoryId}`)
    // const categoryStats = useCategoryStats()
    // categoryStats.value = res
    return [res, null]
  }
  catch (error: any) {
    console.log("inside error block for  stats", error)
    return [null, error.data];

  }

}

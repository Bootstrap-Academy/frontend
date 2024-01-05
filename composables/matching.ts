import { Matching, MatchingForSections } from "~~/types/matching";
export const useMyMatchings = () => useState("myMatchings", () => []);
export const useMatchings = () => useState<Matching[]>("matchings", () => []);
export const useMatchingsInLecture = () => useState<Matching[]>("matchingsInLecture", () => []);
export const useMatching = () => useState<Matching>("matching", (): Matching => new Matching());
export const useMatchingsForLectures = () => useState<MatchingForSections[]>("matchingForLectures", (): MatchingForSections[] => [] )

export async function createMatching(body: any, task_id: any) {
  try {
    const response = await POST(`/challenges/tasks/${task_id}/matchings`, body);
    const user: any = useUser();
    await getMyMatchingsInTask(task_id, user?.value.id ?? "");
    return [response, null];
  } catch (error: any) {
    console.log("error is", error);
    let msg = error?.data?.error ?? "";
    if (msg == "subtask_not_found") {
      return [null, "Error.QuizOrCodingChallengeNotFound"];
    } else if (msg == "permission_denied") {
      return [null, "Error.NotAllowedForRatings"];
    } else if (msg == "banned") {
      return [null, "Error.UserIsBanned"];
    }
    return [null, error];
  }
}

export async function updateMatching(body: any, task_id: any, matching_id: any) {
  try {
    const response = await PATCH(`/challenges/tasks/${task_id}/matchings/${matching_id}`, body);
    console.log("response ", response);
    return [response, null];
  } catch (error) {
    console.log("error is", error);
    return [null, error];
  }
}

export async function getMatching(matching_id: any, task_id: any) {
  try {
    const response = await GET(`/challenges/tasks/${task_id}/matchings/${matching_id}`);
    console.log("response ", response);
    return [response, null];
  } catch (error) {
    console.log("error is", error);
    return [null, error];
  }
}

export async function getMatchingAndSolution(matching_id: any, task_id: any) {
  try {
    const response = await GET(`/challenges/tasks/${task_id}/matchings/${matching_id}/solution`);
    console.log("response ", response);
    const matching = useMatching();
    matching.value = response ?? null;
    return [response, null];
  } catch (error) {
    console.log("error is", error);
    return [null, error];
  }
}

export async function getMatchingsInTask(task_id: any) {
  try {
    const response = await GET(`/challenges/tasks/${task_id}/matchings`);
    const matchings = useMatchings();
    matchings.value = response;
    console.log("getMatchingsInTask", response);
    return [response, null];
  } catch (error) {
    console.log("error is", error);
    return [null, error];
  }
}

export async function getMyMatchingsInTask(task_id: any, creator: any) {
  try {
    const response = await GET(`/challenges/tasks/${task_id}/matchings?creator=${creator}`);
    const myMatchings = useMyMatchings();
    myMatchings.value = response;

    return [response, null];
  } catch (error) {
    console.log("error is", error);
    return [null, error];
  }
}

export async function deleteMatching(taskId: any, subTaskId: any) {
  try {
    const res = await DELETE(`/challenges/tasks/${taskId}/subtasks/${subTaskId}`);
    const route = useRoute();
    const containQuizWord = route.fullPath.includes("/quizzes/");
    const containCreateWord = route.fullPath.includes("/create");

    if (containCreateWord && containQuizWord) {
      const user = useUser();
      await getMyMatchingsInTask(taskId, user?.value.id ?? "");
    } else {
      await getMatchingsInTask(taskId);
    }
    return [res, null];
  } catch (error) {
    return [null, error];
  }
}

export async function solveMatching(task_id: any, subTask_id: any, body: any) {
  try {
    const res = await POST(`/challenges/tasks/${task_id}/matchings/${subTask_id}/attempts`, body);
    let success = null;
    console.log("ress", res);
    if (!!res.solved) {
      success = true;
    } else if (!!!res.solved) {
      success = false;
    }
    return [success, null];
  } catch (error: any) {
    if (error.data.error == "not_enough_hearts") {
      return [null, "Error.NotEnoughHeartsForMatching"];
    } else if (error.detail == "Error.TooManyAttemptsForQuiz") {
      return [null, "Error.TooManyAttemptsForQuiz"];
    }
    console.log("error", error);
    return [null, error];
  }
}

export async function getMatchingsInLecture(lecture: string) {
  const matchings = useMatchings();
  const matchingsInLecture = useMatchingsInLecture();
  matchingsInLecture.value.splice(0)
  const response: Matching[] = await GET(`/challenges/tasks/${lecture}/matchings`);
  if (response.length) {
    matchings.value.push(...response);
    matchingsInLecture.value = response
    return response
  }
}

export async function getMatchingsInCourse(courseId: any, section_id: any = "", lecture_id: any = "") {
  try {
    if (!!!section_id && !!!lecture_id) {
      const res = await GET(`/challenges/courses/${courseId}/tasks`);
      const quizzes = useQuizzes();
      quizzes.value = res ?? [];
      return [res, null];
    } else {
      const res = await GET(`/challenges/courses/${courseId}/tasks?lecture_id=${lecture_id}&section_id=${section_id}`);
      const quizzes = useQuizzes();
      quizzes.value = res ?? [];
      return [res, null];
    }
  } catch (error: any) {
    let msg = error?.data?.error;
    if (msg == "unverified") {
      openSnackbar("error", "Error.VerifyToGetQuizzes");
      return [null, error];
    }

    return [null, error];
  }
}

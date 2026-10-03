import type { Matching, MatchingForSections } from "~~/types/matching";
export const useMatchings = () => useState<Matching[]>("matchings", () => []);
export const useMatchingsInLecture = () => useState<Matching[]>("matchingsInLecture", () => []);
export const useMatchingsForLectures = () =>
  useState<MatchingForSections[]>("matchingForLectures", (): MatchingForSections[] => []);
export const useMatchingsInCourse = () => useState<Matching[]>("matchingsInCourse", () => []);

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

export async function getMatchingsInSkill(skillId: any) {
  try {
    const res = await GET(`/challenges/skills/${skillId}/tasks`);
    const matchings = useMatchings();
    matchings.value = res ?? [];
    return [res, null];
  } catch (error: any) {
    let msg = error?.data?.error;
    if (msg == "unverified") {
      openSnackbar("error", "Error.VerifyToGetQuizzes");
      return [null, error];
    }
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
    if (error?.data?.error == "not_enough_hearts") {
      return [null, "Error.NotEnoughHeartsForMatching"];
    } else if (error?.detail == "Error.TooManyAttemptsForQuiz") {
      return [null, "Error.TooManyAttemptsForQuiz"];
    }
    console.log("error", error);
    return [null, error];
  }
}

export async function getMatchingsInLecture(lecture: string) {
  const matchings = useMatchings();
  const matchingsInLecture = useMatchingsInLecture();
  matchingsInLecture.value.splice(0);
  const response: Matching[] = await GET(`/challenges/tasks/${lecture}/matchings`);
  if (response.length) {
    matchings.value.push(...response);
    matchingsInLecture.value = response;
    return response;
  }
}

export async function getMatchingsInCourse(
  courseId: any,
  section_id: any = "",
  lecture_id: any = ""
) {
  try {
    const matchingsInCourse = useMatchingsInCourse();
    if (!!!section_id && !!!lecture_id) {
      const res = await GET(`/challenges/courses/${courseId}/tasks`);
      matchingsInCourse.value = res ?? [];
      return [res, null];
    } else {
      const res = await GET(
        `/challenges/courses/${courseId}/tasks?lecture_id=${lecture_id}&section_id=${section_id}`
      );
      matchingsInCourse.value = res ?? [];
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

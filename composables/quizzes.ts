import { useState } from "#app";
import { LecturesWithQuiz, Quiz } from "~/types/courseTypes";
import { GET } from "./fetch";
import { useMatchingsForLectures } from "./matching";
import { MatchingForSections } from "~/types/matching";
import type { RefSymbol } from "@vue/reactivity";

export const useQuizzes = () => useState<any[]>("quizzes", () => []);
export const useQuizzesInCourseInfo = () => useState<LecturesWithQuiz[]>("quizzesInCourseInfo", () => []);
export const useQuizzesInCourse = () => useState<Quiz[]>("quizzesInCourse", () => []);
export const useQuizzesInLectureInfo = () => useState<LecturesWithQuiz[]>("quizzesInLectureInfo", () => []);
export const useQuizzesInLecture = () => useState<Quiz[]>("quizzesInLecture", () => []);
export const useQuiz = () => useState<any>("quiz", () => null);
export const useSubTasksInQuiz = () => useState<Quiz[]>("subTasksInQuiz", () => []);
export const useSubTaskInQuiz = () => useState<Quiz>("subTaskInQuiz", () => new Quiz());
export const useSubTaskAndSolutionInQuiz = () => useState<any>("subTaskAndSolutionInQuiz", () => null);

export async function getQuiz(id: string) {
  try {
    const quizzes = useQuizzes();
    const quiz = useQuiz();
    quiz.value = quizzes.value.find((q) => q.id == id);
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function getQuizzes(courseId: string, sectionId?: string, lectureId?: string) {
  const quizzesInLecture = useQuizzesInLecture();
  const quizzesInCourse = useQuizzesInCourse();
  const quizInfo = useQuizzes();
  const challenges = useAllCodingChallengesInATask();

  quizInfo.value.splice(0);
  challenges.value.splice(0);
  quizzesInCourse.value.splice(0);
  quizzesInLecture.value.splice(0);

  await getQuizzesInCourse(courseId);
  await assignQuizzesInCourse();

  if (sectionId && lectureId) {
    await getQuizzesInLecture(courseId, sectionId, lectureId);
    assignLectureQuizzes();
    await getAllCodingChallengesInATask(quizInfo.value[0].id);
  }
}

export async function getFilteredQuizzes(filters: any[]) {
  try {
    let query = "";

    for (let key in filters) {
      if (typeof filters[key] == "object" && filters[key].length > 0) {
        filters[key].forEach((item: any) => {
          query = query + `${key}=${item}&`;
        });
      } else if (typeof filters[key] == "boolean" && filters[key] == true) {
        query = query + `${key}=${filters[key]}&`;
      } else if (typeof filters[key] == "string" && !!filters[key] && filters[key] != "---") {
        query = query + `${key}=${filters[key]}&`;
      } else if (typeof filters[key] == "number" && filters[key] != -1) {
        query = query + `${key}=${filters[key]}&`;
      }
    }
    const quizzes = useQuizzes();
    const response = quizzes.value;

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function editQuiz(id: string, body: any) {
  try {
    const quizzes = useQuizzes();
    quizzes.value = quizzes.value.map((q) => {
      return q.id == id ? body : q;
    });

    const quiz = useQuiz();
    quiz.value = body;
    return [body, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

// functions written by usman

export async function getQuizzesInSkill(skillId: any) {
  try {
    const res = await GET(`/challenges/skills/${skillId}/tasks`);
    const quizzes = useQuizzes();
    quizzes.value = res ?? [];
    assignQuizzesInCourse();
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

export async function getQuizzesInCourse(courseId: string) {
  const res = await GET(`/challenges/courses/${courseId}/tasks`)
    .then((res) => {
      const quizzes = useQuizzes();
      quizzes.value = res;
      assignQuizzesInCourse();
      return [res, null];
    })
    .catch((error: any) => {
      let msg = error?.data?.error;
      if (msg == "unverified") {
        openSnackbar("error", "Error.VerifyToGetQuizzes");
        return [null, error];
      }
    });
}

export const assignQuizzesInCourse = async () => {
  const subTasks = useSubTasksInQuiz();
  const allQuizzesInfo = useQuizzes();
  const allQuizzes = useQuizzesInCourse();
  const matchings = useMatchings();
  const matchesForLectures = useMatchingsForLectures();

  matchesForLectures.value.splice(0);
  subTasks.value.splice(0);
  allQuizzes.value.splice(0);
  matchings.value.splice(0);

  if (allQuizzesInfo.value.length) {
    allQuizzesInfo.value.forEach(async (lecture) => {
      await getSubTasksInQuiz(lecture.id).then(() => {
        subTasks.value.forEach((quiz) => {
          if (!allQuizzes.value.some((question) => question.id === quiz.id)) {
            allQuizzes.value.push(quiz);
          }
        });
      });
    });
    allQuizzesInfo.value.forEach(async (lecture) => {
      console.log('getting Matches')
      const matchesInLecture = await getMatchingsInLecture(lecture.id);
      matchesInLecture?.forEach((matching) => {
        if (!matchesForLectures.value.some((match) => match.matching.id === matching.id)) {
          matchesForLectures.value.push(new MatchingForSections(lecture.section_id, lecture.lecture_id, matching));
        }
      });
    });
  }
};

export async function getQuizzesInLecture(courseId: any, section_id: string = "", lecture_id: string = "") {
  const res = await GET(`/challenges/courses/${courseId}/tasks`, {
    section_id: section_id === "" ? undefined : section_id,
    lecture_id: lecture_id === "" ? undefined : lecture_id
  })
    .then(async (res) => {
      await getMatchingsInCourse(courseId, section_id, lecture_id);
      const quizzes = useQuizzesInLectureInfo();
      quizzes.value = res ?? [];

      return [res, null];
    })
    .catch((error: any) => {
      let msg = error?.data?.error;
      if (msg == "unverified") {
        openSnackbar("error", "Error.VerifyToGetQuizzes");
        return [null, error];
      }
    });
}

export const assignLectureQuizzes = async () => {
  const subTasksInSkill = useSubTasksInQuiz();
  const quizzesInLectureInfo = useQuizzesInLectureInfo();
  const quizzesInLecture = useQuizzesInLecture();

  if (quizzesInLectureInfo.value.length) {
    await getSubTasksInQuiz(quizzesInLectureInfo.value[0].id);

    subTasksInSkill.value.forEach((quiz) => {
      console.log('subTasksInSkill', subTasksInSkill.value, quiz)
      quizzesInLecture.value.push(quiz);
    });

    await getMatchingsInLecture(quizzesInLectureInfo.value[0].id);
  }
};

export async function getSubTasksInQuiz(taskId: any, creator: any = "") {
  try {
    let query = "";

    if (!!creator) {
      query = `/challenges/tasks/${taskId}/multiple_choice?creator=${creator}`;
    } else {
      query = `/challenges/tasks/${taskId}/multiple_choice`;
    }
    const res = await GET(query);
    const subTasksInQuiz = useSubTasksInQuiz();
    subTasksInQuiz.value = res ?? [];
    return [res, null];
  } catch (error) {
    return [null, error];
  }
}

export async function createQuiz(courseId: any, body: any) {
  try {
    const res = await POST(`/challenges/courses/${courseId}/tasks`, body);
    return [res, null];
  } catch (error: any) {
    return [null, error];
  }
}

export async function getSubTaskInQuiz(taskId: any, subTaskId: any) {
  try {
    const res = await GET(`/challenges/tasks/${taskId}/multiple_choice/${subTaskId}`);
    const subTaskInQuiz = useSubTaskInQuiz();
    subTaskInQuiz.value = res ?? null;
    return [res, null];
  } catch (error) {
    return [null, error];
  }
}
export async function getSubTaskAndSolutionInQuiz(taskId: any, subTaskId: any) {
  try {
    const res = await GET(`/challenges/tasks/${taskId}/multiple_choice/${subTaskId}/solution`);
    const subTaskAndSolutionInQuiz = useSubTaskAndSolutionInQuiz();
    subTaskAndSolutionInQuiz.value = res ?? null;
    return [res, null];
  } catch (error) {
    return [null, error];
  }
}

export async function createSubTaskInQuiz(taskId: any, body: any) {
  try {
    const res = await POST(`/challenges/tasks/${taskId}/multiple_choice`, body);
    const user: any = useUser();
    await getSubTasksInQuiz(taskId, user?.value.id ?? "");
    return [res, null];
  } catch (error: any) {
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

export async function deleteSubTaskInQuiz(taskId: any, subTaskId: any) {
  try {
    const res = await DELETE(`/challenges/tasks/${taskId}/subtasks/${subTaskId}`);
    const route = useRoute();
    const containQuizWord = route.fullPath.includes("/quizzes/");
    const containCreateWord = route.fullPath.includes("/create");

    if (containCreateWord && containQuizWord) {
      const user: any = useUser();
      await getSubTasksInQuiz(taskId, user?.value.id ?? "");
    } else {
      await getSubTasksInQuiz(taskId);
    }
    return [res, null];
  } catch (error) {
    return [null, error];
  }
}

export async function updateSubTaskInQuizForUser(taskId: any, subTaskId: any, body: any) {
  try {
    const res = await PATCH(`/challenges/tasks/${taskId}/subtasks/${subTaskId}`, body);
    const user: any = useUser();
    await getSubTasksInQuiz(taskId, user?.value.id ?? "");
    return [res, null];
  } catch (error) {
    return [null, error];
  }
}

export async function updateSubTaskInQuizForAdmin(taskId: any, subTaskId: any, body: any) {
  try {
    const res = await PATCH(`/challenges/tasks/${taskId}/multiple_choice/${subTaskId}`, body);
    const user: any = useUser();
    await getSubTasksInQuiz(taskId, user?.value.id ?? "");
    return [res, null];
  } catch (error) {
    return [null, error];
  }
}

export async function attempQuiz(taskId: any, subTaskid: any, body: any) {
  try {
    const res = await POST(`challenges/tasks/${taskId}/multiple_choice/${subTaskid}/attempts`, body);
    let success = null;
    if (!!res.error) {
      success = "Too Much Requests";
    } else if (!!res.solved) {
      success = true;
    } else if (!!!res.solved) {
      success = false;
    }
    return [success, null];
  } catch (error: any) {
    if (error.data.error == "not_enough_hearts") {
      return [null, "Error.NotEnoughHeartsForQuiz"];
    } else if (error.detail == "Error.TooManyAttemptsForQuiz") {
      return [null, "Error.TooManyAttemptsForQuiz"];
    }
    return [null, error.data];
  }
}

export async function rateQuiz(taskId: any, subTaskid: any, body: any) {
  try {
    const res = await POST(`challenges/tasks/${taskId}/subtasks/${subTaskid}/feedback`, body);
    return [res, null];
  } catch (error: any) {
    let msg = error?.data?.error ?? "";
    if (msg == "subtask_not_found") {
      return [null, "Error.QuizOrCodingChallengeNotFound"];
    } else if (msg == "permission_denied") {
      return [null, "Error.NotAllowedForRatings"];
    } else if (msg == "banned") {
      return [null, "Error.UserIsBanned"];
    } else {
      return [null, error];
    }
  }
}

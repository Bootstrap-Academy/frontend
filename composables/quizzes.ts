import { useState } from "#app";
import { GET } from "./fetch";
export const useQuizzes = () => useState<any[]>("quizzes", () => []);
export const useQuiz = () => useState<any>("quiz", () => null);
export const useSubTasksInQuiz = () =>
  useState<any>("subTasksInQuiz", () => []);
export const useSubTaskInQuiz = () =>
  useState<any>("subTaskInQuiz", () => null);
export const useSubTaskAndSolutionInQuiz = () =>
  useState<any>("subTaskAndSolutionInQuiz", () => null);

export async function getQuiz(id: string) {
  try {
    // const response = await GET(`/quizzes/quizzes/${id}`);

    // const quiz = useQuiz();
    // quiz.value = response ?? null;

    // return [response, null];

    await getQuizzes();
    const quizzes = useQuizzes();
    const quiz = useQuiz();
    quiz.value = quizzes.value.find((q) => q.id == id);
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function getQuizzes() {
  try {
    // const response = await GET('/quizzes/quizzes');

    // const quizzes = useQuizzes();
    // quizzes.value = response ?? [];

    // return [response, null];

    await sleep(3000);
    const quizzes = useQuizzes();
    quizzes.value = [
      {
        id: "2342344234",
        question: "What is Vue?",
        type: "multi-choice",
        price: 0,
        options: [
          {
            id: "23432443",
            answer: "Framework",
            correct: false,
          },
          {
            id: "23432443",
            answer: "Framework",
            correct: false,
          },
          {
            id: "23432443",
            answer: "Framework",
            correct: false,
          },
          {
            id: "23432443",
            answer: "Framework",
            correct: false,
          },
          {
            id: "9284ruh3ifjcnio3hprv",
            answer: "Node JS",
            correct: false,
          },
          {
            id: "2343229ru389gfuhbvwjcio2hc19vg443",
            answer: "Library",
            correct: true,
          },
        ],
      },
      {
        id: "fnhiuhriu4nvr",
        question: "Which is the powerhouse of cell?",
        type: "multi-choice",
        price: 1,
        options: [
          {
            id: ";3qjfnvjr noi2vhg7re3refbi1rf",
            answer: "Mitochondria",
            correct: true,
          },
          {
            id: "0982j2lfmlef",
            answer: "Plasma",
            correct: false,
          },
          {
            id: "01tu",
            answer: "Brain",
            correct: false,
          },
        ],
      },
    ];
  } catch (error: any) {
    return [null, error.data];
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
      } else if (
        typeof filters[key] == "string" &&
        !!filters[key] &&
        filters[key] != "---"
      ) {
        query = query + `${key}=${filters[key]}&`;
      } else if (typeof filters[key] == "number" && filters[key] != -1) {
        query = query + `${key}=${filters[key]}&`;
      }
    }

    // const response = await GET(`/skills/courses?${query}`);
    await getQuizzes();
    const quizzes = useQuizzes();
    const response = quizzes.value;

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function editQuiz(id: string, body: any) {
  try {
    // const response = await PATCH(`/quizzes/quizzes/${id}`,body);

    // const quiz = useQuiz();
    // quiz.value = response ?? null;

    // return [response, null];

    await getQuizzes();
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

export async function getQuizzesInCourse(
  courseId: any,
  section_id: any = "",
  lecture_id: any = ""
) {
  try {
    if (!!!section_id && !!!lecture_id) {
      const res = await GET(`/challenges/courses/${courseId}/tasks`);
      const quizzes = useQuizzes();
      quizzes.value = res ?? [];
      return [res, null];
    } else {
      const res = await GET(
        `/challenges/courses/${courseId}/tasks?lecture_id=${lecture_id}&section_id=${section_id}`
      );
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
    console.log("body is", body);
    const res = await POST(`/challenges/courses/${courseId}/tasks`, body);
    return [res, null];
  } catch (error: any) {
    console.log("errorrrrrrrrrrrrr", error);
    return [null, error];
  }
}

export async function getSubTaskInQuiz(taskId: any, subTaskId: any) {
  try {
    const res = await GET(
      `/challenges/tasks/${taskId}/multiple_choice/${subTaskId}`
    );
    const subTaskInQuiz = useSubTaskInQuiz();
    subTaskInQuiz.value = res ?? null;
    return [res, null];
  } catch (error) {
    return [null, error];
  }
}

export async function getSubTaskAndSolutionInQuiz(taskId: any, subTaskId: any) {
  try {
    const res = await GET(
      `/challenges/tasks/${taskId}/multiple_choice/${subTaskId}/solution`
    );
    const subTaskAndSolutionInQuiz = useSubTaskAndSolutionInQuiz();
    subTaskAndSolutionInQuiz.value = res ?? null;
    console.log("subtask and solution", subTaskAndSolutionInQuiz.value);
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
    const res = await DELETE(
      `/challenges/tasks/${taskId}/subtasks/${subTaskId}`
    );
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

export async function updateSubTaskInQuizForUser(
  taskId: any,
  subTaskId: any,
  body: any
) {
  try {
    const res = await PATCH(
      `/challenges/tasks/${taskId}/subtasks/${subTaskId}`,
      body
    );
    const user: any = useUser();
    await getSubTasksInQuiz(taskId, user?.value.id ?? "");
    return [res, null];
  } catch (error) {
    return [null, error];
  }
}

export async function updateSubTaskInQuizForAdmin(
  taskId: any,
  subTaskId: any,
  body: any
) {
  try {
    const res = await PATCH(
      `/challenges/tasks/${taskId}/multiple_choice/${subTaskId}`,
      body
    );
    const user: any = useUser();
    await getSubTasksInQuiz(taskId, user?.value.id ?? "");
    return [res, null];
  } catch (error) {
    return [null, error];
  }
}

export async function attempQuiz(taskId: any, subTaskid: any, body: any) {
  try {
    const res = await POST(
      `challenges/tasks/${taskId}/multiple_choice/${subTaskid}/attempts`,
      body
    );
    let success = null;
    console.log("ress", res);
    if (!!res.error) {
      success = "Too Much Requests";
    } else if (!!res.solved) {
      success = true;
    } else if (!!!res.solved) {
      success = false;
    }
    console.log("returnnig", success);
    return [success, null];
  } catch (error: any) {
    if (error.data.error == "not_enough_hearts") {
      return [null, "Error.NotEnoughHeartsForQuiz"];
    } else if (error.detail == "Error.TooManyAttemptsForQuiz") {
      return [null, "Error.TooManyAttemptsForQuiz"];
    }
    console.log("error for attempting", error.data);
    return [null, error.data];
  }
}

export async function rateQuiz(taskId: any, subTaskid: any, body: any) {
  try {
    const res = await POST(
      `challenges/tasks/${taskId}/subtasks/${subTaskid}/feedback`,
      body
    );
    console.log("returnnig", res);
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

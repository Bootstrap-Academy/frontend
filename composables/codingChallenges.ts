import type { Ref } from "vue";
import { GET } from "./fetch";
export const useAllCodingChallengesInATask: () => Ref<any[]> = () =>
  useState("allCodingChallengesInATask", () => []);
export const useCodingChallenge = () => useState("codingChallenge", () => null);

export const useCodingSubmissions = () => useState("codingChallengeSubmissions", () => []);
export const useCodingExamples = () => useState("codingChallengeExamples", () => []);
export const useCodingSubmission = () => useState("codingChallengeSubmission", () => null);
export const useEnvironments = () => useState("codingChallengeEnvironments", () => null);
export const useCodingChallengesStats = () => useState("codingChallengesStats", () => null);

export async function getAllCodingChallengesInATask(taskId: any) {
  try {
    const response = await GET(`/challenges/tasks/${taskId}/coding_challenges`);

    const allCodingChallengesInATask = useAllCodingChallengesInATask();
    allCodingChallengesInATask.value = response ?? [];

    return [response, null];
  } catch (error: any) {
    console.log("coding challenges in a task error", error);
    return [null, error.data];
  }
}

export async function getCodingChallenge(taskId: string, subTaskId: any) {
  try {
    const response = await GET(`/challenges/tasks/${taskId}/coding_challenges/${subTaskId}`);
    const codingChallenge = useCodingChallenge();
    codingChallenge.value = response ?? null;
    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}
//                        //    Coding Submissions For Coding Challenges    //                               //

export async function createSubmission(challengeId: any, codingChallengeId: any, body: any) {
  try {
    const res = await POST(
      `/challenges/tasks/${challengeId}/coding_challenges/${codingChallengeId}/submissions`,
      body
    );
    await getSubmissions(challengeId, codingChallengeId);
    return [res, null];
  } catch (error: any) {
    if (error?.data?.error == "not_enough_hearts") {
      return [null, "Error.NotEnoughHearts"];
    } else if (error?.data?.error == "too_many_requests") {
      return [null, "Error.TooManyAttemptsForCodingChallenge"];
    }
    return [null, error];
  }
}

export async function getSubmissions(challengeId: any, codingChallengeId: any) {
  const user = useUser();
  const session = useSession();
  const owner = user.value?.id;
  const sessionId = session.value?.id;
  const current = () => user.value?.id === owner && session.value?.id === sessionId;
  try {
    const res = await GET(
      `/challenges/tasks/${challengeId}/coding_challenges/${codingChallengeId}/submissions`
    );
    if (!current()) return [null, new Error("Session changed")];
    const submissions = useCodingSubmissions();
    const previous = new Map(
      (submissions.value || []).map((item: any) => [
        item.id,
        { verdict: item.result?.verdict, pending: item.hearts_pending },
      ])
    );
    const newVerdict =
      Array.isArray(res) &&
      res.some(
        (item: any) =>
          item.result?.verdict &&
          (previous.get(item.id)?.verdict !== item.result.verdict ||
            (previous.get(item.id)?.pending === true && item.hearts_pending === false))
      );
    if (newVerdict && owner) {
      try {
        const hearts: any = await GET(`/shop/hearts/${encodeURIComponent(owner)}`);
        if (current() && Number.isFinite(hearts?.hearts)) useHeartInfo().value = hearts;
      } catch {
        // A failed balance read cannot hide or repeat a confirmed code result.
      }
    }
    if (!current()) return [null, new Error("Session changed")];
    submissions.value = res ?? [];
    return [res, null];
  } catch (error: any) {
    return [null, error];
  }
}

export async function getSubmission(challengeId: any, codingChallengeId: any, submissionId: any) {
  try {
    const res = await GET(
      `/challenges/tasks/${challengeId}/coding_challenges/${codingChallengeId}/submissions/${submissionId}`
    );
    const submission = useCodingSubmission();
    submission.value = res ?? [];
    return [res, null];
  } catch (error: any) {
    return [null, error];
  }
}

export async function getExamples(challengeId: any, codingChallengeId: any) {
  try {
    const res = await GET(
      `/challenges/tasks/${challengeId}/coding_challenges/${codingChallengeId}/examples`
    );
    console.log("coding examples response", res);
    const examples = useCodingExamples();
    examples.value = res ?? [];

    return [res, null];
  } catch (error: any) {
    return [null, error];
  }
}

export async function testAgainstCodingExample(
  challengeId: any,
  codingChallengeId: any,
  exampleId: any,
  body: any
) {
  try {
    const res = await POST(
      `/challenges/tasks/${challengeId}/coding_challenges/${codingChallengeId}/examples/${exampleId}/test`,
      body
    );
    return [res, null];
  } catch (error: any) {
    if (error.data.error == "not_enough_hearts") {
      return [null, "Error.NotEnoughHearts"];
    } else return [null, error];
  }
}

export async function buySubtask(taskId: any, subTaskId: any) {
  try {
    const response = await POST(`/challenges/tasks/${taskId}/subtasks/${subTaskId}/access`);
    return [response, null];
  } catch (error: any) {
    let msg = error?.data?.error ?? "";
    if (msg == "subtask_not_found") {
      return [null, "Error.QuizOrCodingChallengeNotFound"];
    } else {
      return [null, error];
    }
  }
}

export async function reportSubtask(body: any) {
  try {
    const response = await POST(`/challenges/subtask_reports`, body);
    return [response, null];
  } catch (error: any) {
    let msg = error?.data?.error ?? "";
    if (msg == "subtask_not_found") {
      return [null, "Error.QuizOrCodingChallengeNotFound"];
    } else if (msg == "banned") {
      return [null, "Error.UserIsBanned"];
    } else if (msg == "permission_denied") {
      return [null, "Error.NotAllowedForReport"];
    } else {
      return [null, error?.data?.detail ?? ""];
    }
  }
}

export async function getEnvironments() {
  try {
    const res = await GET(`/challenges/executor/environments`);
    // console.log("response of environments", res)

    const environments = useEnvironments();
    environments.value = res ?? null;
    return [res, null];
  } catch (error: any) {
    console.log("error", error);
    return [null, error];
  }
}

export async function getCodingChallengesStats() {
  try {
    const res = await GET(`/challenges/subtasks/stats`);

    const codingChallengesStats = useCodingChallengesStats();
    console.log("getCodingChallengesStats from coding challenge composable", res);
    codingChallengesStats.value = res ?? null;
    return [res, null];
  } catch (error: any) {
    console.log("error", error);
    return [null, error];
  }
}

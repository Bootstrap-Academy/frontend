import type { Ref } from 'vue';
import { GET } from './fetch';
export const useAllCodingChallengesInATask: () => Ref<any[]> = () =>
  useState('allCodingChallengesInATask', () => []);
export const useCodingChallenge = () => useState("codingChallenge", () => null)

export const useCodingSubmissions = () => useState("codingChallengeSubmissions", () => [])
export const useCodingExamples = () => useState("codingChallengeExamples", () => [])
export const useCodingSubmission = () => useState("codingChallengeSubmission", () => null)
export const useEnvironments = () => useState('codingChallengeEnvironments', () => null)
export const useConfigs = () => useState('codingChallengeConfigs', () => null)
export const useCodingChallengesStats = () => useState('codingChallengesStats', () => null)
export const useEvaluatorTemplate = () => useState('evaluatorTemplate', () => null)

export async function getAllCodingChallengesInATask(taskId: any, creator: any = '') {
  try {
    let query = ''
    if (!!creator) {
      query = `/challenges/tasks/${taskId}/coding_challenges?creator=${creator}`
    }
    else {
      query = `/challenges/tasks/${taskId}/coding_challenges`
    }
    const response = await GET(query);

    const allCodingChallengesInATask = useAllCodingChallengesInATask();
    allCodingChallengesInATask.value = response ?? [];

    return [response, null];
  } catch (error: any) {
    console.log("coding challenges in a task error", error)
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

    const route = useRoute()
    const containQuizWord = route.fullPath.includes("/quizzes/")
    const containCreateWord = route.fullPath.includes("/create")

    if (containCreateWord && containQuizWord) {
      const user: any = useUser()
      await getAllCodingChallengesInATask(taskId, user?.value.id ?? "")
    } else {
      await getAllCodingChallengesInATask(taskId)
    }
    return [response, null];

  } catch (error: any) {
    let verdict = error.data?.details?.result?.verdict ?? ""
    console.log("in Verdict", verdict)
    switch (verdict) {
    case "COMPILATION_ERROR":
      return [null, { error: "Error.Verdict.COMPILATION_ERROR", details: error.data.details }]
      break;
    case "INVALID_OUTPUT_FORMAT":
      return [null, { error: "Error.Verdict.INVALID_OUTPUT_FORMAT", details: error?.data?.details }]
      break;
    case "MEMORY_LIMIT_EXCEEDED":
      return [null, { error: "Error.Verdict.MEMORY_LIMIT_EXCEEDED", details: error?.data?.details }]
      break;
    case "NO_OUTPUT":
      return [null, { error: "Error.Verdict.NO_OUTPUT", details: error?.data?.details }]
      break;
    case "OK":
      return [null, { error: "Error.Verdict.OK", details: error?.data?.details }]
      break;
    case "PRE_CHECK_FAILED":
      return [null, { error: "Error.Verdict.PRE_CHECK_FAILED", details: error?.data?.details }]
      break;
    case "RUNTIME_ERROR":
      return [null, { error: "Error.Verdict.RUNTIME_ERROR", details: error?.data?.details }]
      break;
    case "TIME_LIMIT_EXCEEDED":
      return [null, { error: "Error.Verdict.TIME_LIMIT_EXCEEDED", details: error?.data?.details }]
      break;
    case "WRONG_ANSWER":
      return [null, { error: "Error.Verdict.WRONG_ANSWER", details: error?.data?.details }]
      break;
    }

    let msg = error?.data?.error ?? ""
    if (msg == 'subtask_not_found') {
      return [null, "Error.QuizOrCodingChallengeNotFound"]
    }
    else if (msg == 'evaluator_failed') {
      return [null, { error: "Error.EvaluatorFailed", details: error?.data?.details }]
    }
    else if (msg == 'permission_denied') {
      return [null, "Error.NotAllowedForRatings"]
    }
    else if (msg == 'banned') {
      return [null, "Error.UserIsBanned"]
    }
    else if (msg == 'testcase_failed') {
      return [null, { error: "Error.SolutionCodeFailed", details: error?.data?.details }]
    }
    else if (msg == 'invalid_output') {
      return [null, { error: "Error.EvaluatorInvalidOutput", details: error?.data?.details }]
    }

    return [null, error.data];
  }
}

export async function getCodingChallenge(taskId: string, subTaskId: any) {
  try {
    const response = await GET(`/challenges/tasks/${taskId}/coding_challenges/${subTaskId}`);
    const codingChallenge = useCodingChallenge()
    codingChallenge.value = response ?? null
    return [response, null];

  } catch (error: any) {
    return [null, error.data];
  }
}

export async function deleteCodingChallenge(taskId: string, subTaskId: any) {
  try {
    const response = await DELETE(`/challenges/tasks/${taskId}/subtasks/${subTaskId}`);
    const route = useRoute()
    const containQuizWord = route.fullPath.includes("/quizzes/")
    const containCreateWord = route.fullPath.includes("/create")

    if (containCreateWord && containQuizWord) {
      const user: any = useUser()
      await getAllCodingChallengesInATask(taskId, user?.value.id ?? "")
    } else {
      await getAllCodingChallengesInATask(taskId)
    }
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
    const route = useRoute()
    const containQuizWord = route.fullPath.includes("/quizzes/")
    const containCreateWord = route.fullPath.includes("/create")

    if (containCreateWord && containQuizWord) {
      const user: any = useUser()
      await getAllCodingChallengesInATask(taskId, user?.value.id ?? "")
    } else {
      await getAllCodingChallengesInATask(taskId)
    } return [response, null];

  } catch (error: any) {
    let verdict = error.data?.details?.result?.verdict ?? ""
    console.log("in Verdict", verdict)
    switch (verdict) {
    case "COMPILATION_ERROR":
      return [null, { error: "Error.Verdict.COMPILATION_ERROR", details: error.data.details }]
      break;
    case "INVALID_OUTPUT_FORMAT":
      return [null, { error: "Error.Verdict.INVALID_OUTPUT_FORMAT", details: error?.data?.details }]
      break;
    case "MEMORY_LIMIT_EXCEEDED":
      return [null, { error: "Error.Verdict.MEMORY_LIMIT_EXCEEDED", details: error?.data?.details }]
      break;
    case "NO_OUTPUT":
      return [null, { error: "Error.Verdict.NO_OUTPUT", details: error?.data?.details }]
      break;
    case "OK":
      return [null, { error: "Error.Verdict.OK", details: error?.data?.details }]
      break;
    case "PRE_CHECK_FAILED":
      return [null, { error: "Error.Verdict.PRE_CHECK_FAILED", details: error?.data?.details }]
      break;
    case "RUNTIME_ERROR":
      return [null, { error: "Error.Verdict.RUNTIME_ERROR", details: error?.data?.details }]
      break;
    case "TIME_LIMIT_EXCEEDED":
      return [null, { error: "Error.Verdict.TIME_LIMIT_EXCEEDED", details: error?.data?.details }]
      break;
    case "WRONG_ANSWER":
      return [null, { error: "Error.Verdict.WRONG_ANSWER", details: error?.data?.details }]
      break;
    }

    let msg = error?.data?.error ?? ""
    if (msg == 'subtask_not_found') {
      return [null, "Error.QuizOrCodingChallengeNotFound"]
    }
    else if (msg == 'evaluator_failed') {
      return [null, { error: "Error.EvaluatorFailed", details: error?.data?.details }]
    }
    else if (msg == 'permission_denied') {
      return [null, "Error.NotAllowedForRatings"]
    }
    else if (msg == 'banned') {
      return [null, "Error.UserIsBanned"]
    }
    else if (msg == 'testcase_failed') {
      return [null, { error: "Error.SolutionCodeFailed", details: error?.data?.details }]
    }
    else if (msg == 'invalid_output') {
      return [null, { error: "Error.EvaluatorInvalidOutput", details: error?.data?.details }]
    }

    return [null, error.data];
  }
}
//                        //    Coding Submissions For Coding Challenges    //                               //

export async function createSubmission(challengeId: any, codingChallengeId: any, body: any) {
  try {
    const res = await POST(`/challenges/tasks/${challengeId}/coding_challenges/${codingChallengeId}/submissions`, body)
    await getSubmissions(challengeId, codingChallengeId)
    return [res, null]
  }
  catch (error: any) {
    if (error.data.error == 'not_enough_hearts') {
      return [null, 'Error.NotEnoughHearts']
    } else if (error.data.error == "too_many_requests") {
      return [null, 'Error.TooManyAttemptsForCodingChallenge']

    }
    return [null, error]
  }
}

export async function getSubmissions(challengeId: any, codingChallengeId: any) {
  try {
    const res = await GET(`/challenges/tasks/${challengeId}/coding_challenges/${codingChallengeId}/submissions`)
    const submissions = useCodingSubmissions()
    submissions.value = res ?? []
    return [res, null]
  }
  catch (error: any) {
    return [null, error]
  }
}

export async function getSubmission(challengeId: any, codingChallengeId: any, submissionId: any) {
  try {
    const res = await GET(`/challenges/tasks/${challengeId}/coding_challenges/${codingChallengeId}/submissions/${submissionId}`)
    const submission = useCodingSubmission()
    submission.value = res ?? []
    return [res, null]
  }
  catch (error: any) {
    return [null, error]
  }
}

export async function getExamples(challengeId: any, codingChallengeId: any) {

  try {
    const res = await GET(`/challenges/tasks/${challengeId}/coding_challenges/${codingChallengeId}/examples`)
    console.log("coding examples response", res)
    const examples = useCodingExamples()
    examples.value = res ?? []

    return [res, null]
  }
  catch (error: any) {
    return [null, error]
  }
}

export async function testAgainstCodingExample(challengeId: any, codingChallengeId: any, exampleId: any, body: any) {
  try {
    const res = await POST(`/challenges/tasks/${challengeId}/coding_challenges/${codingChallengeId}/examples/${exampleId}/test`, body)
    return [res, null]
  }
  catch (error: any) {
    if (error.data.error == 'not_enough_hearts') {
      return [null, 'Error.NotEnoughHearts']
    }
    else
      return [null, error]
  }
}

export async function buySubtask(taskId: any, subTaskId: any) {
  try {
    const response = await POST(`/challenges/tasks/${taskId}/subtasks/${subTaskId}/access`)
    console.log("access response ", response)
    return [response, null]
  }

  catch (error: any) {
    let msg = error?.data?.error ?? ""
    if (msg == 'subtask_not_found') {
      return [null, "Error.QuizOrCodingChallengeNotFound"]
    }
    else {
      return [null, error]
    }
  }
}

export async function reportSubtask(body: any) {
  try {
    const response = await POST(`/challenges/subtask_reports`, body)
    console.log("access response ", response)
    return [response, null]
  }

  catch (error: any) {
    let msg = error?.data?.error ?? ""
    if (msg == 'subtask_not_found') {
      return [null, "Error.QuizOrCodingChallengeNotFound"]
    }
    else if (msg == 'banned') {
      return [null, "Error.UserIsBanned"]
    }
    else if (msg == 'permission_denied') {
      return [null, "Error.NotAllowedForReport"]
    }
    else {
      return [null, error?.data?.detail ?? ""]
    }
  }
}

export async function getEnvironments() {
  try {
    const res = await GET(`/challenges/executor/environments`)
    // console.log("response of environments", res)

    const environments = useEnvironments()
    environments.value = res ?? null
    return [res, null]
  }
  catch (error: any) {
    console.log("error", error)
    return [null, error]
  }
}

export async function getConfigs() {
  try {

    const res = await GET(`/challenges/executor/config`)
    // console.log("response of config", res)

    const configs = useConfigs()
    configs.value = res ?? null
    return [res, null]
  }
  catch (error: any) {
    console.log("error", error)
    return [null, error]
  }
}

export async function getEvaluatorTemplate() {
  try {
    // console.log("getting congi",)

    const res = await GET(`/challenges/coding_challenges/evaluator/template.py`)
    // console.log("response of evaluator template", res)

    const evaluatorTemplate = useEvaluatorTemplate()
    evaluatorTemplate.value = res ?? null
    return [res, null]
  }
  catch (error: any) {
    console.log("error", error)
    return [null, error]
  }
}

export async function getCodingChallengesStats() {
  try {

    const res = await GET(`/challenges/subtasks/stats`)

    const codingChallengesStats = useCodingChallengesStats()
    console.log("getCodingChallengesStats from coding challenge composable", res)
    codingChallengesStats.value = res ?? null
    return [res, null]
  }
  catch (error: any) {
    console.log("error", error)
    return [null, error]
  }
}


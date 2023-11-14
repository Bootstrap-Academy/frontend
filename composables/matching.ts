export const useMyMatchings = () => useState('myMatchings', () => [])
export const useMatchings = () => useState('matchings', () => [])
export const useMatching = () => useState('matching', () => { })

export async function createMatching(body: any, task_id: any) {
    try {
        const response = await POST(`/challenges/tasks/${task_id}/matchings`, body)
        console.log("response ", response)
        const user: any = useUser()
        await getMyMatchingsInTask(task_id, user?.value.id ?? "")
        return [response, null]

    }
    catch (error) {
        console.log("error is", error)
        return [null, error]
    }
}

export async function updateMatching(body: any, task_id: any, matching_id: any) {
    try {
        const response = await PATCH(`/challenges/tasks/${task_id}/matchings/${matching_id}`, body)
        console.log("response ", response)
        return [response, null]
    }
    catch (error) {
        console.log("error is", error)
        return [null, error]
    }
}

export async function getMatching(matching_id: any, task_id: any) {
    try {
        const response = await GET(`/challenges/tasks/${task_id}/matchings/${matching_id}`)
        console.log("response ", response)
        return [response, null]
    }
    catch (error) {
        console.log("error is", error)
        return [null, error]
    }
}

export async function getMatchingAndSolution(matching_id: any, task_id: any) {
    try {
        const response = await GET(`/challenges/tasks/${task_id}/matchings/${matching_id}/solution`)
        console.log("response ", response)
        const matching = useMatching()
        matching.value = response ?? null
        return [response, null]
    }
    catch (error) {
        console.log("error is", error)
        return [null, error]
    }
}

export async function getMatchingsInTask(task_id: any) {
    try {
        const response = await GET(`/challenges/tasks/${task_id}/matchings`)
        const matchings = useMatchings()
        matchings.value = response

        console.log("response ", response)
        return [response, null]
    }
    catch (error) {
        console.log("error is", error)
        return [null, error]
    }
}

export async function getMyMatchingsInTask(task_id: any, creator: any) {
    try {
        const response = await GET(`/challenges/tasks/${task_id}/matchings?creator=${creator}`)
        const myMatchings = useMyMatchings()
        myMatchings.value = response

        console.log("response ", response)
        return [response, null]
    }
    catch (error) {
        console.log("error is", error)
        return [null, error]
    }
}

export async function deleteMatching(taskId: any, subTaskId: any) {
    try {
        const res = await DELETE(`/challenges/tasks/${taskId}/subtasks/${subTaskId}`)
        const route = useRoute()
        const containQuizWord = route.fullPath.includes("/quizzes/")
        const containCreateWord = route.fullPath.includes("/create")

        if (containCreateWord && containQuizWord) {
            const user: any = useUser()
            await getMyMatchingsInTask(taskId, user?.value.id ?? "")
        } else {
            await getMatchingsInTask(taskId)
        }
        return [res, null]
    }
    catch (error) {
        return [null, error]
    }
}

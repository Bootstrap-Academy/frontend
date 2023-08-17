export const useHearts = () => useState('hearts', () => null);

export async function refillHearts() {
    try {
        const res = await PUT(`/shop/hearts`)
        const hearts = useHearts()
        hearts.value = res?.hearts ?? 0
        return [res, null]
    }
    catch (error: any) {
        return [null, error]
    }
}
export async function heartsConfig() {
    try {
        const res = await GET(`/shop/hearts/config`)
        const hearts = useHearts()
        hearts.value = res?.hearts ?? 0
        return [res, null]

    }
    catch (error: any) {
        return [null, error]
    }
}
export async function getHearts() {

    try {
        const user: any = useUser()
        const res = await GET(`/shop/hearts/${user.value.id}`)
        const hearts = useHearts()
        hearts.value = res ?? null
        return [res, null]

    }
    catch (error: any) {
        return [null, error]
    }
}

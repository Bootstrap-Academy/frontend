export const useHeartInfo = () => useState('heartInfo', () => null);

export async function refillHearts() {
  try {
    const res = await PUT(`/shop/hearts`)
    const heartInfo = useHeartInfo()
    heartInfo.value = res?.hearts ?? 0
    await getHearts()
    await getBalance()
    return [res, null]
  }
  catch (error: any) {
    return [null, error]
  }
}
export async function heartsConfig() {
  try {
    const res = await GET(`/shop/hearts/config`)
    const heartInfo = useHeartInfo()
    heartInfo.value = res?.hearts ?? 0
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
    const heartInfo = useHeartInfo()
    heartInfo.value = res ?? null
    return [res, null]

  }
  catch (error: any) {
    return [null, error]
  }
}

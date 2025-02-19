export const usePublicProfileInfo = () => useState('publicProfileInfo', () => null);
export const usePublicProfileOverview = () => useState('publicProfileOverview', () => null);

export async function getPublicProfileStatus() {
  try {
    const res = await GET(`/profiles/user/me/public-status`)
    const publicProfileInfo = usePublicProfileInfo()
    publicProfileInfo.value = res ?? null
    return [res, null]
  } catch (error: any) {
    return [null, error]
  }
}

export async function getPublicProfileOverview(id: string) {
  try {
    const res = await GET(`/profiles/profile/${id}`)
    const publicProfileOverview = usePublicProfileOverview()
    publicProfileOverview.value = res ?? null
    return [res, null]
  } catch (error: any) {
    return [null, error]
  }
}

export async function updateProfileStatus(body: any) {
  try {
    const res = await PUT(`/profiles/user/me/public-status`, body)
    await getPublicProfileStatus()
    return [res, null]
  } catch (error: any) {
    return [null, error]
  }
}
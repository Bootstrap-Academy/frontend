export const useIsPremium = () => useState('isPremium', () => null);

export const usePremiumPlans = () => useState("premiumPlans", () => [])

export async function getPremiumPlans() {
    try {
        const res = await PUT(`/shop/premium_plans`)
        const premiumPlans = usePremiumPlans()
        premiumPlans.value = res ?? []
        return [res, null]

    }
    catch (error: any) {
        return [null, error]
    }
}
export async function getPremiumStatus() {
    try {
        const user: any = useUser()
        const res = await GET(`/shop/premium/${user.value.id}`)
        const IsPremium = useIsPremium()
        IsPremium.value = res ?? null
        return [res, null]
    }
    catch (error: any) {
        return [null, error]
    }
}

export async function buyPremium(body: any) {
    try {
        const res = await POST(`/shop/premium`, body)
        await getPremiumStatus()
        return [res, null]

    }
    catch (error: any) {
        return [null, error]
    }
}

export async function updatePremiumAutoPay(body: any) {
    try {
        const res = await POST(`/shop/premium/autopay`, body)
        return [res, null]

    }
    catch (error: any) {
        return [null, error]
    }
}


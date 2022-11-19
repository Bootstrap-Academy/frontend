export const useChallengesLoginUrl = () =>
	useState('challengesLoginUrl', () => '');

export async function getChallengesLoginUrl() {
	try {
		const response = await GET('/auth/sessions/challenges/login_url');

		const challengesLoginUrl = useChallengesLoginUrl();
		challengesLoginUrl.value = response ?? '';

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

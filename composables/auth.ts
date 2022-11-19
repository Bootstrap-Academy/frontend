import { GET, POST } from './fetch';

export const useOauthProviders = () => useState('oauthProviders', () => []);

export async function getOAuthProviders() {
	try {
		const response = await GET('/auth/oauth/providers');

		const oauthProviders = useOauthProviders();
		oauthProviders.value = response ?? [];

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function loginViaOAuthProvider(body: any) {
	try {
		const response = await POST(`/auth/sessions/oauth`, body);

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function refresh() {
	const config = useRuntimeConfig();
	const refreshToken = getRefreshToken();

	let body = JSON.stringify({ refresh_token: refreshToken });

	try {
		const response = await $fetch(`${config.BASE_API_URL}/auth/session`, {
			method: 'PUT',
			body: body,
		});

		setStates(response);
		return [response, null];
	} catch (error: any) {
		setStates(null);
		return [null, error.data];
	}
}

export async function logout() {
	const user = <any>useUser();

	try {
		if (!!!user.value || !!!user.value.id) {
			throw { data: 'Invalid User Id' };
		}

		const response = await DELETE(`/auth/sessions/${user.value.id}`);

		setStates(null);

		return [response, null];
	} catch (error) {
		return [null, error];
	}
}

export async function login(body: any) {
	try {
		const response = await POST('/auth/sessions', body);

		setStates(response);

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function signup(body: any) {
	try {
		const response = await POST('/auth/users', body);

		setStates(response);

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function requestEmailVerification() {
	const user = <any>useUser();
	let user_id = user?.value?.id ?? null;
	let user_email = user?.value?.email ?? null;
	let isAccountVerified = user?.value?.email_verified ?? false;

	if (isAccountVerified) return [true, null];

	try {
		if (!!!user_id) {
			throw { data: { detail: 'Invalid User Id' } };
		}
		if (!!!user_email) {
			throw { data: { detail: 'User does not have email' } };
		}

		const response = await POST(`/auth/users/${user_id}/email`);

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function verifyAccount(body: any) {
	const user = <any>useUser();
	let user_id = user?.value?.id ?? null;
	let isAccountVerified = user?.value?.email_verified ?? false;

	if (isAccountVerified) return [true, null];

	try {
		if (!!!user_id) {
			throw { data: 'Invalid User Id' };
		}

		const response = await PUT(`/auth/users/${user_id}/email`, body);

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function forgotPassword(body: any) {
	try {
		const response = await POST('/auth/password_reset', body);

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function resetPassword(body: any) {
	try {
		const response = await PUT('/auth/password_reset', body);

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

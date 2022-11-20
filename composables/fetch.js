import jwt_decode from 'jwt-decode';
import { Mutex, Semaphore, withTimeout } from 'async-mutex';

export const mutex = new Mutex();

export function GET(url) {
	return createApiFetch(url, 'GET', null);
}

export function POST(url, body = null) {
	return createApiFetch(url, 'POST', body);
}

export function PATCH(url, body = null) {
	return createApiFetch(url, 'PATCH', body);
}

export function PUT(url, body = null) {
	return createApiFetch(url, 'PUT', body);
}

export function DELETE(url, body = null) {
	return createApiFetch(url, 'DELETE', body);
}

async function createApiFetch(url, method, body) {
	const config = useRuntimeConfig();
	const accessToken = getAccessToken();

	return $fetch(url, {
		baseURL: config.BASE_API_URL,
		method: method,
		body: body,
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
		onRequest,
		onResponse,
		onResponseError,
	});
}

const onRequest = async ({ request, options }) => {
	if (!isAccessTokenExpired(1)) return;

	if (mutex.isLocked()) {
		await mutex.waitForUnlock();
		const accessToken = getAccessToken();

		options.headers.Authorization = `Bearer ${accessToken}`;
	} else {
		const release = await mutex.acquire();
		const [success, error] = await refresh();
		release();
		if (success) {
			const accessToken = getAccessToken();

			options.headers.Authorization = `Bearer ${accessToken}`;
		}
	}
};

const onResponse = async ({ request, options, response }) => {
	let status = response?.ok ?? null;
	if (status == true) console.log('success', response._data);
};

const onResponseError = async ({ request, options, response }) => {
	let details = response?._data?.detail ?? '';

	if (typeof details == 'object') {
		response._data.detail = details[0].msg;
		details = details[0].msg;
	} else if (details == '') {
		response._data.detail = 'No error msg';
	} else {
		details = details.toLocaleLowerCase();
	}

	console.log('error', details);

	if (
		details.includes('invalid token') ||
		details.includes('invalid refresh token')
	) {
		const router = useRouter();
		const route = useRoute();
		if (
			route.fullPath.includes('/auth') ||
			route.fullPath == '/' ||
			route.fullPath == '/contact' ||
			route.fullPath == '/skill-tree'
		) {
		} else {
			router.push(`/auth/login?redirect=${route.fullPath}`);
		}
	}

	if (details.includes('user already exists')) {
		response._data.detail = 'Error.NicknameAlreadyExists';
	} else if (details.includes('email already exists')) {
		response._data.detail = 'Error.EmailAlreadyExists';
	} else if (details.includes('invalid email')) {
		response._data.detail = 'Error.InvalidEmail';
	} else if (details.includes('invalid OAuth token')) {
		response._data.detail = 'Error.InvalidOAuthToken';
	} else if (details.includes('registration disabled')) {
		response._data.detail = 'Error.RegistrationDisabled';
	} else if (details.includes('no login method')) {
		response._data.detail = 'Error.NoLoginMethod';
	} else if (details.includes('invalid credentials')) {
		response._data.detail = 'Error.InvalidCredentials';
	} else if (details.includes('user disabled')) {
		response._data.detail = 'Error.UserDisabled';
	} else if (details.includes('recaptcha failed')) {
		response._data.detail = 'Error.RecaptchaFailed';
	} else if (details.includes('could not send message')) {
		response._data.detail = 'Error.MessageNotSubmitted';
	} else if (details.includes('user not found')) {
		response._data.detail = 'Error.UserNotFound';
	} else if (details.includes('permission denied')) {
		response._data.detail = 'Error.PermissionDenied';
	} else if (details.includes('invalid verification code')) {
		response._data.detail = 'Error.InvalidVerificationCode';
	} else if (details.includes('email already verified')) {
		response._data.detail = 'Error.EmailAlreadyVerified';
	} else if (details.includes('newsletter already subscribed')) {
		response._data.detail = 'Error.NewsletterAlreadySubscribed';
	} else if (details.includes('mfa already enabled')) {
		response._data.detail = 'Error.MFAAlreadyEnabled';
	} else if (details.includes('mfa not initialized')) {
		response._data.detail = 'Error.MFANotInitialized';
	} else if (details.includes('mfa not enabled')) {
		response._data.detail = 'Error.MFANotEnabled';
	} else if (details.includes('password reset failed')) {
		response._data.detail = 'Error.PasswordResetFailed';
	} else if (details.includes('invalid code')) {
		response._data.detail = 'Error.InvalidCode';
	} else if (details.includes('provider not found')) {
		response._data.detail = 'Error.ProviderNotFound';
	}
};

function isAccessTokenExpired() {
	const accessToken = getAccessToken();

	try {
		if (!!!accessToken) {
			throw { data: 'Invalid Access Token: ' + accessToken };
		}

		let exp = jwt_decode(accessToken).exp;
		let time = parseInt(Math.round(new Date().getTime() / 1000));
		let difference = exp - time;
		let isTokenExpired = difference <= 100 ? true : false;

		return isTokenExpired;
	} catch (error) {
		return false;
	}
}

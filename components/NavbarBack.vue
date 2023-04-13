<template>
	<section
		class="container-fluid bg-secondary flex gap-4 items-center justify-between"
	>
		<Btn tertiary :icon="ArrowLeftIcon" @click="onclickNavigate">
			<img src="/images/logo.png" class="w-6 h-auto object-contain" alt="" />

			{{ t(backRoute.label) }}
		</Btn>

		<div id="navbar-back-end"></div>
	</section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { ArrowLeftIcon } from '@heroicons/vue/24/solid';
import { useI18n } from 'vue-i18n';

export default defineComponent({
	components: { ArrowLeftIcon },
	setup() {
		const { t } = useI18n();

		const router = useRouter();
		const route = useRoute();

		function hasHistory() {
			return window.history.length > 2;
		}
		function onclickNavigate() {
			if (!!!backRoute.value.pathname) {
				hasHistory() ? router.go(-1) : router.push('/');
			} else {
				router.push(backRoute.value.pathname);
			}
		}

		const backRoute = computed(() => {
			let pathname = '/';
			let label = 'Links.GoBack';

			let name = route.name;

			// ! Auth
			if (name == 'auth-signup' || name == 'auth-forgot-password') {
				pathname = '/auth/login';
				label = 'Links.Login';
			} else if (name == 'auth-verify-account') {
				pathname = '/auth/login';
				label = 'Links.GoBack';
			} else if (name == 'auth-reset-password') {
				pathname = '/auth/forgot-password';
				label = 'Links.ForgotPassword';
			} else if (name == 'auth-login') {
				pathname = '/';
				label = 'Links.Home';
			}

			// ! MFA
			else if (name == 'account-mfa-disabled') {
				pathname = '/profile';
				label = 'Links.GoToProfile';
			}
			// ! Profile
			else if (name == 'profile-edit') {
				pathname = '/profile';
				label = 'Links.GoToProfile';
			}
			// ! Job
			else if (name == 'jobs-id') {
				pathname = '/jobs';
				label = 'Links.GoToJobs';
			}
			// ! Morphcoins
			else if (name == 'morphcoins-paypal') {
				pathname = '/morphcoins/buy';
				label = 'Links.GoBack';
			}
			// ! Courses
			else if (name == 'profile-courses') {
				pathname = '/profile';
				label = 'Links.GoToProfile';
			}
			// ! Challenges
			else if (name == 'challenges-category-create') {
				pathname = `/challenges/all?category${route?.params?.category ?? ''}`;
				label = 'Links.GoToChallenges';
			}

			return {
				pathname,
				label,
			};
		});

		return { ArrowLeftIcon, t, onclickNavigate, backRoute };
	},
});
</script>

<style scoped></style>

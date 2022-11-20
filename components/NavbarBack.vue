<template>
	<section
		class="container-fluid bg-secondary flex gap-4 items-center justify-between"
	>
		<Btn tertiary :icon="ArrowLeftIcon" @click="onclickNavigate">
			<img src="/images/logo.png" class="w-6 h-auto object-contain" alt="" />

			{{ t(label) }}
		</Btn>

		<div id="navbar-back-end"></div>
	</section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { ArrowLeftIcon } from '@heroicons/vue/24/solid/index.js';
import { useI18n } from 'vue-i18n';

export default defineComponent({
	components: { ArrowLeftIcon },
	setup() {
		const { t } = useI18n();

		const router = useRouter();

		const pathname = ref('');
		const label = ref('');

		function hasHistory() {
			return window.history.length > 2;
		}
		function onclickNavigate() {
			if (!!!pathname.value) {
				hasHistory() ? router.go(-1) : router.push('/');
			} else {
				router.push(pathname.value);
			}
		}
		function setBackRoute(to: string, from: string) {
			console.log('from', from);

			// ! Auth
			if (to == '/auth/signup' || to == '/auth/forgot-password') {
				pathname.value = '/auth/login';
				label.value = 'Links.Login';
			} else if (to == '/auth/verify-account' && from == '/profile/edit') {
				pathname.value = '/profile';
				label.value = 'Links.GoToProfile';
			} else if (to == '/auth/verify-account') {
				pathname.value = '/auth/signup';
				label.value = 'Links.Signup';
			} else if (to == '/auth/reset-password') {
				pathname.value = '/auth/forgot-password';
				label.value = 'Links.ForgotPassword';
			} else if (to == '/auth/login') {
				pathname.value = '/';
				label.value = 'Links.Home';
			}

			// ! MFA
			else if (to == '/account/mfa/disabled') {
				pathname.value = '/profile';
				label.value = 'Links.GoToProfile';
			}

			// ! Profile
			else if (to == '/profile/edit') {
				pathname.value = '/profile';
				label.value = 'Links.GoToProfile';
			}

			// ! Job
			else if (to.includes('/jobs/')) {
				pathname.value = '/jobs';
				label.value = 'Links.GoToJobs';
			}

			// ! Morphcoins
			else if (to.includes('/morphcoins/paypal')) {
				pathname.value = '/morphcoins/buy';
				label.value = 'Links.GoBack';
			}

			// ! Courses
			else if (to.includes('/profile/courses')) {
				pathname.value = '/profile';
				label.value = 'Links.GoToProfile';
			}

			// ! Default
			else {
				pathname.value = '';
				label.value = 'Links.GoBack';
			}
		}

		router.afterEach((to, from) => {
			setBackRoute(to.path, from.path);
		});

		onMounted(() => {
			const route = useRoute();
			setBackRoute(route.path, '');
		});

		return { ArrowLeftIcon, t, onclickNavigate, pathname, label };
	},
});
</script>

<style scoped></style>

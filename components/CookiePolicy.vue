<template>
	<Modal v-if="!isPrivacy && !agreed">
		<Dialog :dialog="dialog">
			<template #content="{ t }">
				<p class="text-body-1 text-body font-body m-0 mt-box">
					{{ t('Body.CookiePolicy') }}

					<NuxtLink
						to="/docs/privacy"
						class="underline-link w-fit inline-block"
					>
						{{ t('Body.CookiePolicyLink') }}
					</NuxtLink>
				</p>
			</template>
		</Dialog>
	</Modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Gleap from 'gleap';

export default defineComponent({
	setup() {
		const config = useRuntimeConfig();

		const dialog = computed(() => {
			return {
				type: 'info',
				heading: 'Headings.CookiePolicy',
				body: '',
				primaryBtn: {
					label: 'Buttons.CookiePolicy',
					onclick: () => {
						agreed.value = true;
						if (process.client) {
							Gleap.initialize(config.Gleap_API_KEY);
						}
					},
				},
				secondaryBtn: {
					label: '',
					onclick: () => {},
				},
			};
		});

		const cookie_agreedToCookiePolicy = useCookie<boolean>(
			'agreedToCookiePolicy'
		);

		const isPrivacy = ref(false);

		const router = useRouter();
		const route = useRoute();

		isPrivacy.value = !!route.path.includes('privacy');

		const agreed = computed({
			get() {
				return cookie_agreedToCookiePolicy.value || false;
			},
			set(data: boolean) {
				cookie_agreedToCookiePolicy.value = data;
			},
		});

		return { agreed, isPrivacy, dialog };
	},
});
</script>

<style scoped></style>

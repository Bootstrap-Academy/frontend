<template>
	<main
		class="h-screen-inner container grid place-items-center w-full overflow-scroll pt-container pb-container"
		:class="success == null ? 'bg-white' : ''"
	>
		<div
			v-if="success == null"
			id="paypal-button-container"
			ref="paypal"
			class="w-full max-w-xl"
		></div>

		<article
			v-else
			class="style-card bg-secondary overflow-hidden w-full max-w-3xl"
		>
			<div class="card grid gap-x-4 md:gap-x-6 grid-cols-[auto_1fr]">
				<component
					class="h-10 w-10"
					:class="[theme.fill, success == true ? 'row-span-4' : 'row-span-2']"
					:is="theme.icon"
				></component>

				<h2 class="text-heading-2 text-heading font-heading">
					{{ heading }}
				</h2>
				<p class="text-body-1 text-body font-body m-0 mt-box">
					{{ body }}
				</p>
				<p v-if="success == true">
					{{ t('Headings.Purchased') }}:
					<span class="text-heading">
						{{ coinsToBuy }}
						{{ t('Headings.Morphcoins').toLocaleLowerCase() }}
						{{ t('Headings.For').toLocaleLowerCase() }}
						{{ coinsToBuy / 100 }}
						{{ t('Headings.Euros').toLocaleLowerCase() }}
					</span>
				</p>
				<p v-if="success == true">
					{{ t('Headings.TotalMorphcoins') }}:
					<span class="font-bold text-accent">
						{{ coins }} {{ t('Headings.Morphcoins') }}
					</span>
				</p>
			</div>

			<div class="card flex gap-card justify-end bg-[#1c3250]">
				<Btn :bgColor="theme.bg" :borderColor="theme.border" @click="onclick">
					{{ btn }}
				</Btn>
			</div>
		</article>
	</main>
</template>

<script>
import { XCircleIcon, CheckCircleIcon } from '@heroicons/vue/24/solid/index.js';
import { useI18n } from 'vue-i18n';
import { computed, defineComponent } from 'vue';

definePageMeta({
	layout: 'inner',
	middleware: ['auth'],
});

export default {
	head: {
		title: 'Buy Morphcoins via Paypal',
	},
	components: { XCircleIcon, CheckCircleIcon },
	setup() {
		const { t } = useI18n();
		const route = useRoute();
		const router = useRouter();

		const success = ref(null);

		const paypal = ref(null);

		const paypalClientID = usePaypalClientID();
		const coins = useCoins();

		const coinsToBuy = ref(0);

		onMounted(async () => {
			// setting paypal client ID
			await getPaypalClientID();

			// setting coins
			coinsToBuy.value = parseInt(route?.query?.coins ?? '0');

			if (!!!coinsToBuy.value || !!!paypalClientID.value) return;

			let clientID = paypalClientID.value;
			let orderBody = JSON.stringify({
				coins: coinsToBuy.value,
			});

			const script = document.createElement('script');
			script.setAttribute('data-namespace', 'paypal_sdk');
			script.src = `https://www.paypal.com/sdk/js?client-id=${clientID}&currency=EUR`;

			script.addEventListener('load', () => {
				paypal_sdk
					.Buttons({
						// Call your server to set up the transaction
						createOrder: async function (data, actions) {
							const [orderData, error] = await createPaypalOrder(orderBody);
							if (!!!orderData) {
								throw new Error('createOrder: Issue with Order Data');
							}
							return orderData;
						},

						// Call your server to finalize the transaction
						onApprove: async function (data, actions) {
							if (!!!data || !!!data.orderID) {
								throw new Error('onApprove: No Order Data');
							}

							const [orderData, error] = await onApproveCapturePaypalOrder(
								data.orderID
							);

							if (!!!orderData) {
								throw new Error('onApprove: Issue with Order Data');
							} else {
								coins.value = orderData?.coins ?? coins.value;
								success.value = true;
							}
						},
						// handler error
						onError: function (err) {
							console.log('onError of paypal', err);
							success.value = false;
						},
					})
					.render(paypal.value);
			});
			document.body.appendChild(script);
		});

		const isSuccess = computed(() => {
			return success.value == true;
		});

		const theme = computed(() => {
			return {
				...getTheme(isSuccess.value ? 'success' : 'error'),
				icon: isSuccess.value ? CheckCircleIcon : XCircleIcon,
			};
		});

		const heading = computed(() => {
			return isSuccess.value
				? `${t('Success.Success')}`
				: `${t('Error.Error')}: ${error}`;
		});

		const body = computed(() => {
			return isSuccess.value
				? `${t('Success.BuyCoins')}:`
				: `${t('Error.BuyCoins')}: ${error}`;
		});

		const btn = computed(() => {
			return isSuccess.value ? t('Buttons.Okay') : t('Buttons.TryAgain');
		});

		function onclick() {
			router.push('/morphcoins/buy');
		}

		return {
			success,
			paypal,
			theme,
			heading,
			body,
			btn,
			t,
			onclick,
			coins,
			coinsToBuy,
		};
	},
};
</script>

<style scoped></style>

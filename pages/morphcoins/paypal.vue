<template>
	<main
		class="bg-white h-screen-inner container w-full overflow-scroll pt-container pb-container"
	>
		<h1 v-if="locale == 'de'" class="mb-2 text-heading-1 text-subheading">
			<span class="text-black font-black font-body">
				{{ t('Headings.Morphcoins', { n: coinsToBuy }, coinsToBuy) }}
			</span>
			für
			<span class="text-black font-black font-body">
				{{ coinsInEuros }} euros
			</span>
			kaufen
		</h1>
		<h1 v-else class="mb-2 text-heading-1 text-subheading">
			Buying
			<span class="text-black font-black font-body">
				{{ t('Headings.Morphcoins', { n: coinsToBuy }, coinsToBuy) }}
			</span>
			for
			<span class="text-black font-black font-body">
				{{ coinsInEuros }} euros
			</span>
		</h1>
		<p class="mb-2 text-subheading mb-card">
			{{ t('Body.BuyCoins') }}
		</p>

		<article class="mb-card">
			<h2
				class="text-heading-2 text-black font-black mb-2 flex gap-card items-center flex-wrap"
			>
				{{ t('Headings.YourProfileInformation') }}

				<NuxtLink :to="`/profile/edit?coins=${coinsToBuy}`">
					<Btn>{{ t('Buttons.EditProfile') }}</Btn>
				</NuxtLink>
			</h2>

			<p
				v-if="!canBuy"
				class="text-body-1 flex gap-box px-3 py-1 mb-card mt-card w-fit style-box border border-error border-dashed bg-error-light text-error"
			>
				<ExclamationCircleIcon class="w-7 h-7" />

				{{ t('Body.MissingProfileInfo') }}
			</p>

			<div class="flex gap-box">
				<h3 class="text-body text-body-1">{{ t('Headings.UserType') }}:</h3>
				<p class="text-black text-body-1">
					{{ t(user.business ? 'Headings.Business' : 'Headings.Person') }}
				</p>
			</div>

			<template v-if="user.business">
				<div class="flex gap-box">
					<h3 class="text-body m-0 text-body-1">
						{{ t('Inputs.FirstName') }}:
					</h3>
					<p v-if="user && user.first_name" class="text-black m-0 text-body-1">
						{{ user.first_name }}
					</p>
					<p v-else class="text-error m-0 text-body-1">
						{{ t('Headings.Missing') }}
					</p>
				</div>

				<div class="flex gap-box">
					<h3 class="text-body m-0 text-body-1">{{ t('Inputs.LastName') }}:</h3>
					<p v-if="user && user.last_name" class="text-black m-0 text-body-1">
						{{ user.last_name }}
					</p>
					<p v-else class="text-error m-0 text-body-1">
						{{ t('Headings.Missing') }}
					</p>
				</div>

				<div class="flex gap-box">
					<h3 class="text-body m-0 text-body-1">{{ t('Inputs.Street') }}:</h3>
					<p v-if="user && user.street" class="text-black m-0 text-body-1">
						{{ user.street }}
					</p>
					<p v-else class="text-error m-0 text-body-1">
						{{ t('Headings.Missing') }}
					</p>
				</div>

				<div class="flex gap-box">
					<h3 class="text-body m-0 text-body-1">{{ t('Inputs.ZipCode') }}:</h3>
					<p v-if="user && user.zip_code" class="text-black m-0 text-body-1">
						{{ user.zip_code }}
					</p>
					<p v-else class="text-error m-0 text-body-1">
						{{ t('Headings.Missing') }}
					</p>
				</div>

				<div class="flex gap-box">
					<h3 class="text-body m-0 text-body-1">{{ t('Inputs.VAT_ID') }}:</h3>
					<p v-if="user && user.vat_id" class="text-black m-0 text-body-1">
						{{ user.vat_id }}
					</p>
					<p v-else class="text-error m-0 text-body-1">
						{{ t('Headings.Missing') }}
					</p>
				</div>
			</template>

			<template v-else>
				<div class="flex gap-box">
					<h3 class="text-body m-0 text-body-1">{{ t('Inputs.Country') }}:</h3>
					<p v-if="user && user.country" class="text-black m-0 text-body-1">
						{{ user.country }}
					</p>
					<p v-else class="text-error m-0 text-body-1">
						{{ t('Headings.Missing') }}
					</p>
				</div>

				<div class="flex gap-box">
					<h3 class="text-body m-0 text-body-1">
						{{ t('Inputs.EmailAddress') }}
					</h3>
					<p v-if="user && user.email" class="text-black m-0 text-body-1">
						{{ user.email }}
					</p>
					<p v-else class="text-error m-0 text-body-1">
						{{ t('Headings.Missing') }}
					</p>
				</div>
			</template>
		</article>

		<article class="mb-card">
			<h2 class="text-heading-2 text-black font-black mb-4">
				{{ t('Headings.PurchaseMorphcoins') }}
			</h2>
			<div
				id="paypal-button-container"
				ref="paypal"
				class="w-full max-w-md"
				:class="{
					' pointer-events-none opacity-70': !canBuy,
				}"
			></div>
		</article>
	</main>
</template>

<script>
import { useI18n } from 'vue-i18n';
import { ExclamationCircleIcon } from '@heroicons/vue/24/outline';

definePageMeta({
  layout: 'inner',
  middleware: ['auth'],
});

export default {
  head: {
    title: 'Buy Morphcoins via Paypal',
  },
  components: { ExclamationCircleIcon },
  setup() {
    const { t, locale } = useI18n();

    const route = useRoute();
    const router = useRouter();

    const coins = useCoins();
    const coinsToBuy = computed(() => {
      return parseInt(route?.query?.coins ?? '0');
    });
    const coinsInEuros = computed(() => {
      let coins = coinsToBuy.value ?? 0;
      return Number((coins / 100).toFixed(2));
    });
    const user = useUser();

    const canBuy = computed(() => {
      if (!!!user.value) return false;
      if (!user.value.business) {
        return user.value.email && user.value.country;
      } else {
        return (
          user.value.street &&
					user.value.zip_code &&
					user.value.vat_id &&
					user.value.first_name &&
					user.value.last_name
        );
      }
    });

    const paypal = ref(null);
    const paypalClientID = usePaypalClientID();

    onMounted(async () => {
      // setting paypal client ID
      await getPaypalClientID();

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
                throw new Error('Unable to create order');
              }

              return orderData;
            },

            // Call your server to finalize the transaction
            onApprove: async function (data, actions) {
              if (!!!data || !!!data.orderID) {
                throw new Error('No Order Data');
              }

              const [orderData, error] = await onApproveCapturePaypalOrder(
                data.orderID
              );

              if (!!!orderData) {
                throw 'Unable to approve order';
              } else {
                coins.value = orderData?.coins ?? coins.value;
                router.push(`/morphcoins/success?coins=${coinsToBuy.value}`);
              }
            },
            // handler error
            onError: function (err) {
              router.push(`/morphcoins/error?msg=${err}`);
            },
          })
          .render(paypal.value);
      });
      document.body.appendChild(script);
    });

    return { t, locale, coinsToBuy, coinsInEuros, user, canBuy, paypal };
  },
};
</script>

<style scoped></style>

<template>
	<article class="bg-secondary card style-card grid">
		<h2 class="text-heading-2">{{ t('Headings.DeleteAccount') }}</h2>

		<p class="mt-2 mb-4">
			{{ t('Body.DeleteAccountCard') }}
		</p>
		<InputBtn
			secondary
			class="justify-self-end"
			:loading="loading"
			@click="onclick"
		>
			{{ t('Buttons.DeleteAccount') }}
		</InputBtn>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  setup() {
    const { t } = useI18n();
    const router = useRouter();

    const loading = ref(false);

    async function onclick() {
      openDialog(
        'warning',
        'Headings.DeleteAccount',
        'Body.DeleteAccount',
        false,
        {
          label: 'Buttons.DeleteAccount',
          onclick: async () => {
            loading.value = true;
            const [success, error] = await deleteUser();
            loading.value = false;

            if (success) {
              router.push('/auth/login');
              setTimeout(() => {
                openSnackbar('success', 'Success.DeleteAccount');
              }, 1000);
            } else {
              openSnackbar('error', error?.detail ?? '');
            }
          },
        },
        {
          label: 'Buttons.Cancel',
          onclick: () => {},
        }
      );
    }

    return { t, loading, onclick };
  },
});
</script>

<style scoped></style>

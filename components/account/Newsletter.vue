<template>
	<article class="bg-secondary card style-card grid" v-if="show">
		<h2 class="text-heading-2">{{ t('Headings.UnregisterNewsletter') }}</h2>

		<p class="mt-2 mb-4">
			{{ t('Body.UnregisterNewsletter') }}
		</p>
		<InputBtn
			class="justify-self-end"
			:loading="loading"
			@click="onclickUnregisterFromNewsletter"
		>
			{{ t('Buttons.UnregisterNewsletter') }}
		</InputBtn>
	</article>

	<article class="bg-secondary card style-card grid" v-else>
		<h2 class="text-heading-2">{{ t('Headings.RegisterForNewsletter') }}</h2>

		<p class="mt-2 mb-4">
			{{ t('Body.RegisterForNewsletter') }}
		</p>
		<InputBtn
			class="justify-self-end"
			:loading="loading"
			@click="onclickRequestNewsletterRegistration"
		>
			{{ t('Buttons.RegisterForNewsletter') }}
		</InputBtn>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  setup() {
    const { t } = useI18n();
    const user = <any>useUser();

    const show = computed(() => {
      return user.value?.newsletter ?? false;
    });

    const loading = ref(false);

    async function onclickRequestNewsletterRegistration() {
      loading.value = true;
      const [success, error] = await requestNewsletterRegistration();
      loading.value = false;

      if (success) {
        openSnackbar('success', 'Success.NewsLetterRegistration');
      } else {
        openSnackbar('error', error?.detail ?? '');
      }
    }

    async function onclickUnregisterFromNewsletter() {
      openDialog(
        'warning',
        'Headings.UnregisterNewsletter',
        'Body.ConfirmUnregisterNewsletter',
        false,
        {
          label: 'Buttons.ConfirmUnregisterNewsletter',
          onclick: async () => {
            loading.value = true;
            const [success, error] = await unregisterFromNewsletter();
            loading.value = false;

            if (success) {
              openSnackbar('success', 'Success.UnregisterFromNewsletter');
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

    return {
      t,
      show,
      loading,
      onclickRequestNewsletterRegistration,
      onclickUnregisterFromNewsletter,
    };
  },
});
</script>

<style scoped></style>

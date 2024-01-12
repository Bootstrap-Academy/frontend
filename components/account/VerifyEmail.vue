<template>
	<article class="bg-secondary card style-card grid" v-if="!show">
		<h2 class="text-heading-2">{{ t('Headings.VerifyAccount') }}</h2>

		<p class="mt-2 mb-4">
			{{ t('Body.VerifyAccountCard') }}
		</p>
		<InputBtn class="justify-self-end" :loading="loading" @click="onclick">
			{{ t('Buttons.VerifyAccount') }}
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
    const router = useRouter();

    const show = computed(() => {
      return user.value?.email_verified ?? false;
    });

    const loading = ref(false);

    async function onclick() {
      let email = user?.value?.email ?? '';
      if (!!!email) {
        openDialog(
          'warning',
          'Headings.MissingEmail',
          'Body.MissingEmail',
          false,
          {
            label: 'Buttons.AddEmail',
            onclick: () => {
              router.push('/profile/edit');
            },
          },
          {
            label: 'Buttons.Cancel',
            onclick: () => {},
          }
        );
      } else {
        router.push('/auth/verify-account');
      }
    }

    return { t, show, loading, onclick };
  },
});
</script>

<style scoped></style>

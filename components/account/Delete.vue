<template>
  <article class="bg-secondary card style-card flex flex-col items-center justify-center">
    <TrashIcon class="h-10 w-10 text-accent mb-4 max-w-xl" />

    <h2 class="text-heading-2">{{ t('Headings.DeleteAccount') }}</h2>

    <p class="text-warning mb-4">
      {{ t('Body.IrreversibleAction') }}
    </p>

    <div class="flex items-center space-x-4 mb-8 mt-2">
      <NoSymbolIcon class="h-8 w-8 text-accent max-w-xl" />
      <p class="text-center">
        {{ t('Body.LooseProgressMorphCoinsAndCourses').split("%%%")[0] }} <br />
        {{ t('Body.LooseProgressMorphCoinsAndCourses').split("%%%")[1] }}
      </p>
    </div>

    <InputBtn :loading="loading" @click="onclick">
      {{ t('Buttons.DeleteAccount') }}
    </InputBtn>
  </article>
</template>

<script lang="ts">
import { NoSymbolIcon } from '@heroicons/vue/24/outline';
import { TrashIcon } from '@heroicons/vue/24/solid';
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  components: {
    TrashIcon,
    NoSymbolIcon,
  },
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

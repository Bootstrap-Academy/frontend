<template>
  <article class="card flex flex-col items-center justify-center bg-secondary style-card">
    <EnvelopeOpenIcon class="mb-4 h-10 w-10 max-w-xl text-accent" />

    <h2 class="text-heading-2">
      {{ show ? t("Headings.UnregisterNewsletter") : t("Headings.RegisterForNewsletter") }}
    </h2>

    <div class="mb-8 mt-2 flex items-center space-x-4">
      <NoSymbolIcon v-if="show" class="h-8 w-8 max-w-xl text-accent" />
      <CheckCircleIcon v-else class="h-8 w-8 max-w-xl text-accent" />
      <p class="text-center">
        {{ show ? t("Body.NoMoreExcitingUpdates") : t("Body.ExcitingUpdates") }}
      </p>
    </div>

    <InputBtn
      :loading="loading"
      @click="show ? onClickUnregisterNewsletter() : onClickRegisterNewsletter()"
    >
      {{ show ? t("Buttons.UnregisterNewsletter") : t("Buttons.RegisterForNewsletter") }}
    </InputBtn>
  </article>
</template>

<script lang="ts">
import { CheckCircleIcon, NoSymbolIcon } from "@heroicons/vue/24/outline";
import { EnvelopeOpenIcon } from "@heroicons/vue/24/solid";
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  components: {
    EnvelopeOpenIcon,
    CheckCircleIcon,
    NoSymbolIcon,
  },
  setup() {
    const { t } = useI18n();
    const user = <any>useUser();

    const show = computed(() => {
      return user.value?.newsletter ?? false;
    });

    const loading = ref(false);

    async function onClickRegisterNewsletter() {
      loading.value = true;
      const [success, error] = await requestNewsletterRegistration();
      loading.value = false;

      if (success) {
        openSnackbar("success", "Success.NewsLetterRegistration");
      } else {
        openSnackbar("error", error?.detail ?? "");
      }
    }

    async function onClickUnregisterNewsletter() {
      openDialog(
        "warning",
        "Headings.UnregisterNewsletter",
        "Body.ConfirmUnregisterNewsletter",
        false,
        {
          label: "Buttons.ConfirmUnregisterNewsletter",
          onclick: async () => {
            loading.value = true;
            const [success, error] = await unregisterFromNewsletter();
            loading.value = false;

            if (success) {
              openSnackbar("success", "Success.UnregisterFromNewsletter");
            } else {
              openSnackbar("error", error?.detail ?? "");
            }
          },
        },
        {
          label: "Buttons.Cancel",
          onclick: () => {},
        }
      );
    }

    return {
      t,
      show,
      loading,
      onClickUnregisterNewsletter,
      onClickRegisterNewsletter,
    };
  },
});
</script>

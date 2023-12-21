<!--
❌ Responsive UI
✅ Page Title
✅ Translation
❌ Animation
✅ middleware

✅ Tested on chrome
✅ Tested on firefox
✅ Tested on safari
❌ Tested on android mobile
❌ Tested on apple mobile

✅ Api implemented
✅ Form Submission Process
✅ Form Post Api Error Handling + ✅ Translation
✅ Form Post Api Success Handling + ✅ Translation
-->

<template>
  <section
    class="container-fluid pt-container pb-container h-screen-inner min grid place-items-center"
  >
    <Transition mode="out-in" name="slide-up-down">
      <Dialog v-if="dialog && dialog.type" :dialog="dialog" />
    </Transition>
  </section>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";

definePageMeta({
  layout: "inner",
  middleware: ["auth"],
});

export default {
  head: {
    title: "Verify Account",
  },
  setup() {
    const { t } = useI18n();

    const router = useRouter();
    const route = useRoute();

    const code = computed(() => {
      return route?.query?.code ?? "";
    });

    const dialog = <any>reactive({});

    onMounted(async () => {
      setLoading(true);
      const [success, error] = await registerForNewsletter({
        code: code.value,
      });
      setLoading(false);

      Object.assign(dialog, {
        type: !!success ? "success" : "error",
        heading: !!success
          ? "Headings.SubscribedToNewsLetter"
          : "Headings.UnableSubscribedToNewsLetter",
        body: !!success
          ? "Body.SubscribedToNewsLetter"
          : `${t("Body.UnableSubscribedToNewsLetter")}: ${t(
            error?.detail ?? ""
          )}`,
        primaryBtn: {
          label: !!success ? "Buttons.Okay" : "Links.BackToAccount",
          onclick: () => {
            router.push("/account");
          },
        },
        secondaryBtn: null,
      });
    });

    return { dialog };
  },
};
</script>

<style scoped></style>

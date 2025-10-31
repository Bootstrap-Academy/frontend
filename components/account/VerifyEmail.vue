<template>
  <article
    class="card flex flex-col items-center justify-center bg-secondary style-card"
    v-if="!show"
  >
    <CheckBadgeIcon class="mb-4 h-10 w-10 max-w-xl text-accent" />

    <h2 class="text-heading-2">{{ t("Headings.VerifyAccount") }}</h2>

    <p class="mb-8 mt-2 max-w-xl text-center">
      {{ t("Body.VerifyAccountCard") }}
    </p>

    <InputBtn :loading="loading" @click="onclick">
      {{ t("Buttons.VerifyAccount") }}
    </InputBtn>
  </article>
</template>

<script lang="ts">
import { CheckBadgeIcon } from "@heroicons/vue/24/solid";
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  components: {
    CheckBadgeIcon,
  },
  setup() {
    const { t } = useI18n();
    const user = <any>useUser();
    const router = useRouter();

    const show = computed(() => {
      return user.value?.email_verified ?? false;
    });

    const loading = ref(false);

    async function onclick() {
      let email = user?.value?.email ?? "";
      if (!!!email) {
        openDialog(
          "warning",
          "Headings.MissingEmail",
          "Body.MissingEmail",
          false,
          {
            label: "Buttons.AddEmail",
            onclick: () => {
              router.push("/profile/edit");
            },
          },
          {
            label: "Buttons.Cancel",
            onclick: () => {},
          }
        );
      } else {
        router.push("/auth/verify-account");
      }
    }

    return { t, show, loading, onclick };
  },
});
</script>

<style scoped></style>

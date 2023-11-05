<template>
  <form
    class="flex flex-col gap-box"
    :class="{ 'form-submitting': form.submitting }"
    @submit.prevent="onclickSubmitForm()"
    ref="refForm"
  >
    <Input
      :label="t('Inputs.EmailOrUsername')"
      focusThis
      v-model="form.name_or_email.value"
      @valid="form.name_or_email.valid = $event"
      :rules="form.name_or_email.rules"
      autocomplete="username"
    />
    <Input
      :label="t('Inputs.Password')"
      type="password"
      id="current-password"
      autocomplete="current-password"
      v-model="form.password.value"
      @valid="form.password.valid = $event"
    />

    <InputOTP
      v-if="needMFA && !needRecoveryCode"
      label="Inputs.MFACode"
      v-model="form.mfa_code.value"
      @valid="form.mfa_code.valid = needMFA ? $event : true"
      :rules="form.mfa_code.rules"
    />

    <Input
      v-else-if="needRecoveryCode"
      label="Inputs.RecoveryCode"
      v-model="form.recovery_code.value"
      @valid="form.recovery_code.valid = needRecoveryCode ? $event : true"
      :rules="form.recovery_code.rules"
    />

    <NuxtLink v-if="!needMFA" to="/auth/forgot-password" class="self-end">
      {{ t("Links.ForgotPassword") }}
    </NuxtLink>

    <div v-else class="self-end cursor-pointer">
      <NuxtLink
        tertiary
        v-if="needRecoveryCode"
        @click="needRecoveryCode = false"
      >
        {{ t("Links.HaveMFA") }}
      </NuxtLink>
      <NuxtLink tertiary v-else @click="needRecoveryCode = true">
        {{ t("Links.LostMFAUseRecoveryCode") }}
      </NuxtLink>
    </div>

    <InputBtn
      :loading="form.submitting"
      class="self-center"
      @click="onclickSubmitForm()"
      mt
      mb
    >
      {{ t("Buttons.Login") }}
    </InputBtn>

    <NuxtLink to="/auth/signup" class="self-center">
      {{ t("Links.DontHaveAccount") }}
      <span class="text-accent">{{ t("Links.CreateOne") }}</span>
    </NuxtLink>

    <article
      v-if="providers && providers.length > 0"
      class="grid grid-cols-[1fr_auto_1fr] items-center gap-card-sm mt-card mb-card"
    >
      <hr />
      <p>{{ t("Body.OrLoginWith") }}</p>
      <hr />
    </article>

    <article class="flex flex-wrap gap-container justify-center">
      <a
        v-for="{ id, icon, authorize_url } of providers"
        :key="id"
        :href="authorize_url"
        class="cursor-pointer"
      >
        <component
          :is="icon"
          lg
          :color="id == 'github' ? 'fill-heading' : ''"
        ></component>
      </a>
    </article>
  </form>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useReCaptcha } from "vue-recaptcha-v3";
import type { IForm } from "~/types/form";
import IconGithub from "~/components/icon/Github.vue";
import IconGoogle from "~/components/icon/Google.vue";
import IconDiscord from "~/components/icon/Discord.vue";

export default defineComponent({
  components: { IconGithub, IconGoogle, IconDiscord },
  setup() {
    const { t } = useI18n();

    // ============================================================= refs
    const refForm = ref<HTMLFormElement | null>(null);

    // ============================================================= reactive
    const form = reactive<IForm>({
      name_or_email: {
        valid: false,
        value: "",
        rules: [
          (v: string) => !!v || "Error.InputEmpty_Inputs.EmailOrUsername",
        ],
      },
      password: {
        valid: false,
        value: "",
        rules: [(v: string) => !!v || "Error.InputEmpty_Inputs.Password"],
      },
      mfa_code: {
        valid: true,
        value: "",
        rules: [
          (v: string) => !!v || "Error.InputEmpty_Inputs.MFACode",
          (v: string) => v.length >= 6 || "Error.InputMinLength_6",
        ],
      },
      recovery_code: {
        valid: true,
        value: "",
        rules: [(v: string) => !!v || "Error.InputEmpty_Inputs.RecoveryCode"],
      },
      submitting: false,
      validate: () => {
        let isValid = true;

        for (const key in form) {
          if (
            key != "validate" &&
            key != "body" &&
            key != "submitting" &&
            !form[key].valid
          ) {
            isValid = false;
          }
        }

        if (refForm.value) refForm.value.reportValidity();
        return isValid;
      },
      body: () => {
        let obj: any = {};
        for (const key in form) {
          if (key != "validate" && key != "body" && key != "submitting")
            obj[key] = form[key].value;
        }
        return obj;
      },
    });

    // ============================================================= OAuth Providers
    const oauthProviders = useOauthProviders();
    const config = useRuntimeConfig().public;

    const providers = computed(() => {
      if (!!!oauthProviders.value || oauthProviders.value.length <= 0)
        return [];

      const redirect_uri = `${config.BASE_WEB_URL}/oauth/callback`;

      return oauthProviders.value.map((item: any) => {
        if (!!item && !!item.id && !!item.authorize_url) {
          let updated_authorize_url =
            item.authorize_url +
            `&state=${item.id}&redirect_uri=${redirect_uri}`;

          let icon = null;
          if (item.id == "google") {
            icon = IconGoogle;
          } else if (item.id == "discord") {
            icon = IconDiscord;
          } else if (item.id == "github") {
            icon = IconGithub;
          }

          return { ...item, authorize_url: updated_authorize_url, icon: icon };
        }
      });
    });

    // ============================================================= reCaptcha
    const { executeRecaptcha, recaptchaLoaded }: any = useReCaptcha();
    const getReCaptchaToken = async () => {
      try {
        await recaptchaLoaded();
        const token = await executeRecaptcha("login");
        return token;
      } catch (error) {
        return null;
      }
    };

    // ============================================================= Checks
    const router = useRouter();
    const route = useRoute();

    const redirect = computed(() => {
      return (route?.query?.redirect ?? "").toString();
    });

    // ============================================================= functions
    async function onclickSubmitForm() {
      if (form.validate()) {
        form.submitting = true;

        let recaptcha_response = await getReCaptchaToken();

        const [success, error] = await login({
          ...form.body(),
          recaptcha_response: recaptcha_response,
        });

        form.submitting = false;

        success ? successHandler(success) : errorHandler(error);
      } else {
        openSnackbar("error", "Error.InvalidForm");
      }
    }

    function successHandler(res: any) {
      if (needRecoveryCode.value) {
        router.push(`/account/mfa/disabled`);
      } else if (redirect.value) {
        router.push(redirect.value);
      } else if (!hasEmail.value) {
        router.push("/profile/edit");
      } else {
        router.push(`/profile`);
      }
    }

    const needMFA = ref(false);
    const needRecoveryCode = ref(false);

    function errorHandler(res: any) {
      let msg = res?.detail ?? "";

      let isMFA = msg == "Error.InvalidCode";
      if (res.detail == "Error.InvalidCredentials") {
        openSnackbar("error", msg);
      }
      if (!!isMFA && !!needMFA.value) {
        openSnackbar("error", msg);
      }

      if (isMFA) {
        needMFA.value = true;
      } else {
        openSnackbar("error", msg);
      }
    }

    return {
      form,
      onclickSubmitForm,
      refForm,
      t,
      providers,
      needMFA,
      needRecoveryCode,
    };
  },
});
</script>

<style scoped></style>

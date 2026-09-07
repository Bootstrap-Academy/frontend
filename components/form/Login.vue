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

    <div v-else class="cursor-pointer self-end">
      <NuxtLink tertiary v-if="needRecoveryCode" @click="needRecoveryCode = false">
        {{ t("Links.HaveMFA") }}
      </NuxtLink>
      <NuxtLink tertiary v-else @click="needRecoveryCode = true">
        {{ t("Links.LostMFAUseRecoveryCode") }}
      </NuxtLink>
    </div>

    <InputBtn :loading="form.submitting" class="self-center" @click="onclickSubmitForm()" mt mb>
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

    <article class="flex flex-wrap justify-center gap-container">
      <button
        v-for="{ id, name, icon } of providers"
        :key="id"
        type="button"
        :disabled="startingProvider != ''"
        :aria-label="t('Buttons.LoginWithProvider', { provider: name })"
        class="cursor-pointer disabled:cursor-wait disabled:opacity-50"
        @click="onclickProvider(id)"
      >
        <component
          v-if="icon"
          :is="icon"
          lg
          :color="id == 'github' ? 'fill-heading' : ''"
        ></component>
        <span v-else class="underline">{{ name }}</span>
      </button>
    </article>
  </form>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { useI18n } from "vue-i18n";
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
        rules: [(v: string) => !!v || "Error.InputEmpty_Inputs.EmailOrUsername"],
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
          if (key != "validate" && key != "body" && key != "submitting" && !form[key].valid) {
            isValid = false;
          }
        }

        if (refForm.value) refForm.value.reportValidity();
        return isValid;
      },
      body: () => {
        let obj: any = {};
        for (const key in form) {
          if (key != "validate" && key != "body" && key != "submitting") obj[key] = form[key].value;
        }
        return obj;
      },
    });

    // ============================================================= OAuth Providers
    const oauthProviders = useOauthProviders();

    const providers = computed(() => {
      if (!!!oauthProviders.value || oauthProviders.value.length <= 0) return [];

      return oauthProviders.value
        .filter((item: any) => !!item && !!item.id)
        .map((item: any) => {
          let icon = null;
          if (item.id == "google") {
            icon = IconGoogle;
          } else if (item.id == "discord") {
            icon = IconDiscord;
          } else if (item.id == "github") {
            icon = IconGithub;
          }

          return { ...item, icon };
        });
    });

    /**
     * The authorize URL is built by the backend, which puts an unguessable
     * single use `state` and a PKCE challenge into it. The browser keeps the
     * `state` until the provider sends it back, so a callback that this
     * browser did not start is rejected on the callback page.
     */
    const startingProvider = ref("");

    async function onclickProvider(provider_id: string) {
      if (startingProvider.value != "") return;

      startingProvider.value = provider_id;
      const [success, error] = await startOAuthFlow(provider_id);

      if (!!success?.authorize_url) {
        window.location.href = success.authorize_url;
        return;
      }

      startingProvider.value = "";
      openSnackbar("error", "Error.UnableToOAuth", error?.detail ?? "");
    }

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

        const [success, error] = await login(form.body());

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

    /**
     * A login refused because too many attempts failed carries the waiting
     * time in seconds. It is named in the message, in minutes once it is a
     * minute or more, so that the message is the same one the server sent.
     */
    function retryAfterText(seconds: number) {
      if (seconds >= 60) {
        const minutes = Math.ceil(seconds / 60);
        return t("Body.WaitMinutes", { n: minutes }, minutes);
      }

      return t("Body.WaitSeconds", { n: seconds }, seconds);
    }

    function errorHandler(res: any) {
      let msg = res?.detail ?? "";

      if (msg == "Error.TooManyFailedLoginAttempts") {
        const seconds = Number(res?.retry_after) || 0;

        // Without a readable `Retry-After` there is no time to name, and a
        // message that invents one would be worse than one that says "later".
        if (seconds <= 0) {
          return openSnackbar("error", "Error.TooManyFailedLoginAttemptsUnknownWait");
        }

        return openSnackbar("error", msg, "", false, { wait: retryAfterText(seconds) });
      }

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
      onclickProvider,
      startingProvider,
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

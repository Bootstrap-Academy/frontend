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

    <NuxtLink
      v-if="restrictedAccess"
      to="/moderation/access"
      class="self-center text-accent underline"
      >{{ t("Moderation.RestrictedAccess") }}</NuxtLink
    >

    <NuxtLink
      :to="{ path: '/auth/signup', query: redirect ? { redirect } : {} }"
      class="self-center"
    >
      {{ t("Links.DontHaveAccount") }}
      <span class="text-accent">{{ t("Links.CreateOne") }}</span>
    </NuxtLink>

    <FormOAuthProviders label="Body.OrLoginWith" action="Buttons.LoginWithProvider" />
  </form>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { guestReturnPath, authorizeGuestHandoff } from "~/utils/guest/handoff";
import { useI18n } from "vue-i18n";
import type { IForm } from "~/types/form";

export default defineComponent({
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

    // ============================================================= Checks
    const router = useRouter();
    const route = useRoute();

    // Only a path of this site is followed after the login.
    const redirect = computed(() => {
      return internalPath(route?.query?.redirect);
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
      authorizeGuestHandoff(res?.user?.id);
      if (needRecoveryCode.value) {
        router.push(`/account/mfa/disabled`);
      } else if (guestReturnPath()) {
        router.push("/start");
      } else if (redirect.value) {
        router.push(redirect.value);
      } else if (!hasEmail.value) {
        router.push("/profile/edit");
      } else {
        router.push(`/dashboard`);
      }
    }

    const needMFA = ref(false);
    const needRecoveryCode = ref(false);
    const restrictedAccess = ref(false);

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
      restrictedAccess.value = ["Error.UserDisabled", "Error.UserIsBanned"].includes(msg);

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
      refForm,
      t,
      needMFA,
      needRecoveryCode,
      restrictedAccess,
      redirect,
    };
  },
});
</script>

<style scoped></style>

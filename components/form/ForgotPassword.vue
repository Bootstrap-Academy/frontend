<template>
  <form
    class="flex flex-col gap-box"
    :class="{ 'form-submitting': form.submitting }"
    @submit.prevent="onclickSubmitForm()"
    ref="refForm"
  >
    <Input
      :label="t('Inputs.EmailAddress')"
      v-model="form.email.value"
      @valid="form.email.valid = $event"
      :rules="form.email.rules"
    />

    <NuxtLink to="/auth/reset-password" class="self-end">
      {{ t("Links.GotResetCode") }}
    </NuxtLink>

    <InputBtn
      :loading="form.submitting"
      class="self-center"
      @click="onclickSubmitForm()"
      mt
      mb
    >
      {{ t("Buttons.GetInstructions") }}
    </InputBtn>

    <NuxtLink to="/auth/signup" class="self-center">
      {{ t("Links.DontHaveAccount") }}
      <span class="text-accent">{{ t("Links.CreateOne") }}</span>
    </NuxtLink>
  </form>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useReCaptcha } from "vue-recaptcha-v3";
import type { IForm } from "~/types/form";

export default defineComponent({
  setup() {
    const { t } = useI18n();

    // ============================================================= refs
    const refForm = ref<HTMLFormElement | null>(null);

    // ============================================================= reactive
    const form = reactive<IForm>({
      email: {
        value: "",
        valid: false,
        rules: [
          (v: string) => !!v || "Error.InputEmpty_Inputs.EmailAddress",
          (v: string) => /.+@.+\..+/.test(v) || "Error.InputEmailForm",
        ],
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

    // ============================================================= functions
    async function onclickSubmitForm() {
      if (form.validate()) {
        form.submitting = true;

        let recaptcha_response = await getReCaptchaToken();

        const [success, error] = await forgotPassword({
          ...form.body(),
          recaptcha_response: recaptcha_response,
        });

        form.submitting = false;

        success ? successHandler(success) : errorHandler(error);
      } else {
        openSnackbar("error", "Error.InvalidForm");
      }
    }

    const router = useRouter();

    function successHandler(res: any) {
      openDialog(
        "success",
        "Success.RequestSubmitted",
        "Success.ResetPasswordRequestSent",
        true,
        {
          label: "Buttons.GoToResetPassword",
          onclick: () => {
            router.push("/auth/reset-password");
          },
        },
        null
      );
    }

    function errorHandler(res: any) {
      openSnackbar("error", res?.detail ?? "");
    }

    return {
      form,
      onclickSubmitForm,
      refForm,
      t,
    };
  },
});
</script>

<style scoped></style>

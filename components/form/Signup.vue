<template>
  <form
    class="flex flex-col gap-box"
    :class="{ 'form-submitting': form.submitting }"
    @submit.prevent="onclickSubmitForm()"
    ref="refForm"
  >
    <Input
      :label="t('Inputs.Nickname')"
      v-model="form.name.value"
      @valid="form.name.valid = $event"
      :rules="form.name.rules"
    />

    <Input
      :label="t('Inputs.DisplayName')"
      v-model="form.display_name.value"
      @valid="form.display_name.valid = $event"
      :rules="form.display_name.rules"
    />

    <Input
      :label="t('Inputs.EmailAddress')"
      type="email"
      v-model="form.email.value"
      @valid="form.email.valid = $event"
      :rules="form.email.rules"
    />

    <Input
      v-if="!register_token"
      :label="t('Inputs.Password')"
      type="password"
      v-model="form.password.value"
      @valid="form.password.valid = $event"
      :rules="form.password.rules"
    />

    <InputCheckbox
      label="Links.IAgreeTo"
      id="TermsAndConditions"
      :link="{
        to: '/docs/terms-and-conditions',
        label: 'Links.TermsAndConditions',
      }"
      target="_blank"
      required
      v-model="form.termsAndConditions.value"
      @valid="form.termsAndConditions.valid = $event"
    />

    <InputCheckbox
      label="Links.MinimumAge"
      id="MinimumAge"
      required
      v-model="form.ageConfirmed.value"
      @valid="form.ageConfirmed.valid = $event"
    />

    <p class="text-body-1 text-body">
      {{ t("Links.PrivacyNoticeHint") }}
      <NuxtLink to="/docs/privacy" target="_blank" class="text-accent hover:underline">{{
        t("Links.PrivacyNoticeLinkText")
      }}</NuxtLink
      >{{ t("Links.PrivacyNoticeHintEnd") }}
    </p>

    <InputBtn :loading="form.submitting" class="self-center" @click="onclickSubmitForm()" mb mt>
      {{ t("Buttons.CreateAccount") }}
    </InputBtn>

    <NuxtLink to="/auth/login" class="self-center">
      {{ t("Links.AlreadyHaveAccount") }}
      <span class="text-accent">{{ t("Links.GoToLogin") }}</span>
    </NuxtLink>
  </form>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { IForm } from "~/types/form";

export default defineComponent({
  setup() {
    const { t } = useI18n();

    // ============================================================= refs
    const refForm = ref<HTMLFormElement | null>(null);

    // ============================================================= reactive
    const form = reactive<IForm>({
      name: {
        value: "",
        valid: false,
        rules: [
          (v: string) => !!v || "Error.InputEmpty_Inputs.Nickname",
          (v: string) => v.length >= 3 || "Error.InputMinLength_3",
          (v: string) => v.length <= 32 || "Error.InputMinLength_32",
          (v: string) => /^[a-zA-Z\d]{3,32}$/.test(v) || "Error.InputNicknameError",
        ],
      },
      display_name: {
        value: "",
        valid: false,
        rules: [
          (v: string) => !!v || "Error.InputEmpty_Inputs.DisplayName",
          (v: string) => v.length >= 3 || "Error.InputMinLength_3",
          (v: string) => v.length <= 64 || "Error.InputMinLength_64",
        ],
      },
      email: {
        value: "",
        valid: false,
        rules: [
          (v: string) => !!v || "Error.InputEmpty_Inputs.EmailAddress",
          (v: string) => /.+@.+\..+/.test(v) || "Error.InputEmailForm",
        ],
      },
      password: {
        valid: false,
        value: "",
        rules: [
          (v: string) => !!v || "Error.InputEmpty_Inputs.Password",
          (v: string) =>
            /^((?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,})?$/.test(v) || "Error.InputPasswordError",
        ],
      },
      termsAndConditions: {
        value: false,
        valid: false,
      },
      ageConfirmed: {
        value: false,
        valid: false,
      },
      submitting: false,
      validate: () => {
        let isValid = true;

        if (!!register_token.value) {
          form.password.valid = true;
        }

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
          if (
            key != "validate" &&
            key != "body" &&
            key != "submitting" &&
            key != "termsAndConditions" &&
            key != "ageConfirmed"
          )
            obj[key] = form[key].value;
        }

        obj.terms_version = TERMS_VERSION;
        obj.age_confirmed = form.ageConfirmed.value;

        return obj;
      },
    });

    // ============================================================= OAuth Signup
    const route = useRoute();
    const register_token = computed(() => {
      return route?.query?.register_token ?? "";
    });
    onMounted(() => {
      if (!!register_token.value) {
        openDialog(
          "success",
          "Headings.OAuthSuccess",
          "Success.OAuthSuccess",
          true,
          {
            label: "Buttons.Okay",
            onclick: () => {},
          },
          null
        );
      }
    });

    // ============================================================= functions
    async function onclickSubmitForm() {
      if (form.validate()) {
        form.submitting = true;

        const updatedBody = !!register_token.value
          ? {
              ...form.body(),
              oauth_register_token: register_token.value,
            }
          : form.body();

        const [success, error] = await signup(updatedBody);

        if (!!success) await requestEmailVerification();

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
        "Success.SignupSuccessful",
        t("Success.AccountCreated"),
        true,
        {
          label: "Buttons.VerifyAccount",
          onclick: () => {
            router.push("/auth/verify-account");
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
      register_token,
    };
  },
});
</script>

<style scoped></style>

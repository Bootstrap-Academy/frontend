<template>
  <form
    class="flex flex-col gap-box"
    :class="{ 'form-submitting': form.submitting }"
    @submit.prevent="onclickSubmitForm()"
    ref="refForm"
  >
    <!--
      Each field says its rule next to its label before anything is typed. A rule that is
      broken turns red there; it is not written a second time under the field.
    -->
    <Input
      :label="t('Inputs.Nickname')"
      hint="Inputs.NicknameRule"
      autocomplete="username"
      id="SignupUsername"
      :show-error="submitted"
      v-model="form.name.value"
      @valid="form.name.valid = $event"
      :rules="form.name.rules"
    />

    <Input
      :label="t('Inputs.EmailAddress')"
      type="email"
      autocomplete="email"
      id="SignupEmail"
      :show-error="submitted"
      v-model="form.email.value"
      @valid="form.email.valid = $event"
      :rules="form.email.rules"
    />

    <Input
      v-if="!register_token"
      :label="t('Inputs.Password')"
      hint="Inputs.PasswordRule"
      type="password"
      autocomplete="new-password"
      id="SignupPassword"
      :show-error="submitted"
      v-model="form.password.value"
      @valid="form.password.valid = $event"
      :rules="form.password.rules"
    />

    <InputCheckbox
      label="Links.IAgreeTo"
      id="TermsAndConditions"
      :link="{
        to: signupTerms.url,
        label: 'Links.TermsAndConditions',
      }"
      target="_blank"
      required
      :show-error="submitted"
      v-model="form.termsAndConditions.value"
      @valid="form.termsAndConditions.valid = $event"
    />

    <InputCheckbox
      label="Links.MinimumAge"
      id="MinimumAge"
      required
      :show-error="submitted"
      v-model="form.ageConfirmed.value"
      @valid="form.ageConfirmed.valid = $event"
    />

    <p class="text-body-1 text-body">
      {{ t("Links.PrivacyNoticeHint") }}
      <NuxtLink to="/docs/privacy" target="_blank" class="text-accent underline">{{
        t("Links.PrivacyNoticeLinkText")
      }}</NuxtLink
      >{{ t("Links.PrivacyNoticeHintEnd") }}
    </p>

    <InputBtn :loading="form.submitting" class="self-center" @click="onclickSubmitForm()" mb mt>
      {{ t("Buttons.CreateAccount") }}
    </InputBtn>

    <NuxtLink
      :to="{ path: '/auth/login', query: redirect ? { redirect } : {} }"
      class="self-center"
    >
      {{ t("Links.AlreadyHaveAccount") }}
      <span class="text-accent">{{ t("Links.GoToLogin") }}</span>
    </NuxtLink>

    <!-- Not for an account that has just come back from its provider. -->
    <FormOAuthProviders
      v-if="!register_token"
      label="Body.OrSignupWith"
      action="Buttons.SignupWithProvider"
    />
  </form>
</template>

<script lang="ts">
import { defineComponent, nextTick, ref } from "vue";
import { guestReturnPath, authorizeGuestHandoff } from "~/utils/guest/handoff";
import { useI18n } from "vue-i18n";
import type { IForm } from "~/types/form";

// The refusal of the backend (`OutdatedTermsVersionError`) when the request names a version
// of the terms that is not the one signup records.
const OUTDATED_TERMS = "not the current version of the terms and conditions";

export default defineComponent({
  setup() {
    const { t } = useI18n();
    // The version the box links to is the version the request names. It is kept until the
    // server refuses it, which happens when the form was opened before new terms took effect.
    const signupTerms = ref(registrationTerms());

    // ============================================================= refs
    const refForm = ref<HTMLFormElement | null>(null);

    // Set once the form has been submitted, so that the consent boxes point
    // themselves out instead of the button doing nothing.
    const submitted = ref(false);

    // ============================================================= reactive
    const form = reactive<IForm>({
      name: {
        value: "",
        valid: false,
        rules: [
          (v: string) => !!v || "Error.InputEmpty_Inputs.Nickname",
          // The sentence of the hint: the field shows it once and turns it red.
          (v: string) => /^[a-zA-Z\d]{3,32}$/.test(v) || "Inputs.NicknameRule",
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
            /^((?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,})?$/.test(v) || "Inputs.PasswordRule",
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

        // The form asks for one name. It is the display name too until the profile changes it.
        obj.display_name = form.name.value;
        obj.terms_version = signupTerms.value.version;
        obj.age_confirmed = form.ageConfirmed.value;

        return obj;
      },
    });

    // ============================================================= OAuth Signup
    // The token is handed over in the session storage, not in the query
    // string: it is a short lived secret and the address bar ends up in the
    // browser history and in outgoing `Referer` headers.
    const register_token = ref(getRegisterToken());

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
      submitted.value = true;
      await nextTick();

      if (form.validate()) {
        form.submitting = true;

        const updatedBody = !!register_token.value
          ? {
              ...form.body(),
              oauth_register_token: register_token.value,
            }
          : form.body();

        const [success, error] = await signup(updatedBody);

        if (!!success) {
          clearRegisterToken();
          await requestEmailVerification();
        }

        form.submitting = false;

        success ? successHandler(success) : errorHandler(error);
      } else {
        await nextTick();
        refForm.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      }
    }

    const router = useRouter();
    const route = useRoute();

    // The page a visitor was invited from. Only a path of this site is carried
    // on, to the confirmation of the address and to the login.
    const redirect = computed(() => internalPath(route?.query?.redirect));

    function successHandler(res: any) {
      authorizeGuestHandoff(res?.user?.id);
      if (guestReturnPath()) {
        router.push("/start");
        return;
      }
      openDialog(
        "success",
        "Success.SignupSuccessful",
        t("Success.AccountCreated"),
        true,
        {
          label: "Buttons.VerifyAccount",
          onclick: () => {
            router.push(emailVerificationRoute(redirect.value));
          },
        },
        null
      );
    }

    function errorHandler(res: any) {
      // The terms changed while the form was open: the box now links the new version and has
      // to be ticked again, because agreeing to the old text is no agreement to the new one.
      if (String(res?.detail ?? "").toLowerCase() === OUTDATED_TERMS) {
        signupTerms.value = registrationTerms();
        form.termsAndConditions.value = false;
        form.termsAndConditions.valid = false;
        openSnackbar("error", "Error.TermsChanged");
        return;
      }
      openSnackbar("error", res?.detail ?? "");
    }

    return {
      signupTerms,
      form,
      onclickSubmitForm,
      refForm,
      submitted,
      t,
      register_token,
      redirect,
    };
  },
});
</script>

<style scoped></style>

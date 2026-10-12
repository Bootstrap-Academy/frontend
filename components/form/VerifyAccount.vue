<template>
  <form
    class="flex flex-col gap-box"
    :class="{ 'form-submitting': form.submitting }"
    @submit.prevent="onclickSubmitForm()"
    ref="refForm"
  >
    <!-- The one sentence on what happened to the code; it follows `mail`. -->
    <p class="text-center [overflow-wrap:anywhere]" role="status">
      {{ notice ? t(notice, { email }) : "" }}
    </p>

    <template v-if="!missingEmail">
      <Input
        :label="t('Inputs.VerificationCode')"
        v-model="form.code.value"
        @valid="form.code.valid = $event"
        :rules="form.code.rules"
      />

      <InputBtn :loading="form.submitting" class="self-center" @click="onclickSubmitForm()" mt mb>
        {{ t("Buttons.VerifyAccount") }}
      </InputBtn>

      <button
        v-if="user"
        type="button"
        class="min-h-11 self-center text-base text-body underline font-body transition-basic hover:text-heading disabled:opacity-60"
        :disabled="mail === 'sending'"
        @click="resendAccountVerificationCode"
      >
        {{ t("Buttons.ResendAccountVerificationCode") }}
      </button>
    </template>

    <NuxtLink v-else to="/profile/edit" class="self-center">
      <Btn>{{ t("Buttons.AddEmail") }}</Btn>
    </NuxtLink>

    <!-- A wrong address is corrected in the profile; the logout is the way out. -->
    <p
      v-if="user"
      class="flex flex-wrap items-center justify-center gap-x-6 border-t border-tertiary pt-2"
    >
      <NuxtLink
        v-if="!missingEmail"
        to="/profile/edit"
        class="flex min-h-11 items-center underline"
      >
        {{ t("Links.ChangeEmailInProfile") }}
      </NuxtLink>
      <button
        type="button"
        class="min-h-11 text-base text-body underline font-body transition-basic hover:text-heading"
        @click="onclickLogout"
      >
        {{ t("Buttons.Logout") }}
      </button>
    </p>
  </form>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref, watch } from "vue";
import { useDocumentVisibility } from "@vueuse/core";
import { useI18n } from "vue-i18n";
import type { IForm } from "~/types/form";

export default defineComponent({
  emits: ["status"],
  setup(props, { emit }) {
    const { t } = useI18n();

    // ============================================================= refs
    const refForm = ref<HTMLFormElement | null>(null);

    // ============================================================= reactive
    const form = reactive<IForm>({
      code: {
        valid: false,
        value: "",
        rules: [
          (v: string) => !!v || "Error.InputEmpty_Inputs.VerificationCode",
          (v: string) => /^([a-zA-Z\d]{4}-){3}[a-zA-Z\d]{4}$/.test(v) || "Error.InputCodeFormat",
        ],
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

    // ============================================================= The mail with the code
    const user = <any>useUser();
    const profileLoaded = useProfileLoaded();
    const visibility = useDocumentVisibility();
    const email = computed(() => user.value?.email ?? "");

    /**
     * What the page knows about the mail: nothing (nobody is signed in here,
     * or the profile did not arrive), still asking the server, a request on
     * its way, a code that was sent from this browser and still works, or a
     * request the server refused.
     */
    const mail = ref<"" | "checking" | "sending" | "sent" | "failed">(
      user.value?.id ? "checking" : ""
    );
    const missingEmail = computed(
      () => needsEmailVerification(user.value, profileLoaded.value) && !email.value
    );
    const notice = computed(() => {
      if (missingEmail.value) return "Body.MissingEmail";
      if (mail.value === "checking") return "";
      // The other sentences name the address.
      if (mail.value === "" || !email.value) return "Body.VerifyAccount";

      return {
        sending: "Body.VerifyAccountSending",
        sent: "Body.VerifyAccountSent",
        failed: "Body.VerifyAccountNotSent",
      }[mail.value];
    });

    // A request the visitor started may be on its way while the page asks the server.
    const sending = () => mail.value === "sending";

    async function send() {
      mail.value = "sending";
      const [success, error] = await requestEmailVerification();

      // Another tab or device has confirmed the address meanwhile.
      if (error?.detail == "Error.EmailAlreadyVerified") await getUser();
      if (user.value?.email_verified) return emit("status", "success");
      mail.value = success ? "sent" : "failed";

      return !!success;
    }

    /**
     * Whoever arrives without a code that still works gets one, once: the
     * request is noted before it is made, so neither a reload nor a second tab
     * sends another. Without a place for the note nothing is sent unasked.
     */
    let arriving = false;
    async function arrive() {
      const owner = user.value?.id;
      if (arriving || sending()) return;
      if (!owner) return void (mail.value = "");
      arriving = true;

      try {
        // The server's word comes first: the profile may be missing here, or
        // another tab or device may have confirmed the address since.
        await getUser();
        if (user.value?.id !== owner) return void (mail.value = "");
        if (user.value?.email_verified) return emit("status", "success");
        if (sending()) return;

        const waiting = needsEmailVerification(user.value, profileLoaded.value) && !!email.value;
        if (waiting && verificationMailNoted(owner)) mail.value = "sent";
        else if (waiting && mail.value !== "failed" && noteVerificationMail(owner)) await send();
        else if (mail.value === "checking") mail.value = "";
      } finally {
        arriving = false;
      }
    }

    // A tab in the background waits until somebody looks at it.
    onMounted(() =>
      watch(
        [() => user.value?.id, visibility],
        ([, seen]) => {
          if (seen === "visible") arrive();
        },
        { immediate: true }
      )
    );

    async function resendAccountVerificationCode() {
      if (sending()) return;
      if (await send()) openSnackbar("success", "Success.ResendAccountVerificationCode");
    }

    // ============================================================= functions
    const router = useRouter();

    async function onclickSubmitForm() {
      if (user.value) {
        let email = user?.value?.email ?? "";
        if (!!!email) {
          openDialog(
            "warning",
            "Headings.MissingEmail",
            "Body.MissingEmail",
            true,
            {
              label: "Buttons.AddEmail",
              onclick: () => {
                router.push("/profile/edit");
              },
            },
            null
          );
          return;
        }
      }

      if (form.validate()) {
        form.submitting = true;
        const [success, error] = await verifyAccount(form.body());
        form.submitting = false;

        // A wrong or expired code is named as such; anything else may work later.
        success
          ? await successHandler(success)
          : errorHandler({
              detail:
                error?.detail == "Error.InvalidVerificationCode"
                  ? error.detail
                  : "Error.VerifyEmail",
            });
      } else {
        openSnackbar("error", "Error.InvalidForm");
      }
    }

    async function successHandler(res: any) {
      forgetVerificationMail(user.value?.id);

      // Without a session in this browser the code alone has confirmed the address.
      if (!getAccessToken()) return emit("status", "success");

      const [success, error] = await refresh();

      if (!!success) {
        emit("status", "success");
      }
    }

    function errorHandler(res: any) {
      openSnackbar("error", res?.detail ?? "");
    }

    async function onclickLogout() {
      await logout();
    }

    return {
      form,
      onclickSubmitForm,
      refForm,
      t,
      resendAccountVerificationCode,
      onclickLogout,
      user,
      email,
      mail,
      missingEmail,
      notice,
    };
  },
});
</script>

<style scoped></style>

<template>
  <form
    class="flex flex-col gap-box"
    :class="{ 'form-submitting': form.submitting }"
    novalidate
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
        :show-error="attempted"
      />
      <!--
        The line at the field is read out when the cursor enters the field. With the Enter
        key the cursor is there already and nothing moves, so the line is said here.
      -->
      <p class="sr-only" role="alert">{{ spoken }}</p>

      <InputBtn :loading="form.submitting" class="self-center" @click="onclickSubmitForm()" mt mb>
        {{ t("Buttons.ConfirmCode") }}
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
import { computed, defineComponent, nextTick, onMounted, ref, watch } from "vue";
import { useDocumentVisibility } from "@vueuse/core";
import { useI18n } from "vue-i18n";
import type { IForm } from "~/types/form";

export default defineComponent({
  emits: ["status"],
  setup(props, { emit }) {
    const { t } = useI18n();

    // ============================================================= refs
    const refForm = ref<HTMLFormElement | null>(null);
    // The field names what is wrong with the code, also when it was never touched.
    const attempted = ref(false);

    // ============================================================= reactive
    const form = reactive<IForm>({
      code: {
        valid: false,
        value: "",
        rules: [
          (v: string) => !!v || "Error.VerificationCodeMissing",
          (v: string) =>
            /^([a-zA-Z\d]{4}-){3}[a-zA-Z\d]{4}$/.test(v) || "Error.VerificationCodeFormat",
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
     * its way, a code that was sent from this browser and still works, a
     * further code the visitor asked for, a request whose answer never
     * arrived, or a request the server refused.
     */
    const mail = ref<"" | "checking" | "sending" | "sent" | "resent" | "open" | "failed">(
      user.value?.id ? "checking" : ""
    );
    const missingEmail = computed(
      () => needsEmailVerification(user.value, profileLoaded.value) && !email.value
    );
    const notice = computed(() => {
      if (missingEmail.value) return "Body.VerifyAccountNoEmail";
      if (mail.value === "checking") return "";
      // The other sentences name the address.
      if (mail.value === "" || !email.value) return "Body.VerifyAccount";

      return {
        sending: "Body.VerifyAccountSending",
        sent: "Body.VerifyAccountSent",
        resent: "Body.VerifyAccountResent",
        open: "Body.VerifyAccountOpen",
        failed: "Body.VerifyAccountNotSent",
      }[mail.value];
    });

    // A request the visitor started may be on its way while the page asks the server.
    const sending = () => mail.value === "sending";

    // A confirmed address ends the page, and nothing is left to remember.
    function confirmed() {
      forgetVerificationMail(user.value?.id);
      emit("status", "success");
    }

    async function send() {
      mail.value = "sending";
      const [success, error, open] = await requestEmailVerification();

      // Another tab or device has confirmed the address meanwhile.
      if (error?.detail == "Error.EmailAlreadyVerified") await getUser();
      if (user.value?.email_verified) return confirmed();
      // Without an answer of the server nobody knows whether a mail went out.
      mail.value = success ? "sent" : open ? "open" : "failed";

      return !!success;
    }

    /**
     * Whoever arrives without a code that still works gets one, once: the
     * request is noted before it is made, so neither a reload nor a second tab
     * sends another, and one window at a time looks for the note and writes
     * it. Without a place for the note nothing is sent unasked.
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
        if (user.value?.email_verified) return confirmed();

        await withVerificationMailLock(owner, async () => {
          // The wait for the other window may have been long.
          if (user.value?.id !== owner) return void (mail.value = "");
          if (sending()) return;

          const waiting = needsEmailVerification(user.value, profileLoaded.value) && !!email.value;
          // The note names a code that was sent or a request whose answer is still open.
          const noted = waiting ? verificationMailNote(owner) : "";
          if (noted) mail.value = noted;
          else if (waiting && mail.value !== "failed" && noteVerificationRequest(owner))
            await send();
          else if (mail.value === "checking") mail.value = "";
        });
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

    // The sentence of the page says what became of the request; nothing repeats it.
    async function resendAccountVerificationCode() {
      if (sending()) return;
      if (await send()) mail.value = "resent";
    }

    // ============================================================= The line at the field, read out
    const spoken = ref("");

    /** The same words as the line at the field: the first rule the code breaks. */
    async function speakCodeError() {
      const broken = form.code.rules.map((rule: any) => rule(form.code.value));
      // A live region repeats a sentence only when its text changes.
      spoken.value = "";
      await nextTick();
      spoken.value = t(broken.find((result: unknown) => result !== true) ?? "");
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
        // The line at the field says what is wrong; the field is where it is put right.
        attempted.value = true;
        const field = refForm.value?.querySelector("input");
        const cursorInField = !!field && document.activeElement === field;
        field?.focus();
        if (cursorInField) await speakCodeError();
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
      attempted,
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
      spoken,
    };
  },
});
</script>

<style scoped></style>

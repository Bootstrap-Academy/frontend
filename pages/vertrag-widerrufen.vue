<!--
  Withdrawal from a contract under § 356a BGB.

  The page is public: it carries no middleware and no session is required, so
  the button in `components/ContractTermination.vue` leads here for logged out
  visitors as well.

  § 356a BGB requires the consumer to be able to store the content of the
  declaration together with the date and time of its receipt, which is what the
  record replacing the form is for.
-->

<template>
  <main class="mt-main mb-main container">
    <div class="mx-auto w-full max-w-2xl">
      <h1 class="text-heading-1 mb-box">{{ t("Headings.WithdrawContract") }}</h1>

      <!-- ============================================================ FORM -->
      <template v-if="!!!declaration">
        <p class="mb-box">{{ t("Body.WithdrawContractIntro") }}</p>

        <form
          class="flex flex-col gap-box"
          :class="{ 'form-submitting': form.submitting }"
          @submit.prevent="onclickSubmitForm()"
          ref="refForm"
        >
          <Input
            label="Inputs.DeclarationName"
            autocomplete="name"
            v-model="form.name.value"
            @valid="form.name.valid = $event"
            :rules="form.name.rules"
          />

          <Input
            label="Inputs.DeclarationEmail"
            type="email"
            autocomplete="email"
            hint="Body.ContractEmailHint"
            v-model="form.email.value"
            @valid="form.email.valid = $event"
            :rules="form.email.rules"
          />

          <InputSelect
            id="contract"
            label="Inputs.ContractOrOrder"
            :options="contracts"
            v-model="form.contract.value"
          />

          <InputTextarea
            label="Inputs.OrderDetails"
            hint="Body.OrderReferenceHint"
            v-model="form.details.value"
            @valid="form.details.valid = $event"
            :rules="form.details.rules"
            :max="4096"
            :rows="4"
          />

          <InputBtn
            :loading="form.submitting"
            class="self-end !normal-case"
            @click="onclickSubmitForm()"
            mt
          >
            {{ t("Buttons.WithdrawNow") }}
          </InputBtn>
        </form>
      </template>

      <!-- ========================================================== RECORD -->
      <section v-else class="declaration-record flex flex-col gap-box">
        <h2 class="text-heading-2">{{ t("Headings.WithdrawalReceived") }}</h2>

        <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-y-1 gap-x-card">
          <dt class="text-body-1 m-0 text-body">{{ t("Headings.DeclarationReceivedAt") }}</dt>
          <dd class="text-body-1 m-0 text-heading">
            {{ t("Body.DeclarationReceivedAtValue", { datetime: receivedAt }) }}
          </dd>

          <dt class="text-body-1 m-0 text-body">{{ t("Inputs.DeclarationName") }}</dt>
          <dd class="text-body-1 m-0 text-heading">{{ declaration.name }}</dd>

          <dt class="text-body-1 m-0 text-body">{{ t("Inputs.DeclarationEmail") }}</dt>
          <dd class="text-body-1 m-0 text-heading">{{ declaration.email }}</dd>

          <dt class="text-body-1 m-0 text-body">{{ t("Inputs.ContractOrOrder") }}</dt>
          <dd class="text-body-1 m-0 text-heading">{{ t(contractLabel) }}</dd>

          <template v-if="!!declaration.details">
            <dt class="text-body-1 m-0 text-body">{{ t("Headings.OrderDetails") }}</dt>
            <dd class="text-body-1 m-0 whitespace-pre-line text-heading">
              {{ declaration.details }}
            </dd>
          </template>

          <dt class="text-body-1 m-0 text-body">{{ t("Headings.DeclarationReference") }}</dt>
          <dd class="text-body-1 m-0 text-heading">{{ declaration.id }}</dd>
        </dl>

        <p v-if="confirmationEmailSent">
          {{ t("Body.ConfirmationEmailSent", { email: declaration.email }) }}
        </p>
        <p v-else>{{ t("Body.ConfirmationEmailNotSent") }}</p>

        <Btn class="w-fit print:!hidden" @click="onclickPrint()">
          {{ t("Buttons.SaveAsPdfOrPrint") }}
        </Btn>
      </section>
    </div>
  </main>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { IForm } from "~/types/form";

export default defineComponent({
  setup() {
    const { t, locale } = useI18n();

    useHead({ title: computed(() => t("Headings.WithdrawContract")) });

    // ============================================================= refs
    const refForm = ref<HTMLFormElement | null>(null);

    // The declaration returned by the API. As long as it is `null` the form is
    // shown, afterwards the record replaces it on the same page.
    const declaration = ref<any>(null);
    const confirmationEmailSent = ref(false);

    // ============================================================= options
    const contracts = [
      { label: "Inputs.ContractCoins", value: "COINS" },
      { label: "Inputs.ContractPremium", value: "PREMIUM" },
      { label: "Inputs.ContractOther", value: "OTHER" },
    ];

    // ============================================================= reactive
    const form = reactive<IForm>({
      name: {
        valid: false,
        value: "",
        rules: [
          (v: string) => !!v || "Error.InputEmpty_Inputs.DeclarationName",
          (v: string) => v.length >= 2 || "Error.InputMinLength_2",
          (v: string) => v.length <= 256 || "Error.InputMaxLength_256",
        ],
      },
      email: {
        valid: false,
        value: "",
        rules: [
          (v: string) => !!v || "Error.InputEmpty_Inputs.DeclarationEmail",
          (v: string) => /.+@.+\..+/.test(v) || "Error.InputEmailForm",
        ],
      },
      contract: {
        valid: true,
        value: "COINS",
      },
      details: {
        valid: true,
        value: "",
        rules: [(v: string) => v.length <= 4096 || "Error.InputMaxLength_4096"],
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
        const details = form.details.value.trim();

        return {
          name: form.name.value.trim(),
          email: form.email.value.trim(),
          contract: form.contract.value,
          details: !!details ? details : null,
        };
      },
    });

    // ============================================================= computed
    const receivedAt = computed(() =>
      formatDeclarationDateTime(declaration.value?.received_at ?? "", locale.value)
    );

    const contractLabel = computed(
      () => CONTRACT_LABELS[declaration.value?.contract] ?? "Inputs.ContractOther"
    );

    // ============================================================= prefill
    // A logged in user gets name and e-mail filled in, but both stay editable
    // and nothing on this page depends on a session.
    const user = <any>useUser();

    function prefillFromSession() {
      const profile = user.value;
      if (!!!profile) return;

      const fullName = [profile.first_name, profile.last_name]
        .map((part: string) => (part ?? "").trim())
        .filter((part: string) => !!part)
        .join(" ");

      const name = fullName || profile.display_name || profile.name || "";

      if (!!name && !!!form.name.value) form.name.value = name;
      if (!!profile.email && !!!form.email.value) form.email.value = profile.email;
    }

    watch(user, prefillFromSession, { immediate: true });

    // ============================================================= functions
    async function onclickSubmitForm() {
      if (!form.validate()) return openSnackbar("error", "Error.InvalidForm");

      form.submitting = true;

      const [success, error] = await declareWithdrawal(form.body());

      form.submitting = false;

      success ? successHandler(success) : errorHandler(error);
    }

    function successHandler(res: any) {
      declaration.value = res?.declaration ?? res ?? null;
      confirmationEmailSent.value = !!res?.confirmation_email_sent;

      openSnackbar("success", "Success.WithdrawalDeclared");
    }

    function errorHandler(res: any) {
      openSnackbar("error", declarationErrorKey(res));
    }

    function onclickPrint() {
      window.print();
    }

    return {
      t,
      refForm,
      form,
      contracts,
      declaration,
      confirmationEmailSent,
      receivedAt,
      contractLabel,
      onclickSubmitForm,
      onclickPrint,
    };
  },
});
</script>

<style scoped>
/*
  § 356a BGB: the printed sheet has to reproduce the declaration. The
  navigation, the language switcher, the footer, the permanent bar and the
  print button are hidden by a `print:` utility, so only this page remains -
  in black on white, because the interface itself is a dark theme.
*/
@media print {
  main,
  main :deep(*) {
    color: #000 !important;
    background: transparent !important;
  }
}
</style>

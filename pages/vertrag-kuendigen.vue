<!--
  Cancellation of a contract under § 312k BGB.

  The page is public: it carries no middleware and no session is required, so
  the button in `components/ContractTermination.vue` leads here for logged out
  visitors as well.

  § 312k Abs. 3 BGB requires the consumer to be able to store the content of
  the declaration together with the date and time of its receipt, which is what
  the record replacing the form is for.

  Following BGH I ZR 200/25 the page carries nothing but the form, the
  statutory button and the record - no retention offers, no alternatives to
  cancelling and no additional confirmation step.
-->

<template>
  <main class="mt-main mb-main container">
    <div class="mx-auto w-full max-w-2xl">
      <h1 class="text-heading-1 mb-box">{{ t("Headings.CancelContract") }}</h1>

      <div v-if="retained && !declaration" class="mb-box">
        <p>{{ t("Body.DeclarationRecoveryHint") }}</p>
        <Btn secondary @click="recoverReceipt()">{{ t("Buttons.RecoverDeclarationReceipt") }}</Btn>
      </div>
      <!-- ============================================================ FORM -->
      <template v-if="!!!declaration">
        <p class="mb-box">{{ t("Body.CancelContractIntro") }}</p>

        <form
          class="flex flex-col gap-box"
          :class="{ 'form-submitting': form.submitting }"
          @submit.prevent="onclickSubmitForm()"
          ref="refForm"
        >
          <fieldset>
            <legend class="text-body-2 mb-2 block text-body font-body">
              {{ t("Inputs.CancellationType") }}
            </legend>
            <InputRadioGroup
              name="cancellation-type"
              :options="cancellationTypes"
              v-model="form.cancellationType.value"
            />
          </fieldset>

          <InputTextarea
            v-if="isExtraordinary"
            label="Inputs.ExtraordinaryCancellationReason"
            v-model="form.reason.value"
            @valid="form.reason.valid = $event"
            :rules="form.reason.rules"
            :max="4096"
            :rows="4"
          />

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
            label="Inputs.Contract"
            :options="contracts"
            v-model="form.contract.value"
          />

          <!--
            § 312k Abs. 2 S. 2 Nr. 2 BGB asks the form for the designation of
            the contract in the consumer's own words. It is asked for every
            kind of cancellation, next to - not instead of - the selection
            above, which is what finds the premium membership.
          -->
          <Input
            id="contract-designation"
            label="Inputs.ContractDesignation"
            hint="Body.ContractDesignationHint"
            v-model="form.contractDesignation.value"
            @valid="form.contractDesignation.valid = $event"
            :rules="form.contractDesignation.rules"
          />

          <Input
            id="renewal-agreement-id"
            label="Inputs.RenewalAgreementReference"
            hint="Body.RenewalAgreementReferenceHint"
            v-model="renewalReference"
          />

          <fieldset>
            <legend class="text-body-2 mb-2 block text-body font-body">
              {{ t("Inputs.EndOfContract") }}
            </legend>
            <InputRadioGroup
              name="end-of-contract"
              :options="endOptions"
              v-model="form.endType.value"
            />
          </fieldset>

          <Input
            v-if="isEndAtDate"
            type="date"
            label="Inputs.EndDate"
            :min="today"
            v-model="form.endDate.value"
            @valid="form.endDate.valid = $event"
            :rules="form.endDate.rules"
          />

          <!--
            An extraordinary cancellation claims an end before the paid period
            is over. Whether that holds is decided by a person, so no end date
            is determined here and the form says so before it is sent.
          -->
          <p v-if="isExtraordinary" class="text-body-2 m-0 text-body">
            {{ t("Body.ExtraordinaryCancellationEndNotice") }}
          </p>

          <InputBtn
            :loading="form.submitting"
            :disabled="form.submitting"
            class="self-end !normal-case"
            @click="onclickSubmitForm()"
            mt
          >
            {{ t("Buttons.CancelNow") }}
          </InputBtn>
        </form>
      </template>

      <!-- ========================================================== RECORD -->
      <section v-else class="declaration-record flex flex-col gap-box">
        <h2 class="text-heading-2">{{ t("Headings.CancellationReceived") }}</h2>

        <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-y-1 gap-x-card">
          <dt class="text-body-1 m-0 text-body">{{ t("Headings.DeclarationReceivedAt") }}</dt>
          <dd class="text-body-1 m-0 text-heading">
            {{ t("Body.DeclarationReceivedAtValue", { datetime: receivedAt }) }}
          </dd>

          <dt class="text-body-1 m-0 text-body">{{ t("Inputs.DeclarationName") }}</dt>
          <dd class="text-body-1 m-0 text-heading">{{ declaration.name }}</dd>

          <dt class="text-body-1 m-0 text-body">{{ t("Inputs.DeclarationEmail") }}</dt>
          <dd class="text-body-1 m-0 text-heading">{{ declaration.email }}</dd>

          <dt class="text-body-1 m-0 text-body">{{ t("Inputs.Contract") }}</dt>
          <dd class="text-body-1 m-0 text-heading">{{ t(contractLabel) }}</dd>

          <template v-if="!!declaration.contract_designation">
            <dt class="text-body-1 m-0 text-body">{{ t("Inputs.ContractDesignation") }}</dt>
            <dd class="text-body-1 m-0 text-heading">
              {{ declaration.contract_designation }}
            </dd>
          </template>

          <dt class="text-body-1 m-0 text-body">{{ t("Inputs.CancellationType") }}</dt>
          <dd class="text-body-1 m-0 text-heading">{{ t(cancellationTypeLabel) }}</dd>

          <template v-if="!!declaration.details">
            <dt class="text-body-1 m-0 text-body">{{ t("Headings.CancellationReason") }}</dt>
            <dd class="text-body-1 m-0 whitespace-pre-line text-heading">
              {{ declaration.details }}
            </dd>
          </template>

          <dt class="text-body-1 m-0 text-body">{{ t("Inputs.EndOfContract") }}</dt>
          <dd class="text-body-1 m-0 text-heading">
            {{ requestedEnd || t("Body.EndAtNextPossibleDate") }}
          </dd>

          <dt class="text-body-1 m-0 text-body">{{ t("Headings.DeclarationReference") }}</dt>
          <dd class="text-body-1 m-0 text-heading">{{ declaration.id }}</dd>
        </dl>

        <!--
          An extraordinary cancellation is answered without an end date, and
          for a different reason than a declaration whose contract could not
          be matched: it is examined, and the end date follows in Textform.
        -->
        <p v-if="confirmationEmailSent">
          {{ t("Body.ConfirmationEmailSent", { email: declaration.email }) }}
        </p>
        <p v-else>{{ t("Body.ConfirmationEmailNotSent") }}</p>

        <p>{{ t("Body.DeclarationReceiptMeaning") }}</p>
        <Btn class="w-fit print:!hidden" @click="onclickPrint()">
          {{ t("Buttons.SaveAsPdfOrPrint") }}
        </Btn>
        <Btn secondary class="w-fit print:!hidden" @click="newDeclaration()">{{
          t("Buttons.NewDeclaration")
        }}</Btn>
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

    useHead({ title: computed(() => t("Headings.CancelContract")) });

    // ============================================================= refs
    const refForm = ref<HTMLFormElement | null>(null);

    // The declaration returned by the API. As long as it is `null` the form is
    // shown, afterwards the record replaces it on the same page.
    const declaration = ref<any>(null);
    const confirmationEmailSent = ref(false);
    const retained = ref(false);
    const renewalReference = ref("");
    onMounted(() => {
      retained.value = hasRetainedDeclaration("/contracts/cancellations");
    });
    async function recoverReceipt() {
      const [receipt, error] = await recoverDeclarationReceipt("/contracts/cancellations");
      if (receipt) successHandler(receipt);
      else openSnackbar("error", declarationErrorKey(error));
    }
    function newDeclaration() {
      forgetRetainedDeclaration("/contracts/cancellations");
      declaration.value = null;
      retained.value = false;
    }

    // ============================================================= options
    const cancellationTypes = [
      { label: "Inputs.OrdinaryCancellation", value: "ORDINARY" },
      { label: "Inputs.ExtraordinaryCancellation", value: "EXTRAORDINARY" },
    ];

    const contracts = [
      { label: "Inputs.ContractPremium", value: "PREMIUM" },
      { label: "Inputs.ContractOther", value: "OTHER" },
    ];

    const endOptions = [
      { label: "Inputs.EndAtNextPossibleDate", value: "NEXT_POSSIBLE" },
      { label: "Inputs.EndAtDate", value: "DATE" },
    ];

    const today = new Date().toISOString().slice(0, 10);

    // ============================================================= reactive
    const form = reactive<IForm>({
      cancellationType: {
        valid: true,
        value: "ORDINARY",
      },
      reason: {
        valid: true,
        value: "",
        rules: [(v: string) => v.length <= 4096 || "Error.InputMaxLength_4096"],
      },
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
        value: "PREMIUM",
      },
      contractDesignation: {
        valid: true,
        value: "",
        rules: [(v: string) => v.length <= 256 || "Error.InputMaxLength_256"],
      },
      endType: {
        valid: true,
        value: "NEXT_POSSIBLE",
      },
      endDate: {
        valid: true,
        value: "",
        rules: [
          (v: string) => form.endType.value != "DATE" || !!v || "Error.InputEmpty_Inputs.EndDate",
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

        // The date is only filled in once the second option is picked, so it
        // cannot be covered by the untouched input alone.
        if (form.endType.value == "DATE" && !!!form.endDate.value) isValid = false;

        if (refForm.value) refForm.value.reportValidity();
        return isValid;
      },
      body: () => {
        const extraordinary = form.cancellationType.value == "EXTRAORDINARY";
        const reason = form.reason.value.trim();
        const designation = [form.contractDesignation.value.trim(), renewalReference.value.trim()]
          .filter(Boolean)
          .join(" / ");

        return {
          name: form.name.value.trim(),
          email: form.email.value.trim(),
          contract: form.contract.value,
          contract_designation: !!designation ? designation : null,
          cancellation_type: form.cancellationType.value,
          ...(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            renewalReference.value.trim()
          )
            ? { renewal_agreement_id: renewalReference.value.trim() }
            : {}),
          details: extraordinary && !!reason ? reason : null,
          requested_end: form.endType.value == "DATE" ? toRequestedEnd(form.endDate.value) : null,
        };
      },
    });

    // ============================================================= computed
    const isExtraordinary = computed(() => form.cancellationType.value == "EXTRAORDINARY");
    const isEndAtDate = computed(() => form.endType.value == "DATE");

    const receivedAt = computed(() =>
      formatDeclarationDateTime(declaration.value?.received_at ?? "", locale.value)
    );
    const requestedEnd = computed(() =>
      formatDeclarationDate(declaration.value?.requested_end ?? "", locale.value)
    );
    const effectiveEnd = computed(() =>
      formatDeclarationDate(declaration.value?.effective_end ?? "", locale.value)
    );

    const contractLabel = computed(
      () => CONTRACT_LABELS[declaration.value?.contract] ?? "Inputs.ContractOther"
    );
    const cancellationTypeLabel = computed(
      () =>
        CANCELLATION_TYPE_LABELS[declaration.value?.cancellation_type] ??
        "Inputs.OrdinaryCancellation"
    );

    // What the stored declaration says, not what the form currently shows -
    // the record has to describe the declaration that was handed in.
    const declaredExtraordinary = computed(
      () => declaration.value?.cancellation_type == "EXTRAORDINARY"
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

    // Keep an abandoned reason from blocking an ordinary cancellation.
    watch(
      () => form.cancellationType.value,
      (value) => {
        if (value == "EXTRAORDINARY") return;
        form.reason.value = "";
        form.reason.valid = true;
      }
    );

    watch(
      () => form.endType.value,
      (value) => {
        if (value == "DATE") return;
        form.endDate.value = "";
        form.endDate.valid = true;
      }
    );

    // ============================================================= functions
    async function onclickSubmitForm() {
      if (form.submitting || declaration.value) return;
      if (!form.validate()) return openSnackbar("error", "Error.InvalidForm");

      form.submitting = true;

      const [success, error] = await declareCancellation(form.body());

      form.submitting = false;

      success ? successHandler(success) : errorHandler(error);
    }

    function successHandler(res: any) {
      declaration.value = res?.declaration ?? res ?? null;
      confirmationEmailSent.value = !!res?.confirmation_email_sent;

      openSnackbar("success", "Success.CancellationDeclared");
    }

    function errorHandler(res: any) {
      openSnackbar("error", declarationErrorKey(res));
    }

    function onclickPrint() {
      window.print();
    }

    return {
      t,
      retained,
      recoverReceipt,
      newDeclaration,
      renewalReference,
      refForm,
      form,
      cancellationTypes,
      contracts,
      endOptions,
      today,
      isExtraordinary,
      isEndAtDate,
      declaration,
      confirmationEmailSent,
      receivedAt,
      requestedEnd,
      effectiveEnd,
      contractLabel,
      cancellationTypeLabel,
      declaredExtraordinary,
      onclickSubmitForm,
      onclickPrint,
    };
  },
});
</script>

<style scoped>
/*
  § 312k Abs. 3 BGB: the printed sheet has to reproduce the declaration. The
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

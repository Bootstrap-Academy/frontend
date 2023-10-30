<template>
  <form
    class="flex flex-col gap-box"
    :class="{ 'form-submitting': form.submitting }"
    @submit.prevent="onclickSubmitForm()"
    ref="refForm"
  >
    <InputOTP
      class="self-center"
      label="Inputs.MFACode"
      v-model="form.code.value"
      @valid="form.code.valid = $event"
      :rules="form.code.rules"
    />

    <InputBtn
      :loading="form.submitting"
      class="self-center"
      @click="onclickSubmitForm()"
      mt
      mb
    >
      {{ t("Buttons.EnableMFA") }}
    </InputBtn>

    <NuxtLink to="/account/mfa/initialize" class="self-center">
      {{ t("Links.DontHaveSecretCode") }}
      <span class="text-accent">{{ t("Links.InitializeSecretCode") }}</span>
    </NuxtLink>
  </form>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { IForm } from "~/types/form";

export default defineComponent({
  emits: ["recovery_code"],
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
          (v: string) => !!v || "Error.InputEmpty_Inputs.MFACode",
          (v: string) => v.length >= 6 || "Error.InputMinLength_6",
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

    // ============================================================= functions
    async function onclickSubmitForm() {
      if (form.validate()) {
        form.submitting = true;
        const [success, error] = await enableMFA(form.body());

        if (!!success) {
          await refresh();
          successHandler(success);
        } else {
          errorHandler(error);
        }
      } else {
        openSnackbar("error", "Error.InvalidForm");
      }
    }

    function successHandler(res: any) {
      emit("recovery_code", res);
      form.submitting = false;
    }

    function errorHandler(res: any) {
      openSnackbar("error", res?.detail ?? "");
      form.submitting = false;
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

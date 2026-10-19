<!--
  The declarations a consumer has to give before a paid order can be placed
  (§ 356 Abs. 5 Nr. 2 BGB for services, § 356 Abs. 6 Nr. 2 BGB for digital
  content). Both boxes are unticked by default and the order button stays
  disabled until both are ticked.

  The wording is that of the declarations in the offer text above the boxes:
  German, and English on the English interface, where the page says once that
  the German wording is binding (AGB 1.4).
-->
<template>
  <div class="grid gap-box">
    <InputCheckbox
      id="WithdrawalConsentPerformance"
      :label="`Body.WithdrawalConsent${part}Performance`"
      v-model="performance"
    />

    <InputCheckbox
      id="WithdrawalConsentLoss"
      :label="`Body.WithdrawalConsent${part}Loss`"
      v-model="loss"
    />
  </div>
</template>

<script setup lang="ts">
import type { WithdrawalKind } from "~~/composables/withdrawal";

const props = defineProps({
  /** Which part of the withdrawal instruction applies to this order. */
  kind: { type: String as PropType<WithdrawalKind>, default: "digital" },
  /** `true` once both declarations have been given. */
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits<{ (e: "update:modelValue", value: boolean): void }>();

const performance = ref(false);
const loss = ref(false);

const part = computed(() => (props.kind === "service" ? "Service" : "Digital"));

watch([performance, loss], ([a, b]) => emit("update:modelValue", a && b));
</script>

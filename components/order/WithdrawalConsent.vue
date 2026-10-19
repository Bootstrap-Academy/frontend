<!--
  The declarations a consumer has to give before a paid order can be placed
  (§ 356 Abs. 5 Nr. 2 BGB for services, § 356 Abs. 6 Nr. 2 BGB for digital
  content). Both boxes are unticked by default and the order button stays
  disabled until both are ticked.

  The boxes speak the language of the offer text above them (`language`): German
  wherever the text is German, also on the English interface; English only where
  the English wording of the offer is shown, and there the page says once that
  the German wording is binding (AGB 1.4).
-->
<template>
  <div class="grid gap-box" :lang="language || undefined">
    <InputCheckbox
      id="WithdrawalConsentPerformance"
      :label="`Body.WithdrawalConsent${part}Performance`"
      :locale="locale"
      v-model="performance"
    />

    <InputCheckbox
      id="WithdrawalConsentLoss"
      :label="`Body.WithdrawalConsent${part}Loss`"
      :locale="locale"
      v-model="loss"
    />
  </div>
</template>

<script setup lang="ts">
import type { WithdrawalKind } from "~~/composables/withdrawal";

const props = defineProps({
  /** Which part of the withdrawal instruction applies to this order. */
  kind: { type: String as PropType<WithdrawalKind>, default: "digital" },
  /** The language of the offer text the boxes belong to (`de`, `en`); empty: the interface's. */
  language: { type: String as PropType<"" | "de" | "en">, default: "" },
  /** `true` once both declarations have been given. */
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits<{ (e: "update:modelValue", value: boolean): void }>();

const performance = ref(false);
const loss = ref(false);

const part = computed(() => (props.kind === "service" ? "Service" : "Digital"));
const locale = computed(() => offerLocale(props.language));

watch([performance, loss], ([a, b]) => emit("update:modelValue", a && b));
</script>

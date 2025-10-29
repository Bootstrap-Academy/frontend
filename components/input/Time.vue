<template>
  <article>
    <label for="" class="text-body-2 mb-2 block text-body font-body md:mb-1">
      {{ t(label) }}
    </label>
    <div class="flex items-center gap-2">
      <input
        ref="DOM_INPUT_HRS"
        v-model="hours"
        type="number"
        min="0"
        max="23"
        class="relative z-10 block min-w-[35px] max-w-fit flex-shrink-0 appearance-none rounded bg-secondary py-1 text-center text-base tracking-[0.15em] text-white ring-2 ring-tertiary transition duration-500 ease-out focus:outline-none focus:ring-accent focus:ring-offset-2 focus:ring-offset-tertiary md:min-w-[45px] md:px-4 md:py-2.5"
      />
      <h3 class="text-heading-1">:</h3>
      <input
        ref="DOM_INPUT_MINS"
        v-model="minutes"
        type="number"
        min="0"
        max="59"
        class="relative z-10 block min-w-[35px] max-w-fit flex-shrink-0 appearance-none rounded bg-secondary py-1 text-center text-base tracking-[0.15em] text-white ring-2 ring-tertiary transition duration-500 ease-out focus:outline-none focus:ring-accent focus:ring-offset-2 focus:ring-offset-tertiary md:min-w-[45px] md:px-4 md:py-2.5"
      />
    </div>

    <p
      class="relative z-0 pt-2 text-xs text-error transition duration-500 ease-out"
      :class="error ? 'translate-y-0 opacity-100' : 'translate-y-[-100%] opacity-0'"
    >
      {{ error }}.
    </p>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  props: {
    label: { type: String, default: "Inputs.StartTime" },
    min: { type: String, default: "" },
    minDate: { type: String, default: "" },
    modelValue: { type: String, default: "" },
  },
  emits: ["update:modelValue", "valid"],
  setup(props, { emit }) {
    const { t } = useI18n();

    const hours = ref(0);
    const DOM_INPUT_HRS = ref<HTMLInputElement | null>(null);

    const minutes = ref(10);
    const DOM_INPUT_MINS = ref<HTMLInputElement | null>(null);

    // ============================================================= computed

    const minHrs = computed(() => {
      if (!!!props.min) return -1;
      let [hrs, mins, secs] = props.min.split(":");
      return parseInt(hrs);
    });

    const minMins = computed(() => {
      if (!!!props.min) return -1;
      let [hrs, mins, secs] = props.min.split(":");
      return parseInt(mins);
    });

    const error = ref("");

    function checkMinValidityAfterBlur(hrs: number, mins: number) {
      let msg: string = "";

      const selectedDate = new Date(props.minDate);
      const currentDate = new Date();
      const isFutureDate = currentDate.getMilliseconds() - selectedDate.getMilliseconds() > 0;

      // checking hrs
      if (hrs < 0) {
        msg = "Hours must be greater than 0";
        if (!!DOM_INPUT_HRS.value) DOM_INPUT_HRS.value.setCustomValidity(msg);
      } else if (hrs > 23) {
        msg = "Hours must be less than 23";
        if (!!DOM_INPUT_HRS.value) DOM_INPUT_HRS.value.setCustomValidity(msg);
      }
      // checking minutes
      else if (mins < 0) {
        msg = "Minutes must be greater than 0";
        if (!!DOM_INPUT_MINS.value) DOM_INPUT_MINS.value.setCustomValidity(msg);
      } else if (mins > 59) {
        msg = "Minutes must be less than 59";
        if (!!DOM_INPUT_MINS.value) DOM_INPUT_MINS.value.setCustomValidity(msg);
      }

      // Min time checking
      else if (!isFutureDate && minHrs.value != -1 && minMins.value != 1) {
        if (hrs < minHrs.value) {
          msg = "Hours cannot be set in the past";
          if (!!DOM_INPUT_HRS.value) DOM_INPUT_HRS.value.setCustomValidity(msg);
        } else if (hrs == minHrs.value && mins < minMins.value) {
          msg = "Minutes cannot be set in the past";
          if (!!DOM_INPUT_MINS.value) DOM_INPUT_MINS.value.setCustomValidity(msg);
        }
      }

      // Otherwise no error
      else {
        msg = "";
      }

      if (!!DOM_INPUT_MINS.value) DOM_INPUT_MINS.value.setCustomValidity(msg);
      if (!!DOM_INPUT_HRS.value) DOM_INPUT_HRS.value.setCustomValidity(msg);

      emit("valid", !!!msg);

      error.value = msg;
    }

    watch(
      () => props.modelValue,
      (newValue, oldValue) => {
        const [hrs, mins, secs] = newValue.split(":");
        hours.value = parseInt(hrs);
        minutes.value = parseInt(mins);
        checkMinValidityAfterBlur(hours.value, minutes.value);
      },
      { deep: true, immediate: true }
    );
    watch(
      () => hours.value,
      (newValue, oldValue) => {
        emit("update:modelValue", `${newValue}:${minutes.value}:00`);
      }
    );
    watch(
      () => minutes.value,
      (newValue, oldValue) => {
        emit("update:modelValue", `${hours.value}:${newValue}:00`);
      }
    );
    watch(
      () => props.minDate,
      (newValue, oldValue) => {
        checkMinValidityAfterBlur(hours.value, minutes.value);
      }
    );

    return {
      t,
      hours,
      minutes,
      DOM_INPUT_HRS,
      DOM_INPUT_MINS,
      error,
      checkMinValidityAfterBlur,
    };
  },
});
</script>

<style scoped>
.time {
  @apply text-body-1 h-10 w-10 p-0 text-center;
}
</style>

<template>
  <article>
    <label for="" class="text-body text-body-2 font-body mb-2 md:mb-1 block">
      {{ t(label) }}
    </label>
    <div class="flex gap-2 items-center">
      <input
        ref="DOM_INPUT_HRS"
        v-model="hours"
        type="number"
        min="0"
        max="23"
        class="block tracking-[0.15em] flex-shrink-0 max-w-fit min-w-[35px] py-1 md:min-w-[45px] md:px-4 md:py-2.5 text-base text-white bg-secondary rounded relative z-10 transition ease-out duration-500 focus:outline-none appearance-none ring-2 ring-tertiary focus:ring-offset-2 focus:ring-offset-tertiary focus:ring-accent text-center"
      />
      <h3 class="text-heading-1">:</h3>
      <input
        ref="DOM_INPUT_MINS"
        v-model="minutes"
        type="number"
        min="0"
        max="59"
        class="block tracking-[0.15em] flex-shrink-0 max-w-fit min-w-[35px] py-1 md:min-w-[45px] md:px-4 md:py-2.5 text-base text-white bg-secondary rounded relative z-10 transition ease-out duration-500 focus:outline-none appearance-none ring-2 ring-tertiary focus:ring-offset-2 focus:ring-offset-tertiary focus:ring-accent text-center"
      />
    </div>

    <p
      class="pt-2 text-xs relative z-0 transition ease-out duration-500 text-error"
      :class="
        error ? 'translate-y-0 opacity-100' : 'translate-y-[-100%] opacity-0'
      "
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
      const isFutureDate =
        currentDate.getMilliseconds() - selectedDate.getMilliseconds() > 0;

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
          if (!!DOM_INPUT_MINS.value)
            DOM_INPUT_MINS.value.setCustomValidity(msg);
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
  @apply p-0 w-10 h-10 text-center text-body-1;
}
</style>

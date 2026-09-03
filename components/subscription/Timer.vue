<template>
  <p class="mb-2 text-xl">{{ t("Headings.RefillIn") }}</p>
  <p class="text-3xl font-bold text-accent">{{ formatTime(remainingTime) }}</p>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import { onUnmounted, ref, onMounted } from "vue";

export default {
  props: {
    targetTime: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    const { t } = useI18n();
    const remainingTime = ref(0);

    const updateTimer = () => {
      const currentTime = new Date().getTime();
      remainingTime.value = Math.max(0, props.targetTime - currentTime);
    };

    const formatTime = (milliseconds) => {
      const hours = Math.floor(milliseconds / (1000 * 60 * 60));
      const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };

    const pad = (number) => {
      return (number < 10 ? "0" : "") + number;
    };

    let interval: ReturnType<typeof setInterval> | undefined;

    onMounted(() => {
      interval = setInterval(updateTimer, 1000);
      updateTimer();
    });

    onUnmounted(() => {
      if (interval) clearInterval(interval);
    });

    return {
      t,
      remainingTime,
      formatTime,
    };
  },
};
</script>

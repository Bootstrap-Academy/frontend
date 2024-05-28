<template>
  <p class="text-xl mb-2">{{ t("Headings.RefillIn") }}</p>
  <p class="text-3xl text-accent font-bold">{{ formatTime(remainingTime) }}</p>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import { ref, onMounted } from 'vue';

export default {
  props: {
    targetTime: {
      type: Number,
      required: true
    }
  },
  setup(props) {
    const { t } = useI18n();
    const remainingTime = ref(0);

    const updateTimer = () => {
      const currentTime = new Date().getTime();
      remainingTime.value = props.targetTime - currentTime;
    };

    const formatTime = (milliseconds) => {
      const hours = Math.floor(milliseconds / (1000 * 60 * 60));
      const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };

    const pad = (number) => {
      return (number < 10 ? '0' : '') + number;
    };

    onMounted(() => {
      setInterval(updateTimer, 1000);
      updateTimer();
    });

    return {
      t,
      remainingTime,
      formatTime
    };
  }
};
</script>
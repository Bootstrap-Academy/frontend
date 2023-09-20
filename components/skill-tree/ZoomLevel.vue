<template>
  <article
    class="flex gap-card-sm w-fit p-3 justify-between items-center rounded-2xl bg-primary overflow-hidden"
  >
    <button
      @click="zoomIn"
      class="w-10 h-10 min-w-[2.5rem] min-h-[2.5rem] rounded-xl bg-tertiary text-accent text-3xl flex justify-center items-center"
    >
      +
    </button>

    <h5 class="full">{{ t("Headings.ZoomLevel") }} {{ zoomLevel }}</h5>

    <button
      @click="zoomOut"
      class="w-10 h-10 min-w-[2.5rem] min-h-[2.5rem] rounded-xl bg-tertiary text-accent text-3xl flex justify-center items-center"
    >
      -
    </button>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  emits: ["zoomLevel"],
  setup(props, { emit }) {
    const MIN_ZOOM_LEVEL = 1;
    const MAX_ZOOM_LEVEL = 5;
    const { t } = useI18n();

    const cookie_zoomLevel = useCookie<number>("zoomLevel");

    const zoomLevel = computed({
      get() {
        return cookie_zoomLevel.value || 2;
      },
      set(data: number) {
        cookie_zoomLevel.value = data;
        emit("zoomLevel", cookie_zoomLevel.value);
      },
    });

    function zoomIn() {
      if (zoomLevel.value >= MAX_ZOOM_LEVEL) return;
      zoomLevel.value = zoomLevel.value + 1;
    }
    function zoomOut() {
      if (zoomLevel.value <= MIN_ZOOM_LEVEL) return;
      zoomLevel.value = zoomLevel.value - 1;
    }

    onMounted(() => {
      emit("zoomLevel", cookie_zoomLevel.value);
    });

    return { zoomIn, zoomOut, zoomLevel, t };
  },
});
</script>

<style scoped></style>

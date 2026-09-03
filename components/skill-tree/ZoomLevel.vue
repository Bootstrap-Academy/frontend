<template>
  <article
    class="flex w-fit items-center justify-between overflow-hidden rounded-2xl bg-primary p-3 gap-card-sm"
  >
    <button
      @click="zoomIn"
      class="flex h-10 min-h-[2.5rem] w-10 min-w-[2.5rem] items-center justify-center rounded-xl bg-tertiary text-3xl text-accent"
    >
      +
    </button>

    <h5 class="full">{{ t("Headings.ZoomLevel") }} {{ zoomLevel }}</h5>

    <button
      @click="zoomOut"
      class="flex h-10 min-h-[2.5rem] w-10 min-w-[2.5rem] items-center justify-center rounded-xl bg-tertiary text-3xl text-accent"
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

    const cookie_zoomLevel = useAppCookie<number>("zoomLevel");

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

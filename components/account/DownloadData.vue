<template>
  <article class="card flex flex-col items-center justify-center bg-secondary style-card">
    <ArrowDownTrayIcon class="mb-4 h-10 w-10 max-w-xl text-accent" />

    <h2 class="text-heading-2">{{ t("Headings.DownloadMyData") }}</h2>

    <div class="mb-8 mt-2 flex items-center space-x-4">
      <DocumentTextIcon class="h-8 w-8 max-w-xl text-accent" />
      <p class="text-center">
        {{ t("Body.DownloadMyData") }}
      </p>
    </div>

    <InputBtn :loading="loading" @click="onclick">
      {{ t("Buttons.DownloadMyData") }}
    </InputBtn>
  </article>
</template>

<script lang="ts">
import { DocumentTextIcon } from "@heroicons/vue/24/outline";
import { ArrowDownTrayIcon } from "@heroicons/vue/24/solid";
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  components: {
    ArrowDownTrayIcon,
    DocumentTextIcon,
  },
  setup() {
    const { t } = useI18n();

    const loading = ref(false);

    /** Offer the export as a file instead of opening it in the browser. */
    function saveAsFile(data: any) {
      const date = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      );

      const link = document.createElement("a");
      link.href = url;
      link.download = `bootstrap-academy-${date}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    }

    async function onclick() {
      loading.value = true;
      const [data, error] = await exportUserData();
      loading.value = false;

      if (!!!data) {
        openSnackbar("error", error?.detail ?? "Error.DownloadMyDataFailed");
        return;
      }

      saveAsFile(data);

      // The file is saved either way, but the user has to know when a part of
      // it is missing because one of the services could not be read.
      if (data.complete === false) {
        openSnackbar("warning", "Error.DownloadMyDataIncomplete");
      } else {
        openSnackbar("success", "Success.DownloadMyData");
      }
    }

    return { t, loading, onclick };
  },
});
</script>

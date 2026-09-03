<template>
  <div class="card-sm grid bg-secondary gap-card-sm style-card xl:gap-box">
    <h2 class="text-heading-2">{{ t("Headings.EventTypes") }}</h2>

    <article
      v-for="type of types"
      :key="type.label"
      class="flex items-center gap-3 rounded px-4 py-3 shadow-lg"
      :class="type.bgLight"
    >
      <span class="block h-2 w-2 flex-shrink-0 rounded-xl md:h-3 md:w-3" :class="type.bg"></span>
      <h3 class="text-heading-5 capitalize" :class="type.text">
        {{ t(type.label) }}
      </h3>
    </article>

    <section class="grid gap-3 mt-box">
      <h2 class="text-heading-2">{{ t("Headings.CalendarSubscription") }}</h2>
      <p class="text-body-2">{{ t("Body.CalendarSubscription") }}</p>

      <div class="flex items-center gap-2">
        <input
          ref="urlInput"
          class="text-body-2 w-full min-w-0 rounded border border-tertiary bg-primary px-3 py-2"
          :value="ics"
          :aria-label="t('Headings.CalendarSubscription')"
          readonly
          @focus="selectUrl"
        />
        <Btn sm secondary :disabled="!ics" @click="copy">
          {{ copied ? t("Buttons.CalendarLinkCopied") : t("Buttons.CopyCalendarLink") }}
        </Btn>
      </div>

      <a :href="ics" download type="text/calendar">
        <Btn full>{{ t("Buttons.LinkCalendar") }}</Btn>
      </a>

      <Btn full secondary :disabled="!ics || rotating" @click="rotate">
        {{ t("Buttons.RotateCalendarLink") }}
      </Btn>
    </section>

    <h2 class="text-heading-2 mt-card">{{ t("Headings.FilterBy") }}</h2>

    <InputRadioGroup sm name="eventFilter" v-model="eventFilter" :options="eventFilterOptions" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  setup() {
    const { t } = useI18n();

    const ics = useICS();

    const urlInput = ref<HTMLInputElement | null>(null);
    const copied = ref(false);
    const rotating = ref(false);

    function selectUrl(event: FocusEvent) {
      (event.target as HTMLInputElement).select();
    }

    async function copy() {
      try {
        await navigator.clipboard.writeText(ics.value);
      } catch {
        // clipboard access can be denied; fall back to selecting the url so it
        // can be copied by hand
        urlInput.value?.select();
        return;
      }
      copied.value = true;
      setTimeout(() => (copied.value = false), 3000);
    }

    function rotate() {
      openDialog(
        "warning",
        "Headings.RotateCalendarLink",
        "Body.RotateCalendarLink",
        false,
        {
          label: "Buttons.RotateCalendarLink",
          onclick: async () => {
            rotating.value = true;
            const [response, error] = await rotateIcsToken();
            rotating.value = false;

            if (response) {
              copied.value = false;
              openSnackbar("success", "Success.RotateCalendarLink");
            } else {
              openSnackbar("error", error?.detail ?? "");
            }
          },
        },
        {
          label: "Buttons.Cancel",
          onclick: () => {},
        }
      );
    }

    const coaching = reactive({
      label: "Headings.Coaching",
      text: "text-info",
      bg: "bg-info",
      bgLight: "bg-info-light",
      border: "border-info",
    });

    const exam = reactive({
      label: "Headings.Exam",
      text: "text-error",
      bg: "bg-error",
      bgLight: "bg-error-light",
      border: "border-error",
    });

    const webinar = reactive({
      label: "Headings.Webinar",
      text: "text-warning",
      bg: "bg-warning",
      bgLight: "bg-warning-light",
      border: "border-warning",
    });

    const types = computed(() => {
      return [webinar, coaching];
    });

    const eventFilter = useEventFilter();

    const eventFilterOptions = reactive([
      {
        label: "List.Filter.All",
        value: "all",
      },
      {
        label: "List.Filter.Booked",
        value: "booked",
        tooltip: "Body.BookedEventsFilterToolTip",
      },
      {
        label: "List.Filter.Mine",
        value: "mine",
        tooltip: "Body.MyEventsFilterToolTip",
      },
    ]);
    return {
      t,
      types,
      eventFilter,
      eventFilterOptions,
      ics,
      urlInput,
      copied,
      rotating,
      selectUrl,
      copy,
      rotate,
    };
  },
});
</script>

<style scoped></style>

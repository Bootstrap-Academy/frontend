<!--
✅ Responsive UI
✅ Page Title
✅ Translation
❌ Animation
✅ middleware

✅ Tested on chrome
✅ Tested on firefox
✅ Tested on safari
✅ Tested on android mobile
✅ Tested on apple mobile

✅ Handle loading if data already exists
✅ Handle loading if data is empty
✅ Display data
✅ Handle empty state

✅ Api implemented
-->

<template>
  <main
    class="mt-main mb-main grid-cols-1fr container-fluid relative z-[1] grid gap-container xl:grid-cols-[1fr_300px]"
  >
    <Calendar
      class="xl:sticky xl:self-start xl:top-container"
      :events="events"
      @selected="setSelected($event)"
    />
    <CalendarAside
      class="xl:sticky xl:self-start xl:top-container"
      :events="events"
      :selected="selected"
    />
  </main>
</template>

<script>
import Calendar from "~~/components/calendar/index.vue";

definePageMeta({
  middleware: ["auth"],
});

export default {
  head: {
    title: "Calendar",
  },
  components: { Calendar },
  setup() {
    const loading = ref(true);
    const events = useEvents();

    const selected = reactive({
      date: null,
      month: null,
      year: null,
    });

    onMounted(async () => {
      await getCalendar();
      loading.value = false;
    });

    function setSelected(sel) {
      Object.assign(selected, { ...sel });
    }
    return { loading, events, setSelected, selected };
  },
};
</script>

<style scoped>
.d {
  background-color: red;
}
</style>

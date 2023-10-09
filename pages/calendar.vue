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
    class="relative container-fluid mt-main mb-main grid grid-cols-1fr xl:grid-cols-[1fr_300px] gap-container z-[1]"
  >
    <Calendar
      class="xl:sticky xl:top-container xl:self-start"
      :events="events"
      @selected="setSelected($event)"
    />
    <CalendarAside
      class="xl:sticky xl:top-container xl:self-start"
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

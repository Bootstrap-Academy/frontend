<template>
  <div>
    <header class="flex gap-card justify-between items-center mb-card">
      <Btn sm secondary :icon="ArrowLeftIcon" @click="prevMonth">
        <span class="hidden md:block">{{
          t("Buttons.CalendarPrevMonth")
        }}</span>
      </Btn>

      <h1 class="text-heading-3">
        {{ activeDate }} {{ t(month) }}, {{ activeYear }}
      </h1>

      <Btn sm :icon="ArrowRightIcon" @click="nextMonth" icon-right>
        <span class="hidden md:block">{{
          t("Buttons.CalendarNextMonth")
        }}</span>
      </Btn>
    </header>

    <section class="grid grid-cols-7">
      <h2
        v-for="day of days"
        :key="day"
        class="place-self-center capitalize mb-5 text-heading-4"
      >
        <span class="hidden lg:block">{{ t(day) }}</span>
        <span class="hidden md:block lg:hidden">
          {{ t(day)[0] }}{{ t(day)[1] }}{{ t(day)[2] }}
        </span>
        <span class="block md:hidden">{{ t(day)[0] }}{{ t(day)[1] }}</span>
      </h2>

      <article
        class="pt-1 pb-1 px-1 md:pt-2 md:pb-4 md:px-3 h-12 md:h-20 lg:h-40 border flex flex-wrap gap-x-1 md:gap-2 overflow-hidden"
        v-for="(date, i) of dates"
        :key="i"
        @click="setActiveDate(date.date)"
        :class="[
          date.date == '' ? 'pointer-events-none' : 'cursor-pointer',
          activeDate == date.date
            ? 'border border-accent'
            : 'border border-secondary',
        ]"
      >
        <p
          class="capitalize text-heading font-heading text-xs md:text-sm lg:text-base w-full"
        >
          {{ date.date }}
        </p>

        <template v-for="(event, i) of events" :key="i">
          <CalendarEventDots v-if="isEvent(event, date)" :data="event" />
        </template>
      </article>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { Ref } from "vue";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/vue/24/solid";
import { useI18n } from "vue-i18n";

export default defineComponent({
  props: {
    events: { default: [] },
  },
  components: { ArrowLeftIcon, ArrowRightIcon },
  emits: ["selected"],
  setup(props, { emit }) {
    const { t } = useI18n();

    let days = [
      "Days.Sunday",
      "Days.Monday",
      "Days.Tuesday",
      "Days.Wednesday",
      "Days.Thursday",
      "Days.Friday",
      "Days.Saturday",
    ];

    let months = [
      "Months.January",
      "Months.February",
      "Months.March",
      "Months.April",
      "Months.May",
      "Months.June",
      "Months.July",
      "Months.August",
      "Months.September",
      "Months.October",
      "Months.November",
      "Months.December",
    ];
    const activeDate = ref(new Date().getDate());
    const activeMonth = ref(new Date().getMonth());
    const activeYear = ref(new Date().getFullYear());

    const month = computed(() => {
      return months[activeMonth.value];
    });

    function prevMonth() {
      if (activeMonth.value > 0) {
        activeMonth.value--;
      } else {
        activeYear.value--;
        activeMonth.value = 11;
      }

      const datesForThisMonth = dates.value.filter((date) => !!date.date);

      if (activeDate.value > datesForThisMonth.length) {
        activeDate.value = datesForThisMonth.length;
      }
    }

    function nextMonth() {
      if (activeMonth.value < 11) {
        activeMonth.value++;
      } else {
        activeYear.value++;
        activeMonth.value = 0;
      }

      const datesForThisMonth = dates.value.filter((date) => !!date.date);

      if (activeDate.value > datesForThisMonth.length) {
        activeDate.value = datesForThisMonth.length;
      }
    }

    function setActiveDate(date: any) {
      if (date == "") {
        activeYear.value--;
        activeMonth.value = 11;
        activeDate.value = 1;
      } else {
        activeDate.value = date;
      }

      emit("selected", {
        date: activeDate.value,
        month: activeMonth.value,
        year: activeYear.value,
      });
    }

    const route = useRoute();
    onMounted(() => {
      let startQuery = <string>(route?.query?.start ?? "0");
      let start = parseInt(startQuery);
      if (start > 0 && typeof start == "number") {
        const { date, month, year } = convertTimestampToDate(start);
        activeDate.value = date;
        activeMonth.value = month.number;
        activeYear.value = year;
      }

      emit("selected", {
        date: activeDate.value,
        month: activeMonth.value,
        year: activeYear.value,
      });
    });

    const dates = computed(() => {
      let arr = [];

      const start = 1;
      const end = new Date(
        activeYear.value,
        activeMonth.value + 1,
        0
      ).getDate();

      for (let i = start; i <= end; i++) {
        let date = new Date(activeYear.value, activeMonth.value, i);

        if (i == start) {
          let dayNumber = date.getDay();
          for (let i = dayNumber; i > 0; i--) {
            arr.push({
              year: "",
              month: "",
              day: "",
              date: "",
            });
          }
        }

        arr.push({
          year: date.getFullYear(),
          month: date.getMonth(),
          day: days[date.getDay()],
          date: date.getDate(),
        });
      }
      return arr;
    });

    const eventFilter = useEventFilter();
    const user: Ref<any> = useUser();

    const events = computed(() => {
      return props.events
        .map((event: any) => {
          let start = event?.start ?? -1;
          let date = start != 1 ? convertTimestampToDate(start).date : "";
          let month =
            start != 1 ? convertTimestampToDate(start).month.number : 0;
          let year = start != 1 ? convertTimestampToDate(start).year : "";
          return { ...event, date, month, year };
        })
        .filter((event) => {
          if (eventFilter.value == "booked") {
            return event.booked == true;
          } else if (eventFilter.value == "mine") {
            return (event?.instructor?.id ?? "-") == (user.value?.id ?? "");
          } else {
            return true;
          }
        });
    });

    function isEvent(event: any, date: any) {
      if (!!!event) return false;
      return (
        event.date == date.date &&
        event.month == date.month &&
        event.year == date.year
      );
    }

    return {
      events,
      isEvent,
      prevMonth,
      activeMonth,
      nextMonth,
      month,
      activeYear,
      dates,
      days,
      setActiveDate,
      activeDate,
      ArrowLeftIcon,
      ArrowRightIcon,
      t,
    };
  },
});
</script>

<style scoped>
.max-screen {
  --bar-language-height: 40px;
  --bar-navigation-height: 100px;
  --total: calc(var(--bar-language-height) + var(--bar-navigation-height));
  /* min-height: calc(100vh - var(--total)); */
  max-height: calc(100vh - var(--total));
}
</style>

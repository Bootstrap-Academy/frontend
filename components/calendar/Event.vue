<template>
	<article
		class="p-4 style-card lg:style-box bg-secondary border-l-4"
		:class="[theme.border]"
	>
		<header
			class="flex justify-between gap-x-card gap-y-2 flex-wrap-reverse mb-4"
		>
			<div v-if="data.type == 'coaching'" class="flex gap-box">
				<img
					:src="data.instructor.avatar_url ?? '/images/about-2.webp'"
					class="w-6 h-6 object-cover rounded-[50px]"
          :alt="t('AltAttributes.EventInstructorAvatar')"
				/>

				<h3 class="capitalize text-heading-4">
					{{ data.instructor.display_name ?? data.instructor.name ?? type }}
				</h3>
			</div>

			<h3 v-else class="capitalize text-heading-4">{{ title }}</h3>
			<button
				@click="onclickCard"
				v-if="data.link"
				:class="[theme.text, theme.bgLight]"
				class="py-1 px-2 rounded text-body-2 w-fit flex-shrink-0 h-fit"
			>
				{{ t("Links.Link") }}
			</button>
		</header>

		<IconText
			v-for="(stat, i) of stats"
			:key="i"
			:icon="stat.icon"
			class="w-full my-2.5"
			:highlightIcon="false"
			sm
			:iconColor="theme.text"
			:fill="theme.fill"
		>
			{{ stat.value }}
		</IconText>

		<CalendarEventBooking
			:key="id"
			:isMine="isMine"
			:booked="data.booked"
			:bookable="data.bookable"
			:id="id"
			:type="type"
			:theme="theme"
			:subSkillID="skillID"
			:start="data.start"
			:stats="stats"
			:description="description"
			:event="data"
		/>
	</article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { useI18n } from "vue-i18n";
import { ClockIcon, CalendarIcon } from "@heroicons/vue/24/outline";
import IconMorphcoin from "~/components/icon/Morphcoin.vue";
import IconSkill from "~/components/icon/Skill.vue";
import { useUser } from "~/composables/user";
import { WebinarEvent, CoachingEvent } from "~/types/calenderTypes";
export default defineComponent({
  components: { ClockIcon, CalendarIcon, IconMorphcoin, IconSkill },
  props: {
    data: {
      type: Object as PropType<WebinarEvent | CoachingEvent>,
      default: new WebinarEvent(),
    },
    noBooking: { type: Boolean, default: false },
  },
  setup(props) {
			

    const { t } = useI18n();
    const user = useUser();

    const id = computed(() => {
      return props.data.id ?? "";
    });

    const type = computed(() => {
      return props.data.type ?? "";
    });

    const theme = computed(() => {
      switch (type.value) {
      case "coaching":
        return {
          bg: "bg-info",
          bgLight: "bg-info-light",
          fill: "fill-info",
          stroke: "stroke-info",
          border: "border-info",
          text: "text-info",
        };
      default:
        return {
          bg: "bg-warning",
          bgLight: "bg-warning-light",
          fill: "fill-warning",
          stroke: "stroke-warning",
          border: "border-warning",
          text: "text-warning",
        };
      }
    });

    const title = computed(() => {
      return props.data.title ?? "";
    });

    const instructor = computed(() => {

      return props.data.instructor;
    });

    const admin_link = computed(() => {
      return props.data.admin_link ?? "";
    });

    const isMine = computed(() => {
      return user.value.id === props.data.instructor.id;
    });

    const skillID = computed(() => {
      return props.data.skill_id ?? "";
    });

    const skillName = computed(() => {
      return skillID.value.replace(/_/g, " ");
    });

    const start = computed(() => {
      return getTimeAndDate(props.data.start);
    });

    const end = computed(() => {
      const endTime = props.data.start + props.data.duration * 60;

      return getTimeAndDate(endTime);
    });

    function getTimeAndDate(timestamp: number) {
      if (timestamp == -1) {
        return { time: ``, date: `` };
      }

      let { date, month, year } = convertTimestampToDate(timestamp);
      let time = new Date(timestamp * 1000).toTimeString();
      let [hr, min, sec] = time.split(":");

      return {
        time: `${hr}:${min}`,
        date: `${date} ${t(month.string).slice(0, 3)}, ${year}`,
      };
    }

    const price = computed(() => {
      return props.data.price ?? 0;
    });

    const description = computed(() => {
      return props.data.description ?? "";
    });

    const stats = computed(() => {
      return [
        // {
        // 	icon: CalendarIcon,
        // 	value:
        // 		start.value.date != end.value.date
        // 			? `${start.value.date} - ${end.value.date}`
        // 			: start.value.date,
        // 	heading: 'Headings.Date',
        // },
        {
          icon: CalendarIcon,
          value: start.value.date,
          heading: "Headings.Date",
        },
        {
          icon: ClockIcon,
          value: `${start.value.time} - ${end.value.time} (${props.data.duration} min)`,
          heading: "Headings.Time",
        },
        {
          icon: IconMorphcoin,
          value: t(
            "Headings.Morphcoins",
            { n: abbreviateNumber(price.value) },
            price.value
          ),
          heading: "Headings.Price",
        },
      ];
    });

    const link = computed(() => {
      return props.data.link ?? "";
    });

    function onclickCard() {
      if (!!window && !!admin_link.value) {
        window.open(admin_link.value, "_blank");
      } else if (!!window && !!link.value) {
        window.open(link.value, "_blank");
      }
    }

    return {
      t,
      id,
      type,
      theme,
      title,
      instructor,
      stats,
      link,
      onclickCard,
      admin_link,
      isMine,
      skillID,
      description,
    };
  },
});
</script>

<style scoped></style>

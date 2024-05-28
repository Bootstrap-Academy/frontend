<template>
  <section class="card style-card bg-secondary">
    <article class="mx-auto w-fit">
      <p class="text-subheading text-body-1 uppercase">
        {{ t("Headings.Price") }}
      </p>
      <div class="flex items-end gap-box">
        <h2 class="m-0 text-display-2 leading-none">
          {{ price > 0 ? abbreviateNumber(price) : t("Headings.Free") }}
        </h2>
        <p v-if="price > 0" class="m-0 text-body-1">
          {{ t("Headings.Morphcoins", { n: " " }, price) }}
        </p>
      </div>
    </article>

    <hr class="mt-4 mb-8" />

    <div class="grid gap-box">
      <IconText
        v-for="({ icon, value }, i) of stats"
        :key="i"
        :icon="icon"
        lg
        highlight-label
      >
        {{ value }}
      </IconText>

      <Chip v-if="completed" color="bg-success">
        {{ t("Headings.Completed") }}
      </Chip>
    </div>

    <hr class="my-8" />

    <div v-if="!isCourseAccessible">
      <InputCheckbox
        label="Links.IAgreeTo"
        id="TermsAndConditions"
        :link="{
          to: '/docs/terms-and-conditions',
          label: 'Links.TermsAndConditions',
        }"
        target="_blank"
        v-model="termsAndConditions"
      />

      <InputCheckbox
        label="Links.RightToWithdrawal"
        id="RightToWithdrawal"
        :link="{
          to: '/docs/right-of-withdrawal',
          label: 'Links.RightToWithdrawalLink',
        }"
        target="_blank"
        v-model="confirmRightToWithdrawal"
        class="mt-card-sm mb-card-sm"
      />
      <InputCheckbox
        label="Links.DontUseRightToWithdrawal"
        id="DontUseRightToWithdrawal"
        v-model="confirmDontUseRightToWithdrawal"
      />
    </div>

    <div class="flex justify-center items-center space-x-2 mb-4" v-if="totalUnfinishedLectures == 0">
      <CheckBadgeIcon class="w-8 h-8 text-success" />
      <p>
        {{t("Headings.CourseCompleted")}}
      </p>
    </div>

    <InputBtn
      :loading="loading"
      full
      @click="onclickEnroll"
      :class="{ 'pointer-events-none opacity-70': loading }"
    >
      {{
        isCourseAccessible ? t("Buttons.WatchCourse") : t("Buttons.EnrollNow")
      }}
    </InputBtn>
  </section>
</template>

<script lang="ts" setup>
import {
  ClockIcon,
  PlayIcon,
  KeyIcon,
  LanguageIcon,
  Square3Stack3DIcon,
} from "@heroicons/vue/24/outline";
import { CheckBadgeIcon } from "@heroicons/vue/24/solid";
import { useI18n } from "vue-i18n";
  
const props= defineProps({
  isCourseAccessible: { type: Boolean, default: false },
  data: { type: Object as PropType<any>, default: null },
  skillID: { type: String, default: null },
  subSkillID: { type: String, default: null },
})
const { t } = useI18n();
const route = useRoute();

const link = computed(() => {
  let courseID = props.data?.id ?? "HTML";
  return `/courses/${courseID}/watch?skillID=${props?.skillID}&subSkillID=${props?.subSkillID}`;
});

const loading = ref(false);
const snackbar = useSnackbar();
const router = useRouter();

const termsAndConditions = ref(false);
const confirmRightToWithdrawal = ref(false);
const confirmDontUseRightToWithdrawal = ref(false);

async function onclickEnroll() {
  if (props.isCourseAccessible == false) {
    if (
      !termsAndConditions.value ||
          !confirmRightToWithdrawal.value ||
          !confirmDontUseRightToWithdrawal.value
    ) {
      snackbar.value = {
        show: true,
        type: "error",
        heading: "Error.MustAgreeToBothPointsInOrderToMoveForward",
        body: "",
      };
      return;
    }
  }

  if (!props.isCourseAccessible) {
    loading.value = true;

    const [success, error] = await enrollIntoCourse(props.data?.id ?? "");
    if (success) await getCourseByID(props.data?.id ?? "");
    loading.value = false;

    if (error) {
      snackbar.value = {
        show: true,
        type: "error",
        heading: error?.detail ?? "",
        body: "",
      };
      return;
    }

    router.push(`${link.value}`);
  } else {
    router.push(`${link.value}`);
  }
}

const price = computed(() => {
  return props.data?.price ?? 0;
});

const totalSections = computed(() => {
  let sections = props.data?.sections ?? 0;
  return typeof sections != "number" ? sections.length : sections;
});

const totalLectures = computed(() => {
  let lectures = props.data?.lectures ?? null;

  if (typeof lectures != "number") {
    let sections: any[] = props.data?.sections ?? [];

    let allLectures: any = [];

    sections.forEach((section) => {
      allLectures = [...allLectures, ...section.lectures];
    });

    const totalDuration = allLectures.reduce(
      (previousValue: number, currentValue: any) =>
        previousValue + currentValue.duration ?? 0,
      0
    );

    const { minutes, hours } = convertTimestampToDate(totalDuration);

    let roundedHours = Math.round(hours);
    let minutesLeftInHours = hours - roundedHours;
    minutesLeftInHours = Math.round(minutesLeftInHours * 60);

    let hoursString =
          roundedHours > 0
            ? t(
              "Headings.Hours",
              { n: roundedHours },
              roundedHours
            ).toLocaleLowerCase()
            : "";
    let minsString =
          minutesLeftInHours > 0
            ? t(
              "Headings.Mins",
              { n: minutesLeftInHours },
              minutesLeftInHours
            ).toLocaleLowerCase()
            : "";
    return {
      quantity: allLectures.length,
      duration: `${hoursString} ${
        !!hoursString && !!minsString
          ? t("Headings.And").toLocaleLowerCase()
          : ""
      } ${minsString}`,
    };
  } else {
    return {
      quantity: lectures,
      duration: 0,
    };
  }
});

const totalUnfinishedLectures = computed(() => {
  let lectures = props.data?.lectures ?? null;

  if (typeof lectures != "number") {
    let sections: any[] = props.data?.sections ?? [];

    let allLectures: any = [];

    sections.forEach((section) => {
      allLectures = [...allLectures, ...section.lectures];
    });

    const unfinishedLectures = allLectures.filter(
      (lecture: any) => !lecture.completed
    );

    return unfinishedLectures.length;
  } else {
    return 0;
  }
});

const completed = computed(() => {
  return props.data?.completed ?? false;
});

const stats = computed(() => {
  return [
    {
      icon: ClockIcon,
      value: totalLectures.value.duration,
    },
    {
      icon: Square3Stack3DIcon,
      value: t(
        "Headings.Sections",
        { n: totalSections.value },
        totalSections.value
      ).toLocaleLowerCase(),
    },
    {
      icon: PlayIcon,
      value: t(
        "Headings.Lectures",
        { n: totalLectures.value.quantity },
        totalLectures.value.quantity
      ).toLocaleLowerCase(),
    },
    {
      icon: KeyIcon,
      value: t("Headings.FullTimeAccess"),
    },
    {
      icon: LanguageIcon,
      value: (props.data?.language ?? "DE").toUpperCase(),
    },
  ];
});

  
</script>

<style scoped></style>

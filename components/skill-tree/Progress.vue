<template>
  <article class="progress-card rounded bg-primary">
    <!-- progress bar -->
    <div
      class="progress-bar h-1 w-full rounded items-center"
      :style="{ background: progressBar }"
    ></div>

    <!-- skill -->
    <article class="flex items-center flex-wrap py-3 px-4 bg-primary rounded gap-3 md:gap-5">
      <img
        :src="image"
        class="h-10 w-10 sm:h-12 sm:w-12 object-cover rounded order-1"
        :alt="t('AltAttributes.SkillCover')"
      />

      <div class="grow order-3 md:order-2 w-full md:w-min">
        <h6 class="text-body-1 break-words capitalize">
          {{ name }}
        </h6>
        <div
          class="mt-1 flex flex-nowrap text-nowrap gap-box w-full items-center text-body-2 text-subheading font-body"
        >
          <div>
            <span class="text-body">{{ completed }}/{{ total }}</span>
             {{t("Headings.Skills")}}
          </div>
          <div class="text-heading-2 leading-none text-accent">•</div>
          <div>
            XP
            <span class="text-body">{{ xp }}</span>
          </div>
          <div class="text-heading-2 leading-none text-accent">•</div>
          <div>
            Level
            <span class="text-body">{{ level.number }}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between md:justify-between-0 gap-x-3 md:gap-x-5 order-2 md:order-3 grow md:grow-0">
        <Chip xs :color="level.color">
          {{ t(level.text) }}
        </Chip>

        <div class="flex gap-2">
          <Icon
            @click="onclickViewSkillPath"
            class="cursor-pointer"
            rounded
            sm
            :icon="EyeIcon"
          />
          <Icon
            @click="onclickViewSkillProgressDetails"
            class="cursor-pointer"
            :class="show ? 'rotate-180' : 'rotate-0'"
            rounded
            sm
            :icon="ChevronDownIcon"
          />
        </div>
      </div>

      <!-- <SubMenu class="-mt-2 md:-mt-3 -mr-4" :list="list" /> -->
    </article>

    <!-- sub skill table -->
    <SkillTreeProgressSkillsTable
      v-if="show"
      :data="skills"
      :rootSkillId="id"
    />
  </article>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";

import { defineComponent } from "vue";
import type { PropType } from "vue";
import { EyeIcon, ChevronDownIcon } from "@heroicons/vue/24/outline";

export default defineComponent({
  components: {
    EyeIcon,
    ChevronDownIcon,
  },
  props: {
    data: { type: Object as PropType<any>, default: null },
    totalNodes: { type: Number, default: 50 },
    completedNodes: { type: Number, default: 25 },
  },
  setup(props) {
    const { t } = useI18n();

    const id = computed(() => {
      return props.data?.skill ?? "";
    });

    const name = computed(() => {
      return (props.data?.skill ?? "").replace(/_/g, " ");
    });

    const image = computed(() => {
      return props.data?.image ?? `/svgs/${id.value}.svg`;
    });

    const xp = computed(() => {
      return abbreviateNumber(props.data?.xp ?? 0);
    });

    const router = useRouter();

    const route = useRoute();

    const show = computed({
      get(): boolean {
        let rootSkillID = route?.query?.details ?? "";
        return rootSkillID == id.value;
      },
      set(rootSkillID: any) {
        if (!rootSkillID) {
          router.replace({
            path: route.path,
          });
        } else {
          router.replace({
            path: route.path,
            query: { details: rootSkillID },
          });
        }
      },
    });

    function onclickViewSkillPath() {
      router.push(`/skill-tree/${id.value}`);
    }
    function onclickViewSkillProgressDetails() {
      show.value = show.value ? "" : id.value;
    }

    const level = computed((): any => {
      const number = props.data?.level ?? 1;
      if (number > 0 && number <= 5) {
        return {
          text: "Headings.Novice",
          color: "chip-color-1",
          number: number,
        };
      } else if (number > 5 && number <= 10) {
        return {
          text: "Headings.Beginner",
          color: "chip-color-2",
          number: number,
        };
      } else if (number > 10 && number <= 15) {
        return {
          text: "Headings.Talented",
          color: "chip-color-3",
          number: number,
        };
      } else if (number > 15 && number <= 20) {
        return {
          text: "Headings.Skilled",
          color: "chip-color-4",
          number: number,
        };
      } else if (number > 20 && number <= 25) {
        return {
          text: "Headings.Intermediate",
          color: "chip-color-5",
          number: number,
        };
      } else if (number > 25 && number <= 30) {
        return {
          text: "Headings.Seasoned",
          color: "chip-color-6",
          number: number,
        };
      } else if (number > 30 && number <= 35) {
        return {
          text: "Headings.Experienced",
          color: "chip-color-7",
          number: number,
        };
      } else if (number > 35 && number <= 40) {
        return {
          text: "Headings.Senior",
          color: "chip-color-8",
          number: number,
        };
      } else if (number > 40 && number <= 45) {
        return {
          text: "Headings.Expert",
          color: "chip-color-9",
          number: number,
        };
      } else if (number > 45 && number <= 50) {
        return {
          text: "Headings.GodTier",
          color: "chip-color-10",
          number: number,
        };
      } else {
        return {
          text: "Headings.Newbie",
          color: "chip-color-11",
          number: number,
        };
      }
    });

    const skills = computed((): any[] => {
      return props.data?.skills ?? [];
    });

    const total = computed(() => {
      return skills.value.length ?? 0;
    });

    const completed = computed(() => {
      return skills.value.filter(
        (skill: any) => skill.level >= 50 || skill.completed == true
      ).length;
    });

    const progress = computed(() => {
      return (props?.data?.progress ?? 0) * 100;
    });

    const progressBar = computed(() => {
      return `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${progress.value}%, var(--color-tertiary) ${progress.value}%,  var(--color-tertiary) 100%)`;
    });

    return {
      image,
      name,
      total,
      completed,
      progressBar,
      level,
      t,
      onclickViewSkillPath,
      onclickViewSkillProgressDetails,
      xp,
      skills,
      show,
      EyeIcon,
      ChevronDownIcon,
      id,
    };
  },
});
</script>

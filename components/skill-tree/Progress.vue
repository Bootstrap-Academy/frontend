<template>
  <article class="progress-card rounded bg-primary">
    <!-- progress bar -->
    <div
      class="progress-bar h-1 w-full rounded items-center"
      :style="{ background: progressBar }"
    ></div>

    <!-- skill -->
    <article class="box py-3 px-4 grid bg-primary rounded gap-x-3 md:gap-x-5">
      <img
        :src="image"
        class="h-10 w-10 sm:h-12 sm:w-12 object-cover rounded"
        alt=""
      />

      <h6 class="text-body-1 sm:clamp sm:line-1 break-words capitalize">
        {{ name }}
        <div
          class="mt-1 flex flex-wrap gap-box w-full items-center text-body-2 text-subheading font-body"
        >
          <div>
            <span class="text-body">{{ completed }}/{{ total }}</span>
            skills
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
      </h6>

      <Chip xs class="place-self-start" :color="level.color">
        {{ t(level.text) }}
      </Chip>

      <div class="flex items-center gap-2 place-self-start">
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

import { defineComponent, PropType } from "vue";
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

<style scoped>
.box {
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas:
    "img chip submenu"
    "name name name";
}

.box > *:nth-child(1) {
  grid-area: img;
}
.box > *:nth-child(2) {
  grid-area: name;
  @apply mt-2 sm:mt-0;
}
.box > *:nth-child(3) {
  grid-area: chip;
  @apply mt-2 sm:mt-1;
}
.box > *:nth-child(4) {
  grid-area: submenu;
  @apply mt-2 sm:mt-0;
}

@media screen and (min-width: 525px) {
  .box {
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    grid-template-areas: "img name chip submenu";
  }
}
</style>

<template>
  <article class="card pt-0">
    <header>
      <hr class="mt-box mb-box" />
      <h3 class="text-heading-4">Sub Skill Information</h3>
      <p class="mt-4 w-fit rounded-sm px-2 py-1 text-sm text-warning bg-warning-light">
        {{ t("Body.GiveWebinarsMsg") }}
      </p>

      <p class="mb-8 mt-3 w-fit rounded-sm px-2 py-1 text-sm text-info bg-info-light">
        {{ t("Body.GiveCoachingMsg") }}
      </p>
    </header>

    <div class="hidden grid-cols-[1fr_auto_auto_auto] gap-y-card-sm gap-x-container md:grid">
      <h2 class="text-heading-5">Skill</h2>
      <h2 class="text-heading-5 text-center">Level</h2>
      <h2 class="text-heading-5 text-center">XP</h2>
      <h2 class="text-heading-5 text-center">Actions</h2>

      <template v-for="(skill, i) of skills" :key="skill.skill ?? i">
        <div class="flex flex-wrap items-center gap-box">
          <p class="text-body-2 break-words capitalize">
            {{ (skill.skill ?? "---").replace(/_/g, " ") }}
          </p>
          <Rating v-if="skill.rating != null" :rating="skill.rating" sm />
        </div>

        <Chip v-if="skill && skill.completed" color="chip-color-1" class="w-fit">
          {{ t("Headings.Completed") }}
        </Chip>
        <p class="text-body-2 text-center" v-else>{{ skill.level ?? 0 }}</p>

        <p class="text-body-2 text-center">
          {{ abbreviateNumber(skill.xp ?? 0) }}
        </p>

        <div class="flex items-center gap-2 place-self-start">
          <Icon
            @click="onclickViewThisSubSkillPath(skill.skill)"
            class="cursor-pointer"
            rounded
            sm
            :icon="EyeIcon"
          />
          <Icon
            v-if="skill.level >= 15"
            @click="onclickCreateWebinarForThisSubSkill(skill.skill)"
            class="cursor-pointer"
            bgColor="bg-warning-light"
            iconColor="text-warning"
            rounded
            sm
            :icon="UserGroupIcon"
          />
          <Icon
            v-if="skill.level >= 42"
            @click="onclickHoldCoachingForThisSubSkill(skill.skill)"
            class="cursor-pointer"
            bgColor="bg-info-light"
            iconColor="fill-info"
            rounded
            sm
            :icon="IconCoaching"
          />
        </div>
      </template>
    </div>

    <div class="grid grid-cols-[1fr_auto] gap-card-sm md:hidden">
      <template v-for="(skill, i) of data" :key="skill.skill ?? i">
        <h2 class="text-heading-5">Skill</h2>

        <div class="flex flex-wrap items-center gap-box">
          <p class="text-body-2 break-words text-right capitalize">
            {{ (skill.skill ?? "---").replace(/_/g, " ") }}
          </p>
          <Rating v-if="skill.rating != null" :rating="skill.rating" sm />
        </div>

        <h2 class="text-heading-5">Level</h2>
        <Chip v-if="skill && skill.completed" color="chip-color-1" class="w-fit place-self-end">
          {{ t("Headings.Completed") }}
        </Chip>
        <p class="text-body-2 text-right" v-else>{{ skill.level ?? 0 }}</p>

        <h2 class="text-heading-5">XP</h2>
        <p class="text-body-2 text-right">
          {{ abbreviateNumber(skill.xp ?? 0) }}
        </p>

        <h2 class="text-heading-5">Actions</h2>
        <div class="flex items-center gap-2 place-self-end">
          <Icon
            @click="onclickViewThisSubSkillPath(skill.skill)"
            class="cursor-pointer"
            rounded
            sm
            :icon="EyeIcon"
          />
          <Icon
            v-if="skill.level >= 15"
            @click="onclickCreateWebinarForThisSubSkill(skill.skill)"
            class="cursor-pointer"
            bgColor="bg-warning-light"
            iconColor="text-warning"
            rounded
            sm
            :icon="UserGroupIcon"
          />
          <Icon
            v-if="skill.level >= 42"
            @click="onclickHoldCoachingForThisSubSkill(skill.skill)"
            class="cursor-pointer"
            bgColor="bg-info-light"
            iconColor="fill-info"
            rounded
            sm
            :icon="IconCoaching"
          />
        </div>

        <hr class="col-span-2" />
      </template>
    </div>
  </article>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";

import { defineComponent } from "vue";
import type { PropType } from "vue";
import { EyeIcon, UserGroupIcon } from "@heroicons/vue/24/outline";
import IconCoaching from "~/components/icon/Coaching.vue";

export default defineComponent({
  components: { EyeIcon, IconCoaching, UserGroupIcon },
  props: {
    data: { type: Array as PropType<any[]>, default: [] },
    rootSkillId: { type: String, default: "" },
  },
  setup(props) {
    const { t } = useI18n();

    const router = useRouter();

    function onclickViewThisSubSkillPath(subSkillID: string) {
      router.push(`/skill-tree/${props.rootSkillId}/${subSkillID}`);
    }
    function onclickCreateWebinarForThisSubSkill(subSkillID: string) {
      router.push(`/webinars/create/${subSkillID}`);
    }
    function onclickHoldCoachingForThisSubSkill(subSkillID: string) {}

    const rating = ref(-1);

    const skills: any[] = reactive(props.data ?? []);

    onMounted(async () => {
      let arr = await Promise.all(
        props.data.map(async (skill: any) => {
          if (skill.level < 15) return { ...skill };

          const [rating, error] = await getRating(skill.skill);
          return {
            ...skill,
            rating: rating,
          };
        })
      );

      Object.assign(skills, arr);
    });
    return {
      t,
      onclickViewThisSubSkillPath,
      onclickCreateWebinarForThisSubSkill,
      onclickHoldCoachingForThisSubSkill,
      EyeIcon,
      IconCoaching,
      UserGroupIcon,
      rating,
      skills,
    };
  },
});
</script>

<style scoped></style>

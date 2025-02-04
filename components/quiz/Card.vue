<template>
  <article
    @click="solveThis(data?.id ?? '')"
    class="relative box style-box bg-secondary w-full cursor-pointer max-h-fit"
  >
    <CheckIcon
      v-if="data?.solved"
      class="bg-accent rounded-full p-0.5 h-6 w-6 text-white absolute -right-1 -top-1.5"
    />
    <PencilSquareIcon
      v-else-if="user?.id == data?.creator && user.admin"
      class="bg-light rounded-full h-8 w-8 p-1 text-accent absolute -right-1 -top-1.5"
    />
    <EyeIcon
      v-else-if="user?.id == data?.creator && !user.admin"
      class="bg-accent rounded-full p-0.5 h-6 w-6 text-white absolute -right-1 -top-1.5"
    />
    <h3 class="text-heading-4">
      Q). <span v-html="$md.render(data?.question ?? '')"></span>
    </h3>

    <div class="flex justify-between gap-box items-center">
      <p class="text-body-2" v-if="data?.single_choice">
        {{ t("Headings.SingleChoice") }}
      </p>
      <p class="text-body-2" v-else>{{ t("Headings.MultiChoice") }}</p>
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { useI18n } from "vue-i18n";
import {
  CheckIcon,
  EyeIcon,
  PencilSquareIcon,
} from "@heroicons/vue/24/outline";
import { LockClosedIcon } from "@heroicons/vue/24/outline";
export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  setup(props) {
    const { t } = useI18n();
    const route = useRoute();
    const router = useRouter();
    const user: any = useUser();

    const rootSkillID = computed(() => {
      return <string>(route?.params?.id ?? "");
    });

    const subSkillID = computed(() => {
      return <string>(route?.params?.skill ?? "");
    });

    function solveThis(id: any) {
      gotoPage();
    }

    function gotoPage() {
      const { fullPath, params, query } = route;
      const { id, task_id } = props.data ?? {};

      if (!id || !task_id) return;

      const _skillID = query.skillID ?? rootSkillID.value ?? null;
      const _subSkillID = query.subSkillID ?? subSkillID.value ?? null;

      let isSkill = fullPath.includes("/skill-tree/");
      let isCourse = fullPath.includes("/courses/");
      let isWatch = fullPath.includes("/watch?");

      let solveId = isSkill ? params.skill : isCourse ? params.id : isWatch ? params.id : null;
      let quizzesFrom = isSkill
        ? "skill"
        : isCourse
          ? "course"
          : isWatch
            ? "quiz"
            : null;

      if (!quizzesFrom || !solveId) return;

      router.push(
        `/quizzes/solve-${solveId}?quizzesFrom=${quizzesFrom}&querySubTaskId=${id}&taskId=${task_id}&rootSkillID=${_skillID}&subSkillID=${_subSkillID}`
      );
    }
    return { t, solveThis, user };
  },
  components: { CheckIcon, LockClosedIcon, PencilSquareIcon, EyeIcon },
});
</script>

<style scoped></style>

<!-- <script setup lang="ts">

const props = defineProps({
  subtask: { type: Object, default: null },
});

</script> -->

<template>
  <article
    @click="solveThis(data?.id ?? '')"
    class="box relative max-h-fit w-full cursor-pointer bg-secondary style-box"
  >
    <div>
      <article
        class="mb-4 flex cursor-pointer justify-between gap-4 rounded-md bg-secondary px-3 py-5"
      >
        <p class="clamp line-1 tight sm:pr-3 md:w-4/5 md:pr-5 lg:w-2/3">
          {{ t("Headings.Matching") }} {{ data?.left?.length ?? "" }} x
          {{ data?.left?.length ?? "" }}
          <span class="clamp inline">
            {{ data?.left[0] }}
          </span>
        </p>
      </article>
    </div>
    <CheckIcon
      v-if="data?.solved"
      class="absolute -right-1 -top-1.5 h-6 w-6 rounded-full bg-accent p-0.5 text-white"
    />
    <PencilSquareIcon
      v-else-if="user?.id == data?.creator && user.admin"
      class="absolute -right-1 -top-1.5 h-8 w-8 rounded-full bg-light p-1 text-accent"
    />
    <EyeIcon
      v-else-if="user?.id == data?.creator && !user.admin"
      class="absolute -right-1 -top-1.5 h-6 w-6 rounded-full bg-accent p-0.5 text-white"
    />
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { useI18n } from "vue-i18n";
import { CheckIcon, EyeIcon, PencilSquareIcon } from "@heroicons/vue/24/outline";
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
      let quizzesFrom = isSkill ? "skill" : isCourse ? "course" : isWatch ? "quiz" : null;

      if (!quizzesFrom || !solveId) return;

      router.push(
        `/matchings/solve-${solveId}?quizzesFrom=${quizzesFrom}&querySubTaskId=${id}&taskId=${task_id}&rootSkillID=${_skillID}&subSkillID=${_subSkillID}`
      );
    }

    return { t, solveThis, user };
  },
  components: { CheckIcon, LockClosedIcon, PencilSquareIcon, EyeIcon },
});
</script>

<style scoped></style>

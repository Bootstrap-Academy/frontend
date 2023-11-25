<!-- <script setup lang="ts">

const props = defineProps({
  subtask: { type: Object, default: null },
});

</script> -->

<template>
  <article
    @click="solveThis(data?.id ?? '')"
    class="relative box style-box bg-secondary w-full cursor-pointer max-h-fit"
  >
    <div>
      <article
        class="flex justify-between gap-4 bg-secondary mb-4 rounded-md cursor-pointer py-5 px-3"
      >
        <p class="clamp line-1 tight sm:pr-3 md:pr-5 md:w-4/5 lg:w-2/3">
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
      class="bg-accent rounded-full p-0.5 h-6 w-6 text-white absolute -right-1 -top-1.5"
    />
    <!-- <PencilSquareIcon
      v-else-if="user?.id == data?.creator && user.admin"
      class="bg-light rounded-full h-8 w-8 p-1 text-accent absolute -right-1 -top-1.5"
    />
    <EyeIcon
      v-else-if="user?.id == data?.creator && !user.admin"
      class="bg-accent rounded-full p-0.5 h-6 w-6 text-white absolute -right-1 -top-1.5"
    /> -->
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
      if (route.fullPath.includes("/skill-tree/")) {
        const id = route.params.skill;
        router.push(
          `/matchings/solve-${id}?quizzesFrom=${"skill"}&querySubTaskId=${
            props.data?.id
          }&taskId=${props.data?.task_id}&rootSkillID=${
            rootSkillID.value
          }&subSkillID=${subSkillID.value}`
        );
      } else if (route.fullPath.includes("/watch?")) {
        router.push(
          `/matchings/solve-${
            props.data?.task_id
          }?quizzesFrom=${"quiz"}&querySubTaskId=${props.data?.id}&taskId=${
            props.data?.task_id
          }`
        );
      } else if (route.fullPath.includes("/courses/")) {
        const id = route.params.id;
        let skillId = route.query?.skillID ?? "";
        let subSkillID = route.query?.subSkillID ?? "";
        router.push(
          `/matchings/solve-${id}?quizzesFrom=${"course"}&querySubTaskId=${
            props.data?.id
          }&taskId=${
            props.data?.task_id
          }&skillID=${skillId}&subSkillID=${subSkillID}`
        );
      }
    }
    return { t, solveThis, user };
  },
  components: { CheckIcon, LockClosedIcon, PencilSquareIcon, EyeIcon },
});
</script>

<style scoped></style>

<template>
  <!-- <article class="box style-box bg-secondary flex gap-box w-full">
import { CheckIcon } from "@heroicons/vue/24/solid";
		<img :src="`/svgs/{{img}}.svg`" alt="" class="w-12 h-12 object-contain" />
, LockClosedIcon
		<div>
			<h3 class="text-heading-4">{{ data.question }}</h3>
			<p class="my-1 mb-2">{{ data.type }}</p>
			<p v-if="data && data.price > 0">
        {{
					t(
						'Headings.Morphcoins',
						{ n: abbreviateNumber(data.price) },
						data.price
					)
				}}
			</p>
			<Chip v-else sm color="chip-color-6" class="w-fit">
				{{ t('Headings.Free') }}
			</Chip>
		</div>
	</article> -->

  <!-- <article class="box style-box bg-secondary w-full">
		<h3 class="text-heading-4">Q). {{ data.question }}</h3>
		<div class="flex justify-between gap-box items-center">
			<p class="text-body-2">{{ data.type }}</p>

			<p
				class="text-body-2 py-0.5 px-2.5 bg-error-light border border-dashed border-error text-heading style-box"
				v-if="data && data.price > 0"
			>
				{{ data.price }} MC
			</p>
			<Chip
				v-if="data && data.price <= 0"
				xs
				color="chip-color-6"
				class="w-fit"
			>
				{{ t('Headings.Free') }}
			</Chip>
		</div>
	</article> -->

  <article
    @click="solveThis(data?.id ?? '')"
    class="relative box style-box bg-secondary w-full cursor-pointer max-h-fit"
  >
    <CheckIcon
      v-if="data?.solved"
      class="bg-accent rounded-full p-0.5 h-5 w-5 text-white absolute -right-1 -top-1.5"
    />
    <PencilSquareIcon
      v-else-if="user?.id == data?.creator && user.admin"
      class="bg-light rounded-full p-0.5 h-6 w-6 text-accent absolute -right-1 -top-1.5"
    />
    <EyeIcon
      v-else-if="user?.id == data?.creator && !user.admin"
      class="bg-accent rounded-full p-0.5 h-5 w-5 text-white absolute -right-1 -top-1.5"
    />
    <h3 class="text-heading-4 clamp line-2">Q). {{ data?.question ?? "" }}</h3>

    <div class="flex justify-between gap-box items-center">
      <p class="text-body-2" v-if="data?.single_choice">
        {{ t("Headings.SingleChoice") }}
      </p>
      <p class="text-body-2" v-else>{{ t("Headings.MultiChoice") }}</p>
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
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
          `/quizzes/solve-${id}?quizzesFrom=${"skill"}&querySubTaskId=${
            props.data?.id
          }&taskId=${props.data?.task_id}&rootSkillID=${
            rootSkillID.value
          }&subSkillID=${subSkillID.value}`
        );
      } else if (route.fullPath.includes("/watch?")) {
        router.push(
          `/quizzes/solve-${
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
          `/quizzes/solve-${id}?quizzesFrom=${"course"}&querySubTaskId=${
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

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
    v-if="showQuiz"
    @click="solveThis(data?.id ?? '')"
    class="relative box style-box bg-secondary w-full cursor-pointer max-h-fit"
  >
    <CheckIcon
      v-if="data?.solved"
      class="bg-accent rounded-full p-0.5 h-5 w-5 text-white absolute -right-1 -top-1.5"
    />
    <h3 class="text-heading-4 clamp line-2">Q). {{ data?.question ?? "" }}</h3>

    <div class="flex justify-between gap-box items-center">
      <p class="text-body-2" v-if="data?.single_choice">
        {{ t("Headings.SingleChoice") }}
      </p>
      <p class="text-body-2" v-else>{{ t("Headings.MultiChoice") }}</p>

      <Chip v-if="data && data.fee <= 0" xs color="chip-color-6" class="w-fit">
        {{ t("Headings.Free") }}
      </Chip>
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { useI18n } from "vue-i18n";
import { CheckIcon } from "@heroicons/vue/24/outline";
import { LockClosedIcon } from "@heroicons/vue/24/outline";
export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  setup(props) {
    const { t } = useI18n();
    const route = useRoute();
    const router = useRouter();
    const showfreeQuizzesOnly = useCookie("showFreeQuizzesOnly");
    const showQuiz = computed(() => {
      if (showfreeQuizzesOnly.value) {
        if (props.data.unlocked) {
          return true;
        } else {
          return false;
        }
      } else {
        return true;
      }
    });

    function solveThis(id: any) {
      const premiumInfo: any = usePremiumInfo();
      if (premiumInfo.value.premium) {
        openSnackbar("info", "Body.BuyQuiz");
      }
      gotoPage();
    }

    function gotoPage() {
      if (route.fullPath.includes("/skill-tree/")) {
        const id = route.params.skill;
        router.push(
          `/quizzes/solve-${id}?quizzesFrom=${"skill"}&querySubTaskId=${
            props.data?.id
          }&taskId=${props.data?.task_id}`
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
        router.push(
          `/quizzes/solve-${id}?quizzesFrom=${"course"}&querySubTaskId=${
            props.data?.id
          }&taskId=${props.data?.task_id}`
        );
      }
    }
    return { t, solveThis, showfreeQuizzesOnly, showQuiz };
  },
  components: { CheckIcon, LockClosedIcon },
});
</script>

<style scoped></style>

<template>
  <div>
    <p>{{ t("Headings.Examples") }}:</p>
    <section class="relative" v-for="(example, i) of examples" :key="i">
      <span class="absolute top-0.5 left-1.5 text-white">#{{ i + 1 }}</span>
      <div class="bg-light my-3 card rounded-md">
        <article class="flex flex-wrap justify-between gap-x-4 mt-3 p-3">
          <p class="text-sm">
            {{ t("Headings.Input") }}:{{ example?.input ?? "" }}
          </p>
          <p class="text-sm">
            {{ t("Headings.Output") }}:{{ example?.output ?? "" }}
          </p>
        </article>
        <p class="my-5 text-sm">{{ example?.explanation ?? "" }}</p>

        <InputBtn
          secondary
          @click="TestAgainstMe(example?.id)"
          sm
          class="absolute bottom-1.5 right-1.5 text-white"
          >{{ t("Buttons.ExamplesTestMe") }}</InputBtn
        >
      </div>
    </section>
  </div>
  <!-- <article>
    <h4 class="text-heading-3 mb-3">{{ t("Headings.Examples") }}</h4>

    <article
      v-for="(example, i) of examples"
      :key="`example-${i}`"
      class="border-2 rounded border-primary mt-4 bg-primary cursor-pointer"
    >
      <h5 class="text-heading-4 box" @click="toggleShowExample(i)">
        [#{{ i + 1 }}] {{ example.heading ? example.heading : "Example" }}
      </h5>
      <div v-if="activeExample == i" class="box">
        <h6 class="text-heading-5">{{ t("Headings.Input") }}</h6>
        <div v-html="$md.render(example.input)" class="markdown"></div>

        <hr class="mt-box mb-box" />

        <h6 class="text-heading-5">
          {{ t("Headings.ExpectedOutput") }}
        </h6>
        <div v-html="$md.render(example.output)" class="markdown"></div>

        <hr v-if="example && example.explanation" class="mt-box mb-box" />

        <h6 v-if="example && example.explanation" class="text-heading-5">
          {{ t("Headings.Explanation") }}
        </h6>
        <div
          v-if="example && example.explanation"
          v-html="$md.render(example.explanation)"
          class="markdown"
        ></div>
      </div>
    </article>
  </article> -->
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import { defineComponent, PropType } from "vue";
import { CodeBracketIcon } from "@heroicons/vue/24/outline";
export default defineComponent({
  components: { CodeBracketIcon },
  props: {
    examples: { type: Array as PropType<any>, default: [] },
    code: { type: String, default: "" },
    environment: { type: String, default: "" },
    challengeId: { type: String, default: "" },
    codingChallengeId: { type: String, default: "" },
  },
  setup(props) {
    const { t } = useI18n();
    const loading = ref(false);
    async function TestAgainstMe(id: any) {
      console.log("example id", id);
      if (id == undefined || !!!id)
        return openSnackbar("info", "Headings.CannotTestForThisExample");
      setLoading(true);
      const [success, error] = await textAgainstCodingExample(
        props.challengeId,
        props.codingChallengeId,
        id,
        {
          code: props.code,
          environment: props.environment,
        }
      );
      setLoading(false);
      success ? successHandler(success) : errorHandler(error);
    }
    function successHandler(success: any) {
      if (success?.verdict == "OK") {
        const showConfetti = useShowConfetti();
        showConfetti.value = true;
        // openSnackbar("success", "Success.SolvedCodingChallenge");
      } else {
        openSnackbar("Info", "Success.SolvedCodingChallengeButNotCorrect");
      }
    }
    function errorHandler(error: any) {
      openSnackbar("error", error);
    }
    return { t, TestAgainstMe };
  },
});
// import { defineComponent } from "vue";
// import { useI18n } from "vue-i18n";
// import { PropType } from "vue";

// export default defineComponent({
//   props: {
//     data: { type: Object as PropType<any>, default: null },
//   },
//   setup(props) {
//     const { t } = useI18n();

// const examples = computed(() => {
// 	return props.data?.examples ?? '';
// });

// const router = useRouter();
// const route = useRoute();

// const activeExample = computed(() => {
//   return parseInt((route.query?.example ?? "-1").toString());
// });

// const baseQuery = computed(() => {
//   return {
//     category: route.query?.category ?? "",
//     challenge: route.query?.challenge ?? "",
//   };
// });

// function toggleShowExample(index: number) {
//   router.replace({
//     path: route.path,
//     query:
//       activeExample.value == index
//         ? {
//             ...baseQuery.value,
//           }
//         : {
//             ...baseQuery.value,
//             example: index,
//           },
//   });
// }

// return { t, examples, activeExample, toggleShowExample };
//   },
// });
</script>

<style scoped></style>

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
  emits: ["isSolved"],
  setup(props, { emit }) {
    const { t } = useI18n();
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
        // const showConfetti = useShowConfetti();
        // const hideAnimation: any = useCookie("hideAnimationNextTime");
        // console.log("hide animation cookie", hideAnimation.value);
        // if (hideAnimation.value === undefined || hideAnimation.value == false)
        //   showConfetti.value = true;
        openSnackbar("success", "Success.SolvedCodingChallenge");
        emit("isSolved", true);
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
</script>

<style scoped></style>

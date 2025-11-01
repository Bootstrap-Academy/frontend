<template>
  <section
    class="daily-rewards-card card grid gap-5 rounded-2xl bg-[color:var(--color-secondary)] p-6 text-[color:var(--color-heading)]"
    aria-labelledby="daily-rewards-heading"
  >
    <header class="grid gap-2">
      <div class="flex flex-wrap items-center gap-3">
        <h2 id="daily-rewards-heading" class="text-heading-3">
          {{ t("DailyRewards.Heading") }}
        </h2>
        <span
          v-if="availableCoins > 0"
          class="inline-flex items-center gap-2 rounded-full bg-[rgba(12,201,171,0.15)] px-3 py-1 text-sm font-semibold text-[color:var(--color-accent)]"
        >
          +{{ availableCoins }} {{ t("DailyRewards.Coins") }}
        </span>
      </div>
      <p class="text-body-2 text-[color:var(--color-subheading)]">
        {{ t("DailyRewards.Subheading") }}
      </p>
      <p v-if="countdownLabel" class="text-sm text-[color:var(--color-body)]">
        {{ t("DailyRewards.Countdown", { relative: countdownLabel }) }}
      </p>
    </header>

    <div v-if="pending" class="grid gap-4">
      <div
        v-for="index in 4"
        :key="index"
        class="animate-pulse rounded-xl bg-[rgba(11,25,46,0.35)] p-4"
      >
        <div class="flex items-center justify-between">
          <div class="h-4 w-32 rounded bg-[rgba(255,255,255,0.09)]" />
          <div class="h-4 w-16 rounded bg-[rgba(255,255,255,0.05)]" />
        </div>
        <div class="mt-4 h-3 w-52 rounded bg-[rgba(255,255,255,0.04)]" />
      </div>
    </div>

    <div
      v-else-if="hasError"
      class="rounded-xl border border-[rgba(235,88,87,0.35)] bg-[rgba(235,88,87,0.08)] p-5 text-sm text-[color:var(--color-body)]"
    >
      <p>{{ t("DailyRewards.Error") }}</p>
      <button
        type="button"
        class="mt-4 inline-flex items-center rounded-lg border border-[color:var(--color-accent)] px-4 py-2 text-sm font-semibold text-[color:var(--color-accent)] transition hover:bg-[rgba(12,201,171,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-secondary)]"
        @click="refresh"
      >
        {{ t("DailyRewards.Buttons.Retry") }}
      </button>
    </div>

    <div
      v-else-if="featureDisabled"
      class="rounded-xl border border-[rgba(205,215,245,0.15)] bg-[rgba(11,25,46,0.35)] p-5 text-sm text-[color:var(--color-body)]"
    >
      <p>{{ t("DailyRewards.Disabled") }}</p>
    </div>

    <div v-else class="grid gap-4">
      <DailyRewardsCategoryRow
        v-for="reward in rewards"
        :key="reward.category"
        :reward="reward"
        :busy="claimBusy[reward.category]"
        @claim="handleClaim"
        @open="handleOpen"
      />

      <div class="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-[color:var(--color-body)]">
          {{ t("DailyRewards.Footer", { coins: claimedToday }) }}
        </p>
        <button
          v-if="hasReadyRewards"
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-[color:var(--color-accent)] px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] transition hover:bg-[rgba(12,201,171,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-secondary)] disabled:cursor-not-allowed disabled:opacity-70"
          :disabled="claimAllBusy"
          @click="handleClaimAll"
        >
          <span
            v-if="claimAllBusy"
            class="size-3 animate-spin rounded-full border-2 border-[color:var(--color-dark)] border-r-transparent"
          />
          <span>{{ t("DailyRewards.Buttons.ClaimAll") }}</span>
        </button>
      </div>
    </div>

    <div class="sr-only" aria-live="polite">
      {{ ariaAnnouncement || "" }}
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { openSnackbar } from "~/composables/response";
import type { DailyReward, RewardCategory } from "~/composables/dailyRewards";
import { useDailyRewards } from "~/composables/dailyRewards";

export default defineComponent({
  setup() {
    const { t } = useI18n();
    const router = useRouter();
    const {
      rewards,
      availableCoins,
      claimedToday,
      countdownLabel,
      featureEnabled,
      pending,
      error,
      refresh,
      claimCategory,
      claimAll,
      claimBusy,
      claimAllBusy,
      ariaAnnouncement,
    } = useDailyRewards();

    const isFeatureDisabledError = (err: unknown) => {
      if (!err || typeof err !== "object") {
        return false;
      }
      const errorLike = err as Record<string, any>;
      const status =
        errorLike?.response?.status ??
        errorLike?.statusCode ??
        errorLike?.status ??
        errorLike?.response?.statusCode;
      if (status !== 404) {
        return false;
      }
      const errorCode =
        errorLike?.response?._data?.error ??
        errorLike?.response?._data?.code ??
        errorLike?.data?.error ??
        errorLike?.data?.code;
      if (typeof errorCode === "string" && errorCode.toLowerCase().includes("featuredisabled")) {
        return true;
      }
      const detail =
        errorLike?.response?._data?.detail ??
        errorLike?.data?.detail ??
        (typeof errorLike?.message === "string" ? errorLike.message : "");
      if (typeof detail === "string" && detail.toLowerCase().includes("feature disabled")) {
        return true;
      }
      // Default to treating a 404 response from daily rewards as feature disabled.
      return true;
    };

    const hasReadyRewards = computed(() =>
      rewards.value.some((reward) => reward.status === "ready")
    );

    const hasError = computed(() => {
      const currentError = error.value;
      if (!currentError) {
        return false;
      }
      return !isFeatureDisabledError(currentError);
    });

    const featureDisabled = computed(() => {
      if (isFeatureDisabledError(error.value)) {
        return true;
      }
      return !featureEnabled.value;
    });

    const summaryByCategory = computed(() =>
      rewards.value.reduce<Record<RewardCategory, DailyReward>>((acc, reward) => {
        acc[reward.category] = reward;
        return acc;
      }, Object.create(null))
    );

    const handleClaim = async (category: RewardCategory) => {
      const current = summaryByCategory.value[category];
      const { ok, error: claimError } = await claimCategory(category);
      if (ok) {
        openSnackbar(
          "success",
          "DailyRewards.Toast.ClaimSuccess",
          t("DailyRewards.ToastBody.ClaimSingle", {
            category: t(`DailyRewards.Categories.${category}`),
            coins: current?.coins ?? 0,
          })
        );
      } else if (claimError !== "busy") {
        openSnackbar(
          "error",
          "DailyRewards.Toast.ClaimError",
          t("DailyRewards.ToastBody.ClaimError", {
            category: t(`DailyRewards.Categories.${category}`),
          })
        );
      }
    };

    const handleClaimAll = async () => {
      const result = await claimAll();
      if (result.ok) {
        const successBody = t("DailyRewards.ToastBody.ClaimAllSuccess", {
          coins: result.totalClaimedCoins,
        });
        openSnackbar(
          "success",
          "DailyRewards.Toast.ClaimAllSuccess",
          result.skipped.length > 0
            ? `${successBody} ${t("DailyRewards.ToastBody.ClaimAllPartial", {
                categories: result.skipped
                  .map(({ category }) => t(`DailyRewards.Categories.${category}`))
                  .join(", "),
              })}`
            : successBody
        );
      } else if (result.error !== "busy") {
        openSnackbar(
          "error",
          "DailyRewards.Toast.ClaimAllError",
          t("DailyRewards.ToastBody.ClaimAllError")
        );
      }
    };

    const handleOpen = (reward: DailyReward) => {
      const sample = (reward.activity_sample ?? {}) as Record<string, any>;
      const pickSampleValue = (...keys: string[]) => {
        for (const key of keys) {
          const value = sample[key];
          if (value !== undefined && value !== null && value !== "") {
            return value;
          }
        }
        return undefined;
      };

      switch (reward.category) {
        case "lecture": {
          const courseId = sample.course_id ?? sample.courseId;
          const lectureId = sample.lecture_id ?? sample.lectureId;
          const sectionId = sample.section_id ?? sample.sectionId;
          if (courseId) {
            router.push({
              path: `/courses/${courseId}/watch`,
              query: {
                ...(sectionId ? { section: sectionId } : {}),
                ...(lectureId ? { lecture: lectureId } : {}),
              },
            });
          } else {
            router.push("/profile/courses");
          }
          break;
        }
        case "practice": {
          const normalizeString = (value: unknown) =>
            typeof value === "string" && value.trim() !== "" ? value.toLowerCase() : undefined;
          const deriveQuizzesFrom = (value?: string) => {
            if (!value) return undefined;
            if (value.includes("course")) return "course";
            if (value.includes("skill")) return "skill";
            if (value.includes("quiz")) return "quiz";
            return undefined;
          };

          const rawSubtaskType = normalizeString(pickSampleValue("subtask_type", "subtaskType"));
          const isMatchingSubtask = rawSubtaskType?.includes("matching") ?? false;

          const courseId = pickSampleValue("course_id", "courseId");
          const skillId = pickSampleValue("skill_id", "skillId");
          const quizId = pickSampleValue("quiz_id", "quizId");
          const taskId = pickSampleValue("task_id", "taskId");
          const rawSolveId = pickSampleValue("solve_id", "solveId");

          const rawQuizzesFrom = normalizeString(pickSampleValue("quizzes_from", "quizzesFrom"));
          const derivedQuizzesFromFromType = deriveQuizzesFrom(rawSubtaskType);

          const resolvedQuizzesFrom =
            rawQuizzesFrom ??
            (courseId ? "course" : undefined) ??
            (skillId ? "skill" : undefined) ??
            (quizId ? "quiz" : undefined) ??
            derivedQuizzesFromFromType ??
            "quiz";

          let solveId = rawSolveId ?? quizId ?? taskId;

          if (!solveId) {
            if (resolvedQuizzesFrom === "course") {
              solveId = courseId;
            } else if (resolvedQuizzesFrom === "skill") {
              solveId = skillId;
            } else if (resolvedQuizzesFrom === "quiz") {
              solveId = quizId;
            }
          }

          const normalizedSolveId =
            solveId !== undefined && solveId !== null && solveId !== ""
              ? String(solveId)
              : undefined;

          const querySubTaskId = pickSampleValue(
            "query_subtask_id",
            "querySubTaskId",
            "matching_id",
            "matchingId",
            "subtask_id",
            "subTaskId"
          );
          const rootSkillId = pickSampleValue("root_skill_id", "rootSkillId", "rootSkillID");
          const subSkillId = pickSampleValue("sub_skill_id", "subSkillId", "subSkillID");
          const fallbackSkillId = skillId;

          if (normalizedSolveId) {
            const query: Record<string, string> = {
              quizzesFrom: resolvedQuizzesFrom,
            };
            if (querySubTaskId) {
              query.querySubTaskId = String(querySubTaskId);
            }
            if (taskId) {
              query.taskId = String(taskId);
            }
            if (rootSkillId) {
              query.rootSkillID = String(rootSkillId);
            }
            if (subSkillId) {
              query.subSkillID = String(subSkillId);
            }

            const solveBasePath = isMatchingSubtask ? "/matchings" : "/quizzes";

            router.push({
              path: `${solveBasePath}/solve-${normalizedSolveId}`,
              query,
            });
          } else if (fallbackSkillId) {
            router.push(`/quizzes/skill-${String(fallbackSkillId)}`);
          } else {
            router.push("/profile/quizzes");
          }
          break;
        }
        case "lab": {
          const rawChallengeId =
            pickSampleValue("challenge_id", "challengeId", "task_id", "taskId") ??
            (typeof sample.task === "object" && sample.task !== null
              ? (sample.task.id ??
                sample.task.challenge_id ??
                sample.task.challengeId ??
                sample.task.task_id ??
                sample.task.taskId)
              : undefined);
          const challengeId =
            rawChallengeId !== undefined && rawChallengeId !== null && rawChallengeId !== ""
              ? String(rawChallengeId)
              : undefined;
          const codingChallengeIdValue = pickSampleValue(
            "coding_challenge_id",
            "codingChallengeId",
            "subtask_id",
            "subTaskId"
          );
          const codingChallengeId =
            codingChallengeIdValue !== undefined &&
            codingChallengeIdValue !== null &&
            codingChallengeIdValue !== ""
              ? String(codingChallengeIdValue)
              : undefined;

          if (challengeId) {
            if (codingChallengeId) {
              router.push({
                path: `/challenges/QuizCodingChallenge-${challengeId}`,
                query: {
                  codingChallenge: codingChallengeId,
                },
              });
            } else {
              router.push(`/challenges/QuizCodingChallenge-${challengeId}`);
            }
          } else {
            router.push("/challenges");
          }
          break;
        }
        default: {
          break;
        }
      }
    };

    return {
      t,
      rewards,
      availableCoins,
      claimedToday,
      countdownLabel,
      featureEnabled,
      pending,
      error,
      refresh,
      claimBusy,
      claimAllBusy,
      ariaAnnouncement,
      featureDisabled,
      hasError,
      hasReadyRewards,
      handleClaim,
      handleClaimAll,
      handleOpen,
    };
  },
});
</script>

<style scoped>
.daily-rewards-card {
  background-image: linear-gradient(
    140deg,
    rgba(11, 25, 46, 0.85) 0%,
    rgba(24, 43, 69, 0.95) 50%,
    rgba(11, 51, 65, 0.9) 100%
  );
  border: 1px solid rgba(205, 215, 245, 0.1);
}
</style>

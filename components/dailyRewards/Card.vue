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
      v-else-if="error"
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
      v-else-if="!featureEnabled"
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

    const hasReadyRewards = computed(() =>
      rewards.value.some((reward) => reward.status === "ready")
    );

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
          const resolvedQuizzesFrom =
            (pickSampleValue("quizzes_from", "quizzesFrom") as string | undefined) ??
            (pickSampleValue("course_id", "courseId") ? "course" : undefined) ??
            (pickSampleValue("skill_id", "skillId") ? "skill" : undefined) ??
            (pickSampleValue("quiz_id", "quizId") ? "quiz" : undefined);
          let solveId =
            pickSampleValue("solve_id", "solveId") ?? pickSampleValue("quiz_id", "quizId");

          if (!solveId) {
            if (resolvedQuizzesFrom === "course") {
              solveId = pickSampleValue("course_id", "courseId");
            } else if (resolvedQuizzesFrom === "skill") {
              solveId = pickSampleValue("skill_id", "skillId");
            } else if (resolvedQuizzesFrom === "quiz") {
              solveId = pickSampleValue("quiz_id", "quizId");
            }
          }

          const querySubTaskId = pickSampleValue(
            "query_subtask_id",
            "querySubTaskId",
            "subtask_id",
            "subTaskId"
          );
          const taskId = pickSampleValue("task_id", "taskId");
          const rootSkillId = pickSampleValue("root_skill_id", "rootSkillId", "rootSkillID");
          const subSkillId = pickSampleValue("sub_skill_id", "subSkillId", "subSkillID");
          const fallbackSkillId = pickSampleValue("skill_id", "skillId");

          if (solveId && resolvedQuizzesFrom) {
            const query: Record<string, string> = {
              quizzesFrom: String(resolvedQuizzesFrom),
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

            router.push({
              path: `/quizzes/solve-${String(solveId)}`,
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
          const challengeId = pickSampleValue(
            "challenge_id",
            "challengeId",
            "task_id",
            "taskId"
          );
          const codingChallengeId = pickSampleValue(
            "coding_challenge_id",
            "codingChallengeId",
            "subtask_id",
            "subTaskId"
          );
          if (challengeId) {
            if (codingChallengeId) {
              router.push({
                path: `/challenges/QuizCodingChallenge-${String(challengeId)}`,
                query: {
                  codingChallenge: String(codingChallengeId),
                },
              });
            } else {
              router.push(`/challenges/QuizCodingChallenge-${String(challengeId)}`);
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

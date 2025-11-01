<template>
  <article
    class="relative flex flex-col gap-3 rounded-xl border border-transparent bg-[color:var(--color-secondary)] p-4 transition-shadow focus-within:ring-2 focus-within:ring-[color:var(--color-accent)] focus:outline-none"
    :class="{
      'opacity-60': reward.status === 'claimed',
      'daily-rewards-celebrate': celebrate && !prefersReducedMotion,
    }"
  >
    <div class="flex items-start gap-3">
      <div
        class="flex size-11 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--color-tertiary)] text-[color:var(--color-accent)] shadow-inner shadow-[rgba(12,201,171,0.25)]"
        aria-hidden="true"
      >
        <IconMorphcoin class="size-5" />
      </div>

      <div class="flex flex-1 flex-col gap-2">
        <div class="flex flex-wrap items-baseline gap-2">
          <h3 class="text-heading-5 uppercase tracking-wide text-[color:var(--color-heading)]">
            {{ categoryLabel }}
          </h3>
          <span
            class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide"
            :class="statusBadgeClass"
          >
            <span class="size-1.5 rounded-full" :class="statusDotClass" aria-hidden="true" />
            {{ statusLabel }}
          </span>
          <p class="ml-auto text-sm font-semibold text-[color:var(--color-accent)]">
            +{{ reward.coins }} {{ t("DailyRewards.Coins") }}
          </p>
        </div>

        <p v-if="activityHint" class="clamp line-2 text-sm text-[color:var(--color-body)]">
          {{ activityHint }}
        </p>
        <p v-else class="text-sm text-[color:var(--color-subheading)]">
          {{ defaultHint }}
        </p>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3 pt-1">
      <button
        v-if="reward.status === 'ready'"
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-[color:var(--color-accent)] px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] transition hover:bg-[rgba(12,201,171,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-secondary)] disabled:cursor-not-allowed disabled:opacity-70"
        :disabled="busy"
        @click="$emit('claim', reward.category)"
      >
        <span
          v-if="busy"
          class="size-3 animate-spin rounded-full border-2 border-[color:var(--color-dark)] border-r-transparent"
        />
        <span>{{ t("DailyRewards.Buttons.Claim") }}</span>
      </button>

      <button
        v-else-if="showPendingCta"
        type="button"
        class="inline-flex items-center gap-2 rounded-lg border border-[rgba(205,215,245,0.4)] px-4 py-2 text-sm font-semibold text-[color:var(--color-heading)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-secondary)]"
        @click="$emit('open', reward)"
      >
        <span>{{ pendingCtaLabel }}</span>
      </button>

      <p
        v-else-if="reward.status === 'pending'"
        class="text-sm text-[color:var(--color-subheading)]"
      >
        {{ defaultHint }}
      </p>

      <p
        v-else-if="reward.status === 'unavailable'"
        class="text-sm text-[color:var(--color-subheading)]"
      >
        {{ unavailableLabel }}
      </p>

      <p v-else class="text-sm font-medium text-[color:var(--color-subheading)]">
        {{ claimedLabel }}
      </p>
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent, computed, onBeforeUnmount, ref, watch } from "vue";
import type { PropType } from "vue";
import { useI18n } from "vue-i18n";
import { usePreferredReducedMotion } from "@vueuse/core";
import type { DailyReward, RewardCategory } from "~/composables/dailyRewards";

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-[rgba(11,51,65,0.45)] text-[color:var(--color-body)]",
  ready: "bg-[rgba(12,201,171,0.15)] text-[color:var(--color-accent)]",
  claimed: "bg-[rgba(113,124,159,0.25)] text-[color:var(--color-subheading)]",
  unavailable: "bg-[rgba(125,47,47,0.15)] text-[color:var(--color-warning)]",
};

const DOT_CLASS: Record<string, string> = {
  pending: "bg-[color:var(--color-body)]",
  ready: "bg-[color:var(--color-accent)]",
  claimed: "bg-[color:var(--color-subheading)]",
  unavailable: "bg-[color:var(--color-warning)]",
};

export default defineComponent({
  emits: ["claim", "open"],
  props: {
    reward: {
      type: Object as PropType<DailyReward>,
      required: true,
    },
    busy: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const { t } = useI18n();
    const prefersReducedMotion = usePreferredReducedMotion();
    const celebrate = ref(false);
    let celebrationTimeout: ReturnType<typeof setTimeout> | null = null;

    const categoryLabel = computed(() =>
      t(`DailyRewards.Categories.${props.reward.category}` as const)
    );

    const statusLabel = computed(() => t(`DailyRewards.Status.${props.reward.status}` as const));

    const statusBadgeClass = computed(
      () => STATUS_CLASS[props.reward.status] ?? STATUS_CLASS.pending
    );

    const statusDotClass = computed(() => DOT_CLASS[props.reward.status] ?? DOT_CLASS.pending);

    const activityHint = computed(() => buildActivityHint(props.reward));
    const defaultHint = computed(() =>
      t(`DailyRewards.DefaultHint.${props.reward.category}` as const)
    );

    const showPendingCta = computed(
      () => props.reward.status === "pending" && props.reward.category !== "arrival"
    );

    const pendingCtaLabel = computed(() =>
      t(`DailyRewards.Buttons.Resume.${props.reward.category}` as const)
    );

    const unavailableLabel = computed(() => {
      const reason = props.reward.unavailable_reason ?? "default";
      return t(`DailyRewards.Unavailable.${reason}` as const);
    });

    const claimedLabel = computed(() => {
      const time = formatTime(props.reward.claimed_at);
      if (!time) {
        return t("DailyRewards.Status.claimed");
      }
      return t("DailyRewards.StatusLabel.ClaimedAt", { time });
    });

    watch(
      () => props.reward.status,
      (status, previous) => {
        if (status === "claimed" && previous !== "claimed" && !prefersReducedMotion.value) {
          if (celebrationTimeout) {
            clearTimeout(celebrationTimeout);
          }
          celebrate.value = true;
          celebrationTimeout = setTimeout(() => {
            celebrate.value = false;
          }, 800);
        } else if (status !== "claimed") {
          celebrate.value = false;
        }
      }
    );

    onBeforeUnmount(() => {
      if (celebrationTimeout) {
        clearTimeout(celebrationTimeout);
      }
    });

    return {
      t,
      categoryLabel,
      statusLabel,
      statusBadgeClass,
      statusDotClass,
      activityHint,
      defaultHint,
      pendingCtaLabel,
      unavailableLabel,
      claimedLabel,
      celebrate,
      prefersReducedMotion,
    };
  },
});

function buildActivityHint(reward: DailyReward) {
  const sample = reward.activity_sample ?? {};
  switch (reward.category) {
    case "lecture":
      return (sample as Record<string, any>)?.lecture_title ?? "";
    case "practice":
      return (sample as Record<string, any>)?.task_title ?? "";
    case "lab":
      return (sample as Record<string, any>)?.lab_title ?? "";
    default:
      return "";
  }
}

function formatTime(timestamp: string | null) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
</script>

<style scoped>
.daily-rewards-celebrate {
  box-shadow:
    0 0 0 0 rgba(12, 201, 171, 0.35),
    0 0 0 4px rgba(12, 201, 171, 0.15);
  animation: daily-rewards-pop 0.8s ease-out;
}

@keyframes daily-rewards-pop {
  0% {
    transform: translateY(0);
    box-shadow:
      0 0 0 0 rgba(12, 201, 171, 0.55),
      0 0 0 0 rgba(12, 201, 171, 0.35);
  }
  60% {
    transform: translateY(-2px);
    box-shadow:
      0 0 0 6px rgba(12, 201, 171, 0.25),
      0 0 0 12px rgba(12, 201, 171, 0.1);
  }
  100% {
    transform: translateY(0);
    box-shadow:
      0 0 0 0 rgba(12, 201, 171, 0),
      0 0 0 0 rgba(12, 201, 171, 0);
  }
}
</style>

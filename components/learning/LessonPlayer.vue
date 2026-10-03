<template>
  <section class="lesson-player">
    <LearningDailyNotice v-if="!blocked" :value="daily" />
    <LearningDailyLimit v-if="blocked && daily" :value="daily" />
    <template v-else>
      <nav v-if="lesson.activities.length > 1" :aria-label="copy.activities">
        <button
          v-for="(item, index) in lesson.activities"
          :key="item.id"
          type="button"
          :aria-current="item.id === activity?.id ? 'step' : undefined"
          :disabled="disabled"
          @click="select(item.id)"
        >
          {{ index + 1 }}. {{ title(item.title) }}
        </button>
      </nav>
      <slot v-if="activity" name="activity" :activity="activity">
        <ActivityHost
          ref="host"
          :key="activity.id"
          :protocol="protocol"
          :activity="activity"
          :state="state || {}"
          :locale="locale"
          :disabled="disabled"
          :request="request"
          :save="save"
          :user-id="userId"
          :review-id="reviewId"
          :legacy-video="legacyVideo"
          @change="emit('change', $event)"
          @complete="emit('complete', $event)"
          @posting="emit('posting', $event)"
          @skip="emit('skip')"
        />
      </slot>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type {
  LearningActivityCompletion,
  LearningActivityHandle,
  LearningLesson,
  LegacyVideoContext,
} from "~/types/learningActivities";
import type { LearningRequest, LocalizedText } from "~/types/learningRooms";
import type { RoomProtocolSource } from "~/utils/lessonProtocolRooms";
import ActivityHost from "./ActivityHost.vue";
import type { DailyLearning } from "~/types/dailyLearning";
import { dailyBlocked } from "~/utils/dailyLearning";

const props = defineProps<{
  protocol?: RoomProtocolSource;
  lesson: LearningLesson;
  daily?: DailyLearning | null;
  activeActivityId?: string;
  state?: Record<string, any>;
  locale: string;
  disabled?: boolean;
  request?: LearningRequest;
  save?: () => Promise<boolean>;
  userId?: string;
  reviewId?: string;
  legacyVideo?: LegacyVideoContext;
}>();
const emit = defineEmits<{
  select: [id: string];
  change: [state: Record<string, any>];
  complete: [result: LearningActivityCompletion];
  posting: [active: boolean];
  skip: [];
}>();
const blocked = computed(() => dailyBlocked(props.daily));
const host = ref<LearningActivityHandle | null>(null);
const activity = computed(() =>
  props.activeActivityId
    ? props.lesson.activities.find((item) => item.id === props.activeActivityId)
    : props.lesson.activities[0]
);
const copy = computed(() => ({
  activities: props.locale.startsWith("de") ? "Lernschritte" : "Activities",
}));
const title = (value: LocalizedText) => value[props.locale.startsWith("de") ? "de" : "en"];
async function select(id: string) {
  if ((await host.value?.prepareNavigation?.()) === false) return;
  emit("select", id);
}
defineExpose({
  cancelPreparation: () => host.value?.cancelPreparation(),
  prepareNavigation: () => host.value?.prepareNavigation?.() ?? Promise.resolve(true),
});
</script>

<style scoped>
.lesson-player {
  min-width: 0;
}
nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
nav button {
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  color: var(--color-heading);
  background: var(--color-secondary);
  text-align: left;
}
nav button[aria-current="step"] {
  outline: 2px solid var(--color-accent);
}
</style>

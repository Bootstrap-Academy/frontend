<template>
  <div v-if="event.booked || isMine || user?.admin" class="mt-4 flex justify-end gap-4">
    <Btn :bgColor="theme.bg" :borderColor="theme.border" sm @click="confirmCancellation = true">
      {{ t("Buttons.MoreEventInfo") }}
    </Btn>
    <Modal v-if="confirmCancellation" class="z-100">
      <CalendarEventSummary
        :event="event"
        @cancel="confirmCancellation = false"
        :stats="stats"
        :description="description"
      >
        <EventCancellationConfirmation
          :event-id="id"
          :kind="type === 'coaching' ? 'coaching' : 'webinar'"
          scope="auto"
          @close="confirmCancellation = false"
          @applied="emit('applied')"
        />
      </CalendarEventSummary>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import type { WebinarEvent, CoachingEvent } from "~/types/calenderTypes";

// Keep existing-booking details and the exact-target cancellation dialog.
// New event offers and bookings are closed by the service.
defineProps<{
  event: WebinarEvent | CoachingEvent;
  isMine: boolean;
  booked: boolean;
  bookable: boolean;
  id: string;
  description: string;
  type: string;
  theme: any;
  subSkillID: string;
  start: number;
  stats: any[];
}>();
const emit = defineEmits<{ applied: [] }>();
const { t } = useI18n();
const user = useUser();
const confirmCancellation = ref(false);
</script>

<template>
  <section v-if="data?.id">
    <h2 class="text-heading-2">{{ data.name }}</h2>
    <InputBtn tertiary @click="confirm = true">{{ t("Buttons.DeleteWebinar") }}</InputBtn>
    <Modal v-if="confirm" class="z-[150]">
      <EventCancellationConfirmation
        :event-id="data.id"
        kind="webinar"
        scope="session"
        @close="confirm = false"
        @applied="emit('applied')"
      />
    </Modal>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

// Retain cancellation of an existing instructor session, without its old editor.
defineProps<{
  data?: { id: string; name?: string } | null;
  skillID?: string;
  rating?: number;
}>();
const emit = defineEmits<{ applied: [] }>();
const { t } = useI18n();
const confirm = ref(false);
</script>

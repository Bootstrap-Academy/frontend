<template>
  <Modal v-if="show">
    <article class="w-full max-w-screen-md bg-secondary style-card">
      <div class="card max-h-[80vh] overflow-scroll">
        <div class="flex justify-center">
          <TagIcon class="m-4 h-12 w-12 text-accent" />
        </div>
        <h2 class="text-heading-2 text-center mb-box">
          {{ t("Headings.SelectSkill") }}
        </h2>
        <div class="mb-4 flex justify-center">
          <p class="max-w-md text-center">
            {{ t("Body.SelectSkillDescription") }}
          </p>
        </div>
        <div v-for="(skill, index) in skills" :key="index" class="flex gap-card">
          <article
            class="grid w-full cursor-pointer grid-cols-1 gap-y-1 rounded-md border-2 px-4 py-2 mt-box"
            :class="selectedSkill === skill.id ? 'border-accent' : 'border-transparent bg-primary'"
            @click="selectSkill(skill.id)"
          >
            <p class="text-body-1">{{ skill.name }}</p>
          </article>
        </div>
      </div>
      <div class="card flex flex-wrap bg-[#1c3250] gap-card">
        <Btn secondary @click="closeModal">
          {{ t("Buttons.Cancel") }}
        </Btn>
        <div class="flex-1"></div>
        <Btn :disabled="!selectedSkill" class="disabled:opacity-25" @click="confirmSelection">
          {{ t("Buttons.Next") }}
        </Btn>
      </div>
    </article>
  </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { useI18n } from "vue-i18n";
import Modal from "@/components/Dialog.vue";
import Btn from "@/components/Btn.vue";
import { TagIcon } from "@heroicons/vue/24/outline";

export default defineComponent({
  components: { Modal, Btn, TagIcon },
  props: {
    show: { type: Boolean, default: false },
    skills: {
      type: Array as PropType<Array<{ id: string; name: string }>>,
      default: () => [],
    },
  },
  emits: ["select", "close"],
  setup(props, { emit }) {
    const { t } = useI18n();
    const selectedSkill = ref<string | null>(null);

    function selectSkill(skillID: string) {
      selectedSkill.value = skillID;
    }

    function confirmSelection() {
      if (!selectedSkill.value) return;

      emit("select", selectedSkill.value);
      closeModal();
    }

    function closeModal() {
      emit("close");
    }

    return {
      t,
      selectedSkill,
      selectSkill,
      confirmSelection,
      closeModal,
    };
  },
});
</script>

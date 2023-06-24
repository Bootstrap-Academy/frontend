<template>
  <div>
    <InputBtn class="my-7" full @click="openDialogAndAddNew()">
      {{ t("Buttons.AddNew") }}
    </InputBtn>
    <section v-if="subtasks?.length">
      <div
        v-for="(subtask, i) of subtasks"
        :key="i"
        class="p-4 xl:p-5 bg-secondary mb-4 rounded-md"
      >
        <article class="flex justify-between gap-4">
          <p class="clamp line-1 tight sm:pr-3 md:pr-5 md:w-4/5 lg:w-2/3">
            {{ subtask?.question ?? "" }}
          </p>

          <div class="flex gap-3 items-center">
            <TrashIcon
              @click="fnDeleteSubtask(subtask?.id)"
              class="h-5 w-5 cursor-pointer text-accent"
            />
            <PencilIcon
              @click="openDialogCreate(subtask)"
              class="h-5 w-5 cursor-pointer text-accent"
            />
          </div>
        </article>

        <article class="flex gap-10 mt-6 items-center justify-between">
          <div class="flex gap-6 flex-wrap">
            <section class="flex gap-2">
              <p class="text-sm">{{ t("Headings.Coins") }} :</p>
              <p class="text-accent text-sm">{{ subtask?.coins ?? "" }}</p>
            </section>

            <section class="flex gap-2">
              <p class="text-sm">{{ t("Headings.FEE") }} :</p>
              <p class="text-accent text-sm">{{ subtask?.fee ?? "" }}</p>
            </section>

            <section class="flex gap-2">
              <p class="text-sm">{{ t("Headings.XP") }} :</p>
              <p class="text-accent text-sm">{{ subtask?.xp ?? "" }}</p>
            </section>
          </div>
          <LockOpenIcon v-if="subtask?.unlocked" class="h-4 w-4 text-white" />
          <LockClosedIcon v-else class="h-4 w-4 cursor text-white" />
        </article>
        <section class="flex gap-2 mt-3">
          <p v-if="subtask?.single_choice" class="text-xs text-accent">
            {{ t("Headings.SingleChoice") }}
          </p>
          <p v-else class="text-accent text-xs">
            {{ t("Headings.MultiChoice") }}
          </p>
        </section>
      </div>
    </section>
    <p
      class="border border-accent rounded-md w-full p-5 text-xl text-center"
      v-else
    >
      {{ t("Headings.EmptySubtasks") }}
    </p>
    <div>
      <DialogSlot
        v-if="dialogCreateSubtask"
        :label="'Headings.Quiz'"
        :propClass="'modal-width-lg lg:modal-width-md'"
        :show="dialog"
        @closeFunction="dialogCreateSubtask = false"
      >
        <LazyFormQuiz :data="propData" :taskId="taskId" />
      </DialogSlot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { PropType } from "vue";
import { useI18n } from "vue-i18n";
import {
  PencilIcon,
  TrashIcon,
  LockClosedIcon,
  LockOpenIcon,
} from "@heroicons/vue/24/outline";
import { useDialogCreateSubtask } from "~~/composables/dialogSlot";
import { deleteSubTaskInQuiz } from "~~/composables/quizzes";
export default defineComponent({
  props: {
    subtasks: { type: Array as PropType<any>, default: [] },
    taskId: { type: String, default: "" },
  },
  setup(props) {
    const { t } = useI18n();
    const dialog = useDialogSlot();
    const dialogCreateSubtask = useDialogCreateSubtask();
    const propData = ref();

    function openDialogCreate(subtask: any) {
      propData.value = subtask;
      dialog.value = true;
      dialogCreateSubtask.value = true;
    }

    function openDialogAndAddNew() {
      propData.value = null;
      dialog.value = true;
      dialogCreateSubtask.value = true;
    }
    function fnDeleteSubtask(id: any) {
      openDialog(
        "info",
        "Headings.DeleteQuiz",
        "Body.DeleteQuiz",
        false,
        {
          label: "Buttons.DeleteQuiz",
          onclick: async () => {
            const [success, error] = await deleteSubTaskInQuiz(
              props.taskId,
              id
            );

            if (success) {
              setTimeout(() => {
                openSnackbar("success", "Success.DeleteQuiz");
              }, 1000);
            } else {
              openSnackbar("error", error?.detail ?? "");
            }
          },
        },
        {
          label: "Buttons.Cancel",
          onclick: () => {},
        }
      );
    }
    return {
      t,
      dialog,
      dialogCreateSubtask,
      openDialogCreate,
      fnDeleteSubtask,
      propData,
      openDialogAndAddNew,
    };
  },

  components: {
    PencilIcon,
    TrashIcon,
    LockClosedIcon,
    LockOpenIcon,
  },
});
</script>

<style scoped></style>

<template>
  <div>
    <InputBtn class="my-7" full @click="openDialogAndAddNew()">
      {{ t("Buttons.AddNew") }}
    </InputBtn>
    <section v-if="quizzes?.length">
      <div v-for="(quiz, i) of quizzes" :key="i" class="mb-4 rounded-md bg-secondary p-4 xl:p-5">
        <article class="flex justify-between gap-4">
          <p class="clamp line-1 tight sm:pr-3 md:w-4/5 md:pr-5 lg:w-2/3">
            {{ quiz?.question ?? "" }}
          </p>

          <div class="flex items-center gap-3">
            <TrashIcon @click="fnDeleteQuiz(quiz?.id)" class="h-5 w-5 cursor-pointer text-accent" />
            <PencilSquareIcon
              v-if="!!user?.admin"
              @click="openDialogCreate(quiz)"
              class="h-5 w-5 cursor-pointer text-accent"
            />
            <EyeIcon
              v-else-if="!user?.admin"
              @click="openDialogCreate(quiz)"
              class="h-5 w-5 cursor-pointer text-accent"
            />
          </div>
        </article>
      </div>
    </section>
    <p class="w-full rounded-md border border-accent p-5 text-center text-xl" v-else>
      {{ t("Headings.EmptyQuizzes") }}
    </p>
    <div>
      <DialogSlot
        v-if="dialogCreateQiuz"
        :label="'Headings.Quiz'"
        :propClass="'modal-width-lg lg:modal-width-md'"
        :show="dialog"
        @closeFunction="dialogCreateQiuz = false"
      >
        <LazyFormQuiz :data="propData" :taskId="taskId" />
      </DialogSlot>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useDialogSlot } from "@/composables/dialogSlot";
import { useI18n } from "vue-i18n";
import { TrashIcon, EyeIcon, PencilSquareIcon } from "@heroicons/vue/24/outline";

const props = defineProps({
  quizzes: { type: Array as PropType<any>, default: [] },
  taskId: { type: String, default: "" },
});
const { t } = useI18n();
const dialog = useDialogSlot();
const dialogCreateQiuz = useDialogCreateSubtask();
const propData = ref();
const user: any = useUser();

function openDialogCreate(quiz: any) {
  propData.value = quiz;
  dialog.value = true;
  dialogCreateQiuz.value = true;
}

function openDialogAndAddNew() {
  propData.value = null;
  dialog.value = true;
  dialogCreateQiuz.value = true;
}
function fnDeleteQuiz(id: any) {
  openDialog(
    "info",
    "Headings.DeleteQuiz",
    "Body.DeleteQuiz",
    false,
    {
      label: "Buttons.DeleteQuiz",
      onclick: async () => {
        const [success, error] = await deleteSubTaskInQuiz(props.taskId, id);

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
</script>

<style scoped></style>

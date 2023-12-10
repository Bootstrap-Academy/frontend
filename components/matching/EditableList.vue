<template>
  <div>
    <InputBtn class="my-7" full @click="openDialogAndAddNew()">
      {{ t("Buttons.AddNew") }}
    </InputBtn>
    <section v-if="matchings?.length">
      <div
        v-for="(subtask, i) of matchings"
        :key="i"
        class="p-4 xl:p-5 bg-secondary mb-4 rounded-md"
      >
        <article class="flex justify-between gap-4">
          <p class="clamp line-1 tight sm:pr-3 md:pr-5 md:w-4/5 lg:w-2/3">
            {{ t("Headings.Matching") }} {{ subtask?.left.length ?? "" }} x
            {{ subtask?.left.length ?? "" }}
          </p>

          <div class="flex gap-3 items-center">
            <TrashIcon
              @click="fnDeleteSubtask(subtask?.id)"
              class="h-5 w-5 cursor-pointer text-accent"
            />
            <EyeIcon
              @click="openDialogCreateMatching(subtask)"
              class="h-5 w-5 cursor-pointer text-accent"
            />
          </div>
        </article>
      </div>
    </section>
    <p
      class="border border-accent rounded-md w-full p-5 text-xl text-center"
      v-else
    >
      {{ t("Headings.EmptyMatchings") }}
    </p>
    <div>
      <DialogSlot
        v-if="dialogCreateMatching"
        :label="'Headings.Matching'"
        :propClass="'modal-width-lg '"
        :show="dialog"
        @closeFunction="(dialogCreateMatching = false), (matching = null)"
      >
        <LazyFormMatching :data="propData" :taskId="taskId" />
      </DialogSlot>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useDialogSlot } from "~~/composables/dialogSlot";
import { useI18n } from "vue-i18n";
import { TrashIcon, EyeIcon } from "@heroicons/vue/24/outline";
import type { matching } from "~/types/matching";

const props = defineProps({
  matchings: { type: Array as PropType<any>, default: [] },
  taskId: { type: String, default: "" },
});

const { t } = useI18n();
const dialog = useDialogSlot();
const dialogCreateMatching = useDialogCreateMatching();
const propData = ref();
const matching: Ref<matching | null> = useMatching();

function openDialogCreateMatching(subtask: any) {
  propData.value = subtask;
  dialog.value = true;
  dialogCreateMatching.value = true;
}

function openDialogAndAddNew() {
  propData.value = null;
  dialog.value = true;
  dialogCreateMatching.value = true;
}

function fnDeleteSubtask(id: string) {
  openDialog(
    "info",
    "Headings.DeleteMatching",
    "Body.DeleteMatching",
    false,
    {
      label: "Buttons.DeleteMatching",
      onclick: async () => {
        const [success, error] = await deleteMatching(props.taskId, id);

        if (success) {
          setTimeout(() => {
            openSnackbar("success", "Success.DeleteMatching");
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

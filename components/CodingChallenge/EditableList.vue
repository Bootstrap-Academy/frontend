<template>
  <section>
    <InputBtn class="my-7" full @click="openDialogAndAddNew()">{{
      t("Buttons.AddNew")
    }}</InputBtn>

    <div v-if="codingChallenges.length">
      <section
        v-for="(codingChallenge, i) of codingChallenges"
        :key="i"
        class="p-4 xl:p-5 bg-secondary mb-4 rounded-md"
      >
        <article class="flex justify-between gap-4">
          <p class="clamp line-1 tight sm:pr-3 md:pr-5 md:w-4/5 lg:w-2/3">
            {{ codingChallenge.description }}
          </p>
          <article class="flex gap-3 items-center">
            <TrashIcon
              @click="deleteItem(codingChallenge?.id)"
              class="h-5 w-5 cursor-pointer text-accent"
            />
            <PencilSquareIcon
              v-if="!!user?.admin"
              @click="openDialogCreate(codingChallenge)"
              class="h-5 w-5 cursor-pointer text-accent"
            />
            <EyeIcon
              v-else-if="!user?.admin"
              @click="openDialogCreate(codingChallenge)"
              class="h-5 w-5 cursor-pointer text-accent"
            />
          </article>
        </article>

        <section class="flex gap-10 mt-4">
          <div class="flex gap-2">
            <p class="text-sm">{{ $t("Headings.Coins") }} :</p>
            <p class="text-accent text-sm">{{ codingChallenge?.coins }}</p>
          </div>

          <div class="flex gap-2">
            <p class="text-sm">{{ $t("Headings.XP") }} :</p>
            <p class="text-accent text-sm">{{ codingChallenge?.xp }}</p>
          </div>
        </section>
      </section>
    </div>

    <div v-else-if="!codingChallenges.length">
      <p class="border border-accent rounded-md w-full p-5 text-xl text-center">
        {{ t("Headings.EmptyCodingChallenge") }}
      </p>
    </div>

    <div>
      <DialogSlot
        v-if="dialogCreateCodingChallenge"
        :label="'Headings.CodingChallenge'"
        :propClass="'modal-width-lg lg:modal-width-md'"
        :show="dialogSlot"
        @closeFunction="dialogCreateCodingChallenge = false"
      >
        <LazyFormCodingChallenge
          :propData="propData"
          :challengeId="challengeId"
        />
      </DialogSlot>
    </div>
  </section>
</template>

<script lang="ts">
import {
  PencilIcon,
  TrashIcon,
  LockClosedIcon,
  LockOpenIcon,
  EyeIcon,
  PencilSquareIcon,
} from "@heroicons/vue/24/outline";
import type { PropType } from "vue";
import { useDialogSlot } from "../../composables/dialogSlot";

import { useI18n } from "vue-i18n";

export default {
  props: {
    codingChallenges: { type: Array as PropType<any>, default: [] },
    challengeId: { type: String, default: null },
  },

  setup(props) {
    const { t } = useI18n();
    const user: any = useUser();
    const dialogSlot = useDialogSlot();
    const dialogCreateCodingChallenge = useDialogCreateCodingChallenge();
    const propData: any = ref();
    function deleteItem(id: any) {
      console.log("delete", id, props.challengeId);
      openDialog(
        "warning",
        "Headings.DeleteCodingChallenge",
        "Body.DeleteCodingChallenge",
        false,
        {
          label: "Buttons.Delete",
          onclick: async () => {
            const [success, error] = await deleteCodingChallenge(
              props.challengeId,
              id
            );
            success ? deleteSuccess(success) : deleteError(error);
          },
        },
        {
          label: "Buttons.Cancel",
          onclick: () => {},
        }
      );
    }

    function deleteSuccess(res: any) {
      openSnackbar("success", "Success.DeletedCodingChallenge");
      console.log("success");
    }

    function deleteError(res: any) {
      openSnackbar("error", res?.detail ?? "");
    }
    function openDialogCreate(codingChallenge: any) {
      propData.value = codingChallenge;
      dialogSlot.value = true;
      dialogCreateCodingChallenge.value = true;
    }
    function openDialogAndAddNew() {
      propData.value = null;
      dialogSlot.value = true;
      dialogCreateCodingChallenge.value = true;
    }
    return {
      deleteItem,
      dialogSlot,
      dialogCreateCodingChallenge,
      openDialogCreate,
      t,
      propData,
      openDialogAndAddNew,
      user,
    };
  },
  components: {
    PencilIcon,
    TrashIcon,
    LockClosedIcon,
    LockOpenIcon,
    EyeIcon,
    PencilSquareIcon,
  },
};
</script>

<style lang="scss" scoped></style>

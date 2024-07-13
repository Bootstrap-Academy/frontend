<template>
  <div>
    <Modal v-if="show">
      <Dialog :dialog="dialog">
        <template #content="{ t }">
          <p class="text-body-1 text-body font-body m-0 mt-box">
            {{ currentDialogData!.message! }}
            <NuxtLink :to="currentDialogData!.link_url!" class="underline-link w-fit inline-block">
              {{ t("Buttons.Continue") }}
            </NuxtLink>
          </p>
        </template>
      </Dialog>
    </Modal>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from "vue";

export default defineComponent({
  props: {
    codingChallengeId: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const show = ref(true);
    const route = useRoute();
    const router = useRouter();

    const completedDialogData = [
      {
        codingChallengeId: "6f6dc9f1-984f-4bcc-b693-5b6ea41910cd",
        title: "Du hast die Challenge geschafft!",
        message: "Klicke, um weiterzukommen: ",
        link_url: "/challenges/leader-board",
      }
    ];

    const currentDialogData = computed(() => {
      return completedDialogData.find(
        (data) => data.codingChallengeId === props.codingChallengeId
      );
    });

    if (!currentDialogData.value) show.value = false;

    const dialog = computed(() => {
      return {
        type: "info",
        heading: currentDialogData.value!.title!,
        body: "",
        primaryBtn: {
          label: "Buttons.Continue",
          onclick: () => router.push(currentDialogData.value?.link_url!),
        },
        secondaryBtn: {
          label: "Buttons.Close",
          onclick: () => show.value = false,
        },
      };
    });

    return { show, dialog, route, currentDialogData };
  },
});
</script>

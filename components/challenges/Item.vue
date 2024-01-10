<template>
  <section
    :id="activeChallenge == data.id ? activeChallenge : 'none'"
    ref="item"
    class="box px-4 xl:px-5 style-box bg-secondary"
  >
    <header
      class="grid gap-card grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] cursor-pointer"
      @click="toggleShowChallengeContent"
    >
      <h2 class="!m-0 text-heading-3">{{ t(data?.title ?? "") }}</h2>

      <ChallengesItemProgress :data="data" />

      <!-- <p class="!m-0 text-right">
        {{ data?.points?.current ?? 0 }} / {{ data?.points?.total ?? 10 }}
      </p> -->
    </header>

    <div
      v-show="showChallengeContent"
      class="grid gap-card grid-cols-1 pt-card-sm"
    >
      <div class="flex flex-wrap gap-card">
        <Btn @click="propId = challenge" class="w-fit" :icon="CodeBracketIcon">
          {{ t("Buttons.Solve") }}
        </Btn>

        <!-- <NuxtLink :to="editTo" v-if="data?.creator == user.id || !!user.admin"> -->
        <NuxtLink :to="editTo" v-if="!!user.admin">
          <Btn secondary class="w-fit" :icon="PencilIcon">
            {{ t("Buttons.EditChallenge") }}
          </Btn>
        </NuxtLink>
      </div>
      <LazyCodingChallengeList
        :showInnerBorder="true"
        :taskId="activeChallenge"
        class="h-72"
        v-if="!!propId"
        :id="propId"
      />
      <ChallengesItemDescription :data="data" />
      <!-- <ChallengesItemLimits :data="data" /> -->
      <!-- <ChallengesItemExamples :data="data" /> -->
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";
import {
  CodeBracketIcon,
  TrophyIcon,
  TrashIcon,
} from "@heroicons/vue/24/outline";
import type { PropType } from "vue";
import { PencilIcon } from "@heroicons/vue/24/solid";

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  components: { TrophyIcon, CodeBracketIcon, PencilIcon, TrashIcon },
  setup(props) {
    const user: any = useUser();
    const { t } = useI18n();

    const propId: any = ref("");
    const item = ref();

    const router = useRouter();
    const route = useRoute();

    const challenge = computed(() => {
      return props.data?.id ?? "";
    });

    const activeChallenge: any = computed(() => {
      return route.query?.challenge ?? "";
    });

    const showChallengeContent = computed(() => {
      return activeChallenge.value == challenge.value;
    });

    const baseQuery: any = computed(() => {
      return {
        category: route.query?.category ?? "",
      };
    });

    const editTo = computed(() => {
      return `/challenges/edit-${activeChallenge.value}?category=${baseQuery.value.category}`;
    });

    function toggleShowChallengeContent() {
      router.replace({
        path: route.path,
        query: showChallengeContent.value
          ? {
            ...baseQuery.value,
          }
          : {
            ...baseQuery.value,
            challenge: challenge.value,
          },
      });
    }

    watch(
      () => activeChallenge.value,
      () => {
        propId.value = "";

        const eleme = document.getElementById(activeChallenge.value);
        console.log("elelele", eleme);
        console.log("tiem.value", item.value?.id);
        eleme?.scrollIntoView({
          behavior: "smooth",
        });
      },
      { deep: true, immediate: true }
    );

    return {
      t,
      showChallengeContent,
      toggleShowChallengeContent,
      CodeBracketIcon,
      PencilIcon,
      editTo,
      user,
      baseQuery,
      TrashIcon,
      propId,
      challenge,
      activeChallenge,
      item,
    };
  },
});
</script>

<style scoped></style>

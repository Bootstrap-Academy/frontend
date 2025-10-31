<template>
  <section>
    <header
      class="flex cursor-pointer flex-col justify-between gap-card md:flex-row"
      @click="toggleShowChallenges()"
    >
      <div>
        <h2 class="text-heading-2">{{ data?.title ?? "" }}</h2>
        <p>{{ data?.description ?? "" }}</p>
      </div>

      <!-- <p>{{ data?.points?.current ?? 0 }} / {{ data?.points?.total ?? 10 }}</p> -->
      <p
        v-if="categoryStats?.total > 0"
        class="h-7 min-w-[200px] flex-shrink-0 rounded-full px-3.5 py-1 text-sm text-[#dfdede]"
        :style="{ background: progressBar }"
      >
        {{ t(progress >= 100 ? "Headings.Completed" : "Headings.Untried") }}

        <span v-if="progress < 100">
          : {{ categoryStats?.unattempted }} / {{ categoryStats?.total }}</span
        >
      </p>
      <p v-else>
        {{ t("Headings.Empty") }}
      </p>
    </header>

    <NuxtLink :to="`/challenges/${data?.id ?? ''}/create`" v-if="user?.admin">
      <Btn :icon="PlusIcon" class="mt-box" sm>
        {{ t("Buttons.AddChallenge") }}
      </Btn>
    </NuxtLink>

    <div class="grid grid-cols-1 gap-box pt-box" v-show="showChallenges">
      <div v-if="loading" class="box bg-secondary px-4 style-box xl:px-5">
        <header
          class="grid cursor-pointer grid-cols-1 gap-card sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
        >
          <h2 class="text-heading-3 mt-1.5">
            <SkeletonText />
          </h2>

          <SkeletonText class="mt-1.5 h-4 w-32 min-w-[8rem] max-w-[8rem]" body />

          <p class="!m-0 flex w-fit items-center gap-2 place-self-end text-right">
            <SkeletonText class="h-5 w-10 min-w-[2.5rem] max-w-[2.5rem]" />
            /
            <SkeletonText class="h-5 w-10 min-w-[2.5rem] max-w-[2.5rem]" body />
          </p>
        </header>
      </div>

      <template v-else-if="challenges && challenges.length > 0">
        <ChallengesItem v-for="challenge of challenges" :key="challenge.id" :data="challenge" />
      </template>

      <p v-else class="w-fit px-4 py-2 text-warning bg-warning-light style-box">
        {{ t("Error.NoChallengesAvailable") }}
      </p>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";
import { PlusIcon, TrophyIcon } from "@heroicons/vue/24/outline";
import type { PropType } from "vue";

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
    xp: { type: Object, default: null },
  },
  components: { TrophyIcon, PlusIcon },

  setup(props) {
    const { t } = useI18n();
    const user: any = useUser();
    const challenges: any[] = reactive([]);
    const categoryStats: any = ref();
    const loading = ref(challenges.length <= 0);

    onMounted(async () => {
      const [success, error] = await getChallengesByCategory(props.data?.id ?? "");
      console.log("error", error);
      const [statsSuccess, statsError] = await getStatsCategoryWiseForCodingChallenges(
        props.data?.id ?? ""
      );
      loading.value = false;
      Object.assign(challenges, success ? success : []);
      categoryStats.value = statsSuccess ? statsSuccess : null;
    });

    const progress = computed(() => {
      return (categoryStats?.value?.solved / categoryStats?.value?.total ?? 1) * 100;
    });

    const progressBar = computed(() => {
      return `linear-gradient(to right, #177edc 0%, #177edc ${progress.value}%, #177ddc58 ${progress.value}%,  #177ddc58 100%)`;
    });

    const router = useRouter();
    const route = useRoute();

    const category = computed(() => {
      return props.data?.id ?? "";
    });

    const activeCategory = computed(() => {
      return (route.query?.category ?? "").toString();
    });

    const showChallenges = computed(() => {
      return activeCategory.value == category.value;
    });

    const canCreate = computed(() => {
      return props.xp?.total_level >= 20;
    });

    function toggleShowChallenges() {
      router.replace({
        path: route.path,
        query: showChallenges.value
          ? {}
          : {
              category: category.value,
            },
      });
    }

    return {
      t,
      loading,
      challenges,
      showChallenges,
      toggleShowChallenges,
      canCreate,
      PlusIcon,
      user,
      categoryStats,
      progress,
      progressBar,
    };
  },
});
</script>

<style scoped></style>

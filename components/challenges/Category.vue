<template>
  <section>
    <header
      class="flex flex-col md:flex-row gap-card justify-between cursor-pointer"
      @click="toggleShowChallenges()"
    >
      <div>
        <h2 class="text-heading-2">{{ data?.title ?? "" }}</h2>
        <p>{{ data?.description ?? "" }}</p>
      </div>

      <!-- <p>{{ data?.points?.current ?? 0 }} / {{ data?.points?.total ?? 10 }}</p> -->
      <p
        v-if="categoryStats?.total > 0"
        class="rounded-full text-sm py-1 px-3.5 text-[#dfdede] flex-shrink-0 min-w-[200px] h-7"
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

    <div class="grid gap-box grid-cols-1 pt-box" v-show="showChallenges">
      <div v-if="loading" class="box px-4 xl:px-5 style-box bg-secondary">
        <header
          class="grid gap-card grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] cursor-pointer"
        >
          <h2 class="mt-1.5 text-heading-3">
            <SkeletonText />
          </h2>

          <SkeletonText
            class="min-w-[8rem] w-32 max-w-[8rem] h-4 mt-1.5"
            body
          />

          <p
            class="!m-0 text-right flex items-center gap-2 w-fit place-self-end"
          >
            <SkeletonText class="min-w-[2.5rem] w-10 max-w-[2.5rem] h-5" />
            /
            <SkeletonText class="min-w-[2.5rem] w-10 max-w-[2.5rem] h-5" body />
          </p>
        </header>
      </div>

      <template v-else-if="challenges && challenges.length > 0">
        <ChallengesItem
          v-for="challenge of challenges"
          :key="challenge.id"
          :data="challenge"
        />
      </template>

      <p v-else class="py-2 px-4 text-warning style-box bg-warning-light w-fit">
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
      const [success, error] = await getChallengesByCategory(
        props.data?.id ?? ""
      );
      console.log("error", error);
      const [statsSuccess, statsError] =
        await getStatsCategoryWiseForCodingChallenges(props.data?.id ?? "");
      loading.value = false;
      Object.assign(challenges, success ? success : []);
      categoryStats.value = statsSuccess ? statsSuccess : null;
    });

    const progress = computed(() => {
      return (
        (categoryStats?.value?.solved / categoryStats?.value?.total ?? 1) * 100
      );
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

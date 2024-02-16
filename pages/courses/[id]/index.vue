<!--
✅ Responsive UI
✅ Page Title
✅ Translation
❌ Animation
✅ middleware

❌ Tested on chrome
❌ Tested on firefox
❌ Tested on safari
❌ Tested on android mobile
❌ Tested on apple mobile

✅ Handle loading if data already exists
✅ Handle loading if data is empty
✅ Display data
✅ Handle empty state

✅ Api implemented
-->

<template>
	<CourseSkeleton v-if="loading" />

	<main
		v-else-if="course"
		class="relative container-fluid h-screen-main min mt-main mb-main"
	>
		<Head>
			<Title>Course Details - {{ course?.title ?? "" }}</Title>
		</Head>

		<CourseHeader :data="course" />

		<CourseDetails :data="course" />

		<CourseOverview
			:skillID="skillID"
			:subSkillID="subSkillID"
			:data="course"
			:isCourseAccessible="isCourseAccessible"
			class="md:sticky md:top-container md:self-start"
		/>

		<section>
			<h2 class="mb-box text-heading-3">
				{{ t("Headings.CourseCurriculum") }}
			</h2>

      <div class="card style-card bg-secondary">
        <CourseCurriculum
          :data="course"
          :skillID="skillID"
          :subSkillID="subSkillID"
          :isCourseAccessible="isCourseAccessible"
          @watch="watchThisLecture($event)"
        />
      </div>
    </section>
    <div
      class="content-container"
      :class="{
        'hide-scrollbar': !!!allQuizzes || allQuizzes.length <= 1,
      }"
    >
      <InputButtonToggle
        :buttonOptions="buttonOptions"
        v-model="selectedbutton"
        class="my-10"
      />
      <section v-if="allQuizzes && !!allQuizzes.length">
        <article v-show="selectedbutton == 0">
          <h2 class="mb-box text-heading-3">
            {{ t("Headings.QuizzesInCourse") }}
          </h2>

            <QuizList :quizzes="allQuizzes" />
        </article>

        <article v-show="selectedbutton == 1">
          <h2 class="mb-box text-heading-3">
            {{ t("Headings.Matchings") }}
          </h2>

          <div class="content" v-for="(quiz, i) of allQuizzes" :key="i">
            <MatchingList :quizId="quiz?.id" />
          </div>
        </article>
      </section>
      <h3 v-else class="text-center text-heading-3">
        {{ t("Headings.NoQuizQuestion") }}
      </h3>
    </div>
  </main>

	<CourseEmptyState v-else />
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import type { Quiz } from "~/types/courseTypes";
definePageMeta({
  middleware: ["auth"],
});

export default {
  head: {
    title: "Course Details",
  },
  setup() {
    const { t } = useI18n();

    const loading = ref(true);
    const course = useCourse();
    const isCourseAccessible = ref(false);

    let buttonOptions: any = [
      // { name: "Buttons.SeasonalBased" },
      { name: "Buttons.Quiz" },
      { name: "Buttons.Matchings" },
    ];
    const selectedbutton = ref(0);

    const allQuizzes = useQuizzesInCourse();
    const route = useRoute();
    const router = useRouter();

    const id = computed(() => {
      return <string>(route.params?.id ?? "");
    });

    const skillID = computed(() => {
      return <string>(route.query?.skillID ?? "");
    });

    const subSkillID = computed(() => {
      return <string>(route.query?.subSkillID ?? "");
    });

    onMounted(async () => {
      if (!!!id.value) {
        loading.value = false;
        return;
      }
      const [success, error] = await getCourseByID(id.value);

      if (error) {
        console.log("error in");
        openSnackbar("error", error.detail);
        await getCourseSummaryByID(id.value);
      } else {
        isCourseAccessible.value = true;
      }
      // await getQuizInfos();
      await getQuizzes(course.value.id)

      loading.value = false;
    });

    function watchThisLecture({ sectionID, lectureID }: any) {
      router.push({
        path: `${route.path}/watch`,
        query: {
          section: sectionID,
          lecture: lectureID,
          skillID: skillID.value,
          subSkillID: subSkillID.value,
        },
      });
    }

    return {
      loading,
      course,
      t,
      isCourseAccessible,
      watchThisLecture,
      skillID,
      allQuizzes,
      subSkillID,
      buttonOptions,
      selectedbutton,
    };
  },
};
</script>

<style scoped>
	main {
		@apply grid gap-container grid-cols-1 md:grid-cols-[1fr_275px] xl:grid-cols-[1fr_350px] place-content-start;

		grid-template-areas:
			"header"
			"overview"
			"details"
			"curriculum";
	}

	main > *:nth-child(1) {
		grid-area: header;
	}

	main > *:nth-child(2) {
		grid-area: details;
	}

	main > *:nth-child(3) {
		grid-area: overview;
	}

	main > *:nth-child(4) {
		grid-area: curriculum;
	}

	@media screen and (min-width: 768px) {
		main {
			grid-template-areas:
				"header header"
				"details overview"
				"curriculum overview";
		}
	}
</style>

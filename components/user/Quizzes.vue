<template>
  <section>
    <SectionTitle
      sub
      :heading="header.heading"
      :body="header.body"
      :link="header.link"
    />

    <div class="grid grid-cols-1 gap-card-sm">
      <template v-if="loading">
        <QuizCardSkeleton v-for="n in 3" :key="n" />
      </template>

      <template v-else-if="quizzes && quizzes.length > 0">
        <NuxtLink
          v-for="(quiz, i) of quizzes"
          :key="i"
          :to="`/quizzes/edit-${quiz.id}`"
        >
          <QuizCard :data="quiz" />
        </NuxtLink>
      </template>

      <template v-else>
        <QuizCardSkeleton class="child opacity-60" no-animate />
        <QuizCardSkeleton class="child opacity-40" no-animate />
        <QuizCardSkeleton class="child opacity-20" no-animate />
      </template>

      <!-- <NuxtLink v-if="!loading" to="/quizzes/create">
				<Btn class="w-fit">
					{{ t('Buttons.CreateQuizQuestion') }}
				</Btn>
			</NuxtLink> -->
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  setup() {
    const { t } = useI18n();

    const loading = ref(true);

    const quizzes = useQuizzes();

    const header = reactive({
      heading: "Headings.MyQuizQuestions",
      body: "Body.MyQuizQuestions",
      link: { to: "/profile/quizzes", text: "Buttons.ViewAll" },
    });

    onMounted(async () => {
      await getQuizzes();
      loading.value = false;

      if (quizzes.value && quizzes.value.length <= 0) {
        Object.assign(header, {
          heading: "EmptyStates.MyQuizQuestions.Heading",
          body: "EmptyStates.MyQuizQuestions.Body",
        });
      }
    });

    return { t, loading, quizzes, header };
  },
});
</script>

<style scoped></style>

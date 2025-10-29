<template>
  <div>
    <main class="container mt-card-sm pb-card">
      <div class="flex justify-center">
        <div class="mb-8 flex max-w-max flex-col items-center">
          <div
            class="mb-4 flex w-full items-center justify-center bg-secondary px-4 py-2 style-box md:px-6 md:py-3"
          >
            <template v-for="(path, i) of breadcrumbs" :key="i">
              <NuxtLink v-if="path.to" :to="path.to" class="text-body-2 inline-block">
                {{ t(path.label) }}
              </NuxtLink>
              <h1 v-else class="text-heading-2 inline-block capitalize">
                {{ t(path.label) }}
              </h1>
              <span v-if="i < breadcrumbs.length - 1" class="mx-3 text-accent"> / </span>
            </template>
          </div>

          <div
            v-if="quizzesToShow.length > 0 || selectedOption != 0"
            class="flex w-full justify-center"
          >
            <InputButtonToggle
              :mobileResponsive="true"
              v-model="selectedOption"
              :buttonOptions="buttonOptions"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <div class="flex max-md:flex-col max-md:items-center">
        <div class="w-full md:w-3/5 lg:w-2/5">
          <div
            class="mb-2 flex justify-center text-xs md:pt-8"
            v-if="!!arrayOfSubtasks.length && !!quizzesToShow?.length"
          >
            <p v-if="selectedOption === 0">
              <span class="text-accent">{{ t("Headings.SolvedQuizzes") }}</span
              >:
              {{
                t("Headings.AmountSolvedQuizzes", {
                  amount: arrayOfSubtasks.filter((quiz: any) => !quiz.solved).length,
                  total: arrayOfSubtasks?.length,
                })
              }}
            </p>
            <p v-else-if="selectedOption === 1">
              <span class="text-accent">{{ t("Headings.UnsolvedQuizzes") }}</span
              >:
              {{ quizzesToShow?.length }}
            </p>
            <p v-else-if="selectedOption === 2">
              <span class="text-accent">{{ t("Headings.SolvedQuizzes") }}</span
              >:
              {{ quizzesToShow?.length }}
            </p>
            <p v-else-if="selectedOption === 3">
              <span class="text-accent">{{ t("Headings.OwnQuizzes") }}</span
              >:
              {{ quizzesToShow?.length }}
            </p>
          </div>

          <aside
            class="grid h-fit max-h-[600px] gap-4 overflow-auto p-2"
            v-if="quizzesToShow.length"
          >
            <template v-if="loading">
              <QuizCardSkeleton v-for="n in 9" :key="n" class="w-full" />
            </template>

            <template v-else-if="quizzesToShow && quizzesToShow.length">
              <div class="grid max-h-fit gap-card">
                <MatchingCard
                  :id="querySubTaskId == quiz.id ? querySubTaskId : 'none'"
                  class="max-h-fit"
                  :class="quiz?.id == selectedQuiz?.id ? 'border border-accent' : ''"
                  v-for="(quiz, i) of sortMatchings()"
                  :key="i"
                  full
                  :data="quiz"
                  @click="solveThis(quiz)"
                />
              </div>
            </template>
          </aside>
        </div>
        <FormSolveMatching
          v-if="(quizzesToShow.length && !!selectedQuiz) || loading"
          :data="selectedQuiz"
          @rated="setRatedLocally($event)"
          @solved="setSolvedLocally($event)"
          @nextQuestion="nextQuestion($event)"
          class="w-full md:w-2/5 lg:w-3/5"
        />
      </div>
    </main>
    <div
      v-if="
        !loading &&
        quizzesToShow.length > 0 &&
        arrayOfSubtasks.filter((quiz: any) => !quiz.solved).length == 0
      "
    >
      <CheckCircleIcon class="mx-auto mb-8 h-20 w-20 text-accent" />
      <p class="mb-20 w-full text-center text-xl">
        {{ t("Headings.AllSolved") }}
      </p>
    </div>
    <div v-else-if="!loading && quizzesToShow.length == 0">
      <MagnifyingGlassCircleIcon class="mx-auto mb-8 h-20 w-20 text-accent" />
      <p class="mb-20 w-full text-center text-xl">
        {{
          t(
            selectedOption == 0 ? "Headings.EmptyTasksForThis" : "Headings.EmptyTasksForThisFilter",
            {
              placeholder: t(notFoundFor),
              filter: t(buttonOptions[selectedOption].name),
              type: t("Headings.Matchings"),
            }
          )
        }}
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  getQuizzesInCourse,
  getSubTasksInQuiz,
  useQuizzes,
  getQuizzesInSkill,
} from "~~/composables/quizzes";
import { useI18n } from "vue-i18n";
import { CheckCircleIcon, MagnifyingGlassCircleIcon } from "@heroicons/vue/24/outline";

const route = useRoute();
const router = useRouter();
const quizzes: any = useQuizzes();
const selectedQuiz = ref();
const loading = ref(true);
const user: any = useUser();
const selectedOption = ref(0);
const { t } = useI18n();
const quizzesToShow: any = ref([]);
let arrayOfSubtasks: any = ref([]);
const buttonOptions = [
  { name: "Buttons.All" },
  { name: "Buttons.UnSolved" },
  { name: "Buttons.Solved" },
  { name: "Buttons.Own" },
];

const id: any = computed(() => route?.params?.id ?? "");
const querySubTaskId: any = computed(() => route.query?.querySubTaskId ?? "");
const taskId = computed(() => route.query?.taskId ?? "");
const quizzesFrom = computed(() => route?.query?.quizzesFrom ?? "no found");
const rootSkillID = computed(() => route?.query?.rootSkillID ?? "");
const subSkillID = computed(() => route?.query?.subSkillID ?? "");

const notFoundFor = computed(() => {
  if (quizzesFrom.value == "course") {
    return "Headings.Course";
  } else if (quizzesFrom.value == "skill") {
    return "Headings.Skill";
  } else if (quizzesFrom.value == "quiz") {
    return "Headings.Quiz";
  } else {
    return "Headings.Lecture";
  }
});

function setSolvedLocally(id: any) {
  arrayOfSubtasks.value.forEach((element: any) => {
    if (element.id == id) {
      element.solved = true;
    }
  });
}

function setRatedLocally(id: any) {
  arrayOfSubtasks.value.forEach((element: any, i: any) => {
    if (element.id == id) {
      element.rated = true;
    }
  });
}

const breadcrumbs = computed<Array<{ label: string; to?: string }>>(() => {
  let quizLabel = { label: "Headings.Matchings" };
  let hasRootAndSubSkill = rootSkillID.value && subSkillID.value;

  if (quizzesFrom.value === "course" && hasRootAndSubSkill) {
    return [
      {
        label: id.value,
        to: `/courses/${id.value}?skillID=${rootSkillID.value}&subSkillID=${subSkillID.value}`,
      },
      quizLabel,
    ];
  }

  if ((quizzesFrom.value === "skill" || quizzesFrom.value === "quiz") && hasRootAndSubSkill) {
    return [
      {
        label: subSkillID.value,
        to: `/skill-tree/${rootSkillID.value}/${subSkillID.value}`,
      },
      quizLabel,
    ];
  }

  return [quizLabel];
});

function nextQuestion(id: any) {
  console.log("next");
  let index = 0;
  arrayOfSubtasks.value.forEach((element: any, i: any) => {
    if (element.id == id) {
      console.log("inside index", id);
      index = i;
    }
  });

  for (let i = index; i < arrayOfSubtasks?.value?.length; i++) {
    if (
      !arrayOfSubtasks?.value[i]?.solved &&
      !isQuizOwner(arrayOfSubtasks?.value[i]) &&
      i != index
    ) {
      console.log("next quiz id", arrayOfSubtasks.value[i].creator);
      console.log("user id", user.value?.id);
      solveThis(arrayOfSubtasks.value[i]);

      break;
    }
    console.log("after");
  }
}

function solveThis(quiz: any) {
  if (quizzesFrom.value == "course" || quizzesFrom.value == "skill") {
    router.replace({
      path: route.path,
      query: {
        quizzesFrom: quizzesFrom.value,
        querySubTaskId: quiz.id,
        taskId: quiz.task_id,
        rootSkillID: rootSkillID.value,
        subSkillID: subSkillID.value,
      },
    });
  } else {
    router.replace({
      path: route.path,
      query: {
        quizzesFrom: quizzesFrom.value,
        querySubTaskId: quiz.id,
        taskId: quiz.task_id,
      },
    });
  }
  selectedQuiz.value = quiz;
}

async function manageAllDataForQuizzes() {
  if (!!querySubTaskId.value && !!taskId.value) {
    const [success, error] = await getMatching(querySubTaskId.value, taskId.value);
    if (success) selectedQuiz.value = success;
  }

  if (quizzesFrom.value == "course") {
    await getQuizzesInCourse(id.value);
  } else if (quizzesFrom.value == "skill") {
    await getQuizzesInSkill(id.value);
  } else if (quizzesFrom.value == "quiz") {
    await getSubTasksInQuiz(id.value);
  }

  if (quizzesFrom.value == "quiz") {
    const subtasks = useSubTasksInQuiz();
    arrayOfSubtasks.value = subtasks.value;
    quizzesToShow.value = subtasks.value;
    loading.value = false;
    return;
  }

  if (!quizzes.value.length) {
    loading.value = false;
    return;
  }

  arrayOfSubtasks.value = [];
  await Promise.all(
    quizzes.value.map(async (quiz: any) => {
      const [res, error] = await getMatchingsInTask(quiz?.id ?? "");
      if (!!res) {
        res.forEach((element: any) => {
          arrayOfSubtasks.value.push(element);
          quizzesToShow.value.push(element);
        });
      }
    })
  );
  loading.value = false;
  scroolToView();
}

function isQuizOwner(quiz: { creator: string }) {
  return quiz.creator === user.value?.id;
}

function sortMatchings() {
  return quizzesToShow.value.sort(
    (
      prevItem: { solved: boolean; creator: string },
      nextItem: { solved: boolean; creator: string }
    ) => {
      const prevSolved = prevItem.solved;
      const nextSolved = nextItem.solved;
      const prevOwn = isQuizOwner(prevItem);
      const nextOwn = isQuizOwner(nextItem);

      // Tasks not created by me come first
      if (prevOwn !== nextOwn) return prevOwn ? 1 : -1;

      // Then, unsolved tasks come first
      if (prevSolved !== nextSolved) return prevSolved ? 1 : -1;

      return 0;
    }
  );
}

watch(selectedOption, (selectedOptionValue) => {
  switch (selectedOptionValue) {
    case 0: // All
      quizzesToShow.value = arrayOfSubtasks.value;
      break;
    case 1: // Unsolved
      quizzesToShow.value = arrayOfSubtasks.value.filter(
        (quiz: { solved: boolean; creator: string }) => !quiz.solved && !isQuizOwner(quiz)
      );
      break;
    case 2: // Solved
      quizzesToShow.value = arrayOfSubtasks.value.filter(
        (quiz: { solved: boolean; creator: string }) => quiz.solved && !isQuizOwner(quiz)
      );
      break;
    case 3: // Own
      quizzesToShow.value = arrayOfSubtasks.value.filter(
        (quiz: { solved: boolean; creator: string }) => isQuizOwner(quiz)
      );
      break;
  }
});

function scroolToView() {
  setTimeout(() => {
    let eleme = document.getElementById(querySubTaskId.value);
    eleme?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 0);
}

onMounted(async () => {
  manageAllDataForQuizzes();
});
</script>

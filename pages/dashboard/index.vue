<template>
  <main class="character-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">{{ t("CharacterDashboard.Eyebrow") }}</p>
        <h1>{{ t("CharacterDashboard.Title") }}</h1>
      </div>
      <NuxtLink to="/profile/edit" class="quiet-link edit-profile">
        <PencilSquareIcon aria-hidden="true" />
        {{ t("CharacterDashboard.EditProfile") }}
      </NuxtLink>
    </header>

    <div class="character-sheet">
      <section class="identity-panel" :aria-label="t('CharacterDashboard.Identity')">
        <div class="identity-heading">
          <span class="level-badge" v-if="view?.xp">
            {{
              view.xp.total_level > 0
                ? t("CharacterDashboard.Level", { level: view.xp.total_level })
                : t("CharacterDashboard.Starting")
            }}
          </span>
          <h2>{{ displayName }}</h2>
        </div>
        <div class="portrait-stage" aria-hidden="true">
          <div class="portrait-orbit orbit-one"></div>
          <div class="portrait-orbit orbit-two"></div>
          <CharacterPlaceholder class="character-figure" />
          <div class="portrait-ground"></div>
        </div>
        <div class="experience">
          <p class="eyebrow">{{ t("CharacterDashboard.Experience") }}</p>
          <template v-if="view?.xp">
            <p class="xp-total">{{ number(view.xp.total_xp) }} <span>XP</span></p>
            <progress
              :value="view.xp.progress"
              max="1"
              :aria-label="t('CharacterDashboard.NextLevel', { level: view.xp.total_level + 1 })"
            />
            <p class="progress-caption">
              {{ t("CharacterDashboard.NextLevel", { level: view.xp.total_level + 1 }) }}
            </p>
          </template>
          <div v-else-if="view?.errors.xp" class="inline-state" role="status">
            <p>{{ t("CharacterDashboard.ProgressError") }}</p>
            <button type="button" class="text-button" @click="reload">
              {{ t("CharacterDashboard.Retry") }}
            </button>
          </div>
          <p v-else class="inline-state" role="status">
            {{ t("CharacterDashboard.LoadingProgress") }}
          </p>
        </div>
      </section>

      <div class="learning-panel">
        <section class="next-step" aria-labelledby="next-step-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">{{ t("CharacterDashboard.NextStep") }}</p>
              <h2 id="next-step-title">{{ t("CharacterDashboard.KeepLearning") }}</h2>
            </div>
            <SparklesIcon class="section-symbol" aria-hidden="true" />
          </div>
          <label class="focus-label" for="character-focus">{{
            t("CharacterDashboard.Focus")
          }}</label>
          <div class="focus-control">
            <select
              id="character-focus"
              v-model="focus"
              :disabled="practiceBusy || view?.status === 'loading'"
            >
              <option value="">{{ t("CharacterDashboard.MixedFocus") }}</option>
              <option v-for="skill in view?.skills || []" :key="skill.id" :value="skill.id">
                {{ skill.name }}
              </option>
            </select>
            <ChevronDownIcon aria-hidden="true" />
          </div>
          <button
            type="button"
            class="practice-button"
            :disabled="!owner || practiceBusy"
            :aria-busy="practiceBusy"
            @click="startPractice"
          >
            <span>{{
              t(practiceBusy ? "CharacterDashboard.FindingPractice" : "CharacterDashboard.Practice")
            }}</span>
            <ArrowRightIcon aria-hidden="true" />
          </button>
          <p v-if="practiceMessage" class="practice-message" role="status">{{ practiceMessage }}</p>
        </section>

        <section class="skills-section" aria-labelledby="character-skills-title">
          <div class="section-heading skills-heading">
            <h2 id="character-skills-title">{{ t("CharacterDashboard.Skills") }}</h2>
            <NuxtLink to="/skill-tree" class="quiet-link"
              >{{ t("CharacterDashboard.Discover") }}<ArrowUpRightIcon aria-hidden="true"
            /></NuxtLink>
          </div>
          <div v-if="view?.errors.skills || view?.errors.xp" class="inline-state" role="status">
            <p>{{ t("CharacterDashboard.SkillsError") }}</p>
            <button type="button" class="text-button" @click="reload">
              {{ t("CharacterDashboard.Retry") }}
            </button>
          </div>
          <p v-else-if="!view || view.status === 'loading'" class="inline-state" role="status">
            {{ t("CharacterDashboard.LoadingSkills") }}
          </p>
          <div v-else-if="!activeSkills.length" class="fresh-start">
            <span class="fresh-symbol" aria-hidden="true">✦</span>
            <h3>{{ t("CharacterDashboard.FreshTitle") }}</h3>
            <p>{{ t("CharacterDashboard.FreshBody") }}</p>
          </div>
          <div v-else class="skill-list">
            <details
              v-for="skill in visibleSkills"
              :key="skill.id"
              class="skill"
              @toggle="onSkillToggle($event, skill.id)"
            >
              <summary>
                <span class="skill-initial" aria-hidden="true">{{ skill.name.slice(0, 1) }}</span>
                <span class="skill-overview">
                  <span class="skill-title"
                    ><strong>{{ skill.name }}</strong
                    ><span>{{
                      t("CharacterDashboard.Level", { level: skill.xp.level })
                    }}</span></span
                  >
                  <progress
                    :value="skill.xp.progress"
                    max="1"
                    :aria-label="
                      t('CharacterDashboard.SkillNextLevel', {
                        skill: skill.name,
                        level: skill.xp.level + 1,
                      })
                    "
                  />
                </span>
                <ChevronDownIcon class="skill-chevron" aria-hidden="true" />
              </summary>
              <div class="skill-details">
                <p class="skill-detail-heading">
                  <span>{{ number(skill.xp.xp) }} XP</span
                  ><span>{{
                    t("CharacterDashboard.NextLevel", { level: skill.xp.level + 1 })
                  }}</span>
                </p>
                <p
                  v-if="details[skill.id]?.status === 'loading'"
                  class="inline-state"
                  role="status"
                >
                  {{ t("CharacterDashboard.LoadingDetails") }}
                </p>
                <div
                  v-else-if="details[skill.id]?.status === 'error'"
                  class="inline-state"
                  role="status"
                >
                  <p>{{ t("CharacterDashboard.DetailsError") }}</p>
                  <button type="button" class="text-button" @click="loadDetails(skill.id)">
                    {{ t("CharacterDashboard.Retry") }}
                  </button>
                </div>
                <ul v-else-if="namedChildren(skill.xp).length" class="subskill-list">
                  <li v-for="child in namedChildren(skill.xp)" :key="child.skill">
                    <span>{{ child.name }}</span
                    ><span>{{ t("CharacterDashboard.Level", { level: child.level }) }}</span>
                  </li>
                </ul>
                <button
                  type="button"
                  class="text-button choose-focus"
                  :disabled="practiceBusy || focus === skill.id"
                  @click="chooseFocus(skill.id)"
                >
                  {{
                    t(
                      focus === skill.id
                        ? "CharacterDashboard.CurrentFocus"
                        : "CharacterDashboard.ChooseFocus"
                    )
                  }}<ArrowUpRightIcon v-if="focus !== skill.id" aria-hidden="true" />
                </button>
              </div>
            </details>
            <button
              v-if="activeSkills.length > 3"
              type="button"
              class="text-button more-skills"
              :aria-expanded="showAllSkills"
              @click="showAllSkills = !showAllSkills"
            >
              {{
                showAllSkills
                  ? t("CharacterDashboard.FewerSkills")
                  : t("CharacterDashboard.AllSkills", { count: activeSkills.length })
              }}<ChevronDownIcon :class="{ flipped: showAllSkills }" aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
    </div>

    <section
      v-if="view?.courses.length || view?.errors.courses"
      class="courses-section"
      aria-labelledby="character-courses-title"
    >
      <div class="section-heading">
        <h2 id="character-courses-title">{{ t("CharacterDashboard.Courses") }}</h2>
        <NuxtLink to="/profile/courses" class="quiet-link"
          >{{ t("CharacterDashboard.AllCourses") }}<ArrowUpRightIcon aria-hidden="true"
        /></NuxtLink>
      </div>
      <div v-if="view.errors.courses" class="inline-state" role="status">
        <p>{{ t("CharacterDashboard.CoursesError") }}</p>
        <button type="button" class="text-button" @click="reload">
          {{ t("CharacterDashboard.Retry") }}
        </button>
      </div>
      <div v-else class="course-list">
        <NuxtLink
          v-for="course in view.courses.slice(0, 3)"
          :key="course.id"
          :to="`/courses/${encodeURIComponent(course.id)}`"
          class="course-card"
        >
          <span class="course-symbol"><BookOpenIcon aria-hidden="true" /></span>
          <span class="course-copy"
            ><strong>{{ course.title }}</strong
            ><span v-if="course.completed">{{ t("CharacterDashboard.CourseCompleted") }}</span
            ><span v-else-if="course.totalLectures && course.completedLectures !== null">{{
              t("CharacterDashboard.CourseLectures", {
                done: course.completedLectures,
                total: course.totalLectures,
              })
            }}</span></span
          >
          <ArrowUpRightIcon class="course-arrow" aria-hidden="true" />
        </NuxtLink>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BookOpenIcon,
  ChevronDownIcon,
  PencilSquareIcon,
  SparklesIcon,
} from "@heroicons/vue/24/outline";
import { GET } from "~/composables/fetch";
import {
  createDashboardData,
  type DashboardSkillXP,
  type DashboardView,
} from "~/utils/dashboardData";

definePageMeta({ middleware: ["auth"] });
const { t, locale } = useI18n();
useHead(() => ({ title: t("CharacterDashboard.Title") }));
const router = useRouter();
const user = useUser();
const session = useSession();
const accessToken = useAccessToken();
const owner = computed(() =>
  accessToken.value && user.value?.id ? `${user.value.id}:${session.value?.id || "session"}` : null
);
const displayName = computed(
  () => user.value?.display_name?.trim() || user.value?.name?.trim() || t("CharacterDashboard.You")
);
const view = shallowRef<DashboardView | null>(null);
const data = createDashboardData({
  get: (path) => GET(path),
  changed: (next) => {
    view.value = next;
  },
});
const preference = useState("character-dashboard-focus", () => ({ owner: "", skill: "" }));
const focus = computed({
  get: () => (preference.value.owner === owner.value ? preference.value.skill : ""),
  set: (skill: string) => {
    preference.value = { owner: owner.value || "", skill };
  },
});
const showAllSkills = ref(false);
const practiceMessage = ref("");
const practiceBusy = computed(() => view.value?.practiceStatus === "loading");
const activeSkills = computed(() => {
  const catalogue = new Map((view.value?.skills || []).map((skill) => [skill.id, skill]));
  return (view.value?.xp?.skills || [])
    .filter((xp) => xp.xp > 0 && catalogue.has(xp.skill))
    .map((xp) => ({ ...catalogue.get(xp.skill)!, xp }))
    .sort((a, b) => b.xp.xp - a.xp.xp || a.name.localeCompare(b.name, locale.value));
});
const visibleSkills = computed(() =>
  showAllSkills.value ? activeSkills.value : activeSkills.value.slice(0, 3)
);
const number = (value: number) => new Intl.NumberFormat(locale.value).format(value);
const details = reactive<
  Record<string, { status: "loading" | "ready" | "error"; names: Map<string, string> }>
>({});
let detailGeneration = 0;
let ownerGeneration = 0;
let alive = true;

watch(
  [owner, accessToken],
  ([next, token]) => {
    const generation = ++ownerGeneration;
    detailGeneration++;
    for (const key of Object.keys(details)) delete details[key];
    if (preference.value.owner !== next) preference.value = { owner: next || "", skill: "" };
    showAllSkills.value = false;
    practiceMessage.value = "";
    // Clear private data immediately. setStates updates user/session before its
    // token cookie, so wait for that synchronous batch before making new reads.
    void data.select(null);
    if (!next) return;
    queueMicrotask(() => {
      if (
        alive &&
        generation === ownerGeneration &&
        owner.value === next &&
        accessToken.value === token
      )
        void data.select(next);
    });
  },
  { immediate: true, flush: "sync" }
);
watch(focus, () => {
  practiceMessage.value = "";
});
watch([() => view.value?.skills, () => view.value?.status], ([skills, status]) => {
  if (
    status === "ready" &&
    !view.value?.errors.skills &&
    focus.value &&
    !skills?.some((skill) => skill.id === focus.value)
  )
    focus.value = "";
});

function reload() {
  void data.reload();
}
async function startPractice() {
  if (!owner.value || practiceBusy.value) return;
  const requestedOwner = owner.value;
  const generation = ownerGeneration;
  const requestedFocus = focus.value;
  practiceMessage.value = "";
  try {
    const exercise = await data.loadPractice(requestedFocus || undefined);
    if (
      !alive ||
      generation !== ownerGeneration ||
      owner.value !== requestedOwner ||
      focus.value !== requestedFocus
    )
      return;
    if (exercise) {
      const failure = await router.push(exercise.route);
      if (!alive || generation !== ownerGeneration) return;
      if (failure) practiceMessage.value = t("CharacterDashboard.PracticeError");
    } else {
      practiceMessage.value = t(
        view.value?.errors.practice
          ? "CharacterDashboard.PracticeError"
          : "CharacterDashboard.NoPractice"
      );
    }
  } catch {
    if (
      alive &&
      generation === ownerGeneration &&
      owner.value === requestedOwner &&
      focus.value === requestedFocus
    )
      practiceMessage.value = t("CharacterDashboard.PracticeError");
  }
}
function chooseFocus(id: string) {
  focus.value = id;
  const select = document.getElementById("character-focus");
  select?.focus({ preventScroll: true });
  select?.scrollIntoView({ block: "nearest", behavior: "instant" });
}
function onSkillToggle(event: Event, id: string) {
  if ((event.target as HTMLDetailsElement).open && !details[id]) void loadDetails(id);
}
async function loadDetails(id: string) {
  if (!owner.value || details[id]?.status === "loading") return;
  const generation = detailGeneration;
  details[id] = { status: "loading", names: new Map() };
  try {
    const result = (await GET(`/skills/skilltree/${encodeURIComponent(id)}`)) as {
      skills?: { id: string; name: string }[];
    };
    if (!alive || generation !== detailGeneration) return;
    if (
      !Array.isArray(result?.skills) ||
      result.skills.some(
        (skill) => typeof skill?.id !== "string" || typeof skill?.name !== "string"
      )
    )
      throw new Error("Invalid skill details");
    details[id] = {
      status: "ready",
      names: new Map(result.skills.map((skill) => [skill.id, skill.name])),
    };
  } catch {
    if (alive && generation === detailGeneration)
      details[id] = { status: "error", names: new Map() };
  }
}
function namedChildren(xp: DashboardSkillXP) {
  const names = details[xp.skill]?.names;
  return xp.skills
    .filter((skill) => skill.xp > 0 && names?.has(skill.skill))
    .map((skill) => ({ ...skill, name: names!.get(skill.skill)! }))
    .sort((a, b) => b.xp - a.xp);
}
onBeforeUnmount(() => {
  alive = false;
  detailGeneration++;
  data.dispose();
});
</script>

<style scoped>
.character-page {
  max-width: 1240px;
  width: calc(100% - 64px);
  margin: 40px auto 88px;
  color: #edf3fb;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
.character-page p,
.character-page li {
  font-family: inherit;
  color: inherit;
  line-height: 1.55;
}
.character-page h1,
.character-page h2,
.character-page h3 {
  font-family: inherit;
  font-weight: 650;
  letter-spacing: -0.025em;
}
.page-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-bottom: 28px;
}
.page-heading > div {
  min-width: 0;
}
h1 {
  font-size: clamp(1.8rem, 3vw, 2.5rem);
  line-height: 1.2;
  margin-top: 5px;
}
h2 {
  font-size: 1.4rem;
  line-height: 1.25;
}
.eyebrow {
  font-size: 0.75rem;
  font-weight: 650;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: #adbdce !important;
}
.quiet-link {
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #b5c7d9;
  font-size: 0.875rem;
  line-height: 1.4;
  flex-shrink: 0;
}
.quiet-link:hover {
  color: #0cc9ab;
}
.quiet-link svg {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
}
.character-sheet {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  border: 1px solid #2c4259;
  border-radius: 24px;
  overflow: hidden;
  background: #122238;
}
.identity-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 30px 32px;
  background: radial-gradient(ellipse at 50% 43%, #12474c80, transparent 64%), #102b38;
  border-right: 1px solid #2c4259;
}
.identity-heading h2 {
  font-size: 1.8rem;
  overflow-wrap: anywhere;
  margin-top: 12px;
}
.level-badge {
  display: inline-flex;
  align-items: center;
  border: 1px solid #26625f;
  border-radius: 8px;
  padding: 4px 10px;
  color: #87e6d4;
  font-size: 0.75rem;
  font-weight: 650;
}
.portrait-stage {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 350px;
  flex: 1;
  isolation: isolate;
}
.character-figure {
  position: relative;
  z-index: 1;
  height: 300px;
  width: 180px;
}
.portrait-orbit {
  position: absolute;
  width: 226px;
  height: 226px;
  border: 1px solid #32747636;
  border-radius: 50%;
}
.orbit-two {
  width: 176px;
  height: 176px;
}
.portrait-ground {
  position: absolute;
  width: 150px;
  height: 16px;
  border: 1px solid #32747660;
  border-radius: 50%;
  top: calc(50% + 146px);
}
.experience {
  position: relative;
  padding-top: 5px;
}
.xp-total {
  font-size: 1.7rem;
  font-weight: 650;
  margin: 6px 0 13px;
  line-height: 1.2 !important;
}
.xp-total span {
  font-size: 0.875rem;
  font-weight: 500;
  color: #adbdce;
}
progress {
  display: block;
  width: 100%;
  height: 5px;
  border: 0;
  border-radius: 10px;
  overflow: hidden;
  appearance: none;
  background: #2b4054;
  color: #0cc9ab;
}
progress::-webkit-progress-bar {
  background: #2b4054;
  border-radius: 10px;
}
progress::-webkit-progress-value {
  background: #0cc9ab;
  border-radius: 10px;
}
progress::-moz-progress-bar {
  background: #0cc9ab;
  border-radius: 10px;
}
.progress-caption {
  color: #adbdce !important;
  font-size: 0.75rem;
  margin-top: 9px;
}
.learning-panel {
  min-width: 0;
  padding: 32px;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.next-step h2 {
  margin-top: 7px;
  font-size: 1.85rem;
}
.section-symbol {
  width: 34px;
  height: 34px;
  color: #57d7c1;
  stroke-width: 1.2;
}
.focus-label {
  display: block;
  font-size: 0.8rem;
  color: #adbdce;
  margin: 26px 0 8px;
}
.focus-control {
  position: relative;
}
.focus-control select {
  appearance: none;
  width: 100%;
  min-width: 0;
  border: 1px solid #39506a;
  border-radius: 10px;
  background: #102035;
  color: #edf3fb;
  font-family: inherit;
  font-size: 0.9375rem;
  padding: 13px 42px 13px 15px;
  cursor: pointer;
  text-overflow: ellipsis;
}
.focus-control > svg {
  position: absolute;
  width: 18px;
  height: 18px;
  top: 50%;
  right: 15px;
  transform: translateY(-50%);
  pointer-events: none;
  color: #b5c7d9;
}
.practice-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 15px 19px;
  margin-top: 12px;
  border: 1px solid #0cc9ab;
  border-radius: 10px;
  background: #0cc9ab;
  color: #062c2b;
  font-family: inherit;
  font-weight: 750;
  font-size: 1rem;
  line-height: 1.4;
  cursor: pointer;
}
.practice-button:hover:not(:disabled) {
  background: #42ddc3;
  border-color: #42ddc3;
}
.practice-button svg {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}
.practice-button:disabled {
  cursor: wait;
  opacity: 0.65;
}
.practice-message {
  font-size: 0.875rem;
  margin-top: 12px;
  color: #d0dbe7 !important;
}
.skills-section {
  margin-top: 32px;
  padding-top: 27px;
  border-top: 1px solid #2c4259;
}
.skills-heading {
  margin-bottom: 16px;
}
.skills-heading h2 {
  font-size: 1.125rem;
}
.skill-list {
  display: grid;
  gap: 9px;
}
.skill {
  border: 1px solid #2b4158;
  border-radius: 12px;
  background: #152840;
  overflow: hidden;
}
.skill summary {
  list-style: none;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 16px;
  cursor: pointer;
}
.skill summary::-webkit-details-marker {
  display: none;
}
.skill summary:hover {
  background: #1b314a;
}
.skill-initial {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border: 1px solid #35516a;
  border-radius: 10px;
  color: #9cc5d3;
  background: #1a3548;
  font-size: 1rem;
  font-weight: 600;
}
.skill-overview {
  flex: 1;
  min-width: 0;
}
.skill-title {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: baseline;
  margin-bottom: 10px;
}
.skill-title strong {
  font-size: 0.9375rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.skill-title > span {
  font-size: 0.75rem;
  color: #b5c7d9;
  flex-shrink: 0;
}
.skill-chevron {
  width: 16px;
  height: 16px;
  color: #b5c7d9;
  flex-shrink: 0;
}
.skill[open] .skill-chevron,
.flipped {
  transform: rotate(180deg);
}
.skill-details {
  margin: 0 16px 0 67px;
  padding: 0 0 16px;
}
.skill-detail-heading {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: space-between;
  color: #adbdce !important;
  font-size: 0.75rem;
  padding-bottom: 14px;
}
.subskill-list {
  display: grid;
  gap: 11px;
  border-top: 1px solid #2b4158;
  padding-top: 14px;
  margin: 0;
  list-style: none;
}
.subskill-list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.8125rem;
}
.subskill-list li > span:first-child {
  overflow-wrap: anywhere;
}
.subskill-list li > span:last-child {
  color: #adbdce;
  flex-shrink: 0;
}
.text-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
  font-size: 0.8125rem;
  line-height: 1.4;
  font-weight: 550;
  color: #79dfcb;
  padding: 7px 0;
  text-align: left;
  cursor: pointer;
}
.text-button svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.text-button:hover:not(:disabled) {
  color: #bcf4e9;
}
.text-button:disabled {
  color: #adbdce;
  cursor: default;
}
.choose-focus {
  margin-top: 13px;
}
.more-skills {
  justify-self: center;
  margin-top: 5px;
}
.inline-state {
  font-size: 0.875rem;
  padding: 14px 0;
  color: #b5c7d9 !important;
}
.fresh-start {
  padding: 24px;
  text-align: center;
  border: 1px dashed #385065;
  border-radius: 12px;
}
.fresh-symbol {
  color: #77d6c4;
  font-size: 1.6rem;
}
.fresh-start h3 {
  font-size: 1rem;
  margin: 10px 0 6px;
}
.fresh-start p {
  font-size: 0.875rem;
  color: #adbdce !important;
  max-width: 290px;
  margin: auto;
}
.courses-section {
  margin-top: 34px;
}
.courses-section h2 {
  font-size: 1.125rem;
}
.course-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 17px;
}
.course-card {
  font-family: inherit;
  color: #edf3fb;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #122238;
  border: 1px solid #2c4259;
  border-radius: 14px;
  padding: 19px 16px;
  min-width: 0;
}
.course-card:hover {
  border-color: #50817f;
  background: #182d43;
}
.course-symbol {
  display: grid;
  place-items: center;
  width: 38px;
  height: 42px;
  border: 1px solid #304d63;
  border-radius: 8px;
  background: #19334a;
  flex-shrink: 0;
}
.course-symbol svg {
  width: 20px;
  height: 20px;
  color: #a7c6d6;
}
.course-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 4px;
}
.course-copy strong {
  color: #edf3fb;
  font-weight: 600;
  font-size: 0.875rem;
  overflow-wrap: anywhere;
}
.course-copy > span {
  color: #adbdce;
  font-size: 0.75rem;
}
.course-arrow {
  width: 17px;
  height: 17px;
  color: #8fa6bc;
  flex-shrink: 0;
  margin-left: auto;
}
.character-page :is(a, button, select, summary):focus-visible {
  outline: 2px solid #87e6d4;
  outline-offset: 4px;
}
.skill summary:focus-visible {
  outline-offset: -3px;
}
@media (min-width: 1440px) {
  .character-page {
    margin-top: 52px;
  }
}
@media (max-width: 1000px) {
  .character-sheet {
    grid-template-columns: 290px minmax(0, 1fr);
  }
  .identity-panel {
    padding: 28px 24px;
  }
  .learning-panel {
    padding: 28px;
  }
  .course-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .course-card:last-child:nth-child(3) {
    grid-column: 1 / -1;
  }
}
@media (max-width: 760px) {
  .character-page {
    width: calc(100% - 32px);
    margin: 28px auto 64px;
  }
  .page-heading {
    gap: 12px;
    margin-bottom: 20px;
  }
  .edit-profile {
    max-width: 110px;
    font-size: 0.75rem;
  }
  h1 {
    font-size: 1.75rem;
  }
  .character-sheet {
    grid-template-columns: minmax(0, 1fr);
    border-radius: 18px;
  }
  .identity-panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 116px;
    grid-template-rows: auto auto;
    gap: 14px 8px;
    padding: 24px;
    border-right: 0;
    border-bottom: 1px solid #2c4259;
  }
  .identity-heading h2 {
    font-size: 1.4rem;
    margin-top: 10px;
  }
  .portrait-stage {
    grid-column: 2;
    grid-row: 1 / 3;
    min-height: 174px;
  }
  .character-figure {
    height: 170px;
    width: 102px;
  }
  .portrait-orbit {
    width: 113px;
    height: 113px;
  }
  .orbit-two {
    width: 86px;
    height: 86px;
  }
  .portrait-ground {
    width: 80px;
    height: 9px;
    top: calc(50% + 82px);
  }
  .experience {
    align-self: end;
  }
  .xp-total {
    font-size: 1.4rem;
    margin: 7px 0 12px;
  }
  .learning-panel {
    padding: 24px;
  }
  .next-step h2 {
    font-size: 1.6rem;
  }
  .focus-label {
    margin-top: 20px;
  }
  .skills-section {
    margin-top: 26px;
    padding-top: 24px;
  }
  .skills-heading {
    flex-wrap: wrap;
    gap: 10px;
  }
  .course-list {
    grid-template-columns: minmax(0, 1fr);
  }
  .course-card:last-child:nth-child(3) {
    grid-column: auto;
  }
}
@media (max-width: 380px) {
  .identity-panel {
    padding: 20px 16px;
    grid-template-columns: minmax(0, 1fr) 90px;
  }
  .portrait-stage {
    min-width: 0;
  }
  .portrait-orbit {
    width: 87px;
    height: 87px;
  }
  .orbit-two {
    width: 64px;
    height: 64px;
  }
  .character-figure {
    width: 90px;
    height: 150px;
  }
  .portrait-ground {
    top: calc(50% + 72px);
  }
  .learning-panel {
    padding: 22px 16px;
  }
  .skill summary {
    gap: 9px;
    padding: 13px 10px;
  }
  .skill-initial {
    width: 30px;
    height: 34px;
  }
  .skill-title {
    flex-wrap: wrap;
    gap: 3px 8px;
  }
  .skill-details {
    margin-left: 49px;
    margin-right: 10px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .character-page * {
    scroll-behavior: auto;
  }
}
</style>

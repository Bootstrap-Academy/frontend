<template>
  <div>
    <SkeletonSolveMatching v-if="!!!data" />
    <section v-else-if="!!data" class="flex flex-col items-center w-full">
      <!-- Header with instructions -->
      <div class="text-center mb-8 mt-4">
        <h2 class="text-xl sm:text-2xl font-semibold mb-2">{{ t("Headings.DragAndDropToMatchMatchings") }}</h2>
        <p class="text-sm text-gray-400">{{ t("Headings.MatchingInstructions") }}</p>
      </div>

      <!-- Centered matching container with max width -->
      <section class="w-full max-w-5xl mx-auto px-4">
        <div class="relative" ref="containerRef">
          <!-- SVG for drawing connection lines -->
          <svg
            class="absolute inset-0 w-full h-full pointer-events-none"
            style="overflow: visible; z-index: 0;"
          >
            <!-- Draw existing connections -->
            <line
              v-for="(connection, idx) in connections"
              :key="`connection-${idx}`"
              :x1="connection.x1"
              :y1="connection.y1"
              :x2="connection.x2"
              :y2="connection.y2"
              stroke="currentColor"
              :stroke-width="3"
              class="text-accent transition-all duration-300"
              stroke-linecap="round"
            />
            <!-- Draw temporary line while dragging -->
            <line
              v-if="dragLine"
              :x1="dragLine.x1"
              :y1="dragLine.y1"
              :x2="dragLine.x2"
              :y2="dragLine.y2"
              stroke="currentColor"
              :stroke-width="3"
              class="text-accent opacity-60"
              stroke-linecap="round"
              stroke-dasharray="5,5"
            />
          </svg>

          <!-- Grid layout where each row contains left item + spacer + right item -->
          <div class="flex flex-col gap-4 relative" style="z-index: 1;">
            <div
              v-for="i in data.left.length"
              :key="`row-${i}`"
              class="grid grid-cols-[1fr_auto_1fr] gap-8 items-center"
            >
              <!-- Left item -->
              <article
                :ref="el => setLeftRef(el, i - 1)"
                class="matching-card-left group cursor-pointer relative"
                :class="{ 'selected': selectedLeft === i - 1, 'connected': hasLeftConnection(i - 1) }"
                @click="onLeftClick(i - 1)"
                @mousedown="onLeftMouseDown(i - 1, $event)"
              >
                <div class="matching-card-content">
                  <p class="matching-card-text">
                    {{ data.left[i - 1] }}
                  </p>
                </div>
                <!-- Connection indicator -->
                <div class="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              </article>

              <!-- Center spacer -->
              <div class="w-16"></div>

              <!-- Right item -->
              <article
                :ref="el => setRightRef(el, i - 1)"
                class="matching-card-right group cursor-pointer relative"
                :class="{ 'selected': selectedRight === i - 1, 'connected': hasRightConnection(i - 1) }"
                @click="onRightClick(i - 1)"
                @mouseenter="onRightMouseEnter(i - 1)"
              >
                <div class="matching-card-content">
                  <p class="matching-card-text">
                    {{ data.right[i - 1] }}
                  </p>
                </div>
                <!-- Connection indicator -->
                <div class="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <!-- Centered button container -->
      <div class="w-full max-w-4xl mx-auto px-4 mt-8">
        <InputBtn
          class="w-full max-w-md mx-auto block"
          v-if="data?.solved || user?.id == data?.creator"
          @click="nextQuestion()"
          iconRight
          :icon="ChevronDoubleRightIcon"
        >
          {{ t("Buttons.Next") }}
        </InputBtn>

        <InputBtnWithHeart
          class="w-full max-w-md mx-auto block"
          v-if="!data?.solved && user?.id != data?.creator && !isPremium"
          :loading="formSubmitting"
          @click="onclickSubmitForm()"
          iconRight
          :icon="HalfHeart"
        >
          {{ t("Buttons.SubmitAnswer") }}
        </InputBtnWithHeart>

        <InputBtn
          class="w-full max-w-md mx-auto block"
          v-if="!data?.solved && user?.id != data?.creator && isPremium"
          :loading="formSubmitting"
          @click="onclickSubmitForm()"
        >
          {{ t("Buttons.SubmitAnswer") }}
        </InputBtn>
      </div>

      <InputQuizRating
        class="my-6 w-full max-w-4xl mx-auto px-4"
        :data="data"
        :subtask="data"
        @rated="fnRated($event)"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { ChevronDoubleRightIcon } from "@heroicons/vue/24/solid";
import HalfHeart from "../svg/HalfHeart.vue";

const props = defineProps({
  data: { type: Object as PropType<any>, default: null },
});
const emits = defineEmits([
  "solved",
  "updateQuestion",
  "rated",
  "nextQuestion",
]);

const { t } = useI18n();
const formSubmitting = ref(false);
const user: any = useUser();
const premiumInfo: any = usePremiumInfo();

// Connection state
const matches = ref<Map<number, number>>(new Map()); // Maps left index to right index
const selectedLeft = ref<number | null>(null);
const selectedRight = ref<number | null>(null);
const isDragging = ref(false);
const dragLine = ref<any>(null);

// Element refs
const containerRef = ref<HTMLElement | null>(null);
const leftRefs = ref<any[]>([]);
const rightRefs = ref<any[]>([]);

const isPremium = computed(() => {
  return premiumInfo.value?.premium;
});

// Computed connections for SVG lines
const connections = computed(() => {
  const lines: any[] = [];
  if (!containerRef.value) return lines;

  const containerRect = containerRef.value.getBoundingClientRect();

  matches.value.forEach((rightIdx, leftIdx) => {
    const leftEl = leftRefs.value[leftIdx];
    const rightEl = rightRefs.value[rightIdx];
    if (leftEl && rightEl) {
      const leftRect = leftEl.getBoundingClientRect();
      const rightRect = rightEl.getBoundingClientRect();

      lines.push({
        x1: leftRect.right - containerRect.left + 1,
        y1: leftRect.top + leftRect.height / 2 - containerRect.top,
        x2: rightRect.left - containerRect.left - 1,
        y2: rightRect.top + rightRect.height / 2 - containerRect.top,
      });
    }
  });
  return lines;
});

// Helper functions
function setLeftRef(el: any, index: number) {
  if (el) leftRefs.value[index] = el;
}

function setRightRef(el: any, index: number) {
  if (el) rightRefs.value[index] = el;
}

function hasLeftConnection(index: number): boolean {
  return matches.value.has(index);
}

function hasRightConnection(index: number): boolean {
  return Array.from(matches.value.values()).includes(index);
}

// Click-to-connect interaction
function onLeftClick(index: number) {
  if (isDragging.value) return;

  // If this left item is already connected, remove the connection
  if (matches.value.has(index)) {
    matches.value.delete(index);
    selectedLeft.value = null;
    return;
  }

  // Select this left item
  selectedLeft.value = index;
  selectedRight.value = null;
}

function onRightClick(index: number) {
  if (isDragging.value) return;

  // If a left item is selected, create connection
  if (selectedLeft.value !== null) {
    // Remove any existing connection from this left item
    matches.value.delete(selectedLeft.value);

    // Remove any existing connection to this right item
    matches.value.forEach((rightIdx, leftIdx) => {
      if (rightIdx === index) {
        matches.value.delete(leftIdx);
      }
    });

    // Create new connection
    matches.value.set(selectedLeft.value, index);
    selectedLeft.value = null;
    selectedRight.value = null;
    return;
  }

  // If clicking on already connected right item, find and remove its connection
  matches.value.forEach((rightIdx, leftIdx) => {
    if (rightIdx === index) {
      matches.value.delete(leftIdx);
    }
  });
}

// Drag-to-draw interaction
function onLeftMouseDown(index: number, event: MouseEvent) {
  isDragging.value = true;
  selectedLeft.value = index;

  const leftEl = leftRefs.value[index];
  if (!leftEl || !containerRef.value) return;

  const containerRect = containerRef.value.getBoundingClientRect();
  const leftRect = leftEl.getBoundingClientRect();

  const startX = leftRect.right - containerRect.left + 1;
  const startY = leftRect.top + leftRect.height / 2 - containerRect.top;

  function onMouseMove(e: MouseEvent) {
    if (!isDragging.value || !containerRect) return;

    const currentX = e.clientX - containerRect.left;
    const currentY = e.clientY - containerRect.top;

    dragLine.value = {
      x1: startX,
      y1: startY,
      x2: currentX,
      y2: currentY,
    };
  }

  function onMouseUp() {
    isDragging.value = false;
    dragLine.value = null;
    selectedLeft.value = null;

    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function onRightMouseEnter(index: number) {
  if (!isDragging.value || selectedLeft.value === null) return;

  // Remove any existing connection from the selected left item
  matches.value.delete(selectedLeft.value);

  // Remove any existing connection to this right item
  matches.value.forEach((rightIdx, leftIdx) => {
    if (rightIdx === index) {
      matches.value.delete(leftIdx);
    }
  });

  // Create new connection
  matches.value.set(selectedLeft.value, index);
}

function setSolution() {
  const solution: number[] = [];
  for (let i = 0; i < props.data.left.length; i++) {
    solution.push(matches.value.get(i) ?? -1);
  }
  return solution;
}

async function onclickSubmitForm() {
  const answer = setSolution();
  console.log("solution", answer);

  if (props.data.solved == true || props.data?.creator == user.value?.id)
    return;
  formSubmitting.value = true;
  const [success, error] = await solveMatching(
    props.data.task_id,
    props.data.id,
    {
      answer: answer,
    }
  );
  formSubmitting.value = false;
  await getHearts();
  if (success == true || success == false) successHandler(success);
  else errorHandler(error);
}

function successHandler(res: any) {
  if (!!res) {
    emits("solved", props.data.id);
    openSnackbar("success", "Success.SolvedMatching");
    console.log("res", res);
  } else {
    openSnackbar("error", "Error.WrongMatchingAttempt");
  }
}

function errorHandler(error: any) {
  console.log("error", error);
  openSnackbar("error", error);
}

function nextQuestion() {
  emits("nextQuestion", props.data.id);
}

function fnRated(id: any) {
  emits("rated", id);
}

// Reset connections when data changes
watch(
  () => props.data,
  () => {
    matches.value.clear();
    selectedLeft.value = null;
    selectedRight.value = null;
  },
  { deep: true }
);

onMounted(() => {
  matches.value.clear();
});
</script>

<style scoped>
/* Shared card styling */
.matching-card-left,
.matching-card-right {
  @apply relative rounded-xl overflow-hidden transition-all duration-300;
  background: linear-gradient(135deg, rgba(var(--color-secondary-rgb, 30, 41, 59), 0.95) 0%, rgba(var(--color-secondary-rgb, 30, 41, 59), 0.85) 100%);
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.2),
    0 2px 4px -1px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
  border: 3px solid transparent;
  user-select: none;
}

.matching-card-left:hover,
.matching-card-right:hover {
  transform: translateY(-2px);
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.3),
    0 4px 6px -2px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.1);
  border-color: rgba(var(--color-accent-rgb, 59, 130, 246), 0.3);
}

/* Selected state */
.matching-card-left.selected,
.matching-card-right.selected {
  border-color: rgba(var(--color-accent-rgb, 59, 130, 246), 0.8);
  box-shadow:
    0 0 0 2px rgba(var(--color-accent-rgb, 59, 130, 246), 0.3),
    0 10px 15px -3px rgba(0, 0, 0, 0.3),
    0 4px 6px -2px rgba(0, 0, 0, 0.15);
}

/* Connected state */
.matching-card-left.connected,
.matching-card-right.connected {
  border-color: rgba(var(--color-accent-rgb, 59, 130, 246), 0.5);
}

/* Card content */
.matching-card-content {
  @apply px-6 py-4 min-h-[5rem] flex items-center justify-center;
}

/* Text styling */
.matching-card-text {
  @apply text-sm sm:text-base md:text-lg text-white leading-relaxed text-center;
  word-break: break-word;
  hyphens: auto;
}

/* Accent glow effect on cards */
.matching-card-left::before,
.matching-card-right::before {
  content: '';
  @apply absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none;
  background: radial-gradient(circle at center, rgba(var(--color-accent-rgb, 59, 130, 246), 0.1) 0%, transparent 70%);
}

.matching-card-left:hover::before,
.matching-card-right:hover::before {
  @apply opacity-100;
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .matching-card-content {
    @apply px-4 py-3 min-h-[4rem];
  }

  .matching-card-text {
    @apply text-sm;
  }
}

/* Animation for card entrance */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.matching-card-left,
.matching-card-right {
  animation: slideInUp 0.4s ease-out backwards;
}

.matching-card-left:nth-child(1),
.matching-card-right:nth-child(1) { animation-delay: 0.05s; }
.matching-card-left:nth-child(2),
.matching-card-right:nth-child(2) { animation-delay: 0.1s; }
.matching-card-left:nth-child(3),
.matching-card-right:nth-child(3) { animation-delay: 0.15s; }
.matching-card-left:nth-child(4),
.matching-card-right:nth-child(4) { animation-delay: 0.2s; }
.matching-card-left:nth-child(5),
.matching-card-right:nth-child(5) { animation-delay: 0.25s; }
</style>

<template>
  <section class="card grid gap-4 bg-secondary style-card">
    <article v-if="!isCourseAccessible" class="mx-auto w-fit">
      <p class="text-body-2 text-subheading">{{ t("Headings.Price") }}</p>
      <h2 class="text-heading-2">
        {{ price > 0 ? abbreviateNumber(price) + " MorphCoins" : copy.free }}
      </h2>
      <Price v-if="price > 0" :coins="price" euro-only class="text-body-2 text-body" />
      <p v-if="price > 0 && !isPremium" class="text-body-2 mt-3 text-body">
        {{ t("Body.PremiumIncludesThisCourse") }}
        <NuxtLink to="/subscription" class="text-accent hover:underline">{{
          t("Links.MorePremium")
        }}</NuxtLink>
      </p>
    </article>
    <div v-else-if="progress.total" class="mb-5">
      <p class="mb-2 text-sm text-subheading">{{ copy.progress }}</p>
      <p class="mb-3 text-heading">
        {{ progress.completed }} / {{ progress.total }} {{ copy.completed }}
      </p>
      <progress
        :value="progress.completed"
        :max="progress.total"
        :aria-label="copy.progress"
        class="w-full accent-accent"
      />
    </div>

    <InputBtn
      :loading="loading"
      full
      @click="onclickEnroll"
      :class="{ 'pointer-events-none opacity-70': loading }"
    >
      {{
        isCourseAccessible ? (progress.completed ? copy.continue : copy.start) : copy.courseAccess
      }}
    </InputBtn>

    <!--
      Unlocking a paid course debits Morphcoins, so the order summary and the
      statutory order button are shown before the course is unlocked
      (§ 312j Abs. 2 und 3 BGB).
    -->
    <Modal
      v-if="confirming"
      :aria-label="t('Headings.OrderSummary')"
      @backdrop="confirming = false"
    >
      <div class="w-full max-w-2xl bg-secondary p-4 style-card sm:p-8">
        <OrderSummary
          exact-offer
          :coins="price"
          :loading="loading"
          :disabled="!canOrder"
          :submit-label="price > 0 ? 'Buttons.OrderWithObligationToPay' : 'Buttons.EnrollNow'"
          @order="onclickOrder"
        >
          <template #characteristics>
            <p class="text-body-1 m-0 text-heading">{{ data?.title ?? "" }}</p>
            <p class="text-body-1 m-0 text-body">{{ t("Body.OrderCourseCharacteristics") }}</p>
          </template>

          <template #consent>
            <OrderContract
              v-if="purchaseOffer"
              :key="purchaseOffer.id"
              :offer="purchaseOffer"
              v-model="withdrawalConsent"
            />
          </template>

          <template #actions>
            <Btn secondary @click="confirming = false">{{ t("Buttons.Cancel") }}</Btn>
          </template>
        </OrderSummary>
      </div>
    </Modal>
  </section>
</template>

<script lang="ts" setup>
import { useI18n } from "vue-i18n";
import type { CourseLearningPlan } from "~/types/courseTypes";
import { courseProgress, courseResumeStep, courseWatchLocation } from "~/utils/courseJourney";

const props = defineProps({
  learningPlan: { type: Object as PropType<CourseLearningPlan | null>, default: null },
  isCourseAccessible: { type: Boolean, default: false },
  data: { type: Object as PropType<any>, default: null },
  skillID: { type: String, default: null },
  subSkillID: { type: String, default: null },
});
const { t } = useI18n();
const { copy } = useCourseExperienceCopy();

const link = computed(() =>
  props.data?.learning_path_id
    ? { path: "/learn", query: { path: props.data.learning_path_id } }
    : courseWatchLocation(props.data?.id || "", courseResumeStep(props.data), {
        skillID: props.skillID || undefined,
        subSkillID: props.subSkillID || undefined,
      })
);
const progress = computed(() =>
  props.learningPlan
    ? {
        total: props.learningPlan.units.length,
        completed: props.learningPlan.units.filter((unit) => unit.status === "completed").length,
      }
    : courseProgress(props.data)
);

const loading = ref(false);
const snackbar = useSnackbar();
const router = useRouter();

const purchaseOffer = ref<any>(null);
const withdrawalConsent = ref(false);
const confirming = ref(false);

async function onclickEnroll() {
  if (props.isCourseAccessible) {
    router.push(link.value);
    return;
  }

  // The dialog is rebuilt every time it opens, so the boxes start unticked.
  purchaseOffer.value = await requestPurchaseOffer(`/skills/course_access/${props.data?.id}/offer`);
  if (!purchaseOffer.value) return;
  withdrawalConsent.value = false;
  confirming.value = true;
}

async function onclickOrder() {
  if (!canOrder.value) {
    snackbar.value = {
      show: true,
      type: "error",
      heading: "Error.MustAgreeToBothPointsInOrderToMoveForward",
      body: "",
    };
    return;
  }

  loading.value = true;

  const [success, error] = await withPurchaseRecovery(purchaseOffer.value, () =>
    enrollIntoCourse(props.data?.id ?? "", purchaseAcceptance(purchaseOffer.value))
  ).catch((error) => [null, error]);
  if (success) finishPurchaseRecovery(purchaseOffer.value, success);
  if (success) await getCourseByID(props.data?.id ?? "");
  loading.value = false;
  confirming.value = false;

  if (error) {
    snackbar.value = {
      show: true,
      type: "error",
      heading: error?.detail ?? "",
      body: "",
    };
    return;
  }

  if (success?.state === "fulfilled") router.push(link.value);
  else await navigateTo("/orders");
}

const price = computed(() => {
  return props.data?.price ?? 0;
});

const premiumInfo: any = usePremiumInfo();
const isPremium = computed(() => !!premiumInfo.value?.premium);

const canOrder = computed(() => !!purchaseOffer.value && withdrawalConsent.value);
</script>

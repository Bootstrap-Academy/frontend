<template>
  <div class="mt-4 flex justify-end gap-4">
    <!-- if its your own event, then you can edit it -->
    <template v-if="isMine || user.admin">
      <NuxtLink v-if="event.type == 'webinar'" :to="`/webinars/${id}`">
        <Btn :bgColor="theme.bg" :borderColor="theme.border" sm>
          {{ t("Buttons.EditWebinar") }}
        </Btn>
      </NuxtLink>

      <!-- <NuxtLink v-else-if="event.type == 'coaching'" :to="`/coachings/${id}`">
				<Btn :bgColor="theme.bg" :borderColor="theme.border" sm>
					{{ t("Buttons.EditCoaching") }}
				</Btn>
			</NuxtLink> -->
    </template>

    <div>
      <Btn
        v-if="event.bookable && !event.booked"
        :bgColor="theme.bg"
        :borderColor="theme.border"
        sm
        @click="onclickConfirm"
      >
        {{ t(btnMoreInfo) }}
      </Btn>

      <!-- else if event is booked already -->
      <div v-else-if="event.booked" class="flex items-center gap-3 gap-card-sm">
        <Btn :bgColor="theme.bg" :borderColor="theme.border" sm @click="onclickCancel">
          {{ t(btnMoreInfo) }}
        </Btn>
        <Chip v-if="event.booked && !isMine" color="bg-success">
          <IconCheck />
          {{
            t(
              ["pending", "confirmation_pending", "review"].includes(event.payment_state ?? "")
                ? "Body.EventBookingReserved"
                : "Headings.Booked"
            )
          }}
        </Chip>
        <Chip v-if="isMine" color="bg-success"> <IconMorphcoin /> {{ t("Headings.IsMine") }} </Chip>
      </div>

      <!-- else if user cannot book event -->
      <Chip v-else :color="theme.bg">
        <span class="w-20 text-center">
          {{ t("Headings.Full") }}
        </span>
      </Chip>
    </div>
    <!--
      Booking debits Morphcoins, so the summary required by § 312j Abs. 2 BGB
      and the statutory order button are shown before the booking is placed.
    -->
    <Modal v-if="confirm" class="z-100" :aria-label="t(btn)">
      <CalendarEventSummary
        :event="event"
        @cancel="confirm = false"
        :stats="stats"
        :description="description"
      >
        <OrderSummary
          exact-offer
          :coins="price"
          :heading="btn"
          :disabled="!canBook"
          :submit-label="price > 0 ? 'Buttons.OrderWithObligationToPay' : bookLabel"
          class="w-full"
          @order="onclickBook"
        >
          <template #characteristics>
            <p class="text-body-1 m-0 text-body">{{ t("Body.ConfirmBooking") }}</p>
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
            <Btn secondary @click="confirm = false">{{ t("Buttons.Cancel") }}</Btn>
          </template>
        </OrderSummary>
      </CalendarEventSummary>
    </Modal>

    <Modal v-if="confirmCancellation" class="z-100">
      <CalendarEventSummary
        :event="event"
        @cancel="confirmCancellation = false"
        :stats="stats"
        :description="description"
      >
        <EventCancellationConfirmation
          :event-id="id"
          :kind="type === 'coaching' ? 'coaching' : 'webinar'"
          scope="auto"
          @close="closeCancellation"
          @applied="cancellationApplied = true"
        />
      </CalendarEventSummary>
    </Modal>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from "vue-i18n";
import { WebinarEvent, CoachingEvent } from "~/types/calenderTypes";

const props = defineProps<{
  event: WebinarEvent | CoachingEvent;
  isMine: boolean;
  booked: boolean;
  bookable: boolean;
  id: string;
  description: string;
  type: string;
  theme: any;
  subSkillID: string;
  start: number;
  stats: any[];
}>();

const { t } = useI18n();
const user = useUser();
const btn = computed(() => {
  switch (props.type) {
    case "coaching":
      return "Buttons.BookCoaching";
    default:
      return "Buttons.BookWebinar";
  }
});

const btnMoreInfo = ref("Buttons.MoreEventInfo");

const purchaseOffer = ref<any>(null);
const price = computed(() => purchaseOffer.value?.product.coins ?? props.event?.price ?? 0);
const bookLabel = computed(() =>
  props.type === "coaching" ? "Buttons.YesBookCoaching" : "Buttons.YesBookWebinar"
);

const isEventBooked = ref(props.booked ?? false);

const confirm = ref(false);
const withdrawalConsent = ref(false);
const information = ref(false);

const canBook = computed(() => !!purchaseOffer.value && withdrawalConsent.value);

async function onclickConfirm() {
  // The dialog is rebuilt every time it opens, so the boxes start unticked.
  withdrawalConsent.value = false;
  purchaseOffer.value = await requestPurchaseOffer(
    props.type === "coaching"
      ? `/events/coachings/${props.subSkillID}/${props.id}/offer`
      : `/events/webinars/${props.id}/offer`
  );
  if (!purchaseOffer.value) return;
  confirm.value = true;
}

async function onclickBook() {
  if (!canBook.value) {
    openSnackbar("error", "Error.MustAgreeToBothPointsInOrderToMoveForward");
    return;
  }

  setLoading(true);

  switch (props.type) {
    case "coaching":
      await bookCoaching();
      break;
    default:
      await bookWebinar();
      break;
  }
  withdrawalConsent.value = false;
  setLoading(false);
  confirm.value = false;
}

async function bookCoaching() {
  const [success, error] = await withPurchaseRecovery(purchaseOffer.value, () =>
    bookCoachingForThisSubSkillWithThisInstructor(
      props.subSkillID ?? "",
      props.id ?? "",
      purchaseAcceptance(purchaseOffer.value)
    )
  ).catch((error) => [null, error]);

  openSnackbar(success ? "success" : "error", success ? "Body.PurchasePending" : eventError(error));
  isEventBooked.value = !!success;
  await getCalendar();
}

async function bookWebinar() {
  const [success, error] = await withPurchaseRecovery(purchaseOffer.value, () =>
    registerForWebinarByID(props.id ?? "", purchaseAcceptance(purchaseOffer.value))
  ).catch((error) => [null, error]);

  openSnackbar(success ? "success" : "error", success ? "Body.PurchasePending" : eventError(error));
  isEventBooked.value = !!success;
  await getCalendar();
}

function eventError(error: any) {
  if (error?.detail?.code === "EventBookingPaymentPending") return "Body.EventBookingReserved";
  if (error?.detail?.code === "EventSettlementPending") return "Body.EventCancellationPending";
  return typeof error?.detail === "string" ? error.detail : "Body.EventPaymentUnconfirmed";
}

const confirmCancellation = ref(false);
const cancellationApplied = ref(false);
async function closeCancellation() {
  confirmCancellation.value = false;
  if (cancellationApplied.value) await getCalendar();
}
function onclickCancel() {
  confirmCancellation.value = true;
}
</script>

<style scoped></style>

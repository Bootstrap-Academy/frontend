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
          {{ t("Headings.Booked") }}
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
    <Modal v-if="confirm" class="z-100 overflow-scroll">
      <CalendarEventSummary
        :event="event"
        @cancel="confirm = false"
        :stats="stats"
        :description="description"
      >
        <OrderSummary
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
            <!--
              Webinars and coachings are services, so a paid booking needs the
              declarations of § 356 Abs. 5 Nr. 2 BGB. A free event is not
              booked against payment, so they are not asked for.
            -->
            <OrderWithdrawalConsent v-if="price > 0" kind="service" v-model="withdrawalConsent" />
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
        <Accordion :title="dialog.heading" class="w-full">
          <Dialog :dialog="dialog">
            <template #content> </template>
          </Dialog>
        </Accordion>
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

const price = computed(() => props.event?.price ?? 0);
const bookLabel = computed(() =>
  props.type === "coaching" ? "Buttons.YesBookCoaching" : "Buttons.YesBookWebinar"
);

const isEventBooked = ref(props.booked ?? false);

const dialog = <any>reactive({});
const confirm = ref(false);
const withdrawalConsent = ref(false);
const information = ref(false);

const canBook = computed(() => price.value <= 0 || withdrawalConsent.value);

function onclickConfirm() {
  // The dialog is rebuilt every time it opens, so the boxes start unticked.
  withdrawalConsent.value = false;
  confirm.value = true;
}

async function onclickBook() {
  if (!canBook.value) {
    openSnackbar("error", "Error.MustAgreeToBothPointsInOrderToMoveForward");
    return;
  }

  setLoading(true);

  // Bookings are placed against the events service, which does not store the
  // declarations, so they are recorded here first.
  if (price.value > 0) {
    const [, consentError] = await recordWithdrawalConsent(
      props.type === "coaching" ? "coaching" : "webinar",
      props.id
    );
    if (consentError) {
      setLoading(false);
      openSnackbar("error", consentError?.detail ?? "Error.WithdrawalConsentMissing");
      return;
    }
  }

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
  const [success, error] = await bookCoachingForThisSubSkillWithThisInstructor(
    props.subSkillID ?? "",
    props.id ?? ""
  );

  openSnackbar(
    success ? "success" : "error",
    success ? "Success.BookedCoaching" : (error?.detail ?? "")
  );
  isEventBooked.value = !!success;
  await getCalendar();
}

async function bookWebinar() {
  const [success, error] = await registerForWebinarByID(props.id ?? "");

  openSnackbar(
    success ? "success" : "error",
    success ? "Success.BookedWebinar" : (error?.detail ?? "")
  );
  isEventBooked.value = !!success;
  await getCalendar();
}

const confirmCancellation = ref(false);
const cancellationPolicy = reactive([
  "List.EventCancellationPolicy.1",
  "List.EventCancellationPolicy.2",
  "List.EventCancellationPolicy.3",
]);

const todayDate = ref("");
const startDate = ref("");
const numberOfDaysUntil = ref(0);

function onclickCancel() {
  confirmCancellation.value = true;
  let btnText = "";
  let headingText = "";
  let type = "";

  switch (props.type) {
    case "coaching":
      btnText = "Buttons.YesCancelCoaching";
      headingText = "Headings.CancelCoaching";
      type = "info";
      break;
    default:
      btnText = "Buttons.YesCancelWebinar";
      headingText = "Headings.CancelWebinar";
      type = "warning";
      break;
  }

  let refund = getCancellationRefundStatus();
  let body = t("Body.CancelEvent");

  if (refund == 100) {
    body = `${body} ${t("Body.CancelEvent100%")}`;
  } else if (refund == 50) {
    body = `${body} ${t("Body.CancelEvent50%")}`;
  } else {
    body = `${body} ${t("Body.CancelEvent0%")}`;
  }

  Object.assign(dialog, {
    type: type,
    heading: headingText,
    body: body,
    primaryBtn: {
      label: btnText,
      onclick: async () => {
        setLoading(true);
        const [success, error] = await cancelCalendarEvent(props.id);
        setLoading(false);

        openSnackbar(
          success ? "success" : "error",
          success ? "Success.EventCancelled" : (error?.detail ?? "")
        );

        if (success) {
          confirmCancellation.value = false;
        }
      },
    },
    secondaryBtn: {
      label: "Buttons.Back",
      onclick: () => {
        confirmCancellation.value = false;
      },
    },
  });
}

function getCancellationRefundStatus() {
  let start = convertTimestampToDate(props.start);
  let today = convertTimestampToDate(new Date().getTime() / 1000);

  numberOfDaysUntil.value = start.date - today.date;
  todayDate.value = `${today.date} ${t(today.month.string)}, ${today.year}`;
  startDate.value = `${start.date} ${t(start.month.string)}, ${start.year}`;

  if (numberOfDaysUntil.value > 7) {
    return 100;
  } else if (numberOfDaysUntil.value > 1 && numberOfDaysUntil.value <= 7) {
    return 50;
  } else {
    return 0;
  }
}
</script>

<style scoped></style>

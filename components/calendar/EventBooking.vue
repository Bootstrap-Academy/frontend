<template>
	<div class="mt-4 flex gap-4 justify-end">
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
			<div v-else-if="event.booked" class="flex gap-3 gap-card-sm items-center">
				<Btn
					:bgColor="theme.bg"
					:borderColor="theme.border"
					sm
					@click="onclickCancel"
				>
					{{ t(btnMoreInfo) }}
				</Btn>
				<Chip v-if="event.booked && !isMine" color="bg-success">
					<IconCheck />
					{{ t("Headings.Booked") }}
				</Chip>
				<Chip v-if="isMine" color="bg-success">
					<IconMorphcoin/> {{ t("Headings.IsMine") }}
				</Chip>
			</div>

			<!-- else if user cannot book event -->
			<Chip v-else :color="theme.bg">
				<span class="w-20 text-center">
					{{ t("Headings.Full") }}
				</span>
			</Chip>
		</div>
		<Modal v-if="confirm" class="z-100 overflow-scroll">
			<CalendarEventSummary
				:event="event"
				@cancel="confirm = false"
				:stats="stats"
				:description="description"
			>
				<Accordion :title="dialog.heading" class="w-full">
					<Dialog :dialog="dialog">
						<template #content>
							<InputCheckbox
								id="RightToWithdrawal"
								class="mb-card-sm"
								label="Links.RightToWithdrawal"
								:link="{
									to: '/docs/right-of-withdrawal',
									label: 'Links.RightToWithdrawalLink',
								}"
								target="_blank"
								v-model="confirmRightToWithdrawal"
							/>
							<InputCheckbox
								id="DontUseRightToWithdrawal"
								label="Links.DontUseRightToWithdrawal"
								v-model="confirmDontUseRightToWithdrawal"
							/>
						</template>
					</Dialog>
				</Accordion>
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
						<template #content>
						</template>
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
const user = useUser()
const btn = computed(() => {
  switch (props.type) {
  case "coaching":
    return "Buttons.BookCoaching";
  default:
    return "Buttons.BookWebinar";
  }
});

const btnMoreInfo = ref("Buttons.MoreEventInfo");

const isEventBooked = ref(props.booked ?? false);

const dialog = <any>reactive({});
const confirm = ref(false);
const confirmRightToWithdrawal = ref(false);
const confirmDontUseRightToWithdrawal = ref(false);
const information = ref(false);

function onclickConfirm() {
  confirm.value = true;

  let btnText = "";
  let type = "";

  switch (props.type) {
  case "coaching":
    btnText = "Buttons.YesBookCoaching";
    type = "info";
    break;
  default:
    btnText = "Buttons.YesBookWebinar";
    type = "warning";
    break;
  }

  Object.assign(dialog, {
    type: type,
    heading: btn.value,
    body: "Body.ConfirmBooking",
    primaryBtn: {
      label: btnText,
      onclick: async () => {
        if (
          !confirmRightToWithdrawal.value ||
						!confirmDontUseRightToWithdrawal.value
        ) {
          openSnackbar(
            "error",
            "Error.MustAgreeToBothPointsInOrderToMoveForward"
          );
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
        confirmRightToWithdrawal.value = false;
        confirmDontUseRightToWithdrawal.value = false;
        setLoading(false);
        confirm.value = false;
      },
    },
    secondaryBtn: {
      label: "Buttons.Cancel",
      onclick: () => {
        confirm.value = false;
      },
    },
  });
}

async function bookCoaching() {
  const [success, error] =
			await bookCoachingForThisSubSkillWithThisInstructor(
			  props.subSkillID ?? "",
			  props.id ?? ""
			);

  openSnackbar(
    success ? "success" : "error",
    success ? "Success.BookedCoaching" : error?.detail ?? ""
  );
  isEventBooked.value = !!success;
  await getCalendar();
}

async function bookWebinar() {
  const [success, error] = await registerForWebinarByID(props.id ?? "");

  openSnackbar(
    success ? "success" : "error",
    success ? "Success.BookedWebinar" : error?.detail ?? ""
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
          success ? "Success.EventCancelled" : error?.detail ?? ""
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

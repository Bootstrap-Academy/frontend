<template>
	<div class="mt-4 flex justify-end">
		<!-- if its your own event, then you can edit it -->
		<template v-if="isMine">
			<NuxtLink v-if="event.type == 'webinar'" :to="`/webinars/${id}`">
				<Btn :bgColor="theme.bg" :borderColor="theme.border" sm>
					{{ t("Buttons.EditWebinar") }}
				</Btn>
			</NuxtLink>

			<NuxtLink v-else-if="event.type == 'coaching'" :to="`/coachings/${id}`">
				<Btn :bgColor="theme.bg" :borderColor="theme.border" sm>
					{{ t("Buttons.EditCoaching") }}
				</Btn>
			</NuxtLink>
		</template>

		<template v-else>
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
			<div v-else-if="event.booked" class="flex gap-card-sm">
				<Btn
					:bgColor="theme.bg"
					:borderColor="theme.border"
					sm
					tertiary
					@click="onclickCancel"
				>
					{{ t("Buttons.CancelEventCard") }}
				</Btn>
				<Chip :icon="CheckIcon" color="bg-success">
					{{ t("Headings.Booked") }}
				</Chip>
			</div>

			<!-- else if user cannot book event -->
			<Chip v-else :color="theme.bg">
				<span class="w-20 text-center">
					{{ t("Headings.Full") }}
				</span>
			</Chip>
		</template>
		<Modal v-if="confirm" class="z-100 overflow-scroll">
			<div
				class="style-card bg-secondary w-full max-w-3xl relative overflow-y-scroll max-h-full p-10"
			>
				<Btn
					sm
					secondary
					class="relative -top-5 -left-5"
					@click="confirm = false"
					>Zurück</Btn
				>

				<div class="w-full flex content-center items-center gap-2">
					<component
						:is="InformationCircleIcon"
						class="h-10 w-10 row-span-2 md:row-span-3"
						:class="'fill-info'"
					/>
					<h6 class="text-heading-2 text-heading font-heading">
						<h6>{{ t('Headings.Summary') }}</h6>
					</h6>
				</div>
				<hr class="mt-card text-transparent" />
				<!-- ? Instructor below -->
				<div class="h-full max-h-3xl">
					<div class="flex flex-col">
						<div>
							<h4 class="font-bold text-heading">
								{{ t("Headings.Instructor") }}
							</h4>
							<Rating :rating="event.instructor_rating ?? 0" sm stars />
							<div class="flex gap-2">
								<img
									:src="event.instructor.avatar_url ?? '/images/about-2.webp'"
									class="w-6 h-6 object-cover rounded-[50px]"
									alt=""
								/>
								<p>{{ event.instructor.display_name }}</p>
							</div>
							<hr class="mt-card text-transparent" />
						</div>
						<div>
							<h4 class="font-bold text-heading">
								{{ t("Headings.Name") }}
							</h4>
							<p>{{ event.title }}</p>
						</div>
					</div>

					<hr class="mt-card text-transparent" />

					<h4 class="font-bold text-heading">
						{{ t("Headings.Description") }}
					</h4>
					<p>{{ description }}</p>
					<hr class="mt-card text-transparent" />

					<div>
						<p v-for="(stat, i) of stats" :key="i">
							{{ t(stat.heading) }}
							<span class="font-bold text-heading">
								{{ stat.value }}
							</span>
						</p>
						<p v-if="event.admin_link">
							Admin-Link
							<a
								:href="event.admin_link"
								class="font-bold text-accent"
								target="_blank"
								>link</a
							>
						</p>
						<p v-else-if="event.link">
							Link
							<a
								:href="event.link"
								class="font-bold text-accent"
								target="_blank"
							>
								link
							</a>
						</p>
						<p
							v-if="
								event.hasOwnProperty('participants') &&
								event.hasOwnProperty('max_participants')
							"
						>
							{{ t("Headings.Participants") }}
							<span class="font-bold text-heading">
								<!-- ? not possible to check instanceOf props.event -->
								{{ event.participants }}/{{ event.max_participants }}
							</span>
						</p>
						<p v-if="event.hasOwnProperty('creation_date')">
							{{ t("Headings.CreationDate") }}
							<span class="font-bold text-heading">
								<!-- ? not possible to check instanceOf props.event -->
								{{ getTimeAndDate(event.creation_date).date }}
								{{ getTimeAndDate(event.creation_date).time }}
							</span>
						</p>
					</div>
					<hr class="mt-card mb-card" />
				</div>

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
			</div>
		</Modal>

		<Modal v-if="confirmCancellation" class="z-100">
			<Dialog :dialog="dialog">
				<template #content>
					<div class="flex gap-box mt-card-sm">
						<p class="text-body-2">{{ t("Headings.TodayDate") }}:</p>
						<h6 class="text-body-1">{{ todayDate }}</h6>
					</div>
					<div class="flex gap-box">
						<p class="text-body-2">{{ t("Headings.EventStartDate") }}:</p>
						<h6 class="text-body-1">{{ startDate }}</h6>
					</div>
					<div class="flex gap-box">
						<p class="text-body-2">{{ t("Headings.DaysRemaining") }}:</p>
						<h6 class="text-body-1">{{ numberOfDaysUntil }} days</h6>
					</div>

					<hr class="mt-card mb-card" />

					<h4 class="text-heading-4 mb-box">
						{{ t("Headings.CancellationPolicy") }}
					</h4>
					<List :items="cancellationPolicy" id="cancellationPolicy" />
				</template>
			</Dialog>
		</Modal>
	</div>
</template>

<script lang="ts" setup>
	import { useI18n } from "vue-i18n";
	import { CheckIcon } from "@heroicons/vue/24/outline";
	import { WebinarEvent, CoachingEvent } from "~/types/calenderTypes";
	import { InformationCircleIcon } from "@heroicons/vue/24/solid";

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
	}

	async function bookWebinar() {
		const [success, error] = await registerForWebinarByID(props.id ?? "");

		openSnackbar(
			success ? "success" : "error",
			success ? "Success.BookedWebinar" : error?.detail ?? ""
		);

		isEventBooked.value = !!success;
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

	function getTimeAndDate(timestamp: number) {
		if (timestamp == -1) {
			return { time: ``, date: `` };
		}

		let { date, month, year } = convertTimestampToDate(timestamp);
		let time = new Date(timestamp * 1000).toTimeString();
		let [hr, min, sec] = time.split(":");

		return {
			time: `${hr}:${min}`,
			date: `${date} ${t(month.string).slice(0, 3)}, ${year}`,
		};
	}
</script>

<style scoped></style>

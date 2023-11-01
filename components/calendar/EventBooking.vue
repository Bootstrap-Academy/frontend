<template>
  <div class="mt-4 flex justify-end">
    <!-- if its your own event, then you can edit it -->
    <template v-if="isMine">
      <NuxtLink v-if="type == 'webinar'" :to="`/webinars/${id}`">
        <Btn :bgColor="theme.bg" :borderColor="theme.border" sm>
          {{ t('Buttons.EditWebinar') }}
        </Btn>
      </NuxtLink>

      <NuxtLink v-else-if="type == 'coaching'" :to="`/coachings/${id}`">
        <Btn :bgColor="theme.bg" :borderColor="theme.border" sm>
          {{ t('Buttons.EditCoaching') }}
        </Btn>
      </NuxtLink>
    </template>

    <template v-else>
      <!-- else if user can book event and event is not booked yet -->
      <Btn
        v-if="bookable && !booked && !isEventBooked"
        :bgColor="theme.bg"
        :borderColor="theme.border"
        sm
        @click="onclickConfirm"
      >
        {{ t(btn) }}
      </Btn>

      <!-- else if event is booked already -->
      <div v-else-if="booked || isEventBooked" class="flex gap-card-sm">
        <Btn
          :bgColor="theme.bg"
          :borderColor="theme.border"
          sm
          tertiary
          @click="onclickCancel"
        >
          {{ t('Buttons.CancelEventCard') }}
        </Btn>
        <Chip :icon="CheckIcon" color="bg-success">
          {{ t('Headings.Booked') }}
        </Chip>
      </div>

      <!-- else if user cannot book event -->
      <Chip v-else :color="theme.bg">
        <span class="w-20 text-center">
          {{ t('Headings.Full') }}
        </span>
      </Chip>
    </template>

    <Modal v-if="confirm" class="z-100">
      <Dialog :dialog="dialog">
        <template #content>
          <!-- Todo: Name, Description, Skill & parentSkill, start-time, duration, end-time, price -->
          <!-- Todo: Instructor, Link if the user has access to the link?, Admin-link if the user has access to the admin-link -->
          <!-- Todo: Timestamp when this webinar has been created, Number of registered & number of Max participating, -->
          <!-- Todo: Button to book webinar if it's bookable -->
          <!-- Todo: In the Webinar summary, display skill-name instead of it's id -->
          <h2>Confirm</h2>
          <hr class="mt-card text-transparent" />
          <h4 class="font-bold text-heading">
            {{ t('Headings.Description') }}
          </h4>
          <p>{{ description }}</p>

          <hr class="mt-card text-transparent" />

          <p v-for="(stat, i) of stats" :key="i">
            {{ t(stat.heading) }}
            <span class="font-bold text-heading">
              {{ stat.value }}
            </span>
          </p>

          <hr class="mt-card mb-card" />

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
    </Modal>

    <Modal v-if="confirmCancellation" class="z-100">
      <Dialog :dialog="dialog">
        <template #content>
          <div class="flex gap-box mt-card-sm">
            <p class="text-body-2">{{ t('Headings.TodayDate') }}:</p>
            <h6 class="text-body-1">{{ todayDate }}</h6>
          </div>
          <div class="flex gap-box">
            <p class="text-body-2">{{ t('Headings.EventStartDate') }}:</p>
            <h6 class="text-body-1">{{ startDate }}</h6>
          </div>
          <div class="flex gap-box">
            <p class="text-body-2">{{ t('Headings.DaysRemaining') }}:</p>
            <h6 class="text-body-1">{{ numberOfDaysUntil }} days</h6>
          </div>

          <hr class="mt-card mb-card" />

          <h4 class="text-heading-4 mb-box">
            {{ t('Headings.CancellationPolicy') }}
          </h4>
          <List :items="cancellationPolicy" id="cancellationPolicy" />
        </template>
      </Dialog>
    </Modal>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import { CheckIcon } from '@heroicons/vue/24/outline';

export default defineComponent({
  components: { CheckIcon },
  props: {
    isMine: { type: Boolean, default: false },
    booked: { type: Boolean, default: false },
    bookable: { type: Boolean, default: false },

    id: { type: String, default: '' },
    description: { type: String, default: '' },
    type: { type: String, default: 'webinar' },
    theme: { type: Object as PropType<any>, default: null },
    subSkillID: { type: String, default: '' },
    start: { type: Number, default: 0 },

    stats: { type: Array as PropType<any[]>, default: [] },
  },
  setup(props) {
    const { t } = useI18n();

    const btn = computed(() => {
      switch (props.type) {
        case 'coaching':
          return 'Buttons.BookCoaching';
        default:
          return 'Buttons.BookWebinar';
      }
    });

    const isEventBooked = ref(props.booked ?? false);

    const dialog = <any>reactive({});
    const confirm = ref(false);
    const confirmRightToWithdrawal = ref(false);
    const confirmDontUseRightToWithdrawal = ref(false);

    function onclickConfirm() {
      confirm.value = true;

      let btnText = '';
      let type = '';

      switch (props.type) {
        case 'coaching':
          btnText = 'Buttons.YesBookCoaching';
          type = 'info';
          break;
        default:
          btnText = 'Buttons.YesBookWebinar';
          type = 'warning';
          break;
      }

      Object.assign(dialog, {
        type: type,
        heading: btn.value,
        body: 'Body.ConfirmBooking',
        primaryBtn: {
          label: btnText,
          onclick: async () => {
            if (
              !confirmRightToWithdrawal.value ||
              !confirmDontUseRightToWithdrawal.value
            ) {
              openSnackbar(
                'error',
                'Error.MustAgreeToBothPointsInOrderToMoveForward'
              );
              return;
            }

            setLoading(true);
            switch (props.type) {
              case 'coaching':
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
          label: 'Buttons.Cancel',
          onclick: () => {
            confirm.value = false;
          },
        },
      });
    }

    async function bookCoaching() {
      const [success, error] =
        await bookCoachingForThisSubSkillWithThisInstructor(
          props.subSkillID ?? '',
          props.id ?? ''
        );

      openSnackbar(
        success ? 'success' : 'error',
        success ? 'Success.BookedCoaching' : error?.detail ?? ''
      );

      isEventBooked.value = !!success;
    }

    async function bookWebinar() {
      const [success, error] = await registerForWebinarByID(props.id ?? '');

      openSnackbar(
        success ? 'success' : 'error',
        success ? 'Success.BookedWebinar' : error?.detail ?? ''
      );

      isEventBooked.value = !!success;
    }

    const confirmCancellation = ref(false);
    const cancellationPolicy = reactive([
      'List.EventCancellationPolicy.1',
      'List.EventCancellationPolicy.2',
      'List.EventCancellationPolicy.3',
    ]);

    const todayDate = ref('');
    const startDate = ref('');
    const numberOfDaysUntil = ref(0);

    function onclickCancel() {
      confirmCancellation.value = true;
      let btnText = '';
      let headingText = '';
      let type = '';

      switch (props.type) {
        case 'coaching':
          btnText = 'Buttons.YesCancelCoaching';
          headingText = 'Headings.CancelCoaching';
          type = 'info';
          break;
        default:
          btnText = 'Buttons.YesCancelWebinar';
          headingText = 'Headings.CancelWebinar';
          type = 'warning';
          break;
      }

      let refund = getCancellationRefundStatus();
      let body = t('Body.CancelEvent');

      if (refund == 100) {
        body = `${body} ${t('Body.CancelEvent100%')}`;
      } else if (refund == 50) {
        body = `${body} ${t('Body.CancelEvent50%')}`;
      } else {
        body = `${body} ${t('Body.CancelEvent0%')}`;
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
              success ? 'success' : 'error',
              success ? 'Success.EventCancelled' : error?.detail ?? ''
            );

            if (success) {
              confirmCancellation.value = false;
            }
          },
        },
        secondaryBtn: {
          label: 'Buttons.Back',
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

    return {
      t,
      btn,
      CheckIcon,
      isEventBooked,
      onclickConfirm,
      dialog,
      confirm,
      confirmRightToWithdrawal,
      confirmDontUseRightToWithdrawal,
      onclickCancel,
      confirmCancellation,
      cancellationPolicy,
      todayDate,
      startDate,
      numberOfDaysUntil,
    };
  },
});
</script>

<style scoped></style>

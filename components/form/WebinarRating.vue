<template>
	<Modal class="z-100">
		<section
			class="style-card bg-secondary max-w-full w-fit md:min-w-[400px] relative"
		>
			<div class="card grid justify-items-center w-full">
				<h6 class="text-heading-2 text-heading font-heading">
					{{ t('Headings.WebinarRating') }}
				</h6>

				<img
					class="w-14 h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 flex-shrink-0 rounded-full object-cover mt-card"
					:src="instructor.avatar_url"
					:alt="t('AltAttributes.EventInstructorAvatar')"
				/>
				<h3 class="text-heading-3 mt-2 text-center">
					{{ webinar_name }}
				</h3>
				<h4 class="text-heading-4 text-center mb-card">
					{{ instructor.display_name }}
				</h4>

				<InputRating v-model="rating.value" @valid="rating.valid = $event" />

				<Btn
					:bgColor="theme.bg"
					:borderColor="theme.border"
					tertiary
					@click="onclickCancelWebinarRating"
				>
					{{ t('Body.WebinarNotParticipated') }}
				</Btn>
			</div>

			<div class="card flex gap-card justify-center bg-[#1c3250]">
				<Btn
					:bgColor="theme.bg"
					:borderColor="theme.border"
					secondary
					@click="onclickCancelWebinarRating"
				>
					{{ t('Buttons.Cancel') }}
				</Btn>
				<Btn
					:bgColor="theme.bg"
					:borderColor="theme.border"
					@click="onclickSubmitWebinarRating"
				>
					{{ t('Buttons.SubmitWebinarRating') }}
				</Btn>
			</div>
		</section>
	</Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  emits: ['done'],
  setup(props, { emit }) {
    const { t } = useI18n();

    // ============================================================= Data
    const rating = reactive({
      value: 0,
      valid: false,
    });

    const rating_id = computed(() => {
      return props.data?.id ?? '';
    });

    const instructor = computed(() => {
      return props.data?.instructor ?? null;
    });

    const webinar_name = computed(() => {
      return props.data?.webinar_name ?? '';
    });

    const theme = computed(() => {
      return {
        bg: 'bg-warning',
        bgLight: 'bg-warning-light',
        fill: 'fill-warning',
        stroke: 'stroke-warning',
        border: 'border-warning',
        text: 'text-warning',
      };
    });

    // ============================================================= functions
    async function onclickSubmitWebinarRating() {
      if (!rating.valid) {
        return;
      }

      setLoading(true);
      const [success, error] = await submitWebinarRating(
        rating_id.value,
        rating.value
      );
      setLoading(false);

      success
        ? successHandler('Success.SubmitWebinarRating')
        : errorHandler(error);
    }

    async function onclickCancelWebinarRating() {
      setLoading(true);
      const [success, error] = await cancelWebinarRating(rating_id.value);
      setLoading(false);

      success
        ? successHandler('Success.CancelWebinarRating')
        : errorHandler(error);
    }

    function successHandler(res: any) {
      openSnackbar('success', res);
      emit('done', rating_id.value);
    }

    function errorHandler(res: any) {
      openSnackbar('error', res?.detail ?? '');
    }

    return {
      rating,
      t,
      instructor,
      webinar_name,
      onclickSubmitWebinarRating,
      onclickCancelWebinarRating,
      theme,
    };
  },
});
</script>

<style scoped></style>

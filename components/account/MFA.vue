<template>
	<article class="bg-secondary card style-card grid" v-if="show">
		<h2 class="text-heading-2">{{ t('Headings.DisableMFA') }}</h2>

		<p class="mt-2 mb-4">
			{{ t('Body.DisableMFA') }}
		</p>

		<NuxtLink class="justify-self-end" to="/account/mfa/disable">
			<Btn>{{ t('Buttons.DisableMFA') }}</Btn>
		</NuxtLink>
	</article>

	<article class="bg-secondary card style-card grid" v-else>
		<h2 class="text-heading-2">{{ t('Headings.EnableMFA') }}</h2>

		<p class="mt-2 mb-4">
			{{ t('Body.EnableMFA') }}
		</p>
		<NuxtLink class="justify-self-end" to="/account/mfa/initialize">
			<Btn>{{ t('Buttons.EnableMFA') }}</Btn>
		</NuxtLink>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  setup() {
    const { t } = useI18n();
    const user = <any>useUser();

    const show = computed(() => {
      return user.value?.mfa_enabled ?? false;
    });

    return {
      t,
      show,
    };
  },
});
</script>

<style scoped></style>

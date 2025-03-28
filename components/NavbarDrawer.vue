<template>
	<div>
		<Icon class="cursor-pointer" :icon="Bars3Icon" @click="toggleMenu" />

		<Transition>
			<section
				v-if="show"
				class="w-screen h-screen fixed left-0 top-0 z-[10000]"
				@click.self="closeMenu"
			>
				<aside class="h-full w-72 bg-tertiary p-[5vw] sm:p-9 shadow-2xl">
					<NuxtLink to="/" class="flex gap-card-sm items-center">
						<img
							src="/images/logo-text.png"
							:alt="t('AltAttributes.BootstrapAcademyLogo')"
							class="object-contain w-28 cursor-pointer"
						/>
					</NuxtLink>

					<nav class="mt-10 flex flex-col gap-10">
						<NuxtLink
							v-for="({ label, pathname }, i) of links"
							:key="i"
							:to="pathname"
							class="h-fit px-2.5 py-1.5 transition-basic hover:bg-tertiary border-l-2 border-transparent rounded uppercase text-sm tracking-widest text-body hover:text-heading rounded-t-none"
							exactActiveClass="active-link"
							@click.prevent="closeMenu"
						>
							{{ t(label) }}
						</NuxtLink>
					</nav>
				</aside>
			</section>
		</Transition>
	</div>
</template>

<script>
import { Bars3Icon } from '@heroicons/vue/24/solid';
import { useI18n } from 'vue-i18n';

export default {
  components: { Bars3Icon },
  props: {
    links: { default: [] },
  },
  setup() {
    const { t } = useI18n();

    const show = ref(false);

    function closeMenu() {
      setTimeout(() => {
        show.value = false;
      }, 100);
    }
    function toggleMenu() {
      show.value = !show.value;
    }

    return { show, closeMenu, toggleMenu, Bars3Icon, t };
  },
};
</script>

<style scoped>
.v-enter-active,
.v-leave-active {
	transition: all 0.5s ease;
}

.v-enter-from,
.v-leave-to {
	opacity: 0;
	transform: translateX(-50%);
}
</style>

<template>
	<!-- removed the dialog component and put the content into the modal component. -->
    <!-- template renders the content directly (labelId, descriptionId) and transfers the ARIA attributes (role="dialog", aria-modal="true" and aria-labelledby) to the modal component via the props. -->
		<Modal
    v-if="!agreed && route.name !== 'docs-privacy'"
    :labelId="titleId"
    :descriptionId="descId"
  >
    <!-- Panel -->
    <section
      class="w-[560px] max-w-[92vw] rounded-lg shadow-lg overflow-hidden bg-primary text-white"
      :aria-labelledby="titleId"
      :aria-describedby="descId"
    >
      <!-- Header: Icon + Heading -->
      <div class="flex gap-3 items-start p-6 pb-3">
        <!-- Icon  -->
        <span class="relative inline-flex h-7 w-7 shrink-0">
          <!-- circle -->
          <span class="absolute inset-0 rounded-full bg-info" aria-hidden="true"></span>
          <!-- 'i' with Panel-background-color -->
          <span
            class="relative m-auto font-bold italic leading-none"
            style="color: var(--color-primary, transparent)"
            aria-hidden="true"
          >
            i
          </span>
        </span>

        <h2 :id="titleId" class="text-lg font-semibold leading-6 m-0">
          {{ t('Headings.CookiePolicy') }}
        </h2>
      </div>

      <!-- Body -->
      <div class="px-6 pb-4">
        <p :id="descId" class="m-0 text-sm leading-relaxed">
          {{ t('Body.CookiePolicy') }}
          <NuxtLink
            to="/docs/privacy"
            class="no-underline border-b border-[#38f7c7] hover:border-white transition-colors
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff2d55]"
          >
            {{ t('Body.CookiePolicyLink') }}
          </NuxtLink>
        </p>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 flex justify-end bg-white/5">
        <!-- Button -->
        <Btn
          :primary="true"
          :md="true"
          class="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff2d55]"
          @click="agreed = true">
          {{ t('Buttons.CookiePolicy') }}
        </Btn>
      </div>
    </section>
  </Modal>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Gleap from 'gleap'
import Btn from './Btn.vue'
import Modal from './Modal.vue'

export default defineComponent({
  components: { Btn, Modal },
  setup() {
    const { t } = useI18n()
    const config = useRuntimeConfig().public

    // Consent-Cookie
    const cookie_agreedToCookiePolicy = useCookie<boolean>('agreedToCookiePolicy')
    const route = useRoute()

    // Zustimmungs-Flag
    const agreed = computed<boolean>({
      get: () => cookie_agreedToCookiePolicy.value || false,
      set: (v: boolean) => {
        cookie_agreedToCookiePolicy.value = v
        if (v && import.meta.client) {
          if (!(window as any).__gleapInited) {
            Gleap.initialize(config.Gleap_API_KEY as string)
            ;(window as any).__gleapInited = true
          }
        }
      },
    })

    // ARIA-Hooks
    // The IDs are defined here to link the h2 and p tags to the Modal component
    const titleId = 'cookie-dialog-title'
    const descId  = 'cookie-dialog-description'

    return { t, agreed, route, titleId, descId }
  },
})
</script>

<style scoped>
:root {
  --color-primary: inherit;
}

section[aria-labelledby="cookie-dialog-title"] {

  --color-primary: #0e1b2b; 
}
</style>
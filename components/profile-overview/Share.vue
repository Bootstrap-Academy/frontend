<template>
  <section v-if="copyShareSettings?.url">
    <div
        class="card style-card bg-secondary flex flex-col gap-box items-center sm:flex-col md:flex-row lg:flex-col p-box">

      <div class="w-full text-center">
        <SectionTitle
            sub
            :heading="heading"
            :body="body"
            class="!m-0"
        />
      </div>
      <div class="flex flex-col gap-box items-center">
        <QrCode
            :url="copyShareSettings.url"
            :gradient="true"
            :gradient-start-color="'#182b45'"
            :gradient-end-color="'#0b192e'"
        />

        <div class="w-full max-w-[300px] mx-auto">
          <ShareCopy :settings="copyShareSettings" :isMobile="isMobile"/>
        </div>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import type {PropType} from 'vue'

export default defineComponent({
  name: "ProfileShare",
  props: {
    copyShareSettings: {type: Object as PropType<any>, default: null},
    isMobile: {type: Boolean, default: false},
    heading: {type: String, default: ""},
    body: {type: String, default: ""},
  },
  setup(props) {
    const isMobile = computed(() => props.isMobile)

    const copyShareSettings = computed(() => props?.copyShareSettings ?? {})

    const heading = computed(() => props.heading)

    const body = computed(() => props.body)

    return {
      copyShareSettings,
      isMobile,
      heading,
      body
    }
  }
})
</script>

<style scoped>
</style>
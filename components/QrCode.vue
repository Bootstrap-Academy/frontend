<template>
  <div v-if="url" class="bg-white w-fit p-2 border-2 border-solid border-accent rounded-md mb-box shadow-xl shadow-primary" >
    <qrcode-vue
        :value="url"
        :size="size"
        level="M"
        render-as="svg"
        :background="background"
        :foreground="foreground"
        :gradient="gradient"
        :gradient-type="gradientType"
        :gradient-start-color="gradientStartColor"
        :gradient-end-color="gradientEndColor"
        :image-settings="imageSettings"
    />
  </div>
</template>

<script setup lang="ts">
import QrcodeVue from 'qrcode.vue';
import type { GradientType, ImageSettings } from 'qrcode.vue';

const props = defineProps({
  url: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    default: 160,
  },
  background: {
    type: String,
    default: '#fff',
  },
  foreground: {
    type: String,
    default: '#0b192e',
  },
  gradient: {
    type: Boolean,
    default: false,
  },
  gradientType: {
    type: String as () => GradientType,
    default: 'linear',
  },
  gradientStartColor: {
    type: String,
    default: '#0b192e',
  },
  gradientEndColor: {
    type: String,
    default: '#182b45',
  },
  imageSettings: {
    type: Object as () => ImageSettings,
    default: () => ({
      src: '/images/logo.png',
      width: 35,
      height: 35,
      excavate: true,
    }),
  },
});
</script>
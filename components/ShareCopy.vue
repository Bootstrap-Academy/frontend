<template>
  <Btn secondary sm class="mx-auto" @click="shareOrCopyUrl">
    <IconText :icon="btText.icon">
      {{ btText.text }}
    </IconText>
  </Btn>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {useI18n} from 'vue-i18n';
import type {PropType} from "vue";
import {ClipboardIcon, ShareIcon} from "@heroicons/vue/24/outline";


export default defineComponent({
  props: {
    settings: {type: Object as PropType<any>, default: null},
    isMobile: {type: Boolean, default: false}
  },
  components: {ShareIcon, ClipboardIcon},
  setup(props) {
    const {t} = useI18n();

    const isMobile = computed(() => {
      return props.isMobile;
    });

    const url = computed(() => {
      return props?.settings?.url ?? "";
    });

    const title = computed(() => {
      return props?.settings?.title ?? "";
    });

    const text = computed(() => {
      return props?.settings?.text ?? "";
    });

    const btText = computed(() => {
      const text: string = isMobile.value ? "Buttons.Share" : "Buttons.CopyToClipboard";
      return {
        icon: isMobile.value ? ShareIcon : ClipboardIcon,
        text: t(text),
      };
    });

    const successMsg = computed(() => {
      return props?.settings?.successMsg
    });

    const shareOrCopyUrl = async () => {
      if (isMobile.value && !!navigator.share) {
        await navigator.share({
          title: title.value,
          text: text.value,
          url: url.value,
        });
        return;
      }
      await navigator.clipboard.writeText(url.value).then(() => !!successMsg?.value && successHandler(successMsg?.value)).catch(error => errorHandler(error));
    }

    function successHandler(res: any) {
      openSnackbar('success', res);
    }

    function errorHandler(res: any) {
      openSnackbar('error', res?.detail ?? '');
    }

    return {
      shareOrCopyUrl,
      t,
      btText
    }
  }
});
</script>

<style scoped>
</style>
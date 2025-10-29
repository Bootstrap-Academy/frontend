<template>
  <div>
    <Modal v-if="!agreed && route.name != 'docs-privacy'">
      <Dialog
        :dialog="dialog"
        role="dialog"
        aria-labelledby="cookie-dialog-title"
        aria-describedby="cookie-dialog-description"
        aria-modal="true"
      >
        <template #content="{ t }">
          <p id="cookie-dialog-description" class="text-body-1 m-0 text-body font-body mt-box">
            {{ t("Body.CookiePolicy") }}

            <NuxtLink to="/docs/privacy" class="underline-link inline-block w-fit">
              {{ t("Body.CookiePolicyLink") }}
            </NuxtLink>
          </p>
        </template>
      </Dialog>
    </Modal>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";

export default defineComponent({
  setup() {
    const dialog = computed(() => {
      return {
        type: "info",
        heading: "Headings.CookiePolicy",
        body: "",
        primaryBtn: {
          label: "Buttons.CookiePolicy",
          onclick: () => {
            agreed.value = true;
          },
        },
        secondaryBtn: {
          label: "",
          onclick: () => {},
        },
      };
    });

    const cookie_agreedToCookiePolicy = useCookie<boolean>("agreedToCookiePolicy");

    const router = useRouter();
    const route = useRoute();

    const agreed = computed({
      get() {
        return cookie_agreedToCookiePolicy.value || false;
      },
      set(data: boolean) {
        cookie_agreedToCookiePolicy.value = data;
      },
    });

    onMounted(() => {
      const dialogElement = document.querySelector('[role="dialog"]');
      if (dialogElement && dialogElement instanceof HTMLElement) {
        dialogElement.setAttribute("tabindex", "-1");
        dialogElement.focus();
      }
    });

    return { agreed, dialog, route };
  },
});
</script>

<style scoped></style>

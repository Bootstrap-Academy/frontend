<!--
❌ Responsive UI
✅ Page Title
✅ Translation
❌ Animation
✅ middleware

✅ Tested on chrome
✅ Tested on firefox
✅ Tested on safari
❌ Tested on android mobile
❌ Tested on apple mobile

✅ Api implemented
✅ Form Submission Process
✅ Form Post Api Error Handling + ✅ Translation
✅ Form Post Api Success Handling + ✅ Translation
-->

<template>
  <section
    class="container-fluid pt-container pb-container h-screen-inner min grid place-items-center"
  >
    <Transition mode="out-in" name="slide-up-down">
      <Dialog v-if="dialog && dialog.type" :dialog="dialog">
        <template #content>
          <div
            v-if="!!TOTP_secret"
            class="text-body-1 text-body font-body m-0 mt-box"
          >
            {{ t("Headings.TOTPSecret") }}:
            <span class="allow-selection">{{ TOTP_secret }}</span>
            <div class="bg-white p-10 w-fit h-fit mt-card">
              <qrcode-vue :size="200" :value="QR_code"></qrcode-vue>
            </div>
          </div>
        </template>
      </Dialog>
    </Transition>
  </section>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import QrcodeVue from "qrcode.vue";

definePageMeta({
  layout: "inner",
  middleware: ["auth"],
});

export default {
  head: {
    title: "Initialize MFA",
  },
  components: { QrcodeVue },
  setup() {
    const { t } = useI18n();

    const router = useRouter();
    const user = <any>useUser();

    // ============================================================= OR Code
    const QR_code = ref("");
    function getQR_code(secret: any, username: any) {
      QR_code.value = `otpauth://totp/${encodeURIComponent(
        username
      )}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(
        "Bootstrap Academy"
      )}`;
    }

    const dialog = <any>reactive({});
    const TOTP_secret = ref("");

    onMounted(async () => {
      setLoading(true);
      const [success, error] = await initializeMFA();
      setLoading(false);

      if (!!success) {
        TOTP_secret.value = success;
        getQR_code(TOTP_secret.value, user.value.name);
      }

      Object.assign(dialog, {
        type: !!success ? "success" : "error",
        heading: "InitializeMFA",
        body: !!success
          ? "Success.InitializeMFA"
          : `${t("Error.InitializeMFA")}: ${error?.detail ?? ""}`,
        primaryBtn: {
          label: !!success ? "Buttons.EnableMFA" : "Links.GoBack",
          onclick: () => {
            router.push(!!success ? "/account/mfa/enable" : "/account");
          },
        },
        secondaryBtn: null,
      });
    });

    return { t, dialog, TOTP_secret, QR_code };
  },
};
</script>

<style scoped></style>

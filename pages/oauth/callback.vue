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
    class="h-screen-inner min container-fluid grid place-items-center pt-container pb-container"
  >
    <Transition mode="out-in" name="slide-up-down">
      <Dialog v-if="dialog && dialog.type" :dialog="dialog" />
    </Transition>
  </section>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";

definePageMeta({
  layout: "inner",
});

export default {
  head: {
    title: "OAuth Login",
  },
  setup() {
    const { t } = useI18n();

    const router = useRouter();
    const route = useRoute();

    const dialog = <any>reactive({});

    onMounted(async () => {
      setLoading(true);

      // the state the provider sends back has to be the one this browser was
      // handed when it started the flow; anything else is a callback we did
      // not ask for
      const flow = takeOAuthFlow();
      const state = (route?.query?.state ?? "").toString();
      const code = (route?.query?.code ?? "").toString();

      if (!!!flow || !!!state || flow.state != state) {
        setLoading(false);
        errorHandler({ detail: "Error.OAuthStateMismatch" });
        return;
      }

      // a flow started on the account page adds the provider to the account
      // that is already signed in; every other flow signs the visitor in
      if (flow.purpose == "link") {
        const [success, error] = await createOAuthLink({ state, code });
        setLoading(false);

        if (!!success) {
          openSnackbar("success", "Success.AddLinkedLogin");
          router.push("/account");
        } else {
          errorHandler(error, "/account");
        }
        return;
      }

      const [success, error] = await loginViaOAuthProvider({ state, code });
      setLoading(false);

      success ? successHandler(success) : errorHandler(error);
    });

    function successHandler(res: any) {
      const register_token = res?.register_token ?? "";

      if (!!register_token) {
        // the token is a secret with a short lifetime: keeping it out of the
        // URL keeps it out of the browser history and out of any `Referer`
        saveRegisterToken(register_token);
        router.push("/auth/signup");
      } else {
        setStates(res?.login ?? null);
        router.push(`/profile`);
      }
    }

    function errorHandler(res: any, back: string = "/auth/login") {
      Object.assign(dialog, {
        type: "error",
        heading: "Headings.UnableToOAuth",
        body: `${t("Error.UnableToOAuth")}: ${t(res?.detail ?? "")}`,
        primaryBtn: {
          label: "Links.GoBack",
          onclick: () => {
            router.push(back);
          },
        },
        secondaryBtn: null,
      });
    }

    return { dialog };
  },
};
</script>

<style scoped></style>

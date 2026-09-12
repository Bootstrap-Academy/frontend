<script setup lang="ts">
import { useI18n } from "vue-i18n";
definePageMeta({ layout: "inner" });
const { t } = useI18n();
const m = useModeration(),
  busy = ref(false),
  message = ref("");
const recoveryMessage = ref(""),
  recoveryError = ref(false);
const providers = ref<any[]>([]),
  captchaRequired = ref(false);
let captchaLoading: Promise<void> | undefined;
let alive = true;
onBeforeUnmount(() => {
  alive = false;
});
const form = reactive({
  name_or_email: "",
  password: "",
  mfa_code: "",
  recovery_code: "",
  recaptcha_response: "",
});
const recovery = reactive({ source: "backend", case_id: "", contact: "" });
async function submitPassword() {
  if (busy.value) return;
  busy.value = true;
  message.value = "";
  try {
    await m.password({ ...form });
    if (!alive) return;
    form.password = form.mfa_code = form.recovery_code = "";
    await navigateTo("/moderation");
  } catch (error: any) {
    if (!alive) return;
    captchaRequired.value = error?.response?.status === 403;
    message.value =
      error?.response?.status === 429 ? t("Moderation.TryLater") : t("Moderation.ProofFailed");
  } finally {
    form.recaptcha_response = "";
    busy.value = false;
  }
}
async function captchaProof() {
  if (busy.value) return;
  busy.value = true;
  const valid = m.guard();
  try {
    const sitekey = await $fetch<string | null>("/auth/recaptcha", {
      baseURL: useRuntimeConfig().public.BASE_API_URL,
      credentials: "omit",
      retry: 0,
    });
    if (!valid() || !sitekey) throw new Error("CAPTCHA unavailable");
    const api = () => (window as any).grecaptcha;
    if (!api()) {
      captchaLoading ||= new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(sitekey)}`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
          captchaLoading = undefined;
          reject(new Error("CAPTCHA unavailable"));
        };
        document.head.append(script);
      });
      await captchaLoading;
    }
    if (!valid()) return;
    const token = await new Promise<string>((resolve, reject) =>
      api().ready(() => api().execute(sitekey, { action: "login" }).then(resolve, reject))
    );
    if (!valid()) return;
    form.recaptcha_response = token;
    busy.value = false;
    await submitPassword();
  } catch {
    if (alive) message.value = t("Moderation.ProofFailed");
  } finally {
    busy.value = false;
  }
}
async function recover() {
  if (busy.value) return;
  busy.value = true;
  recoveryMessage.value = "";
  recoveryError.value = false;
  try {
    await m.request("/access/recovery", { method: "POST", body: { ...recovery } }, true);
    if (alive) recoveryMessage.value = t("Moderation.RecoveryReceived");
  } catch {
    if (alive) {
      recoveryError.value = true;
      recoveryMessage.value = t("Moderation.RequestFailed");
    }
  } finally {
    busy.value = false;
  }
}
async function oauth(id: string) {
  if (busy.value) return;
  busy.value = true;
  const valid = m.guard();
  const [result] = await startOAuthFlow(id, "moderation", valid);
  if (!valid()) return;
  if (result?.authorize_url) location.assign(result.authorize_url);
  else {
    message.value = t("Moderation.ProofFailed");
    busy.value = false;
  }
}
onMounted(async () => {
  try {
    if (m.importFragment()) return await navigateTo("/moderation");
  } catch {
    message.value = t("Moderation.ProofFailed");
  }
  try {
    providers.value = await $fetch("/auth/oauth/providers", {
      baseURL: useRuntimeConfig().public.BASE_API_URL,
      credentials: "omit",
      retry: 0,
    });
  } catch {
    providers.value = [];
  }
});
</script>

<template>
  <main class="moderation-page moderation-surface grid max-w-2xl gap-6">
    <header class="grid gap-3">
      <h1>{{ t("Moderation.Title") }}</h1>
      <p>{{ t("Moderation.AccessExplanation") }}</p>
    </header>
    <section class="support-card grid gap-4" aria-labelledby="moderation-login-heading">
      <h2 id="moderation-login-heading">{{ t("Moderation.LoginHeading") }}</h2>
      <p v-if="message" role="alert">{{ message }}</p>
      <form class="grid gap-4" @submit.prevent="submitPassword">
        <fieldset :disabled="busy" class="grid min-w-0 gap-4">
          <legend class="sr-only">{{ t("Moderation.LoginHeading") }}</legend>
          <label
            >{{ t("Inputs.EmailOrUsername")
            }}<input v-model="form.name_or_email" required autocomplete="username"
          /></label>
          <label
            >{{ t("Inputs.Password")
            }}<input
              v-model="form.password"
              required
              type="password"
              autocomplete="current-password"
          /></label>
          <details>
            <summary>{{ t("Moderation.SecondFactorHeading") }}</summary>
            <div class="grid gap-3">
              <p class="support-help">{{ t("Moderation.SecondFactorHelp") }}</p>
              <label
                >{{ t("Inputs.MFACode")
                }}<input v-model="form.mfa_code" inputmode="numeric" autocomplete="one-time-code"
              /></label>
              <label
                >{{ t("Inputs.RecoveryCode")
                }}<input v-model="form.recovery_code" autocomplete="off"
              /></label>
            </div>
          </details>
          <button type="submit" :disabled="busy">
            {{ busy ? t("Moderation.Working") : t("Moderation.Prove") }}
          </button>
        </fieldset>
      </form>
      <section v-if="captchaRequired" class="grid gap-3">
        <p class="support-help">{{ t("Moderation.CaptchaNotice") }}</p>
        <NuxtLink to="/docs/privacy">{{ t("Links.Privacy") }}</NuxtLink>
        <button type="button" :disabled="busy" @click="captchaProof">
          {{ t("Moderation.CaptchaProof") }}
        </button>
      </section>
      <div v-if="providers.length" class="grid gap-2">
        <p class="support-help">{{ t("Moderation.LinkedLogin") }}</p>
        <div class="flex flex-wrap gap-3">
          <button
            v-for="provider in providers"
            :key="provider.id"
            type="button"
            :disabled="busy"
            @click="oauth(provider.id)"
          >
            {{ provider.name }}
          </button>
        </div>
      </div>
      <NuxtLink to="/auth/forgot-password" class="w-fit">{{ t("Links.ForgotPassword") }}</NuxtLink>
    </section>
    <details class="case-recovery">
      <summary>{{ t("Moderation.CaseAccess") }}</summary>
      <form class="grid gap-4" @submit.prevent="recover">
        <p id="case-recovery-help" class="support-help">{{ t("Moderation.CaseAccessHelp") }}</p>
        <fieldset :disabled="busy" class="grid min-w-0 gap-4" aria-describedby="case-recovery-help">
          <legend class="sr-only">{{ t("Moderation.CaseAccess") }}</legend>
          <label
            >{{ t("Moderation.Area")
            }}<select v-model="recovery.source">
              <option value="backend">{{ t("Moderation.Account") }}</option>
              <option value="challenges">{{ t("Moderation.Content") }}</option>
            </select></label
          >
          <label
            >{{ t("Moderation.Case")
            }}<input v-model="recovery.case_id" required autocomplete="off"
          /></label>
          <label
            >{{ t("Moderation.Contact")
            }}<input v-model="recovery.contact" type="email" required autocomplete="email"
          /></label>
          <button type="submit" :disabled="busy">
            {{ busy ? t("Moderation.Working") : t("Moderation.RequestAccess") }}
          </button>
        </fieldset>
        <p
          v-if="recoveryMessage"
          :role="recoveryError ? 'alert' : 'status'"
          :class="{ 'support-success': !recoveryError }"
        >
          {{ recoveryMessage }}
        </p>
      </form>
    </details>
    <details class="retained-access">
      <summary>{{ t("Moderation.SavedAccess") }}</summary>
      <CommercialAccess
        :identity="`${m.epoch.value}:${m.recipient.value}`"
        :personal-proof="m.commercialPersonalProof"
        :personal-read-context="m.commercialOriginalRead"
      />
    </details>
    <p class="support-help">
      {{ t("Moderation.ContactHelp") }}
      <a href="mailto:hallo@bootstrap.academy">hallo@bootstrap.academy</a>
    </p>
  </main>
</template>
<style src="../../assets/css/account-support.css"></style>

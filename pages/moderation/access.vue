<script setup lang="ts">
import { useI18n } from "vue-i18n";
definePageMeta({ layout: "inner" });
const { t } = useI18n();
const m = useModeration(),
  busy = ref(false),
  message = ref("");
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
  try {
    await m.request("/access/recovery", { method: "POST", body: { ...recovery } }, true);
    message.value = t("Moderation.RecoveryReceived");
  } catch {
    message.value = t("Moderation.RequestFailed");
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
  <main class="moderation-page mx-auto grid max-w-2xl gap-8 p-6 text-body">
    <h1>{{ t("Moderation.Title") }}</h1>
    <p>{{ t("Moderation.AccessExplanation") }}</p>
    <p v-if="message" role="status">{{ message }}</p>
    <CommercialAccess
      :identity="`${m.epoch.value}:${m.recipient.value}`"
      :personal-proof="m.commercialPersonalProof"
      :personal-read-context="m.commercialOriginalRead"
    />
    <form class="grid gap-4" @submit.prevent="submitPassword">
      <fieldset :disabled="busy" class="grid gap-4">
        <label
          >{{ t("Inputs.EmailOrUsername")
          }}<input v-model="form.name_or_email" required autocomplete="username"
        /></label>
        <label
          >{{ t("Inputs.Password")
          }}<input v-model="form.password" required type="password" autocomplete="current-password"
        /></label>
        <label
          >{{ t("Inputs.MFACode")
          }}<input v-model="form.mfa_code" inputmode="numeric" autocomplete="one-time-code"
        /></label>
        <label
          >{{ t("Inputs.RecoveryCode") }}<input v-model="form.recovery_code" autocomplete="off"
        /></label>
        <button type="submit" :disabled="busy">{{ t("Moderation.Prove") }}</button>
      </fieldset>
    </form>
    <section v-if="captchaRequired" class="grid gap-3">
      <p>{{ t("Moderation.CaptchaNotice") }}</p>
      <NuxtLink to="/docs/privacy">{{ t("Links.Privacy") }}</NuxtLink
      ><button type="button" :disabled="busy" @click="captchaProof">
        {{ t("Moderation.CaptchaProof") }}
      </button>
    </section>
    <div v-if="providers.length" class="flex flex-wrap gap-4">
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
    <NuxtLink to="/auth/forgot-password">{{ t("Links.ForgotPassword") }}</NuxtLink>
    <form class="grid gap-4" @submit.prevent="recover">
      <h2>{{ t("Moderation.CaseAccess") }}</h2>
      <label
        >{{ t("Moderation.Area")
        }}<select v-model="recovery.source">
          <option value="backend">{{ t("Moderation.Account") }}</option>
          <option value="challenges">{{ t("Moderation.Content") }}</option>
        </select></label
      >
      <label>{{ t("Moderation.Case") }}<input v-model="recovery.case_id" required /></label>
      <label
        >{{ t("Moderation.Contact")
        }}<input v-model="recovery.contact" type="email" required autocomplete="email"
      /></label>
      <button type="submit" :disabled="busy">{{ t("Moderation.RequestAccess") }}</button>
    </form>
    <p>
      {{ t("Moderation.ContactHelp") }}
      <a href="mailto:hallo@bootstrap.academy">hallo@bootstrap.academy</a>
    </p>
    <NuxtLink to="/vertrag-kuendigen">{{ t("Moderation.CancelContract") }}</NuxtLink>
    <NuxtLink to="/vertrag-widerrufen">{{ t("Moderation.WithdrawContract") }}</NuxtLink>
  </main>
</template>
<style scoped>
label {
  display: grid;
  gap: 0.5rem;
}
input,
select {
  color: #111827;
  background: white;
  border: 1px solid #94a3b8;
  border-radius: 0.3rem;
  padding: 0.65rem;
  min-width: 0;
}
button {
  border: 1px solid currentColor;
  border-radius: 0.3rem;
  padding: 0.65rem;
}
button:disabled {
  opacity: 0.5;
}
button:focus-visible,
input:focus-visible,
select:focus-visible,
a:focus-visible {
  outline: 3px solid var(--color-body);
  outline-offset: 3px;
}
</style>

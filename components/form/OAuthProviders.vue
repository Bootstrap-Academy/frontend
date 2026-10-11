<!--
  The sign-in providers (GitHub, Google, Discord) as the log-in and the sign-up form show them.
  Both start the same flow: an account that exists is logged in, a new one comes back to the
  sign-up form with its provider attached.
-->
<template>
  <article
    v-if="providers.length > 0"
    class="grid grid-cols-[1fr_auto_1fr] items-center gap-card-sm mt-card mb-card"
  >
    <hr />
    <p>{{ t(label) }}</p>
    <hr />
  </article>

  <article class="flex flex-wrap justify-center gap-container">
    <button
      v-for="{ id, name, icon } of providers"
      :key="id"
      type="button"
      :disabled="startingProvider != ''"
      :aria-label="t(action, { provider: name })"
      class="cursor-pointer disabled:cursor-wait disabled:opacity-50"
      @click="onclickProvider(id)"
    >
      <component
        v-if="icon"
        :is="icon"
        lg
        :color="id == 'github' ? 'fill-heading' : ''"
      ></component>
      <span v-else class="underline">{{ name }}</span>
    </button>
  </article>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import IconGithub from "~/components/icon/Github.vue";
import IconGoogle from "~/components/icon/Google.vue";
import IconDiscord from "~/components/icon/Discord.vue";

defineProps<{
  /** The line between the form and the providers. */
  label: string;
  /** What a provider's button is called, with `{provider}` for its name. */
  action: string;
}>();
const { t } = useI18n();
const icons: Record<string, unknown> = {
  google: IconGoogle,
  discord: IconDiscord,
  github: IconGithub,
};
const oauthProviders = useOauthProviders();
const providers = computed(() =>
  (oauthProviders.value || [])
    .filter((item: any) => !!item && !!item.id)
    .map((item: any) => ({ ...item, icon: icons[item.id] ?? null }))
);
onMounted(getOAuthProviders);

/**
 * The authorize URL is built by the backend, which puts an unguessable
 * single use `state` and a PKCE challenge into it. The browser keeps the
 * `state` until the provider sends it back, so a callback that this
 * browser did not start is rejected on the callback page.
 */
const startingProvider = ref("");

async function onclickProvider(provider_id: string) {
  if (startingProvider.value != "") return;

  startingProvider.value = provider_id;
  const [success, error] = await startOAuthFlow(provider_id);

  if (!!success?.authorize_url) {
    window.location.href = success.authorize_url;
    return;
  }

  startingProvider.value = "";
  openSnackbar("error", "Error.UnableToOAuth", error?.detail ?? "");
}
</script>

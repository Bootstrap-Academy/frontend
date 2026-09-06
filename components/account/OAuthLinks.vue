<template>
  <article class="card flex flex-col items-center justify-center bg-secondary style-card">
    <LinkIcon class="mb-4 h-10 w-10 max-w-xl text-accent" />

    <h2 class="text-heading-2">{{ t("Headings.LinkedLogins") }}</h2>

    <p class="mb-8 mt-2 max-w-xl text-center">
      {{ t("Body.LinkedLogins") }}
    </p>

    <LoadingDots v-if="loading" class="mb-8">{{ t("Body.LinkedLoginsLoading") }}</LoadingDots>

    <p v-else-if="links.length <= 0" class="mb-8 text-center">
      {{ t("Body.LinkedLoginsEmpty") }}
    </p>

    <ul v-else class="mb-8 w-full max-w-xl space-y-4">
      <li
        v-for="link of links"
        :key="link.id"
        class="flex items-center justify-between gap-4 border-b border-tertiary pb-4 last:border-b-0"
      >
        <div class="flex min-w-0 items-center gap-4">
          <component
            v-if="iconFor(link.provider_id)"
            :is="iconFor(link.provider_id)"
            :color="link.provider_id == 'github' ? 'fill-heading' : ''"
          ></component>
          <div class="min-w-0">
            <p class="font-semibold">{{ nameFor(link.provider_id) }}</p>
            <p class="truncate text-sm">{{ link.display_name }}</p>
          </div>
        </div>

        <Btn secondary sm :disabled="removing == link.id" @click="onclickRemove(link)">
          {{ t("Buttons.RemoveLink") }}
        </Btn>
      </li>
    </ul>

    <template v-if="!loading && unlinkedProviders.length > 0">
      <p class="mb-4 max-w-xl text-center text-sm">{{ t("Body.LinkedLoginsAdd") }}</p>

      <div class="mb-8 flex flex-wrap justify-center gap-4">
        <Btn
          v-for="provider of unlinkedProviders"
          :key="provider.id"
          secondary
          sm
          :disabled="linking != ''"
          @click="onclickAdd(provider.id)"
        >
          {{ t("Buttons.LinkAccount", { provider: provider.name }) }}
        </Btn>
      </div>
    </template>

    <template v-if="providerSettings.length > 0">
      <p class="max-w-xl text-center text-sm">
        {{ t("Body.LinkedLoginsRevokeHint") }}
      </p>

      <ul class="mt-2 flex flex-wrap justify-center gap-4 text-sm">
        <li v-for="[provider_id, href] of providerSettings" :key="provider_id">
          <a :href="href" target="_blank" rel="noopener noreferrer" class="text-accent underline">
            {{ nameFor(provider_id) }}
          </a>
        </li>
      </ul>
    </template>
  </article>
</template>

<script lang="ts">
import { LinkIcon } from "@heroicons/vue/24/solid";
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";
import IconGithub from "~/components/icon/Github.vue";
import IconGoogle from "~/components/icon/Google.vue";
import IconDiscord from "~/components/icon/Discord.vue";

/**
 * Where a user withdraws the authorisation itself. Removing the link here only
 * deletes what we store; the grant stays in place at the provider until it is
 * revoked there, and we never receive a token we could revoke on their behalf.
 */
const PROVIDER_SETTINGS: Record<string, string> = {
  github: "https://github.com/settings/applications",
  google: "https://myaccount.google.com/permissions",
  discord: "https://discord.com/settings/authorized-apps",
};

const PROVIDER_ICONS: Record<string, any> = {
  github: IconGithub,
  google: IconGoogle,
  discord: IconDiscord,
};

export default defineComponent({
  components: {
    LinkIcon,
  },
  setup() {
    const { t } = useI18n();

    const links = ref<any[]>([]);
    const loading = ref(true);
    const removing = ref("");
    const linking = ref("");

    const oauthProviders = useOauthProviders();

    /**
     * Only point at the settings pages of providers this deployment actually
     * offers - a link to a provider that cannot be used here would be noise.
     */
    const providerSettings = computed(() =>
      Object.entries(PROVIDER_SETTINGS).filter(([provider_id]) =>
        (<any[]>oauthProviders.value ?? []).some((provider: any) => provider?.id == provider_id)
      )
    );

    /**
     * Providers the account can still be connected to. Removing a link would
     * otherwise be a one way door: the login page signs a visitor in, it does
     * not attach a provider to an account that already exists.
     */
    const unlinkedProviders = computed(() => {
      const linked = new Set(links.value.map((link: any) => link?.provider_id));

      return (<any[]>oauthProviders.value ?? []).filter(
        (provider: any) => !!provider?.id && !linked.has(provider.id)
      );
    });

    function iconFor(provider_id: string) {
      return PROVIDER_ICONS[provider_id] ?? null;
    }

    /** Display name of the provider, falling back to its id. */
    function nameFor(provider_id: string) {
      const provider = (<any[]>oauthProviders.value ?? []).find(
        (item: any) => item?.id == provider_id
      );
      return provider?.name ?? provider_id;
    }

    async function load() {
      loading.value = true;
      const [success, error] = await getOAuthLinks();
      loading.value = false;

      if (!!error) {
        openSnackbar("error", "Error.UnableToLoadLinkedLogins", error?.detail ?? "");
        return;
      }

      links.value = success ?? [];
    }

    onMounted(async () => {
      await Promise.all([getOAuthProviders(), load()]);
    });

    /**
     * Start an authorization flow whose callback attaches the provider to this
     * account instead of signing somebody in.
     */
    async function onclickAdd(provider_id: string) {
      if (linking.value != "") return;

      linking.value = provider_id;
      const [success, error] = await startOAuthFlow(provider_id, "link");

      if (!!success?.authorize_url) {
        window.location.href = success.authorize_url;
        return;
      }

      linking.value = "";
      openSnackbar("error", "Error.UnableToAddLinkedLogin", error?.detail ?? "");
    }

    function onclickRemove(link: any) {
      openDialog(
        "warning",
        "Headings.RemoveLinkedLogin",
        "Body.RemoveLinkedLogin",
        false,
        {
          label: "Buttons.RemoveLink",
          onclick: async () => {
            removing.value = link.id;
            const [success, error] = await deleteOAuthLink(link.id);
            removing.value = "";

            if (!!success) {
              await load();
              await getUser();
              openSnackbar("success", "Success.RemoveLinkedLogin");
            } else {
              openSnackbar("error", "Error.UnableToRemoveLinkedLogin", error?.detail ?? "");
            }
          },
        },
        {
          label: "Buttons.Cancel",
          onclick: () => {},
        }
      );
    }

    return {
      t,
      links,
      loading,
      removing,
      linking,
      unlinkedProviders,
      providerSettings,
      iconFor,
      nameFor,
      onclickAdd,
      onclickRemove,
    };
  },
});
</script>

import { createI18n } from "vue-i18n";
import en from "../locales/en-US.json";
import de from "../locales/de.json";
import { SITE_NAME, canonicalUrl, pageTitle } from "~/utils/siteHead";

export default defineNuxtPlugin(({ vueApp }) => {
  // Read only: the cookie is written in `components/Language.vue`, i.e. only
  // when the user actually picks a language.
  const locale = useAppCookie("locale", { readonly: true });
  const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    messages: { "en-US": en, de },
    defaultLocale: "de",
    locale: locale.value === "en-US" || locale.value === "en" ? "en-US" : "de",
    loadLanguagesAsync: true,
    langDir: "~/locales",
    strategy: "no_prefix",
    missingWarn: false,
    fallbackWarn: false,
    silentTranslationWarn: true,
  });

  vueApp.use(i18n);
  const route = useRoute();
  const web = String(useRuntimeConfig().public.BASE_WEB_URL || "");
  // The legal pages are named in the tab and in a search result as in the footer.
  const legal: [RegExp, string][] = [
    [/^\/docs\/privacy\/?$/, "Links.Privacy"],
    [/^\/docs\/imprint\/?$/, "Links.Imprint"],
    [/^\/docs\/terms-and-conditions(-[\w-]+)?\/?$/, "Links.TermsAndConditions"],
    [/^\/docs\/right-of-withdrawal\/?$/, "Links.RightOfWithdrawal"],
  ];
  useHead(() => {
    const key = legal.find(([pattern]) => pattern.test(route.path))?.[1];
    // One address per page, in the form with a trailing slash, without query and anchor.
    const url = web ? canonicalUrl(web, route.path) : "";
    return {
      htmlAttrs: { lang: i18n.global.locale.value === "en-US" ? "en" : "de" },
      // The built HTML carries the title of the start page. A page that names none of its
      // own is called by the name of the site, as before.
      title: key ? pageTitle(i18n.global.t(key)) : SITE_NAME,
      link: url ? [{ rel: "canonical", href: url }] : [],
      meta: url ? [{ property: "og:url", content: url }] : [],
    };
  });
});

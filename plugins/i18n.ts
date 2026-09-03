import { createI18n } from "vue-i18n";
import en from "../locales/en-US.json";
import de from "../locales/de.json";

export default defineNuxtPlugin(({ vueApp }) => {
  // Read only: the cookie is written in `components/Language.vue`, i.e. only
  // when the user actually picks a language.
  const locale = useAppCookie("locale", { readonly: true });
  const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    messages: { "en-US": en, de },
    defaultLocale: "de",
    locale: locale.value || "de",
    loadLanguagesAsync: true,
    langDir: "~/locales",
    strategy: "no_prefix",
    missingWarn: false,
    fallbackWarn: false,
    silentTranslationWarn: true,
  });

  vueApp.use(i18n);
});

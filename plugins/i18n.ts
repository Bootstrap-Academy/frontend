import { createI18n } from 'vue-i18n';
import en from '../locales/en-US.json';
import de from '../locales/de.json';

export default defineNuxtPlugin(({ vueApp }) => {
  const locale = useCookie('locale');
  const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    messages: { 'en-US': en, de },
    defaultLocale: 'de',
    locale: locale.value || 'de',
    loadLanguagesAsync: true,
    langDir: '~/locales',
    strategy: 'no_prefix',
    missingWarn: false,
    fallbackWarn: false,
    silentTranslationWarn: true,
  });

  vueApp.use(i18n);
});

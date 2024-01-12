import Gleap from 'gleap';

export default defineNuxtPlugin(({ vueApp }) => {
  const config = useRuntimeConfig().public;
  const cookie_agreedToCookiePolicy = useCookie<boolean>(
    'agreedToCookiePolicy'
  );

  if (process.client && cookie_agreedToCookiePolicy.value == true) {
    Gleap.initialize(config.Gleap_API_KEY);
  }
});

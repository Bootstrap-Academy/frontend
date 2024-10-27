// https://v3.nuxtjs.org/api/configuration/nuxt.config

export default defineNuxtConfig({
  ssr: false,
  app: {
    head: {
      title: "Bootstrap Academy",
      link: [{ rel: "manifest", href: "manifest.txt" }],
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "theme-color", content: "#000000" },
        { hid: "description", name: "description", content: "Learn computer science online" },

        { property: "name", content: "Bootstrap Academy" },
        { property: "description", content: "Learn computer science online" },
        { property: "image", content: "https://bootstrap.academy/images/logo.png" },

        { property: "og:url", content: "https://bootstrap.academy" },
        { property: "og:type", content: "website" },
        { property: "og:title", content: "Bootstrap Academy" },
        { property: "og:description", content: "Learn computer science online" },
        { property: "og:image", content: "https://bootstrap.academy/images/logo.png" },

        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Bootstrap Academy" },
        { name: "twitter:description", content: "Learn computer science online" },
        { name: "twitter:image", content: "https://bootstrap.academy/images/logo.png" },
      ],
    },
    pageTransition: { name: "page", mode: "out-in" },
    layoutTransition: { name: "layout", mode: "out-in" },
  },
  css: ["~/assets/css/tailwind.css"],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  runtimeConfig: {
    public: {
      BASE_API_URL: "https://api.test.bootstrap.academy",
      BASE_WEB_URL: "https://test.bootstrap.academy",
      Gleap_API_KEY: "8TVLuULNmWxZHIifA1PW6TYHUCKEb5so",
      Vue3ReCaptcha_SITE_KEY: "6Ldb070iAAAAAKsAt_M_ilgDbnWcF-N_Pj2DBBeP",
      NODE_ENV: "production",
    },
  },
});

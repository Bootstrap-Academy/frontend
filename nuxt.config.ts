// https://v3.nuxtjs.org/api/configuration/nuxt.config
import { execFileSync } from "node:child_process";

function feedbackBuild() {
  try {
    const revision = execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
      encoding: "utf8",
    }).trim();
    try {
      execFileSync("git", ["diff", "--quiet", "HEAD"], { stdio: "ignore" });
      return revision;
    } catch {
      return revision + "-dirty";
    }
  } catch {
    return "unavailable";
  }
}

// A registration-only rollout must bind its displayed document and version.
const registrationVersion = process.env.NUXT_PUBLIC_REGISTRATION_TERMS_VERSION || "";
const registrationUrl = process.env.NUXT_PUBLIC_REGISTRATION_TERMS_URL || "";
if (!!registrationVersion !== !!registrationUrl)
  throw new Error("Registration terms require both a version and its document URL");
if (registrationVersion && registrationUrl !== `/docs/terms-and-conditions-${registrationVersion}`)
  throw new Error("Registration terms must link to their exact versioned document");

export default defineNuxtConfig({
  ssr: false,

  // Our reload handler keeps the loop guard without persisting user state.
  experimental: { emitRouteChunkError: "manual", restoreState: false },

  app: {
    // Language, title, description and the preview of a shared link: modules/discoverable.ts
    head: {
      link: [{ rel: "manifest", href: "/manifest.txt" }],
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "theme-color", content: "#000000" },
      ],
    },
    pageTransition: { name: "page", mode: "out-in" },
    layoutTransition: { name: "layout", mode: "out-in" },
    buildAssetsDir: "/_assets/",
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
      NODE_ENV: "production",
      FEEDBACK_BUILD: feedbackBuild(),
      profilePublicationEnabled: false,
      learningRoomsEnabled: true,
      lessonProtocolV2: false,
      lessonContentOrigin: "",
      // Disabled until the reviewed registration cohort and documents are published.
      registrationTermsVersion: "",
      registrationTermsUrl: "",
    },
  },

  compatibilityDate: "2025-02-13",
});

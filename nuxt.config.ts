// https://v3.nuxtjs.org/api/configuration/nuxt.config
import { execFileSync } from "node:child_process";
import { parseEffectiveStart } from "./utils/legalEffectiveDate";
import { parseAnnouncement } from "./utils/termsAnnouncement";

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

// Terms 2026-10 take effect at this moment (`composables/terms.ts`). A value that is not the
// start of a day in Berlin stops the build. Test is built from develop with the defaults here,
// so the default is the provisional start of the Test acceptance, the same moment as the
// backend of Test and its rendered PDFs; the Prod derivation of this file sets it to "".
const terms202610From = process.env.NUXT_PUBLIC_TERMS_2026_10_FROM || "2026-10-19T00:00:00+02:00";
if (parseEffectiveStart(terms202610From) && registrationVersion)
  throw new Error("Terms 2026-10 replace the registration-only terms; set only one of them");

// From this moment until terms 2026-10 take effect, accounts see their notice
// (`components/TermsNotice.vue`). A value that does not lie before the start stops the build.
const terms202610Announced = process.env.NUXT_PUBLIC_TERMS_2026_10_ANNOUNCED || "";
parseAnnouncement(terms202610Announced, parseEffectiveStart(terms202610From));

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
      // Lesson protocol v2 with packages from the content origin of Test; production keeps false and "".
      lessonProtocolV2: true,
      lessonContentOrigin: "https://49.13.123.1",
      // Disabled until the reviewed registration cohort and documents are published.
      registrationTermsVersion: "",
      registrationTermsUrl: "",
      // Start of terms 2026-10 as an ISO timestamp, 00:00 Europe/Berlin; empty: not published.
      TERMS_2026_10_FROM: terms202610From,
      // Announcement of terms 2026-10 as an ISO timestamp; empty: no notice.
      TERMS_2026_10_ANNOUNCED: terms202610Announced,
    },
  },

  compatibilityDate: "2025-02-13",
});

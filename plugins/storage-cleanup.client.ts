import { clearObsoleteUpdateNotices } from "../composables/updateNotice";

export default defineNuxtPlugin(() => {
  try {
    clearObsoleteUpdateNotices(window.localStorage);
    window.localStorage.removeItem("selectedButtonLeaderBoard");
  } catch {
    /* No function requires these obsolete view markers. */
  }
});

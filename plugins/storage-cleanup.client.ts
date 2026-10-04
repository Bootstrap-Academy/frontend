import { clearExpiredUpdateNotices } from "../composables/updateNotice";

export default defineNuxtPlugin(() => {
  try {
    clearExpiredUpdateNotices(window.localStorage);
    window.localStorage.removeItem("selectedButtonLeaderBoard");
  } catch {
    /* No function requires these obsolete view markers. */
  }
});

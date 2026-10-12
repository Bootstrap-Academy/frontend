import { clearExpiredVerificationMails } from "../composables/emailVerification";
import { clearObsoleteUpdateNotices } from "../composables/updateNotice";

export default defineNuxtPlugin(() => {
  try {
    clearObsoleteUpdateNotices(window.localStorage);
    window.localStorage.removeItem("selectedButtonLeaderBoard");
  } catch {
    /* No function requires these obsolete view markers. */
  }
  try {
    // This also removes the notes of accounts that never came back to this browser.
    clearExpiredVerificationMails(window.localStorage);
  } catch {
    /* A note that cannot be removed runs out with its code. */
  }
});

import { clearLearningStorage } from "~/utils/learningStorage";
import {
  acceptLearningLogout,
  learningLogoutSignal,
  LEARNING_LOGOUT_CHANNEL,
  LEARNING_LOGOUT_SIGNAL,
} from "~/utils/learningLogoutSync";

export default defineNuxtPlugin((app) => {
  const receive = (value: unknown) => {
    const signal = learningLogoutSignal(value);
    if (!signal) return;
    app.runWithContext(() => {
      // Reread cookies before owner watchers checkpoint the previous learner.
      const current = getSessionSnapshot();
      if (!acceptLearningLogout(signal, current)) return;
      if (current.userId === signal.userId) setStates(null);
      clearLearningStorage(signal.userId);
    });
  };
  let channel: BroadcastChannel | undefined;
  try {
    channel = new BroadcastChannel(LEARNING_LOGOUT_CHANNEL);
    channel.onmessage = (event) => receive(event.data);
  } catch {
    /* Keep the storage-event fallback. */
  }
  const storage = (event: StorageEvent) => {
    if (event.key !== LEARNING_LOGOUT_SIGNAL || !event.newValue) return;
    try {
      receive(JSON.parse(event.newValue));
    } catch {
      /* An unrelated or malformed signal cannot clear learning data. */
    }
  };
  window.addEventListener("storage", storage);
  try {
    window.localStorage.removeItem(LEARNING_LOGOUT_SIGNAL);
  } catch {
    /* No persistent signal is required to operate the app. */
  }
  app.vueApp.onUnmount(() => {
    channel?.close();
    window.removeEventListener("storage", storage);
  });
});

/**
 * The app has one feedback dialog, in `FeedbackLauncher` (app.vue), so that a draft outlives
 * navigation. A lesson frame covers the whole window and with it the page's own button. While a
 * frame is open it counts itself in `useFeedbackCovered`; the page's button then steps back, and
 * the frame's bar offers a button that opens the same dialog through `useFeedbackOpen`.
 */
export const useFeedbackOpen = () => useState("feedbackOpen", () => false);
export const useFeedbackCovered = () => useState("feedbackCovered", () => 0);

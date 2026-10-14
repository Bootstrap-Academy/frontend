import { isPracticeRoute, practiceCache } from "~/utils/coursePractice";

/**
 * The exercises of a course stay loaded while the learner works in it: course page, lectures,
 * quiz, matching and coding pages. Once the learner goes anywhere else (a lesson page, a
 * learning room, the dashboard), the next visit reads them again, so answers given meanwhile
 * show up.
 */
export default defineNuxtPlugin(() => {
  useRouter().afterEach((to) => {
    if (!isPracticeRoute(to.path)) practiceCache.forget();
  });
});

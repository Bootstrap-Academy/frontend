import { isPracticeRoute, practiceCache } from "~/utils/coursePractice";
import { courseVisit } from "~/utils/courseVisit";

/**
 * The course and its exercises stay loaded while the learner works in it: course page, lectures,
 * quiz, matching and coding pages. Once the learner goes anywhere else (a lesson page, a
 * learning room, the dashboard), the next visit reads them again, so answers given meanwhile
 * show up, and reports the visit to the server again.
 */
export default defineNuxtPlugin(() => {
  useRouter().afterEach((to) => {
    if (isPracticeRoute(to.path)) return;
    practiceCache.forget();
    courseVisit.forget();
  });
});

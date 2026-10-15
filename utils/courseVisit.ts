import type { Course } from "../types/courseTypes";

/**
 * The course the learner has open, read and reported to the server (`POST …/watch`) once per
 * visit. Coming back to the course page from the course's quiz, matching or coding pages shows it
 * as the learner left it; leaving the course's pages ends the visit
 * (`plugins/course-practice.client.ts`), and the next visit reads and reports again.
 */
export function createCourseVisit() {
  let key = "";
  let kept: Course | null = null;
  return {
    forget() {
      key = "";
      kept = null;
    },
    /** The course of a visit that goes on for this account, session and course, if any. */
    course(owner: string, id: string) {
      return key === JSON.stringify([owner, id]) ? kept : null;
    },
    /** The course has been read and the visit reported; the page keeps this object up to date. */
    keep(owner: string, id: string, course: Course) {
      key = JSON.stringify([owner, id]);
      kept = course;
    },
  };
}
export type CourseVisit = ReturnType<typeof createCourseVisit>;
/** The app's current course visit. */
export const courseVisit = createCourseVisit();

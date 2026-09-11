import { ref } from "vue";
import type { LearningCourseOperation } from "./learningAccess";

type Lecture = {
  id: string;
  title: string;
  description: string | null;
  type: "mp4" | "youtube";
  video_id?: string;
  completed: boolean;
};
type Section = { id: string; title: string; lectures: Lecture[] };
type Course = { id: string; title: string; description: string | null; sections: Section[] };
type Options = {
  request: (operation: LearningCourseOperation) => Promise<unknown>;
  identity: () => string;
  apiBase: string;
};
const invalid = () => new Error("invalid_response");
const id = (v: unknown): v is string =>
  typeof v === "string" && !!v && v.length <= 256 && ![".", ".."].includes(v);
function courseFrom(value: any, expected: string): Course {
  if (
    !value ||
    value.id !== expected ||
    typeof value.title !== "string" ||
    !(value.description === null || typeof value.description === "string") ||
    !Array.isArray(value.sections)
  )
    throw invalid();
  const sections = value.sections.map((section: any) => {
    if (!id(section.id) || typeof section.title !== "string" || !Array.isArray(section.lectures))
      throw invalid();
    const lectures = section.lectures.map((lecture: any) => {
      if (
        !id(lecture.id) ||
        typeof lecture.title !== "string" ||
        typeof lecture.completed !== "boolean" ||
        !(lecture.description === null || typeof lecture.description === "string") ||
        !["youtube", "mp4"].includes(lecture.type) ||
        (lecture.type === "youtube" &&
          (typeof lecture.video_id !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(lecture.video_id)))
      )
        throw invalid();
      return {
        id: lecture.id,
        title: lecture.title,
        description: lecture.description,
        type: lecture.type,
        completed: lecture.completed,
        ...(lecture.type === "youtube" ? { video_id: lecture.video_id } : {}),
      } as Lecture;
    });
    return { id: section.id, title: section.title, lectures };
  });
  if (
    new Set(sections.map((s: Section) => s.id)).size !== sections.length ||
    new Set(sections.flatMap((s: Section) => s.lectures.map((l) => l.id))).size !==
      sections.reduce((n: number, s: Section) => n + s.lectures.length, 0)
  )
    throw invalid();
  return { id: value.id, title: value.title, description: value.description, sections };
}

/** Current scoped course data only. No ordinary-account stores, purchase helpers or persisted media. */
export function createRetainedCourses(options: Options) {
  const courses = ref<{ id: string; title: string }[]>([]),
    course = ref<Course | null>(null);
  const selected = ref<{ course: string; section: string; lecture: string } | null>(null);
  const lecture = ref<Lecture | null>(null),
    media = ref(""),
    youtubeLoaded = ref(false);
  const busy = ref(false),
    loaded = ref(false),
    error = ref(""),
    progressUncertain = ref(false);
  let alive = true,
    generation = 0;
  function clearMedia() {
    media.value = "";
    youtubeLoaded.value = false;
  }
  function clear() {
    generation++;
    courses.value = [];
    course.value = null;
    selected.value = null;
    lecture.value = null;
    clearMedia();
    busy.value = loaded.value = progressUncertain.value = false;
    error.value = "";
  }
  function begin() {
    if (!alive) throw new Error("stale_view");
    const epoch = ++generation,
      identity = options.identity();
    busy.value = true;
    error.value = "";
    return () => alive && generation === epoch && identity === options.identity();
  }
  async function readCourse(courseId: string, valid: () => boolean) {
    const value = await options.request({ kind: "details", course: courseId });
    if (!valid()) throw new Error("stale_view");
    return courseFrom(value, courseId);
  }
  async function run(action: (valid: () => boolean) => Promise<void>) {
    const valid = begin();
    try {
      await action(valid);
    } catch (cause) {
      if (valid()) {
        error.value = "Unavailable";
        course.value = null;
        lecture.value = null;
        clearMedia();
      }
      throw cause;
    } finally {
      if (valid()) busy.value = false;
    }
  }
  async function load() {
    course.value = null;
    selected.value = null;
    lecture.value = null;
    clearMedia();
    courses.value = [];
    loaded.value = false;
    await run(async (valid) => {
      const value = await options.request({ kind: "list" });
      if (!valid()) throw new Error("stale_view");
      if (
        !Array.isArray(value) ||
        value.some((v) => !id(v?.id) || typeof v.title !== "string") ||
        new Set(value.map((v) => v.id)).size !== value.length
      )
        throw invalid();
      courses.value = value.map((v) => ({ id: v.id, title: v.title }));
      loaded.value = true;
    });
  }
  async function openCourse(courseId: string) {
    if (!courses.value.some((v) => v.id === courseId)) throw new Error("invalid_resource");
    course.value = null;
    selected.value = null;
    lecture.value = null;
    clearMedia();
    await run(async (valid) => {
      course.value = await readCourse(courseId, valid);
      progressUncertain.value = false;
    });
  }
  function mediaURL(value: unknown) {
    if (typeof value !== "string") throw invalid();
    const base = new URL(options.apiBase),
      url = new URL(value);
    const prefix = base.pathname.replace(/\/$/, "") + "/skills/learning/lectures/";
    if (
      url.origin !== base.origin ||
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !url.pathname.startsWith(prefix) ||
      !/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.%-]+\.mp4$/.test(url.pathname.slice(prefix.length))
    )
      throw invalid();
    return url.href;
  }
  async function openLecture(sectionId: string, lectureId: string, youtube = false) {
    const courseId = course.value?.id;
    if (!courseId) throw new Error("invalid_resource");
    selected.value = { course: courseId, section: sectionId, lecture: lectureId };
    lecture.value = null;
    clearMedia();
    await run(async (valid) => {
      // Cached metadata never grants a newly selected video or YouTube load.
      const current = await readCourse(courseId, valid);
      const chosen = current.sections
        .find((s) => s.id === sectionId)
        ?.lectures.find((l) => l.id === lectureId);
      if (!chosen) throw new Error("invalid_resource");
      const watched = await options.request({ kind: "watch", course: courseId });
      if (!valid()) throw new Error("stale_view");
      if (watched !== true) throw invalid();
      let source = "";
      if (chosen.type === "mp4") {
        source = mediaURL(
          await options.request({ kind: "media", course: courseId, lecture: lectureId })
        );
        if (!valid()) throw new Error("stale_view");
      } else if (youtube)
        source = `https://www.youtube-nocookie.com/embed/${chosen.video_id}?rel=0`;
      course.value = current;
      lecture.value = chosen;
      media.value = source;
      youtubeLoaded.value = youtube && chosen.type === "youtube";
      progressUncertain.value = false;
    });
  }
  async function refreshProgress() {
    const chosen = selected.value;
    if (!chosen) throw new Error("invalid_resource");
    clearMedia();
    lecture.value = null;
    await run(async (valid) => {
      const current = await readCourse(chosen.course, valid);
      const updated = current.sections
        .find((s) => s.id === chosen.section)
        ?.lectures.find((l) => l.id === chosen.lecture);
      if (!updated) throw new Error("invalid_resource");
      course.value = current;
      lecture.value = updated;
      progressUncertain.value = false;
    });
  }
  async function complete() {
    const chosen = selected.value;
    if (!chosen || !lecture.value || lecture.value.completed || progressUncertain.value)
      throw new Error("invalid_resource");
    clearMedia();
    progressUncertain.value = true;
    await run(async (valid) => {
      try {
        await options.request({ kind: "complete", course: chosen.course, lecture: chosen.lecture });
      } catch {
        /* Reread authoritative progress after an ambiguous completion response. */
      }
      if (!valid()) throw new Error("stale_view");
      const current = await readCourse(chosen.course, valid);
      const updated = current.sections
        .find((s) => s.id === chosen.section)
        ?.lectures.find((l) => l.id === chosen.lecture);
      if (!updated) throw new Error("invalid_resource");
      course.value = current;
      lecture.value = updated;
      progressUncertain.value = false;
      if (!updated.completed) error.value = "CompletionUnconfirmed";
    });
  }
  return {
    courses,
    course,
    selected,
    lecture,
    media,
    youtubeLoaded,
    busy,
    loaded,
    error,
    progressUncertain,
    load,
    openCourse,
    openLecture,
    refreshProgress,
    complete,
    clear,
    clearMedia,
    dispose() {
      clear();
      alive = false;
    },
  };
}

import { useState } from "#app";
import { Course } from "~/types/courseTypes";
import type { GetUnseenLectureResponse } from "~/types/courseTypes";
import { createCourseCatalogue } from "~/utils/courseCatalogue";
import type { CourseCatalogueFilters } from "~/utils/courseCatalogue";

const fetchCatalogue = createCourseCatalogue<Course>(
  (url) => GET(url),
  () => {
    const snapshot = getSessionSnapshot();
    return JSON.stringify([snapshot.identity, snapshot.generation]);
  }
);

export async function getCourseCatalogue(filters: CourseCatalogueFilters) {
  try {
    return [await fetchCatalogue({ ...filters }), null] as const;
  } catch (error: any) {
    return [null, error?.data || error] as const;
  }
}

export const useListOfCompletedCourses = () => useState("listOfCompletedCourses", (): any[] => []);
export const useMyCourses = () => useState("myCourses", (): any[] => []);
export const useCourses = () => useState<Course[]>("courses", (): Course[] => []);
export const useCourse = () => useState<Course>("course", (): Course => new Course());
export const useVideoSRC = () => useState("videoSRC", (): string => "");

export async function getTheseCourses(arrOfCourseIDs: string[]) {
  // console.log("in get theses courses")
  let promises: any[] = [];

  try {
    if (!!!arrOfCourseIDs || arrOfCourseIDs.length <= 0) {
      throw { data: { detail: "Empty Course IDs array" } };
    }

    arrOfCourseIDs.forEach((id) => {
      promises.push(getCourseSummaryByID(id));
    });

    const responses = await Promise.all(promises);

    const courses = useCourses();

    responses.forEach((response: any[]) => {
      if (!!response[0]) {
        courses.value.push(response[0]);
      }
    });

    return [responses, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function getMyCourses() {
  try {
    const response: Course[] = await GET(`/skills/courses?owned=true&recent_first=true`);

    const myCourses = useMyCourses();
    myCourses.value = response ?? [];

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function getCourses() {
  try {
    const response: Course[] = await GET(`/skills/courses`);

    const courses = useCourses();
    courses.value = response ?? [];

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function watchCourse(id: string) {
  try {
    const response = await POST(`/skills/courses/${id}/watch`);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function getCourseByID(id: string) {
  try {
    if (!!!id) {
      throw { data: { detail: "Invalid course ID" } };
    }

    const response: Course = await GET(`/skills/courses/${id}`);

    const course = useCourse();
    course.value = response ?? null;

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function getCourseSummaryByID(id: string) {
  try {
    if (!!!id) {
      throw { data: { detail: "Invalid course ID" } };
    }

    const response: Course = await GET(`/skills/courses/${id}/summary`);

    const course = useCourse();
    course.value = response ?? null;

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function enrollIntoCourse(id: string, acceptance: any) {
  try {
    if (!!!id) {
      throw { data: { detail: "Invalid course ID" } };
    }

    const response = await POST(`/skills/course_access/${id}`, acceptance);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function getLectureVideoSRC(courseID: string, { id, video_id, type }: any) {
  try {
    if (!!!courseID) {
      throw { data: { detail: "Invalid course ID" } };
    }
    if (!!!id) {
      throw { data: { detail: "Invalid lecture ID" } };
    }
    if (!!!type) {
      throw { data: { detail: "Invalid lecture type" } };
    }

    const videoSRC = useVideoSRC();

    if (type == "youtube") {
      if (!!!video_id) {
        throw { data: { detail: "Invalid lecture video id" } };
      }

      videoSRC.value = `https://www.youtube-nocookie.com/embed/${video_id}?rel=0`;
      return [true, null];
    }

    const response = await GET(`/skills/courses/${courseID}/lectures/${id}`);

    videoSRC.value = response ?? null;

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function completeLecture(courseID: string, lectureID: string) {
  try {
    if (!!!courseID) {
      throw { data: { detail: "Invalid course ID" } };
    }
    if (!!!lectureID) {
      throw { data: { detail: "Invalid lecture ID" } };
    }

    const response = await PUT(`/skills/courses/${courseID}/lectures/${lectureID}/complete`);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function verifyCertificate(body: any) {
  try {
    const response = await GET(`/skills/course_access`);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function getUnseenLecture(
  courseId: string
): Promise<GetUnseenLectureResponse | undefined> {
  const response: GetUnseenLectureResponse = await GET(
    `skills/courses/${courseId}/next_unseen`
  ).catch((err) => {
    throw new Error("Error in getting unseen lecture + " + err.message);
  });
  if (response) {
    return response;
  }
}

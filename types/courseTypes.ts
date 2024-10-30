type Author = {
  name: string;
  url: string;
};

export class Course{
  authors: Author[] = [];
  category: string = "";
  description: string = "";
  id: string = "";
  image: string = "";
  language: string = "";
  last_update: number = 0;
  learning_goals: unknown[] = [];
  price: number = 0;
  requirements: unknown[] = [];
  sections: Section[] = [];
  title: string = "";
}

export class Section{
  description: string = "";
  id?: string = ""; // ? Only in Detailed Course-response
  completed?: boolean = false; // ? Only in Course-summary
  title: string = "";
  lectures: Lecture[] = [];
}

export class Lecture{
  completed: boolean = false;
  description: string = "";
  duration: number = 0;
  id: string = "";
  title: string = "";
  type: string = "";
  video_id: string = "";
}

export interface GetUnseenLectureResponse {
    lecture: Omit<Lecture, "completed">;
    section: Omit<Section, "completed">;
}
export class LecturesWithQuiz{
  course_id: string = ""
  id: string = ""
  lecture_id: string = ""
  section_id: string = ""
}

export class Quiz{
  coins: number = 0;
  creation_timestamp: string = "";
  creator: string = "";
  enabled: boolean = false;
  id: string = "";
  question: string = "";
  rated: boolean = false;
  retired: boolean = false;
  single_choice: boolean = false;
  solved: boolean = false;
  task_id: string = "";
  type: string = ""; // ? 'MULTIPLE_CHOICE_QUESTION
  xp: number = 0;
  answers: string [] = [];
}

export class QuizInUnseenLecture {
  section: string = "";
  sectionTitle: string = "";
  lecture: string = "";
  lectureId: string = "";
  lectureFinished: boolean = false;
}
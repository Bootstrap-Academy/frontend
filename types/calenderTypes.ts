export class Calendar {
  ics_token: string = "";
  events: WebinarEvent[] | CoachingEvent[] = [];
}

export class EventBase {
  id: string = "";
  type: "webinar" | "coaching" = "webinar"; // "coaching" | "webinar"
  title: string = "";
  description: string = "";
  skill_id: string = "";
  start: number = 0;
  duration: number = 0;
  price: number = 0;
  instructor: Instructor = new Instructor();
  instructor_rating: null | number = null;
  booked: boolean = false; // "sold-out"?
  bookable: boolean = false;
  admin_link: string = "";
  link: string = "";
}

export class Instructor {
  avatar_url: string = "";
  display_name: string = "";
  email: string = "";
  id: string = "";
  name: string = "";
}

export class WebinarEvent extends EventBase {
  type: "webinar" = "webinar";
  creation_date: number = 0;
  max_participants: number = 0;
  participants: number = 0;
}

export class CoachingEvent extends EventBase {
  type: "coaching" = "coaching";
  student: {
		id: string;
		name: string;
		display_name: string;
		email: string;
		avatar_url: string;
	} = {
      id: "",
      name: "",
      display_name: "",
      email: "",
      avatar_url: "",
    };
}

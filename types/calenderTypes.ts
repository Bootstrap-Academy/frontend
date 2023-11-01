

export class Calendar {
    ics_token: string = ''
    events: Event[] = []
}

export class Event {
    admin_link: string = ''
    bookable: boolean = false
    booked: boolean = false // "sold-out"?
    creation_date: number = 0
    description: string = ''
    duration: number = 0
    id: string = ''
    instructor: unknown
    instructor_rating: null | number = null
    link: string = ''
    max_participants: number = 0
    participants: number = 0
    price: number = 0
    skill_id: string = ''
    start: number = 0
    title: string = ''
    type: string = '' // "coaching" | "webinar" 
}
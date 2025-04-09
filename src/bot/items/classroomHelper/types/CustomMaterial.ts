import { classroom_v1 } from "@googleapis/classroom";
import { MaterialTypes } from ".././enums/MaterialTypes";

export interface IMaterial {
    id: string,
    courseId: string,
    title: string | null,
    description: string | null,
    link: string,
    creationTime: string,
    type: MaterialTypes,
    dueDate?: classroom_v1.Schema$Date,
    dueTime?: classroom_v1.Schema$TimeOfDay
}
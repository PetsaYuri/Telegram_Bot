import { classroom_v1 } from "@googleapis/classroom";

export interface ITask {
    title: string,
    description?: string,
    dueDate?: classroom_v1.Schema$Date,
    dueTime?: classroom_v1.Schema$TimeOfDay,
    maxPoints?: number
}
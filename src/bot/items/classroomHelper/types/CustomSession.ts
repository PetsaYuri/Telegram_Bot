import { Scenes } from "telegraf"

export interface ICreateTaskSession {
    cursor: number,
    state: {
        title?: string,
        description?: string,
        dueDate?: string,
        dueTime?: string,
        maxPoints?: string
    }
}
export interface IEditTaskSession {
    cursor: number,
    state: {
        title?: string,
        description?: string,
        dueDate?: string,
        dueTime?: string,
        maxPoints?: string
    }
}
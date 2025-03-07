import { MaterialTypes } from "../enums/MaterialTypes";

export interface IMaterial {
    id: string,
    courseId: string,
    title: string | null,
    description: string | null,
    link: string,
    creationTime: string,
    type: MaterialTypes
}
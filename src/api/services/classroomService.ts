import { google } from "googleapis";
import User from "../models/users";
import { OAUTH2_CLIENT } from "./authService";
import { IMaterial } from "../types/CustomMaterial";
import { ICourseInfo } from "../types/CustomCourseInfo";

export const classroomService = {

    getAllClassroomCourses: async (chatId: number | undefined): Promise<ICourseInfo[]> => {
        const user = await User.findOne({ chatId });

        if (user) {
            OAUTH2_CLIENT.setCredentials({ refresh_token: user.refreshToken });
            const classroom = google.classroom({ version: 'v1', auth: OAUTH2_CLIENT });
            const courses = (await classroom.courses.list()).data.courses;

            if (!courses) {
                throw new Error("Can't retrieve courses from classroom");
            }

            return courses
                .filter(course => Boolean(course.id) && Boolean(course.name))
                .map(course => ({
                    id: course.id as string,
                    name: course.name as string
                }) as ICourseInfo);
        }

        throw new Error("not auth inside 'getAllClassrooms'");
    },

    getAllMaterials: async (chatId: number, courseId: string, lastTimeRetrieved?: Date): Promise<(IMaterial)[]> => {
        const user = await User.findOne({ chatId });

        if (user) {
            OAUTH2_CLIENT.setCredentials({ refresh_token: user.refreshToken });
            const classroom = google.classroom({ version: 'v1', auth: OAUTH2_CLIENT });

            const courseWorks = (await classroom.courses.courseWork.list({ courseId: courseId.toString() })).data.courseWork;
            const announcements = (await classroom.courses.announcements.list({ courseId: courseId.toString() })).data.announcements;
            const courseWorkMaterials = (await classroom.courses.courseWorkMaterials.list({ courseId: courseId.toString() })).data.courseWorkMaterial;

            const allMaterials = [...courseWorks ?? [], ...announcements ?? [], ...courseWorkMaterials ?? []];
            const customMaterials = allMaterials
                .map(material => ({
                    id: material.id as string,
                    courseId: material.courseId as string,
                    title: 'title' in material ? material.title : '',
                    description: 'description' in material ? material.description : '',
                    link: material.alternateLink as string,
                    creationTime: material.creationTime as string
                }) as IMaterial);

            if (lastTimeRetrieved) {
                const filteredCustomMaterials = customMaterials
                    .filter((material) => lastTimeRetrieved.getTime() < new Date(material.creationTime).getTime());

                return filteredCustomMaterials;
            }

            return customMaterials;
        }

        throw new Error("not auth inside 'getAllClassrooms'");
    }
}
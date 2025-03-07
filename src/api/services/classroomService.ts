import { classroom_v1, google } from "googleapis";
import User from "../models/users";
import { OAUTH2_CLIENT } from "./authService";
import { IMaterial } from "../types/CustomMaterial";
import { ICourseInfo } from "../types/CustomCourseInfo";
import { MaterialTypes } from "../enums/MaterialTypes";

export const classroomService = {

    getAllOwnCourses: async (chatId: number | undefined): Promise<ICourseInfo[]> => {
        const classroom = await getClassroom(chatId);
        const courses = (await classroom.courses.list()).data.courses;

        if (!courses) {
            throw new Error("Can't retrieve courses from classroom");
        }

        const ownerId = (await classroom.userProfiles.get({ userId: 'me' })).data.id;
        return courses
            .filter(course => course.ownerId === ownerId)
            .map(course => ({
                id: course.id as string,
                name: course.name as string,
                ownerId: course.ownerId as string
            }) as ICourseInfo);
    },

    getAllAvailableCourses: async (chatId: number | undefined): Promise<ICourseInfo[]> => {
        const classroom = await getClassroom(chatId);
        const courses = (await classroom.courses.list()).data.courses;

        if (!courses) {
            throw new Error("Can't retrieve courses from classroom");
        }

        const ownerId = (await classroom.userProfiles.get({ userId: 'me' })).data.id;
        return courses
            .filter(course => Boolean(course.id) && Boolean(course.name) && Boolean(course.ownerId) && course.ownerId !== ownerId)
            .map(course => ({
                id: course.id as string,
                name: course.name as string,
                ownerId: course.ownerId as string
            }) as ICourseInfo);
    },

    getAllMaterials: async (chatId: number, courseId: string, lastTimeRetrieved?: Date): Promise<(IMaterial)[]> => {
        const classroom = await getClassroom(chatId);

        const courseWorks = (await classroom.courses.courseWork.list({ courseId: courseId.toString() })).data.courseWork;
        const announcements = (await classroom.courses.announcements.list({ courseId: courseId.toString() })).data.announcements;
        const courseWorkMaterials = (await classroom.courses.courseWorkMaterials.list({ courseId: courseId.toString() })).data.courseWorkMaterial;

        const allMaterials = [
            ...courseWorks
                ?.map(courseWork => ({ ...courseWork, type: MaterialTypes.COURSE_WORK })) ?? [],

            ...announcements
                ?.map(announcement => ({ ...announcement, type: MaterialTypes.ANNOUNCEMENT })) ?? [],

            ...courseWorkMaterials
                ?.map(courseWorkMaterial => ({ ...courseWorkMaterial, type: MaterialTypes.COURSE_WORK_MATERIAL })) ?? []
        ];

        const customMaterials = allMaterials
            .map(material => ({
                id: material.id as string,
                courseId: material.courseId as string,
                title: 'title' in material ? material.title : '',
                description: 'description' in material ? material.description : '',
                link: material.alternateLink as string,
                creationTime: material.creationTime as string,
                type: material.type
            }) as IMaterial);

        if (lastTimeRetrieved) {
            const filteredCustomMaterials = customMaterials
                .filter((material) => lastTimeRetrieved.getTime() < new Date(material.creationTime).getTime());

            return filteredCustomMaterials;
        }

        return customMaterials;
    },

    getOwnerIdFromUserProfile: async (chatId: number | undefined): Promise<string> => {
        const classroom = await getClassroom(chatId);
        return (await classroom.userProfiles.get({ userId: 'me' })).data.id as string;
    },

    getOwnerIdFromCourse: async (chatId: number | undefined, courseId: number): Promise<string> => {
        const classroom = await getClassroom(chatId);
        return (await classroom.courses.get({ id: courseId.toString() })).data.ownerId as string;
    },

    //edit
    editMaterial: async (chatId: number | undefined, courseId: string, materialId: string): Promise<string> => {
        const classroom = await getClassroom(chatId);
        const message = 'successfully edit';
        const materialType = await getMaterialType(chatId, courseId, materialId);
        switch (materialType) {
            case MaterialTypes.COURSE_WORK:
                //  const courseWork = (await classroom.courses.courseWork.list()).data.courseWork?.pop();
                //  courseWork?.title = 'new title';
                await classroom.courses.courseWork.patch({
                    courseId,
                    id: materialId,
                    requestBody: {
                        title: 'new'
                    }
                })

                return message;

            case MaterialTypes.COURSE_WORK_MATERIAL:
                classroom.courses.courseWorkMaterials.delete({
                    courseId,
                    id: materialId
                })

                return message;

            case MaterialTypes.ANNOUNCEMENT:
                classroom.courses.announcements.delete({
                    courseId,
                    id: materialId
                })

                return message;

            default:
                throw new Error(`Cannot delete material with id: '${materialId}'`)
        }
    },

    deleteMaterial: async (chatId: number | undefined, courseId: string, materialId: string): Promise<string> => {
        const classroom = await getClassroom(chatId);
        const message = 'successfully deleted';
        const materialType = await getMaterialType(chatId, courseId, materialId);
        switch (materialType) {
            case MaterialTypes.COURSE_WORK:
                await classroom.courses.courseWork.delete({
                    courseId,
                    id: materialId
                })

                return message;

            case MaterialTypes.COURSE_WORK_MATERIAL:
                classroom.courses.courseWorkMaterials.delete({
                    courseId,
                    id: materialId
                })

                return message;

            case MaterialTypes.ANNOUNCEMENT:
                classroom.courses.announcements.delete({
                    courseId,
                    id: materialId
                })

                return message;

            default:
                throw new Error(`Cannot delete material with id: '${materialId}'`)
        }
    }
}

async function getClassroom(chatId: number | undefined): Promise<classroom_v1.Classroom> {
    const user = await User.findOne({ chatId });

    if (!user) {
        throw new Error(`The user with chatId '${chatId}' isn't authorised`);
    }

    OAUTH2_CLIENT.setCredentials({ refresh_token: user.refreshToken });
    return google.classroom({ version: 'v1', auth: OAUTH2_CLIENT });
}

async function getMaterialType(chatId: number | undefined, courseId: string, materialId: string): Promise<MaterialTypes> {
    const classroom = await getClassroom(chatId);
    const courseWorks = (await classroom.courses.courseWork.list({ courseId })).data.courseWork;

    const isCourseWork = courseWorks?.filter(course => {
        return course.id === materialId
    }).length !== 0

    if (isCourseWork) {
        return MaterialTypes.COURSE_WORK;
    }

    const courseWorkMaterials = (await classroom.courses.courseWorkMaterials.list({ courseId })).data.courseWorkMaterial;
    const isCourseWorkMaterial = courseWorkMaterials?.filter(coureWork => {
        return coureWork.id === materialId
    }).length !== 0

    if (isCourseWorkMaterial) {
        return MaterialTypes.COURSE_WORK_MATERIAL;
    }

    const announcements = (await classroom.courses.announcements.list({ courseId })).data.announcements;
    const isAnnouncement = announcements?.filter(announcements => {
        return announcements.id === materialId
    }).length !== 0

    if (isAnnouncement) {
        return MaterialTypes.ANNOUNCEMENT;
    }

    throw new Error('Cannot define the type of material')
}
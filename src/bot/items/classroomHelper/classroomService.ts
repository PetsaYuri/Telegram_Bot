import User from "../../../api/models/users";
import { OAUTH2_CLIENT } from "../../../api/services/authService";
import { IMaterial } from "./types/CustomMaterial";
import { ICourseInfo } from "./types/CustomCourseInfo";
import { MaterialTypes } from "./enums/MaterialTypes";
import { classroom_v1 } from "@googleapis/classroom";
import { decryptUserData } from "../../../api/services/userService";
import { ITask } from "./types/ITask";

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

    getAllMaterials: async (chatId: number | undefined, courseId: string, lastTimeRetrieved?: Date): Promise<(IMaterial)[]> => {
        const classroom = await getClassroom(chatId);

        const courseWorks = (await classroom.courses.courseWork.list({ courseId: courseId.toString() })).data.courseWork;
        const announcements = (await classroom.courses.announcements.list({ courseId: courseId.toString() })).data.announcements;
        const courseWorkMaterials = (await classroom.courses.courseWorkMaterials.list({ courseId: courseId.toString() })).data.courseWorkMaterial;

        const allMaterials = [
            ...courseWorks
                ?.map(courseWork => ({ ...courseWork, type: MaterialTypes.COURSE_WORK, dueDate: courseWork.dueDate, dueTime: courseWork.dueTime })) ?? [],

            ...announcements
                ?.map(announcement => ({ ...announcement, type: MaterialTypes.ANNOUNCEMENT, dueDate: null, dueTime: null })) ?? [],

            ...courseWorkMaterials
                ?.map(courseWorkMaterial => ({ ...courseWorkMaterial, type: MaterialTypes.COURSE_WORK_MATERIAL, dueDate: null, dueTime: null })) ?? []
        ];

        const customMaterials = allMaterials
            .map(material => {
                return ({
                    id: material.id as string,
                    courseId: material.courseId as string,
                    title: 'title' in material ? material.title : '',
                    description: 'description' in material ? material.description : '',
                    link: material.alternateLink as string,
                    creationTime: material.creationTime as string,
                    type: material.type,
                    dueDate: material.dueDate,
                    dueTime: material.dueTime
                }) as IMaterial
            });

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

    getTask: async (chatId: number | undefined, courseId: string, taskId: string): Promise<classroom_v1.Schema$CourseWork> => {
        return getCourseWorkById(chatId, courseId, taskId)
    },

    createTask: async (chatId: number | undefined, courseName: string, taskProps: ITask): Promise<string> => {
        const classroom = await getClassroom(chatId);
        const course = await getCourseByName(chatId, courseName);

        const requestBody = generateReqBodyForTask(taskProps, 'create');
        const createdTask = await classroom.courses.courseWork.create({
            courseId: course.id as string,
            requestBody
        });

        return createdTask.data.alternateLink as string;
    },

    editTask: async (chatId: number | undefined, courseId: string, taskId: string, taskProps: ITask): Promise<string> => {
        const classroom = await getClassroom(chatId);
        const course = await getCourseById(chatId, courseId);

        const requestBody = generateReqBodyForTask(taskProps, 'update');
        const updateMask = getUpdateMask(requestBody);

        const updatedTask = await classroom.courses.courseWork.patch({
            courseId: course.id as string,
            id: taskId,
            requestBody,
            updateMask
        });
        return updatedTask.data.alternateLink as string;
    },

    deleteTask: async (chatId: number | undefined, courseId: string, taskId: string): Promise<string> => {
        const classroom = await getClassroom(chatId);
        const message = 'successfully deleted';
        const materialType = await getMaterialType(chatId, courseId, taskId);

        switch (materialType) {
            case MaterialTypes.COURSE_WORK:
                await classroom.courses.courseWork.delete({
                    courseId,
                    id: taskId
                })

                return message;

            case MaterialTypes.COURSE_WORK_MATERIAL:
                classroom.courses.courseWorkMaterials.delete({
                    courseId,
                    id: taskId
                })

                return message;

            case MaterialTypes.ANNOUNCEMENT:
                classroom.courses.announcements.delete({
                    courseId,
                    id: taskId
                })

                return message;

            default:
                throw new Error(`Cannot delete task with id: '${taskId}'`)
        }
    },

    getCourseNameById: async (chatId: number | undefined, courseId: string): Promise<string | null | undefined> => {
        return (await getCourseById(chatId, courseId)).name;
    },

    getCourseIdByName: async (chatId: number | undefined, courseName: string): Promise<string | null | undefined> => {
        return (await getCourseByName(chatId, courseName))?.id;
    }
}

async function getClassroom(chatId: number | undefined): Promise<classroom_v1.Classroom> {
    const user = await User.findOne({ chatId });

    if (!user) {
        throw new Error(`The user with chatId '${chatId}' isn't authorised`);
    }

    const decryptedToken = decryptUserData(user.refreshToken);
    OAUTH2_CLIENT.setCredentials({ refresh_token: decryptedToken });
    return new classroom_v1.Classroom({ auth: OAUTH2_CLIENT });
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

async function getCourseById(chatId: number | undefined, courseId: string): Promise<classroom_v1.Schema$Course> {
    const classroom = await getClassroom(chatId);
    return (await classroom.courses.get({ id: courseId })).data;
}

async function getCourseWorkById(chatId: number | undefined, courseId: string, courseWorkId: string): Promise<classroom_v1.Schema$CourseWork> {
    const classroom = await getClassroom(chatId);

    return (await classroom.courses.courseWork.get({
        id: courseWorkId,
        courseId
    })).data;
}

async function getCourseByName(chatId: number | undefined, courseName: string): Promise<classroom_v1.Schema$Course> {
    const classroom = await getClassroom(chatId);
    const courses = (await classroom.courses.list()).data.courses;
    const course = courses?.find(course => course.name === courseName);

    if (!course) {
        if (!course) {
            throw new Error(`We couldn't find the course by the provided name. 
                Please, make sure the '${courseName}' course exists.`);
        }
    }
    return course;
}

function generateReqBodyForTask(taskProps: ITask, type: 'create' | 'update') {
    let requestBody = { title: taskProps.title };

    switch (type) {
        case 'create':
            Object.assign(requestBody, {
                state: "PUBLISHED",
                maxPoints: 100,
                workType: 'ASSIGNMENT',
            })
            break;

        case 'update':
            requestBody = {
                title: taskProps.title
            }
            break;
    }

    if (taskProps.dueDate) {
        Object.assign(requestBody, { dueDate: taskProps.dueDate });
    }

    if (taskProps.dueTime) {
        Object.assign(requestBody, { dueTime: taskProps.dueTime });
    }

    if (taskProps.description) {
        Object.assign(requestBody, { description: taskProps.description });
    }

    if (taskProps.maxPoints && taskProps.maxPoints > 0) {
        Object.assign(requestBody, { maxPoints: taskProps.maxPoints });
    }

    return requestBody;
}

function getUpdateMask(requestBody: object): string {
    const names = Object.getOwnPropertyNames(requestBody);
    let updateMask = '';

    for (let name of names) {
        updateMask += name + ',';
    }
    return updateMask.substring(0, updateMask.length - 1);
}
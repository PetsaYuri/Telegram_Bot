import User from "../../../api/models/users";
import { OAUTH2_CLIENT } from "../../../api/services/authService";
import { IMaterial } from "./types/CustomMaterial";
import { ICourseInfo } from "./types/CustomCourseInfo";
import { MaterialTypes } from "./enums/MaterialTypes";
import { classroom_v1 } from "@googleapis/classroom";
import { decryptUserData } from "../../../api/services/userService";
import { ITask } from "./types/ITask";
import { translationsHandler } from "../../../api/middleware/translationsHandler";
import { translationKeys } from "../../translations/TranslationsKeys";
import { format, getLang } from "../../botService";
import { SceneSessionData } from "telegraf/typings/scenes";

export const classroomService = {

    getAllOwnCourses: async (chatId: number | undefined, scenes: SceneSessionData | undefined): Promise<ICourseInfo[]> => {
        const classroom = await getClassroom(chatId, scenes);
        const courses = (await classroom.courses.list()).data.courses;
        const lang = getLang(scenes);

        if (!courses) {
            throw new Error(translationsHandler(translationKeys.CLASSROOM_HELPER_CANT_RETRIEVE_COURSES_TEXT, lang));
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

    getAllAvailableCourses: async (chatId: number | undefined, scenes: SceneSessionData | undefined): Promise<ICourseInfo[]> => {
        const classroom = await getClassroom(chatId, scenes);
        const courses = (await classroom.courses.list()).data.courses;
        const lang = getLang(scenes);

        if (!courses) {
            throw new Error(translationsHandler(translationKeys.CLASSROOM_HELPER_CANT_RETRIEVE_COURSES_TEXT, lang));
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

    getAllMaterials: async (chatId: number | undefined, scenes: SceneSessionData | undefined, courseId: string, lastTimeRetrieved?: Date): Promise<(IMaterial)[]> => {
        const classroom = await getClassroom(chatId, scenes);

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
                    dueTime: material.dueTime,
                    materials: material.materials
                }) as IMaterial
            });

        if (lastTimeRetrieved) {
            const filteredCustomMaterials = customMaterials
                .filter((material) => lastTimeRetrieved.getTime() < new Date(material.creationTime).getTime());

            return filteredCustomMaterials;
        }

        return customMaterials;
    },

    getOwnerIdFromUserProfile: async (chatId: number | undefined, scenes: SceneSessionData | undefined): Promise<string> => {
        const classroom = await getClassroom(chatId, scenes);
        return (await classroom.userProfiles.get({ userId: 'me' })).data.id as string;
    },

    getOwnerIdFromCourse: async (chatId: number | undefined, scenes: SceneSessionData | undefined, courseId: number): Promise<string> => {
        const classroom = await getClassroom(chatId, scenes);
        return (await classroom.courses.get({ id: courseId.toString() })).data.ownerId as string;
    },

    getTask: async (chatId: number | undefined, scenes: SceneSessionData | undefined, courseId: string, taskId: string): Promise<classroom_v1.Schema$CourseWork> => {
        return getCourseWorkById(chatId, scenes, courseId, taskId)
    },

    createTask: async (chatId: number | undefined, scenes: SceneSessionData | undefined, courseName: string, taskProps: ITask): Promise<string> => {
        const classroom = await getClassroom(chatId, scenes);
        const course = await getCourseByName(chatId, scenes, courseName);

        const requestBody = generateReqBodyForTask(taskProps, 'create');
        const createdTask = await classroom.courses.courseWork.create({
            courseId: course.id as string,
            requestBody
        });

        return createdTask.data.alternateLink as string;
    },

    editTask: async (chatId: number | undefined, scenes: SceneSessionData | undefined, courseId: string, taskId: string, taskProps: ITask): Promise<string> => {
        const classroom = await getClassroom(chatId, scenes);
        const course = await getCourseById(chatId, scenes, courseId);

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

    deleteTask: async (chatId: number | undefined, scenes: SceneSessionData | undefined, courseId: string, taskId: string): Promise<string> => {
        const classroom = await getClassroom(chatId, scenes);
        const lang = getLang(scenes);

        const message = translationsHandler(translationKeys.CLASSROOM_HELPER_SUCCESS_DELETED_TEXT, lang);
        const materialType = await getMaterialType(chatId, scenes, courseId, taskId);

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
                throw new Error(format(translationsHandler(translationKeys.CLASSROOM_HELPER_CANNOT_DELETE_TASK_TEXT, lang), taskId));
        }
    },

    getCourseNameById: async (chatId: number | undefined, scenes: SceneSessionData | undefined, courseId: string): Promise<string | null | undefined> => {
        return (await getCourseById(chatId, scenes, courseId)).name;
    },

    getCourseIdByName: async (chatId: number | undefined, scenes: SceneSessionData | undefined, courseName: string): Promise<string | null | undefined> => {
        return (await getCourseByName(chatId, scenes, courseName))?.id;
    },

    getAllMaterialsWithActualDueDate: async (chatId: number | undefined, scenes: SceneSessionData | undefined, dateStart?: Date, courseId?: string): Promise<IMaterial[]> => {
        let userCourses: ICourseInfo[] = [];

        if (courseId) {
            const specifiedCourse = await getCourseById(chatId, scenes, courseId);

            if (specifiedCourse && specifiedCourse.id && specifiedCourse.name && specifiedCourse.ownerId) {
                userCourses.push({ id: specifiedCourse.id, name: specifiedCourse.name, ownerId: specifiedCourse.ownerId });
            }

        } else {
            userCourses = await classroomService.getAllAvailableCourses(chatId, scenes);
        }

        let userMaterials: IMaterial[] = [];

        for (const course of userCourses) {
            const materials = await classroomService.getAllMaterials(chatId, scenes, course.id);

            const filteredMater = materials
                .filter((material) => {
                    if (material.dueDate) {
                        const taskDate = new Date(`${material.dueDate.year}.${material.dueDate.month}.${material.dueDate.day}`);
                        const splitedCurrentDate = new Date().toDateString().split(' ');
                        const currentDate = new Date(splitedCurrentDate[1] + ' ' + splitedCurrentDate[2] + ', ' + splitedCurrentDate[3]);

                        if (taskDate >= currentDate) {

                            if (dateStart) {
                                if (taskDate >= dateStart) {
                                    return true;

                                } else {
                                    return false;
                                }
                            }

                            return true;
                        }
                        return false;
                    }

                });

            userMaterials = userMaterials.concat(filteredMater)
        };

        return userMaterials;
    },

    getMaterial: async (chatId: number | undefined, scenes: SceneSessionData | undefined, courseId: string, materialId: string) => {
        const classroom = await getClassroom(chatId, scenes);
        const courseWork = (await classroom.courses.courseWork.get({
            courseId,
            id: materialId
        })).data;

        if (courseWork) {
            return courseWork;
        }

        const courseWorkMaterial = (await classroom.courses.courseWorkMaterials.get({
            courseId,
            id: materialId
        })).data;

        if (courseWorkMaterial) {
            return courseWork;
        }

        const announcement = (await classroom.courses.announcements.get({
            courseId,
            id: materialId
        })).data;

        if (announcement) {
            return announcement;
        }

        const lang = getLang(scenes);
        throw new Error(translationsHandler(translationKeys.SCENES_ERROR_TEXT, lang) + ' '
            + translationsHandler(translationKeys.CLASSROOM_HELPER_NO_MATER_WITH_PROVIDED_ID_TEXT, lang))
    }
}

async function getClassroom(chatId: number | undefined, scenes: SceneSessionData | undefined): Promise<classroom_v1.Classroom> {
    const user = await User.findOne({ chatId });
    const lang = getLang(scenes);

    if (!user) {
        throw new Error(translationsHandler(translationKeys.CLASSROOM_HELPER_UNAUTHORISED_USER_TEXT, lang));
    }

    const decryptedToken = decryptUserData(user.refreshToken);
    OAUTH2_CLIENT.setCredentials({ refresh_token: decryptedToken });
    return new classroom_v1.Classroom({ auth: OAUTH2_CLIENT });
}

async function getMaterialType(chatId: number | undefined, scenes: SceneSessionData | undefined, courseId: string, materialId: string): Promise<MaterialTypes> {
    const classroom = await getClassroom(chatId, scenes);
    const courseWorks = (await classroom.courses.courseWork.list({ courseId })).data.courseWork;
    const lang = getLang(scenes);

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

    throw new Error(translationsHandler(translationKeys.CLASSROOM_HELPER_CANNOT_DEFINE_TYPE_TEXT, lang))
}

async function getCourseById(chatId: number | undefined, scenes: SceneSessionData | undefined, courseId: string): Promise<classroom_v1.Schema$Course> {
    const classroom = await getClassroom(chatId, scenes);
    return (await classroom.courses.get({ id: courseId })).data;
}

async function getCourseWorkById(chatId: number | undefined, scenes: SceneSessionData | undefined, courseId: string,
    courseWorkId: string): Promise<classroom_v1.Schema$CourseWork> {
    const classroom = await getClassroom(chatId, scenes);

    return (await classroom.courses.courseWork.get({
        id: courseWorkId,
        courseId
    })).data;
}

async function getCourseByName(chatId: number | undefined, scenes: SceneSessionData | undefined, courseName: string): Promise<classroom_v1.Schema$Course> {
    const classroom = await getClassroom(chatId, scenes);
    const lang = getLang(scenes);

    const courses = (await classroom.courses.list()).data.courses;
    const course = courses?.find(course => course.name === courseName);

    if (!course) {
        if (!course) {
            throw new Error(format(translationsHandler(translationKeys.CLASSROOM_HELPER_COULDNT_FIND_COURSE_TEXT, lang), courseName));
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
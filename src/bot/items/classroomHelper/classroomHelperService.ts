import { Markup } from "telegraf";
import { InlineKeyboardMarkup, ReplyKeyboardMarkup } from "telegraf/typings/core/types/typegram";
import { classroomService } from "./classroomService";
import { IBotResponse } from "../../types/CustomBotResponse";
import User from "../../../api/models/users";
import Course, { ICourse } from "../../../api/models/courses";
import { ENV } from "../../../config/zod/env";
import { classroom_v1 } from "@googleapis/classroom";
import { bot } from "../../..";
import { CourseActions } from "./enums/CourseActions";
import { ICourseInfo } from "./types/CustomCourseInfo";
import { IMaterial } from "./types/CustomMaterial";
import { ICreateTaskSession } from "./types/sessions/ICreateTaskSession";
import { IEditTaskSession } from "./types/sessions/IEditTaskSession";
import { ITask } from "./types/ITask";
import { ICreateNotifSession } from "./types/sessions/ICreateNotifSession";
import { isPastDateAndTime } from "./scenes/createTaskScene";
import { format, getLang } from "../../botService";
import { translationsHandler } from "../../../api/middleware/translationsHandler";
import { translationKeys } from "../../types/translations/TranslationsKeys";
import { SceneSessionData } from "telegraf/typings/scenes";

export const classroomHelperService = {

    getMenuResponse: async (chatId: number, scenes: SceneSessionData | undefined): Promise<IBotResponse> => {
        const lang = getLang(scenes);
        const user = await User.findOne({ chatId });

        if (!user) {
            const keyboard = Markup.keyboard([
                [translationsHandler(translationKeys.CLASSROOM_HELPER_AUTHORISATION_TEXT, lang)]
            ]).resize();

            return ({ text: translationsHandler(translationKeys.GENERAL_MAIN_MENU_TEXT, lang), keyboard });

        } else {
            const keyboard = Markup.keyboard([
                [translationsHandler(translationKeys.CLASSROOM_HELPER_MANAGE_COURSES_TEXT, lang)],
                [translationsHandler(translationKeys.CLASSROOM_HELPER_VIEW_COURSES_TEXT, lang)]
            ])

            return ({ text: translationsHandler(translationKeys.GENERAL_CHOOSE_NEXT_ACTION_TEXT, lang), keyboard });
        }
    },

    getAuthorisationResponse: (chatId: number, scenes: SceneSessionData | undefined): IBotResponse => {
        const lang = getLang(scenes);
        const keyboard = getInlineKeyboardWithAuthorisation(scenes, chatId);
        return ({ text: translationsHandler(translationKeys.CLASSROOM_HELPER_AUTH_VIA_LINK_TEXT, lang), keyboard });
    },

    getCourseResponse: async (chatId: number | undefined, scenes: SceneSessionData | undefined, action: CourseActions): Promise<IBotResponse> => {
        let courses;
        const lang = getLang(scenes);

        switch (action) {
            case CourseActions.MANAGE:
                courses = await classroomService.getAllOwnCourses(chatId, scenes);
                return getBotResponseWithManageCourses(courses, scenes);

            case CourseActions.VIEW:
                courses = await classroomService.getAllAvailableCourses(chatId, scenes);
                return getBotResponseWithViewCourses(courses, scenes);

            default:
                throw new Error(translationsHandler(translationKeys.CLASSROOM_HELPER_INCORRECT_ACTION_TEXT, lang))
        }
    },

    getAllMaterialsResponse: async (chatId: number | undefined, scenes: SceneSessionData | undefined, course: ICourseInfo,
        withUserLastTimeRetrieved: boolean = true): Promise<IBotResponse | IBotResponse[]> => {
        const user = await User.findOne({ chatId });
        if (!await Course.exists({ courseId: course.id, user })) {
            const newCourse = new Course({ courseId: course.id, title: course.name, user });
            await newCourse.save();
        }

        let materials;
        if (withUserLastTimeRetrieved) {
            let courseDb = await Course.findOne({ courseId: course.id, user }) as ICourse;
            materials = await classroomService.getAllMaterials(chatId, scenes, course.id, courseDb?.lastTimeRetrieved);
            // await Course.findOneAndUpdate({ _id: courseDb.id }, { lastTimeRetrieved: new Date() });
        }

        else {
            materials = await classroomService.getAllMaterials(chatId, scenes, course.id);
        }

        let text;
        let keyboard;
        let arr: IBotResponse[] = [];
        const lang = getLang(scenes);

        if (materials.length === 0) {
            text = translationsHandler(translationKeys.CLASSROOM_HELPER_HAVE_SEEN_ALL_MATER_TEXT, lang);

            keyboard = Markup.keyboard([format(translationsHandler(translationKeys.CLASSROOM_HELPER_WOULD_LIKE_TO_REVIEW_TEXT, lang), course.name),
            translationsHandler(translationKeys.CLASSROOM_HELPER_BACK_TO_COURSES_TEXT, lang)])
                .resize()
                .oneTime();

        } else {
            arr = collectMaterialsInResponse(scenes, materials);
        };

        return arr.length === 0 ? ({ text: text as string, keyboard: keyboard as Markup.Markup<ReplyKeyboardMarkup> }) : arr;
    },

    getMaterialsFromCourse: async (chatId: number | undefined, scenes: SceneSessionData | undefined, courseName: string,
        action: CourseActions): Promise<IBotResponse | IBotResponse[]> => {

        const lang = getLang(scenes);
        const courses = await getCourseByAction(chatId, scenes, action);
        const ownerId = await classroomService.getOwnerIdFromUserProfile(chatId, scenes);

        if (courses.map(course => course.name).includes(courseName)) {
            const course = courses.find(course => course.name === courseName) as ICourseInfo;
            const courseId = await classroomService.getCourseIdByName(chatId, scenes, courseName);

            if (courseId) {
                const materials = await classroomService.getAllMaterials(chatId, scenes, courseId);

                if (course.ownerId === ownerId) {
                    let res = materials.map(material => {

                        return ({
                            text: material.title + '\n' + material.description + '\n' +
                                translationsHandler(translationKeys.CLASSROOM_HELPER_CREATED_TEXT, lang) + ': ' + material.creationTime,

                            keyboard: Markup.inlineKeyboard([
                                [Markup.button.url(translationsHandler(translationKeys.CLASSROOM_HELPER_OPEN_IN_BROWSER_TEXT, lang), material.link)],
                                [{
                                    text: translationsHandler(translationKeys.CLASSROOM_HELPER_EDIT_TEXT, lang),
                                    callback_data: `edit materialId=${material.id}, courseId=${courseId}`
                                }],

                                [{
                                    text: translationsHandler(translationKeys.CLASSROOM_HELPER_DELETE_TEXT, lang),
                                    callback_data: `delete materialId=${material.id}, courseId=${courseId}`
                                }]
                            ])
                        });
                    });

                    return res;

                } else {
                    let response = await classroomHelperService.getAllMaterialsResponse(chatId, scenes, course);
                    return response;
                }
            }
        }

        throw new Error(format(translationsHandler(translationKeys.CLASSROOM_HELPER_DONT_HAVE_COURSE_TEXT, lang), courseName))
    },

    getCreateTaskResponse: (scenes: SceneSessionData | undefined, courseName: string): IBotResponse => {
        const lang = getLang(scenes);
        const keyboard = Markup.keyboard([
            ...getReplyKeyboardButton(format(translationsHandler(translationKeys.CLASSROOM_HELPER_CREATE_TASK_TEXT, lang), courseName))
                .reply_markup.keyboard,

            ...getReplyKeyboardButton(translationsHandler(translationKeys.CLASSROOM_HELPER_MANAGE_COURSES_TEXT, lang))
                .reply_markup.keyboard,
        ]);

        return ({ text: translationsHandler(translationKeys.CLASSROOM_HELPER_MATERIALS_FROM_COURSE_TEXT, lang), keyboard })
    },

    createTask: (ctx: any, courseName: string): void => {
        const chatId = ctx.chat?.id as number;
        const lang = getLang(ctx.session.__scenes);

        getTaskPropsFromUserForCreate(ctx).then(async res => {
            if (res.state.isForcedExit) {
                const res = await classroomHelperService.getMenuResponse(chatId, ctx.session.__scenes);
                await ctx.reply(res.text, res.keyboard);
                return;
            }

            const taskProps = setTaskProps(ctx.session.__scenes, res.state);
            const link = await classroomService.createTask(chatId, ctx.session.__scenes, courseName, taskProps);

            await ctx.reply(translationsHandler(translationKeys.CLASSROOM_HELPER_SUCCESS_CREATED_TEXT, lang),
                getInlineKeyboardWithURI(translationsHandler(translationKeys.CLASSROOM_HELPER_VIEW_IN_BROWSER_TEXT, lang), link));

            await ctx.reply(translationsHandler(translationKeys.GENERAL_CHOOSE_NEXT_ACTION_TEXT, lang), getReplyKeyboardButton(format(
                translationsHandler(translationKeys.CLASSROOM_HELPER_MANAGE_COURSE_TEXT, lang), courseName)));
        });
    },

    editTask: async (ctx: any, courseId: string, taskId: string): Promise<void> => {
        const chatId = ctx.chat?.id as number;
        const lang = getLang(ctx.session.__scenes);

        const task = await classroomService.getTask(chatId, ctx.session.__scenes, courseId, taskId);
        if (!task) {
            throw new Error(translationsHandler(translationKeys.CLASSROOM_HELPER_CANNOT_EDIT_TASK_TEXT, lang));
        }

        getTaskPropsFromUserForEdit(ctx, task).then(async res => {
            if (res.state.isForcedExit) {
                const res = await classroomHelperService.getMenuResponse(chatId, ctx.session.__scenes);
                await ctx.reply(res.text, res.keyboard);
                return;
            }

            const taskProps = setTaskProps(ctx.session.__scenes, res.state);
            const link = await classroomService.editTask(chatId, ctx.session.__scenes, courseId, taskId, taskProps);

            await ctx.reply(translationsHandler(translationKeys.CLASSROOM_HELPER_SUCCESS_UPDATED_TEXT, lang),
                getInlineKeyboardWithURI(translationsHandler(translationKeys.CLASSROOM_HELPER_VIEW_IN_BROWSER_TEXT, lang), link));

            const courseName = await classroomService.getCourseNameById(chatId, ctx.session.__scenes, courseId);
            await ctx.reply(translationsHandler(translationKeys.GENERAL_CHOOSE_NEXT_ACTION_TEXT, lang),
                getReplyKeyboardButton(format(translationsHandler(translationKeys.CLASSROOM_HELPER_MANAGE_COURSE_TEXT, lang), courseName)));
        });
    },

    deleteMaterial: async (chatId: number | undefined, scenes: SceneSessionData | undefined, courseId: string, materialId: string): Promise<IBotResponse> => {
        const message = await classroomService.deleteTask(chatId, scenes, courseId, materialId)
        return ({ text: message, keyboard: Markup.keyboard([]) });
    },

    setNotification: async (ctx: any, courseWorkId: string, courseId: string) => {
        const chatId = ctx.chat?.id as number;
        const lang = getLang(ctx.session.__scenes);

        const courseName = await classroomService.getCourseNameById(chatId, ctx.session.__scenes, courseId);
        const courseWork = await classroomService.getTask(chatId, ctx.session.__scenes, courseId, courseWorkId);

        const month = (courseWork.dueDate?.month)?.toString().padStart(2, '0');
        const day = (courseWork.dueDate?.day)?.toString().padStart(2, '0');

        const differenceTime = new Date(`${courseWork.dueDate?.year}-${month}-${day}T` +
            `${courseWork.dueTime?.hours ?? '00'}:${courseWork.dueTime?.minutes ?? '00'}:${courseWork.dueTime?.seconds ?? '00'}`).getTime() - new Date().getTime();
        let time = 0;

        getNotificationTimeFromUser(ctx, differenceTime).then(async res => {
            time = res.state.time as number;
            const message = format(translationsHandler(translationKeys.CLASSROOM_HELPER_NOTIF_MESSAGE_TEXT, lang),
                convertMsToDateStr(ctx.session.__scenes, time), courseWork.title, courseName);

            setInterval(() => {
                bot.telegram.sendMessage(chatId, message);
            }, differenceTime - time - 60000)

            await ctx.reply(format(translationsHandler(translationKeys.CLASSROOM_HELPER_NOTIF_SET_UP_TEXT, lang),
                courseWork.title, convertMsToDateStr(ctx.session.__scenes, differenceTime - time)));
        })
    },
}

function collectMaterialsInResponse(scenes: SceneSessionData | undefined, materials: Array<IMaterial>): IBotResponse[] {
    const lang = getLang(scenes);
    return materials.map(material => {

        let text = material.title + '\n' + material.description + '\n' +
            translationsHandler(translationKeys.CLASSROOM_HELPER_CREATED_TEXT, lang) + ': ' + material.creationTime;

        let keyboard = getInlineKeyboardWithURI(translationsHandler(
            translationKeys.CLASSROOM_HELPER_OPEN_IN_BROWSER_TEXT, lang), material.link);

        if (material.dueDate) {
            const formattedDate = getFormattedDate(material.dueDate)!;
            const formattedTime = getFormattedTime(material.dueTime)!;

            text += '\n' + translationsHandler(translationKeys.CLASSROOM_HELPER_DUE_DATE_TEXT, lang) + ': ' + formattedDate;

            if (material.dueTime) {
                text += ' | ' + formattedTime;
            }

            if (material.dueDate && !isPastDateAndTime(formattedDate, formattedTime)) {
                keyboard = addDueDateBtnInKeyboard(scenes, keyboard, material.id, material.courseId);
            }
        }

        return ({
            text,
            keyboard
        })
    });
}

function getBotResponseWithViewCourses(courses: ICourseInfo[], scenes: SceneSessionData | undefined): IBotResponse {
    const lang = getLang(scenes);
    const keyboard = Markup.keyboard(
        courses.map(course => [format(translationsHandler(translationKeys.CLASSROOM_HELPER_VIEW_COURSE_TEXT, lang), course.name)]))
        .resize()
        .oneTime()

    return ({ text: translationsHandler(translationKeys.GENERAL_CHOOSE_NEXT_ACTION_TEXT, lang), keyboard })
}

function getBotResponseWithManageCourses(courses: ICourseInfo[], scenes: SceneSessionData | undefined): IBotResponse {
    const lang = getLang(scenes);
    const keyboard = Markup.keyboard(
        courses.map(course => [format(translationsHandler(translationKeys.CLASSROOM_HELPER_MANAGE_COURSE_TEXT, lang), course.name)]))
        .resize()
        .oneTime()

    return ({ text: translationsHandler(translationKeys.GENERAL_CHOOSE_NEXT_ACTION_TEXT, lang), keyboard })
}

export function getInlineKeyboardWithAuthorisation(scenes: SceneSessionData | undefined, chatId: number): Markup.Markup<InlineKeyboardMarkup> {
    const lang = getLang(scenes)
    return Markup.inlineKeyboard([
        [Markup.button.url(translationsHandler(translationKeys.CLASSROOM_HELPER_LOGIN_TEXT, lang), `${ENV.HOST_URI}/auth?chat_id=${chatId}`)]
    ]);
}

function addDueDateBtnInKeyboard(scenes: SceneSessionData | undefined, keyboard: Markup.Markup<InlineKeyboardMarkup>, taskId: string, courseId: string): Markup.Markup<InlineKeyboardMarkup> {
    const lang = getLang(scenes);
    let buttons = keyboard.reply_markup.inline_keyboard;
    let callbackText = `set notification material=${taskId} course=${courseId}`;

    buttons.push([Markup.button.callback(translationsHandler(translationKeys.CLASSROOM_HELPER_SET_NOTIF_TEXT, lang), callbackText)])
    return Markup.inlineKeyboard(buttons);
}

export function getFormattedDate(dueDate?: classroom_v1.Schema$Date): string | undefined {
    if (!dueDate) {
        return '';
    }

    const day = dueDate.day;
    const month = dueDate.month;
    return (day && day < 10 ? '0' + day : day) + '.' + (month && month < 10 ? '0' + month : month) + '.' + dueDate.year;
}

export function getFormattedTime(dueTime?: classroom_v1.Schema$TimeOfDay): string | undefined {
    if (!dueTime) {
        return '';
    }

    let hoursStr;
    let hours = (dueTime.hours as number) + 2;
    if (hours < 10) {
        hoursStr = '0' + hours;
    }

    let minutesStr;
    let minutes;
    if (dueTime.minutes) {
        minutes = dueTime.minutes;

        if (minutes < 10) {
            minutesStr = '0' + minutes;
        }

    } else {
        minutesStr = '00';
    }

    const formatedTime = (hoursStr ? hoursStr : hours) + ':' + (minutesStr ? minutesStr : minutes);
    return formatedTime;
}

export function convertMsToDateStr(scenes: SceneSessionData | undefined, ms: number): string {
    const lang = getLang(scenes);
    let dateStr = '';

    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    if (days) {
        dateStr += `${days} ${translationsHandler(translationKeys.GENERAL_DAYS_TEXT, lang)} `;
    }

    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (hours) {
        dateStr += `${hours} ${translationsHandler(translationKeys.GENERAL_HOURS_TEXT, lang)} `;
    }

    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (minutes) {
        dateStr += `${minutes} ${translationsHandler(translationKeys.GENERAL_MINUTES_TEXT, lang)} `;
    }

    return dateStr.trimEnd();
}

function getNotificationTimeFromUser(ctx: any, differenceTime: number): Promise<ICreateNotifSession> {
    const lang = getLang(ctx.session.__scenes);

    if (!differenceTime) {
        throw new Error(translationsHandler(translationKeys.CLASSROOM_HELPER_CANNOT_SET_NOTIF_TEXT, lang))
    }

    return new Promise((resolve) => {
        const lang = getLang(ctx.session.__scenes);
        ctx.session = {}
        ctx.scene.enter('CREATE_NOTIF', { differenceTime, lang });

        const checkState = setInterval(() => {
            if (!ctx.wizard?.cursor) {
                clearInterval(checkState);
                resolve(ctx.session.__scenes);
            }
        }, 500)
    })
}

function getReplyKeyboardButton(text: string): Markup.Markup<ReplyKeyboardMarkup> {
    return Markup.keyboard([
        [text]
    ])
        .resize()
        .oneTime()
}

function getTaskPropsFromUserForCreate(ctx: any): Promise<ICreateTaskSession> {
    return new Promise((resolve) => {
        const lang = getLang(ctx.session.__scenes);
        ctx.session = {}
        ctx.scene.enter('CREATE_TASK', { lang });

        const checkState = setInterval(() => {

            if (!ctx.wizard?.cursor) {
                clearInterval(checkState);
                resolve(ctx.session.__scenes);
            }

        }, 500)
    })
}

function getTaskPropsFromUserForEdit(ctx: any, task: classroom_v1.Schema$CourseWork): Promise<IEditTaskSession> {
    return new Promise((resolve) => {
        const lang = getLang(ctx.session.__scenes);
        ctx.session = {}
        ctx.scene.enter('EDIT_TASK', { task, lang });

        const checkState = setInterval(() => {
            if (!ctx.wizard?.cursor) {
                clearInterval(checkState);
                resolve(ctx.session.__scenes);
            }

        }, 500)
    })
}

function setTaskProps(scenes: SceneSessionData | undefined, state: {
    title?: string,
    description?: string,
    dueDate?: string,
    dueTime?: string,
    maxPoints?: string
}): ITask {

    const lang = getLang(scenes);
    const taskProps = {
        title: state.title as string
    }

    const description = state.description;
    const dueDate = state.dueDate;
    const dueTime = state.dueTime;
    const maxPoints = state.maxPoints;

    if (!taskProps.title) {
        throw new Error(translationsHandler(translationKeys.CLASSROOM_HELPER_EMPTY_TITLE_TEXT, lang))
    }

    if (description !== '-') {
        Object.assign(taskProps, { description });
    }

    if (dueDate && dueDate !== '-') {
        const splitedDate = dueDate.split('.', 3);
        Object.assign(taskProps, {
            dueDate: {
                year: splitedDate[2],
                month: splitedDate[1],
                day: splitedDate[0]
            },
            dueTime: {
                hours: 23,
                minutes: 59
            }
        });
    }

    if (dueTime && dueTime !== '-' && dueDate) {
        const splitedTime = dueTime.split(':', 2);
        Object.assign(taskProps, {
            dueTime: {
                hours: Number.parseInt(splitedTime[0]) - 3,
                minutes: splitedTime[1]
            }
        });
    }

    if (maxPoints) {
        let points = Number.parseInt(maxPoints);

        if (points > 0) {
            Object.assign(taskProps, { maxPoints });
        }
    }

    return taskProps;
}

export function getInlineKeyboardWithURI(text: string, uri: string): Markup.Markup<InlineKeyboardMarkup> {
    return Markup.inlineKeyboard([
        [Markup.button.url(text, uri)]
    ]);
}

async function getCourseByAction(chatId: number | undefined, scenes: SceneSessionData | undefined, action: CourseActions): Promise<ICourseInfo[]> {

    switch (action) {
        case CourseActions.VIEW:
            return await classroomService.getAllAvailableCourses(chatId, scenes);

        case CourseActions.MANAGE:
            return await classroomService.getAllOwnCourses(chatId, scenes);
    }
}
import { Markup } from "telegraf";
import { InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup } from "telegraf/typings/core/types/typegram";
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
import { translationKeys } from "../../translations/TranslationsKeys";
import { SceneSessionData } from "telegraf/typings/scenes";
import { LangTypes } from "../../translations/LangTypes";

export const classroomHelperService = {

    getMenuResponse: async (chatId: number, lang: LangTypes): Promise<IBotResponse> => {
        const user = await User.findOne({ chatId });

        if (!user) {
            const keyboard = getInlineKeyboardWithAuthorisation(lang, chatId);
            return ({ text: translationsHandler(translationKeys.CLASSROOM_HELPER_AUTH_VIA_LINK_TEXT, lang), keyboard });

        } else {
            const keyboard = Markup.keyboard([
                [translationsHandler(translationKeys.CLASSROOM_HELPER_MANAGE_COURSES_TEXT, lang),
                translationsHandler(translationKeys.CLASSROOM_HELPER_VIEW_COURSES_TEXT, lang)],

                [translationsHandler(translationKeys.CLASSROOM_HELPER_SHOW_TASK_CALENDAR_TEXT, lang),
                translationsHandler(translationKeys.CLASSROOM_HELPER_LOG_OUT_TEXT, lang)]
            ])

            return ({ text: translationsHandler(translationKeys.GENERAL_CHOOSE_NEXT_ACTION_TEXT, lang), keyboard });
        }
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

    getAllMaterialsResponse: async (chatId: number | undefined, scenes: SceneSessionData | undefined, courseName: string,
        withUserLastTimeRetrieved: boolean = true): Promise<IBotResponse[]> => {

        const lang = getLang(scenes);
        const userCourses = await classroomService.getAllAvailableCourses(chatId, scenes);
        let course;

        if (userCourses.map(course => course.name).includes(courseName)) {
            course = userCourses.find(course => course.name === courseName) as ICourseInfo;

        } else {
            throw new Error(format(translationsHandler(translationKeys.CLASSROOM_HELPER_DONT_HAVE_COURSE_TEXT, lang), courseName))
        }

        const user = await User.findOne({ chatId });
        if (!await Course.exists({ courseId: course.id, user })) {
            const newCourse = new Course({ courseId: course.id, title: course.name, user });
            await newCourse.save();
        }

        let materials;
        if (withUserLastTimeRetrieved) {
            let courseDb = await Course.findOne({ courseId: course.id, user }) as ICourse;
            materials = await classroomService.getAllMaterials(chatId, scenes, course.id, courseDb?.lastTimeRetrieved);
            await Course.findOneAndUpdate({ _id: courseDb.id }, { lastTimeRetrieved: new Date() });
        }

        else {
            materials = await classroomService.getAllMaterials(chatId, scenes, course.id);
        }

        let text;
        let keyboard;
        let arr: IBotResponse[] = [];

        if (materials.length === 0) {
            text = translationsHandler(translationKeys.CLASSROOM_HELPER_HAVE_SEEN_ALL_MATER_TEXT, lang);

            keyboard = Markup.keyboard([format(translationsHandler(translationKeys.CLASSROOM_HELPER_WOULD_LIKE_TO_REVIEW_TEXT, lang), course.name),
            translationsHandler(translationKeys.CLASSROOM_HELPER_BACK_TO_COURSES_TEXT, lang)])
                .resize()
                .oneTime();

        } else {
            arr = collectMaterialsInResponse(scenes, materials);
        };

        if (arr.length === 0) {
            arr.push({ text: text as string, keyboard: keyboard as Markup.Markup<ReplyKeyboardMarkup> })
        }

        return arr;
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

                if (materials.length === 0) {
                    const returnButtonText = getReturnButtonTextByAction(scenes, action);
                    const keyboard = Markup.keyboard([
                        [translationsHandler(translationKeys.CLASSROOM_HELPER_RETURN_TO_HELPER_MENU_TEXT, lang), returnButtonText]
                    ])
                        .resize()
                        .oneTime();

                    return ({ text: translationsHandler(translationKeys.CLASSROOM_HELPER_NO_MATERIALS_CREATED_TEXT, lang), keyboard })
                }

                if (course.ownerId === ownerId) {
                    let res = materials.map(material => {
                        const creationTimeText = getCreationTimeFormattedInText(material.creationTime)

                        return ({
                            text: material.title + '\n' + material.description + '\n' +
                                translationsHandler(translationKeys.CLASSROOM_HELPER_CREATED_TEXT, lang) + ': ' + creationTimeText,

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
                    let response = await classroomHelperService.getAllMaterialsResponse(chatId, scenes, course.name);
                    return response;
                }
            }
        }

        throw new Error(format(translationsHandler(translationKeys.CLASSROOM_HELPER_DONT_HAVE_COURSE_TEXT, lang), courseName))
    },

    getCreateTaskResponse: (scenes: SceneSessionData | undefined, courseName: string): IBotResponse => {
        const lang = getLang(scenes);
        const keyboard = Markup.keyboard([
            [format(translationsHandler(translationKeys.CLASSROOM_HELPER_CREATE_TASK_TEXT, lang), courseName),
            translationsHandler(translationKeys.CLASSROOM_HELPER_RETURN_TO_CHOOSING_OWN_COURSE_TEXT, lang)],

            [translationsHandler(translationKeys.CLASSROOM_HELPER_RETURN_TO_HELPER_MENU_TEXT, lang)]

        ])
            .oneTime()
            .resize();

        return ({ text: translationsHandler(translationKeys.CLASSROOM_HELPER_MATERIALS_FROM_COURSE_TEXT, lang), keyboard })
    },

    getViewCourseResponse: (scenes: SceneSessionData | undefined, courseName: string): IBotResponse => {
        const lang = getLang(scenes);
        const keyboard = Markup.keyboard([
            [translationsHandler(translationKeys.CLASSROOM_HELPER_RETURN_TO_CHOOSING_AVAIL_COURSE_TEXT, lang),
            format(translationsHandler(translationKeys.CLASSROOM_HELPER_SHOW_TASK_CALENDAR_FOR_COURSE_TEXT, lang), courseName)]
        ])
            .oneTime()
            .resize();

        return ({ text: translationsHandler(translationKeys.CLASSROOM_HELPER_MATERIALS_FROM_COURSE_TEXT, lang), keyboard });
    },

    createTask: (ctx: any, courseName: string): void => {
        const chatId = ctx.chat?.id as number;
        const scenes = ctx.session.__scenes;
        const lang = getLang(scenes);

        getTaskPropsFromUserForCreate(ctx).then(async res => {
            if (res.state.isForcedExit) {
                const res = await classroomHelperService.getMenuResponse(chatId, scenes);
                await ctx.reply(res.text, res.keyboard);
                return;
            }

            const taskProps = setTaskProps(scenes, res.state);
            const link = await classroomService.createTask(chatId, scenes, courseName, taskProps);

            await sendNotifAboutChangesInCourse(chatId, scenes, courseName,
                format(translationsHandler(translationKeys.CLASSROOM_HELPER_CREATED_TASK_NOTIF_TEXT, lang), taskProps.title, courseName));

            await ctx.reply(translationsHandler(translationKeys.CLASSROOM_HELPER_SUCCESS_CREATED_TEXT, lang),
                getInlineKeyboardWithURI(translationsHandler(translationKeys.CLASSROOM_HELPER_VIEW_IN_BROWSER_TEXT, lang), link));

            const keyboard = getReturnKeyboard(lang, courseName);
            await ctx.reply(translationsHandler(translationKeys.GENERAL_CHOOSE_NEXT_ACTION_TEXT, lang), keyboard);
        });
    },

    editTask: async (ctx: any, courseId: string, taskId: string): Promise<void> => {
        const chatId = ctx.chat?.id as number;
        const scenes = ctx.session.__scenes;
        const lang = getLang(scenes);

        const task = await classroomService.getTask(chatId, scenes, courseId, taskId);
        if (!task) {
            throw new Error(translationsHandler(translationKeys.CLASSROOM_HELPER_CANNOT_EDIT_TASK_TEXT, lang));
        }

        getTaskPropsFromUserForEdit(ctx, task).then(async res => {
            if (res.state.isForcedExit) {
                const res = await classroomHelperService.getMenuResponse(chatId, scenes);
                await ctx.reply(res.text, res.keyboard);
                return;
            }

            const taskProps = setTaskProps(scenes, res.state);
            const link = await classroomService.editTask(chatId, scenes, courseId, taskId, taskProps);
            const courseName = await classroomService.getCourseNameById(chatId, scenes, courseId) as string;

            await sendNotifAboutChangesInCourse(chatId, scenes, courseName,
                format(translationsHandler(translationKeys.CLASSROOM_HELPER_UPDATED_TASK_NOTIF_TEXT, lang), taskProps.title, courseName));

            await ctx.reply(translationsHandler(translationKeys.CLASSROOM_HELPER_SUCCESS_UPDATED_TEXT, lang),
                getInlineKeyboardWithURI(translationsHandler(translationKeys.CLASSROOM_HELPER_VIEW_IN_BROWSER_TEXT, lang), link));

            const keyboard = getReturnKeyboard(lang, courseName);
            await ctx.reply(translationsHandler(translationKeys.GENERAL_CHOOSE_NEXT_ACTION_TEXT, lang),
                getReplyKeyboardButton(format(translationsHandler(translationKeys.CLASSROOM_HELPER_MANAGE_COURSE_TEXT, lang), courseName)), keyboard);
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

            setTimeout(() => {
                bot.telegram.sendMessage(chatId, message);
            }, differenceTime - time - 60000)

            const keyboard = getReturnKeyboard(lang, courseName!);
            await ctx.reply(format(translationsHandler(translationKeys.CLASSROOM_HELPER_NOTIF_SET_UP_TEXT, lang),
                courseWork.title, convertMsToDateStr(ctx.session.__scenes, differenceTime - time)), keyboard);
        })
    },

    getTaskCalendarResponse: async (ctx: any, courseName?: string): Promise<IBotResponse> => {
        const scenes = ctx.session.__scenes;
        const lang = getLang(scenes);

        const chatId = ctx.chat?.id as number;
        let tasks: IMaterial[] = [];

        if (courseName) {
            const courseId = await classroomService.getCourseIdByName(chatId, scenes, courseName) as string;
            tasks = await classroomService.getAllMaterials(chatId, scenes, courseId);

        } else {
            tasks = await classroomService.getAllMaterialsWithActualDueDate(chatId, scenes);
        }

        const currentDate = new Date();
        const currentMonthText = getMonthText(scenes, currentDate.getMonth());
        const currentMonth = currentDate.getMonth() + 1;

        const endOfWeekDay = currentDate.getDate() + (15 - currentDate.getDay());
        const endOfWeekDate = getValidDate(endOfWeekDay, currentMonth);

        let content = '';
        let isUpcomingTasks = false;

        if (tasks && tasks.length > 0) {
            let index = 1;

            const filteredTasks = tasks
                .filter((task) => task.dueDate)
                .sort((task, nextTask) => convertToDate(task.dueDate!, task.dueTime!).getTime() - convertToDate(nextTask.dueDate!, nextTask.dueTime!).getTime());

            for (const task of filteredTasks) {
                const courseName = await classroomService.getCourseNameById(chatId, scenes, task.courseId);

                if (!task.dueTime) {
                    task.dueTime = { hours: 0, minutes: 0 };
                }

                const taskDateTime = convertToDate(task.dueDate!, task.dueTime);

                if (currentDate.getTime() < taskDateTime.getTime() && taskDateTime.getTime() < endOfWeekDate.getTime()) {
                    const dayWithDateText = getDayOfWeekText(scenes, taskDateTime.getDay()) + ` (${taskDateTime.getDate() + ' ' + getMonthText(scenes, taskDateTime.getMonth())})\n`;
                    const taskDueTimeHours = task.dueTime.hours! + 3;

                    if (content.includes(dayWithDateText)) {
                        content += (taskDueTimeHours === 24 ? '00' : taskDueTimeHours) + ':' + (task.dueTime.minutes ?? '00') + ' - ' + task.title + ' ' +
                            translationsHandler(translationKeys.CLASSROOM_HELPER_TASK_AND_BRACKET_TEXT, lang) + ` '${courseName}' ` +
                            translationsHandler(translationKeys.CLASSROOM_HELPER_COURSE_AND_BRACKET_TEXT, lang) + '\n';

                    } else {
                        const taskDueTimeHours = task.dueTime.hours! + 3;

                        content += '\n' + index + '. ' + dayWithDateText +
                            (taskDueTimeHours === 24 ? '00' : taskDueTimeHours) + ':' + (task.dueTime.minutes ?? '00') + ' - ' + task.title + ' ' +
                            translationsHandler(translationKeys.CLASSROOM_HELPER_TASK_AND_BRACKET_TEXT, lang) + ` '${courseName}' ` +
                            translationsHandler(translationKeys.CLASSROOM_HELPER_COURSE_AND_BRACKET_TEXT, lang) + '\n';
                        index++;
                    }

                } else if (taskDateTime.getTime() > endOfWeekDate.getTime()) {
                    isUpcomingTasks = true;
                }
            };
        }

        let text = '';
        const periodText = `(${currentMonthText} ${currentDate.getDate()} - ` + `${getMonthText(scenes, endOfWeekDate.getMonth())} ${endOfWeekDate.getDate()})`;

        if (content === '') {
            text = translationsHandler(translationKeys.CLASSROOM_HELPER_NO_TASKS_TO_COMPLETE_TEXT, lang) + ' ' + periodText;

        } else {
            text = translationsHandler(translationKeys.CLASSROOM_HELPER_TASKS_TO_COMPLETE_TEXT, lang) + ` ${periodText}:`;
        }

        if (isUpcomingTasks) {
            content += '\n' + translationsHandler(translationKeys.CLASSROOM_HELPER_PRESS_TO_VIEW_UP_TASKS_TEXT, lang);
        }

        let keyboard: Markup.Markup<InlineKeyboardMarkup> = Markup.inlineKeyboard([[]]);
        if (isUpcomingTasks) {
            let callbackData = `class_calendar_upcoming ${endOfWeekDate.getDate()}.${endOfWeekDate.getMonth()}.${endOfWeekDate.getFullYear()}`;

            if (courseName) {
                const courseId = await classroomService.getCourseIdByName(chatId, scenes, courseName);
                callbackData += `, courseId=${courseId}`;
            }

            keyboard = Markup.inlineKeyboard([
                [{
                    text: translationsHandler(translationKeys.CLASSROOM_HELPER_SHOW_UP_TASKS_TEXT, lang),
                    callback_data: callbackData
                }]
            ]);
        }

        return ({ text: text + content, keyboard });
    },

    getTaskCalendarWithUpTasksResponse: async (ctx: any, dateStr: string, courseId?: string): Promise<IBotResponse> => {
        const scenes = ctx.session.__scenes;
        const lang = getLang(scenes);

        const splitedDate = dateStr.split('.');
        const upcomingDate = new Date(`${splitedDate[2]}.${Number.parseInt(splitedDate[1]) - 1}.${splitedDate[0]}`);

        const chatId = ctx.chat?.id as number;
        const tasks = await classroomService.getAllMaterialsWithActualDueDate(chatId, scenes, upcomingDate, courseId);

        let content = '';

        if (tasks && tasks.length > 0) {
            let index = 1;

            const filteredTasks = tasks
                .filter((task) => task.dueDate)
                .sort((task, nextTask) => convertToDate(task.dueDate!, task.dueTime!).getTime() - convertToDate(nextTask.dueDate!, nextTask.dueTime!).getTime());

            for (const task of filteredTasks) {
                const courseName = await classroomService.getCourseNameById(chatId, scenes, task.courseId);

                if (!task.dueTime) {
                    task.dueTime = { hours: 0, minutes: 0 };
                }

                const taskDateTime = convertToDate(task.dueDate!, task.dueTime);
                const dayWithDateText = getDayOfWeekText(scenes, taskDateTime.getDay()) + ` (${taskDateTime.getDate() + ' ' + getMonthText(scenes, taskDateTime.getMonth())})\n`;
                const taskDueTimeHours = task.dueTime.hours! + 3;

                if (content.includes(dayWithDateText)) {
                    content += (taskDueTimeHours === 24 ? '00' : taskDueTimeHours) + ':' + (task.dueTime.minutes ?? '00') + ' - ' + task.title + ' ' +
                        translationsHandler(translationKeys.CLASSROOM_HELPER_TASK_AND_BRACKET_TEXT, lang) + ` '${courseName}' ` +
                        translationsHandler(translationKeys.CLASSROOM_HELPER_COURSE_AND_BRACKET_TEXT, lang) + '\n';

                } else {
                    content += '\n' + index + '. ' + dayWithDateText +
                        (taskDueTimeHours === 24 ? '00' : taskDueTimeHours) + ':' + (task.dueTime.minutes ?? '00') + ' - ' + task.title + ' ' +
                        translationsHandler(translationKeys.CLASSROOM_HELPER_TASK_AND_BRACKET_TEXT, lang) + ` '${courseName}' ` +
                        translationsHandler(translationKeys.CLASSROOM_HELPER_COURSE_AND_BRACKET_TEXT, lang) + '\n';
                    index++;
                }
            };
        }

        const text = translationsHandler(translationKeys.CLASSROOM_HELPER_UP_TASKS_TEXT, lang) + content;
        return ({ text, keyboard: Markup.inlineKeyboard([[]]) });
    },

    openMaterialsResponse: async (ctx: any, courseId: string, materialId: string) => {
        const chatId = ctx.chat?.id;
        const lang = getLang(ctx.session.__scenes);
        const material = await classroomService.getMaterial(chatId, ctx.session.__scenes, courseId, materialId);

        if (material.materials) {
            for (const mater of material.materials) {

                let keyboard;
                if (mater.driveFile?.driveFile?.alternateLink) {
                    keyboard = Markup.inlineKeyboard([
                        [{
                            text: translationsHandler(translationKeys.GENERAL_VIEW_THROUGH_WEB_APP_TEXT, lang),
                            web_app: { url: mater.driveFile?.driveFile?.alternateLink }
                        }],

                        [{
                            text: translationsHandler(translationKeys.GENERAL_LINK_TEXT, lang),
                            url: mater.driveFile?.driveFile?.alternateLink + ''
                        }]
                    ]);
                }

                if (mater.driveFile?.driveFile?.thumbnailUrl) {
                    await ctx.replyWithPhoto(mater.driveFile.driveFile.thumbnailUrl, {
                        reply_markup: keyboard?.reply_markup,
                        caption: `${translationsHandler(translationKeys.CLASSROOM_HELPER_PREVIEW_OF_TEXT, lang)} ${mater.driveFile?.driveFile?.title}`
                    })
                }
            }
        }
    },

    getLogOutResponse: (scenes: SceneSessionData | undefined): IBotResponse => {
        const lang = getLang(scenes);
        const keyboard = Markup.keyboard([
            [translationsHandler(translationKeys.GENERAL_MAIN_MENU_TEXT, lang)]
        ])
            .resize()
            .oneTime();

        return ({ text: translationsHandler(translationKeys.CLASSROOM_HELPER_SUCCESSFULLY_LOGED_OUT_TEXT, lang), keyboard });
    }
}

function collectMaterialsInResponse(scenes: SceneSessionData | undefined, materials: Array<IMaterial>): IBotResponse[] {
    const lang = getLang(scenes);
    return materials.map(material => {

        const creationTimeText = getCreationTimeFormattedInText(material.creationTime);
        let text = material.title + '\n' + material.description + '\n' + translationsHandler(translationKeys.CLASSROOM_HELPER_CREATED_TEXT, lang) + ': ' + creationTimeText;

        let keyboard;

        if (material.materials) {
            keyboard = Markup.inlineKeyboard([
                [{
                    text: translationsHandler(translationKeys.CLASSROOM_HELPER_OPEN_MATERIALS_TEXT, lang),
                    callback_data: `open_materials courseId=${material.courseId} materialId=${material.id}`
                }]
            ]);
        }

        keyboard = getInlineKeyboardWithURI(translationsHandler(
            translationKeys.CLASSROOM_HELPER_OPEN_IN_BROWSER_TEXT, lang), material.link, keyboard);

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

export function getInlineKeyboardWithAuthorisation(lang: LangTypes, chatId: number): Markup.Markup<InlineKeyboardMarkup> {
    return Markup.inlineKeyboard([
        [Markup.button.url(translationsHandler(translationKeys.CLASSROOM_HELPER_LOGIN_TEXT, lang), `${ENV.HOST_URI}/auth?chat_id=${chatId}&lang=${lang}`)]
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
        console.log('dueDate =', typeof dueDate);
        if (typeof dueDate === 'string') {
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
    }

    if (dueTime && dueTime !== '-' && dueDate) {
        if (typeof dueTime === 'string') {
            const splitedTime = dueTime.split(':', 2);
            Object.assign(taskProps, {
                dueTime: {
                    hours: Number.parseInt(splitedTime[0]) - 3,
                    minutes: splitedTime[1]
                }
            });
        }
    }

    if (maxPoints) {
        let points = Number.parseInt(maxPoints);

        if (points > 0) {
            Object.assign(taskProps, { maxPoints });
        }
    }

    return taskProps;
}

export function getInlineKeyboardWithURI(text: string, uri: string, keyboard?: Markup.Markup<InlineKeyboardMarkup>): Markup.Markup<InlineKeyboardMarkup> {
    let buttons: InlineKeyboardButton[][] = [];

    if (keyboard) {
        buttons = keyboard.reply_markup.inline_keyboard;
    }

    buttons.push([Markup.button.url(text, uri)])
    return Markup.inlineKeyboard(buttons);
}

async function getCourseByAction(chatId: number | undefined, scenes: SceneSessionData | undefined, action: CourseActions): Promise<ICourseInfo[]> {
    switch (action) {
        case CourseActions.VIEW:
            return await classroomService.getAllAvailableCourses(chatId, scenes);

        case CourseActions.MANAGE:
            return await classroomService.getAllOwnCourses(chatId, scenes);
    }
}

async function sendNotifAboutChangesInCourse(chatId: number, scenes: SceneSessionData | undefined, courseName: string, notifText: string) {
    const courseId = await classroomService.getCourseIdByName(chatId, scenes, courseName);
    const courses = await Course.find({ courseId });

    if (courses) {
        courses.forEach(async (course) => {
            const user = await User.findOne({ _id: course.user });

            if (user && course.title === courseName) {
                bot.telegram.sendMessage(user.chatId, notifText);
            }
        });
    }
}

export function getMonthText(scenes: SceneSessionData | undefined, month: number) {
    const lang = getLang(scenes);

    switch (month) {
        case 0:
            return translationsHandler(translationKeys.GENERAL_JANUARY_TEXT, lang);

        case 1:
            return translationsHandler(translationKeys.GENERAL_FEBRUARY_TEXT, lang);

        case 2:
            return translationsHandler(translationKeys.GENERAL_MARCH_TEXT, lang);

        case 3:
            return translationsHandler(translationKeys.GENERAL_APRIL_TEXT, lang);

        case 4:
            return translationsHandler(translationKeys.GENERAL_MAY_TEXT, lang);

        case 5:
            return translationsHandler(translationKeys.GENERAL_JUNE_TEXT, lang);

        case 6:
            return translationsHandler(translationKeys.GENERAL_JULY_TEXT, lang);

        case 7:
            return translationsHandler(translationKeys.GENERAL_AUGUST_TEXT, lang);

        case 8:
            return translationsHandler(translationKeys.GENERAL_SEPTEMBER_TEXT, lang);

        case 9:
            return translationsHandler(translationKeys.GENERAL_OCTOBER_TEXT, lang);

        case 10:
            return translationsHandler(translationKeys.GENERAL_NOVEMBER_TEXT, lang);

        case 11:
            return translationsHandler(translationKeys.GENERAL_DECEMBER_TEXT, lang);

        default:
            throw new Error(translationsHandler(translationKeys.SCENES_ERROR_TEXT, lang) + translationsHandler(translationKeys.GENERAL_INVALID_MONTH_NUM_TEXT, lang));
    }
}

function getValidDate(day: number, month: number): Date {
    const year = new Date().getFullYear();
    const maxDaysInMonth = new Date(year, month, 0).getDate();

    if (day > maxDaysInMonth) {
        return new Date(`${year}.${month + 1}.${day - maxDaysInMonth}`);
    }

    return new Date(`${year}.${month}.${day}`);
}

function getDayOfWeekText(scenes: SceneSessionData | undefined, day: number) {
    const lang = getLang(scenes);
    const days = [translationsHandler(translationKeys.GENERAL_SUNDAY_TEXT, lang), translationsHandler(translationKeys.GENERAL_MONDAY_TEXT, lang),
    translationsHandler(translationKeys.GENERAL_TUESDAY_TEXT, lang), translationsHandler(translationKeys.GENERAL_WEDNESDAY_TEXT, lang),
    translationsHandler(translationKeys.GENERAL_THURSDAY_TEXT, lang), translationsHandler(translationKeys.GENERAL_FRIDAY_TEXT, lang),
    translationsHandler(translationKeys.GENERAL_SATURDAY_TEXT, lang)];

    if (day > days.length) {
        throw new Error(translationsHandler(translationKeys.SCENES_ERROR_TEXT, lang) + translationsHandler(translationKeys.GENERAL_DAY_DOES_NOT_EXIST_TEXT, lang));
    }

    return days[day];
}

function convertToDate(dueDate: classroom_v1.Schema$Date, dueTime: classroom_v1.Schema$TimeOfDay): Date {
    return new Date(
        Date.UTC(dueDate.year!, dueDate.month! - 1, dueDate.day!, dueTime.hours!, dueTime.minutes ?? 0));
}

function getReturnButtonTextByAction(scenes: SceneSessionData | undefined, action: CourseActions) {
    const lang = getLang(scenes);

    switch (action) {
        case CourseActions.VIEW:
            return translationsHandler(translationKeys.CLASSROOM_HELPER_RETURN_TO_CHOOSING_AVAIL_COURSE_TEXT, lang);

        case CourseActions.MANAGE:
            return translationsHandler(translationKeys.CLASSROOM_HELPER_RETURN_TO_CHOOSING_OWN_COURSE_TEXT, lang);
    }
}

function getCreationTimeFormattedInText(creationTime: string): string {
    const creationDateTime = new Date(creationTime);
    const creationDateText = creationDateTime.getDate() < 10 ? '0' + creationDateTime.getDate() : creationDateTime.getDate();
    const creationMonthText = creationDateTime.getMonth() + 1 < 10 ? '0' + (creationDateTime.getMonth() + 1) : creationDateTime.getMonth() + 1;

    return `${creationDateText}.${creationMonthText}.${creationDateTime.getFullYear()}` +
        ` | ${creationDateTime.getHours() ?? '00'}:${creationDateTime.getMinutes() ?? '00'}`
}

function getReturnKeyboard(lang: LangTypes, courseName: string): Markup.Markup<ReplyKeyboardMarkup> {
    return Markup.keyboard([
        [format(translationsHandler(translationKeys.CLASSROOM_HELPER_RETURN_TO_SPECIF_COURSE_TEXT, lang), courseName),
        translationsHandler(translationKeys.CLASSROOM_HELPER_RETURN_TO_HELPER_MENU_TEXT, lang)
        ],

        [translationsHandler(translationKeys.GENERAL_RETURN_TO_MAIN_MENU_TEXT, lang)]
    ])
        .oneTime()
        .resize();
}
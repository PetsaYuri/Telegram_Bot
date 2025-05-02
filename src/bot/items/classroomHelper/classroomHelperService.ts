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

export const classroomHelperService = {

    getMenuResponse: async (chatId: number): Promise<IBotResponse> => {
        const user = await User.findOne({ chatId });

        if (!user) {
            const keyboard = Markup.keyboard([
                ['Authorisation']
            ]).resize();

            return ({ text: 'Main menu', keyboard });

        } else {
            const keyboard = Markup.keyboard([
                ['Manage your own courses'],
                ['View all available courses']
            ])

            return ({ text: 'choose the next action', keyboard });
        }
    },

    getAuthorisationResponse: (chatId: number): IBotResponse => {
        const keyboard = getInlineKeyboardWithAuthorisation(chatId)
        return ({ text: 'Follow the next link for authorisation via google account', keyboard });
    },

    getCourseResponse: async (chatId: number | undefined, action: CourseActions): Promise<IBotResponse> => {
        let courses;
        switch (action) {
            case CourseActions.MANAGE:
                courses = await classroomService.getAllOwnCourses(chatId);
                break;
            case CourseActions.VIEW:
                courses = await classroomService.getAllAvailableCourses(chatId);
                break;
            default:
                throw new Error('Sorry, we can not recognise the type of your action')
        }

        return getBotResponseWithCourses(courses, action);
    },

    getAllMaterialsResponse: async (chatId: number | undefined, course: ICourseInfo, withUserLastTimeRetrieved: boolean = true): Promise<IBotResponse | IBotResponse[]> => {
        const user = await User.findOne({ chatId });
        if (!await Course.exists({ courseId: course.id, user })) {
            const newCourse = new Course({ courseId: course.id, title: course.name, user });
            await newCourse.save();
        }

        let materials;
        if (withUserLastTimeRetrieved) {
            let courseDb = await Course.findOne({ courseId: course.id, user }) as ICourse;
            materials = await classroomService.getAllMaterials(chatId, course.id, courseDb?.lastTimeRetrieved);
            // await Course.findOneAndUpdate({ _id: courseDb.id }, { lastTimeRetrieved: new Date() });
        }

        else {
            materials = await classroomService.getAllMaterials(chatId, course.id);
        }

        let text;
        let keyboard;
        let arr: IBotResponse[] = [];

        if (materials.length === 0) {
            text = "You've already seen all the materials for this course. New material hasn't been uploaded yet. " +
                "Would you like to see it again?";

            keyboard = Markup.keyboard([`Yes, I'd like to review all materials from ${course.name} course`,
                'No, back to courses'])
                .resize()
                .oneTime();

        } else {
            arr = collectMaterialsInResponse(materials);
        };

        return arr.length === 0 ? ({ text: text as string, keyboard: keyboard as Markup.Markup<ReplyKeyboardMarkup> }) : arr;
    },

    getMaterialsFromCourse: async (chatId: number | undefined, courseName: string, action: CourseActions): Promise<IBotResponse | IBotResponse[]> => {
        const courses = await getCourseByAction(chatId, action);
        const ownerId = await classroomService.getOwnerIdFromUserProfile(chatId);

        if (courses.map(course => course.name).includes(courseName)) {
            const course = courses.find(course => course.name === courseName) as ICourseInfo;
            const courseId = await classroomService.getCourseIdByName(chatId, courseName);

            if (courseId) {
                const materials = await classroomService.getAllMaterials(chatId, courseId);
                if (course.ownerId === ownerId) {
                    let res = materials.map(material => {
                        return ({
                            text: material.title + '\n' + material.description + '\n' + 'created: ' + material.creationTime,
                            keyboard: Markup.inlineKeyboard([
                                [Markup.button.url("Open in browser", material.link)],
                                [{ text: 'Edit', callback_data: `edit materialId=${material.id}, courseId=${courseId}` }],
                                [{ text: 'Delete', callback_data: `delete materialId=${material.id}, courseId=${courseId}` }]
                            ])
                        });
                    });

                    return res;

                } else {
                    let response = await classroomHelperService.getAllMaterialsResponse(chatId, course);
                    return response;
                }
            }
        }

        throw new Error('course not found')
    },

    getCreateTaskResponse: (courseName: string): IBotResponse => {
        const keyboard = Markup.keyboard([
            ...getReplyKeyboardButton(`Create task for '${courseName}' course`).reply_markup.keyboard,
            ...getReplyKeyboardButton('Manage your own courses').reply_markup.keyboard,
        ]);
        return ({ text: 'Your materials from the selected course:', keyboard })
    },

    createTask: (ctx: any, courseName: string): void => {
        const chatId = ctx.chat?.id as number;
        getTaskPropsFromUserForCreate(ctx).then(async res => {
            const taskProps = setTaskProps(res.state);
            const link = await classroomService.createTask(chatId, courseName, taskProps);

            await ctx.reply('successfully created', getInlineKeyboardWithURI('View in browser', link));
            await ctx.reply('choose the next action:', getReplyKeyboardButton(`manage '${courseName}' course`));
        });
    },

    editTask: async (ctx: any, courseId: string, taskId: string): Promise<void> => {
        const chatId = ctx.chat?.id as number;
        const task = await classroomService.getTask(chatId, courseId, taskId);
        if (!task) {
            throw new Error('You cannot edit the non-existent task');
        }

        getTaskPropsFromUserForEdit(ctx, task).then(async res => {
            const taskProps = setTaskProps(res.state);
            const link = await classroomService.editTask(chatId, courseId, taskId, taskProps);
            await ctx.reply('successfully updated', getInlineKeyboardWithURI('View in browser', link));

            const courseName = await classroomService.getCourseNameById(chatId, courseId);
            await ctx.reply('choose the next action:', getReplyKeyboardButton(`manage '${courseName}' course`));
        });
    },

    deleteMaterial: async (chatId: number | undefined, courseId: string, materialId: string): Promise<IBotResponse> => {
        const message = await classroomService.deleteTask(chatId, courseId, materialId)
        return ({ text: message, keyboard: Markup.keyboard([]) });
    },

    setNotification: async (ctx: any, courseWorkId: string, courseId: string) => {
        const chatId = ctx.chat?.id as number;
        const courseName = await classroomService.getCourseNameById(chatId, courseId); //'758358245506'
        const courseWork = await classroomService.getTask(chatId, courseId, courseWorkId);

        const month = (courseWork.dueDate?.month)?.toString().padStart(2, '0');
        const day = (courseWork.dueDate?.day)?.toString().padStart(2, '0');
        const differenceTime = new Date(`${courseWork.dueDate?.year}-${month}-${day}T` +
            `${courseWork.dueTime?.hours ?? '00'}:${courseWork.dueTime?.minutes ?? '00'}:${courseWork.dueTime?.seconds ?? '00'}`).getTime() - new Date().getTime();
        let time = 0;

        getNotificationTimeFromUser(ctx, differenceTime).then(async res => {
            time = res.state.time as number;
            const message = `Notification: only ${convertMsToDateStr(time)} left before the due date of the '${courseWork.title} '` +
                `assignment (the '${courseName}' course)`;

            setInterval(() => {
                bot.telegram.sendMessage(chatId, message);
            }, differenceTime - time - 60000)

            await ctx.reply(`Notification for the '${courseWork.title}' assignment has been successfully set up and ` +
                `will work after: ${convertMsToDateStr(differenceTime - time)}`);
        })
    },
}

function collectMaterialsInResponse(materials: Array<IMaterial>): IBotResponse[] {
    return materials.map(material => {
        let text = material.title + '\n' + material.description + '\n created: ' + material.creationTime;
        let keyboard = getInlineKeyboardWithURI('Open in browser', material.link);

        if (material.dueDate) {
            const formattedDate = getFormattedDate(material.dueDate)!;
            const formattedTime = getFormattedTime(material.dueTime)!;
            text += '\n due date: ' + formattedDate;

            if (material.dueTime) {
                text += ' | ' + formattedTime;
            }

            if (material.dueDate && !isPastDateAndTime(formattedDate, formattedTime)) {
                keyboard = addDueDateBtnInKeyboard(keyboard, material.id, material.courseId);
            }
        }

        return ({
            text,
            keyboard
        })
    });
}

function getBotResponseWithCourses(courses: ICourseInfo[], action: CourseActions): IBotResponse {
    const keyboard = Markup.keyboard(
        courses.map(course => [`${action} '${course.name}' course`]))
        .resize()
        .oneTime()

    return ({ text: 'choose the next action', keyboard })
}

export function getInlineKeyboardWithAuthorisation(chatId: number): Markup.Markup<InlineKeyboardMarkup> {
    return Markup.inlineKeyboard([
        [Markup.button.url("Login", `${ENV.HOST_URI}/auth?chat_id=${chatId}`)]
    ]);
}

function addDueDateBtnInKeyboard(keyboard: Markup.Markup<InlineKeyboardMarkup>, taskId: string, courseId: string): Markup.Markup<InlineKeyboardMarkup> {
    let buttons = keyboard.reply_markup.inline_keyboard;
    let callbackText = `set notification material=${taskId} course=${courseId}`;

    buttons.push([Markup.button.callback('Set notification', callbackText)])
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

export function convertMsToDateStr(ms: number): string {
    let dateStr = '';
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    if (days) {
        dateStr += `${days} days `;
    }

    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (hours) {
        dateStr += `${hours} hours `;
    }

    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (minutes) {
        dateStr += `${minutes} minutes `;
    }

    return dateStr.trimEnd();
}

function getNotificationTimeFromUser(ctx: any, differenceTime: number): Promise<ICreateNotifSession> {
    if (!differenceTime) {
        throw new Error('You cannot set a notification to task that is overdue')
    }

    return new Promise((resolve) => {
        ctx.scene.enter('CREATE_NOTIF', { differenceTime });

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
        ctx.scene.enter('CREATE_TASK');

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
        ctx.scene.enter('EDIT_TASK', { task });

        const checkState = setInterval(() => {
            if (!ctx.wizard?.cursor) {
                clearInterval(checkState);
                resolve(ctx.session.__scenes);
            }

        }, 500)
    })
}

function setTaskProps(state: {
    title?: string,
    description?: string,
    dueDate?: string,
    dueTime?: string,
    maxPoints?: string
}): ITask {

    const taskProps = {
        title: state.title as string
    }

    const description = state.description;
    const dueDate = state.dueDate;
    const dueTime = state.dueTime;
    const maxPoints = state.maxPoints;

    if (!taskProps.title) {
        throw new Error('The title must be filled in')
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
                hours: 0,
                minutes: 0
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

function getInlineKeyboardWithURI(text: string, uri: string): Markup.Markup<InlineKeyboardMarkup> {
    return Markup.inlineKeyboard([
        [Markup.button.url(text, uri)]
    ]);
}

async function getCourseByAction(chatId: number | undefined, action: CourseActions): Promise<ICourseInfo[]> {
    switch (action) {
        case CourseActions.VIEW:
            return await classroomService.getAllAvailableCourses(chatId);
        case CourseActions.MANAGE:
            return await classroomService.getAllOwnCourses(chatId);
    }
}
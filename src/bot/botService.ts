import { Markup } from "telegraf";
import { InlineKeyboardMarkup, ReplyKeyboardMarkup } from "telegraf/typings/core/types/typegram";
import { classroomService } from "../api/services/classroomService";
import { IBotResponse } from "../api/types/CustomBotResponse";
import User from "../api/models/users";
import { ICourseInfo } from "../api/types/CustomCourseInfo";
import Course, { ICourse } from "../api/models/courses";
import { IMaterial } from "../api/types/CustomMaterial";
import { ENV } from "../config/zod/env";
import { classroom_v1 } from "@googleapis/classroom";
import cron from 'node-cron';
import { bot } from "..";

export const botService = {
    getAuthorisationResponse: (chatId: number): IBotResponse => {
        const keyboard = getInlineKeyboardWithAuthorisation(chatId)
        return ({ text: 'Follow the next link for authorisation via google account', keyboard });
    },

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

    getOwnCoursesResponse: async (chatId: number): Promise<IBotResponse> => {
        const courses = await classroomService.getAllOwnCourses(chatId);
        return getBotResponseWithCourses(courses);
    },

    getAvailableCoursesResponse: async (chatId: number): Promise<IBotResponse> => {
        const courses = await classroomService.getAllAvailableCourses(chatId);
        return getBotResponseWithCourses(courses);
    },

    getAllMaterialsResponse: async (chatId: number, course: ICourseInfo, withUserLastTimeRetrieved: boolean = true): Promise<IBotResponse | IBotResponse[]> => {
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

    //change name
    manageProvidedCourse: async (chatId: number, course: ICourseInfo): Promise<IBotResponse[]> => {
        const materials = await classroomService.getAllMaterials(chatId, course.id);
        return materials.map(material => {
            return ({
                text: material.title + '\n' + material.description + '\n' + 'created: ' + material.creationTime,
                keyboard: Markup.inlineKeyboard([
                    [Markup.button.url("Open in browser", material.link)],
                    [{ text: 'Edit', callback_data: `edit materialId=${material.id}, courseId=${course.id}` }],
                    [{ text: 'Delete', callback_data: `delete materialId=${material.id}, courseId=${course.id}` }]
                ])
            });
        });
    },

    editMaterial: async (chatId: number | undefined, courseId: string, materialId: string): Promise<IBotResponse> => {
        const message = await classroomService.editMaterial(chatId, courseId, materialId)
        return ({ text: message, keyboard: Markup.keyboard([]) });
    },

    deleteMaterial: async (chatId: number | undefined, courseId: string, materialId: string): Promise<IBotResponse> => {
        const message = await classroomService.deleteMaterial(chatId, courseId, materialId)
        return ({ text: message, keyboard: Markup.keyboard([]) });
    },

    setNotification: async (chatId: number, courseWorkId: string, courseId: string, day: number, month: number, hour?: string, minute?: string): Promise<IBotResponse> => {
        const courseName = await classroomService.getCourseNameById(chatId, '758358245506');
        const courseWorkTitle = await classroomService.getCourseWorkTitleById(chatId, courseId, courseWorkId);
        const message = `Notification: only one hour to go before due date for the '${courseWorkTitle}' work (the '${courseName}' course)`;

        setScheduler(chatId, message, day, month, hour, minute);
        return ({ text: `Notification for '${courseWorkTitle}' work set successfully`, keyboard: Markup.keyboard([]) })
    },
}

function collectMaterialsInResponse(materials: Array<IMaterial>): IBotResponse[] {
    return materials.map(material => {
        let text = material.title + '\n' + material.description + '\n created: ' + material.creationTime;
        let keyboard = Markup.inlineKeyboard([
            [Markup.button.url("Open in browser", material.link)]
        ]);

        if (material.dueDate) {
            text += '\n due date: ' + getFormattedDate(material.dueDate);

            if (material.dueTime) {
                text += ' | ' + getFormattedTime(material.dueTime);
            }

            keyboard = addDueDateBtnInKeyboard(keyboard, material.id, material.courseId, material.dueDate, material.dueTime);
        }

        return ({
            text,
            keyboard
        })
    });
}

function getBotResponseWithCourses(courses: ICourseInfo[]): IBotResponse {
    const keyboard = Markup.keyboard(
        courses.map(course => [course.name]))
        .resize()
        .oneTime()

    return ({ text: 'choose the next action', keyboard })
}

export function getInlineKeyboardWithAuthorisation(chatId: number): Markup.Markup<InlineKeyboardMarkup> {
    return Markup.inlineKeyboard([
        [Markup.button.url("Login", `${ENV.HOST_URI}/auth?chat_id=${chatId}`)]
    ]);
}

function addDueDateBtnInKeyboard(keyboard: Markup.Markup<InlineKeyboardMarkup>, taskId: string, courseId: string, dueDate: classroom_v1.Schema$Date, dueTime?: classroom_v1.Schema$TimeOfDay): Markup.Markup<InlineKeyboardMarkup> {
    let buttons = keyboard.reply_markup.inline_keyboard;
    let callbackText = `notif mat=${taskId} course=${courseId} date=${getFormattedDate(dueDate)}`;
    if (dueTime) {
        dueTime.hours = (dueTime.hours as number) - 1
        callbackText += `T${getFormattedTime(dueTime)}`;
    }

    buttons.push([Markup.button.callback('Set due date notification (1 hour before)', callbackText)])
    return Markup.inlineKeyboard(buttons);
}

function getFormattedDate(dueDate: classroom_v1.Schema$Date): string {
    const month = dueDate.month;
    return dueDate.day + ':' + (month && month < 10 ? '0' + month : month) + ':' + dueDate.year
}

function getFormattedTime(dueTime: classroom_v1.Schema$TimeOfDay): string {
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

function setScheduler(chatId: number, message: string, day: number, month: number, hour?: string, minute?: string): void {
    const scheduler = cron.schedule(`${minute} ${hour} ${day} ${month} *`, () => {
        bot.telegram.sendMessage(chatId, message);
        scheduler.stop();
    });
}
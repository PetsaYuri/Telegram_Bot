import { Markup } from "telegraf";
import { InlineKeyboardMarkup, ReplyKeyboardMarkup } from "telegraf/typings/core/types/typegram";
import { classroomService } from "../api/services/classroomService";
import { IBotResponse } from "../api/types/CustomBotResponse";
import User from "../api/models/users";
import { ICourseInfo } from "../api/types/CustomCourseInfo";
import Course, { ICourse } from "../api/models/courses";
import { IMaterial } from "../api/types/CustomMaterial";
import { ENV } from "../config/zod/env";

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
            await Course.findOneAndUpdate({ _id: courseDb.id }, { lastTimeRetrieved: new Date() });
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
    }
}

function collectMaterialsInResponse(materials: Array<IMaterial>): IBotResponse[] {
    return materials.map(material => {

        return ({
            text: material.title + '\n' + material.description + '\n' + 'created: ' + material.creationTime,
            keyboard: Markup.inlineKeyboard([
                [Markup.button.url("Open in browser", material.link)]
            ])
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
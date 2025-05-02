import { Context, Scenes } from 'telegraf';
import { classroomService } from './classroomService';
import { ICourseInfo } from './types/CustomCourseInfo';
import { classroomHelperService } from './classroomHelperService'
import { IBotResponse } from '../../types/CustomBotResponse';
import { CourseActions } from './enums/CourseActions';

export const classroomHelperController = async (ctx: any) => {
    const text = ctx.text;

    switch (text) {

        case 'Classroom Helper':
        case '/classroom_helper':
            await processingClassroomHelperMessage(ctx);
            break;

        case 'Authorisation':
            await processingAuthorisationMessage(ctx);
            break;

        case 'Manage your own courses':
            await processingManageOwnCoursesMessage(ctx);
            break;

        case 'View all available courses':
            await processingViewAllAvailCoursesMessage(ctx);
            break;

        case 'No, back to courses':
            await processingBackToCoursesMessage(ctx);
            break;

        default:
            const manageCourseMatch = text.match("^manage '([a-zA-Z0-9\\s\\-]{3,20})' course$")
            const viewCourseMatch = text.match("^view '([a-zA-Z0-9\\s\\-]{3,20})' course$")
            const allMatFromCourseMatch = text.match("^Yes, I'd like to review all materials from (.+) course$");
            const createTaskMatch = text.match("^Create task for '([a-zA-Z0-9\\s\\-]{3,20})' course$");

            if (manageCourseMatch) {
                return await processingManageCourseMessage(ctx, manageCourseMatch);
            }

            else if (viewCourseMatch) {
                return await processingViewCourseMessage(ctx, viewCourseMatch);
            }

            else if (allMatFromCourseMatch) {
                return await processingAllMatFromCourseMessage(ctx, allMatFromCourseMatch);
            }

            else if (createTaskMatch) {
                return await processingCreateTaskMessage(ctx, createTaskMatch);
            }

            const callbackData = ctx?.callbackQuery.data;
            if (!callbackData && !text) {
                return await ctx.reply("Unknown command. Please try again.");
            }

            const editMaterialMatch = callbackData.match('^edit materialId=(\\d{12}), courseId=(\\d{12})$');
            const deleteMaterialMatch = callbackData.match('^delete materialId=(\\d{12}), courseId=(\\d{12})$');
            const setNotificationMatch = callbackData.match('^set notification material=(\\d{12}) course=(\\d{12})$');

            if (editMaterialMatch) {
                await processingEditMaterialMessage(ctx, editMaterialMatch);
            }

            else if (deleteMaterialMatch) {
                await processingDeleteMaterialMessage(ctx, deleteMaterialMatch);
            }

            else if (setNotificationMatch) {
                await processingSetNotificationMessage(ctx, setNotificationMatch);
            }

            else {
                await ctx.reply("Unknown command. Please try again.");
            }
    }
}

async function processingClassroomHelperMessage(ctx: any) {
    const chatId = ctx.chat?.id as number;
    const res = await classroomHelperService.getMenuResponse(chatId);
    await ctx.reply(res.text, res.keyboard);
}

async function processingAuthorisationMessage(ctx: Scenes.SceneContext) {
    const chatId = ctx.chat?.id as number;
    const res = classroomHelperService.getAuthorisationResponse(chatId);
    await ctx.reply(res.text, res.keyboard);
}

async function processingManageOwnCoursesMessage(ctx: Scenes.SceneContext) {
    const chatId = ctx.chat?.id as number;
    const res = await classroomHelperService.getCourseResponse(chatId, CourseActions.MANAGE);
    await ctx.reply(res.text, res.keyboard);
}

async function processingViewAllAvailCoursesMessage(ctx: Scenes.SceneContext) {
    const chatId = ctx?.chat?.id;
    const res = await classroomHelperService.getCourseResponse(chatId, CourseActions.VIEW);
    await ctx.reply(res.text, res.keyboard);
}

async function processingManageCourseMessage(ctx: any, match: RegExpMatchArray) {
    const chatId = ctx?.chat?.id;
    const courseName = match[1];

    const res = await classroomHelperService.getMaterialsFromCourse(chatId, courseName, CourseActions.MANAGE);
    sendMaterials(res, ctx);

    const botRes = classroomHelperService.getCreateTaskResponse(courseName);
    await ctx.reply(botRes.text, botRes.keyboard);
}

async function processingViewCourseMessage(ctx: any, match: RegExpMatchArray) {
    const chatId = ctx.chat.id;
    const courseName = match[1];

    const res = await classroomHelperService.getMaterialsFromCourse(chatId, courseName, CourseActions.VIEW);
    sendMaterials(res, ctx);
}

async function processingAllMatFromCourseMessage(ctx: any, match: RegExpMatchArray) {
    const chatId = ctx.chat.id;
    const title = match[1];
    const arrayCourses = await classroomService.getAllAvailableCourses(chatId);

    if (arrayCourses.map(course => course.name).includes(title)) {
        const course = arrayCourses.find(course => course.name === title) as ICourseInfo;
        const res = await classroomHelperService.getAllMaterialsResponse(chatId, course, false) as IBotResponse[];
        res.map(
            async ({ text, keyboard }) => await ctx.reply(text, keyboard)
        );

    } else {
        throw new Error(`You don't have course with title: ${title}`)
    }
}

async function processingBackToCoursesMessage(ctx: Scenes.SceneContext) {
    const chatId = ctx?.chat?.id;
    const res = await classroomHelperService.getCourseResponse(chatId, CourseActions.VIEW);
    await ctx.reply(res.text, res.keyboard);
}

async function processingEditMaterialMessage(ctx: any, match: RegExpMatchArray) {
    await ctx.answerCbQuery();
    const materialId = match[1];
    const courseId = match[2];

    await classroomHelperService.editTask(ctx, courseId, materialId);
}

async function processingDeleteMaterialMessage(ctx: any, match: RegExpMatchArray) {
    const chatId = ctx.chat?.id;
    await ctx.answerCbQuery();
    const materialId = match[1];
    const courseId = match[2];
    const res = await classroomHelperService.deleteMaterial(chatId, courseId, materialId);
    await ctx.reply(res.text);
}

async function processingSetNotificationMessage(ctx: any, match: RegExpMatchArray) {
    await ctx.answerCbQuery();
    const materialId = match[1];
    const courseId = match[2];

    await classroomHelperService.setNotification(ctx, materialId, courseId);
}

async function processingCreateTaskMessage(ctx: any, match: RegExpMatchArray) {
    const courseName = match[1];
    classroomHelperService.createTask(ctx, courseName);
}

async function sendMaterials(botResponse: IBotResponse | IBotResponse[], ctx: Context) {
    if (Array.isArray(botResponse)) {
        botResponse.map(
            async ({ text, keyboard }) => await ctx.reply(text, keyboard)
        );

    } else {
        await ctx.reply(botResponse.text, botResponse.keyboard);
    }
}
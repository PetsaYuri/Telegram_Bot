import { Context, Scenes } from 'telegraf';
import { classroomService } from './classroomService';
import { ICourseInfo } from './types/CustomCourseInfo';
import { classroomHelperService } from './classroomHelperService'
import { IBotResponse } from '../../types/CustomBotResponse';
import { CourseActions } from './enums/CourseActions';

export const classroomHelperController = async (ctx: Scenes.SceneContext) => {
    const text = ctx.text;

    switch (text) {
        case 'Classroom Helper':
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

            if (!text) {
                return await ctx.reply("Test is undefined. Please try again.");
            }

            const manageCourseMatch = text.match("^manage '([a-zA-Z0-9\\s\\-]{3,20})' course$")
            const viewCourseMatch = text.match("^view '([a-zA-Z0-9\\s\\-]{3,20})' course$")
            const allMatFromCourseMatch = text.match("^Yes, I'd like to review all materials from (.+) course$");
            const editMaterialMatch = text.match('^edit materialId=(\\d{12}), courseId=(\\d{12})$');
            const deleteMaterialMatch = text.match('^delete materialId=(\\d{12}), courseId=(\\d{12})$');
            const setNotificationMatch = text.match('^notif mat=(\\d{12}) course=(\\d{12}) date=(\\d{2}):(\\d{2}):(\\d{4})T(?:(\\d{2}):(\\d{2}))?$');
            const createTaskMatch = text.match("^Create task for '([a-zA-Z0-9\\s\\-]{3,20})' course$");

            if (manageCourseMatch) {
                await processingManageCourseMessage(ctx, manageCourseMatch);
            }

            else if (viewCourseMatch) {
                await processingViewCourseMessage(ctx, viewCourseMatch);
            }

            else if (allMatFromCourseMatch) {
                await processingAllMatFromCourseMessage(ctx, allMatFromCourseMatch);
            }

            else if (editMaterialMatch) {
                await processingEditMaterialMessage(ctx, editMaterialMatch);
            }

            else if (deleteMaterialMatch) {
                await processingDeleteMaterialMessage(ctx, deleteMaterialMatch);
            }

            else if (setNotificationMatch) {
                await processingSetNotificationMessage(ctx, setNotificationMatch);
            }

            else if (createTaskMatch) {
                await processingCreateTaskMessage(ctx, createTaskMatch);
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
    const chatId = ctx.chat?.id;
    await ctx.answerCbQuery();
    const materialId = match[1];
    const courseId = match[2];
    const res = await classroomHelperService.editMaterial(chatId, courseId, materialId);
    await ctx.reply(res.text);
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
    const chatId = ctx.chat?.id as number;
    await ctx.answerCbQuery();

    const materialId = match[1];
    const courseId = match[2];
    const day = Number.parseInt(match[3]);
    const month = Number.parseInt(match[4]);
    const hour = match[6];
    const minute = match[7];

    const res = await classroomHelperService.setNotification(chatId, materialId, courseId, day, month, hour, minute);
    await ctx.reply(res.text);
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
import { Context, Scenes, Telegraf } from 'telegraf';
import { classroomService } from '../../api/services/classroomService';
import { ICourseInfo } from '../../api/types/CustomCourseInfo';
import { classroomHelperService } from './classroomHelperService'
import { IBotResponse } from '../../api/types/CustomBotResponse';
import { asyncHandler } from '../../api/middleware/asyncHandler';
import { CourseActions } from '../../api/enums/CourseActions';

export const classroomHelperCommands = (bot: Telegraf<Scenes.SceneContext>) => {

    bot.hears('Classroom Helper', async (ctx: Context) => {
        const chatId = ctx.chat?.id as number;
        const res = await classroomHelperService.getMenuResponse(chatId);
        ctx.reply(res.text, res.keyboard);
    });

    bot.hears('Authorisation', (ctx: Context) => {
        const chatId = ctx.chat?.id as number;
        const res = classroomHelperService.getAuthorisationResponse(chatId);
        ctx.reply(res.text, res.keyboard);
    });

    bot.hears(new RegExp('Manage your own courses$'), asyncHandler(async (ctx: Context) => {
        const chatId = ctx.chat?.id as number;
        const res = await classroomHelperService.getCourseResponse(chatId, CourseActions.MANAGE);
        ctx.reply(res.text, res.keyboard);
    }))

    bot.hears('View all available courses', async (ctx) => {
        const chatId = ctx.chat.id;
        const res = await classroomHelperService.getCourseResponse(chatId, CourseActions.VIEW);
        ctx.reply(res.text, res.keyboard);
    });

    bot.hears(new RegExp("manage '([a-zA-Z0-9\\s\\-]{3,20})' course"), async (ctx) => {
        const chatId = ctx.chat.id;
        const courseName = ctx.match[1];

        const res = await classroomHelperService.getMaterialsFromCourse(chatId, courseName, CourseActions.MANAGE);
        sendMaterials(res, ctx);
        const botRes = classroomHelperService.getCreateTaskResponse(courseName);
        await ctx.reply(botRes.text, botRes.keyboard);
    });

    bot.hears(new RegExp("view '([a-zA-Z0-9\\s\\-]{3,20})' course"), async (ctx) => {
        const chatId = ctx.chat.id;
        const courseName = ctx.match[1];

        const res = await classroomHelperService.getMaterialsFromCourse(chatId, courseName, CourseActions.VIEW);
        sendMaterials(res, ctx);
    });

    bot.hears(new RegExp("^Yes, I'd like to review all materials from (.+) course$"), async (ctx) => {
        const chatId = ctx.chat.id;
        const title = ctx.match[1];
        const arrayCourses = await classroomService.getAllAvailableCourses(chatId);

        if (arrayCourses.map(course => course.name).includes(title)) {
            const course = arrayCourses.find(course => course.name === title) as ICourseInfo;
            const res = await classroomHelperService.getAllMaterialsResponse(chatId, course, false) as IBotResponse[];
            res.map(
                ({ text, keyboard }) => ctx.reply(text, keyboard)
            );

        } else {
            throw new Error(`You don't have course with title: ${title}`)
        }
    })

    bot.hears('No, back to courses', async (ctx) => {
        const chatId = ctx.chat.id;
        const res = await classroomHelperService.getCourseResponse(chatId, CourseActions.VIEW);
        ctx.reply(res.text, res.keyboard);
    });

    bot.action(new RegExp('^delete materialId=(\\d{12}), courseId=(\\d{12})$'), async (ctx) => {
        const chatId = ctx.chat?.id;
        await ctx.answerCbQuery();
        const materialId = ctx.match[1];
        const courseId = ctx.match[2];
        const res = await classroomHelperService.deleteMaterial(chatId, courseId, materialId);
        ctx.reply(res.text);
    });

    bot.action(new RegExp('^edit materialId=(\\d{12}), courseId=(\\d{12})$'), async (ctx) => {
        const chatId = ctx.chat?.id;
        await ctx.answerCbQuery();
        const materialId = ctx.match[1];
        const courseId = ctx.match[2];
        const res = await classroomHelperService.editMaterial(chatId, courseId, materialId);
        ctx.reply(res.text);
    });

    bot.action(new RegExp('^notif mat=(\\d{12}) course=(\\d{12}) date=(\\d{2}):(\\d{2}):(\\d{4})T(?:(\\d{2}):(\\d{2}))?'), async (ctx) => {
        const chatId = ctx.chat?.id as number;
        await ctx.answerCbQuery();

        const materialId = ctx.match[1];
        const courseId = ctx.match[2];
        const day = Number.parseInt(ctx.match[3]);
        const month = Number.parseInt(ctx.match[4]);
        const hour = ctx.match[6];
        const minute = ctx.match[7];

        const res = await classroomHelperService.setNotification(chatId, materialId, courseId, day, month, hour, minute);
        await ctx.reply(res.text);
    });

    bot.hears(new RegExp("^Create task for '([a-zA-Z0-9\\s\\-]{3,20})' course$"), async (ctx) => {
        classroomHelperService.createTask(ctx);
    });
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
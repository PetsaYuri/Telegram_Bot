import { Context, Telegraf } from 'telegraf';
import { classroomService } from '../api/services/classroomService';
import { ICourseInfo } from '../api/types/CustomCourseInfo';
import { botService } from './botService';
import { IBotResponse } from '../api/types/CustomBotResponse';
import { asyncHandler } from '../api/middleware/asyncHandler';

export const botController = (bot: Telegraf) => {

    bot.hears('/menu', async (ctx) => {
        const chatId = ctx.chat.id;
        const res = await botService.getMenuResponse(chatId);
        ctx.reply(res.text, res.keyboard);
    });

    bot.hears('Authorisation', (ctx: Context) => {
        const chatId = ctx.chat?.id as number;
        const res = botService.getAuthorisationResponse(chatId);
        ctx.reply(res.text, res.keyboard);
    });

    bot.hears('Manage your own courses', asyncHandler(async (ctx: Context) => {
        const chatId = ctx.chat?.id as number;
        const res = await botService.getOwnCoursesResponse(chatId);
        ctx.reply(res.text, res.keyboard);
    }))

    bot.hears('View all available courses', async (ctx) => {
        const chatId = ctx.chat.id;
        const res = await botService.getAvailableCoursesResponse(chatId);
        ctx.reply(res.text, res.keyboard);
    });

    bot.hears(new RegExp('.*'), async (ctx, next) => {
        const chatId = ctx.chat.id;
        const ownCourses = await classroomService.getAllOwnCourses(chatId);

        if (ownCourses.map(course => course.name).includes(ctx.message.text)) {
            const ownerId = await classroomService.getOwnerIdFromUserProfile(chatId);
            const ownCourse = ownCourses.find(course => course.name === ctx.message.text) as ICourseInfo;

            if (ownCourse.ownerId === ownerId) {
                const res = await botService.manageProvidedCourse(chatId, ownCourse);
                res.map(
                    ({ text, keyboard }) => ctx.reply(text, keyboard)
                );
                return;

            } else {
                throw new Error("You don't have access to interact with this course")
            }
        }

        const courses = await classroomService.getAllAvailableCourses(chatId);
        if (courses.map(course => course.name).includes(ctx.message.text)) {

            const course = courses.find(course => course.name === ctx.message.text) as ICourseInfo;
            const res = await botService.getAllMaterialsResponse(chatId, course);

            if (Array.isArray(res)) {
                res.map(
                    ({ text, keyboard }) => ctx.reply(text, keyboard)
                );

            } else {
                ctx.reply(res.text, res.keyboard);
            }
        }

        return next();
    });

    bot.hears(new RegExp("^Yes, I'd like to review all materials from (.+) course$"), async (ctx) => {
        const chatId = ctx.chat.id;
        const title = ctx.match[1];
        const arrayCourses = await classroomService.getAllAvailableCourses(chatId);

        if (arrayCourses.map(course => course.name).includes(title)) {
            const course = arrayCourses.find(course => course.name === title) as ICourseInfo;
            const res = await botService.getAllMaterialsResponse(chatId, course, false) as IBotResponse[];
            res.map(
                ({ text, keyboard }) => ctx.reply(text, keyboard)
            );

        } else {
            throw new Error(`You don't have course with title: ${title}`)
        }
    })

    bot.hears('No, back to courses', async (ctx) => {
        const chatId = ctx.chat.id;
        const res = await botService.getAvailableCoursesResponse(chatId);
        ctx.reply(res.text, res.keyboard);
    });

    bot.action(new RegExp('^delete materialId=(\\d{12}), courseId=(\\d{12})$'), async (ctx) => {
        const chatId = ctx.chat?.id;
        await ctx.answerCbQuery();
        const materialId = ctx.match[1];
        const courseId = ctx.match[2];
        console.log('mat', materialId);
        const res = await botService.deleteMaterial(chatId, courseId, materialId);
        ctx.reply(res.text);
    });

    bot.action(new RegExp('^edit materialId=(\\d{12}), courseId=(\\d{12})$'), async (ctx) => {
        const chatId = ctx.chat?.id;
        await ctx.answerCbQuery();
        const materialId = ctx.match[1];
        const courseId = ctx.match[2];
        console.log('mat', materialId);
        const res = await botService.editMaterial(chatId, courseId, materialId);
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

        const res = await botService.setNotification(chatId, materialId, courseId, day, month, hour, minute);
        await ctx.reply(res.text);
    })
}
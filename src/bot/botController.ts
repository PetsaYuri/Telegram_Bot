import { Context, Telegraf } from 'telegraf';
import { classroomService } from '../api/services/classroomService';
import { ICourseInfo } from '../api/types/CustomCourseInfo';
import { botService } from './botService';
import { IBotResponse } from '../api/types/CustomBotResponse';

export const botController = (bot: Telegraf) => {

    //authorisation
    bot.hears('Authorisation', (ctx: Context) => {
        const chatId = ctx.chat?.id as number;
        const res = botService.getAuthorisationResponse(chatId);
        ctx.reply(res.text, res.keyboard);
    });

    //menu
    bot.hears('/menu', async (ctx) => {
        const chatId = ctx.chat.id;
        const res = await botService.getMenuResponse(chatId);
        ctx.reply(res.text, res.keyboard);
    });

    bot.hears('Get all courses', async (ctx) => {
        const chatId = ctx.chat.id;
        const res = await botService.getOwnCoursesResponse(chatId);
        ctx.reply(res.text, res.keyboard);
    });

    bot.hears('No, back to courses', async (ctx) => {
        const chatId = ctx.chat.id;
        const res = await botService.getOwnCoursesResponse(chatId);
        ctx.reply(res.text, res.keyboard);
    });

    bot.hears(new RegExp('.*'), async (ctx, next) => {
        const chatId = ctx.chat.id;
        const courses = await classroomService.getAllClassroomCourses(chatId);

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
        const arrayCourses = await classroomService.getAllClassroomCourses(chatId);

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
}
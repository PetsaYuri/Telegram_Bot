import { Scenes, Telegraf } from 'telegraf';
import { botService } from './botService';
import { classroomHelperCommands } from './classroomHelper/classroomHelperController';
import { aiChatCommands } from './aiChat/aiChatController';

export const botController = (bot: Telegraf<Scenes.SceneContext>) => {

    bot.hears('/menu', async (ctx) => {
        const chatId = ctx.chat.id;
        const res = await botService.getMainMenuResponse(chatId);
        ctx.reply(res.text, res.keyboard);
    });

    aiChatCommands(bot);
    classroomHelperCommands(bot);
}
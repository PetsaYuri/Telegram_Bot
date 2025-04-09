import { Scenes, Telegraf } from 'telegraf';
import { botService, getMode, setMode } from './botService';
import { aiChatController } from './items/aiChat/aiChatController';
import { classroomHelperController } from './items/classroomHelper/classroomHelperController';

export const botController = (bot: Telegraf<Scenes.SceneContext>) => {

    bot.hears('/menu', async (ctx) => {
        const chatId = ctx.chat.id;
        const res = await botService.getMainMenuResponse(chatId);
        setMode(ctx.session.__scenes, null);
        ctx.reply(res.text, res.keyboard);
    });

    bot.on('message', async (ctx) => {
        const text = ctx.text;
        let mode = getMode(ctx.session.__scenes);

        if (!mode) {
            switch (text) {
                case 'AI Assistant':
                    setMode(ctx.session.__scenes, 'AI Assistant');
                    break;

                case 'Classroom Helper':
                    setMode(ctx.session.__scenes, 'Classroom Helper');
                    break;

                case 'Testing':
                    setMode(ctx.session.__scenes, 'Testing');
                    break;
            }
        }

        mode = getMode(ctx.session.__scenes);

        switch (mode) {
            case 'AI Assistant':
                await aiChatController(ctx);
                break;
            case 'Classroom Helper':
                await classroomHelperController(ctx);
                break;
            default:
                await ctx.reply("Unknown command. Please try again.")
        }
    });
}
import { Scenes, Telegraf } from 'telegraf';
import { botService, getMode, setMode } from './botService';
import { aiChatController } from './items/aiChat/aiChatController';
import { classroomHelperController } from './items/classroomHelper/classroomHelperController';
import { testingController } from './items/testing/testingController';
import { ModeTypes } from './types/ModeTypes';

export const botController = (bot: Telegraf<Scenes.SceneContext>) => {

    bot.hears(['/menu', '/back'], async (ctx) => {
        const chatId = ctx.chat.id;
        const res = await botService.getMainMenuResponse(chatId);

        setMode(ctx.session.__scenes, null);
        await ctx.reply(res.text, res.keyboard);
    });

    bot.on('message', async (ctx) => {
        const text = ctx.text;
        let mode = getMode(ctx.session.__scenes);

        if (!mode) {
            switch (text) {
                case 'AI Assistant':
                case '/ai_assistant':
                    setMode(ctx.session.__scenes, ModeTypes.AI_ASSISTANT);
                    break;

                case 'Classroom Helper':
                case '/classroom_helper':
                    setMode(ctx.session.__scenes, ModeTypes.CLASSROOM_HELPER);
                    break;

                case 'Testing':
                case '/testing':
                    setMode(ctx.session.__scenes, ModeTypes.TESTING);
                    break;
            }

            mode = getMode(ctx.session.__scenes);
        }

        await passContextToItemControllers(ctx);
    });

    bot.on('callback_query', async (ctx) => {
        await passContextToItemControllers(ctx);
    })
}

async function passContextToItemControllers(ctx: any) {
    const mode = getMode(ctx.session.__scenes);

    switch (mode) {
        case ModeTypes.AI_ASSISTANT:
            await aiChatController(ctx);
            break;

        case ModeTypes.CLASSROOM_HELPER:
            await classroomHelperController(ctx);
            break;

        case ModeTypes.TESTING:
            await testingController(ctx);
            break;

        default:
            await ctx.reply("Unknown command. Please try again.")
    }
}
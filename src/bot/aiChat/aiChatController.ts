import { Scenes, Telegraf } from "telegraf";
import { aiChatService, getFileLinksFromContext } from "./aiChatService";
import { message } from "telegraf/filters";

export const aiChatCommands = (bot: Telegraf<Scenes.SceneContext>) => {
    bot.hears("AI Assistant", async (ctx: Scenes.SceneContext) => {
        const response = aiChatService.getMenuResponse();
        ctx.reply(response);
    })

    bot.on(message('text'), async (ctx) => {
        const prompt = ctx.message.text

        if (prompt) {
            const response = await aiChatService.getAnswerFromPrompt(prompt);
            return ctx.reply(response, {
                parse_mode: "HTML"
            });
        }

        throw new Error("Prompt cannot be null");
    })

    bot.on(message('photo'), async (ctx) => {
        const fileLinks = await getFileLinksFromContext(ctx);
        const response = await aiChatService.getAnswerFromPrompt(ctx.text || '', fileLinks);
        ctx.reply(response, {
            parse_mode: "HTML"
        });
    })

    bot.on(message('voice'), async (ctx) => {
        const voice = ctx.message.voice;
        const fileId = voice.file_id;
        const fileLink = await ctx.telegram.getFileLink(fileId);

        const response = await aiChatService.getAnswerFromVoice(fileLink);
        ctx.reply(response, {
            parse_mode: "HTML"
        });
    })
}
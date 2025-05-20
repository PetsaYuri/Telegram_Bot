import { Scenes } from "telegraf";
import { aiChatService, getFileLinksFromContext, markdownToHtml } from "./aiChatService";
import { getLang } from "../../botService";
import { translationsHandler } from "../../../api/middleware/translationsHandler";
import { translationKeys } from "../../types/translations/TranslationsKeys";

export const aiChatController = async (ctx: any) => {
    const messageType = getMessageType(ctx.message);
    let response;

    switch (messageType) {
        case 'text':
            const text = ctx.text;
            const lang = getLang(ctx.session.__scenes);

            if (!text) {
                return ctx.reply(translationsHandler(translationKeys.AI_ASSISTANT_ENTER_SOME_TEXT, lang));
            }

            else if (text === '/ai_assistant' || text === translationsHandler(translationKeys.GENERAL_AI_ASSISTANT_TEXT, lang)
                || text === translationsHandler(translationKeys.GENERAL_AI_ASSISTANT_COMMAND, lang)) {
                await processingAiAssistantMessage(ctx);
            }

            else if (new RegExp('.*').test(text)) {
                const response = await aiChatService.getAnswerFromPrompt(ctx.text);
                await sendResponseInHtml(response, ctx);
            }

            break;

        case 'photo':
            const fileLinks = await getFileLinksFromContext(ctx);
            response = await aiChatService.getAnswerFromPrompt(ctx.text || '', fileLinks);
            await sendResponseInHtml(response, ctx);
            break;

        case 'voice':
            const voice = ctx.message.voice;
            const fileId = voice.file_id;
            const fileLink = await ctx.telegram.getFileLink(fileId);

            response = await aiChatService.getAnswerFromVoice(fileLink);
            await sendResponseInHtml(response, ctx);
            break;

    }
}

function getMessageType(message: any) {
    if ('text' in message) return 'text';
    if ('photo' in message) return 'photo';
    if ('voice' in message) return 'voice';
    return undefined;
}

async function processingAiAssistantMessage(ctx: Scenes.SceneContext) {
    const lang = getLang(ctx.scene.session);
    const response = aiChatService.getMenuResponse(lang);
    return await ctx.reply(response);
}

async function sendResponseInHtml(response: string, ctx: Scenes.SceneContext) {
    const text = markdownToHtml(response);
    await ctx.reply(text, {
        parse_mode: "HTML"
    });
}
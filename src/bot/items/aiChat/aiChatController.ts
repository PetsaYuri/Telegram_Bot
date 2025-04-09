import { Scenes } from "telegraf";
import { aiChatService, getFileLinksFromContext } from "./aiChatService";

export const aiChatController = async (ctx: any) => {
    const messageType = getMessageType(ctx.message);
    let response;

    switch (messageType) {
        case 'text':
            const text = ctx.text;

            if (!text) {
                return ctx.reply('You need to enter some text');
            }

            else if (text === 'AI Assistant') {
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
    const response = aiChatService.getMenuResponse();
    return await ctx.reply(response);
}

async function sendResponseInHtml(response: string, ctx: Scenes.SceneContext) {
    await ctx.reply(response, {
        parse_mode: "HTML"
    });
}
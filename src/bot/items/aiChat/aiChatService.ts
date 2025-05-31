import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "../../../config/zod/env";
import { marked } from "marked";
import { aiChatModels } from "./enums/aiChatModels";
import { translationsHandler } from "../../../api/middleware/translationsHandler";
import { translationKeys } from "../../translations/TranslationsKeys";
import { LangTypes } from "../../translations/LangTypes";

const genAI = new GoogleGenerativeAI(ENV.GOOGLE_GEMINI_API_KEY);

export const aiChatService = {

    getMenuResponse: (lang: LangTypes): string => {
        return translationsHandler(translationKeys.AI_ASSISTANT_MENU_RESPONSE, lang);
    },

    getAnswerFromPrompt: async (prompt: string, fileLinks?: Array<URL>, modelType: aiChatModels = aiChatModels.GEMINI_2_0_FLASH): Promise<string> => {
        const model = genAI.getGenerativeModel({ model: modelType }) //gemini-2.5-pro-exp-03-25
        let result;

        if (fileLinks) {
            let imageParts: { inlineData: { data: string, mimeType: string } }[] = [];

            for (let fileLink of fileLinks) {
                imageParts.push(await convertUrlToGenPart(fileLink, 'image/jpeg'));
            }

            if (prompt === '' && imageParts.length > 0) {
                prompt = "You are an assistant that always responds in the same language as the user's input. " +
                    'The attached image contains a question. First, extract the question from the image using OCR. ' +
                    'Then, answer it fully and clearly **in the same language** the question was written in. ' +
                    'Important: Do not translate the question or your answer into English. Use the same language as in the image. ' +
                    'Now, please read the image and answer the question.'
            }

            result = await model.generateContent([prompt, ...imageParts]);

        } else {
            result = await model.generateContent(prompt);
        }

        return result.response.text();
    },

    getAnswerFromVoice: async (voice: URL): Promise<string> => {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
        const voicePart = [
            await convertUrlToGenPart(voice, 'audio/ogg')
        ]

        const result = await model.generateContent([...voicePart]);
        return result.response.text();
    }
}

export function markdownToHtml(text: string): string {
    const html = marked(text);
    return html.toString()
        .replace(/<\/?p>/g, '\n')
        .replace(/<\/?ul>/g, '')
        .replace(/<\/?ol>/g, '')
        .replace(/<li>/g, '\n • ')
        .replace(/<\/li>/g, '\n \n')
        .replace(/\n+/g, '\n')
        .trim();
}

async function convertUrlToGenPart(path: URL, mimeType: string): Promise<{ inlineData: { data: string, mimeType: string } }> {
    const response = await fetch(path);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return {
        inlineData: {
            data: base64,
            mimeType
        }
    }
}

export async function getFileLinksFromContext(ctx: any): Promise<URL[]> {
    const mediaGroups = new Map<string, any[]>();

    if (ctx.message.media_group_id) {
        const groupId = ctx.message.media_group_id;

        if (!mediaGroups.has(groupId)) {
            mediaGroups.set(groupId, []);
        }
        mediaGroups.get(groupId)?.push(ctx)

        return await new Promise((resolve) => {
            setTimeout(async () => {
                const group = mediaGroups.get(groupId);
                if (!group) {
                    return;
                }

                const fileLinks = await Promise.all(
                    group.map(async (m) => {
                        const photos = m.message.photo;
                        const fileId = photos[photos.length - 1].file_id
                        return await ctx.telegram.getFileLink(fileId);
                    })
                )

                mediaGroups.delete(groupId);
                resolve(fileLinks);
            }, 5000)
        })
    }

    //for single photo message
    const photos = ctx.message.photo;
    const fileId = photos[photos.length - 1].file_id
    return [await ctx.telegram.getFileLink(fileId)];
}
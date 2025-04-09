import { gaxios } from "google-auth-library";
import { Context } from "telegraf";
import { MaybePromise } from "telegraf/typings/core/helpers/util";
import { getInlineKeyboardWithAuthorisation } from "../../bot/items/classroomHelper/classroomHelperService";

export const errorHandler = (error: any, ctx: Context): MaybePromise<void> => {
    let message = error.message || 'Internal Server Error';
    const chatId = ctx.chat?.id as number;
    let keyboard;

    if (error instanceof gaxios.GaxiosError && message === 'invalid_grant') {
        keyboard = getInlineKeyboardWithAuthorisation(chatId);
    }

    ctx.reply(message, keyboard);
}
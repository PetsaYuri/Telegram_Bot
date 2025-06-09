import { gaxios } from "google-auth-library";
import { MaybePromise } from "telegraf/typings/core/helpers/util";
import { getInlineKeyboardWithAuthorisation } from "../../bot/items/classroomHelper/classroomHelperService";
import { Markup } from "telegraf";
import { getLang } from "../../bot/botService";
import { translationsHandler } from "./translationsHandler";
import { translationKeys } from "../../bot/translations/TranslationsKeys";

export const errorHandler = (error: any, ctx: any): MaybePromise<void> => {
    const lang = getLang(ctx.session.__scenes);
    let message = error.message || translationsHandler(translationKeys.GENERAL_INTERNAL_SERVER_ERROR_TEXT, lang);
    const chatId = ctx.chat?.id as number;
    let keyboard;

    if (error instanceof gaxios.GaxiosError && message === 'invalid_grant') {
        keyboard = getInlineKeyboardWithAuthorisation(ctx.session.__scenes, chatId);

    } else if (error instanceof gaxios.GaxiosError && String(message).includes('The model is overloaded')) {
        message = translationsHandler(translationKeys.GENERAL_GEMINI_OVERLOADED_TEXT, lang);
        keyboard = Markup.keyboard([
            [translationsHandler(translationKeys.GENERAL_MAIN_MENU_COMMAND, lang)]
        ]);
    }

    ctx.reply(message, keyboard);
}
import { Markup } from "telegraf";
import { InlineKeyboardMarkup, ReplyKeyboardMarkup } from "telegraf/typings/core/types/typegram";

export interface IBotResponse {
    text: string,
    keyboard: Markup.Markup<ReplyKeyboardMarkup | InlineKeyboardMarkup>
}
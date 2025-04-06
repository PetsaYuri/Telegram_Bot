import { Markup } from "telegraf";
import { IBotResponse } from "../api/types/CustomBotResponse";

export const botService = {

    getMainMenuResponse: async (chatId: number): Promise<IBotResponse> => {
        const keyboard = Markup.keyboard([
            ['AI Assistant'],
            ['Classroom Helper'],
            ['Testing'],
        ])

        return ({
            text: 'Main Menu:',
            keyboard: keyboard,
        });
    }
}
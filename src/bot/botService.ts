import { Markup } from "telegraf";
import { IBotResponse } from "./types/CustomBotResponse";
import { SceneSessionData } from "telegraf/typings/scenes";

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

export function getMode(scenes: SceneSessionData | undefined): string | null {
    const state = scenes?.state;

    if (state) {
        return (state as { mode: string }).mode;
    }

    return null;
}

export function setMode(scenes: SceneSessionData | undefined, mode: string | null): void {
    if (!scenes) return;

    if (!scenes.state) {
        scenes.state = { mode: {} };
    }

    (scenes.state as any).mode = mode;
}
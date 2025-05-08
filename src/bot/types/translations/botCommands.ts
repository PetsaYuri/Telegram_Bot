import { EnglishBotCommands } from "./botCommands/EnglishBotCommands";
import { UkrainianBotCommands } from "./botCommands/UkrainianBotCommands";
import { LangTypes } from "./LangTypes";
import { bot } from "../../..";

const botCommands: Record<LangTypes, { command: string; description: string }[]> = {
    en: EnglishBotCommands,
    ua: UkrainianBotCommands
}

export async function updateBotCommands(lang: LangTypes) {
    const commands = botCommands[lang];
    await bot.telegram.setMyCommands(commands);
}
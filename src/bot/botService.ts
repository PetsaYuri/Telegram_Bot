import { Markup } from "telegraf";
import { IBotResponse } from "./types/CustomBotResponse";
import { SceneSessionData } from "telegraf/typings/scenes";
import { ModeTypes } from "./types/ModeTypes";
import { LangTypes } from "./types/translations/LangTypes";
import { translationsHandler } from "../api/middleware/translationsHandler";
import { translationKeys } from "./types/translations/TranslationsKeys";
import { updateBotCommands } from "./types/translations/botCommands";

const ENGLISH_LANGUAGE_TEXT = 'English language';
const UKRAINIAN_LANGUAGE_TEXT = 'Українська мова';
export const LANGUAGES = [ENGLISH_LANGUAGE_TEXT, UKRAINIAN_LANGUAGE_TEXT]

export const botService = {

    getMainMenuResponse: (scenes: SceneSessionData | undefined): IBotResponse => {
        setMode(scenes, null);
        const lang = getLang(scenes)

        const keyboard = Markup.keyboard(getItemsButton(scenes))
        const text = translationsHandler(translationKeys.GENERAL_MAIN_MENU_TEXT, lang);

        return ({
            text,
            keyboard: keyboard,
        });
    },

    getChooseLanguage: (scenes: SceneSessionData | undefined) => {
        const lang = getLang(scenes);
        const keyboard = Markup.keyboard([
            [ENGLISH_LANGUAGE_TEXT],
            [UKRAINIAN_LANGUAGE_TEXT]
        ])

        return ({ text: translationsHandler(translationKeys.GENERAL_CHOOSE_LANGUAGE_TEXT, lang), keyboard })
    },

    setChosenLanguage: async (scenes: SceneSessionData, lang: string) => {
        setLang(scenes, lang);
        const installedLang = getLang(scenes)
        await updateBotCommands(installedLang);

        const text = translationsHandler(translationKeys.GENERAL_SET_CHOSEN_LANGUAGE_TEXT, installedLang);
        const keyboard = Markup.keyboard([
            ...getItemsButton(scenes)
        ])
            .resize()
            .oneTime()

        return ({ text, keyboard });
    }
}

export function getMode(scenes: SceneSessionData | undefined): string | null {
    const state = scenes?.state;

    if (state) {
        return (state as { mode: string }).mode;
    }

    return null;
}

export function setMode(scenes: SceneSessionData | undefined, mode: ModeTypes | null): void {
    if (!scenes) return;

    if (!scenes.state) {
        scenes.state = { mode: {} };
    }

    (scenes.state as any).mode = mode;
}

export function getLang(scenes: SceneSessionData | undefined): LangTypes {
    const lang = (scenes?.state as { lang: LangTypes })?.lang;
    return lang ?? LangTypes.EN
}

export function setLang(scenes: SceneSessionData | undefined, lang: string | LangTypes): void {
    const definedLang = Object.values(LangTypes).includes(lang as LangTypes) ? lang : defineLanguage(lang);
    if (!scenes) {
        scenes = { state: {} }
    }

    if (!scenes.state) {
        scenes.state = { lang: {} };
    }

    (scenes.state as any).lang = definedLang;
}

function defineLanguage(lang: string): LangTypes {
    switch (lang) {
        case ENGLISH_LANGUAGE_TEXT:
        case 'en':
            return LangTypes.EN;

        case UKRAINIAN_LANGUAGE_TEXT:
        case 'ua':
            return LangTypes.UA

        default:
            throw new Error(`Sorry, but we don't have translation on '${lang}' language`)
    }
}

function getItemsButton(scenes: SceneSessionData | undefined) {
    const lang = getLang(scenes);
    return [
        [translationsHandler(translationKeys.GENERAL_AI_ASSISTANT_TEXT, lang)],
        [translationsHandler(translationKeys.GENERAL_CLASSROOM_HELPER_TEXT, lang)],
        [translationsHandler(translationKeys.GENERAL_TESTING_TEXT, lang)],
    ]
}

export function format(str: string, ...args: any) {
    let i = 0;
    return str.replace(/%s/g, () => args[i++]);
}

export function addPrefixToKeysAndValues<T extends Record<string, string>, P extends string>
    (prefix: P, keys: T): { [K in keyof T as `${Uppercase<P>}_${string & K}`]: `${P}.${T[K]}` } {

    const result: any = {}
    for (const key in keys) {
        result[`${prefix.toUpperCase()}_${key}`] = `${prefix}.${keys[key]}`;
    }

    return result;
}
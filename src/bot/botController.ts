import { Scenes, Telegraf } from 'telegraf';
import { botService, getLang, getMode, LANGUAGES, setMode } from './botService';
import { aiChatController } from './items/aiChat/aiChatController';
import { classroomHelperController } from './items/classroomHelper/classroomHelperController';
import { testingController } from './items/testing/testingController';
import { ModeTypes } from './types/ModeTypes';
import { translationsHandler } from '../api/middleware/translationsHandler';
import { translationKeys } from './translations/TranslationsKeys';
import { message } from 'telegraf/filters'
import { LangTypes } from './translations/LangTypes';

export const botController = (bot: Telegraf<Scenes.SceneContext>) => {

    bot.on(message('text'), async (ctx) => {
        const text = ctx.text as string;
        const lang = getLang(ctx.scene.session) ?? LangTypes.EN;

        const scenes = ctx.session.__scenes;
        let res;

        switch (text) {
            case '/start':
            case '/back':
            case '/menu':
            case translationsHandler(translationKeys.GENERAL_MAIN_MENU_COMMAND, lang):
            case translationsHandler(translationKeys.GENERAL_RETURN_TO_MAIN_MENU_TEXT, lang):
                res = botService.getMainMenuResponse(ctx.session.__scenes);
                break;

            case '/language':
            case translationsHandler(translationKeys.GENERAL_CHOOSE_LANGUAGE_COMMAND, lang):
            case translationsHandler(translationKeys.GENERAL_CHANGE_LANGUAGE_TEXT, lang):
                res = botService.getChooseLanguage(ctx.scene.session);
                break;

            case '/welcome':
                res = botService.getWelcomePageResponse(ctx.scene.session);
                break;

            case '/privacy_policy':
                res = botService.getPrivacyPolicyResponse(ctx.session.__scenes);
                break;

            case '/terms_of_service':
                res = botService.getTermsOfServiceResponse(ctx.session.__scenes);
                break;

            case '/ai_assistant':
            case translationsHandler(translationKeys.GENERAL_AI_ASSISTANT_TEXT, lang):
            case translationsHandler(translationKeys.GENERAL_AI_ASSISTANT_COMMAND, lang):
                setMode(scenes, ModeTypes.AI_ASSISTANT);
                break;

            case '/classroom_helper':
            case translationsHandler(translationKeys.GENERAL_CLASSROOM_HELPER_TEXT, lang):
            case translationsHandler(translationKeys.GENERAL_CLASSROOM_HELPER_COMMAND, lang):
                setMode(scenes, ModeTypes.CLASSROOM_HELPER);
                break;

            case '/testing':
            case translationsHandler(translationKeys.GENERAL_TESTING_TEXT, lang):
            case translationsHandler(translationKeys.GENERAL_TESTING_COMMAND, lang):
                setMode(scenes, ModeTypes.TESTING);
                break;
        }

        if (LANGUAGES.includes(text)) {
            const language = LANGUAGES.find(lang => lang === text) as string;
            res = await botService.setChosenLanguage(ctx.scene.session, language);
        }

        if (res) {
            await ctx.reply(res.text, res.keyboard);

        } else {
            await passContextToItemControllers(ctx);
        }
    })

    bot.on('callback_query', async (ctx) => {
        await passContextToItemControllers(ctx);
    })

    bot.on([message('photo'), message('voice')], async (ctx) => {
        await aiChatController(ctx);
    })
}

async function passContextToItemControllers(ctx: any) {
    const mode = getMode(ctx.session.__scenes);

    switch (mode) {
        case ModeTypes.AI_ASSISTANT:
            await aiChatController(ctx);
            break;

        case ModeTypes.CLASSROOM_HELPER:
            await classroomHelperController(ctx);
            break;

        case ModeTypes.TESTING:
            await testingController(ctx);
            break;

        default:
            const lang = getLang(ctx.session.__scenes);
            await ctx.reply(translationsHandler(translationKeys.GENERAL_UNKNOWN_COMMAND_TEXT, lang));
    }
}
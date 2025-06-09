import { Markup, Scenes } from "telegraf";
import { ISceneContext } from "../../../types/ISceneContext";
import ms, { StringValue } from "ms";
import { convertMsToDateStr } from "../classroomHelperService";
import { translationsHandler } from "../../../../api/middleware/translationsHandler";
import { translationKeys } from "../../../translations/TranslationsKeys";
import { getExitButton, forceExit, getLang } from "../../../botService";
import { ModeTypes } from "../../../types/ModeTypes";
import { LangTypes } from "../../../translations/LangTypes";

export const createNotifScene = new Scenes.WizardScene<ISceneContext>('CREATE_NOTIF',
    async (ctx: any) => {
        const lang = getLang(ctx.session.__scenes);

        await ctx.reply(translationsHandler(translationKeys.SCENES_ENTER_TIME_TEXT, lang) +
            `${translationsHandler(translationKeys.SCENES_ONE_DAY_TEXT, lang)}/${translationsHandler(translationKeys.SCENES_ONE_HOUR_TEXT, lang)}` +
            `/${translationsHandler(translationKeys.SCENES_ONE_MINUTE_TEXT, lang)} (` + translationsHandler(translationKeys.SCENES_LEFT_TEXT, lang) +
            ` ${convertMsToDateStr(ctx.session.__scenes, ctx.scene.state.differenceTime)})`, getNotifKeyboard(lang));

        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const lang = getLang(ctx.session.__scenes);
        const state = ctx.scene.state;

        if (ctx.text === '/exit' || ctx.text === translationsHandler(translationKeys.SCENES_EXIT_COMMAND, lang)) {
            forceExit(ctx, ModeTypes.CLASSROOM_HELPER);
            return;
        }

        const timeStr = ctx.text as StringValue
        let time = 0;

        if (timeStr.includes(' ')) {
            const splitedTime = timeStr.split(' ');

            for (const el of splitedTime) {
                if (lang === LangTypes.UA) {
                    time += getTimeInMillisByUkrLetters(el);

                } else {
                    time += ms(el as StringValue);
                }
            }

        } else {

            if (lang === LangTypes.UA) {
                time += getTimeInMillisByUkrLetters(timeStr);

            } else {
                time = ms(timeStr);
            }
        }

        if (!time) {
            await ctx.reply(translationsHandler(translationKeys.SCENES_TIME_CANNOT_BE_EMPTY_TEXT, lang), getNotifKeyboard(lang));
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);

        } else if (time <= 60000) {
            await ctx.reply(translationsHandler(translationKeys.SCENES_TIME_CANNOT_BE_LESS_TEXT, lang), getNotifKeyboard(lang));
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);

        } else if (time >= ctx.scene.state.differenceTime) {
            await ctx.reply(translationsHandler(translationKeys.SCENES_TIME_CANNOT_BE_MORE_TEXT, lang), getNotifKeyboard(lang));
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        state.time = time;
        ctx.session.__scenes = {
            cursor: NaN, state: {
                time: state.time,
                mode: ModeTypes.CLASSROOM_HELPER,
                lang
            }
        };

        return ctx.scene.leave();
    }
)

function getNotifKeyboard(lang: LangTypes) {
    return Markup.keyboard([
        [translationsHandler(translationKeys.SCENES_ONE_DAY_TEXT, lang), translationsHandler(translationKeys.SCENES_ONE_HOUR_TEXT, lang),
        translationsHandler(translationKeys.SCENES_ONE_MINUTE_TEXT, lang)],

        [`${translationsHandler(translationKeys.SCENES_ONE_DAY_TEXT, lang)} ${translationsHandler(translationKeys.SCENES_ONE_HOUR_TEXT, lang)}`,
        `${translationsHandler(translationKeys.SCENES_ONE_DAY_TEXT, lang)} ${translationsHandler(translationKeys.SCENES_ONE_HOUR_TEXT, lang)} ` +
        `${translationsHandler(translationKeys.SCENES_ONE_MINUTE_TEXT, lang)}`, `6${translationsHandler(translationKeys.SCENES_LETTER_D_TEXT, lang)}`],
        ...getExitButton(lang)
    ])
        .resize()
        .oneTime();
}

function getTimeInMillisByUkrLetters(notifTimeStr: string): number {
    const splitednotifTime = notifTimeStr.split(/д|г|хв/);

    if (notifTimeStr.includes('д')) {
        return ms(splitednotifTime[0] + 'd' as StringValue);

    } else if (notifTimeStr.includes('г')) {
        return ms(splitednotifTime[0] + 'h' as StringValue);

    } else if (notifTimeStr.includes('хв')) {
        return ms(splitednotifTime[0] + 'm' as StringValue);
    }

    return 0;
}
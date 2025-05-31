import { Markup, Scenes } from "telegraf";
import { ISceneContext } from "../../../types/ISceneContext";
import ms, { StringValue } from "ms";
import { convertMsToDateStr } from "../classroomHelperService";
import { translationsHandler } from "../../../../api/middleware/translationsHandler";
import { translationKeys } from "../../../translations/TranslationsKeys";
import { exitButton, forceExit, getLang } from "../../../botService";
import { ModeTypes } from "../../../types/ModeTypes";

const notifKeyboard = Markup.keyboard([
    ['1d', '1h', '1m'],
    ['1d 1h', '1d 1h 1m', '6d'],
    ...exitButton
])
    .resize()
    .oneTime();

export const createNotifScene = new Scenes.WizardScene<ISceneContext>('CREATE_NOTIF',
    async (ctx: any) => {
        const lang = getLang(ctx.session.__scenes);

        await ctx.reply(translationsHandler(translationKeys.SCENES_ENTER_TIME_TEXT, lang) +
            '1d/1h/1m (' + translationsHandler(translationKeys.SCENES_LEFT_TEXT, lang) +
            ` ${convertMsToDateStr(ctx.session.__scenes, ctx.scene.state.differenceTime)})`, notifKeyboard);

        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const lang = getLang(ctx.session.__scenes);
        const state = ctx.scene.state;

        if (ctx.text === '/exit') {
            forceExit(ctx, ModeTypes.CLASSROOM_HELPER);
            return;
        }

        const timeStr = ctx.text as StringValue
        let time = 0;

        if (timeStr.includes(' ')) {
            const splitedTime = timeStr.split(' ');
            for (let el of splitedTime) {
                time += ms(el as StringValue);
            }

        } else {
            time = ms(timeStr);
        }

        if (!time) {
            await ctx.reply(translationsHandler(translationKeys.SCENES_TIME_CANNOT_BE_EMPTY_TEXT, lang), notifKeyboard);
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);

        } else if (time <= 60000) {
            await ctx.reply(translationsHandler(translationKeys.SCENES_TIME_CANNOT_BE_LESS_TEXT, lang), notifKeyboard);
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);

        } else if (time >= ctx.scene.state.differenceTime) {
            await ctx.reply(translationsHandler(translationKeys.SCENES_TIME_CANNOT_BE_MORE_TEXT, lang), notifKeyboard);
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        state.time = time;
        ctx.session.__scenes = {
            cursor: NaN, state: {
                time: state.time,
                lang
            }
        };

        return ctx.scene.leave();
    }
)
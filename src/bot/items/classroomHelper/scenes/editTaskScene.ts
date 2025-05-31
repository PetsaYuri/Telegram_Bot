import { Scenes } from "telegraf";
import { ISceneContext } from "../../../types/ISceneContext";
import { ModeTypes } from "../../../types/ModeTypes";
import { getFormattedDate, getFormattedTime } from "../classroomHelperService";
import { dueDateKeyboard, dueTimekeyboard, isPastDate, isPastDateAndTime, maxPointKeyboard, skipKeyboard } from "./createTaskScene";
import { translationsHandler } from "../../../../api/middleware/translationsHandler";
import { translationKeys } from "../../../translations/TranslationsKeys";
import { forceExit, format, getLang } from "../../../botService";
import { SceneSessionData } from "telegraf/typings/scenes";

const skipText = (scenes: SceneSessionData | undefined, prevValue?: string) => {
    const lang = getLang(scenes);
    let text = translationsHandler(translationKeys.SCENES_ENTER_TO_SKIP_TEXT, lang);

    if (!prevValue) {
        return text;
    }

    return text + ' ' + translationsHandler(translationKeys.SCENES_KEEP_PREV_VALUE_TEXT, lang) + `: '${prevValue.toString()}'`;
}

export const editTaskWizardScene = new Scenes.WizardScene<ISceneContext>('EDIT_TASK',
    async (ctx) => {
        const lang = getLang(ctx.session.__scenes);
        const state = getState(ctx);

        const question = translationsHandler(translationKeys.SCENES_ENTER_NEW_TITLE_TEXT, lang) + ` (${skipText(ctx.session.__scenes, state.task.title)}):`;
        await ctx.reply(question, skipKeyboard);
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const lang = getLang(ctx.session.__scenes);
        const state = getState(ctx);

        if (ctx.text === '/exit') {
            forceExit(ctx, ModeTypes.CLASSROOM_HELPER);
            return;
        }

        let title = state.title ? state.title : ctx.text as string;
        if (title === '-') {
            title = state.task.title;

        } else if (title.length < 1 || title.length > 3000) {
            await ctx.reply(translationsHandler(translationKeys.SCENES_TITLE_MUST_BE_BETWEEN_TEXT, lang), skipKeyboard);

            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        state.title = title;
        await ctx.reply(translationsHandler(translationKeys.SCENES_ENTER_NEW_DESC_TEXT, lang) + ` ${skipText(ctx.session.__scenes, state.task?.description)})`, skipKeyboard);
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const lang = getLang(ctx.session.__scenes);
        const state = getState(ctx);

        if (ctx.text === '/exit') {
            forceExit(ctx, ModeTypes.CLASSROOM_HELPER);
            return;
        }

        let description = state.description ? state.description : ctx.text as string;
        if (description === '-') {
            description = state.task?.description;

        } else if (description.length > 30000) {
            await ctx.reply(format
                (translationsHandler(translationKeys.SCENES_DESC_MUST_BE_GREATER_TEXT, lang), skipText(ctx.session.__scenes, ctx.session.__scenes)),
                skipKeyboard);

            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        state.description = description;
        await ctx.reply(translationsHandler(translationKeys.SCENES_ENTER_NEW_MAX_SCORE_TEXT, lang) +
            ` (${skipText(ctx.session.__scenes, state.task?.maxPoints)}):`, maxPointKeyboard);
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const lang = getLang(ctx.session.__scenes);
        const state = getState(ctx);

        if (ctx.text === '/exit') {
            forceExit(ctx, ModeTypes.CLASSROOM_HELPER);
            return;
        }

        let maxPointsStr = ctx.text as string;
        let maxPoints = state.maxPoints ? state.maxPoints : NaN;

        if (maxPointsStr === '-') {
            maxPoints = state.task?.maxPoints;
        }

        if (!maxPoints) {
            maxPoints = Number.parseInt(maxPointsStr);
            if (Number.isNaN(maxPoints) || maxPoints > Number.MAX_SAFE_INTEGER || maxPoints < 0) {
                await ctx.reply(translationsHandler(translationKeys.SCENES_MAX_SCORE_MUST_BE_GREATER_TEXT, lang), maxPointKeyboard);

                ctx.wizard.back();
                return ctx.wizard.steps[ctx.wizard.cursor](ctx);
            }
        }

        state.maxPoints = maxPoints;
        const formatedDate = getFormattedDate(state.task?.dueDate);

        await ctx.reply(format(
            translationsHandler(translationKeys.SCENES_ENTER_NEW_DUE_DATE_TEXT, lang), skipText(ctx.session.__scenes, formatedDate)),
            dueDateKeyboard);

        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const lang = getLang(ctx.session.__scenes);
        const state = getState(ctx);

        if (ctx.text === '/exit') {
            forceExit(ctx, ModeTypes.CLASSROOM_HELPER);
            return;
        }

        const dueDateStr = ctx.text as string;
        let dueDate = state.dueDate ? state.dueDate : undefined;

        if (dueDateStr === '-') {
            dueDate = state.task?.dueDate;
        }

        if (!dueDate) {
            if (!dueDateStr.match(/^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.\d{4}$/)) {
                await ctx.reply(translationsHandler(translationKeys.SCENES_DATE_INCORRECT_FORMAT_TEXT, lang), dueDateKeyboard);
                ctx.wizard.back();
                return ctx.wizard.steps[ctx.wizard.cursor](ctx);

            } else if (isPastDate(dueDateStr)) {
                await ctx.reply(translationsHandler(translationKeys.SCENES_DATE_CANNOT_BE_IN_PAST_TEXT, lang), dueDateKeyboard);
                ctx.wizard.back();
                return ctx.wizard.steps[ctx.wizard.cursor](ctx);
            }

            dueDate = dueDateStr;
        }

        state.dueDate = dueDate;
        const formatedTime = getFormattedTime(state.task?.dueTime);

        await ctx.reply(format(
            translationsHandler(translationKeys.SCENES_ENTER_NEW_DUE_TIME_TEXT, lang), skipText(ctx.session.__scenes, formatedTime)),
            dueTimekeyboard);
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const lang = getLang(ctx.session.__scenes);
        const state = getState(ctx);

        if (ctx.text === '/exit') {
            forceExit(ctx, ModeTypes.CLASSROOM_HELPER);
            return;
        }

        const dueTimeStr = ctx.text as string;
        let dueTime = state.dueTime ? state.dueTime : undefined;

        if (dueTimeStr === '-') {
            dueTime = state.task?.dueTime
        }

        if (!dueTime) {
            if (!dueTimeStr.match(/^(?:[01]\d|2[0-3]):[0-5]\d$/)) {
                await ctx.reply(format(
                    translationsHandler(translationKeys.SCENES_TIME_INCORRECT_FORMAT_TEXT, lang), skipText(ctx.session.__scenes)),
                    dueTimekeyboard);

                ctx.wizard.back();
                return ctx.wizard.steps[ctx.wizard.cursor](ctx);

            } else if (isPastDateAndTime(state.dueDate as string, dueTime)) {
                await ctx.reply(translationsHandler(translationKeys.SCENES_TIME_CANNOT_BE_IN_PAST_TEXT, lang), dueTimekeyboard);
                ctx.wizard.back();
                return ctx.wizard.steps[ctx.wizard.cursor](ctx);
            }

            dueTime = dueTimeStr;
        }

        state.dueTime = dueTimeStr;
        await leaveFromScene(ctx);
    }
)

async function leaveFromScene(ctx: any) {
    const state = getState(ctx);
    ctx.session.__scenes = {

        cursor: NaN, state: {
            title: state.title,
            description: state.description,

            dueDate: state.dueDate,
            dueTime: state.dueTime,
            maxPoints: state.maxPoints,

            mode: ModeTypes.CLASSROOM_HELPER,
            lang: getLang(ctx.session.__scenes)
        }
    };

    return ctx.scene.leave();
}

function getState(ctx: any) {
    return ctx.scene.state;
}
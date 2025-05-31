import { Markup, Scenes } from "telegraf";
import { ISceneContext } from "../../../types/ISceneContext";
import { ModeTypes } from "../../../types/ModeTypes";
import { translationsHandler } from "../../../../api/middleware/translationsHandler";
import { translationKeys } from "../../../translations/TranslationsKeys";
import { SceneSessionData } from "telegraf/typings/scenes";
import { exitButton, exitKeyboard, forceExit, format, getLang } from "../../../botService";

export interface ICreateTaskState {
    title?: string,
    description?: string,
    maxPoints?: number,
    dueDate?: string,
    dueTime?: string
}

const skipText = (scenes: SceneSessionData | undefined) => {
    const lang = getLang(scenes);
    return translationsHandler(translationKeys.SCENES_ENTER_TO_SKIP_TEXT, lang);
}

export const skipKeyboard = Markup.keyboard([
    ['-'],
    ...exitButton
])
    .resize()
    .oneTime();

export const maxPointKeyboard = Markup.keyboard([
    ['0', '5'],
    ['12', '100'],
    ...exitButton
])
    .resize()
    .oneTime();

export const dueDateKeyboard = Markup.keyboard([
    ...getButtonsForSelectDate(),
    ['-', '/exit']
]);

export const dueTimekeyboard = Markup.keyboard([
    ['00:00', '03:00', '06:00'],
    ['09:00', '12:00', '15:00'],
    ['18:00', '21:00', '23:59'],
    ['-', '/exit']
])
    .resize()
    .oneTime();

export const createTaskWizardScene = new Scenes.WizardScene<ISceneContext>('CREATE_TASK',
    async (ctx) => {
        const lang = getLang(ctx.session.__scenes);
        const question = translationsHandler(translationKeys.SCENES_ENTER_TITLE_TEXT, lang);

        await ctx.reply(question, exitKeyboard);
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const lang = getLang(ctx.session.__scenes);
        const state = getState(ctx);

        if (ctx.text === '/exit') {
            forceExit(ctx, ModeTypes.CLASSROOM_HELPER);
            return;
        }

        const title = state.title ? state.title : ctx.text as string;
        if (title.length < 1 || title.length > 3000) {

            await ctx.reply(translationsHandler(translationKeys.SCENES_TITLE_MUST_BE_BETWEEN_TEXT, lang), exitKeyboard);
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        state.title = title;
        await ctx.reply(translationsHandler(translationKeys.SCENES_ENTER_DESC_TEXT, lang), skipKeyboard);
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const lang = getLang(ctx.session.__scenes);
        const state = getState(ctx);

        if (ctx.text === '/exit') {
            forceExit(ctx, ModeTypes.CLASSROOM_HELPER);
            return;
        }

        const description = state.description ? state.description : ctx.text as string;
        if (description.length > 30000) {

            await ctx.reply(format(
                translationsHandler(translationKeys.SCENES_DESC_MUST_BE_GREATER_TEXT, lang), skipText(ctx.session.__scenes)),
                skipKeyboard);

            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        state.description = description;
        await ctx.reply(translationsHandler(translationKeys.SCENES_ENTER_MAX_SCORE_TEXT, lang), maxPointKeyboard);
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const lang = getLang(ctx.session.__scenes);
        const state = getState(ctx);

        if (ctx.text === '/exit') {
            forceExit(ctx, ModeTypes.CLASSROOM_HELPER);
            return;
        }

        const maxPoints = state.maxPoints ? state.maxPoints : Number.parseInt(ctx.text as string);
        if (Number.isNaN(maxPoints) || maxPoints > Number.MAX_SAFE_INTEGER || maxPoints < 0) {
            await ctx.reply(translationsHandler(translationKeys.SCENES_MAX_SCORE_MUST_BE_GREATER_TEXT, lang), maxPointKeyboard);

            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        state.maxPoints = maxPoints;
        await ctx.reply(translationsHandler(translationKeys.SCENES_ENTER_DUE_DATE_TEXT, lang), dueDateKeyboard);
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const lang = getLang(ctx.session.__scenes);
        const state = getState(ctx);

        if (ctx.text === '/exit') {
            forceExit(ctx, ModeTypes.CLASSROOM_HELPER);
            return;
        }

        const dueDate = state.dueDate ? state.dueDate : ctx.text as string;
        if (dueDate === '-') {
            await leaveFromScene(ctx);
            return;

        } else if (!dueDate.match(/^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.\d{4}$/)) {
            await ctx.reply(translationsHandler(translationKeys.SCENES_DATE_INCORRECT_FORMAT_TEXT, lang), dueDateKeyboard);
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);

        } else if (isPastDate(dueDate)) {
            await ctx.reply(translationsHandler(translationKeys.SCENES_DATE_CANNOT_BE_IN_PAST_TEXT, lang), dueDateKeyboard);
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        state.dueDate = dueDate;
        await ctx.reply(translationsHandler(translationKeys.SCENES_ENTER_DUE_TIME_TEXT, lang), dueTimekeyboard);
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const lang = getLang(ctx.session.__scenes);
        const state = getState(ctx);

        if (ctx.text === '/exit') {
            forceExit(ctx, ModeTypes.CLASSROOM_HELPER);
            return;
        }

        const dueTime = state.dueTime ? state.dueTime : ctx.text as string;
        if (dueTime === '-') {
            await leaveFromScene(ctx);
            return;

        } else if (!dueTime.match(/^(?:[01]\d|2[0-3]):[0-5]\d$/)) {

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

        state.dueTime = dueTime;
        await leaveFromScene(ctx);
    }
);

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

function getState(ctx: any): ICreateTaskState {
    return ctx.scene.state;
}

export function getButtonsForSelectDate() {
    const buttons: string[][] = [];
    let i = 0;

    for (let row = 0; row < 3; row++) {
        const rowButtons: string[] = [];
        for (let col = 0; col < 3; col++) {
            rowButtons.push(addDaysToCurrentDate(i));
            i++;
        }
        buttons.push(rowButtons);
    }
    return buttons;
}

function addDaysToCurrentDate(daysToAdd?: number) {
    const date = new Date();

    if (daysToAdd) {
        date.setDate(date.getDate() + daysToAdd);
    }

    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')

    return `${day}.${month}.${date.getFullYear()}`;
}

export function isPastDate(dateStr: string): boolean {
    const splitedDate = dateStr.split('.', 3);
    const inputedDate = new Date(Number.parseInt(splitedDate[2]), Number.parseInt(splitedDate[1]) - 1, Number.parseInt(splitedDate[0]));
    const now = new Date();

    inputedDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    if (inputedDate.getTime() === now.getTime()) return false;
    return inputedDate < new Date();
}

export function isPastDateAndTime(dateStr: string, timeStr: string): boolean {
    const splitedTime = timeStr.split(':', 2);
    const splitedDate = dateStr.split('.', 3);
    const inputedDateTime = new Date(Number.parseInt(splitedDate[2]), Number.parseInt(splitedDate[1]) - 1, Number.parseInt(splitedDate[0]),
        Number.parseInt(splitedTime[0]), Number.parseInt(splitedTime[1]));

    return inputedDateTime < new Date();
}
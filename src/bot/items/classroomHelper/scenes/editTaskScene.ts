import { Markup, Scenes } from "telegraf";
import { ISceneContext } from "../../../types/ISceneContext";
import { ModeTypes } from "../../../types/ModeTypes";
import { getFormattedDate, getFormattedTime } from "../classroomHelperService";
import { getButtonsForSelectDate, isPastDate, isPastDateAndTime } from "./createTaskScene";

const skipText = (prevValue?: string) => {
    let text = "enter the '-' symbol to skip";
    if (!prevValue) {
        return text;
    }

    return text + ` and keep the previous value: '${prevValue.toString()}'`;
}

const skipKeyboard = Markup.keyboard([
    ['-']
])
    .resize()
    .oneTime()

export const editTaskWizardScene = new Scenes.WizardScene<ISceneContext>('EDIT_TASK',
    async (ctx) => {
        const state = getState(ctx);
        const question = `Enter a new title (${skipText(state.task.title)}):`;
        await ctx.reply(question, skipKeyboard);

        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const state = getState(ctx);
        let title = state.title ? state.title : ctx.text as string;

        if (title === '-') {
            title = state.task.title;

        } else if (title.length < 1 || title.length > 3000) {
            await ctx.reply('Error: the title must be between 1 and 3000 characters, please try again');
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        state.title = title;
        await ctx.reply(`Enter a new description (optional, ${skipText(state.task?.description)})`, skipKeyboard);
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const state = getState(ctx);
        let description = state.description ? state.description : ctx.text as string;

        if (description === '-') {
            description = state.task?.description;

        } else if (description.length > 30000) {
            await ctx.reply(`Error: the description must be greater than 30000 or not present (${skipText()}), please try again`);
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        state.description = description;
        await ctx.reply(`Enter a new maximum score (${skipText(state.task?.maxPoints)}):`, skipKeyboard);
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const state = getState(ctx);
        let maxPointsStr = ctx.text as string;
        let maxPoints = state.maxPoints ? state.maxPoints : NaN;

        if (maxPointsStr === '-') {
            maxPoints = state.task?.maxPoints;
        }

        if (!maxPoints) {
            maxPoints = Number.parseInt(maxPointsStr);
            if (Number.isNaN(maxPoints) || maxPoints > Number.MAX_SAFE_INTEGER || maxPoints < 0) {
                await ctx.reply(`Error: the maximum score must be greater than or equal to 0 ` +
                    `(in which case the assignment will not be graded), please try again`);

                ctx.wizard.back();
                return ctx.wizard.steps[ctx.wizard.cursor](ctx);
            }
        }

        state.maxPoints = maxPoints;
        const formatedDate = getFormattedDate(state.task?.dueDate)
        await ctx.reply(`Enter a new due date (${skipText(formatedDate)}). Format: dd.mm.yyyy`, skipKeyboard);
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const state = getState(ctx);
        const dueDateStr = ctx.text as string;
        let dueDate = state.dueDate ? state.dueDate : undefined;

        if (dueDateStr === '-') {
            dueDate = state.task?.dueDate;
        }

        if (!dueDate) {
            if (!dueDateStr.match(/^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.\d{4}$/)) {
                await ctx.reply(`Error: the entered date doesn't match the required format, please try again`);
                ctx.wizard.back();
                return ctx.wizard.steps[ctx.wizard.cursor](ctx);

            } else if (isPastDate(dueDateStr)) {
                await ctx.reply(`Error: the entered date cannot be in the past, please try again`);
                ctx.wizard.back();
                return ctx.wizard.steps[ctx.wizard.cursor](ctx);
            }

            dueDate = dueDateStr;
        }

        state.dueDate = dueDate;
        const formatedTime = getFormattedTime(state.task?.dueTime);

        const buttons = getButtonsForSelectDate();
        const updatedButtons = addButtonInLastRow(buttons, '-');
        const keyboard = Markup.keyboard(updatedButtons);

        await ctx.reply(`Enter a due time (${skipText(formatedTime)}). Format: hh:mm`, keyboard);
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const state = getState(ctx);
        const dueTimeStr = ctx.text as string;
        let dueTime = state.dueTime ? state.dueTime : undefined;

        if (dueTimeStr === '-') {
            dueTime = state.task?.dueTime
        }

        if (!dueTime) {
            if (!dueTimeStr.match(/^(?:[01]\d|2[0-3]):[0-5]\d$/)) {
                await ctx.reply(`Error: the entered time doesn't match the required format, please try again (or ${skipText()})`, { reply_markup: skipKeyboard });
                ctx.wizard.back();
                return ctx.wizard.steps[ctx.wizard.cursor](ctx);

            } else if (isPastDateAndTime(state.dueDate as string, dueTime)) {
                await ctx.reply(`Error: the entered time cannot be in the past, please try again`);
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
            mode: ModeTypes.CLASSROOM_HELPER
        }
    };

    return ctx.scene.leave();
}

function getState(ctx: any) {
    return ctx.scene.state;
}

function addButtonInLastRow(buttons: string[][], button: string) {
    const lastRow = buttons.pop() as string[];
    lastRow?.pop();
    lastRow?.push(button);
    buttons.push(lastRow);
    return buttons;
}
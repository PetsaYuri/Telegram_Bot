import { Markup, Scenes } from "telegraf";
import { ISceneContext } from "../../../types/ISceneContext";
import { ModeTypes } from "../../../types/ModeTypes";

export interface ICreateTaskState {
    title?: string,
    description?: string,
    maxPoints?: number,
    dueDate?: string,
    dueTime?: string
}

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

export const createTaskWizardScene = new Scenes.WizardScene<ISceneContext>('CREATE_TASK',
    async (ctx) => {
        const question = 'Enter a title:';
        await ctx.reply(question);
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const state = getState(ctx);
        const title = state.title ? state.title : ctx.text as string;

        if (title.length < 1 || title.length > 3000) {
            await ctx.reply('Error: the title must be between 1 and 3000 characters, please try again');
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        state.title = title;
        await ctx.reply('Enter a description (optional)', skipKeyboard);
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const state = getState(ctx);
        const description = state.description ? state.description : ctx.text as string;

        if (description.length > 30000) {
            await ctx.reply(`Error: the description must be greater than 30000 or not present (${skipText()}), please try again`);
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        state.description = description;
        const keyboard = Markup.keyboard([
            ['0'],
            ['5'],
            ['12'],
            ['100']
        ])
            .resize()
            .oneTime()

        await ctx.reply(`Enter a maximum score (enter '0' if you want to leave the task ungraded).`, keyboard);
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const state = getState(ctx);
        const maxPoints = state.maxPoints ? state.maxPoints : Number.parseInt(ctx.text as string);

        if (Number.isNaN(maxPoints) || maxPoints > Number.MAX_SAFE_INTEGER || maxPoints < 0) {
            await ctx.reply(`Error: the maximum score must be greater than or equal to 0 ` +
                `(in which case the assignment will not be graded), please try again`);

            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        state.maxPoints = maxPoints;
        const keyboard = Markup.keyboard(getButtonsForSelectDate())
        await ctx.reply("Enter a due date (enter '-' if don't need to). Format: dd.mm.yyyy", keyboard);
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const state = getState(ctx);
        const dueDate = state.dueDate ? state.dueDate : ctx.text as string;

        if (dueDate === '-') {
            await leaveFromScene(ctx);
            return;

        } else if (!dueDate.match(/^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.\d{4}$/)) {
            await ctx.reply(`Error: the entered date doesn't match the required format, please try again`);
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);

        } else if (isPastDate(dueDate)) {
            await ctx.reply(`Error: the entered date cannot be in the past, please try again`);
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        state.dueDate = dueDate;
        const keyboard = Markup.keyboard([
            ['00:00', '03:00'],
            ['09:00', '12:00'],
            ['15:00', '18:00'],
            ['21:00', '23:59']
        ])
            .resize()
            .oneTime();

        await ctx.reply("Enter a due time (enter '-' if don't need to). Format: hh:mm", keyboard);
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const state = getState(ctx);
        const dueTime = state.dueTime ? state.dueTime : ctx.text as string;

        if (dueTime === '-') {
            await leaveFromScene(ctx);
            return;

        } else if (!dueTime.match(/^(?:[01]\d|2[0-3]):[0-5]\d$/)) {
            await ctx.reply(`Error: the entered time doesn't match the required format, please try again (or ${skipText()})`, { reply_markup: skipKeyboard });
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);

        } else if (isPastDateAndTime(state.dueDate as string, dueTime)) {
            await ctx.reply(`Error: the entered time cannot be in the past, please try again`);
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
            mode: ModeTypes.CLASSROOM_HELPER
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

    for (let row = 0; row < 4; row++) {
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
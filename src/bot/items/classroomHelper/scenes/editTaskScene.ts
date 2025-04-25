import { Markup, Scenes } from "telegraf";
import { ISceneContext } from "../../../types/ISceneContext";
import { ModeTypes } from "../../../types/ModeTypes";
import { getFormattedDate, getFormattedTime } from "../classroomHelperService";

const skipText = (prevValue: string | undefined) => {
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

    async (ctx) => {
        const state = getState(ctx);
        state.title = ctx.text as string;

        await ctx.reply(`Enter a new description (optional, ${skipText(state.task?.description)})`, skipKeyboard);
        return ctx.wizard.next();
    },

    async (ctx) => {
        const state = getState(ctx);
        state.description = ctx.text as string;

        await ctx.reply(`Enter a new maximum score (${skipText(state.task?.maxPoints)}):`, skipKeyboard);
        return ctx.wizard.next();
    },

    async (ctx) => {
        const state = getState(ctx);
        state.maxPoints = ctx.text as string;
        const formatedDate = getFormattedDate(state.task?.dueDate)

        await ctx.reply(`Enter a new due date (${skipText(formatedDate)}). Format: dd.mm.yyyy`, skipKeyboard);
        return ctx.wizard.next();
    },

    async (ctx) => {
        const state = getState(ctx);
        state.dueDate = ctx.text as string;

        if (state.dueDate === '-') {
            await leaveFromScene(ctx);
            return;
        }

        const formatedTime = getFormattedTime(state.task?.dueTime);
        await ctx.reply(`Enter a due time (${skipText(formatedTime)}). Format: hh:mm`, skipKeyboard);
        return ctx.wizard.next();
    },

    async (ctx) => {
        const state = getState(ctx);
        state.dueTime = ctx.text as string;

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

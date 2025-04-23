import { Scenes } from "telegraf";
import { ISceneContext } from "../../../types/ISceneContext";
import { ModeTypes } from "../../../types/ModeTypes";

interface ICreateTaskState {
    title: string,
    description: string,
    dueDate: string | undefined,
    dueTime: string | undefined,
    maxPoints: string | undefined
}

export const createTaskWizardScene = new Scenes.WizardScene<ISceneContext>('CREATE_TASK',
    async (ctx) => {
        const question = 'Enter a title:';
        await ctx.reply(question);

        return ctx.wizard.next();
    },

    async (ctx) => {
        const state = getState(ctx);
        state.title = ctx.text as string;

        await ctx.reply('Enter a description (optional)');
        return ctx.wizard.next();
    },

    async (ctx) => {
        const state = getState(ctx);
        state.description = ctx.text as string;

        await ctx.reply("Enter a maximum score (enter '-' if you don't want to change the default (100)).");
        return ctx.wizard.next();
    },

    async (ctx) => {
        const state = getState(ctx);
        state.maxPoints = ctx.text as string;

        await ctx.reply("Enter a due date (enter '-' if don't need to). Format: dd.mm.yyyy");
        return ctx.wizard.next();
    },

    async (ctx) => {
        const state = getState(ctx);
        state.dueDate = ctx.text as string;

        if (state.dueDate === '-') {
            await leaveFromScene(ctx);
            return;
        }

        await ctx.reply("Enter a due time (enter '-' if don't need to). Format: hh:mm");
        return ctx.wizard.next();
    },

    async (ctx) => {
        const state = getState(ctx);
        state.dueTime = ctx.text as string;

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
import { Scenes } from "telegraf";
import { ICreateTaskContext } from "../../../api/types/CustomContext";

let title: string;
let description: string;
let dueDate: string | undefined;
let dueTime: string | undefined;
let maxPoints: string | undefined;

export const createTaskWizardScene = new Scenes.WizardScene<ICreateTaskContext>('CREATE_TASK',
    async (ctx) => {
        const question = 'Enter a title:';
        await ctx.reply(question);
        return ctx.wizard.next();
    },

    async (ctx) => {
        title = ctx.text as string;
        await ctx.reply('Enter a description (optional)');
        return ctx.wizard.next();
    },

    async (ctx) => {
        description = ctx.text as string;
        await ctx.reply("Enter a maximum score (enter '-' if you don't want to change the default (100)).");
        return ctx.wizard.next();
    },

    async (ctx) => {
        maxPoints = ctx.text as string;
        await ctx.reply("Enter a due date (enter '-' if don't need to). Format: dd.mm.yyyy");
        return ctx.wizard.next();
    },

    async (ctx) => {
        dueDate = ctx.text as string;

        if (dueDate === '-') {
            await earlyLeave(ctx);
            return;
        }

        await ctx.reply("Enter a due time (enter '-' if don't need to). Format: hh:mm");
        return ctx.wizard.next();
    },

    async (ctx) => {
        dueTime = ctx.text as string;
        ctx.session.__scenes = { cursor: NaN, state: { title, description, dueDate, dueTime, maxPoints } };
        return ctx.scene.leave();
    }
);

async (ctx: any) => earlyLeave(ctx);

async function earlyLeave(ctx: any) {
    ctx.session.__scenes = { cursor: NaN, state: { title, description, dueDate, dueTime, maxPoints } };
    return ctx.scene.leave();
}
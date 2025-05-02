import { Markup, Scenes } from "telegraf";
import { ISceneContext } from "../../../types/ISceneContext";
import ms, { StringValue } from "ms";
import { convertMsToDateStr } from "../classroomHelperService";

export const createNotifScene = new Scenes.WizardScene<ISceneContext>('CREATE_NOTIF',
    async (ctx: any) => {
        const keyboard = Markup.keyboard([
            ['1d', '1h', '1m'],
            ['1d 1h', '1d 1h 1m', '6d']
        ])
        await ctx.reply('Enter a time (before which you want to receive the notification) in the next format: ' +
            `1d/1h/1m (before left: ${convertMsToDateStr(ctx.scene.state.differenceTime)})`, keyboard);
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const state = ctx.scene.state;
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
            await ctx.reply('Error: the time cannot be empty, please try again');
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);

        } else if (time <= 60000) {
            await ctx.reply('Error: the time cannot be less than one second, please try again');
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);

        } else if (time >= ctx.scene.state.differenceTime) {
            await ctx.reply('Error: the time cannot be more than the actual left, please try again');
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        state.time = time;
        ctx.session.__scenes = {
            cursor: NaN, state: {
                time: state.time,
            }
        };

        return ctx.scene.leave();
    }
)
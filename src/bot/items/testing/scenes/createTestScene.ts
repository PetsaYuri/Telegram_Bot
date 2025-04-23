import { Markup, Scenes } from "telegraf";
import { TestTypes } from "../enums/testTypes";
import { ISceneContext } from "../../../types/ISceneContext";
import { ModeTypes } from "../../../types/ModeTypes";

interface ICreateTestState {
    title: string,
    typeOfTest: string,
    documentId: string
}

export const createTestWizardScene = new Scenes.WizardScene<ISceneContext>('CREATE_TEST',
    async (ctx) => {
        const question = 'Enter a title:';
        await ctx.reply(question);

        return ctx.wizard.next();
    },

    async (ctx) => {
        const state = getState(ctx);
        state.title = ctx.text as string;
        const keyboardButtons = Object.values(TestTypes).map(type =>
            [Markup.button.text(type)]
        )

        await ctx.reply('Select the type of test:', Markup.keyboard(keyboardButtons)
            .resize()
            .oneTime()
        );

        return ctx.wizard.next();
    },

    async (ctx) => {
        const state = getState(ctx);
        state.typeOfTest = ctx.text as string;

        await ctx.reply('Attach document:');
        return ctx.wizard.next();
    },

    async (ctx) => {
        const state = getState(ctx);

        if (ctx.message && 'document' in ctx.message) {
            state.documentId = ctx.message.document.file_id;
        }

        ctx.session.__scenes = {
            cursor: NaN, state: {
                title: state.title,
                typeOfTest: state.typeOfTest,
                documentId: state.documentId,
                mode: ModeTypes.TESTING
            }
        };

        return ctx.scene.leave();
    }
)

function getState(ctx: any): ICreateTestState {
    return ctx.scene.state;
}
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
        await ctx.reply('Enter a title:');
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const state = getState(ctx);
        const title = ctx.text as string;

        if (!title || title.length < 250) {
            await ctx.reply('Error: title is required!');
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        state.title = title;
        const keyboardButtons = Object.values(TestTypes).map(type =>
            [Markup.button.text(type)]
        )

        await ctx.reply('Select the type of test:', Markup.keyboard(keyboardButtons)
            .resize()
            .oneTime()
        );

        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const state = getState(ctx);
        const typeOfTest = ctx.text as string;

        if (!typeOfTest || !(Object.values(TestTypes) as string[]).includes(typeOfTest)) {
            await ctx.reply('Error: incorrect test type');
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        state.typeOfTest = typeOfTest;
        await ctx.reply('Attach document:');
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const state = getState(ctx);
        let documentId;

        if (ctx.message && 'document' in ctx.message) {
            documentId = ctx.message.document.file_id;
        }

        if (!documentId) {
            await ctx.reply('Error: document is required!');
            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        state.documentId = documentId;

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
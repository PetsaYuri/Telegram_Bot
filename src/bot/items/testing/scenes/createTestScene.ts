import { Markup, Scenes } from "telegraf";
import { TestTypes } from "../enums/testTypes";
import { ISceneContext } from "../../../types/ISceneContext";

let title: string;
let typeOfTest: string;
let documentId: string;

export const createTestWizardScene = new Scenes.WizardScene<ISceneContext>('CREATE_TEST',
    async (ctx) => {
        const question = 'Enter a title:';
        await ctx.reply(question);
        return ctx.wizard.next();
    },

    async (ctx) => {
        title = ctx.text as string;
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
        typeOfTest = ctx.text as string;
        await ctx.reply('Attach document:');
        return ctx.wizard.next();
    },

    async (ctx) => {
        if (ctx.message && 'document' in ctx.message) {
            documentId = ctx.message.document.file_id;
        }

        ctx.session.__scenes = { cursor: NaN, state: { title, typeOfTest, documentId } };
        return ctx.scene.leave();
    }
)
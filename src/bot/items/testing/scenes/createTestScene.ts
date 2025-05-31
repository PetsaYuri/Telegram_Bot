import { Markup, Scenes } from "telegraf";
import { TestTypes } from "../enums/testTypes";
import { ISceneContext } from "../../../types/ISceneContext";
import { ModeTypes } from "../../../types/ModeTypes";
import { translationsHandler } from "../../../../api/middleware/translationsHandler";
import { translationKeys } from "../../../translations/TranslationsKeys";
import { exitButton, exitKeyboard, forceExit, getLang } from "../../../botService";

interface ICreateTestState {
    lang: string,
    title: string,
    typeOfTest: string,
    documentId: string
}

export const createTestWizardScene = new Scenes.WizardScene<ISceneContext>('CREATE_TEST',
    async (ctx) => {
        const lang = getLang(ctx.session.__scenes);
        await ctx.reply(translationsHandler(translationKeys.SCENES_ENTER_TITLE_TEXT, lang), exitKeyboard);
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const lang = getLang(ctx.session.__scenes);
        const state = getState(ctx);
        if (ctx.text === '/exit') {
            forceExit(ctx, ModeTypes.TESTING);
            return;
        }

        const title = state.title ? state.title : ctx.text as string;
        if (!title || title.length > 250) {
            await ctx.reply(translationsHandler(translationKeys.SCENES_ERROR_TEXT, lang) +
                translationsHandler(translationKeys.TESTING_TITLE_REQUIRED_TEXT, lang));

            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        state.title = title;
        const keyboardButtons = [
            ...Object.values(TestTypes).map(type => [Markup.button.text(type)]),
            ...exitButton
        ]

        await ctx.reply(translationsHandler(translationKeys.SCENES_SELECT_TEST_TYPE_TEXT, lang),
            Markup.keyboard(keyboardButtons)
                .resize()
                .oneTime()
        );

        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const lang = getLang(ctx.session.__scenes);
        const state = getState(ctx);
        if (ctx.text === '/exit') {
            forceExit(ctx, ModeTypes.TESTING);
            return;
        }

        const typeOfTest = state.typeOfTest ? state.typeOfTest : ctx.text as string;
        if (!typeOfTest || !(Object.values(TestTypes) as string[]).includes(typeOfTest)) {
            await ctx.reply(translationsHandler(translationKeys.SCENES_ERROR_TEXT, lang) +
                translationsHandler(translationKeys.TESTING_INCORRECT_TEST_TYPE_TEXT, lang));

            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        state.typeOfTest = typeOfTest;
        await ctx.reply(translationsHandler(translationKeys.SCENES_ATTACH_DOC_TEXT, lang), exitKeyboard);
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const lang = getLang(ctx.session.__scenes);
        const state = getState(ctx);
        if (ctx.text === '/exit') {
            forceExit(ctx, ModeTypes.TESTING);
            return;
        }

        let documentId;
        if (ctx.message && 'document' in ctx.message) {
            const extension = ctx.message.document.file_name.split('.').pop();

            if (extension !== 'docx') {
                await ctx.reply(translationsHandler(translationKeys.SCENES_ERROR_TEXT, lang) +
                    translationsHandler(translationKeys.SCENES_INCORRECT_FILE_EXTEN_TEXT, lang));

                ctx.wizard.back();
                return ctx.wizard.steps[ctx.wizard.cursor](ctx);
            }

            documentId = ctx.message.document.file_id;
        }

        if (!documentId) {
            await ctx.reply(translationsHandler(translationKeys.SCENES_ERROR_TEXT, lang) +
                translationsHandler(translationKeys.TESTING_DOCUMENT_REQUIRED_TEXT, lang));

            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        state.documentId = documentId;
        ctx.session.__scenes = {
            cursor: NaN,
            state: {
                title: state.title,
                typeOfTest: state.typeOfTest,
                documentId: state.documentId,
                mode: ModeTypes.TESTING,
                lang
            }
        };

        return ctx.scene.leave();
    }
)

function getState(ctx: any): ICreateTestState {
    return ctx.scene.state;
}
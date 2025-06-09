import { Markup, Scenes } from "telegraf";
import { ISceneContext } from "../../../types/ISceneContext";
import { TestTypes } from "../enums/testTypes";
import { getTest } from "../testingService";
import { ModeTypes } from "../../../types/ModeTypes";
import { SceneSessionData } from "telegraf/typings/scenes";
import { translationsHandler } from "../../../../api/middleware/translationsHandler";
import { translationKeys } from "../../../translations/TranslationsKeys";
import { getExitKeyboard, forceExit, getLang } from "../../../botService";

interface IPassTestState {
    testId: string,
    testType: TestTypes,
    questions: Map<string, string | string[]>,
    index: number,
    answers: Map<string, string>
}

export const passTestWizardScene = new Scenes.WizardScene<ISceneContext>('PASS_TEST',
    async (ctx) => {
        const lang = getLang(ctx.session.__scenes);
        const question = translationsHandler(translationKeys.SCENES_ENTER_NUM_OF_QUESTS_TEXT, lang);

        await ctx.reply(question, getExitKeyboard(lang));
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        const lang = getLang(ctx.session.__scenes);
        const state = getState(ctx);
        if (ctx.text === '/exit' || ctx.text === translationsHandler(translationKeys.SCENES_EXIT_COMMAND, lang)) {
            forceExit(ctx, ModeTypes.TESTING);
            return;
        }

        const numberOfQuest = Number.parseInt(ctx.text as string);
        if (Number.isNaN(numberOfQuest)) {

            await ctx.reply(translationsHandler(translationKeys.SCENES_ERROR_TEXT, lang) +
                translationsHandler(translationKeys.SCENES_MUST_ENTER_NUMBER_TEXT, lang));

            ctx.wizard.back();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }

        const chatId = ctx.chat?.id;
        const testId = state.testId;

        state.index = 0;
        state.answers = new Map<string, string>();
        state.questions = await getQuestionsToPass(chatId, ctx.session.__scenes, testId, numberOfQuest);
        state.testType = (await getTest(testId, chatId, ctx.session.__scenes)).type;

        await sendQuestion(ctx);
        return ctx.wizard.next();
    },

    async (ctx) => {
        const state = getState(ctx);
        let answers = state.answers;

        if (state.index > 0) {
            const prevQuestion = Array.from(state.questions.entries())[state.index - 1]
            const answer = ctx.text as string;
            answers.set(prevQuestion[0], answer);
        }

        if (state.index === state.questions.size) {
            ctx.session.__scenes = {
                cursor: NaN, state: {
                    answers,
                    mode: ModeTypes.TESTING,
                    lang: getLang(ctx.session.__scenes)
                }
            };
            return ctx.scene.leave();
        }

        await sendQuestion(ctx);
        const cursor = ctx.wizard.cursor;
        return ctx.wizard.selectStep(cursor);
    }
)

async function getQuestionsToPass(chatId: number | undefined, scenes: SceneSessionData | undefined, testId: string, numberOfQuest: number): Promise<Map<string, string | string[]>> {
    const lang = getLang(scenes);
    const test = await getTest(testId, chatId, scenes);

    const questions = new Map(Object.entries(test.questions));
    const testSize = questions.size;

    if (numberOfQuest > testSize) {
        throw new Error(translationsHandler(translationKeys.SCENES_ENTERED_NUM_BIGGER_TEXT, lang))
    }

    let mixedQuestions = new Map<string, string | string[]>();
    for (let i = 0; i < numberOfQuest; i++) {
        const randomNum = getRandomNumber(0, testSize);
        const question = Array.from(questions.entries())[randomNum]

        if (mixedQuestions.get(question[0])) {
            i--;
            continue;
        }

        mixedQuestions.set(question[0], question[1]);
    }

    return mixedQuestions;
}

function getRandomNumber(min: number, max: number) {
    return Math.floor(Math.random() * (max - min)) + min;
}

async function sendQuestion(ctx: any) {
    const state = getState(ctx);
    const content = Array.from(state.questions.entries())[state.index];

    if (state.testType === TestTypes.CLASSIC) {
        let buttons = [];
        const mixedAnswers = mixAnswers(content[1] as string[])

        for (let el of mixedAnswers) {
            buttons.push(el);
        }

        const keyboard = Markup.keyboard(buttons)
        await ctx.reply(`№${content[0]}`, keyboard);

    } else if (state.testType === TestTypes.EXAM) {
        await ctx.reply(`№${content[0]}. ${content[1]}`);

    }
    state.index++;
}

function getState(ctx: any): IPassTestState {
    return ctx.scene.state;
}

function mixAnswers(answers: string[]): string[] {
    let mixedAnswers = [];
    const length = answers.length

    for (let i = 0; i < length; i++) {
        let randomNum = getRandomNumber(0, answers.length);
        const answer = answers.splice(randomNum, 1)[0];
        mixedAnswers.push(answer);
    }

    return mixedAnswers;
}
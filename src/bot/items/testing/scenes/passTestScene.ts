import { Scenes } from "telegraf";
import Test from "../../../../api/models/tests";
import { ISceneContext } from "../../../types/ISceneContext";

export interface IPassTestState {
    testId: string,
    questions: Map<string, string>,
    index: number,
    answers: Map<string, string>
}

export const passTestWizardScene = new Scenes.WizardScene<ISceneContext>('PASS_TEST',
    async (ctx) => {
        const question = 'Enter the number of questions you wish to pass:';
        await ctx.reply(question);
        return ctx.wizard.next();
    },

    async (ctx) => {
        const state = getState(ctx);
        state.index = 0;
        state.answers = new Map<string, string>();
        const numberOfQuest = ctx.text as string;

        const chatId = ctx.chat?.id;
        const testId = state.testId;

        state.questions = await getQuestionToPass(chatId, testId, Number.parseInt(numberOfQuest));
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
            ctx.session.__scenes = { cursor: NaN, state: { answers } };
            return ctx.scene.leave();
        }

        await sendQuestion(ctx);
        const cursor = ctx.wizard.cursor;
        return ctx.wizard.selectStep(cursor);
    }
)

async function getQuestionToPass(chatId: number | undefined, testId: string, numberOfQuest: number): Promise<Map<string, string>> {
    const test = await Test.findOne({ chatId, _id: testId });

    if (!test) {
        throw new Error('We cannot find your test')
    }

    const testSize = test.questions.size;
    if (numberOfQuest > testSize) {
        throw new Error('The entered number of question is bigger then the questions size')
    }

    const questions = test.questions;
    let mixedQuestions = new Map<string, string>();

    for (let i = 0; i < numberOfQuest; i++) {
        const randomNum = getRandomNumber(0, testSize);
        const question = Array.from(questions.entries())[randomNum]
        mixedQuestions.set(question[0], question[1]);
    }

    return mixedQuestions;
}

function getRandomNumber(min: number, max: number) {
    return Math.floor(Math.random() * (max - min)) + min;
}

async function sendQuestion(ctx: any) {
    const state = getState(ctx);
    const question = Array.from(state.questions.entries())[state.index];

    await ctx.reply(`№${question[0]}. ${question[1]}`);
    state.index++;
}

function getState(ctx: any): IPassTestState {
    return ctx.scene.state;
}
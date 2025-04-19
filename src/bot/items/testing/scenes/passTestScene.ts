import { Markup, Scenes } from "telegraf";
import { ISceneContext } from "../../../types/ISceneContext";
import { TestTypes } from "../enums/testTypes";
import { getTest } from "../testingService";

export interface IPassTestState {
    testId: string,
    testType: TestTypes,
    questions: Map<string, string | string[]>,
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
        const numberOfQuest = Number.parseInt(ctx.text as string);

        const chatId = ctx.chat?.id;
        const testId = state.testId;

        state.questions = await getQuestionToPass(chatId, testId, numberOfQuest);
        state.testType = (await getTest(testId, chatId)).type;
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

async function getQuestionToPass(chatId: number | undefined, testId: string, numberOfQuest: number): Promise<Map<string, string | string[]>> {
    const test = await getTest(testId, chatId);
    const questions = new Map(Object.entries(test.questions));
    const testSize = questions.size;

    if (numberOfQuest > testSize) {
        throw new Error('The entered number of question is bigger then the questions size')
    }

    let mixedQuestions = new Map<string, string | string[]>();
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
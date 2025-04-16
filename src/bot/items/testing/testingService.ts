import { Markup, Scenes } from "telegraf"
import { IBotResponse } from "../../types/CustomBotResponse"
import { ICreateTestSession } from "./types/sessions/ICreateTestSession"
import mammoth from "mammoth"
import { bot } from "../../.."
import Test, { ITest } from "../../../api/models/tests"
import { TestTypes } from "./enums/testTypes"
import { IPassTestSession } from "./types/sessions/IPassTestSession"
import { aiChatService } from "../aiChat/aiChatService"
import { aiChatModels } from "../aiChat/enums/aiChatModels"
import fs from 'fs'

export const testingService = {
    getMenuResponse: async (chatId: number): Promise<IBotResponse> => {
        const keyboard = Markup.keyboard([
            ['Create a new test']
        ])
            .resize()
            .oneTime()

        const userTests = await getTests(chatId);
        if (userTests.length === 0) {
            return { text: "Look like you don't have any test yet. Would you want to create one?", keyboard };

        } else {
            userTests.map(async (test) => {
                const text = convertTestToText(test);
                const inlineKeyboard = Markup.inlineKeyboard([
                    [{ text: `Pass the '${test.title}' test`, callback_data: `pass test id=${test._id}` }],
                    [{ text: `Delete the '${test.title}' test`, callback_data: `delete test id=${test._id}` }]
                ]);

                await bot.telegram.sendMessage(chatId, text, inlineKeyboard);
            })

            return ({ text: 'choose the next action', keyboard })
        }
    },

    createTest: (ctx: Scenes.SceneContext): void => {
        getTestPropertiesFromUser(ctx).then(async res => {
            const title = res.state.title;
            const typeOfTest = res.state.typeOfTest;
            const documentId = res.state.documentId;

            if (!title) {
                throw new Error('Title is required!');
            }

            if (!typeOfTest || !(Object.values(TestTypes) as string[]).includes(typeOfTest)) {
                throw new Error('Incorrect test type');
            }

            if (!documentId) {
                throw new Error('Document is required!');
            }

            const chatId = ctx.chat?.id as number;
            const content = await getHtmlContentFromDocument(documentId);
            const questions = retrieveQuestionsFromHtmlContent(content);

            const createdTest = await saveQuestions(title, chatId, typeOfTest as TestTypes, questions);
            return await ctx.reply(`The '${createdTest.title}' test has been successfully created!`);
        })
    },

    passTest: (ctx: Scenes.SceneContext, testId: string): void => {
        getAnswersFromUser(ctx, testId).then(async res => {
            const answers = res.state.answers;
            const prompt = fs.readFileSync('./testing files/exam_prompt.txt', 'utf-8');

            answers.forEach(async (value, key) => {
                const question = prompt + `\n Question: ${value}`;
                const responseFromAi = await aiChatService.getAnswerFromPrompt(question, undefined, aiChatModels.GEMINI_2_0_FLASH);
                const answer = 'Question: №' + key + value + '\n' + '_____________________\n' + responseFromAi;
                await ctx.reply(convertToMarkdownV2(answer), {
                    parse_mode: "MarkdownV2"
                });
            })
        })
    },

    deleteTest: async (chatId: number | undefined, testId: string): Promise<void> => {
        const test = await Test.findById(testId);
        if (!test) {
            throw new Error(`The test with provided id (${testId}) wasn't found`)
        }

        await Test.deleteOne({ '_id': testId });
    }
}

async function getTests(chatId: number): Promise<ITest[]> {
    return await Test.find({ chatId });
}

function convertTestToText(test: ITest): string {
    return test.title + '\n' +
        `${test.type} type:\n` +
        `Questions:\n${Array.from(test.questions).map(([key, value]) => `№${key}. ${value}`).join('\n')}`;
}

function getTestPropertiesFromUser(ctx: any): Promise<ICreateTestSession> {
    return new Promise((resolve) => {
        ctx.scene.enter('CREATE_TEST');

        const checkState = setInterval(() => {
            if (!ctx.wizard?.cursor) {
                clearInterval(checkState);
                resolve(ctx.session.__scenes);
            }
        }, 500);
    })
}

async function getHtmlContentFromDocument(fileId: string): Promise<string> {
    const fileLink = await bot.telegram.getFileLink(fileId);
    const response = await fetch(fileLink.href);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return (await mammoth.convertToHtml({ buffer })).value;
}

function retrieveQuestionsFromHtmlContent(content: string): string[] {
    let questions = [];

    if (content.includes('<ol>') || content.includes('<ul>')) {
        const splitedContent = content.split(/<li>/).map(item => item.replace(/<\/li>|<\/ol>|<\/ul>/g, ''));

        for (let i = 1; i < splitedContent.length; i++) {
            questions.push(`${i}. ${splitedContent[i]}`);
        }

    } else if (content.includes('<p>')) {
        const splitedContent = content.split(/<p>/).map(item => item.replace(/<\/p>/, ''));

        for (let line of splitedContent) {
            questions.push(line);
        }

    } else {
        throw new Error('Invalid document format. Please upload a valid document.');
    }

    return questions;
}

async function saveQuestions(title: string, chatId: number, type: TestTypes, questions: string[]): Promise<ITest> {
    const test = new Test({
        title,
        chatId,
        type,
        questions: new Map<string, string>()
    });

    questions.forEach((question) => {
        if (question) {
            const splitedQuestion = question.split(/\./, 2);
            test.questions.set(splitedQuestion[0], splitedQuestion[1].trimStart());
        }
    });

    await test.save();
    return test;
}

function getAnswersFromUser(ctx: any, testId: string): Promise<IPassTestSession> {
    return new Promise((resolve) => {
        ctx.scene.enter('PASS_TEST', { testId });

        const checkState = setInterval(() => {
            if (!ctx.wizard?.cursor) {
                clearInterval(checkState);
                resolve(ctx.session.__scenes);
            }
        }, 500)
    })
}

function convertToMarkdownV2(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1')
        .replace(/\n/g, '\n');
}
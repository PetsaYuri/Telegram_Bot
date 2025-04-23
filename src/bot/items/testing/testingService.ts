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
import { IMistake } from "./types/IMistake"
import * as cheerio from "cheerio"

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
                let text;
                switch (test.type) {
                    case TestTypes.CLASSIC:
                        text = convertClassicTestToText(test);
                        break;

                    case TestTypes.EXAM:
                        text = convertExamTestToText(test);
                        break;

                    default:
                        throw new Error('Test type is undefined and cannot be processed');
                }

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
            let createdTest: ITest;

            switch (typeOfTest) {
                case 'exam':
                    const questions = retrieveExamQuestionsFromHtmlContent(content);
                    createdTest = await saveExamTest(title, chatId, typeOfTest as TestTypes, questions);
                    break;

                case 'classic':
                    const questionsAndAnswers = getClassicQuestionsAndAnswers(content);
                    const rightAnswers = getRightAnswers(questionsAndAnswers);
                    const clearQuestAndAnswers = clearContentFromStyles(questionsAndAnswers);
                    createdTest = await saveClassicTest(title, chatId, clearQuestAndAnswers, rightAnswers);
                    break;

                default:
                    throw new Error('Incorrect test type')
            }

            const keyboard = Markup.keyboard([
                ['back to tests']
            ])
                .resize()
                .oneTime()

            await ctx.reply(`The '${createdTest.title}' test has been successfully created!`, keyboard);
        })
    },

    passTest: (ctx: Scenes.SceneContext, testId: string): void => {
        getAnswersFromUser(ctx, testId).then(async res => {
            const chatId = ctx.chat?.id;
            const answers = res.state.answers;
            const test = await getTest(testId, chatId);

            const prompt = fs.readFileSync('./testing files/exam_prompt.txt', 'utf-8');
            let correctAnswersCounter = 0;
            const rightAnswers = new Map(Object.entries(test.rightAnswers));
            let mistakes: IMistake[] = []

            answers.forEach(async (value, key) => {
                switch (test.type) {
                    case TestTypes.CLASSIC:
                        const rightAnswer = rightAnswers.get(key);

                        if (rightAnswer === value || rightAnswer?.substring(3, rightAnswer.length) === value) {
                            correctAnswersCounter++;

                        } else if (rightAnswer) {
                            mistakes.push({ question: key, userAnswer: value, correctAnswer: rightAnswer })
                        }

                        break;

                    case TestTypes.EXAM:
                        const question = prompt + `\n Question: ${value}`;
                        const responseFromAi = await aiChatService.getAnswerFromPrompt(question, undefined, aiChatModels.GEMINI_2_0_FLASH);

                        const answer = 'Question: №' + key + value + '\n' + '_____________________\n' + responseFromAi;
                        await ctx.reply(convertToMarkdownV2(answer), {
                            parse_mode: "MarkdownV2"
                        });
                        break;
                }
            })

            if (test.type === TestTypes.CLASSIC) {
                const text = `You have ${correctAnswersCounter} correct answers\n` +
                    `Mistakes: ${mistakes
                        .map(mistake => "\n__________________________\n" +
                            `||Question: №${mistake.question}\n` +
                            `Your answer: ${mistake.userAnswer}\n` +
                            `The correct answer: ${mistake.correctAnswer}||`
                        )}`

                await ctx.reply(convertToMarkdownV2(text), {
                    parse_mode: "MarkdownV2"
                })
            }

            answers.clear();
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

function convertExamTestToText(test: ITest): string {
    return test.title + '\n' +
        `type: ${test.type}\n` +
        `Questions:\n${Object.entries(test.questions)
            .map(([key, value]) => `№${key}. ${value} `)
            .join('\n')}`;
}

function getTestPropertiesFromUser(ctx: any): Promise<ICreateTestSession> {
    return new Promise((resolve) => {
        ctx.session = {}
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

function retrieveExamQuestionsFromHtmlContent(content: string): string[] {
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

async function saveExamTest(title: string, chatId: number, type: TestTypes, questions: string[]): Promise<ITest> {
    const test = new Test({
        title,
        chatId,
        type,
        questions: new Map<string, string>()
    });

    questions.forEach((question) => {
        if (question) {
            const splitedQuestion = question.split(/\./, 2);
            test.questions[splitedQuestion[0]] = splitedQuestion[1].trimStart();
        }
    });

    await test.save();
    return test;
}

function getAnswersFromUser(ctx: any, testId: string): Promise<IPassTestSession> {
    return new Promise((resolve) => {
        ctx.session = {}
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
        .replace(/([_*[\]()~`>#+\-={}.!])/g, '\\$1')
        .replace(/\n/g, '\n');
}

function getClassicQuestionsAndAnswers(htmlContent: string): Map<string, string[]> {
    let items;

    if (htmlContent.includes('<ol>') || htmlContent.includes('<ul>')) {
        const contentInsideOlTag = htmlContent.split(/<ol>/)[1]
            .replaceAll(/<li>/g, '')
            .replaceAll(/<\/ol>/g, '');
        items = contentInsideOlTag.split(/<\/li>/);

    } else {
        items = htmlContent
            .replaceAll(/<p>/g, '')
            .split(/<\/p>/);
    }

    let questionsAndAnswers = new Map<string, Array<string>>();
    let question = '';
    let questionIndex = 1;

    let answers = new Array<string>;

    for (let i = 0; i < items.length - 1; i++) {
        if (items[i].includes('?')) {
            if (question !== '') {
                questionsAndAnswers.set(question, answers);
                answers = [];
            }

            const clearedQuestion = cheerio.load(items[i]).text();
            if (clearedQuestion.match(/^\d+\.\s*.*$/)) {
                question = clearedQuestion;

            } else {
                question = questionIndex + '. ' + clearedQuestion;
            }
            questionIndex++;

        } else {
            answers.push(items[i]
                .replace(/[a-z]+\)/, '')
                .replace(/>\s+/, '>')
                .trim()
            );
        }

        if (i === items.length - 2) {
            questionsAndAnswers.set(question, answers);
        }
    }

    return questionsAndAnswers;
}

function getRightAnswers(questionsAndAnswers: Map<string, string[]>): Map<string, string> {
    let rightAnswers = new Map<string, string>();

    questionsAndAnswers.forEach((value, key) => {
        let rightAnswer;
        for (let answer of value) {
            if (answer.includes('<strong>')) {
                const clearAnswer = answer
                    .replaceAll(/<strong>/g, '')
                    .replaceAll(/<\/strong>/g, '')
                rightAnswer = clearAnswer;
                break;
            }
        }

        if (!rightAnswer) {
            throw new Error(`You didn't send the right answer for the question: '${key}'`);
        }

        rightAnswers.set(key, rightAnswer);
    })

    return rightAnswers;
}

function clearContentFromStyles(questionsAndAnswers: Map<string, string[]>): Map<string, string[]> {
    let clearedContent = new Map<string, string[]>();

    questionsAndAnswers.forEach((value, key) => {
        let clearedAnswers = []
        for (let answer of value) {
            const clearedAnswer = cheerio.load(answer).text();
            clearedAnswers.push(clearedAnswer)
        }

        clearedContent.set(key, clearedAnswers);
    })

    return clearedContent;
}

async function saveClassicTest(title: string, chatId: number, questionsAndAnswers: Map<string, string[]>, rightAnswers: Map<string, string>): Promise<ITest> {
    const test = new Test({
        title,
        chatId,
        type: TestTypes.CLASSIC,
        questions: Object.fromEntries(questionsAndAnswers),
        rightAnswers: Object.fromEntries(rightAnswers)
    })

    await test.save();
    return test;
}

function convertClassicTestToText(test: ITest) {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    return test.title + '\n' +
        `type: ${test.type}\n` +
        `Questions:\n${Object.entries(test.questions).map(([key, value]) => {
            let answersIndex = 0;
            const line = Array(value).map(val => '' + val)[0];
            const values = line.split(/,(?!\s)/g);

            return `№${key} \n${values.map(val => {
                if (!val.substring(val.length - 1).match(/;./)) {
                    val = val + ';'
                }

                const text = ` ${alphabet[answersIndex]}) ${val}`;
                answersIndex++;
                return text;

            }).join('')
                } `

        }).join('\n')}`;
}

export async function getTest(testId: string, chatId: number | undefined) {
    const test = await Test.findOne({ '_id': testId, chatId })
    if (!test) {
        throw new Error(`The test with id '${testId}' not found or you don't have the access to this test`);
    }

    return test;
}
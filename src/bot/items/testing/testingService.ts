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
import { translationsHandler } from "../../../api/middleware/translationsHandler"
import { translationKeys } from "../../translations/TranslationsKeys"
import { format, getLang } from "../../botService"
import { SceneSessionData } from "telegraf/typings/scenes"

export const testingService = {
    getMenuResponse: async (chatId: number, scenes: SceneSessionData | undefined): Promise<IBotResponse> => {
        const lang = getLang(scenes);
        const keyboard = Markup.keyboard([
            [translationsHandler(translationKeys.TESTING_CREATE_NEW_TEST_TEXT, lang)]
        ])
            .resize()
            .oneTime()

        const userTests = await getTests(chatId);
        if (userTests.length === 0) {
            return { text: translationsHandler(translationKeys.TESTING_DONT_HAVE_TESTS_TEXT, lang), keyboard };

        } else {
            userTests.map(async (test) => {
                let text;
                switch (test.type) {
                    case TestTypes.CLASSIC:
                        text = convertClassicTestToText(scenes, test);
                        break;

                    case TestTypes.EXAM:
                        text = convertExamTestToText(scenes, test);
                        break;

                    default:
                        throw new Error(translationsHandler(translationKeys.TESTING_UNDEF_TEST_TYPE_TEXT, lang));
                }

                const inlineKeyboard = Markup.inlineKeyboard([
                    [{
                        text: format(translationsHandler(translationKeys.TESTING_PASS_TEST_TEXT, lang), test.title),
                        callback_data: `pass test id=${test._id}`
                    }],

                    [{
                        text: format(translationsHandler(translationKeys.TESTING_DELETE_TEST_TEXT, lang), test.title),
                        callback_data: `delete test id=${test._id}`
                    }]
                ]);

                await bot.telegram.sendMessage(chatId, text, inlineKeyboard);
            })

            return ({ text: translationsHandler(translationKeys.GENERAL_CHOOSE_NEXT_ACTION_TEXT, lang), keyboard })
        }
    },

    createTest: (ctx: Scenes.SceneContext): void => {
        getTestPropertiesFromUser(ctx).then(async res => {
            const chatId = ctx.chat?.id as number;
            const lang = getLang(ctx.session.__scenes);

            if (res.state.isForcedExit) {
                const res = await testingService.getMenuResponse(chatId, ctx.session.__scenes);
                await ctx.reply(res.text, res.keyboard);
                return;
            }

            const title = res.state.title;
            const typeOfTest = res.state.typeOfTest;
            const documentId = res.state.documentId;

            if (!title) {
                throw new Error(translationsHandler(translationKeys.TESTING_TITLE_REQUIRED_TEXT, lang));
            }

            if (!typeOfTest || !(Object.values(TestTypes) as string[]).includes(typeOfTest)) {
                throw new Error(translationsHandler(translationKeys.TESTING_INCORRECT_TEST_TYPE_TEXT, lang));
            }

            if (!documentId) {
                throw new Error(translationsHandler(translationKeys.TESTING_DOCUMENT_REQUIRED_TEXT, lang));
            }

            const content = await getHtmlContentFromDocument(documentId);
            let createdTest: ITest;

            switch (typeOfTest) {
                case 'exam':
                    const questions = retrieveExamQuestionsFromHtmlContent(ctx.session.__scenes, content);
                    createdTest = await saveExamTest(title, chatId, typeOfTest as TestTypes, questions);
                    break;

                case 'classic':
                    const questionsAndAnswers = getClassicQuestionsAndAnswers(content);
                    const rightAnswers = getRightAnswers(ctx.session.__scenes, questionsAndAnswers);
                    const clearQuestAndAnswers = clearContentFromStyles(questionsAndAnswers);
                    createdTest = await saveClassicTest(title, chatId, clearQuestAndAnswers, rightAnswers);
                    break;

                default:
                    throw new Error(translationsHandler(translationKeys.TESTING_INCORRECT_TEST_TYPE_TEXT, lang))
            }

            const keyboard = Markup.keyboard([
                [translationsHandler(translationKeys.TESTING_BACK_TO_TESTS_TEXT, lang)]
            ])
                .resize()
                .oneTime()

            await ctx.reply(format(translationsHandler(translationKeys.TESTING_SUCCESS_CREATED_TEXT, lang), createdTest.title), keyboard);
        })
    },

    passTest: (ctx: Scenes.SceneContext, testId: string): void => {
        getAnswersFromUser(ctx, testId).then(async res => {
            const chatId = ctx.chat?.id;
            const lang = getLang(ctx.session.__scenes);

            if (res.state.isForcedExit) {
                const res = await testingService.getMenuResponse(chatId as number, ctx.session.__scenes);
                await ctx.reply(res.text, res.keyboard);
                return;
            }

            const answers = res.state.answers;
            const test = await getTest(testId, chatId, ctx.session.__scenes);

            const prompt = fs.readFileSync('./exam_prompt.txt', 'utf-8');
            let correctAnswersCounter = 0;
            let mistakes: IMistake[] = []

            answers.forEach(async (value, key) => {
                switch (test.type) {

                    case TestTypes.CLASSIC:
                        const rightAnswers = new Map(Object.entries(test.rightAnswers));
                        const rightAnswer = rightAnswers.get(key);

                        if (rightAnswer === value || rightAnswer?.substring(3, rightAnswer.length) === value) {
                            correctAnswersCounter++;

                        } else if (rightAnswer) {
                            mistakes.push({ question: key, userAnswer: value, correctAnswer: rightAnswer })
                        }

                        break;

                    case TestTypes.EXAM:
                        const question = prompt + `\n ` + translationsHandler(translationKeys.TESTING_QUESTION_TEXT, lang)
                            + `: ${test.questions[key]}\n` + 'Відповідь: ' + value;
                        const responseFromAi = await aiChatService.getAnswerFromPrompt(question, undefined, aiChatModels.GEMINI_2_0_FLASH);

                        const answer = translationsHandler(translationKeys.TESTING_QUESTION_TEXT, lang) + ': №' + key + '. '
                            + test.questions[key] + '\n' + '\n Відповідь від ШІ: \n' + responseFromAi;

                        await ctx.reply(convertAiAnswer(answer), {
                            parse_mode: "MarkdownV2"
                        });
                        break;
                }
            })

            if (test.type === TestTypes.CLASSIC) {
                const text = format(translationsHandler(translationKeys.TESTING_CORRECT_ANSWERS_TEXT, lang), correctAnswersCounter) + '\n' +
                    translationsHandler(translationKeys.TESTING_MISTAKES_TEXT, lang) + `: ${mistakes
                        .map(mistake => "\n__________________________\n" +
                            '||' + translationsHandler(translationKeys.TESTING_QUESTION_TEXT, lang) + `: №${mistake.question}\n` +
                            translationsHandler(translationKeys.TESTING_YOUR_ANSWER_TEXT, lang) + `: ${mistake.userAnswer}\n` +
                            translationsHandler(translationKeys.TESTING_CORRECT_ANSWER_TEXT, lang) + `: ${mistake.correctAnswer}||`
                        )}`

                await ctx.reply(convertToMarkdownV2(text), {
                    parse_mode: "MarkdownV2",
                    reply_markup: getBackToTestsKeyboard(ctx.session.__scenes).reply_markup
                })
            }

            answers.clear();
        })
    },

    deleteTest: async (chatId: number | undefined, scenes: SceneSessionData | undefined, testId: string): Promise<void> => {
        const lang = getLang(scenes);
        const test = await Test.findOne({ chatId, _id: testId });

        if (!test) {
            throw new Error(translationsHandler(translationKeys.TESTING_TEST_WASNT_FOUND_TEXT, lang))
        }

        await Test.deleteOne({ '_id': testId });
    }
}

async function getTests(chatId: number): Promise<ITest[]> {
    return await Test.find({ chatId });
}

function convertExamTestToText(scenes: SceneSessionData | undefined, test: ITest): string {
    const lang = getLang(scenes);

    return test.title + '\n' +
        translationsHandler(translationKeys.TESTING_TYPE_TEXT, lang) + `: ${test.type}\n` +
        translationsHandler(translationKeys.TESTING_QUESTIONS_TEXT, lang) + `:\n${Object.entries(test.questions)
            .map(([key, value]) => `№${key}. ${value} `)
            .join('\n')}`;
}

function getTestPropertiesFromUser(ctx: any): Promise<ICreateTestSession> {
    return new Promise((resolve) => {
        const lang = getLang(ctx.session.__scenes);
        ctx.session = {};
        ctx.scene.enter('CREATE_TEST', { lang });

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

function retrieveExamQuestionsFromHtmlContent(scenes: SceneSessionData | undefined, content: string): string[] {
    const lang = getLang(scenes);
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
        throw new Error(translationsHandler(translationKeys.TESTING_INVALID_DOC_FORMAT_TEXT, lang));
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
            (test.questions as unknown as Map<string, string>).set(splitedQuestion[0], splitedQuestion[1].trimStart())
        }
    });

    await test.save();
    return test;
}

function getAnswersFromUser(ctx: any, testId: string): Promise<IPassTestSession> {
    return new Promise((resolve) => {
        const lang = getLang(ctx.session.__scenes);
        ctx.session = {}
        ctx.scene.enter('PASS_TEST', { testId, lang });

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

function convertAiAnswer(answer: string): string {
    return answer
        .replace(/\\/g, '\\\\')
        .replace(/([*[\]()~`>#+=|{}.!-])/g, (match, offset, str) => {
            const prev = str[offset - 1];
            const next = str[offset + 1];

            if (match === '*' && prev === '*' && next !== '*') return '*';
            if (match === '|') return '|';
            return '\\' + match;
        })
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

function getRightAnswers(scenes: SceneSessionData | undefined, questionsAndAnswers: Map<string, string[]>): Map<string, string> {
    const lang = getLang(scenes);
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
            throw new Error(translationsHandler(translationKeys.TESTING_UNDEF_RIGHT_ANSWER_TEXT, lang) + `: '${key}'`);
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

function convertClassicTestToText(scenes: SceneSessionData | undefined, test: ITest) {
    const lang = getLang(scenes);
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');

    return test.title + '\n' +
        translationsHandler(translationKeys.TESTING_TYPE_TEXT, lang) + `: ${test.type}\n` +
        translationsHandler(translationKeys.TESTING_QUESTIONS_TEXT, lang) +
        `:\n${Object.entries(test.questions).map(([key, value]) => {

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

export async function getTest(testId: string, chatId: number | undefined, scenes: SceneSessionData | undefined) {
    const lang = getLang(scenes);
    const test = await Test.findOne({ '_id': testId, chatId })

    if (!test) {
        throw new Error(translationsHandler(translationKeys.TESTING_DONT_HAVE_ACCESS_TEXT, lang));
    }

    return test;
}

function getBackToTestsKeyboard(scenes: SceneSessionData | undefined) {
    const lang = getLang(scenes);
    return Markup.keyboard([
        [translationsHandler(translationKeys.TESTING_BACK_TO_TESTS_TEXT, lang)]
    ])
        .oneTime()
        .resize();
}

function sanitizeForMarkdownV2(text: string): string {
    return text
        .replace(/\*\*/g, '')
        .replace(/\|\|/g, '')
        .replace(/\\/g, '\\\\')
        .replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1')
        .replace(/\//g, '\\/')
        .replace(/\n/g, '\n');
}
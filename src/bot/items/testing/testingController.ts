import { Scenes } from "telegraf";
import { testingService } from "./testingService";
import { translationsHandler } from "../../../api/middleware/translationsHandler";
import { getLang } from "../../botService";
import { translationKeys } from "../../types/translations/TranslationsKeys";

export const testingController = async (ctx: any) => {
    const text = ctx.text;
    const lang = getLang(ctx.session.__scenes);

    switch (text) {

        case '/testing':
        case translationsHandler(translationKeys.GENERAL_TESTING_TEXT, lang):
        case translationsHandler(translationKeys.GENERAL_TESTING_COMMAND, lang):
        case translationsHandler(translationKeys.TESTING_BACK_TO_TESTS_TEXT, lang):

            const chatId = ctx.chat?.id as number;
            const res = await testingService.getMenuResponse(chatId, ctx.session.__scenes);
            await ctx.reply(res.text, res.keyboard);
            break;

        case translationsHandler(translationKeys.TESTING_CREATE_NEW_TEST_TEXT, lang):
            testingService.createTest(ctx);
            break;

        default:
            if (!ctx?.callbackQuery) {
                return await ctx.reply(translationsHandler(translationKeys.GENERAL_UNKNOWN_COMMAND_TEXT, lang));
            }

            const callbackData = ctx?.callbackQuery.data;
            const passTestMatch = callbackData.match('^pass test id=([a-f\\d]{24})$');
            const deleteTestMatch = callbackData.match('^delete test id=([a-f\\d]{24})$');

            if (passTestMatch) {
                await processingPassTestMessage(ctx, passTestMatch);

            } else if (deleteTestMatch) {
                await processingDeleteTestMessage(ctx, deleteTestMatch);
            }
    }
}

async function processingPassTestMessage(ctx: Scenes.SceneContext, match: RegExpMatchArray) {
    await ctx.answerCbQuery();
    const testId = match[1];
    testingService.passTest(ctx, testId);
}

async function processingDeleteTestMessage(ctx: Scenes.SceneContext, match: RegExpMatchArray) {
    await ctx.answerCbQuery();
    const testId = match[1];
    const chatId = ctx.chat?.id as number;
    await testingService.deleteTest(chatId, ctx.session.__scenes, testId);

    const res = await testingService.getMenuResponse(chatId, ctx.session.__scenes);
    await ctx.reply(res.text, res.keyboard);
}
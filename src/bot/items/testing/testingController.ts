import { Scenes } from "telegraf";
import { testingService } from "./testingService";

export const testingController = async (ctx: any) => {
    const text = ctx.text;

    switch (text) {
        case 'Testing':
            const chatId = ctx.chat?.id as number;
            const res = await testingService.getMenuResponse(chatId);
            await ctx.reply(res.text, res.keyboard);
            break;

        case 'Create a new test':
            testingService.createTest(ctx);
            break;

        default:

            const callbackData = ctx?.callbackQuery.data;
            if (!callbackData && !text) {
                return await ctx.reply("Text is undefined. Please try again.");
            }

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
    await testingService.deleteTest(chatId, testId);

    const res = await testingService.getMenuResponse(chatId);
    await ctx.reply(res.text, res.keyboard);
}
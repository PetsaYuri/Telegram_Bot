import { Context, Scenes } from 'telegraf';
import { classroomService } from './classroomService';
import { ICourseInfo } from './types/CustomCourseInfo';
import { classroomHelperService } from './classroomHelperService'
import { IBotResponse } from '../../types/CustomBotResponse';
import { CourseActions } from './enums/CourseActions';
import { format, getLang } from '../../botService';
import { translationsHandler } from '../../../api/middleware/translationsHandler';
import { translationKeys } from '../../types/translations/TranslationsKeys';

export const classroomHelperController = async (ctx: any) => {
    const text = ctx.text;
    const lang = getLang(ctx.session.__scenes);

    switch (text) {

        case '/classroom_helper':
        case translationsHandler(translationKeys.GENERAL_CLASSROOM_HELPER_TEXT, lang):
        case translationsHandler(translationKeys.GENERAL_CLASSROOM_HELPER_COMMAND, lang):
            await processingClassroomHelperMessage(ctx);
            break;

        case translationsHandler(translationKeys.CLASSROOM_HELPER_AUTHORISATION_TEXT, lang):
            await processingAuthorisationMessage(ctx);
            break;

        case translationsHandler(translationKeys.CLASSROOM_HELPER_MANAGE_COURSES_TEXT, lang):
            await processingManageOwnCoursesMessage(ctx);
            break;

        case translationsHandler(translationKeys.CLASSROOM_HELPER_VIEW_COURSES_TEXT, lang):
            await processingViewAllAvailCoursesMessage(ctx);
            break;

        case translationsHandler(translationKeys.CLASSROOM_HELPER_BACK_TO_COURSES_TEXT, lang):
            await processingBackToCoursesMessage(ctx);
            break;

        default:
            const manageCourseMatch = text?.match(translationsHandler(translationKeys.CLASSROOM_HELPER_MANAGE_COURSE_REGEX, lang));
            const viewCourseMatch = text?.match(translationsHandler(translationKeys.CLASSROOM_HELPER_VIEW_COURSE_REGEX, lang))
            const allMatFromCourseMatch = text?.match(translationsHandler(translationKeys.CLASSROOM_HELPER_REVIEW_MATERIALS_REGEX, lang));
            const createTaskMatch = text?.match(translationsHandler(translationKeys.CLASSROOM_HELPER_CREATE_TASK_REGEX, lang));

            if (manageCourseMatch) {
                return await processingManageCourseMessage(ctx, manageCourseMatch);
            }

            else if (viewCourseMatch) {
                return await processingViewCourseMessage(ctx, viewCourseMatch);
            }

            else if (allMatFromCourseMatch) {
                return await processingAllMatFromCourseMessage(ctx, allMatFromCourseMatch);
            }

            else if (createTaskMatch) {
                return await processingCreateTaskMessage(ctx, createTaskMatch);
            }

            const callbackData = ctx?.callbackQuery?.data;
            if (!callbackData && !text) {
                return await ctx.reply(translationsHandler(translationKeys.GENERAL_UNKNOWN_COMMAND_TEXT, lang));
            }

            const editMaterialMatch = callbackData?.match('^edit materialId=(\\d{12}), courseId=(\\d{12})$');
            const deleteMaterialMatch = callbackData.match('^delete materialId=(\\d{12}), courseId=(\\d{12})$');
            const setNotificationMatch = callbackData.match('^set notification material=(\\d{12}) course=(\\d{12})$');

            if (editMaterialMatch) {
                await processingEditMaterialMessage(ctx, editMaterialMatch);
            }

            else if (deleteMaterialMatch) {
                await processingDeleteMaterialMessage(ctx, deleteMaterialMatch);
            }

            else if (setNotificationMatch) {
                await processingSetNotificationMessage(ctx, setNotificationMatch);
            }

            else {
                await ctx.reply(translationsHandler(translationKeys.GENERAL_UNKNOWN_COMMAND_TEXT, lang));
            }
    }
}

async function processingClassroomHelperMessage(ctx: any) {
    const chatId = ctx.chat?.id as number;
    const res = await classroomHelperService.getMenuResponse(chatId, ctx.session.__scenes);
    await ctx.reply(res.text, res.keyboard);
}

async function processingAuthorisationMessage(ctx: Scenes.SceneContext) {
    const chatId = ctx.chat?.id as number;
    const res = classroomHelperService.getAuthorisationResponse(chatId, ctx.session.__scenes);
    await ctx.reply(res.text, res.keyboard);
}

async function processingManageOwnCoursesMessage(ctx: Scenes.SceneContext) {
    const chatId = ctx.chat?.id as number;
    const res = await classroomHelperService.getCourseResponse(chatId, ctx.session.__scenes, CourseActions.MANAGE);
    await ctx.reply(res.text, res.keyboard);
}

async function processingViewAllAvailCoursesMessage(ctx: Scenes.SceneContext) {
    const chatId = ctx?.chat?.id;
    const res = await classroomHelperService.getCourseResponse(chatId, ctx.session.__scenes, CourseActions.VIEW);
    await ctx.reply(res.text, res.keyboard);
}

async function processingManageCourseMessage(ctx: any, match: RegExpMatchArray) {
    const chatId = ctx?.chat?.id;
    const courseName = match[1];

    const res = await classroomHelperService.getMaterialsFromCourse(chatId, ctx.session.__scenes, courseName, CourseActions.MANAGE);
    sendMaterials(res, ctx);

    const botRes = classroomHelperService.getCreateTaskResponse(ctx.session.__scenes, courseName);
    await ctx.reply(botRes.text, botRes.keyboard);
}

async function processingViewCourseMessage(ctx: any, match: RegExpMatchArray) {
    const chatId = ctx.chat.id;
    const courseName = match[1];

    const res = await classroomHelperService.getMaterialsFromCourse(chatId, ctx.session.__scenes, courseName, CourseActions.VIEW);
    sendMaterials(res, ctx);
}

async function processingAllMatFromCourseMessage(ctx: any, match: RegExpMatchArray) {
    const chatId = ctx.chat.id;
    const lang = getLang(ctx.session.__scenes);

    const title = match[1];
    const arrayCourses = await classroomService.getAllAvailableCourses(chatId, ctx.session.__scenes);

    if (arrayCourses.map(course => course.name).includes(title)) {
        const course = arrayCourses.find(course => course.name === title) as ICourseInfo;
        const res = await classroomHelperService.getAllMaterialsResponse(chatId, ctx.session.__scenes, course, false) as IBotResponse[];

        res.map(
            async ({ text, keyboard }) => await ctx.reply(text, keyboard)
        );

    } else {
        throw new Error(format(translationsHandler(translationKeys.CLASSROOM_HELPER_DONT_HAVE_COURSE_TEXT, lang), title))
    }
}

async function processingBackToCoursesMessage(ctx: Scenes.SceneContext) {
    const chatId = ctx?.chat?.id;
    const res = await classroomHelperService.getCourseResponse(chatId, ctx.session.__scenes, CourseActions.VIEW);
    await ctx.reply(res.text, res.keyboard);
}

async function processingEditMaterialMessage(ctx: any, match: RegExpMatchArray) {
    await ctx.answerCbQuery();
    const materialId = match[1];
    const courseId = match[2];

    await classroomHelperService.editTask(ctx, courseId, materialId);
}

async function processingDeleteMaterialMessage(ctx: any, match: RegExpMatchArray) {
    const chatId = ctx.chat?.id;
    await ctx.answerCbQuery();

    const materialId = match[1];
    const courseId = match[2];

    const res = await classroomHelperService.deleteMaterial(chatId, ctx.session.__scenes, courseId, materialId);
    await ctx.reply(res.text);
}

async function processingSetNotificationMessage(ctx: any, match: RegExpMatchArray) {
    await ctx.answerCbQuery();
    const materialId = match[1];
    const courseId = match[2];

    await classroomHelperService.setNotification(ctx, materialId, courseId);
}

async function processingCreateTaskMessage(ctx: any, match: RegExpMatchArray) {
    const courseName = match[1];
    classroomHelperService.createTask(ctx, courseName);
}

async function sendMaterials(botResponse: IBotResponse | IBotResponse[], ctx: Context) {
    if (Array.isArray(botResponse)) {
        botResponse.map(
            async ({ text, keyboard }) => await ctx.reply(text, keyboard)
        );

    } else {
        await ctx.reply(botResponse.text, botResponse.keyboard);
    }
}
import { Context, Scenes } from 'telegraf';
import { classroomHelperService } from './classroomHelperService'
import { IBotResponse } from '../../types/CustomBotResponse';
import { CourseActions } from './enums/CourseActions';
import { getLang } from '../../botService';
import { translationsHandler } from '../../../api/middleware/translationsHandler';
import { translationKeys } from '../../translations/TranslationsKeys';
import { removeUserInfo } from '../../../api/services/userService';

export const classroomHelperController = async (ctx: any) => {
    const text = ctx.text;
    const lang = getLang(ctx.session.__scenes);

    switch (text) {

        case '/classroom_helper':
        case translationsHandler(translationKeys.GENERAL_CLASSROOM_HELPER_TEXT, lang):
        case translationsHandler(translationKeys.GENERAL_CLASSROOM_HELPER_COMMAND, lang):
        case translationsHandler(translationKeys.CLASSROOM_HELPER_RETURN_TO_HELPER_MENU_TEXT, lang):
            await processingClassroomHelperMessage(ctx);
            break;

        case translationsHandler(translationKeys.CLASSROOM_HELPER_MANAGE_COURSES_TEXT, lang):
        case translationsHandler(translationKeys.CLASSROOM_HELPER_RETURN_TO_CHOOSING_OWN_COURSE_TEXT, lang):
            await processingManageOwnCoursesMessage(ctx);
            break;

        case translationsHandler(translationKeys.CLASSROOM_HELPER_VIEW_COURSES_TEXT, lang):
        case translationsHandler(translationKeys.CLASSROOM_HELPER_RETURN_TO_CHOOSING_AVAIL_COURSE_TEXT, lang):
            await processingViewAllAvailCoursesMessage(ctx);
            break;

        case translationsHandler(translationKeys.CLASSROOM_HELPER_BACK_TO_COURSES_TEXT, lang):
            await processingBackToCoursesMessage(ctx);
            break;

        case translationsHandler(translationKeys.CLASSROOM_HELPER_SHOW_TASK_CALENDAR_TEXT, lang):
            await processingClassCalendarMessage(ctx);
            break;

        case translationsHandler(translationKeys.CLASSROOM_HELPER_LOG_OUT_TEXT, lang):
            await processingLogOutMessage(ctx);
            break;

        default:
            const manageCourseMatch = text?.match(translationsHandler(translationKeys.CLASSROOM_HELPER_MANAGE_COURSE_REGEX, lang));
            const viewCourseMatch = text?.match(translationsHandler(translationKeys.CLASSROOM_HELPER_VIEW_COURSE_REGEX, lang))
            const allMatFromCourseMatch = text?.match(translationsHandler(translationKeys.CLASSROOM_HELPER_REVIEW_MATERIALS_REGEX, lang));
            const createTaskMatch = text?.match(translationsHandler(translationKeys.CLASSROOM_HELPER_CREATE_TASK_REGEX, lang));
            const taskCalendarForCourseMatch = text?.match(translationsHandler(translationKeys.CLASSROOM_HELPER_SHOW_TASK_CALENDAR_FOR_COURSE_REGEX, lang));

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

            else if (taskCalendarForCourseMatch) {
                return await processingTaskCalendarForCourseMessage(ctx, taskCalendarForCourseMatch);
            }

            if (!ctx?.callbackQuery) {
                return await ctx.reply(translationsHandler(translationKeys.GENERAL_UNKNOWN_COMMAND_TEXT, lang));
            }

            const callbackData = ctx?.callbackQuery?.data;

            const editMaterialMatch = callbackData?.match('^edit materialId=(\\d{12}), courseId=(\\d{12})$');
            const deleteMaterialMatch = callbackData?.match('^delete materialId=(\\d{12}), courseId=(\\d{12})$');
            const setNotificationMatch = callbackData?.match('^set notification material=(\\d{12}) course=(\\d{12})$');
            const classCalendarUpcomingMatch = callbackData?.match('^class_calendar_upcoming (\\d{1,2}\\.\\d{1,2}\\.\\d{4})$');
            const classCalendarUpcomingForCourseMatch = callbackData?.match('^class_calendar_upcoming (\\d{1,2}\\.\\d{1,2}\\.\\d{4}), courseId=(\\d{12})$');
            const openMaterialsMatch = callbackData?.match('^open_materials courseId=(\\d{12}) materialId=(\\d{12})$');

            if (editMaterialMatch) {
                await processingEditMaterialMessage(ctx, editMaterialMatch);
            }

            else if (deleteMaterialMatch) {
                await processingDeleteMaterialMessage(ctx, deleteMaterialMatch);
            }

            else if (setNotificationMatch) {
                await processingSetNotificationMessage(ctx, setNotificationMatch);
            }

            else if (classCalendarUpcomingMatch) {
                await processingClassCalendarUpcomingMessage(ctx, classCalendarUpcomingMatch);
            }

            else if (classCalendarUpcomingForCourseMatch) {
                await processingClassCalendarUpcomingForCourseMessage(ctx, classCalendarUpcomingForCourseMatch);
            }

            else if (openMaterialsMatch) {
                await processingOpenMaterialsMessage(ctx, openMaterialsMatch);
            }

            else {
                await ctx.reply(translationsHandler(translationKeys.GENERAL_UNKNOWN_COMMAND_TEXT, lang));
            }
    }
}

async function processingClassroomHelperMessage(ctx: any) {
    const chatId = ctx.chat?.id as number;
    const lang = getLang(ctx.session.__scenes);
    const res = await classroomHelperService.getMenuResponse(chatId, lang);
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

    const materials = await classroomHelperService.getMaterialsFromCourse(chatId, ctx.session.__scenes, courseName, CourseActions.MANAGE);
    await sendMaterials(materials, ctx);

    const res = classroomHelperService.getCreateTaskResponse(ctx.session.__scenes, courseName);
    await ctx.reply(res.text, res.keyboard);
}

async function processingViewCourseMessage(ctx: any, match: RegExpMatchArray) {
    const chatId = ctx.chat.id;
    const courseName = match[1];

    const materials = await classroomHelperService.getMaterialsFromCourse(chatId, ctx.session.__scenes, courseName, CourseActions.VIEW);

    if (Array.isArray(materials)) {
        const res = classroomHelperService.getViewCourseResponse(ctx.session.__scenes, courseName);
        await ctx.reply(res.text, res.keyboard);
        await sendMaterials(materials, ctx);

    } else {
        return await ctx.reply(materials.text, materials.keyboard);
    }
}

async function processingClassCalendarMessage(ctx: any) {
    const res = await classroomHelperService.getTaskCalendarResponse(ctx);
    await ctx.reply(res.text, res.keyboard);
}

async function processingClassCalendarUpcomingMessage(ctx: any, match: RegExpMatchArray) {
    await ctx.answerCbQuery();

    const res = await classroomHelperService.getTaskCalendarWithUpTasksResponse(ctx, match[1]);
    await ctx.reply(res.text, res.keyboard);
}

async function processingAllMatFromCourseMessage(ctx: any, match: RegExpMatchArray) {
    const chatId = ctx.chat.id;
    const courseName = match[1];

    const materials = await classroomHelperService.getAllMaterialsResponse(chatId, ctx.session.__scenes, courseName, false) as IBotResponse[];

    if (Array.isArray(materials)) {
        const res = classroomHelperService.getViewCourseResponse(ctx.session.__scenes, courseName);
        await ctx.reply(res.text, res.keyboard);
        materials.map(
            async ({ text, keyboard }) => await ctx.reply(text, keyboard)
        );

    } else {
        console.log('materials');
        console.log(materials)
        await ctx.reply("materials.text, materials.keyboard");
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

async function processingTaskCalendarForCourseMessage(ctx: any, match: RegExpMatchArray) {
    const courseName = match[1];
    const res = await classroomHelperService.getTaskCalendarResponse(ctx, courseName);
    await ctx.reply(res.text, res.keyboard);
}

async function processingClassCalendarUpcomingForCourseMessage(ctx: any, match: RegExpMatchArray) {
    await ctx.answerCbQuery();

    const res = await classroomHelperService.getTaskCalendarWithUpTasksResponse(ctx, match[1], match[2]);
    await ctx.reply(res.text, res.keyboard);
}

async function processingOpenMaterialsMessage(ctx: any, match: RegExpMatchArray) {
    await ctx.answerCbQuery();
    await classroomHelperService.openMaterialsResponse(ctx, match[1], match[2])
}

async function processingLogOutMessage(ctx: any) {
    await removeUserInfo(ctx.chat.id);
    const res = classroomHelperService.getLogOutResponse(ctx.session.__scenes);
    await ctx.reply(res.text, res.keyboard);
}
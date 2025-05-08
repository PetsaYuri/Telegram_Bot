import { addPrefixToKeysAndValues } from "../../../../botService";

export const generalTransKeys = addPrefixToKeysAndValues('general', {
    MAIN_MENU_COMMAND: 'mainMenuCommand',
    MAIN_MENU_TEXT: 'mainMenuText',

    CHOOSE_LANGUAGE_COMMAND: 'chooseLanguageCommand',
    CHOOSE_LANGUAGE_TEXT: 'chooseLanguageText',

    ENGLISH_LANGUAGE_TEXT: 'englishLanguageText',
    UKRAINIAN_LANGUAGE_TEXT: 'ukrainianLanguageText',

    SET_CHOSEN_LANGUAGE_TEXT: 'setChosenLanguageText',

    AI_ASSISTANT_TEXT: 'aiAssistantText',
    AI_ASSISTANT_COMMAND: 'aiAssistantCommand',

    CLASSROOM_HELPER_TEXT: 'classroomHelperText',
    CLASSROOM_HELPER_COMMAND: 'classroomHelperCommand',

    TESTING_TEXT: 'testingText',
    TESTING_COMMAND: 'testingCommand',

    UNKNOWN_COMMAND_TEXT: 'unknownCommandText',
    CHOOSE_NEXT_ACTION_TEXT: 'chooseNextActionText',

    DAYS_TEXT: 'daysText',
    HOURS_TEXT: 'hoursText',
    MINUTES_TEXT: 'minutesText',
})
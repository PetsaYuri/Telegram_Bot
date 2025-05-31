import { addPrefixToKeysAndValues } from "../../../botService";

export const generalTransKeys = addPrefixToKeysAndValues('general', {
    MAIN_MENU_COMMAND: 'mainMenuCommand',
    MAIN_MENU_TEXT: 'mainMenuText',

    CHOOSE_LANGUAGE_COMMAND: 'chooseLanguageCommand',
    SET_CHOSEN_LANGUAGE_TEXT: 'setChosenLanguageText',

    CHOOSE_LANGUAGE_TEXT: 'chooseLanguageText',
    CHANGE_LANGUAGE_TEXT: 'changeLanguageText',

    ENGLISH_LANGUAGE_TEXT: 'englishLanguageText',
    UKRAINIAN_LANGUAGE_TEXT: 'ukrainianLanguageText',

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

    VIEW_THROUGH_WEB_APP_TEXT: 'viewThroughWebAppText',
    LINK_TEXT: 'linkText',

    VIEW_WELCOME_PAGE_TEXT: 'viewWelcomePageText',
    VIEW_PRIVACY_POLICY_TEXT: 'viewPrivacyPolicyText',
    VIEW_TERMS_OF_SERVICE_TEXT: 'viewTermsOfServiceText',

    JANUARY_TEXT: 'januaryText',
    FEBRUARY_TEXT: 'februaryText',
    MARCH_TEXT: 'marchText',
    APRIL_TEXT: 'aprilText',

    MAY_TEXT: 'mayText',
    JUNE_TEXT: 'juneText',
    JULY_TEXT: 'julyText',
    AUGUST_TEXT: 'augustText',

    SEPTEMBER_TEXT: 'septemberText',
    OCTOBER_TEXT: 'octoberText',
    NOVEMBER_TEXT: 'novemberText',
    DECEMBER_TEXT: 'decemberText',

    SUNDAY_TEXT: 'SundayText',
    MONDAY_TEXT: 'MondayText',
    TUESDAY_TEXT: 'TuesdayText',
    WEDNESDAY_TEXT: 'WednesdayText',
    THURSDAY_TEXT: 'ThursdayText',
    FRIDAY_TEXT: 'FridayText',
    SATURDAY_TEXT: 'SaturdayText',

    INVALID_MONTH_NUM_TEXT: 'invalidMonthNumText',
    DAY_DOES_NOT_EXIST_TEXT: 'dayDoesNotExistText',
})
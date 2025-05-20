import { addPrefixToKeysAndValues } from "../../../../botService";

export const scenesTransKeys = addPrefixToKeysAndValues('scenes', {
    ENTER_TIME_TEXT: 'enterTimeText',
    LEFT_TEXT: 'leftText',

    TIME_CANNOT_BE_EMPTY_TEXT: 'timeCannotBeEmptyText',
    TIME_CANNOT_BE_LESS_TEXT: 'timeCannotBeLessText',
    TIME_CANNOT_BE_MORE_TEXT: 'timeCannotBeMoreText',

    ENTER_TO_SKIP_TEXT: 'enterToSkipText',
    KEEP_PREV_VALUE_TEXT: 'keepPrevValueText',

    ENTER_TITLE_TEXT: 'enterTitleText',
    TITLE_MUST_BE_BETWEEN_TEXT: 'titleMustBeBetweenText',

    ENTER_DESC_TEXT: 'enterDescText',
    DESC_MUST_BE_GREATER_TEXT: 'descMustBeGreaterText',

    ENTER_MAX_SCORE_TEXT: 'enterMaxScoreText',
    MAX_SCORE_MUST_BE_GREATER_TEXT: 'maxScoreMustBeGreaterText',

    ENTER_DUE_DATE_TEXT: 'enterDueDateText',
    DATE_INCORRECT_FORMAT_TEXT: 'dateIncorrectFormatText',
    DATE_CANNOT_BE_IN_PAST_TEXT: 'dateCannotBeInPastText',

    ENTER_DUE_TIME_TEXT: 'enterDueTimeText',
    TIME_INCORRECT_FORMAT_TEXT: 'timeIncorrectFormatText',
    TIME_CANNOT_BE_IN_PAST_TEXT: 'timeCannotBeInPastText',

    ENTER_NEW_TITLE_TEXT: 'enterNewTitleText',
    ENTER_NEW_DESC_TEXT: 'enterNewDescText',
    ENTER_NEW_MAX_SCORE_TEXT: 'enterNewMaxScoreText',
    ENTER_NEW_DUE_DATE_TEXT: 'enterNewDueDateText',
    ENTER_NEW_DUE_TIME_TEXT: 'enterNewDueTimeText',

    ERROR_TEXT: 'errorText',
    SELECT_TEST_TYPE_TEXT: 'selectTestTypeText',

    ATTACH_DOC_TEXT: 'attachDocText',
    INCORRECT_FILE_EXTEN_TEXT: 'incorrectFileExtenText',

    ENTER_NUM_OF_QUESTS_TEXT: 'enterNumOfQuestsText',
    MUST_ENTER_NUMBER_TEXT: 'mustEnterNumberText',
    ENTERED_NUM_BIGGER_TEXT: 'enteredNumBiggerText',
})
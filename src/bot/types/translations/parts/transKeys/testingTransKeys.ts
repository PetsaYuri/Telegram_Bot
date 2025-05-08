import { addPrefixToKeysAndValues } from "../../../../botService";

export const testingTransKeys = addPrefixToKeysAndValues('testing', {
    BACK_TO_TESTS_TEXT: 'backToTestsText',
    CREATE_NEW_TEST_TEXT: 'createNewTestText',

    DONT_HAVE_TESTS_TEXT: 'dontHaveTestsText',
    UNDEF_TEST_TYPE_TEXT: 'undefTestTypeText',

    PASS_TEST_TEXT: 'passTestText',
    DELETE_TEST_TEXT: 'deleteTestText',

    TITLE_REQUIRED_TEXT: 'titleRequiredText',
    INCORRECT_TEST_TYPE_TEXT: 'incorrectTestTypeText',

    DOCUMENT_REQUIRED_TEXT: 'documentRequiredText',
    TEST_WASNT_FOUND_TEXT: 'testWasntFoundText',

    SUCCESS_CREATED_TEXT: 'successCreatedText',

    QUESTION_TEXT: 'questionText',
    QUESTIONS_TEXT: 'questionsText',

    CORRECT_ANSWERS_TEXT: 'correctAnswersText',
    MISTAKES_TEXT: 'mistakesText',

    YOUR_ANSWER_TEXT: 'yourAnswerText',
    CORRECT_ANSWER_TEXT: 'correctAnswerText',

    TYPE_TEXT: 'typeText',

    INVALID_DOC_FORMAT_TEXT: 'invalidDocFormatText',
    UNDEF_RIGHT_ANSWER_TEXT: 'undefRightAnswerText',
    DONT_HAVE_ACCESS_TEXT: 'dontHaveAccessText',
})
export const classroomHelperTranslations = {
    en: {
        backToCoursesText: 'No, back to courses',

        manageCoursesText: 'Manage your own courses',
        viewCoursesText: 'View all available courses',

        manageCourseRegex: /^manage '([a-zA-Z0-9\s\-]{3,20})' course$/,
        manageCourseText: "manage '%s' course",

        viewCourseRegex: /^view '([a-zA-Z0-9\\s\\-]{3,20})' course$/,
        viewCourseText: "view '%s' course",

        reviewMaterialsRegex: /^Yes, I'd like to review all materials from '(.+)' course$/,
        materialsFromCourseText: 'Your materials from the selected course:',

        createTaskRegex: /^Create task for '([a-zA-Z0-9\\s\\-]{3,20})' course$/,
        createTaskText: "Create task for '%s' course",

        dontHaveCourseText: "You don't have course with title: %s",
        authViaLinkText: "Follow the next link for authorisation via google account (you cannot proceed without google authorisation)",

        cannotEditTaskText: 'You cannot edit the non-existent task',
        incorrectActionText: 'Sorry, we can not recognise the type of your action',

        haveSeenAllMaterText: "You've already seen all the materials for this course. New material hasn't been uploaded yet. " +
            "Would you like to see all materials again?",
        wouldLikeToReviewText: "Yes, I'd like to review all materials from '%s' course",

        viewInBrowserText: 'View in browser',
        openInBrowserText: 'Open in browser',

        createdText: 'Created',
        editText: 'Edit',
        deleteText: 'Delete',

        createdTaskNotifText: `Notification: The '%s' task has been created in the '%s' course.`,
        updatedTaskNotifText: `Notification: The '%s' task in the '%s' course has been updated.`,

        successCreatedText: 'Successfully created!',
        successUpdatedText: 'Successfully updated!',
        successDeletedText: 'Successfully deleted!',

        notifMessageText: "Notification: only %s left before the due date of the '%s' assignment (the '%s' course)",
        notifSetUpText: "Notification for the '%s' assignment has been successfully set up and will work after: %s",
        setNotifText: 'Set notification',

        dueDateText: 'Due date',
        loginText: 'Login',

        cannotSetNotifText: 'You cannot set a notification to task that is overdue',
        emptyTitleText: "The 'title' field must be filled in",

        cantRetrieveCoursesText: "Can't retrieve courses from classroom",
        cannotDeleteTaskText: "Cannot delete task with id: '%s'",

        unauthorisedUserText: "The current user isn't authorised",
        cannotDefineTypeText: 'Cannot define the type of material',

        couldntFindCourseText: "We couldn't find the course by the provided name. Please, make sure the '%s' course exists.",
        showTaskCalendarText: 'Show task calendar',

        taskAndBracketText: 'task (the',
        courseAndBracketText: 'course)',

        noTasksToCompleteText: 'There are no tasks to need complete during this period',
        tasksToCompleteText: 'Tasks that need to be completed within ',

        pressToViewUpTasksText: 'Press the button below to view your upcoming tasks',
        showUpTasksText: 'Show upcoming tasks',
        upTasksText: 'Upcoming tasks:',

        returnToChoosingOwnCourseText: 'Return to choosing your own course',
        returnToChoosingAvailCourseText: 'Return to choosing the available course',
        returnToHelperMenuText: "Return to the 'Classroom helper' menu",

        showTaskCalendarForCourseText: "Show task calendar for '%s' course",
        showTaskCalendarForCourseRegex: /^Show task calendar for (.+) course$/,
        noMaterialsCreatedText: 'No materials have yet been created for this course. Please, return later',

        logOutText: 'Log out',
        successAuthorisationText: 'Success authorisation.',

        previewOfText: 'Preview of',
        successfullyLogedOutText: 'You have successfully logged out',

        openMaterialsText: 'Open materials',
        noMaterWithProvidedIdText: "There's no material with the provided id."
    },

    ua: {
        backToCoursesText: 'Ні, назад до курсів',

        manageCoursesText: 'Керувати власними курсами',
        viewCoursesText: 'Переглянути всі доступні курси',

        manageCourseRegex: /^керувати '([\p{L}0-9\s\-]{3,20})' курсом$/u,
        manageCourseText: "керувати '%s' курсом",

        viewCourseRegex: /^переглянути '([\p{L}0-9\s\-]{3,20})' курс$/u,
        viewCourseText: "переглянути '%s' курс",

        reviewMaterialsRegex: /^Так, я хотів\(ла\) би переглянути всі матеріали з '(.+)' курсу$/,
        materialsFromCourseText: 'Ваші матеріали з обраного курсу:',

        createTaskRegex: /^Створити завдання для '([\p{L}0-9\s\-]{3,20})' курсу$/u,
        createTaskText: "Створити завдання для '%s' курсу",

        dontHaveCourseText: "У вас немає курсу з назвою: %s",
        authViaLinkText: 'Перейдіть за наступним посиланням для авторизації через обліковий запис Google (Ви не можете продовжити без авторизації Google)',

        cannotEditTaskText: 'Ви не можете редагувати неіснуюче завдання',
        incorrectActionText: 'На жаль, ми не можемо розпізнати тип вашої дії',

        haveSeenAllMaterText: "Ви вже переглянули всі матеріали для цього курсу. Нові матеріали ще не завантажено. " +
            "Ви б хотіли переглянути всі матеріали знову?",
        wouldLikeToReviewText: "Так, я хотів(ла) би переглянути всі матеріали з '%s' курсу",

        viewInBrowserText: 'Переглянути у браузері',
        openInBrowserText: 'Відкрити у браузері',

        createdText: 'Створено',
        editText: 'Редагувати',
        deleteText: 'Видалити',

        createdTaskNotifText: `Сповіщення: Завдання '%s' створено в курсі '%s'.`,
        updatedTaskNotifText: `Сповіщення: Завдання '%s' у курсі '%s' оновлено.`,

        successCreatedText: 'Успішно створено!',
        successUpdatedText: 'Успішно оновлено!',
        successDeletedText: 'Успішно видалено!',

        notifMessageText: "Сповіщення: тільки %s залишилося до дати здавання '%s' завдання ('%s' курс)",
        notifSetUpText: "Сповіщення для '%s' завдання успішно встановлено та працюватиме після: %s",
        setNotifText: 'Встановити сповіщення',

        dueDateText: 'Термін виконання',
        loginText: 'Вхід',

        cannotSetNotifText: 'Ви не можете встановити сповіщення для завдання, у якого закінчився термін виконання',
        emptyTitleText: 'Поле «Назва» має бути заповнене',

        cantRetrieveCoursesText: "Не вдалося отримати курси",
        cannotDeleteTaskText: "Неможливо видалити завдання з ідентифікатором: '%s'",

        unauthorisedUserText: "Поточний користувач не є авторизованим",
        cannotDefineTypeText: 'Неможливо визначити тип матеріалу',

        couldntFindCourseText: "Нам не вдалося знайти курс за вказаною назвою. Будь ласка, переконайтеся, що '%s' курс існує.",
        showTaskCalendarText: 'Переглянути календар завдань',

        taskAndBracketText: 'завдання (',
        courseAndBracketText: 'курс)',

        noTasksToCompleteText: 'Протягом цього періоду немає завдань, які потрібно виконати',
        tasksToCompleteText: 'Завдання, які необхідно виконати протягом',

        pressToViewUpTasksText: 'Натисніть кнопку нижче, щоб переглянути майбутні завдання',
        showUpTasksText: 'Показати майбутні завдання',
        upTasksText: 'Майбутні завдання:',

        returnToChoosingOwnCourseText: 'Повернення до вибору власного курсу',
        returnToChoosingAvailCourseText: 'Повернутися до вибору доступного курсу',
        returnToHelperMenuText: "Повернутися до меню «Classroom помічник»",

        showTaskCalendarForCourseText: "Показати календар завдань для '%s' курсу",
        showTaskCalendarForCourseRegex: /^Показати календар завдань для '(.+)' курсу$/,
        noMaterialsCreatedText: 'Для цього курсу ще не створено жодних матеріалів. Будь ласка, поверніться пізніше.',

        logOutText: 'Вийти',
        successAuthorisationText: 'Успішна авторизація.',

        previewOfText: 'Попередній перегляд',
        successfullyLogedOutText: 'Ви успішно вийшли з системи',

        openMaterialsText: 'Відкрити матеріали',
        noMaterWithProvidedIdText: "Немає матеріалів із вказаним ідентифікатором."
    }
}
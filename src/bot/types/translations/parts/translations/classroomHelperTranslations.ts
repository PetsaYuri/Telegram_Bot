export const classroomHelperTranslations = {
    en: {
        authorisationText: 'Authorisation',
        backToCoursesText: 'No, back to courses',

        manageCoursesText: 'Manage your own courses',
        viewCoursesText: 'View all available courses',

        manageCourseRegex: /^manage '([a-zA-Z0-9\s\-]{3,20})' course$/,
        manageCourseText: "manage '%s' course",

        viewCourseRegex: /^view '([a-zA-Z0-9\\s\\-]{3,20})' course$/,
        viewCourseText: "view '%s' course",

        reviewMaterialsRegex: /^Yes, I'd like to review all materials from (.+) course$/,
        materialsFromCourseText: 'Your materials from the selected course:',

        createTaskRegex: /^Create task for '([a-zA-Z0-9\\s\\-]{3,20})' course$/,
        createTaskText: "Create task for '%s' course",

        dontHaveCourseText: "You don't have course with title: %s",
        authViaLinkText: 'Follow the next link for authorisation via google account',

        cannotEditTaskText: 'You cannot edit the non-existent task',
        incorrectActionText: 'Sorry, we can not recognise the type of your action',

        haveSeenAllMaterText: "You've already seen all the materials for this course. New material hasn't been uploaded yet. " +
            "Would you like to see all materials again?",
        wouldLikeToReviewText: "Yes, I'd like to review all materials from %s course",

        viewInBrowserText: 'View in browser',
        openInBrowserText: 'Open in browser',

        createdText: 'Created',
        editText: 'Edit',
        deleteText: 'Delete',

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
    },

    ua: {
        authorisationText: 'Авторизація',
        backToCoursesText: 'Ні, назад до курсів',

        manageCoursesText: 'Керувати власними курсами',
        viewCoursesText: 'Переглянути всі доступні курси',

        manageCourseRegex: /^керувати '([a-zA-Z0-9\s\-]{3,20})' курсом$/, // /^керувати '([a-zA-Z0-9\\s\\-]{3,20})' курсом$/
        manageCourseText: "керувати '%s' курсом",

        viewCourseRegex: /^переглянути '([a-zA-Z0-9\\s\\-]{3,20})' курс$/,
        viewCourseText: "переглянути '%s' курс",

        reviewMaterialsRegex: /^Так, я хотів(ла) би переглянути всі матеріали з (.+) курсу$/,
        materialsFromCourseText: 'Ваші матеріали з обраного курсу:',

        createTaskRegex: /^Створити завдання для '([a-zA-Z0-9\s\-]{3,20})' курсу$/,
        createTaskText: "Створити завдання для '%s' курсу",

        dontHaveCourseText: "У вас немає курсу з назвою: %s",
        authViaLinkText: 'Перейдіть за наступним посиланням для авторизації через обліковий запис Google',

        cannotEditTaskText: 'Ви не можете редагувати неіснуюче завдання',
        incorrectActionText: 'На жаль, ми не можемо розпізнати тип вашої дії',

        haveSeenAllMaterText: "Ви вже переглянули всі матеріали для цього курсу. Нові матеріали ще не завантажено. " +
            "Ви б хотіли переглянути всі матеріали знову?",
        wouldLikeToReviewText: "Так, я хотів(ла) би переглянути всі матеріали з %s курсу",

        viewInBrowserText: 'Переглянути у браузері',
        openInBrowserText: 'Відкрити у браузері',

        createdText: 'Створено',
        editText: 'Редагувати',
        deleteText: 'Видалити',

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
    }
}
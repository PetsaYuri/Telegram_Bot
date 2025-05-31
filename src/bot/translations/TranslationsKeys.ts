import { aiAssistantTransKeys } from "./parts/transKeys/aiAssistantTransKeys";
import { classroomHelperTransKeys } from "./parts/transKeys/classroomHelperTransKeys";
import { generalTransKeys } from "./parts/transKeys/generalTransKeys";
import { scenesTransKeys } from "./parts/transKeys/scenesTransKeys";
import { testingTransKeys } from "./parts/transKeys/testingTransKeys";

export const translationKeys = {
    ...generalTransKeys,
    ...aiAssistantTransKeys,
    ...classroomHelperTransKeys,
    ...testingTransKeys,
    ...scenesTransKeys
}

export type TranslationsKey = typeof translationKeys[keyof typeof translationKeys];
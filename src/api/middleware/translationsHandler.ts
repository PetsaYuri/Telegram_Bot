import { LangTypes } from "../../bot/types/translations/LangTypes";
import { translations } from "../../bot/types/translations/translations";
import { TranslationsKey } from "../../bot/types/translations/TranslationsKeys";

export function translationsHandler(key: TranslationsKey, lang: LangTypes): string {
    const [domain, subKey] = key.split('.') as [keyof typeof translations, string];
    const section = translations[domain];
    return section?.[lang]?.[subKey as keyof typeof section[typeof lang]];
}
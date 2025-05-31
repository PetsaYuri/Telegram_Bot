import { LangTypes } from "../../bot/translations/LangTypes";
import { translations } from "../../bot/translations/translations";
import { TranslationsKey } from "../../bot/translations/TranslationsKeys";

export function translationsHandler(key: TranslationsKey, lang: LangTypes): string {
    const [domain, subKey] = key.split('.') as [keyof typeof translations, string];
    const section = translations[domain];
    return section?.[lang]?.[subKey as keyof typeof section[typeof lang]];
}
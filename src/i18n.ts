import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./locales/fr.json";
import en from "./locales/en.json";
import zh from "./locales/zh.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import ar from "./locales/ar.json";
import ru from "./locales/ru.json";
import es from "./locales/es.json";
import de from "./locales/de.json";
import hi from "./locales/hi.json";
import pt from "./locales/pt.json";

const STORAGE_KEY = "att2_wiki_lang";

/** Langues alignées sur le datapack (LANGUAGE=0..10). */
export const supportedLngs = ["fr", "en", "zh", "ja", "ko", "ar", "ru", "es", "de", "hi", "pt"] as const;
export type SupportedLang = (typeof supportedLngs)[number];

function getStoredLanguage(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && supportedLngs.includes(stored as SupportedLang)) return stored;
  } catch (_) {}
  return null;
}

function getInitialLanguage(): string {
  const stored = getStoredLanguage();
  if (stored) return stored;
  const browser = navigator.language?.slice(0, 2).toLowerCase();
  if (supportedLngs.includes(browser as SupportedLang)) return browser;
  return "fr";
}

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    zh: { translation: zh },
    ja: { translation: ja },
    ko: { translation: ko },
    ar: { translation: ar },
    ru: { translation: ru },
    es: { translation: es },
    de: { translation: de },
    hi: { translation: hi },
    pt: { translation: pt },
  },
  lng: getInitialLanguage(),
  fallbackLng: "fr",
  supportedLngs: [...supportedLngs],
  interpolation: {
    escapeValue: false,
  },
});

const initialLng = getInitialLanguage();
if (typeof document !== "undefined" && document.documentElement) {
  document.documentElement.dir = initialLng === "ar" ? "rtl" : "ltr";
}

i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch (_) {}
  const dir = lng === "ar" ? "rtl" : "ltr";
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.dir = dir;
  }
});

export default i18n;

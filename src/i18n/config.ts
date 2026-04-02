import i18next, { type ResourceLanguage } from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

type SupportedLanguage =
  | "en-US"
  | "zh-CN"
  | "zh-TW"
  | "ja-JP"
  | "id-ID";

type LanguageDefinition = {
  aliases: string[];
  loader: () => Promise<{ default: ResourceLanguage }>;
  name?: string;
};

const FALLBACK_LANGUAGE: SupportedLanguage = "zh-CN";

const languageDefinitions: Record<SupportedLanguage, LanguageDefinition> = {
  "en-US": {
    aliases: ["en"],
    loader: () => import("./locales/en.json"),
    name: "English",
  },
  "zh-CN": {
    aliases: ["zh", "zh-SG"],
    loader: () => import("./locales/zh_CN.json"),
    name: "简体中文",
  },
  "zh-TW": {
    aliases: ["zh-HK", "zh-MO"],
    loader: () => import("./locales/zh_TW.json"),
    name: "繁體中文",
  },
  "ja-JP": {
    aliases: ["ja"],
    loader: () => import("./locales/ja_JP.json"),
    name: "日本語",
  },
  "id-ID": {
    aliases: ["id"],
    loader: () => import("./locales/id_ID.json"),
    name: "Bahasa Indonesia",
  },
};

const supportedLanguageMap = new Map<string, string>();
const canonicalLanguageMap = new Map<string, SupportedLanguage>();
const resourceLoadPromises = new Map<SupportedLanguage, Promise<void>>();

for (const [canonicalLanguage, definition] of Object.entries(
  languageDefinitions,
) as [SupportedLanguage, LanguageDefinition][]) {
  supportedLanguageMap.set(canonicalLanguage.toLowerCase(), canonicalLanguage);
  canonicalLanguageMap.set(canonicalLanguage, canonicalLanguage);

  for (const alias of definition.aliases) {
    supportedLanguageMap.set(alias.toLowerCase(), alias);
    canonicalLanguageMap.set(alias, canonicalLanguage);
  }
}

export const availableLanguages = (
  Object.entries(languageDefinitions) as [SupportedLanguage, LanguageDefinition][]
)
  .filter(([, definition]) => typeof definition.name === "string")
  .map(([code, definition]) => ({
    code,
    name: definition.name as string,
  }))
  .sort((a, b) => a.code.localeCompare(b.code));

const supportedLanguageCodes = [
  ...new Set(
    (
      Object.entries(languageDefinitions) as [SupportedLanguage, LanguageDefinition][]
    ).flatMap(([canonicalLanguage, definition]) => [
      canonicalLanguage,
      ...definition.aliases,
    ]),
  ),
];

function normalizeLanguageInput(language?: string | null) {
  return language?.trim().replace(/_/g, "-") ?? "";
}

export function resolveSupportedLanguage(language?: string | null) {
  const normalizedLanguage = normalizeLanguageInput(language).toLowerCase();
  if (!normalizedLanguage) {
    return FALLBACK_LANGUAGE;
  }

  return (
    supportedLanguageMap.get(normalizedLanguage) ??
    supportedLanguageMap.get(normalizedLanguage.split("-")[0]) ??
    FALLBACK_LANGUAGE
  );
}

export function resolveCanonicalLanguage(
  language?: string | null,
): SupportedLanguage {
  const supportedLanguage = resolveSupportedLanguage(language);
  return canonicalLanguageMap.get(supportedLanguage) ?? FALLBACK_LANGUAGE;
}

async function ensureCanonicalLanguageResources(language: SupportedLanguage) {
  if (i18next.hasResourceBundle(language, "translation")) {
    return;
  }

  const existingPromise = resourceLoadPromises.get(language);
  if (existingPromise) {
    await existingPromise;
    return;
  }

  const loadPromise = languageDefinitions[language]
    .loader()
    .then(({ default: translation }) => {
      i18next.addResourceBundle(
        language,
        "translation",
        translation,
        true,
        true,
      );
    })
    .finally(() => {
      resourceLoadPromises.delete(language);
    });

  resourceLoadPromises.set(language, loadPromise);
  await loadPromise;
}

function ensureAliasResources(language: string, canonicalLanguage: SupportedLanguage) {
  if (language === canonicalLanguage || i18next.hasResourceBundle(language, "translation")) {
    return;
  }

  const translation = i18next.getResourceBundle(
    canonicalLanguage,
    "translation",
  );
  if (!translation) {
    return;
  }

  i18next.addResourceBundle(language, "translation", translation, true, true);
}

export async function loadLanguageResources(language?: string | null) {
  const supportedLanguage = resolveSupportedLanguage(language);
  const canonicalLanguage = resolveCanonicalLanguage(supportedLanguage);

  await ensureCanonicalLanguageResources(canonicalLanguage);
  ensureAliasResources(supportedLanguage, canonicalLanguage);

  return supportedLanguage;
}

export async function changeLanguage(language: string) {
  const supportedLanguage = await loadLanguageResources(language);
  await i18next.changeLanguage(supportedLanguage);
  return supportedLanguage;
}

let initPromise: Promise<typeof i18next> | null = null;

export async function initI18n() {
  if (!initPromise) {
    initPromise = (async () => {
      await i18next.use(LanguageDetector).use(initReactI18next).init({
        resources: {},
        fallbackLng: FALLBACK_LANGUAGE,
        supportedLngs: supportedLanguageCodes,
        load: "currentOnly",
        interpolation: {
          escapeValue: false,
        },
        partialBundledLanguages: true,
        detection: {
          order: [
            "querystring",
            "cookie",
            "localStorage",
            "navigator",
            "htmlTag",
          ],
          caches: ["localStorage", "cookie"],
        },
      });

      const initialLanguage = await loadLanguageResources(
        i18next.resolvedLanguage || i18next.language || FALLBACK_LANGUAGE,
      );
      await i18next.changeLanguage(initialLanguage);

      return i18next;
    })();
  }

  return initPromise;
}

export default i18next;

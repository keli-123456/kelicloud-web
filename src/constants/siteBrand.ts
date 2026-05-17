export const DEFAULT_SITE_NAME = "kelicloud";
export const DEFAULT_SITE_SUBTITLE = "kelicloud";

const normalizeString = (value?: unknown) => String(value || "").trim();
const normalizeLegacyBrand = (value?: unknown) => {
  const normalized = normalizeString(value);
  if (normalized === "Komari" || normalized === "Komari Monitor") {
    return DEFAULT_SITE_NAME;
  }
  return normalized;
};

export const getSiteName = (value?: unknown) =>
  normalizeLegacyBrand(value) || DEFAULT_SITE_NAME;

export const getSiteSubtitle = (value?: unknown, fallback?: unknown) =>
  normalizeLegacyBrand(value) ||
  normalizeLegacyBrand(fallback) ||
  DEFAULT_SITE_SUBTITLE;

export const getSiteInitial = (value?: unknown) =>
  getSiteName(value).slice(0, 1).toUpperCase();

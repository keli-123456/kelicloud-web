export const DEFAULT_SITE_NAME = "Komari";
export const DEFAULT_SITE_SUBTITLE = "Komari Monitor";
export const DEFAULT_SITE_GITHUB_URL = "https://github.com/keli-123456";

const normalizeString = (value?: unknown) => String(value || "").trim();

export const getSiteName = (value?: unknown) =>
  normalizeString(value) || DEFAULT_SITE_NAME;

export const getSiteSubtitle = (value?: unknown, fallback?: unknown) =>
  normalizeString(value) || normalizeString(fallback) || DEFAULT_SITE_SUBTITLE;

export const getSiteInitial = (value?: unknown) =>
  getSiteName(value).slice(0, 1).toUpperCase();

export const getSiteGithubUrl = (value?: unknown) =>
  normalizeString(value) || DEFAULT_SITE_GITHUB_URL;

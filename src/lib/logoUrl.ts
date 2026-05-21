export function getLogoUrl(version?: string | number | null): string {
  const normalizedVersion = version == null ? "" : String(version).trim();

  if (!normalizedVersion) {
    return "/favicon.ico";
  }

  return `/favicon.ico?v=${encodeURIComponent(normalizedVersion)}`;
}

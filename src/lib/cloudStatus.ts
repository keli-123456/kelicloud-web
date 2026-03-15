import type { TFunction } from "i18next";

const cloudStatusDelimiterPattern = /[^a-z0-9]+/g;

function normalizeCloudStatusKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(cloudStatusDelimiterPattern, "_")
    .replace(/^_+|_+$/g, "");
}

export function getCloudStatusLabel(
  value: string | null | undefined,
  t: TFunction,
) {
  const rawValue = value?.trim();
  if (!rawValue) return "-";

  const normalizedKey = normalizeCloudStatusKey(rawValue);
  if (!normalizedKey) return rawValue;

  return t(`cloud.status.${normalizedKey}`, {
    defaultValue: rawValue,
  });
}

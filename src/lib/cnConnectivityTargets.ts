const CN_CONNECTIVITY_TARGET_SPLIT_REGEX = /[\n\r,;]+/;

export function parseCNConnectivityTargets(value: string): string[] {
  const targets = value
    .split(CN_CONNECTIVITY_TARGET_SPLIT_REGEX)
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(targets));
}

export function normalizeCNConnectivityTargets(value: string): string {
  return parseCNConnectivityTargets(value).join("\n");
}

export function formatCNConnectivityTargetsSummary(
  value: string,
  locale: "zh" | "en" = "zh"
): string {
  const targets = parseCNConnectivityTargets(value);
  if (targets.length === 0) {
    return "";
  }
  if (targets.length === 1) {
    return targets[0];
  }

  const preview = targets.slice(0, 2).join(" / ");
  if (locale === "en") {
    return `${targets.length} targets: ${preview}${targets.length > 2 ? " ..." : ""}`;
  }

  return `${targets.length} 个目标：${preview}${targets.length > 2 ? " ..." : ""}`;
}

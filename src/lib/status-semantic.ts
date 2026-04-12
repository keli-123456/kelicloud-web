const statusDelimiterPattern = /[^a-z0-9]+/g;

export type StatusSemantic =
  | "default"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "disabled";

export type StatusBadgeVariant =
  | "secondary"
  | "info"
  | "success"
  | "warning"
  | "destructive";

const STATUS_SEMANTIC_MAP: Record<string, StatusSemantic> = {
  online: "success",
  active: "success",
  configured: "success",
  healthy: "success",
  normal: "success",
  enabled: "success",
  connected: "success",
  synced: "success",
  success: "success",
  succeeded: "success",
  ok: "success",
  pass: "success",

  running: "info",
  provisioning: "info",
  booting: "info",
  starting: "info",
  new: "info",
  initializing: "info",
  syncing: "info",
  processing: "info",
  queued: "info",
  pending: "info",
  loading: "info",
  waiting: "info",
  in_progress: "info",
  blocked_suspected: "danger",

  stopped: "warning",
  deallocated: "warning",
  off: "warning",
  degraded: "warning",
  incomplete: "warning",
  partial: "warning",
  warning: "warning",
  warn: "warning",
  retrying: "warning",
  retry: "warning",
  manual_review: "warning",
  cooldown: "warning",
  attention: "warning",
  skipped: "warning",
  cancelled: "warning",
  canceled: "warning",

  offline: "danger",
  terminated: "danger",
  failed: "danger",
  fail: "danger",
  error: "danger",
  timeout: "danger",
  locked: "danger",
  deleted: "danger",
  deleting: "danger",

  disabled: "disabled",
  unconfigured: "disabled",
  not_started: "disabled",
  idle: "disabled",
  not_installed: "disabled",
  unavailable: "disabled",
  unknown: "default",
  none: "default",
};

function normalizeStatus(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(statusDelimiterPattern, "_")
    .replace(/^_+|_+$/g, "");
}

export function resolveStatusSemantic(
  status: string | null | undefined,
): StatusSemantic {
  const normalized = normalizeStatus(status);
  if (!normalized) return "default";
  return STATUS_SEMANTIC_MAP[normalized] || "default";
}

export function semanticToBadgeVariant(
  semantic: StatusSemantic,
): StatusBadgeVariant {
  if (semantic === "danger") return "destructive";
  if (semantic === "warning") return "warning";
  if (semantic === "info") return "info";
  if (semantic === "success") return "success";
  return "secondary";
}

export function resolveStatusBadgeVariant(
  status: string | null | undefined,
): StatusBadgeVariant {
  return semanticToBadgeVariant(resolveStatusSemantic(status));
}

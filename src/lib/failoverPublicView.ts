import type { TFunction } from "i18next";

export type PublicFailoverTone = "gray" | "green" | "amber" | "red" | "blue";

const SUCCESS_STATUSES = new Set(["success", "succeeded", "completed", "done"]);
const HEALTHY_STATUSES = new Set(["healthy", "active", "online", "ok", "normal"]);
const PROCESSING_STATUSES = new Set([
  "running",
  "queued",
  "pending",
  "detecting",
  "provisioning",
  "rebinding_ip",
  "waiting_agent",
  "running_script",
  "switching_dns",
  "cleaning_old",
  "attaching_dns",
  "detaching_dns",
  "retrying",
]);
const FAILED_STATUSES = new Set(["failed", "error", "manual_review", "timeout", "cancelled", "canceled"]);
const DISABLED_STATUSES = new Set(["disabled", "cooldown", "warning", "consumed", "expired", "stopped"]);

export function normalizeFailoverStatus(status?: string | null) {
  return String(status || "").trim().toLowerCase();
}

export function getPublicFailoverStatusTone(status?: string | null): PublicFailoverTone {
  const normalized = normalizeFailoverStatus(status);
  if (SUCCESS_STATUSES.has(normalized) || HEALTHY_STATUSES.has(normalized)) return "green";
  if (PROCESSING_STATUSES.has(normalized)) return "blue";
  if (FAILED_STATUSES.has(normalized)) return "red";
  if (DISABLED_STATUSES.has(normalized)) return "amber";
  return "gray";
}

export function getPublicFailoverStatusLabel(t: TFunction, status?: string | null) {
  const normalized = normalizeFailoverStatus(status);
  if (!normalized || normalized === "unknown") {
    return t("common.unknown", { defaultValue: "未知" });
  }
  if (SUCCESS_STATUSES.has(normalized)) {
    return t("common.completed", { defaultValue: "已完成" });
  }
  if (HEALTHY_STATUSES.has(normalized)) {
    return t("common.normal", { defaultValue: "正常" });
  }
  if (PROCESSING_STATUSES.has(normalized)) {
    return t("common.processing", { defaultValue: "处理中" });
  }
  if (FAILED_STATUSES.has(normalized)) {
    return t("common.exception", { defaultValue: "异常" });
  }
  if (DISABLED_STATUSES.has(normalized)) {
    return t("common.disabled", { defaultValue: "停用" });
  }
  return t("common.unknown", { defaultValue: "未知" });
}

export function getPublicFailoverResultText(
  t: TFunction,
  status?: string | null,
  errorMessage?: string | null,
) {
  const normalized = normalizeFailoverStatus(status);
  if (errorMessage || FAILED_STATUSES.has(normalized)) {
    return t("failover.public_result.needs_admin", {
      defaultValue: "本次处理未完成，请联系管理员处理。",
    });
  }
  if (PROCESSING_STATUSES.has(normalized)) {
    return t("failover.public_result.processing", {
      defaultValue: "正在处理，请稍后刷新查看最新状态。",
    });
  }
  if (SUCCESS_STATUSES.has(normalized)) {
    return t("failover.public_result.completed", {
      defaultValue: "处理完成。",
    });
  }
  return "-";
}

import { formatApiErrorMessage } from "@/lib/apiErrorMessage";

export class FailoverApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(formatApiErrorMessage(message, { status }));
    this.name = "FailoverApiError";
    this.status = status;
  }
}

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export type FailoverProbe = {
  status: string;
  target: string;
  latency: number;
  message: string;
  checked_at: string | null;
  report_updated_at: string | null;
  consecutive_failures: number;
  stale: boolean;
};

export type FailoverPlan = {
  id: number;
  task_id: number;
  name: string;
  priority: number;
  enabled: boolean;
  provider: string;
  provider_entry_id: string;
  provider_entry_group: string;
  action_type: string;
  payload: unknown;
  auto_connect_group: string;
  script_clipboard_id: number | null;
  script_clipboard_ids: number[];
  script_timeout_sec: number;
  wait_agent_timeout_sec: number;
  created_at: string;
  updated_at: string;
};

export type FailoverExecutionSummary = {
  id: number;
  status: string;
  trigger_reason: string;
  selected_plan_id: number | null;
  attempted_plans: unknown;
  script_name_snapshot: string;
  script_status: string;
  script_exit_code: number | null;
  script_output_truncated: boolean;
  dns_status: string;
  dns_result: unknown;
  cleanup_status: string;
  cleanup_result: unknown;
  last_step: FailoverExecutionStep | null;
  error_message: string;
  started_at: string;
  finished_at: string | null;
};

export type FailoverTask = {
  id: number;
  name: string;
  enabled: boolean;
  current_client_uuid: string;
  current_address: string;
  watch_client_uuid: string;
  trigger_source: string;
  trigger_failure_count: number;
  failure_threshold: number;
  stale_after_seconds: number;
  cooldown_seconds: number;
  provision_retry_limit: number;
  provision_failure_fallback_limit: number;
  dns_provider: string;
  dns_entry_id: string;
  dns_payload: unknown;
  delete_strategy: string;
  delete_delay_seconds: number;
  last_execution_id: number | null;
  last_status: string;
  last_message: string;
  last_triggered_at: string | null;
  last_succeeded_at: string | null;
  last_failed_at: string | null;
  probe: FailoverProbe;
  cooldown_remaining_seconds: number;
  next_eligible_at: string | null;
  next_monitor_check_at: string | null;
  next_monitor_check_remaining_seconds: number;
  next_scheduled_check_at: string | null;
  next_scheduled_check_remaining_seconds: number;
  latest_execution: FailoverExecutionSummary | null;
  has_active_execution: boolean;
  plans: FailoverPlan[];
  created_at: string;
  updated_at: string;
};

export type FailoverShareAccessPolicy = "public" | "single_use";

export type FailoverShareStatus = "not_shared" | "active" | "expired" | "consumed";

export type FailoverShareRecord = {
  token: string;
  task_id: number;
  task_name: string;
  title: string;
  note: string;
  access_policy: FailoverShareAccessPolicy;
  status: FailoverShareStatus;
  expires_at: string;
  last_accessed_at: string;
  consumed_at: string;
  access_count: number;
  is_expired: boolean;
  is_consumed: boolean;
  created_at: string;
  updated_at: string;
};

export type SaveFailoverShareInput = {
  title: string;
  note: string;
  access_policy: FailoverShareAccessPolicy;
  expires_at: string | null;
};

export type FailoverPublicTask = FailoverTask & {
  recent_executions: FailoverExecutionSummary[];
};

export type FailoverPublicShareData = {
  token: string;
  title: string;
  note: string;
  access_policy: FailoverShareAccessPolicy;
  expires_at: string;
  created_at: string;
  updated_at: string;
  generated_at: string;
  task: FailoverPublicTask;
};

export type FailoverExecutionStep = {
  id: number;
  execution_id: number;
  sort: number;
  step_key: string;
  step_label: string;
  status: string;
  message: string;
  detail: unknown;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FailoverExecutionAvailableAction = {
  available: boolean;
  reason: string;
};

export type FailoverExecutionAvailableActions = {
  retry_dns: FailoverExecutionAvailableAction;
  retry_cleanup: FailoverExecutionAvailableAction;
};

export type FailoverExecution = {
  id: number;
  task_id: number;
  status: string;
  trigger_reason: string;
  watch_client_uuid: string;
  trigger_snapshot: unknown;
  selected_plan_id: number | null;
  attempted_plans: unknown;
  old_client_uuid: string;
  old_instance_ref: unknown;
  old_addresses: unknown;
  new_client_uuid: string;
  new_instance_ref: unknown;
  new_addresses: unknown;
  script_clipboard_id: number | null;
  script_clipboard_ids: number[];
  script_name_snapshot: string;
  script_task_id: string;
  script_status: string;
  script_exit_code: number | null;
  script_finished_at: string | null;
  script_output: string;
  script_output_truncated: boolean;
  dns_provider: string;
  dns_status: string;
  dns_result: unknown;
  cleanup_status: string;
  cleanup_result: unknown;
  available_actions: FailoverExecutionAvailableActions | null;
  error_message: string;
  started_at: string;
  finished_at: string | null;
  steps: FailoverExecutionStep[];
  created_at: string;
  updated_at: string;
};

export type FailoverPreviewCheck = {
  key: string;
  status: string;
  title: string;
  message: string;
  detail: unknown;
};

export type FailoverPreviewPlan = {
  index: number;
  name: string;
  provider: string;
  action_type: string;
  provider_entry_id: string;
  provider_entry_group: string;
  checks: FailoverPreviewCheck[];
};

export type FailoverTaskPreview = {
  success: boolean;
  generated_at: string | null;
  checks: FailoverPreviewCheck[];
  plans: FailoverPreviewPlan[];
};

export type FailoverTaskInput = {
  name: string;
  enabled: boolean;
  current_client_uuid?: string;
  failure_threshold: number;
  stale_after_seconds: number;
  cooldown_seconds: number;
  provision_retry_limit: number;
  provision_failure_fallback_limit: number;
  dns_provider: string;
  dns_entry_id: string;
  dns_payload: unknown;
  delete_strategy: string;
  delete_delay_seconds: number;
  plans: FailoverPlanInput[];
};

export type FailoverPlanInput = {
  name: string;
  priority: number;
  enabled: boolean;
  provider: string;
  provider_entry_id: string;
  provider_entry_group: string;
  action_type: string;
  payload: unknown;
  auto_connect_group: string;
  script_clipboard_id?: number | null;
  script_clipboard_ids?: number[];
  script_timeout_sec: number;
  wait_agent_timeout_sec: number;
};

export type FailoverNodeOption = {
  uuid: string;
  name: string;
  group: string;
  ipv4: string;
  ipv6: string;
};

export type FailoverScriptOption = {
  id: number;
  name: string;
  remark: string;
  weight: number;
  updated_at: string;
};

export type FailoverDnsCatalogDefaults = {
  zone_id: string;
  zone_name: string;
  domain_name: string;
  proxied: boolean | null;
};

export type FailoverDnsRecordOption = {
  id: string;
  name: string;
  type: string;
  value: string;
  ttl: number;
  zone_id: string;
  zone_name: string;
  domain_name: string;
  rr: string;
  line: string;
  lines: string[];
  proxied: boolean | null;
};

export type FailoverDnsOption = {
  value: string;
  label: string;
};

export type FailoverDnsCatalog = {
  provider: string;
  defaults: FailoverDnsCatalogDefaults;
  zones: FailoverDnsOption[];
  domains: FailoverDnsOption[];
  records: FailoverDnsRecordOption[];
  lines: FailoverDnsOption[];
  ttls: FailoverDnsOption[];
};

export type FailoverCatalogOption = {
  value: string;
  label: string;
  hint: string;
};

export type FailoverPlanCatalog = {
  provider: string;
  action_type: string;
  service: string;
  region: string;
  regions: FailoverCatalogOption[];
  instances: FailoverCatalogOption[];
  availability_zones: FailoverCatalogOption[];
  images: FailoverCatalogOption[];
  instance_types: FailoverCatalogOption[];
  key_pairs: FailoverCatalogOption[];
  subnets: FailoverCatalogOption[];
  security_groups: FailoverCatalogOption[];
  bundles: FailoverCatalogOption[];
  blueprints: FailoverCatalogOption[];
  sizes: FailoverCatalogOption[];
  types: FailoverCatalogOption[];
};

const ACTIVE_EXECUTION_STATUSES = new Set([
  "queued",
  "detecting",
  "provisioning",
  "rebinding_ip",
  "waiting_agent",
  "running_script",
  "switching_dns",
  "cleaning_old",
]);

function normalizeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeNumberArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry) && entry > 0);
  return Array.from(new Set(normalized));
}

function normalizeBoolean(value: unknown) {
  return Boolean(value);
}

function normalizeUnknown(value: unknown) {
  return value ?? null;
}

function normalizeNullableString(value: unknown) {
  const normalized = normalizeString(value).trim();
  return normalized ? normalized : null;
}

function normalizeNullableBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function normalizeShareAccessPolicy(value: unknown): FailoverShareAccessPolicy {
  return normalizeString(value).trim() === "single_use" ? "single_use" : "public";
}

function normalizeShareStatus(value: unknown): FailoverShareStatus {
  const status = normalizeString(value).trim();
  if (status === "active" || status === "expired" || status === "consumed") {
    return status;
  }
  return "not_shared";
}

function normalizeProbe(probe: unknown): FailoverProbe {
  const raw = probe && typeof probe === "object" ? probe as Record<string, unknown> : {};
  return {
    status: normalizeString(raw.status) || "unavailable",
    target: normalizeString(raw.target),
    latency: normalizeNumber(raw.latency),
    message: normalizeString(raw.message),
    checked_at: normalizeNullableString(raw.checked_at),
    report_updated_at: normalizeNullableString(raw.report_updated_at),
    consecutive_failures: normalizeNumber(raw.consecutive_failures),
    stale: normalizeBoolean(raw.stale),
  };
}

function normalizePlan(plan: unknown): FailoverPlan {
  const raw = plan && typeof plan === "object" ? plan as Record<string, unknown> : {};
  const scriptClipboardID = normalizeNullableNumber(raw.script_clipboard_id);
  const scriptClipboardIDs = normalizeNumberArray(raw.script_clipboard_ids);
  return {
    id: normalizeNumber(raw.id),
    task_id: normalizeNumber(raw.task_id),
    name: normalizeString(raw.name),
    priority: normalizeNumber(raw.priority),
    enabled: normalizeBoolean(raw.enabled),
    provider: normalizeString(raw.provider),
    provider_entry_id: normalizeString(raw.provider_entry_id),
    provider_entry_group: normalizeString(raw.provider_entry_group),
    action_type: normalizeString(raw.action_type),
    payload: normalizeUnknown(raw.payload),
    auto_connect_group: normalizeString(raw.auto_connect_group),
    script_clipboard_id: scriptClipboardID,
    script_clipboard_ids: scriptClipboardIDs.length > 0
      ? scriptClipboardIDs
      : scriptClipboardID !== null
        ? [scriptClipboardID]
        : [],
    script_timeout_sec: normalizeNumber(raw.script_timeout_sec),
    wait_agent_timeout_sec: normalizeNumber(raw.wait_agent_timeout_sec),
    created_at: normalizeString(raw.created_at),
    updated_at: normalizeString(raw.updated_at),
  };
}

function normalizeExecutionSummary(execution: unknown): FailoverExecutionSummary | null {
  if (!execution || typeof execution !== "object") {
    return null;
  }

  const raw = execution as Record<string, unknown>;
  return {
    id: normalizeNumber(raw.id),
    status: normalizeString(raw.status),
    trigger_reason: normalizeString(raw.trigger_reason),
    selected_plan_id: normalizeNullableNumber(raw.selected_plan_id),
    attempted_plans: normalizeUnknown(raw.attempted_plans),
    script_name_snapshot: normalizeString(raw.script_name_snapshot),
    script_status: normalizeString(raw.script_status),
    script_exit_code: normalizeNullableNumber(raw.script_exit_code),
    script_output_truncated: normalizeBoolean(raw.script_output_truncated),
    dns_status: normalizeString(raw.dns_status),
    dns_result: normalizeUnknown(raw.dns_result),
    cleanup_status: normalizeString(raw.cleanup_status),
    cleanup_result: normalizeUnknown(raw.cleanup_result),
    last_step: raw.last_step ? normalizeExecutionStep(raw.last_step) : null,
    error_message: normalizeString(raw.error_message),
    started_at: normalizeString(raw.started_at),
    finished_at: normalizeNullableString(raw.finished_at),
  };
}

function normalizeExecutionStep(step: unknown): FailoverExecutionStep {
  const raw = step && typeof step === "object" ? step as Record<string, unknown> : {};
  return {
    id: normalizeNumber(raw.id),
    execution_id: normalizeNumber(raw.execution_id),
    sort: normalizeNumber(raw.sort),
    step_key: normalizeString(raw.step_key),
    step_label: normalizeString(raw.step_label),
    status: normalizeString(raw.status),
    message: normalizeString(raw.message),
    detail: normalizeUnknown(raw.detail),
    started_at: normalizeNullableString(raw.started_at),
    finished_at: normalizeNullableString(raw.finished_at),
    created_at: normalizeString(raw.created_at),
    updated_at: normalizeString(raw.updated_at),
  };
}

function normalizeExecutionAvailableAction(value: unknown): FailoverExecutionAvailableAction {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    available: normalizeBoolean(raw.available),
    reason: normalizeString(raw.reason),
  };
}

function normalizeExecutionAvailableActions(value: unknown): FailoverExecutionAvailableActions | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Record<string, unknown>;
  return {
    retry_dns: normalizeExecutionAvailableAction(raw.retry_dns),
    retry_cleanup: normalizeExecutionAvailableAction(raw.retry_cleanup),
  };
}

function normalizePreviewCheck(check: unknown): FailoverPreviewCheck {
  const raw = check && typeof check === "object" ? check as Record<string, unknown> : {};
  return {
    key: normalizeString(raw.key),
    status: normalizeString(raw.status),
    title: normalizeString(raw.title),
    message: normalizeString(raw.message),
    detail: normalizeUnknown(raw.detail),
  };
}

function normalizePreviewPlan(plan: unknown): FailoverPreviewPlan {
  const raw = plan && typeof plan === "object" ? plan as Record<string, unknown> : {};
  const checks = Array.isArray(raw.checks) ? raw.checks.map(normalizePreviewCheck) : [];
  return {
    index: normalizeNumber(raw.index),
    name: normalizeString(raw.name),
    provider: normalizeString(raw.provider),
    action_type: normalizeString(raw.action_type),
    provider_entry_id: normalizeString(raw.provider_entry_id),
    provider_entry_group: normalizeString(raw.provider_entry_group),
    checks,
  };
}

function normalizeTaskPreview(preview: unknown): FailoverTaskPreview {
  const raw = preview && typeof preview === "object" ? preview as Record<string, unknown> : {};
  return {
    success: normalizeBoolean(raw.success),
    generated_at: normalizeNullableString(raw.generated_at),
    checks: Array.isArray(raw.checks) ? raw.checks.map(normalizePreviewCheck) : [],
    plans: Array.isArray(raw.plans) ? raw.plans.map(normalizePreviewPlan) : [],
  };
}

function normalizeTask(task: unknown): FailoverTask {
  const raw = task && typeof task === "object" ? task as Record<string, unknown> : {};
  const plans = Array.isArray(raw.plans) ? raw.plans.map(normalizePlan) : [];
  return {
    id: normalizeNumber(raw.id),
    name: normalizeString(raw.name),
    enabled: normalizeBoolean(raw.enabled),
    current_client_uuid: normalizeString(raw.current_client_uuid) || normalizeString(raw.watch_client_uuid),
    current_address: normalizeString(raw.current_address),
    watch_client_uuid: normalizeString(raw.watch_client_uuid),
    trigger_source: normalizeString(raw.trigger_source),
    trigger_failure_count: normalizeNumber(raw.trigger_failure_count),
    failure_threshold: normalizeNumber(raw.failure_threshold),
    stale_after_seconds: normalizeNumber(raw.stale_after_seconds),
    cooldown_seconds: normalizeNumber(raw.cooldown_seconds),
    provision_retry_limit: normalizeNumber(raw.provision_retry_limit),
    provision_failure_fallback_limit: normalizeNumber(raw.provision_failure_fallback_limit),
    dns_provider: normalizeString(raw.dns_provider),
    dns_entry_id: normalizeString(raw.dns_entry_id),
    dns_payload: normalizeUnknown(raw.dns_payload),
    delete_strategy: normalizeString(raw.delete_strategy),
    delete_delay_seconds: normalizeNumber(raw.delete_delay_seconds),
    last_execution_id: normalizeNullableNumber(raw.last_execution_id),
    last_status: normalizeString(raw.last_status),
    last_message: normalizeString(raw.last_message),
    last_triggered_at: normalizeNullableString(raw.last_triggered_at),
    last_succeeded_at: normalizeNullableString(raw.last_succeeded_at),
    last_failed_at: normalizeNullableString(raw.last_failed_at),
    probe: normalizeProbe(raw.probe),
    cooldown_remaining_seconds: normalizeNumber(raw.cooldown_remaining_seconds),
    next_eligible_at: normalizeNullableString(raw.next_eligible_at),
    next_monitor_check_at: normalizeNullableString(raw.next_monitor_check_at),
    next_monitor_check_remaining_seconds: normalizeNumber(raw.next_monitor_check_remaining_seconds),
    next_scheduled_check_at: normalizeNullableString(raw.next_scheduled_check_at),
    next_scheduled_check_remaining_seconds: normalizeNumber(raw.next_scheduled_check_remaining_seconds),
    latest_execution: normalizeExecutionSummary(raw.latest_execution),
    has_active_execution: normalizeBoolean(raw.has_active_execution),
    plans,
    created_at: normalizeString(raw.created_at),
    updated_at: normalizeString(raw.updated_at),
  };
}

function normalizeShareRecord(share: unknown): FailoverShareRecord {
  const raw = share && typeof share === "object" ? share as Record<string, unknown> : {};
  return {
    token: normalizeString(raw.token),
    task_id: normalizeNumber(raw.task_id),
    task_name: normalizeString(raw.task_name),
    title: normalizeString(raw.title),
    note: normalizeString(raw.note),
    access_policy: normalizeShareAccessPolicy(raw.access_policy),
    status: normalizeShareStatus(raw.status),
    expires_at: normalizeString(raw.expires_at),
    last_accessed_at: normalizeString(raw.last_accessed_at),
    consumed_at: normalizeString(raw.consumed_at),
    access_count: normalizeNumber(raw.access_count),
    is_expired: normalizeBoolean(raw.is_expired),
    is_consumed: normalizeBoolean(raw.is_consumed),
    created_at: normalizeString(raw.created_at),
    updated_at: normalizeString(raw.updated_at),
  };
}

function normalizePublicTask(task: unknown): FailoverPublicTask {
  const raw = task && typeof task === "object" ? task as Record<string, unknown> : {};
  return {
    ...normalizeTask(raw),
    recent_executions: Array.isArray(raw.recent_executions)
      ? raw.recent_executions
        .map((item) => normalizeExecutionSummary(item))
        .filter((item): item is FailoverExecutionSummary => Boolean(item))
      : [],
  };
}

function normalizePublicShareData(share: unknown): FailoverPublicShareData {
  const raw = share && typeof share === "object" ? share as Record<string, unknown> : {};
  return {
    token: normalizeString(raw.token),
    title: normalizeString(raw.title),
    note: normalizeString(raw.note),
    access_policy: normalizeShareAccessPolicy(raw.access_policy),
    expires_at: normalizeString(raw.expires_at),
    created_at: normalizeString(raw.created_at),
    updated_at: normalizeString(raw.updated_at),
    generated_at: normalizeString(raw.generated_at),
    task: normalizePublicTask(raw.task),
  };
}

export function buildFailoverShareUrl(token: string) {
  return `${window.location.origin}/failover-v1/share/${token}`;
}

export function toFailoverShareDateTimeLocalValue(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function fromFailoverShareDateTimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizeDnsCatalogDefaults(value: unknown): FailoverDnsCatalogDefaults {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    zone_id: normalizeString(raw.zone_id),
    zone_name: normalizeString(raw.zone_name),
    domain_name: normalizeString(raw.domain_name),
    proxied: normalizeNullableBoolean(raw.proxied),
  };
}

function normalizeDnsRecord(value: unknown): FailoverDnsRecordOption {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    id: normalizeString(raw.id),
    name: normalizeString(raw.name),
    type: normalizeString(raw.type),
    value: normalizeString(raw.value),
    ttl: normalizeNumber(raw.ttl),
    zone_id: normalizeString(raw.zone_id),
    zone_name: normalizeString(raw.zone_name),
    domain_name: normalizeString(raw.domain_name),
    rr: normalizeString(raw.rr),
    line: normalizeString(raw.line),
    lines: Array.isArray(raw.lines) ? raw.lines.map(normalizeString).filter(Boolean) : [],
    proxied: normalizeNullableBoolean(raw.proxied),
  };
}

function normalizeDnsOption(value: unknown): FailoverDnsOption {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    value: normalizeString(raw.value),
    label: normalizeString(raw.label),
  };
}

function normalizeDnsCatalog(value: unknown): FailoverDnsCatalog {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    provider: normalizeString(raw.provider),
    defaults: normalizeDnsCatalogDefaults(raw.defaults),
    zones: Array.isArray(raw.zones) ? raw.zones.map(normalizeDnsOption) : [],
    domains: Array.isArray(raw.domains) ? raw.domains.map(normalizeDnsOption) : [],
    records: Array.isArray(raw.records) ? raw.records.map(normalizeDnsRecord) : [],
    lines: Array.isArray(raw.lines) ? raw.lines.map(normalizeDnsOption) : [],
    ttls: Array.isArray(raw.ttls) ? raw.ttls.map(normalizeDnsOption) : [],
  };
}

function normalizeCatalogOption(value: unknown): FailoverCatalogOption {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    value: normalizeString(raw.value),
    label: normalizeString(raw.label),
    hint: normalizeString(raw.hint),
  };
}

function normalizePlanCatalog(value: unknown): FailoverPlanCatalog {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    provider: normalizeString(raw.provider),
    action_type: normalizeString(raw.action_type),
    service: normalizeString(raw.service),
    region: normalizeString(raw.region),
    regions: Array.isArray(raw.regions) ? raw.regions.map(normalizeCatalogOption) : [],
    instances: Array.isArray(raw.instances) ? raw.instances.map(normalizeCatalogOption) : [],
    availability_zones: Array.isArray(raw.availability_zones) ? raw.availability_zones.map(normalizeCatalogOption) : [],
    images: Array.isArray(raw.images) ? raw.images.map(normalizeCatalogOption) : [],
    instance_types: Array.isArray(raw.instance_types) ? raw.instance_types.map(normalizeCatalogOption) : [],
    key_pairs: Array.isArray(raw.key_pairs) ? raw.key_pairs.map(normalizeCatalogOption) : [],
    subnets: Array.isArray(raw.subnets) ? raw.subnets.map(normalizeCatalogOption) : [],
    security_groups: Array.isArray(raw.security_groups) ? raw.security_groups.map(normalizeCatalogOption) : [],
    bundles: Array.isArray(raw.bundles) ? raw.bundles.map(normalizeCatalogOption) : [],
    blueprints: Array.isArray(raw.blueprints) ? raw.blueprints.map(normalizeCatalogOption) : [],
    sizes: Array.isArray(raw.sizes) ? raw.sizes.map(normalizeCatalogOption) : [],
    types: Array.isArray(raw.types) ? raw.types.map(normalizeCatalogOption) : [],
  };
}

function normalizeExecution(execution: unknown): FailoverExecution {
  const raw = execution && typeof execution === "object" ? execution as Record<string, unknown> : {};
  const steps = Array.isArray(raw.steps) ? raw.steps.map(normalizeExecutionStep) : [];
  const scriptClipboardID = normalizeNullableNumber(raw.script_clipboard_id);
  const scriptClipboardIDs = normalizeNumberArray(raw.script_clipboard_ids);
  return {
    id: normalizeNumber(raw.id),
    task_id: normalizeNumber(raw.task_id),
    status: normalizeString(raw.status),
    trigger_reason: normalizeString(raw.trigger_reason),
    watch_client_uuid: normalizeString(raw.watch_client_uuid),
    trigger_snapshot: normalizeUnknown(raw.trigger_snapshot),
    selected_plan_id: normalizeNullableNumber(raw.selected_plan_id),
    attempted_plans: normalizeUnknown(raw.attempted_plans),
    old_client_uuid: normalizeString(raw.old_client_uuid),
    old_instance_ref: normalizeUnknown(raw.old_instance_ref),
    old_addresses: normalizeUnknown(raw.old_addresses),
    new_client_uuid: normalizeString(raw.new_client_uuid),
    new_instance_ref: normalizeUnknown(raw.new_instance_ref),
    new_addresses: normalizeUnknown(raw.new_addresses),
    script_clipboard_id: scriptClipboardID,
    script_clipboard_ids: scriptClipboardIDs.length > 0
      ? scriptClipboardIDs
      : scriptClipboardID !== null
        ? [scriptClipboardID]
        : [],
    script_name_snapshot: normalizeString(raw.script_name_snapshot),
    script_task_id: normalizeString(raw.script_task_id),
    script_status: normalizeString(raw.script_status),
    script_exit_code: normalizeNullableNumber(raw.script_exit_code),
    script_finished_at: normalizeNullableString(raw.script_finished_at),
    script_output: normalizeString(raw.script_output),
    script_output_truncated: normalizeBoolean(raw.script_output_truncated),
    dns_provider: normalizeString(raw.dns_provider),
    dns_status: normalizeString(raw.dns_status),
    dns_result: normalizeUnknown(raw.dns_result),
    cleanup_status: normalizeString(raw.cleanup_status),
    cleanup_result: normalizeUnknown(raw.cleanup_result),
    available_actions: normalizeExecutionAvailableActions(raw.available_actions),
    error_message: normalizeString(raw.error_message),
    started_at: normalizeString(raw.started_at),
    finished_at: normalizeNullableString(raw.finished_at),
    steps,
    created_at: normalizeString(raw.created_at),
    updated_at: normalizeString(raw.updated_at),
  };
}

const FAILOVER_REQUEST_TIMEOUT_MS = 30_000;

async function requestEnvelope<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const requestUrl =
    method === "GET"
      ? `${path}${path.includes("?") ? "&" : "?"}__ts=${Date.now()}`
      : path;

  const controller = new AbortController();
  const timeoutID = setTimeout(() => controller.abort(), FAILOVER_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, max-age=0",
        Pragma: "no-cache",
        "X-Requested-With": "XMLHttpRequest",
        ...(init?.headers || {}),
      },
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new FailoverApiError(`Request timed out while loading ${path}`, 408);
    }
    throw error;
  } finally {
    clearTimeout(timeoutID);
  }

  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  const trimmed = text.trim();
  let payload: ApiEnvelope<T> | null = null;

  if (trimmed) {
    const looksLikeJson =
      contentType.includes("application/json")
      || trimmed.startsWith("{")
      || trimmed.startsWith("[");

    if (!looksLikeJson) {
      throw new FailoverApiError(
        `Expected JSON from ${path}, but received an unexpected response.`,
        response.status,
      );
    }

    try {
      payload = JSON.parse(trimmed) as ApiEnvelope<T>;
    } catch {
      throw new FailoverApiError(`Invalid JSON response from ${path}`, response.status);
    }
  }

  if (!response.ok || payload?.status === "error") {
    throw new FailoverApiError(
      payload?.message || `HTTP ${response.status}`,
      response.status,
    );
  }

  return payload?.data as T;
}

async function requestRaw<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeoutID = setTimeout(() => controller.abort(), FAILOVER_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${path}${path.includes("?") ? "&" : "?"}__ts=${Date.now()}`, {
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, max-age=0",
        Pragma: "no-cache",
        "X-Requested-With": "XMLHttpRequest",
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new FailoverApiError(`Request timed out while loading ${path}`, 408);
    }
    throw error;
  } finally {
    clearTimeout(timeoutID);
  }

  const text = await response.text();
  if (!response.ok) {
    throw new FailoverApiError(text || `HTTP ${response.status}`, response.status);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new FailoverApiError(`Invalid JSON response from ${path}`, response.status);
  }
}

export function isFailoverExecutionActive(status: string) {
  return ACTIVE_EXECUTION_STATUSES.has(String(status || "").trim());
}

export function normalizeProviderEntryID(value: string) {
  return value === "legacy-default" ? "default" : value;
}

export async function getFailoverTasks(): Promise<FailoverTask[]> {
  const data = await requestEnvelope<unknown[]>("/api/admin/failover/tasks");
  return Array.isArray(data) ? data.map(normalizeTask) : [];
}

export async function getFailoverTask(taskID: number): Promise<FailoverTask> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover/tasks/${taskID}`);
  return normalizeTask(data);
}

export async function getFailoverShare(taskID: number): Promise<FailoverShareRecord> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover/tasks/${taskID}/share`);
  return normalizeShareRecord(data);
}

export async function saveFailoverShare(taskID: number, input: SaveFailoverShareInput): Promise<FailoverShareRecord> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover/tasks/${taskID}/share`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return normalizeShareRecord(data);
}

export async function deleteFailoverShare(taskID: number): Promise<void> {
  await requestEnvelope(`/api/admin/failover/tasks/${taskID}/share`, {
    method: "DELETE",
  });
}

export async function createFailoverTask(input: FailoverTaskInput): Promise<FailoverTask> {
  const data = await requestEnvelope<unknown>("/api/admin/failover/tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return normalizeTask(data);
}

export async function previewFailoverTask(input: FailoverTaskInput): Promise<FailoverTaskPreview> {
  const data = await requestEnvelope<unknown>("/api/admin/failover/tasks/preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return normalizeTaskPreview(data);
}

export async function updateFailoverTask(taskID: number, input: FailoverTaskInput): Promise<FailoverTask> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover/tasks/${taskID}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return normalizeTask(data);
}

export async function toggleFailoverTask(taskID: number, enabled: boolean): Promise<FailoverTask> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover/tasks/${taskID}/toggle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ enabled }),
  });
  return normalizeTask(data);
}

export async function deleteFailoverTask(taskID: number): Promise<void> {
  await requestEnvelope(`/api/admin/failover/tasks/${taskID}/remove`, {
    method: "POST",
  });
}

export async function runFailoverTask(taskID: number): Promise<FailoverExecutionSummary> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover/tasks/${taskID}/run`, {
    method: "POST",
  });
  const execution = normalizeExecutionSummary(data);
  if (!execution) {
    throw new FailoverApiError("Failover execution response is empty", 500);
  }
  return execution;
}

export async function stopFailoverExecution(executionID: number): Promise<FailoverExecution> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover/executions/${executionID}/stop`, {
    method: "POST",
  });
  return normalizeExecution(data);
}

export async function retryFailoverExecutionDNS(executionID: number): Promise<FailoverExecution> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover/executions/${executionID}/retry-dns`, {
    method: "POST",
  });
  return normalizeExecution(data);
}

export async function retryFailoverExecutionCleanup(executionID: number): Promise<FailoverExecution> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover/executions/${executionID}/retry-cleanup`, {
    method: "POST",
  });
  return normalizeExecution(data);
}

export async function getFailoverExecutions(taskID: number, limit = 20): Promise<FailoverExecutionSummary[]> {
  const data = await requestEnvelope<unknown[]>(`/api/admin/failover/tasks/${taskID}/executions?limit=${limit}`);
  return Array.isArray(data)
    ? data.map((item) => normalizeExecutionSummary(item)).filter((item): item is FailoverExecutionSummary => Boolean(item))
    : [];
}

export async function getFailoverExecution(executionID: number): Promise<FailoverExecution> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover/executions/${executionID}`);
  return normalizeExecution(data);
}

export async function getPublicFailoverShare(token: string): Promise<FailoverPublicShareData> {
  const data = await requestEnvelope<unknown>(`/api/public/failover/shares/${encodeURIComponent(token)}`);
  return normalizePublicShareData(data);
}

export async function getFailoverDnsCatalog(args: {
  provider: string;
  entry_id: string;
  zone_name?: string;
  domain_name?: string;
}): Promise<FailoverDnsCatalog> {
  const params = new URLSearchParams();
  params.set("provider", args.provider);
  params.set("entry_id", args.entry_id);
  if (args.zone_name) {
    params.set("zone_name", args.zone_name);
  }
  if (args.domain_name) {
    params.set("domain_name", args.domain_name);
  }

  const data = await requestEnvelope<unknown>(`/api/admin/failover/dns/catalog?${params.toString()}`);
  return normalizeDnsCatalog(data);
}

export async function getFailoverPlanCatalog(args: {
  provider: string;
  entry_id?: string;
  entry_group?: string;
  action_type?: string;
  service?: string;
  region?: string;
  mode?: "regions" | "full";
}): Promise<FailoverPlanCatalog> {
  const params = new URLSearchParams();
  params.set("provider", args.provider);
  if (args.entry_id) {
    params.set("entry_id", args.entry_id);
  }
  if (args.entry_group) {
    params.set("entry_group", args.entry_group);
  }
  if (args.action_type) {
    params.set("action_type", args.action_type);
  }
  if (args.service) {
    params.set("service", args.service);
  }
  if (args.region) {
    params.set("region", args.region);
  }
  if (args.mode) {
    params.set("mode", args.mode);
  }

  const data = await requestEnvelope<unknown>(`/api/admin/failover/plans/catalog?${params.toString()}`);
  return normalizePlanCatalog(data);
}

export async function getFailoverNodes(): Promise<FailoverNodeOption[]> {
  const data = await requestRaw<unknown[]>("/api/admin/client/list");
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item) => {
    const raw = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      uuid: normalizeString(raw.uuid),
      name: normalizeString(raw.name),
      group: normalizeString(raw.group),
      ipv4: normalizeString(raw.ipv4),
      ipv6: normalizeString(raw.ipv6),
    };
  }).filter((item) => item.uuid);
}

export async function getFailoverScripts(): Promise<FailoverScriptOption[]> {
  const data = await requestEnvelope<unknown[]>("/api/admin/clipboard");
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item) => {
    const raw = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      id: normalizeNumber(raw.id),
      name: normalizeString(raw.name),
      remark: normalizeString(raw.remark),
      weight: normalizeNumber(raw.weight),
      updated_at: normalizeString(raw.updated_at),
    };
  }).filter((item) => item.id > 0);
}

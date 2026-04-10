type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export class FailoverV2ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "FailoverV2ApiError";
    this.status = status;
  }
}

export type FailoverV2MemberMode = "existing_client" | "provider_template";

export type FailoverV2ServiceInput = {
  name: string;
  enabled: boolean;
  dns_provider: string;
  dns_entry_id: string;
  dns_payload: unknown;
  script_clipboard_ids: number[];
  script_timeout_sec: number;
  wait_agent_timeout_sec: number;
  delete_strategy: string;
  delete_delay_seconds: number;
};

export type FailoverV2ValidationCheck = {
  key: string;
  label: string;
  status: string;
  message: string;
};

export type FailoverV2ValidationResult = {
  ok: boolean;
  checks: FailoverV2ValidationCheck[];
};

export type FailoverV2ServiceValidationResult = {
  service_id: number;
  service_name: string;
  enabled: boolean;
  ok: boolean;
  checks: FailoverV2ValidationCheck[];
};

export type FailoverV2BulkValidationResult = {
  ok: boolean;
  checked: number;
  failed: number;
  warnings: number;
  services: FailoverV2ServiceValidationResult[];
};

export type FailoverV2MemberInput = {
  name: string;
  enabled: boolean;
  priority: number;
  mode: FailoverV2MemberMode;
  watch_client_uuid: string;
  dns_lines: string[];
  dns_line: string;
  dns_record_refs?: unknown;
  current_address?: string;
  current_instance_ref?: unknown;
  provider: string;
  provider_entry_id: string;
  provider_entry_group: string;
  plan_payload: unknown;
  failure_threshold: number;
  stale_after_seconds: number;
  cooldown_seconds: number;
};

export type FailoverV2MemberLine = {
  line_code: string;
  dns_record_refs: unknown;
};

export type FailoverV2Member = {
  id: number;
  service_id: number;
  name: string;
  enabled: boolean;
  priority: number;
  mode: FailoverV2MemberMode;
  watch_client_uuid: string;
  dns_lines: string[];
  lines: FailoverV2MemberLine[];
  dns_line: string;
  dns_record_refs: unknown;
  current_address: string;
  current_instance_ref: unknown;
  provider: string;
  provider_entry_id: string;
  provider_entry_group: string;
  plan_payload: unknown;
  failure_threshold: number;
  stale_after_seconds: number;
  cooldown_seconds: number;
  trigger_failure_count: number;
  last_execution_id: number | null;
  last_status: string;
  last_message: string;
  last_triggered_at: string | null;
  last_succeeded_at: string | null;
  last_failed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FailoverV2ExecutionSummary = {
  id: number;
  service_id: number;
  member_id: number;
  status: string;
  trigger_reason: string;
  trigger_snapshot: unknown;
  old_client_uuid: string;
  old_instance_ref: unknown;
  old_addresses: unknown;
  detach_dns_status: string;
  detach_dns_result: unknown;
  new_client_uuid: string;
  new_instance_ref: unknown;
  new_addresses: unknown;
  attach_dns_status: string;
  attach_dns_result: unknown;
  cleanup_status: string;
  cleanup_result: unknown;
  error_message: string;
  started_at: string;
  finished_at: string | null;
};

export type FailoverV2ExecutionStep = {
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

export type FailoverV2ExecutionAvailableAction = {
  available: boolean;
  reason: string;
};

export type FailoverV2ExecutionAvailableActions = {
  stop: FailoverV2ExecutionAvailableAction;
  retry_attach_dns: FailoverV2ExecutionAvailableAction;
  retry_cleanup: FailoverV2ExecutionAvailableAction;
};

export type FailoverV2PendingCleanupAvailableAction = {
  available: boolean;
  reason: string;
};

export type FailoverV2PendingCleanupAvailableActions = {
  retry: FailoverV2PendingCleanupAvailableAction;
  mark_resolved: FailoverV2PendingCleanupAvailableAction;
  mark_manual_review: FailoverV2PendingCleanupAvailableAction;
};

export type FailoverV2PendingCleanup = {
  id: number;
  service_id: number;
  member_id: number;
  execution_id: number;
  provider: string;
  provider_entry_id: string;
  resource_type: string;
  resource_id: string;
  instance_ref: unknown;
  cleanup_label: string;
  status: string;
  attempt_count: number;
  last_error: string;
  last_attempted_at: string | null;
  next_retry_at: string | null;
  resolved_at: string | null;
  available_actions: FailoverV2PendingCleanupAvailableActions | null;
  created_at: string;
  updated_at: string;
};

export type FailoverV2Execution = {
  id: number;
  service_id: number;
  member_id: number;
  status: string;
  trigger_reason: string;
  trigger_snapshot: unknown;
  old_client_uuid: string;
  old_instance_ref: unknown;
  old_addresses: unknown;
  detach_dns_status: string;
  detach_dns_result: unknown;
  new_client_uuid: string;
  new_instance_ref: unknown;
  new_addresses: unknown;
  attach_dns_status: string;
  attach_dns_result: unknown;
  cleanup_status: string;
  cleanup_result: unknown;
  error_message: string;
  available_actions: FailoverV2ExecutionAvailableActions | null;
  started_at: string;
  finished_at: string | null;
  steps: FailoverV2ExecutionStep[];
  created_at: string;
  updated_at: string;
};

export type FailoverV2Service = {
  id: number;
  name: string;
  enabled: boolean;
  dns_provider: string;
  dns_entry_id: string;
  dns_payload: unknown;
  script_clipboard_ids: number[];
  script_timeout_sec: number;
  wait_agent_timeout_sec: number;
  delete_strategy: string;
  delete_delay_seconds: number;
  last_execution_id: number | null;
  last_status: string;
  last_message: string;
  member_count: number;
  enabled_member_count: number;
  members: FailoverV2Member[];
  recent_executions: FailoverV2ExecutionSummary[];
  created_at: string;
  updated_at: string;
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeNullableString(value: unknown) {
  const normalized = normalizeString(value).trim();
  return normalized ? normalized : null;
}

function normalizeBoolean(value: unknown) {
  return Boolean(value);
}

function normalizeUnknown(value: unknown) {
  return value ?? null;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => normalizeString(entry).trim())
    .filter(Boolean);
}

function normalizeMemberMode(value: unknown): FailoverV2MemberMode {
  return normalizeString(value).trim() === "existing_client"
    ? "existing_client"
    : "provider_template";
}

function normalizeMemberLine(line: unknown): FailoverV2MemberLine {
  const raw = line && typeof line === "object" ? line as Record<string, unknown> : {};
  return {
    line_code: normalizeString(raw.line_code),
    dns_record_refs: normalizeUnknown(raw.dns_record_refs),
  };
}

function normalizeNumberArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry) && entry > 0);
  return Array.from(new Set(normalized));
}

function normalizeMember(member: unknown): FailoverV2Member {
  const raw = member && typeof member === "object" ? member as Record<string, unknown> : {};
  const dnsLine = normalizeString(raw.dns_line);
  const dnsLines = normalizeStringArray(raw.dns_lines);
  return {
    id: normalizeNumber(raw.id),
    service_id: normalizeNumber(raw.service_id),
    name: normalizeString(raw.name),
    enabled: normalizeBoolean(raw.enabled),
    priority: normalizeNumber(raw.priority),
    mode: normalizeMemberMode(raw.mode),
    watch_client_uuid: normalizeString(raw.watch_client_uuid),
    dns_lines: dnsLines.length > 0 ? dnsLines : (dnsLine ? [dnsLine] : []),
    lines: Array.isArray(raw.lines) ? raw.lines.map(normalizeMemberLine) : [],
    dns_line: dnsLine,
    dns_record_refs: normalizeUnknown(raw.dns_record_refs),
    current_address: normalizeString(raw.current_address),
    current_instance_ref: normalizeUnknown(raw.current_instance_ref),
    provider: normalizeString(raw.provider),
    provider_entry_id: normalizeString(raw.provider_entry_id),
    provider_entry_group: normalizeString(raw.provider_entry_group),
    plan_payload: normalizeUnknown(raw.plan_payload),
    failure_threshold: normalizeNumber(raw.failure_threshold),
    stale_after_seconds: normalizeNumber(raw.stale_after_seconds),
    cooldown_seconds: normalizeNumber(raw.cooldown_seconds),
    trigger_failure_count: normalizeNumber(raw.trigger_failure_count),
    last_execution_id: normalizeNullableNumber(raw.last_execution_id),
    last_status: normalizeString(raw.last_status),
    last_message: normalizeString(raw.last_message),
    last_triggered_at: normalizeNullableString(raw.last_triggered_at),
    last_succeeded_at: normalizeNullableString(raw.last_succeeded_at),
    last_failed_at: normalizeNullableString(raw.last_failed_at),
    created_at: normalizeString(raw.created_at),
    updated_at: normalizeString(raw.updated_at),
  };
}

function normalizeValidationCheck(check: unknown): FailoverV2ValidationCheck {
  const raw = check && typeof check === "object" ? check as Record<string, unknown> : {};
  return {
    key: normalizeString(raw.key),
    label: normalizeString(raw.label),
    status: normalizeString(raw.status),
    message: normalizeString(raw.message),
  };
}

function normalizeValidationResult(result: unknown): FailoverV2ValidationResult {
  const raw = result && typeof result === "object" ? result as Record<string, unknown> : {};
  return {
    ok: normalizeBoolean(raw.ok),
    checks: Array.isArray(raw.checks) ? raw.checks.map(normalizeValidationCheck) : [],
  };
}

function normalizeServiceValidationResult(result: unknown): FailoverV2ServiceValidationResult {
  const raw = result && typeof result === "object" ? result as Record<string, unknown> : {};
  return {
    service_id: normalizeNumber(raw.service_id),
    service_name: normalizeString(raw.service_name),
    enabled: normalizeBoolean(raw.enabled),
    ok: normalizeBoolean(raw.ok),
    checks: Array.isArray(raw.checks) ? raw.checks.map(normalizeValidationCheck) : [],
  };
}

function normalizeBulkValidationResult(result: unknown): FailoverV2BulkValidationResult {
  const raw = result && typeof result === "object" ? result as Record<string, unknown> : {};
  return {
    ok: normalizeBoolean(raw.ok),
    checked: normalizeNumber(raw.checked),
    failed: normalizeNumber(raw.failed),
    warnings: normalizeNumber(raw.warnings),
    services: Array.isArray(raw.services) ? raw.services.map(normalizeServiceValidationResult) : [],
  };
}

function normalizeExecutionSummary(execution: unknown): FailoverV2ExecutionSummary {
  const raw = execution && typeof execution === "object" ? execution as Record<string, unknown> : {};
  return {
    id: normalizeNumber(raw.id),
    service_id: normalizeNumber(raw.service_id),
    member_id: normalizeNumber(raw.member_id),
    status: normalizeString(raw.status),
    trigger_reason: normalizeString(raw.trigger_reason),
    trigger_snapshot: normalizeUnknown(raw.trigger_snapshot),
    old_client_uuid: normalizeString(raw.old_client_uuid),
    old_instance_ref: normalizeUnknown(raw.old_instance_ref),
    old_addresses: normalizeUnknown(raw.old_addresses),
    detach_dns_status: normalizeString(raw.detach_dns_status),
    detach_dns_result: normalizeUnknown(raw.detach_dns_result),
    new_client_uuid: normalizeString(raw.new_client_uuid),
    new_instance_ref: normalizeUnknown(raw.new_instance_ref),
    new_addresses: normalizeUnknown(raw.new_addresses),
    attach_dns_status: normalizeString(raw.attach_dns_status),
    attach_dns_result: normalizeUnknown(raw.attach_dns_result),
    cleanup_status: normalizeString(raw.cleanup_status),
    cleanup_result: normalizeUnknown(raw.cleanup_result),
    error_message: normalizeString(raw.error_message),
    started_at: normalizeString(raw.started_at),
    finished_at: normalizeNullableString(raw.finished_at),
  };
}

function normalizeExecutionStep(step: unknown): FailoverV2ExecutionStep {
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

function normalizeExecutionAvailableAction(value: unknown): FailoverV2ExecutionAvailableAction {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    available: normalizeBoolean(raw.available),
    reason: normalizeString(raw.reason),
  };
}

function normalizeExecutionAvailableActions(value: unknown): FailoverV2ExecutionAvailableActions | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Record<string, unknown>;
  return {
    stop: normalizeExecutionAvailableAction(raw.stop),
    retry_attach_dns: normalizeExecutionAvailableAction(raw.retry_attach_dns),
    retry_cleanup: normalizeExecutionAvailableAction(raw.retry_cleanup),
  };
}

function normalizePendingCleanupAvailableAction(value: unknown): FailoverV2PendingCleanupAvailableAction {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    available: normalizeBoolean(raw.available),
    reason: normalizeString(raw.reason),
  };
}

function normalizePendingCleanupAvailableActions(value: unknown): FailoverV2PendingCleanupAvailableActions | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Record<string, unknown>;
  return {
    retry: normalizePendingCleanupAvailableAction(raw.retry),
    mark_resolved: normalizePendingCleanupAvailableAction(raw.mark_resolved),
    mark_manual_review: normalizePendingCleanupAvailableAction(raw.mark_manual_review),
  };
}

function normalizeExecution(execution: unknown): FailoverV2Execution {
  const raw = execution && typeof execution === "object" ? execution as Record<string, unknown> : {};
  return {
    id: normalizeNumber(raw.id),
    service_id: normalizeNumber(raw.service_id),
    member_id: normalizeNumber(raw.member_id),
    status: normalizeString(raw.status),
    trigger_reason: normalizeString(raw.trigger_reason),
    trigger_snapshot: normalizeUnknown(raw.trigger_snapshot),
    old_client_uuid: normalizeString(raw.old_client_uuid),
    old_instance_ref: normalizeUnknown(raw.old_instance_ref),
    old_addresses: normalizeUnknown(raw.old_addresses),
    detach_dns_status: normalizeString(raw.detach_dns_status),
    detach_dns_result: normalizeUnknown(raw.detach_dns_result),
    new_client_uuid: normalizeString(raw.new_client_uuid),
    new_instance_ref: normalizeUnknown(raw.new_instance_ref),
    new_addresses: normalizeUnknown(raw.new_addresses),
    attach_dns_status: normalizeString(raw.attach_dns_status),
    attach_dns_result: normalizeUnknown(raw.attach_dns_result),
    cleanup_status: normalizeString(raw.cleanup_status),
    cleanup_result: normalizeUnknown(raw.cleanup_result),
    error_message: normalizeString(raw.error_message),
    available_actions: normalizeExecutionAvailableActions(raw.available_actions),
    started_at: normalizeString(raw.started_at),
    finished_at: normalizeNullableString(raw.finished_at),
    steps: Array.isArray(raw.steps) ? raw.steps.map(normalizeExecutionStep) : [],
    created_at: normalizeString(raw.created_at),
    updated_at: normalizeString(raw.updated_at),
  };
}

function normalizePendingCleanup(cleanup: unknown): FailoverV2PendingCleanup {
  const raw = cleanup && typeof cleanup === "object" ? cleanup as Record<string, unknown> : {};
  return {
    id: normalizeNumber(raw.id),
    service_id: normalizeNumber(raw.service_id),
    member_id: normalizeNumber(raw.member_id),
    execution_id: normalizeNumber(raw.execution_id),
    provider: normalizeString(raw.provider),
    provider_entry_id: normalizeString(raw.provider_entry_id),
    resource_type: normalizeString(raw.resource_type),
    resource_id: normalizeString(raw.resource_id),
    instance_ref: normalizeUnknown(raw.instance_ref),
    cleanup_label: normalizeString(raw.cleanup_label),
    status: normalizeString(raw.status),
    attempt_count: normalizeNumber(raw.attempt_count),
    last_error: normalizeString(raw.last_error),
    last_attempted_at: normalizeNullableString(raw.last_attempted_at),
    next_retry_at: normalizeNullableString(raw.next_retry_at),
    resolved_at: normalizeNullableString(raw.resolved_at),
    available_actions: normalizePendingCleanupAvailableActions(raw.available_actions),
    created_at: normalizeString(raw.created_at),
    updated_at: normalizeString(raw.updated_at),
  };
}

function normalizeService(service: unknown): FailoverV2Service {
  const raw = service && typeof service === "object" ? service as Record<string, unknown> : {};
  return {
    id: normalizeNumber(raw.id),
    name: normalizeString(raw.name),
    enabled: normalizeBoolean(raw.enabled),
    dns_provider: normalizeString(raw.dns_provider),
    dns_entry_id: normalizeString(raw.dns_entry_id),
    dns_payload: normalizeUnknown(raw.dns_payload),
    script_clipboard_ids: normalizeNumberArray(raw.script_clipboard_ids),
    script_timeout_sec: normalizeNumber(raw.script_timeout_sec),
    wait_agent_timeout_sec: normalizeNumber(raw.wait_agent_timeout_sec),
    delete_strategy: normalizeString(raw.delete_strategy),
    delete_delay_seconds: normalizeNumber(raw.delete_delay_seconds),
    last_execution_id: normalizeNullableNumber(raw.last_execution_id),
    last_status: normalizeString(raw.last_status),
    last_message: normalizeString(raw.last_message),
    member_count: normalizeNumber(raw.member_count),
    enabled_member_count: normalizeNumber(raw.enabled_member_count),
    members: Array.isArray(raw.members) ? raw.members.map(normalizeMember) : [],
    recent_executions: Array.isArray(raw.recent_executions) ? raw.recent_executions.map(normalizeExecutionSummary) : [],
    created_at: normalizeString(raw.created_at),
    updated_at: normalizeString(raw.updated_at),
  };
}

const FAILOVER_V2_REQUEST_TIMEOUT_MS = 30_000;

async function requestEnvelope<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const requestUrl =
    method === "GET"
      ? `${path}${path.includes("?") ? "&" : "?"}__ts=${Date.now()}`
      : path;

  const controller = new AbortController();
  const timeoutID = setTimeout(() => controller.abort(), FAILOVER_V2_REQUEST_TIMEOUT_MS);

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
      throw new FailoverV2ApiError(`Request timed out while loading ${path}`, 408);
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
      throw new FailoverV2ApiError(
        `Expected JSON from ${path}, but received an unexpected response.`,
        response.status,
      );
    }

    try {
      payload = JSON.parse(trimmed) as ApiEnvelope<T>;
    } catch {
      throw new FailoverV2ApiError(`Invalid JSON response from ${path}`, response.status);
    }
  }

  if (!response.ok || payload?.status === "error") {
    throw new FailoverV2ApiError(
      payload?.message || `HTTP ${response.status}`,
      response.status,
    );
  }

  return payload?.data as T;
}

export async function getFailoverV2Services(): Promise<FailoverV2Service[]> {
  const data = await requestEnvelope<unknown[]>("/api/admin/failover-v2/services");
  return Array.isArray(data) ? data.map(normalizeService) : [];
}

export async function getFailoverV2Service(serviceID: number): Promise<FailoverV2Service> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover-v2/services/${serviceID}`);
  return normalizeService(data);
}

export async function validateFailoverV2Service(
  input: FailoverV2ServiceInput,
  serviceID?: number | null,
): Promise<FailoverV2ValidationResult> {
  const path = serviceID && serviceID > 0
    ? `/api/admin/failover-v2/services/${serviceID}/validate`
    : "/api/admin/failover-v2/services/validate";
  const data = await requestEnvelope<unknown>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return normalizeValidationResult(data);
}

export async function validateAllFailoverV2Services(): Promise<FailoverV2BulkValidationResult> {
  const data = await requestEnvelope<unknown>("/api/admin/failover-v2/services/validate-all", {
    method: "POST",
  });
  return normalizeBulkValidationResult(data);
}

export async function validateFailoverV2Member(
  serviceID: number,
  input: FailoverV2MemberInput,
  memberID?: number | null,
): Promise<FailoverV2ValidationResult> {
  const path = memberID && memberID > 0
    ? `/api/admin/failover-v2/services/${serviceID}/members/${memberID}/validate`
    : `/api/admin/failover-v2/services/${serviceID}/members/validate`;
  const data = await requestEnvelope<unknown>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return normalizeValidationResult(data);
}

export async function getFailoverV2Executions(
  serviceID: number,
  limit = 20,
): Promise<FailoverV2ExecutionSummary[]> {
  const data = await requestEnvelope<unknown[]>(`/api/admin/failover-v2/services/${serviceID}/executions?limit=${limit}`);
  return Array.isArray(data) ? data.map(normalizeExecutionSummary) : [];
}

export async function getFailoverV2Execution(
  serviceID: number,
  executionID: number,
): Promise<FailoverV2Execution> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover-v2/services/${serviceID}/executions/${executionID}`);
  return normalizeExecution(data);
}

export async function getFailoverV2PendingCleanups(
  serviceID: number,
  limit = 50,
): Promise<FailoverV2PendingCleanup[]> {
  const data = await requestEnvelope<unknown[]>(`/api/admin/failover-v2/services/${serviceID}/pending-cleanups?limit=${limit}`);
  return Array.isArray(data) ? data.map(normalizePendingCleanup) : [];
}

export async function retryFailoverV2ExecutionAttachDNS(
  serviceID: number,
  executionID: number,
): Promise<FailoverV2Execution> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover-v2/services/${serviceID}/executions/${executionID}/retry-attach-dns`, {
    method: "POST",
  });
  return normalizeExecution(data);
}

export async function stopFailoverV2Execution(
  serviceID: number,
  executionID: number,
): Promise<FailoverV2Execution> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover-v2/services/${serviceID}/executions/${executionID}/stop`, {
    method: "POST",
  });
  return normalizeExecution(data);
}

export async function retryFailoverV2ExecutionCleanup(
  serviceID: number,
  executionID: number,
): Promise<FailoverV2Execution> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover-v2/services/${serviceID}/executions/${executionID}/retry-cleanup`, {
    method: "POST",
  });
  return normalizeExecution(data);
}

export async function retryFailoverV2PendingCleanup(
  serviceID: number,
  cleanupID: number,
): Promise<FailoverV2PendingCleanup> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover-v2/services/${serviceID}/pending-cleanups/${cleanupID}/retry`, {
    method: "POST",
  });
  return normalizePendingCleanup(data);
}

export async function resolveFailoverV2PendingCleanup(
  serviceID: number,
  cleanupID: number,
): Promise<FailoverV2PendingCleanup> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover-v2/services/${serviceID}/pending-cleanups/${cleanupID}/resolve`, {
    method: "POST",
  });
  return normalizePendingCleanup(data);
}

export async function markFailoverV2PendingCleanupManualReview(
  serviceID: number,
  cleanupID: number,
): Promise<FailoverV2PendingCleanup> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover-v2/services/${serviceID}/pending-cleanups/${cleanupID}/mark-manual-review`, {
    method: "POST",
  });
  return normalizePendingCleanup(data);
}

export async function createFailoverV2Service(input: FailoverV2ServiceInput): Promise<FailoverV2Service> {
  const data = await requestEnvelope<unknown>("/api/admin/failover-v2/services", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return normalizeService(data);
}

export async function updateFailoverV2Service(
  serviceID: number,
  input: FailoverV2ServiceInput,
): Promise<FailoverV2Service> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover-v2/services/${serviceID}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return normalizeService(data);
}

export async function setFailoverV2ServiceEnabled(
  serviceID: number,
  enabled: boolean,
): Promise<FailoverV2Service> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover-v2/services/${serviceID}/toggle-enabled`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ enabled }),
  });
  return normalizeService(data);
}

export async function deleteFailoverV2Service(serviceID: number): Promise<void> {
  await requestEnvelope(`/api/admin/failover-v2/services/${serviceID}/remove`, {
    method: "POST",
  });
}

export async function createFailoverV2Member(
  serviceID: number,
  input: FailoverV2MemberInput,
): Promise<FailoverV2Service> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover-v2/services/${serviceID}/members`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return normalizeService(data);
}

export async function updateFailoverV2Member(
  serviceID: number,
  memberID: number,
  input: FailoverV2MemberInput,
): Promise<FailoverV2Service> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover-v2/services/${serviceID}/members/${memberID}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return normalizeService(data);
}

export async function setFailoverV2MemberEnabled(
  serviceID: number,
  memberID: number,
  enabled: boolean,
): Promise<FailoverV2Service> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover-v2/services/${serviceID}/members/${memberID}/toggle-enabled`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ enabled }),
  });
  return normalizeService(data);
}

export async function deleteFailoverV2Member(serviceID: number, memberID: number): Promise<FailoverV2Service> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover-v2/services/${serviceID}/members/${memberID}/remove`, {
    method: "POST",
  });
  return normalizeService(data);
}

export async function detachFailoverV2MemberDNS(
  serviceID: number,
  memberID: number,
): Promise<FailoverV2ExecutionSummary> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover-v2/services/${serviceID}/members/${memberID}/detach-dns`, {
    method: "POST",
  });
  return normalizeExecutionSummary(data);
}

export async function runFailoverV2MemberNow(
  serviceID: number,
  memberID: number,
): Promise<FailoverV2ExecutionSummary> {
  const data = await requestEnvelope<unknown>(`/api/admin/failover-v2/services/${serviceID}/members/${memberID}/failover-now`, {
    method: "POST",
  });
  return normalizeExecutionSummary(data);
}

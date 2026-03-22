export class FailoverApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
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
  action_type: string;
  payload: unknown;
  auto_connect_group: string;
  script_clipboard_id: number | null;
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
  script_name_snapshot: string;
  script_status: string;
  script_exit_code: number | null;
  script_output_truncated: boolean;
  dns_status: string;
  cleanup_status: string;
  error_message: string;
  started_at: string;
  finished_at: string | null;
};

export type FailoverTask = {
  id: number;
  name: string;
  enabled: boolean;
  watch_client_uuid: string;
  trigger_source: string;
  failure_threshold: number;
  stale_after_seconds: number;
  cooldown_seconds: number;
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
  latest_execution: FailoverExecutionSummary | null;
  has_active_execution: boolean;
  plans: FailoverPlan[];
  created_at: string;
  updated_at: string;
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
  error_message: string;
  started_at: string;
  finished_at: string | null;
  steps: FailoverExecutionStep[];
  created_at: string;
  updated_at: string;
};

export type FailoverTaskInput = {
  name: string;
  enabled: boolean;
  watch_client_uuid: string;
  failure_threshold: number;
  stale_after_seconds: number;
  cooldown_seconds: number;
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
  action_type: string;
  payload: unknown;
  auto_connect_group: string;
  script_clipboard_id?: number | null;
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
  return {
    id: normalizeNumber(raw.id),
    task_id: normalizeNumber(raw.task_id),
    name: normalizeString(raw.name),
    priority: normalizeNumber(raw.priority),
    enabled: normalizeBoolean(raw.enabled),
    provider: normalizeString(raw.provider),
    provider_entry_id: normalizeString(raw.provider_entry_id),
    action_type: normalizeString(raw.action_type),
    payload: normalizeUnknown(raw.payload),
    auto_connect_group: normalizeString(raw.auto_connect_group),
    script_clipboard_id: normalizeNullableNumber(raw.script_clipboard_id),
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
    script_name_snapshot: normalizeString(raw.script_name_snapshot),
    script_status: normalizeString(raw.script_status),
    script_exit_code: normalizeNullableNumber(raw.script_exit_code),
    script_output_truncated: normalizeBoolean(raw.script_output_truncated),
    dns_status: normalizeString(raw.dns_status),
    cleanup_status: normalizeString(raw.cleanup_status),
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

function normalizeTask(task: unknown): FailoverTask {
  const raw = task && typeof task === "object" ? task as Record<string, unknown> : {};
  const plans = Array.isArray(raw.plans) ? raw.plans.map(normalizePlan) : [];
  return {
    id: normalizeNumber(raw.id),
    name: normalizeString(raw.name),
    enabled: normalizeBoolean(raw.enabled),
    watch_client_uuid: normalizeString(raw.watch_client_uuid),
    trigger_source: normalizeString(raw.trigger_source),
    failure_threshold: normalizeNumber(raw.failure_threshold),
    stale_after_seconds: normalizeNumber(raw.stale_after_seconds),
    cooldown_seconds: normalizeNumber(raw.cooldown_seconds),
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
    latest_execution: normalizeExecutionSummary(raw.latest_execution),
    has_active_execution: normalizeBoolean(raw.has_active_execution),
    plans,
    created_at: normalizeString(raw.created_at),
    updated_at: normalizeString(raw.updated_at),
  };
}

function normalizeExecution(execution: unknown): FailoverExecution {
  const raw = execution && typeof execution === "object" ? execution as Record<string, unknown> : {};
  const steps = Array.isArray(raw.steps) ? raw.steps.map(normalizeExecutionStep) : [];
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
    script_clipboard_id: normalizeNullableNumber(raw.script_clipboard_id),
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
    error_message: normalizeString(raw.error_message),
    started_at: normalizeString(raw.started_at),
    finished_at: normalizeNullableString(raw.finished_at),
    steps,
    created_at: normalizeString(raw.created_at),
    updated_at: normalizeString(raw.updated_at),
  };
}

async function requestEnvelope<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const requestUrl =
    method === "GET"
      ? `${path}${path.includes("?") ? "&" : "?"}__ts=${Date.now()}`
      : path;

  const response = await fetch(requestUrl, {
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
  });

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
  const response = await fetch(`${path}${path.includes("?") ? "&" : "?"}__ts=${Date.now()}`, {
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache, no-store, max-age=0",
      Pragma: "no-cache",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

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

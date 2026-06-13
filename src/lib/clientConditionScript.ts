import { formatApiErrorMessage } from "@/lib/apiErrorMessage";

export class ClientConditionScriptApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(formatApiErrorMessage(message, { status }));
    this.name = "ClientConditionScriptApiError";
    this.status = status;
  }
}

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export type ClientConditionScriptStatus = "blocked_suspected" | "degraded";

export type ClientConditionScriptRule = {
  id: number;
  client_uuid: string;
  enabled: boolean;
  command_id: number;
  command_name: string;
  trigger_statuses: ClientConditionScriptStatus[];
  failure_threshold: number;
  cooldown_seconds: number;
  consecutive_failures: number;
  last_status: string;
  last_task_id: string;
  last_triggered_at: string | null;
  last_error: string;
  created_at: string;
  updated_at: string;
};

export type ClientConditionScriptRuleInput = {
  enabled: boolean;
  command_id: number;
  trigger_statuses: ClientConditionScriptStatus[];
  failure_threshold: number;
  cooldown_seconds: number;
};

export type ClientConditionScriptTrigger = {
  id: number;
  client_uuid: string;
  rule_id: number;
  command_id: number;
  task_id: string;
  status: string;
  reason: string;
  connectivity_status: string;
  failure_count: number;
  error_message: string;
  created_at: string;
};

export type ClientConditionScriptRunResult = {
  task_id: string;
  rule: ClientConditionScriptRule;
};

const REQUEST_TIMEOUT_MS = 30_000;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeBoolean(value: unknown) {
  return typeof value === "boolean" ? value : Boolean(value);
}

function normalizeNullableString(value: unknown) {
  const normalized = normalizeString(value).trim();
  return normalized ? normalized : null;
}

function normalizeStatus(value: unknown): ClientConditionScriptStatus | null {
  const normalized = normalizeString(value).trim().toLowerCase();
  if (normalized === "blocked_suspected" || normalized === "degraded") {
    return normalized;
  }
  return null;
}

function normalizeStatuses(value: unknown): ClientConditionScriptStatus[] {
  const values = Array.isArray(value) ? value : [];
  const statuses = values.flatMap((item) => {
    const status = normalizeStatus(item);
    return status ? [status] : [];
  });
  return statuses.length ? Array.from(new Set(statuses)) : ["blocked_suspected", "degraded"];
}

function normalizeRule(value: unknown): ClientConditionScriptRule {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    id: normalizeNumber(raw.id),
    client_uuid: normalizeString(raw.client_uuid),
    enabled: normalizeBoolean(raw.enabled),
    command_id: normalizeNumber(raw.command_id),
    command_name: normalizeString(raw.command_name),
    trigger_statuses: normalizeStatuses(raw.trigger_statuses),
    failure_threshold: normalizeNumber(raw.failure_threshold) || 2,
    cooldown_seconds: normalizeNumber(raw.cooldown_seconds) || 600,
    consecutive_failures: normalizeNumber(raw.consecutive_failures),
    last_status: normalizeString(raw.last_status),
    last_task_id: normalizeString(raw.last_task_id),
    last_triggered_at: normalizeNullableString(raw.last_triggered_at),
    last_error: normalizeString(raw.last_error),
    created_at: normalizeString(raw.created_at),
    updated_at: normalizeString(raw.updated_at),
  };
}

function normalizeTrigger(value: unknown): ClientConditionScriptTrigger | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Record<string, unknown>;
  return {
    id: normalizeNumber(raw.id),
    client_uuid: normalizeString(raw.client_uuid),
    rule_id: normalizeNumber(raw.rule_id),
    command_id: normalizeNumber(raw.command_id),
    task_id: normalizeString(raw.task_id),
    status: normalizeString(raw.status),
    reason: normalizeString(raw.reason),
    connectivity_status: normalizeString(raw.connectivity_status),
    failure_count: normalizeNumber(raw.failure_count),
    error_message: normalizeString(raw.error_message),
    created_at: normalizeString(raw.created_at),
  };
}

function normalizeTriggers(value: unknown): ClientConditionScriptTrigger[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    const trigger = normalizeTrigger(item);
    return trigger ? [trigger] : [];
  });
}

function normalizeRunResult(value: unknown): ClientConditionScriptRunResult {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    task_id: normalizeString(raw.task_id),
    rule: normalizeRule(raw.rule),
  };
}

async function requestClientConditionScript<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const requestUrl =
    method === "GET"
      ? `${path}${path.includes("?") ? "&" : "?"}__ts=${Date.now()}`
      : path;

  const controller = new AbortController();
  const timeoutID = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
      throw new ClientConditionScriptApiError(`请求条件脚本接口超时: ${path}`, 408);
    }
    throw error;
  } finally {
    clearTimeout(timeoutID);
  }

  const text = await response.text();
  const trimmed = text.trim();
  let payload: ApiEnvelope<T> | null = null;

  if (trimmed) {
    try {
      payload = JSON.parse(trimmed) as ApiEnvelope<T>;
    } catch {
      throw new ClientConditionScriptApiError(`条件脚本接口返回了无效 JSON: ${path}`, response.status);
    }
  }

  if (!response.ok || payload?.status === "error") {
    throw new ClientConditionScriptApiError(
      payload?.message || `HTTP ${response.status}`,
      response.status,
    );
  }

  return payload?.data as T;
}

export async function getClientConditionScriptRule(clientUUID: string): Promise<ClientConditionScriptRule> {
  const data = await requestClientConditionScript<unknown>(`/api/admin/client/${clientUUID}/condition-script`);
  return normalizeRule(data);
}

export async function saveClientConditionScriptRule(
  clientUUID: string,
  input: ClientConditionScriptRuleInput,
): Promise<ClientConditionScriptRule> {
  const data = await requestClientConditionScript<unknown>(`/api/admin/client/${clientUUID}/condition-script`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return normalizeRule(data);
}

export async function deleteClientConditionScriptRule(clientUUID: string): Promise<void> {
  await requestClientConditionScript<unknown>(`/api/admin/client/${clientUUID}/condition-script/remove`, {
    method: "POST",
  });
}

export async function listClientConditionScriptTriggers(clientUUID: string): Promise<ClientConditionScriptTrigger[]> {
  const data = await requestClientConditionScript<unknown>(`/api/admin/client/${clientUUID}/condition-script/triggers`);
  return normalizeTriggers(data);
}

export async function runClientConditionScriptNow(clientUUID: string): Promise<ClientConditionScriptRunResult> {
  const data = await requestClientConditionScript<unknown>(`/api/admin/client/${clientUUID}/condition-script/run`, {
    method: "POST",
  });
  return normalizeRunResult(data);
}

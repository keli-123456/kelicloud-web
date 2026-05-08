import { formatApiErrorMessage } from "@/lib/apiErrorMessage";

export class ClientPortForwardApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(formatApiErrorMessage(message, { status }));
    this.name = "ClientPortForwardApiError";
    this.status = status;
  }
}

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export type ClientPortForwardProtocol = "tcp" | "udp";

export type ClientPortForwardRule = {
  id: number;
  client_uuid: string;
  name: string;
  enabled: boolean;
  protocol: ClientPortForwardProtocol;
  listen_port: number;
  target_host: string;
  target_port: number;
  status: string;
  last_task_id: string;
  last_applied_at: string | null;
  last_error: string;
  created_at: string;
  updated_at: string;
};

export type ClientPortForwardRuleInput = {
  id?: number;
  name: string;
  enabled: boolean;
  protocol: ClientPortForwardProtocol;
  listen_port: number;
  target_host: string;
  target_port: number;
};

export type ClientPortForwardApplyResult = {
  task_id: string;
  enabled_count: number;
  rules: ClientPortForwardRule[];
};

const CLIENT_PORT_FORWARD_REQUEST_TIMEOUT_MS = 30_000;

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

function normalizeProtocol(value: unknown): ClientPortForwardProtocol {
  return normalizeString(value).toLowerCase() === "udp" ? "udp" : "tcp";
}

function normalizeRule(value: unknown): ClientPortForwardRule | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  return {
    id: normalizeNumber(raw.id),
    client_uuid: normalizeString(raw.client_uuid),
    name: normalizeString(raw.name),
    enabled: normalizeBoolean(raw.enabled),
    protocol: normalizeProtocol(raw.protocol),
    listen_port: normalizeNumber(raw.listen_port),
    target_host: normalizeString(raw.target_host),
    target_port: normalizeNumber(raw.target_port),
    status: normalizeString(raw.status) || "pending",
    last_task_id: normalizeString(raw.last_task_id),
    last_applied_at: normalizeNullableString(raw.last_applied_at),
    last_error: normalizeString(raw.last_error),
    created_at: normalizeString(raw.created_at),
    updated_at: normalizeString(raw.updated_at),
  };
}

function normalizeRules(value: unknown): ClientPortForwardRule[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    const rule = normalizeRule(item);
    return rule ? [rule] : [];
  });
}

function normalizeApplyResult(value: unknown): ClientPortForwardApplyResult {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    task_id: normalizeString(raw.task_id),
    enabled_count: normalizeNumber(raw.enabled_count),
    rules: normalizeRules(raw.rules),
  };
}

async function requestClientPortForward<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const requestUrl =
    method === "GET"
      ? `${path}${path.includes("?") ? "&" : "?"}__ts=${Date.now()}`
      : path;

  const controller = new AbortController();
  const timeoutID = setTimeout(() => controller.abort(), CLIENT_PORT_FORWARD_REQUEST_TIMEOUT_MS);

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
      throw new ClientPortForwardApiError(`请求端口中转接口超时: ${path}`, 408);
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
      throw new ClientPortForwardApiError(`端口中转接口返回了无效 JSON: ${path}`, response.status);
    }
  }

  if (!response.ok || payload?.status === "error") {
    throw new ClientPortForwardApiError(
      payload?.message || `HTTP ${response.status}`,
      response.status,
    );
  }

  return payload?.data as T;
}

export async function getClientPortForwardRules(clientUUID: string): Promise<ClientPortForwardRule[]> {
  const data = await requestClientPortForward<unknown>(`/api/admin/client/${clientUUID}/port-forward`);
  return normalizeRules(data);
}

export async function saveClientPortForwardRule(
  clientUUID: string,
  input: ClientPortForwardRuleInput,
): Promise<ClientPortForwardRule> {
  const data = await requestClientPortForward<unknown>(`/api/admin/client/${clientUUID}/port-forward`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return normalizeRule(data) as ClientPortForwardRule;
}

export async function deleteClientPortForwardRule(clientUUID: string, ruleID: number): Promise<void> {
  await requestClientPortForward<unknown>(`/api/admin/client/${clientUUID}/port-forward/${ruleID}/remove`, {
    method: "POST",
  });
}

export async function applyClientPortForwardRules(clientUUID: string): Promise<ClientPortForwardApplyResult> {
  const data = await requestClientPortForward<unknown>(`/api/admin/client/${clientUUID}/port-forward/apply`, {
    method: "POST",
  });
  return normalizeApplyResult(data);
}

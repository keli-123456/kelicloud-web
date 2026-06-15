import { formatApiErrorMessage } from "./apiErrorMessage";
import {
  normalizeTunnelRule,
  normalizeTunnelRulesResponse,
  type TunnelRule,
  type TunnelRuleInput,
  type TunnelRulesResponse,
} from "./tunnels.helpers";

export type {
  TunnelGroupSummary,
  TunnelProtocol,
  TunnelRule,
  TunnelRuleInput,
  TunnelRulesResponse,
} from "./tunnels.helpers";

export class TunnelApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(formatApiErrorMessage(message, { status }));
    this.name = "TunnelApiError";
    this.status = status;
  }
}

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

const TUNNEL_REQUEST_TIMEOUT_MS = 30_000;

async function requestTunnel<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const requestUrl =
    method === "GET"
      ? `${path}${path.includes("?") ? "&" : "?"}__ts=${Date.now()}`
      : path;

  const controller = new AbortController();
  const timeoutID = setTimeout(() => controller.abort(), TUNNEL_REQUEST_TIMEOUT_MS);

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
      throw new TunnelApiError(`请求隧道转发接口超时: ${path}`, 408);
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
      throw new TunnelApiError(`隧道转发接口返回了无效 JSON: ${path}`, response.status);
    }
  }

  if (!response.ok || payload?.status === "error") {
    throw new TunnelApiError(payload?.message || `HTTP ${response.status}`, response.status);
  }

  return payload?.data as T;
}

export async function getTunnelRules(): Promise<TunnelRulesResponse> {
  const data = await requestTunnel<unknown>("/api/admin/tunnels");
  return normalizeTunnelRulesResponse(data);
}

export async function saveTunnelRule(input: TunnelRuleInput): Promise<TunnelRule> {
  const data = await requestTunnel<unknown>("/api/admin/tunnels", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return normalizeTunnelRule(data) as TunnelRule;
}

export async function deleteTunnelRule(ruleID: number): Promise<void> {
  await requestTunnel<unknown>(`/api/admin/tunnels/${ruleID}/remove`, {
    method: "POST",
  });
}

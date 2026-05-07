import type { FailoverDnsCatalog } from "@/lib/failover";
import { formatApiErrorMessage } from "@/lib/apiErrorMessage";

export class ClientDDNSApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(formatApiErrorMessage(message, { status }));
    this.name = "ClientDDNSApiError";
    this.status = status;
  }
}

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export type ClientDDNSBinding = {
  id: number;
  client_uuid: string;
  enabled: boolean;
  provider: string;
  entry_id: string;
  address_mode: string;
  payload: unknown;
  record_key: string;
  sync_status: string;
  last_ipv4: string;
  last_ipv6: string;
  last_synced_at: string | null;
  last_error: string;
  last_result: unknown;
  created_at: string;
  updated_at: string;
};

export type ClientDDNSBindingInput = {
  enabled: boolean;
  provider: string;
  entry_id: string;
  address_mode: string;
  payload: unknown;
};

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

function normalizeUnknown(value: unknown) {
  return value ?? null;
}

function normalizeBinding(value: unknown): ClientDDNSBinding | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  return {
    id: normalizeNumber(raw.id),
    client_uuid: normalizeString(raw.client_uuid),
    enabled: normalizeBoolean(raw.enabled),
    provider: normalizeString(raw.provider),
    entry_id: normalizeString(raw.entry_id),
    address_mode: normalizeString(raw.address_mode) || "ipv4",
    payload: normalizeUnknown(raw.payload),
    record_key: normalizeString(raw.record_key),
    sync_status: normalizeString(raw.sync_status),
    last_ipv4: normalizeString(raw.last_ipv4),
    last_ipv6: normalizeString(raw.last_ipv6),
    last_synced_at: normalizeNullableString(raw.last_synced_at),
    last_error: normalizeString(raw.last_error),
    last_result: normalizeUnknown(raw.last_result),
    created_at: normalizeString(raw.created_at),
    updated_at: normalizeString(raw.updated_at),
  };
}

function normalizeOption(value: unknown) {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    value: normalizeString(raw.value),
    label: normalizeString(raw.label),
  };
}

function normalizeCatalog(value: unknown): FailoverDnsCatalog {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const defaults = raw.defaults && typeof raw.defaults === "object"
    ? raw.defaults as Record<string, unknown>
    : {};

  return {
    provider: normalizeString(raw.provider),
    defaults: {
      zone_id: normalizeString(defaults.zone_id),
      zone_name: normalizeString(defaults.zone_name),
      domain_name: normalizeString(defaults.domain_name),
      proxied: typeof defaults.proxied === "boolean" ? defaults.proxied : null,
    },
    zones: Array.isArray(raw.zones) ? raw.zones.map(normalizeOption) : [],
    domains: Array.isArray(raw.domains) ? raw.domains.map(normalizeOption) : [],
    records: Array.isArray(raw.records)
      ? raw.records.map((record) => {
          const entry = record && typeof record === "object" ? record as Record<string, unknown> : {};
          return {
            id: normalizeString(entry.id),
            name: normalizeString(entry.name),
            type: normalizeString(entry.type),
            value: normalizeString(entry.value),
            ttl: normalizeNumber(entry.ttl),
            zone_id: normalizeString(entry.zone_id),
            zone_name: normalizeString(entry.zone_name),
            domain_name: normalizeString(entry.domain_name),
            rr: normalizeString(entry.rr),
            line: normalizeString(entry.line),
            lines: Array.isArray(entry.lines)
              ? entry.lines.filter((item): item is string => typeof item === "string")
              : [],
            proxied: typeof entry.proxied === "boolean" ? entry.proxied : null,
          };
        })
      : [],
    lines: Array.isArray(raw.lines) ? raw.lines.map(normalizeOption) : [],
    ttls: Array.isArray(raw.ttls) ? raw.ttls.map(normalizeOption) : [],
  };
}

const CLIENT_DDNS_REQUEST_TIMEOUT_MS = 30_000;

async function requestClientDDNS<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const requestUrl =
    method === "GET"
      ? `${path}${path.includes("?") ? "&" : "?"}__ts=${Date.now()}`
      : path;

  const controller = new AbortController();
  const timeoutID = setTimeout(() => controller.abort(), CLIENT_DDNS_REQUEST_TIMEOUT_MS);

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
      throw new ClientDDNSApiError(`Request timed out while loading ${path}`, 408);
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
      throw new ClientDDNSApiError(`Invalid JSON response from ${path}`, response.status);
    }
  }

  if (!response.ok || payload?.status === "error") {
    throw new ClientDDNSApiError(
      payload?.message || `HTTP ${response.status}`,
      response.status,
    );
  }

  return payload?.data as T;
}

export async function getClientDDNSBinding(clientUUID: string): Promise<ClientDDNSBinding | null> {
  const data = await requestClientDDNS<unknown>(`/api/admin/client/${clientUUID}/ddns`);
  return normalizeBinding(data);
}

export async function saveClientDDNSBinding(
  clientUUID: string,
  input: ClientDDNSBindingInput,
): Promise<ClientDDNSBinding> {
  const data = await requestClientDDNS<unknown>(`/api/admin/client/${clientUUID}/ddns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return normalizeBinding(data) as ClientDDNSBinding;
}

export async function deleteClientDDNSBinding(clientUUID: string): Promise<void> {
  await requestClientDDNS(`/api/admin/client/${clientUUID}/ddns/remove`, {
    method: "POST",
  });
}

export async function syncClientDDNSBinding(clientUUID: string): Promise<ClientDDNSBinding> {
  const data = await requestClientDDNS<unknown>(`/api/admin/client/${clientUUID}/ddns/sync`, {
    method: "POST",
  });
  return normalizeBinding(data) as ClientDDNSBinding;
}

export async function getClientDDNSCatalog(args: {
  clientUUID: string;
  provider: string;
  entryID: string;
  zoneName?: string;
  domainName?: string;
}): Promise<FailoverDnsCatalog> {
  const params = new URLSearchParams();
  params.set("provider", args.provider);
  params.set("entry_id", args.entryID);
  if (args.zoneName) {
    params.set("zone_name", args.zoneName);
  }
  if (args.domainName) {
    params.set("domain_name", args.domainName);
  }

  const data = await requestClientDDNS<unknown>(
    `/api/admin/client/${args.clientUUID}/ddns/catalog?${params.toString()}`,
  );
  return normalizeCatalog(data);
}

import { formatApiErrorMessage } from "@/lib/apiErrorMessage";

export class DNSSchedulerApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(formatApiErrorMessage(message, { status }));
    this.name = "DNSSchedulerApiError";
    this.status = status;
  }
}

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export type DNSSchedulerItemStatus =
  | "synced"
  | "pending"
  | "error"
  | "skipped_duplicate";

export type DNSSchedulerItem = {
  id: number;
  user_id?: string;
  client_uuid: string;
  client_name: string;
  provider: string;
  entry_id: string;
  address_mode: string;
  record_key: string;
  current_ipv4: string;
  current_ipv6: string;
  last_ipv4: string;
  last_ipv6: string;
  status: DNSSchedulerItemStatus | string;
  reason?: string;
  last_synced_at: string | null;
  last_error?: string;
  updated_at: string;
};

export type DNSSchedulerRunSummary = {
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number;
  total_bindings: number;
  eligible_bindings: number;
  applied: number;
  skipped: number;
  failed: number;
  deduped: number;
  last_error?: string;
};

export type DNSSchedulerSnapshot = {
  running: boolean;
  last_run: DNSSchedulerRunSummary;
  total: number;
  synced: number;
  pending: number;
  failed: number;
  deduped: number;
  dedupe_groups: number;
  load_error?: string;
  items: DNSSchedulerItem[];
};

const emptyRun: DNSSchedulerRunSummary = {
  started_at: null,
  finished_at: null,
  duration_ms: 0,
  total_bindings: 0,
  eligible_bindings: 0,
  applied: 0,
  skipped: 0,
  failed: 0,
  deduped: 0,
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeNullableString(value: unknown) {
  const normalized = normalizeString(value).trim();
  return normalized ? normalized : null;
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeBoolean(value: unknown) {
  return typeof value === "boolean" ? value : Boolean(value);
}

function normalizeRun(value: unknown): DNSSchedulerRunSummary {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    started_at: normalizeNullableString(raw.started_at),
    finished_at: normalizeNullableString(raw.finished_at),
    duration_ms: normalizeNumber(raw.duration_ms),
    total_bindings: normalizeNumber(raw.total_bindings),
    eligible_bindings: normalizeNumber(raw.eligible_bindings),
    applied: normalizeNumber(raw.applied),
    skipped: normalizeNumber(raw.skipped),
    failed: normalizeNumber(raw.failed),
    deduped: normalizeNumber(raw.deduped),
    last_error: normalizeString(raw.last_error),
  };
}

function normalizeItem(value: unknown): DNSSchedulerItem {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    id: normalizeNumber(raw.id),
    user_id: normalizeString(raw.user_id),
    client_uuid: normalizeString(raw.client_uuid),
    client_name: normalizeString(raw.client_name),
    provider: normalizeString(raw.provider),
    entry_id: normalizeString(raw.entry_id),
    address_mode: normalizeString(raw.address_mode),
    record_key: normalizeString(raw.record_key),
    current_ipv4: normalizeString(raw.current_ipv4),
    current_ipv6: normalizeString(raw.current_ipv6),
    last_ipv4: normalizeString(raw.last_ipv4),
    last_ipv6: normalizeString(raw.last_ipv6),
    status: normalizeString(raw.status) || "pending",
    reason: normalizeString(raw.reason),
    last_synced_at: normalizeNullableString(raw.last_synced_at),
    last_error: normalizeString(raw.last_error),
    updated_at: normalizeString(raw.updated_at),
  };
}

function normalizeSnapshot(value: unknown): DNSSchedulerSnapshot {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    running: normalizeBoolean(raw.running),
    last_run: normalizeRun(raw.last_run || emptyRun),
    total: normalizeNumber(raw.total),
    synced: normalizeNumber(raw.synced),
    pending: normalizeNumber(raw.pending),
    failed: normalizeNumber(raw.failed),
    deduped: normalizeNumber(raw.deduped),
    dedupe_groups: normalizeNumber(raw.dedupe_groups),
    load_error: normalizeString(raw.load_error),
    items: Array.isArray(raw.items) ? raw.items.map(normalizeItem) : [],
  };
}

export async function getDNSSchedulerSnapshot(): Promise<DNSSchedulerSnapshot> {
  const requestUrl = `/api/admin/dns/scheduler?__ts=${Date.now()}`;
  const response = await fetch(requestUrl, {
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
  const trimmed = text.trim();
  let payload: ApiEnvelope<unknown> | null = null;
  if (trimmed) {
    try {
      payload = JSON.parse(trimmed) as ApiEnvelope<unknown>;
    } catch {
      throw new DNSSchedulerApiError("Invalid JSON response from DNS scheduler", response.status);
    }
  }

  if (!response.ok || payload?.status === "error") {
    throw new DNSSchedulerApiError(payload?.message || `HTTP ${response.status}`, response.status);
  }

  return normalizeSnapshot(payload?.data);
}

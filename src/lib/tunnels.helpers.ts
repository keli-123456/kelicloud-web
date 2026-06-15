export type TunnelProtocol = "tcp";

export type TunnelGroupSummary = {
  name: string;
  client_count: number;
  control_connected_count: number;
  data_ready_count: number;
  last_error: string;
};

export type TunnelRule = {
  id: number;
  name: string;
  enabled: boolean;
  protocol: TunnelProtocol;
  ingress_group: string;
  listen_address: string;
  listen_port: number;
  egress_group: string;
  target_host: string;
  target_port: number;
  source_allowlist: string;
  max_concurrent_sessions: number;
  remark: string;
  status: string;
  ingress_ready: boolean;
  egress_ready: boolean;
  ingress_ready_count: number;
  egress_ready_count: number;
  last_revision: number;
  last_error: string;
  created_at: string;
  updated_at: string;
};

export type TunnelRuleInput = {
  id?: number;
  name: string;
  enabled: boolean;
  protocol?: TunnelProtocol;
  ingress_group: string;
  listen_address: string;
  listen_port: number;
  egress_group: string;
  target_host: string;
  target_port: number;
  source_allowlist: string;
  max_concurrent_sessions: number;
  remark?: string;
};

export type TunnelRulesResponse = {
  groups: TunnelGroupSummary[];
  rules: TunnelRule[];
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizePositiveNumber(value: unknown, fallback: number) {
  const number = normalizeNumber(value);
  return number > 0 ? number : fallback;
}

function normalizeBoolean(value: unknown) {
  return typeof value === "boolean" ? value : Boolean(value);
}

function normalizeProtocol(value: unknown): TunnelProtocol {
  return normalizeString(value).toLowerCase() === "tcp" ? "tcp" : "tcp";
}

export function normalizeTunnelGroup(value: unknown): TunnelGroupSummary | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const name = normalizeString(raw.name).trim();
  if (!name) {
    return null;
  }
  return {
    name,
    client_count: normalizeNumber(raw.client_count),
    control_connected_count: normalizeNumber(raw.control_connected_count),
    data_ready_count: normalizeNumber(raw.data_ready_count),
    last_error: normalizeString(raw.last_error),
  };
}

export function normalizeTunnelRule(value: unknown): TunnelRule | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  return {
    id: normalizeNumber(raw.id),
    name: normalizeString(raw.name),
    enabled: normalizeBoolean(raw.enabled),
    protocol: normalizeProtocol(raw.protocol),
    ingress_group: normalizeString(raw.ingress_group).trim(),
    listen_address: normalizeString(raw.listen_address).trim() || "0.0.0.0",
    listen_port: normalizeNumber(raw.listen_port),
    egress_group: normalizeString(raw.egress_group).trim(),
    target_host: normalizeString(raw.target_host).trim(),
    target_port: normalizeNumber(raw.target_port),
    source_allowlist: normalizeString(raw.source_allowlist).trim() || "0.0.0.0/0",
    max_concurrent_sessions: normalizePositiveNumber(raw.max_concurrent_sessions, 32),
    remark: normalizeString(raw.remark),
    status: normalizeString(raw.status).trim() || "ok",
    ingress_ready: normalizeBoolean(raw.ingress_ready),
    egress_ready: normalizeBoolean(raw.egress_ready),
    ingress_ready_count: normalizeNumber(raw.ingress_ready_count),
    egress_ready_count: normalizeNumber(raw.egress_ready_count),
    last_revision: normalizeNumber(raw.last_revision),
    last_error: normalizeString(raw.last_error),
    created_at: normalizeString(raw.created_at),
    updated_at: normalizeString(raw.updated_at),
  };
}

export function normalizeTunnelGroups(value: unknown): TunnelGroupSummary[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    const group = normalizeTunnelGroup(item);
    return group ? [group] : [];
  });
}

export function normalizeTunnelRules(value: unknown): TunnelRule[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    const rule = normalizeTunnelRule(item);
    return rule ? [rule] : [];
  });
}

export function normalizeTunnelRulesResponse(value: unknown): TunnelRulesResponse {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    groups: normalizeTunnelGroups(raw.groups),
    rules: normalizeTunnelRules(raw.rules),
  };
}

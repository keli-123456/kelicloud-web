import type {
  TunnelGroupSummary,
  TunnelRule,
  TunnelRuleDiagnostic,
} from "../../lib/tunnels.helpers";

export type TunnelStatusTone = "gray" | "red" | "amber" | "green" | "blue";

export type TunnelOverviewMetrics = {
  totalRules: number;
  healthyRules: number;
  activeSessions: number;
  totalGroups: number;
  readyGroups: number;
};

type RuleLike = Pick<
  TunnelRule,
  "enabled" | "status" | "ingress_ready" | "egress_ready" | "active_sessions"
>;

type GroupLike = Pick<
  TunnelGroupSummary,
  "client_count" | "control_connected_count" | "data_ready_count"
>;

export function getTunnelStatusTone(status: string): TunnelStatusTone {
  if (status === "ok") return "green";
  if (status === "disabled") return "gray";
  if (status === "partial") return "amber";
  return "red";
}

export function formatTunnelEndpoint(host: string, port: number) {
  const cleanHost = String(host || "").trim();
  if (!cleanHost || !port) {
    return "-";
  }
  const displayHost =
    cleanHost.includes(":") && !cleanHost.startsWith("[")
      ? `[${cleanHost}]`
      : cleanHost;
  return `${displayHost}:${port}`;
}

export type TunnelDiagnosticPreview = {
  lines: string[];
  extraCount: number;
};

export function getTunnelDiagnosticLabel(status: string) {
  switch (String(status || "").trim()) {
    case "unsupported_os":
      return "非 Linux Agent";
    case "listen_bind_failed":
      return "监听端口不可用";
    case "invalid_target":
      return "目标地址无效";
    case "invalid_allowlist":
      return "来源白名单无效";
    default:
      return String(status || "").trim() || "异常";
  }
}

export function getTunnelDiagnosticSideLabel(side: string) {
  switch (String(side || "").trim()) {
    case "ingress":
      return "入口";
    case "egress":
      return "出口";
    default:
      return "规则";
  }
}

export function getTunnelDiagnosticPreview(
  rule: Pick<TunnelRule, "diagnostics" | "last_error">,
): TunnelDiagnosticPreview {
  const diagnostics = Array.isArray(rule.diagnostics) ? rule.diagnostics : [];
  if (diagnostics.length === 0) {
    const fallback = String(rule.last_error || "").trim();
    return { lines: fallback ? [fallback] : [], extraCount: 0 };
  }

  const lines = diagnostics.slice(0, 2).map((diagnostic: TunnelRuleDiagnostic) => {
    const side = getTunnelDiagnosticSideLabel(diagnostic.side);
    return `${side}: ${getTunnelDiagnosticLabel(diagnostic.status)}`;
  });
  return {
    lines,
    extraCount: Math.max(0, diagnostics.length - lines.length),
  };
}

export function getTunnelOverviewMetrics(
  rules: RuleLike[],
  groups: GroupLike[],
): TunnelOverviewMetrics {
  return {
    totalRules: rules.length,
    healthyRules: rules.filter(
      (rule) => rule.enabled && rule.status === "ok" && rule.ingress_ready && rule.egress_ready,
    ).length,
    activeSessions: rules.reduce(
      (sum, rule) => sum + Math.max(0, Number(rule.active_sessions) || 0),
      0,
    ),
    totalGroups: groups.length,
    readyGroups: groups.filter(
      (group) =>
        group.client_count > 0 &&
        group.control_connected_count > 0 &&
        group.data_ready_count > 0,
    ).length,
  };
}

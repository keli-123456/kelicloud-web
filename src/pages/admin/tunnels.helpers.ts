import type { TunnelGroupSummary, TunnelRule } from "../../lib/tunnels.helpers";

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

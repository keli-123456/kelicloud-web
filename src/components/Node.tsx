import React from "react";
import type { TFunction } from "i18next";
import { TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import { useIsMobile } from "@/hooks/use-mobile";
import type { LiveData, Record } from "../types/LiveData";
import { getOSImage, getOSName } from "@/utils";
import { formatBytes } from "@/utils/unitHelper";

import Flag from "./Flag";
import MiniPingChartFloat from "./MiniPingChartFloat";
import PriceTags from "./PriceTags";
import Tips from "./ui/tips";
import UsageBar from "./UsageBar";

export function formatUptime(seconds: number, t: TFunction): string {
  if (!seconds || seconds < 0) return t("nodeCard.time_second", { val: 0 });
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d) parts.push(`${d} ${t("nodeCard.time_day")}`);
  if (h) parts.push(`${h} ${t("nodeCard.time_hour")}`);
  if (m) parts.push(`${m} ${t("nodeCard.time_minute")}`);
  if (s || parts.length === 0) parts.push(`${s} ${t("nodeCard.time_second")}`);
  return parts.join(" ");
}

function buildCNConnectivityBadge(
  connectivity: NonNullable<Record["cn_connectivity"]>,
  t: TFunction,
) {
  const latencyLabel =
    typeof connectivity.latency === "number" && connectivity.latency > 0
      ? ` ${connectivity.latency}ms`
      : "";
  const titleParts = [
    connectivity.target
      ? `${t("settings.general.cn_connectivity_target")}: ${connectivity.target}`
      : "",
    connectivity.message || "",
  ].filter(Boolean);
  const title = titleParts.join("\n");

  switch (connectivity.status) {
    case "ok":
      return {
        label: `${t("admin.nodeTable.cnConnectivityOk")}${latencyLabel}`,
        variant: "success" as const,
        title,
      };
    case "blocked_suspected":
      return {
        label: t("admin.nodeTable.cnConnectivityBlocked"),
        variant: "destructive" as const,
        title,
      };
    case "degraded":
      return {
        label: t("admin.nodeTable.cnConnectivityDegraded"),
        variant: "warning" as const,
        title,
      };
    default:
      return {
        label: t("admin.nodeTable.cnConnectivityUnknown"),
        variant: "secondary" as const,
        title,
      };
  }
}

function InfoRow({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function NodeMetricTile({
  label,
  value,
  helper,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  helper?: React.ReactNode;
}) {
  return (
    <div className="panel-muted px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold leading-6 text-foreground">
        {value}
      </div>
      {helper ? (
        <div className="mt-1 truncate text-sm text-muted-foreground">{helper}</div>
      ) : null}
    </div>
  );
}

interface NodeProps {
  basic: NodeBasicInfo;
  live: Record | undefined;
  online: boolean;
}

const Node = React.memo(({ basic, live, online }: NodeProps) => {
  const [t] = useTranslation();
  const isMobile = useIsMobile();
  const defaultLive = {
    cpu: { usage: 0 },
    swap: { used: 0 },
    load: { load1: 0, load5: 0, load15: 0 },
    ram: { used: 0 },
    disk: { used: 0 },
    network: { up: 0, down: 0, totalUp: 0, totalDown: 0 },
    connections: { tcp: 0, udp: 0 },
    uptime: 0,
    process: 0,
    message: "",
    time: "",
  } as Record;

  const liveData = live || defaultLive;
  const memoryUsagePercent = basic.mem_total
    ? (liveData.ram.used / basic.mem_total) * 100
    : 0;
  const diskUsagePercent = basic.disk_total
    ? (liveData.disk.used / basic.disk_total) * 100
    : 0;
  const uploadSpeed = formatBytes(liveData.network.up);
  const downloadSpeed = formatBytes(liveData.network.down);
  const totalUpload = formatBytes(liveData.network.totalUp);
  const totalDownload = formatBytes(liveData.network.totalDown);
  const cnConnectivityBadge = liveData.cn_connectivity?.status
    ? buildCNConnectivityBadge(liveData.cn_connectivity, t)
    : null;

  return (
    <Card
      id={basic.uuid}
      className="node-card group gap-0 rounded-lg border border-border/60 bg-background/94 px-4 py-4 shadow-none transition-colors duration-200 hover:cursor-pointer hover:border-border hover:bg-background"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="pt-1">
              <Flag flag={basic.region} />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <Link to={`/instance/${basic.uuid}`} className="block min-w-0">
                <div
                  className={cn(
                    "truncate font-semibold tracking-tight text-foreground transition-colors group-hover:text-[var(--accent-11)]",
                    isMobile ? "text-lg" : "text-[1.35rem]",
                  )}
                >
                  {basic.name}
                </div>
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{basic.region || "UN"}</span>
                {basic.group ? (
                  <>
                    <span className="text-border">/</span>
                    <span>{basic.group}</span>
                  </>
                ) : null}
                {!isMobile ? (
                  <>
                    <span className="text-border">/</span>
                    <span>
                      {getOSName(basic.os)} / {basic.arch}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {cnConnectivityBadge ? (
              <Badge
                variant={cnConnectivityBadge.variant}
                className="rounded-full px-2.5 py-1"
                title={cnConnectivityBadge.title}
              >
                {cnConnectivityBadge.label}
              </Badge>
            ) : null}
            <Badge
              variant={online ? "success" : "destructive"}
              className="rounded-full px-3 py-1"
            >
              {online ? t("nodeCard.online") : t("nodeCard.offline")}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PriceTags
            hidden={false}
            price={basic.price}
            billing_cycle={basic.billing_cycle}
            expired_at={basic.expired_at}
            currency={basic.currency}
            tags={basic.tags}
            ip4={undefined}
            ip6={undefined}
          />
          {live?.message ? <Tips color="#CE282E">{live.message}</Tips> : null}
          <MiniPingChartFloat
            uuid={basic.uuid}
            hours={24}
            trigger={
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <TrendingUp size={14} />
              </Button>
            }
          />
        </div>

        <div className="panel-muted px-4 py-4">
          <div className="space-y-3">
            {!isMobile ? (
              <InfoRow
                label="OS"
                value={
                  <span className="flex items-center">
                    <img
                      src={getOSImage(basic.os)}
                      alt={basic.os}
                      className="mr-2 h-5 w-5"
                    />
                    {getOSName(basic.os)} / {basic.arch}
                  </span>
                }
              />
            ) : null}

            <div className="flex flex-col gap-3">
              <UsageBar label={t("nodeCard.cpu")} value={liveData.cpu.usage} />

              <div>
                <UsageBar label={t("nodeCard.ram")} value={memoryUsagePercent} />
                <div className="mt-1 text-sm text-muted-foreground">
                  {formatBytes(liveData.ram.used)} / {formatBytes(basic.mem_total)}
                </div>
              </div>

              <div>
                <UsageBar label={t("nodeCard.disk")} value={diskUsagePercent} />
                <div className="mt-1 text-sm text-muted-foreground">
                  {formatBytes(liveData.disk.used)} / {formatBytes(basic.disk_total)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {basic.traffic_limit > 0 ? (
            <div className="panel-muted px-4 py-4 sm:col-span-2">
              <div className="space-y-2">
                <UsageBar
                  label={t("nodeCard.totalTraffic")}
                  value={getTrafficPercentage(
                    liveData.network.totalUp,
                    liveData.network.totalDown,
                    basic.traffic_limit,
                    basic.traffic_limit_type ?? "sum",
                  )}
                  max={Infinity}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 whitespace-nowrap">
                  <span className="text-sm text-muted-foreground">
                    ↑ {totalUpload} ↓ {totalDownload}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {basic.traffic_limit_type &&
                      basic.traffic_limit_type.charAt(0).toUpperCase() +
                        basic.traffic_limit_type.slice(1)}
                    ({formatBytes(basic.traffic_limit)})
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <NodeMetricTile
              label={t("nodeCard.totalTraffic")}
              value={`↑ ${totalUpload}`}
              helper={`↓ ${totalDownload}`}
            />
          )}

          <NodeMetricTile
            label={t("nodeCard.networkSpeed")}
            value={`↑ ${uploadSpeed}/s`}
            helper={`↓ ${downloadSpeed}/s`}
          />

          <NodeMetricTile
            label={t("nodeCard.uptime")}
            value={online ? formatUptime(liveData.uptime, t) : "-"}
            helper={basic.uuid}
          />

          {isMobile ? (
            <NodeMetricTile
              label="OS"
              value={getOSName(basic.os)}
              helper={basic.arch}
            />
          ) : null}
        </div>
      </div>
    </Card>
  );
});

export default Node;

type NodeGridProps = {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
};

export const NodeGrid = ({ nodes, liveData }: NodeGridProps) => {
  const onlineNodes = liveData && liveData.online ? liveData.online : [];

  const sortedNodes = [...nodes].sort((a, b) => {
    const aIsOnline = onlineNodes.includes(a.uuid);
    const bIsOnline = onlineNodes.includes(b.uuid);

    if (aIsOnline && !bIsOnline) return -1;
    if (!aIsOnline && bIsOnline) return 1;

    return a.weight - b.weight;
  });

  return (
    <div
      className="grid w-full box-border gap-4 p-4 md:gap-5"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
      }}
    >
      {sortedNodes.map((node, index) => {
        const isOnline = onlineNodes.includes(node.uuid);
        const nodeData =
          liveData && liveData.data ? liveData.data[node.uuid] : undefined;

        return (
          <Node
            key={`${node.uuid}-${index}`}
            basic={node}
            live={nodeData}
            online={isOnline}
          />
        );
      })}
    </div>
  );
};

function getTrafficPercentage(
  totalUp: number,
  totalDown: number,
  limit: number,
  type: "max" | "min" | "sum" | "up" | "down",
) {
  if (limit === 0) return 0;
  switch (type) {
    case "max":
      return (Math.max(totalUp, totalDown) / limit) * 100;
    case "min":
      return (Math.min(totalUp, totalDown) / limit) * 100;
    case "sum":
      return ((totalUp + totalDown) / limit) * 100;
    case "up":
      return (totalUp / limit) * 100;
    case "down":
      return (totalDown / limit) * 100;
    default:
      return 0;
  }
}

import React from "react";
import type { TFunction } from "i18next";
import { TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { useIsMobile } from "@/hooks/use-mobile";
import type { LiveData, Record } from "../types/LiveData";
import { getOSImage, getOSName } from "@/utils";
import { formatBytes } from "@/utils/unitHelper";

import Flag from "./Flag";
import MiniPingChartFloat from "./MiniPingChartFloat";
import PriceTags from "./PriceTags";
import Tips from "./ui/tips";
import UsageBar from "./UsageBar";

/** 格式化秒*/
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
        className:
          "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700",
        title,
      };
    case "blocked_suspected":
      return {
        label: t("admin.nodeTable.cnConnectivityBlocked"),
        className:
          "rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700",
        title,
      };
    case "degraded":
      return {
        label: t("admin.nodeTable.cnConnectivityDegraded"),
        className:
          "rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700",
        title,
      };
    default:
      return {
        label: t("admin.nodeTable.cnConnectivityUnknown"),
        className:
          "rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600",
        title,
      };
  }
}

function InfoRow({
  label,
  value,
  mobile = false,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  mobile?: boolean;
}) {
  return (
    <div className={cn("flex justify-between", mobile && "gap-2")}>
      <span className={cn("text-sm", !mobile && "text-muted-foreground")}>
        {label}
      </span>
      <span className="text-sm">{value}</span>
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
  const { publicInfo } = usePublicInfo();
  const defaultLive = {
    cpu: { usage: 0 },
    ram: { used: 0 },
    disk: { used: 0 },
    network: { up: 0, down: 0, totalUp: 0, totalDown: 0 },
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
      style={{
        width: "100%",
        margin: "0 auto",
        transition: "all 0.2s ease-in-out",
      }}
      className="node-card gap-0 px-4 py-4 hover:cursor-pointer hover:bg-accent-2 hover:shadow-lg"
    >
      <div className="flex flex-col gap-2">
        <div
          className={cn(
            "flex items-center justify-between gap-3",
            isMobile && "-my-1",
          )}
        >
          <div className="flex min-w-0 flex-1 items-center">
            <Flag flag={basic.region} />
            <Link
              to={`/instance/${basic.uuid}`}
              style={{ flex: 1, minWidth: 0 }}
              className="min-w-0"
            >
              <div className="min-w-0">
                <div
                  className={cn(
                    "truncate font-bold",
                    isMobile ? "text-base" : "text-xl",
                  )}
                >
                  {basic.name}
                </div>
                {isMobile && (
                  <div
                    className="text-sm text-muted-foreground"
                    style={{
                      marginTop: "-3px",
                      fontSize: "0.728rem",
                    }}
                  >
                    {formatUptime(liveData.uptime, t)}
                  </div>
                )}
                <PriceTags
                  hidden={isMobile}
                  price={basic.price}
                  billing_cycle={basic.billing_cycle}
                  expired_at={basic.expired_at}
                  currency={basic.currency}
                  tags={basic.tags}
                  ip4={
                    publicInfo?.theme_settings?.showIpTagsInCard
                      ? basic.ipv4
                      : undefined
                  }
                  ip6={
                    publicInfo?.theme_settings?.showIpTagsInCard
                      ? basic.ipv6
                      : undefined
                  }
                />
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2" style={{ flex: "none" }}>
            {live?.message && <Tips color="#CE282E">{live.message}</Tips>}
            <MiniPingChartFloat
              uuid={basic.uuid}
              hours={24}
              trigger={
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                  <TrendingUp size={14} />
                </Button>
              }
            />
            {cnConnectivityBadge ? (
              <span
                className={cnConnectivityBadge.className}
                title={cnConnectivityBadge.title}
              >
                {cnConnectivityBadge.label}
              </span>
            ) : null}
            <Badge variant={online ? "success" : "destructive"}>
              {online ? t("nodeCard.online") : t("nodeCard.offline")}
            </Badge>
          </div>
        </div>

        <Separator className="-mt-1" />

        <div className="flex flex-col gap-2">
          {!isMobile && (
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
          )}

          <div className="flex flex-row gap-4 md:flex-col md:gap-1">
            <UsageBar label={t("nodeCard.cpu")} value={liveData.cpu.usage} />

            <div>
              <UsageBar label={t("nodeCard.ram")} value={memoryUsagePercent} />
              <div
                className="hidden text-sm text-muted-foreground md:block"
                style={{ marginTop: "-4px" }}
              >
                ({formatBytes(liveData.ram.used)} / {formatBytes(basic.mem_total)})
              </div>
            </div>

            <div>
              <UsageBar label={t("nodeCard.disk")} value={diskUsagePercent} />
              <div
                className="hidden text-sm text-muted-foreground md:block"
                style={{ marginTop: "-4px" }}
              >
                ({formatBytes(liveData.disk.used)} / {formatBytes(basic.disk_total)})
              </div>
            </div>
          </div>

          {basic.traffic_limit > 0 ? (
            !isMobile ? (
              <div className="flex flex-col justify-between">
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
                <div className="flex justify-between whitespace-nowrap">
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
            ) : (
              <UsageBar
                label={`${
                  basic.traffic_limit_type &&
                  basic.traffic_limit_type.charAt(0).toUpperCase() +
                    basic.traffic_limit_type.slice(1)
                }(${formatBytes(basic.traffic_limit)})`}
                max={Infinity}
                value={getTrafficPercentage(
                  liveData.network.totalUp,
                  liveData.network.totalDown,
                  basic.traffic_limit,
                  basic.traffic_limit_type ?? "sum",
                )}
              />
            )
          ) : !isMobile ? (
            <InfoRow
              label={t("nodeCard.totalTraffic")}
              value={`↑ ${totalUpload} ↓ ${totalDownload}`}
            />
          ) : null}

          {!isMobile ? (
            <>
              <InfoRow
                label={t("nodeCard.networkSpeed")}
                value={`↑ ${uploadSpeed}/s ↓ ${downloadSpeed}/s`}
              />
              <InfoRow
                label={t("nodeCard.uptime")}
                value={online ? formatUptime(liveData.uptime, t) : "-"}
              />
            </>
          ) : (
            <>
              <InfoRow
                mobile
                label={t("nodeCard.networkSpeed")}
                value={`↑ ${uploadSpeed}/s ↓ ${downloadSpeed}/s`}
              />
              <InfoRow
                mobile
                label={t("nodeCard.totalTraffic")}
                value={`↑ ${totalUpload} ↓ ${totalDownload}`}
              />
            </>
          )}
        </div>

        <PriceTags
          hidden={!isMobile}
          price={basic.price}
          billing_cycle={basic.billing_cycle}
          expired_at={basic.expired_at}
          currency={basic.currency}
          tags={basic.tags || ""}
        />
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
  const { publicInfo } = usePublicInfo();
  const offlineServerPosition = publicInfo?.theme_settings?.offlineServerPosition;
  const onlineNodes = liveData && liveData.online ? liveData.online : [];

  const sortedNodes = [...nodes].sort((a, b) => {
    const aIsOnline = onlineNodes.includes(a.uuid);
    const bIsOnline = onlineNodes.includes(b.uuid);

    if (offlineServerPosition === "First") {
      if (!aIsOnline && bIsOnline) return -1;
      if (aIsOnline && !bIsOnline) return 1;
    } else if (offlineServerPosition !== "Keep") {
      if (aIsOnline && !bIsOnline) return -1;
      if (!aIsOnline && bIsOnline) return 1;
    }

    return a.weight - b.weight;
  });

  return (
    <div
      className="grid w-full box-border gap-2 p-4 md:gap-4"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      }}
    >
      {sortedNodes.map((node) => {
        const isOnline = onlineNodes.includes(node.uuid);
        const nodeData =
          liveData && liveData.data ? liveData.data[node.uuid] : undefined;

        return (
          <Node
            key={node.uuid}
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

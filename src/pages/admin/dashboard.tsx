import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  HardDrive,
  MemoryStick,
  RefreshCw,
  Signal,
  WifiOff,
} from "lucide-react";

import {
  NodeDetailsProvider,
  useNodeDetails,
  type NodeDetail,
} from "@/contexts/NodeDetailsContext";
import {
  getDefaultAdminPath,
  useAccount,
} from "@/contexts/AccountContext";
import { useRPC2Call } from "@/contexts/RPC2Context";
import {
  ADMIN_PANEL_CLASS,
  AdminEmptyState,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
import { useAdminPageTitle } from "@/contexts/AdminPageTitleContext";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Record as LiveRecord } from "@/types/LiveData";
import { formatBytes } from "@/utils/unitHelper";

type NodeLiveSnapshot = {
  online: boolean;
  record: LiveRecord;
};

const createEmptyLiveRecord = (): LiveRecord => ({
  cpu: { usage: 0 },
  ram: { used: 0 },
  swap: { used: 0 },
  load: { load1: 0, load5: 0, load15: 0 },
  disk: { used: 0 },
  network: { up: 0, down: 0, totalUp: 0, totalDown: 0 },
  connections: { tcp: 0, udp: 0 },
  uptime: 0,
  process: 0,
  message: "",
  cn_connectivity: undefined,
  time: "",
});

const normalizeLiveSnapshot = (value: any): NodeLiveSnapshot => {
  const fallback = createEmptyLiveRecord();

  if (!value || typeof value !== "object") {
    return { online: false, record: fallback };
  }

  return {
    online: Boolean(value.online),
    record: {
      cpu: { usage: typeof value.cpu === "number" ? value.cpu : 0 },
      ram: { used: value.ram ?? 0 },
      swap: { used: value.swap ?? 0 },
      load: {
        load1: value.load ?? 0,
        load5: value.load5 ?? 0,
        load15: value.load15 ?? 0,
      },
      disk: { used: value.disk ?? 0 },
      network: {
        up: value.net_out ?? 0,
        down: value.net_in ?? 0,
        totalUp: value.net_total_out ?? value.net_total_up ?? 0,
        totalDown: value.net_total_in ?? value.net_total_down ?? 0,
      },
      connections: {
        tcp: value.connections ?? 0,
        udp: value.connections_udp ?? 0,
      },
      gpu:
        value.gpu !== undefined
          ? { count: 0, average_usage: value.gpu, detailed_info: [] }
          : undefined,
      uptime: value.uptime ?? 0,
      process: value.process ?? 0,
      message: "",
      cn_connectivity: value.cn_connectivity ?? undefined,
      time: value.time ?? "",
    },
  };
};

const clampPercent = (value: number) =>
  Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

const isNodeOnline = (live?: NodeLiveSnapshot) => Boolean(live?.online);

const getNodeRamUsagePercent = (node: NodeDetail, live?: NodeLiveSnapshot) => {
  if (!node.mem_total) return 0;
  return ((live?.record.ram.used ?? 0) / node.mem_total) * 100;
};

const getNodeDiskUsagePercent = (node: NodeDetail, live?: NodeLiveSnapshot) => {
  if (!node.disk_total) return 0;
  return ((live?.record.disk.used ?? 0) / node.disk_total) * 100;
};

const getNodeGroupLabel = (node: NodeDetail, fallback: string) => {
  const groupName = String(node.group || "").trim();
  return groupName || fallback;
};

const formatPercent = (value: number) => `${Math.round(clampPercent(value))}%`;

const getUsageTone = (value: number): "ok" | "warn" | "bad" | "info" => {
  if (value >= 90) return "bad";
  if (value >= 75) return "warn";
  return "ok";
};

const getWorstUsage = (cpu: number, ram: number, disk: number) =>
  Math.max(clampPercent(cpu), clampPercent(ram), clampPercent(disk));

const getWorstMetricLabel = (cpu: number, ram: number, disk: number) => {
  const entries = [
    { label: "CPU", value: cpu },
    { label: "RAM", value: ram },
    { label: "DISK", value: disk },
  ].sort((left, right) => right.value - left.value);

  return `${entries[0].label} ${formatPercent(entries[0].value)}`;
};

const panelClass = ADMIN_PANEL_CLASS;

function DashboardLoadingState() {
  const { t } = useTranslation();
  useAdminPageTitle(
    t("admin.dashboard.menu", { defaultValue: "仪表盘" }),
    t("admin.dashboard.homeDescription", {
      defaultValue: "集中查看服务器健康、资源压力、分组状态和可用能力。",
    }),
  );

  return (
    <div className="flex min-w-0 flex-col gap-[14px] p-3 sm:p-4 md:p-6">
      <AdminTableSkeleton columns={5} rows={5} />
    </div>
  );
}

function DashboardPageContent() {
  const { t } = useTranslation();
  const { call } = useRPC2Call();
  const { nodeDetail, isLoading, error, refresh } = useNodeDetails();
  useAdminPageTitle(
    t("admin.dashboard.homeTitle", { defaultValue: "后台首页" }),
    t("admin.dashboard.homeDescription", {
      defaultValue: "集中查看服务器健康、资源压力、分组状态和可用能力。",
    }),
  );
  const [liveByNode, setLiveByNode] = useState<Record<string, NodeLiveSnapshot>>(
    {},
  );
  const [liveLoaded, setLiveLoaded] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const defaultGroupLabel = t("admin.nodeTable.defaultGroup", {
    defaultValue: "Default group",
  });
  const nodes = useMemo(
    () =>
      [...(Array.isArray(nodeDetail) ? nodeDetail : [])].sort((left, right) => {
        const leftGroup = getNodeGroupLabel(left, defaultGroupLabel);
        const rightGroup = getNodeGroupLabel(right, defaultGroupLabel);
        const groupDiff = leftGroup.localeCompare(rightGroup);
        if (groupDiff !== 0) return groupDiff;
        return String(left.name || "").localeCompare(String(right.name || ""), "zh-CN");
      }),
    [defaultGroupLabel, nodeDetail],
  );
  const liveScopeUUIDs = useMemo(
    () => nodes.map((node) => node.uuid),
    [nodes],
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      refresh({ silent: true });
    }, 5000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    let timer: number | undefined;
    let stopped = false;
    let running = false;
    const pollUUIDs = [...liveScopeUUIDs];

    if (pollUUIDs.length === 0) {
      setLiveByNode({});
      setLiveLoaded(true);
      setLiveError(null);
      return () => {
        stopped = true;
      };
    }

    const pollLiveData = async () => {
      if (running) return;
      running = true;

      try {
        const result: Record<string, any> = await call("common:getNodesLatestStatus", {
          uuids: pollUUIDs,
        });
        if (stopped) return;

        const nextState: Record<string, NodeLiveSnapshot> = {};
        Object.entries(result || {}).forEach(([uuid, value]) => {
          nextState[uuid] = normalizeLiveSnapshot(value);
        });
        setLiveByNode(nextState);
        setLiveLoaded(true);
        setLiveError(null);
      } catch (pollError) {
        console.error("Failed to fetch node live data:", pollError);
        setLiveError("Failed to fetch node live data");
      } finally {
        running = false;
        if (!stopped) {
          timer = window.setTimeout(pollLiveData, 3000);
        }
      }
    };

    void pollLiveData();

    return () => {
      stopped = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [call, liveScopeUUIDs]);

  const onlineCount = nodes.filter((node) => isNodeOnline(liveByNode[node.uuid])).length;
  const offlineCount = Math.max(nodes.length - onlineCount, 0);
  const riskItems = useMemo(
    () =>
      nodes
        .map((node) => {
          const live = liveByNode[node.uuid];
          const cpu = clampPercent(live?.record.cpu.usage ?? 0);
          const ram = clampPercent(getNodeRamUsagePercent(node, live));
          const disk = clampPercent(getNodeDiskUsagePercent(node, live));
          const offline = liveLoaded && !isNodeOnline(live);
          const cnStatus = live?.record.cn_connectivity?.status;
          const connectivityRisk =
            cnStatus === "blocked_suspected" || cnStatus === "degraded";
          const highUsage = getWorstUsage(cpu, ram, disk);
          const score =
            (offline ? 120 : 0) +
            (connectivityRisk ? 90 : 0) +
            (highUsage >= 90 ? 80 : highUsage >= 75 ? 50 : 0);
          const reason = offline
            ? t("nodeCard.offline", { defaultValue: "离线" })
            : connectivityRisk
              ? t("admin.dashboard.connectivityRisk", {
                  defaultValue: "连通性异常",
                })
              : highUsage >= 90
                ? t("admin.dashboard.highUsage", { defaultValue: "资源高占用" })
                : highUsage >= 75
                  ? t("admin.dashboard.usageWarning", {
                      defaultValue: "资源占用偏高",
                    })
                  : "";

          return {
            node,
            score,
            reason,
            tone: offline || highUsage >= 90 ? ("bad" as const) : ("warn" as const),
            group: getNodeGroupLabel(node, defaultGroupLabel),
            cpu,
            ram,
            disk,
            usageLabel: getWorstMetricLabel(cpu, ram, disk),
          };
        })
        .filter((item) => item.score > 0)
        .sort((left, right) => right.score - left.score),
    [defaultGroupLabel, liveByNode, liveLoaded, nodes, t],
  );
  const riskNodes = useMemo(() => riskItems.slice(0, 6), [riskItems]);
  const abnormalCount = riskItems.length;
  const capacityItems = useMemo(
    () =>
      nodes
        .map((node) => {
          const live = liveByNode[node.uuid];
          const cpu = clampPercent(live?.record.cpu.usage ?? 0);
          const ram = clampPercent(getNodeRamUsagePercent(node, live));
          const disk = clampPercent(getNodeDiskUsagePercent(node, live));
          const pressure = getWorstUsage(cpu, ram, disk);

          return {
            node,
            group: getNodeGroupLabel(node, defaultGroupLabel),
            cpu,
            ram,
            disk,
            pressure,
            traffic: `${formatBytes(live?.record.network.up ?? 0)}/s ↑ · ${formatBytes(
              live?.record.network.down ?? 0,
            )}/s ↓`,
            online: isNodeOnline(live),
          };
        })
        .sort((left, right) => right.pressure - left.pressure)
        .slice(0, 5),
    [defaultGroupLabel, liveByNode, nodes],
  );
  const groupSummaries = useMemo(() => {
    const groups = new Map<
      string,
      { total: number; online: number; risks: number; pressureTotal: number }
    >();

    nodes.forEach((node) => {
      const groupName = getNodeGroupLabel(node, defaultGroupLabel);
      const live = liveByNode[node.uuid];
      const cpu = clampPercent(live?.record.cpu.usage ?? 0);
      const ram = clampPercent(getNodeRamUsagePercent(node, live));
      const disk = clampPercent(getNodeDiskUsagePercent(node, live));
      const pressure = getWorstUsage(cpu, ram, disk);
      const connectivityRisk =
        live?.record.cn_connectivity?.status === "blocked_suspected" ||
        live?.record.cn_connectivity?.status === "degraded";
      const current = groups.get(groupName) || {
        total: 0,
        online: 0,
        risks: 0,
        pressureTotal: 0,
      };
      current.total += 1;
      current.pressureTotal += pressure;
      if (isNodeOnline(live)) {
        current.online += 1;
      }
      if ((liveLoaded && !isNodeOnline(live)) || connectivityRisk || pressure >= 75) {
        current.risks += 1;
      }
      groups.set(groupName, current);
    });

    return Array.from(groups.entries())
      .map(([name, summary]) => ({
        name,
        ...summary,
        offline: Math.max(summary.total - summary.online, 0),
        averagePressure: summary.total
          ? summary.pressureTotal / summary.total
          : 0,
      }))
      .sort(
        (left, right) =>
          right.risks - left.risks ||
          right.offline - left.offline ||
          right.total - left.total ||
          left.name.localeCompare(right.name),
      )
      .slice(0, 6);
  }, [defaultGroupLabel, liveByNode, liveLoaded, nodes]);
  const healthTone: "ok" | "warn" | "bad" =
    offlineCount > 0 ? "bad" : abnormalCount > 0 ? "warn" : "ok";
  const healthTitle =
    healthTone === "bad"
      ? t("admin.dashboard.healthNeedsAction", { defaultValue: "有节点需要立即处理" })
      : healthTone === "warn"
        ? t("admin.dashboard.healthNeedsAttention", { defaultValue: "运行中存在风险" })
        : t("admin.dashboard.healthStable", { defaultValue: "当前运行平稳" });
  const healthDescription =
    nodes.length === 0
      ? t("admin.dashboard.noNodesForDashboard", {
          defaultValue: "接入服务器后，这里会显示在线状态和资源压力。",
        })
      : t("admin.dashboard.healthSummary", {
          online: onlineCount,
          total: nodes.length,
          risk: abnormalCount,
          defaultValue: "{{online}}/{{total}} 台在线，{{risk}} 个风险项。",
        });

  if (isLoading) {
    return <DashboardLoadingState />;
  }

  if (error) {
    return (
      <div className="flex min-w-0 flex-col gap-[14px] p-3 sm:p-4 md:p-6">
        <AdminEmptyState
          icon={<AlertTriangle className="h-5 w-5" />}
          title={t("common.error", { defaultValue: "错误" })}
          description={error}
          actions={(
            <Button onClick={() => void refresh()}>
              {t("common.refresh", { defaultValue: "刷新" })}
            </Button>
          )}
        />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-[14px] p-3 sm:p-4 md:p-6">
      {liveError ? (
        <Alert variant="destructive">
          <AlertTitle>{t("common.error", { defaultValue: "错误" })}</AlertTitle>
          <AlertDescription>
            {t("admin.dashboard.liveError", {
              defaultValue: "实时状态接口暂时不可用，仪表盘会保留最近一次数据。",
            })}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid items-stretch gap-[14px] lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.68fr)]">
        <section className={cn(panelClass, "flex min-h-[230px] flex-col")}>
          <DashboardPanelHead
            title={t("admin.dashboard.healthTitle", { defaultValue: "系统健康" })}
            meta={t("admin.dashboard.realtime", { defaultValue: "实时巡检" })}
            action={(
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 px-2.5"
                onClick={() => void refresh()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t("common.refresh", { defaultValue: "刷新" })}
              </Button>
            )}
          />
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)] lg:items-start">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
                    healthTone === "bad"
                      ? "bg-red-50 text-red-600 dark:bg-red-950/25 dark:text-red-300"
                      : healthTone === "warn"
                        ? "bg-amber-50 text-amber-600 dark:bg-amber-950/25 dark:text-amber-300"
                        : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/25 dark:text-emerald-300",
                  )}
                >
                  {healthTone === "bad" ? (
                    <WifiOff className="h-5 w-5" />
                  ) : healthTone === "warn" ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold leading-7 text-foreground">
                    {healthTitle}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {healthDescription}
                  </p>
                </div>
              </div>
              <DashboardHealthRail
                online={onlineCount}
                offline={offlineCount}
                risks={abnormalCount}
                total={nodes.length}
              />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
              <DashboardHealthCount
                icon={<Signal className="h-4 w-4" />}
                label={t("nodeCard.online", { defaultValue: "在线" })}
                value={`${onlineCount}`}
                tone="ok"
              />
              <DashboardHealthCount
                icon={<WifiOff className="h-4 w-4" />}
                label={t("nodeCard.offline", { defaultValue: "离线" })}
                value={`${offlineCount}`}
                tone={offlineCount > 0 ? "bad" : "ok"}
              />
              <DashboardHealthCount
                icon={<AlertTriangle className="h-4 w-4" />}
                label={t("admin.dashboard.abnormal", { defaultValue: "异常风险" })}
                value={`${abnormalCount}`}
                tone={abnormalCount > 0 ? "warn" : "ok"}
              />
              <DashboardHealthCount
                icon={<Activity className="h-4 w-4" />}
                label={t("admin.dashboard.groupsTitle", { defaultValue: "分组状态" })}
                value={`${groupSummaries.length}`}
                tone="info"
              />
            </div>
          </div>
        </section>

        <section className={cn(panelClass, "flex min-h-[230px] flex-col")}>
          <DashboardPanelHead
            title={t("admin.dashboard.attentionTitle", { defaultValue: "近期风险" })}
            meta={t("admin.dashboard.nodeRisk", { defaultValue: "节点风险" })}
          />
          {riskNodes.length > 0 ? (
            <div className="flex flex-1 flex-col">
              {riskNodes.slice(0, 3).map(({ node, reason, tone, group, cpu, ram, disk, usageLabel }, index) => (
                <DashboardSignalRow
                  key={`${node.uuid}-risk-${index}`}
                  title={node.name || node.uuid}
                  description={`${group} · ${usageLabel}`}
                  detail={`CPU ${formatPercent(cpu)} · RAM ${formatPercent(ram)} · DISK ${formatPercent(disk)}`}
                  status={<DashboardStatus tone={tone}>{reason}</DashboardStatus>}
                />
              ))}
            </div>
          ) : (
            <DashboardSignalRow
              title={t("admin.dashboard.noRiskTitle", { defaultValue: "暂无明显风险" })}
              description={t("admin.dashboard.noRiskDescription", {
                defaultValue: "当前没有离线、连通性异常或高资源占用的节点。",
              })}
              detail={t("admin.dashboard.healthy", { defaultValue: "运行正常" })}
              status={<DashboardStatus tone="ok">{t("admin.dashboard.healthy", { defaultValue: "运行正常" })}</DashboardStatus>}
            />
          )}
        </section>
      </div>

      <div className="grid items-start gap-[14px] lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <section className={panelClass}>
          <DashboardPanelHead
            title={t("admin.dashboard.capacityTitle", { defaultValue: "容量压力" })}
            meta={t("admin.dashboard.capacityDescription", {
              defaultValue: "按最高资源占用排序",
            })}
          />
          {capacityItems.length > 0 ? (
            <div className="flex flex-col">
              {capacityItems.slice(0, 5).map(({ node, group, cpu, ram, disk, pressure, traffic, online }, index) => (
                <DashboardSignalRow
                  key={`${node.uuid}-capacity-${index}`}
                  title={node.name || node.uuid}
                  description={`${group} · ${traffic}`}
                  detail={(
                    <div className="grid gap-1.5 pt-1">
                      <DashboardUsageBar icon={<Cpu className="h-3.5 w-3.5" />} label="CPU" value={cpu} />
                      <DashboardUsageBar icon={<MemoryStick className="h-3.5 w-3.5" />} label="RAM" value={ram} />
                      <DashboardUsageBar icon={<HardDrive className="h-3.5 w-3.5" />} label="DISK" value={disk} />
                    </div>
                  )}
                  status={(
                    <DashboardStatus tone={!online ? "bad" : getUsageTone(pressure)}>
                      {!online
                        ? t("nodeCard.offline", { defaultValue: "离线" })
                        : formatPercent(pressure)}
                    </DashboardStatus>
                  )}
                />
              ))}
            </div>
          ) : (
            <DashboardSignalRow
              title={t("admin.nodeTable.noNodes", { defaultValue: "No nodes" })}
              description={t("admin.nodeTable.noNodesDescription", {
                defaultValue: "完成服务器接入后，节点会自动出现在这里。",
              })}
              detail={t("admin.dashboard.noNodesForDashboard", {
                defaultValue: "接入服务器后，这里会显示在线状态和资源压力。",
              })}
              status={<DashboardStatus tone="info">0</DashboardStatus>}
            />
          )}
        </section>

        <section className={panelClass}>
          <DashboardPanelHead
            title={t("admin.dashboard.groupsTitle", { defaultValue: "分组状态" })}
            meta={t("admin.dashboard.groupsDescription", {
              defaultValue: "按服务器分组查看容量和在线状态。",
            })}
          />
          {groupSummaries.length > 0 ? (
            <div className="flex flex-col">
              {groupSummaries.slice(0, 6).map((group) => (
                <DashboardGroupRow
                  key={group.name}
                  name={group.name}
                  total={group.total}
                  online={group.online}
                  risks={group.risks}
                  pressure={group.averagePressure}
                />
              ))}
            </div>
          ) : (
            <DashboardSignalRow
              title={t("admin.nodeTable.noNodes", { defaultValue: "No nodes" })}
              description={t("admin.nodeTable.noNodesDescription", {
                defaultValue: "完成服务器接入后，节点会自动出现在这里。",
              })}
              detail={t("admin.dashboard.noNodesForDashboard", {
                defaultValue: "接入服务器后，这里会显示在线状态和资源压力。",
              })}
              status={<DashboardStatus tone="info">0</DashboardStatus>}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function DashboardPanelHead({
  title,
  meta,
  action,
}: {
  title: ReactNode;
  meta: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 border-b border-border px-4">
      <div className="min-w-0">
        <strong className="block truncate text-sm font-semibold leading-5 text-foreground">
          {title}
        </strong>
        <span className="block truncate text-[12px] leading-4 text-muted-foreground">
          {meta}
        </span>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function DashboardStatus({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "bad" | "info";
  children: ReactNode;
}) {
  const toneClass = {
    ok: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-300",
    warn: "bg-amber-50 text-amber-700 dark:bg-amber-950/25 dark:text-amber-300",
    bad: "bg-red-50 text-red-700 dark:bg-red-950/25 dark:text-red-300",
    info: "bg-blue-50 text-blue-700 dark:bg-blue-950/25 dark:text-blue-300",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-[11px] font-bold leading-none",
        toneClass,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

function DashboardHealthCount({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: ReactNode;
  value: ReactNode;
  tone: "ok" | "warn" | "bad" | "info";
}) {
  const toneClass = {
    ok: "text-emerald-700 dark:text-emerald-300",
    warn: "text-amber-700 dark:text-amber-300",
    bad: "text-red-700 dark:text-red-300",
    info: "text-blue-700 dark:text-blue-300",
  }[tone];

  return (
    <div className="flex min-w-[7rem] items-center gap-2">
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--surface-subtle)]", toneClass)}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-medium leading-4 text-muted-foreground">
          {label}
        </div>
        <div className="text-base font-semibold leading-5 tabular-nums text-foreground">
          {value}
        </div>
      </div>
    </div>
  );
}

function DashboardHealthRail({
  online,
  offline,
  risks,
  total,
}: {
  online: number;
  offline: number;
  risks: number;
  total: number;
}) {
  const { t } = useTranslation();
  const onlineRisk = Math.min(Math.max(risks - offline, 0), online);
  const healthy = Math.max(online - onlineRisk, 0);
  const denominator = Math.max(total, 1);

  if (total === 0) {
    return (
      <div className="border-y border-dashed border-slate-200/80 py-3 dark:border-slate-800">
        <div className="h-2 rounded-full bg-muted" />
        <div className="mt-2 text-[12px] leading-4 text-muted-foreground">
          {t("admin.dashboard.healthRailPending", {
            defaultValue: "等待服务器接入后生成健康轨迹。",
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="border-y border-slate-200/80 py-3 dark:border-slate-800">
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        <span
          className="bg-emerald-500"
          style={{ width: `${(healthy / denominator) * 100}%` }}
        />
        <span
          className="bg-amber-400"
          style={{ width: `${(onlineRisk / denominator) * 100}%` }}
        />
        <span
          className="bg-red-500"
          style={{ width: `${(offline / denominator) * 100}%` }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] leading-4 text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {t("admin.dashboard.healthyNodes", { defaultValue: "健康" })} {healthy}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          {t("admin.dashboard.attention", { defaultValue: "关注" })} {onlineRisk}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          {t("nodeCard.offline", { defaultValue: "离线" })} {offline}
        </span>
      </div>
    </div>
  );
}

function DashboardSignalRow({
  title,
  description,
  detail,
  status,
}: {
  title: ReactNode;
  description: ReactNode;
  detail: ReactNode;
  status: ReactNode;
}) {
  return (
    <div className="grid min-h-[72px] grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border px-[14px] py-3 last:border-b-0">
      <div className="min-w-0">
        <strong className="block truncate text-[13px] font-semibold leading-5 text-foreground">
          {title}
        </strong>
        <span className="block truncate text-[12px] leading-5 text-muted-foreground">
          {description}
        </span>
        <div className="mt-1 text-[11px] leading-4 text-muted-foreground">
          {detail}
        </div>
      </div>
      <div className="shrink-0 pt-0.5">{status}</div>
    </div>
  );
}

function DashboardUsageBar({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: ReactNode;
  value: number;
}) {
  const tone = getUsageTone(value);
  const barClass = {
    ok: "bg-emerald-500",
    warn: "bg-amber-400",
    bad: "bg-red-500",
    info: "bg-blue-500",
  }[tone];

  return (
    <div className="grid grid-cols-[56px_minmax(0,1fr)_40px] items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold leading-4 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="h-1.5 overflow-hidden rounded-full bg-muted">
        <span
          className={cn("block h-full rounded-full", barClass)}
          style={{ width: `${clampPercent(value)}%` }}
        />
      </span>
      <span className="text-right text-[11px] font-semibold leading-4 tabular-nums text-foreground">
        {formatPercent(value)}
      </span>
    </div>
  );
}

function DashboardGroupRow({
  name,
  total,
  online,
  risks,
  pressure,
}: {
  name: string;
  total: number;
  online: number;
  risks: number;
  pressure: number;
}) {
  const { t } = useTranslation();
  const offline = Math.max(total - online, 0);
  const tone = offline > 0 ? "bad" : risks > 0 ? "warn" : "ok";

  return (
    <div className="grid min-h-[66px] grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border px-[14px] py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <strong className="truncate text-[13px] font-semibold leading-5 text-foreground">
            {name}
          </strong>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold leading-4 text-muted-foreground">
            {online}/{total}
          </span>
        </div>
        <div className="mt-2">
          <DashboardUsageBar
            icon={<Activity className="h-3.5 w-3.5" />}
            label={t("admin.dashboard.pressure", { defaultValue: "压力" })}
            value={pressure}
          />
        </div>
      </div>
      <DashboardStatus tone={tone}>
        {offline > 0
          ? t("nodeCard.offline", { defaultValue: "离线" })
          : risks > 0
            ? t("admin.dashboard.attention", { defaultValue: "关注" })
            : t("admin.dashboard.normal", { defaultValue: "正常" })}
      </DashboardStatus>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { account, loading, platformAdmin } = useAccount();

  if (loading) {
    return <DashboardLoadingState />;
  }

  if (!platformAdmin) {
    return <Navigate to={getDefaultAdminPath(account)} replace />;
  }

  return (
    <NodeDetailsProvider>
      <DashboardPageContent />
    </NodeDetailsProvider>
  );
}

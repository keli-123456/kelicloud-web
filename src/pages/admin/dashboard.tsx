import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Server,
} from "lucide-react";

import {
  NodeDetailsProvider,
  useNodeDetails,
  type NodeDetail,
} from "@/contexts/NodeDetailsContext";
import {
  getDefaultAdminPath,
  useAccount,
  type AccountFeature,
} from "@/contexts/AccountContext";
import { useRPC2Call } from "@/contexts/RPC2Context";
import {
  AdminCardGridSkeleton,
  AdminEmptyState,
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

const panelClass =
  "overflow-hidden rounded-lg border border-border bg-card shadow-sm shadow-slate-900/5";

function DashboardLoadingState() {
  const { t } = useTranslation();
  useAdminPageTitle(
    t("admin.dashboard.menu", { defaultValue: "仪表盘" }),
    t("admin.dashboard.homeDescription", {
      defaultValue:
        "聚合 /api/me、settings、feature scope、clients、orders、logs，为管理员提供一屏判断。",
    }),
  );

  return (
    <div className="flex min-w-0 flex-col gap-[14px] p-3 sm:p-4 md:p-6">
      <AdminCardGridSkeleton cards={4} />
    </div>
  );
}

function DashboardPageContent() {
  const { t } = useTranslation();
  const { call } = useRPC2Call();
  const { hasFeature, platformAdmin } = useAccount();
  const { nodeDetail, isLoading, error, refresh } = useNodeDetails();
  useAdminPageTitle(
    t("admin.dashboard.homeTitle", { defaultValue: "后台首页" }),
    t("admin.dashboard.homeDescription", {
      defaultValue:
        "聚合 /api/me、settings、feature scope、clients、orders、logs，为管理员提供一屏判断。",
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
          const highUsage = Math.max(cpu, ram, disk);
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
            cpu,
            ram,
            disk,
          };
        })
        .filter((item) => item.score > 0)
        .sort((left, right) => right.score - left.score),
    [liveByNode, liveLoaded, nodes, t],
  );
  const riskNodes = useMemo(() => riskItems.slice(0, 6), [riskItems]);
  const abnormalCount = riskItems.length;
  const groupSummaries = useMemo(() => {
    const groups = new Map<string, { total: number; online: number }>();

    nodes.forEach((node) => {
      const groupName = getNodeGroupLabel(node, defaultGroupLabel);
      const current = groups.get(groupName) || { total: 0, online: 0 };
      current.total += 1;
      if (isNodeOnline(liveByNode[node.uuid])) {
        current.online += 1;
      }
      groups.set(groupName, current);
    });

    return Array.from(groups.entries())
      .map(([name, summary]) => ({ name, ...summary }))
      .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name))
      .slice(0, 6);
  }, [defaultGroupLabel, liveByNode, nodes]);
  const anyCloudEnabled = [
    "cloud_digitalocean",
    "cloud_linode",
    "cloud_vultr",
    "cloud_azure",
    "cloud_aws",
    "cloud_dns",
    "cloud_failover",
  ].some((feature) => hasFeature(feature as AccountFeature));
  const featureModules = [
    {
      title: "Clients / Records",
      description: t("admin.dashboard.moduleClients", {
        defaultValue: "节点与历史记录",
      }),
      enabled: hasFeature("clients") || hasFeature("records"),
      tone: "ok" as const,
      label: t("common.available", { defaultValue: "可用" }),
    },
    {
      title: "Cloud / DNS",
      description: t("admin.dashboard.moduleCloud", {
        defaultValue: "云实例与解析绑定",
      }),
      enabled: anyCloudEnabled,
      tone: anyCloudEnabled ? ("ok" as const) : ("info" as const),
      label: anyCloudEnabled
        ? t("common.available", { defaultValue: "可用" })
        : t("common.disabled", { defaultValue: "Disabled" }),
    },
    {
      title: "Terminal / Exec",
      description: t("admin.dashboard.moduleExec", {
        defaultValue: "远程终端与命令任务",
      }),
      enabled: hasFeature("tasks") || hasFeature("clipboard"),
      tone: "warn" as const,
      label: t("admin.dashboard.audit", { defaultValue: "需审计" }),
    },
    {
      title: "Billing",
      description: t("admin.dashboard.moduleBilling", {
        defaultValue: "套餐、支付与订单",
      }),
      enabled: platformAdmin,
      tone: "info" as const,
      label: platformAdmin
        ? t("admin.dashboard.platform", { defaultValue: "平台" })
        : t("common.disabled", { defaultValue: "Disabled" }),
    },
  ];
  const canUseClients = hasFeature("clients");
  const canUseScripts = hasFeature("clipboard");

  if (isLoading) {
    return <DashboardLoadingState />;
  }

  if (error) {
    return (
      <div className="flex min-w-0 flex-col gap-[14px] p-3 sm:p-4 md:p-6">
        <AdminEmptyState
          icon={<AlertTriangle className="h-5 w-5" />}
          title={t("common.error", { defaultValue: "Error" })}
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
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={() => void refresh()}>
            {t("admin.dashboard.selfCheck", { defaultValue: "运行自检" })}
          </Button>
          {canUseClients ? (
          <Button asChild>
            <Link to="/admin/client">
              <Server className="h-4 w-4" />
              {t("admin.dashboard.addNode", { defaultValue: "添加节点" })}
            </Link>
          </Button>
          ) : null}
      </div>

      {liveError ? (
        <Alert variant="destructive">
          <AlertTitle>{t("common.error", { defaultValue: "Error" })}</AlertTitle>
          <AlertDescription>
            {t("admin.dashboard.liveError", {
              defaultValue: "实时状态接口暂时不可用，仪表盘会保留最近一次数据。",
            })}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-[14px] lg:grid-cols-[0.95fr_1.25fr_0.8fr]">
        <section className={panelClass}>
          <DashboardPanelHead
            title={t("admin.dashboard.modulesTitle", { defaultValue: "功能模块" })}
            meta="UserFeature"
          />
          <div className="flex flex-col">
            {featureModules.map((module) => (
              <DashboardListRow
                key={module.title}
                title={module.title}
                description={module.description}
                status={<DashboardStatus tone={module.enabled ? module.tone : "info"}>{module.label}</DashboardStatus>}
              />
            ))}
          </div>
        </section>

        <section className={panelClass}>
          <DashboardPanelHead
            title={t("admin.dashboard.healthTitle", { defaultValue: "系统健康" })}
            meta={t("admin.dashboard.last24h", { defaultValue: "最近 24 小时" })}
          />
          <DashboardChart />
          <DashboardMiniTable
            rows={[
              {
                label: t("nodeCard.online", { defaultValue: "Online" }),
                value: `${onlineCount}`,
                status: (
                  <DashboardStatus tone="ok">
                    {t("admin.dashboard.normal", { defaultValue: "正常" })}
                  </DashboardStatus>
                ),
              },
              {
                label: t("nodeCard.offline", { defaultValue: "Offline" }),
                value: `${offlineCount}`,
                status: (
                  <DashboardStatus tone={offlineCount > 0 ? "warn" : "ok"}>
                    {offlineCount > 0
                      ? t("admin.dashboard.attention", { defaultValue: "关注" })
                      : t("admin.dashboard.normal", { defaultValue: "正常" })}
                  </DashboardStatus>
                ),
              },
              {
                label: t("admin.dashboard.abnormal", { defaultValue: "异常风险" }),
                value: `${abnormalCount}`,
                status: (
                  <DashboardStatus tone={abnormalCount > 0 ? "warn" : "ok"}>
                    {abnormalCount > 0
                      ? t("admin.dashboard.attention", { defaultValue: "关注" })
                      : t("admin.dashboard.healthy", { defaultValue: "运行正常" })}
                  </DashboardStatus>
                ),
              },
            ]}
          />
        </section>

        <section className={panelClass}>
          <DashboardPanelHead
            title={t("admin.dashboard.quickActions", { defaultValue: "快捷入口" })}
            meta={t("admin.dashboard.frequentActions", { defaultValue: "高频动作" })}
          />
          <div className="grid gap-2.5 p-[14px]">
            {canUseClients ? (
              <Button asChild>
                <Link to="/admin/client">
                  {t("admin.dashboard.installCommand", {
                    defaultValue: "生成 Agent 安装命令",
                  })}
                </Link>
              </Button>
            ) : null}
            {canUseScripts ? (
              <Button asChild variant="outline">
                <Link to="/admin/exec?view=scripts">
                  {t("admin.dashboard.commandLibrary", { defaultValue: "命令库" })}
                </Link>
              </Button>
            ) : null}
            {platformAdmin ? (
              <>
                <Button asChild variant="outline">
                  <Link to="/admin/settings/site">
                    {t("admin.dashboard.backup", { defaultValue: "下载备份" })}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100">
                  <Link to="/admin/settings/site">
                    {t("admin.dashboard.restoreBackup", { defaultValue: "上传恢复备份" })}
                  </Link>
                </Button>
              </>
            ) : null}
          </div>
        </section>
      </div>

      <div className="grid gap-[14px] lg:grid-cols-[1.2fr_0.8fr]">
        <section className={panelClass}>
          <DashboardPanelHead
            title={t("admin.dashboard.attentionTitle", { defaultValue: "近期风险" })}
            meta={t("admin.dashboard.nodeRisk", { defaultValue: "Node risk" })}
          />
          {riskNodes.length > 0 ? (
            <div className="flex flex-col">
              {riskNodes.slice(0, 4).map(({ node, reason, cpu, ram, disk }) => (
                <DashboardListRow
                  key={node.uuid}
                  title={node.name || node.uuid}
                  description={`${getNodeGroupLabel(node, defaultGroupLabel)} · CPU ${Math.round(cpu)}% · RAM ${Math.round(ram)}% · DISK ${Math.round(disk)}%`}
                  status={<DashboardStatus tone="warn">{reason}</DashboardStatus>}
                  to="/admin/client"
                />
              ))}
            </div>
          ) : (
            <DashboardListRow
              title={t("admin.dashboard.noRiskTitle", { defaultValue: "暂无明显风险" })}
              description={t("admin.dashboard.noRiskDescription", {
                defaultValue: "当前没有离线、连通性异常或高资源占用的节点。",
              })}
              status={<DashboardStatus tone="ok">{t("admin.dashboard.healthy", { defaultValue: "运行正常" })}</DashboardStatus>}
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
              {groupSummaries.slice(0, 4).map((group) => (
                <DashboardListRow
                  key={group.name}
                  title={group.name}
                  description={t("admin.dashboard.groupNodeCount", {
                    total: group.total,
                    defaultValue: "{{total}} 台服务器",
                  })}
                  status={<DashboardStatus tone="info">{group.online}/{group.total}</DashboardStatus>}
                  to="/admin/client"
                />
              ))}
            </div>
          ) : (
            <DashboardListRow
              title={t("admin.nodeTable.noNodes", { defaultValue: "No nodes" })}
              description={t("admin.nodeTable.noNodesDescription", {
                defaultValue: "生成 Agent 接入命令并在服务器执行后，节点会自动出现在这里。",
              })}
              status={<DashboardStatus tone="info">0</DashboardStatus>}
              to="/admin/client"
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
}: {
  title: ReactNode;
  meta: ReactNode;
}) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 border-b border-border px-4">
      <strong className="text-sm font-semibold leading-5 text-foreground">
        {title}
      </strong>
      <span className="truncate text-[12px] leading-4 text-muted-foreground">
        {meta}
      </span>
    </div>
  );
}

function DashboardListRow({
  title,
  description,
  status,
  to,
}: {
  title: ReactNode;
  description: ReactNode;
  status: ReactNode;
  to?: string;
}) {
  const content = (
    <>
      <div className="min-w-0">
        <strong className="block truncate text-[13px] font-semibold leading-5 text-foreground">
          {title}
        </strong>
        <span className="block truncate text-[11px] leading-4 text-muted-foreground">
          {description}
        </span>
      </div>
      <div className="shrink-0">{status}</div>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-[14px] py-2.5 transition-colors last:border-b-0 hover:bg-muted/35"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-[14px] py-2.5 last:border-b-0">
      {content}
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

function DashboardChart() {
  return (
    <div
      className="relative h-40 border-b border-border px-4 pb-3 pt-4"
      style={{
        backgroundImage:
          "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
        backgroundPosition: "0 30px, 0 0",
        backgroundSize: "100% 36px, 66px 100%",
      }}
    >
      <svg
        viewBox="0 0 560 130"
        preserveAspectRatio="none"
        className="h-full w-full overflow-visible"
        aria-hidden="true"
      >
        <path
          d="M0,88 C52,72 74,80 116,48 S190,28 236,58 316,110 374,64 462,30 560,42"
          fill="none"
          stroke="#2f6fe4"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M0,108 C82,96 112,106 168,88 S276,58 348,78 452,102 560,72"
          fill="none"
          stroke="#159f95"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function DashboardMiniTable({
  rows,
}: {
  rows: Array<{
    label: ReactNode;
    value: ReactNode;
    status: ReactNode;
  }>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-muted/45 text-muted-foreground">
            <th className="h-[42px] whitespace-nowrap border-b border-border px-[14px] text-left font-bold">
              事件
            </th>
            <th className="h-[42px] whitespace-nowrap border-b border-border px-[14px] text-left font-bold">
              数量
            </th>
            <th className="h-[42px] whitespace-nowrap border-b border-border px-[14px] text-left font-bold">
              趋势
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td className="h-[42px] whitespace-nowrap border-b border-border px-[14px] last:border-b-0">
                {row.label}
              </td>
              <td className="h-[42px] whitespace-nowrap border-b border-border px-[14px] font-semibold tabular-nums last:border-b-0">
                {row.value}
              </td>
              <td className="h-[42px] whitespace-nowrap border-b border-border px-[14px] last:border-b-0">
                {row.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { account, hasFeature, loading } = useAccount();

  if (loading) {
    return <DashboardLoadingState />;
  }

  if (!hasFeature("clients")) {
    return <Navigate to={getDefaultAdminPath(account)} replace />;
  }

  return (
    <NodeDetailsProvider>
      <DashboardPageContent />
    </NodeDetailsProvider>
  );
}

import React, { useEffect, useState } from "react";
import {
  NodeDetailsProvider,
  useNodeDetails,
  type NodeDetail,
} from "@/contexts/NodeDetailsContext";
import {
  getDefaultAdminPath,
  useAccount,
} from "@/contexts/AccountContext";
import { useAdminPageTitle } from "@/contexts/AdminPageTitleContext";
import { t as translate } from "i18next";
import {
  Badge,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AdminDataPanel,
  AdminEmptyState,
  AdminPageShell,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
import {
  AdminPagination,
  useClientPagination,
} from "@/components/admin/AdminPagination";
import {
  Copy,
  Download,
  Globe,
  MoreHorizontal,
  Network,
  Search,
  Server,
  Settings2,
  Terminal,
  Trash2Icon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Flag from "@/components/Flag";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWarningDialog } from "@/components/ui/warning-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBytes } from "@/utils/unitHelper";
import {
  type SettingsResponse,
  useSettings,
} from "@/lib/api";
import { formatApiErrorMessage, getReadableErrorMessage } from "@/lib/apiErrorMessage";
import {
  getClientDDNSBinding,
  type ClientDDNSBinding,
} from "@/lib/clientDDNS";
import { useRPC2Call } from "@/contexts/RPC2Context";
import type { Record as LiveRecord } from "@/types/LiveData";
import {
  formatCNConnectivityTargetsSummary,
  parseCNConnectivityTargets,
} from "@/lib/cnConnectivityTargets";
import { cn } from "@/lib/utils";
import { Navigate } from "react-router-dom";
import {
  createEmptyLiveRecord,
  getNodeLiveCounts,
  isNodeOffline,
  isNodeOnline,
  NODE_TABLE_DEFAULT_PAGE_SIZE,
  normalizeLiveSnapshot,
  type NodeLiveSnapshot,
} from "./node-live.helpers";
const LazyNodeAccessSettingsDialog = React.lazy(
  () => import("@/components/admin/node-details/NodeAccessSettingsDialog"),
);
const LazyGenerateCommandDialog = React.lazy(
  () => import("@/components/admin/node-details/GenerateCommandDialog"),
);
const LazyGroupUpgradeDialog = React.lazy(
  () => import("@/components/admin/node-details/GroupUpgradeDialog"),
);
const LazyNodeDDNSDialog = React.lazy(() =>
  import("@/components/admin/NodeTable/NodeDDNSDialog").then((module) => ({
    default: module.NodeDDNSDialog,
  })),
);
const LazyNodePortForwardDialog = React.lazy(() =>
  import("@/components/admin/NodeTable/NodePortForwardDialog").then((module) => ({
    default: module.NodePortForwardDialog,
  })),
);

const AdminDashboardLoadingState = () => {
  const { t } = useTranslation();

  return (
    <AdminPageShell
      title={t("admin.nodeTable.nodeList", { defaultValue: "服务器" })}
      description={t("admin.dashboard.loading_description", {
        defaultValue:
          "服务器状态、资源占用和运维入口正在加载，页面结构会保持稳定。",
      })}
      actions={(
        <div className="relative min-w-[260px] flex-1 sm:max-w-sm">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            disabled
            className="pl-9"
            placeholder={t("admin.nodeTable.searchByName")}
          />
        </div>
      )}
    >
      <AdminTableSkeleton columns={6} rows={7} />
    </AdminPageShell>
  );
};

const NodeDetailsPage = () => {
  const { t } = useTranslation();
  const { account, hasFeature, loading, platformAdmin } = useAccount();
  useAdminPageTitle(
    t("admin.nodeTable.nodeList", { defaultValue: "服务器" }),
    t("admin.nodeTable.pageDescription", {
      defaultValue: "查看服务器实时状态、分组、连通性和常用运维入口。",
    }),
  );
  const canManageCNConnectivity = platformAdmin || hasFeature("cn_connectivity");
  const [toolbarSearchDraft, setToolbarSearchDraft] = useState("");
  const [toolbarSearchKeyword, setToolbarSearchKeyword] = useState("");
  const listEndpoint = "/api/admin/client/list";

  const handleToolbarSearchDraftChange = React.useCallback((value: string) => {
    setToolbarSearchDraft(value);
    if (!value.trim()) {
      setToolbarSearchKeyword("");
    }
  }, []);

  const handleToolbarSearch = React.useCallback(() => {
    setToolbarSearchKeyword(toolbarSearchDraft.trim().toLowerCase());
  }, [toolbarSearchDraft]);

  if (loading) {
    return <AdminDashboardLoadingState />;
  }
  if (!platformAdmin) {
    return <Navigate to={getDefaultAdminPath(account)} replace />;
  }

  return (
    <NodeDetailsProvider listEndpoint={listEndpoint}>
      <Layout
        platformAdmin={platformAdmin}
        toolbarSearchDraft={toolbarSearchDraft}
        toolbarSearchKeyword={toolbarSearchKeyword}
        onToolbarSearchDraftChange={handleToolbarSearchDraftChange}
        onToolbarSearch={handleToolbarSearch}
        canManageCNConnectivity={canManageCNConnectivity}
      />
    </NodeDetailsProvider>
  );
};

type ActionResponsePayload = {
  status?: string;
  message?: string;
  error?: string;
};

const getNodeGroupLabel = (node: NodeDetail) => {
  const groupName = String(node.group || "").trim();
  return (
    groupName ||
    translate("admin.nodeTable.defaultGroup", {
      defaultValue: "默认分组",
    })
  );
};

const getDefaultGroupLabel = () =>
  translate("admin.nodeTable.defaultGroup", {
    defaultValue: "默认分组",
  });

const formatUptimeLabel = (secondsValue?: number) => {
  const seconds = Math.max(0, Math.floor(secondsValue ?? 0));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}${translate("admin.nodeTable.uptimeDayUnit", {
      defaultValue: "天",
    })} ${hours}${translate("admin.nodeTable.uptimeHourUnit", {
      defaultValue: "小时",
    })}`;
  }
  if (hours > 0) {
    return `${hours}${translate("admin.nodeTable.uptimeHourUnit", {
      defaultValue: "小时",
    })} ${minutes}${translate("admin.nodeTable.uptimeMinuteUnit", {
      defaultValue: "分钟",
    })}`;
  }
  if (minutes > 0) {
    return `${minutes}${translate("admin.nodeTable.uptimeMinuteUnit", {
      defaultValue: "分钟",
    })}`;
  }
  return translate("admin.nodeTable.justStarted", {
    defaultValue: "刚刚启动",
  });
};

const formatNodeIp = (value?: string) => {
  const normalized = String(value || "").trim();
  return normalized || "-";
};

const normalizeDDNSPayload = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
};

const buildDDNSDomainLabel = (binding: ClientDDNSBinding | null | undefined) => {
  if (!binding) {
    return "";
  }

  const payload = normalizeDDNSPayload(binding.payload);
  const provider = String(binding.provider || "").trim().toLowerCase();
  if (provider === "cloudflare") {
    const zoneName = String(payload.zone_name || "").trim();
    const recordName = String(payload.record_name || "").trim();
    if (!zoneName) {
      return "";
    }
    if (!recordName || recordName === "@") {
      return zoneName;
    }
    if (recordName === zoneName || recordName.endsWith(`.${zoneName}`)) {
      return recordName;
    }
    return `${recordName}.${zoneName}`;
  }

  if (provider === "aliyun") {
    const domainName = String(payload.domain_name || "").trim();
    const rr = String(payload.rr || "").trim();
    if (!domainName) {
      return "";
    }
    if (!rr || rr === "@") {
      return domainName;
    }
    if (rr === domainName || rr.endsWith(`.${domainName}`)) {
      return rr;
    }
    return `${rr}.${domainName}`;
  }

  return "";
};

const readActionResponse = async (response: Response) => {
  const raw = (await response.text().catch(() => "")).trim();
  if (!raw) {
    return { payload: null as ActionResponsePayload | null, raw: "" };
  }

  try {
    return {
      payload: JSON.parse(raw) as ActionResponsePayload,
      raw,
    };
  } catch {
    return { payload: null as ActionResponsePayload | null, raw };
  }
};

const getActionErrorMessage = (
  response: Response,
  payload: ActionResponsePayload | null,
  raw: string,
  fallback: string
) => {
  const detail =
    (typeof payload?.message === "string" ? payload.message : "") ||
    (typeof payload?.error === "string" ? payload.error : "") ||
    raw;

  return formatApiErrorMessage(detail || `${fallback} (HTTP ${response.status})`, { status: response.status });
};

const isNodeConnectivityBlocked = (live?: NodeLiveSnapshot) =>
  live?.record.cn_connectivity?.status === "blocked_suspected";

const RISK_WARNING_THRESHOLD = 75;
const RISK_DANGER_THRESHOLD = 90;

const truncateMiddle = (value: string, head = 12, tail = 8) => {
  if (value.length <= head + tail + 1) {
    return value;
  }
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
};

const getNodeRamUsagePercent = (node: NodeDetail, live?: NodeLiveSnapshot) => {
  if (!node.mem_total) {
    return 0;
  }
  return ((live?.record.ram.used ?? 0) / node.mem_total) * 100;
};

const getNodeDiskUsagePercent = (node: NodeDetail, live?: NodeLiveSnapshot) => {
  if (!node.disk_total) {
    return 0;
  }
  return ((live?.record.disk.used ?? 0) / node.disk_total) * 100;
};

const isNodeAbnormal = (
  node: NodeDetail,
  live: NodeLiveSnapshot | undefined,
  liveLoaded: boolean,
) => {
  const offline = isNodeOffline(live, liveLoaded);
  const connectivityAbnormal =
    live?.record.cn_connectivity?.status === "blocked_suspected"
    || live?.record.cn_connectivity?.status === "degraded";
  const highUsage =
    clampPercent(live?.record.cpu.usage ?? 0) >= RISK_DANGER_THRESHOLD
    || clampPercent(getNodeRamUsagePercent(node, live)) >= RISK_DANGER_THRESHOLD
    || clampPercent(getNodeDiskUsagePercent(node, live)) >= RISK_DANGER_THRESHOLD;
  return offline || connectivityAbnormal || highUsage;
};

type NodeRowTone = "normal" | "warning" | "critical";

const getNodeRowTone = (
  node: NodeDetail,
  live: NodeLiveSnapshot | undefined,
): NodeRowTone => {
  if (!live) {
    return "normal";
  }

  const connectivityStatus = live.record.cn_connectivity?.status;
  const cpuPercent = clampPercent(live.record.cpu.usage ?? 0);
  const ramPercent = clampPercent(getNodeRamUsagePercent(node, live));
  const diskPercent = clampPercent(getNodeDiskUsagePercent(node, live));

  if (
    !isNodeOnline(live)
    || connectivityStatus === "blocked_suspected"
    || cpuPercent >= RISK_DANGER_THRESHOLD
    || ramPercent >= RISK_DANGER_THRESHOLD
    || diskPercent >= RISK_DANGER_THRESHOLD
  ) {
    return "critical";
  }

  if (
    connectivityStatus === "degraded"
    || cpuPercent >= RISK_WARNING_THRESHOLD
    || ramPercent >= RISK_WARNING_THRESHOLD
    || diskPercent >= RISK_WARNING_THRESHOLD
  ) {
    return "warning";
  }

  return "normal";
};

const Layout = ({
  platformAdmin,
  toolbarSearchDraft,
  toolbarSearchKeyword,
  onToolbarSearchDraftChange,
  onToolbarSearch,
  canManageCNConnectivity,
}: {
  platformAdmin: boolean;
  toolbarSearchDraft: string;
  toolbarSearchKeyword: string;
  onToolbarSearchDraftChange: (value: string) => void;
  onToolbarSearch: () => void;
  canManageCNConnectivity: boolean;
}) => {
  const { nodeDetail, isLoading, error, refresh } = useNodeDetails();
  const { call } = useRPC2Call();
  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
    refetch: refetchSettings,
  } = useSettings();
  const [liveByNode, setLiveByNode] = useState<Record<string, NodeLiveSnapshot>>(
    {}
  );
  const [liveLoaded, setLiveLoaded] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const liveByNodeRef = React.useRef<Record<string, NodeLiveSnapshot>>({});
  const realNodes = React.useMemo(
    () => (Array.isArray(nodeDetail) ? nodeDetail : []),
    [nodeDetail],
  );
  const allNodes = React.useMemo(
    () => (
      [...realNodes].sort((a, b) => {
          const leftGroup = getNodeGroupLabel(a);
          const rightGroup = getNodeGroupLabel(b);
          const defaultGroupLabel = getDefaultGroupLabel();

          if (leftGroup === defaultGroupLabel && rightGroup !== defaultGroupLabel) {
            return 1;
          }
          if (leftGroup !== defaultGroupLabel && rightGroup === defaultGroupLabel) {
            return -1;
          }

          const groupDiff = leftGroup.localeCompare(rightGroup);
          if (groupDiff !== 0) return groupDiff;

          if ((a.weight ?? 0) !== (b.weight ?? 0)) {
            return (a.weight ?? 0) - (b.weight ?? 0);
          }

          return String(a.name || "").localeCompare(String(b.name || ""), "zh-CN");
        })
    ),
    [realNodes],
  );
  const liveScopeUUIDs = React.useMemo(
    () => allNodes.map((node) => node.uuid),
    [allNodes],
  );
  const normalizedToolbarSearchKeyword = toolbarSearchKeyword.trim().toLowerCase();
  const visibleNodes = React.useMemo(() => {
    if (!normalizedToolbarSearchKeyword) {
      return allNodes;
    }
    return allNodes.filter((node) => {
      const name = String(node.name || "").toLowerCase();
      const ipv4 = String(node.ipv4 || "").toLowerCase();
      const ipv6 = String(node.ipv6 || "").toLowerCase();
      return (
        name.includes(normalizedToolbarSearchKeyword)
        || ipv4.includes(normalizedToolbarSearchKeyword)
        || ipv6.includes(normalizedToolbarSearchKeyword)
      );
    });
  }, [allNodes, normalizedToolbarSearchKeyword]);

  useEffect(() => {
    liveByNodeRef.current = liveByNode;
  }, [liveByNode]);

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
      setLiveLoaded(false);
      setLiveError(null);
      return () => {
        stopped = true;
      };
    }

    if (!pollUUIDs.some((uuid) => liveByNodeRef.current[uuid])) {
      setLiveLoaded(false);
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
        setLiveError(formatApiErrorMessage("Failed to fetch node live data"));
      } finally {
        running = false;
        if (!stopped) {
          timer = window.setTimeout(pollLiveData, 3000);
        }
      }
    };

    pollLiveData();

    return () => {
      stopped = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [call, liveScopeUUIDs]);

  if (isLoading) return <AdminDashboardLoadingState />;
  if (error) {
    return (
      <AdminEmptyState
        icon={<Terminal className="h-5 w-5" />}
        title={error}
        description={null}
      />
    );
  }

  return (
    <AdminPageShell>
      <Header
        nodes={allNodes}
        visibleNodes={visibleNodes}
        liveByNode={liveByNode}
        liveLoaded={liveLoaded}
        liveError={liveError}
        settings={settings}
        settingsLoading={settingsLoading}
        settingsError={settingsError}
        platformAdmin={platformAdmin}
        toolbarSearchDraft={toolbarSearchDraft}
        toolbarSearchKeyword={normalizedToolbarSearchKeyword}
        onToolbarSearchDraftChange={onToolbarSearchDraftChange}
        onToolbarSearch={onToolbarSearch}
        installActionsEnabled
        canManageCNConnectivity={canManageCNConnectivity}
        onRefreshSettings={refetchSettings}
      />

      <NodeTable
        nodes={visibleNodes}
        totalNodesCount={allNodes.length}
        liveByNode={liveByNode}
        liveLoaded={liveLoaded}
        settings={settings}
        installActionsEnabled
        paginationKey={normalizedToolbarSearchKeyword}
      />
    </AdminPageShell>
  );
};

const NodeAccessSettingsDialogButton = ({
  settings,
  platformAdmin,
  canManageCNConnectivity,
  onRefreshSettings,
}: {
  settings: SettingsResponse;
  platformAdmin: boolean;
  canManageCNConnectivity: boolean;
  onRefreshSettings: () => Promise<SettingsResponse>;
}) => {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="rounded-md"
        onClick={() => setDialogOpen(true)}
      >
        <Settings2 size={16} />
        {t("common.settings")}
      </Button>
      {dialogOpen ? (
        <React.Suspense fallback={null}>
          <LazyNodeAccessSettingsDialog
            open={dialogOpen}
            settings={settings}
            platformAdmin={platformAdmin}
            canManageCNConnectivity={canManageCNConnectivity}
            onOpenChange={setDialogOpen}
            onSaved={onRefreshSettings}
          />
        </React.Suspense>
      ) : null}
    </>
  );
};

const Header = ({
  nodes,
  visibleNodes,
  liveByNode,
  liveLoaded,
  liveError,
  settings,
  settingsLoading,
  settingsError,
  platformAdmin,
  toolbarSearchDraft,
  toolbarSearchKeyword,
  onToolbarSearchDraftChange,
  onToolbarSearch,
  installActionsEnabled,
  canManageCNConnectivity,
  onRefreshSettings,
}: {
  nodes: NodeDetail[];
  visibleNodes: NodeDetail[];
  liveByNode: Record<string, NodeLiveSnapshot>;
  liveLoaded: boolean;
  liveError: string | null;
  settings: SettingsResponse;
  settingsLoading: boolean;
  settingsError: string | null;
  platformAdmin: boolean;
  toolbarSearchDraft: string;
  toolbarSearchKeyword: string;
  onToolbarSearchDraftChange: (value: string) => void;
  onToolbarSearch: () => void;
  installActionsEnabled: boolean;
  canManageCNConnectivity: boolean;
  onRefreshSettings: () => Promise<SettingsResponse>;
}) => {
  const { t, i18n } = useTranslation();
  const { refresh } = useNodeDetails();
  const { confirm, dialog } = useWarningDialog();
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [groupCommandDialogOpen, setGroupCommandDialogOpen] = React.useState(false);
  const globalLiveCounts = getNodeLiveCounts(
    nodes.map((node) => node.uuid),
    liveByNode,
    liveLoaded,
  );
  const currentLiveCounts = getNodeLiveCounts(
    visibleNodes.map((node) => node.uuid),
    liveByNode,
    liveLoaded,
  );
  const offlineNodes = nodes.filter((node) =>
    isNodeOffline(liveByNode[node.uuid], liveLoaded)
  );
  const totalUploadSpeed = nodes.reduce(
    (sum, node) => sum + (liveByNode[node.uuid]?.record.network.up ?? 0),
    0
  );
  const totalDownloadSpeed = nodes.reduce(
    (sum, node) => sum + (liveByNode[node.uuid]?.record.network.down ?? 0),
    0
  );
  const globalOnlineCount = globalLiveCounts.online;
  const globalOfflineCount = globalLiveCounts.offline;
  const globalUnknownCount = globalLiveCounts.unknown;
  const globalAbnormalCount = nodes.filter((node) =>
    isNodeAbnormal(node, liveByNode[node.uuid], liveLoaded),
  ).length;
  const currentOnlineCount = currentLiveCounts.online;
  const currentOfflineCount = currentLiveCounts.offline;
  const currentUnknownCount = currentLiveCounts.unknown;
  const currentAbnormalCount = visibleNodes.filter((node) =>
    isNodeAbnormal(node, liveByNode[node.uuid], liveLoaded),
  ).length;
  const hasEffectiveFilters = Boolean(toolbarSearchKeyword);
  const cnConnectivityEnabled = Boolean(settings?.cn_connectivity_enabled);
  const cnConnectivityTargets = parseCNConnectivityTargets(
    String(settings?.cn_connectivity_target || "")
  );
  const cnConnectivityConfigured =
    cnConnectivityEnabled && cnConnectivityTargets.length > 0;
  const cnConnectivitySummary = formatCNConnectivityTargetsSummary(
    String(settings?.cn_connectivity_target || ""),
    i18n.language.startsWith("zh") ? "zh" : "en"
  );
  const cnConnectivityStatusLabel = settingsLoading
    ? t("common.loading", { defaultValue: "加载中" })
    : settingsError
      ? t("common.error", { defaultValue: "错误" })
      : cnConnectivityEnabled
        ? t("common.enabled", { defaultValue: "已启用" })
        : t("common.disabled", { defaultValue: "未启用" });
  const cnConnectivityTone: "slate" | "green" | "red" | "blue" = settingsError
    ? "red"
    : cnConnectivityEnabled
      ? "green"
      : "slate";
  const cnConnectivityDetail = settingsError
      ? t("admin.nodeTable.cnConnectivityLoadFailed", {
        defaultValue: "CN 互通性探测设置加载失败。",
      })
    : cnConnectivityConfigured
      ? cnConnectivitySummary
      : cnConnectivityEnabled
        ? t("admin.nodeTable.cnConnectivityMissingTarget", {
            defaultValue: "还没有配置目标。",
          })
        : t("admin.nodeTable.cnConnectivityDisabledMessage", {
            defaultValue: "探测未启用。",
          });
  const handleDeleteOffline = async () => {
    if (offlineNodes.length === 0) return;

    const confirmed = await confirm({
      tone: "destructive",
      title: t("admin.nodeTable.cleanupOfflineTitle", "Delete offline nodes"),
      description: t(
        "admin.nodeTable.cleanupOfflineDescription",
        "将删除当前范围内已确认离线的 {{count}} 个节点。该操作不可撤销。",
        { count: offlineNodes.length },
      ),
      confirmLabel: t("common.delete", "Delete"),
      cancelLabel: t("common.cancel", "取消"),
    });
    if (!confirmed) {
      return;
    }

    setCleanupLoading(true);
    try {
      const results = await Promise.allSettled(
        offlineNodes.map(async (node) => {
          const response = await fetch(`/api/admin/client/${node.uuid}/remove`, {
            method: "POST",
          });
          const { payload, raw } = await readActionResponse(response);
          if (!response.ok || payload?.status === "error") {
            throw new Error(
              `${node.name || node.uuid}: ${getActionErrorMessage(
                response,
                payload,
                raw,
                t("admin.nodeTable.cleanupOfflineDeleteFailed", "Delete failed")
              )}`
            );
          }
          return node.uuid;
        })
      );
      const failed = results.filter(
        (result): result is PromiseRejectedResult => result.status === "rejected"
      );
      const deletedCount = results.length - failed.length;
      await refresh();
      if (failed.length > 0) {
        const detail = failed
          .slice(0, 3)
          .map((result) => getReadableErrorMessage(result.reason))
          .join("；");

        if (deletedCount > 0) {
          toast.warning(
            t("admin.nodeTable.cleanupOfflinePartialSuccess", {
              count: deletedCount,
              failed: failed.length,
              detail,
              defaultValue:
                "已删除 {{count}} 台离线节点，{{failed}} 台失败：{{detail}}",
            })
          );
        } else {
          toast.error(
            t("admin.nodeTable.cleanupOfflineFailed", {
              detail,
              defaultValue: "删除离线节点失败：{{detail}}",
            })
          );
        }
      } else {
        toast.success(
          t("admin.nodeTable.cleanupOfflineSuccess", {
            count: offlineNodes.length,
            defaultValue: "已删除 {{count}} 台离线节点",
          })
        );
      }
    } catch (cleanupError) {
      toast.error(
        getReadableErrorMessage(cleanupError)
      );
    } finally {
      setCleanupLoading(false);
    }
  };
  const canDeleteOffline =
    liveLoaded && !liveError && offlineNodes.length > 0 && !cleanupLoading;

  return (
    <div className="flex flex-col gap-3">
      {liveError ? (
        <Alert variant="destructive">
          <AlertTitle>{t("common.error", { defaultValue: "错误" })}</AlertTitle>
          <AlertDescription>
            {t("admin.nodeTable.liveErrorPausedDeletion", {
              defaultValue:
                "实时状态接口失败，已暂停批量下线节点删除。",
            })}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 shadow-none dark:border-slate-800/90 dark:bg-slate-950">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-[260px]">
            <form
              className="relative"
              onSubmit={(event) => {
                event.preventDefault();
                onToolbarSearch();
              }}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 rounded-md border-slate-200 bg-white pl-9 shadow-none dark:border-slate-800 dark:bg-slate-950"
                placeholder={t("admin.nodeTable.toolbarSearchPlaceholder", {
                  defaultValue: "搜索节点名称 / IP",
                })}
                value={toolbarSearchDraft}
                onChange={(event) => onToolbarSearchDraftChange(event.target.value)}
                aria-label={t("admin.nodeTable.toolbarSearchPlaceholder", {
                  defaultValue: "搜索节点名称 / IP",
                })}
              />
            </form>
          </div>

          <div className="min-w-0 text-sm text-muted-foreground">
            {hasEffectiveFilters ? (
              <div className="truncate">
                <span className="font-medium text-foreground">
                  {t("admin.nodeTable.currentFilterSummary", {
                    visible: visibleNodes.length,
                    total: nodes.length,
                    defaultValue: "当前筛选 {{visible}} / {{total}}",
                  })}
                </span>
                <span>
                  {" "}
                  ·{" "}
                  {t("admin.nodeTable.inlineOnlineAbnormal", {
                    online: currentOnlineCount,
                    abnormal: currentAbnormalCount,
                    offline: currentOfflineCount,
                    unknown: currentUnknownCount,
                    defaultValue:
                      currentUnknownCount > 0
                        ? "在线 {{online}} · 离线 {{offline}} · 同步中 {{unknown}} · 异常 {{abnormal}}"
                        : "在线 {{online}} · 离线 {{offline}} · 异常 {{abnormal}}",
                  })}
                </span>
                <span className="text-muted-foreground/80">
                  {" "}
                  ·{" "}
                  {t("admin.nodeTable.inlineGlobalSummary", {
                    online: globalOnlineCount,
                    offline: globalOfflineCount,
                    unknown: globalUnknownCount,
                    defaultValue:
                      globalUnknownCount > 0
                        ? "全局 在线 {{online}} · 离线 {{offline}} · 同步中 {{unknown}}"
                        : "全局 在线 {{online}} · 离线 {{offline}}",
                  })}
                </span>
              </div>
            ) : (
              <div className="truncate">
                {t("admin.nodeTable.inlineStats", {
                  online: globalOnlineCount,
                  offline: globalOfflineCount,
                  unknown: globalUnknownCount,
                  abnormal: globalAbnormalCount,
                  upload: `${formatBytes(totalUploadSpeed)}/s`,
                  download: `${formatBytes(totalDownloadSpeed)}/s`,
                  defaultValue:
                    globalUnknownCount > 0
                      ? "在线 {{online}} · 离线 {{offline}} · 同步中 {{unknown}} · 异常 {{abnormal}} · ↑{{upload}} · ↓{{download}}"
                      : "在线 {{online}} · 离线 {{offline}} · 异常 {{abnormal}} · ↑{{upload}} · ↓{{download}}",
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge
              variant="secondary"
              className={`h-9 shrink-0 rounded-md border border-border/60 bg-transparent px-2.5 text-sm font-medium shadow-none ${
                cnConnectivityTone === "green"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : cnConnectivityTone === "red"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-muted-foreground"
              }`}
              title={cnConnectivityDetail}
            >
              {t("settings.general.cn_connectivity")}
              {" · "}
              {cnConnectivityStatusLabel}
            </Badge>
            <GenerateCommandButton
              nodes={nodes}
              settings={settings}
              toolbar
              buttonSize="sm"
              toolbarLabel={t("admin.nodeTable.installCommand", {
                defaultValue: "一键部署指令",
              })}
              disabled={!installActionsEnabled}
            />
            {platformAdmin ? (
              <NodeAccessSettingsDialogButton
                settings={settings}
                platformAdmin={platformAdmin}
                canManageCNConnectivity={canManageCNConnectivity}
                onRefreshSettings={onRefreshSettings}
              />
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-md">
                  <MoreHorizontal size={16} />
                  {t("common.more", { defaultValue: "更多" })}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem
                  disabled={!installActionsEnabled}
                  onSelect={(event) => {
                    event.preventDefault();
                    setGroupCommandDialogOpen(true);
                  }}
                >
                  <Download size={16} />
                  {t("admin.nodeTable.installCommandForGroup", {
                    defaultValue: "为指定分组生成接入命令",
                  })}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>
                  {t("admin.nodeTable.dangerZone", { defaultValue: "危险操作" })}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={!canDeleteOffline}
                  onSelect={(event) => {
                    event.preventDefault();
                    void handleDeleteOffline();
                  }}
                >
                  <Trash2Icon size={16} />
                  {t("admin.nodeTable.deleteOfflineWithCount", {
                    count: offlineNodes.length,
                    defaultValue: "删除离线节点（{{count}}）",
                  })}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      {groupCommandDialogOpen ? (
        <React.Suspense fallback={null}>
          <LazyGenerateCommandDialog
            open={groupCommandDialogOpen}
            onOpenChange={setGroupCommandDialogOpen}
            nodes={nodes}
            settings={settings}
            toolbar
            groupMode
          />
        </React.Suspense>
      ) : null}
      {dialog}
    </div>
  );
};

const clampPercent = (value: number) =>
  Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

const formatPercent = (value: number) => `${Math.round(clampPercent(value))}%`;

const BYTE_LABEL_PATTERN = /^([0-9]+(?:\.[0-9]+)?)\s*([A-Za-z]+)$/;

const splitFormattedBytes = (value: string) => {
  const match = String(value || "").trim().match(BYTE_LABEL_PATTERN);
  if (!match) {
    return null;
  }
  return {
    magnitude: match[1],
    unit: match[2].toUpperCase(),
  };
};

const formatCompactByteUsage = (usedBytes: number, totalBytes: number) => {
  const usedLabel = formatBytes(usedBytes);
  const totalLabel = formatBytes(totalBytes);
  const usedParts = splitFormattedBytes(usedLabel);
  const totalParts = splitFormattedBytes(totalLabel);

  if (usedParts && totalParts && usedParts.unit === totalParts.unit) {
    const compactMagnitude = (value: string) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return value;
      }
      if (numeric >= 10) {
        return String(Math.round(numeric));
      }
      return numeric.toFixed(1).replace(/\.0$/, "");
    };

    return `${compactMagnitude(usedParts.magnitude)} / ${compactMagnitude(
      totalParts.magnitude,
    )} ${usedParts.unit}`;
  }

  return `${usedLabel} / ${totalLabel}`;
};

const formatCoreCount = (value: number) => {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return value.toFixed(1).replace(/\.0$/, "");
};

const StatusSummary = ({
  live,
  liveLoaded,
}: {
  live?: NodeLiveSnapshot;
  liveLoaded: boolean;
}) => {
  const { t } = useTranslation();

  if (!live) {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <Badge
          variant="secondary"
          className="rounded-md px-1.5 py-0 text-[11px]"
        >
          {liveLoaded
            ? t("admin.nodeTable.statusUnknown", { defaultValue: "状态未知" })
            : t("admin.nodeTable.statusSyncing", { defaultValue: "同步中" })}
        </Badge>
      </div>
    );
  }

  const online = isNodeOnline(live);
  const connectivity = live?.record.cn_connectivity;
  const cnBadge =
    connectivity && connectivity.status
      ? buildCNConnectivityBadge(connectivity, t)
      : null;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <Badge
        variant={online ? "success" : "destructive"}
        className="rounded-md px-1.5 py-0 text-[11px]"
      >
        {online ? t("nodeCard.online", "Online") : t("nodeCard.offline", "Offline")}
      </Badge>
      {cnBadge ? (
        <Badge
          variant={cnBadge.variant}
          className="max-w-full overflow-hidden text-ellipsis rounded-md px-1.5 py-0 text-[11px]"
          title={cnBadge.title}
        >
          {cnBadge.label}
        </Badge>
      ) : null}
    </div>
  );
};

const buildCNConnectivityBadge = (
  connectivity: NonNullable<LiveRecord["cn_connectivity"]>,
  t: any
) => {
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
        label: `${t("admin.nodeTable.cnConnectivityOk", "CN OK")}${latencyLabel}`,
        variant: "success" as const,
        title,
      };
    case "blocked_suspected":
      return {
        label: t("admin.nodeTable.cnConnectivityBlocked", "CN blocked"),
        variant: "destructive" as const,
        title,
      };
    case "degraded":
      return {
        label: t("admin.nodeTable.cnConnectivityDegraded", "CN degraded"),
        variant: "warning" as const,
        title,
      };
    default:
      return {
        label: t("admin.nodeTable.cnConnectivityUnknown", "CN pending"),
        variant: "secondary" as const,
        title,
      };
  }
};

const VersionSummary = ({ node }: { node: NodeDetail }) => (
  <div className="min-w-0">
    <Badge variant="outline" className="rounded-md px-1.5 font-mono text-[12px]">
      {String(node.version || "").trim() || "-"}
    </Badge>
  </div>
);

const NodeEndpointSummary = ({ node }: { node: NodeDetail }) => {
  const { t } = useTranslation();
  const { hasFeature } = useAccount();
  const [tooltipOpen, setTooltipOpen] = React.useState(false);
  const [ddnsBinding, setDdnsBinding] = React.useState<ClientDDNSBinding | null>(null);
  const [ddnsLoading, setDdnsLoading] = React.useState(false);
  const [ddnsLoadError, setDdnsLoadError] = React.useState("");
  const ipv4Value = formatNodeIp(node.ipv4);
  const ipv6Value = formatNodeIp(node.ipv6);
  const ipv6Short = ipv6Value === "-" ? "-" : truncateMiddle(ipv6Value, 14, 10);

  React.useEffect(() => {
    if (!tooltipOpen || !hasFeature("cloud_dns")) {
      return;
    }

    let cancelled = false;
    setDdnsLoading(true);
    setDdnsLoadError("");

    void getClientDDNSBinding(node.uuid)
      .then((binding) => {
        if (cancelled) {
          return;
        }
        setDdnsBinding(binding);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setDdnsBinding(null);
        setDdnsLoadError(
          getReadableErrorMessage(error, t("admin.nodeTable.ddnsDomainLoadFailed", {
              defaultValue: "DDNS 域名加载失败",
            })),
        );
      })
      .finally(() => {
        if (!cancelled) {
          setDdnsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasFeature, node.uuid, t, tooltipOpen]);

  const ddnsDomain = buildDDNSDomainLabel(ddnsBinding);
  const tooltipSecondary = hasFeature("cloud_dns")
      ? ddnsLoading
      ? t("admin.nodeTable.ddnsDomainLoading", {
        defaultValue: "DDNS 域名加载中...",
      })
      : ddnsLoadError
        ? t("admin.nodeTable.ddnsDomainLoadFailed", {
          defaultValue: "DDNS 域名加载失败",
        })
        : ddnsDomain
          ? `${t("admin.nodeTable.ddnsDomain", { defaultValue: "DDNS 域名" })}: ${ddnsDomain}`
          : undefined
    : undefined;
  const copyIp = React.useCallback(
    async (address: string) => {
      if (!address || address === "-") {
        return;
      }
      try {
        await navigator.clipboard.writeText(address);
        toast.success(t("copy_success", { defaultValue: "已复制" }));
      } catch (error) {
        console.error("Failed to copy ip address:", error);
      }
    },
    [t],
  );

  return (
    <NodeInfoTooltip
      open={tooltipOpen}
      onOpenChange={setTooltipOpen}
      content={
        <NodeTooltipBody
          label={t("admin.nodeTable.hostname", {
            defaultValue: "主机名",
          })}
          primary={String(node.name || "").trim() || "-"}
          secondary={tooltipSecondary}
        />
      }
    >
      <div className="flex w-full min-w-[240px] max-w-[380px] items-center gap-1.5 text-[13px] leading-[18px] text-slate-700 dark:text-slate-200">
        <div className="flex h-[18px] items-center">
          <Flag flag={node.region} size="4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex h-[18px] items-center gap-0.5">
            <span className="w-7 shrink-0 text-slate-400 dark:text-slate-500">IPv4</span>
            <span
              className="min-w-0 flex-1 truncate font-mono text-[12px]"
              title={ipv4Value}
            >
              {ipv4Value}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 shrink-0 rounded-md"
              aria-label={t("admin.nodeTable.copyIpv4", {
                defaultValue: "复制 IPv4 地址",
              })}
              disabled={ipv4Value === "-"}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void copyIp(ipv4Value);
              }}
            >
              <Copy size={11} />
            </Button>
          </div>
          <div className="flex h-[18px] items-center gap-0.5">
            <span className="w-7 shrink-0 text-slate-400 dark:text-slate-500">IPv6</span>
            <span
              className="min-w-0 flex-1 truncate font-mono text-[12px]"
              title={ipv6Value}
            >
              {ipv6Short}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 shrink-0 rounded-md"
              aria-label={t("admin.nodeTable.copyIpv6", {
                defaultValue: "复制 IPv6 地址",
              })}
              disabled={ipv6Value === "-"}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void copyIp(ipv6Value);
              }}
            >
              <Copy size={11} />
            </Button>
          </div>
        </div>
      </div>
    </NodeInfoTooltip>
  );
};

const NodeTooltipBody = ({
  label,
  primary,
  secondary,
}: {
  label: string;
  primary: string;
  secondary?: string;
}) => (
  <div className="grid min-w-[180px] gap-1.5">
    <div className="text-[11px] font-medium uppercase tracking-normal text-slate-300 dark:text-slate-600">
      {label}
    </div>
    <div className="text-sm font-semibold text-slate-50 dark:text-slate-950">
      {primary}
    </div>
    {secondary ? (
      <div className="text-xs leading-relaxed text-slate-300 dark:text-slate-600">
        {secondary}
      </div>
    ) : null}
  </div>
);

const NodeInfoTooltip = ({
  content,
  children,
  open,
  onOpenChange,
}: {
  content: React.ReactNode;
  children: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => (
  <Tooltip open={open} onOpenChange={onOpenChange}>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent
      sideOffset={8}
      className="rounded-lg border-slate-900/90 bg-slate-950 px-3 py-2 text-sm text-slate-50 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.9)] dark:border-slate-100/90 dark:bg-slate-50 dark:text-slate-950 dark:shadow-black/30"
    >
      {content}
    </TooltipContent>
  </Tooltip>
);

const RateSummary = ({ live }: { live?: NodeLiveSnapshot }) => {
  if (!live) {
    return (
      <div className="w-full min-w-[84px] max-w-[132px] text-[13px] leading-4 text-muted-foreground">
        -
      </div>
    );
  }

  const snapshot = live?.record || createEmptyLiveRecord();
  const uploadLabel = `↑ ${formatBytes(snapshot.network.up)}/s`;
  const downloadLabel = `↓ ${formatBytes(snapshot.network.down)}/s`;

  return (
    <div className="w-full min-w-[84px] max-w-[132px] space-y-0 tabular-nums">
      <div
        className="block truncate text-[13px] font-medium leading-4 text-slate-900 dark:text-slate-100"
        title={uploadLabel}
      >
        {uploadLabel}
      </div>
      <div
        className="block truncate text-[13px] leading-4 text-slate-600 dark:text-slate-400"
        title={downloadLabel}
      >
        {downloadLabel}
      </div>
    </div>
  );
};

const TrafficSummary = ({ live }: { live?: NodeLiveSnapshot }) => {
  if (!live) {
    return (
      <div className="w-full min-w-[92px] max-w-[140px] text-[13px] leading-4 text-muted-foreground">
        -
      </div>
    );
  }

  const snapshot = live?.record || createEmptyLiveRecord();
  const uploadLabel = `↑ ${formatBytes(snapshot.network.totalUp)}`;
  const downloadLabel = `↓ ${formatBytes(snapshot.network.totalDown)}`;

  return (
    <div className="w-full min-w-[92px] max-w-[140px] space-y-0 tabular-nums">
      <div
        className="block truncate text-[13px] font-medium leading-4 text-slate-900 dark:text-slate-100"
        title={uploadLabel}
      >
        {uploadLabel}
      </div>
      <div
        className="block truncate text-[13px] leading-4 text-slate-600 dark:text-slate-400"
        title={downloadLabel}
      >
        {downloadLabel}
      </div>
    </div>
  );
};

const UptimeSummary = ({ live }: { live?: NodeLiveSnapshot }) => {
  const { t } = useTranslation();
  return (
    <div className="block w-full min-w-[64px] max-w-[88px] truncate tabular-nums text-[13px] leading-4 text-slate-700 dark:text-slate-300">
      {live
        ? formatUptimeLabel(live.record.uptime)
        : t("admin.nodeTable.statusSyncing", { defaultValue: "同步中" })}
    </div>
  );
};

const ConnectionsSummary = ({ live }: { live?: NodeLiveSnapshot }) => {
  const { t } = useTranslation();
  if (!live) {
    return (
      <div className="w-full min-w-[78px] max-w-[118px] text-[13px] leading-4 text-muted-foreground">
        -
      </div>
    );
  }

  const tcpLabel = t("chart.tcp_connections", { defaultValue: "TCP" });
  const udpLabel = t("chart.udp_connections", { defaultValue: "UDP" });
  const tcpCount = live?.record.connections.tcp ?? 0;
  const udpCount = live?.record.connections.udp ?? 0;

  return (
    <div
      className="w-full min-w-[78px] max-w-[118px] space-y-0 tabular-nums"
      title={`${tcpLabel}: ${tcpCount}\n${udpLabel}: ${udpCount}`}
    >
      <div
        className="block truncate text-[13px] font-medium leading-4 text-slate-900 dark:text-slate-100"
        title={`${tcpLabel}: ${tcpCount}`}
      >
        {tcpLabel} <span className="font-mono">{tcpCount}</span>
      </div>
      <div
        className="block truncate text-[13px] leading-4 text-slate-600 dark:text-slate-400"
        title={`${udpLabel}: ${udpCount}`}
      >
        {udpLabel} <span className="font-mono">{udpCount}</span>
      </div>
    </div>
  );
};

const CompactMetricCell = ({
  percent,
  valueLabel,
  tooltipContent,
}: {
  percent: number;
  valueLabel: string;
  tooltipContent: React.ReactNode;
}) => {
  const safePercent = clampPercent(percent);
  const tone =
    safePercent >= RISK_DANGER_THRESHOLD
      ? "danger"
      : safePercent >= RISK_WARNING_THRESHOLD
        ? "warning"
        : "normal";
  const barClass =
    tone === "danger"
      ? "bg-red-500"
      : tone === "warning"
        ? "bg-amber-500"
        : "bg-emerald-500";
  const percentTextClass =
    tone === "danger"
      ? "text-red-600 dark:text-red-400"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-slate-600 dark:text-slate-300";

  return (
    <NodeInfoTooltip content={tooltipContent}>
      <div className="w-full min-w-[94px] max-w-[156px] cursor-help">
        <div className="mb-0.5 flex items-center justify-between gap-2 whitespace-nowrap leading-none">
          <span className="min-w-0 flex-1 overflow-hidden text-ellipsis font-mono tabular-nums text-[11px] text-slate-600 dark:text-slate-300">
            {valueLabel}
          </span>
          <span className={`shrink-0 tabular-nums text-[11px] font-semibold ${percentTextClass}`}>
            {formatPercent(safePercent)}
          </span>
        </div>
        <div className="relative h-1.5 overflow-hidden rounded-full border border-slate-200/80 bg-slate-100/90 dark:border-slate-800/80 dark:bg-slate-900/60">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barClass}`}
            style={{ width: `${safePercent}%` }}
          />
        </div>
      </div>
    </NodeInfoTooltip>
  );
};

const openNodeTerminal = (uuid: string) => {
  window.open(`/terminal?uuid=${uuid}`, "_blank");
};

const SortableRow = ({
  live,
  liveLoaded,
  node,
}: {
  live?: NodeLiveSnapshot;
  liveLoaded: boolean;
  node: NodeDetail;
}) => {
  const { t } = useTranslation();
  const { hasFeature } = useAccount();
  const [ddnsOpen, setDdnsOpen] = React.useState(false);
  const [portForwardOpen, setPortForwardOpen] = React.useState(false);
  const hasLiveSnapshot = Boolean(live);
  const cpuPercent = hasLiveSnapshot ? clampPercent(live?.record.cpu.usage ?? 0) : 0;
  const cpuCoreCount = Number(node.cpu_cores || 0);
  const usedCpuCores = hasLiveSnapshot
    ? cpuCoreCount
      ? `${formatCoreCount(cpuCoreCount * cpuPercent / 100)} / ${formatCoreCount(cpuCoreCount)} ${t(
        "admin.nodeTable.cpuCoresShort",
        {
          defaultValue: "核",
        },
      )}`
      : formatPercent(cpuPercent)
    : "-";
  const ramPercent = hasLiveSnapshot ? clampPercent(getNodeRamUsagePercent(node, live)) : 0;
  const ramLabel = hasLiveSnapshot
    ? node.mem_total
      ? formatCompactByteUsage(live?.record.ram.used ?? 0, node.mem_total)
      : formatPercent(ramPercent)
    : "-";
  const diskPercent = hasLiveSnapshot ? clampPercent(getNodeDiskUsagePercent(node, live)) : 0;
  const diskLabel = hasLiveSnapshot
    ? node.disk_total
      ? formatCompactByteUsage(live?.record.disk.used ?? 0, node.disk_total)
      : formatPercent(diskPercent)
    : "-";
  const rowTone = getNodeRowTone(node, live);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <TableRow
            className={cn(
              "text-sm",
              rowTone === "critical"
                && "bg-red-50/35 shadow-[inset_3px_0_0_rgba(239,68,68,0.85)] hover:bg-red-50/55 dark:bg-red-950/10 dark:hover:bg-red-950/20",
              rowTone === "warning"
                && "bg-amber-50/35 shadow-[inset_3px_0_0_rgba(245,158,11,0.85)] hover:bg-amber-50/55 dark:bg-amber-950/10 dark:hover:bg-amber-950/20",
            )}
          >
            <TableCell className="min-w-[240px] max-w-[380px] whitespace-normal">
              <NodeEndpointSummary node={node} />
            </TableCell>
            <TableCell className="min-w-[112px] max-w-[164px]">
              <StatusSummary live={live} liveLoaded={liveLoaded} />
            </TableCell>
            <TableCell className="w-[76px]">
              <VersionSummary node={node} />
            </TableCell>
            <TableCell className="min-w-[96px] max-w-[150px]">
              <RateSummary live={live} />
            </TableCell>
            <TableCell className="min-w-[92px] max-w-[128px]">
              <ConnectionsSummary live={live} />
            </TableCell>
            <TableCell className="min-w-[104px] max-w-[160px]">
              <TrafficSummary live={live} />
            </TableCell>
            <TableCell className="w-[80px]">
              <UptimeSummary live={live} />
            </TableCell>
            <TableCell className="min-w-[112px] max-w-[180px] py-1.5 pr-2 pl-1.5">
              <CompactMetricCell
                percent={cpuPercent}
                valueLabel={usedCpuCores}
                tooltipContent={
                  <NodeTooltipBody
                    label="CPU"
                    primary={usedCpuCores}
                  />
                }
              />
            </TableCell>
            <TableCell className="min-w-[112px] max-w-[180px] py-1.5 pr-2 pl-1.5">
              <CompactMetricCell
                percent={ramPercent}
                valueLabel={ramLabel}
                tooltipContent={
                  <NodeTooltipBody
                    label={t("nodeCard.ram", { defaultValue: "内存" })}
                    primary={ramLabel}
                  />
                }
              />
            </TableCell>
            <TableCell className="min-w-[112px] max-w-[180px] py-1.5 pr-2 pl-1.5">
              <CompactMetricCell
                percent={diskPercent}
                valueLabel={diskLabel}
                tooltipContent={
                  <NodeTooltipBody
                    label={t("nodeCard.disk", { defaultValue: "磁盘" })}
                    primary={diskLabel}
                  />
                }
              />
            </TableCell>
          </TableRow>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-44">
          <ContextMenuItem onSelect={() => openNodeTerminal(node.uuid)}>
            <Terminal className="h-4 w-4" />
                {t("terminal.title", { defaultValue: "终端" })}
          </ContextMenuItem>
          {hasFeature("cloud_dns") ? (
            <ContextMenuItem
              onSelect={(event) => {
                event.preventDefault();
                setDdnsOpen(true);
              }}
            >
              <Globe className="h-4 w-4" />
              {t("admin.nodeTable.ddns.title", { defaultValue: "DDNS" })}
            </ContextMenuItem>
          ) : null}
          <ContextMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setPortForwardOpen(true);
            }}
          >
            <Network className="h-4 w-4" />
            {t("admin.nodeTable.portForward.title", { defaultValue: "端口中转" })}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {hasFeature("cloud_dns") && ddnsOpen ? (
        <React.Suspense fallback={null}>
          <LazyNodeDDNSDialog
            item={node}
            open={ddnsOpen}
            onOpenChange={setDdnsOpen}
            trigger={null}
          />
        </React.Suspense>
      ) : null}
      {portForwardOpen ? (
        <React.Suspense fallback={null}>
          <LazyNodePortForwardDialog
            item={node}
            open={portForwardOpen}
            onOpenChange={setPortForwardOpen}
            trigger={null}
          />
        </React.Suspense>
      ) : null}
    </>
  );
};

const NODE_TABLE_COLUMN_WIDTHS: React.CSSProperties[] = [
  { width: "clamp(240px, 24%, 380px)" },
  { width: "clamp(112px, 9%, 164px)" },
  { width: "76px" },
  { width: "clamp(96px, 9%, 150px)" },
  { width: "clamp(92px, 8%, 128px)" },
  { width: "clamp(104px, 10%, 160px)" },
  { width: "80px" },
  { width: "clamp(112px, 10%, 180px)" },
  { width: "clamp(112px, 10%, 180px)" },
  { width: "clamp(112px, 10%, 180px)" },
];

const NodeTableColumnProfile = () => (
  <colgroup>
    {NODE_TABLE_COLUMN_WIDTHS.map((style, index) => (
      <col key={index} style={style} />
    ))}
  </colgroup>
);

const NodeTableColumns = () => {
  const { t } = useTranslation();
  const stickyHeadClass =
    "sticky top-0 z-20 bg-[var(--surface-muted)] text-muted-foreground backdrop-blur";

  return (
    <TableHeader className="bg-[var(--surface-muted)]">
      <TableRow>
        <TableHead className={`${stickyHeadClass} min-w-[240px] max-w-[380px]`}>
          {t("admin.nodeTable.columns.endpoint", { defaultValue: "公网IP" })}
        </TableHead>
        <TableHead className={`${stickyHeadClass} min-w-[112px] max-w-[164px]`}>
          {t("admin.nodeTable.columns.status", { defaultValue: "状态" })}
        </TableHead>
        <TableHead className={`${stickyHeadClass} w-[76px]`}>
          {t("admin.nodeTable.columns.version", { defaultValue: "版本" })}
        </TableHead>
        <TableHead className={`${stickyHeadClass} min-w-[96px] max-w-[150px]`}>
          {t("admin.nodeTable.columns.rate", { defaultValue: "速率" })}
        </TableHead>
        <TableHead className={`${stickyHeadClass} min-w-[92px] max-w-[128px]`}>
          {t("chart.connections", { defaultValue: "连接数" })}
        </TableHead>
        <TableHead className={`${stickyHeadClass} min-w-[104px] max-w-[160px]`}>
          {t("admin.nodeTable.columns.traffic", { defaultValue: "流量" })}
        </TableHead>
        <TableHead className={`${stickyHeadClass} w-[80px]`}>
          {t("admin.nodeTable.columns.uptime", { defaultValue: "在线时长" })}
        </TableHead>
        <TableHead className={`${stickyHeadClass} min-w-[112px] max-w-[180px]`}>
          {t("admin.nodeTable.columns.cpu", { defaultValue: "CPU" })}
        </TableHead>
        <TableHead className={`${stickyHeadClass} min-w-[112px] max-w-[180px]`}>
          {t("admin.nodeTable.columns.ram", { defaultValue: "内存" })}
        </TableHead>
        <TableHead className={`${stickyHeadClass} min-w-[112px] max-w-[180px]`}>
          {t("admin.nodeTable.columns.storage", { defaultValue: "磁盘" })}
        </TableHead>
      </TableRow>
    </TableHeader>
  );
};

const GroupSummaryPill = ({
  label,
  value,
  tone = "slate",
  title,
}: {
  label: string;
  value: string;
  tone?: "slate" | "green" | "red" | "blue";
  title?: string;
}) => {
  const variant: "success" | "destructive" | "outline" | "secondary" =
    tone === "green"
      ? "success"
      : tone === "red"
        ? "destructive"
        : tone === "blue"
          ? "outline"
          : "secondary";

  return (
    <Badge
      variant={variant}
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-0.5 text-[12px] shadow-none"
      title={title}
    >
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </Badge>
  );
};

const GroupUpgradeButton = ({
  groupName,
  nodes,
  liveByNode,
  settings,
}: {
  groupName: string;
  nodes: NodeDetail[];
  liveByNode: Record<string, NodeLiveSnapshot>;
  settings: SettingsResponse;
}) => {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMounted, setDialogMounted] = React.useState(false);

  const onlineNodes = React.useMemo(
    () =>
      nodes.filter(
        (node) =>
          Boolean(liveByNode[node.uuid]?.online) &&
          String(node.token || "").trim().length > 0,
      ),
    [liveByNode, nodes],
  );

  const handleOpen = React.useCallback(() => {
    setDialogMounted(true);
    setDialogOpen(true);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        className="rounded-md"
        disabled={onlineNodes.length === 0}
        onClick={handleOpen}
      >
        {t("admin.nodeTable.upgradeCurrentGroupAgent", "为当前分组升级 Agent")}
      </Button>
      {dialogMounted ? (
        <React.Suspense fallback={null}>
          <LazyGroupUpgradeDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            groupName={groupName}
            nodes={nodes}
            liveByNode={liveByNode}
            settings={settings}
          />
        </React.Suspense>
      ) : null}
    </>
  );
};

const NodeGroupSection = ({
  groupName,
  nodes,
  liveByNode,
  liveLoaded,
  settings,
  installActionsEnabled,
}: {
  groupName: string;
  nodes: NodeDetail[];
  liveByNode: Record<string, NodeLiveSnapshot>;
  liveLoaded: boolean;
  settings: SettingsResponse;
  installActionsEnabled: boolean;
}) => {
  const { t } = useTranslation();
  const liveCounts = getNodeLiveCounts(
    nodes.map((node) => node.uuid),
    liveByNode,
    liveLoaded,
  );
  const blockedCount = nodes.filter((node) =>
    isNodeConnectivityBlocked(liveByNode[node.uuid])
  ).length;

  const groupSummary = (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      <Badge
        variant="outline"
        className="shrink-0 rounded-md px-2.5 py-1"
      >
        {t("admin.nodeTable.groupNodeCount", {
          count: nodes.length,
          defaultValue: "{{count}} 台服务器",
        })}
      </Badge>
      <GroupSummaryPill
        label={t("nodeCard.online", { defaultValue: "在线" })}
        value={`${liveCounts.online}/${nodes.length}`}
        tone="green"
      />
      {liveCounts.unknown > 0 ? (
        <GroupSummaryPill
          label={t("admin.nodeTable.statusSyncing", { defaultValue: "同步中" })}
          value={`${liveCounts.unknown}`}
          tone="blue"
        />
      ) : null}
      <GroupSummaryPill
        label={t("admin.nodeTable.blockedCount", { defaultValue: "阻断" })}
        value={`${blockedCount}`}
        tone="red"
      />
    </span>
  );

  return (
    <AdminDataPanel
      title={groupName}
      description={groupSummary}
      bodyClassName="p-0"
      actions={installActionsEnabled ? (
        <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
          <GenerateCommandButton
            nodes={nodes}
            settings={settings}
            toolbar
            groupMode
            presetGroupName={groupName}
            toolbarLabel={t("admin.nodeTable.installCurrentGroupAgent", "为当前分组安装 Agent")}
            disabled={false}
          />
          <GroupUpgradeButton
            groupName={groupName}
            nodes={nodes}
            liveByNode={liveByNode}
            settings={settings}
          />
        </div>
      ) : null}
    >
      <div className="admin-data-table-scroll min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-gutter:auto]">
        <Table className="admin-data-table min-w-[1120px] table-auto [&_[data-slot=table-cell]]:px-2 [&_[data-slot=table-cell]]:py-1 [&_[data-slot=table-head]]:h-8 [&_[data-slot=table-head]]:px-2">
          <NodeTableColumnProfile />
          <NodeTableColumns />
          <TableBody>
            {nodes.map((node, index) => (
              <SortableRow
                key={`${node.uuid}-${index}`}
                node={node}
                live={liveByNode[node.uuid]}
                liveLoaded={liveLoaded}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminDataPanel>
  );
};

const NodeTable = ({
  nodes,
  totalNodesCount,
  liveByNode,
  liveLoaded,
  settings,
  installActionsEnabled,
  paginationKey,
}: {
  nodes: NodeDetail[];
  totalNodesCount: number;
  liveByNode: Record<string, NodeLiveSnapshot>;
  liveLoaded: boolean;
  settings: SettingsResponse;
  installActionsEnabled: boolean;
  paginationKey?: string;
}) => {
  const { t } = useTranslation();
  const hasActiveFilters = nodes.length !== totalNodesCount;
  const nodePagination = useClientPagination(nodes, {
    initialPageSize: NODE_TABLE_DEFAULT_PAGE_SIZE,
    resetKey: paginationKey ?? "",
  });
  const groupedNodes = React.useMemo(() => {
    const groups = new Map<string, NodeDetail[]>();
    nodePagination.pageItems.forEach((node) => {
      const label = getNodeGroupLabel(node);
      const existing = groups.get(label);
      if (existing) {
        existing.push(node);
      } else {
        groups.set(label, [node]);
      }
    });

    return Array.from(groups.entries()).map(([groupName, groupNodes]) => ({
      groupName,
      nodes: groupNodes,
    }));
  }, [nodePagination.pageItems]);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {nodes.length === 0 ? (
        <AdminEmptyState
          icon={<Server className="h-5 w-5" />}
          title={
            hasActiveFilters
              ? t("admin.nodeTable.noFilteredNodes", {
                defaultValue: "没有匹配当前筛选条件的节点",
              })
              : t("admin.nodeTable.noNodes", { defaultValue: "暂无服务器" })
          }
          description={
            hasActiveFilters
              ? t("admin.nodeTable.noFilteredNodesDescription", {
                defaultValue: "调整搜索关键词后再试，或者清空筛选查看全部节点。",
              })
              : t("admin.nodeTable.noNodesDescription", {
                defaultValue: "完成服务器接入后，节点会自动出现在这里。",
              })
          }
        />
      ) : (
        <>
          {groupedNodes.map((group) => (
            <NodeGroupSection
              key={group.groupName}
              groupName={group.groupName}
              nodes={group.nodes}
              liveByNode={liveByNode}
              liveLoaded={liveLoaded}
              settings={settings}
              installActionsEnabled={installActionsEnabled}
            />
          ))}
          <AdminPagination
            page={nodePagination.page}
            totalPages={nodePagination.totalPages}
            total={nodePagination.total}
            pageSize={nodePagination.pageSize}
            visibleStart={nodePagination.visibleStart}
            visibleEnd={nodePagination.visibleEnd}
            onPageChange={nodePagination.setPage}
            onPageSizeChange={nodePagination.setPageSize}
            pageSizeOptions={[20, 50, 100]}
            itemLabel={t("admin.pagination.nodes", { defaultValue: "台设备" })}
            className="rounded-md border border-border bg-[var(--surface)] shadow-none"
          />
        </>
      )}
    </div>
  );
};

export default NodeDetailsPage;

function GenerateCommandButton({
  node,
  nodes,
  settings,
      toolbar = false,
      groupMode = false,
      presetGroupName,
      toolbarLabel,
      buttonSize = "default",
      disabled = false,
}: {
  node?: NodeDetail;
  nodes?: NodeDetail[];
  settings: SettingsResponse;
  toolbar?: boolean;
  groupMode?: boolean;
  presetGroupName?: string;
  toolbarLabel?: string;
  buttonSize?: "default" | "sm";
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <>
      {toolbar ? (
        <Button
          variant={groupMode ? "secondary" : "default"}
          size={buttonSize}
          className="shrink-0 rounded-md"
          disabled={disabled}
          onClick={() => setDialogOpen(true)}
        >
          <Download size={16} />
          {toolbarLabel ||
            (groupMode
              ? t("admin.nodeTable.installCommandForGroup", "为指定分组生成接入命令")
              : t("admin.nodeTable.installCommand", "Install command"))}
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          title={t("admin.nodeTable.installCommand")}
          className="h-8 w-8 rounded-md"
          disabled={disabled}
          onClick={() => setDialogOpen(true)}
        >
          <Download size="18" />
        </Button>
      )}

      {dialogOpen ? (
        <React.Suspense fallback={null}>
          <LazyGenerateCommandDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            node={node}
            nodes={nodes}
            settings={settings}
            toolbar={toolbar}
            groupMode={groupMode}
            presetGroupName={presetGroupName}
          />
        </React.Suspense>
      ) : null}
    </>
  );
}

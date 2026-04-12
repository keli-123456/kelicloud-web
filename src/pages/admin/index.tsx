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
import { t as translate } from "i18next";
import {
  Badge,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AsyncState } from "@/components/ui/async-state";
import { Input } from "@/components/ui/input";
import {
  Copy,
  Download,
  Globe,
  MoreHorizontal,
  Search,
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
import Loading from "@/components/loading";
import {
  type SettingsResponse,
  useSettings,
} from "@/lib/api";
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
import { resolveStatusBadgeVariant } from "@/lib/status-semantic";
import { DataTableShell } from "@/components/admin/DataTableShell";
import { Navigate } from "react-router-dom";
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

const NodeDetailsPage = () => {
  const { account, hasFeature, loading, platformAdmin } = useAccount();
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
    return <Loading />;
  }
  if (!hasFeature("clients")) {
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

type NodeLiveSnapshot = {
  online: boolean;
  record: LiveRecord;
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
      defaultValue: "Default group",
    })
  );
};

const getDefaultGroupLabel = () =>
  translate("admin.nodeTable.defaultGroup", {
    defaultValue: "Default group",
  });

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

const formatUptimeLabel = (secondsValue?: number) => {
  const seconds = Math.max(0, Math.floor(secondsValue ?? 0));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}${translate("admin.nodeTable.uptimeDayUnit", {
      defaultValue: "d",
    })} ${hours}${translate("admin.nodeTable.uptimeHourUnit", {
      defaultValue: "h",
    })}`;
  }
  if (hours > 0) {
    return `${hours}${translate("admin.nodeTable.uptimeHourUnit", {
      defaultValue: "h",
    })} ${minutes}${translate("admin.nodeTable.uptimeMinuteUnit", {
      defaultValue: "min",
    })}`;
  }
  if (minutes > 0) {
    return `${minutes}${translate("admin.nodeTable.uptimeMinuteUnit", {
      defaultValue: "min",
    })}`;
  }
  return translate("admin.nodeTable.justStarted", {
    defaultValue: "Just started",
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

const isNodeOnline = (live?: NodeLiveSnapshot) => Boolean(live?.online);

const isNodeOffline = (live: NodeLiveSnapshot | undefined, liveLoaded: boolean) =>
  liveLoaded && !isNodeOnline(live);

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

  return detail || `${fallback} (HTTP ${response.status})`;
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
  const allNodes = React.useMemo(
    () => (Array.isArray(nodeDetail)
      ? [...nodeDetail].sort((a, b) => {
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
      : []),
    [nodeDetail],
  );
  const liveScopeUUIDs = React.useMemo(
    () => allNodes.map((node) => node.uuid),
    [allNodes],
  );
  const installActionsEnabled = true;
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

    pollLiveData();

    return () => {
      stopped = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [call, liveScopeUUIDs]);

  return (
    <AsyncState
      loading={isLoading}
      error={error}
      onRetry={() => void refresh()}
      retryLabel={translate("common.retry", { defaultValue: "Retry" })}
    >
      <div
        className="flex min-w-0 flex-col gap-4 p-4 md:gap-6 md:p-6"
        style={{
          fontFamily:
            '"Manrope","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif',
        }}
      >
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
          installActionsEnabled={installActionsEnabled}
          canManageCNConnectivity={canManageCNConnectivity}
          onRefreshSettings={refetchSettings}
        />

        <NodeTable
          nodes={visibleNodes}
          totalNodesCount={allNodes.length}
          liveByNode={liveByNode}
          settings={settings}
          installActionsEnabled={installActionsEnabled}
        />
      </div>
    </AsyncState>
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
  const globalOnlineCount = nodes.filter((node) =>
    isNodeOnline(liveByNode[node.uuid]),
  ).length;
  const globalAbnormalCount = nodes.filter((node) =>
    isNodeAbnormal(node, liveByNode[node.uuid], liveLoaded),
  ).length;
  const currentOnlineCount = visibleNodes.filter((node) =>
    isNodeOnline(liveByNode[node.uuid]),
  ).length;
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
    ? t("common.loading", { defaultValue: "Loading" })
    : settingsError
      ? t("common.error", { defaultValue: "Error" })
      : cnConnectivityEnabled
        ? t("common.enabled", { defaultValue: "Enabled" })
        : t("common.disabled", { defaultValue: "Disabled" });
  const cnConnectivityTone: "slate" | "green" | "red" | "blue" = settingsError
    ? "red"
    : cnConnectivityEnabled
      ? "green"
      : "slate";
  const cnConnectivityDetail = settingsError
    ? t("admin.nodeTable.cnConnectivityLoadFailed", {
        defaultValue: "Failed to load CN connectivity probe settings.",
      })
    : cnConnectivityConfigured
      ? cnConnectivitySummary
      : cnConnectivityEnabled
        ? t("admin.nodeTable.cnConnectivityMissingTarget", {
            defaultValue: "No targets configured yet.",
          })
        : t("admin.nodeTable.cnConnectivityDisabledMessage", {
            defaultValue: "Probe is disabled.",
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
      cancelLabel: t("common.cancel", "Cancel"),
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
          .map((result) =>
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason)
          )
          .join("；");

        if (deletedCount > 0) {
          toast.warning(
            t("admin.nodeTable.cleanupOfflinePartialSuccess", {
              count: deletedCount,
              failed: failed.length,
              detail,
              defaultValue:
                "Deleted {{count}} offline nodes, {{failed}} failed: {{detail}}",
            })
          );
        } else {
          toast.error(
            t("admin.nodeTable.cleanupOfflineFailed", {
              detail,
              defaultValue: "Failed to delete offline nodes: {{detail}}",
            })
          );
        }
      } else {
        toast.success(
          t("admin.nodeTable.cleanupOfflineSuccess", {
            count: offlineNodes.length,
            defaultValue: "Deleted {{count}} offline nodes",
          })
        );
      }
    } catch (cleanupError) {
      toast.error(
        cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
      );
    } finally {
      setCleanupLoading(false);
    }
  };
  const canDeleteOffline =
    liveLoaded && !liveError && offlineNodes.length > 0 && !cleanupLoading;

  return (
    <div className="flex flex-col gap-4">
      {liveError ? (
        <Alert variant="destructive">
          <AlertTitle>{t("common.error", { defaultValue: "Error" })}</AlertTitle>
          <AlertDescription>
            {t("admin.nodeTable.liveErrorPausedDeletion", {
              defaultValue:
                "Live status API failed, so bulk offline deletion is paused.",
            })}
          </AlertDescription>
        </Alert>
      ) : null}

      <DataTableShell
        className="gap-0"
        toolbarClassName="border-b border-border/50 rounded-none border-x-0 border-t-0 bg-transparent p-0 pb-2"
        search={(
          <form
            className="relative"
            onSubmit={(event) => {
              event.preventDefault();
              onToolbarSearch();
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 rounded-md border-border/60 pl-9"
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
        )}
        filters={(
          <div className="min-w-0 text-xs text-muted-foreground">
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
                    defaultValue: "在线 {{online}} · 异常 {{abnormal}}",
                  })}
                </span>
                <span className="text-muted-foreground/80">
                  {" "}
                  ·{" "}
                  {t("admin.nodeTable.inlineGlobalSummary", {
                    online: globalOnlineCount,
                    offline: Math.max(nodes.length - globalOnlineCount, 0),
                    defaultValue: "全局 在线 {{online}} · 离线 {{offline}}",
                  })}
                </span>
              </div>
            ) : (
              <div className="truncate">
                {t("admin.nodeTable.inlineStats", {
                  online: globalOnlineCount,
                  offline: Math.max(nodes.length - globalOnlineCount, 0),
                  abnormal: globalAbnormalCount,
                  upload: `${formatBytes(totalUploadSpeed)}/s`,
                  download: `${formatBytes(totalDownloadSpeed)}/s`,
                  defaultValue:
                    "在线 {{online}} · 离线 {{offline}} · 异常 {{abnormal}} · ↑{{upload}} · ↓{{download}}",
                })}
              </div>
            )}
          </div>
        )}
        actions={(
          <>
            <Badge
              variant="secondary"
              className={`h-9 shrink-0 rounded-md border border-border/60 bg-transparent px-2.5 text-xs font-medium shadow-none ${
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
          </>
        )}
      />
      {groupCommandDialogOpen ? (
        <React.Suspense fallback={null}>
          <LazyGenerateCommandDialog
            open={groupCommandDialogOpen}
            onOpenChange={setGroupCommandDialogOpen}
            nodes={nodes}
            settings={settings}
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
    return `${usedParts.magnitude} / ${totalParts.magnitude} ${usedParts.unit}`;
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
}: {
  live?: NodeLiveSnapshot;
}) => {
  const { t } = useTranslation();
  const online = isNodeOnline(live);
  const connectivity = live?.record.cn_connectivity;
  const cnBadge =
    connectivity && connectivity.status
      ? buildCNConnectivityBadge(connectivity, t)
      : null;

  return (
    <div className="min-w-[102px] space-y-1">
      <Badge
        variant={online ? "success" : "destructive"}
        className="rounded-md px-1.5"
      >
        {online ? t("nodeCard.online", "Online") : t("nodeCard.offline", "Offline")}
      </Badge>
      {cnBadge ? (
        <Badge
          variant={cnBadge.variant}
          className="max-w-[128px] overflow-hidden text-ellipsis rounded-md px-1.5"
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
  const normalizedStatus = String(connectivity.status || "").trim().toLowerCase() || "unknown";
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

  switch (normalizedStatus) {
    case "ok":
      return {
        label: `${t("admin.nodeTable.cnConnectivityOk", "CN OK")}${latencyLabel}`,
        variant: resolveStatusBadgeVariant(normalizedStatus),
        title,
      };
    case "blocked_suspected":
      return {
        label: t("admin.nodeTable.cnConnectivityBlocked", "CN blocked"),
        variant: resolveStatusBadgeVariant(normalizedStatus),
        title,
      };
    case "degraded":
      return {
        label: t("admin.nodeTable.cnConnectivityDegraded", "CN degraded"),
        variant: resolveStatusBadgeVariant(normalizedStatus),
        title,
      };
    default:
      return {
        label: t("admin.nodeTable.cnConnectivityUnknown", "CN pending"),
        variant: resolveStatusBadgeVariant(normalizedStatus),
        title,
      };
  }
};

const VersionSummary = ({ node }: { node: NodeDetail }) => (
  <div className="min-w-[92px]">
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
          error instanceof Error
            ? error.message
            : t("admin.nodeTable.ddnsDomainLoadFailed", {
              defaultValue: "Failed to load DDNS domain",
            }),
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
        defaultValue: "Loading DDNS domain...",
      })
      : ddnsLoadError
        ? t("admin.nodeTable.ddnsDomainLoadFailed", {
          defaultValue: "Failed to load DDNS domain",
        })
        : ddnsDomain
          ? `${t("admin.nodeTable.ddnsDomain", { defaultValue: "DDNS domain" })}: ${ddnsDomain}`
          : undefined
    : undefined;
  const copyIp = React.useCallback(
    async (address: string) => {
      if (!address || address === "-") {
        return;
      }
      try {
        await navigator.clipboard.writeText(address);
        toast.success(t("copy_success", { defaultValue: "Copied!" }));
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
            defaultValue: "Hostname",
          })}
          primary={String(node.name || "").trim() || "-"}
          secondary={tooltipSecondary}
        />
      }
    >
      <div className="flex min-w-[196px] items-start gap-2 text-[13px] text-slate-700 dark:text-slate-200">
        <div className="pt-0.5">
          <Flag flag={node.region} size="4" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1">
            <span className="text-slate-400 dark:text-slate-500">IPv4</span>
            <span className="min-w-0 truncate font-mono text-[12px]">{ipv4Value}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md"
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
              <Copy size={14} />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-400 dark:text-slate-500">IPv6</span>
            <span
              className="min-w-0 truncate font-mono text-[12px]"
              title={ipv6Value}
            >
              {ipv6Short}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md"
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
              <Copy size={14} />
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
    <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
      {label}
    </div>
    <div className="text-sm font-semibold text-foreground">{primary}</div>
    {secondary ? (
      <div className="text-xs leading-relaxed text-muted-foreground">
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
      className="rounded-lg border border-border/70 bg-popover px-3 py-2 text-xs text-foreground shadow-none"
    >
      {content}
    </TooltipContent>
  </Tooltip>
);

const RateSummary = ({ live }: { live?: NodeLiveSnapshot }) => {
  const snapshot = live?.record || createEmptyLiveRecord();

  return (
    <div className="min-w-[98px] space-y-0.5 tabular-nums">
      <div className="block text-[13px] font-medium text-slate-900 dark:text-slate-100">
        ↑ {formatBytes(snapshot.network.up)}/s
      </div>
      <div className="block text-[13px] text-slate-600 dark:text-slate-400">
        ↓ {formatBytes(snapshot.network.down)}/s
      </div>
    </div>
  );
};

const TrafficSummary = ({ live }: { live?: NodeLiveSnapshot }) => {
  const snapshot = live?.record || createEmptyLiveRecord();

  return (
    <div className="min-w-[106px] space-y-0.5 tabular-nums">
      <div className="block text-[13px] font-medium text-slate-900 dark:text-slate-100">
        ↑ {formatBytes(snapshot.network.totalUp)}
      </div>
      <div className="block text-[13px] text-slate-600 dark:text-slate-400">
        ↓ {formatBytes(snapshot.network.totalDown)}
      </div>
    </div>
  );
};

const UptimeSummary = ({ live }: { live?: NodeLiveSnapshot }) => {
  return (
    <div className="block min-w-[74px] tabular-nums text-[13px] text-slate-700 dark:text-slate-300">
      {formatUptimeLabel(live?.record.uptime)}
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
      <div className="w-full min-w-[148px] max-w-[162px] cursor-help">
        <div className="mb-1 flex items-center justify-between gap-2 whitespace-nowrap leading-none">
          <span className="min-w-0 flex-1 overflow-hidden text-ellipsis font-mono tabular-nums text-[11px] text-slate-600 dark:text-slate-300">
            {valueLabel}
          </span>
          <span className={`shrink-0 tabular-nums text-[11px] font-semibold ${percentTextClass}`}>
            {formatPercent(safePercent)}
          </span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full border border-slate-200/80 bg-slate-100/90 dark:border-slate-800/80 dark:bg-slate-900/60">
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
  node,
}: {
  live?: NodeLiveSnapshot;
  node: NodeDetail;
}) => {
  const { t } = useTranslation();
  const { hasFeature } = useAccount();
  const [ddnsOpen, setDdnsOpen] = React.useState(false);
  const cpuPercent = clampPercent(live?.record.cpu.usage ?? 0);
  const cpuCoreCount = Number(node.cpu_cores || 0);
  const usedCpuCores = cpuCoreCount
    ? `${formatCoreCount(cpuCoreCount * cpuPercent / 100)} / ${formatCoreCount(cpuCoreCount)} ${t(
      "admin.nodeTable.cpuCoresShort",
      {
        defaultValue: "cores",
      },
    )}`
    : formatPercent(cpuPercent);
  const ramPercent = clampPercent(getNodeRamUsagePercent(node, live));
  const ramLabel = node.mem_total
    ? formatCompactByteUsage(live?.record.ram.used ?? 0, node.mem_total)
    : formatPercent(ramPercent);
  const diskPercent = clampPercent(getNodeDiskUsagePercent(node, live));
  const diskLabel = node.disk_total
    ? formatCompactByteUsage(live?.record.disk.used ?? 0, node.disk_total)
    : formatPercent(diskPercent);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <TableRow className="cursor-context-menu text-[13px]">
            <TableCell>
              <NodeEndpointSummary node={node} />
            </TableCell>
            <TableCell>
              <StatusSummary live={live} />
            </TableCell>
            <TableCell>
              <VersionSummary node={node} />
            </TableCell>
            <TableCell>
              <RateSummary live={live} />
            </TableCell>
            <TableCell>
              <TrafficSummary live={live} />
            </TableCell>
            <TableCell>
              <UptimeSummary live={live} />
            </TableCell>
            <TableCell className="py-1.5 pr-2 pl-1.5">
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
            <TableCell className="py-1.5 pr-2 pl-1.5">
              <CompactMetricCell
                percent={ramPercent}
                valueLabel={ramLabel}
                tooltipContent={
                  <NodeTooltipBody
                    label={t("nodeCard.ram", { defaultValue: "RAM" })}
                    primary={ramLabel}
                  />
                }
              />
            </TableCell>
            <TableCell className="py-1.5 pr-2 pl-1.5">
              <CompactMetricCell
                percent={diskPercent}
                valueLabel={diskLabel}
                tooltipContent={
                  <NodeTooltipBody
                    label={t("nodeCard.disk", { defaultValue: "Disk" })}
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
            {t("terminal.title", { defaultValue: "Terminal" })}
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
    </>
  );
};

const NodeTableColumns = () => {
  const { t } = useTranslation();
  const stickyHeadClass =
    "sticky top-0 z-20 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80";

  return (
    <TableHeader className="bg-muted/40">
      <TableRow>
        <TableHead className={`${stickyHeadClass} w-[204px]`}>
          {t("admin.nodeTable.columns.endpoint", { defaultValue: "Public IP" })}
        </TableHead>
        <TableHead className={`${stickyHeadClass} w-[110px]`}>
          {t("admin.nodeTable.columns.status", { defaultValue: "Status" })}
        </TableHead>
        <TableHead className={`${stickyHeadClass} w-[96px]`}>
          {t("admin.nodeTable.columns.version", { defaultValue: "Version" })}
        </TableHead>
        <TableHead className={`${stickyHeadClass} w-[100px]`}>
          {t("admin.nodeTable.columns.rate", { defaultValue: "Rate" })}
        </TableHead>
        <TableHead className={`${stickyHeadClass} w-[108px]`}>
          {t("admin.nodeTable.columns.traffic", { defaultValue: "Traffic" })}
        </TableHead>
        <TableHead className={`${stickyHeadClass} w-[78px]`}>
          {t("admin.nodeTable.columns.uptime", { defaultValue: "Uptime" })}
        </TableHead>
        <TableHead className={`${stickyHeadClass} w-[156px]`}>
          {t("admin.nodeTable.columns.cpu", { defaultValue: "CPU" })}
        </TableHead>
        <TableHead className={`${stickyHeadClass} w-[156px]`}>
          {t("admin.nodeTable.columns.ram", { defaultValue: "RAM" })}
        </TableHead>
        <TableHead className={`${stickyHeadClass} w-[156px]`}>
          {t("admin.nodeTable.columns.storage", { defaultValue: "Storage" })}
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
  const variant: "success" | "destructive" | "secondary" =
    tone === "green"
      ? "success"
      : tone === "red"
        ? "destructive"
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
  settings,
  installActionsEnabled,
}: {
  groupName: string;
  nodes: NodeDetail[];
  liveByNode: Record<string, NodeLiveSnapshot>;
  settings: SettingsResponse;
  installActionsEnabled: boolean;
}) => {
  const { t } = useTranslation();
  const totalUploadSpeed = nodes.reduce(
    (sum, node) => sum + (liveByNode[node.uuid]?.record.network.up ?? 0),
    0
  );
  const totalDownloadSpeed = nodes.reduce(
    (sum, node) => sum + (liveByNode[node.uuid]?.record.network.down ?? 0),
    0
  );
  const totalUploadTraffic = nodes.reduce(
    (sum, node) => sum + (liveByNode[node.uuid]?.record.network.totalUp ?? 0),
    0
  );
  const totalDownloadTraffic = nodes.reduce(
    (sum, node) => sum + (liveByNode[node.uuid]?.record.network.totalDown ?? 0),
    0
  );
  const onlineCount = nodes.filter((node) => liveByNode[node.uuid]?.online).length;
  const blockedCount = nodes.filter((node) =>
    isNodeConnectivityBlocked(liveByNode[node.uuid])
  ).length;

  return (
    <div className="min-w-0 rounded-lg border border-border/60 bg-card shadow-none">
      <div className="flex flex-col gap-4 border-b border-border/60 px-4 py-4 md:px-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1 overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-2 pr-2 whitespace-nowrap">
            <div className="shrink-0 text-base font-semibold tracking-tight text-foreground">
              {groupName}
            </div>
            <Badge
              variant="outline"
              className="shrink-0 rounded-md px-2.5 py-1"
            >
              {t("admin.nodeTable.groupNodeCount", {
                count: nodes.length,
                defaultValue: "{{count}} nodes",
              })}
            </Badge>
            <GroupSummaryPill
              label={t("nodeCard.online", "Online")}
              value={`${onlineCount}/${nodes.length}`}
              tone="green"
            />
            <GroupSummaryPill
              label={t("admin.nodeTable.blockedCount", "Blocked")}
              value={`${blockedCount}`}
              tone="red"
            />
            <GroupSummaryPill
              label={t("admin.nodeTable.totalRate", "Total rate")}
              value={`↑ ${formatBytes(totalUploadSpeed)}/s · ↓ ${formatBytes(
                totalDownloadSpeed
              )}/s`}
            />
            <GroupSummaryPill
              label={t("admin.nodeTable.totalTraffic", "Total traffic")}
              value={`↑ ${formatBytes(totalUploadTraffic)} · ↓ ${formatBytes(
                totalDownloadTraffic
              )}`}
            />
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
          <GenerateCommandButton
            nodes={nodes}
            settings={settings}
            toolbar
            groupMode
            presetGroupName={groupName}
            toolbarLabel={t("admin.nodeTable.installCurrentGroupAgent", "为当前分组安装 Agent")}
            disabled={!installActionsEnabled}
          />
          <GroupUpgradeButton
            groupName={groupName}
            nodes={nodes}
            liveByNode={liveByNode}
            settings={settings}
          />
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <Table className="min-w-[1160px]">
          <NodeTableColumns />
          <TableBody>
            {nodes.map((node) => (
              <SortableRow
                key={node.uuid}
                node={node}
                live={liveByNode[node.uuid]}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const NodeTable = ({
  nodes,
  totalNodesCount,
  liveByNode,
  settings,
  installActionsEnabled,
}: {
  nodes: NodeDetail[];
  totalNodesCount: number;
  liveByNode: Record<string, NodeLiveSnapshot>;
  settings: SettingsResponse;
  installActionsEnabled: boolean;
}) => {
  const { t } = useTranslation();
  const hasActiveFilters = nodes.length !== totalNodesCount;
  const groupedNodes = React.useMemo(() => {
    const groups = new Map<string, NodeDetail[]>();
    nodes.forEach((node) => {
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
  }, [nodes]);

  return (
    <DataTableShell
      className="min-w-0"
      empty={nodes.length === 0}
      emptyTitle={hasActiveFilters
        ? t("admin.nodeTable.noFilteredNodes", {
          defaultValue: "没有匹配当前筛选条件的节点",
        })
        : t("admin.nodeTable.noNodes", "No nodes")}
      emptyDescription={hasActiveFilters
        ? t("admin.nodeTable.noFilteredNodesHint", {
          defaultValue: "Try adjusting search keywords or filter conditions.",
        })
        : t("admin.nodeTable.noNodesHint", {
          defaultValue: "Add nodes to start monitoring status and metrics.",
        })}
    >
      <div className="flex min-w-0 flex-col gap-4">
        {groupedNodes.map((group) => (
          <NodeGroupSection
            key={group.groupName}
            groupName={group.groupName}
            nodes={group.nodes}
            liveByNode={liveByNode}
            settings={settings}
            installActionsEnabled={installActionsEnabled}
          />
        ))}
      </div>
    </DataTableShell>
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
          aria-label={t("admin.nodeTable.installCommand")}
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
            groupMode={groupMode}
            presetGroupName={presetGroupName}
          />
        </React.Suspense>
      ) : null}
    </>
  );
}

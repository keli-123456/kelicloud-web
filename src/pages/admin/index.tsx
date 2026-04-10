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
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Download,
  Globe,
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

type AdminScopedUser = {
  uuid: string;
  username: string;
  client_count?: number;
};

type AdminUsersEnvelope = {
  status?: string;
  message?: string;
  data?: {
    items?: AdminScopedUser[];
  };
};

const NodeDetailsPage = () => {
  const { account, hasFeature, loading, platformAdmin } = useAccount();
  const selfUUID = String(account?.uuid || "").trim();
  const canManageCNConnectivity = platformAdmin || hasFeature("cn_connectivity");
  const [scopeUsers, setScopeUsers] = useState<AdminScopedUser[]>([]);
  const [selectedUserUUID, setSelectedUserUUID] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  React.useEffect(() => {
    if (!platformAdmin) {
      setScopeUsers([]);
      setSelectedUserUUID("");
      setUserSearchQuery("");
      return;
    }

    let cancelled = false;

    const loadScopeUsers = async () => {
      try {
        const response = await fetch("/api/admin/users");
        const payload = (await response
          .json()
          .catch(() => ({}))) as AdminUsersEnvelope;
        if (!response.ok || payload.status === "error") {
          throw new Error(payload.message || "Failed to load users");
        }

        const items = (payload.data?.items || [])
          .map((item) => ({
            uuid: String(item.uuid || "").trim(),
            username: String(item.username || "").trim(),
            client_count: Number(item.client_count || 0),
          }))
          .filter(
            (item) =>
              item.uuid &&
              item.username &&
              item.uuid !== selfUUID,
          )
          .sort((left, right) =>
            left.username.localeCompare(right.username, "zh-CN"),
          );

        if (cancelled) {
          return;
        }

        setScopeUsers(items);
        setSelectedUserUUID((current) =>
          current && items.some((item) => item.uuid === current) ? current : "",
        );
      } catch (loadError) {
        console.error("Failed to load admin node scope users:", loadError);
        if (cancelled) {
          return;
        }
        setScopeUsers([]);
        setSelectedUserUUID("");
        setUserSearchQuery("");
      }
    };

    void loadScopeUsers();

    return () => {
      cancelled = true;
    };
  }, [platformAdmin, selfUUID]);

  const listEndpoint = React.useMemo(() => {
    if (!platformAdmin) {
      return "/api/admin/client/list";
    }
    if (selectedUserUUID) {
      return `/api/admin/client/list?user_uuid=${encodeURIComponent(
        selectedUserUUID,
      )}`;
    }
    return "/api/admin/client/list";
  }, [platformAdmin, selectedUserUUID]);

  const handleUserSearch = React.useCallback(() => {
    if (!platformAdmin) {
      return;
    }

    const keyword = userSearchQuery.trim().toLowerCase();
    if (!keyword) {
      setSelectedUserUUID("");
      return;
    }

    const exactMatch = scopeUsers.find(
      (item) => item.username.toLowerCase() === keyword,
    );
    const partialMatch =
      exactMatch ||
      scopeUsers.find((item) =>
        item.username.toLowerCase().includes(keyword),
      );

    if (!partialMatch) {
      toast.error(
        translate("admin.nodeTable.userSearchNoMatch", {
          query: userSearchQuery,
        }),
      );
      return;
    }

    setSelectedUserUUID(partialMatch.uuid);
    setUserSearchQuery(partialMatch.username);
  }, [platformAdmin, scopeUsers, userSearchQuery]);

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
        scopeUsers={scopeUsers}
        selectedUserUUID={selectedUserUUID}
        userSearchQuery={userSearchQuery}
        onUserSearchQueryChange={setUserSearchQuery}
        onUserSearch={handleUserSearch}
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

const Layout = ({
  platformAdmin,
  scopeUsers,
  selectedUserUUID,
  userSearchQuery,
  onUserSearchQueryChange,
  onUserSearch,
  canManageCNConnectivity,
}: {
  platformAdmin: boolean;
  scopeUsers: AdminScopedUser[];
  selectedUserUUID: string;
  userSearchQuery: string;
  onUserSearchQueryChange: (value: string) => void;
  onUserSearch: () => void;
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
  const installActionsEnabled = !platformAdmin || !selectedUserUUID;

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

  if (isLoading) return <Loading text="" />;
  if (error) return <div>{error}</div>;

  return (
    <div
      className="flex min-w-0 flex-col gap-4 p-4 md:gap-6 md:p-6"
      style={{
        fontFamily:
          '"Manrope","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif',
      }}
    >
      <Header
        nodes={allNodes}
        liveByNode={liveByNode}
        liveLoaded={liveLoaded}
        liveError={liveError}
        settings={settings}
        settingsLoading={settingsLoading}
        settingsError={settingsError}
        platformAdmin={platformAdmin}
        scopeUsers={scopeUsers}
        userSearchQuery={userSearchQuery}
        onUserSearchQueryChange={onUserSearchQueryChange}
        onUserSearch={onUserSearch}
        installActionsEnabled={installActionsEnabled}
        canManageCNConnectivity={canManageCNConnectivity}
        onRefreshSettings={refetchSettings}
      />

      <NodeTable
        nodes={allNodes}
        liveByNode={liveByNode}
        settings={settings}
        installActionsEnabled={installActionsEnabled}
      />
    </div>
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
  liveByNode,
  liveLoaded,
  liveError,
  settings,
  settingsLoading,
  settingsError,
  platformAdmin,
  scopeUsers,
  userSearchQuery,
  onUserSearchQueryChange,
  onUserSearch,
  installActionsEnabled,
  canManageCNConnectivity,
  onRefreshSettings,
}: {
  nodes: NodeDetail[];
  liveByNode: Record<string, NodeLiveSnapshot>;
  liveLoaded: boolean;
  liveError: string | null;
  settings: SettingsResponse;
  settingsLoading: boolean;
  settingsError: string | null;
  platformAdmin: boolean;
  scopeUsers: AdminScopedUser[];
  userSearchQuery: string;
  onUserSearchQueryChange: (value: string) => void;
  onUserSearch: () => void;
  installActionsEnabled: boolean;
  canManageCNConnectivity: boolean;
  onRefreshSettings: () => Promise<SettingsResponse>;
}) => {
  const { t, i18n } = useTranslation();
  const { refresh } = useNodeDetails();
  const { confirm, dialog } = useWarningDialog();
  const [cleanupLoading, setCleanupLoading] = useState(false);
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
  const totalUploadTraffic = nodes.reduce(
    (sum, node) => sum + (liveByNode[node.uuid]?.record.network.totalUp ?? 0),
    0
  );
  const totalDownloadTraffic = nodes.reduce(
    (sum, node) => sum + (liveByNode[node.uuid]?.record.network.totalDown ?? 0),
    0
  );
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
        "Delete the {{count}} nodes currently confirmed offline. This action cannot be undone.",
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

      <Card className="rounded-lg border-border/60 shadow-none dark:bg-slate-950/50">
        <div className="flex flex-col gap-2 px-3 py-2.5 md:px-3.5 md:py-3">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="text-sm font-medium text-foreground">
              {t("admin.nodeTable.nodeList")}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
              {platformAdmin ? (
                <form
                  className="flex min-w-[220px] flex-1 items-center sm:min-w-[260px] xl:w-[300px] xl:flex-none"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onUserSearch();
                  }}
                >
                  <div className="relative w-full sm:flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="h-9 pl-9"
                      placeholder={t("admin.nodeTable.userSearchPlaceholder")}
                      value={userSearchQuery}
                      list="admin-node-user-search"
                      onChange={(event) => onUserSearchQueryChange(event.target.value)}
                    />
                  </div>
                  <datalist id="admin-node-user-search">
                    {scopeUsers.map((user) => (
                      <option key={user.uuid} value={user.username} />
                    ))}
                  </datalist>
                </form>
              ) : null}
              <GroupSummaryPill
                label={t("admin.nodeTable.totalRate", "Total rate")}
                value={`↑ ${formatBytes(totalUploadSpeed)}/s · ↓ ${formatBytes(
                  totalDownloadSpeed
                )}/s`}
                tone="blue"
              />
              <GroupSummaryPill
                label={t("admin.nodeTable.totalTraffic", "Total traffic")}
                value={`↑ ${formatBytes(totalUploadTraffic)} · ↓ ${formatBytes(
                  totalDownloadTraffic
                )}`}
              />
              <GroupSummaryPill
                label={t("settings.general.cn_connectivity")}
                value={cnConnectivityStatusLabel}
                tone={cnConnectivityTone}
                title={cnConnectivityDetail}
              />
              <GenerateCommandButton
                nodes={nodes}
                settings={settings}
                toolbar
                buttonSize="sm"
                disabled={!installActionsEnabled}
              />
              <GenerateCommandButton
                nodes={nodes}
                settings={settings}
                toolbar
                groupMode
                buttonSize="sm"
                disabled={!installActionsEnabled}
              />
              <Button
                variant="destructive"
                size="sm"
                disabled={
                  !liveLoaded ||
                  Boolean(liveError) ||
                  offlineNodes.length === 0 ||
                  cleanupLoading
                }
                className="rounded-md"
                onClick={() => void handleDeleteOffline()}
              >
                <Trash2Icon size={16} />
                {t("admin.nodeTable.deleteOffline", "Delete offline nodes")}
              </Button>
              {platformAdmin ? (
                <NodeAccessSettingsDialogButton
                  settings={settings}
                  platformAdmin={platformAdmin}
                  canManageCNConnectivity={canManageCNConnectivity}
                  onRefreshSettings={onRefreshSettings}
                />
              ) : null}
            </div>
          </div>
        </div>
      </Card>
      {dialog}
    </div>
  );
};

const clampPercent = (value: number) =>
  Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

const formatPercent = (value: number) => `${Math.round(clampPercent(value))}%`;

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
    <div className="min-w-[120px] space-y-1">
      <Badge
        variant={online ? "success" : "destructive"}
        className="rounded-md"
      >
        {online ? t("nodeCard.online", "Online") : t("nodeCard.offline", "Offline")}
      </Badge>
      {cnBadge ? (
        <Badge
          variant={cnBadge.variant}
          className="rounded-md"
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
        label: `${t("admin.nodeTable.cnConnectivityOk", "CN reachable")}${latencyLabel}`,
        variant: "success" as const,
        title,
      };
    case "blocked_suspected":
      return {
        label: t("admin.nodeTable.cnConnectivityBlocked", "Suspected blocked"),
        variant: "destructive" as const,
        title,
      };
    case "degraded":
      return {
        label: t("admin.nodeTable.cnConnectivityDegraded", "CN abnormal"),
        variant: "warning" as const,
        title,
      };
    default:
      return {
        label: t("admin.nodeTable.cnConnectivityUnknown", "Pending probe"),
        variant: "secondary" as const,
        title,
      };
  }
};

const VersionSummary = ({ node }: { node: NodeDetail }) => (
  <div className="min-w-[112px]">
    <Badge variant="outline" className="rounded-md font-mono text-[12px]">
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
      <div className="flex min-w-[200px] items-start gap-2 text-[13px] text-slate-700 dark:text-slate-200">
        <div className="pt-0.5">
          <Flag flag={node.region} size="4" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="truncate">
            <span className="mr-1 text-slate-400 dark:text-slate-500">IPv4</span>
            {formatNodeIp(node.ipv4)}
          </div>
          <div className="truncate">
            <span className="mr-1 text-slate-400 dark:text-slate-500">IPv6</span>
            {formatNodeIp(node.ipv6)}
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
    <div className="min-w-[120px] space-y-0.5">
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
    <div className="min-w-[132px] space-y-0.5">
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
    <div className="block min-w-[72px] text-[13px] text-slate-700 dark:text-slate-300">
      {formatUptimeLabel(live?.record.uptime)}
    </div>
  );
};

const UsageBar = ({
  percent,
  colorClass,
  tooltipContent,
}: {
  percent: number;
  colorClass: string;
  tooltipContent: React.ReactNode;
}) => {
  const safePercent = clampPercent(percent);

  return (
    <NodeInfoTooltip content={tooltipContent}>
      <div className="w-[136px] cursor-help">
        <div className="relative h-5 overflow-hidden rounded-full border border-slate-200/80 bg-slate-100/90 dark:border-slate-800/80 dark:bg-slate-900/60">
          <div
            className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
            style={{ width: `${safePercent}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tracking-tight text-slate-700 dark:text-slate-200">
            {formatPercent(safePercent)}
          </div>
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
            <TableCell>
              <UsageBar
                percent={live?.record.cpu.usage ?? 0}
                colorClass="bg-sky-500"
                tooltipContent={
                  <NodeTooltipBody
                    label="CPU"
                    primary={
                      node.cpu_cores
                        ? `${node.cpu_cores} ${t("admin.nodeTable.cpuCoresShort", {
                            defaultValue: "cores",
                          })}`
                        : "-"
                    }
                  />
                }
              />
            </TableCell>
            <TableCell>
              <UsageBar
                percent={
                  node.mem_total
                    ? ((live?.record.ram.used ?? 0) / node.mem_total) * 100
                    : 0
                }
                colorClass="bg-emerald-500"
                tooltipContent={
                  <NodeTooltipBody
                    label={t("nodeCard.ram", { defaultValue: "RAM" })}
                    primary={`${formatBytes(live?.record.ram.used ?? 0)} / ${formatBytes(node.mem_total || 0)}`}
                  />
                }
              />
            </TableCell>
            <TableCell>
              <UsageBar
                percent={
                  node.disk_total
                    ? ((live?.record.disk.used ?? 0) / node.disk_total) * 100
                    : 0
                }
                colorClass="bg-amber-500"
                tooltipContent={
                  <NodeTooltipBody
                    label={t("nodeCard.disk", { defaultValue: "Disk" })}
                    primary={`${formatBytes(live?.record.disk.used ?? 0)} / ${formatBytes(node.disk_total || 0)}`}
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

  return (
    <TableHeader className="bg-muted/40">
      <TableRow>
        <TableHead className="w-[240px]">
          {t("admin.nodeTable.columns.endpoint", { defaultValue: "Public IP" })}
        </TableHead>
        <TableHead>
          {t("admin.nodeTable.columns.status", { defaultValue: "Status" })}
        </TableHead>
        <TableHead className="w-[132px]">
          {t("admin.nodeTable.columns.version", { defaultValue: "Version" })}
        </TableHead>
        <TableHead>
          {t("admin.nodeTable.columns.rate", { defaultValue: "Rate" })}
        </TableHead>
        <TableHead>
          {t("admin.nodeTable.columns.traffic", { defaultValue: "Traffic" })}
        </TableHead>
        <TableHead>
          {t("admin.nodeTable.columns.uptime", { defaultValue: "Uptime" })}
        </TableHead>
        <TableHead className="w-[168px]">
          {t("admin.nodeTable.columns.cpu", { defaultValue: "CPU" })}
        </TableHead>
        <TableHead className="w-[168px]">
          {t("admin.nodeTable.columns.ram", { defaultValue: "RAM" })}
        </TableHead>
        <TableHead className="w-[168px]">
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
        {t("admin.nodeTable.upgradeAgent", "Upgrade agent")}
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
    <div className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card shadow-none">
      <div className="flex flex-col gap-4 border-b border-border/70 px-4 py-4 md:px-5 xl:flex-row xl:items-center xl:justify-between">
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
              tone="blue"
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
            toolbarLabel={t("admin.nodeTable.installAgent", "Install agent")}
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
      <Table className="min-w-[1320px]">
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
  );
};

const NodeTable = ({
  nodes,
  liveByNode,
  settings,
  installActionsEnabled,
}: {
  nodes: NodeDetail[];
  liveByNode: Record<string, NodeLiveSnapshot>;
  settings: SettingsResponse;
  installActionsEnabled: boolean;
}) => {
  const { t } = useTranslation();
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
    <div className="flex min-w-0 flex-col gap-4">
      {nodes.length === 0 ? (
        <Card className="rounded-xl border-dashed border-border/70 py-10 text-center text-sm text-muted-foreground shadow-none">
          {t("admin.nodeTable.noNodes", "No nodes")}
        </Card>
      ) : (
        groupedNodes.map((group) => (
          <NodeGroupSection
            key={group.groupName}
            groupName={group.groupName}
            nodes={group.nodes}
            liveByNode={liveByNode}
            settings={settings}
            installActionsEnabled={installActionsEnabled}
          />
        ))
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
              ? t("admin.nodeTable.createGroup", "Create group")
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

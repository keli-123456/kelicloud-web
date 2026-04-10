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
  ArrowDownUp,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

type NodeStatusFilter = "all" | "online" | "offline";
type NodeAbnormalFilter = "all" | "abnormal" | "normal";
type NodeSortField = "none" | "cpu" | "ram" | "traffic" | "uptime";
type NodeSortDirection = "asc" | "desc";

const RISK_WARNING_THRESHOLD = 75;
const RISK_DANGER_THRESHOLD = 90;

const buildSearchText = (node: NodeDetail) =>
  [
    node.name,
    node.group,
    node.os,
    node.arch,
    node.region,
    node.version,
    node.ipv4,
    node.ipv6,
  ]
    .map((value) => String(value || "").toLowerCase().trim())
    .filter(Boolean)
    .join(" ");

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

const getNodeTrafficTotal = (live?: NodeLiveSnapshot) =>
  (live?.record.network.totalUp ?? 0) + (live?.record.network.totalDown ?? 0);

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

const getNodeSortMetric = (
  node: NodeDetail,
  live: NodeLiveSnapshot | undefined,
  sortField: NodeSortField,
) => {
  if (sortField === "cpu") {
    return clampPercent(live?.record.cpu.usage ?? 0);
  }
  if (sortField === "ram") {
    return clampPercent(getNodeRamUsagePercent(node, live));
  }
  if (sortField === "traffic") {
    return getNodeTrafficTotal(live);
  }
  if (sortField === "uptime") {
    return live?.record.uptime ?? 0;
  }
  return 0;
};

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
  const [nodeSearchQuery, setNodeSearchQuery] = React.useState("");
  const [groupFilter, setGroupFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<NodeStatusFilter>("all");
  const [regionFilter, setRegionFilter] = React.useState("all");
  const [versionFilter, setVersionFilter] = React.useState("all");
  const [abnormalFilter, setAbnormalFilter] =
    React.useState<NodeAbnormalFilter>("all");
  const [sortField, setSortField] = React.useState<NodeSortField>("none");
  const [sortDirection, setSortDirection] =
    React.useState<NodeSortDirection>("desc");

  const groupOptions = React.useMemo(
    () =>
      Array.from(
        new Set(allNodes.map((node) => getNodeGroupLabel(node)).filter(Boolean)),
      ).sort((left, right) => left.localeCompare(right, "zh-CN")),
    [allNodes],
  );
  const regionOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          allNodes
            .map((node) => String(node.region || "").trim())
            .filter(Boolean),
        ),
      ).sort((left, right) => left.localeCompare(right, "zh-CN")),
    [allNodes],
  );
  const versionOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          allNodes
            .map((node) => String(node.version || "").trim())
            .filter(Boolean),
        ),
      ).sort((left, right) => right.localeCompare(left, "zh-CN")),
    [allNodes],
  );

  React.useEffect(() => {
    if (groupFilter !== "all" && !groupOptions.includes(groupFilter)) {
      setGroupFilter("all");
    }
  }, [groupFilter, groupOptions]);

  React.useEffect(() => {
    if (regionFilter !== "all" && !regionOptions.includes(regionFilter)) {
      setRegionFilter("all");
    }
  }, [regionFilter, regionOptions]);

  React.useEffect(() => {
    if (versionFilter !== "all" && !versionOptions.includes(versionFilter)) {
      setVersionFilter("all");
    }
  }, [versionFilter, versionOptions]);

  const visibleNodes = React.useMemo(() => {
    const normalizedKeyword = nodeSearchQuery.toLowerCase().trim();

    return allNodes.filter((node) => {
      const live = liveByNode[node.uuid];

      if (groupFilter !== "all" && getNodeGroupLabel(node) !== groupFilter) {
        return false;
      }

      if (statusFilter === "online" && !isNodeOnline(live)) {
        return false;
      }
      if (statusFilter === "offline" && !isNodeOffline(live, liveLoaded)) {
        return false;
      }

      if (regionFilter !== "all" && String(node.region || "").trim() !== regionFilter) {
        return false;
      }
      if (
        versionFilter !== "all"
        && String(node.version || "").trim() !== versionFilter
      ) {
        return false;
      }

      const abnormal = isNodeAbnormal(node, live, liveLoaded);
      if (abnormalFilter === "abnormal" && !abnormal) {
        return false;
      }
      if (abnormalFilter === "normal" && abnormal) {
        return false;
      }

      if (!normalizedKeyword) {
        return true;
      }

      return buildSearchText(node).includes(normalizedKeyword);
    });
  }, [
    abnormalFilter,
    allNodes,
    groupFilter,
    liveByNode,
    liveLoaded,
    nodeSearchQuery,
    regionFilter,
    statusFilter,
    versionFilter,
  ]);

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
        visibleNodes={visibleNodes}
        liveByNode={liveByNode}
        liveLoaded={liveLoaded}
        liveError={liveError}
        settings={settings}
        settingsLoading={settingsLoading}
        settingsError={settingsError}
        platformAdmin={platformAdmin}
        scopeUsers={scopeUsers}
        selectedUserUUID={selectedUserUUID}
        userSearchQuery={userSearchQuery}
        onUserSearchQueryChange={onUserSearchQueryChange}
        onUserSearch={onUserSearch}
        installActionsEnabled={installActionsEnabled}
        canManageCNConnectivity={canManageCNConnectivity}
        onRefreshSettings={refetchSettings}
        nodeSearchQuery={nodeSearchQuery}
        onNodeSearchQueryChange={setNodeSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        regionFilter={regionFilter}
        onRegionFilterChange={setRegionFilter}
        versionFilter={versionFilter}
        onVersionFilterChange={setVersionFilter}
        abnormalFilter={abnormalFilter}
        onAbnormalFilterChange={setAbnormalFilter}
        groupFilter={groupFilter}
        onGroupFilterChange={setGroupFilter}
        groupOptions={groupOptions}
        regionOptions={regionOptions}
        versionOptions={versionOptions}
      />

      <NodeTable
        nodes={visibleNodes}
        totalNodesCount={allNodes.length}
        liveByNode={liveByNode}
        settings={settings}
        installActionsEnabled={installActionsEnabled}
        sortField={sortField}
        onSortFieldChange={setSortField}
        sortDirection={sortDirection}
        onSortDirectionChange={setSortDirection}
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
  visibleNodes,
  liveByNode,
  liveLoaded,
  liveError,
  settings,
  settingsLoading,
  settingsError,
  platformAdmin,
  scopeUsers,
  selectedUserUUID,
  userSearchQuery,
  onUserSearchQueryChange,
  onUserSearch,
  installActionsEnabled,
  canManageCNConnectivity,
  onRefreshSettings,
  nodeSearchQuery,
  onNodeSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  regionFilter,
  onRegionFilterChange,
  versionFilter,
  onVersionFilterChange,
  abnormalFilter,
  onAbnormalFilterChange,
  groupFilter,
  onGroupFilterChange,
  groupOptions,
  regionOptions,
  versionOptions,
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
  scopeUsers: AdminScopedUser[];
  selectedUserUUID: string;
  userSearchQuery: string;
  onUserSearchQueryChange: (value: string) => void;
  onUserSearch: () => void;
  installActionsEnabled: boolean;
  canManageCNConnectivity: boolean;
  onRefreshSettings: () => Promise<SettingsResponse>;
  nodeSearchQuery: string;
  onNodeSearchQueryChange: (value: string) => void;
  statusFilter: NodeStatusFilter;
  onStatusFilterChange: (value: NodeStatusFilter) => void;
  regionFilter: string;
  onRegionFilterChange: (value: string) => void;
  versionFilter: string;
  onVersionFilterChange: (value: string) => void;
  abnormalFilter: NodeAbnormalFilter;
  onAbnormalFilterChange: (value: NodeAbnormalFilter) => void;
  groupFilter: string;
  onGroupFilterChange: (value: string) => void;
  groupOptions: string[];
  regionOptions: string[];
  versionOptions: string[];
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
  const currentUploadSpeed = visibleNodes.reduce(
    (sum, node) => sum + (liveByNode[node.uuid]?.record.network.up ?? 0),
    0,
  );
  const currentDownloadSpeed = visibleNodes.reduce(
    (sum, node) => sum + (liveByNode[node.uuid]?.record.network.down ?? 0),
    0,
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
  const selectedScopeUser = selectedUserUUID
    ? scopeUsers.find((user) => user.uuid === selectedUserUUID)
    : undefined;
  const currentScopeLabel = selectedScopeUser
    ? t("admin.nodeTable.currentUserScopeStat", {
      user: selectedScopeUser.username,
      defaultValue: `当前用户：${selectedScopeUser.username}`,
    })
    : groupFilter === "all"
      ? t("admin.nodeTable.currentScopeStat", { defaultValue: "当前筛选范围" })
      : t("admin.nodeTable.currentGroupStat", {
        group: groupFilter,
        defaultValue: `当前分组：${groupFilter}`,
      });
  const hasEffectiveFilters =
    nodeSearchQuery.trim().length > 0
    || statusFilter !== "all"
    || regionFilter !== "all"
    || abnormalFilter !== "all"
    || groupFilter !== "all"
    || versionFilter !== "all"
    || Boolean(selectedUserUUID);
  const extraFilterCount =
    (groupFilter !== "all" ? 1 : 0)
    + (versionFilter !== "all" ? 1 : 0)
    + (selectedUserUUID ? 1 : 0);
  const primaryStats = hasEffectiveFilters
    ? {
      label: currentScopeLabel,
      total: visibleNodes.length,
      online: currentOnlineCount,
      abnormal: currentAbnormalCount,
      uploadSpeed: currentUploadSpeed,
      downloadSpeed: currentDownloadSpeed,
    }
    : {
      label: t("admin.nodeTable.globalStatsTitle", {
        defaultValue: "全局统计",
      }),
      total: nodes.length,
      online: globalOnlineCount,
      abnormal: globalAbnormalCount,
      uploadSpeed: totalUploadSpeed,
      downloadSpeed: totalDownloadSpeed,
    };
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
  const toolbarSelectClass =
    "h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50";

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

      <div className="rounded-lg border border-border/50 bg-background/60 px-3 py-2 shadow-none">
        <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap xl:gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1 xl:max-w-[360px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 pl-9"
                placeholder={t("admin.nodeTable.nodeSearchPlaceholder", {
                  defaultValue: "搜索节点名称、IP、系统、分组",
                })}
                value={nodeSearchQuery}
                onChange={(event) => onNodeSearchQueryChange(event.target.value)}
                aria-label={t("admin.nodeTable.nodeSearchPlaceholder", {
                  defaultValue: "搜索节点名称、IP、系统、分组",
                })}
              />
            </div>
            <select
              className={`${toolbarSelectClass} min-w-[116px]`}
              value={statusFilter}
              onChange={(event) =>
                onStatusFilterChange(event.target.value as NodeStatusFilter)
              }
              aria-label={t("admin.nodeTable.filterStatus", {
                defaultValue: "状态筛选",
              })}
            >
              <option value="all">
                {t("admin.nodeTable.filterStatusAll", {
                  defaultValue: "状态：全部",
                })}
              </option>
              <option value="online">
                {t("admin.nodeTable.filterStatusOnline", {
                  defaultValue: "状态：在线",
                })}
              </option>
              <option value="offline">
                {t("admin.nodeTable.filterStatusOffline", {
                  defaultValue: "状态：离线",
                })}
              </option>
            </select>
            <select
              className={`${toolbarSelectClass} min-w-[116px]`}
              value={regionFilter}
              onChange={(event) => onRegionFilterChange(event.target.value)}
              aria-label={t("admin.nodeTable.filterRegion", {
                defaultValue: "地区筛选",
              })}
            >
              <option value="all">
                {t("admin.nodeTable.filterRegionAll", {
                  defaultValue: "地区：全部",
                })}
              </option>
              {regionOptions.map((regionName) => (
                <option key={regionName} value={regionName}>
                  {regionName}
                </option>
              ))}
            </select>
            <select
              className={`${toolbarSelectClass} min-w-[138px]`}
              value={abnormalFilter}
              onChange={(event) =>
                onAbnormalFilterChange(event.target.value as NodeAbnormalFilter)
              }
              aria-label={t("admin.nodeTable.filterAbnormal", {
                defaultValue: "异常筛选",
              })}
            >
              <option value="all">
                {t("admin.nodeTable.filterAbnormalAll", {
                  defaultValue: "异常：全部",
                })}
              </option>
              <option value="abnormal">
                {t("admin.nodeTable.filterAbnormalOnly", {
                  defaultValue: "仅异常/疑似故障",
                })}
              </option>
              <option value="normal">
                {t("admin.nodeTable.filterAbnormalNormal", {
                  defaultValue: "仅正常",
                })}
              </option>
            </select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-md"
                  aria-label={t("admin.nodeTable.moreFilters", {
                    defaultValue: "更多筛选",
                  })}
                >
                  {t("admin.nodeTable.moreFilters", {
                    defaultValue: "更多筛选",
                  })}
                  {extraFilterCount > 0 ? (
                    <Badge variant="secondary" className="rounded-sm px-1.5 py-0 text-[11px]">
                      {extraFilterCount}
                    </Badge>
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[340px] p-3">
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      className={toolbarSelectClass}
                      value={groupFilter}
                      onChange={(event) => onGroupFilterChange(event.target.value)}
                      aria-label={t("admin.nodeTable.filterGroup", {
                        defaultValue: "分组筛选",
                      })}
                    >
                      <option value="all">
                        {t("admin.nodeTable.filterGroupAll", {
                          defaultValue: "分组：全部",
                        })}
                      </option>
                      {groupOptions.map((groupName) => (
                        <option key={groupName} value={groupName}>
                          {groupName}
                        </option>
                      ))}
                    </select>
                    <select
                      className={toolbarSelectClass}
                      value={versionFilter}
                      onChange={(event) => onVersionFilterChange(event.target.value)}
                      aria-label={t("admin.nodeTable.filterVersion", {
                        defaultValue: "版本筛选",
                      })}
                    >
                      <option value="all">
                        {t("admin.nodeTable.filterVersionAll", {
                          defaultValue: "版本：全部",
                        })}
                      </option>
                      {versionOptions.map((versionName) => (
                        <option key={versionName} value={versionName}>
                          {versionName}
                        </option>
                      ))}
                    </select>
                  </div>
                  {platformAdmin ? (
                    <form
                      className="space-y-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        onUserSearch();
                      }}
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {t("admin.nodeTable.userScopeLabel", {
                            defaultValue: "用户范围",
                          })}
                        </span>
                        {selectedScopeUser ? (
                          <span className="truncate text-right">
                            {t("admin.nodeTable.userScopeActive", {
                              user: selectedScopeUser.username,
                              defaultValue: "当前：{{user}}",
                            })}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          className="h-9"
                          placeholder={t("admin.nodeTable.userSearchPlaceholder")}
                          value={userSearchQuery}
                          list="admin-node-user-search"
                          onChange={(event) => onUserSearchQueryChange(event.target.value)}
                          aria-label={t("admin.nodeTable.userSearchPlaceholder")}
                        />
                        <Button type="submit" size="sm" className="h-9 rounded-md px-3">
                          {t("common.search", { defaultValue: "搜索" })}
                        </Button>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {t("admin.nodeTable.userScopeHint", {
                          defaultValue: "留空后点击搜索可恢复为全部用户范围。",
                        })}
                      </div>
                      <datalist id="admin-node-user-search">
                        {scopeUsers.map((user) => (
                          <option key={user.uuid} value={user.username} />
                        ))}
                      </datalist>
                    </form>
                  ) : null}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="min-w-[240px] flex-1 xl:max-w-[360px]">
            <div className="rounded-md border border-border/60 bg-muted/15 px-3 py-1.5">
              <div className="text-[11px] text-muted-foreground">
                {primaryStats.label}
              </div>
              <div className="mt-0.5 text-sm font-medium text-foreground">
                {t("admin.nodeTable.statsNodeOnlineOffline", {
                  total: primaryStats.total,
                  online: primaryStats.online,
                  offline: Math.max(primaryStats.total - primaryStats.online, 0),
                  defaultValue: "{{total}} 台，在线 {{online}}，离线 {{offline}}",
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("admin.nodeTable.statsAbnormal", {
                  count: primaryStats.abnormal,
                  defaultValue: "异常/疑似故障：{{count}}",
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                ↑ {formatBytes(primaryStats.uploadSpeed)}/s · ↓ {formatBytes(primaryStats.downloadSpeed)}/s
              </div>
              {hasEffectiveFilters ? (
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {t("admin.nodeTable.globalStatsInline", {
                    total: nodes.length,
                    online: globalOnlineCount,
                    offline: Math.max(nodes.length - globalOnlineCount, 0),
                    defaultValue: "全局：{{total}} 台，在线 {{online}}，离线 {{offline}}",
                  })}
                </div>
              ) : null}
            </div>
          </div>

          <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
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
      <div className="flex min-w-[220px] items-start gap-2 text-[13px] text-slate-700 dark:text-slate-200">
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
      <div className="w-[188px] cursor-help">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[11px] text-slate-600 dark:text-slate-300">
            {valueLabel}
          </span>
          <span className={`shrink-0 text-[11px] font-semibold ${percentTextClass}`}>
            {formatPercent(safePercent)}
          </span>
        </div>
        <div className="relative h-2.5 overflow-hidden rounded-full border border-slate-200/80 bg-slate-100/90 dark:border-slate-800/80 dark:bg-slate-900/60">
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
    ? `${(cpuCoreCount * cpuPercent / 100).toFixed(1)} / ${cpuCoreCount} ${t(
      "admin.nodeTable.cpuCoresShort",
      {
        defaultValue: "cores",
      },
    )}`
    : formatPercent(cpuPercent);
  const ramPercent = clampPercent(getNodeRamUsagePercent(node, live));
  const ramLabel = node.mem_total
    ? `${formatBytes(live?.record.ram.used ?? 0)} / ${formatBytes(node.mem_total)}`
    : formatPercent(ramPercent);
  const diskPercent = clampPercent(getNodeDiskUsagePercent(node, live));
  const diskLabel = node.disk_total
    ? `${formatBytes(live?.record.disk.used ?? 0)} / ${formatBytes(node.disk_total)}`
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
            <TableCell>
              <UsageBar
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
            <TableCell>
              <UsageBar
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
            <TableCell>
              <UsageBar
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
        <TableHead className={`${stickyHeadClass} w-[260px]`}>
          {t("admin.nodeTable.columns.endpoint", { defaultValue: "Public IP" })}
        </TableHead>
        <TableHead className={stickyHeadClass}>
          {t("admin.nodeTable.columns.status", { defaultValue: "Status" })}
        </TableHead>
        <TableHead className={`${stickyHeadClass} w-[132px]`}>
          {t("admin.nodeTable.columns.version", { defaultValue: "Version" })}
        </TableHead>
        <TableHead className={stickyHeadClass}>
          {t("admin.nodeTable.columns.rate", { defaultValue: "Rate" })}
        </TableHead>
        <TableHead className={stickyHeadClass}>
          {t("admin.nodeTable.columns.traffic", { defaultValue: "Traffic" })}
        </TableHead>
        <TableHead className={stickyHeadClass}>
          {t("admin.nodeTable.columns.uptime", { defaultValue: "Uptime" })}
        </TableHead>
        <TableHead className={`${stickyHeadClass} w-[220px]`}>
          {t("admin.nodeTable.columns.cpu", { defaultValue: "CPU" })}
        </TableHead>
        <TableHead className={`${stickyHeadClass} w-[220px]`}>
          {t("admin.nodeTable.columns.ram", { defaultValue: "RAM" })}
        </TableHead>
        <TableHead className={`${stickyHeadClass} w-[220px]`}>
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
      <Table className="min-w-[1480px]">
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
  totalNodesCount,
  liveByNode,
  settings,
  installActionsEnabled,
  sortField,
  onSortFieldChange,
  sortDirection,
  onSortDirectionChange,
}: {
  nodes: NodeDetail[];
  totalNodesCount: number;
  liveByNode: Record<string, NodeLiveSnapshot>;
  settings: SettingsResponse;
  installActionsEnabled: boolean;
  sortField: NodeSortField;
  onSortFieldChange: (value: NodeSortField) => void;
  sortDirection: NodeSortDirection;
  onSortDirectionChange: (value: NodeSortDirection) => void;
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
      nodes:
        sortField === "none"
          ? groupNodes
          : [...groupNodes].sort((left, right) => {
            const leftMetric = getNodeSortMetric(
              left,
              liveByNode[left.uuid],
              sortField,
            );
            const rightMetric = getNodeSortMetric(
              right,
              liveByNode[right.uuid],
              sortField,
            );
            if (leftMetric !== rightMetric) {
              return sortDirection === "asc"
                ? leftMetric - rightMetric
                : rightMetric - leftMetric;
            }
            return String(left.name || "").localeCompare(
              String(right.name || ""),
              "zh-CN",
            );
          }),
    }));
  }, [liveByNode, nodes, sortDirection, sortField]);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">
          {t("admin.nodeTable.sortBy", { defaultValue: "排序方式" })}
        </span>
        <select
          className="h-8 min-w-[150px] rounded-md border border-input bg-background px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50"
          value={sortField}
          onChange={(event) => onSortFieldChange(event.target.value as NodeSortField)}
          aria-label={t("admin.nodeTable.sortBy", {
            defaultValue: "排序方式",
          })}
        >
          <option value="none">
            {t("admin.nodeTable.sortNone", {
              defaultValue: "排序：默认",
            })}
          </option>
          <option value="cpu">
            {t("admin.nodeTable.sortCpu", {
              defaultValue: "按 CPU",
            })}
          </option>
          <option value="ram">
            {t("admin.nodeTable.sortRam", {
              defaultValue: "按 RAM",
            })}
          </option>
          <option value="traffic">
            {t("admin.nodeTable.sortTraffic", {
              defaultValue: "按流量",
            })}
          </option>
          <option value="uptime">
            {t("admin.nodeTable.sortUptime", {
              defaultValue: "按开机时长",
            })}
          </option>
        </select>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-md px-2"
          disabled={sortField === "none"}
          onClick={() =>
            onSortDirectionChange(sortDirection === "desc" ? "asc" : "desc")
          }
          aria-label={t("admin.nodeTable.sortDirection", {
            defaultValue: "切换排序方向",
          })}
        >
          <ArrowDownUp size={14} />
          {sortDirection === "desc"
            ? t("admin.nodeTable.sortDesc", { defaultValue: "降序" })
            : t("admin.nodeTable.sortAsc", { defaultValue: "升序" })}
        </Button>
      </div>
      {nodes.length === 0 ? (
        <Card className="rounded-xl border-dashed border-border/70 py-10 text-center text-sm text-muted-foreground shadow-none">
          {hasActiveFilters
            ? t("admin.nodeTable.noFilteredNodes", {
              defaultValue: "没有匹配当前筛选条件的节点",
            })
            : t("admin.nodeTable.noNodes", "No nodes")}
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

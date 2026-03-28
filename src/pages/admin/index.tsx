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
  Button,
  Card,
  Checkbox,
  Dialog,
  Flex,
  IconButton,
  SegmentedControl,
  Text,
  TextArea,
  TextField,
} from "@/components/admin/admin-ui";
import {
  Copy,
  Download,
  LoaderCircle,
  RefreshCw,
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
import Tips from "@/components/ui/tips";
import {
  type SettingsResponse,
  updateSettingsWithToast,
  useSettings,
} from "@/lib/api";
import { useRPC2Call } from "@/contexts/RPC2Context";
import type { Record as LiveRecord } from "@/types/LiveData";
import { buildAgentInstallScriptURL } from "@/lib/installScriptSource";
import {
  formatCNConnectivityTargetsSummary,
  normalizeCNConnectivityTargets,
  parseCNConnectivityTargets,
} from "@/lib/cnConnectivityTargets";
import { Navigate } from "react-router-dom";
import {
  SettingCard,
} from "@/components/admin/SettingCard";

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

type ExecResponse = {
  success?: boolean;
  task_id?: string;
  message?: string;
  status?: string;
  data?: {
    task_id?: string;
  };
};

type TaskResult = {
  task_id: string;
  client: string;
  result: string;
  exit_code: number | null;
  finished_at: string | null;
  created_at: string;
};

type TaskResultResponse = {
  success?: boolean;
  results?: TaskResult[];
  message?: string;
  status?: string;
  data?: TaskResult[];
};

type GithubReleaseAsset = {
  name?: string | null;
};

type GithubReleasePayload = {
  tag_name?: string | null;
  name?: string | null;
  draft?: boolean;
  prerelease?: boolean;
  assets?: GithubReleaseAsset[] | null;
};

type UpgradeExecutionStatus =
  | "idle"
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "timeout";

type UpgradeTask = {
  taskId: string;
  platform: Platform;
  clientIds: string[];
};

type NodeUpgradeState = {
  status: UpgradeExecutionStatus;
  taskId?: string;
  output: string;
  exitCode: number | null;
  finishedAt: string | null;
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
  updated_at: "",
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

const NODE_DIALOG_CONTENT_CLASS =
  "max-h-[85vh] overflow-y-auto rounded-2xl border-slate-200/80 p-5 sm:p-6 dark:border-slate-800/80";
const NODE_DIALOG_SECTION_CLASS =
  "rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800/80 dark:bg-slate-900/40";
const NODE_DIALOG_HINT_CLASS =
  "text-[13px] leading-6 text-slate-500 dark:text-slate-400";
const NODE_DIALOG_FOOTER_CLASS =
  "mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end";
const NODE_INPUT_CLASS =
  "rounded-xl border-slate-200 bg-white text-[14px] shadow-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

const normalizeDailyCleanupTime = (value: string) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "03:00";
  }

  const match = /^(\d{2}):(\d{2})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
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
      updated_at: value.time ?? "",
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

const formatDateTimeLabel = (value?: string) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "-";

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }

  return parsed.toLocaleString("zh-CN", { hour12: false });
};

const detectNodePlatform = (node: NodeDetail): Platform => {
  const osLabel = String(node.os || "").toLowerCase();
  if (
    osLabel.includes("windows") ||
    osLabel.includes("win32") ||
    osLabel.includes("win64")
  ) {
    return "windows";
  }
  if (
    osLabel.includes("mac") ||
    osLabel.includes("macos") ||
    osLabel.includes("darwin") ||
    osLabel.includes("os x")
  ) {
    return "macos";
  }
  return "linux";
};

const normalizeAgentReleaseTag = (value?: string | null) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.startsWith("v") || trimmed.startsWith("V")
    ? trimmed
    : `v${trimmed}`;
};

const normalizeAgentReleaseArch = (value?: string | null) => {
  const arch = String(value || "").trim().toLowerCase();
  if (!arch) {
    return null;
  }
  if (arch === "amd64" || arch === "x86_64" || arch === "x64") {
    return "amd64";
  }
  if (
    arch === "arm64" ||
    arch === "aarch64" ||
    arch === "armv8" ||
    arch === "armv8l"
  ) {
    return "arm64";
  }
  if (
    arch === "386" ||
    arch === "i386" ||
    arch === "i686" ||
    arch === "x86"
  ) {
    return "386";
  }
  if (
    arch === "arm" ||
    arch.startsWith("armv7") ||
    arch.startsWith("armv6")
  ) {
    return "arm";
  }
  return null;
};

const buildAgentReleaseAssetName = (node: NodeDetail) => {
  const arch = normalizeAgentReleaseArch(node.arch);
  if (!arch) {
    return null;
  }

  const platform = detectNodePlatform(node);
  if (platform === "windows") {
    return `komari-agent-windows-${arch}.exe`;
  }
  if (platform === "macos") {
    return `komari-agent-darwin-${arch}`;
  }
  return `komari-agent-linux-${arch}`;
};

const resolveLatestAgentUpgradeVersion = async (nodes: NodeDetail[]) => {
  const response = await fetch(
    "https://api.github.com/repos/keli-123456/kelicloud-agent/releases/latest",
    {
      headers: {
        Accept: "application/vnd.github+json",
      },
      cache: "no-cache",
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to load latest agent release (GitHub HTTP ${response.status})`);
  }

  const payload = (await response.json()) as GithubReleasePayload;
  const releaseTag = normalizeAgentReleaseTag(payload.tag_name || payload.name);
  if (!releaseTag) {
    throw new Error("Latest agent release tag is unavailable");
  }

  const requiredAssets = Array.from(
    new Set(
      nodes
        .map((node) => buildAgentReleaseAssetName(node))
        .filter((value): value is string => Boolean(value))
    )
  );
  if (requiredAssets.length === 0) {
    return releaseTag;
  }

  const publishedAssets = new Set(
    (payload.assets || [])
      .map((asset) => String(asset?.name || "").trim())
      .filter(Boolean)
  );
  const missingAssets = requiredAssets.filter(
    (assetName) => !publishedAssets.has(assetName)
  );
  if (missingAssets.length > 0) {
    throw new Error(
      `Agent release ${releaseTag} is not fully published yet. Missing assets: ${missingAssets.join(", ")}`
    );
  }

  return releaseTag;
};

const resolveScriptHost = (settings: SettingsResponse) => {
  const raw = String(settings?.script_domain || "").trim();
  if (!raw) {
    return window.location.origin;
  }
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/+$/, "");
  }
  return `http://${raw.replace(/\/+$/, "")}`;
};

const buildAgentUpgradeCommand = (
  node: NodeDetail,
  settings: SettingsResponse,
  installVersion?: string
) => {
  const host = resolveScriptHost(settings);
  const token = String(node.token || "").trim();
  const platform = detectNodePlatform(node);
  const pinnedVersion = normalizeAgentReleaseTag(installVersion);
  const targetVersionMessage = pinnedVersion
    ? ` Target version: ${pinnedVersion}.`
    : "";

  if (!token) {
    return "";
  }

  if (platform === "windows") {
    const scriptUrl = buildAgentInstallScriptURL(
      settings.base_scripts_url,
      "install.ps1"
    );
    const jobArgs = [
      "'-NoProfile'",
      "'-ExecutionPolicy'",
      "'Bypass'",
      "'-File'",
      "$scriptPath",
      "'-e'",
      powershellQuote(host),
      "'-t'",
      powershellQuote(token),
    ];
    if (pinnedVersion) {
      jobArgs.push("'--install-version'", powershellQuote(pinnedVersion));
    }
    return (
      "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command " +
      powershellQuote(
        `$scriptPath = Join-Path $env:TEMP ('komari-install-' + [guid]::NewGuid().ToString() + '.ps1'); ` +
          `Invoke-WebRequest ${powershellQuote(scriptUrl)} -UseBasicParsing -OutFile $scriptPath; ` +
          `$jobArgs = @(${jobArgs.join(",")}); ` +
          `Start-Process -FilePath 'powershell.exe' -ArgumentList $jobArgs -WindowStyle Hidden; ` +
          `Write-Output 'Agent upgrade scheduled. The node may go offline briefly while the service restarts.${targetVersionMessage}'`
      )
    );
  }

  const scriptUrl = buildAgentInstallScriptURL(
    settings.base_scripts_url,
    "install.sh"
  );
  const shellArgsList = ["-e", host, "-t", token];
  if (pinnedVersion) {
    shellArgsList.push("--install-version", pinnedVersion);
  }
  const shellArgs = shellArgsList.map(shellQuote).join(" ");
  const shellName = platform === "macos" ? "zsh" : "bash";
  const installCommand = `if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then sudo ${shellName} "$TMP_SCRIPT" ${shellArgs}; else ${shellName} "$TMP_SCRIPT" ${shellArgs}; fi; STATUS=$?; rm -f "$TMP_SCRIPT"; exit "$STATUS"`;

  return [
    'TMP_SCRIPT="$(mktemp)"',
    `if command -v curl >/dev/null 2>&1; then curl -fsSL ${shellQuote(
      scriptUrl
    )} > "$TMP_SCRIPT"; else wget -qO- ${shellQuote(scriptUrl)} > "$TMP_SCRIPT"; fi`,
    "STATUS=$?",
    'if [ "$STATUS" -ne 0 ]; then rm -f "$TMP_SCRIPT"; exit "$STATUS"; fi',
    `INSTALL_CMD=${shellQuote(installCommand)}`,
    'if command -v systemd-run >/dev/null 2>&1 && systemctl list-units >/dev/null 2>&1; then UNIT="komari-agent-upgrade-$(date +%s)"; systemd-run --unit "$UNIT" --collect /bin/sh -lc "$INSTALL_CMD"; STATUS=$?; else nohup /bin/sh -lc "$INSTALL_CMD" >/tmp/komari-agent-upgrade.log 2>&1 </dev/null & STATUS=$?; fi',
    'if [ "$STATUS" -ne 0 ]; then rm -f "$TMP_SCRIPT"; exit "$STATUS"; fi',
    `echo ${shellQuote(`Agent upgrade scheduled. The node may go offline briefly while the service restarts.${targetVersionMessage}`)}`,
    "exit 0",
  ].join("; ");
};

const getNodePrimaryAddress = (node: NodeDetail) =>
  formatNodeIp(node.ipv4) !== "-"
    ? formatNodeIp(node.ipv4)
    : formatNodeIp(node.ipv6) !== "-"
      ? formatNodeIp(node.ipv6)
      : node.uuid.slice(0, 8);

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
  const allNodes = Array.isArray(nodeDetail)
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
    : [];
  const liveScopeUUIDs = React.useMemo(
    () => allNodes.map((node) => node.uuid),
    [allNodes],
  );
  const liveScopeKey = React.useMemo(
    () => liveScopeUUIDs.join(","),
    [liveScopeUUIDs],
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
  }, [call, liveScopeKey]);

  if (isLoading) return <Loading text="" />;
  if (error) return <div>{error}</div>;

  return (
    <div
      className="flex flex-col gap-4"
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

const generateRandomAutoDiscoveryKey = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let index = 0; index < 24; index += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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
  const [autoDiscoveryKey, setAutoDiscoveryKey] = React.useState(
    String(settings?.auto_discovery_key || ""),
  );
  const [cnConnectivityEnabled, setCnConnectivityEnabled] = React.useState(
    Boolean(settings?.cn_connectivity_enabled),
  );
  const [cnConnectivityTarget, setCnConnectivityTarget] = React.useState(
    normalizeCNConnectivityTargets(String(settings?.cn_connectivity_target || "")),
  );
  const [cnConnectivityInterval, setCnConnectivityInterval] =
    React.useState(String(settings?.cn_connectivity_interval || 60));
  const [cnConnectivityRetryAttempts, setCnConnectivityRetryAttempts] =
    React.useState(String(settings?.cn_connectivity_retry_attempts || 3));
  const [cnConnectivityRetryDelaySeconds, setCnConnectivityRetryDelaySeconds] =
    React.useState(String(settings?.cn_connectivity_retry_delay_seconds || 1));
  const [cnConnectivityTimeoutSeconds, setCnConnectivityTimeoutSeconds] =
    React.useState(String(settings?.cn_connectivity_timeout_seconds || 5));
  const [offlineCleanupEnabled, setOfflineCleanupEnabled] = React.useState(
    Boolean(settings?.offline_cleanup_enabled),
  );
  const [offlineCleanupTime, setOfflineCleanupTime] = React.useState(
    normalizeDailyCleanupTime(String(settings?.offline_cleanup_time || "03:00")) ||
      "03:00",
  );
  const [offlineCleanupGraceHours, setOfflineCleanupGraceHours] = React.useState(
    String(settings?.offline_cleanup_grace_hours || 24),
  );
  const [settingsSaving, setSettingsSaving] = React.useState(false);

  const resetForm = React.useCallback(() => {
    setAutoDiscoveryKey(String(settings?.auto_discovery_key || ""));
    setCnConnectivityEnabled(Boolean(settings?.cn_connectivity_enabled));
    setCnConnectivityTarget(
      normalizeCNConnectivityTargets(String(settings?.cn_connectivity_target || "")),
    );
    setCnConnectivityInterval(String(settings?.cn_connectivity_interval || 60));
    setCnConnectivityRetryAttempts(
      String(settings?.cn_connectivity_retry_attempts || 3),
    );
    setCnConnectivityRetryDelaySeconds(
      String(settings?.cn_connectivity_retry_delay_seconds || 1),
    );
    setCnConnectivityTimeoutSeconds(
      String(settings?.cn_connectivity_timeout_seconds || 5),
    );
    setOfflineCleanupEnabled(Boolean(settings?.offline_cleanup_enabled));
    setOfflineCleanupTime(
      normalizeDailyCleanupTime(String(settings?.offline_cleanup_time || "03:00")) ||
        "03:00",
    );
    setOfflineCleanupGraceHours(String(settings?.offline_cleanup_grace_hours || 24));
  }, [
    settings?.auto_discovery_key,
    settings?.cn_connectivity_enabled,
    settings?.cn_connectivity_interval,
    settings?.cn_connectivity_retry_attempts,
    settings?.cn_connectivity_retry_delay_seconds,
    settings?.cn_connectivity_target,
    settings?.cn_connectivity_timeout_seconds,
    settings?.offline_cleanup_enabled,
    settings?.offline_cleanup_time,
    settings?.offline_cleanup_grace_hours,
  ]);

  React.useEffect(() => {
    resetForm();
  }, [resetForm]);

  const handleSaveSettings = async () => {
    if (autoDiscoveryKey && autoDiscoveryKey.length < 12) {
      toast.error(t("settings.api.key_length_error"));
      return;
    }

    const payload: Record<string, string | number | boolean> = {
      auto_discovery_key: autoDiscoveryKey,
    };

    if (canManageCNConnectivity) {
      const interval = parseInt(cnConnectivityInterval, 10);
      if (Number.isNaN(interval) || interval <= 0) {
        toast.error(t("settings.general.cn_connectivity_interval_invalid"));
        return;
      }
      const retryAttempts = parseInt(cnConnectivityRetryAttempts, 10);
      if (Number.isNaN(retryAttempts) || retryAttempts <= 0) {
        toast.error(t("settings.general.cn_connectivity_retry_attempts_invalid"));
        return;
      }
      const retryDelaySeconds = parseInt(cnConnectivityRetryDelaySeconds, 10);
      if (Number.isNaN(retryDelaySeconds) || retryDelaySeconds <= 0) {
        toast.error(t("settings.general.cn_connectivity_retry_delay_seconds_invalid"));
        return;
      }
      const timeoutSeconds = parseInt(cnConnectivityTimeoutSeconds, 10);
      if (Number.isNaN(timeoutSeconds) || timeoutSeconds <= 0) {
        toast.error(t("settings.general.cn_connectivity_timeout_seconds_invalid"));
        return;
      }

      payload.cn_connectivity_enabled = cnConnectivityEnabled;
      payload.cn_connectivity_target = normalizeCNConnectivityTargets(
        cnConnectivityTarget,
      );
      payload.cn_connectivity_interval = interval;
      payload.cn_connectivity_retry_attempts = retryAttempts;
      payload.cn_connectivity_retry_delay_seconds = retryDelaySeconds;
      payload.cn_connectivity_timeout_seconds = timeoutSeconds;
    }

    if (platformAdmin) {
      const normalizedCleanupTime = normalizeDailyCleanupTime(offlineCleanupTime);
      if (!normalizedCleanupTime) {
        toast.error(
          t("settings.general.offline_cleanup_time_invalid", "Please use HH:MM"),
        );
        return;
      }
      const parsedGraceHours = parseInt(offlineCleanupGraceHours, 10);
      if (Number.isNaN(parsedGraceHours) || parsedGraceHours <= 0) {
        toast.error(
          t(
            "settings.general.offline_cleanup_grace_hours_invalid",
            "Grace period must be greater than 0",
          ),
        );
        return;
      }

      payload.offline_cleanup_enabled = offlineCleanupEnabled;
      payload.offline_cleanup_time = normalizedCleanupTime;
      payload.offline_cleanup_grace_hours = parsedGraceHours;
    }

    setSettingsSaving(true);
    try {
      await updateSettingsWithToast(payload, t);
      await onRefreshSettings();
      setDialogOpen(false);
    } finally {
      setSettingsSaving(false);
    }
  };

  return (
    <Dialog.Root
      open={dialogOpen}
      onOpenChange={(open) => {
        if (open) {
          resetForm();
        }
        setDialogOpen(open);
      }}
    >
      <Dialog.Trigger>
        <Button className="rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
          <Settings2 size={16} />
          {t("common.settings")}
        </Button>
      </Dialog.Trigger>
      <Dialog.Content
        className={NODE_DIALOG_CONTENT_CLASS}
        maxWidth={640}
      >
        <Dialog.Title>
          {t("admin.nodeTable.accessSettingsTitle")}
        </Dialog.Title>
        <Dialog.Description className="mt-2">
          {t("admin.nodeTable.accessSettingsDescription")}
        </Dialog.Description>
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="space-y-1">
              <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t("settings.general.auto_discovery")}
              </Text>
              <Text className="text-sm text-slate-500 dark:text-slate-400">
                {t("settings.general.auto_discovery_key_description")}
              </Text>
            </div>
            <div className="mt-4 space-y-4">
              <TextField.Root
                className={NODE_INPUT_CLASS}
                value={autoDiscoveryKey}
                onChange={(event) =>
                  setAutoDiscoveryKey(event.target.value)
                }
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() =>
                    setAutoDiscoveryKey(generateRandomAutoDiscoveryKey())
                  }
                >
                  {t("common.generate")}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    window.open(
                      "https://komari-document.pages.dev/install/agent-ad.html",
                      "_blank",
                    );
                  }}
                >
                  {t("common.help")}
                </Button>
              </div>
            </div>
          </div>

          {canManageCNConnectivity ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="space-y-2">
                <Flex justify="between" align="center" gap="2" wrap="wrap">
                  <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {t("settings.general.cn_connectivity")}
                  </Text>
                  <Badge
                    color={cnConnectivityEnabled ? "green" : "gray"}
                    variant="soft"
                  >
                    {cnConnectivityEnabled
                      ? t("common.enabled")
                      : t("common.disabled")}
                  </Badge>
                </Flex>
                <Text className="text-sm text-slate-500 dark:text-slate-400">
                  {t("admin.nodeTable.cnConnectivityManageHint")}
                </Text>
              </div>
              <div className="mt-4 space-y-4">
                <SettingCard
                  title={t("settings.general.cn_connectivity_enabled")}
                  description={t(
                    "settings.general.cn_connectivity_enabled_description",
                  )}
                  bordless
                >
                  <SettingCard.Action>
                    <Checkbox
                      checked={cnConnectivityEnabled}
                      onCheckedChange={(checked) =>
                        setCnConnectivityEnabled(Boolean(checked))
                      }
                    />
                  </SettingCard.Action>
                </SettingCard>
                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                    {t("settings.general.cn_connectivity_target")}
                  </label>
                  <TextArea
                    className="min-h-32 text-[13px] leading-6"
                    placeholder={
                      "223.5.5.5\n119.29.29.29\ndns.alidns.com"
                    }
                    value={cnConnectivityTarget}
                    onChange={(event) =>
                      setCnConnectivityTarget(event.target.value)
                    }
                  />
                  <Text className="text-xs text-slate-500 dark:text-slate-400">
                    {t("settings.general.cn_connectivity_target_help")}
                  </Text>
                </div>
                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                    {t("settings.general.cn_connectivity_interval")}
                  </label>
                  <TextField.Root
                    className={NODE_INPUT_CLASS}
                    type="number"
                    min={1}
                    value={cnConnectivityInterval}
                    onChange={(event) =>
                      setCnConnectivityInterval(event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                    {t("settings.general.cn_connectivity_retry_attempts")}
                  </label>
                  <TextField.Root
                    className={NODE_INPUT_CLASS}
                    type="number"
                    min={1}
                    step={1}
                    value={cnConnectivityRetryAttempts}
                    onChange={(event) =>
                      setCnConnectivityRetryAttempts(event.target.value)
                    }
                  />
                  <Text className="text-xs text-slate-500 dark:text-slate-400">
                    {t("settings.general.cn_connectivity_retry_attempts_description")}
                  </Text>
                </div>
                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                    {t("settings.general.cn_connectivity_timeout_seconds")}
                  </label>
                  <TextField.Root
                    className={NODE_INPUT_CLASS}
                    type="number"
                    min={1}
                    step={1}
                    value={cnConnectivityTimeoutSeconds}
                    onChange={(event) =>
                      setCnConnectivityTimeoutSeconds(event.target.value)
                    }
                  />
                  <Text className="text-xs text-slate-500 dark:text-slate-400">
                    {t("settings.general.cn_connectivity_timeout_seconds_description")}
                  </Text>
                </div>
                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                    {t("settings.general.cn_connectivity_retry_delay_seconds")}
                  </label>
                  <TextField.Root
                    className={NODE_INPUT_CLASS}
                    type="number"
                    min={1}
                    step={1}
                    value={cnConnectivityRetryDelaySeconds}
                    onChange={(event) =>
                      setCnConnectivityRetryDelaySeconds(event.target.value)
                    }
                  />
                  <Text className="text-xs text-slate-500 dark:text-slate-400">
                    {t("settings.general.cn_connectivity_retry_delay_seconds_description")}
                  </Text>
                </div>
              </div>
            </div>
          ) : null}

          {platformAdmin ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="space-y-2">
                <Flex justify="between" align="center" gap="2" wrap="wrap">
                  <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {t("settings.general.offline_cleanup")}
                  </Text>
                  <Badge
                    color={offlineCleanupEnabled ? "green" : "gray"}
                    variant="soft"
                  >
                    {offlineCleanupEnabled
                      ? t("common.enabled")
                      : t("common.disabled")}
                  </Badge>
                </Flex>
                <Text className="text-sm text-slate-500 dark:text-slate-400">
                  {t("admin.nodeTable.offlineCleanupManageHint")}
                </Text>
              </div>
              <div className="mt-4 space-y-4">
                <SettingCard
                  title={t("settings.general.offline_cleanup_enabled")}
                  description={t(
                    "settings.general.offline_cleanup_enabled_description",
                  )}
                  bordless
                >
                  <SettingCard.Action>
                    <Checkbox
                      checked={offlineCleanupEnabled}
                      onCheckedChange={(checked) =>
                        setOfflineCleanupEnabled(Boolean(checked))
                      }
                    />
                  </SettingCard.Action>
                </SettingCard>
                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                    {t("settings.general.offline_cleanup_time")}
                  </label>
                  <TextField.Root
                    className={NODE_INPUT_CLASS}
                    type="time"
                    step={60}
                    value={offlineCleanupTime}
                    onChange={(event) =>
                      setOfflineCleanupTime(event.target.value)
                    }
                  />
                  <Text className="text-xs text-slate-500 dark:text-slate-400">
                    {t("settings.general.offline_cleanup_time_description")}
                  </Text>
                </div>
                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                    {t("settings.general.offline_cleanup_grace_hours")}
                  </label>
                  <TextField.Root
                    className={NODE_INPUT_CLASS}
                    type="number"
                    min={1}
                    step={1}
                    value={offlineCleanupGraceHours}
                    onChange={(event) =>
                      setOfflineCleanupGraceHours(event.target.value)
                    }
                  />
                  <Text className="text-xs text-slate-500 dark:text-slate-400">
                    {t("settings.general.offline_cleanup_grace_hours_description")}
                  </Text>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <div className={NODE_DIALOG_FOOTER_CLASS}>
          <Dialog.Close>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
            >
              {t("common.cancel")}
            </Button>
          </Dialog.Close>
          <Button
            className="w-full sm:w-auto"
            onClick={() => void handleSaveSettings()}
            disabled={settingsSaving}
          >
            {t("save")}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
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
    <Card className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
          <Text className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            {t("admin.nodeTable.nodeList")}
          </Text>
          <Badge variant="soft" color="blue" className="rounded-full px-3 py-1">
            {t("admin.nodeTable.nodeCountBadge", {
              count: nodes.length,
              defaultValue: "{{count}} nodes",
            })}
          </Badge>
          <Badge
            variant="soft"
            color={liveError ? "red" : offlineNodes.length > 0 ? "amber" : "green"}
            className="rounded-full px-3 py-1"
          >
            {liveError
              ? t("admin.nodeTable.syncError", "Sync error")
              : liveLoaded
                ? t("admin.nodeTable.offlineCountBadge", {
                    count: offlineNodes.length,
                    defaultValue: "{{count}} offline",
                  })
                : t("admin.nodeTable.syncingStatus", "Syncing status")}
          </Badge>
          {liveError && (
            <Text size="2" className="text-rose-600 dark:text-rose-400">
              {t("admin.nodeTable.liveErrorPausedDeletion", {
                defaultValue:
                  "Live status API failed, so bulk offline deletion is paused.",
              })}
            </Text>
          )}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {settingsLoading
              ? t("admin.nodeTable.cnConnectivityLoading", {
                  defaultValue: "Loading CN connectivity probe settings...",
                })
              : settingsError
                ? t("admin.nodeTable.cnConnectivityLoadFailed", {
                    defaultValue: "Failed to load CN connectivity probe settings.",
                  })
                : cnConnectivityConfigured
                  ? t("admin.nodeTable.cnConnectivitySummary", {
                      summary: cnConnectivitySummary,
                      defaultValue: "CN connectivity probe: {{summary}}",
                    })
                  : cnConnectivityEnabled
                    ? t("admin.nodeTable.cnConnectivityMissingTarget", {
                        defaultValue:
                          "CN connectivity probe is enabled, but no targets are configured yet.",
                      })
                    : t("admin.nodeTable.cnConnectivityDisabledMessage", {
                        defaultValue: "CN connectivity probe is disabled.",
                      })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <div className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {t("admin.nodeTable.totalRate", "Total rate")}
              </span>
              <span>↑ {formatBytes(totalUploadSpeed)}/s</span>
              <span>↓ {formatBytes(totalDownloadSpeed)}/s</span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {t("admin.nodeTable.totalTraffic", "Total traffic")}
              </span>
              <span>↑ {formatBytes(totalUploadTraffic)}</span>
              <span>↓ {formatBytes(totalDownloadTraffic)}</span>
            </div>
            {platformAdmin ? (
              <form
                className="flex min-w-[260px] flex-1 items-center sm:min-w-[320px] lg:max-w-sm lg:flex-none"
                onSubmit={(event) => {
                  event.preventDefault();
                  onUserSearch();
                }}
              >
                <TextField.Root
                  className="w-full rounded-lg sm:flex-1"
                  placeholder={t("admin.nodeTable.userSearchPlaceholder")}
                  value={userSearchQuery}
                  list="admin-node-user-search"
                  onChange={(event) => onUserSearchQueryChange(event.target.value)}
                >
                  <TextField.Slot side="left">
                    <Search size={16} className="text-slate-400" />
                  </TextField.Slot>
                </TextField.Root>
                <datalist id="admin-node-user-search">
                  {scopeUsers.map((user) => (
                    <option key={user.uuid} value={user.username} />
                  ))}
                </datalist>
              </form>
            ) : null}
            <GenerateCommandButton
              nodes={nodes}
              settings={settings}
              toolbar
              disabled={!installActionsEnabled}
            />
            <GenerateCommandButton
              nodes={nodes}
              settings={settings}
              toolbar
              groupMode
              disabled={!installActionsEnabled}
            />
            <Button
              variant="soft"
              color="red"
              disabled={
                !liveLoaded ||
                Boolean(liveError) ||
                offlineNodes.length === 0 ||
                cleanupLoading
              }
              className="rounded-2xl"
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
      {dialog}
    </Card>
  );
};

const clampPercent = (value: number) =>
  Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

const formatPercent = (value: number) => `${Math.round(clampPercent(value))}%`;

const shellQuote = (value: string) => `'${value.replace(/'/g, `'"'"'`)}'`;

const powershellQuote = (value: string) => `'${value.replace(/'/g, "''")}'`;

const encodeBase64Url = (value: string) => {
  const binary = Array.from(new TextEncoder().encode(value), (byte) =>
    String.fromCharCode(byte)
  ).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const encodeScopedAutoDiscoveryKey = (key: string, group: string) =>
  group ? `${key}::group-b64=${encodeBase64Url(group)}` : key;

const getDefaultInstallDir = (platform: Platform) => {
  switch (platform) {
    case "windows":
      return "$Env:ProgramFiles\\Komari";
    case "macos":
      return "/usr/local/komari";
    default:
      return "/opt/komari";
  }
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
    <div className="min-w-[120px] space-y-1">
      <Badge
        variant="soft"
        className={
          online
            ? "rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[12px] text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[12px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
        }
      >
        {online ? t("nodeCard.online", "Online") : t("nodeCard.offline", "Offline")}
      </Badge>
      {cnBadge ? (
        <Badge
          variant="soft"
          className={cnBadge.className}
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
        className:
          "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300",
        title,
      };
    case "blocked_suspected":
      return {
        label: t("admin.nodeTable.cnConnectivityBlocked", "Suspected blocked"),
        className:
          "rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300",
        title,
      };
    case "degraded":
      return {
        label: t("admin.nodeTable.cnConnectivityDegraded", "CN abnormal"),
        className:
          "rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
        title,
      };
    default:
      return {
        label: t("admin.nodeTable.cnConnectivityUnknown", "Pending probe"),
        className:
          "rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300",
        title,
      };
  }
};

const VersionSummary = ({ node }: { node: NodeDetail }) => (
  <div className="min-w-[112px]">
    <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[12px] text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200">
      {String(node.version || "").trim() || "-"}
    </span>
  </div>
);

const NodeEndpointSummary = ({ node }: { node: NodeDetail }) => {
  return (
    <NodeInfoTooltip
      content={
        <NodeTooltipBody
          label={translate("admin.nodeTable.hostname", {
            defaultValue: "Hostname",
          })}
          primary={String(node.name || "").trim() || "-"}
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
}: {
  content: React.ReactNode;
  children: React.ReactElement;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent
      sideOffset={8}
      className="rounded-xl border border-border/50 bg-background px-3 py-2 text-xs text-foreground shadow-xl"
    >
      {content}
    </TooltipContent>
  </Tooltip>
);

const RateSummary = ({ live }: { live?: NodeLiveSnapshot }) => {
  const snapshot = live?.record || createEmptyLiveRecord();

  return (
    <div className="min-w-[120px] space-y-0.5">
      <Text size="1" className="block text-[13px] font-medium text-slate-900 dark:text-slate-100">
        ↑ {formatBytes(snapshot.network.up)}/s
      </Text>
      <Text size="1" className="block text-[13px] text-slate-600 dark:text-slate-400">
        ↓ {formatBytes(snapshot.network.down)}/s
      </Text>
    </div>
  );
};

const TrafficSummary = ({ live }: { live?: NodeLiveSnapshot }) => {
  const snapshot = live?.record || createEmptyLiveRecord();

  return (
    <div className="min-w-[132px] space-y-0.5">
      <Text size="1" className="block text-[13px] font-medium text-slate-900 dark:text-slate-100">
        ↑ {formatBytes(snapshot.network.totalUp)}
      </Text>
      <Text size="1" className="block text-[13px] text-slate-600 dark:text-slate-400">
        ↓ {formatBytes(snapshot.network.totalDown)}
      </Text>
    </div>
  );
};

const UptimeSummary = ({ live }: { live?: NodeLiveSnapshot }) => {
  return (
    <Text size="1" className="block min-w-[72px] text-[13px] text-slate-700 dark:text-slate-300">
      {formatUptimeLabel(live?.record.uptime)}
    </Text>
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
        <div className="relative h-5 overflow-hidden rounded-full border border-slate-200/80 bg-slate-100 dark:border-slate-800/80 dark:bg-slate-900/60">
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

const buildNodeConfigTooltip = ({
  node,
  live,
}: {
  node: NodeDetail;
  live?: NodeLiveSnapshot;
}) => {
  const snapshot = live?.record || createEmptyLiveRecord();
  const memoryUsed = snapshot.ram.used ?? 0;
  const diskUsed = snapshot.disk.used ?? 0;
  const swapUsed = snapshot.swap.used ?? 0;
  const connectivity = snapshot.cn_connectivity;
  const connectivityLabel = connectivity
    ? connectivity.status === "ok"
      ? `${translate("admin.nodeTable.cnConnectivityOk", {
          defaultValue: "CN reachable",
        })}${typeof connectivity.latency === "number" && connectivity.latency > 0 ? ` ${connectivity.latency}ms` : ""}`
      : connectivity.status === "blocked_suspected"
        ? translate("admin.nodeTable.cnConnectivityBlocked", {
            defaultValue: "Suspected blocked",
          })
        : connectivity.status === "degraded"
          ? translate("admin.nodeTable.cnConnectivityDegraded", {
              defaultValue: "CN abnormal",
            })
          : translate("admin.nodeTable.cnConnectivityUnknown", {
              defaultValue: "Pending probe",
            })
    : translate("admin.nodeTable.detailTooltip.notConfigured", {
        defaultValue: "Not configured",
      });
  const lines = [
    `${translate("admin.nodeTable.detailTooltip.nodeName", {
      defaultValue: "Node",
    })}: ${node.name || "-"}`,
    `${translate("admin.nodeTable.detailTooltip.uuid", {
      defaultValue: "UUID",
    })}: ${node.uuid || "-"}`,
    `${translate("admin.nodeTable.detailTooltip.group", {
      defaultValue: "Group",
    })}: ${getNodeGroupLabel(node)}`,
    `${translate("admin.nodeTable.detailTooltip.status", {
      defaultValue: "Status",
    })}: ${live?.online ? translate("nodeCard.online", { defaultValue: "Online" }) : translate("nodeCard.offline", { defaultValue: "Offline" })}`,
    `${translate("admin.nodeTable.detailTooltip.connectivity", {
      defaultValue: "CN probe",
    })}: ${connectivityLabel}`,
    `${translate("admin.nodeTable.detailTooltip.version", {
      defaultValue: "Version",
    })}: ${node.version || "-"}`,
    `${translate("admin.nodeTable.detailTooltip.region", {
      defaultValue: "Region",
    })}: ${node.region || "-"}`,
    `${translate("admin.nodeTable.detailTooltip.os", {
      defaultValue: "OS",
    })}: ${node.os || "-"}`,
    `${translate("admin.nodeTable.detailTooltip.architecture", {
      defaultValue: "Architecture",
    })}: ${node.arch || "-"}`,
    `${translate("admin.nodeTable.detailTooltip.cpu", {
      defaultValue: "CPU",
    })}: ${node.cpu_name || "-"} / ${node.cpu_cores || 0} ${translate("admin.nodeTable.cpuCoresShort", {
      defaultValue: "cores",
    })}`,
    `${translate("admin.nodeTable.detailTooltip.gpu", {
      defaultValue: "GPU",
    })}: ${node.gpu_name || "-"}`,
    `${translate("admin.nodeTable.detailTooltip.memory", {
      defaultValue: "Memory",
    })}: ${formatBytes(memoryUsed)} / ${formatBytes(node.mem_total || 0)}`,
    `${translate("admin.nodeTable.detailTooltip.swap", {
      defaultValue: "Swap",
    })}: ${formatBytes(swapUsed)} / ${formatBytes(node.swap_total || 0)}`,
    `${translate("admin.nodeTable.detailTooltip.storage", {
      defaultValue: "Storage",
    })}: ${formatBytes(diskUsed)} / ${formatBytes(node.disk_total || 0)}`,
    `${translate("admin.nodeTable.detailTooltip.rate", {
      defaultValue: "Rate",
    })}: ↑ ${formatBytes(snapshot.network.up)}/s / ↓ ${formatBytes(
      snapshot.network.down
    )}/s`,
    `${translate("admin.nodeTable.detailTooltip.traffic", {
      defaultValue: "Traffic",
    })}: ↑ ${formatBytes(snapshot.network.totalUp)} / ↓ ${formatBytes(
      snapshot.network.totalDown
    )}`,
    `IPv4: ${formatNodeIp(node.ipv4)}`,
    `IPv6: ${formatNodeIp(node.ipv6)}`,
    `${translate("admin.nodeTable.detailTooltip.billingCycle", {
      defaultValue: "Billing cycle",
    })}: ${node.billing_cycle || "-"}`,
    `${translate("admin.nodeTable.detailTooltip.publicRemark", {
      defaultValue: "Public remark",
    })}: ${node.public_remark || "-"}`,
    `${translate("admin.nodeTable.detailTooltip.privateRemark", {
      defaultValue: "Private remark",
    })}: ${node.remark || "-"}`,
    `${translate("admin.nodeTable.detailTooltip.createdAt", {
      defaultValue: "Created at",
    })}: ${formatDateTimeLabel(node.created_at)}`,
    `${translate("admin.nodeTable.detailTooltip.panelUpdatedAt", {
      defaultValue: "Panel updated at",
    })}: ${formatDateTimeLabel(node.updated_at)}`,
    `${translate("admin.nodeTable.detailTooltip.statusUpdatedAt", {
      defaultValue: "Status updated at",
    })}: ${formatDateTimeLabel(snapshot.updated_at)}`,
  ];

  if (node.virtualization) {
    lines.splice(
      8,
      0,
      `${translate("admin.nodeTable.detailTooltip.virtualization", {
        defaultValue: "Virtualization",
      })}: ${node.virtualization}`,
    );
  }
  if (connectivity?.target) {
    lines.splice(
      5,
      0,
      `${translate("admin.nodeTable.detailTooltip.probeTarget", {
        defaultValue: "Probe target",
      })}: ${connectivity.target}`,
    );
  }
  if (connectivity?.message) {
    lines.splice(
      6,
      0,
      `${translate("admin.nodeTable.detailTooltip.probeMessage", {
        defaultValue: "Probe message",
      })}: ${connectivity.message}`,
    );
  }

  return lines.join("\n");
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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <TableRow className="cursor-context-menu border-b border-slate-200/70 bg-white text-[13px] transition-colors hover:bg-slate-50 dark:border-slate-800/70 dark:bg-slate-950/20 dark:hover:bg-slate-900/50">
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
      </ContextMenuContent>
    </ContextMenu>
  );
};

const NodeTableColumns = () => {
  const { t } = useTranslation();

  return (
    <TableHeader className="bg-slate-50/90 dark:bg-slate-900/60">
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
}: {
  label: string;
  value: string;
  tone?: "slate" | "green" | "red" | "blue";
}) => {
  const toneClass =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
      : tone === "red"
        ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
        : tone === "blue"
          ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300"
          : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300";

  return (
    <div
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-[12px] ${toneClass}`}
    >
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
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
  const { refresh } = useNodeDetails();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [status, setStatus] = React.useState<UpgradeExecutionStatus>("idle");
  const [resultState, setResultState] = React.useState<
    Record<string, NodeUpgradeState>
  >({});
  const resultStateRef = React.useRef<Record<string, NodeUpgradeState>>({});
  const taskRefs = React.useRef<UpgradeTask[]>([]);
  const pollIntervalRef = React.useRef<number | null>(null);
  const pollTimeoutRef = React.useRef<number | null>(null);

  const onlineNodes = React.useMemo(
    () =>
      nodes.filter(
        (node) =>
          Boolean(liveByNode[node.uuid]?.online) &&
          String(node.token || "").trim().length > 0
      ),
    [liveByNode, nodes]
  );

  const updateResultState = React.useCallback(
    (
      updater:
        | Record<string, NodeUpgradeState>
        | ((
            previous: Record<string, NodeUpgradeState>
          ) => Record<string, NodeUpgradeState>)
    ) => {
      const next =
        typeof updater === "function"
          ? updater(resultStateRef.current)
          : updater;
      resultStateRef.current = next;
      setResultState(next);
    },
    []
  );

  const clearPolling = React.useCallback(() => {
    if (pollIntervalRef.current !== null) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollTimeoutRef.current !== null) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  React.useEffect(() => () => clearPolling(), [clearPolling]);

  const finalizeExecution = React.useCallback(
    async (forceTimeout = false) => {
      const finalStates = resultStateRef.current;
      const failedCount = Object.values(finalStates).filter(
        (item) => item.status === "failed" || item.status === "timeout"
      ).length;
      const successCount = Object.values(finalStates).filter(
        (item) => item.status === "success"
      ).length;

      setStatus(
        forceTimeout
          ? "timeout"
          : failedCount > 0
            ? "failed"
            : successCount > 0
              ? "success"
              : "idle"
      );

      if (forceTimeout) {
        toast.warning(
          t("admin.nodeTable.upgradeTimeoutToast", {
            groupName,
            defaultValue:
              "{{groupName}} upgrade timed out. Please check node status manually.",
          })
        );
      } else if (failedCount > 0) {
        toast.error(
          t("admin.nodeTable.upgradeMixedResultToast", {
            groupName,
            successCount,
            failedCount,
            defaultValue:
              "{{groupName}} upgrade finished: {{successCount}} succeeded, {{failedCount}} failed.",
          })
        );
      } else {
        toast.success(
          t("admin.nodeTable.upgradeSuccessToast", {
            groupName,
            successCount,
            defaultValue:
              "{{groupName}} upgrade finished on {{successCount}} node(s).",
          })
        );
      }

      await refresh();
    },
    [groupName, refresh, t]
  );

  const pollTaskResult = React.useCallback(
    async (task: UpgradeTask) => {
      const response = await fetch(`/api/admin/task/${task.taskId}/result`);
      const payload = (await response.json().catch(() => ({}))) as TaskResultResponse;
      if (!response.ok || payload.status === "error") {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }

      const matchedResult = (payload.results || payload.data || []).find(
        (item) => item.client === task.clientIds[0]
      );
      const clientId = task.clientIds[0];

      updateResultState((previous) => {
        const current =
          previous[clientId] ||
          ({
            status: "pending",
            output: "",
            exitCode: null,
            finishedAt: null,
          } as NodeUpgradeState);

        if (!matchedResult) {
          return {
            ...previous,
            [clientId]: {
              ...current,
              status:
                current.status === "pending" ? "running" : current.status,
            },
          };
        }

        return {
          ...previous,
          [clientId]: {
            status: matchedResult.finished_at
              ? matchedResult.exit_code === 0
                ? "success"
                : "failed"
              : "running",
            taskId: task.taskId,
            output: matchedResult.result || "",
            exitCode: matchedResult.exit_code,
            finishedAt: matchedResult.finished_at,
          },
        };
      });

      return Boolean(matchedResult?.finished_at);
    },
    [updateResultState]
  );

  const startPolling = React.useCallback(
    (tasks: UpgradeTask[]) => {
      clearPolling();
      taskRefs.current = tasks;
      setStatus("running");

      const run = () => {
        void Promise.all(
          taskRefs.current.map((task) =>
            pollTaskResult(task).catch((error) => {
              updateResultState((previous) => ({
                ...previous,
                [task.clientIds[0]]: {
                  ...(previous[task.clientIds[0]] || {
                    output: "",
                    exitCode: null,
                    finishedAt: null,
                  }),
                  status: "failed",
                  taskId: task.taskId,
                  output:
                    error instanceof Error
                      ? error.message
                      : String(error),
                  exitCode: -1,
                  finishedAt: new Date().toISOString(),
                },
              }));
              return true;
            })
          )
        ).then((states) => {
          if (states.every(Boolean)) {
            clearPolling();
            void finalizeExecution(false);
          }
        });
      };

      run();
      pollIntervalRef.current = window.setInterval(run, 2000);
      pollTimeoutRef.current = window.setTimeout(() => {
        clearPolling();
        updateResultState((previous) => {
          const next = { ...previous };
          Object.keys(next).forEach((uuid) => {
            if (
              next[uuid]?.status === "pending" ||
              next[uuid]?.status === "running"
            ) {
              next[uuid] = {
                ...next[uuid],
                status: "timeout",
                finishedAt: new Date().toISOString(),
              };
            }
          });
          return next;
        });
        void finalizeExecution(true);
      }, 60000);
    },
    [clearPolling, finalizeExecution, pollTaskResult, updateResultState]
  );

  const handleUpgrade = async () => {
    if (onlineNodes.length === 0) {
      toast.error(
        t("admin.nodeTable.upgradeNoOnlineToast", {
          groupName,
          defaultValue: "No online nodes available in {{groupName}} for upgrade.",
        })
      );
      return;
    }

    setSubmitting(true);
    setStatus("pending");
    const initialState = Object.fromEntries(
      onlineNodes.map((node) => [
        node.uuid,
        {
          status: "pending",
          output: "",
          exitCode: null,
          finishedAt: null,
        } satisfies NodeUpgradeState,
      ])
    );
    updateResultState(initialState);

    try {
      const installVersion = await resolveLatestAgentUpgradeVersion(onlineNodes);
      const settled = await Promise.allSettled(
        onlineNodes.map(async (node) => {
          const command = buildAgentUpgradeCommand(node, settings, installVersion);
          if (!command) {
            throw new Error(
              t("admin.nodeTable.upgradeMissingToken", {
                defaultValue: "Node is missing a token and cannot be upgraded.",
              })
            );
          }

          const response = await fetch("/api/admin/task/exec", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              command,
              clients: [node.uuid],
            }),
          });

          const payload = (await response.json().catch(() => ({}))) as ExecResponse;
          if (!response.ok || payload.status === "error") {
            throw new Error(payload.message || `HTTP ${response.status}`);
          }

          const taskId = payload.data?.task_id || payload.task_id || "";
          if (!taskId) {
            throw new Error(
              t("admin.nodeTable.upgradeMissingTaskId", {
                defaultValue: "No task ID was returned.",
              })
            );
          }

          updateResultState((previous) => ({
            ...previous,
            [node.uuid]: {
              ...(previous[node.uuid] || {
                output: "",
                exitCode: null,
                finishedAt: null,
              }),
              status: "running",
              taskId,
            },
          }));

          return {
            taskId,
            platform: detectNodePlatform(node),
            clientIds: [node.uuid],
          } satisfies UpgradeTask;
        })
      );

      const tasks = settled
        .filter(
          (
            item
          ): item is PromiseFulfilledResult<UpgradeTask> =>
            item.status === "fulfilled"
        )
        .map((item) => item.value);

      settled.forEach((item, index) => {
        if (item.status === "rejected") {
          const failedNode = onlineNodes[index];
          updateResultState((previous) => ({
            ...previous,
            [failedNode.uuid]: {
              status: "failed",
              output:
                item.reason instanceof Error
                  ? item.reason.message
                  : String(item.reason),
              exitCode: -1,
              finishedAt: new Date().toISOString(),
            },
          }));
        }
      });

      if (tasks.length === 0) {
        await finalizeExecution(false);
        return;
      }

      toast.success(
        t("admin.nodeTable.upgradeTasksDispatched", {
          groupName,
          count: tasks.length,
          defaultValue:
            "{{groupName}} dispatched {{count}} upgrade task(s).",
        })
      );
      startPolling(tasks);
    } finally {
      setSubmitting(false);
    }
  };

  const summary = React.useMemo(() => {
    const values = Object.values(resultState);
    return {
      pending: values.filter((item) => item.status === "pending").length,
      running: values.filter((item) => item.status === "running").length,
      success: values.filter((item) => item.status === "success").length,
      failed: values.filter(
        (item) => item.status === "failed" || item.status === "timeout"
      ).length,
    };
  }, [resultState]);

  const combinedOutput = React.useMemo(
    () =>
      onlineNodes
        .map((node) => {
          const result = resultState[node.uuid];
          if (!result?.output) return null;
          return `[${getNodePrimaryAddress(node)}]\n${result.output}`;
        })
        .filter(Boolean)
        .join("\n\n--------------------------------\n\n"),
    [onlineNodes, resultState]
  );

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button
          variant="outline"
          className="rounded-full"
          disabled={onlineNodes.length === 0}
        >
          {status === "running" || submitting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {t("admin.nodeTable.upgradeAgent", "Upgrade agent")}
        </Button>
      </Dialog.Trigger>
      <Dialog.Content className={NODE_DIALOG_CONTENT_CLASS} maxWidth={760}>
        <Dialog.Title>
          {t("admin.nodeTable.upgradeDialogTitle", {
            groupName,
            defaultValue: "{{groupName}} · Upgrade agent",
          })}
        </Dialog.Title>
        <Dialog.Description className="mt-2">
          {t("admin.nodeTable.upgradeDialogDescription", {
            defaultValue:
              "Only online nodes in the current group will receive the upgrade script. The terminal entry remains available from the node row context menu.",
          })}
        </Dialog.Description>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t("admin.nodeTable.upgradeOnlineNodes", "Online nodes")}
            </div>
            <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
              {onlineNodes.length}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t("admin.nodeTable.upgradeRunning", "Running")}
            </div>
            <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
              {summary.pending + summary.running}
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <div className="text-xs text-emerald-700 dark:text-emerald-300">
              {t("admin.nodeTable.upgradeSuccessShort", "Succeeded")}
            </div>
            <div className="mt-1 text-base font-semibold text-emerald-800">
              {summary.success}
            </div>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-900/60 dark:bg-rose-950/30">
            <div className="text-xs text-rose-700 dark:text-rose-300">
              {t("admin.nodeTable.upgradeFailedShort", "Failed")}
            </div>
            <div className="mt-1 text-base font-semibold text-rose-800">
              {summary.failed}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
          <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
            {t("admin.nodeTable.upgradeStatusTitle", "Node execution status")}
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto p-4">
            {onlineNodes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                {t("admin.nodeTable.upgradeNoOnlineState", {
                  defaultValue:
                    "There are no online nodes in this group, so the upgrade cannot start.",
                })}
              </div>
            ) : (
              onlineNodes.map((node) => {
                const result = resultState[node.uuid];
                const statusLabel =
                  result?.status === "success"
                    ? t("admin.nodeTable.upgradeSuccessShort", "Succeeded")
                    : result?.status === "failed"
                      ? t("admin.nodeTable.upgradeFailedShort", "Failed")
                      : result?.status === "timeout"
                        ? t("exec.status.timeout", "Timeout")
                        : result?.status === "running"
                          ? t("admin.nodeTable.upgradeRunning", "Running")
                          : result?.status === "pending"
                            ? t("admin.nodeTable.upgradePending", "Queued")
                            : t("admin.nodeTable.upgradeNotStarted", "Not started");
                const statusClass =
                  result?.status === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : result?.status === "failed" ||
                        result?.status === "timeout"
                      ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
                      : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300";

                return (
                  <div
                    key={node.uuid}
                    title={result?.output || buildNodeConfigTooltip({ node, live: liveByNode[node.uuid] })}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {getNodePrimaryAddress(node)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {detectNodePlatform(node)} / {node.version || "-"}
                        {result?.taskId
                          ? ` / ${t("exec.task_id_label", {
                              defaultValue: "Task ID",
                            })} ${result.taskId}`
                          : ""}
                      </div>
                    </div>
                    <div
                      className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs ${statusClass}`}
                    >
                      {result?.status === "running" ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      {statusLabel}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {combinedOutput ? (
          <div className="mt-4">
            <div className="mb-2 text-xs text-slate-500 dark:text-slate-400">
              {t("admin.nodeTable.upgradeLatestOutput", "Latest output")}
            </div>
            <TextArea
              readOnly
              value={combinedOutput}
              className="min-h-44 border-slate-200 bg-slate-50 font-mono text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
          </div>
        ) : null}

        <div className={NODE_DIALOG_FOOTER_CLASS}>
          <Dialog.Close>
            <Button variant="outline" className="w-full sm:w-auto">
              {t("common.close", "Close")}
            </Button>
          </Dialog.Close>
          <Button
            className="w-full sm:w-auto"
            onClick={() => void handleUpgrade()}
            disabled={submitting || status === "running" || onlineNodes.length === 0}
          >
            {submitting || status === "running" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t("admin.nodeTable.upgradeStart", "Start upgrade")}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/40 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1 overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-2 pr-2 whitespace-nowrap">
            <Text className="shrink-0 text-base font-semibold text-slate-900 dark:text-slate-100">
              {groupName}
            </Text>
            <Badge
              variant="soft"
              color="blue"
              className="shrink-0 rounded-full px-3 py-1"
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
    <div className="flex flex-col gap-4">
      {nodes.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
          {t("admin.nodeTable.noNodes", "No nodes")}
        </div>
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

type Platform = "linux" | "windows" | "macos";
type GenerateCommandPreferences = {
  selectedPlatform: Platform;
  installOptions: InstallOptions;
  enableGhproxy: boolean;
  enableCustomDir: boolean;
  enableCustomServiceName: boolean;
  enableIncludeNics: boolean;
  enableExcludeNics: boolean;
  enableIncludeMountpoints: boolean;
  enableMonthRotate: boolean;
};

const INSTALL_COMMAND_PREFERENCES_STORAGE_KEY =
  "komari-node-install-command-preferences-v1";

const DEFAULT_INSTALL_OPTIONS: InstallOptions = {
  disableWebSsh: false,
  disableAutoUpdate: false,
  ignoreUnsafeCert: false,
  memoryIncludeCache: false,
  ghproxy: "",
  dir: "",
  serviceName: "",
  includeNics: "",
  excludeNics: "",
  includeMountpoints: "",
  monthRotate: "",
};

const DEFAULT_GENERATE_COMMAND_PREFERENCES: GenerateCommandPreferences = {
  selectedPlatform: "linux",
  installOptions: DEFAULT_INSTALL_OPTIONS,
  enableGhproxy: false,
  enableCustomDir: false,
  enableCustomServiceName: false,
  enableIncludeNics: false,
  enableExcludeNics: false,
  enableIncludeMountpoints: false,
  enableMonthRotate: false,
};

let cachedGenerateCommandPreferences: GenerateCommandPreferences | null = null;

const loadGenerateCommandPreferences = (): GenerateCommandPreferences => {
  if (cachedGenerateCommandPreferences) {
    return cachedGenerateCommandPreferences;
  }

  if (typeof window === "undefined") {
    return DEFAULT_GENERATE_COMMAND_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(
      INSTALL_COMMAND_PREFERENCES_STORAGE_KEY
    );
    if (!raw) {
      cachedGenerateCommandPreferences = DEFAULT_GENERATE_COMMAND_PREFERENCES;
      return DEFAULT_GENERATE_COMMAND_PREFERENCES;
    }

    const parsed = JSON.parse(raw) as Partial<GenerateCommandPreferences>;
    const next: GenerateCommandPreferences = {
      ...DEFAULT_GENERATE_COMMAND_PREFERENCES,
      ...parsed,
      selectedPlatform:
        parsed.selectedPlatform === "windows" ||
        parsed.selectedPlatform === "macos" ||
        parsed.selectedPlatform === "linux"
          ? parsed.selectedPlatform
          : "linux",
      installOptions: {
        ...DEFAULT_INSTALL_OPTIONS,
        ...(parsed.installOptions || {}),
      },
    };
    cachedGenerateCommandPreferences = next;
    return next;
  } catch {
    cachedGenerateCommandPreferences = DEFAULT_GENERATE_COMMAND_PREFERENCES;
    return DEFAULT_GENERATE_COMMAND_PREFERENCES;
  }
};

const saveGenerateCommandPreferences = (
  preferences: GenerateCommandPreferences
) => {
  cachedGenerateCommandPreferences = preferences;
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    INSTALL_COMMAND_PREFERENCES_STORAGE_KEY,
    JSON.stringify(preferences)
  );
};

export default NodeDetailsPage;
type InstallOptions = {
  disableWebSsh: boolean;
  disableAutoUpdate: boolean;
  ignoreUnsafeCert: boolean;
  memoryIncludeCache: boolean;
  ghproxy: string;
  dir: string;
  serviceName: string;
  includeNics: string;
  excludeNics: string;
  includeMountpoints: string;
  monthRotate: string;
};
function GenerateCommandButton({
  node,
  nodes,
  settings,
  toolbar = false,
  groupMode = false,
  presetGroupName,
  toolbarLabel,
  disabled = false,
}: {
  node?: NodeDetail;
  nodes?: NodeDetail[];
  settings: any;
  toolbar?: boolean;
  groupMode?: boolean;
  presetGroupName?: string;
  toolbarLabel?: string;
  disabled?: boolean;
}) {
  const availableNodes = nodes ?? (node ? [node] : []);
  const initialPreferences = React.useMemo(
    () => loadGenerateCommandPreferences(),
    []
  );
  const [selectedNodeId, setSelectedNodeId] = React.useState(
    node?.uuid ?? availableNodes[0]?.uuid ?? ""
  );
  const [selectedPlatform, setSelectedPlatform] = React.useState<Platform>(
    initialPreferences.selectedPlatform
  );
  const [installOptions, setInstallOptions] = React.useState<InstallOptions>(
    initialPreferences.installOptions
  );

  const [enableGhproxy, setEnableGhproxy] = React.useState(
    initialPreferences.enableGhproxy
  );
  const [enableCustomDir, setEnableCustomDir] = React.useState(
    initialPreferences.enableCustomDir
  );
  const [enableCustomServiceName, setEnableCustomServiceName] =
    React.useState(initialPreferences.enableCustomServiceName);
  const [enableIncludeNics, setEnableIncludeNics] = React.useState(
    initialPreferences.enableIncludeNics
  );
  const [enableExcludeNics, setEnableExcludeNics] = React.useState(
    initialPreferences.enableExcludeNics
  );
  const [enableIncludeMountpoints, setEnableIncludeMountpoints] =
    React.useState(initialPreferences.enableIncludeMountpoints);
  const [enableMonthRotate, setEnableMonthRotate] = React.useState(
    initialPreferences.enableMonthRotate
  );
  const scopedGroupName =
    groupMode && presetGroupName && presetGroupName !== getDefaultGroupLabel()
      ? presetGroupName.trim()
      : "";
  const [groupName, setGroupName] = React.useState(scopedGroupName);
  const autoDiscoveryKey = String(settings?.auto_discovery_key || "").trim();
  const useAutoDiscovery = autoDiscoveryKey.length >= 12;
  const normalizedGroupName = groupName.trim();
  const scopedAutoDiscoveryKey = encodeScopedAutoDiscoveryKey(
    autoDiscoveryKey,
    normalizedGroupName
  );
  const availableGroups = React.useMemo(
    () =>
      Array.from(
        new Set(
          availableNodes
            .map((item) => String(item.group || "").trim())
            .filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right)),
    [availableNodes]
  );
  const activeNode =
    node ??
    availableNodes.find((item) => item.uuid === selectedNodeId) ??
    availableNodes[0];
  const hasMountedPreferenceSync = React.useRef(false);

  React.useEffect(() => {
    if (!groupMode) return;
    setGroupName(scopedGroupName);
  }, [groupMode, scopedGroupName]);

  React.useEffect(() => {
    if (!hasMountedPreferenceSync.current) {
      hasMountedPreferenceSync.current = true;
      return;
    }

    saveGenerateCommandPreferences({
      selectedPlatform,
      installOptions,
      enableGhproxy,
      enableCustomDir,
      enableCustomServiceName,
      enableIncludeNics,
      enableExcludeNics,
      enableIncludeMountpoints,
      enableMonthRotate,
    });
  }, [
    enableCustomDir,
    enableCustomServiceName,
    enableExcludeNics,
    enableGhproxy,
    enableIncludeMountpoints,
    enableIncludeNics,
    enableMonthRotate,
    installOptions,
    selectedPlatform,
  ]);

  React.useEffect(() => {
    if (useAutoDiscovery || groupMode) {
      return;
    }
    if (node?.uuid) {
      setSelectedNodeId(node.uuid);
      return;
    }

    if (
      availableNodes.length > 0 &&
      !availableNodes.some((item) => item.uuid === selectedNodeId)
    ) {
      setSelectedNodeId(availableNodes[0].uuid);
    }
  }, [availableNodes, groupMode, node?.uuid, selectedNodeId, useAutoDiscovery]);

  const generateCommand = () => {
    if (groupMode && (!useAutoDiscovery || !normalizedGroupName)) return "";
    if (!useAutoDiscovery && !activeNode) return "";

    const host = function () {
      if (!settings.script_domain) {
        return window.location.origin;
      }
      if (settings.script_domain.startsWith("http")) {
        return settings.script_domain.replace(/\/+$/, "");
      }
      return `http://${settings.script_domain.replace(/\/+$/, "")}`;
    }();
    let args = ["-e", host];
    if (useAutoDiscovery) {
      args.push(
        "--auto-discovery",
        groupMode ? scopedAutoDiscoveryKey : autoDiscoveryKey
      );
    } else {
      const token = activeNode?.token || "";
      args.push("-t", token);
    }
    // 根据安装选项生成参数
    if (installOptions.disableWebSsh) {
      args.push("--disable-web-ssh");
    }
    if (installOptions.disableAutoUpdate) {
      args.push("--disable-auto-update");
    }
    if (installOptions.ignoreUnsafeCert) {
      args.push("--ignore-unsafe-cert");
    }
    if (installOptions.memoryIncludeCache) {
      args.push("--memory-include-cache");
    }
    if (enableGhproxy && installOptions.ghproxy) {
      const finalUrl = (
        installOptions.ghproxy.startsWith("http")
          ? installOptions.ghproxy
          : `http://${installOptions.ghproxy}`
      ).replace(/\/+$/, "");
      args.push(`--install-ghproxy`);
      args.push(finalUrl);
    }
    if (enableCustomDir && installOptions.dir) {
      args.push(`--install-dir`);
      args.push(installOptions.dir);
    }
    if (enableCustomServiceName && installOptions.serviceName) {
      args.push(`--install-service-name`);
      args.push(installOptions.serviceName);
    }
    if (enableIncludeNics && installOptions.includeNics) {
      args.push(`--include-nics`);
      args.push(installOptions.includeNics);
    }
    if (enableExcludeNics && installOptions.excludeNics) {
      args.push(`--exclude-nics`);
      args.push(installOptions.excludeNics);
    }
    if (enableIncludeMountpoints && installOptions.includeMountpoints) {
      args.push(`--include-mountpoint`);
      args.push(installOptions.includeMountpoints);
    }
    if (enableMonthRotate) {
      const rotateVal = (installOptions.monthRotate || "").trim() || "1"; // 默认 1
      args.push(`--month-rotate`);
      args.push(rotateVal);
    }
    const effectiveInstallDir =
      enableCustomDir && installOptions.dir.trim()
        ? installOptions.dir.trim()
        : getDefaultInstallDir(selectedPlatform);
    let scriptFile = "install.sh";
    if (selectedPlatform === "windows") {
      scriptFile = "install.ps1";
    }
    let scriptUrl = buildAgentInstallScriptURL(
      settings.base_scripts_url,
      scriptFile
    );
    if (enableGhproxy) {
      if (enableGhproxy && installOptions.ghproxy) {
        scriptUrl = scriptUrl.slice(8); // 去掉 https://
        if (installOptions.ghproxy.endsWith("/")) {
          scriptUrl = `${installOptions.ghproxy}${scriptUrl}`;
        } else {
          scriptUrl = `${installOptions.ghproxy}/${scriptUrl}`;
        }
        if (!scriptUrl.startsWith("http")) {
          scriptUrl = `http://${scriptUrl}`;
        }
      }
    }
    let finalCommand = "";
    const shellArgs = args.map(shellQuote).join(" ");
    switch (selectedPlatform) {
      case "linux":
        finalCommand =
          groupMode && useAutoDiscovery
            ? `AUTO_DISCOVERY_FILE=${shellQuote(`${effectiveInstallDir}/auto-discovery.json`)}; if [ -f "$AUTO_DISCOVERY_FILE" ]; then if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then sudo rm -f "$AUTO_DISCOVERY_FILE"; else rm -f "$AUTO_DISCOVERY_FILE"; fi; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then wget -qO- ${shellQuote(
                scriptUrl
              )} | sudo bash -s -- ${shellArgs}; else wget -qO- ${shellQuote(
                scriptUrl
              )} | bash -s -- ${shellArgs}; fi`
            :
          `wget -qO- ${shellQuote(scriptUrl)} | sudo bash -s -- ` + shellArgs;
        break;
      case "windows":
        finalCommand = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "`;
        if (groupMode && useAutoDiscovery) {
          const windowsInstallDir =
            enableCustomDir && installOptions.dir.trim()
              ? powershellQuote(installOptions.dir.trim())
              : "$Env:ProgramFiles\\Komari";
          finalCommand += `$ksBindFile = Join-Path ${windowsInstallDir} 'auto-discovery.json'; if (Test-Path $ksBindFile) { Remove-Item $ksBindFile -Force }; `;
        }
        finalCommand +=
          `iwr ${powershellQuote(scriptUrl)}` +
          ` -UseBasicParsing -OutFile 'install.ps1'; &` +
          ` '.\\install.ps1'`;
        args.forEach((arg) => {
          finalCommand += ` ${powershellQuote(arg)}`;
        });
        finalCommand += `"`;
        break;
      case "macos":
        if (groupMode && useAutoDiscovery) {
          const macInstallDir =
            enableCustomDir && installOptions.dir.trim()
              ? shellQuote(installOptions.dir.trim())
              : `$(if [ "$(id -u)" -eq 0 ] || [ -w /usr/local ]; then printf %s /usr/local/komari; else printf %s "$HOME/.komari"; fi)`;
          finalCommand =
            `AUTO_DISCOVERY_DIR=${macInstallDir}; AUTO_DISCOVERY_FILE="$AUTO_DISCOVERY_DIR/auto-discovery.json"; ` +
            `if [ -f "$AUTO_DISCOVERY_FILE" ]; then rm -f "$AUTO_DISCOVERY_FILE"; fi; ` +
            `zsh <(curl -sL ${shellQuote(scriptUrl)}) ${shellArgs}`;
        } else {
          finalCommand = `zsh <(curl -sL ${shellQuote(scriptUrl)}) ` + shellArgs;
        }
        break;
    }
    return finalCommand;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copy_success", "Copied!"));
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };
  const { t } = useTranslation();
  const copyDisabled = groupMode
    ? !useAutoDiscovery || !normalizedGroupName
    : !useAutoDiscovery && !activeNode;

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        {toolbar ? (
          <Button
            variant="soft"
            color={groupMode ? "green" : "blue"}
            className="shrink-0 rounded-2xl"
            disabled={disabled}
          >
            <Download size={16} />
            {toolbarLabel ||
              (groupMode
                ? t("admin.nodeTable.createGroup", "Create group")
                : t("admin.nodeTable.installCommand", "Install command"))}
          </Button>
        ) : (
        <IconButton
          variant="ghost"
          title={t("admin.nodeTable.installCommand")}
          className="h-8 w-8 rounded-lg"
          disabled={disabled}
        >
          <Download size="18" />
        </IconButton>
        )}
      </Dialog.Trigger>
      <Dialog.Content
        className={NODE_DIALOG_CONTENT_CLASS}
        maxWidth={1040}
      >
        <Dialog.Title>
          {groupMode
            ? scopedGroupName
              ? `${t("admin.nodeTable.installCommand", "Install command")} · ${scopedGroupName}`
              : t("admin.nodeTable.groupInstallCommand", "Create group install command")
            : useAutoDiscovery
            ? `${t("admin.nodeTable.installCommand", "Install command")} · ${t("admin.nodeTable.autoEnroll", "Auto-enroll")}`
            : node
              ? `${t("admin.nodeTable.installCommand", "Install command")} · ${activeNode?.name || "-"}`
              : t("admin.nodeTable.installCommand", "Install command")}
        </Dialog.Title>
        <Dialog.Description className="mt-2">
          {t(
            "admin.nodeTable.installDialogDescription",
            "Platform selection and install parameters are remembered and reused next time.",
          )}
        </Dialog.Description>
        <div className="mt-4 flex flex-col gap-4">
          {useAutoDiscovery && !groupMode && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              {t(
                "admin.nodeTable.autoDiscoveryGeneralHint",
                "This currently uses the general auto-enroll command. Run it on any server and the node will register to your panel automatically.",
              )}
            </div>
          )}
          {groupMode && useAutoDiscovery && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300">
              {t(
                "admin.nodeTable.autoDiscoveryGroupHint",
                "After you enter a group name, run this command on any server. The node will register automatically into that group. If the machine was previously bound, the command will clear the old binding automatically before re-enrolling.",
              )}
            </div>
          )}
          {groupMode && (
            <div className={`${NODE_DIALOG_SECTION_CLASS} flex flex-col gap-3`}>
              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                  {t("admin.nodeTable.groupName", "Group name")}
                </label>
                <TextField.Root
                  className={NODE_INPUT_CLASS}
                  placeholder={t(
                    "admin.nodeTable.groupNamePlaceholder",
                    "For example: Hong Kong / Japan / Production",
                  )}
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                />
              </div>
              {availableGroups.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {availableGroups.map((group) => (
                    <button
                      key={group}
                      type="button"
                      className={`rounded-full border px-3 py-1 text-[13px] font-medium transition-colors ${
                        normalizedGroupName === group
                          ? "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-100"
                      }`}
                      onClick={() => setGroupName(group)}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              )}
              <Text size="1" className="text-slate-500 dark:text-slate-400">
                {t(
                  "admin.nodeTable.groupNameHelp",
                  "The group will be created automatically after the first server runs this command. You do not need to create an empty group first.",
                )}
              </Text>
            </div>
          )}
          {!groupMode && !useAutoDiscovery && !node && availableNodes.length > 0 && (
            <div className={NODE_DIALOG_SECTION_CLASS}>
              <label className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                {t("admin.nodeTable.selectNode", "Select node")}
              </label>
              <select
                className="mt-3 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                value={selectedNodeId}
                onChange={(event) => setSelectedNodeId(event.target.value)}
              >
                {availableNodes.map((item) => (
                  <option key={item.uuid} value={item.uuid}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!useAutoDiscovery && toolbar && !groupMode && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              {t(
                "admin.nodeTable.autoDiscoveryDisabledSingle",
                "Auto Discovery Key is not enabled yet, so this still uses the legacy single-node mode. Set it in Settings > General to switch to the general onboarding command.",
              )}
            </div>
          )}
          {!useAutoDiscovery && groupMode && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              {t(
                "admin.nodeTable.autoDiscoveryDisabledGroup",
                "Set the Auto Discovery Key in Settings > General first, then group install commands can be used.",
              )}
            </div>
          )}
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
            <div className="flex flex-col gap-4">
              <div className={NODE_DIALOG_SECTION_CLASS}>
                <label className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                  {t("admin.nodeTable.platform", "Platform")}
                </label>
                <div className="mt-3">
                  <SegmentedControl.Root
                    value={selectedPlatform}
                    onValueChange={(value) => setSelectedPlatform(value as Platform)}
                  >
                    <SegmentedControl.Item value="linux">Linux</SegmentedControl.Item>
                    <SegmentedControl.Item value="windows">
                      Windows
                    </SegmentedControl.Item>
                    <SegmentedControl.Item value="macos">macOS</SegmentedControl.Item>
                  </SegmentedControl.Root>
                </div>
              </div>

              <div className={NODE_DIALOG_SECTION_CLASS}>
                <label className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                  {t("admin.nodeTable.installOptions", "Install options")}
                </label>
                <div className="mt-3 grid gap-3 text-slate-900 dark:text-slate-100 md:grid-cols-2">
              <Flex gap="2" align="center">
                <Checkbox
                  checked={installOptions.disableWebSsh}
                  onCheckedChange={(checked) => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      disableWebSsh: Boolean(checked),
                    }));
                  }}
                />
                <label
                  className="text-sm font-normal"
                  onClick={() => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      disableWebSsh: !prev.disableWebSsh,
                    }));
                  }}
                >
                  {t("admin.nodeTable.disableWebSsh")}
                </label>
              </Flex>
              <Flex gap="2" align="center">
                <Checkbox
                  checked={installOptions.disableAutoUpdate}
                  onCheckedChange={(checked) => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      disableAutoUpdate: Boolean(checked),
                    }));
                  }}
                ></Checkbox>
                <label
                  className="text-sm font-normal"
                  onClick={() => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      disableAutoUpdate: !prev.disableAutoUpdate,
                    }));
                  }}
                >
                  {t("admin.nodeTable.disableAutoUpdate", "Disable auto update")}
                </label>
              </Flex>
              <Flex gap="2" align="center">
                <Checkbox
                  checked={installOptions.ignoreUnsafeCert}
                  onCheckedChange={(checked) => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      ignoreUnsafeCert: Boolean(checked),
                    }));
                  }}
                />
                <label
                  className="text-sm font-normal"
                  onClick={() => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      ignoreUnsafeCert: !prev.ignoreUnsafeCert,
                    }));
                  }}
                >
                  {t("admin.nodeTable.ignoreUnsafeCert", "Ignore unsafe cert")}
                </label>
              </Flex>
              <Flex gap="2" align="center">
                <Checkbox
                  checked={installOptions.memoryIncludeCache}
                  onCheckedChange={(checked) => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      memoryIncludeCache: Boolean(checked),
                    }));
                  }}
                />
                <label
                  className="text-sm font-normal"
                  onClick={() => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      memoryIncludeCache: !prev.memoryIncludeCache,
                    }));
                  }}
                >
                  {t("admin.nodeTable.memoryModeAvailable", "Include cache memory")}
                </label>
                <Tips size="14">
                  {t("admin.nodeTable.memoryModeAvailable_tip")}
                </Tips>
              </Flex>
                </div>
              </div>

              <div className={NODE_DIALOG_SECTION_CLASS}>
                <label className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                  {t("admin.nodeTable.advancedParameters", "Advanced parameters")}
                </label>
                <div className="mt-3 flex flex-col gap-3 text-slate-900 dark:text-slate-100">
              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableGhproxy}
                  onCheckedChange={(checked) => {
                    setEnableGhproxy(Boolean(checked));
                    if (!checked) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        ghproxy: "",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    setEnableGhproxy(!enableGhproxy);
                    if (enableGhproxy) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        ghproxy: "",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.ghproxy", "GitHub proxy")}
                </label>
              </Flex>
              {enableGhproxy && (
                <TextField.Root
                  // placeholder={t(
                  //   "admin.nodeTable.ghproxy_placeholder",
                  //   "GitHub 代理，为空则不使用代理"
                  // )}
                  placeholder="https://ghfast.top/"
                  className={NODE_INPUT_CLASS}
                  value={installOptions.ghproxy}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      ghproxy: e.target.value,
                    }))
                  }
                />
              )}

              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableCustomDir}
                  onCheckedChange={(checked) => {
                    setEnableCustomDir(Boolean(checked));
                    if (!checked) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        dir: "",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    setEnableCustomDir(!enableCustomDir);
                    if (enableCustomDir) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        dir: "",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.install_dir", "Installation directory")}
                </label>
              </Flex>
              {enableCustomDir && (
                <TextField.Root
                  className={NODE_INPUT_CLASS}
                  placeholder={t(
                    "admin.nodeTable.install_dir_placeholder",
                    "Installation directory, leave empty to use the default directory (/opt/komari-agent)"
                  )}
                  value={installOptions.dir}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      dir: e.target.value,
                    }))
                  }
                />
              )}

              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableCustomServiceName}
                  onCheckedChange={(checked) => {
                    setEnableCustomServiceName(Boolean(checked));
                    if (!checked) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        serviceName: "",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    setEnableCustomServiceName(!enableCustomServiceName);
                    if (enableCustomServiceName) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        serviceName: "",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.serviceName", "Service name")}
                </label>
              </Flex>
              {enableCustomServiceName && (
                <TextField.Root
                  className={NODE_INPUT_CLASS}
                  placeholder={t(
                    "admin.nodeTable.serviceName_placeholder",
                    "Service name, leave empty to use the default name (komari-agent)"
                  )}
                  value={installOptions.serviceName}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      serviceName: e.target.value,
                    }))
                  }
                />
              )}
              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableIncludeNics}
                  onCheckedChange={(checked) => {
                    setEnableIncludeNics(Boolean(checked));
                    if (!checked) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        includeNics: "",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    setEnableIncludeNics(!enableIncludeNics);
                    if (enableIncludeNics) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        includeNics: "",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.includeNics", "Specific network interfaces only.")}
                </label>
              </Flex>
              {enableIncludeNics && (
                <TextField.Root
                  className={NODE_INPUT_CLASS}
                  // placeholder={t(
                  //   "admin.nodeTable.includeNics_placeholder",
                  //   "多个网卡使用逗号隔开"
                  // )}
                  placeholder="eth0,eth1"
                  value={installOptions.includeNics}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      includeNics: e.target.value,
                    }))
                  }
                />
              )}
              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableExcludeNics}
                  onCheckedChange={(checked) => {
                    setEnableExcludeNics(Boolean(checked));
                    if (!checked) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        excludeNics: "",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    setEnableExcludeNics(!enableExcludeNics);
                    if (enableExcludeNics) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        excludeNics: "",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.excludeNics", "Exclude specific network interfaces.")}
                </label>
              </Flex>
              {enableExcludeNics && (
                <TextField.Root
                  className={NODE_INPUT_CLASS}
                  // placeholder={t(
                  //   "admin.nodeTable.excludeNics_placeholder",
                  //   "多个网卡使用逗号隔开"
                  // )}
                  placeholder="lo"
                  value={installOptions.excludeNics}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      excludeNics: e.target.value,
                    }))
                  }
                />
              )}
              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableIncludeMountpoints}
                  onCheckedChange={(checked) => {
                    setEnableIncludeMountpoints(Boolean(checked));
                    if (!checked) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        includeMountpoints: "",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    setEnableIncludeMountpoints(!enableIncludeMountpoints);
                    if (enableIncludeMountpoints) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        includeMountpoints: "",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.includeMountpoints", "Specific mountpoints only.")}
                </label>
              </Flex>
              {enableIncludeMountpoints && (
                <TextField.Root
                  className={NODE_INPUT_CLASS}
                  placeholder="/;/home;/var"
                  value={installOptions.includeMountpoints}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      includeMountpoints: e.target.value,
                    }))
                  }
                />
              )}
              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableMonthRotate}
                  onCheckedChange={(checked) => {
                    const enabled = Boolean(checked);
                    setEnableMonthRotate(enabled);
                    if (!enabled) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        monthRotate: "",
                      }));
                    } else {
                      setInstallOptions((prev) => ({
                        ...prev,
                        monthRotate: prev.monthRotate?.trim()
                          ? prev.monthRotate
                          : "1",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    const willEnable = !enableMonthRotate;
                    setEnableMonthRotate(willEnable);
                    if (!willEnable) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        monthRotate: "",
                      }));
                    } else {
                      setInstallOptions((prev) => ({
                        ...prev,
                        monthRotate: prev.monthRotate?.trim()
                          ? prev.monthRotate
                          : "1",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.monthRotate", "Month reset for network statistics")}
                </label>
              </Flex>
              {enableMonthRotate && (
                <TextField.Root
                  className={NODE_INPUT_CLASS}
                  placeholder="1"
                  type="number"
                  min="1"
                  max="31"
                  value={installOptions.monthRotate}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      monthRotate: e.target.value,
                    }))
                  }
                />
              )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className={NODE_DIALOG_SECTION_CLASS}>
                <label className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                  {t("admin.nodeTable.generatedCommand", "Command")}
                </label>
                <p className={`mt-1 ${NODE_DIALOG_HINT_CLASS}`}>
                  {t(
                    "admin.nodeTable.generatedCommandHelp",
                    "Copy this command and run it directly on the target server.",
                  )}
                </p>
                <div className="relative mt-3">
                  <TextArea
                    disabled
                    className="min-h-[220px] w-full rounded-xl border border-slate-200 bg-white font-mono text-[13px] leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    value={generateCommand()}
                  />
                </div>
              </div>

              <div className={NODE_DIALOG_FOOTER_CLASS}>
                <Dialog.Close>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    {t("close", "Close")}
                  </Button>
                </Dialog.Close>
                <Button
                  className="w-full sm:w-auto"
                  disabled={copyDisabled}
                  onClick={() => copyToClipboard(generateCommand())}
                >
                  <Copy size={16} />
                  {t("copy")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

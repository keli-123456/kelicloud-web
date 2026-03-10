import React, { useEffect, useState } from "react";
import {
  NodeDetailsProvider,
  useNodeDetails,
  type NodeDetail,
} from "@/contexts/NodeDetailsContext";
import {
  Flex,
  TextField,
  Button,
  Checkbox,
  Text,
  Badge,
  Card,
  Dialog,
  IconButton,
  TextArea,
  SegmentedControl,
} from "@radix-ui/themes";
import {
  CircleDollarSign,
  Copy,
  Download,
  Pencil,
  Plus,
  Terminal,
  Trash2Icon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Flag from "@/components/Flag";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBytes, stringToBytes } from "@/utils/unitHelper";
import Loading from "@/components/loading";
import Tips from "@/components/ui/tips";
import {
  SettingCardCollapse,
  SettingCardSelect,
  SettingCardShortTextInput,
  SettingCardSwitch,
} from "@/components/admin/SettingCard";
import { useSettings } from "@/lib/api";
import { SelectOrInput } from "@/components/ui/select-or-input";
import { useRPC2Call } from "@/contexts/RPC2Context";
import type { Record as LiveRecord } from "@/types/LiveData";


const NodeDetailsPage = () => {
  return (
    <NodeDetailsProvider>
      <Layout />
    </NodeDetailsProvider>
  );
};

type NodeLiveSnapshot = {
  online: boolean;
  record: LiveRecord;
};

const DEFAULT_GROUP_NAME = "默认分组";

const getNodeGroupLabel = (node: NodeDetail) => {
  const groupName = String(node.group || "").trim();
  return groupName || DEFAULT_GROUP_NAME;
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
  updated_at: "",
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
      updated_at: value.time ?? "",
    },
  };
};

const Layout = () => {
  const { nodeDetail, isLoading, error, refresh } = useNodeDetails();
  const { call } = useRPC2Call();
  const [searchTerm, setSearchTerm] = useState("");
  const [liveByNode, setLiveByNode] = useState<Record<string, NodeLiveSnapshot>>(
    {}
  );
  const [liveLoaded, setLiveLoaded] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const allNodes = Array.isArray(nodeDetail)
    ? [...nodeDetail].sort((a, b) => a.weight - b.weight)
    : [];
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredNodes = allNodes.filter((node) => {
    if (!normalizedSearchTerm) return true;
    return [
      node.name,
      node.ipv4,
      node.ipv6,
      getNodeGroupLabel(node),
    ].some((value) =>
      String(value || "").toLowerCase().includes(normalizedSearchTerm)
    );
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      refresh();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    let timer: number | undefined;
    let stopped = false;
    let running = false;

    const pollLiveData = async () => {
      if (running) return;
      running = true;

      try {
        const result: Record<string, any> = await call("common:getNodesLatestStatus");
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
  }, [call]);

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
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      <NodeTable
        nodes={filteredNodes}
        liveByNode={liveByNode}
      />
    </div>
  );
};

const Header = ({
  nodes,
  liveByNode,
  liveLoaded,
  liveError,
  searchTerm,
  setSearchTerm,
}: {
  nodes: NodeDetail[];
  liveByNode: Record<string, NodeLiveSnapshot>;
  liveLoaded: boolean;
  liveError: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}) => {
  const { t } = useTranslation();
  const { refresh } = useNodeDetails();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const offlineNodes = nodes.filter((node) => {
    const live = liveByNode[node.uuid];
    return live ? !live.online : false;
  });
  const totalUploadSpeed = nodes.reduce(
    (sum, node) => sum + (liveByNode[node.uuid]?.record.network.up ?? 0),
    0
  );
  const totalDownloadSpeed = nodes.reduce(
    (sum, node) => sum + (liveByNode[node.uuid]?.record.network.down ?? 0),
    0
  );
  const handleAddNode = async (name: string | undefined) => {
    setDialogOpen(true);
    setLoading(true);
    try {
      await fetch("/api/admin/client/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || "" }),
      });
      refresh();
    } catch (error) {
      toast.error(
        `${t("common.error", "Error")}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setLoading(false);
      setDialogOpen(false);
    }
  };
  const handleDeleteOffline = async () => {
    if (offlineNodes.length === 0) return;

    setCleanupLoading(true);
    try {
      const results = await Promise.allSettled(
        offlineNodes.map(async (node) => {
          const response = await fetch(`/api/admin/client/${node.uuid}/remove`, {
            method: "POST",
          });
          if (!response.ok) {
            throw new Error(`Delete failed for ${node.name} (${response.status})`);
          }
          return node.uuid;
        })
      );
      const failed = results.filter((result) => result.status === "rejected");
      await refresh();
      setCleanupOpen(false);
      if (failed.length > 0) {
        toast.error(`Failed to delete ${failed.length} offline node(s)`);
      } else {
        toast.success(`Deleted ${offlineNodes.length} offline node(s)`);
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
    <Card className="border border-slate-200/70 bg-white/92 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Text className="text-xl font-semibold tracking-tight text-slate-900">
            {t("admin.nodeTable.nodeList")}
          </Text>
          <Badge variant="soft" color="blue" className="rounded-full px-3 py-1">
            {nodes.length} 节点
          </Badge>
          <Badge
            variant="soft"
            color={liveError ? "red" : offlineNodes.length > 0 ? "amber" : "green"}
            className="rounded-full px-3 py-1"
          >
            {liveError
              ? "同步异常"
              : liveLoaded
                ? `${offlineNodes.length} 离线`
                : "状态同步中"}
          </Badge>
          {liveError && (
            <Text size="2" className="text-rose-600">
              实时状态接口异常，已暂停批量删除。
            </Text>
          )}
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-2 text-sm text-slate-600">
            <span className="font-medium text-slate-900">总速率</span>
            <span>↑ {formatBytes(totalUploadSpeed)}/s</span>
            <span>↓ {formatBytes(totalDownloadSpeed)}/s</span>
          </div>
          <TextField.Root
            size="3"
            className="min-w-[260px] rounded-2xl border border-slate-200/80 bg-white shadow-sm"
            placeholder="搜索 IP / 分组"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <GenerateCommandButton
              nodes={nodes}
              settings={settings}
              toolbar
            />
            <GenerateCommandButton
              nodes={nodes}
              settings={settings}
              toolbar
              groupMode
            />
            <Dialog.Root open={cleanupOpen} onOpenChange={setCleanupOpen}>
              <Dialog.Trigger>
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
                >
                  <Trash2Icon size={16} />
                  删除离线节点
                </Button>
              </Dialog.Trigger>
              <Dialog.Content>
                <Dialog.Title>删除离线节点</Dialog.Title>
                <Dialog.Description>
                  将删除当前已确认离线的 {offlineNodes.length} 个节点。这个操作不可撤销。
                </Dialog.Description>
                <Flex justify="end" gap="2" mt="4">
                  <Dialog.Trigger>
                    <Button variant="soft">取消</Button>
                  </Dialog.Trigger>
                  <Button
                    color="red"
                    disabled={cleanupLoading || offlineNodes.length === 0}
                    onClick={handleDeleteOffline}
                  >
                    确认删除
                  </Button>
                </Flex>
              </Dialog.Content>
            </Dialog.Root>
            <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
              <Dialog.Trigger>
                <Button onClick={() => setDialogOpen(true)} className="rounded-2xl bg-slate-900 text-white">
                  <Plus size={16} />
                  {t("admin.nodeTable.addNode")}
                </Button>
              </Dialog.Trigger>
              <Dialog.Content>
                <Dialog.Title>{t("admin.nodeTable.addNode")}</Dialog.Title>
                <TextField.Root
                  ref={inputRef}
                  placeholder={t("admin.nodeTable.nameOptional")}
                />
                <Flex justify="end" gap="2" mt="4">
                  <Button
                    onClick={() => handleAddNode(inputRef.current?.value)}
                    disabled={loading}
                  >
                    {t("admin.nodeTable.addNode")}
                  </Button>
                </Flex>
              </Dialog.Content>
            </Dialog.Root>
          </div>
        </div>
      </div>
    </Card>
  );
};

const clampPercent = (value: number) =>
  Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

const formatPercent = (value: number) => `${Math.round(clampPercent(value))}%`;

const shellQuote = (value: string) => `'${value.replace(/'/g, `'\"'\"'`)}'`;

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

const UsageBar = ({
  percent,
  colorClass,
}: {
  percent: number;
  colorClass: string;
}) => {
  const safePercent = clampPercent(percent);

  return (
    <div className="min-w-[164px]">
      <div className="relative h-6 overflow-hidden rounded-full border border-slate-200/80 bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${safePercent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tracking-tight text-slate-700">
          {formatPercent(safePercent)}
        </div>
      </div>
    </div>
  );
};

const StatusSummary = ({
  live,
}: {
  live?: NodeLiveSnapshot;
}) => (
  <div className="min-w-[72px]">
    <Badge
      color={live?.online ? "green" : "gray"}
      variant="soft"
      className="rounded-full px-2 py-0.5 text-[11px]"
    >
      {live?.online ? "在线" : "离线"}
    </Badge>
  </div>
);

const ExitIpSummary = ({ node }: { node: NodeDetail }) => (
  <div className="flex min-w-[132px] items-center gap-2 text-[12px] text-slate-700">
    <Flag flag={node.region} size="4" />
    <span className="truncate">{node.ipv4 || node.ipv6 || "-"}</span>
  </div>
);

const RateSummary = ({ live }: { live?: NodeLiveSnapshot }) => {
  const snapshot = live?.record || createEmptyLiveRecord();

  return (
    <div className="min-w-[120px] space-y-0.5">
      <Text size="1" className="block text-[12px] font-medium text-slate-900">
        ↑ {formatBytes(snapshot.network.up)}/s
      </Text>
      <Text size="1" className="block text-[12px] text-slate-600">
        ↓ {formatBytes(snapshot.network.down)}/s
      </Text>
    </div>
  );
};

const TrafficSummary = ({ live }: { live?: NodeLiveSnapshot }) => {
  const snapshot = live?.record || createEmptyLiveRecord();

  return (
    <div className="min-w-[132px] space-y-0.5">
      <Text size="1" className="block text-[12px] text-slate-700">
        ↑ {formatBytes(snapshot.network.totalUp)}
      </Text>
      <Text size="1" className="block text-[12px] text-slate-700">
        ↓ {formatBytes(snapshot.network.totalDown)}
      </Text>
    </div>
  );
};

const UptimeSummary = ({ live }: { live?: NodeLiveSnapshot }) => {
  const seconds = Math.max(0, Math.floor(live?.record.uptime ?? 0));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return (
    <Text size="1" className="block min-w-[72px] text-[12px] text-slate-700">
      {days > 0
        ? `${days}d ${hours}h`
        : hours > 0
          ? `${hours}h ${minutes}m`
          : `${minutes}m`}
    </Text>
  );
};

const SortableRow = ({
  node,
  live,
  settings
}: {
  node: NodeDetail;
  live?: NodeLiveSnapshot;
  settings: any;
}) => {
  return (
    <TableRow
      className="border-b border-slate-200/70 bg-white/60 text-[12px] transition-colors hover:bg-slate-50/85"
    >
      <TableCell>
        <StatusSummary live={live} />
      </TableCell>
      <TableCell>
        <ExitIpSummary node={node} />
      </TableCell>
      <TableCell>
        <RateSummary live={live} />
      </TableCell>
      <TableCell>
        <UptimeSummary live={live} />
      </TableCell>
      <TableCell>
        <TrafficSummary live={live} />
      </TableCell>
      <TableCell>
        <UsageBar
          percent={live?.record.cpu.usage ?? 0}
          colorClass="bg-sky-500"
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
        />
      </TableCell>
      <TableCell>
        <ActionButtons node={node} settings={settings} />
      </TableCell>
    </TableRow>
  );
};

type NodeGroupBucket = {
  label: string;
  nodes: NodeDetail[];
  onlineCount: number;
  totalUploadSpeed: number;
  totalDownloadSpeed: number;
  totalUploadTraffic: number;
  totalDownloadTraffic: number;
};

const NodeTable = ({
  nodes,
  liveByNode,
}: {
  nodes: NodeDetail[];
  liveByNode: Record<string, NodeLiveSnapshot>;
}) => {
  const { settings } = useSettings();
  const groupedNodes = React.useMemo(() => {
    const groups = new Map<string, NodeGroupBucket>();

    nodes.forEach((node) => {
      const label = getNodeGroupLabel(node);
      const existing = groups.get(label) ?? {
        label,
        nodes: [],
        onlineCount: 0,
        totalUploadSpeed: 0,
        totalDownloadSpeed: 0,
        totalUploadTraffic: 0,
        totalDownloadTraffic: 0,
      };
      const live = liveByNode[node.uuid];
      existing.nodes.push(node);
      existing.onlineCount += live?.online ? 1 : 0;
      existing.totalUploadSpeed += live?.record.network.up ?? 0;
      existing.totalDownloadSpeed += live?.record.network.down ?? 0;
      existing.totalUploadTraffic += live?.record.network.totalUp ?? 0;
      existing.totalDownloadTraffic += live?.record.network.totalDown ?? 0;
      groups.set(label, existing);
    });

    return Array.from(groups.values()).sort((left, right) => {
      if (left.label === DEFAULT_GROUP_NAME && right.label !== DEFAULT_GROUP_NAME) {
        return 1;
      }
      if (left.label !== DEFAULT_GROUP_NAME && right.label === DEFAULT_GROUP_NAME) {
        return -1;
      }
      return left.label.localeCompare(right.label, "zh-CN");
    });
  }, [liveByNode, nodes]);

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/65 bg-white/78 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <Table>
          <TableHeader className="bg-[linear-gradient(135deg,rgba(19,70,134,0.10),rgba(255,255,255,0.92),rgba(89,172,119,0.10))]">
            <TableRow>
              <TableHead>状态</TableHead>
              <TableHead>出口 IP</TableHead>
              <TableHead>速率</TableHead>
              <TableHead>开机时长</TableHead>
              <TableHead>流量</TableHead>
              <TableHead className="w-[190px]">CPU</TableHead>
              <TableHead className="w-[190px]">RAM</TableHead>
              <TableHead className="w-[190px]">存储</TableHead>
              <TableHead className="w-[150px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {groupedNodes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-sm text-slate-500">
                    当前没有匹配的节点
                  </TableCell>
                </TableRow>
              )}
              {groupedNodes.map((group) => (
                <React.Fragment key={group.label}>
                  <TableRow className="border-b border-slate-200/70 bg-slate-50/90">
                    <TableCell colSpan={9} className="px-4 py-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <Text className="text-sm font-semibold text-slate-900">
                            {group.label}
                          </Text>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                          <span>
                            <span className="font-medium text-slate-900">总速率</span>
                            {" "}
                            ↑ {formatBytes(group.totalUploadSpeed)}/s
                            {" "}
                            ↓ {formatBytes(group.totalDownloadSpeed)}/s
                          </span>
                          <span>
                            <span className="font-medium text-slate-900">总流量</span>
                            {" "}
                            ↑ {formatBytes(group.totalUploadTraffic)}
                            {" "}
                            ↓ {formatBytes(group.totalDownloadTraffic)}
                          </span>
                          <span>
                            <span className="font-medium text-slate-900">在线数</span>
                            {" "}
                            {group.onlineCount}
                          </span>
                          <span>
                            <span className="font-medium text-slate-900">机器数</span>
                            {" "}
                            {group.nodes.length}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                  {group.nodes.map((node) => (
                    <SortableRow
                      key={node.uuid}
                      node={node}
                      live={liveByNode[node.uuid]}
                      settings={settings}
                    />
                  ))}
                </React.Fragment>
              ))}
          </TableBody>
        </Table>
    </div>
  );
};

type Platform = "linux" | "windows" | "macos";
const ActionButtons = ({ node, settings }: { node: NodeDetail, settings: any }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <GenerateCommandButton node={node} settings={settings} />
      <IconButton
        title={t("terminal.title")}
        variant="ghost"
        onClick={() => {
          window.open(`/terminal?uuid=${node.uuid}`, "_blank");
        }}
      >
        <Terminal size="18" />
      </IconButton>
      <EditButton node={node} />
      <BillingButton node={node} />
      <DeleteButton node={node} />
    </div>
  );
};

export default NodeDetailsPage;
function DeleteButton({ node }: { node: NodeDetail }) {
  const { t } = useTranslation();
  const { refresh } = useNodeDetails();
  const [open, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const handleDelete = async () => {
    try {
      setDeleting(true);
      await fetch(`/api/admin/client/${node.uuid}/remove`, {
        method: "POST",
      });
      toast.success(`Delete ${node.name}`);
      setOpen(false);
      refresh();
    } catch (error) {
      toast.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setDeleting(false);
    }
  };
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <IconButton variant="ghost" color="red" title={t("delete")}>
          <Trash2Icon size="18" />
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>{t("delete")}</Dialog.Title>
        <Dialog.Description>
          {t("admin.nodeTable.confirmDelete")}
        </Dialog.Description>
        <Flex justify="end" gap="2" mt="4">
          <Dialog.Trigger>
            <Button variant="soft">{t("admin.nodeTable.cancel")}</Button>
          </Dialog.Trigger>
          <Button disabled={deleting} color="red" onClick={handleDelete}>
            {t("admin.nodeTable.confirmDelete")}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
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
}: {
  node?: NodeDetail;
  nodes?: NodeDetail[];
  settings: any;
  toolbar?: boolean;
  groupMode?: boolean;
}) {
  const availableNodes = nodes ?? (node ? [node] : []);
  const [selectedNodeId, setSelectedNodeId] = React.useState(
    node?.uuid ?? availableNodes[0]?.uuid ?? ""
  );
  const [selectedPlatform, setSelectedPlatform] =
    React.useState<Platform>("linux");
  const [installOptions, setInstallOptions] = React.useState<InstallOptions>({
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
  });

  const [enableGhproxy, setEnableGhproxy] = React.useState(false);
  const [enableCustomDir, setEnableCustomDir] = React.useState(false);
  const [enableCustomServiceName, setEnableCustomServiceName] =
    React.useState(false);
  const [enableIncludeNics, setEnableIncludeNics] = React.useState(false);
  const [enableExcludeNics, setEnableExcludeNics] = React.useState(false);
  const [enableIncludeMountpoints, setEnableIncludeMountpoints] =
    React.useState(false);
  const [enableMonthRotate, setEnableMonthRotate] = React.useState(false);
  const [groupName, setGroupName] = React.useState("");
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
    let scriptUrl =
      `https://raw.githubusercontent.com/komari-monitor/komari-agent/refs/heads/main/${scriptFile}`;
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
            ? `AUTO_DISCOVERY_FILE=${shellQuote(`${effectiveInstallDir}/auto-discovery.json`)}; if [ -f "$AUTO_DISCOVERY_FILE" ]; then if [ -r /dev/tty ]; then printf '%s' '检测到当前机器已绑定到旧节点。输入 y 清理旧绑定并重新接入新分组，其他任意键保持原绑定: ' > /dev/tty; read -r KS_RESET < /dev/tty || KS_RESET=''; else KS_RESET='y'; fi; if [ "$KS_RESET" = 'y' ] || [ "$KS_RESET" = 'Y' ]; then sudo rm -f "$AUTO_DISCOVERY_FILE"; fi; fi; ` +
              `wget -qO- ${shellQuote(scriptUrl)} | sudo bash -s -- ${shellArgs}`
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
          finalCommand += `$ksBindFile = Join-Path ${windowsInstallDir} 'auto-discovery.json'; if (Test-Path $ksBindFile) { $ksReset = Read-Host 'Detected existing binding. Enter y to clear it and rebind to the new group'; if ($ksReset -match '^(?i)y(?:es)?$') { Remove-Item $ksBindFile -Force } }; `;
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
            `if [ -f "$AUTO_DISCOVERY_FILE" ]; then if [ -r /dev/tty ]; then printf '%s' '检测到当前机器已绑定到旧节点。输入 y 清理旧绑定并重新接入新分组，其他任意键保持原绑定: ' > /dev/tty; read -r KS_RESET < /dev/tty || KS_RESET=''; else KS_RESET='y'; fi; if [ "$KS_RESET" = 'y' ] || [ "$KS_RESET" = 'Y' ]; then rm -f "$AUTO_DISCOVERY_FILE"; fi; fi; ` +
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
      toast.success(t("copy_success", "已复制到剪贴板"));
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
            className="rounded-2xl"
          >
            <Download size={16} />
            {groupMode ? "创建分组" : "一键安装命令"}
          </Button>
        ) : (
        <IconButton variant="ghost" title={t("admin.nodeTable.installCommand")}>
          <Download size="18" />
        </IconButton>
        )}
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>
          {groupMode
            ? "创建分组安装命令"
            : useAutoDiscovery
            ? `${t("admin.nodeTable.installCommand", "一键部署指令")} · 自动接入`
            : node
              ? `${t("admin.nodeTable.installCommand", "一键部署指令")} · ${activeNode?.name || "-"}`
              : t("admin.nodeTable.installCommand", "一键部署指令")}
        </Dialog.Title>
        <div className="flex flex-col gap-4">
          {useAutoDiscovery && !groupMode && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              当前使用通用自动接入命令。任意服务器执行后会自动注册到你的面板。
            </div>
          )}
          {groupMode && useAutoDiscovery && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
              输入分组名称后，复制这条命令到任意服务器执行，节点会自动注册并归入该分组。已绑定过的机器再次执行时，会先提示是否清理旧绑定。
            </div>
          )}
          {groupMode && (
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-4">
              <div className="flex flex-col gap-2">
                <label className="text-base font-bold text-slate-900">
                  分组名称
                </label>
                <TextField.Root
                  placeholder="例如：香港 / 日本 / 生产环境"
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
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        normalizedGroupName === group
                          ? "border-sky-300 bg-sky-100 text-sky-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                      }`}
                      onClick={() => setGroupName(group)}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              )}
              <Text size="1" className="text-slate-500">
                分组在首台服务器执行命令后会自动创建，不需要先手动建空分组。
              </Text>
            </div>
          )}
          {!groupMode && !useAutoDiscovery && !node && availableNodes.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-base font-bold">选择节点</label>
              <select
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
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
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              当前还没启用自动发现密钥，所以这里仍是旧的单节点模式。到“系统设置 &gt; 通用”里设置自动发现密钥后，这里会变成通用接入命令。
            </div>
          )}
          {!useAutoDiscovery && groupMode && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              先到“系统设置 &gt; 通用”里设置自动发现密钥，创建分组命令才会生效。
            </div>
          )}
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

          <Flex direction="column" gap="2">
            <label className="text-base font-bold">
              {t("admin.nodeTable.installOptions", "安装选项")}
            </label>
            <div className="grid grid-cols-2 gap-2">
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
                  {t("admin.nodeTable.disableAutoUpdate", "禁用自动更新")}
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
                  {t("admin.nodeTable.ignoreUnsafeCert", "忽略不安全证书")}
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
                  {t("admin.nodeTable.memoryModeAvailable", "监测可用内存")}
                </label>
                <Tips size="14">
                  {t("admin.nodeTable.memoryModeAvailable_tip")}
                </Tips>
              </Flex>
            </div>
            <Flex direction="column" gap="2">
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
                  {t("admin.nodeTable.ghproxy", "GitHub 代理")}
                </label>
              </Flex>
              {enableGhproxy && (
                <TextField.Root
                  // placeholder={t(
                  //   "admin.nodeTable.ghproxy_placeholder",
                  //   "GitHub 代理，为空则不使用代理"
                  // )}
                  placeholder="https://ghfast.top/"
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
                  {t("admin.nodeTable.install_dir", "安装目录")}
                </label>
              </Flex>
              {enableCustomDir && (
                <TextField.Root
                  placeholder={t(
                    "admin.nodeTable.install_dir_placeholder",
                    "安装目录，为空则使用默认目录(/opt/komari-agent)"
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
                  {t("admin.nodeTable.serviceName", "服务名称")}
                </label>
              </Flex>
              {enableCustomServiceName && (
                <TextField.Root
                  placeholder={t(
                    "admin.nodeTable.serviceName_placeholder",
                    "服务名称，为空则使用默认名称(komari-agent)"
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
                  {t("admin.nodeTable.includeNics", "只监测特定网卡")}
                </label>
              </Flex>
              {enableIncludeNics && (
                <TextField.Root
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
                  {t("admin.nodeTable.excludeNics", "排除特定网卡")}
                </label>
              </Flex>
              {enableExcludeNics && (
                <TextField.Root
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
                  {t("admin.nodeTable.includeMountpoints", "只监测特定挂载点")}
                </label>
              </Flex>
              {enableIncludeMountpoints && (
                <TextField.Root
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
                  {t("admin.nodeTable.monthRotate", "网络统计月重置")}
                </label>
              </Flex>
              {enableMonthRotate && (
                <TextField.Root
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
            </Flex>
          </Flex>
          <Flex direction="column" gap="2">
            <label className="text-base font-bold">
              {t("admin.nodeTable.generatedCommand", "生成的指令")}
            </label>
            <div className="relative">
              <TextArea
                disabled
                className="w-full"
                style={{ minHeight: "80px" }}
                value={generateCommand()}
              />
            </div>
          </Flex>
          <Flex justify="center">
            <Button
              style={{ width: "100%" }}
              disabled={copyDisabled}
              onClick={() => copyToClipboard(generateCommand())}
            >
              <Copy size={16} />
              {t("copy")}
            </Button>
          </Flex>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function EditButton({ node }: { node: NodeDetail }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { refresh } = useNodeDetails();
  const nameRef = React.useRef<HTMLInputElement>(null);
  const groupRef = React.useRef<HTMLInputElement>(null);
  const tagsRef = React.useRef<HTMLInputElement>(null);
  const publicRemarkRef = React.useRef<HTMLTextAreaElement>(null);
  const privateRemarkRef = React.useRef<HTMLTextAreaElement>(null);
  const [hidden, setHidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [traffic_limit, setTrafficLimit] = useState(0);
  const [traffic_limit_type, setTrafficLimitType] = useState("sum");

  React.useEffect(() => {
    setHidden(node.hidden);
    setTrafficLimit(node.traffic_limit || 0);
    setTrafficLimitType(node.traffic_limit_type || "sum");
  }, [node.hidden, node.traffic_limit, node.traffic_limit_type]);

  const save = async () => {
    try {
      setSaving(true);
      await fetch(`/api/admin/client/${node.uuid}/edit`, {
        method: "POST",
        body: JSON.stringify({
          name: nameRef.current?.value,
          remark: privateRemarkRef.current?.value,
          public_remark: publicRemarkRef.current?.value,
          group: groupRef.current?.value,
          tags: tagsRef.current?.value,
          hidden,
          traffic_limit,
          traffic_limit_type,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      refresh();
      setOpen(false);
      toast.success(t("admin.nodeEdit.saveSuccess", "保存成功"));
    } catch (error) {
      console.error("Error updating client:", error);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <IconButton
          variant="ghost"
          title={t("admin.nodeEdit.editInfo", "编辑信息")}
        >
          <Pencil size="18" />
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>{t("admin.nodeEdit.editInfo", "编辑信息")}</Dialog.Title>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-muted-foreground">
              {t("admin.nodeEdit.name", "名称")}
            </label>
            <TextField.Root
              defaultValue={node.name}
              placeholder={t("admin.nodeEdit.namePlaceholder", "请输入名称")}
              ref={nameRef}
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-muted-foreground">
              {t("admin.nodeEdit.token", "Token 令牌")}
            </label>
            <TextField.Root
              value={node.token}
              placeholder={t("admin.nodeEdit.tokenPlaceholder", "请输入 Token")}
              readOnly
            />
          </div>
          <div>
            <label className="mb-1 text-sm font-medium text-muted-foreground flex items-center">
              {t("common.tags")}
              <label className="text-muted-foreground ml-1 text-xs self-end">
                {t("common.tagsDescription")}
              </label>
              <Tips>
                <span
                  dangerouslySetInnerHTML={{ __html: t("common.tagsTips") }}
                />
              </Tips>
            </label>
            <TextField.Root defaultValue={node.tags} ref={tagsRef} />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-muted-foreground">
              {t("common.group")}
            </label>
            <TextField.Root defaultValue={node.group} ref={groupRef} />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-muted-foreground">
              {t("admin.nodeEdit.remark", "私有备注")}
            </label>
            <TextArea
              defaultValue={node.remark}
              ref={privateRemarkRef}
              resize={"vertical"}
              placeholder={t(
                "admin.nodeEdit.remarkPlaceholder",
                "请输入私有备注"
              )}
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-muted-foreground">
              {t("admin.nodeEdit.publicRemark", "公开备注")}
            </label>
            <TextArea
              defaultValue={node.public_remark}
              resize={"vertical"}
              placeholder={t(
                "admin.nodeEdit.publicRemarkPlaceholder",
                "请输入公开备注"
              )}
              ref={publicRemarkRef}
            />
          </div>
          <div>
            <SettingCardSwitch
              title={t("admin.nodeEdit.hidden")}
              description={t("admin.nodeEdit.hidden_description")}
              defaultChecked={hidden}
              onChange={setHidden}
            />
          </div>
          <SettingCardCollapse title={t("admin.nodeEdit.trafficLimit")}>
            <SettingCardSelect
              bordless
              title={t("admin.nodeEdit.trafficLimitType")}
              defaultValue={node.traffic_limit_type || "max"}
              options={[
                {
                  label: t("admin.nodeEdit.trafficLimitType_sum"),
                  value: "sum",
                },
                {
                  label: t("admin.nodeEdit.trafficLimitType_max"),
                  value: "max",
                },
                {
                  label: t("admin.nodeEdit.trafficLimitType_min"),
                  value: "min",
                },
                {
                  label: t("admin.nodeEdit.trafficLimitType_up"),
                  value: "up",
                },
                {
                  label: t("admin.nodeEdit.trafficLimitType_down"),
                  value: "down",
                },
              ]}
              OnSave={(value) => {
                setTrafficLimitType(value);
              }}
            />
            <SettingCardShortTextInput
              bordless
              title={t("admin.nodeEdit.trafficLimit")}
              description={t("admin.nodeEdit.trafficLimit_description")}
              defaultValue={formatBytes(traffic_limit || 0)}
              showSaveButton={false}
              onChange={(e) => {
                setTrafficLimit(stringToBytes(e.currentTarget.value));
              }}
              onBlur={(e) => {
                e.currentTarget.value = formatBytes(traffic_limit);
              }}
            ></SettingCardShortTextInput>
          </SettingCardCollapse>
        </div>
        <Flex gap="2" justify={"end"} className="mt-4">
          <Button
            type="submit"
            className="w-full"
            disabled={saving}
            onClick={save}
          >
            {saving
              ? t("admin.nodeEdit.waiting", "等待...")
              : t("save", "保存")}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function BillingButton({ node }: { node: NodeDetail }) {
  const { t } = useTranslation();
  const { refresh } = useNodeDetails();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [billingCycle, setBillingCycle] = React.useState<string>(
    node.billing_cycle.toString()
  );
  const [autoRenewal, setAutoRenewal] = React.useState<boolean>(
    node.auto_renewal || false
  );
  const [currency, setCurrency] = React.useState<string>(node.currency || "$");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const formData = new FormData(e.target as HTMLFormElement);
      const priceValue = (formData.get("price") as string) || "0";
      
      const price = parseFloat(priceValue);
      
      if (isNaN(price) || (price < 0 && price !== -1)) {
        toast.error(t("admin.nodeTable.invalidPrice"));
        return;
      }
      const billingCycleValue = parseInt(
        (formData.get("billingCycle") as string) || "30"
      );
      const expiredAtValue = (formData.get("expiredAt") as string) || "";
      const currencyValue = (formData.get("currency") as string) || "$";

      await fetch(`/api/admin/client/${node.uuid}/edit`, {
        method: "POST",
        body: JSON.stringify({
          price,
          billing_cycle: billingCycleValue,
          expired_at: expiredAtValue,
          currency: currencyValue,
          auto_renewal: autoRenewal,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      refresh();
      setOpen(false);
    } catch (error) {
      toast.error("Failed to save billing information:" + error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <IconButton
          variant="ghost"
          title={t("admin.nodeTable.billing", "账单")}
        >
          <CircleDollarSign size="18" />
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>{t("admin.nodeTable.billing", "账单")}</Dialog.Title>
        <form onSubmit={handleSave}>
          <Flex direction="column" gap="2">
            <label className="font-bold">
              <label>{t("admin.nodeTable.price")}</label>
              <label className="text-muted-foreground text-sm ml-1 font-medium">
                {t("admin.nodeTable.priceTips")}
              </label>
            </label>
            <TextField.Root name="price" defaultValue={node.price} />

            <label className="font-bold">
              <label>{t("admin.nodeTable.currency", "货币")}</label>
              <label className="text-muted-foreground text-sm ml-1 font-medium">
                {t("admin.nodeTable.currencyTips")}
              </label>
            </label>
            <TextField.Root
              name="currency"
              defaultValue={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />

            <label className="font-bold flex items-center gap-1">
              {t("admin.nodeTable.billingCycle")} <Tips><span dangerouslySetInnerHTML={{ __html: t("admin.nodeTable.billingCycleTips") }}></span></Tips>
            </label>
            <SelectOrInput
            options={[
              { label: t("common.monthly"), value: "30" },
              { label: t("common.quarterly"), value: "92" },
              { label: t("common.semi_annual"), value: "184" },
              { label: t("common.annual"), value: "365" },
              { label: t("common.biennial"), value: "730" },
              { label: t("common.triennial"), value: "1095" },
              { label: t("common.quinquennial"), value: "1825" },
              { label: t("common.once"), value: "-1" },
            ]}
            type="number"
            name="billingCycle"
            value={billingCycle === "0" ? "" : billingCycle}
            onChange={setBillingCycle}
          />

            <Flex gap="2" align="center">
              <label className="font-bold">
                {t("admin.nodeTable.expiredAt")}
              </label>
            </Flex>
            <TextField.Root
              name="expiredAt"
              defaultValue={
                node.expired_at
                  ? new Date(node.expired_at).toISOString().slice(0, 10)
                  : "0001-01-01"
              }
              type="date"
            >
              <TextField.Slot side="right">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const dateInput = document.querySelector(
                      'input[name="expiredAt"]'
                    ) as HTMLInputElement;
                    if (dateInput) {
                      const futureDate = new Date();
                      futureDate.setFullYear(futureDate.getFullYear() + 200);
                      dateInput.value = futureDate.toISOString().slice(0, 10);
                    }
                  }}
                >
                  {t("admin.nodeTable.setToLongTerm", "设置为长期")}
                </Button>
              </TextField.Slot>
            </TextField.Root>
            <Flex gap="2" align="center"></Flex>
            <SettingCardSwitch
              title={t("admin.nodeTable.autoRenewal")}
              description={t("admin.nodeTable.autoRenewalDescription")}
              defaultChecked={node.auto_renewal || false}
              onChange={setAutoRenewal}
            />
            <Button type="submit" disabled={saving}>
              {t("save")}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}

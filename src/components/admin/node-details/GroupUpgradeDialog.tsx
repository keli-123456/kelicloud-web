import * as React from "react";
import { t as translate } from "i18next";
import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  TextArea,
} from "@/components/admin/admin-ui";
import {
  useNodeDetails,
  type NodeDetail,
} from "@/contexts/NodeDetailsContext";
import type { SettingsResponse } from "@/lib/api";
import { buildAgentInstallScriptURL } from "@/lib/installScriptSource";
import type { Record as LiveRecord } from "@/types/LiveData";
import { formatBytes } from "@/utils/unitHelper";

const NODE_DIALOG_CONTENT_CLASS =
  "max-h-[90vh] w-[min(96vw,760px)] overflow-y-auto overscroll-contain rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-2xl [scrollbar-gutter:stable] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/95";
const NODE_DIALOG_FOOTER_CLASS =
  "mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end";

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
  clientIds: string[];
};

type NodeUpgradeState = {
  status: UpgradeExecutionStatus;
  taskId?: string;
  output: string;
  exitCode: number | null;
  finishedAt: string | null;
};

type Platform = "linux" | "windows" | "macos";

const getNodeGroupLabel = (node: NodeDetail) => {
  const groupName = String(node.group || "").trim();
  return (
    groupName ||
    translate("admin.nodeTable.defaultGroup", {
      defaultValue: "Default group",
    })
  );
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

const formatNodeIp = (value?: string) => {
  const normalized = String(value || "").trim();
  return normalized || "-";
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

const shellQuote = (value: string) => `'${value.replace(/'/g, `'"'"'`)}'`;

const powershellQuote = (value: string) => `'${value.replace(/'/g, "''")}'`;

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
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load latest agent release (GitHub HTTP ${response.status})`,
    );
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
        .filter((value): value is string => Boolean(value)),
    ),
  );
  if (requiredAssets.length === 0) {
    return releaseTag;
  }

  const publishedAssets = new Set(
    (payload.assets || [])
      .map((asset) => String(asset?.name || "").trim())
      .filter(Boolean),
  );
  const missingAssets = requiredAssets.filter(
    (assetName) => !publishedAssets.has(assetName),
  );
  if (missingAssets.length > 0) {
    throw new Error(
      `Agent release ${releaseTag} is not fully published yet. Missing assets: ${missingAssets.join(", ")}`,
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
  installVersion?: string,
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
      "install.ps1",
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
          `Write-Output 'Agent upgrade scheduled. The node may go offline briefly while the service restarts.${targetVersionMessage}'`,
      )
    );
  }

  const scriptUrl = buildAgentInstallScriptURL(
    settings.base_scripts_url,
    "install.sh",
  );
  const shellArgsList = ["-e", host, "-t", token];
  if (pinnedVersion) {
    shellArgsList.push("--install-version", pinnedVersion);
  }
  const shellArgs = shellArgsList.map(shellQuote).join(" ");
  const shellName = platform === "macos" ? "zsh" : "bash";
  const installCommand = [
    "set -eu",
    'TMP_SCRIPT="$(mktemp)"',
    'cleanup() { rm -f "$TMP_SCRIPT"; }',
    "trap cleanup EXIT",
    `if command -v curl >/dev/null 2>&1; then curl -fsSL ${shellQuote(
      scriptUrl,
    )} > "$TMP_SCRIPT"; else wget -qO- ${shellQuote(scriptUrl)} > "$TMP_SCRIPT"; fi`,
    'chmod +x "$TMP_SCRIPT"',
    `if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then sudo ${shellName} "$TMP_SCRIPT" ${shellArgs}; else ${shellName} "$TMP_SCRIPT" ${shellArgs}; fi`,
  ].join("; ");

  return [
    `INSTALL_CMD=${shellQuote(installCommand)}`,
    'if command -v systemd-run >/dev/null 2>&1 && systemctl list-units >/dev/null 2>&1; then UNIT="komari-agent-upgrade-$(date +%s)"; systemd-run --unit "$UNIT" --collect /bin/sh -lc "$INSTALL_CMD"; STATUS=$?; else nohup /bin/sh -lc "$INSTALL_CMD" >/tmp/komari-agent-upgrade.log 2>&1 </dev/null & STATUS=$?; fi',
    'if [ "$STATUS" -ne 0 ]; then exit "$STATUS"; fi',
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
      snapshot.network.down,
    )}/s`,
    `${translate("admin.nodeTable.detailTooltip.traffic", {
      defaultValue: "Traffic",
    })}: ↑ ${formatBytes(snapshot.network.totalUp)} / ↓ ${formatBytes(
      snapshot.network.totalDown,
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
    })}: ${formatDateTimeLabel(snapshot.time)}`,
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

export default function GroupUpgradeDialog({
  open,
  onOpenChange,
  groupName,
  nodes,
  liveByNode,
  settings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  nodes: NodeDetail[];
  liveByNode: Record<string, NodeLiveSnapshot>;
  settings: SettingsResponse;
}) {
  const { t } = useTranslation();
  const { refresh } = useNodeDetails();
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
          String(node.token || "").trim().length > 0,
      ),
    [liveByNode, nodes],
  );

  const updateResultState = React.useCallback(
    (
      updater:
        | Record<string, NodeUpgradeState>
        | ((
            previous: Record<string, NodeUpgradeState>,
          ) => Record<string, NodeUpgradeState>),
    ) => {
      const next =
        typeof updater === "function"
          ? updater(resultStateRef.current)
          : updater;
      resultStateRef.current = next;
      setResultState(next);
    },
    [],
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
        (item) => item.status === "failed" || item.status === "timeout",
      ).length;
      const successCount = Object.values(finalStates).filter(
        (item) => item.status === "success",
      ).length;

      setStatus(
        forceTimeout
          ? "timeout"
          : failedCount > 0
            ? "failed"
            : successCount > 0
              ? "success"
              : "idle",
      );

      if (forceTimeout) {
        toast.warning(
          t("admin.nodeTable.upgradeTimeoutToast", {
            groupName,
            defaultValue:
              "{{groupName}} upgrade timed out. Please check node status manually.",
          }),
        );
      } else if (failedCount > 0) {
        toast.error(
          t("admin.nodeTable.upgradeMixedResultToast", {
            groupName,
            successCount,
            failedCount,
            defaultValue:
              "{{groupName}} upgrade finished: {{successCount}} succeeded, {{failedCount}} failed.",
          }),
        );
      } else {
        toast.success(
          t("admin.nodeTable.upgradeSuccessToast", {
            groupName,
            successCount,
            defaultValue:
              "{{groupName}} upgrade finished on {{successCount}} node(s).",
          }),
        );
      }

      await refresh();
    },
    [groupName, refresh, t],
  );

  const pollTaskResult = React.useCallback(
    async (task: UpgradeTask) => {
      const response = await fetch(`/api/admin/task/${task.taskId}/result`);
      const payload = (await response.json().catch(() => ({}))) as TaskResultResponse;
      if (!response.ok || payload.status === "error") {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }

      const matchedResult = (payload.results || payload.data || []).find(
        (item) => item.client === task.clientIds[0],
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
    [updateResultState],
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
                    error instanceof Error ? error.message : String(error),
                  exitCode: -1,
                  finishedAt: new Date().toISOString(),
                },
              }));
              return true;
            }),
          ),
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
    [clearPolling, finalizeExecution, pollTaskResult, updateResultState],
  );

  const handleUpgrade = async () => {
    if (onlineNodes.length === 0) {
      toast.error(
        t("admin.nodeTable.upgradeNoOnlineToast", {
          groupName,
          defaultValue: "No online nodes available in {{groupName}} for upgrade.",
        }),
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
      ]),
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
              }),
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
              }),
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
            clientIds: [node.uuid],
          } satisfies UpgradeTask;
        }),
      );

      const tasks = settled
        .filter(
          (
            item,
          ): item is PromiseFulfilledResult<UpgradeTask> =>
            item.status === "fulfilled",
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
        }),
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
        (item) => item.status === "failed" || item.status === "timeout",
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
    [onlineNodes, resultState],
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
          <div className="dialog-section px-3 py-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t("admin.nodeTable.upgradeOnlineNodes", "Online nodes")}
            </div>
            <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
              {onlineNodes.length}
            </div>
          </div>
          <div className="dialog-section px-3 py-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t("admin.nodeTable.upgradeRunning", "Running")}
            </div>
            <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
              {summary.pending + summary.running}
            </div>
          </div>
          <div className="rounded-[24px] border border-emerald-200/80 bg-emerald-50/92 px-3 py-3 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <div className="text-xs text-emerald-700 dark:text-emerald-300">
              {t("admin.nodeTable.upgradeSuccessShort", "Succeeded")}
            </div>
            <div className="mt-1 text-base font-semibold text-emerald-800">
              {summary.success}
            </div>
          </div>
          <div className="rounded-[24px] border border-rose-200/80 bg-rose-50/92 px-3 py-3 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/30">
            <div className="text-xs text-rose-700 dark:text-rose-300">
              {t("admin.nodeTable.upgradeFailedShort", "Failed")}
            </div>
            <div className="mt-1 text-base font-semibold text-rose-800">
              {summary.failed}
            </div>
          </div>
        </div>

        <div className="dialog-section mt-4 overflow-hidden px-0 py-0">
          <div className="border-b border-slate-200/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800/80 dark:text-slate-300">
            {t("admin.nodeTable.upgradeStatusTitle", "Node execution status")}
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable]">
            {onlineNodes.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
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
                    className="flex flex-col gap-3 rounded-[20px] border border-slate-200/80 bg-white/76 px-3 py-3 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/30 sm:flex-row sm:items-center sm:justify-between"
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
              className="min-h-44 rounded-[20px] border-slate-200 bg-slate-50/90 font-mono text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
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
            ) : null}
            {t("admin.nodeTable.upgradeStart", "Start upgrade")}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

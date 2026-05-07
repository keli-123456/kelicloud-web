import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Play,
  RefreshCw,
  Search,
  Terminal,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { useCommandClipboard } from "@/contexts/CommandClipboardContext";
import { type NodeDetail, useNodeDetails } from "@/contexts/NodeDetailsContext";
import { formatApiErrorMessage, getReadableErrorMessage } from "@/lib/apiErrorMessage";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  CloudReadonlyCodeBlock,
  cloudDialogWideContentClassName,
  cloudLongTextClassName,
} from "@/components/admin/cloud/cloud-ui";

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

type ExecutionStatus = "idle" | "running" | "success" | "failed" | "timeout";

type ExecutionState = {
  taskId: string;
  scriptId: number;
  scriptName: string;
  status: ExecutionStatus;
  result: TaskResult | null;
};

export type CloudInstanceScriptTarget = {
  providerLabel: string;
  instanceName: string;
  instanceIdentifier: string;
  addresses: string[];
  groupHint?: string;
};

type CloudInstanceScriptDialogProps = {
  open: boolean;
  target: CloudInstanceScriptTarget | null;
  onOpenChange: (open: boolean) => void;
};

function normalizeMatchValue(value: string) {
  return value.trim().toLowerCase();
}

function buildSearchTokens(value: string) {
  return normalizeMatchValue(value)
    .split(/\s+/)
    .filter(Boolean);
}

function commandMatchesSearch(command: {
  name: string;
  text: string;
  remark: string;
}, rawSearch: string) {
  const tokens = buildSearchTokens(rawSearch);
  if (tokens.length === 0) {
    return true;
  }

  const haystack = normalizeMatchValue([
    command.name,
    command.remark,
    command.text,
  ].join("\n"));

  return tokens.every((token) => haystack.includes(token));
}

function normalizeAddresses(addresses: string[]) {
  return Array.from(
    new Set(
      addresses
        .map((value) => normalizeMatchValue(value))
        .filter((value) => value && value !== "-"),
    ),
  );
}

function findNodeMatch(nodes: NodeDetail[], target: CloudInstanceScriptTarget | null) {
  if (!target) return null;

  const addresses = normalizeAddresses(target.addresses);
  const instanceName = normalizeMatchValue(target.instanceName);

  const tryMatch = (candidates: NodeDetail[]) => {
    if (addresses.length) {
      const addressMatch = candidates.find((node) => {
        const nodeAddresses = normalizeAddresses([String(node.ipv4 || ""), String(node.ipv6 || "")]);
        return nodeAddresses.some((address) => addresses.includes(address));
      });
      if (addressMatch) {
        return addressMatch;
      }
    }

    if (instanceName) {
      const nameMatch = candidates.find((node) => normalizeMatchValue(String(node.name || "")) === instanceName);
      if (nameMatch) {
        return nameMatch;
      }
    }

    return null;
  };

  const normalizedGroupHint = normalizeMatchValue(target.groupHint || "");
  const groupedNodes = normalizedGroupHint
    ? nodes.filter((node) => normalizeMatchValue(String(node.group || "")) === normalizedGroupHint)
    : nodes;

  return tryMatch(groupedNodes) || (groupedNodes === nodes ? null : tryMatch(nodes));
}

export default function CloudInstanceScriptDialog({
  open,
  target,
  onOpenChange,
}: CloudInstanceScriptDialogProps) {
  const { t } = useTranslation();
  const { commands, loading, error } = useCommandClipboard();
  const {
    nodeDetail,
    isLoading: nodeLoading,
    error: nodeError,
    refresh,
  } = useNodeDetails();
  const [executingCommandId, setExecutingCommandId] = React.useState<number | null>(null);
  const [executionState, setExecutionState] = React.useState<ExecutionState | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const pollingIntervalRef = React.useRef<number | null>(null);
  const pollingTimeoutRef = React.useRef<number | null>(null);
  const deferredSearchTerm = React.useDeferredValue(searchTerm);

  const matchedNode = React.useMemo(
    () => findNodeMatch(nodeDetail, target),
    [nodeDetail, target],
  );
  const orderedCommands = React.useMemo(
    () => [...commands].sort((left, right) => {
      if (right.weight !== left.weight) {
        return right.weight - left.weight;
      }
      return right.id - left.id;
    }),
    [commands],
  );
  const filteredCommands = React.useMemo(
    () => orderedCommands.filter((command) => commandMatchesSearch(command, deferredSearchTerm)),
    [deferredSearchTerm, orderedCommands],
  );
  const resolvedAddresses = React.useMemo(
    () => normalizeAddresses(target?.addresses || []),
    [target],
  );

  const clearPolling = React.useCallback(() => {
    if (pollingIntervalRef.current !== null) {
      window.clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current !== null) {
      window.clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    if (!open) {
      setExecutingCommandId(null);
      setExecutionState(null);
      setSearchTerm("");
      clearPolling();
    }
  }, [clearPolling, open]);

  React.useEffect(() => {
    return () => {
      clearPolling();
    };
  }, [clearPolling]);

  const pollTaskResult = React.useCallback(
    async (taskId: string, clientId: string, scriptName: string) => {
      const response = await fetch(`/api/admin/task/${taskId}/result`);
      const payload = (await response.json().catch(() => ({}))) as TaskResultResponse;
      if (!response.ok || payload.status === "error") {
        throw new Error(formatApiErrorMessage(payload.message || `HTTP ${response.status}`, { status: response.status }));
      }

      const results = payload.results || payload.data || [];
      const matchedResult =
        results.find((item) => item.client === clientId) ||
        results[0] ||
        null;

      setExecutionState((previous) => {
        if (!previous || previous.taskId !== taskId) {
          return previous;
        }

        if (!matchedResult) {
          return previous;
        }

        if (!matchedResult.finished_at) {
          return {
            ...previous,
            status: "running",
            result: matchedResult,
          };
        }

        return {
          ...previous,
          status: matchedResult.exit_code === 0 ? "success" : "failed",
          result: matchedResult,
        };
      });

      if (matchedResult?.finished_at) {
        clearPolling();
        if (matchedResult.exit_code === 0) {
          toast.success(
            t("cloud.script.completed", {
              script: scriptName || taskId,
              defaultValue: `Script completed: ${scriptName || taskId}`,
            }),
          );
        } else {
          toast.error(
            t("cloud.script.failed", {
              script: scriptName || taskId,
              defaultValue: `Script failed: ${scriptName || taskId}`,
            }),
          );
        }
      }
    },
    [clearPolling, t],
  );

  const startPolling = React.useCallback(
    (taskId: string, clientId: string, scriptName: string) => {
      clearPolling();

      const run = () => {
        void pollTaskResult(taskId, clientId, scriptName).catch((error) => {
          clearPolling();
          toast.error(getReadableErrorMessage(error, t("common.error", "Error")));
          setExecutionState((previous) =>
            previous && previous.taskId === taskId
              ? { ...previous, status: "failed" }
              : previous,
          );
        });
      };

      run();

      pollingIntervalRef.current = window.setInterval(run, 2000);
      pollingTimeoutRef.current = window.setTimeout(() => {
        clearPolling();
        setExecutionState((previous) =>
          previous && previous.taskId === taskId
            ? { ...previous, status: "timeout" }
            : previous,
        );
        toast.warning(
          t("cloud.script.timeout", "Script execution timed out. Refresh the task result later."),
        );
      }, 60000);
    },
    [clearPolling, pollTaskResult, t],
  );

  const handleRunCommand = async (commandId: number, scriptName: string, scriptText: string) => {
    if (!matchedNode) {
      toast.error(
        t(
          "cloud.script.unmatched",
          "No matching Komari node was found. Make sure the agent is connected and the IP or hostname can be matched.",
        ),
      );
      return;
    }

    clearPolling();
    setExecutingCommandId(commandId);
    setExecutionState({
      taskId: "",
      scriptId: commandId,
      scriptName,
      status: "running",
      result: null,
    });
    try {
      const response = await fetch("/api/admin/task/exec", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command: scriptText,
          clients: [matchedNode.uuid],
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as ExecResponse;
      if (!response.ok || payload.status === "error") {
        throw new Error(formatApiErrorMessage(payload.message || `HTTP ${response.status}`, { status: response.status }));
      }

      const taskId = payload.data?.task_id || payload.task_id || "";
      if (!taskId) {
        throw new Error(t("cloud.script.no_task_id", "No task ID was returned"));
      }

      setExecutionState({
        taskId,
        scriptId: commandId,
        scriptName,
        status: "running",
        result: null,
      });

      toast.success(
        t("cloud.script.submitted", {
          node: matchedNode.name || matchedNode.uuid,
          script: scriptName,
          defaultValue: `Script ${scriptName} was dispatched to ${matchedNode.name || matchedNode.uuid}${taskId ? ` (task ${taskId})` : ""}`,
        }),
      );
      startPolling(taskId, matchedNode.uuid, scriptName);
    } catch (error) {
      setExecutionState((previous) =>
        previous
          ? {
            ...previous,
            status: "failed",
          }
          : null,
      );
      toast.error(getReadableErrorMessage(error, t("common.error", "Error")));
    } finally {
      setExecutingCommandId(null);
    }
  };

  const executionBadge = React.useMemo(() => {
    if (!executionState) return null;

    switch (executionState.status) {
      case "success":
        return {
          icon: <CheckCircle2 className="h-4 w-4" />,
          className:
            "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300",
          label: t("cloud.script.status_success", "Success"),
        };
      case "failed":
        return {
          icon: <XCircle className="h-4 w-4" />,
          className:
            "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300",
          label: t("cloud.script.status_failed", "Failed"),
        };
      case "timeout":
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          className:
            "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
          label: t("cloud.script.status_timeout", "Timed out"),
        };
      default:
        return {
          icon: <Clock3 className="h-4 w-4" />,
          className:
            "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300",
          label: t("cloud.script.status_running", "Running"),
        };
    }
  }, [executionState, t]);

  const outputText = executionState?.result?.result || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cloudDialogWideContentClassName}
      >
        <DialogHeader>
          <DialogTitle>
            {t("cloud.script.dialog_title", "Run Script")}
          </DialogTitle>
          <DialogDescription>
            {t("cloud.script.dialog_description", {
              defaultValue: "Choose a saved script and execute it directly on the matched Komari node for this instance.",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
            <div className={`font-medium text-slate-900 dark:text-slate-100 ${cloudLongTextClassName}`}>
              {target?.providerLabel || "-"} / {target?.instanceName || target?.instanceIdentifier || "-"}
            </div>
            {resolvedAddresses.length ? (
              <div className={`mt-1 text-xs text-slate-500 dark:text-slate-400 ${cloudLongTextClassName}`}>
                IP: {resolvedAddresses.join(", ")}
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {t("cloud.script.matched_node", "Matched Node")}
                </div>
                <div className={`mt-1 text-xs text-slate-500 dark:text-slate-400 ${cloudLongTextClassName}`}>
                  {t("cloud.script.matched_node_help", {
                    defaultValue: "Match by group and IP first, then fall back to the instance name.",
                  })}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refresh()}
                disabled={nodeLoading}
                className="shrink-0 self-start sm:self-auto"
              >
                <RefreshCw className={`mr-1 h-3.5 w-3.5${nodeLoading ? " animate-spin" : ""}`} />
                {t("cloud.script.refresh_nodes", "Refresh Nodes")}
              </Button>
            </div>

            {nodeError ? (
              <div className={`mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300 ${cloudLongTextClassName}`}>
                {nodeError}
              </div>
            ) : matchedNode ? (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                <div className={`font-medium ${cloudLongTextClassName}`}>
                  {matchedNode.name || matchedNode.uuid}
                </div>
                <div className={`mt-1 text-xs text-emerald-700 dark:text-emerald-400 ${cloudLongTextClassName}`}>
                  {matchedNode.uuid}
                  {matchedNode.group ? ` / ${matchedNode.group}` : ""}
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className={cloudLongTextClassName}>
                    {t(
                      "cloud.script.unmatched",
                      "No matching Komari node was found. Make sure the agent is connected and the IP or hostname can be matched.",
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {executionState ? (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {t("cloud.script.latest_task", "Latest execution status")}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {executionState.scriptName}
                    {executionState.taskId
                      ? ` / ${t("cloud.script.task_id", "Task ID")}: ${executionState.taskId}`
                      : ""}
                  </div>
                </div>
                {executionBadge ? (
                  <div
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${executionBadge.className}`}
                  >
                    {executionBadge.icon}
                    {executionBadge.label}
                  </div>
                ) : null}
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t("cloud.script.exit_code", "Exit Code")}
                  </div>
                  <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                    {executionState.result?.exit_code ?? "-"}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t("cloud.script.finished_at", "Finished At")}
                  </div>
                  <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                    {executionState.result?.finished_at
                      ? new Date(executionState.result.finished_at).toLocaleString()
                      : t("cloud.script.pending", "Waiting for result")}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                  {t("cloud.script.output", "Output")}
                </div>
                <CloudReadonlyCodeBlock
                  value={outputText}
                  placeholder={t("cloud.script.output_placeholder", "Task output will appear here.")}
                />
              </div>

              {executionState.taskId ? (
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!matchedNode) return;
                      void pollTaskResult(
                        executionState.taskId,
                        matchedNode.uuid,
                        executionState.scriptName,
                      ).catch((error) => {
                        toast.error(getReadableErrorMessage(error, t("common.error", "Error")));
                      });
                    }}
                  >
                    <RefreshCw className="mr-1 h-3.5 w-3.5" />
                    {t("cloud.script.refresh_status", "Refresh Status")}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                <Terminal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                {t("exec.savedCommands", { defaultValue: "Command library" })}
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={t("command_clipboard.search_placeholder", {
                    defaultValue: "Search by script name, remark, or content",
                  })}
                  className="pl-9"
                />
              </div>
            </div>

            {error ? (
              <div className={`rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 ${cloudLongTextClassName}`}>
                {getReadableErrorMessage(error)}
              </div>
            ) : loading ? (
              <div className="space-y-3 rounded-lg border border-dashed border-slate-200 px-3 py-3 dark:border-slate-800">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : orderedCommands.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                {t("cloud.script.empty", "No saved scripts yet.")}
              </div>
            ) : filteredCommands.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                {t("command_clipboard.search_empty", "No matching scripts")}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCommands.map((command) => (
                  <div
                    key={command.id}
                    className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/40"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {command.name}
                        </div>
                        <div className={`mt-1 text-xs text-slate-500 dark:text-slate-400 ${cloudLongTextClassName}`}>
                          {command.text.split("\n").map((line) => line.trim()).find(Boolean) || "-"}
                        </div>
                        {command.remark ? (
                          <div className={`mt-1 text-xs text-slate-400 dark:text-slate-500 ${cloudLongTextClassName}`}>
                            {command.remark}
                          </div>
                        ) : null}
                      </div>
                      <Button
                        size="sm"
                        disabled={!matchedNode || executionState?.status === "running" || executingCommandId !== null}
                        onClick={() => {
                          void handleRunCommand(command.id, command.name, command.text);
                        }}
                      >
                        <Play className="mr-1 h-3.5 w-3.5" />
                        {executingCommandId === command.id ||
                        (executionState?.status === "running" && executionState.scriptId === command.id)
                          ? t("cloud.script.running", "Running...")
                          : t("cloud.script.run", "Run")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

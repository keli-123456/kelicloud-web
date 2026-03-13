import React from "react";
import { AlertCircle, Play, RefreshCw, Terminal } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { useCommandClipboard } from "@/contexts/CommandClipboardContext";
import { type NodeDetail, useNodeDetails } from "@/contexts/NodeDetailsContext";
import { Button, Dialog } from "@/components/ui/compat";

type ExecResponse = {
  success?: boolean;
  task_id?: string;
  message?: string;
  status?: string;
  data?: {
    task_id?: string;
  };
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
  const resolvedAddresses = React.useMemo(
    () => normalizeAddresses(target?.addresses || []),
    [target],
  );

  React.useEffect(() => {
    if (!open) {
      setExecutingCommandId(null);
    }
  }, [open]);

  const handleRunCommand = async (commandId: number, scriptName: string, scriptText: string) => {
    if (!matchedNode) {
      toast.error(
        t(
          "cloud.script.unmatched",
          "未找到对应的 Komari 节点，请先确认 agent 已接入并且 IP 或主机名可以匹配。",
        ),
      );
      return;
    }

    setExecutingCommandId(commandId)
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
        throw new Error(payload.message || `HTTP ${response.status}`);
      }

      const taskId = payload.data?.task_id || payload.task_id || "";
      toast.success(
        t("cloud.script.submitted", {
          node: matchedNode.name || matchedNode.uuid,
          script: scriptName,
          defaultValue: `脚本 ${scriptName} 已下发到 ${matchedNode.name || matchedNode.uuid}${taskId ? `（任务 ${taskId}）` : ""}`,
        }),
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error", "Error"));
    } finally {
      setExecutingCommandId(null);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="max-h-[80vh] overflow-y-auto">
        <Dialog.Title>
          {t("cloud.script.dialog_title", "执行脚本")}
        </Dialog.Title>
        <Dialog.Description>
          {t("cloud.script.dialog_description", {
            defaultValue: "从脚本库里选择脚本，直接对当前实例对应的 Komari 节点执行。",
          })}
        </Dialog.Description>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div className="font-medium text-slate-900">
              {target?.providerLabel || "-"} / {target?.instanceName || target?.instanceIdentifier || "-"}
            </div>
            {resolvedAddresses.length ? (
              <div className="mt-1 text-xs text-slate-500">
                IP: {resolvedAddresses.join(", ")}
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-slate-900">
                  {t("cloud.script.matched_node", "匹配节点")}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {t("cloud.script.matched_node_help", {
                    defaultValue: "优先按分组和 IP 匹配，找不到时回退到名称匹配。",
                  })}
                </div>
              </div>
              <Button
                variant="outline"
                size="1"
                onClick={refresh}
                disabled={nodeLoading}
              >
                <RefreshCw className={`mr-1 h-3.5 w-3.5${nodeLoading ? " animate-spin" : ""}`} />
                {t("cloud.script.refresh_nodes", "刷新节点")}
              </Button>
            </div>

            {nodeError ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {nodeError}
              </div>
            ) : matchedNode ? (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <div className="font-medium">
                  {matchedNode.name || matchedNode.uuid}
                </div>
                <div className="mt-1 text-xs text-emerald-700">
                  {matchedNode.uuid}
                  {matchedNode.group ? ` / ${matchedNode.group}` : ""}
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {t(
                      "cloud.script.unmatched",
                      "未找到对应的 Komari 节点，请先确认 agent 已接入并且 IP 或主机名可以匹配。",
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-900">
              <Terminal className="h-4 w-4 text-slate-500" />
              {t("exec.savedCommands", { defaultValue: "脚本库" })}
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                {error.message}
              </div>
            ) : loading ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500">
                {t("loading", "加载中...")}
              </div>
            ) : orderedCommands.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500">
                {t("cloud.script.empty", "脚本库里还没有脚本。")}
              </div>
            ) : (
              <div className="space-y-3">
                {orderedCommands.map((command) => (
                  <div
                    key={command.id}
                    className="rounded-lg border border-slate-200 px-3 py-3"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900">
                          {command.name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {command.text.split("\n").map((line) => line.trim()).find(Boolean) || "-"}
                        </div>
                        {command.remark ? (
                          <div className="mt-1 text-xs text-slate-400">
                            {command.remark}
                          </div>
                        ) : null}
                      </div>
                      <Button
                        size="1"
                        disabled={!matchedNode || executingCommandId !== null}
                        onClick={() => {
                          void handleRunCommand(command.id, command.name, command.text);
                        }}
                      >
                        <Play className="mr-1 h-3.5 w-3.5" />
                        {executingCommandId === command.id
                          ? t("cloud.script.running", "执行中...")
                          : t("cloud.script.run", "执行")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

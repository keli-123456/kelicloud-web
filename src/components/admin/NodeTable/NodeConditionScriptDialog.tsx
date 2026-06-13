import * as React from "react";
import { Activity, Clock3, Play, RefreshCw, Save, ScrollText, Trash2 } from "lucide-react";
import { t } from "i18next";
import { toast } from "sonner";

import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  Select,
  Switch,
  TextField,
} from "@/components/admin/admin-ui";
import { AdminDialogLayout } from "@/components/admin/AdminForm";
import {
  ADMIN_FORM_CONTEXT_CARD_CLASS,
  ADMIN_FORM_EMPTY_CLASS,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_GRID_2_CLASS,
  ADMIN_FORM_HELP_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_FORM_LIST_PANEL_CLASS,
  ADMIN_FORM_SECTION_CLASS,
} from "@/components/admin/AdminFormStyles";
import {
  type ClientConditionScriptRule,
  type ClientConditionScriptStatus,
  type ClientConditionScriptTrigger,
  deleteClientConditionScriptRule,
  getClientConditionScriptRule,
  listClientConditionScriptTriggers,
  runClientConditionScriptNow,
  saveClientConditionScriptRule,
} from "@/lib/clientConditionScript";
import { getReadableErrorMessage } from "@/lib/apiErrorMessage";
import { useCommandClipboard } from "@/contexts/CommandClipboardContext";
import { cn } from "@/lib/utils";

type NodeConditionScriptTarget = {
  uuid: string;
  name?: string;
  group?: string;
};

type FormState = {
  enabled: boolean;
  commandId: string;
  triggerBlocked: boolean;
  triggerDegraded: boolean;
  failureThreshold: string;
  cooldownMinutes: string;
};

const DEFAULT_FORM: FormState = {
  enabled: false,
  commandId: "",
  triggerBlocked: true,
  triggerDegraded: true,
  failureThreshold: "2",
  cooldownMinutes: "10",
};

const NODE_DIALOG_SECTION_CLASS = ADMIN_FORM_SECTION_CLASS;
const NODE_DIALOG_INFO_CLASS = ADMIN_FORM_CONTEXT_CARD_CLASS;

function buildForm(rule: ClientConditionScriptRule | null): FormState {
  if (!rule) {
    return DEFAULT_FORM;
  }
  return {
    enabled: rule.enabled,
    commandId: rule.command_id ? String(rule.command_id) : "",
    triggerBlocked: rule.trigger_statuses.includes("blocked_suspected"),
    triggerDegraded: rule.trigger_statuses.includes("degraded"),
    failureThreshold: String(rule.failure_threshold || 2),
    cooldownMinutes: String(Math.max(1, Math.round((rule.cooldown_seconds || 600) / 60))),
  };
}

function parsePositiveInteger(label: string, value: string) {
  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(t("admin.nodeTable.conditionScript.invalidPositive", {
      defaultValue: `${label} 必须大于 0`,
      label,
    }));
  }
  return parsed;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function getTriggerStatusTone(status: string) {
  switch (status) {
    case "submitted":
      return "green" as const;
    case "failed":
      return "red" as const;
    case "skipped":
      return "amber" as const;
    default:
      return "gray" as const;
  }
}

function getTriggerStatusLabel(status: string) {
  switch (status) {
    case "submitted":
      return t("admin.nodeTable.conditionScript.triggerSubmitted", "已提交");
    case "failed":
      return t("admin.nodeTable.conditionScript.triggerFailed", "失败");
    case "skipped":
      return t("admin.nodeTable.conditionScript.triggerSkipped", "已跳过");
    default:
      return status || "-";
  }
}

function getConnectivityLabel(status: string) {
  switch (status) {
    case "blocked_suspected":
      return t("admin.nodeTable.cnConnectivityBlocked", "疑似被墙");
    case "degraded":
      return t("admin.nodeTable.cnConnectivityDegraded", "国内异常");
    case "ok":
      return "OK";
    default:
      return status || "-";
  }
}

export function NodeConditionScriptDialog({
  item,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  item: NodeConditionScriptTarget;
  trigger?: React.ReactNode | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const [rule, setRule] = React.useState<ClientConditionScriptRule | null>(null);
  const [triggers, setTriggers] = React.useState<ClientConditionScriptTrigger[]>([]);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [error, setError] = React.useState("");
  const { commands, loading: commandsLoading, error: commandsError, refresh: refreshCommands } = useCommandClipboard();
  const open = typeof controlledOpen === "boolean" ? controlledOpen : uncontrolledOpen;
  const setOpen = React.useCallback((nextOpen: boolean) => {
    if (typeof controlledOpen !== "boolean") {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }, [controlledOpen, onOpenChange]);

  const orderedCommands = React.useMemo(
    () => [...commands].sort((left, right) => right.weight - left.weight || right.id - left.id),
    [commands],
  );
  const selectedCommand = React.useMemo(
    () => orderedCommands.find((command) => String(command.id) === form.commandId) || null,
    [form.commandId, orderedCommands],
  );

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextRule, nextTriggers] = await Promise.all([
        getClientConditionScriptRule(item.uuid),
        listClientConditionScriptTriggers(item.uuid),
      ]);
      setRule(nextRule);
      setForm(buildForm(nextRule));
      setTriggers(nextTriggers);
    } catch (err) {
      const message = getReadableErrorMessage(
        err,
        t("admin.nodeTable.conditionScript.loadFailed", "加载条件脚本失败"),
      );
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [item.uuid]);

  React.useEffect(() => {
    if (!open) {
      return;
    }
    void loadData();
  }, [loadData, open]);

  const updateForm = React.useCallback((patch: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...patch }));
  }, []);

  const buildTriggerStatuses = React.useCallback(() => {
    const statuses: ClientConditionScriptStatus[] = [];
    if (form.triggerBlocked) {
      statuses.push("blocked_suspected");
    }
    if (form.triggerDegraded) {
      statuses.push("degraded");
    }
    return statuses;
  }, [form.triggerBlocked, form.triggerDegraded]);

  const handleSave = async () => {
    let failureThreshold: number;
    let cooldownMinutes: number;
    try {
      failureThreshold = parsePositiveInteger(
        t("admin.nodeTable.conditionScript.failureThreshold", "连续异常次数"),
        form.failureThreshold,
      );
      cooldownMinutes = parsePositiveInteger(
        t("admin.nodeTable.conditionScript.cooldownMinutes", "冷却分钟"),
        form.cooldownMinutes,
      );
    } catch (err) {
      toast.error(getReadableErrorMessage(err));
      return;
    }

    const triggerStatuses = buildTriggerStatuses();
    if (triggerStatuses.length === 0) {
      toast.error(t("admin.nodeTable.conditionScript.selectCondition", "至少选择一个触发条件"));
      return;
    }

    const commandId = Number.parseInt(form.commandId, 10) || 0;
    if (form.enabled && commandId <= 0) {
      toast.error(t("admin.nodeTable.conditionScript.selectScript", "启用前请选择脚本"));
      return;
    }

    setSaving(true);
    setError("");
    try {
      const saved = await saveClientConditionScriptRule(item.uuid, {
        enabled: form.enabled,
        command_id: commandId,
        trigger_statuses: triggerStatuses,
        failure_threshold: failureThreshold,
        cooldown_seconds: cooldownMinutes * 60,
      });
      setRule(saved);
      setForm(buildForm(saved));
      toast.success(t("admin.nodeTable.conditionScript.saveSuccess", "条件脚本已保存"));
      void listClientConditionScriptTriggers(item.uuid).then(setTriggers).catch(() => undefined);
    } catch (err) {
      const message = getReadableErrorMessage(
        err,
        t("admin.nodeTable.conditionScript.saveFailed", "保存条件脚本失败"),
      );
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    setError("");
    try {
      await deleteClientConditionScriptRule(item.uuid);
      setRule(null);
      setForm(DEFAULT_FORM);
      toast.success(t("admin.nodeTable.conditionScript.removeSuccess", "条件脚本已删除"));
    } catch (err) {
      const message = getReadableErrorMessage(
        err,
        t("admin.nodeTable.conditionScript.removeFailed", "删除条件脚本失败"),
      );
      setError(message);
      toast.error(message);
    } finally {
      setRemoving(false);
    }
  };

  const handleRunNow = async () => {
    if (!rule?.id) {
      toast.error(t("admin.nodeTable.conditionScript.saveBeforeRun", "请先保存条件脚本，再手动执行"));
      return;
    }

    setRunning(true);
    setError("");
    try {
      const result = await runClientConditionScriptNow(item.uuid);
      setRule(result.rule);
      setForm(buildForm(result.rule));
      const nextTriggers = await listClientConditionScriptTriggers(item.uuid);
      setTriggers(nextTriggers);
      toast.success(
        t("admin.nodeTable.conditionScript.runSuccess", {
          defaultValue: `已下发脚本任务 ${result.task_id}`,
          taskId: result.task_id,
        }),
      );
    } catch (err) {
      const message = getReadableErrorMessage(
        err,
        t("admin.nodeTable.conditionScript.runFailed", "执行条件脚本失败"),
      );
      setError(message);
      toast.error(message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <AdminDialogLayout
        title={t("admin.nodeTable.conditionScript.title", "条件脚本")}
        description={t("admin.nodeTable.conditionScript.description", {
          defaultValue: "为这台服务器配置一个在疑似被墙或国内连接异常时自动执行的脚本。",
        })}
        wide
        bodyClassName="space-y-4 py-5"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <div className="space-y-4">
            <div className={NODE_DIALOG_INFO_CLASS}>
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {item.name || item.uuid}
                  </div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {item.uuid}{item.group ? ` / ${item.group}` : ""}
                  </div>
                </div>
                <Badge color={form.enabled ? "green" : "gray"}>
                  {form.enabled
                    ? t("common.enabled", { defaultValue: "已启用" })
                    : t("common.disabled", { defaultValue: "已停用" })}
                </Badge>
              </div>
            </div>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
                {error}
              </div>
            ) : null}

            <div className={NODE_DIALOG_SECTION_CLASS}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {t("admin.nodeTable.conditionScript.enableRule", "启用自动触发")}
                  </div>
                  <div className={ADMIN_FORM_HELP_CLASS}>
                    {t("admin.nodeTable.conditionScript.enableRuleHelp", "页面关闭后仍由后端监听这台服务器的连通性上报。")}
                  </div>
                </div>
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(checked) => updateForm({ enabled: checked })}
                />
              </div>
            </div>

            <div className={NODE_DIALOG_SECTION_CLASS}>
              <div className={ADMIN_FORM_FIELD_CLASS}>
                <label className={ADMIN_FORM_LABEL_CLASS}>
                  {t("admin.nodeTable.conditionScript.script", "执行脚本")}
                </label>
                <Select.Root
                  value={form.commandId}
                  onValueChange={(value) => updateForm({ commandId: value })}
                  disabled={commandsLoading || orderedCommands.length === 0}
                >
                  <Select.Trigger
                    placeholder={
                      commandsLoading
                        ? t("common.loading", { defaultValue: "加载中" })
                        : t("admin.nodeTable.conditionScript.selectScriptPlaceholder", "选择脚本")
                    }
                  />
                  <Select.Content>
                    {orderedCommands.map((command) => (
                      <Select.Item key={command.id} value={String(command.id)}>
                        {command.name || command.text.split("\n").find(Boolean) || `#${command.id}`}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                <div className={ADMIN_FORM_HELP_CLASS}>
                  {selectedCommand
                    ? selectedCommand.remark || selectedCommand.text.split("\n").map((line) => line.trim()).find(Boolean) || "-"
                    : commandsError
                      ? getReadableErrorMessage(commandsError)
                      : t("admin.nodeTable.conditionScript.scriptHelp", "脚本来自执行页面的脚本库，保存后触发时会读取脚本库里的最新内容。")}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void refreshCommands().catch((err) => {
                      toast.error(getReadableErrorMessage(err));
                    });
                  }}
                  disabled={commandsLoading}
                  className="w-fit"
                >
                  <RefreshCw className={cn("mr-1 h-3.5 w-3.5", commandsLoading && "animate-spin")} />
                  {t("admin.nodeTable.conditionScript.refreshScripts", "刷新脚本库")}
                </Button>
              </div>
            </div>

            <div className={NODE_DIALOG_SECTION_CLASS}>
              <div className="space-y-3">
                <div className="text-sm font-medium text-foreground">
                  {t("admin.nodeTable.conditionScript.conditions", "触发条件")}
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-[var(--surface)] p-3 text-sm">
                  <Checkbox
                    checked={form.triggerBlocked}
                    onCheckedChange={(checked) => updateForm({ triggerBlocked: Boolean(checked) })}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-medium">
                      {t("admin.nodeTable.cnConnectivityBlocked", "疑似被墙")}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      blocked_suspected
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-[var(--surface)] p-3 text-sm">
                  <Checkbox
                    checked={form.triggerDegraded}
                    onCheckedChange={(checked) => updateForm({ triggerDegraded: Boolean(checked) })}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-medium">
                      {t("admin.nodeTable.cnConnectivityDegraded", "国内异常")}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      degraded
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className={NODE_DIALOG_SECTION_CLASS}>
              <div className={ADMIN_FORM_GRID_2_CLASS}>
                <label className={ADMIN_FORM_FIELD_CLASS}>
                  <span className={ADMIN_FORM_LABEL_CLASS}>
                    {t("admin.nodeTable.conditionScript.failureThreshold", "连续异常次数")}
                  </span>
                  <TextField.Root
                    type="number"
                    min={1}
                    value={form.failureThreshold}
                    onChange={(event) => updateForm({ failureThreshold: event.target.value })}
                  />
                </label>
                <label className={ADMIN_FORM_FIELD_CLASS}>
                  <span className={ADMIN_FORM_LABEL_CLASS}>
                    {t("admin.nodeTable.conditionScript.cooldownMinutes", "冷却分钟")}
                  </span>
                  <TextField.Root
                    type="number"
                    min={1}
                    value={form.cooldownMinutes}
                    onChange={(event) => updateForm({ cooldownMinutes: event.target.value })}
                  />
                </label>
              </div>
              <div className={cn(ADMIN_FORM_HELP_CLASS, "mt-3")}>
                {t("admin.nodeTable.conditionScript.throttleHelp", "达到连续异常次数才触发；冷却时间内不会重复下发脚本。")}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className={NODE_DIALOG_SECTION_CLASS}>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <Activity className="h-4 w-4 text-muted-foreground" />
                {t("admin.nodeTable.conditionScript.currentState", "当前状态")}
              </div>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t("admin.nodeTable.conditionScript.lastStatus", "最近状态")}
                  </span>
                  <Badge color={rule?.last_status === "blocked_suspected" ? "red" : rule?.last_status === "degraded" ? "amber" : "gray"}>
                    {getConnectivityLabel(rule?.last_status || "")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t("admin.nodeTable.conditionScript.failureCount", "连续异常")}
                  </span>
                  <span className="font-medium">{rule?.consecutive_failures || 0}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t("admin.nodeTable.conditionScript.lastTriggeredAt", "最近触发")}
                  </span>
                  <span className="text-right font-medium">{formatDateTime(rule?.last_triggered_at)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t("cloud.script.task_id", "Task ID")}
                  </span>
                  <span className="max-w-[180px] truncate text-right font-medium">{rule?.last_task_id || "-"}</span>
                </div>
              </div>
              {rule?.last_error ? (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
                  {rule.last_error}
                </div>
              ) : null}
            </div>

            <div className={NODE_DIALOG_SECTION_CLASS}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <ScrollText className="h-4 w-4 text-muted-foreground" />
                  {t("admin.nodeTable.conditionScript.history", "最近触发")}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void listClientConditionScriptTriggers(item.uuid).then(setTriggers).catch((err) => {
                      toast.error(getReadableErrorMessage(err));
                    });
                  }}
                  disabled={loading}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                </Button>
              </div>
              {triggers.length === 0 ? (
                <div className={ADMIN_FORM_EMPTY_CLASS}>
                  {t("admin.nodeTable.conditionScript.emptyHistory", "暂无触发记录")}
                </div>
              ) : (
                <div className={ADMIN_FORM_LIST_PANEL_CLASS}>
                  {triggers.map((record) => (
                    <div key={record.id} className="border-b border-border px-3 py-3 last:border-b-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatDateTime(record.created_at)}
                          </div>
                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            {record.reason || getConnectivityLabel(record.connectivity_status)}
                          </div>
                        </div>
                        <Badge color={getTriggerStatusTone(record.status)}>
                          {getTriggerStatusLabel(record.status)}
                        </Badge>
                      </div>
                      <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                        <div>{getConnectivityLabel(record.connectivity_status)} / {record.failure_count}</div>
                        {record.task_id ? <div className="truncate">Task: {record.task_id}</div> : null}
                        {record.error_message ? <div className="text-red-600 dark:text-red-300">{record.error_message}</div> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="outline"
            onClick={handleRemove}
            disabled={removing || saving || running || !rule?.id}
            className="sm:w-auto"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            {removing
              ? t("common.deleting", { defaultValue: "删除中" })
              : t("common.delete", { defaultValue: "删除" })}
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={handleRunNow}
              disabled={running || saving || !rule?.id}
            >
              <Play className="mr-1 h-4 w-4" />
              {running
                ? t("cloud.script.running", "Running...")
                : t("admin.nodeTable.conditionScript.runNow", "立即执行")}
            </Button>
            <Button onClick={handleSave} disabled={saving || running}>
              <Save className="mr-1 h-4 w-4" />
              {saving
                ? t("common.saving", { defaultValue: "保存中" })
                : t("common.save", { defaultValue: "保存" })}
            </Button>
          </div>
        </div>
      </AdminDialogLayout>
    </Dialog.Root>
  );
}

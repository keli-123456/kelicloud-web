import * as React from "react";
import { Network, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { t } from "i18next";
import { toast } from "sonner";

import {
  Badge,
  Button,
  Dialog,
  Flex,
  IconButton,
  SegmentedControl,
  Switch,
  TextField,
} from "@/components/admin/admin-ui";
import { getReadableErrorMessage } from "@/lib/apiErrorMessage";
import {
  applyClientPortForwardRules,
  deleteClientPortForwardRule,
  getClientPortForwardRules,
  saveClientPortForwardRule,
  type ClientPortForwardProtocol,
  type ClientPortForwardRule,
} from "@/lib/clientPortForward";

type NodePortForwardTarget = {
  uuid: string;
  ipv4?: string;
  ipv6?: string;
};

type PortForwardFormState = {
  id: number | null;
  name: string;
  enabled: boolean;
  protocol: ClientPortForwardProtocol;
  listenPort: string;
  targetHost: string;
  targetPort: string;
};

const DEFAULT_FORM: PortForwardFormState = {
  id: null,
  name: "RDP",
  enabled: true,
  protocol: "tcp",
  listenPort: "13389",
  targetHost: "",
  targetPort: "3389",
};

const NODE_DIALOG_CONTENT_CLASS =
  "max-h-[90vh] w-[min(96vw,860px)] overflow-y-auto overscroll-contain rounded-lg border border-border bg-card p-6 shadow-xl shadow-slate-900/10 [scrollbar-gutter:stable]";
const NODE_DIALOG_SECTION_CLASS =
  "dialog-section px-4 py-4";
const NODE_DIALOG_INFO_CLASS =
  "rounded-lg border border-border/60 bg-background p-4 shadow-none";

function buildFormFromRule(rule: ClientPortForwardRule): PortForwardFormState {
  return {
    id: rule.id,
    name: rule.name || `${rule.protocol.toUpperCase()} ${rule.listen_port}`,
    enabled: rule.enabled,
    protocol: rule.protocol,
    listenPort: String(rule.listen_port || ""),
    targetHost: rule.target_host,
    targetPort: String(rule.target_port || ""),
  };
}

function parsePort(label: string, value: string) {
  const port = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error(t("admin.nodeTable.portForward.invalidPort", {
      defaultValue: `${label} 必须在 1 到 65535 之间`,
      label,
    }));
  }
  return port;
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

function getStatusColor(status: string) {
  switch (status) {
    case "applied":
      return "green" as const;
    case "disabled":
      return "gray" as const;
    case "error":
      return "red" as const;
    default:
      return "amber" as const;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "applied":
      return t("admin.nodeTable.portForward.status.applied", "已应用");
    case "disabled":
      return t("admin.nodeTable.portForward.status.disabled", "已停用");
    case "error":
      return t("admin.nodeTable.portForward.status.error", "异常");
    default:
      return t("admin.nodeTable.portForward.status.pending", "待应用");
  }
}

export function NodePortForwardDialog({
  item,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  item: NodePortForwardTarget;
  trigger?: React.ReactNode | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const [rules, setRules] = React.useState<ClientPortForwardRule[]>([]);
  const [form, setForm] = React.useState<PortForwardFormState>(DEFAULT_FORM);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [applying, setApplying] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [error, setError] = React.useState("");
  const open = typeof controlledOpen === "boolean" ? controlledOpen : uncontrolledOpen;
  const setOpen = React.useCallback((nextOpen: boolean) => {
    if (typeof controlledOpen !== "boolean") {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }, [controlledOpen, onOpenChange]);

  const selectedRule = React.useMemo(
    () => rules.find((rule) => rule.id === form.id) || null,
    [form.id, rules],
  );
  const enabledCount = React.useMemo(
    () => rules.reduce((count, rule) => count + (rule.enabled ? 1 : 0), 0),
    [rules],
  );
  const hasUnsavedChanges = React.useMemo(() => {
    if (!form.id) {
      return Boolean(
        form.targetHost.trim() ||
        form.name.trim() !== DEFAULT_FORM.name ||
        form.listenPort.trim() !== DEFAULT_FORM.listenPort ||
        form.targetPort.trim() !== DEFAULT_FORM.targetPort ||
        form.protocol !== DEFAULT_FORM.protocol ||
        form.enabled !== DEFAULT_FORM.enabled
      );
    }
    if (!selectedRule) {
      return false;
    }
    return (
      form.name.trim() !== selectedRule.name ||
      form.enabled !== selectedRule.enabled ||
      form.protocol !== selectedRule.protocol ||
      form.listenPort.trim() !== String(selectedRule.listen_port || "") ||
      form.targetHost.trim() !== selectedRule.target_host ||
      form.targetPort.trim() !== String(selectedRule.target_port || "")
    );
  }, [form, selectedRule]);

  const loadRules = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextRules = await getClientPortForwardRules(item.uuid);
      setRules(nextRules);
      setForm((current) => {
        if (current.id && nextRules.some((rule) => rule.id === current.id)) {
          return current;
        }
        return nextRules[0] ? buildFormFromRule(nextRules[0]) : DEFAULT_FORM;
      });
    } catch (err) {
      const message = getReadableErrorMessage(
        err,
        t("admin.nodeTable.portForward.loadFailed", "加载端口中转规则失败"),
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
    void loadRules();
  }, [loadRules, open]);

  const resetForm = React.useCallback(() => {
    setForm(DEFAULT_FORM);
  }, []);

  const updateForm = React.useCallback((patch: Partial<PortForwardFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
  }, []);

  const handleSave = async () => {
    let listenPort: number;
    let targetPort: number;
    try {
      listenPort = parsePort(t("admin.nodeTable.portForward.listenPort", "监听端口"), form.listenPort);
      targetPort = parsePort(t("admin.nodeTable.portForward.targetPort", "目标端口"), form.targetPort);
    } catch (err) {
      toast.error(getReadableErrorMessage(err, t("admin.nodeTable.portForward.invalidForm", "表单内容无效")));
      return;
    }

    const targetHost = form.targetHost.trim();
    if (!targetHost) {
      toast.error(t("admin.nodeTable.portForward.targetRequired", "请填写目标服务器地址"));
      return;
    }

    setSaving(true);
    setError("");
    try {
      const saved = await saveClientPortForwardRule(item.uuid, {
        id: form.id || undefined,
        name: form.name.trim(),
        enabled: form.enabled,
        protocol: form.protocol,
        listen_port: listenPort,
        target_host: targetHost,
        target_port: targetPort,
      });
      setRules((current) => {
        const next = current.some((rule) => rule.id === saved.id)
          ? current.map((rule) => (rule.id === saved.id ? saved : rule))
          : [...current, saved];
        return [...next].sort((left, right) => left.listen_port - right.listen_port || left.id - right.id);
      });
      setForm(buildFormFromRule(saved));
      toast.success(t("admin.nodeTable.portForward.saveSuccess", "端口中转规则已保存"));
    } catch (err) {
      const message = getReadableErrorMessage(
        err,
        t("admin.nodeTable.portForward.saveFailed", "保存端口中转规则失败"),
      );
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!form.id) {
      resetForm();
      return;
    }

    setRemoving(true);
    setError("");
    try {
      await deleteClientPortForwardRule(item.uuid, form.id);
      setRules((current) => current.filter((rule) => rule.id !== form.id));
      resetForm();
      toast.success(t("admin.nodeTable.portForward.removeSuccess", "端口中转规则已删除"));
    } catch (err) {
      const message = getReadableErrorMessage(
        err,
        t("admin.nodeTable.portForward.removeFailed", "删除端口中转规则失败"),
      );
      setError(message);
      toast.error(message);
    } finally {
      setRemoving(false);
    }
  };

  const handleApply = async () => {
    if (hasUnsavedChanges) {
      toast.error(t("admin.nodeTable.portForward.saveBeforeApply", "请先保存当前规则，再应用到服务器"));
      return;
    }

    setApplying(true);
    setError("");
    try {
      const result = await applyClientPortForwardRules(item.uuid);
      setRules(result.rules);
      if (form.id) {
        const currentRule = result.rules.find((rule) => rule.id === form.id);
        if (currentRule) {
          setForm(buildFormFromRule(currentRule));
        }
      }
      toast.success(
        t("admin.nodeTable.portForward.applySuccess", {
          defaultValue: `已下发端口中转任务 ${result.task_id}`,
          taskId: result.task_id,
        }),
      );
    } catch (err) {
      const message = getReadableErrorMessage(
        err,
        t("admin.nodeTable.portForward.applyFailed", "应用端口中转规则失败"),
      );
      setError(message);
      toast.error(message);
    } finally {
      setApplying(false);
    }
  };

  const currentIPv4 = item.ipv4 || "-";
  const currentIPv6 = item.ipv6 || "-";
  const status = selectedRule?.status || (form.enabled ? "pending" : "disabled");

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {trigger === null ? null : trigger ? (
        <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      ) : (
        <Dialog.Trigger>
          <IconButton variant="ghost" title={t("admin.nodeTable.portForward.title", "端口中转")}>
            <Network className="p-1" />
          </IconButton>
        </Dialog.Trigger>
      )}
      <Dialog.Content
        maxWidth={820}
        className={NODE_DIALOG_CONTENT_CLASS}
      >
        <Dialog.Title>{t("admin.nodeTable.portForward.title", "端口中转")}</Dialog.Title>
        <Dialog.Description>
          {t(
            "admin.nodeTable.portForward.description",
            "使用当前服务器作为公网入口，通过 iptables 转发到另一台服务器的端口。",
          )}
        </Dialog.Description>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className={NODE_DIALOG_INFO_CLASS}>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">IPv4</div>
                  <div className="mt-1 font-mono text-[13px] text-foreground">{currentIPv4}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">IPv6</div>
                  <div className="mt-1 font-mono text-[13px] text-foreground">{currentIPv6}</div>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {t(
                  "admin.nodeTable.portForward.nodeHint",
                  "应用时会重建该节点上由 Komari 管理的转发链；停用的规则不会下发。",
                )}
              </p>
            </div>

            <div className={NODE_DIALOG_SECTION_CLASS}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">
                    {t("admin.nodeTable.portForward.ruleList", "转发规则")}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t("admin.nodeTable.portForward.ruleSummary", {
                      defaultValue: `${rules.length} 条规则，${enabledCount} 条启用`,
                      count: rules.length,
                      enabledCount,
                    })}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={resetForm}>
                  <Plus className="h-4 w-4" />
                  {t("common.add", "新增")}
                </Button>
              </div>

              <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {loading ? (
                  <div className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
                    {t("admin.nodeTable.portForward.loading", "正在加载端口中转规则...")}
                  </div>
                ) : rules.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
                    {t("admin.nodeTable.portForward.empty", "还没有端口中转规则")}
                  </div>
                ) : (
                  rules.map((rule) => (
                    <button
                      key={rule.id}
                      type="button"
                      className={[
                        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                        rule.id === form.id
                          ? "border-primary/45 bg-primary/5"
                          : "border-border/70 bg-background hover:border-primary/25 hover:bg-muted/35",
                      ].join(" ")}
                      onClick={() => setForm(buildFormFromRule(rule))}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{rule.name}</div>
                          <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
                            {rule.protocol.toUpperCase()} :{rule.listen_port} → {rule.target_host}:{rule.target_port}
                          </div>
                        </div>
                        <Badge color={getStatusColor(rule.status)}>
                          {getStatusLabel(rule.status)}
                        </Badge>
                      </div>
                      {rule.last_error ? (
                        <div className="mt-2 truncate rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                          {rule.last_error}
                        </div>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className={NODE_DIALOG_SECTION_CLASS}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">
                  {form.id
                    ? t("admin.nodeTable.portForward.editRule", "编辑规则")
                    : t("admin.nodeTable.portForward.newRule", "新增规则")}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {selectedRule
                    ? t("admin.nodeTable.portForward.lastApplied", {
                      defaultValue: `上次应用: ${formatDateTime(selectedRule.last_applied_at)}`,
                      time: formatDateTime(selectedRule.last_applied_at),
                    })
                    : hasUnsavedChanges
                      ? t("admin.nodeTable.portForward.unsaved", "保存后再应用到服务器")
                      : t("admin.nodeTable.portForward.noRuleSelected", "选择规则或新增一条规则")}
                </div>
              </div>
              <Badge color={getStatusColor(status)}>{getStatusLabel(status)}</Badge>
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            ) : null}

            <Flex direction="column" gap="4">
              <Flex direction="column" gap="2">
                <label className="text-sm font-semibold">
                  {t("admin.nodeTable.portForward.name", "名称")}
                </label>
                <TextField.Root
                  value={form.name}
                  placeholder="RDP"
                  onChange={(event) => updateForm({ name: event.target.value })}
                />
              </Flex>

              <Flex direction="column" gap="2">
                <label className="text-sm font-semibold">
                  {t("admin.nodeTable.portForward.protocol", "协议")}
                </label>
                <SegmentedControl.Root
                  value={form.protocol}
                  onValueChange={(value) => updateForm({ protocol: value === "udp" ? "udp" : "tcp" })}
                >
                  <SegmentedControl.Item value="tcp">TCP</SegmentedControl.Item>
                  <SegmentedControl.Item value="udp">UDP</SegmentedControl.Item>
                </SegmentedControl.Root>
              </Flex>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <Flex direction="column" gap="2">
                  <label className="text-sm font-semibold">
                    {t("admin.nodeTable.portForward.listenPort", "监听端口")}
                  </label>
                  <TextField.Root
                    value={form.listenPort}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={65535}
                    placeholder="13389"
                    onChange={(event) => updateForm({ listenPort: event.target.value })}
                  />
                </Flex>

                <Flex direction="column" gap="2">
                  <label className="text-sm font-semibold">
                    {t("admin.nodeTable.portForward.targetPort", "目标端口")}
                  </label>
                  <TextField.Root
                    value={form.targetPort}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={65535}
                    placeholder="3389"
                    onChange={(event) => updateForm({ targetPort: event.target.value })}
                  />
                </Flex>
              </div>

              <Flex direction="column" gap="2">
                <label className="text-sm font-semibold">
                  {t("admin.nodeTable.portForward.targetHost", "目标服务器")}
                </label>
                <TextField.Root
                  value={form.targetHost}
                  placeholder="192.0.2.10"
                  onChange={(event) => updateForm({ targetHost: event.target.value })}
                />
              </Flex>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background px-3 py-2.5">
                <div>
                  <div className="text-sm font-semibold">
                    {t("admin.nodeTable.portForward.enabled", "启用规则")}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t("admin.nodeTable.portForward.enabledHint", "关闭后保存，应用时不会下发这条规则")}
                  </div>
                </div>
                <Switch checked={form.enabled} onCheckedChange={(checked) => updateForm({ enabled: checked })} />
              </div>
            </Flex>

            <div className="mt-2 flex flex-wrap justify-end gap-2">
              <Button
                color="red"
                variant="soft"
                disabled={removing || saving || applying}
                onClick={() => {
                  void handleRemove();
                }}
              >
                <Trash2 className="h-4 w-4" />
                {form.id ? t("common.delete", "删除") : t("common.reset", "重置")}
              </Button>
              <Button
                variant="outline"
                disabled={loading || applying}
                onClick={() => {
                  void loadRules();
                }}
              >
                <RefreshCw className="h-4 w-4" />
                {t("common.refresh", "刷新")}
              </Button>
              <Button
                disabled={saving || applying}
                onClick={() => {
                  void handleSave();
                }}
              >
                <Save className="h-4 w-4" />
                {saving
                  ? t("admin.nodeTable.portForward.saving", "保存中...")
                  : t("common.save", "保存")}
              </Button>
              <Button
                color="blue"
                disabled={saving || applying}
                onClick={() => {
                  void handleApply();
                }}
              >
                <Network className="h-4 w-4" />
                {applying
                  ? t("admin.nodeTable.portForward.applying", "应用中...")
                  : t("admin.nodeTable.portForward.apply", "应用到服务器")}
              </Button>
            </div>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

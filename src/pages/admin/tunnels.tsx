import React from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Edit3,
  Network,
  Plus,
  RefreshCw,
  Server,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  AdminDataTable,
  AdminDataTableCell,
  AdminDataTableEmptyRow,
  AdminDataTableHead,
  AdminDataTableHeadRow,
  AdminDataTableRow,
  AdminDataTableScroll,
} from "@/components/admin/AdminDataTable";
import {
  ADMIN_FORM_BODY_CLASS,
  ADMIN_FORM_DIALOG_CHROME_CLASS,
  ADMIN_FORM_DIALOG_CLASS,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_FOOTER_CLASS,
  ADMIN_FORM_GRID_2_CLASS,
  ADMIN_FORM_HEADER_CLASS,
  ADMIN_FORM_HEADER_INSET_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_FORM_SECTION_CLASS,
  ADMIN_FORM_SELECT_TRIGGER_CLASS,
  ADMIN_FORM_TOGGLE_CLASS,
} from "@/components/admin/AdminFormStyles";
import {
  AdminEmptyState,
  AdminPanel,
  AdminPanelBody,
  AdminPanelHeader,
  AdminPageShell,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
import { Badge, Button, Dialog, Select, Switch } from "@/components/admin/admin-ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getReadableErrorMessage } from "@/lib/apiErrorMessage";
import {
  deleteTunnelRule,
  getTunnelRules,
  saveTunnelRule,
  type TunnelGroupSummary,
  type TunnelRule,
  type TunnelRuleInput,
} from "@/lib/tunnels";
import { cn } from "@/lib/utils";
import {
  formatTunnelEndpoint,
  getTunnelDiagnosticPreview,
  getTunnelOverviewMetrics,
  getTunnelStatusLabel,
  getTunnelStatusTone,
  type TunnelOverviewMetrics,
  type TunnelStatusTone,
} from "./tunnels.helpers";

type TunnelFormState = {
  id?: number;
  name: string;
  enabled: boolean;
  ingress_group: string;
  listen_address: string;
  listen_port: string;
  egress_group: string;
  target_host: string;
  target_port: string;
  source_allowlist: string;
  max_concurrent_sessions: string;
  remark: string;
};

const EMPTY_FORM: TunnelFormState = {
  name: "RDP",
  enabled: true,
  ingress_group: "",
  listen_address: "0.0.0.0",
  listen_port: "10088",
  egress_group: "",
  target_host: "127.0.0.1",
  target_port: "3389",
  source_allowlist: "0.0.0.0/0",
  max_concurrent_sessions: "32",
  remark: "",
};

function ruleToForm(rule: TunnelRule): TunnelFormState {
  return {
    id: rule.id,
    name: rule.name,
    enabled: rule.enabled,
    ingress_group: rule.ingress_group,
    listen_address: rule.listen_address || "0.0.0.0",
    listen_port: String(rule.listen_port || 10088),
    egress_group: rule.egress_group,
    target_host: rule.target_host,
    target_port: String(rule.target_port || 3389),
    source_allowlist: rule.source_allowlist || "0.0.0.0/0",
    max_concurrent_sessions: String(rule.max_concurrent_sessions || 32),
    remark: rule.remark || "",
  };
}

function parsePort(label: string, value: string) {
  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${label} must be between 1 and 65535`);
  }
  return port;
}

function buildRuleInput(form: TunnelFormState): TunnelRuleInput {
  const maxSessions = Number.parseInt(form.max_concurrent_sessions || "32", 10);
  return {
    id: form.id,
    name: form.name.trim() || "TCP Tunnel",
    enabled: form.enabled,
    protocol: "tcp",
    ingress_group: form.ingress_group.trim(),
    listen_address: form.listen_address.trim() || "0.0.0.0",
    listen_port: parsePort("listen port", form.listen_port),
    egress_group: form.egress_group.trim(),
    target_host: form.target_host.trim(),
    target_port: parsePort("target port", form.target_port),
    source_allowlist: form.source_allowlist.trim() || "0.0.0.0/0",
    max_concurrent_sessions:
      Number.isInteger(maxSessions) && maxSessions > 0 ? maxSessions : 32,
    remark: form.remark.trim(),
  };
}

function groupOptions(groups: TunnelGroupSummary[], current: string) {
  const names = new Set(groups.map((group) => group.name));
  const options = [...groups];
  if (current && !names.has(current)) {
    options.push({
      name: current,
      client_count: 0,
      control_connected_count: 0,
      data_ready_count: 0,
      last_error: "",
    });
  }
  return options;
}

const overviewToneClass: Record<TunnelStatusTone, string> = {
  gray: "border-border bg-[var(--surface-subtle)] text-muted-foreground",
  red: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200",
  amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-200",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-200",
  blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/35 dark:text-blue-200",
};

function OverviewTile({
  icon,
  label,
  value,
  detail,
  tone = "gray",
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
  detail: React.ReactNode;
  tone?: TunnelStatusTone;
}) {
  return (
    <div className="admin-inline-surface flex min-h-16 min-w-0 items-center gap-3 px-3 py-2.5">
      <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-md border", overviewToneClass[tone])}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-medium leading-4 text-muted-foreground">{label}</div>
        <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
          <span className="text-lg font-semibold leading-6 text-foreground">{value}</span>
          <span className="truncate text-[12px] leading-4 text-muted-foreground">{detail}</span>
        </div>
      </div>
    </div>
  );
}

function TunnelOverviewBar({
  metrics,
  t,
}: {
  metrics: TunnelOverviewMetrics;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const hasRules = metrics.totalRules > 0;

  return (
    <div className={cn("grid min-w-0 gap-2 sm:grid-cols-2", hasRules && "xl:grid-cols-4")}>
      <OverviewTile
        icon={<Network className="size-4" />}
        label={t("tunnels.overview_rules", { defaultValue: "规则" })}
        value={metrics.totalRules}
        detail={t("tunnels.overview_rules_detail", { count: metrics.healthyRules })}
        tone={metrics.totalRules === metrics.healthyRules && metrics.totalRules > 0 ? "green" : "amber"}
      />
      {hasRules ? <OverviewTile
        icon={<Activity className="size-4" />}
        label={t("tunnels.overview_sessions", { defaultValue: "活跃连接" })}
        value={metrics.activeSessions}
        detail={t("tunnels.overview_sessions_detail", { defaultValue: "实时" })}
        tone={metrics.activeSessions > 0 ? "blue" : "gray"}
      /> : null}
      <OverviewTile
        icon={<Server className="size-4" />}
        label={t("tunnels.overview_groups", { defaultValue: "分组" })}
        value={metrics.totalGroups}
        detail={t("tunnels.overview_groups_detail", { count: metrics.readyGroups })}
        tone={metrics.readyGroups > 0 ? "green" : "gray"}
      />
      {hasRules ? <OverviewTile
        icon={<CheckCircle2 className="size-4" />}
        label={t("tunnels.overview_ready", { defaultValue: "可用规则" })}
        value={metrics.healthyRules}
        detail={t("tunnels.overview_ready_detail", { count: metrics.totalRules })}
        tone={metrics.healthyRules > 0 ? "green" : "gray"}
      /> : null}
    </div>
  );
}

function ReadinessPill({ ready, label }: { ready: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium",
        ready
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400",
      )}
    >
      {label}
    </span>
  );
}

function TunnelDiagnosticsCell({ rule }: { rule: TunnelRule }) {
  const preview = getTunnelDiagnosticPreview(rule);
  if (preview.lines.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <div className="grid max-w-[240px] gap-0.5 text-[12px] leading-4">
      {preview.lines.map((line) => (
        <div key={line} className="truncate text-muted-foreground">
          {line}
        </div>
      ))}
      {preview.extraCount > 0 ? (
        <div className="text-muted-foreground">+{preview.extraCount}</div>
      ) : null}
    </div>
  );
}

function GroupReadinessStrip({
  groups,
  t,
}: {
  groups: TunnelGroupSummary[];
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {groups.map((group) => (
        <div
          key={group.name}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {group.name}
            </span>
            <span className="shrink-0 text-xs text-slate-500">
              {t("tunnels.group_clients", { count: group.client_count })}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <ReadinessPill
              ready={group.control_connected_count > 0}
              label={t("tunnels.group_control_count", { count: group.control_connected_count })}
            />
            <ReadinessPill
              ready={group.data_ready_count > 0}
              label={t("tunnels.group_data_count", { count: group.data_ready_count })}
            />
          </div>
          {group.last_error ? (
            <div className="mt-1 truncate text-xs text-red-600 dark:text-red-300">
              {group.last_error}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function TunnelForwardingPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [rules, setRules] = React.useState<TunnelRule[]>([]);
  const [groups, setGroups] = React.useState<TunnelGroupSummary[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<TunnelFormState>(EMPTY_FORM);
  const overview = React.useMemo(
    () => getTunnelOverviewMetrics(rules, groups),
    [rules, groups],
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const payload = await getTunnelRules();
      setRules(payload.rules);
      setGroups(payload.groups);
    } catch (error) {
      toast.error(getReadableErrorMessage(error, t("tunnels.load_failed")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      ingress_group: groups[0]?.name || "",
      egress_group: groups[0]?.name || "",
    });
    setDialogOpen(true);
  };

  const openEdit = (rule: TunnelRule) => {
    setForm(ruleToForm(rule));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    let input: TunnelRuleInput;
    try {
      input = buildRuleInput(form);
      if (!input.ingress_group || !input.egress_group) {
        toast.error(t("tunnels.group_required"));
        return;
      }
      if (!input.target_host) {
        toast.error(t("tunnels.target_required"));
        return;
      }
    } catch (error) {
      toast.error(getReadableErrorMessage(error, t("tunnels.invalid_form")));
      return;
    }

    setSaving(true);
    try {
      const saved = await saveTunnelRule(input);
      setRules((current) => {
        const exists = current.some((item) => item.id === saved.id);
        return exists
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current];
      });
      setDialogOpen(false);
      toast.success(t("tunnels.save_success"));
      void load();
    } catch (error) {
      toast.error(getReadableErrorMessage(error, t("tunnels.save_failed")));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rule: TunnelRule) => {
    if (!window.confirm(t("tunnels.delete_confirm", { name: rule.name }))) {
      return;
    }
    try {
      await deleteTunnelRule(rule.id);
      setRules((current) => current.filter((item) => item.id !== rule.id));
      toast.success(t("tunnels.delete_success"));
    } catch (error) {
      toast.error(getReadableErrorMessage(error, t("tunnels.delete_failed")));
    }
  };

  const canCreate = groups.length > 0;

  return (
    <AdminPageShell
      title={t("tunnels.title")}
      description={t("tunnels.description")}
      actions={(
        <>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="size-4" />
            {t("common.refresh", { defaultValue: "刷新" })}
          </Button>
          <Button onClick={openCreate} disabled={!canCreate}>
            <Plus className="size-4" />
            {t("tunnels.create")}
          </Button>
        </>
      )}
    >
      <TunnelOverviewBar metrics={overview} t={t} />
      <GroupReadinessStrip groups={groups} t={t} />

      <AdminPanel>
        <AdminPanelHeader
          title={t("tunnels.rules")}
          description={t("tunnels.rules_description")}
        />
        <AdminPanelBody className="p-0">
          {loading ? (
            <AdminTableSkeleton columns={7} rows={5} className="rounded-none border-0 shadow-none" />
          ) : rules.length === 0 ? (
            <div className="p-4">
              <AdminEmptyState
                title={canCreate ? t("tunnels.empty") : t("tunnels.no_groups")}
                description={canCreate ? undefined : t("tunnels.no_groups_description")}
                actions={canCreate ? (
                  <Button onClick={openCreate}>
                    <Plus className="size-4" />
                    {t("tunnels.create")}
                  </Button>
                ) : undefined}
              />
            </div>
          ) : (
            <AdminDataTableScroll>
              <AdminDataTable minWidth={1040}>
                <thead>
                  <AdminDataTableHeadRow>
                    <AdminDataTableHead className="w-[132px]">{t("common.status", { defaultValue: "状态" })}</AdminDataTableHead>
                    <AdminDataTableHead className="w-[150px]">{t("common.name", { defaultValue: "名称" })}</AdminDataTableHead>
                    <AdminDataTableHead>{t("tunnels.route", { defaultValue: "路由" })}</AdminDataTableHead>
                    <AdminDataTableHead>{t("tunnels.listen")}</AdminDataTableHead>
                    <AdminDataTableHead>{t("tunnels.target")}</AdminDataTableHead>
                    <AdminDataTableHead className="w-[220px]">{t("tunnels.readiness")}</AdminDataTableHead>
                    <AdminDataTableHead className="w-[240px]">{t("tunnels.last_error")}</AdminDataTableHead>
                    <AdminDataTableHead sticky="right" align="right" className="w-[112px]">
                      {t("common.actions", { defaultValue: "操作" })}
                    </AdminDataTableHead>
                  </AdminDataTableHeadRow>
                </thead>
                <tbody>
                  {rules.length === 0 ? (
                    <AdminDataTableEmptyRow colSpan={8}>
                      {t("tunnels.empty")}
                    </AdminDataTableEmptyRow>
                  ) : rules.map((rule) => (
                    <AdminDataTableRow key={rule.id}>
                      <AdminDataTableCell>
                        <Badge
                          color={getTunnelStatusTone(rule.status)}
                          title={rule.last_error || rule.status}
                        >
                          {getTunnelStatusLabel(
                            rule,
                            t(`tunnels.status.${rule.status}`, { defaultValue: rule.status }),
                          )}
                        </Badge>
                      </AdminDataTableCell>
                      <AdminDataTableCell className="font-medium">
                        <div className="truncate">{rule.name}</div>
                        {rule.remark ? (
                          <div className="truncate text-xs text-muted-foreground">{rule.remark}</div>
                        ) : null}
                      </AdminDataTableCell>
                      <AdminDataTableCell>
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="min-w-0 truncate rounded-md border border-border bg-[var(--surface-subtle)] px-2 py-1 font-mono text-[12px]">
                            {rule.ingress_group}
                          </span>
                          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 truncate rounded-md border border-border bg-[var(--surface-subtle)] px-2 py-1 font-mono text-[12px]">
                            {rule.egress_group}
                          </span>
                        </div>
                      </AdminDataTableCell>
                      <AdminDataTableCell className="font-mono">
                        {formatTunnelEndpoint(rule.listen_address, rule.listen_port)}
                      </AdminDataTableCell>
                      <AdminDataTableCell className="font-mono">
                        {formatTunnelEndpoint(rule.target_host, rule.target_port)}
                      </AdminDataTableCell>
                      <AdminDataTableCell>
                        <div className="grid gap-1">
                          <div className="flex flex-wrap gap-1.5">
                            <ReadinessPill
                              ready={rule.ingress_ready}
                              label={t("tunnels.ingress_ready_count", { count: rule.ingress_ready_count })}
                            />
                            <ReadinessPill
                              ready={rule.egress_ready}
                              label={t("tunnels.egress_ready_count", { count: rule.egress_ready_count })}
                            />
                          </div>
                          <div className="text-[12px] leading-4 text-muted-foreground">
                            {t("tunnels.active_sessions", { count: rule.active_sessions })}
                            <span className="mx-1 text-border">/</span>
                            {t("tunnels.session_limit_value", { count: rule.max_concurrent_sessions || 32 })}
                          </div>
                        </div>
                      </AdminDataTableCell>
                      <AdminDataTableCell className="max-w-[240px]">
                        <TunnelDiagnosticsCell rule={rule} />
                      </AdminDataTableCell>
                      <AdminDataTableCell sticky="right" align="right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="icon" variant="outline" aria-label={t("common.edit", { defaultValue: "编辑" })} onClick={() => openEdit(rule)}>
                            <Edit3 className="size-4" />
                          </Button>
                          <Button size="icon" variant="outline" color="red" aria-label={t("common.delete", { defaultValue: "删除" })} onClick={() => void handleDelete(rule)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </AdminDataTableCell>
                    </AdminDataTableRow>
                  ))}
                </tbody>
              </AdminDataTable>
            </AdminDataTableScroll>
          )}
        </AdminPanelBody>
      </AdminPanel>

      <Dialog.Root open={dialogOpen} onOpenChange={(open) => !saving && setDialogOpen(open)}>
        <Dialog.Content
          className={cn(ADMIN_FORM_DIALOG_CLASS, ADMIN_FORM_DIALOG_CHROME_CLASS)}
          maxWidth={720}
        >
          <div className={ADMIN_FORM_HEADER_CLASS}>
            <div className={ADMIN_FORM_HEADER_INSET_CLASS}>
              <Dialog.Title>{form.id ? t("tunnels.edit") : t("tunnels.create")}</Dialog.Title>
              <Dialog.Description>{t("tunnels.form_description")}</Dialog.Description>
            </div>
          </div>
          <div className={cn(ADMIN_FORM_BODY_CLASS, "grid gap-4")}>
            <section className={ADMIN_FORM_SECTION_CLASS}>
              <div className={ADMIN_FORM_GRID_2_CLASS}>
                <div className={ADMIN_FORM_FIELD_CLASS}>
                  <Label className={ADMIN_FORM_LABEL_CLASS}>{t("common.name", { defaultValue: "名称" })}</Label>
                  <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                </div>
                <div className={ADMIN_FORM_FIELD_CLASS}>
                  <Label className={ADMIN_FORM_LABEL_CLASS}>{t("tunnels.enabled")}</Label>
                  <div className={ADMIN_FORM_TOGGLE_CLASS}>
                    <span className="text-[13px] text-muted-foreground">
                      {form.enabled ? t("common.enabled", { defaultValue: "已启用" }) : t("common.disabled", { defaultValue: "已停用" })}
                    </span>
                    <Switch checked={form.enabled} onCheckedChange={(enabled) => setForm((current) => ({ ...current, enabled }))} />
                  </div>
                </div>
                <div className={cn(ADMIN_FORM_FIELD_CLASS, "md:col-span-2")}>
                  <Label className={ADMIN_FORM_LABEL_CLASS}>{t("common.remark", { defaultValue: "备注" })}</Label>
                  <Input value={form.remark} onChange={(event) => setForm((current) => ({ ...current, remark: event.target.value }))} />
                </div>
              </div>
            </section>

            <section className={ADMIN_FORM_SECTION_CLASS}>
              <div className={ADMIN_FORM_GRID_2_CLASS}>
                <div className={ADMIN_FORM_FIELD_CLASS}>
                  <Label className={ADMIN_FORM_LABEL_CLASS}>{t("tunnels.ingress_group")}</Label>
                  <Select.Root value={form.ingress_group} onValueChange={(value) => setForm((current) => ({ ...current, ingress_group: value }))}>
                    <Select.Trigger className={ADMIN_FORM_SELECT_TRIGGER_CLASS} placeholder={t("tunnels.select_group")} />
                    <Select.Content>
                      {groupOptions(groups, form.ingress_group).map((group) => (
                        <Select.Item key={group.name} value={group.name}>
                          {group.name}{group.client_count === 0 ? ` · ${t("tunnels.group_empty")}` : ` · ${group.client_count}`}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
                <div className={ADMIN_FORM_FIELD_CLASS}>
                  <Label className={ADMIN_FORM_LABEL_CLASS}>{t("tunnels.listen_address")}</Label>
                  <Input value={form.listen_address} onChange={(event) => setForm((current) => ({ ...current, listen_address: event.target.value }))} />
                </div>
                <div className={ADMIN_FORM_FIELD_CLASS}>
                  <Label className={ADMIN_FORM_LABEL_CLASS}>{t("tunnels.listen_port")}</Label>
                  <Input inputMode="numeric" value={form.listen_port} onChange={(event) => setForm((current) => ({ ...current, listen_port: event.target.value }))} />
                </div>
                <div className={ADMIN_FORM_FIELD_CLASS}>
                  <Label className={ADMIN_FORM_LABEL_CLASS}>{t("tunnels.source_allowlist")}</Label>
                  <Input value={form.source_allowlist} onChange={(event) => setForm((current) => ({ ...current, source_allowlist: event.target.value }))} />
                </div>
              </div>
            </section>

            <section className={ADMIN_FORM_SECTION_CLASS}>
              <div className={ADMIN_FORM_GRID_2_CLASS}>
                <div className={ADMIN_FORM_FIELD_CLASS}>
                  <Label className={ADMIN_FORM_LABEL_CLASS}>{t("tunnels.egress_group")}</Label>
                  <Select.Root value={form.egress_group} onValueChange={(value) => setForm((current) => ({ ...current, egress_group: value }))}>
                    <Select.Trigger className={ADMIN_FORM_SELECT_TRIGGER_CLASS} placeholder={t("tunnels.select_group")} />
                    <Select.Content>
                      {groupOptions(groups, form.egress_group).map((group) => (
                        <Select.Item key={group.name} value={group.name}>
                          {group.name}{group.client_count === 0 ? ` · ${t("tunnels.group_empty")}` : ` · ${group.client_count}`}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
                <div className={ADMIN_FORM_FIELD_CLASS}>
                  <Label className={ADMIN_FORM_LABEL_CLASS}>{t("tunnels.target_host")}</Label>
                  <Input value={form.target_host} onChange={(event) => setForm((current) => ({ ...current, target_host: event.target.value }))} />
                </div>
                <div className={ADMIN_FORM_FIELD_CLASS}>
                  <Label className={ADMIN_FORM_LABEL_CLASS}>{t("tunnels.target_port")}</Label>
                  <Input inputMode="numeric" value={form.target_port} onChange={(event) => setForm((current) => ({ ...current, target_port: event.target.value }))} />
                </div>
                <div className={ADMIN_FORM_FIELD_CLASS}>
                  <Label className={ADMIN_FORM_LABEL_CLASS}>{t("tunnels.max_sessions")}</Label>
                  <Input inputMode="numeric" value={form.max_concurrent_sessions} onChange={(event) => setForm((current) => ({ ...current, max_concurrent_sessions: event.target.value }))} />
                </div>
              </div>
            </section>
          </div>
          <div className={ADMIN_FORM_FOOTER_CLASS}>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {t("common.cancel", { defaultValue: "取消" })}
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? t("common.saving", { defaultValue: "保存中..." }) : t("common.save", { defaultValue: "保存" })}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </AdminPageShell>
  );
}

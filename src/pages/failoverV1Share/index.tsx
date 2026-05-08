import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Copy, LockKeyhole, RefreshCw } from "lucide-react";

import { Badge } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import {
  getPublicFailoverShare,
  type FailoverExecutionSummary,
  type FailoverPublicShareData,
  type FailoverTask,
} from "@/lib/failover";
import { getReadableErrorMessage } from "@/lib/apiErrorMessage";
import { cn } from "@/lib/utils";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function getStatusColor(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase();
  if (["healthy", "success", "active", "running"].includes(normalized)) return "green";
  if (["queued", "pending", "detecting", "provisioning", "rebinding_ip", "waiting_agent", "running_script", "switching_dns", "cleaning_old"].includes(normalized)) return "blue";
  if (["failed", "error", "manual_review"].includes(normalized)) return "red";
  if (["disabled", "cooldown", "warning", "consumed", "expired"].includes(normalized)) return "amber";
  return "gray";
}

function getSelectedPlanName(task: FailoverTask, execution: FailoverExecutionSummary) {
  if (!execution.selected_plan_id) return "-";
  return task.plans.find((plan) => plan.id === execution.selected_plan_id)?.name || `#${execution.selected_plan_id}`;
}

function ReadOnlyTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export default function FailoverV1SharePage() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [share, setShare] = React.useState<FailoverPublicShareData | null>(null);

  const loadShare = React.useCallback(async (options?: { refresh?: boolean }) => {
    if (!token) {
      setError(t("failover.share.invalid", { defaultValue: "分享链接无效" }));
      setLoading(false);
      return;
    }

    if (options?.refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const data = await getPublicFailoverShare(token);
      setShare(data);
      setError("");
    } catch (loadError) {
      setShare(null);
      setError(getReadableErrorMessage(loadError, t("failover.share.public_load_failed", { defaultValue: "加载分享信息失败，请稍后重试。" })));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, token]);

  React.useEffect(() => {
    void loadShare();
  }, [loadShare]);

  const copyLink = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t("copy_success", { defaultValue: "Copied!" }));
    } catch (copyError) {
      toast.error(getReadableErrorMessage(copyError, t("common.copy_failed", { defaultValue: "复制失败" })));
    }
  }, [t]);

  const task = share?.task ?? null;
  const executions = task?.recent_executions ?? [];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge color="blue">
                  <LockKeyhole className="mr-1 size-3.5" />
                  {t("failover.share.read_only", { defaultValue: "只读分享" })}
                </Badge>
                {share ? (
                  <Badge color={share.access_policy === "single_use" ? "amber" : "green"}>
                    {share.access_policy === "single_use"
                      ? t("failover.share.policy_single_use", { defaultValue: "一次性查看" })
                      : t("failover.share.policy_public", { defaultValue: "公开只读" })}
                  </Badge>
                ) : null}
              </div>
              <h1 className="truncate text-2xl font-semibold tracking-normal text-slate-950">
                {share?.title || task?.name || t("failover.share.public_title", { defaultValue: "故障转移任务状态" })}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                <span>V1</span>
                <span>{task?.name || "-"}</span>
                <span>{t("failover.share.generated_at", { defaultValue: "生成" })}: {formatDateTime(share?.generated_at)}</span>
                <span>{t("failover.share.expires_at", { defaultValue: "过期" })}: {formatDateTime(share?.expires_at)}</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button variant="outline" onClick={copyLink} disabled={!share}>
                <Copy className="size-4" />
                {t("common.copy", { defaultValue: "复制" })}
              </Button>
              <Button variant="outline" onClick={() => void loadShare({ refresh: true })} disabled={loading || refreshing}>
                <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
                {t("common.refresh", { defaultValue: "刷新" })}
              </Button>
            </div>
          </div>
          {share?.note ? (
            <div className="mt-4 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              {share.note}
            </div>
          ) : null}
        </header>

        {loading ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-2xl bg-white" />
            <div className="h-72 animate-pulse rounded-2xl bg-white" />
          </div>
        ) : error ? (
          <section className="rounded-2xl border border-red-200 bg-white px-5 py-10 text-center shadow-sm">
            <div className="text-lg font-semibold text-red-700">
              {t("common.error", { defaultValue: "Error" })}
            </div>
            <div className="mt-2 text-sm text-slate-600">{error}</div>
          </section>
        ) : task ? (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-lg font-semibold text-slate-950">{task.name}</span>
                    <Badge color={task.enabled ? "green" : "gray"}>
                      {task.enabled
                        ? t("common.enabled", { defaultValue: "Enabled" })
                        : t("common.disabled", { defaultValue: "Disabled" })}
                    </Badge>
                    <Badge color={getStatusColor(task.last_status)}>
                      {task.last_status || "unknown"}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {task.dns_provider || "-"} / {task.dns_entry_id || "-"} / {task.plans.length} {t("failover.share.plans", { defaultValue: "计划" })}
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  {t("failover.task.outlet_ip_label", { defaultValue: "Outlet IP" })}: {task.current_address || "-"}
                </div>
              </div>
              {task.last_message ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {task.last_message}
                </div>
              ) : null}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">
                  {t("failover.editor.section_plans", { defaultValue: "Failover plans" })}
                </h2>
                <span className="text-sm text-slate-500">{task.plans.length}</span>
              </div>
              <ReadOnlyTable>
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">{t("failover.plan.name", { defaultValue: "计划" })}</th>
                      <th className="px-4 py-3 text-left font-semibold">{t("cloud.provider", { defaultValue: "Provider" })}</th>
                      <th className="px-4 py-3 text-left font-semibold">{t("failover.plan.action", { defaultValue: "动作" })}</th>
                      <th className="px-4 py-3 text-left font-semibold">{t("failover.share.group", { defaultValue: "分组" })}</th>
                      <th className="px-4 py-3 text-left font-semibold">{t("common.status", { defaultValue: "Status" })}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {task.plans.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                          {t("failover.share.no_plans", { defaultValue: "没有配置计划。" })}
                        </td>
                      </tr>
                    ) : task.plans.map((plan) => (
                      <tr key={plan.id} className="align-top">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-950">{plan.name || `#${plan.id}`}</div>
                          <div className="mt-1 text-xs text-slate-500">P{plan.priority}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{plan.provider || "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{plan.action_type || "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{plan.provider_entry_group || plan.auto_connect_group || "-"}</td>
                        <td className="px-4 py-3">
                          <Badge color={plan.enabled ? "green" : "gray"}>
                            {plan.enabled
                              ? t("common.enabled", { defaultValue: "Enabled" })
                              : t("common.disabled", { defaultValue: "Disabled" })}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ReadOnlyTable>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">
                  {t("failover.share.recent_executions", { defaultValue: "最近执行" })}
                </h2>
                <span className="text-sm text-slate-500">{executions.length}</span>
              </div>
              <ReadOnlyTable>
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">ID</th>
                      <th className="px-4 py-3 text-left font-semibold">{t("failover.plan.name", { defaultValue: "计划" })}</th>
                      <th className="px-4 py-3 text-left font-semibold">{t("common.status", { defaultValue: "Status" })}</th>
                      <th className="px-4 py-3 text-left font-semibold">DNS</th>
                      <th className="px-4 py-3 text-left font-semibold">{t("failover.trigger_reason", { defaultValue: "触发原因" })}</th>
                      <th className="px-4 py-3 text-left font-semibold">{t("common.time", { defaultValue: "Time" })}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {executions.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                          {t("failover.task.no_execution", { defaultValue: "No execution recorded yet." })}
                        </td>
                      </tr>
                    ) : executions.map((execution) => (
                      <tr key={execution.id} className="align-top">
                        <td className="px-4 py-3 font-semibold text-slate-950">#{execution.id}</td>
                        <td className="px-4 py-3 text-slate-600">{getSelectedPlanName(task, execution)}</td>
                        <td className="px-4 py-3">
                          <Badge color={getStatusColor(execution.status)}>{execution.status || "unknown"}</Badge>
                          {execution.error_message ? (
                            <div className="mt-2 max-w-md text-xs leading-5 text-red-600">{execution.error_message}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <Badge color={getStatusColor(execution.dns_status)}>{execution.dns_status || "pending"}</Badge>
                            <Badge color={getStatusColor(execution.cleanup_status)}>{execution.cleanup_status || "pending"}</Badge>
                            <Badge color={getStatusColor(execution.script_status)}>{execution.script_status || "pending"}</Badge>
                          </div>
                        </td>
                        <td className="max-w-sm px-4 py-3 text-slate-600">{execution.trigger_reason || "-"}</td>
                        <td className="px-4 py-3 text-slate-500">
                          <div>{formatDateTime(execution.started_at)}</div>
                          <div className="mt-1 text-xs">{formatDateTime(execution.finished_at)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ReadOnlyTable>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

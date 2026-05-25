import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Copy, LockKeyhole, RefreshCw } from "lucide-react";

import { Badge } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import {
  getPublicFailoverShare,
  type FailoverPublicShareData,
} from "@/lib/failover";
import { getReadableErrorMessage } from "@/lib/apiErrorMessage";
import {
  getPublicFailoverResultText,
  getPublicFailoverStatusLabel,
  getPublicFailoverStatusTone,
} from "@/lib/failoverPublicView";
import { cn } from "@/lib/utils";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function ReadOnlyTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-slate-200 bg-white shadow-none", className)}>
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
  const enabledPlanCount = task?.enabled_plan_count ?? 0;
  const planCount = task?.plan_count ?? 0;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-none">
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
            <div className="mt-4 whitespace-pre-wrap border-l-2 border-slate-200 py-2 pl-3 text-sm leading-6 text-slate-700">
              {share.note}
            </div>
          ) : null}
        </header>

        {loading ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-lg bg-white" />
            <div className="h-72 animate-pulse rounded-lg bg-white" />
          </div>
        ) : error ? (
          <section className="rounded-lg border border-red-200 bg-white px-5 py-10 text-center shadow-none">
            <div className="text-lg font-semibold text-red-700">
              {t("common.error", { defaultValue: "Error" })}
            </div>
            <div className="mt-2 text-sm text-slate-600">{error}</div>
          </section>
        ) : task ? (
          <>
            <section className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-none">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-lg font-semibold text-slate-950">{task.name}</span>
                    <Badge color={task.enabled ? "green" : "gray"}>
                      {task.enabled
                        ? t("common.enabled", { defaultValue: "Enabled" })
                        : t("common.disabled", { defaultValue: "Disabled" })}
                    </Badge>
                    <Badge color={getPublicFailoverStatusTone(task.last_status)}>
                      {getPublicFailoverStatusLabel(t, task.last_status)}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {t("failover.share.available_outlets", { defaultValue: "可用备用出口" })}: {enabledPlanCount}/{planCount}
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  {t("failover.task.outlet_ip_label", { defaultValue: "Outlet IP" })}: {task.current_address || "-"}
                </div>
              </div>
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
                      <th className="px-4 py-3 text-left font-semibold">{t("common.status", { defaultValue: "Status" })}</th>
                      <th className="px-4 py-3 text-left font-semibold">{t("common.result", { defaultValue: "结果" })}</th>
                      <th className="px-4 py-3 text-left font-semibold">{t("common.time", { defaultValue: "Time" })}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {executions.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-slate-500" colSpan={3}>
                          {t("failover.task.no_execution", { defaultValue: "No execution recorded yet." })}
                        </td>
                      </tr>
                    ) : executions.map((execution, index) => (
                      <tr key={`${execution.started_at}-${index}`} className="align-top">
                        <td className="px-4 py-3">
                          <Badge color={getPublicFailoverStatusTone(execution.status)}>
                            {getPublicFailoverStatusLabel(t, execution.status)}
                          </Badge>
                        </td>
                        <td className="max-w-lg px-4 py-3 text-slate-600">
                          {getPublicFailoverResultText(t, execution.status)}
                        </td>
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

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
  type FailoverPublicExecutionSummary,
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

function PublicMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "gray" | "green" | "amber" | "red" | "blue";
}) {
  const toneClass = {
    default: "border-slate-200 bg-slate-50 text-slate-900",
    gray: "border-slate-200 bg-slate-50 text-slate-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    red: "border-red-200 bg-red-50 text-red-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
  }[tone];
  return (
    <div className={cn("rounded-lg border px-4 py-3", toneClass)}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 break-all text-sm font-semibold">{value || "-"}</div>
    </div>
  );
}

function getLatestExecution(task: FailoverPublicShareData["task"]): FailoverPublicExecutionSummary | null {
  return task.latest_execution || task.recent_executions?.[0] || null;
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
  const enabledPlanCount = task?.enabled_plan_count ?? 0;
  const planCount = task?.plan_count ?? 0;
  const latestExecution = task ? getLatestExecution(task) : null;

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
            <section className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-none">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
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
                  <div className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    {t("failover.share.public_description", {
                      defaultValue: "此页面仅展示对外服务状态，详细处理流程仅管理员可见。",
                    })}
                  </div>
                </div>
                <Badge color={getPublicFailoverStatusTone(task.last_status)}>
                  {getPublicFailoverStatusLabel(t, task.last_status)}
                </Badge>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <PublicMetric
                  label={t("failover.share.service_status", { defaultValue: "服务状态" })}
                  value={getPublicFailoverStatusLabel(t, task.last_status)}
                  tone={getPublicFailoverStatusTone(task.last_status)}
                />
                <PublicMetric
                  label={t("failover.share.service_address", { defaultValue: "当前服务地址" })}
                  value={task.current_address || "-"}
                />
                <PublicMetric
                  label={t("failover.share.protection_capacity", { defaultValue: "保障资源" })}
                  value={enabledPlanCount > 0 && planCount > 0
                    ? t("failover.share.capacity_ready", { defaultValue: "已准备" })
                    : t("failover.share.capacity_not_ready", { defaultValue: "未就绪" })}
                  tone={enabledPlanCount > 0 && planCount > 0 ? "green" : "amber"}
                />
                <PublicMetric
                  label={t("failover.share.last_update", { defaultValue: "最近更新" })}
                  value={formatDateTime(task.updated_at)}
                />
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-none">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-base font-semibold text-slate-950">
                    {t("failover.share.latest_result", { defaultValue: "最近处理" })}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">
                    {latestExecution
                      ? getPublicFailoverResultText(t, latestExecution.status)
                      : t("failover.share.no_recent_result", { defaultValue: "暂无公开处理记录。" })}
                  </div>
                </div>
                {latestExecution ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge color={getPublicFailoverStatusTone(latestExecution.status)}>
                      {getPublicFailoverStatusLabel(t, latestExecution.status)}
                    </Badge>
                    <span className="text-sm text-slate-500">
                      {formatDateTime(latestExecution.finished_at || latestExecution.started_at)}
                    </span>
                  </div>
                ) : null}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

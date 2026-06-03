import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Copy, LockKeyhole, RefreshCw } from "lucide-react";

import { Badge } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import {
  getPublicFailoverV2Share,
  type FailoverV2PublicExecutionSummary,
  type FailoverV2PublicShareData,
} from "@/lib/failoverV2";
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
    default: "admin-inline-surface text-foreground",
    gray: "admin-inline-surface text-foreground",
    green: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    red: "border-red-200 bg-red-50 text-red-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
  }[tone];
  return (
    <div className={cn("rounded-lg border px-4 py-3", toneClass)}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 break-all text-sm font-semibold">{value || "-"}</div>
    </div>
  );
}

function getLatestExecution(service: FailoverV2PublicShareData["service"]): FailoverV2PublicExecutionSummary | null {
  return service.latest_execution || service.recent_executions?.[0] || null;
}

export default function FailoverSharePage() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [share, setShare] = React.useState<FailoverV2PublicShareData | null>(null);

  const loadShare = React.useCallback(async (options?: { refresh?: boolean }) => {
    if (!token) {
      setError(t("failover_v2.share.invalid", { defaultValue: "分享链接无效" }));
      setLoading(false);
      return;
    }

    if (options?.refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const data = await getPublicFailoverV2Share(token);
      setShare(data);
      setError("");
    } catch (loadError) {
      setShare(null);
      setError(getReadableErrorMessage(loadError, t("failover_v2.share.public_load_failed", { defaultValue: "加载分享信息失败，请稍后重试。" })));
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
      toast.success(t("copy_success", { defaultValue: "已复制链接" }));
    } catch (copyError) {
      toast.error(getReadableErrorMessage(copyError, t("common.copy_failed", { defaultValue: "复制失败" })));
    }
  }, [t]);

  const service = share?.service ?? null;
  const latestExecution = service ? getLatestExecution(service) : null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <header className="admin-panel px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge color="blue">
                  <LockKeyhole className="mr-1 size-3.5" />
                  {t("failover_v2.share.read_only", { defaultValue: "只读分享" })}
                </Badge>
                {share ? (
                  <Badge color={share.access_policy === "single_use" ? "amber" : "green"}>
                    {share.access_policy === "single_use"
                      ? t("failover_v2.share.policy_single_use", { defaultValue: "一次性查看" })
                      : t("failover_v2.share.policy_public", { defaultValue: "公开只读" })}
                  </Badge>
                ) : null}
              </div>
              <h1 className="truncate text-2xl font-semibold tracking-normal text-foreground">
                {share?.title || service?.name || t("failover_v2.share.public_title", { defaultValue: "故障切换任务状态" })}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <span>{t("failover_v2.share.generated_at", { defaultValue: "生成" })}: {formatDateTime(share?.generated_at)}</span>
                <span>{t("failover_v2.share.expires_at", { defaultValue: "过期" })}: {formatDateTime(share?.expires_at)}</span>
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
            <div className="mt-4 whitespace-pre-wrap border-l-2 border-border py-2 pl-3 text-sm leading-6 text-foreground">
              {share.note}
            </div>
          ) : null}
        </header>

        {loading ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-lg bg-[var(--surface)]" />
            <div className="h-72 animate-pulse rounded-lg bg-[var(--surface)]" />
          </div>
        ) : error ? (
          <section className="admin-panel px-5 py-10 text-center">
            <div className="text-lg font-semibold text-red-700">
              {t("common.error", { defaultValue: "错误" })}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">{error}</div>
          </section>
        ) : service ? (
          <>
            <section className="admin-panel px-5 py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-lg font-semibold text-foreground">{service.name}</span>
                    <Badge color={service.enabled ? "green" : "gray"}>
                      {service.enabled
                        ? t("common.enabled", { defaultValue: "已启用" })
                        : t("common.disabled", { defaultValue: "停用" })}
                    </Badge>
                    <Badge color={getPublicFailoverStatusTone(service.last_status)}>
                      {getPublicFailoverStatusLabel(t, service.last_status)}
                    </Badge>
                  </div>
                  <div className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {t("failover_v2.share.public_description", {
                      defaultValue: "此页面仅展示对外服务状态，详细处理流程仅管理员可见。",
                    })}
                  </div>
                </div>
                <Badge color={getPublicFailoverStatusTone(service.last_status)}>
                  {getPublicFailoverStatusLabel(t, service.last_status)}
                </Badge>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <PublicMetric
                  label={t("failover_v2.share.service_status", { defaultValue: "服务状态" })}
                  value={getPublicFailoverStatusLabel(t, service.last_status)}
                  tone={getPublicFailoverStatusTone(service.last_status)}
                />
                <PublicMetric
                  label={t("failover_v2.share.protection_capacity", { defaultValue: "保障资源" })}
                  value={service.enabled_member_count > 0 && service.member_count > 0
                    ? t("failover_v2.share.capacity_ready", { defaultValue: "已准备" })
                    : t("failover_v2.share.capacity_not_ready", { defaultValue: "未就绪" })}
                  tone={service.enabled_member_count > 0 ? "green" : "amber"}
                />
                <PublicMetric
                  label={t("failover_v2.share.last_checked_at", { defaultValue: "最近检查" })}
                  value={formatDateTime(service.last_checked_at)}
                />
                <PublicMetric
                  label={t("failover_v2.share.last_update", { defaultValue: "最近更新" })}
                  value={formatDateTime(service.updated_at)}
                />
              </div>
            </section>

            <section className="admin-panel px-5 py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-base font-semibold text-foreground">
                    {t("failover_v2.share.latest_result", { defaultValue: "最近处理" })}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">
                    {latestExecution
                      ? getPublicFailoverResultText(t, latestExecution.status)
                      : t("failover_v2.share.no_recent_result", { defaultValue: "暂无公开处理记录。" })}
                  </div>
                </div>
                {latestExecution ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge color={getPublicFailoverStatusTone(latestExecution.status)}>
                      {getPublicFailoverStatusLabel(t, latestExecution.status)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
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

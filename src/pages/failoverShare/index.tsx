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
  type FailoverV2PublicMember,
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

function getMemberAddress(member: FailoverV2PublicMember) {
  return member.current_address || "-";
}

function getExecutionMemberName(execution: FailoverV2PublicExecutionSummary) {
  return execution.member_name || "-";
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
  const members = service?.members ?? [];
  const executions = service?.recent_executions ?? [];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-none">
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
              <h1 className="truncate text-2xl font-semibold tracking-normal text-slate-950">
                {share?.title || service?.name || t("failover_v2.share.public_title", { defaultValue: "故障切换任务状态" })}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                <span>{service?.name || "-"}</span>
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
              {t("common.error", { defaultValue: "错误" })}
            </div>
            <div className="mt-2 text-sm text-slate-600">{error}</div>
          </section>
        ) : service ? (
          <>
            <section className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-none">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-lg font-semibold text-slate-950">{service.name}</span>
                    <Badge color={service.enabled ? "green" : "gray"}>
                      {service.enabled
                        ? t("common.enabled", { defaultValue: "已启用" })
                        : t("common.disabled", { defaultValue: "停用" })}
                    </Badge>
                    <Badge color={getPublicFailoverStatusTone(service.last_status)}>
                      {getPublicFailoverStatusLabel(t, service.last_status)}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {service.enabled_member_count} {t("common.enabled", { defaultValue: "已启用" })} / {service.member_count} {t("failover_v2.share.members", { defaultValue: "成员" })}
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  {t("failover_v2.share.last_checked_at", { defaultValue: "最近检查" })}: {formatDateTime(service.last_checked_at)}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">
                  {t("failover_v2.share.member_status", { defaultValue: "成员状态" })}
                </h2>
                <span className="text-sm text-slate-500">{members.length}</span>
              </div>
              <ReadOnlyTable>
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">{t("failover_v2.member", { defaultValue: "成员" })}</th>
                      <th className="px-4 py-3 text-left font-semibold">{t("failover_v2.workbench.current_outlet", { defaultValue: "当前出口" })}</th>
                      <th className="px-4 py-3 text-left font-semibold">{t("common.status", { defaultValue: "状态" })}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {members.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-slate-500" colSpan={3}>
                          {t("failover_v2.no_members", { defaultValue: "当前还没有成员。" })}
                        </td>
                      </tr>
                    ) : members.map((member) => (
                      <tr key={member.id} className="align-top">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-950">{member.name || `#${member.id}`}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">{getMemberAddress(member)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <Badge color={member.enabled ? "green" : "gray"}>
                              {member.enabled
                                ? t("common.enabled", { defaultValue: "已启用" })
                                : t("common.disabled", { defaultValue: "停用" })}
                            </Badge>
                            <Badge color={getPublicFailoverStatusTone(member.last_status)}>
                              {getPublicFailoverStatusLabel(t, member.last_status)}
                            </Badge>
                          </div>
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
                  {t("failover_v2.share.recent_executions", { defaultValue: "最近执行" })}
                </h2>
                <span className="text-sm text-slate-500">{executions.length}</span>
              </div>
              <ReadOnlyTable>
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">{t("failover_v2.member", { defaultValue: "成员" })}</th>
                      <th className="px-4 py-3 text-left font-semibold">{t("common.status", { defaultValue: "状态" })}</th>
                      <th className="px-4 py-3 text-left font-semibold">{t("common.result", { defaultValue: "结果" })}</th>
                      <th className="px-4 py-3 text-left font-semibold">{t("common.time", { defaultValue: "时间" })}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {executions.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>
                          {t("failover_v2.execution_empty", { defaultValue: "暂无执行记录" })}
                        </td>
                      </tr>
                    ) : executions.map((execution, index) => (
                      <tr key={`${execution.started_at}-${execution.member_name}-${index}`} className="align-top">
                        <td className="px-4 py-3 text-slate-600">{getExecutionMemberName(execution)}</td>
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

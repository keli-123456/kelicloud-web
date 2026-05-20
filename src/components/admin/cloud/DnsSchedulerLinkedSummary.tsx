import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Clock3, ExternalLink, LoaderCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getDNSSchedulerSnapshot,
  type DNSSchedulerItem,
  type DNSSchedulerItemStatus,
  type DNSSchedulerSnapshot,
} from "@/lib/dnsScheduler";
import { cn } from "@/lib/utils";

type DnsSchedulerLinkedSummaryProps = {
  sourceType: "failover_v1" | "failover_v2";
  sourceId: number | string;
  className?: string;
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatNextRun(value?: string | null) {
  if (!value) return "-";
  const finishedAt = new Date(value);
  if (Number.isNaN(finishedAt.getTime())) return "-";
  return new Date(finishedAt.getTime() + 60_000).toLocaleTimeString();
}

function statusVariant(status?: string): React.ComponentProps<typeof Badge>["variant"] {
  switch (String(status || "").trim()) {
    case "synced":
    case "watching":
      return "success";
    case "error":
      return "destructive";
    case "skipped_duplicate":
      return "warning";
    case "pending":
      return "info";
    case "disabled":
    default:
      return "secondary";
  }
}

function statusLabel(status: string | undefined, t: ReturnType<typeof useTranslation>["t"]) {
  const normalized = String(status || "pending").trim() as DNSSchedulerItemStatus;
  switch (normalized) {
    case "synced":
      return t("cloud.dns.scheduler.status.synced", { defaultValue: "已同步" });
    case "error":
      return t("cloud.dns.scheduler.status.error", { defaultValue: "异常" });
    case "skipped_duplicate":
      return t("cloud.dns.scheduler.status.skipped_duplicate", { defaultValue: "已合并" });
    case "watching":
      return t("cloud.dns.scheduler.status.watching", { defaultValue: "监听中" });
    case "disabled":
      return t("cloud.dns.scheduler.status.disabled", { defaultValue: "已停用" });
    default:
      return t("cloud.dns.scheduler.status.pending", { defaultValue: "待调度" });
  }
}

function formatProvider(
  provider: string,
  t: ReturnType<typeof useTranslation>["t"],
) {
  switch (String(provider || "").trim().toLowerCase()) {
    case "cloudflare":
      return "Cloudflare";
    case "aliyun":
      return t("cloud.dns.provider_names.aliyun", { defaultValue: "Aliyun" });
    default:
      return provider || "-";
  }
}

function findLinkedItem(
  snapshot: DNSSchedulerSnapshot | null,
  sourceType: DnsSchedulerLinkedSummaryProps["sourceType"],
  sourceId: DnsSchedulerLinkedSummaryProps["sourceId"],
) {
  const normalizedId = String(sourceId || "").trim();
  return (snapshot?.items || []).find((item) => (
    item.source_type === sourceType
    && String(item.source_id || item.id || "").trim() === normalizedId
  )) || null;
}

function renderIPPair(item: DNSSchedulerItem) {
  const values = [
    item.current_ipv4 ? `IPv4 ${item.current_ipv4}` : "",
    item.current_ipv6 ? `IPv6 ${item.current_ipv6}` : "",
  ].filter(Boolean);
  return values.length ? values.join(" / ") : "-";
}

function getDnsSchedulerLink(
  sourceType: DnsSchedulerLinkedSummaryProps["sourceType"],
  sourceId: DnsSchedulerLinkedSummaryProps["sourceId"],
) {
  const params = new URLSearchParams({
    tab: "scheduler",
    source: sourceType,
    source_id: String(sourceId),
  });
  return `/admin/dns?${params.toString()}`;
}

export default function DnsSchedulerLinkedSummary({
  sourceType,
  sourceId,
  className,
}: DnsSchedulerLinkedSummaryProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = React.useState<DNSSchedulerSnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const loadSnapshot = React.useCallback(async (quiet = false) => {
    if (!quiet) {
      setRefreshing(true);
    }
    setError("");
    try {
      const data = await getDNSSchedulerSnapshot();
      setSnapshot(data);
    } catch (loadError) {
      setError(loadError instanceof Error
        ? loadError.message
        : t("cloud.dns.scheduler.linked_load_failed", { defaultValue: "加载 DNS 调度状态失败" }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  React.useEffect(() => {
    void loadSnapshot(true);
    const timer = window.setInterval(() => {
      void loadSnapshot(true);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [loadSnapshot, sourceId, sourceType]);

  const item = React.useMemo(
    () => findLinkedItem(snapshot, sourceType, sourceId),
    [snapshot, sourceId, sourceType],
  );
  const schedulerHref = getDnsSchedulerLink(sourceType, sourceId);
  const lastRun = snapshot?.last_run;

  return (
    <div className={cn("rounded-lg border border-border bg-card p-3 dark:border-slate-800 dark:bg-slate-950/40", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Clock3 className="h-3.5 w-3.5 text-blue-500" />
            {t("cloud.dns.scheduler.linked_title", { defaultValue: "DNS 调度" })}
          </div>
          <div className="mt-1 text-[11px] leading-4 text-muted-foreground">
            {t("cloud.dns.scheduler.linked_hint", { defaultValue: "统一队列会合并同凭证同记录的写入请求。" })}
          </div>
        </div>
        <button
          type="button"
          className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          onClick={() => void loadSnapshot()}
          disabled={refreshing}
          title={t("common.refresh", { defaultValue: "Refresh" })}
        >
          {refreshing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
      </div>

      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          {t("loading", { defaultValue: "Loading..." })}
        </div>
      ) : error ? (
        <div className="mt-3 flex gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/70 dark:bg-red-950/20 dark:text-red-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : item ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(item.status)}>{statusLabel(item.status, t)}</Badge>
            {item.status === "skipped_duplicate" ? (
              <Badge variant="warning">
                {t("cloud.dns.scheduler.linked_coalesced", { defaultValue: "已合并写入" })}
              </Badge>
            ) : null}
            <span className="text-[11px] text-muted-foreground">
              {t("cloud.dns.scheduler.linked_next_run", {
                defaultValue: "下一轮约 {{time}}",
                time: formatNextRun(lastRun?.finished_at || lastRun?.started_at),
              })}
            </span>
          </div>
          <div className="grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div className="min-w-0 rounded-md border border-border bg-background/60 px-2.5 py-2 dark:border-slate-800">
              <div className="text-[11px] font-medium text-muted-foreground">
                {t("cloud.dns.scheduler.detail_dns_target", { defaultValue: "DNS 目标" })}
              </div>
              <div className="mt-1 truncate font-medium text-foreground" title={item.record_key || undefined}>
                {item.record_key || "-"}
              </div>
            </div>
            <div className="min-w-0 rounded-md border border-border bg-background/60 px-2.5 py-2 dark:border-slate-800">
              <div className="text-[11px] font-medium text-muted-foreground">
                {t("cloud.dns.scheduler.detail_provider", { defaultValue: "服务商" })}
              </div>
              <div className="mt-1 truncate font-medium text-foreground">
                {formatProvider(item.provider, t)} / {item.entry_id || "-"}
              </div>
            </div>
            <div className="min-w-0 rounded-md border border-border bg-background/60 px-2.5 py-2 dark:border-slate-800">
              <div className="text-[11px] font-medium text-muted-foreground">
                {t("cloud.dns.scheduler.table.current_ip", { defaultValue: "当前 IP" })}
              </div>
              <div className="mt-1 truncate font-mono text-[11px] text-foreground" title={renderIPPair(item)}>
                {renderIPPair(item)}
              </div>
            </div>
            <div className="min-w-0 rounded-md border border-border bg-background/60 px-2.5 py-2 dark:border-slate-800">
              <div className="text-[11px] font-medium text-muted-foreground">
                {t("cloud.dns.scheduler.table.synced_at", { defaultValue: "最近时间" })}
              </div>
              <div className="mt-1 truncate font-medium text-foreground">
                {formatDateTime(item.last_synced_at || item.updated_at)}
              </div>
            </div>
          </div>
          {item.last_error || item.reason ? (
            <div className={cn(
              "rounded-md border px-3 py-2 text-xs leading-5",
              item.last_error
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/20 dark:text-red-200"
                : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/20 dark:text-blue-200",
            )}>
              {item.last_error || item.reason}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-dashed border-border px-3 py-2 text-xs leading-5 text-muted-foreground dark:border-slate-800">
          {t("cloud.dns.scheduler.linked_empty", {
            defaultValue: "这个任务当前没有进入 DNS 调度队列，通常是未配置 DNS 或任务不可用。",
          })}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 h-8 w-full justify-center text-xs"
        onClick={() => navigate(schedulerHref)}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {t("cloud.dns.scheduler.linked_open", { defaultValue: "查看调度详情" })}
      </Button>
    </div>
  );
}

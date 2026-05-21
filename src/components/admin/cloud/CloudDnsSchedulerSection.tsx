import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Activity,
  CheckCircle2,
  CircleDotDashed,
  Clock3,
  ExternalLink,
  Eye,
  GitMerge,
  Info,
  ListChecks,
  Network,
  Play,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { Badge, Button } from "@/components/admin/admin-ui";
import { AdminEmptyState, AdminTableSkeleton } from "@/components/admin/AdminPageShell";
import { Input } from "@/components/ui/input";
import {
  getDNSSchedulerSnapshot,
  syncDNSSchedulerNow,
  type DNSSchedulerItem,
  type DNSSchedulerSnapshot,
} from "@/lib/dnsScheduler";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;
const SOURCE_FILTERS = ["all", "ddns", "failover_v1", "failover_v2"] as const;
type SourceFilter = (typeof SOURCE_FILTERS)[number];
type BadgeTone = "gray" | "red" | "amber" | "green" | "blue";

function parseSourceFilter(value?: string | null): SourceFilter {
  return SOURCE_FILTERS.includes(value as SourceFilter) ? value as SourceFilter : "all";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function providerLabel(value: string, t: ReturnType<typeof useTranslation>["t"]) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "cloudflare") return "Cloudflare";
  if (normalized === "aliyun") {
    return t("cloud.dns.provider_names.aliyun", { defaultValue: "Aliyun" });
  }
  return value || "-";
}

function statusColor(status: string) {
  switch (status) {
    case "synced":
      return "green";
    case "error":
      return "red";
    case "skipped_duplicate":
      return "amber";
    case "disabled":
      return "gray";
    case "watching":
      return "blue";
    default:
      return "blue";
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "synced":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "error":
      return <XCircle className="h-3.5 w-3.5" />;
    case "skipped_duplicate":
      return <GitMerge className="h-3.5 w-3.5" />;
    case "watching":
      return <Eye className="h-3.5 w-3.5" />;
    case "disabled":
      return <CircleDotDashed className="h-3.5 w-3.5" />;
    default:
      return <CircleDotDashed className="h-3.5 w-3.5" />;
  }
}

function statusLabel(status: string, t: ReturnType<typeof useTranslation>["t"]) {
  switch (status) {
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

function sourceLabel(sourceType: string, t: ReturnType<typeof useTranslation>["t"]) {
  switch (sourceType) {
    case "ddns":
      return t("cloud.dns.scheduler.source.ddns", { defaultValue: "DDNS" });
    case "failover_v1":
      return t("cloud.dns.scheduler.source.failover_v1", { defaultValue: "故障切换 V1" });
    case "failover_v2":
      return t("cloud.dns.scheduler.source.failover_v2", { defaultValue: "故障切换 V2" });
    default:
      return sourceType || "-";
  }
}

function sourceColor(sourceType: string) {
  switch (sourceType) {
    case "ddns":
      return "blue";
    case "failover_v1":
      return "amber";
    case "failover_v2":
      return "green";
    default:
      return "gray";
  }
}

function sourceFilterLabel(sourceFilter: SourceFilter, t: ReturnType<typeof useTranslation>["t"]) {
  if (sourceFilter === "all") {
    return t("cloud.dns.scheduler.source.all", { defaultValue: "全部" });
  }
  return sourceLabel(sourceFilter, t);
}

function renderIPPair(item: DNSSchedulerItem) {
  const values = [
    item.current_ipv4 ? `IPv4 ${item.current_ipv4}` : "",
    item.current_ipv6 ? `IPv6 ${item.current_ipv6}` : "",
  ].filter(Boolean);
  return values.length ? values.join(" / ") : "-";
}

function getSchedulerItemKey(item: DNSSchedulerItem) {
  return [
    item.source_type,
    item.id,
    item.client_uuid,
    item.provider,
    item.entry_id,
    item.record_key,
  ].join(":");
}

function displayValue(value?: string | null) {
  const normalized = String(value || "").trim();
  return normalized || "-";
}

function mergeDecisionLabel(item: DNSSchedulerItem, t: ReturnType<typeof useTranslation>["t"]) {
  const groupSize = Math.max(1, item.merge_group_size || 1);
  if (item.status === "skipped_duplicate") {
    return t("cloud.dns.scheduler.detail_merged", { defaultValue: "已被同凭证同记录任务合并" });
  }
  if (groupSize > 1) {
    return item.merge_group_primary
      ? t("cloud.dns.scheduler.detail_merge_primary", {
        defaultValue: "同一用户、凭证和 DNS 目标共有 {{count}} 个任务，本任务作为主项参与写入判断",
        count: groupSize,
      })
      : t("cloud.dns.scheduler.detail_merge_follower", {
        defaultValue: "同一用户、凭证和 DNS 目标共有 {{count}} 个任务，本任务会跟随主项的写入判断",
        count: groupSize,
      });
  }
  if (item.status === "disabled") {
    return t("cloud.dns.scheduler.detail_disabled", { defaultValue: "任务已停用，不会进入写入队列" });
  }
  return t("cloud.dns.scheduler.detail_independent", { defaultValue: "作为独立 DNS 目标参与调度" });
}

function mergeGroupBadge(item: DNSSchedulerItem, t: ReturnType<typeof useTranslation>["t"]) {
  const groupSize = Math.max(1, item.merge_group_size || 1);
  if (groupSize <= 1) {
    return null;
  }
  return item.merge_group_primary
    ? t("cloud.dns.scheduler.merge_group_primary", {
      defaultValue: "合并组 {{count}} · 主项",
      count: groupSize,
    })
    : t("cloud.dns.scheduler.merge_group_follower", {
      defaultValue: "合并组 {{count}} · 跟随",
      count: groupSize,
    });
}

function getSourceTaskHref(item: DNSSchedulerItem) {
  const sourceId = String(item.source_id || "").trim();
  if (!sourceId) {
    return "";
  }
  if (item.source_type === "failover_v1") {
    return `/admin/failover?${new URLSearchParams({ task: sourceId }).toString()}`;
  }
  if (item.source_type === "failover_v2") {
    return `/admin/failover-v2?${new URLSearchParams({ service: sourceId }).toString()}`;
  }
  return "";
}

function SchedulerFlow() {
  const { t } = useTranslation();
  const steps = [
    t("cloud.dns.scheduler.flow.scan", { defaultValue: "扫描 DDNS 和故障切换 DNS" }),
    t("cloud.dns.scheduler.flow.merge", { defaultValue: "按用户/令牌/记录合并" }),
    t("cloud.dns.scheduler.flow.diff", { defaultValue: "对比本地 IP 状态" }),
    t("cloud.dns.scheduler.flow.apply", { defaultValue: "必要时请求 DNS API" }),
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_18px_45px_-34px_rgba(15,23,42,0.65)] dark:border-slate-800/90 dark:bg-slate-950">
      <div className="grid divide-y divide-border dark:divide-slate-800 md:grid-cols-4 md:divide-x md:divide-y-0">
        {steps.map((step, index) => (
          <div key={step} className="flex min-h-14 items-center gap-3 px-4 py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-sm font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
              {index + 1}
            </span>
            <span className="min-w-0 text-sm font-medium leading-5 text-slate-800 dark:text-slate-100">
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SchedulerToolbar({
  snapshot,
  refreshing,
  syncing,
  onRefresh,
  onSync,
}: {
  snapshot: DNSSchedulerSnapshot | null;
  refreshing: boolean;
  syncing: boolean;
  onRefresh: () => void;
  onSync: () => void;
}) {
  const { t } = useTranslation();
  const run = snapshot?.last_run;
  const execution = snapshot?.dns_execution;

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.65)] dark:border-slate-800/90 dark:bg-slate-950 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Badge color={snapshot?.running ? "blue" : "gray"} className="gap-1">
          <Activity className="h-3.5 w-3.5" />
          {snapshot?.running
            ? t("cloud.dns.scheduler.running", { defaultValue: "调度中" })
            : t("cloud.dns.scheduler.idle", { defaultValue: "等待下一轮" })}
        </Badge>
        <Badge color="green">
          {t("cloud.dns.scheduler.synced_count", {
            defaultValue: "已同步 {{count}}",
            count: snapshot?.synced || 0,
          })}
        </Badge>
        <Badge color="blue">
          {t("cloud.dns.scheduler.pending_count", {
            defaultValue: "待处理 {{count}}",
            count: snapshot?.pending || 0,
          })}
        </Badge>
        <Badge color={snapshot?.failed ? "red" : "gray"}>
          {t("cloud.dns.scheduler.failed_count", {
            defaultValue: "异常 {{count}}",
            count: snapshot?.failed || 0,
          })}
        </Badge>
        {snapshot?.deduped ? (
          <Badge color="amber">
            {t("cloud.dns.scheduler.deduped_count", {
              defaultValue: "合并 {{count}}",
              count: snapshot.deduped,
            })}
          </Badge>
        ) : null}
        <span className="mx-1 hidden h-4 w-px bg-border sm:inline-block" />
        <Badge color="blue">
          {t("cloud.dns.scheduler.source_ddns_count", {
            defaultValue: "DDNS {{count}}",
            count: snapshot?.source_counts?.ddns || 0,
          })}
        </Badge>
        <Badge color="amber">
          {t("cloud.dns.scheduler.source_v1_count", {
            defaultValue: "V1 {{count}}",
            count: snapshot?.source_counts?.failover_v1 || 0,
          })}
        </Badge>
        <Badge color="green">
          {t("cloud.dns.scheduler.source_v2_count", {
            defaultValue: "V2 {{count}}",
            count: snapshot?.source_counts?.failover_v2 || 0,
          })}
        </Badge>
        <span className="mx-1 hidden h-4 w-px bg-border sm:inline-block" />
        <Badge color={execution?.inflight ? "blue" : "gray"}>
          {t("cloud.dns.scheduler.execution_inflight", {
            defaultValue: "执行中 {{count}}",
            count: execution?.inflight || 0,
          })}
        </Badge>
        <Badge color="gray">
          {t("cloud.dns.scheduler.execution_api_requests", {
            defaultValue: "API {{count}}",
            count: execution?.api_requests || 0,
          })}
        </Badge>
        <Badge color="blue">
          {t("cloud.dns.scheduler.execution_cf_batch", {
            defaultValue: "CF 批量 {{count}}",
            count: execution?.cloudflare_batch_writes || 0,
          })}
        </Badge>
        <Badge color="amber">
          {t("cloud.dns.scheduler.execution_aliyun_single", {
            defaultValue: "阿里云单条 {{count}}",
            count: execution?.aliyun_single_writes || 0,
          })}
        </Badge>
        <Badge color="amber">
          {t("cloud.dns.scheduler.execution_coalesced", {
            defaultValue: "并发合并 {{count}}",
            count: execution?.coalesced || 0,
          })}
        </Badge>
        <Badge color={snapshot?.dedupe_groups ? "amber" : "gray"}>
          {t("cloud.dns.scheduler.dedupe_groups", {
            defaultValue: "目标合并组 {{count}}",
            count: snapshot?.dedupe_groups || 0,
          })}
        </Badge>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden flex-col items-end gap-1 text-xs text-muted-foreground sm:flex">
          <span className="inline-flex items-center gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
            {t("cloud.dns.scheduler.auto_refresh", { defaultValue: "每 15 秒自动更新" })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {t("cloud.dns.scheduler.last_run", {
              defaultValue: "最近一轮 {{time}} · {{ms}}ms",
              time: formatDateTime(run?.finished_at || run?.started_at),
              ms: run?.duration_ms || 0,
            })}
          </span>
        </div>
        <Button
          type="button"
          variant="default"
          size="sm"
          className="gap-2"
          disabled={refreshing || syncing || snapshot?.running}
          onClick={onSync}
        >
          {syncing || snapshot?.running ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {syncing || snapshot?.running
            ? t("cloud.dns.scheduler.manual_syncing", { defaultValue: "同步中" })
            : t("cloud.dns.scheduler.manual_sync", { defaultValue: "立即同步" })}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={refreshing}
          onClick={onRefresh}
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          {t("common.refresh", { defaultValue: "刷新" })}
        </Button>
      </div>
    </div>
  );
}

function SchedulerSourceOverview({
  snapshot,
  sourceFilter,
  onSourceFilterChange,
}: {
  snapshot: DNSSchedulerSnapshot | null;
  sourceFilter: SourceFilter;
  onSourceFilterChange: (value: SourceFilter) => void;
}) {
  const { t } = useTranslation();
  const total = Math.max(1, snapshot?.total || 0);
  const execution = snapshot?.dns_execution;
  const sourceItems: Array<{ key: Exclude<SourceFilter, "all">; tone: BadgeTone }> = [
    { key: "ddns", tone: "blue" },
    { key: "failover_v1", tone: "amber" },
    { key: "failover_v2", tone: "green" },
  ];
  const executionItems = [
    {
      label: t("cloud.dns.scheduler.api_pressure_submitted", { defaultValue: "提交任务" }),
      value: execution?.submitted || 0,
    },
    {
      label: t("cloud.dns.scheduler.api_pressure_coalesced", { defaultValue: "并发合并" }),
      value: execution?.coalesced || 0,
    },
    {
      label: t("cloud.dns.scheduler.api_pressure_requests", { defaultValue: "实际 API" }),
      value: execution?.api_requests || 0,
    },
    {
      label: t("cloud.dns.scheduler.api_pressure_failed", { defaultValue: "失败" }),
      value: execution?.failed || 0,
    },
  ];
  const providerWrites = [
    {
      label: t("cloud.dns.scheduler.provider_write_cloudflare", { defaultValue: "Cloudflare" }),
      value: (execution?.cloudflare_batch_writes || 0) + (execution?.cloudflare_single_writes || 0),
      detail: t("cloud.dns.scheduler.provider_write_cloudflare_detail", {
        defaultValue: "批量 {{batch}} / 单条 {{single}}",
        batch: execution?.cloudflare_batch_writes || 0,
        single: execution?.cloudflare_single_writes || 0,
      }),
      tone: "blue" as BadgeTone,
    },
    {
      label: t("cloud.dns.scheduler.provider_write_aliyun", { defaultValue: "阿里云" }),
      value: execution?.aliyun_single_writes || 0,
      detail: t("cloud.dns.scheduler.provider_write_aliyun_detail", {
        defaultValue: "单条 {{count}}",
        count: execution?.aliyun_single_writes || 0,
      }),
      tone: "amber" as BadgeTone,
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
      <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.65)] dark:border-slate-800/90 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">
              {t("cloud.dns.scheduler.source_overview_title", { defaultValue: "来源分布" })}
            </div>
            <div className="mt-1 text-xs leading-5 text-muted-foreground">
              {t("cloud.dns.scheduler.source_overview_hint", {
                defaultValue: "DDNS、故障切换 V1 和 V2 会进入同一个 DNS 调度队列，再按目标合并。",
              })}
            </div>
          </div>
          <Button
            type="button"
            variant={sourceFilter === "all" ? "solid" : "outline"}
            size="sm"
            onClick={() => onSourceFilterChange("all")}
          >
            {t("cloud.dns.scheduler.source.all", { defaultValue: "全部" })}
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {sourceItems.map((source) => {
            const count = snapshot?.source_counts?.[source.key] || 0;
            const percentage = Math.min(100, Math.round((count / total) * 100));
            const active = sourceFilter === source.key;

            return (
              <button
                key={source.key}
                type="button"
                data-testid={`dns-scheduler-source-${source.key}`}
                className={cn(
                  "min-w-0 rounded-lg border px-3 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50/40 dark:hover:border-blue-800 dark:hover:bg-blue-950/20",
                  active
                    ? "border-blue-300 bg-blue-50 shadow-sm shadow-blue-950/5 dark:border-blue-800 dark:bg-blue-950/25"
                    : "border-border bg-background/60 dark:border-slate-800 dark:bg-slate-900/20",
                )}
                onClick={() => onSourceFilterChange(source.key)}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge color={source.tone}>{sourceLabel(source.key, t)}</Badge>
                  <span className="text-lg font-semibold tabular-nums text-slate-950 dark:text-slate-50">
                    {count}
                  </span>
                </div>
                <div className="mt-2 text-xs leading-5 text-muted-foreground">
                  {t(`cloud.dns.scheduler.source_description.${source.key}`, {
                    defaultValue: source.key === "ddns"
                      ? "Syncs records automatically when a node public IP changes."
                      : source.key === "failover_v1"
                        ? "Writes the active V1 failover address back to DNS after switching."
                        : "Queues V2 member changes through the unified scheduler.",
                  })}
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      source.tone === "green" ? "bg-green-500" : source.tone === "amber" ? "bg-amber-500" : "bg-blue-500",
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {t("cloud.dns.scheduler.source_card_count", {
                    defaultValue: "占队列 {{percent}}%",
                    percent: percentage,
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.65)] dark:border-slate-800/90 dark:bg-slate-950">
        <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">
          {t("cloud.dns.scheduler.api_pressure_title", { defaultValue: "API 压力" })}
        </div>
        <div className="mt-1 text-xs leading-5 text-muted-foreground">
          {t("cloud.dns.scheduler.api_pressure_hint", {
            defaultValue: "同凭证同记录会先合并；Cloudflare 尽量批量写入，阿里云按单条写入。",
          })}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {executionItems.map((item) => (
            <div key={item.label} className="rounded-md border border-border bg-background/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/20">
              <div className="text-[11px] font-medium text-muted-foreground">{item.label}</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-slate-950 dark:text-slate-50">{item.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-2">
          {providerWrites.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/20">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{item.label}</div>
                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.detail}</div>
              </div>
              <Badge color={item.tone}>{item.value}</Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SchedulerDetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background/65 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/25">
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 break-words text-xs font-semibold leading-5 text-slate-900 dark:text-slate-100",
          mono && "font-mono font-medium",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function SchedulerDetailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function SchedulerDecisionTimeline({
  item,
}: {
  item: DNSSchedulerItem;
}) {
  const { t } = useTranslation();
  const steps: Array<{ label: string; value: string; badge: string; tone: BadgeTone }> = [
    {
      label: t("cloud.dns.scheduler.detail_step_source", { defaultValue: "来源扫描" }),
      value: sourceLabel(item.source_type, t),
      badge: sourceLabel(item.source_type, t),
      tone: sourceColor(item.source_type) as BadgeTone,
    },
    {
      label: t("cloud.dns.scheduler.detail_step_merge", { defaultValue: "合并判断" }),
      value: mergeDecisionLabel(item, t),
      badge: mergeGroupBadge(item, t) || (item.status === "skipped_duplicate"
        ? t("cloud.dns.scheduler.status.skipped_duplicate", { defaultValue: "已合并" })
        : t("cloud.dns.scheduler.detail_candidate", { defaultValue: "候选" })),
      tone: item.status === "skipped_duplicate" || (item.merge_group_size || 0) > 1 ? "amber" : "blue",
    },
    {
      label: t("cloud.dns.scheduler.detail_step_ip", { defaultValue: "IP 对比" }),
      value: renderIPPair(item),
      badge: item.current_ipv4 || item.current_ipv6
        ? t("cloud.dns.scheduler.detail_ip_ready", { defaultValue: "已获取" })
        : t("cloud.dns.scheduler.status.pending", { defaultValue: "待调度" }),
      tone: item.current_ipv4 || item.current_ipv6 ? "green" : "gray",
    },
    {
      label: t("cloud.dns.scheduler.detail_step_apply", { defaultValue: "DNS 写入" }),
      value: statusLabel(item.status, t),
      badge: statusLabel(item.status, t),
      tone: statusColor(item.status) as BadgeTone,
    },
  ];

  return (
    <div className="space-y-2">
      {steps.map((step, index) => (
        <div key={step.label} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2">
          <div className="flex flex-col items-center">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-[11px] font-bold text-muted-foreground dark:border-slate-800">
              {index + 1}
            </span>
            {index < steps.length - 1 ? (
              <span className="mt-1 h-6 w-px bg-border dark:bg-slate-800" />
            ) : null}
          </div>
          <div className="min-w-0 pb-1">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                {step.label}
              </span>
              <Badge color={step.tone} className="shrink-0">
                {index === steps.length - 1 ? statusIcon(item.status) : null}
                {step.badge}
              </Badge>
            </div>
            <div className="mt-1 break-words text-xs leading-5 text-muted-foreground">
              {step.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SchedulerTaskDetailPanel({
  item,
}: {
  item: DNSSchedulerItem | null;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!item) {
    return (
      <aside className="border-t border-border p-4 dark:border-slate-800 lg:border-l lg:border-t-0">
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/25 px-6 text-center dark:border-slate-800">
          <Info className="mb-3 h-8 w-8 text-muted-foreground" />
          <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">
            {t("cloud.dns.scheduler.detail_empty_title", { defaultValue: "选择任务查看详情" })}
          </div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">
            {t("cloud.dns.scheduler.detail_empty_description", {
              defaultValue: "点击左侧任务行，可以查看 DNS 目标、IP 对比、合并判断和失败原因。",
            })}
          </div>
        </div>
      </aside>
    );
  }

  const sourceTaskHref = getSourceTaskHref(item);

  return (
    <aside className="border-t border-border bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-slate-900/15 lg:border-l lg:border-t-0">
      <div className="space-y-4 lg:sticky lg:top-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">
              {t("cloud.dns.scheduler.detail_title", { defaultValue: "任务详情" })}
            </div>
            <div className="mt-1 truncate text-xs text-muted-foreground">
              {item.record_key || item.source_name || item.client_name || "-"}
            </div>
          </div>
          <Badge color={statusColor(item.status)} className="shrink-0 gap-1">
            {statusIcon(item.status)}
            {statusLabel(item.status, t)}
          </Badge>
        </div>

        <SchedulerDetailSection
          title={t("cloud.dns.scheduler.detail_route", { defaultValue: "调度路径" })}
          icon={<ListChecks className="h-3.5 w-3.5" />}
        >
          <SchedulerDecisionTimeline item={item} />
        </SchedulerDetailSection>

        {(item.reason || item.last_error) ? (
          <div
            className={cn(
              "rounded-lg border px-3 py-2.5 text-xs leading-5",
              item.status === "error"
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
                : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200",
            )}
          >
            <div className="font-semibold">
              {item.status === "error"
                ? t("cloud.dns.scheduler.detail_error", { defaultValue: "失败原因" })
                : t("cloud.dns.scheduler.detail_reason", { defaultValue: "调度说明" })}
            </div>
            <div className="mt-1 break-words">{item.last_error || item.reason}</div>
          </div>
        ) : null}

        <SchedulerDetailSection
          title={t("cloud.dns.scheduler.detail_dns_target", { defaultValue: "DNS 目标" })}
          icon={<Network className="h-3.5 w-3.5" />}
        >
          <div className="grid gap-2">
            <SchedulerDetailField label={t("cloud.dns.scheduler.detail_provider", { defaultValue: "服务商" })} value={providerLabel(item.provider, t)} />
            <SchedulerDetailField label={t("cloud.dns.scheduler.detail_entry", { defaultValue: "凭据 / Token" })} value={displayValue(item.entry_id)} mono />
            <SchedulerDetailField label={t("cloud.dns.scheduler.detail_record", { defaultValue: "记录" })} value={displayValue(item.record_key)} mono />
            <SchedulerDetailField label={t("cloud.dns.scheduler.detail_address_mode", { defaultValue: "地址模式" })} value={displayValue(item.address_mode || "ipv4")} />
            <SchedulerDetailField
              label={t("cloud.dns.scheduler.detail_merge_group", { defaultValue: "合并组" })}
              value={mergeGroupBadge(item, t) || t("cloud.dns.scheduler.merge_group_single", { defaultValue: "独立目标" })}
            />
          </div>
        </SchedulerDetailSection>

        <SchedulerDetailSection
          title={t("cloud.dns.scheduler.detail_node_source", { defaultValue: "节点与来源" })}
          icon={<Server className="h-3.5 w-3.5" />}
        >
          <div className="grid gap-2">
            <SchedulerDetailField label={t("cloud.dns.scheduler.detail_source", { defaultValue: "来源" })} value={sourceLabel(item.source_type, t)} />
            <SchedulerDetailField label={t("cloud.dns.scheduler.detail_source_name", { defaultValue: "任务名称" })} value={displayValue(item.source_name || item.source_id)} />
            <SchedulerDetailField label={t("cloud.dns.scheduler.detail_source_status", { defaultValue: "来源状态" })} value={displayValue(item.source_status)} />
            <SchedulerDetailField label={t("cloud.dns.scheduler.detail_node", { defaultValue: "节点" })} value={displayValue(item.client_name || item.client_uuid)} />
            <SchedulerDetailField label={t("cloud.dns.scheduler.detail_node_uuid", { defaultValue: "节点 UUID" })} value={displayValue(item.client_uuid)} mono />
            {item.user_id ? (
              <SchedulerDetailField label={t("cloud.dns.scheduler.detail_user", { defaultValue: "用户" })} value={displayValue(item.user_id)} mono />
            ) : null}
            {sourceTaskHref ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 justify-center gap-2 text-xs"
                onClick={() => navigate(sourceTaskHref)}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("cloud.dns.scheduler.detail_open_source_task", { defaultValue: "Open source task" })}
              </Button>
            ) : null}
          </div>
        </SchedulerDetailSection>

        <SchedulerDetailSection
          title={t("cloud.dns.scheduler.detail_ip_state", { defaultValue: "IP 状态" })}
          icon={<Activity className="h-3.5 w-3.5" />}
        >
          <div className="grid grid-cols-2 gap-2">
            <SchedulerDetailField label="IPv4" value={displayValue(item.current_ipv4)} mono />
            <SchedulerDetailField label="IPv6" value={displayValue(item.current_ipv6)} mono />
            <SchedulerDetailField label={t("cloud.dns.scheduler.detail_last_ipv4", { defaultValue: "上次 IPv4" })} value={displayValue(item.last_ipv4)} mono />
            <SchedulerDetailField label={t("cloud.dns.scheduler.detail_last_ipv6", { defaultValue: "上次 IPv6" })} value={displayValue(item.last_ipv6)} mono />
          </div>
        </SchedulerDetailSection>

        <SchedulerDetailSection
          title={t("cloud.dns.scheduler.detail_time", { defaultValue: "时间" })}
          icon={<Clock3 className="h-3.5 w-3.5" />}
        >
          <div className="grid gap-2">
            <SchedulerDetailField label={t("cloud.dns.scheduler.table.synced_at", { defaultValue: "最近时间" })} value={formatDateTime(item.last_synced_at)} />
            <SchedulerDetailField label={t("cloud.dns.scheduler.detail_updated_at", { defaultValue: "更新时间" })} value={formatDateTime(item.updated_at)} />
          </div>
        </SchedulerDetailSection>
      </div>
    </aside>
  );
}

export default function CloudDnsSchedulerSection() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusedSource = parseSourceFilter(searchParams.get("source"));
  const focusedSourceId = String(searchParams.get("source_id") || "").trim();
  const [snapshot, setSnapshot] = useState<DNSSchedulerSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(() => focusedSource);
  const [page, setPage] = useState(1);
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);

  const loadSnapshot = useCallback(async (quiet = false) => {
    if (!quiet) {
      setRefreshing(true);
    }
    setError("");
    try {
      const data = await getDNSSchedulerSnapshot();
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.unknown_error", { defaultValue: "未知错误" }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadSnapshot(true);
    const timer = window.setInterval(() => {
      loadSnapshot(true);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [loadSnapshot]);

  useEffect(() => {
    if (focusedSource !== "all") {
      setSourceFilter(focusedSource);
    }
  }, [focusedSource]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const items = snapshot?.items || [];
    const sourceItems = sourceFilter === "all"
      ? items
      : items.filter((item) => item.source_type === sourceFilter);
    if (!normalized) return sourceItems;
    return sourceItems.filter((item) =>
      [
        item.source_type,
        item.source_name,
        item.source_status,
        item.client_name,
        item.client_uuid,
        item.provider,
        item.entry_id,
        item.record_key,
        item.current_ipv4,
        item.current_ipv6,
        item.last_error,
        item.reason,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, snapshot, sourceFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selectedItem = useMemo(
    () => filteredItems.find((item) => getSchedulerItemKey(item) === selectedItemKey) || null,
    [filteredItems, selectedItemKey],
  );

  useEffect(() => {
    setPage(1);
  }, [query, sourceFilter]);

  useEffect(() => {
    if (filteredItems.length === 0) {
      if (selectedItemKey !== null) {
        setSelectedItemKey(null);
      }
      return;
    }

    const focusedItem = focusedSource !== "all" && focusedSourceId
      ? filteredItems.find((item) => (
        item.source_type === focusedSource
        && String(item.source_id || item.id || "").trim() === focusedSourceId
      ))
      : null;
    if (focusedItem) {
      const focusedIndex = filteredItems.indexOf(focusedItem);
      const focusedPage = Math.floor(focusedIndex / PAGE_SIZE) + 1;
      if (focusedPage > 0 && page !== focusedPage) {
        setPage(focusedPage);
      }
      const focusedKey = getSchedulerItemKey(focusedItem);
      if (selectedItemKey !== focusedKey) {
        setSelectedItemKey(focusedKey);
      }
      return;
    }

    if (!selectedItemKey || !filteredItems.some((item) => getSchedulerItemKey(item) === selectedItemKey)) {
      setSelectedItemKey(getSchedulerItemKey(filteredItems[0]));
    }
  }, [filteredItems, focusedSource, focusedSourceId, page, selectedItemKey]);

  const handleSourceFilterChange = useCallback((value: SourceFilter) => {
    setSourceFilter(value);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    params.delete("source");
    params.delete("source_id");
    if (value === "all") {
      params.delete("tab");
      params.set("tab", "scheduler");
    }
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleManualSync = useCallback(async () => {
    setSyncing(true);
    setError("");
    try {
      const result = await syncDNSSchedulerNow();
      setSnapshot(result.snapshot);
      if (result.started) {
        toast.success(t("cloud.dns.scheduler.manual_sync_success", {
          defaultValue: "DNS 手动同步已完成",
        }));
      } else {
        toast.info(t("cloud.dns.scheduler.manual_sync_already_running", {
          defaultValue: "DNS 调度正在运行，已刷新当前状态",
        }));
      }
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : t("cloud.dns.scheduler.manual_sync_failed", { defaultValue: "DNS 手动同步失败" });
      setError(message);
      toast.error(message);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, [t]);

  if (loading) {
    return (
      <div className="space-y-4">
        <SchedulerFlow />
        <AdminTableSkeleton columns={6} rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SchedulerFlow />
      <SchedulerToolbar
        snapshot={snapshot}
        refreshing={refreshing}
        syncing={syncing}
        onRefresh={() => loadSnapshot()}
        onSync={handleManualSync}
      />
      <SchedulerSourceOverview
        snapshot={snapshot}
        sourceFilter={sourceFilter}
        onSourceFilterChange={handleSourceFilterChange}
      />

      {error || snapshot?.load_error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {error || snapshot?.load_error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_18px_45px_-34px_rgba(15,23,42,0.65)] dark:border-slate-800/90 dark:bg-slate-950">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">
              {t("cloud.dns.scheduler.queue_title", { defaultValue: "DNS 任务队列" })}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("cloud.dns.scheduler.queue_hint", {
                defaultValue: "DDNS 与故障切换共用 DNS 执行入口；同凭证会串行，Cloudflare 写入会尽量批量提交。",
              })}
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <div className="flex overflow-x-auto rounded-md border border-border bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/40">
              {SOURCE_FILTERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "whitespace-nowrap rounded px-3 py-1.5 text-xs font-medium text-muted-foreground transition",
                    sourceFilter === value && "bg-card text-slate-950 shadow-sm dark:bg-slate-950 dark:text-slate-50",
                  )}
                  onClick={() => handleSourceFilterChange(value)}
                >
                  {sourceFilterLabel(value, t)}
                  {value !== "all" ? (
                    <span className="ml-1 text-[11px] text-slate-500">
                      {snapshot?.source_counts?.[value] || 0}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("cloud.dns.scheduler.search", { defaultValue: "搜索任务 / 记录 / IP" })}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {pageItems.length ? (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0">
              <div className="overflow-x-auto">
                <table className="min-w-[960px] text-sm">
                <thead className="bg-slate-50/80 text-xs text-slate-500 dark:bg-slate-900/30 dark:text-slate-400">
                  <tr>
                    <th className="w-[16%] px-4 py-3 text-left font-medium">
                      {t("cloud.dns.scheduler.table.source", { defaultValue: "来源" })}
                    </th>
                    <th className="w-[20%] px-4 py-3 text-left font-medium">
                      {t("cloud.dns.scheduler.table.node", { defaultValue: "节点" })}
                    </th>
                    <th className="w-[28%] px-4 py-3 text-left font-medium">
                      {t("cloud.dns.scheduler.table.record", { defaultValue: "DNS 目标" })}
                    </th>
                    <th className="w-[18%] px-4 py-3 text-left font-medium">
                      {t("cloud.dns.scheduler.table.current_ip", { defaultValue: "当前 IP" })}
                    </th>
                    <th className="w-[10%] px-4 py-3 text-left font-medium">
                      {t("cloud.dns.scheduler.table.synced_at", { defaultValue: "最近时间" })}
                    </th>
                    <th className="w-[8%] px-4 py-3 text-left font-medium">
                      {t("common.status", { defaultValue: "状态" })}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-slate-800">
                  {pageItems.map((item) => {
                    const itemKey = getSchedulerItemKey(item);
                    const selected = itemKey === selectedItemKey;
                    return (
                    <tr
                      key={itemKey}
                      role="button"
                      aria-selected={selected}
                      tabIndex={0}
                      className={cn(
                        "cursor-pointer align-top transition-colors hover:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:hover:bg-blue-950/20",
                        selected && "bg-blue-50/80 dark:bg-blue-950/30",
                      )}
                      onClick={() => setSelectedItemKey(itemKey)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedItemKey(itemKey);
                        }
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 flex-col gap-1.5">
                          <Badge color={sourceColor(item.source_type)} className="w-fit gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {sourceLabel(item.source_type, t)}
                          </Badge>
                          <div className="max-w-[160px] truncate text-xs text-muted-foreground">
                            {item.source_name || item.source_id || "-"}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-950 dark:text-slate-50">
                            {item.client_name || item.client_uuid}
                          </div>
                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            {item.client_uuid}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 flex-col gap-1">
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <Badge color="gray">{providerLabel(item.provider, t)}</Badge>
                            <Badge color="gray">{item.address_mode || "ipv4"}</Badge>
                            {mergeGroupBadge(item, t) ? (
                              <Badge color="amber">{mergeGroupBadge(item, t)}</Badge>
                            ) : null}
                          </div>
                          <div className="max-w-[340px] truncate font-mono text-xs text-slate-600 dark:text-slate-300">
                            {item.record_key || "-"}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-slate-700 dark:text-slate-200">
                          {renderIPPair(item)}
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          {t("cloud.dns.scheduler.last_ip", {
                            defaultValue: "上次：{{ipv4}} {{ipv6}}",
                            ipv4: item.last_ipv4 || "-",
                            ipv6: item.last_ipv6 || "",
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                        {formatDateTime(item.last_synced_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 flex-col gap-1.5">
                          <Badge color={statusColor(item.status)} className="w-fit gap-1">
                            {statusIcon(item.status)}
                            {statusLabel(item.status, t)}
                          </Badge>
                          {item.reason || item.last_error ? (
                            <div className="max-w-[220px] truncate text-xs text-muted-foreground">
                              {item.reason || item.last_error}
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-sm dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                {t("cloud.dns.scheduler.pagination", {
                  defaultValue: "显示 {{start}}-{{end}} 条，共 {{total}} 条",
                  start: filteredItems.length ? (safePage - 1) * PAGE_SIZE + 1 : 0,
                  end: Math.min(safePage * PAGE_SIZE, filteredItems.length),
                  total: filteredItems.length,
                })}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  {t("command_clipboard.pagination.previous", { defaultValue: "上一页" })}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {safePage} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  {t("command_clipboard.pagination.next", { defaultValue: "下一页" })}
                </Button>
              </div>
            </div>
            </div>
            <SchedulerTaskDetailPanel item={selectedItem} />
          </div>
        ) : (
          <AdminEmptyState
            title={t("cloud.dns.scheduler.empty_title", { defaultValue: "暂无 DNS 调度项" })}
            description={t("cloud.dns.scheduler.empty_description", {
              defaultValue: "启用 DDNS 或为故障切换配置 DNS 后，这里会显示对应状态。",
            })}
          />
        )}
      </div>
    </div>
  );
}

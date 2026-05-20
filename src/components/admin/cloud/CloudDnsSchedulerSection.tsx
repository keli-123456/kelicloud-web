import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  CheckCircle2,
  CircleDotDashed,
  Clock3,
  Eye,
  GitMerge,
  Info,
  ListChecks,
  Network,
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

function providerLabel(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "cloudflare") return "Cloudflare";
  if (normalized === "aliyun") return "阿里云";
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

function SchedulerFlow() {
  const { t } = useTranslation();
  const steps = [
    t("cloud.dns.scheduler.flow.scan", { defaultValue: "扫描 DDNS 和故障切换 DNS" }),
    t("cloud.dns.scheduler.flow.merge", { defaultValue: "按用户/令牌/记录合并" }),
    t("cloud.dns.scheduler.flow.diff", { defaultValue: "对比本地 IP 状态" }),
    t("cloud.dns.scheduler.flow.apply", { defaultValue: "必要时请求 DNS API" }),
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950">
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
  onRefresh,
}: {
  snapshot: DNSSchedulerSnapshot | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const run = snapshot?.last_run;
  const execution = snapshot?.dns_execution;

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950 md:flex-row md:items-center md:justify-between">
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
        <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <Clock3 className="h-3.5 w-3.5" />
          <span>
            {t("cloud.dns.scheduler.last_run", {
              defaultValue: "最近一轮 {{time}} · {{ms}}ms",
              time: formatDateTime(run?.finished_at || run?.started_at),
              ms: run?.duration_ms || 0,
            })}
          </span>
        </div>
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
            <SchedulerDetailField label={t("cloud.dns.scheduler.detail_provider", { defaultValue: "服务商" })} value={providerLabel(item.provider)} />
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
      <SchedulerToolbar snapshot={snapshot} refreshing={refreshing} onRefresh={() => loadSnapshot()} />

      {error || snapshot?.load_error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {error || snapshot?.load_error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950">
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
                            <Badge color="gray">{providerLabel(item.provider)}</Badge>
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

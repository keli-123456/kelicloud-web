import { Check, ChevronDown, CircleAlert, Clock3, Copy, LoaderCircle, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  analyzeFailoverIssue,
  getFailoverIssueAction,
  getFailoverIssueSummary,
  getFailoverIssueTitle,
} from "@/lib/failoverIssue";
import { cn } from "@/lib/utils";

export type FailoverStageItem = {
  key: string;
  label: string;
  status: string;
  statusLabel: string;
  description?: string;
};

type StageTone = "success" | "active" | "warning" | "error" | "neutral";

function getStageTone(status: string): StageTone {
  const normalized = String(status || "").trim().toLowerCase();
  if (["success", "succeeded", "completed", "complete", "ok", "healthy", "synced", "deleted"].includes(normalized)) {
    return "success";
  }
  if (["running", "processing", "in_progress", "creating", "provisioning", "checking", "deleting"].includes(normalized)) {
    return "active";
  }
  if (["warning", "partial", "partial_success", "manual_review", "retained"].includes(normalized)) {
    return "warning";
  }
  if (["failed", "failure", "error", "blocked", "blocked_suspected", "degraded"].includes(normalized)) {
    return "error";
  }
  return "neutral";
}

const stageToneClasses: Record<StageTone, string> = {
  success: "border-emerald-200 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300",
  active: "border-blue-200 bg-blue-50/60 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-300",
  warning: "border-amber-200 bg-amber-50/60 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300",
  error: "border-red-200 bg-red-50/60 text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300",
  neutral: "border-border bg-[var(--surface-subtle)] text-muted-foreground",
};

function StageIcon({ tone }: { tone: StageTone }) {
  if (tone === "success") {
    return <Check className="size-3.5" />;
  }
  if (tone === "active") {
    return <LoaderCircle className="size-3.5 animate-spin" />;
  }
  if (tone === "warning" || tone === "error") {
    return <CircleAlert className="size-3.5" />;
  }
  return <Minus className="size-3.5" />;
}

export function FailoverStageRail({
  stages,
  className,
  vertical = false,
}: {
  stages: FailoverStageItem[];
  className?: string;
  vertical?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <section className={cn("space-y-2.5", className)} aria-label={t("failover.issue.stage_progress", { defaultValue: "Execution progress" })}>
      <div className="text-xs font-semibold text-foreground">
        {t("failover.issue.stage_progress", { defaultValue: "Execution progress" })}
      </div>
      <ol className={cn("grid gap-2", !vertical && "sm:grid-cols-3")}>
        {stages.map((stage, index) => {
          const tone = getStageTone(stage.status);
          return (
            <li key={stage.key} className={cn("min-w-0 border px-3 py-2.5", stageToneClasses[tone])}>
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-current/25 bg-[var(--surface)]">
                  <StageIcon tone={tone} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-foreground">
                    {index + 1}. {stage.label}
                  </div>
                  <div className="truncate text-xs font-medium">{stage.statusLabel}</div>
                </div>
              </div>
              {stage.description ? (
                <div className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground" title={stage.description}>
                  {stage.description}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function FailoverIssueSummary({
  message,
  warning = false,
  compact = false,
  className,
}: {
  message: string;
  warning?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const issue = analyzeFailoverIssue(message);
  const metrics = [
    issue.candidateCount > 0
      ? { label: t("failover.issue.metric_candidates", { defaultValue: "Candidates" }), value: issue.candidateCount }
      : null,
    issue.providerIssueCount > 0
      ? { label: t("failover.issue.metric_provider", { defaultValue: "Provider issues" }), value: issue.providerIssueCount }
      : null,
    issue.healthIssueCount > 0
      ? { label: t("failover.issue.metric_health", { defaultValue: "Health failures" }), value: issue.healthIssueCount }
      : null,
    issue.timeoutCount > 0
      ? { label: t("failover.issue.metric_timeouts", { defaultValue: "Timeouts" }), value: issue.timeoutCount }
      : null,
  ].filter((metric): metric is { label: string; value: number } => Boolean(metric));

  return (
    <div
      className={cn(
        "border-l-2 px-3 py-2.5",
        warning
          ? "border-amber-400 bg-amber-50/70 dark:border-amber-700 dark:bg-amber-950/20"
          : "border-red-400 bg-red-50/70 dark:border-red-800 dark:bg-red-950/20",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <CircleAlert className={cn("mt-0.5 size-4 shrink-0", warning ? "text-amber-600 dark:text-amber-300" : "text-red-600 dark:text-red-300")} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">
            {getFailoverIssueTitle(t, issue)}
          </div>
          {!compact ? (
            <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
              {getFailoverIssueSummary(t, issue)}
            </p>
          ) : null}
        </div>
      </div>

      {!compact && metrics.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5 pl-6">
          {metrics.map((metric) => (
            <span key={metric.label} className="rounded-sm border border-border/80 bg-[var(--surface)] px-2 py-1 text-xs text-muted-foreground">
              {metric.label} <strong className="font-semibold text-foreground">{metric.value}</strong>
            </span>
          ))}
        </div>
      ) : null}

      {!compact ? (
        <div className="mt-3 border-t border-border/70 pt-2.5 pl-6">
          <div className="flex items-start gap-2 text-[13px] leading-5 text-foreground">
            <Clock3 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <div>
              <span className="font-semibold">
                {t("failover.issue.next_action", { defaultValue: "Next action" })}:
              </span>{" "}
              {getFailoverIssueAction(t, issue)}
            </div>
          </div>
          <details className="group mt-2">
            <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
              {t("failover.issue.technical_details", { defaultValue: "Technical details" })}
            </summary>
            <div className="relative mt-2 border border-border bg-[var(--surface)] p-3 pr-11">
              <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-muted-foreground">
                {issue.rawMessage}
              </pre>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1.5 top-1.5 size-8"
                title={t("common.copy", { defaultValue: "Copy" })}
                aria-label={t("common.copy", { defaultValue: "Copy" })}
                onClick={() => void navigator.clipboard.writeText(issue.rawMessage)}
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
          </details>
        </div>
      ) : null}
    </div>
  );
}

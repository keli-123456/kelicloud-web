import { Eye, PencilLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DetailItem = {
  label: string;
  value: string;
};

export type SummaryStatusTone = "danger" | "neutral" | "warning";

export function DetailItemsList({
  items,
}: {
  items: DetailItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
      {items.map((item) => (
        <div key={`${item.label}:${item.value}`} className="min-w-0">
          <span className="font-medium text-slate-600 dark:text-slate-300">{item.label}:</span>{" "}
          <span className="break-all">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ActionSummaryCard({
  title,
  hint,
  actionLabel,
  onAction,
  actionDisabled = false,
  actionIcon = "edit",
  items,
  emptyLabel = "",
  showEmptyState = false,
  statusMessage = "",
  statusTone = "neutral",
  variant = "card",
  className,
}: {
  title: string;
  hint: string;
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
  actionIcon?: "edit" | "view";
  items: DetailItem[];
  emptyLabel?: string;
  showEmptyState?: boolean;
  statusMessage?: string;
  statusTone?: SummaryStatusTone;
  variant?: "card" | "inline";
  className?: string;
}) {
  const ActionIcon = actionIcon === "view" ? Eye : PencilLine;

  return (
    <div
      className={cn(
        variant === "inline"
          ? "space-y-3 border-t border-slate-200/70 pt-4 first:border-t-0 first:pt-0 dark:border-slate-800/70"
          : "space-y-4 rounded-lg border px-4 py-4",
        className,
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="break-words text-sm font-medium text-slate-900 dark:text-slate-50">
            {title}
          </div>
          <div className="break-words text-xs text-muted-foreground">
            {hint}
          </div>
        </div>
        <Button type="button" variant="outline" size={variant === "inline" ? "sm" : "default"} onClick={onAction} disabled={actionDisabled}>
          <ActionIcon className="size-4" />
          {actionLabel}
        </Button>
      </div>

      <DetailItemsList items={items} />

      {showEmptyState ? (
        <div className="break-words rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : null}

      {statusMessage ? (
        <div
          className={cn(
            "break-words rounded-lg px-4 py-3 text-sm",
            statusTone === "danger"
              ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
              : statusTone === "warning"
                ? "border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
                : "border border-dashed text-muted-foreground",
          )}
        >
          {statusMessage}
        </div>
      ) : null}
    </div>
  );
}

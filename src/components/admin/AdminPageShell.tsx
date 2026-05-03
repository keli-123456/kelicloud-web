import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useAdminPageTitle } from "@/contexts/AdminPageTitleContext";
import { cn } from "@/lib/utils";

type AdminStatTone = "blue" | "emerald" | "amber" | "rose" | "slate";

export type AdminPageStat = {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: AdminStatTone;
};

export function AdminPageShell({
  title,
  actions,
  stats = [],
  statsVariant = "inline",
  subnav,
  children,
  className,
  contentClassName,
}: {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  stats?: AdminPageStat[];
  statsVariant?: "inline" | "cards";
  subnav?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  useAdminPageTitle(title);
  const visibleStats = statsVariant === "cards" ? [] : stats;

  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-4 p-4 md:gap-6 md:p-6",
        className,
      )}
    >
      {actions ? (
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          {actions}
        </div>
      ) : null}

      {visibleStats.length > 0
        ? (
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-y border-slate-200/80 py-3 text-sm text-muted-foreground dark:border-slate-800/90">
            {visibleStats.map((stat, index) => (
              <div key={`${index}-${String(stat.label)}`} className="flex items-center gap-2">
                <span className="font-medium text-foreground">{stat.label}:</span>
                <span className="text-foreground tabular-nums">{stat.value}</span>
              </div>
            ))}
          </div>
        )
        : null}

      {subnav ? (
        <div className="min-w-0 overflow-x-auto">
          <div className="min-w-max">{subnav}</div>
        </div>
      ) : null}

      <div className={cn("flex min-w-0 flex-col gap-4", contentClassName)}>{children}</div>
    </section>
  );
}

export function AdminSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("min-h-0 min-w-0", className)}>{children}</div>;
}

export function AdminEmptyState({
  icon,
  title,
  description,
  actions,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-36 min-w-0 flex-col items-center justify-center rounded-lg border border-slate-200/80 bg-white px-5 py-6 text-center shadow-none dark:border-slate-800 dark:bg-slate-950",
        className,
      )}
    >
      {icon ? (
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          {icon}
        </div>
      ) : null}
      <div className="text-[15px] font-semibold leading-5 text-slate-950 dark:text-slate-50">
        {title}
      </div>
      {description ? (
        <div className="mt-1 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </div>
      ) : null}
      {actions ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function AdminSubnav({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 border-b border-slate-200/80 pb-2 dark:border-slate-800/90",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminCardGridSkeleton({
  className,
}: {
  cards?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading content"
      className={cn("h-px bg-slate-200/80 dark:bg-slate-800/90", className)}
    />
  );
}

export function AdminTableSkeleton({
  columns = 5,
  rows = 6,
  className,
}: {
  columns?: number;
  rows?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading table"
      className={cn(
        "overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-none dark:border-slate-800/90 dark:bg-slate-950",
        className,
      )}
    >
      <div
        className="grid gap-3 border-b border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/30"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-3.5 w-20 max-w-full" />
        ))}
      </div>
      <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-3 px-4 py-3.5"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, columnIndex) => (
              <Skeleton
                key={columnIndex}
                className={cn(
                  "h-3.5 max-w-full",
                  columnIndex === 0 ? "w-28" : columnIndex % 2 === 0 ? "w-20" : "w-32",
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminSettingsSkeleton({
  sections = 4,
  className,
}: {
  sections?: number;
  className?: string;
}) {
  return (
    <div role="status" aria-label="Loading settings" className={cn("space-y-4", className)}>
      {Array.from({ length: sections }).map((_, index) => (
        <div
          key={index}
          className="border-t border-slate-200/80 px-4 py-4 first:border-t-0 dark:border-slate-800/90"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-4 w-full max-w-xl" />
            </div>
            <Skeleton className={cn("h-9 w-full md:w-40", index % 2 === 0 && "md:w-24")} />
          </div>
        </div>
      ))}
    </div>
  );
}

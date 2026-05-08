import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useAdminPageTitle } from "@/contexts/AdminPageTitleContext";
import { cn } from "@/lib/utils";

export function AdminPageShell({
  title,
  description,
  actions,
  subnav,
  children,
  className,
  contentClassName,
  hideHeader = false,
  registerHeader = true,
}: {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  subnav?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  hideHeader?: boolean;
  registerHeader?: boolean;
}) {
  useAdminPageTitle(title, description, registerHeader);
  const hasActions = !hideHeader && Boolean(actions);

  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-4 p-3 sm:p-4",
        className,
      )}
    >
      {hasActions ? (
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          {actions}
        </div>
      ) : null}

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
        "flex min-h-36 min-w-0 flex-col items-center justify-center rounded-lg border border-border bg-card px-5 py-6 text-center shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950",
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
        "flex flex-wrap gap-2 rounded-lg border border-border bg-card p-2 shadow-sm shadow-slate-900/5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminCardGridSkeleton({
  cards = 4,
  className,
}: {
  cards?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading content"
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card shadow-sm shadow-slate-900/5 dark:border-slate-800/90 dark:bg-slate-950",
        className,
      )}
    >
      {Array.from({ length: cards }).map((_, index) => (
        <div
          key={index}
          className="flex min-h-14 items-center gap-3 border-t border-border px-4 py-3 first:border-t-0 dark:border-slate-800"
        >
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="mt-2 h-3 w-48 max-w-[70%]" />
          </div>
          <Skeleton className="h-7 w-20 rounded-md" />
        </div>
      ))}
    </div>
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
        "overflow-hidden rounded-lg border border-border bg-card shadow-sm shadow-slate-900/5 dark:border-slate-800/90 dark:bg-slate-950",
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

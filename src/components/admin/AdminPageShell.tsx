import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminStatTone = "blue" | "emerald" | "amber" | "rose" | "slate";

export type AdminPageStat = {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: AdminStatTone;
};

export function AdminPageShell({
  eyebrow,
  title,
  description,
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
  const hasHeaderCopy = Boolean(eyebrow || title || description);
  const statToneClasses: Record<AdminStatTone, string> = {
    blue: "border-sky-200 bg-sky-50/80 dark:border-sky-900/60 dark:bg-sky-950/30",
    emerald:
      "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/30",
    amber:
      "border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/30",
    rose: "border-rose-200 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/30",
    slate: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40",
  };

  return (
    <section className={cn("flex flex-col gap-5 px-1 py-1", className)}>
      {hasHeaderCopy || actions ? (
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          {hasHeaderCopy ? (
            <div className="space-y-2">
              {eyebrow && (
                <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {eyebrow}
                </div>
              )}
              <div className="space-y-2">
                {title ? (
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    {title}
                  </h1>
                ) : null}
                {description && (
                  <p className="max-w-3xl text-[14px] leading-6 text-slate-600 dark:text-slate-300">
                    {description}
                  </p>
                )}
              </div>
            </div>
          ) : null}
          {actions ? (
            <div className="flex w-full flex-wrap gap-2 xl:w-auto xl:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}

      {stats.length > 0
        ? statsVariant === "cards"
          ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat, index) => (
                <div
                  key={`${index}-${String(stat.label)}`}
                  className={cn(
                    "rounded-2xl border px-4 py-4",
                    statToneClasses[stat.tone || "slate"],
                  )}
                >
                  <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {stat.value}
                  </div>
                  {stat.hint ? (
                    <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {stat.hint}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )
          : (
            <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-slate-200/80 pb-4 text-[13px] text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
              {stats.map((stat, index) => (
                <div key={`${index}-${String(stat.label)}`} className="flex items-center gap-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{stat.label}:</span>
                  <span className="text-slate-900 dark:text-slate-50">{stat.value}</span>
                </div>
              ))}
            </div>
          )
        : null}

      {subnav ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="min-w-max">{subnav}</div>
        </div>
      ) : null}

      <div className={cn("flex flex-col gap-4", contentClassName)}>{children}</div>
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
  return <div className={cn("min-w-0", className)}>{children}</div>;
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
        "flex flex-wrap gap-2 border-b border-slate-200/80 pb-3 dark:border-slate-800/80",
        className,
      )}
    >
      {children}
    </div>
  );
}

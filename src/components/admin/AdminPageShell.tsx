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
    blue: "border-border/70 bg-card",
    emerald:
      "border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20",
    amber:
      "border-amber-200/70 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20",
    rose: "border-rose-200/70 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/20",
    slate: "border-border/70 bg-card",
  };

  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-4 p-4 md:gap-6 md:p-6",
        className,
      )}
    >
      {hasHeaderCopy || actions ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          {hasHeaderCopy ? (
            <div className="min-w-0 space-y-1">
              {eyebrow && (
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {eyebrow}
                </div>
              )}
              <div className="space-y-1">
                {title ? (
                  <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                    {title}
                  </h1>
                ) : null}
                {description && (
                  <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
            </div>
          ) : null}
          {actions ? (
            <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
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
                    "rounded-lg border px-4 py-4 shadow-none",
                    statToneClasses[stat.tone || "slate"],
                  )}
                >
                  <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {stat.label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                    {stat.value}
                  </div>
                  {stat.hint ? (
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">
                      {stat.hint}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )
          : (
            <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-lg border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground shadow-none">
              {stats.map((stat, index) => (
                <div key={`${index}-${String(stat.label)}`} className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{stat.label}:</span>
                  <span className="text-foreground">{stat.value}</span>
                </div>
              ))}
            </div>
          )
        : null}

      {subnav ? (
        <div className="min-w-0 overflow-x-auto rounded-lg border border-border/70 bg-card p-3 shadow-none">
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
        "flex flex-wrap gap-2 border-b border-border/70 pb-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

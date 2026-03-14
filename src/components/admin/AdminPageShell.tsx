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
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  stats?: AdminPageStat[];
  statsVariant?: "inline" | "cards";
  subnav?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const statToneClasses: Record<AdminStatTone, string> = {
    blue: "border-sky-200 bg-sky-50/80",
    emerald: "border-emerald-200 bg-emerald-50/80",
    amber: "border-amber-200 bg-amber-50/80",
    rose: "border-rose-200 bg-rose-50/80",
    slate: "border-slate-200 bg-white",
  };

  return (
    <section className={cn("flex flex-col gap-5 px-1 py-1", className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          {eyebrow && (
            <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {eyebrow}
            </div>
          )}
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              {title}
            </h1>
            {description && (
              <p className="max-w-3xl text-[14px] leading-6 text-slate-600">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex w-full flex-wrap gap-2 xl:w-auto xl:justify-end">
            {actions}
          </div>
        )}
      </div>

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
                  <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {stat.label}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">
                    {stat.value}
                  </div>
                  {stat.hint ? (
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      {stat.hint}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )
          : (
            <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-slate-200/80 pb-4 text-[13px] text-slate-500">
              {stats.map((stat, index) => (
                <div key={`${index}-${String(stat.label)}`} className="flex items-center gap-2">
                  <span className="font-medium text-slate-700">{stat.label}:</span>
                  <span className="text-slate-900">{stat.value}</span>
                </div>
              ))}
            </div>
          )
        : null}

      {subnav ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3">
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
        "flex flex-wrap gap-2 border-b border-slate-200/80 pb-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

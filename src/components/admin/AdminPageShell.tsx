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
  children,
  className,
  contentClassName,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  stats?: AdminPageStat[];
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
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

      {stats.length > 0 && (
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-slate-200/80 pb-4 text-[13px] text-slate-500">
          {stats.map((stat, index) => (
            <div key={`${index}-${String(stat.label)}`} className="flex items-center gap-2">
              <span className="font-medium text-slate-700">{stat.label}:</span>
              <span className="text-slate-900">{stat.value}</span>
            </div>
          ))}
        </div>
      )}

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

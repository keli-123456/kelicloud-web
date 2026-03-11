import type { ReactNode } from "react";

import { Badge, Text } from "@radix-ui/themes";

import { cn } from "@/lib/utils";

type AdminStatTone = "blue" | "emerald" | "amber" | "rose" | "slate";

export type AdminPageStat = {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: AdminStatTone;
};

const statToneClasses: Record<AdminStatTone, string> = {
  blue:
    "bg-[linear-gradient(135deg,rgba(219,234,254,0.88),rgba(255,255,255,0.96))] text-sky-950",
  emerald:
    "bg-[linear-gradient(135deg,rgba(220,252,231,0.88),rgba(255,255,255,0.96))] text-emerald-950",
  amber:
    "bg-[linear-gradient(135deg,rgba(254,243,199,0.92),rgba(255,255,255,0.96))] text-amber-950",
  rose:
    "bg-[linear-gradient(135deg,rgba(255,228,230,0.9),rgba(255,255,255,0.96))] text-rose-950",
  slate:
    "bg-[linear-gradient(135deg,rgba(226,232,240,0.88),rgba(255,255,255,0.96))] text-slate-900",
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
    <section
      className={cn(
        "relative overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(241,248,255,0.92),rgba(244,251,247,0.92))] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.09)] backdrop-blur-xl md:p-7",
        className,
      )}
    >
      <div className="pointer-events-none absolute -left-20 top-0 h-52 w-52 rounded-full bg-sky-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-emerald-200/35 blur-3xl" />
      <div className="relative flex flex-col gap-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            {eyebrow && (
              <Badge
                variant="soft"
                color="blue"
                className="rounded-full px-3 py-1 text-[11px] tracking-[0.24em]"
              >
                {eyebrow}
              </Badge>
            )}
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                {title}
              </h1>
              {description && (
                <p className="max-w-3xl text-sm leading-6 text-slate-600">
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
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
            {stats.map((stat, index) => (
              <div
                key={`${index}-${String(stat.label)}`}
                className={cn(
                  "rounded-[24px] border border-white/75 px-4 py-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur",
                  statToneClasses[stat.tone || "slate"],
                )}
              >
                <Text className="block text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  {stat.label}
                </Text>
                <div className="mt-2 text-xl font-semibold tracking-tight">
                  {stat.value}
                </div>
                {stat.hint && (
                  <Text className="mt-2 block text-xs leading-5 text-slate-600">
                    {stat.hint}
                  </Text>
                )}
              </div>
            ))}
          </div>
        )}

        <div className={cn("flex flex-col gap-4", contentClassName)}>
          {children}
        </div>
      </div>
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
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/65 bg-white/78 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
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
        "flex flex-wrap gap-2 rounded-[24px] border border-white/70 bg-white/64 p-3 shadow-[0_12px_32px_rgba(15,23,42,0.05)] backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}

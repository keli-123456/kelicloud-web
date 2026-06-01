import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminPageTitle } from "@/contexts/AdminPageTitleContext";
import { cn } from "@/lib/utils";

export const ADMIN_PANEL_CLASS =
  "overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-none dark:border-slate-800/90 dark:bg-slate-950";

export const ADMIN_PANEL_HEADER_CLASS =
  "flex min-w-0 flex-col gap-3 border-b border-slate-200/80 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/45 md:flex-row md:items-center md:justify-between";

export const ADMIN_PANEL_BODY_CLASS = "min-w-0 px-5 py-4";

export function AdminPanel({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return (
    <section className={cn(ADMIN_PANEL_CLASS, className)} {...props}>
      {children}
    </section>
  );
}

export function AdminPanelHeader({
  title,
  description,
  actions,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(ADMIN_PANEL_HEADER_CLASS, className)}>
      <div className="min-w-0">
        {title ? (
          <div className="text-[15px] font-semibold leading-5 text-slate-950 dark:text-slate-50">
            {title}
          </div>
        ) : null}
        {description ? (
          <div className="mt-1 max-w-3xl text-sm leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminPanelBody({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn(ADMIN_PANEL_BODY_CLASS, className)} {...props}>
      {children}
    </div>
  );
}

export function AdminSettingsPanel({
  title,
  description,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const hasHeader = Boolean(title || description);

  return (
    <section className={cn(ADMIN_PANEL_CLASS, className)}>
      {hasHeader ? (
        <div className="border-b border-slate-200/80 bg-slate-50/70 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/35">
          {title ? (
            <h2 className="text-[15px] font-semibold leading-5 text-slate-950 dark:text-slate-50">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500 dark:text-slate-400">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className={cn("px-5 py-1", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

export function AdminDataPanel({
  title,
  description,
  actions,
  children,
  className,
  headerClassName,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
}) {
  const hasHeader = Boolean(title || description || actions);

  return (
    <section className={cn(ADMIN_PANEL_CLASS, "overflow-hidden", className)}>
      {hasHeader ? (
        <div
          className={cn(
            "flex min-h-[54px] flex-col gap-2 border-b border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/35 sm:flex-row sm:items-center sm:justify-between",
            headerClassName,
          )}
        >
          <div className="min-w-0">
            {title ? (
              <h2 className="text-sm font-semibold leading-5 text-slate-950 dark:text-slate-50">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className={cn("min-w-0", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

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
        "flex min-w-0 flex-col gap-5 p-4 sm:p-5",
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

      <div className={cn("flex min-w-0 flex-col gap-5", contentClassName)}>{children}</div>
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
        "flex min-h-32 min-w-0 flex-col items-center justify-center rounded-md border border-dashed border-slate-200/80 bg-slate-50/70 px-5 py-7 text-center shadow-none dark:border-slate-800/90 dark:bg-slate-900/25",
        className,
      )}
    >
      {icon ? (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
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
        "flex flex-wrap gap-2 border-b border-slate-200/80 bg-transparent pb-2 shadow-none dark:border-slate-800/90",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminSplitLayout({
  sidebar,
  children,
  className,
  sidebarClassName,
  contentClassName,
}: {
  sidebar: ReactNode;
  children: ReactNode;
  className?: string;
  sidebarClassName?: string;
  contentClassName?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 items-start gap-5 lg:grid-cols-[232px_minmax(0,1fr)]",
        className,
      )}
    >
      <aside className={cn("min-w-0 lg:sticky lg:top-5", sidebarClassName)}>
        {sidebar}
      </aside>
      <div className={cn("min-w-0", contentClassName)}>{children}</div>
    </div>
  );
}

export function AdminSideNav({
  children,
  className,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "flex min-w-0 gap-1 overflow-x-auto rounded-lg border border-slate-200/80 bg-white p-2 shadow-none dark:border-slate-800/90 dark:bg-slate-950 lg:flex-col lg:overflow-visible",
        className,
      )}
    >
      {children}
    </nav>
  );
}

const sideNavItemClass = (active?: boolean) =>
  cn(
    "group inline-flex min-h-10 min-w-[150px] items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition lg:min-w-0",
    active
      ? "bg-blue-600 text-white shadow-none dark:bg-blue-500"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white",
  );

function AdminSideNavInner({
  active,
  icon,
  label,
  description,
}: {
  active?: boolean;
  icon?: ReactNode;
  label: ReactNode;
  description?: ReactNode;
}) {
  return (
    <>
      {icon ? (
        <span className={cn("shrink-0", active ? "text-white" : "text-slate-500 dark:text-slate-400")}>
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium leading-5">{label}</span>
        {description ? (
          <span
            className={cn(
              "mt-0.5 hidden truncate text-xs leading-4 lg:block",
              active ? "text-blue-50/80" : "text-slate-500 dark:text-slate-400",
            )}
          >
            {description}
          </span>
        ) : null}
      </span>
    </>
  );
}

export function AdminSideNavLink({
  to,
  active,
  icon,
  label,
  description,
}: {
  to: string;
  active?: boolean;
  icon?: ReactNode;
  label: ReactNode;
  description?: ReactNode;
}) {
  return (
    <Link to={to} className={sideNavItemClass(active)}>
      <AdminSideNavInner
        active={active}
        icon={icon}
        label={label}
        description={description}
      />
    </Link>
  );
}

export function AdminSideNavButton({
  active,
  icon,
  label,
  description,
  onClick,
}: {
  active?: boolean;
  icon?: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className={sideNavItemClass(active)} onClick={onClick}>
      <AdminSideNavInner
        active={active}
        icon={icon}
        label={label}
        description={description}
      />
    </button>
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
        "overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-none dark:border-slate-800/90 dark:bg-slate-950",
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
        "overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-none dark:border-slate-800/90 dark:bg-slate-950",
        className,
      )}
    >
      <div
        className="grid gap-3 border-b border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/45"
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

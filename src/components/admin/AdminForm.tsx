import * as React from "react";

import {
  ADMIN_FORM_SECTION_CLASS,
  ADMIN_FORM_SECTION_COMPACT_CLASS,
  ADMIN_FORM_TOGGLE_CLASS,
} from "@/components/admin/AdminFormStyles";
import { cn } from "@/lib/utils";

function AdminFormRequiredMark() {
  return <span className="shrink-0 text-rose-500">*</span>;
}

type AdminFormSectionProps = Omit<React.ComponentProps<"section">, "title"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
  headerClassName?: string;
};

function AdminFormSection({
  title,
  description,
  action,
  compact = false,
  className,
  headerClassName,
  children,
  ...props
}: AdminFormSectionProps) {
  return (
    <section
      className={cn(
        compact ? ADMIN_FORM_SECTION_COMPACT_CLASS : ADMIN_FORM_SECTION_CLASS,
        className,
      )}
      {...props}
    >
      <div className={cn("mb-4 flex flex-wrap items-start justify-between gap-3", headerClassName)}>
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </h3>
          {description ? (
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

type AdminFormToggleProps = Omit<React.ComponentProps<"div">, "title"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  control?: React.ReactNode;
};

function AdminFormToggle({
  title,
  description,
  control,
  className,
  children,
  ...props
}: AdminFormToggleProps) {
  return (
    <div className={cn(ADMIN_FORM_TOGGLE_CLASS, className)} {...props}>
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
          {title}
        </div>
        {description ? (
          <div className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </div>
        ) : null}
      </div>
      <div className="shrink-0">{control ?? children}</div>
    </div>
  );
}

export {
  AdminFormRequiredMark,
  AdminFormSection,
  AdminFormToggle,
};

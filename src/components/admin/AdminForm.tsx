import * as React from "react";

import { Dialog } from "@/components/admin/admin-ui";
import {
  ADMIN_FORM_BODY_CLASS,
  ADMIN_FORM_DIALOG_CHROME_CLASS,
  ADMIN_FORM_DIALOG_CLASS,
  ADMIN_FORM_DIALOG_WIDE_CLASS,
  ADMIN_FORM_FOOTER_CLASS,
  ADMIN_FORM_HEADER_CLASS,
  ADMIN_FORM_HEADER_INSET_CLASS,
  ADMIN_FORM_SECTION_CLASS,
  ADMIN_FORM_SECTION_COMPACT_CLASS,
  ADMIN_FORM_TOGGLE_CLASS,
} from "@/components/admin/AdminFormStyles";
import { cn } from "@/lib/utils";

function AdminFormRequiredMark() {
  return <span className="shrink-0 text-rose-500">*</span>;
}

type AdminDialogLayoutProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: React.ReactNode;
  wide?: boolean;
  maxWidth?: string | number;
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  bodyClassName?: string;
  sideClassName?: string;
  footerClassName?: string;
};

function AdminDialogLayout({
  title,
  description,
  badge,
  icon,
  children,
  footer,
  side,
  wide = false,
  maxWidth,
  className,
  headerClassName,
  titleClassName,
  descriptionClassName,
  bodyClassName,
  sideClassName,
  footerClassName,
}: AdminDialogLayoutProps) {
  return (
    <Dialog.Content
      maxWidth={maxWidth}
      className={cn(
        wide ? ADMIN_FORM_DIALOG_WIDE_CLASS : ADMIN_FORM_DIALOG_CLASS,
        ADMIN_FORM_DIALOG_CHROME_CLASS,
        className,
      )}
    >
      <div className={cn(ADMIN_FORM_HEADER_CLASS, headerClassName)}>
        <div className="flex min-w-0 flex-col gap-3 pr-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? (
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm shadow-primary/15">
                {icon}
              </span>
            ) : null}
            <div className={cn(ADMIN_FORM_HEADER_INSET_CLASS, "pr-0")}>
              <Dialog.Title className={cn("text-base font-semibold leading-6", titleClassName)}>
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description
                  className={cn(
                    "text-sm leading-6 text-muted-foreground",
                    descriptionClassName,
                  )}
                >
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
          </div>
          {badge ? <div className="flex shrink-0 flex-wrap items-center gap-2">{badge}</div> : null}
        </div>
      </div>

      <div
        className={cn(
          "grid min-h-0 flex-1 overflow-hidden",
          side ? "lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]" : "",
        )}
      >
        <div className={cn(ADMIN_FORM_BODY_CLASS, bodyClassName)}>
          {children}
        </div>
        {side ? (
          <aside
            className={cn(
              "min-w-0 overflow-y-auto border-t border-border bg-[var(--surface-subtle)] px-4 py-4 [scrollbar-gutter:stable] lg:border-l lg:border-t-0 xl:px-5",
              sideClassName,
            )}
          >
            {side}
          </aside>
        ) : null}
      </div>

      {footer ? (
        <div className={cn(ADMIN_FORM_FOOTER_CLASS, footerClassName)}>
          {footer}
        </div>
      ) : null}
    </Dialog.Content>
  );
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
      <div className={cn("mb-3 flex flex-wrap items-start justify-between gap-3", headerClassName)}>
        <div className="min-w-0 space-y-1">
          <h3 className="text-[13px] font-semibold leading-5 text-foreground">
            {title}
          </h3>
          {description ? (
            <p className="text-xs leading-5 text-muted-foreground">
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
        <div className="text-sm font-medium text-foreground">
          {title}
        </div>
        {description ? (
          <div className="mt-0.5 text-xs leading-5 text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>
      <div className="shrink-0">{control ?? children}</div>
    </div>
  );
}

export {
  AdminDialogLayout,
  AdminFormRequiredMark,
  AdminFormSection,
  AdminFormToggle,
};

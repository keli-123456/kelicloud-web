import * as React from "react";

import { cn } from "@/lib/utils";

type Align = "left" | "center" | "right";
type Sticky = "right";

const alignClasses: Record<Align, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const stickyRightClass =
  "sticky right-0 z-10 shadow-[-12px_0_18px_-18px_rgba(15,23,42,0.7)]";

function AdminDataTableScroll({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "overflow-x-auto overscroll-x-contain [scrollbar-gutter:stable]",
        className,
      )}
      {...props}
    />
  );
}

function AdminDataTable({
  className,
  style,
  minWidth = 760,
  ...props
}: React.ComponentProps<"table"> & {
  minWidth?: number | string;
}) {
  return (
    <table
      className={cn("w-full border-collapse text-left text-sm [table-layout:auto]", className)}
      style={{ minWidth, ...style }}
      {...props}
    />
  );
}

function AdminDataTableHeadRow({
  className,
  ...props
}: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-slate-200/80 bg-slate-50 text-[12px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/45 dark:text-slate-400",
        className,
      )}
      {...props}
    />
  );
}

function AdminDataTableRow({
  className,
  selected,
  interactive,
  ...props
}: React.ComponentProps<"tr"> & {
  selected?: boolean;
  interactive?: boolean;
}) {
  return (
    <tr
      data-selected={selected ? "true" : undefined}
      className={cn(
        "border-b border-slate-200/70 transition-colors last:border-b-0 hover:bg-slate-50/80 data-[selected=true]:bg-blue-50/80 dark:border-slate-800/80 dark:hover:bg-slate-900/35 dark:data-[selected=true]:bg-blue-950/25",
        interactive && "cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}

function AdminDataTableHead({
  className,
  align = "left",
  sticky,
  ...props
}: React.ComponentProps<"th"> & {
  align?: Align;
  sticky?: Sticky;
}) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-3.5 py-2.5 align-middle",
        alignClasses[align],
        sticky === "right" && "bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/85 dark:bg-slate-900/95 dark:supports-[backdrop-filter]:bg-slate-900/85",
        sticky === "right" && stickyRightClass,
        className,
      )}
      {...props}
    />
  );
}

function AdminDataTableCell({
  className,
  align = "left",
  sticky,
  ...props
}: React.ComponentProps<"td"> & {
  align?: Align;
  sticky?: Sticky;
}) {
  return (
    <td
      className={cn(
        "min-w-0 px-3.5 py-2.5 align-middle text-[12px] text-slate-700 dark:text-slate-200",
        alignClasses[align],
        sticky === "right" && "bg-white dark:bg-slate-950",
        sticky === "right" && stickyRightClass,
        className,
      )}
      {...props}
    />
  );
}

function AdminDataTableEmptyRow({
  className,
  children,
  colSpan,
}: {
  className?: string;
  children: React.ReactNode;
  colSpan: number;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className={cn("px-[14px] py-8", className)}>
        {children}
      </td>
    </tr>
  );
}

export {
  AdminDataTable,
  AdminDataTableCell,
  AdminDataTableEmptyRow,
  AdminDataTableHead,
  AdminDataTableHeadRow,
  AdminDataTableRow,
  AdminDataTableScroll,
};

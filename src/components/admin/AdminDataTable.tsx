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
      className={cn("w-full border-collapse text-left text-sm", className)}
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
        "border-b border-border bg-muted/30 text-[12px] font-semibold text-muted-foreground",
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
        "border-b border-border transition-colors last:border-b-0 hover:bg-muted/25 data-[selected=true]:bg-blue-50/70 dark:data-[selected=true]:bg-blue-950/20",
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
        "px-[14px] py-3 align-middle",
        alignClasses[align],
        sticky === "right" && "bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80",
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
        "px-[14px] py-3 align-middle text-[12px] text-foreground",
        alignClasses[align],
        sticky === "right" && "bg-card",
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

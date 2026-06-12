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
  "w-[76px] sm:sticky sm:right-0 sm:z-10 sm:shadow-[-12px_0_18px_-18px_rgba(15,23,42,0.7)]";

function AdminDataTableScroll({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "admin-data-table-scroll min-w-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]",
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
      className={cn("admin-data-table w-full table-fixed text-left text-[13px]", className)}
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
        "bg-[var(--surface-muted)] text-[12px] font-semibold text-muted-foreground",
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
        "transition-colors hover:bg-[var(--surface-hover)] data-[selected=true]:bg-[var(--surface-pressed)]",
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
        "h-8 whitespace-nowrap px-2.5 py-1 align-middle",
        alignClasses[align],
        sticky === "right" && "bg-[var(--surface-muted)] backdrop-blur",
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
        "min-w-0 px-2.5 py-1.5 align-middle text-[13px] leading-[18px] text-foreground",
        alignClasses[align],
        sticky === "right" && "bg-[var(--surface)] whitespace-nowrap",
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

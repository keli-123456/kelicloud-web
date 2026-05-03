import * as React from "react";
import { Copy } from "lucide-react";

import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  Flex,
  Select,
  Tabs,
  TextArea,
  TextField,
} from "@/components/admin/admin-ui";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const cloudDialogBaseClassName =
  "flex max-h-[90vh] w-[calc(100vw-1.5rem)] flex-col overflow-y-auto overflow-x-hidden overscroll-contain !shadow-none [scrollbar-gutter:stable]";

const cloudDialogContentClassName =
  cn(
    cloudDialogBaseClassName,
    "max-w-5xl sm:max-w-3xl",
  );

const cloudDialogWideContentClassName =
  cn(
    "flex max-h-[92vh] w-[calc(100vw-1.5rem)] flex-col overflow-y-auto overflow-x-hidden overscroll-contain !shadow-none [scrollbar-gutter:stable]",
    "max-w-[96rem] sm:max-w-5xl",
  );

const cloudLongTextClassName =
  "min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]";

const cloudPanelCardClassName =
  "overflow-hidden border-y border-slate-200/80 bg-transparent dark:border-slate-800/90";

const cloudPanelHeaderClassName =
  "border-b border-slate-200 px-5 py-4 dark:border-slate-800";

const cloudPanelTitleClassName =
  "text-sm font-medium text-slate-900 dark:text-slate-100";

const cloudPanelDescriptionClassName =
  "mt-1 text-sm text-slate-500 dark:text-slate-400";

const cloudPanelSectionClassName =
  "rounded-lg border border-dashed border-slate-300 bg-muted/20 px-4 py-3 dark:border-slate-700";

const cloudPanelSubcardClassName =
  "rounded-lg border border-slate-200/80 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40";

const cloudPanelFieldLabelClassName =
  "text-sm font-medium text-slate-800 dark:text-slate-100";

const cloudPanelBodyTextClassName =
  "text-sm text-slate-700 dark:text-slate-300";

const cloudDetailSectionClassName =
  "border-t border-slate-200 pt-4 dark:border-slate-800";

const cloudDetailListClassName =
  "overflow-hidden rounded-lg border border-slate-200/80 dark:border-slate-800";

const cloudDetailListItemClassName =
  "border-t border-slate-200 px-4 py-3 first:border-t-0 dark:border-slate-800";

type CloudDetailItemProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
  valueClassName?: string;
  variant?: "card" | "plain";
};

function CloudDetailItem({
  label,
  value,
  className,
  valueClassName,
  variant = "card",
}: CloudDetailItemProps) {
  return (
    <div
      className={cn(
        variant === "plain"
          ? "min-w-0 border-b border-slate-200 py-3 last:border-b-0 dark:border-slate-800"
          : "min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60",
        className,
      )}
    >
      <div className="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 min-w-0 text-sm text-slate-900 dark:text-slate-100",
          cloudLongTextClassName,
          valueClassName,
        )}
      >
        {value === undefined || value === null || value === "" ? "-" : value}
      </div>
    </div>
  );
}

type CloudCopyBlockProps = {
  title: React.ReactNode;
  onCopy: () => void;
  copyLabel?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
};

function CloudCopyBlock({
  title,
  onCopy,
  copyLabel = "Copy",
  className,
  titleClassName,
  contentClassName,
  children,
}: CloudCopyBlockProps) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className={cn(
            "min-w-0 text-sm font-medium text-slate-800 dark:text-slate-100",
            cloudLongTextClassName,
            titleClassName,
          )}
        >
          {title}
        </div>
        <Button
          variant="outline"
          size="1"
          className="shrink-0 self-start sm:self-auto"
          onClick={onCopy}
        >
          <Copy className="mr-1 h-3.5 w-3.5" />
          {copyLabel}
        </Button>
      </div>
      <div className={cn("mt-3 min-w-0", contentClassName)}>{children}</div>
    </div>
  );
}

function CloudDetailDialogSkeleton({ rows = 9 }: { rows?: number }) {
  return (
    <div className="mt-4 space-y-4" aria-hidden="true">
      <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="space-y-2 border-b border-slate-200 py-3 dark:border-slate-800">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
      <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CloudTableSkeletonRows({
  rows = 4,
  columns,
  actionColumn = true,
}: {
  rows?: number;
  columns: number;
  actionColumn?: boolean;
}) {
  const widths = ["w-32", "w-20", "w-24", "w-28", "w-24", "w-36", "w-20", "w-24"];

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, columnIndex) => {
            const isActionCell = actionColumn && columnIndex === columns - 1;

            return (
              <TableCell key={columnIndex} className={isActionCell ? "text-right" : undefined}>
                <Skeleton
                  className={cn(
                    "h-4",
                    isActionCell ? "ml-auto w-24" : widths[columnIndex % widths.length],
                  )}
                />
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </>
  );
}

function CloudReadonlyCodeBlock({
  value,
  placeholder = "",
  minHeightClassName = "min-h-32",
  maxHeightClassName = "max-h-64",
}: {
  value: string;
  placeholder?: string;
  minHeightClassName?: string;
  maxHeightClassName?: string;
}) {
  const hasValue = value.length > 0;
  const displayValue = hasValue ? value : placeholder;
  const lines = displayValue.split(/\r?\n/);
  const codeLines = lines.length > 0 ? lines : [""];

  return (
    <div
      className={cn(
        "min-w-0 overflow-auto rounded-lg border border-slate-200 bg-white text-xs dark:border-slate-800 dark:bg-slate-50 [scrollbar-gutter:stable]",
        minHeightClassName,
        maxHeightClassName,
      )}
    >
      <div className="flex min-w-max">
        <div className="sticky left-0 shrink-0 border-r border-slate-200 bg-slate-50 px-2 py-3 text-right font-mono text-[12px] leading-5 text-slate-400 select-none dark:border-slate-200 dark:bg-slate-100">
          {codeLines.map((_, index) => (
            <div key={index} className="h-5 min-w-6">
              {index + 1}
            </div>
          ))}
        </div>
        <pre
          className={cn(
            "px-4 py-3 font-mono text-[12px] leading-5 text-slate-800",
            hasValue ? "" : "text-slate-400",
          )}
        >
          {displayValue || "\u00a0"}
        </pre>
      </div>
    </div>
  );
}

function CloudCodeTextarea({
  value,
  onChange,
  placeholder,
  minHeightClassName = "min-h-40",
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  value: string;
  minHeightClassName?: string;
}) {
  const lineNumberRef = React.useRef<HTMLDivElement | null>(null);
  const lineCount = Math.max(1, value.split(/\r?\n/).length);

  return (
    <div
      className={cn(
        "flex min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white text-xs focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 dark:border-slate-800 dark:bg-slate-50",
        minHeightClassName,
        className,
      )}
    >
      <div
        ref={lineNumberRef}
        className="w-12 shrink-0 overflow-hidden border-r border-slate-200 bg-slate-50 px-2 py-3 text-right font-mono text-[12px] leading-5 text-slate-400 select-none dark:border-slate-200 dark:bg-slate-100"
      >
        {Array.from({ length: lineCount }).map((_, index) => (
          <div key={index} className="h-5">
            {index + 1}
          </div>
        ))}
      </div>
      <textarea
        {...props}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onScroll={(event) => {
          if (lineNumberRef.current) {
            lineNumberRef.current.scrollTop = event.currentTarget.scrollTop;
          }
          props.onScroll?.(event);
        }}
        className="min-h-full flex-1 resize-y border-0 bg-transparent px-4 py-3 font-mono text-[12px] leading-5 text-slate-800 outline-none placeholder:text-slate-400 focus-visible:ring-0 [overflow-wrap:anywhere] [scrollbar-gutter:stable]"
      />
    </div>
  );
}

export {
  Badge,
  Button,
  Checkbox,
  CloudCodeTextarea,
  CloudCopyBlock,
  CloudDetailDialogSkeleton,
  CloudDetailItem,
  CloudReadonlyCodeBlock,
  CloudTableSkeletonRows,
  Dialog,
  Flex,
  Select,
  Tabs,
  TextArea,
  TextField,
  cloudPanelBodyTextClassName,
  cloudDialogContentClassName,
  cloudPanelCardClassName,
  cloudPanelDescriptionClassName,
  cloudPanelFieldLabelClassName,
  cloudPanelHeaderClassName,
  cloudPanelSectionClassName,
  cloudPanelSubcardClassName,
  cloudPanelTitleClassName,
  cloudDetailSectionClassName,
  cloudDetailListClassName,
  cloudDetailListItemClassName,
  cloudDialogWideContentClassName,
  cloudLongTextClassName,
};

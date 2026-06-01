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
import { useAdminPageTitle } from "@/contexts/AdminPageTitleContext";
import { cn } from "@/lib/utils";

const cloudDialogBaseClassName =
  "flex max-h-[90vh] w-[calc(100vw-1.5rem)] flex-col overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-gutter:stable]";

const cloudDialogContentClassName =
  cn(
    cloudDialogBaseClassName,
    "max-w-5xl sm:max-w-3xl",
  );

const cloudDialogWideContentClassName =
  cn(
    "flex max-h-[92vh] w-[calc(100vw-1.5rem)] flex-col overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-gutter:stable]",
    "max-w-[96rem] sm:max-w-5xl",
  );

const cloudLongTextClassName =
  "min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]";

const cloudPanelCardClassName =
  "overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-none dark:border-slate-800/90 dark:bg-slate-950";

const cloudPanelHeaderClassName =
  "border-b border-slate-200/80 bg-transparent px-5 py-3.5 dark:border-slate-800";

const cloudPanelTitleClassName =
  "text-[15px] font-semibold text-slate-950 dark:text-slate-50";

const cloudPanelDescriptionClassName =
  "mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400";

const cloudPanelSectionClassName =
  "border-t border-slate-200/80 bg-transparent pt-4 dark:border-slate-800";

const cloudPanelSubcardClassName =
  "border-l-2 border-slate-200/90 bg-transparent py-2 pl-3 shadow-none dark:border-slate-700";

const cloudPanelFieldLabelClassName =
  "text-sm font-semibold text-foreground";

const cloudPanelBodyTextClassName =
  "text-sm leading-6 text-muted-foreground";

const cloudDetailSectionClassName =
  "border-t border-slate-200/80 pt-4 dark:border-slate-800";

const cloudDetailListClassName =
  "overflow-hidden border-y border-slate-200/80 bg-transparent shadow-none dark:border-slate-800";

const cloudDetailListItemClassName =
  "border-t border-slate-200/80 px-4 py-3 first:border-t-0 dark:border-slate-800";

const cloudDetailLabelClassName =
  "text-xs font-semibold uppercase tracking-normal text-muted-foreground";

const cloudDetailValueClassName =
  "text-sm font-medium text-foreground";

const cloudDetailMutedTextClassName =
  "text-sm text-muted-foreground";

const cloudTableScrollClassName =
  "min-w-0 overflow-auto overscroll-contain [scrollbar-gutter:stable]";

const cloudTableNameButtonClassName =
  "min-w-0 text-left font-semibold text-blue-700 transition-colors hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300";

const cloudTablePrimaryTextClassName =
  "font-semibold text-foreground";

const cloudTableSecondaryTextClassName =
  "text-xs leading-5 text-muted-foreground";

const cloudTableMutedTextClassName =
  "text-sm text-muted-foreground";

const cloudTableCodeTextClassName =
  "font-mono text-xs text-muted-foreground";

const cloudTableEmptyStateClassName =
  "min-h-36 border-slate-200/80 bg-slate-50 shadow-none dark:border-slate-800 dark:bg-slate-900/35";

const getCloudCodeLines = (value: string) => {
  const lines = value.split(/\r?\n/);
  return lines.length > 0 ? lines : [""];
};

const getCloudCodeLineNumberWidth = (lineCount: number) =>
  `calc(${Math.max(2, String(Math.max(1, lineCount)).length)}ch + 6px)`;

const cloudCodeLineNumberClassName =
  "shrink-0 overflow-hidden border-r border-slate-200/80 bg-slate-50 px-1 py-3 text-right font-mono text-[12px] leading-5 tabular-nums text-slate-400 select-none dark:border-slate-800 dark:bg-slate-900/45 dark:text-slate-500";

function CloudProviderHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  useAdminPageTitle(title, description);

  if (!actions) {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
      {actions}
    </div>
  );
}

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
  variant = "plain",
}: CloudDetailItemProps) {
  return (
    <div
      className={cn(
        variant === "plain"
          ? "min-w-0 border-b border-slate-200/80 py-3 last:border-b-0 dark:border-slate-800"
          : "min-w-0 rounded-lg border border-slate-200/80 bg-slate-50/70 px-4 py-3 shadow-none dark:border-slate-800 dark:bg-slate-900/25",
        className,
      )}
    >
      <div className={cloudDetailLabelClassName}>
        {label}
      </div>
      <div
        className={cn(
          "mt-1 min-w-0",
          cloudDetailValueClassName,
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
        "min-w-0 border-l-2 border-slate-200/90 bg-transparent py-2 pl-3 shadow-none dark:border-slate-700",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className={cn(
            "min-w-0 text-sm font-semibold text-foreground",
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
      <div className="border-b border-border pb-4">
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
          <div key={index} className="space-y-2 border-b border-border py-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
      <div className="space-y-4 border-t border-border pt-4">
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
  const codeLines = getCloudCodeLines(displayValue);
  const lineNumberWidth = getCloudCodeLineNumberWidth(codeLines.length);

  return (
    <div
      className={cn(
        "min-w-0 overflow-auto rounded-lg border border-slate-200/80 bg-white text-xs shadow-none [scrollbar-gutter:stable] dark:border-slate-800/90 dark:bg-slate-950",
        minHeightClassName,
        maxHeightClassName,
      )}
    >
      <div className="flex min-w-max">
        <div
          className={cn("sticky left-0", cloudCodeLineNumberClassName)}
          style={{ width: lineNumberWidth }}
        >
          {codeLines.map((_, index) => (
            <div key={index} className="h-5">
              {index + 1}
            </div>
          ))}
        </div>
        <pre
          className={cn(
            "px-4 py-3 font-mono text-[12px] leading-5 text-foreground",
            hasValue ? "" : "text-muted-foreground",
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
  const lineCount = Math.max(1, getCloudCodeLines(value).length);
  const lineNumberWidth = getCloudCodeLineNumberWidth(lineCount);

  return (
    <div
      className={cn(
        "flex min-w-0 overflow-hidden rounded-md border border-slate-200/80 bg-white text-xs shadow-none focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 dark:border-slate-800/90 dark:bg-slate-950",
        minHeightClassName,
        className,
      )}
    >
      <div
        ref={lineNumberRef}
        className={cloudCodeLineNumberClassName}
        style={{ width: lineNumberWidth }}
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
        className="min-h-full flex-1 resize-y border-0 bg-transparent px-4 py-3 font-mono text-[12px] leading-5 text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-0 [overflow-wrap:anywhere] [scrollbar-gutter:stable]"
      />
    </div>
  );
}

type CloudImportFormSectionProps = {
  groupLabel: React.ReactNode;
  groupControl: React.ReactNode;
  editorLabel: React.ReactNode;
  editor: React.ReactNode;
  footer: React.ReactNode;
  className?: string;
};

function CloudFormStack({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("min-w-0 space-y-4", className)}
      {...props}
    />
  );
}

function CloudFormGrid({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("grid min-w-0 gap-4 sm:grid-cols-2", className)}
      {...props}
    />
  );
}

function CloudFormField({
  label,
  help,
  className,
  labelClassName,
  helpClassName,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  label: React.ReactNode;
  help?: React.ReactNode;
  labelClassName?: string;
  helpClassName?: string;
}) {
  return (
    <div
      className={cn("min-w-0 space-y-2", className)}
      {...props}
    >
      <div className={cn(cloudPanelFieldLabelClassName, labelClassName)}>
        {label}
      </div>
      {children}
      {help ? (
        <div className={cn("text-xs leading-5 text-muted-foreground", helpClassName)}>
          {help}
        </div>
      ) : null}
    </div>
  );
}

function CloudFormActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-5 -mb-5 mt-1 flex flex-col-reverse gap-2 border-t border-slate-200/80 bg-white/95 px-5 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function CloudImportFormSection({
  groupLabel,
  groupControl,
  editorLabel,
  editor,
  footer,
  className,
}: CloudImportFormSectionProps) {
  return (
    <section
      className={cn(
        "min-w-0 space-y-5",
        className,
      )}
    >
      <div className="border-t border-slate-200/80 pt-4 dark:border-slate-800">
        <div className="grid min-w-0 gap-2 lg:grid-cols-[5rem_minmax(0,1fr)] lg:items-center">
          <label className={cn(cloudPanelFieldLabelClassName, "leading-9")}>
            {groupLabel}
          </label>
          <div className="min-w-0">
            {groupControl}
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-2">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className={cloudPanelFieldLabelClassName}>
            {editorLabel}
          </div>
        </div>
        {editor}
      </div>

      <CloudFormActions className="mt-0">
        {footer}
      </CloudFormActions>
    </section>
  );
}

type CloudSensitiveDialogContentProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  side?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

function CloudSensitiveDialogContent({
  title,
  description,
  badge,
  icon,
  children,
  side,
  className,
  bodyClassName,
}: CloudSensitiveDialogContentProps) {
  return (
    <Dialog.Content
      className={cn(
        cloudDialogWideContentClassName,
        "gap-0 overflow-hidden p-0 sm:max-w-4xl md:p-0",
        className,
      )}
    >
      <div className="border-b border-slate-200/80 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/35">
        <div className="flex min-w-0 flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? (
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-none">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              <Dialog.Title>{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className={cn("mt-1", cloudLongTextClassName)}>
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
          </div>
          {badge ? <div className="flex shrink-0 flex-wrap gap-2">{badge}</div> : null}
        </div>
      </div>
      <div
        className={cn(
          "grid min-h-0 flex-1 gap-0 overflow-hidden",
          side ? "lg:grid-cols-[minmax(0,1fr)_320px]" : "",
        )}
      >
        <div
          className={cn(
            "min-w-0 space-y-5 overflow-y-auto px-5 py-5 [scrollbar-gutter:stable]",
            bodyClassName,
          )}
        >
          {children}
        </div>
        {side ? (
          <aside className="min-w-0 border-t border-slate-200/80 bg-slate-50/55 px-5 py-5 dark:border-slate-800 dark:bg-slate-900/25 lg:border-l lg:border-t-0">
            {side}
          </aside>
        ) : null}
      </div>
    </Dialog.Content>
  );
}

function CloudSecretValueBlock({
  title,
  value,
  copyLabel = "Copy",
  onCopy,
  minHeightClassName = "min-h-24",
  maxHeightClassName = "max-h-52",
}: {
  title: React.ReactNode;
  value: string;
  copyLabel?: React.ReactNode;
  onCopy: () => void;
  minHeightClassName?: string;
  maxHeightClassName?: string;
}) {
  return (
    <CloudCopyBlock
      title={title}
      copyLabel={copyLabel}
      onCopy={onCopy}
      className="border-slate-200/90 bg-transparent py-2 pl-3 dark:border-slate-700"
      titleClassName="text-sm font-semibold text-foreground"
      contentClassName="mt-3"
    >
      <CloudReadonlyCodeBlock
        value={value}
        minHeightClassName={minHeightClassName}
        maxHeightClassName={maxHeightClassName}
      />
    </CloudCopyBlock>
  );
}

function CloudStatusNotice({
  tone = "gray",
  children,
}: {
  tone?: "green" | "amber" | "blue" | "red" | "gray";
  children: React.ReactNode;
}) {
  const toneClassName =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
        : tone === "blue"
          ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300"
          : tone === "red"
            ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
            : "border-border bg-muted/35 text-muted-foreground";

  return (
    <div className={cn("border-l-2 px-3 py-2 text-sm leading-6", toneClassName, cloudLongTextClassName)}>
      {children}
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
  CloudFormActions,
  CloudFormField,
  CloudFormGrid,
  CloudFormStack,
  CloudImportFormSection,
  CloudReadonlyCodeBlock,
  CloudSecretValueBlock,
  CloudSensitiveDialogContent,
  CloudStatusNotice,
  CloudTableSkeletonRows,
  CloudProviderHeader,
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
  cloudDetailLabelClassName,
  cloudDetailMutedTextClassName,
  cloudDialogWideContentClassName,
  cloudDetailValueClassName,
  cloudLongTextClassName,
  cloudTableCodeTextClassName,
  cloudTableEmptyStateClassName,
  cloudTableMutedTextClassName,
  cloudTableNameButtonClassName,
  cloudTablePrimaryTextClassName,
  cloudTableScrollClassName,
  cloudTableSecondaryTextClassName,
};

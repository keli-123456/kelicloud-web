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
import { cn } from "@/lib/utils";

const cloudDialogContentClassName =
  "w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] min-w-0 overflow-x-hidden sm:max-w-3xl";

const cloudDialogWideContentClassName =
  "w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] min-w-0 overflow-x-hidden sm:max-w-5xl";

const cloudLongTextClassName =
  "min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]";

const cloudSecretTextareaClassName =
  "mt-3 min-h-24 max-w-full resize-y font-mono text-xs [overflow-wrap:anywhere]";

const cloudTallSecretTextareaClassName =
  "mt-3 min-h-40 max-w-full resize-y font-mono text-xs [overflow-wrap:anywhere]";

const cloudPanelCardClassName =
  "overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40";

const cloudPanelHeaderClassName =
  "border-b border-slate-200 px-5 py-4 dark:border-slate-800";

const cloudPanelTitleClassName =
  "text-sm font-medium text-slate-900 dark:text-slate-100";

const cloudPanelDescriptionClassName =
  "mt-1 text-sm text-slate-500 dark:text-slate-400";

const cloudPanelSectionClassName =
  "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50";

const cloudPanelSubcardClassName =
  "rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50";

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
          : "min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60",
        className,
      )}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
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
  children: React.ReactNode;
};

function CloudCopyBlock({
  title,
  onCopy,
  copyLabel = "Copy",
  className,
  titleClassName,
  children,
}: CloudCopyBlockProps) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40",
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
      <div className="mt-3 min-w-0">{children}</div>
    </div>
  );
}

export {
  Badge,
  Button,
  Checkbox,
  CloudCopyBlock,
  CloudDetailItem,
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
  cloudSecretTextareaClassName,
  cloudTallSecretTextareaClassName,
};

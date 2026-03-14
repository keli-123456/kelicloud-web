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

type CloudDetailItemProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
  valueClassName?: string;
};

function CloudDetailItem({
  label,
  value,
  className,
  valueClassName,
}: CloudDetailItemProps) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3",
        className,
      )}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 min-w-0 text-sm text-slate-900",
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
        "min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className={cn(
            "min-w-0 text-sm font-medium text-slate-800",
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
  cloudDialogContentClassName,
  cloudDialogWideContentClassName,
  cloudLongTextClassName,
  cloudSecretTextareaClassName,
  cloudTallSecretTextareaClassName,
};

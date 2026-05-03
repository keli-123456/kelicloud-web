import React from "react";
import { ChevronDown } from "lucide-react";

import {
  Button,
  CloudCopyBlock,
  CloudDetailItem,
  cloudDetailSectionClassName,
  cloudLongTextClassName,
  cloudPanelTitleClassName,
} from "@/components/admin/cloud/cloud-ui";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export const PlainDetailItem = (props: React.ComponentProps<typeof CloudDetailItem>) => (
  <CloudDetailItem variant="plain" {...props} />
);

export function CompactCredentialRow({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-slate-200/80 py-2.5 first:border-t-0 first:pt-0 last:pb-0 dark:border-slate-800">
      <div className="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className={`min-w-0 text-right text-sm text-slate-900 dark:text-slate-100 ${cloudLongTextClassName}`}>
        {value === undefined || value === null || value === "" ? "-" : value}
      </div>
    </div>
  );
}

export function CompactCredentialCopyBlock({
  title,
  value,
  copyLabel,
  onCopy,
}: {
  title: React.ReactNode;
  value: string;
  copyLabel: React.ReactNode;
  onCopy: () => void;
}) {
  return (
    <CloudCopyBlock
      title={title}
      copyLabel={copyLabel}
      onCopy={onCopy}
      className="px-3 py-2"
      titleClassName="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400"
      contentClassName="mt-2"
    >
      <div className="max-h-28 overflow-auto overscroll-contain rounded-lg bg-slate-100/90 px-3 py-2 font-mono text-[11px] leading-5 text-slate-700 [scrollbar-gutter:stable] dark:bg-slate-900 dark:text-slate-200 [overflow-wrap:anywhere]">
        {value || "-"}
      </div>
    </CloudCopyBlock>
  );
}

export function CompactSummaryMetric({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-baseline gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className={`min-w-0 text-sm text-slate-800 dark:text-slate-100 ${cloudLongTextClassName}`}>
        {value === undefined || value === null || value === "" ? "-" : value}
      </span>
    </div>
  );
}

export function CompactDetailSection({
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  title: React.ReactNode;
  summary: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section className={cloudDetailSectionClassName}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="flex h-auto w-full items-start justify-between rounded-lg px-0 py-0 text-left hover:bg-transparent"
          >
            <div className="min-w-0 space-y-1">
              <div className={cloudPanelTitleClassName}>{title}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {summary === undefined || summary === null || summary === "" ? "-" : summary}
              </div>
            </div>
            <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 border-t border-slate-200/80 pt-4 dark:border-slate-800/80">
          {children}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

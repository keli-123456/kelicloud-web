import type { TFunction } from "i18next";

import type { AWSEC2Quota } from "@/lib/cloudAws";
import {
  formatAWSQuotaErrorMessage,
  getCompactQuotaSummary,
  getEC2QuotaItems,
} from "./awsPanelSummaries";

type AWSQuotaSummaryProps = {
  quota: AWSEC2Quota | null | undefined;
  error?: string;
  t: TFunction;
  compact?: boolean;
};

export function AWSQuotaSummary({
  quota,
  error,
  t,
  compact = false,
}: AWSQuotaSummaryProps) {
  const items = getEC2QuotaItems(quota, t);

  if (!items.length && !error) {
    return <span className="text-sm text-slate-400">-</span>;
  }

  return (
    <div className="space-y-2">
      {quota ? (
        <div className={compact ? "text-xs font-semibold text-slate-700 dark:text-slate-200" : "text-sm font-semibold text-slate-800 dark:text-slate-100"}>
          {getCompactQuotaSummary(quota, t)}
          {quota.region ? (
            <span className="font-normal text-slate-500 dark:text-slate-400">
              {" · "}
              {quota.region}
            </span>
          ) : null}
        </div>
      ) : null}
      {items.length ? (
        <div className={compact ? "space-y-1 text-xs" : "space-y-1.5 text-sm"}>
          {items.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-1 last:border-b-0 last:pb-0"
            >
              <span className="text-slate-500 dark:text-slate-400">{item.label}</span>
              <span className="text-right font-medium text-slate-700 dark:text-slate-200">{item.value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {error ? <div className="text-xs text-amber-700 dark:text-amber-300">{formatAWSQuotaErrorMessage(error, t)}</div> : null}
    </div>
  );
}

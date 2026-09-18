import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function RefreshNotice({ error, hasData, refreshing, onRetry }: {
  error: string;
  hasData: boolean;
  refreshing?: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  if (!error) return null;
  return (
    <div role="status" className="flex min-w-0 flex-wrap items-center gap-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
      <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
        <div className="font-medium">{t(hasData ? "async_feedback.stale" : "async_feedback.load_failed")}</div>
        <div className="mt-0.5">{error}</div>
      </div>
      <Button type="button" size="sm" variant="outline" disabled={refreshing} onClick={onRetry}>
        <RefreshCw className={refreshing ? "size-4 animate-spin" : "size-4"} />
        {t("async_feedback.refresh")}
      </Button>
    </div>
  );
}

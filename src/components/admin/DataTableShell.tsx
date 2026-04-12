import * as React from "react";
import { ChevronDown } from "lucide-react";

import { AsyncState } from "@/components/ui/async-state";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type DataTableShellProps = {
  search?: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  batchActions?: React.ReactNode;
  advancedFilters?: React.ReactNode;
  advancedFiltersLabel?: React.ReactNode;
  loading?: boolean;
  error?: React.ReactNode;
  empty?: boolean;
  onRetry?: () => void;
  retryLabel?: React.ReactNode;
  loadingLabel?: React.ReactNode;
  emptyTitle?: React.ReactNode;
  emptyDescription?: React.ReactNode;
  emptyAction?: React.ReactNode;
  pagination?: React.ReactNode;
  className?: string;
  toolbarClassName?: string;
  contentClassName?: string;
  children?: React.ReactNode;
};

function DataTableShell({
  search,
  filters,
  actions,
  batchActions,
  advancedFilters,
  advancedFiltersLabel,
  loading,
  error,
  empty,
  onRetry,
  retryLabel,
  loadingLabel,
  emptyTitle,
  emptyDescription,
  emptyAction,
  pagination,
  className,
  toolbarClassName,
  contentClassName,
  children,
}: DataTableShellProps) {
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const hasToolbar = Boolean(search || filters || actions || batchActions || advancedFilters);

  return (
    <div className={cn("flex min-w-0 flex-col gap-4", className)}>
      {hasToolbar ? (
        <div
          className={cn(
            "rounded-lg border border-border/60 bg-card p-3 shadow-none",
            toolbarClassName,
          )}
        >
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1 space-y-3">
              {(search || filters) ? (
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {search ? <div className="min-w-[220px] flex-1">{search}</div> : null}
                  {filters ? <div className="min-w-0 flex-1">{filters}</div> : null}
                </div>
              ) : null}
            </div>

            {(actions || batchActions) ? (
              <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
                {batchActions}
                {actions}
              </div>
            ) : null}
          </div>

          {advancedFilters ? (
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <div className="mt-3 border-t border-border/60 pt-3">
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-muted-foreground"
                  >
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform",
                        advancedOpen ? "rotate-180" : "",
                      )}
                    />
                    {advancedFiltersLabel ?? "More filters"}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  {advancedFilters}
                </CollapsibleContent>
              </div>
            </Collapsible>
          ) : null}
        </div>
      ) : null}

      {children !== undefined ? (
        <AsyncState
          loading={loading}
          error={error}
          empty={empty}
          onRetry={onRetry}
          retryLabel={retryLabel}
          loadingLabel={loadingLabel}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          emptyAction={emptyAction}
          className={contentClassName}
        >
          {children}
        </AsyncState>
      ) : null}

      {pagination && !loading && !error && !empty ? (
        <div className="flex items-center justify-center gap-2">{pagination}</div>
      ) : null}
    </div>
  );
}

export { DataTableShell };
export type { DataTableShellProps };

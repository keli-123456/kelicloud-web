import * as React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type AsyncStateProps = {
  loading?: boolean;
  error?: React.ReactNode;
  empty?: boolean;
  onRetry?: () => void;
  retryLabel?: React.ReactNode;
  loadingLabel?: React.ReactNode;
  emptyTitle?: React.ReactNode;
  emptyDescription?: React.ReactNode;
  emptyAction?: React.ReactNode;
  loadingFallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  emptyFallback?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

function DefaultLoading({ label }: { label?: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border border-border/60 bg-card p-4 shadow-none"
      role="status"
      aria-live="polite"
    >
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        {label ? (
          <div className="pt-1 text-xs text-muted-foreground">{label}</div>
        ) : null}
      </div>
    </div>
  );
}

function DefaultEmpty({
  title,
  description,
  action,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-card px-4 py-10 text-center shadow-none">
      <div className="text-sm font-medium text-foreground">
        {title ?? "No data"}
      </div>
      {description ? (
        <div className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
          {description}
        </div>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

function DefaultError({
  error,
  onRetry,
  retryLabel,
}: {
  error?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: React.ReactNode;
}) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription className="mt-2 flex flex-wrap items-center gap-3">
        <span>{error}</span>
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            className="h-8 px-3 text-xs"
            onClick={onRetry}
          >
            {retryLabel ?? "Retry"}
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

function AsyncState({
  loading,
  error,
  empty,
  onRetry,
  retryLabel,
  loadingLabel,
  emptyTitle,
  emptyDescription,
  emptyAction,
  loadingFallback,
  errorFallback,
  emptyFallback,
  className,
  children,
}: AsyncStateProps) {
  if (loading) {
    return (
      <div className={cn("min-w-0", className)}>
        {loadingFallback ?? <DefaultLoading label={loadingLabel} />}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("min-w-0", className)}>
        {errorFallback ?? (
          <DefaultError error={error} onRetry={onRetry} retryLabel={retryLabel} />
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className={cn("min-w-0", className)}>
        {emptyFallback ?? (
          <DefaultEmpty
            title={emptyTitle}
            description={emptyDescription}
            action={emptyAction}
          />
        )}
      </div>
    );
  }

  return <div className={cn("min-w-0", className)}>{children}</div>;
}

export { AsyncState };
export type { AsyncStateProps };

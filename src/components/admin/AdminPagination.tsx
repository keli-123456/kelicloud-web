import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ADMIN_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export function buildAdminPageNumbers(page: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | "..."> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) {
    pages.push("...");
  }

  for (let index = start; index <= end; index += 1) {
    pages.push(index);
  }

  if (end < totalPages - 1) {
    pages.push("...");
  }

  pages.push(totalPages);
  return pages;
}

export function useClientPagination<T>(
  items: T[],
  options: {
    initialPageSize?: number;
    resetKey?: React.Key | null;
  } = {},
) {
  const [page, setPageState] = React.useState(1);
  const [pageSize, setPageSizeState] = React.useState(options.initialPageSize ?? ADMIN_PAGE_SIZE_OPTIONS[0]);
  const total = items.length;
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = total === 0 ? 0 : (currentPage - 1) * safePageSize;
  const endIndex = total === 0 ? 0 : Math.min(startIndex + safePageSize, total);
  const pageItems = React.useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex],
  );

  React.useEffect(() => {
    setPageState((current) => Math.min(Math.max(1, current), totalPages));
  }, [totalPages]);

  React.useEffect(() => {
    setPageState(1);
  }, [options.resetKey]);

  const setPage = React.useCallback((nextPage: number | ((current: number) => number)) => {
    setPageState((current) => {
      const resolved = typeof nextPage === "function" ? nextPage(current) : nextPage;
      return Math.max(1, Math.min(totalPages, resolved));
    });
  }, [totalPages]);

  const setPageSize = React.useCallback((nextPageSize: number) => {
    setPageSizeState(Math.max(1, nextPageSize));
    setPageState(1);
  }, []);

  return {
    page: currentPage,
    pageSize: safePageSize,
    pageItems,
    total,
    totalPages,
    visibleStart: total === 0 ? 0 : startIndex + 1,
    visibleEnd: endIndex,
    setPage,
    setPageSize,
  };
}

type AdminPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  visibleStart: number;
  visibleEnd: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  itemLabel?: string;
  className?: string;
  compact?: boolean;
};

export function AdminPagination({
  page,
  totalPages,
  total,
  pageSize,
  visibleStart,
  visibleEnd,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = ADMIN_PAGE_SIZE_OPTIONS,
  itemLabel,
  className,
  compact = false,
}: AdminPaginationProps) {
  const { t } = useTranslation();

  if (total <= 0) {
    return null;
  }

  const label = itemLabel ?? t("admin.pagination.items", { defaultValue: "items" });
  const showPageControls = totalPages > 1;
  const smallestPageSize = Math.min(...pageSizeOptions);

  if (!showPageControls && (!onPageSizeChange || total <= smallestPageSize)) {
    return null;
  }

  const pageNumbers = buildAdminPageNumbers(page, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border bg-card/60 px-4 py-3 text-[12px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between",
        compact && "px-3 py-2.5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="whitespace-nowrap">
          {t("admin.pagination.summary", {
            start: visibleStart,
            end: visibleEnd,
            total,
            item: label,
            defaultValue: "{{start}}-{{end}} / {{total}} {{item}}",
          })}
        </span>
        {onPageSizeChange ? (
          <label className="flex items-center gap-2">
            <span className="whitespace-nowrap">
              {t("admin.pagination.rows_per_page", { defaultValue: "Rows per page" })}
            </span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-[12px] font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {showPageControls ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="h-8 rounded-md px-2 text-[12px]"
          >
            <ChevronLeft size={14} />
            {t("admin.pagination.previous", { defaultValue: "Previous" })}
          </Button>
          {pageNumbers.map((value, index) =>
            typeof value === "number" ? (
              <Button
                key={`${value}-${index}`}
                type="button"
                variant={value === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(value)}
                className="h-8 min-w-8 rounded-md px-2 text-[12px]"
                aria-current={value === page ? "page" : undefined}
              >
                {value}
              </Button>
            ) : (
              <span key={`${value}-${index}`} className="px-1 text-sm text-muted-foreground">
                {value}
              </span>
            ),
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="h-8 rounded-md px-2 text-[12px]"
          >
            {t("admin.pagination.next", { defaultValue: "Next" })}
            <ChevronRight size={14} />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

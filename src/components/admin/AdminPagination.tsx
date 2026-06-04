/* eslint-disable react-refresh/only-export-components */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ADMIN_PAGE_SIZE_OPTIONS,
  buildAdminPageNumbers,
} from "@/components/admin/AdminPaginationUtils";
export { ADMIN_PAGE_SIZE_OPTIONS, useClientPagination } from "@/components/admin/AdminPaginationUtils";

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

  const label = itemLabel ?? t("admin.pagination.items", { defaultValue: "条" });
  const showPageControls = totalPages > 1;
  const smallestPageSize = Math.min(...pageSizeOptions);

  if (!showPageControls && (!onPageSizeChange || total <= smallestPageSize)) {
    return null;
  }

  const pageNumbers = buildAdminPageNumbers(page, totalPages);

  return (
    <div
      className={cn(
        "admin-panel-footer flex flex-col gap-3 px-4 py-3 text-[12px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between",
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
            {t("admin.pagination.rows_per_page", { defaultValue: "每页" })}
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
            {t("admin.pagination.previous", { defaultValue: "上一页" })}
          </Button>
          {pageNumbers.map((value: number | "...", index: number) =>
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
            {t("admin.pagination.next", { defaultValue: "下一页" })}
            <ChevronRight size={14} />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

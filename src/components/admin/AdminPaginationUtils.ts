import * as React from "react";

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
  const [pageSize, setPageSizeState] = React.useState(
    options.initialPageSize ?? ADMIN_PAGE_SIZE_OPTIONS[0],
  );
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

  const setPage = React.useCallback(
    (nextPage: number | ((current: number) => number)) => {
      setPageState((current) => {
        const resolved =
          typeof nextPage === "function" ? nextPage(current) : nextPage;
        return Math.max(1, Math.min(totalPages, resolved));
      });
    },
    [totalPages],
  );

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

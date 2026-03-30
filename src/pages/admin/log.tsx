import React from "react";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

import NumberPicker from "@/components/ui/number-picker";
import Loading from "@/components/loading";
import {
  AdminPageShell,
  AdminSurface,
} from "@/components/admin/AdminPageShell";

interface Log {
  id: number;
  ip: string;
  uuid: string;
  message: string;
  msg_type: string;
  time: string;
}

async function fetchLogPage(limit: number, page: number, signal?: AbortSignal) {
  const response = await fetch(
    `/api/admin/logs?limit=${limit}&page=${page}&__ts=${Date.now()}`,
    {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, max-age=0",
        Pragma: "no-cache",
        "X-Requested-With": "XMLHttpRequest",
      },
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

const LogPage = () => {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [logs, setLogs] = React.useState<Log[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState<number>(1);
  const [total, setTotal] = React.useState<number>(1);
  const [limit, setLimit] = React.useState<number>(10);
  const [t] = useTranslation();
  const requestSequenceRef = React.useRef(0);
  const requestControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    const fetchLogs = async () => {
      const requestID = requestSequenceRef.current + 1;
      requestSequenceRef.current = requestID;
      requestControllerRef.current?.abort();
      const controller = new AbortController();
      requestControllerRef.current = controller;

      setLoading(true);
      setError(null);
      try {
        const data = await fetchLogPage(limit, page, controller.signal);
        if (requestSequenceRef.current !== requestID) {
          return;
        }
        setLogs(data.data.logs);
        setTotal(data.data.total);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          err instanceof Error
            ? (err.message.startsWith("HTTP ")
              ? t("logs.fetch_error", "Failed to fetch logs")
              : err.message)
            : t("common.unknown_error", "Unknown error"),
        );
      } finally {
        if (requestControllerRef.current === controller) {
          requestControllerRef.current = null;
        }
        if (requestSequenceRef.current === requestID) {
          setLoading(false);
        }
      }
    };

    void fetchLogs();

    return () => {
      requestControllerRef.current?.abort();
    };
  }, [limit, page, t]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const siblingsCount = 1;
  let pageNumbers: (number | string)[] = [];
  const leftSibling = Math.max(page - siblingsCount, 1);
  const rightSibling = Math.min(page + siblingsCount, totalPages);
  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < totalPages - 1;

  pageNumbers.push(1);
  if (showLeftDots) {
    pageNumbers.push("...");
  } else {
    for (let i = 2; i < leftSibling; i++) pageNumbers.push(i);
  }
  for (let i = leftSibling; i <= rightSibling; i++) {
    if (i > 1 && i < totalPages) pageNumbers.push(i);
  }
  if (showRightDots) {
    pageNumbers.push("...");
  } else {
    for (let i = rightSibling + 1; i < totalPages; i++) pageNumbers.push(i);
  }
  if (totalPages > 1) pageNumbers.push(totalPages);

  if (loading) {
    return <Loading />;
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {t("common.error")}: {error}
      </div>
    );
  }

  return (
    <AdminPageShell
      eyebrow={t("logs.title")}
      title={t("logs.title")}
      description={t("logs.description", {
        defaultValue:
          "Browse backend operation logs by page to quickly inspect source IPs, event types, and message details.",
      })}
      stats={[
        {
          label: t("logs.stats.total_records", {
            defaultValue: "Total records",
          }),
          value: `${total}`,
          hint: t("logs.stats.total_records_hint", {
            defaultValue: "Total number of log records returned by the API.",
          }),
          tone: "blue",
        },
        {
          label: t("logs.stats.current_page", { defaultValue: "Current page" }),
          value: `${page} / ${totalPages}`,
          hint: t("logs.stats.current_page_hint", {
            defaultValue: "Switch pages to review historical records.",
          }),
          tone: "emerald",
        },
        {
          label: t("logs.stats.page_size", { defaultValue: "Page size" }),
          value: `${limit}`,
          hint: t("logs.stats.page_size_hint", {
            defaultValue: "Changing the page size reloads the log list immediately.",
          }),
          tone: "amber",
        },
      ]}
      actions={
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span className="text-slate-500 dark:text-slate-400">
            {t("logs.limit", { defaultValue: "Rows per page" })}
          </span>
          <NumberPicker
            defaultValue={limit}
            onChange={(value) => {
              setPage(1);
              setLimit(value);
            }}
            min={1}
            max={100}
          />
        </div>
      }
    >
      <AdminSurface className="overflow-hidden p-0">
        <div className="border-b border-slate-200/70 px-1 py-3 dark:border-slate-800/70">
          <div className="flex flex-col gap-1">
            <label className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              {t("logs.details_title", { defaultValue: "Log details" })}
            </label>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("logs.details_description", {
                defaultValue:
                  "Click a log ID to inspect the full message, UUID, and timestamp.",
              })}
            </p>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
            {t("logs.empty", { defaultValue: "No log records found." })}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-[linear-gradient(135deg,rgba(19,70,134,0.10),rgba(255,255,255,0.92),rgba(89,172,119,0.10))] dark:bg-[linear-gradient(135deg,rgba(14,165,233,0.16),rgba(2,6,23,0.92),rgba(16,185,129,0.12))]">
              <TableRow>
                <TableHead>{t("logs.fields.id", { defaultValue: "ID" })}</TableHead>
                <TableHead>{t("logs.fields.ip", { defaultValue: "IP" })}</TableHead>
                <TableHead>{t("logs.fields.type", { defaultValue: "Type" })}</TableHead>
                <TableHead>{t("logs.fields.message", { defaultValue: "Message" })}</TableHead>
                <TableHead>{t("logs.fields.time", { defaultValue: "Time" })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow
                  key={log.id}
                  className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-900/60"
                >
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="font-semibold text-slate-900 hover:underline dark:text-slate-100"
                        >
                          {log.id}
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>
                            {t("logs.detail_dialog_title", {
                              defaultValue: "Log details",
                            })}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              {t("logs.fields.id", { defaultValue: "ID" })}
                            </div>
                            <div className="text-sm text-slate-900 dark:text-slate-100">{log.id}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              {t("logs.fields.ip", { defaultValue: "IP" })}
                            </div>
                            <div className="text-sm text-slate-900 dark:text-slate-100">{log.ip}</div>
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              {t("logs.fields.uuid", { defaultValue: "UUID" })}
                            </div>
                            <div className="break-all text-sm text-slate-900 dark:text-slate-100">{log.uuid}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              {t("logs.fields.type", { defaultValue: "Type" })}
                            </div>
                            <div className="text-sm text-slate-900 dark:text-slate-100">{log.msg_type}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              {t("logs.fields.time", { defaultValue: "Time" })}
                            </div>
                            <div className="text-sm text-slate-900 dark:text-slate-100">
                              {new Date(log.time).toLocaleString()}
                            </div>
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              {t("logs.fields.message", { defaultValue: "Message" })}
                            </div>
                            <div className="whitespace-pre-wrap break-all rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                              {log.message}
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">{t("close")}</Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                  <TableCell>{log.ip}</TableCell>
                  <TableCell>{log.msg_type}</TableCell>
                  <TableCell>
                    {log.message.length > 75
                      ? `${log.message.slice(0, 75)}...`
                      : log.message}
                  </TableCell>
                  <TableCell>{new Date(log.time).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AdminSurface>

      <div className="flex justify-center items-center gap-2">
        <Button
          disabled={loading || page === 1}
          onClick={() => setPage((value) => Math.max(1, value - 1))}
          variant="outline"
          className="rounded-xl"
        >
          {"<"}
        </Button>
        {pageNumbers.map((value, index) =>
          typeof value === "number" ? (
            <Button
              key={index}
              variant={value === page ? "default" : "outline"}
              onClick={() => setPage(value)}
              disabled={loading}
              className="rounded-xl"
            >
              {value}
            </Button>
          ) : (
            <span key={index} className="px-2 text-sm text-slate-500">
              ...
            </span>
          ),
        )}
        <Button
          disabled={loading || page === totalPages}
          onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          variant="outline"
          className="rounded-xl"
        >
          {">"}
        </Button>
      </div>
    </AdminPageShell>
  );
};

export default LogPage;

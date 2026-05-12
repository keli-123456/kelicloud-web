import React from "react";

import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
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

import {
  AdminPageShell,
  AdminSurface,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
import {
  AdminDataTable,
  AdminDataTableCell,
  AdminDataTableEmptyRow,
  AdminDataTableHead,
  AdminDataTableHeadRow,
  AdminDataTableRow,
  AdminDataTableScroll,
} from "@/components/admin/AdminDataTable";
import {
  ADMIN_FORM_DIALOG_CLASS,
  ADMIN_FORM_GRID_2_CLASS,
  ADMIN_FORM_SCROLL_CLASS,
} from "@/components/admin/AdminFormStyles";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { useAccount } from "@/contexts/AccountContext";

interface Log {
  user_id?: string;
  id: number;
  ip: string;
  uuid: string;
  message: string;
  msg_type: string;
  time: string;
}

type LogScope = "self" | "all";

async function fetchLogPage(
  limit: number,
  page: number,
  scope: LogScope,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({
    limit: String(limit),
    page: String(page),
    __ts: String(Date.now()),
  });
  if (scope === "all") {
    params.set("scope", "all");
  }

  const response = await fetch(
    `/api/admin/logs?${params.toString()}`,
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

const LogPage = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [logs, setLogs] = React.useState<Log[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState<number>(1);
  const [total, setTotal] = React.useState<number>(1);
  const [limit, setLimit] = React.useState<number>(10);
  const [scope, setScope] = React.useState<LogScope>("self");
  const [t] = useTranslation();
  const { platformAdmin } = useAccount();
  const requestSequenceRef = React.useRef(0);
  const requestControllerRef = React.useRef<AbortController | null>(null);
  const fetchLogsErrorText = t("logs.fetch_error", "Failed to fetch logs");
  const unknownErrorText = t("common.unknown_error", "Unknown error");
  const effectiveScope = platformAdmin ? scope : "self";
  const showActorColumn = platformAdmin && effectiveScope === "all";

  React.useEffect(() => {
    if (!platformAdmin && scope === "all") {
      setScope("self");
    }
  }, [platformAdmin, scope]);

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
        const data = await fetchLogPage(limit, page, effectiveScope, controller.signal);
        if (requestSequenceRef.current !== requestID) {
          return;
        }
        setLogs(Array.isArray(data?.data?.logs) ? data.data.logs : []);
        setTotal(Number.isFinite(Number(data?.data?.total)) ? Number(data.data.total) : 0);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          err instanceof Error
            ? (err.message.startsWith("HTTP ")
              ? fetchLogsErrorText
              : err.message)
            : unknownErrorText,
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
  }, [effectiveScope, fetchLogsErrorText, limit, page, unknownErrorText]);

  const pageActions = (
    <div className="flex flex-wrap items-center justify-end gap-3 text-sm text-slate-600 dark:text-slate-300">
      {platformAdmin ? (
        <SegmentedControl.Root
          value={effectiveScope}
          onValueChange={(value) => {
            setPage(1);
            setScope(value === "all" ? "all" : "self");
          }}
          size="1"
          radius="md"
        >
          <SegmentedControl.Item value="self">
            {t("logs.scope.self", { defaultValue: "Mine" })}
          </SegmentedControl.Item>
          <SegmentedControl.Item value="all">
            {t("logs.scope.all", { defaultValue: "All users" })}
          </SegmentedControl.Item>
        </SegmentedControl.Root>
      ) : null}
    </div>
  );

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const visibleStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const visibleEnd = total === 0 ? 0 : Math.min(page * limit, total);

  React.useEffect(() => {
    setPage((currentPage) => Math.min(Math.max(1, currentPage), totalPages));
  }, [totalPages]);

  if (loading) {
    return (
      <AdminPageShell
        eyebrow={t("logs.title")}
        title={t("logs.title")}
        description={t("logs.description", {
          defaultValue:
            "Browse backend operation logs by page to quickly inspect source IPs, event types, and message details.",
        })}
        className={embedded ? "p-0" : undefined}
        registerHeader={!embedded}
        actions={pageActions}
      >
        <AdminSurface className="overflow-hidden p-0">
          {!embedded ? (
            <div className="border-b border-slate-200/70 px-4 py-3 dark:border-slate-800/70">
              <div className="flex flex-col gap-1">
                <label className="text-lg font-semibold tracking-normal text-slate-900 dark:text-slate-50">
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
          ) : null}
          <AdminTableSkeleton columns={showActorColumn ? 6 : 5} rows={limit} className="rounded-none border-0 shadow-none" />
        </AdminSurface>
      </AdminPageShell>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
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
      className={embedded ? "p-0" : undefined}
      registerHeader={!embedded}
      actions={pageActions}
    >
      <AdminSurface className="overflow-hidden p-0">
        {!embedded ? (
          <div className="border-b border-slate-200/70 px-4 py-3 dark:border-slate-800/70">
            <div className="flex flex-col gap-1">
              <label className="text-lg font-semibold tracking-normal text-slate-900 dark:text-slate-50">
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
        ) : null}

        <AdminDataTableScroll>
          <AdminDataTable minWidth={showActorColumn ? 1040 : 920}>
            <thead>
              <AdminDataTableHeadRow>
                <AdminDataTableHead>{t("logs.fields.id", { defaultValue: "ID" })}</AdminDataTableHead>
                {showActorColumn ? (
                  <AdminDataTableHead>{t("logs.fields.actor", { defaultValue: "Actor" })}</AdminDataTableHead>
                ) : null}
                <AdminDataTableHead>{t("logs.fields.ip", { defaultValue: "IP" })}</AdminDataTableHead>
                <AdminDataTableHead>{t("logs.fields.type", { defaultValue: "Type" })}</AdminDataTableHead>
                <AdminDataTableHead>{t("logs.fields.message", { defaultValue: "Message" })}</AdminDataTableHead>
                <AdminDataTableHead>{t("logs.fields.time", { defaultValue: "Time" })}</AdminDataTableHead>
              </AdminDataTableHeadRow>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <AdminDataTableEmptyRow
                  colSpan={showActorColumn ? 6 : 5}
                  className="py-14 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  {t("logs.empty", { defaultValue: "No log records found." })}
                </AdminDataTableEmptyRow>
              ) : null}
              {logs.map((log) => (
                <AdminDataTableRow
                  key={log.id}
                >
                  <AdminDataTableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="font-semibold text-slate-900 hover:underline dark:text-slate-100"
                        >
                          {log.id}
                        </button>
                      </DialogTrigger>
                      <DialogContent className={`${ADMIN_FORM_DIALOG_CLASS} sm:max-w-2xl`}>
                        <DialogHeader>
                          <DialogTitle>
                            {t("logs.detail_dialog_title", {
                              defaultValue: "Log details",
                            })}
                          </DialogTitle>
                        </DialogHeader>
                        <div className={`${ADMIN_FORM_SCROLL_CLASS} ${ADMIN_FORM_GRID_2_CLASS}`}>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
                              {t("logs.fields.id", { defaultValue: "ID" })}
                            </div>
                            <div className="text-sm text-slate-900 dark:text-slate-100">{log.id}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
                              {t("logs.fields.ip", { defaultValue: "IP" })}
                            </div>
                            <div className="text-sm text-slate-900 dark:text-slate-100">{log.ip}</div>
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <div className="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
                              {t("logs.fields.uuid", { defaultValue: "UUID" })}
                            </div>
                            <div className="break-all text-sm text-slate-900 dark:text-slate-100">{log.uuid}</div>
                          </div>
                          {showActorColumn ? (
                            <div className="space-y-1 sm:col-span-2">
                              <div className="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
                                {t("logs.fields.actor", { defaultValue: "Actor" })}
                              </div>
                              <div className="break-all font-mono text-sm text-slate-900 dark:text-slate-100">
                                {log.user_id || "-"}
                              </div>
                            </div>
                          ) : null}
                          <div className="space-y-1">
                            <div className="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
                              {t("logs.fields.type", { defaultValue: "Type" })}
                            </div>
                            <div className="text-sm text-slate-900 dark:text-slate-100">{log.msg_type}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
                              {t("logs.fields.time", { defaultValue: "Time" })}
                            </div>
                            <div className="text-sm text-slate-900 dark:text-slate-100">
                              {new Date(log.time).toLocaleString()}
                            </div>
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <div className="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
                              {t("logs.fields.message", { defaultValue: "Message" })}
                            </div>
                            <div className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-slate-200/80 bg-slate-50 px-4 py-3 font-mono text-xs leading-5 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                              {log.message}
                            </div>
                          </div>
                        </div>
                        <DialogFooter className="border-t border-slate-200/70 pt-4 dark:border-slate-800/70">
                          <DialogClose asChild>
                            <Button variant="outline">{t("close")}</Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </AdminDataTableCell>
                  {showActorColumn ? (
                    <AdminDataTableCell className="max-w-[160px] truncate font-mono">
                      {log.user_id || "-"}
                    </AdminDataTableCell>
                  ) : null}
                  <AdminDataTableCell className="font-mono">{log.ip}</AdminDataTableCell>
                  <AdminDataTableCell>{log.msg_type}</AdminDataTableCell>
                  <AdminDataTableCell className="max-w-[360px] truncate">
                    {log.message.length > 75
                      ? `${log.message.slice(0, 75)}...`
                      : log.message}
                  </AdminDataTableCell>
                  <AdminDataTableCell>{new Date(log.time).toLocaleString()}</AdminDataTableCell>
                </AdminDataTableRow>
              ))}
            </tbody>
          </AdminDataTable>
        </AdminDataTableScroll>
        <AdminPagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={limit}
          visibleStart={visibleStart}
          visibleEnd={visibleEnd}
          onPageChange={setPage}
          onPageSizeChange={(nextLimit) => {
            setPage(1);
            setLimit(nextLimit);
          }}
          pageSizeOptions={[10, 20, 50, 100]}
          itemLabel={t("logs.title", { defaultValue: "logs" })}
        />
      </AdminSurface>
    </AdminPageShell>
  );
};

export default LogPage;

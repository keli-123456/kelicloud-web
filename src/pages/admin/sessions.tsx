import React from "react";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Badge,
  Button,
  Dialog,
} from "@/components/admin/admin-ui";

import { UserAgentHelper } from "@/utils/UserAgentHelper";
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
import { AdminPagination, useClientPagination } from "@/components/admin/AdminPagination";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import { formatApiErrorMessage, getReadableErrorMessage } from "@/lib/apiErrorMessage";

type Resp = {
  current: string;
  data: Array<{
    uuid: string;
    session: string;
    user_agent: string;
    ip: string;
    login_method: string;
    latest_online: string;
    latest_ip: string;
    latest_user_agent: string;
    expires: string;
    created_at: string;
  }>;
  status: string;
};

export default function Sessions({ embedded = false }: { embedded?: boolean } = {}) {
  const [t] = useTranslation();
  const [sessions, setSessions] = React.useState<Resp | null>(null);
  const [deleteSessionID, setDeleteSessionID] = React.useState<string | null>(null);
  const sessionRows = sessions?.data ?? [];
  const sessionPagination = useClientPagination(sessionRows, {
    initialPageSize: 10,
    resetKey: sessionRows.length,
  });

  React.useEffect(() => {
    fetch("/api/admin/session/get")
      .then((response) => {
        if (!response.ok) {
          throw new Error(formatApiErrorMessage(`HTTP ${response.status}: ${response.statusText}`, { status: response.status }));
        }
        return response.json();
      })
      .then((data: Resp) => {
        setSessions({
          ...data,
          data: Array.isArray(data.data) ? data.data : [],
        });
      })
      .catch((error) => {
        console.error("Error fetching sessions:", error);
        toast.error(getReadableErrorMessage(error));
      });
  }, []);

  function deleteSession(sessionId: string) {
    const isCurrent = sessionId === sessions?.current;
    fetch("/api/admin/session/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: sessionId }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          toast.success(t("sessions.deleted", "Session deleted"));
          if (isCurrent) {
            window.location.href = "/";
            return;
          }
          setSessions((prev) => ({
            ...prev!,
            data: prev?.data.filter((s) => s.session !== sessionId) || [],
          }));
        } else {
          console.error("Failed to delete session:", data);
          toast.error(data?.message ? formatApiErrorMessage(data.message) : t("sessions.delete_failed", "Failed to delete session"));
        }
      })
      .catch((error) => {
        console.error("Error deleting session:", error);
        toast.error(getReadableErrorMessage(error));
      });
  }

  function deleteAllSessions() {
    fetch("/api/admin/session/remove/all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then((response) => {
        if (!response.ok) {
          toast.error(formatApiErrorMessage(`HTTP ${response.status}`, { status: response.status }));
          return;
        }
        response
          .json()
          .then(() => {
            window.location.href = "/";
          })
          .catch((error) => {
            toast.error(getReadableErrorMessage(
              error,
              t("sessions.parse_response_failed", {
                defaultValue: "解析会话响应失败，请刷新后重试。",
              }),
            ));
          });
      })
      .catch((error) => {
        toast.error(getReadableErrorMessage(error));
      });
  }

  if (!sessions) {
    return (
      <AdminPageShell
        eyebrow={t("sessions.title")}
        title={t("sessions.active_sessions")}
        description={t(
          "sessions.description",
          "Review current admin devices, source IPs, recent activity, and session expiration from one page.",
        )}
        className={embedded ? "p-0" : undefined}
        registerHeader={!embedded}
        actions={
          <Button color="red" disabled>
            {t("sessions.delete_all")}
          </Button>
        }
      >
        <AdminSurface className="overflow-hidden p-0">
          {!embedded ? (
            <div className="border-b border-slate-200/70 px-4 py-3 dark:border-slate-800/70">
            <div className="flex flex-col gap-1">
              <label className="text-lg font-semibold tracking-normal text-slate-900 dark:text-slate-50">
                {t("sessions.details_title", "Session details")}
              </label>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t(
                  "sessions.details_description",
                  "Review suspicious devices and expired sessions regularly.",
                )}
              </p>
            </div>
            </div>
          ) : null}
          <AdminTableSkeleton columns={5} rows={5} className="rounded-none border-0 shadow-none" />
        </AdminSurface>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      eyebrow={t("sessions.title")}
      title={t("sessions.active_sessions")}
      description={t(
        "sessions.description",
        "Review current admin devices, source IPs, recent activity, and session expiration from one page.",
      )}
      className={embedded ? "p-0" : undefined}
      registerHeader={!embedded}
      actions={
        <Dialog.Root>
          <Dialog.Trigger>
            <Button color="red">
              {t("sessions.delete_all")}
            </Button>
          </Dialog.Trigger>
          <Dialog.Content className={ADMIN_FORM_DIALOG_CLASS} maxWidth={520}>
            <Dialog.Title>{t("sessions.delete_all")}</Dialog.Title>
            <Dialog.Description className={`${ADMIN_FORM_SCROLL_CLASS} mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400`}>
              {t("sessions.delete_all_desc")}
            </Dialog.Description>
            <div className="flex justify-end gap-2 border-t border-slate-200/70 pt-4 dark:border-slate-800/70">
              <Dialog.Close>
                <Button variant="soft">
                  {t("sessions.cancel")}
                </Button>
              </Dialog.Close>
              <Button color="red" onClick={deleteAllSessions}>
                {t("delete")}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Root>
      }
    >
      <AdminSurface className="overflow-hidden p-0">
        {!embedded ? (
          <div className="border-b border-slate-200/70 px-4 py-3 dark:border-slate-800/70">
            <div className="flex flex-col gap-1">
              <label className="text-lg font-semibold tracking-normal text-slate-900 dark:text-slate-50">
                {t("sessions.details_title", "Session details")}
              </label>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t(
                  "sessions.details_description",
                  "Review suspicious devices and expired sessions regularly.",
                )}
              </p>
            </div>
          </div>
        ) : null}

        <AdminDataTableScroll>
          <AdminDataTable minWidth={560}>
            <thead>
              <AdminDataTableHeadRow>
                <AdminDataTableHead>{t("sessions.session_id")}</AdminDataTableHead>
                <AdminDataTableHead>{t("sessions.user_agent_short", "UA")}</AdminDataTableHead>
                <AdminDataTableHead>{t("sessions.ip")}</AdminDataTableHead>
                <AdminDataTableHead>{t("sessions.last_login", "Last Seen")}</AdminDataTableHead>
                <AdminDataTableHead align="right">{t("sessions.actions")}</AdminDataTableHead>
              </AdminDataTableHeadRow>
            </thead>
            <tbody>
              {sessionPagination.pageItems.length === 0 ? (
                <AdminDataTableEmptyRow colSpan={5} className="py-14 text-center text-sm text-slate-500 dark:text-slate-400">
                  {t("sessions.empty", "No session records are available right now.")}
                </AdminDataTableEmptyRow>
              ) : null}
              {sessionPagination.pageItems.map((session, index) => {
                const isCurrent = session.session === sessions.current;
                const rowKey = session.session || `${session.uuid || "session"}-${index}`;

                return (
                  <AdminDataTableRow
                    key={rowKey}
                  >
                    <AdminDataTableCell>
                      <Dialog.Root>
                        <Dialog.Trigger>
                          <button
                            type="button"
                            className="flex items-center gap-2 text-left text-[12px] font-semibold text-slate-900 hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-300"
                          >
                            <span>{session.session.slice(0, 8)}...</span>
                            {isCurrent && (
                              <Badge color="blue" className="rounded-full">
                                {t("sessions.current")}
                              </Badge>
                            )}
                          </button>
                        </Dialog.Trigger>
                        <Dialog.Content className={ADMIN_FORM_DIALOG_CLASS} maxWidth={760}>
                          <Dialog.Title>
                            {t("sessions.detail_dialog_title", "Session details")}
                          </Dialog.Title>
                          <div className={`${ADMIN_FORM_SCROLL_CLASS} mt-1 space-y-4`}>
                            <div className={ADMIN_FORM_GRID_2_CLASS}>
                              <SessionDetailItem
                                label={t("sessions.session_id")}
                                value={session.session}
                                mono
                                wide
                              />
                              <SessionDetailItem label={t("sessions.ip")} value={session.ip} />
                              <SessionDetailItem
                                label={t("sessions.latest_ip", "Latest IP")}
                                value={session.latest_ip}
                              />
                              <SessionDetailItem
                                label={t("sessions.login_method")}
                                value={session.login_method}
                              />
                              <SessionDetailItem
                                label={t("sessions.latest_online", "Latest Online")}
                                value={`${new Date(session.latest_online).toLocaleString()} (${formatDuration(
                                  Date.now() - new Date(session.latest_online).getTime(),
                                  t,
                                )})`}
                              />
                              <SessionDetailItem
                                label={t("sessions.created_at")}
                                value={new Date(session.created_at).toLocaleString()}
                              />
                              <SessionDetailItem
                                label={t("sessions.expires_at", "Expires At")}
                                value={new Date(session.expires).toLocaleString()}
                              />
                            </div>
                            <SessionDetailItem
                              label={t("sessions.user_agent", "User Agent")}
                              value={session.user_agent}
                              hint={UserAgentHelper.format(session.user_agent)}
                              mono
                            />
                            <SessionDetailItem
                              label={t("sessions.last_user_agent")}
                              value={session.latest_user_agent}
                              hint={UserAgentHelper.format(session.latest_user_agent)}
                              mono
                            />
                          </div>
                          <div className="flex justify-end border-t border-slate-200/70 pt-4 dark:border-slate-800/70">
                            <Dialog.Close>
                              <Button variant="soft">
                                {t("close", "Close")}
                              </Button>
                            </Dialog.Close>
                          </div>
                        </Dialog.Content>
                      </Dialog.Root>
                    </AdminDataTableCell>
                    <AdminDataTableCell className="max-w-[220px] truncate">
                      {UserAgentHelper.format(session.user_agent)}
                    </AdminDataTableCell>
                    <AdminDataTableCell className="font-mono">{session.ip}</AdminDataTableCell>
                    <AdminDataTableCell>
                      {new Date(session.latest_online).toLocaleString()} (
                      {formatDuration(
                        Date.now() - new Date(session.latest_online).getTime(),
                        t,
                      )}
                      )
                    </AdminDataTableCell>
                    <AdminDataTableCell align="right">
                      <AdminRowActions
                        actions={[
                          {
                            label: t("delete", "Delete"),
                            icon: <Trash2 className="h-4 w-4" />,
                            destructive: true,
                            disabled: isCurrent,
                            onSelect: () => setDeleteSessionID(session.session),
                          },
                        ]}
                      />
                    </AdminDataTableCell>
                  </AdminDataTableRow>
                );
              })}
            </tbody>
          </AdminDataTable>
        </AdminDataTableScroll>
        <AdminPagination
          page={sessionPagination.page}
          totalPages={sessionPagination.totalPages}
          total={sessionPagination.total}
          pageSize={sessionPagination.pageSize}
          visibleStart={sessionPagination.visibleStart}
          visibleEnd={sessionPagination.visibleEnd}
          onPageChange={sessionPagination.setPage}
          onPageSizeChange={sessionPagination.setPageSize}
          itemLabel={t("sessions.title", "sessions")}
        />
      </AdminSurface>

      <Dialog.Root
        open={Boolean(deleteSessionID)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteSessionID(null);
          }
        }}
      >
        <Dialog.Content className={ADMIN_FORM_DIALOG_CLASS} maxWidth={520}>
          <Dialog.Title>
            {t("sessions.confirm_delete")}
          </Dialog.Title>
          <Dialog.Description className={`${ADMIN_FORM_SCROLL_CLASS} mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400`}>
            {t("sessions.delete_one_desc")}
          </Dialog.Description>
          <div className="flex justify-end gap-2 border-t border-slate-200/70 pt-4 dark:border-slate-800/70">
            <Dialog.Close>
              <Button variant="soft">
                {t("sessions.cancel")}
              </Button>
            </Dialog.Close>
            <Button
              color="red"
              onClick={() => {
                if (deleteSessionID) {
                  deleteSession(deleteSessionID);
                  setDeleteSessionID(null);
                }
              }}
            >
              {t("delete", "Delete")}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </AdminPageShell>
  );
}

function SessionDetailItem({
  hint,
  label,
  mono,
  value,
  wide,
}: {
  hint?: React.ReactNode;
  label: React.ReactNode;
  mono?: boolean;
  value: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "min-w-0 space-y-1 md:col-span-2" : "min-w-0 space-y-1"}>
      <div className="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div
        className={
          mono
            ? "break-all font-mono text-xs leading-5 text-slate-900 dark:text-slate-100"
            : "break-all text-sm text-slate-900 dark:text-slate-100"
        }
      >
        {value}
      </div>
      {hint ? (
        <div className="break-all text-sm font-medium text-slate-500 dark:text-slate-400">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function formatDuration(number: number, t: any): string {
  const ms = Math.abs(number);
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return t("just_now");
  }

  if (days > 0) {
    const remainingHours = hours % 24;
    if (remainingHours > 0) {
      return `${days}${t("nodeCard.time_day")}${remainingHours}${t("nodeCard.time_hour")}${t("time.ago")}`;
    }
    return `${days}${t("nodeCard.time_day")} ${t("time.ago")}`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    if (remainingMinutes > 0) {
      return `${hours}${t("nodeCard.time_hour")}${remainingMinutes}${t("nodeCard.time_minute")}${t("time.ago")}`;
    }
    return `${hours}${t("nodeCard.time_hour")}${t("time.ago")}`;
  }

  const remainingSeconds = seconds % 60;
  return `${minutes}${t("nodeCard.time_minute")}${remainingSeconds}${t("nodeCard.time_second")}${t("time.ago")}`;
}

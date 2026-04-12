import React from "react";

import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { useWarningDialog } from "@/components/ui/warning-dialog";

import { UserAgentHelper } from "@/utils/UserAgentHelper";
import {
  AdminPageShell,
  AdminSurface,
} from "@/components/admin/AdminPageShell";
import { DataTableShell } from "@/components/admin/DataTableShell";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function Sessions() {
  const [t] = useTranslation();
  const [sessions, setSessions] = React.useState<Resp | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchDraft, setSearchDraft] = React.useState("");
  const [searchKeyword, setSearchKeyword] = React.useState("");
  const [sessionFilter, setSessionFilter] = React.useState<"all" | "current" | "others">("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [selectedSessions, setSelectedSessions] = React.useState<string[]>([]);
  const [deletingSessionId, setDeletingSessionId] = React.useState<string | null>(null);
  const [deletingAll, setDeletingAll] = React.useState(false);
  const [batchDeleting, setBatchDeleting] = React.useState(false);
  const { confirm, dialog: warningDialog } = useWarningDialog();

  const loadSessions = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/session/get");
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      const data = (await response.json()) as Resp;
      if (data.status === "error") {
        throw new Error(t("sessions.load_failed", "Failed to load sessions"));
      }
      setSessions(data);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : t("sessions.load_failed", "Failed to load sessions");
      console.error("Error fetching sessions:", fetchError);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function deleteSession(sessionId: string) {
    const confirmed = await confirm({
      tone: "destructive",
      title: t("sessions.confirm_delete"),
      description: t("sessions.delete_one_desc"),
      confirmLabel: t("delete", "Delete"),
      cancelLabel: t("sessions.cancel"),
    });
    if (!confirmed) return;

    const isCurrent = sessionId === sessions?.current;
    setDeletingSessionId(sessionId);
    try {
      const response = await fetch("/api/admin/session/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: sessionId }),
      });
      const data = await response.json();
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
        toast.error(t("sessions.delete_failed", "Failed to delete session"));
      }
    } catch (deleteError) {
      console.error("Error deleting session:", deleteError);
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : t("sessions.delete_failed", "Failed to delete session"),
      );
    } finally {
      setDeletingSessionId(null);
    }
  }

  async function deleteAllSessions() {
    const confirmed = await confirm({
      tone: "destructive",
      title: t("sessions.delete_all"),
      description: t("sessions.delete_all_desc"),
      confirmLabel: t("delete", "Delete"),
      cancelLabel: t("sessions.cancel"),
    });
    if (!confirmed) return;

    setDeletingAll(true);
    try {
      const response = await fetch("/api/admin/session/remove/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        toast.error(`Error: ${response.status}`);
        return;
      }
      await response.json();
      window.location.href = "/";
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error ? deleteError.message : t("sessions.delete_failed", "Failed to delete session"),
      );
    } finally {
      setDeletingAll(false);
    }
  }

  const toggleAllOnPage = (checked: boolean) => {
    const ids = selectablePageSessions.map((session) => session.session);
    if (checked) {
      setSelectedSessions((current) => Array.from(new Set([...current, ...ids])));
      return;
    }
    setSelectedSessions((current) => current.filter((id) => !ids.includes(id)));
  };

  const handleBatchDelete = async () => {
    const targets = filteredSessions.filter(
      (session) =>
        selectedSessions.includes(session.session) &&
        session.session !== sessions?.current,
    );
    if (targets.length === 0) return;

    const confirmed = await confirm({
      tone: "destructive",
      title: t("sessions.batch_delete_title", {
        defaultValue: "Delete selected sessions",
      }),
      description: t("sessions.batch_delete_desc", {
        count: targets.length,
        defaultValue: `Delete ${targets.length} selected sessions?`,
      }),
      confirmLabel: t("delete", "Delete"),
      cancelLabel: t("sessions.cancel"),
    });
    if (!confirmed) return;

    setBatchDeleting(true);
    const failed: string[] = [];
    const deleted: string[] = [];

    for (const session of targets) {
      try {
        const response = await fetch("/api/admin/session/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session: session.session }),
        });
        const data = await response.json();
        if (data.status === "success") {
          deleted.push(session.session);
        } else {
          failed.push(session.session.slice(0, 8));
        }
      } catch {
        failed.push(session.session.slice(0, 8));
      }
    }

    if (deleted.length > 0) {
      setSessions((prev) => ({
        ...prev!,
        data: prev?.data.filter((item) => !deleted.includes(item.session)) || [],
      }));
      setSelectedSessions((current) =>
        current.filter((sessionId) => !deleted.includes(sessionId)),
      );
      toast.success(
        t("sessions.batch_delete_success", {
          count: deleted.length,
          defaultValue: `Deleted ${deleted.length} sessions`,
        }),
      );
    }

    if (failed.length > 0) {
      toast.error(
        t("sessions.batch_delete_failed", {
          count: failed.length,
          detail: failed.slice(0, 3).join(", "),
          defaultValue: `${failed.length} sessions failed: ${failed.slice(0, 3).join(", ")}`,
        }),
      );
    }

    setBatchDeleting(false);
  };

  const hasSessions = Boolean(sessions);
  const normalizedKeyword = searchKeyword.trim().toLowerCase();
  const filteredSessions = React.useMemo(() => {
    const source = sessions?.data || [];
    const currentSession = sessions?.current;
    return source.filter((session) => {
      if (sessionFilter === "current" && session.session !== currentSession) {
        return false;
      }
      if (sessionFilter === "others" && session.session === currentSession) {
        return false;
      }
      if (!normalizedKeyword) {
        return true;
      }
      return [
        session.session,
        session.ip,
        session.latest_ip,
        session.user_agent,
        session.latest_user_agent,
        session.login_method,
      ].some((value) => String(value || "").toLowerCase().includes(normalizedKeyword));
    });
  }, [normalizedKeyword, sessionFilter, sessions]);

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pageSessions = React.useMemo(() => {
    const start = (clampedPage - 1) * pageSize;
    return filteredSessions.slice(start, start + pageSize);
  }, [clampedPage, filteredSessions, pageSize]);

  React.useEffect(() => {
    if (page !== clampedPage) {
      setPage(clampedPage);
    }
  }, [clampedPage, page]);

  React.useEffect(() => {
    setSelectedSessions((current) =>
      current.filter((sessionId) =>
        filteredSessions.some((item) => item.session === sessionId),
      ),
    );
  }, [filteredSessions]);

  const selectablePageSessions = pageSessions.filter(
    (session) => session.session !== sessions?.current,
  );
  const selectedOnPage = selectablePageSessions.filter((session) =>
    selectedSessions.includes(session.session),
  ).length;
  const allOnPageSelected =
    selectablePageSessions.length > 0 && selectedOnPage === selectablePageSessions.length;

  const latestActive = (sessions?.data || []).reduce<number>((latest, item) => {
    const current = new Date(item.latest_online).getTime();
    return current > latest ? current : latest;
  }, 0);

  return (
    <AdminPageShell
      eyebrow={t("sessions.title")}
      title={t("sessions.active_sessions")}
      description={t(
        "sessions.description",
        "Review current admin devices, source IPs, recent activity, and session expiration from one page.",
      )}
      stats={[
        {
          label: t("sessions.stats.active_sessions_label", "Active sessions"),
          value: `${sessions?.data.length ?? 0}`,
          hint: t(
            "sessions.stats.active_sessions_hint",
            "Includes the admin session currently in use.",
          ),
          tone: "blue",
        },
        {
          label: t("sessions.stats.current_device_label", "Current device"),
          value: sessions?.current
            ? t("sessions.stats.current_device_known", "Recognized")
            : t("sessions.stats.current_device_unknown", "Unknown"),
          hint: sessions?.current
            ? `${sessions.current.slice(0, 8)}...`
            : t(
                "sessions.stats.current_device_hint",
                "No current session identifier was detected.",
              ),
          tone: "emerald",
        },
        {
          label: t("sessions.stats.last_active_label", "Last active"),
          value: latestActive
            ? formatDuration(Date.now() - latestActive, t)
            : t("just_now"),
          hint: t(
            "sessions.stats.last_active_hint",
            "Calculated dynamically from the most recent online timestamp.",
          ),
          tone: "amber",
        },
      ]}
    >
        <AdminSurface className="overflow-hidden p-0">
          <DataTableShell
            search={(
              <form
                className="min-w-0"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSearchKeyword(searchDraft.trim());
                }}
              >
                <Input
                  value={searchDraft}
                  onChange={(event) => {
                    const next = event.target.value;
                    setSearchDraft(next);
                    if (!next.trim()) {
                      setSearchKeyword("");
                    }
                  }}
                  placeholder={t("common.search", { defaultValue: "Search" })}
                  aria-label={t("common.search", { defaultValue: "Search" })}
                />
              </form>
            )}
            filters={(
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Select
                  value={sessionFilter}
                  onValueChange={(value) => {
                    setSessionFilter(value as "all" | "current" | "others");
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("sessions.filter_all", { defaultValue: "All sessions" })}
                    </SelectItem>
                    <SelectItem value="current">
                      {t("sessions.filter_current", { defaultValue: "Current session" })}
                    </SelectItem>
                    <SelectItem value="others">
                      {t("sessions.filter_others", { defaultValue: "Other sessions" })}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <span className="truncate text-xs text-muted-foreground">
                  {t("sessions.filter_summary", {
                    visible: filteredSessions.length,
                    total: sessions?.data.length ?? 0,
                    defaultValue: `Showing ${filteredSessions.length} / ${sessions?.data.length ?? 0}`,
                  })}
                </span>
              </div>
            )}
            actions={(
              <>
                <Button variant="outline" onClick={() => void loadSessions()}>
                  {t("common.refresh")}
                </Button>
                <Button
                  variant="destructive"
                  disabled={deletingAll || Boolean(deletingSessionId) || batchDeleting}
                  onClick={() => void deleteAllSessions()}
                >
                  {deletingAll ? t("loading") : t("sessions.delete_all")}
                </Button>
              </>
            )}
            batchActions={selectedSessions.length > 0 ? (
              <>
                <Badge variant="secondary">
                  {t("sessions.selected_count", {
                    count: selectedSessions.length,
                    defaultValue: `${selectedSessions.length} selected`,
                  })}
                </Badge>
                <Button
                  variant="destructive"
                  disabled={batchDeleting || deletingAll}
                  onClick={() => void handleBatchDelete()}
                >
                  {batchDeleting ? t("loading") : t("delete", "Delete")}
                </Button>
              </>
            ) : null}
            advancedFilters={(
              <div className="flex items-center gap-2 text-sm">
                <label htmlFor="sessions-page-size" className="text-muted-foreground">
                  {t("common.page_size", { defaultValue: "Page size" })}
                </label>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="sessions-page-size" className="h-9 w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            advancedFiltersLabel={t("common.more_filters", { defaultValue: "More filters" })}
            loading={loading}
            error={error}
            onRetry={() => void loadSessions()}
            retryLabel={t("common.retry", "Retry")}
            empty={!hasSessions || filteredSessions.length === 0}
            emptyTitle={t("sessions.empty", "No session records are available right now.")}
            emptyDescription={t("sessions.empty_desc", {
              defaultValue: "Try changing search keywords or session filters.",
            })}
            pagination={(
              <div className="flex items-center gap-2 text-sm">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={clampedPage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  {t("common.previous", { defaultValue: "Previous" })}
                </Button>
                <span className="text-muted-foreground">
                  {t("common.page_of", {
                    current: clampedPage,
                    total: totalPages,
                    defaultValue: `${clampedPage} / ${totalPages}`,
                  })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={clampedPage >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  {t("common.next", { defaultValue: "Next" })}
                </Button>
              </div>
            )}
          >
            <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allOnPageSelected}
                    onCheckedChange={(checked) => toggleAllOnPage(Boolean(checked))}
                    disabled={selectablePageSessions.length === 0 || batchDeleting}
                    aria-label={t("sessions.select_all", {
                      defaultValue: "Select all sessions on this page",
                    })}
                  />
                </TableHead>
                <TableHead>{t("sessions.session_id")}</TableHead>
                <TableHead>{t("sessions.user_agent_short", "UA")}</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>{t("sessions.latest_ip", "Latest IP")}</TableHead>
                <TableHead>{t("sessions.expires_at")}</TableHead>
                <TableHead>{t("sessions.last_login", "Last Seen")}</TableHead>
                <TableHead>{t("sessions.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageSessions.map((session) => {
                const isCurrent = session.session === sessions?.current;

                return (
                  <TableRow
                    key={session.uuid}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedSessions.includes(session.session)}
                        disabled={isCurrent || batchDeleting}
                        onCheckedChange={(checked) => {
                          const next = Boolean(checked);
                          setSelectedSessions((current) =>
                            next
                              ? Array.from(new Set([...current, session.session]))
                              : current.filter((value) => value !== session.session),
                          );
                        }}
                        aria-label={t("sessions.select_one", {
                          defaultValue: "Select this session",
                        })}
                      />
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <button
                            type="button"
                            className="flex items-center gap-2 text-left text-sm font-medium text-slate-900 hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-300"
                          >
                            <span>{session.session.slice(0, 8)}...</span>
                            {isCurrent && (
                              <Badge variant="info" className="rounded-full">
                                {t("sessions.current")}
                              </Badge>
                            )}
                          </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>
                              {t("sessions.detail_dialog_title", "Session details")}
                            </DialogTitle>
                            <DialogDescription>
                              {t("sessions.detail_dialog_desc", {
                                defaultValue: "Inspect session token, source, user agent and time metadata.",
                              })}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1 sm:col-span-2">
                              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                {t("sessions.session_id")}
                              </div>
                              <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 font-mono text-xs [overflow-wrap:anywhere]">
                                {session.session}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                IP
                              </div>
                              <div className="text-sm text-foreground">{session.ip}</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                {t("sessions.latest_ip", "Latest IP")}
                              </div>
                              <div className="text-sm text-foreground">{session.latest_ip}</div>
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                {t("sessions.user_agent", "User Agent")}
                              </div>
                              <div className="text-sm text-foreground [overflow-wrap:anywhere]">
                                {session.user_agent}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {UserAgentHelper.format(session.user_agent)}
                              </div>
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                {t("sessions.last_user_agent")}
                              </div>
                              <div className="text-sm text-foreground [overflow-wrap:anywhere]">
                                {session.latest_user_agent}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {UserAgentHelper.format(session.latest_user_agent)}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                {t("sessions.login_method")}
                              </div>
                              <div className="text-sm text-foreground">{session.login_method}</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                {t("sessions.latest_online", "Latest Online")}
                              </div>
                              <div className="text-sm text-foreground">
                                {new Date(session.latest_online).toLocaleString()} (
                                {formatDuration(
                                  Date.now() -
                                    new Date(session.latest_online).getTime(),
                                  t,
                                )}
                                )
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                {t("sessions.created_at")}
                              </div>
                              <div className="text-sm text-foreground">
                                {new Date(session.created_at).toLocaleString()}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                {t("sessions.expires_at", "Expires At")}
                              </div>
                              <div className="text-sm text-foreground">
                                {new Date(session.expires).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline" className="rounded-xl">
                                {t("close", "Close")}
                              </Button>
                            </DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                    <TableCell>{UserAgentHelper.format(session.user_agent)}</TableCell>
                    <TableCell>{session.ip}</TableCell>
                    <TableCell>{session.latest_ip}</TableCell>
                    <TableCell>
                      {new Date(session.expires).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(session.latest_online).toLocaleString()} (
                      {formatDuration(
                        Date.now() - new Date(session.latest_online).getTime(),
                        t,
                      )}
                      )
                    </TableCell>
                    <TableCell>
                      {!isCurrent && (
                        <Button
                          variant="ghost"
                          className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={deletingAll || deletingSessionId === session.session || batchDeleting}
                          onClick={() => void deleteSession(session.session)}
                        >
                          {deletingSessionId === session.session
                            ? t("loading")
                            : t("delete", "Delete")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </DataTableShell>
      </AdminSurface>
      {warningDialog}
    </AdminPageShell>
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

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
import { useTranslation } from "react-i18next";
import { Dialog, Flex, Button, Badge } from "@radix-ui/themes";

import { UserAgentHelper } from "@/utils/UserAgentHelper";
import Loading from "@/components/loading";
import {
  AdminPageShell,
  AdminSurface,
} from "@/components/admin/AdminPageShell";

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

  React.useEffect(() => {
    fetch("/api/admin/session/get")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then((data: Resp) => {
        setSessions(data);
      })
      .catch((error) => {
        console.error("Error fetching sessions:", error);
        toast.error(error.message);
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
          toast.success("会话已删除");
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
          toast.error("删除失败");
        }
      })
      .catch((error) => {
        console.error("Error deleting session:", error);
        toast.error(error.message);
      });
  }

  function deleteAllSessions() {
    fetch("/api/admin/session/remove/all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then((response) => {
        if (!response.ok) {
          toast.error("Error:" + response.status);
          return;
        }
        response
          .json()
          .then(() => {
            window.location.href = "/";
          })
          .catch((error) => {
            toast.error("Error parsing JSON:" + error);
          });
      })
      .catch((error) => {
        toast.error(error.message);
      });
  }

  if (!sessions) {
    return <Loading />;
  }

  const latestActive = sessions.data.reduce<number>((latest, item) => {
    const current = new Date(item.latest_online).getTime();
    return current > latest ? current : latest;
  }, 0);

  return (
    <AdminPageShell
      eyebrow={t("sessions.title")}
      title={t("sessions.active_sessions")}
      description="查看当前后台登录设备、来源 IP、最近活跃时间与会话有效期。"
      actions={
        <Dialog.Root>
          <Dialog.Trigger>
            <Button color="red" className="rounded-xl">
              {t("sessions.delete_all")}
            </Button>
          </Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Title>{t("sessions.delete_all")}</Dialog.Title>
            <Dialog.Description>
              {t("sessions.delete_all_desc")}
            </Dialog.Description>
            <Flex gap="2" justify="end" className="mt-4">
              <Dialog.Close>
                <Button variant="soft" className="rounded-xl">
                  {t("sessions.cancel")}
                </Button>
              </Dialog.Close>
              <Button color="red" onClick={deleteAllSessions} className="rounded-xl">
                {t("delete")}
              </Button>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
      }
      stats={[
        {
          label: "活跃会话",
          value: `${sessions.data.length}`,
          hint: "包含当前正在使用的后台管理端登录记录。",
          tone: "blue",
        },
        {
          label: "当前设备",
          value: sessions.current ? "已识别" : "未知",
          hint: sessions.current
            ? `${sessions.current.slice(0, 8)}...`
            : "未检测到当前会话标识。",
          tone: "emerald",
        },
        {
          label: "最近活跃",
          value: latestActive
            ? formatDuration(Date.now() - latestActive, t)
            : t("just_now"),
          hint: "按最后在线时间动态计算。",
          tone: "amber",
        },
      ]}
    >
      <AdminSurface className="overflow-hidden p-0">
        <div className="border-b border-slate-200/70 bg-slate-50/85 px-5 py-4">
          <div className="flex flex-col gap-1">
            <label className="text-lg font-semibold tracking-tight text-slate-900">
              会话明细
            </label>
            <p className="text-sm text-slate-500">
              建议定期清理异常设备或过期会话。
            </p>
          </div>
        </div>

        {sessions.data.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-slate-500">
            当前没有可展示的会话记录。
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-[linear-gradient(135deg,rgba(19,70,134,0.10),rgba(255,255,255,0.92),rgba(89,172,119,0.10))]">
              <TableRow>
                <TableHead>{t("sessions.session_id")}</TableHead>
                <TableHead>UA</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Latest IP</TableHead>
                <TableHead>{t("sessions.expires_at")}</TableHead>
                <TableHead>{t("sessions.last_login", "上次登录")}</TableHead>
                <TableHead>{t("sessions.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.data.map((session) => {
                const isCurrent = session.session === sessions.current;

                return (
                  <TableRow
                    key={session.uuid}
                    className="bg-white/55 transition-colors hover:bg-slate-50/80"
                  >
                    <TableCell>
                      <Dialog.Root>
                        <Dialog.Trigger>
                          <button
                            type="button"
                            className="flex items-center gap-2 text-left text-sm font-medium text-slate-900 hover:text-slate-700"
                          >
                            <span>{session.session.slice(0, 8)}...</span>
                            {isCurrent && (
                              <Badge color="blue" variant="soft" className="rounded-full">
                                {t("sessions.current")}
                              </Badge>
                            )}
                          </button>
                        </Dialog.Trigger>
                        <Dialog.Content>
                          <Dialog.Title>{t("sessions.active_sessions")}</Dialog.Title>
                          <Flex direction="column" gap="2">
                            <label className="text-base font-bold">
                              {t("sessions.session_id")}
                            </label>
                            <label className="text-sm break-all">{session.session}</label>
                            <label className="text-base font-bold">
                              IP / {t("sessions.latest_ip", "Latest IP")}
                            </label>
                            <label className="text-sm">
                              {session.ip} / {session.latest_ip}
                            </label>
                            <label className="text-base font-bold">User Agent</label>
                            <label className="text-sm">{session.user_agent}</label>
                            <label className="text-sm text-muted-foreground font-bold">
                              {UserAgentHelper.format(session.user_agent)}
                            </label>
                            <label className="text-base font-bold">
                              {t("sessions.last_user_agent")}
                            </label>
                            <label className="text-sm">
                              {session.latest_user_agent}
                            </label>
                            <label className="text-sm text-muted-foreground font-bold">
                              {UserAgentHelper.format(session.latest_user_agent)}
                            </label>
                            <label className="text-base font-bold">
                              {t("sessions.login_method")}
                            </label>
                            <label className="text-sm">{session.login_method}</label>
                            <label className="text-base font-bold">
                              {t("sessions.latest_online", "Latest Online")}
                            </label>
                            <label className="text-sm">
                              {new Date(session.latest_online).toLocaleString()} (
                              {formatDuration(
                                Date.now() -
                                  new Date(session.latest_online).getTime(),
                                t,
                              )}
                              )
                            </label>
                            <label className="text-base font-bold">
                              {t("sessions.created_at")}
                            </label>
                            <label className="text-sm">
                              {new Date(session.created_at).toLocaleString()}
                            </label>
                            <label className="text-base font-bold">
                              {t("sessions.expires_at", "Expires At")}
                            </label>
                            <label className="text-sm">
                              {new Date(session.expires).toLocaleString()}
                            </label>
                            <Flex justify="end">
                              <Dialog.Close>
                                <Button variant="soft" className="rounded-xl">
                                  {t("close")}
                                </Button>
                              </Dialog.Close>
                            </Flex>
                          </Flex>
                        </Dialog.Content>
                      </Dialog.Root>
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
                        <Dialog.Root>
                          <Dialog.Trigger>
                            <Button color="red" variant="ghost" className="rounded-xl">
                              {t("delete")}
                            </Button>
                          </Dialog.Trigger>
                          <Dialog.Content>
                            <Dialog.Title>
                              {t("sessions.confirm_delete")}
                            </Dialog.Title>
                            <Dialog.Description>
                              {t("sessions.delete_one_desc")}
                            </Dialog.Description>
                            <Flex gap="2" justify="end" className="mt-4">
                              <Dialog.Close>
                                <Button variant="soft" className="rounded-xl">
                                  {t("sessions.cancel")}
                                </Button>
                              </Dialog.Close>
                              <Button
                                color="red"
                                onClick={() => deleteSession(session.session)}
                                className="rounded-xl"
                              >
                                {t("delete")}
                              </Button>
                            </Flex>
                          </Dialog.Content>
                        </Dialog.Root>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </AdminSurface>
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

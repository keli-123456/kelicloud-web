import React from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, GitBranch, Gauge } from "lucide-react";
import { toast } from "sonner";

import {
  ADMIN_PANEL_CLASS,
  AdminSettingsSkeleton,
} from "@/components/admin/AdminPageShell";
import {
  SettingCardButton,
  SettingCardLabel,
  SettingCardLongTextInput,
  SettingCardSelect,
  SettingCardShortTextInput,
  SettingCardSwitch,
} from "@/components/admin/SettingCard";
import { useAccount } from "@/contexts/AccountContext";
import { updateSettingsWithToast, useSettings } from "@/lib/api";
import {
  formatApiErrorMessage,
  getReadableErrorMessage,
} from "@/lib/apiErrorMessage";
import { renderProviderInputs } from "@/utils/renderProviders";

const notificationPanelClass = `${ADMIN_PANEL_CLASS} px-4 py-2`;

const GeneralNotification = () => {
  return (
    <div className="flex flex-col gap-4">
      <Inner />
    </div>
  );
};

const Inner = () => {
  const { t } = useTranslation();
  const { platformAdmin, loading: accountLoading } = useAccount();
  const userState = useSettings();
  const systemState = useSettings("system", { enabled: platformAdmin });
  const userSettings = userState.settings;
  const systemSettings = systemState.settings;
  const loading = userState.loading || (platformAdmin && systemState.loading);
  const error = userState.error || systemState.error;
  const [messageDefs, setMessageDefs] = React.useState<any>({});
  const [messageList, setMessageList] = React.useState<string[]>([]);
  const [currentMessageSender, setCurrentMessageSender] = React.useState("");
  const [messageValues, setMessageValues] = React.useState<any>({});
  const [messageLoading, setMessageLoading] = React.useState(false);
  const [messageError, setMessageError] = React.useState("");
  const currentNotificationMethod =
    systemSettings.notification_method ||
    userSettings.notification_method ||
    currentMessageSender ||
    "";
  const notificationsEnabled = Boolean(
    systemSettings.notification_enabled ?? userSettings.notification_enabled,
  );
  const expireNotificationsEnabled = Boolean(
    systemSettings.expire_notification_enabled,
  );
  const expireLeadDays = Number(systemSettings.expire_notification_lead_days ?? 7);
  const expireStatusItems = [
    {
      label: t("notification.scheduler.status", {
        defaultValue: "状态",
      }),
      value: expireNotificationsEnabled
        ? t("notification.scheduler.enabled", {
            defaultValue: "已启用",
          })
        : t("notification.scheduler.disabled", {
            defaultValue: "未启用",
          }),
      active: expireNotificationsEnabled,
    },
    {
      label: t("notification.scheduler.lead_time", {
        defaultValue: "提前提醒",
      }),
      value: t("notification.scheduler.lead_days", {
        count: expireLeadDays,
        defaultValue: "{{count}} 天",
      }),
    },
    {
      label: t("notification.scheduler.check_time", {
        defaultValue: "检查时间",
      }),
      value: t("notification.scheduler.daily_check", {
        time: "17:00",
        defaultValue: "每天 {{time}}",
      }),
    },
    {
      label: t("notification.scheduler.channel", {
        defaultValue: "发送通道",
      }),
      value:
        notificationsEnabled && currentNotificationMethod
          ? currentNotificationMethod
          : t("notification.scheduler.channel_disabled", {
              defaultValue: "未配置",
            }),
      active: notificationsEnabled && Boolean(currentNotificationMethod),
    },
  ];

  React.useEffect(() => {
    if (!platformAdmin || loading) return;

    setMessageLoading(true);
    fetch("/api/admin/settings/message-sender")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success" && data.data) {
          setMessageDefs(data.data);
          const senders = Object.keys(data.data);
          setMessageList(senders);
          const initialSender =
            systemSettings.notification_method &&
            senders.includes(systemSettings.notification_method)
              ? systemSettings.notification_method
              : "";
          setCurrentMessageSender(initialSender);
          return;
        }
        setMessageError(
          data.message
            ? formatApiErrorMessage(data.message)
            : t(
                "settings.notification.fetch_channels_error",
                "获取消息通道信息失败",
              ),
        );
      })
      .catch(() =>
        setMessageError(
          t(
            "settings.notification.fetch_channels_error",
            "获取消息通道信息失败",
          ),
        ),
      )
      .finally(() => setMessageLoading(false));
  }, [loading, platformAdmin, systemSettings.notification_method, t]);

  React.useEffect(() => {
    if (!platformAdmin || !currentMessageSender) return;

    setMessageLoading(true);
    fetch(`/api/admin/settings/message-sender?provider=${currentMessageSender}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success" && data.data) {
          try {
            setMessageValues(JSON.parse(data.data.addition || "{}"));
          } catch {
            setMessageValues({});
          }
          return;
        }
        setMessageError(
          data.message
            ? formatApiErrorMessage(data.message)
            : t(
                "settings.notification.fetch_settings_error",
                "获取通知设置失败",
              ),
        );
      })
      .catch(() =>
        setMessageError(
          t(
            "settings.notification.fetch_settings_error",
            "获取通知设置失败",
          ),
        ),
      )
      .finally(() => setMessageLoading(false));
  }, [currentMessageSender, platformAdmin, t]);

  const handleMessageSave = async (values: any) => {
    setMessageLoading(true);
    setMessageError("");
    try {
      const res = await fetch("/api/admin/settings/message-sender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: currentMessageSender,
          addition: JSON.stringify(values),
        }),
      });
      const data = await res.json();
      if (data.status !== "success") {
        throw new Error(
          formatApiErrorMessage(data.message || t("common.error"), {
            status: res.status,
          }),
        );
      }
      setMessageValues(values);
      toast.success(t("common.success"));
    } catch (error) {
      toast.error(getReadableErrorMessage(error, t("common.error")));
    } finally {
      setMessageLoading(false);
    }
  };

  if (accountLoading || loading) {
    return <AdminSettingsSkeleton sections={5} />;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  const renderUserBinding = () => {
    if (!currentNotificationMethod || currentNotificationMethod === "none") {
      return (
        <p className="text-sm text-muted-foreground">
          {t("settings.notification.target_binding_no_method")}
        </p>
      );
    }

    const content = (() => {
      switch (currentNotificationMethod) {
        case "telegram":
          return (
            <>
              <SettingCardShortTextInput
                title={t("settings.notification.target_binding_telegram_chat_id")}
                description={t(
                  "settings.notification.target_binding_telegram_chat_id_description",
                )}
                defaultValue={userSettings.notification_telegram_chat_id || ""}
                OnSave={async (value) => {
                  await updateSettingsWithToast(
                    { notification_telegram_chat_id: value.trim() },
                    t,
                  );
                  await userState.refetch();
                }}
              />
              <SettingCardShortTextInput
                title={t(
                  "settings.notification.target_binding_telegram_thread_id",
                )}
                description={t(
                  "settings.notification.target_binding_telegram_thread_id_description",
                )}
                defaultValue={
                  userSettings.notification_telegram_message_thread_id || ""
                }
                OnSave={async (value) => {
                  await updateSettingsWithToast(
                    {
                      notification_telegram_message_thread_id: value.trim(),
                    },
                    t,
                  );
                  await userState.refetch();
                }}
              />
            </>
          );
        case "bark":
          return (
            <SettingCardShortTextInput
              title={t("settings.notification.target_binding_bark_device_key")}
              description={t(
                "settings.notification.target_binding_bark_device_key_description",
              )}
              defaultValue={userSettings.notification_bark_device_key || ""}
              OnSave={async (value) => {
                await updateSettingsWithToast(
                  { notification_bark_device_key: value.trim() },
                  t,
                );
                await userState.refetch();
              }}
            />
          );
        case "webhook":
          return (
            <SettingCardShortTextInput
              title={t("settings.notification.target_binding_webhook_url")}
              description={t(
                "settings.notification.target_binding_webhook_url_description",
              )}
              defaultValue={userSettings.notification_webhook_url || ""}
              OnSave={async (value) => {
                await updateSettingsWithToast(
                  { notification_webhook_url: value.trim() },
                  t,
                );
                await userState.refetch();
              }}
            />
          );
        default:
          return (
            <p className="text-sm text-muted-foreground">
              {t("settings.notification.target_binding_unsupported", {
                method: currentNotificationMethod,
              })}
            </p>
          );
      }
    })();

    return (
      <>
        {!notificationsEnabled ? (
          <p className="text-sm text-muted-foreground">
            {t("settings.notification.target_binding_disabled")}
          </p>
        ) : null}
        {content}
      </>
    );
  };

  const eventScopes = [
    {
      icon: CalendarClock,
      title: t("notification.events.plan_expire_title", {
        defaultValue: "套餐到期",
      }),
      description: t("notification.events.plan_expire_description", {
        defaultValue: "套餐和服务器到期前按提前天数提醒对应用户。",
      }),
    },
    {
      icon: GitBranch,
      title: t("notification.events.failover_title", {
        defaultValue: "故障切换",
      }),
      description: t("notification.events.failover_description", {
        defaultValue: "故障切换任务触发、等待人工处理和执行完成时通知任务所属用户。",
      }),
    },
    {
      icon: Gauge,
      title: t("notification.events.load_title", {
        defaultValue: "负载与流量",
      }),
      description: t("notification.events.load_description", {
        defaultValue: "负载阈值和流量阈值达到规则时发送资源告警。",
      }),
    },
  ];

  return (
    <div className="grid gap-4">
      <section className={notificationPanelClass}>
        <SettingCardLabel>
          {t("notification.events.title", {
            defaultValue: "通知范围",
          })}
        </SettingCardLabel>
        <div className="-mt-1 pb-1 text-sm text-muted-foreground">
          {t("notification.events.description", {
            defaultValue: "通知主要围绕用户套餐、故障切换和资源告警，不再维护独立的离线通知规则。",
          })}
        </div>
        <div className="divide-y divide-border/70">
          {eventScopes.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-3 py-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className={notificationPanelClass}>
        <SettingCardLabel>
          {t("settings.notification.target_binding_title")}
        </SettingCardLabel>
        <div className="-mt-1 pb-1 text-sm text-muted-foreground">
          {t("settings.notification.target_binding_description")}
        </div>
        {renderUserBinding()}
      </section>

      {platformAdmin ? (
        <>
          <section className={notificationPanelClass}>
            <SettingCardLabel>
              {t("settings.notification.platform_sender_title")}
            </SettingCardLabel>
            <SettingCardSwitch
              title={t("settings.notification.enable")}
              description={t("settings.notification.enable_description")}
              defaultChecked={systemSettings.notification_enabled}
              onChange={async (checked) => {
                await updateSettingsWithToast(
                  { notification_enabled: checked },
                  t,
                  "system",
                );
                await Promise.all([systemState.refetch(), userState.refetch()]);
              }}
            />
            <SettingCardSelect
              title={t("settings.notification.method")}
              description={t("settings.notification.method_description")}
              options={messageList.map((sender) => ({
                value: sender,
                label: sender,
              }))}
              value={currentMessageSender}
              OnSave={async (val: string) => {
                if (val === currentMessageSender) return;
                await updateSettingsWithToast(
                  { notification_method: val },
                  t,
                  "system",
                );
                setCurrentMessageSender(val);
                await Promise.all([systemState.refetch(), userState.refetch()]);
              }}
            />
            {messageError ? (
              <p className="px-0 py-3 text-sm text-destructive">{messageError}</p>
            ) : messageLoading ? (
              <AdminSettingsSkeleton sections={2} />
            ) : (
              renderProviderInputs({
                currentProvider: currentMessageSender,
                providerDefs: messageDefs,
                providerValues: messageValues,
                translationPrefix: `settings.notification.${currentMessageSender}`,
                title: t("settings.notification.provider_fields"),
                description: t(
                  "settings.notification.provider_fields_description",
                ),
                setProviderValues: setMessageValues,
                handleSave: handleMessageSave,
                t,
              })
            )}
            <SettingCardLongTextInput
              title={t("settings.notification.template")}
              description={t("settings.notification.template_description")}
              defaultValue={systemSettings.notification_template}
              OnSave={async (value) => {
                await updateSettingsWithToast(
                  { notification_template: value },
                  t,
                  "system",
                );
                await systemState.refetch();
              }}
            />
            <SettingCardButton
              title={t("settings.notification.test_title")}
              description={t("settings.notification.test_description")}
              onClick={async () => {
                try {
                  const res = await fetch("/api/admin/test/sendMessage", {
                    method: "POST",
                  });
                  const data = await res.json().catch(() => null);
                  if (!data) {
                    toast.error(t("common.error"));
                    return;
                  }
                  if (data.message && data.code !== 200) {
                    toast.error(formatApiErrorMessage(data.message));
                    return;
                  }
                  toast.success(t("common.success"));
                } catch (error) {
                  toast.error(
                    `${t("common.error")}: ${getReadableErrorMessage(
                      error,
                      t("common.error"),
                    )}`,
                  );
                }
              }}
            >
              {t("settings.notification.test_title")}
            </SettingCardButton>
          </section>

          <section className={notificationPanelClass}>
            <SettingCardLabel>{t("admin.notification.expire_title")}</SettingCardLabel>
            <div className="mb-2 grid gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-3 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/35 sm:grid-cols-2 xl:grid-cols-4">
              {expireStatusItems.map((item) => (
                <div key={item.label} className="min-w-0">
                  <div className="text-xs font-medium text-muted-foreground">
                    {item.label}
                  </div>
                  <div
                    className={`mt-1 truncate text-sm font-semibold ${
                      item.active === undefined
                        ? "text-foreground"
                        : item.active
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                    }`}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
            <SettingCardSwitch
              defaultChecked={expireNotificationsEnabled}
              title={t("admin.notification.expire_enable")}
              description={t("admin.notification.expire_enable_description")}
              onChange={async (checked) => {
                await updateSettingsWithToast(
                  { expire_notification_enabled: checked },
                  t,
                  "system",
                );
                await systemState.refetch();
              }}
            />
            <SettingCardShortTextInput
              type="number"
              title={t("admin.notification.expire_time")}
              description={t("admin.notification.expire_time_description")}
              defaultValue={expireLeadDays}
              OnSave={async (value) => {
                const numValue = Number(value);
                if (Number.isNaN(numValue) || numValue < 0) {
                  toast.error(
                    t("settings.invalid_number", {
                      defaultValue: "请输入有效的非负数字",
                    }),
                  );
                  return;
                }
                await updateSettingsWithToast(
                  { expire_notification_lead_days: numValue },
                  t,
                  "system",
                );
                await systemState.refetch();
              }}
            />
            <SettingCardLabel>{t("admin.notification.login")}</SettingCardLabel>
            <SettingCardSwitch
              title={t("admin.notification.login")}
              description={t("admin.notification.login_description")}
              defaultChecked={systemSettings.login_notification}
              onChange={async (checked) => {
                await updateSettingsWithToast(
                  { login_notification: checked },
                  t,
                  "system",
                );
              }}
            />
            <SettingCardLabel>{t("admin.notification.traffic")}</SettingCardLabel>
            <SettingCardShortTextInput
              title={t("admin.notification.traffic")}
              description={t("admin.notification.traffic_description")}
              defaultValue={systemSettings.traffic_limit_percentage}
              type="number"
              OnSave={async (value) => {
                await updateSettingsWithToast(
                  { traffic_limit_percentage: Number(value) },
                  t,
                  "system",
                );
              }}
            />
          </section>
        </>
      ) : null}
    </div>
  );
};

export default GeneralNotification;

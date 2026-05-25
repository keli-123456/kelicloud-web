import React from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, GitBranch } from "lucide-react";
import { toast } from "sonner";

import {
  ADMIN_PANEL_CLASS,
  AdminSettingsSkeleton,
} from "@/components/admin/AdminPageShell";
import {
  SettingCardButton,
  SettingCardLabel,
  SettingCardShortTextInput,
  SettingCardSwitch,
} from "@/components/admin/SettingCard";
import { useAccount } from "@/contexts/AccountContext";
import { updateSettings, updateSettingsWithToast, useSettings } from "@/lib/api";
import {
  formatApiErrorMessage,
  getReadableErrorMessage,
} from "@/lib/apiErrorMessage";
import { renderProviderInputs } from "@/utils/renderProviders";

const notificationPanelClass = `${ADMIN_PANEL_CLASS} px-4 py-2`;
const TELEGRAM_NOTIFICATION_METHOD = "telegram";
const TELEGRAM_DEFAULT_ENDPOINT = "https://api.telegram.org/bot";

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
  const [currentMessageSender, setCurrentMessageSender] = React.useState(
    TELEGRAM_NOTIFICATION_METHOD,
  );
  const [messageValues, setMessageValues] = React.useState<any>({});
  const [messageLoading, setMessageLoading] = React.useState(false);
  const [messageError, setMessageError] = React.useState("");
  const currentNotificationMethod = TELEGRAM_NOTIFICATION_METHOD;
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
          const telegramDefinition = data.data[TELEGRAM_NOTIFICATION_METHOD];
          if (!telegramDefinition) {
            setMessageError(
              t(
                "settings.notification.fetch_channels_error",
                "获取消息通道信息失败",
              ),
            );
            return;
          }
          setMessageDefs({
            [TELEGRAM_NOTIFICATION_METHOD]: telegramDefinition,
          });
          setCurrentMessageSender(TELEGRAM_NOTIFICATION_METHOD);
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
  }, [loading, platformAdmin, t]);

  React.useEffect(() => {
    if (!platformAdmin || !currentMessageSender) return;

    setMessageLoading(true);
    fetch(`/api/admin/settings/message-sender?provider=${currentMessageSender}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success" && data.data) {
          try {
            const parsedValues = JSON.parse(data.data.addition || "{}");
            setMessageValues({
              bot_token: parsedValues.bot_token || "",
            });
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
    const telegramValues = {
      bot_token: String(values?.bot_token || "").trim(),
      endpoint: TELEGRAM_DEFAULT_ENDPOINT,
    };
    try {
      const res = await fetch("/api/admin/settings/message-sender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: TELEGRAM_NOTIFICATION_METHOD,
          addition: JSON.stringify(telegramValues),
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
      if (systemSettings.notification_method !== TELEGRAM_NOTIFICATION_METHOD) {
        await updateSettings(
          { notification_method: TELEGRAM_NOTIFICATION_METHOD },
          "system",
        );
      }
      setMessageValues({ bot_token: telegramValues.bot_token });
      await Promise.all([systemState.refetch(), userState.refetch()]);
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

  const visibleMessageDefs = {
    ...messageDefs,
    [TELEGRAM_NOTIFICATION_METHOD]: Array.isArray(
      messageDefs[TELEGRAM_NOTIFICATION_METHOD],
    )
      ? messageDefs[TELEGRAM_NOTIFICATION_METHOD].filter(
          (field: any) => field.name === "bot_token",
        )
      : messageDefs[TELEGRAM_NOTIFICATION_METHOD],
  };

  const renderUserBinding = () => {
    return (
      <>
        {!notificationsEnabled ? (
          <p className="text-sm text-muted-foreground">
            {t("settings.notification.target_binding_disabled")}
          </p>
        ) : null}
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
            defaultValue:
              "通知主要围绕用户套餐、故障切换和登录安全，不再维护独立的离线或资源告警规则。",
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
                  {
                    notification_enabled: checked,
                    notification_method: TELEGRAM_NOTIFICATION_METHOD,
                  },
                  t,
                  "system",
                );
                await Promise.all([systemState.refetch(), userState.refetch()]);
              }}
            />
            <div className="flex items-center justify-between gap-4 border-b border-border/70 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">
                  {t("settings.notification.method")}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {t("settings.notification.telegram_only_description", {
                    defaultValue: "当前仅保留 Telegram 作为通知发送通道。",
                  })}
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                Telegram
              </span>
            </div>
            {messageError ? (
              <p className="px-0 py-3 text-sm text-destructive">{messageError}</p>
            ) : messageLoading ? (
              <AdminSettingsSkeleton sections={2} />
            ) : (
              renderProviderInputs({
                currentProvider: currentMessageSender,
                providerDefs: visibleMessageDefs,
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
            <SettingCardButton
              title={t("settings.notification.test_title")}
              description={t("settings.notification.test_description")}
              onClick={async () => {
                try {
                  if (!notificationsEnabled) {
                    toast.error(
                      t("settings.notification.test_requires_enabled", {
                        defaultValue: "请先启用通知发送通道。",
                      }),
                    );
                    return;
                  }
                  if (
                    !String(userSettings.notification_telegram_chat_id || "").trim()
                  ) {
                    toast.error(
                      t("settings.notification.test_requires_telegram_chat_id", {
                        defaultValue:
                          "请先在个人接收目标里填写 Telegram 聊天 ID。",
                      }),
                    );
                    return;
                  }
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
            <div className="mb-2 grid gap-2 border-y border-slate-200/80 py-3 dark:border-slate-800 sm:grid-cols-2 xl:grid-cols-4">
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
          </section>
        </>
      ) : null}
    </div>
  );
};

export default GeneralNotification;

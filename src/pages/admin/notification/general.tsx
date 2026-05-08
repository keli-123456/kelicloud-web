import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AdminSettingsSkeleton } from "@/components/admin/AdminPageShell";
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

const GeneralNotification = () => {
  return (
    <div className="flex flex-col gap-4 p-0">
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
                "Failed to load message channels",
              ),
        );
      })
      .catch(() =>
        setMessageError(
          t(
            "settings.notification.fetch_channels_error",
            "Failed to load message channels",
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
                "Failed to load notification settings",
              ),
        );
      })
      .catch(() =>
        setMessageError(
          t(
            "settings.notification.fetch_settings_error",
            "Failed to load notification settings",
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

  return (
    <>
      <SettingCardLabel>
        {t("settings.notification.target_binding_title")}
      </SettingCardLabel>
      <p className="text-sm text-muted-foreground">
        {t("settings.notification.target_binding_description")}
      </p>
      {renderUserBinding()}

      {platformAdmin ? (
        <>
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
            <p className="text-sm text-destructive">{messageError}</p>
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

          <SettingCardLabel>{t("admin.notification.expire_title")}</SettingCardLabel>
          <SettingCardSwitch
            defaultChecked={systemSettings.expire_notification_enabled}
            title={t("admin.notification.expire_enable")}
            description={t("admin.notification.expire_enable_description")}
            onChange={async (checked) => {
              await updateSettingsWithToast(
                { expire_notification_enabled: checked },
                t,
                "system",
              );
            }}
          />
          <SettingCardShortTextInput
            type="number"
            title={t("admin.notification.expire_time")}
            description={t("admin.notification.expire_time_description")}
            defaultValue={systemSettings.expire_notification_lead_days}
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
        </>
      ) : null}
    </>
  );
};

export default GeneralNotification;

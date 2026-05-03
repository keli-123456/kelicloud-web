import { useTranslation } from "react-i18next";
import { updateSettingsWithToast, useSettings } from "@/lib/api";
import {
  AdminSettingsSkeleton,
} from "@/components/admin/AdminPageShell";
import {
  SettingCardButton,
  SettingCardLabel,
  SettingCardLongTextInput,
  SettingCardShortTextInput,
  SettingCardSelect,
  SettingCardSwitch,
} from "@/components/admin/SettingCard";
import { toast } from "sonner";
import React from "react";
import { renderProviderInputs } from "@/utils/renderProviders";
import { SquareArrowOutUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAccount } from "@/contexts/AccountContext";

const NotificationSettings = () => {
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
  const [currentMessageSender, setCurrentMessageSender] = React.useState<string>("");
  const [messageValues, setMessageValues] = React.useState<any>({});
  const [messageLoading, setMessageLoading] = React.useState(false);
  const [messageError, setMessageError] = React.useState("");
  const currentNotificationMethod = userSettings.notification_method || "";
  const notificationsEnabled = Boolean(userSettings.notification_enabled);

  // 拉取所有 message sender 及字段定义
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
            systemSettings.notification_method && senders.includes(systemSettings.notification_method)
              ? systemSettings.notification_method
              : "";
          setCurrentMessageSender(initialSender);
        } else {
          setMessageError(
            data.message ||
              t(
                "settings.notification.fetch_channels_error",
                "Failed to load message channels",
              ),
          );
        }
      })
      .catch(() =>
        setMessageError(
          t(
            "settings.notification.fetch_channels_error",
            "Failed to load message channels",
          ),
        )
      )
      .finally(() => setMessageLoading(false));
  }, [loading, platformAdmin, systemSettings.notification_method, t]);

  // 拉取当前 message sender 的设置
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
        } else {
          setMessageError(
            data.message ||
              t(
                "settings.notification.fetch_settings_error",
                "Failed to load notification settings",
              ),
          );
        }
      })
      .catch(() =>
        setMessageError(
          t(
            "settings.notification.fetch_settings_error",
            "Failed to load notification settings",
          ),
        )
      )
      .finally(() => setMessageLoading(false));
  }, [currentMessageSender, platformAdmin, t]);

  // 处理保存
  const handleMessageSave = async (values: any) => {
    setMessageLoading(true);
    setMessageError("");
    const body = {
      name: currentMessageSender,
      addition: JSON.stringify(values),
    };
    try {
      const res = await fetch("/api/admin/settings/message-sender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.status !== "success") {
        throw new Error(data.message || t("common.error"));
      } else {
        setMessageValues(values);
      }
      toast.success(t("common.success"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
    setMessageLoading(false);
  };
  if (accountLoading) {
    return <AdminSettingsSkeleton sections={4} />;
  }
  if (loading || (platformAdmin && !messageLoading && messageList.length === 0 && !messageError)) {
    return <AdminSettingsSkeleton sections={5} />;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (platformAdmin && messageError) {
    return <p className="text-sm text-destructive">{messageError}</p>;
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
                description={t("settings.notification.target_binding_telegram_chat_id_description")}
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
                title={t("settings.notification.target_binding_telegram_thread_id")}
                description={t("settings.notification.target_binding_telegram_thread_id_description")}
                defaultValue={userSettings.notification_telegram_message_thread_id || ""}
                OnSave={async (value) => {
                  await updateSettingsWithToast(
                    { notification_telegram_message_thread_id: value.trim() },
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
              description={t("settings.notification.target_binding_bark_device_key_description")}
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
              description={t("settings.notification.target_binding_webhook_url_description")}
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
      <SettingCardLabel>{t("settings.notification.title")}</SettingCardLabel>
      <SettingCardLabel>{t("settings.notification.target_binding_title")}</SettingCardLabel>
      <p className="text-sm text-muted-foreground">
        {t("settings.notification.target_binding_description")}
      </p>
      {renderUserBinding()}
      {platformAdmin ? (
        <>
          <SettingCardLabel>{t("settings.notification.platform_sender_title")}</SettingCardLabel>
          <SettingCardSwitch
            title={t("settings.notification.enable")}
            description={t("settings.notification.enable_description")}
            defaultChecked={systemSettings.notification_enabled}
            onChange={async (checked) => {
              await updateSettingsWithToast({ notification_enabled: checked }, t, "system");
              await Promise.all([systemState.refetch(), userState.refetch()]);
            }}
          />
          <SettingCardLongTextInput
            title={t("settings.notification.template")}
            description={t("settings.notification.template_description")}
            defaultValue={systemSettings.notification_template}
            OnSave={async (value) => {
              await updateSettingsWithToast({ notification_template: value }, t, "system");
              await systemState.refetch();
            }}
          />
          <SettingCardSelect
            title={t("settings.notification.method")}
            description={t("settings.notification.method_description")}
            options={messageList.map((sender) => ({ value: sender, label: sender }))}
            value={currentMessageSender}
            OnSave={async (val: string) => {
              if (val === currentMessageSender) return;
              await updateSettingsWithToast({ notification_method: val }, t, "system");
              setCurrentMessageSender(val);
              await Promise.all([systemState.refetch(), userState.refetch()]);
            }}
          />
      {messageLoading ? <AdminSettingsSkeleton sections={2} /> : renderProviderInputs({
        currentProvider: currentMessageSender,
        providerDefs: messageDefs,
            providerValues: messageValues,
            translationPrefix: `settings.notification.${currentMessageSender}`,
            title: t("settings.notification.provider_fields"),
            description: t("settings.notification.provider_fields_description"),
            setProviderValues: setMessageValues,
            handleSave: handleMessageSave,
            t,
          })}
          <SettingCardButton
            title={t("settings.notification.test_title")}
            description={t("settings.notification.test_description")}
            onClick={async () => {
              try {
                const res = await fetch("/api/admin/test/sendMessage", {
                  method: "POST",
                });
                let data;
                try {
                  data = await res.json();
                } catch {
                  toast.error(t("common.error"));
                  return;
                }
                if (data && data.message && data.code !== 200) {
                  toast.error(data.message);
                  return;
                }
                toast.success(t("common.success"));
              } catch (error) {
                toast.error(
                  t("common.error") +
                  ": " +
                  (error instanceof Error ? error.message : String(error))
                );
              }
            }}
          >
            {t("settings.notification.test_title")}
          </SettingCardButton>
        </>
      ) : null}
      <label className="text-muted-foreground text-sm flex flex-row items-center gap-1">
        {t("settings.notification.moved")}
        <Link
          to="/admin/notification/general"
        >
          <SquareArrowOutUpRight size={16} />
        </Link>
      </label>
    </>
  );
};

export default NotificationSettings;

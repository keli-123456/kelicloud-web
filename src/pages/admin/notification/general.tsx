import { useTranslation } from "react-i18next";
import { updateSettingsWithToast, useSettings } from "@/lib/api";
import Loading from "@/components/loading";
import {
  SettingCardLabel,
  SettingCardShortTextInput,
  SettingCardSwitch,
} from "@/components/admin/SettingCard";
import { toast } from "sonner";
import { useAccount } from "@/contexts/AccountContext";
import { PlatformAdminNotice } from "@/components/admin/PlatformAdminNotice";
const GeneralNotification = () => {
  return (
    <div className="flex flex-col gap-2 p-0 md:pt-1">
      <Inner />
    </div>
  );
};

const Inner = () => {
  const { t } = useTranslation();
  const { platformAdmin, loading: accountLoading } = useAccount();
  const { settings, loading, error } = useSettings("system", {
    enabled: platformAdmin,
  });

  if (accountLoading || loading) {
    return <Loading />;
  }

  if (!platformAdmin) {
    return <PlatformAdminNotice />;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  return (
    <>
      <SettingCardLabel>
        {t("admin.notification.expire_title")}
      </SettingCardLabel>
      <SettingCardSwitch
        defaultChecked={settings.expire_notification_enabled}
        title={t("admin.notification.expire_enable")}
        description={t("admin.notification.expire_enable_description")}
        onChange={async (checked) => {
          await updateSettingsWithToast(
            { expire_notification_enabled: checked },
            t,
            "system"
          );
        }}
      />
      <SettingCardShortTextInput
        type="number"
        title={t("admin.notification.expire_time")}
        description={t("admin.notification.expire_time_description")}
        defaultValue={settings.expire_notification_lead_days}
        OnSave={async (value) => {
          const numValue = Number(value);
          if (isNaN(numValue) || numValue < 0) {
            toast.error("Please enter a valid non-negative number");
            return;
          }
          await updateSettingsWithToast(
            { expire_notification_lead_days: numValue },
            t,
            "system"
          );
        }}
      />
      <SettingCardLabel>{t("admin.notification.login")}</SettingCardLabel>
      <SettingCardSwitch
        title={t("admin.notification.login")}
        description={t("admin.notification.login_description")}
        defaultChecked={settings.login_notification}
        onChange={async (checked) => {
          await updateSettingsWithToast(
            { login_notification: checked },
            t,
            "system"
          );
        }}
      />
      <SettingCardLabel>{t("admin.notification.traffic")}</SettingCardLabel>
      <SettingCardShortTextInput
        title={t("admin.notification.traffic")}
        description={t("admin.notification.traffic_description")}
        defaultValue={settings.traffic_limit_percentage}
        type="number"
        OnSave={async (value) => {
          await updateSettingsWithToast(
            { traffic_limit_percentage: Number(value) },
            t,
            "system"
          );
        }}
      />
    </>
  );
};

export default GeneralNotification;

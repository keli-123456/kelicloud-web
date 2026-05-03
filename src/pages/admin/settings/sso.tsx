import {
  SettingCardSelect,
  SettingCardShortTextInput,
  SettingCardSwitch,
} from "@/components/admin/SettingCard";
import { AdminSettingsSkeleton } from "@/components/admin/AdminPageShell";
import { updateSettingsWithToast, useSettings } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { useAccount } from "@/contexts/AccountContext";
import { PlatformAdminNotice } from "@/components/admin/PlatformAdminNotice";

export default function SsoSettings() {
  const { t } = useTranslation();
  const { platformAdmin, loading: accountLoading } = useAccount();
  const { settings, loading, error } = useSettings("system", {
    enabled: platformAdmin,
  });

  if (accountLoading || loading) {
    return <AdminSettingsSkeleton sections={4} />;
  }

  if (!platformAdmin) {
    return <PlatformAdminNotice />;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  return (
    <>
      <SettingCardSwitch
        title={t("settings.sso.enable")}
        description={t("settings.sso.enable_description")}
        defaultChecked={settings.o_auth_enabled}
        onChange={async (checked) => {
          await updateSettingsWithToast({ o_auth_enabled: checked }, t, "system");
        }}
      />
      <SettingCardSelect
        title={t("settings.sso.provider")}
        description={t("settings.sso.provider_description_unimplemented")}
        defaultValue={"Github"}
        OnSave={async (data) => {
          await updateSettingsWithToast({ o_auth_provider: data }, t, "system");
        }}
        options={[
          { value: "github", label: "GitHub"},
          { value: "google", label: "Google"},
        ]}
      />
      <SettingCardShortTextInput
        title={t("settings.sso.client_id")}
        description={t("settings.sso.client_id_description")}
        defaultValue={settings.o_auth_client_id || ""}
        OnSave={async (data) => {
          await updateSettingsWithToast({ o_auth_client_id: data }, t, "system");
        }}
      />
      <SettingCardShortTextInput
        title={t("settings.sso.client_secret")}
        description={t("settings.sso.client_secret_description")}
        defaultValue={settings.o_auth_client_secret || ""}
        OnSave={async (data) => {
          await updateSettingsWithToast({ o_auth_client_secret: data }, t, "system");
        }}
      />
    </>
  );
}

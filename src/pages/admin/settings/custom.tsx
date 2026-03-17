import { useTranslation } from "react-i18next";
import {
  updateSettingsWithToast,
  useSettings,
} from "@/lib/api";
import { SettingCardLongTextInput } from "@/components/admin/SettingCard";
import Loading from "@/components/loading";
import { useAccount } from "@/contexts/AccountContext";
import { PlatformAdminNotice } from "@/components/admin/PlatformAdminNotice";

export default function CustomSettings() {
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
      <SettingCardLongTextInput
        title={t("settings.custom.header")}
        description={t("settings.custom.header_description")}
        defaultValue={settings.custom_head || ""}
        OnSave={async (data) => {
          await updateSettingsWithToast({ custom_head: data }, t, "system");
        }}
      />
      <SettingCardLongTextInput
        title={t("settings.custom.body", "Custom Body")}
        description={t(
          "settings.custom.body_description",
          "Add custom content to the bottom of the page",
        )}
        defaultValue={settings.custom_body || ""}
        OnSave={async (data) => {
          await updateSettingsWithToast({ custom_body: data }, t, "system");
        }}
      />
    </>
  );
}

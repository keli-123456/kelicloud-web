import { useTranslation } from "react-i18next";
import {
  updateSettingsWithToast,
  useSettings,
} from "@/lib/api";
import { SettingCardLongTextInput } from "@/components/admin/SettingCard";
import Loading from "@/components/loading";

export default function CustomSettings() {
  const { t } = useTranslation();
  const { settings, loading, error } = useSettings();

  if (loading) {
    return <Loading />;
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
          await updateSettingsWithToast({ custom_head: data },t);
        }}
      />
    </>
  );
}

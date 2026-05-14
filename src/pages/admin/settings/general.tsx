import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  updateSettingsWithToast,
  useSettings,
} from "@/lib/api";
import {
  AdminSettingsSkeleton,
} from "@/components/admin/AdminPageShell";
import {
  SettingCardButton,
  SettingCardCollapse,
  SettingCardLabel,
  SettingCardSelect,
  SettingCardShortTextInput,
  SettingCardSwitch,
} from "@/components/admin/SettingCard";
import React from "react";
import { toast } from "sonner";
import { useAccount } from "@/contexts/AccountContext";
import { PlatformAdminNotice } from "@/components/admin/PlatformAdminNotice";
import { formatApiErrorMessage } from "@/lib/apiErrorMessage";

const settingsPanelClass =
  "overflow-hidden rounded-lg border border-border bg-card px-4 py-2 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950";

export default function GeneralSettings() {
  const { t } = useTranslation();
  const { platformAdmin, loading: accountLoading } = useAccount();
  const userState = useSettings();
  const systemState = useSettings("system", { enabled: platformAdmin });
  const settings = userState.settings;
  const systemSettings = systemState.settings;
  const loading = userState.loading || (platformAdmin && systemState.loading);
  const error = userState.error || systemState.error;
  const [geoIpQuery, setGeoIpQuery] = React.useState("");
  const [geoip_testResult, setGeoipTestResult] = React.useState<string | null>(
    null
  );
  if (accountLoading || loading) {
    return <AdminSettingsSkeleton sections={5} />;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="grid gap-4">
      <section className={settingsPanelClass}>
        <SettingCardShortTextInput
          title={t("settings.site.script_domain")}
          description={t("settings.site.script_domain_description")}
          placeholder={window.location.origin}
          defaultValue={settings.script_domain || ""}
          OnSave={async (value) => {
            await updateSettingsWithToast({ script_domain: value }, t);
          }}
        />
        <SettingCardShortTextInput
          title={t("settings.site.base_scripts_url", "Agent script source")}
          description={t(
            "settings.site.base_scripts_url_description",
            "Install script source used by one-click commands and auto-connect. Supports a GitHub repo URL, tree/blob URL, or raw URL. Leave empty to use the official repository.",
          )}
          placeholder="https://github.com/your-name/komari-agent"
          defaultValue={settings.base_scripts_url || ""}
          OnSave={async (value) => {
            await updateSettingsWithToast({ base_scripts_url: value }, t);
          }}
        />
      </section>
      {platformAdmin ? (
        <section className={settingsPanelClass}>
          <SettingCardLabel>{t("settings.system_settings_title")}</SettingCardLabel>
          <div className="-mt-1 px-0 pb-1 text-sm text-muted-foreground">
            {t("settings.system_settings_description")}
          </div>
          <SettingCardSwitch
            title={t("settings.site.cros")}
            description={t("settings.site.cros_description")}
            defaultChecked={systemSettings.allow_cors}
            onChange={async (checked) => {
              await updateSettingsWithToast({ allow_cors: checked }, t, "system");
            }}
          />
          <label className="pt-1 text-[12px] font-semibold uppercase tracking-normal text-slate-500">
            {t("settings.geoip.title")}
          </label>
          <SettingCardSwitch
            title={t("settings.geoip.enable_title")}
            description={t("settings.geoip.enable_description")}
            defaultChecked={systemSettings.geo_ip_enabled}
            onChange={async (checked) => {
              await updateSettingsWithToast({ geo_ip_enabled: checked }, t, "system");
            }}
          />
          <SettingCardSelect
            title={t("settings.geoip.provider_title")}
            description={t("settings.geoip.provider_description")}
            defaultValue={systemSettings.geo_ip_provider}
            options={[
              { value: "empty", label: t("common.none") },
              { value: "mmdb", label: "MaxMind" },
              { value: "ip-api", label: "ip-api.com" },
              { value: "geojs", label: "geojs.io" },
              { value: "ipinfo", label: "ipinfo.io" },
            ]}
            OnSave={async (value) => {
              await updateSettingsWithToast({ geo_ip_provider: value }, t, "system");
            }}
          />
          <SettingCardButton
            title={t("settings.geoip.update_title", "更新 GeoIP 数据库")}
            onClick={async () => {
              const result = await fetch("/api/admin/update/mmdb", {
                method: "POST",
              });
              const data = await result.json();
              if (data.status === "success") {
                toast.success(
                  t("settings.geoip.update_success", "GeoIP 数据库更新成功")
                );
              } else {
                toast.error(
                  data.message ? formatApiErrorMessage(data.message, { status: result.status }) :
                    t("settings.geoip.update_error", "更新 GeoIP 数据库失败")
                );
              }
            }}
          >
            {t("common.update", "更新")}
          </SettingCardButton>
          <SettingCardCollapse
            title={t("settings.geoip.test_title")}
            description={t("settings.geoip.test_description")}
          >
            <div className="flex w-full flex-col gap-2">
              <Input
                value={geoIpQuery}
                onChange={(event) => setGeoIpQuery(event.target.value)}
                placeholder={t("settings.geoip.test_placeholder")}
                className="text-sm"
              />
              <div>
                <Button
                  onClick={async () => {
                    const ip = geoIpQuery.trim();
                    if (!ip) {
                      toast.error(t("settings.geoip.test_description"));
                      return;
                    }
                    const result = await fetch(`/api/admin/test/geoip?ip=${ip}`);
                    const data = await result.json();
                    setGeoipTestResult(
                      JSON.stringify(data.data, null, 2) || t("settings.geoip.no_result")
                    );
                  }}
                >
                  {t("settings.geoip.test_button", "测试")}
                </Button>
              </div>
              <div className="w-full">
                {geoip_testResult && (
                  <pre
                    className="max-h-96 w-full overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-sm overscroll-contain [scrollbar-gutter:stable]"
                  >
                    {geoip_testResult}
                  </pre>
                )}
              </div>
            </div>
          </SettingCardCollapse>
        </section>
      ) : (
        <PlatformAdminNotice
          title={t("settings.system_settings_title")}
          description={t("settings.system_settings_restricted_description")}
        />
      )}
    </div>
  );
}

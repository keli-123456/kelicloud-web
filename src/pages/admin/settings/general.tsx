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
import { SettingCardMultiInputCollapse } from "@/components/admin/SettingCardMultiInput";
import { formatBytes } from "@/utils/unitHelper";
import { useAccount } from "@/contexts/AccountContext";
import { PlatformAdminNotice } from "@/components/admin/PlatformAdminNotice";

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
  const [expected_usage, setExpectedUsage] = React.useState<string | null>(
    null
  );
  React.useEffect(() => {
    const pingPreserveTime = parseInt(
      systemSettings.ping_record_preserve_time || "30",
      10
    );
    const recordPreserveTime = parseInt(
      systemSettings.record_preserve_time || "30",
      10
    );
    if (isNaN(pingPreserveTime) || isNaN(recordPreserveTime)) {
      setExpectedUsage("0");
      return;
    } else {
      setExpectedUsage(
        calculateExpectedUsage(pingPreserveTime, recordPreserveTime)
      );
    }
  }, [systemSettings.ping_record_preserve_time, systemSettings.record_preserve_time]);
  if (accountLoading || loading) {
    return <AdminSettingsSkeleton sections={7} />;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <>
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
      {platformAdmin ? (
        <>
          <SettingCardLabel>{t("settings.system_settings_title")}</SettingCardLabel>
          <label className="text-sm text-muted-foreground -mt-4">
            {t("settings.system_settings_description")}
          </label>
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
                  data.message ||
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
                    className="max-h-96 w-full overflow-auto whitespace-pre-wrap rounded-md p-3 text-sm overscroll-contain [scrollbar-gutter:stable]"
                  >
                    {geoip_testResult}
                  </pre>
                )}
              </div>
            </div>
          </SettingCardCollapse>
          <label className="pt-1 text-[12px] font-semibold uppercase tracking-normal text-slate-500">
            {t("settings.record.title")}
          </label>
          <SettingCardSwitch
            title={t("settings.record.enabled")}
            description={t("settings.record.enabled_description")}
            defaultChecked={systemSettings.record_enabled}
            onChange={async (checked) => {
              await updateSettingsWithToast({ record_enabled: checked }, t, "system");
            }}
          />
          <SettingCardMultiInputCollapse
            defaultOpen
            title={t("settings.record.record_preserve_time")}
            description={t("settings.record.record_preserve_time_description")}
            items={[
              {
                tag: "record_preserve_time",
                label: t("settings.record.record_preserve_time_label"),
                type: "short",
                placeholder: "30",
                defaultValue: systemSettings.record_preserve_time || "30",
                number: true,
              },
              {
                tag: "ping_record_preserve_time",
                label: t("settings.record.ping_record_preserve_time"),
                type: "short",
                placeholder: "30",
                defaultValue: systemSettings.ping_record_preserve_time || "30",
                number: true,
              },
            ]}
            onSave={async (values) => {
              const preserveTime = parseInt(values.record_preserve_time, 10);
              const pingPreserveTime = parseInt(
                values.ping_record_preserve_time,
                10
              );
              if (isNaN(preserveTime) || isNaN(pingPreserveTime)) {
                toast.error(t("settings.record.invalid_preserve_time"));
                return;
              }
              await updateSettingsWithToast(
                {
                  record_preserve_time: preserveTime,
                  ping_record_preserve_time: pingPreserveTime,
                },
                t,
                "system"
              );
            }}
            onChange={(values) => {
              const preserveTime = parseInt(values.record_preserve_time, 10);
              const pingPreserveTime = parseInt(
                values.ping_record_preserve_time,
                10
              );
              if (isNaN(preserveTime) || isNaN(pingPreserveTime)) {
                setExpectedUsage("0");
                return;
              }
              setExpectedUsage(
                calculateExpectedUsage(pingPreserveTime, preserveTime)
              );
            }}
          >
            <label className="text-sm text-muted-foreground">
              {t("settings.record.expected_usage", {
                space: expected_usage,
              })}
            </label>
          </SettingCardMultiInputCollapse>
          <SettingCardLabel>{t("settings.nezha.title")}</SettingCardLabel>
          <label className="text-sm text-muted-foreground -mt-4">
            {t("settings.nezha.description")}
          </label>
          <SettingCardSwitch
            title={t("settings.nezha.enabled")}
            description={t("settings.nezha.enabled_description")}
            defaultChecked={systemSettings.nezha_compat_enabled}
            onChange={async (checked) => {
              await updateSettingsWithToast({ nezha_compat_enabled: checked }, t, "system");
            }}
          />
          <SettingCardShortTextInput
            title={t("settings.nezha.listen")}
            description={t("settings.nezha.listen_description")}
            defaultValue={systemSettings.nezha_compat_listen || ""}
            placeholder="0.0.0.0:5555"
            OnSave={async (value) => {
              await updateSettingsWithToast({ nezha_compat_listen: value }, t, "system");
            }}
          />
        </>
      ) : (
        <PlatformAdminNotice
          title={t("settings.system_settings_title")}
          description={t("settings.system_settings_restricted_description")}
        />
      )}
    </>
  );
}

function calculateExpectedUsage(
  pingPreserveTime: number,
  recordPreserveTime: number
): string {
  let totalPingBytes = 0;
  let totalRecordBytes = 0;

  // 1 ping/minute * 60 bytes/ping * 60 minutes/hour = 3600 bytes/hour
  totalPingBytes = pingPreserveTime * 3600;

  if (recordPreserveTime <= 4) {
    // First 4 hours: 1 record/minute * 1024 bytes/record * 60 minutes/hour
    totalRecordBytes = recordPreserveTime * 1 * 1024 * 60;
  } else {
    // Bytes for the first 4 hours
    totalRecordBytes = 4 * 1 * 1024 * 60;
    // Bytes for the remaining time (recordPreserveTime - 4)
    // 4 records/hour * 1024 bytes/record
    totalRecordBytes += (recordPreserveTime - 4) * 4 * 1024;
  }

  return formatBytes(totalPingBytes + totalRecordBytes);
}

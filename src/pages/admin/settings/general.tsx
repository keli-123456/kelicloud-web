import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  updateSettingsWithToast,
  useSettings,
  type SettingsResponse,
} from "@/lib/api";
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
import Loading from "@/components/loading";
import { SettingCardMultiInputCollapse } from "@/components/admin/SettingCardMultiInput";
import { formatBytes } from "@/utils/unitHelper";
import { normalizeCNConnectivityTargets } from "@/lib/cnConnectivityTargets";
import { useAccount } from "@/contexts/AccountContext";
import { PlatformAdminNotice } from "@/components/admin/PlatformAdminNotice";

export default function GeneralSettings() {
  const { t } = useTranslation();
  const { platformAdmin, loading: accountLoading } = useAccount();
  const tenantState = useSettings("tenant");
  const systemState = useSettings("system", { enabled: platformAdmin });
  const settings = tenantState.settings;
  const systemSettings = systemState.settings;
  const loading = tenantState.loading || (platformAdmin && systemState.loading);
  const error = tenantState.error || systemState.error;
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
    return <Loading text="creeper?" />;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <>
      <SettingCardLabel>
        {t("settings.general.auto_discovery")}
      </SettingCardLabel>
      <ApiCard settings={settings} />
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
          <SettingCardLabel>
            {t("settings.general.cn_connectivity")}
          </SettingCardLabel>
          <SettingCardSwitch
            title={t("settings.general.cn_connectivity_enabled")}
            description={t("settings.general.cn_connectivity_enabled_description")}
            defaultChecked={systemSettings.cn_connectivity_enabled}
            onChange={async (checked) => {
              await updateSettingsWithToast({ cn_connectivity_enabled: checked }, t, "system");
            }}
          />
          <SettingCardMultiInputCollapse
            defaultOpen={Boolean(systemSettings.cn_connectivity_enabled)}
            title={t("settings.general.cn_connectivity_config")}
            description={t("settings.general.cn_connectivity_config_description")}
            items={[
              {
                tag: "cn_connectivity_target",
                label: t("settings.general.cn_connectivity_target"),
                type: "long",
                placeholder: "223.5.5.5\n119.29.29.29\ndns.alidns.com",
                defaultValue: normalizeCNConnectivityTargets(
                  systemSettings.cn_connectivity_target || ""
                ),
              },
              {
                tag: "cn_connectivity_interval",
                label: t("settings.general.cn_connectivity_interval"),
                type: "short",
                placeholder: "60",
                defaultValue: String(systemSettings.cn_connectivity_interval || 60),
                number: true,
              },
            ]}
            onSave={async (values) => {
              const interval = parseInt(values.cn_connectivity_interval, 10);
              if (isNaN(interval) || interval <= 0) {
                toast.error(t("settings.general.cn_connectivity_interval_invalid"));
                return;
              }

              const normalizedTargets = normalizeCNConnectivityTargets(
                values.cn_connectivity_target
              );

              await updateSettingsWithToast(
                {
                  cn_connectivity_target: normalizedTargets,
                  cn_connectivity_interval: interval,
                },
                t,
                "system"
              );
            }}
          >
            <p className="text-[12px] leading-5 text-muted-foreground">
              {t("settings.general.cn_connectivity_target_help")}
            </p>
          </SettingCardMultiInputCollapse>
          <label className="pt-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">
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
                placeholder="1.1.1.1 or 2606:4700:4700::1111"
                className="text-[13px]"
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
                      JSON.stringify(data.data, null, 2) || "无结果"
                    );
                  }}
                >
                  {t("settings.geoip.test_button", "测试")}
                </Button>
              </div>
              <div className="w-full">
                {geoip_testResult && (
                  <pre
                    className="w-full whitespace-pre-wrap text-sm p-3 rounded-md overflow-auto max-h-96"
                  >
                    {geoip_testResult}
                  </pre>
                )}
              </div>
            </div>
          </SettingCardCollapse>
          <label className="pt-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">
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

const ApiCard = ({ settings }: { settings: SettingsResponse }) => {
  //const { settings } = useSettings();
  const { t } = useTranslation();
  const [apiValues, setApiValues] = React.useState<string>(
    settings?.auto_discovery_key || ""
  );

  // 生成32位随机字符串
  const generateRandomString = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // 处理生成按钮点击
  const handleGenerateApiKey = () => {
    const newApiKey = generateRandomString();
    setApiValues(newApiKey);
  };

  // 初始化API值
  React.useEffect(() => {
    if (settings?.auto_discovery_key) {
      setApiValues(settings.auto_discovery_key);
    }
  }, [settings?.auto_discovery_key]);

  return (
    <SettingCardShortTextInput
      title={t("settings.general.auto_discovery_key")}
      description={t("settings.general.auto_discovery_key_description")}
      value={apiValues}
      onChange={(e) => setApiValues(e.target.value)}
      OnSave={async (values) => {
        if (!values) {
          await updateSettingsWithToast({ auto_discovery_key: "" }, t, "tenant");
          return;
        }
        if (values.length < 12) {
          toast.error(t("settings.api.key_length_error"));
          return;
        }
        await updateSettingsWithToast({ auto_discovery_key: values }, t, "tenant");
      }}
    >
      <div className="flex flex-row gap-2 justify-start items-center">
        <Button
          variant="outline"
          className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          onClick={handleGenerateApiKey}
        >
          {t("common.generate")}
        </Button>
        <Button
          variant="outline"
          className="border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
          onClick={() => {
            window.open(
              "https://komari-document.pages.dev/install/agent-ad.html",
              "_blank"
            );
          }}
        >
          {t("common.help")}
        </Button>
      </div>
    </SettingCardShortTextInput>
  );
};

import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Checkbox,
} from "@/components/ui/checkbox";
import { SettingCard } from "@/components/admin/SettingCard";
import {
  Badge,
  Button,
  Dialog,
  Flex,
  TextArea,
  TextField,
  cloudDialogContentClassName,
} from "@/components/admin/cloud/cloud-shared";
import {
  type SettingsResponse,
  updateSettingsWithToast,
} from "@/lib/api";
import { normalizeCNConnectivityTargets } from "@/lib/cnConnectivityTargets";

const NODE_DIALOG_CONTENT_CLASS =
  `${cloudDialogContentClassName} max-h-[100dvh] rounded-none border-0 p-4 sm:max-h-[90vh] sm:rounded-2xl sm:border sm:p-5`;
const NODE_DIALOG_SECTION_CLASS = "space-y-4 border-b border-border/60 pb-4 last:border-b-0";
const NODE_DIALOG_FOOTER_CLASS =
  "mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end";
const NODE_INPUT_CLASS =
  "h-11";
const NODE_TEXTAREA_CLASS =
  "min-h-32 text-sm leading-6";

const Text = ({
  className,
  ...props
}: React.ComponentProps<"span">) => <span className={className} {...props} />;

const normalizeDailyCleanupTime = (value: string) => {
  const trimmed = String(value || "").trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "";

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return "";
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const generateRandomAutoDiscoveryKey = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let index = 0; index < 24; index += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function NodeAccessSettingsDialog({
  open,
  settings,
  platformAdmin,
  canManageCNConnectivity,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  settings: SettingsResponse;
  platformAdmin: boolean;
  canManageCNConnectivity: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<SettingsResponse>;
}) {
  const { t } = useTranslation();
  const [autoDiscoveryKey, setAutoDiscoveryKey] = React.useState(
    String(settings?.auto_discovery_key || ""),
  );
  const [cnConnectivityEnabled, setCnConnectivityEnabled] = React.useState(
    Boolean(settings?.cn_connectivity_enabled),
  );
  const [cnConnectivityTarget, setCnConnectivityTarget] = React.useState(
    normalizeCNConnectivityTargets(String(settings?.cn_connectivity_target || "")),
  );
  const [cnConnectivityInterval, setCnConnectivityInterval] =
    React.useState(String(settings?.cn_connectivity_interval || 60));
  const [cnConnectivityRetryAttempts, setCnConnectivityRetryAttempts] =
    React.useState(String(settings?.cn_connectivity_retry_attempts || 3));
  const [cnConnectivityRetryDelaySeconds, setCnConnectivityRetryDelaySeconds] =
    React.useState(String(settings?.cn_connectivity_retry_delay_seconds || 1));
  const [cnConnectivityTimeoutSeconds, setCnConnectivityTimeoutSeconds] =
    React.useState(String(settings?.cn_connectivity_timeout_seconds || 5));
  const [offlineCleanupEnabled, setOfflineCleanupEnabled] = React.useState(
    Boolean(settings?.offline_cleanup_enabled),
  );
  const [offlineCleanupTime, setOfflineCleanupTime] = React.useState(
    normalizeDailyCleanupTime(String(settings?.offline_cleanup_time || "03:00")) ||
      "03:00",
  );
  const [offlineCleanupGraceHours, setOfflineCleanupGraceHours] = React.useState(
    String(settings?.offline_cleanup_grace_hours || 24),
  );
  const [settingsSaving, setSettingsSaving] = React.useState(false);

  const resetForm = React.useCallback(() => {
    setAutoDiscoveryKey(String(settings?.auto_discovery_key || ""));
    setCnConnectivityEnabled(Boolean(settings?.cn_connectivity_enabled));
    setCnConnectivityTarget(
      normalizeCNConnectivityTargets(String(settings?.cn_connectivity_target || "")),
    );
    setCnConnectivityInterval(String(settings?.cn_connectivity_interval || 60));
    setCnConnectivityRetryAttempts(
      String(settings?.cn_connectivity_retry_attempts || 3),
    );
    setCnConnectivityRetryDelaySeconds(
      String(settings?.cn_connectivity_retry_delay_seconds || 1),
    );
    setCnConnectivityTimeoutSeconds(
      String(settings?.cn_connectivity_timeout_seconds || 5),
    );
    setOfflineCleanupEnabled(Boolean(settings?.offline_cleanup_enabled));
    setOfflineCleanupTime(
      normalizeDailyCleanupTime(String(settings?.offline_cleanup_time || "03:00")) ||
        "03:00",
    );
    setOfflineCleanupGraceHours(String(settings?.offline_cleanup_grace_hours || 24));
  }, [
    settings?.auto_discovery_key,
    settings?.cn_connectivity_enabled,
    settings?.cn_connectivity_interval,
    settings?.cn_connectivity_retry_attempts,
    settings?.cn_connectivity_retry_delay_seconds,
    settings?.cn_connectivity_target,
    settings?.cn_connectivity_timeout_seconds,
    settings?.offline_cleanup_enabled,
    settings?.offline_cleanup_time,
    settings?.offline_cleanup_grace_hours,
  ]);

  React.useEffect(() => {
    if (!open) {
      return;
    }
    resetForm();
  }, [open, resetForm]);

  const handleSaveSettings = async () => {
    if (autoDiscoveryKey && autoDiscoveryKey.length < 12) {
      toast.error(t("settings.api.key_length_error"));
      return;
    }

    const payload: Record<string, string | number | boolean> = {
      auto_discovery_key: autoDiscoveryKey,
    };

    if (canManageCNConnectivity) {
      const interval = parseInt(cnConnectivityInterval, 10);
      if (Number.isNaN(interval) || interval <= 0) {
        toast.error(t("settings.general.cn_connectivity_interval_invalid"));
        return;
      }
      const retryAttempts = parseInt(cnConnectivityRetryAttempts, 10);
      if (Number.isNaN(retryAttempts) || retryAttempts <= 0) {
        toast.error(t("settings.general.cn_connectivity_retry_attempts_invalid"));
        return;
      }
      const retryDelaySeconds = parseInt(cnConnectivityRetryDelaySeconds, 10);
      if (Number.isNaN(retryDelaySeconds) || retryDelaySeconds <= 0) {
        toast.error(t("settings.general.cn_connectivity_retry_delay_seconds_invalid"));
        return;
      }
      const timeoutSeconds = parseInt(cnConnectivityTimeoutSeconds, 10);
      if (Number.isNaN(timeoutSeconds) || timeoutSeconds <= 0) {
        toast.error(t("settings.general.cn_connectivity_timeout_seconds_invalid"));
        return;
      }

      payload.cn_connectivity_enabled = cnConnectivityEnabled;
      payload.cn_connectivity_target = normalizeCNConnectivityTargets(
        cnConnectivityTarget,
      );
      payload.cn_connectivity_interval = interval;
      payload.cn_connectivity_retry_attempts = retryAttempts;
      payload.cn_connectivity_retry_delay_seconds = retryDelaySeconds;
      payload.cn_connectivity_timeout_seconds = timeoutSeconds;
    }

    if (platformAdmin) {
      const normalizedCleanupTime = normalizeDailyCleanupTime(offlineCleanupTime);
      if (!normalizedCleanupTime) {
        toast.error(
          t("settings.general.offline_cleanup_time_invalid", "Please use HH:MM"),
        );
        return;
      }
      const parsedGraceHours = parseInt(offlineCleanupGraceHours, 10);
      if (Number.isNaN(parsedGraceHours) || parsedGraceHours <= 0) {
        toast.error(
          t(
            "settings.general.offline_cleanup_grace_hours_invalid",
            "Grace period must be greater than 0",
          ),
        );
        return;
      }

      payload.offline_cleanup_enabled = offlineCleanupEnabled;
      payload.offline_cleanup_time = normalizedCleanupTime;
      payload.offline_cleanup_grace_hours = parsedGraceHours;
    }

    setSettingsSaving(true);
    try {
      await updateSettingsWithToast(payload, t);
      await onSaved();
      onOpenChange(false);
    } finally {
      setSettingsSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        className={NODE_DIALOG_CONTENT_CLASS}
        maxWidth={640}
      >
        <Dialog.Title>
          {t("admin.nodeTable.accessSettingsTitle")}
        </Dialog.Title>
        <Dialog.Description className="mt-2">
          {t("admin.nodeTable.accessSettingsDescription")}
        </Dialog.Description>
        <div className="mt-4 space-y-4">
          <div className={NODE_DIALOG_SECTION_CLASS}>
            <div className="space-y-1">
              <div className="section-kicker">
                {t("settings.general.auto_discovery")}
              </div>
              <Text className="text-sm text-muted-foreground">
                {t("settings.general.auto_discovery_key_description")}
              </Text>
            </div>
            <div className="mt-4 space-y-4">
              <TextField.Root
                className={NODE_INPUT_CLASS}
                value={autoDiscoveryKey}
                onChange={(event) =>
                  setAutoDiscoveryKey(event.target.value)
                }
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() =>
                    setAutoDiscoveryKey(generateRandomAutoDiscoveryKey())
                  }
                >
                  {t("common.generate")}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    window.open(
                      "https://komari-document.pages.dev/install/agent-ad.html",
                      "_blank",
                    );
                  }}
                >
                  {t("common.help")}
                </Button>
              </div>
            </div>
          </div>

          {canManageCNConnectivity ? (
            <div className={NODE_DIALOG_SECTION_CLASS}>
              <div className="space-y-2">
                <Flex justify="between" align="center" gap="2" wrap="wrap">
                  <div className="section-kicker">
                    {t("settings.general.cn_connectivity")}
                  </div>
                  <Badge
                    semantic={cnConnectivityEnabled ? "success" : "disabled"}
                  >
                    {cnConnectivityEnabled
                      ? t("common.enabled")
                      : t("common.disabled")}
                  </Badge>
                </Flex>
                <Text className="text-sm text-muted-foreground">
                  {t("admin.nodeTable.cnConnectivityManageHint")}
                </Text>
              </div>
              <div className="mt-4 space-y-4">
                <SettingCard
                  title={t("settings.general.cn_connectivity_enabled")}
                  description={t(
                    "settings.general.cn_connectivity_enabled_description",
                  )}
                  bordless
                >
                  <SettingCard.Action>
                    <Checkbox
                      checked={cnConnectivityEnabled}
                      onCheckedChange={(checked) =>
                        setCnConnectivityEnabled(Boolean(checked))
                      }
                    />
                  </SettingCard.Action>
                </SettingCard>
                <div className="space-y-2">
                  <label className="text-sm font-semibold break-keep text-foreground">
                    {t("settings.general.cn_connectivity_target")}
                  </label>
                  <TextArea
                    className={NODE_TEXTAREA_CLASS}
                    placeholder={"223.5.5.5\n119.29.29.29\ndns.alidns.com"}
                    value={cnConnectivityTarget}
                    onChange={(event) =>
                      setCnConnectivityTarget(event.target.value)
                    }
                  />
                  <Text className="text-xs text-muted-foreground">
                    {t("settings.general.cn_connectivity_target_help")}
                  </Text>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold break-keep text-foreground">
                    {t("settings.general.cn_connectivity_interval")}
                  </label>
                  <TextField.Root
                    className={NODE_INPUT_CLASS}
                    type="number"
                    min={1}
                    value={cnConnectivityInterval}
                    onChange={(event) =>
                      setCnConnectivityInterval(event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold break-keep text-foreground">
                    {t("settings.general.cn_connectivity_retry_attempts")}
                  </label>
                  <TextField.Root
                    className={NODE_INPUT_CLASS}
                    type="number"
                    min={1}
                    step={1}
                    value={cnConnectivityRetryAttempts}
                    onChange={(event) =>
                      setCnConnectivityRetryAttempts(event.target.value)
                    }
                  />
                  <Text className="text-xs text-muted-foreground">
                    {t("settings.general.cn_connectivity_retry_attempts_description")}
                  </Text>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold break-keep text-foreground">
                    {t("settings.general.cn_connectivity_timeout_seconds")}
                  </label>
                  <TextField.Root
                    className={NODE_INPUT_CLASS}
                    type="number"
                    min={1}
                    step={1}
                    value={cnConnectivityTimeoutSeconds}
                    onChange={(event) =>
                      setCnConnectivityTimeoutSeconds(event.target.value)
                    }
                  />
                  <Text className="text-xs text-muted-foreground">
                    {t("settings.general.cn_connectivity_timeout_seconds_description")}
                  </Text>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold break-keep text-foreground">
                    {t("settings.general.cn_connectivity_retry_delay_seconds")}
                  </label>
                  <TextField.Root
                    className={NODE_INPUT_CLASS}
                    type="number"
                    min={1}
                    step={1}
                    value={cnConnectivityRetryDelaySeconds}
                    onChange={(event) =>
                      setCnConnectivityRetryDelaySeconds(event.target.value)
                    }
                  />
                  <Text className="text-xs text-muted-foreground">
                    {t("settings.general.cn_connectivity_retry_delay_seconds_description")}
                  </Text>
                </div>
              </div>
            </div>
          ) : null}

          {platformAdmin ? (
            <div className={NODE_DIALOG_SECTION_CLASS}>
              <div className="space-y-2">
                <Flex justify="between" align="center" gap="2" wrap="wrap">
                  <div className="section-kicker">
                    {t("settings.general.offline_cleanup")}
                  </div>
                  <Badge
                    semantic={offlineCleanupEnabled ? "success" : "disabled"}
                  >
                    {offlineCleanupEnabled
                      ? t("common.enabled")
                      : t("common.disabled")}
                  </Badge>
                </Flex>
                <Text className="text-sm text-muted-foreground">
                  {t("admin.nodeTable.offlineCleanupManageHint")}
                </Text>
              </div>
              <div className="mt-4 space-y-4">
                <SettingCard
                  title={t("settings.general.offline_cleanup_enabled")}
                  description={t(
                    "settings.general.offline_cleanup_enabled_description",
                  )}
                  bordless
                >
                  <SettingCard.Action>
                    <Checkbox
                      checked={offlineCleanupEnabled}
                      onCheckedChange={(checked) =>
                        setOfflineCleanupEnabled(Boolean(checked))
                      }
                    />
                  </SettingCard.Action>
                </SettingCard>
                <div className="space-y-2">
                  <label className="text-sm font-semibold break-keep text-foreground">
                    {t("settings.general.offline_cleanup_time")}
                  </label>
                  <TextField.Root
                    className={NODE_INPUT_CLASS}
                    type="time"
                    step={60}
                    value={offlineCleanupTime}
                    onChange={(event) =>
                      setOfflineCleanupTime(event.target.value)
                    }
                  />
                  <Text className="text-xs text-muted-foreground">
                    {t("settings.general.offline_cleanup_time_description")}
                  </Text>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold break-keep text-foreground">
                    {t("settings.general.offline_cleanup_grace_hours")}
                  </label>
                  <TextField.Root
                    className={NODE_INPUT_CLASS}
                    type="number"
                    min={1}
                    step={1}
                    value={offlineCleanupGraceHours}
                    onChange={(event) =>
                      setOfflineCleanupGraceHours(event.target.value)
                    }
                  />
                  <Text className="text-xs text-muted-foreground">
                    {t("settings.general.offline_cleanup_grace_hours_description")}
                  </Text>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <div className={NODE_DIALOG_FOOTER_CLASS}>
          <Dialog.Close>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
            >
              {t("common.cancel")}
            </Button>
          </Dialog.Close>
          <Button
            className="w-full sm:w-auto"
            onClick={() => void handleSaveSettings()}
            disabled={settingsSaving}
          >
            {t("save")}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

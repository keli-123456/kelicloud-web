import type { TFunction } from "i18next";

import {
  cloudPanelBodyTextClassName,
  cloudPanelFieldLabelClassName,
  Select,
  TextField,
} from "@/components/admin/cloud/cloud-ui";
import { WarningAlert } from "@/components/ui/warning-alert";
import type { AWSRootPasswordMode } from "./awsPanelCatalog";

type AWSRootAccessFieldsProps = {
  t: TFunction;
  mode: AWSRootPasswordMode;
  password: string;
  onModeChange: (mode: AWSRootPasswordMode) => void;
  onPasswordChange: (password: string) => void;
};

export function AWSRootAccessFields({
  t,
  mode,
  password,
  onModeChange,
  onPasswordChange,
}: AWSRootAccessFieldsProps) {
  return (
    <>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.form.root_access", "Root Access")}
          </label>
          <Select.Root
            value={mode}
            onValueChange={(value) => onModeChange(value as AWSRootPasswordMode)}
          >
            <Select.Trigger placeholder={t("cloud.form.root_access_placeholder", "Select access mode")} />
            <Select.Content>
              <Select.Item value="none">
                {t("cloud.form.root_access_modes.none", "SSH key only")}
              </Select.Item>
              <Select.Item value="random">
                {t("cloud.form.root_access_modes.random", "Random root password")}
              </Select.Item>
              <Select.Item value="custom">
                {t("cloud.form.root_access_modes.custom", "Custom root password")}
              </Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
        <div>
          {mode === "custom" ? (
            <>
              <label className={cloudPanelFieldLabelClassName}>
                {t("cloud.form.root_password", "Root Password")}
              </label>
              <TextField.Root
                type="password"
                value={password}
                placeholder={t("cloud.form.root_password_placeholder", "Enter a root password")}
                onChange={(event) => onPasswordChange(event.target.value)}
              />
            </>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              {mode === "random"
                ? t(
                    "cloud.form.root_password_random_help",
                    "A random root password will be generated on the server and shown once after creation succeeds.",
                  )
                : t(
                    "cloud.providers.aws.root_access_none_help",
                    "Use the selected key pair or image defaults only. kelicloud will not inject a root password.",
                  )}
            </div>
          )}
        </div>
      </div>

      {mode !== "none" ? (
        <>
          <WarningAlert
            tone="info"
            description={t(
              "cloud.providers.aws.root_access_help",
              "kelicloud will append a startup script to set the root password and enable password login on supported Linux images.",
            )}
          />
          <div className={`text-xs ${cloudPanelBodyTextClassName}`}>
            {t(
              "cloud.form.user_data_password_help",
              "When root password mode is enabled, this field is appended as shell commands. #cloud-config is not supported in this mode.",
            )}
          </div>
        </>
      ) : null}
    </>
  );
}

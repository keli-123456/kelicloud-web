import type { Dispatch, SetStateAction } from "react";
import type { TFunction } from "i18next";

import { AWSBootstrapFields } from "@/components/admin/cloud/AWSBootstrapFields";
import { CompactDetailSection } from "@/components/admin/cloud/AWSPanelDetailComponents";
import { AWSRegionSelect } from "@/components/admin/cloud/AWSRegionSelect";
import { AWSRootAccessFields } from "@/components/admin/cloud/AWSRootAccessFields";
import {
  Checkbox,
  cloudPanelBodyTextClassName,
  cloudPanelFieldLabelClassName,
  Select,
  TextField,
} from "@/components/admin/cloud/cloud-ui";
import { WarningAlert } from "@/components/ui/warning-alert";
import { cn } from "@/lib/utils";
import {
  STATIC_LIGHTSAIL_BLUEPRINT_PRESETS,
  STATIC_LIGHTSAIL_BUNDLE_PRESETS,
  getDefaultLightsailAvailabilityZone,
  getLightsailBundleForBlueprintSelection,
  getStaticLightsailBlueprintPresetLabel,
  getStaticLightsailBundlePresetLabel,
  type AWSRegionOption,
  type StaticLightsailBlueprintPreset,
  type StaticLightsailBundlePreset,
} from "./awsPanelCatalog";
import type { LightsailCreateFormState } from "./awsPanelState";

type LightsailCreateSectionProps = {
  t: TFunction;
  form: LightsailCreateFormState;
  setForm: Dispatch<SetStateAction<LightsailCreateFormState>>;
};

type LightsailCreateCoreSectionProps = LightsailCreateSectionProps & {
  summary: string;
  resolvedRegion: string;
  regionOptions: AWSRegionOption[];
  regionSearchPlaceholder: string;
  regionSearchEmpty: string;
  onRegionChange: (region: string) => void;
  selectedBlueprintPreset: StaticLightsailBlueprintPreset | null;
  selectedBundlePreset: StaticLightsailBundlePreset | null;
  platformMismatch: boolean;
  singleColumn?: boolean;
};

export function LightsailCreateCoreSection({
  t,
  form,
  setForm,
  summary,
  resolvedRegion,
  regionOptions,
  regionSearchPlaceholder,
  regionSearchEmpty,
  onRegionChange,
  selectedBlueprintPreset,
  selectedBundlePreset,
  platformMismatch,
  singleColumn = false,
}: LightsailCreateCoreSectionProps) {
  return (
    <CompactDetailSection
      title={t("cloud.providers.aws.create_core", "Core")}
      summary={summary || "-"}
      defaultOpen
      hideSummary
    >
      <div className={cn("grid gap-4", !singleColumn && "sm:grid-cols-2")}>
        <div>
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.providers.aws.region", "Region")}
          </label>
          <AWSRegionSelect
            value={resolvedRegion || undefined}
            options={regionOptions}
            placeholder={t("cloud.providers.aws.region", "Region")}
            searchPlaceholder={regionSearchPlaceholder}
            emptyLabel={regionSearchEmpty}
            onValueChange={(value) => {
              void onRegionChange(value);
            }}
          />
          <div className={`mt-2 text-xs ${cloudPanelBodyTextClassName}`}>
            {t(
              "cloud.providers.aws.lightsail_create_region_hint",
              "Switching region only updates this dialog. The default availability zone is regenerated as region + a, and the built-in presets stay available without loading any catalog.",
            )}
          </div>
        </div>
        <div>
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.providers.aws.az", "AZ")}
          </label>
          <TextField.Root
            value={form.availability_zone}
            placeholder={t("cloud.providers.aws.lightsail_az_manual_placeholder", "Availability zone, for example us-east-1a")}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, availability_zone: event.target.value }))
            }
          />
          <div className={`mt-2 text-xs ${cloudPanelBodyTextClassName}`}>
            {t("cloud.providers.aws.lightsail_static_rules_help", {
              az: getDefaultLightsailAvailabilityZone(resolvedRegion),
              defaultValue: "Lightsail requires an availability zone such as us-east-1a. kelicloud defaults this field to {{az}}, but you can replace it manually if your account prefers another zone.",
            })}
          </div>
        </div>
      </div>

      <div className={cn("mt-4 grid gap-4", !singleColumn && "sm:grid-cols-2")}>
        <div>
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.form.image", "Image")}
          </label>
          <Select.Root
            value={selectedBlueprintPreset?.value}
            onValueChange={(value) => {
              const nextBlueprint = STATIC_LIGHTSAIL_BLUEPRINT_PRESETS.find((preset) => preset.value === value);
              if (!nextBlueprint) {
                return;
              }
              setForm((previous) => ({
                ...previous,
                blueprint_id: nextBlueprint.value,
                bundle_id: getLightsailBundleForBlueprintSelection(nextBlueprint, previous.bundle_id),
              }));
            }}
          >
            <Select.Trigger placeholder={t("cloud.form.image_placeholder", "Select an image")} />
            <Select.Content>
              {STATIC_LIGHTSAIL_BLUEPRINT_PRESETS.map((preset) => (
                <Select.Item key={preset.value} value={preset.value}>
                  {getStaticLightsailBlueprintPresetLabel(preset)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
        <div>
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.form.size", "Size")}
          </label>
          <Select.Root
            value={selectedBundlePreset?.value}
            onValueChange={(value) => {
              setForm((previous) => ({ ...previous, bundle_id: value }));
            }}
          >
            <Select.Trigger placeholder={t("cloud.form.size_placeholder", "Select a size")} />
            <Select.Content>
              {STATIC_LIGHTSAIL_BUNDLE_PRESETS.map((preset) => (
                <Select.Item key={preset.value} value={preset.value}>
                  {getStaticLightsailBundlePresetLabel(preset)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      {platformMismatch ? (
        <WarningAlert
          tone="warning"
          description={t(
            "cloud.providers.aws.lightsail_platform_mismatch",
            "The selected Lightsail blueprint and bundle look incompatible. Linux blueprints should use Linux bundles, and Windows blueprints should use Windows bundles.",
          )}
        />
      ) : null}
    </CompactDetailSection>
  );
}

type LightsailCreateAccessSectionProps = LightsailCreateSectionProps & {
  summary: string;
};

export function LightsailCreateAccessSection({
  t,
  form,
  setForm,
  summary,
}: LightsailCreateAccessSectionProps) {
  return (
    <CompactDetailSection
      title={t("cloud.providers.aws.create_access", "Access")}
      summary={summary || "-"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.providers.aws.key_pair", "Key Pair")}
          </label>
          <TextField.Root
            value={form.key_pair_name || ""}
            placeholder={t("cloud.providers.aws.key_pair_manual_placeholder", "可选密钥对名称")}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, key_pair_name: event.target.value }))
            }
          />
        </div>
        <div>
          <label className={`mb-2 flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
            <Checkbox
              checked={form.ip_address_type !== "ipv4"}
              onCheckedChange={(checked) =>
                setForm((previous) => ({
                  ...previous,
                  ip_address_type: checked === true
                    ? previous.ip_address_type && previous.ip_address_type !== "ipv4"
                      ? previous.ip_address_type
                      : "dualstack"
                    : "ipv4",
                }))
              }
            />
            {t("cloud.providers.aws.enable_ipv6", "Enable IPv6")}
          </label>
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.providers.aws.ip_address_type", "IP Address Type")}
          </label>
          <Select.Root
            value={form.ip_address_type || "dualstack"}
            onValueChange={(value) =>
              setForm((previous) => ({ ...previous, ip_address_type: value }))
            }
          >
            <Select.Trigger placeholder={t("cloud.providers.aws.ip_address_type", "IP Address Type")} />
            <Select.Content>
              <Select.Item value="dualstack">dualstack</Select.Item>
              <Select.Item value="ipv4">ipv4</Select.Item>
              <Select.Item value="ipv6">ipv6</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      <label className={`mt-4 flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
        <Checkbox
          checked={form.allow_all_traffic}
          onCheckedChange={(checked) =>
            setForm((previous) => ({ ...previous, allow_all_traffic: Boolean(checked) }))
          }
        />
        {t("cloud.providers.aws.allow_all_traffic_on_create", "After launch, allow all IPv4 and IPv6 traffic")}
      </label>
    </CompactDetailSection>
  );
}

type LightsailCreateBootstrapSectionProps = LightsailCreateSectionProps & {
  summary: string;
};

export function LightsailCreateBootstrapSection({
  t,
  form,
  setForm,
  summary,
}: LightsailCreateBootstrapSectionProps) {
  return (
    <CompactDetailSection
      title={t("cloud.providers.aws.create_bootstrap", "Bootstrap")}
      summary={summary || "-"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.form.name", "Name")}
          </label>
          <TextField.Root
            value={form.name}
            placeholder={t("cloud.providers.aws.auto_name", "Auto name")}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, name: event.target.value }))
            }
          />
        </div>
        <div>
          <label className={`mb-2 flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
            <Checkbox
              checked={form.auto_connect}
              onCheckedChange={(checked) =>
                setForm((previous) => ({ ...previous, auto_connect: Boolean(checked) }))
              }
            />
            {t("cloud.providers.aws.auto_connect_toggle", "创建后自动接入平台")}
          </label>
          {form.auto_connect ? (
            <>
              <label className={cloudPanelFieldLabelClassName}>
                {t("cloud.form.auto_connect_group", "Auto-connect group")}
              </label>
              <TextField.Root
                value={form.auto_connect_group || ""}
                placeholder={t("cloud.form.auto_connect_group_placeholder", "Generated from the active credential by default")}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, auto_connect_group: event.target.value }))
                }
              />
            </>
          ) : null}
        </div>
      </div>

      <AWSRootAccessFields
        t={t}
        mode={form.root_password_mode || "none"}
        password={form.root_password || ""}
        onModeChange={(mode) =>
          setForm((previous) => ({
            ...previous,
            root_password_mode: mode,
            root_password:
              mode === "custom"
                ? previous.root_password
                : "",
          }))
        }
        onPasswordChange={(password) =>
          setForm((previous) => ({ ...previous, root_password: password }))
        }
      />

      <AWSBootstrapFields
        t={t}
        tagsText={form.tagsText}
        userData={form.user_data || ""}
        onTagsTextChange={(tagsText) =>
          setForm((previous) => ({ ...previous, tagsText }))
        }
        onUserDataChange={(userData) =>
          setForm((previous) => ({ ...previous, user_data: userData }))
        }
      />
    </CompactDetailSection>
  );
}

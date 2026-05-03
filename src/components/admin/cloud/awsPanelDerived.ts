import type { TFunction } from "i18next";

import type { AWSFollowUpTask } from "@/lib/cloudAws";
import {
  STATIC_EC2_IMAGE_PRESETS,
  STATIC_EC2_INSTANCE_TYPE_PRESETS,
  STATIC_LIGHTSAIL_BLUEPRINT_PRESETS,
  STATIC_LIGHTSAIL_BUNDLE_PRESETS,
  inferEC2ImageArchitecture,
  inferEC2InstanceArchitecture,
  inferLightsailBlueprintPlatform,
  inferLightsailBundlePlatform,
  type AWSRegionOption,
} from "./awsPanelCatalog";
import {
  getRootPasswordModeLabel,
  joinSummaryParts,
} from "./awsPanelSummaries";
import type {
  CreateFormState,
  LightsailCreateFormState,
} from "./awsPanelState";
import { parseTags } from "./awsPanelUtils";

type BackgroundTaskFilters = {
  credentialId: string;
  region: string;
  status: string;
  allValue: string;
};

type RegionSource = {
  name: string;
  label?: string;
  country?: string;
  endpoint?: string;
};

type BuildRegionOptionsInput = {
  staticRegions: ReadonlyArray<RegionSource>;
  activeCredentialRegion?: string;
  activeRegion?: string;
  accountRegion?: string;
  catalogRegions?: ReadonlyArray<RegionSource>;
};

export function getAWSBackgroundTaskCounts(tasks: AWSFollowUpTask[]) {
  let pending = 0;
  let failed = 0;
  let cancelled = 0;
  let skipped = 0;

  for (const task of tasks) {
    switch (task.status) {
      case "pending":
        pending += 1;
        break;
      case "failed":
        failed += 1;
        break;
      case "cancelled":
        cancelled += 1;
        break;
      case "skipped":
        skipped += 1;
        break;
      default:
        break;
    }
  }

  return {
    pending,
    failed,
    cancelled,
    skipped,
    terminal: failed + cancelled + skipped,
  };
}

export function getAWSBackgroundTaskCredentialOptions(
  tasks: AWSFollowUpTask[],
  t: TFunction,
) {
  return Array.from(
    tasks.reduce((map, task) => {
      const label =
        task.credential_name && task.credential_name !== task.credential_id
          ? task.credential_name
          : t("cloud.providers.aws.deleted_credential", "Deleted Credential");
      map.set(task.credential_id, label);
      return map;
    }, new Map<string, string>()),
  );
}

export function getAWSBackgroundTaskRegionOptions(tasks: AWSFollowUpTask[]) {
  return Array.from(new Set(tasks.map((task) => task.region).filter(Boolean))).sort();
}

export function filterAWSBackgroundTasks(
  tasks: AWSFollowUpTask[],
  filters: BackgroundTaskFilters,
) {
  return tasks.filter((task) => {
    if (filters.credentialId !== filters.allValue && task.credential_id !== filters.credentialId) {
      return false;
    }
    if (filters.region !== filters.allValue && task.region !== filters.region) {
      return false;
    }
    if (filters.status !== filters.allValue && task.status !== filters.status) {
      return false;
    }
    return true;
  });
}

export function buildAWSRegionOptions({
  staticRegions,
  activeCredentialRegion,
  activeRegion,
  accountRegion,
  catalogRegions,
}: BuildRegionOptionsInput): AWSRegionOption[] {
  const entries = new Map<string, AWSRegionOption>();

  const addRegion = (name?: string, label?: string, country?: string, endpoint?: string) => {
    const normalizedName = name?.trim();
    if (!normalizedName) return;
    entries.set(normalizedName, {
      name: normalizedName,
      label: label?.trim() || entries.get(normalizedName)?.label || normalizedName,
      country: country || entries.get(normalizedName)?.country || "",
      endpoint: endpoint || entries.get(normalizedName)?.endpoint || "",
    });
  };

  staticRegions.forEach((region) => addRegion(region.name, region.label, region.country, region.endpoint));
  addRegion(activeCredentialRegion);
  addRegion(activeRegion);
  addRegion(accountRegion);
  catalogRegions?.forEach((region) =>
    addRegion(region.name, entries.get(region.name)?.label, entries.get(region.name)?.country, region.endpoint),
  );

  return Array.from(entries.values());
}

export function getAWSEC2CreateDerived(
  form: CreateFormState,
  t: TFunction,
) {
  const selectedImagePreset = STATIC_EC2_IMAGE_PRESETS.find((preset) => preset.value === form.image_id) || null;
  const selectedInstanceTypePreset =
    STATIC_EC2_INSTANCE_TYPE_PRESETS.find((preset) => preset.value === form.instance_type) || null;
  const selectedImageArchitecture = selectedImagePreset?.architecture || inferEC2ImageArchitecture(form.image_id);
  const selectedInstanceArchitecture =
    selectedInstanceTypePreset?.architecture || inferEC2InstanceArchitecture(form.instance_type);
  const architectureMismatch = Boolean(
    selectedImageArchitecture
    && selectedInstanceArchitecture
    && selectedImageArchitecture !== selectedInstanceArchitecture,
  );
  const coreSummary = joinSummaryParts([
    selectedImagePreset ? selectedImagePreset.label : form.image_id,
    selectedInstanceTypePreset ? selectedInstanceTypePreset.label : form.instance_type,
    selectedImageArchitecture ? selectedImageArchitecture.toUpperCase() : "",
  ]);
  const networkSummary = joinSummaryParts([
    form.key_name || t("cloud.providers.aws.none", "None"),
    form.security_group_ids.length > 0
      ? `${form.security_group_ids.length} ${t("cloud.providers.aws.security_groups", "Security Groups")}`
      : t("cloud.providers.aws.none", "None"),
    form.assign_public_ip
      ? t("cloud.providers.aws.public_ipv4", "Public IPv4")
      : t("cloud.providers.aws.private_only", "Private only"),
    form.assign_ipv6
      ? t("cloud.providers.aws.ipv6_enabled", "IPv6")
      : t("cloud.providers.aws.ipv6_disabled", "IPv4 only"),
    form.allow_all_traffic
      ? t("cloud.providers.aws.allow_all_traffic", "Allow All Traffic")
      : t("cloud.providers.aws.restricted_traffic", "Restricted traffic"),
  ]);
  const bootstrapSummary = joinSummaryParts([
    form.name || t("cloud.providers.aws.auto_name", "Auto name"),
    form.root_password_mode !== "none"
      ? getRootPasswordModeLabel(form.root_password_mode || "none", t)
      : "",
    `${parseTags(form.tagsText).length} ${t("cloud.form.tags", "Tags")}`,
    form.user_data.trim() ? t("cloud.form.user_data", "Cloud-Init / User Data") : "",
  ]);

  return {
    selectedImagePreset,
    selectedInstanceTypePreset,
    selectedImageArchitecture,
    selectedInstanceArchitecture,
    architectureMismatch,
    coreSummary,
    networkSummary,
    bootstrapSummary,
  };
}

export function getAWSLightsailCreateDerived(
  form: LightsailCreateFormState,
  resolvedRegion: string,
  t: TFunction,
) {
  const selectedBlueprintPreset =
    STATIC_LIGHTSAIL_BLUEPRINT_PRESETS.find((preset) => preset.value === form.blueprint_id) || null;
  const selectedBundlePreset =
    STATIC_LIGHTSAIL_BUNDLE_PRESETS.find((preset) => preset.value === form.bundle_id) || null;
  const selectedBlueprintPlatform =
    selectedBlueprintPreset?.platform || inferLightsailBlueprintPlatform(form.blueprint_id);
  const selectedBundlePlatform =
    selectedBundlePreset?.platform || inferLightsailBundlePlatform(form.bundle_id);
  const platformMismatch = Boolean(
    selectedBlueprintPlatform
    && selectedBundlePlatform
    && selectedBlueprintPlatform !== selectedBundlePlatform,
  );
  const coreSummary = joinSummaryParts([
    form.availability_zone || resolvedRegion,
    selectedBlueprintPreset ? selectedBlueprintPreset.label : form.blueprint_id,
    selectedBundlePreset ? selectedBundlePreset.label : form.bundle_id,
  ]);
  const accessSummary = joinSummaryParts([
    form.key_pair_name || t("cloud.providers.aws.none", "None"),
    form.ip_address_type || "dualstack",
    form.allow_all_traffic
      ? t("cloud.providers.aws.allow_all_traffic", "Allow All Traffic")
      : t("cloud.providers.aws.restricted_traffic", "Restricted traffic"),
  ]);
  const bootstrapSummary = joinSummaryParts([
    form.name || t("cloud.providers.aws.auto_name", "Auto name"),
    form.root_password_mode !== "none"
      ? getRootPasswordModeLabel(form.root_password_mode || "none", t)
      : "",
    `${parseTags(form.tagsText).length} ${t("cloud.form.tags", "Tags")}`,
    (form.user_data || "").trim() ? t("cloud.form.user_data", "Cloud-Init / User Data") : "",
  ]);

  return {
    selectedBlueprintPreset,
    selectedBundlePreset,
    selectedBlueprintPlatform,
    selectedBundlePlatform,
    platformMismatch,
    coreSummary,
    accessSummary,
    bootstrapSummary,
  };
}

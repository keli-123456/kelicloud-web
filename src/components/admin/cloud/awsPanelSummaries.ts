import type { ReactNode } from "react";
import type { TFunction } from "i18next";

import type {
  AWSElasticAddress,
  AWSEC2Quota,
  AWSInstance,
  AWSLightsailStaticIP,
  AWSVolume,
} from "@/lib/cloudAws";
import { getCloudStatusLabel } from "@/lib/cloudStatus";
import {
  AWS_REGION_OPTIONS,
  type AWSRootPasswordMode,
} from "./awsPanelCatalog";

export function getFollowUpTaskLabel(taskType: string, t: TFunction) {
  switch (taskType) {
    case "ec2_assign_ipv6":
      return t("cloud.providers.aws.follow_up_task.ec2_assign_ipv6", "Assign EC2 IPv6");
    case "ec2_allow_all_traffic":
      return t("cloud.providers.aws.follow_up_task.ec2_allow_all_traffic", "Allow EC2 all traffic");
    case "lightsail_allow_all_ports":
      return t("cloud.providers.aws.follow_up_task.lightsail_allow_all_ports", "Allow Lightsail all ports");
    default:
      return taskType || "-";
  }
}

function getAWSRegionMeta(regionName: string) {
  return AWS_REGION_OPTIONS.find((region) => region.name === regionName) || null;
}

export function getAWSCountryLabel(regionName: string, t: TFunction) {
  const regionMeta = getAWSRegionMeta(regionName);
  if (!regionMeta) {
    return "-";
  }
  return t(`cloud.providers.aws.countries.${regionMeta.country}`, regionMeta.label);
}

export function getCompactQuotaSummary(
  quota: AWSEC2Quota | null | undefined,
  t: TFunction,
) {
  if (!quota) {
    return "-";
  }
  if (quota.max_standard_vcpus > 0 || quota.running_standard_vcpus > 0) {
    const used = `${quota.running_standard_vcpus}v`;
    const limit = quota.max_standard_vcpus > 0 ? `${quota.max_standard_vcpus}v` : "?";
    return t("cloud.providers.aws.quota_compact_vcpu", {
      used,
      limit,
      defaultValue: `${used}/${limit}`,
    });
  }
  const instances = quota.max_instances > 0
    ? `${quota.running_instances}/${quota.max_instances}`
    : String(quota.running_instances);
  return t("cloud.providers.aws.quota_compact_instances", {
    instances,
    defaultValue: `EC2 ${instances}`,
  });
}

export function formatAWSQuotaErrorMessage(
  error: string | null | undefined,
  t: TFunction,
) {
  const normalized = String(error || "").trim();
  if (!normalized) {
    return "";
  }

  const lower = normalized.toLowerCase();
  if (
    lower.includes("context deadline exceeded")
    || lower.includes("request timed out")
  ) {
    return t(
      "cloud.providers.aws.quota_warning_timeout",
      "Reading EC2 quota details for the active region timed out. The panel will continue working, but quota data may be incomplete.",
    );
  }

  return normalized;
}

export function getRootPasswordModeLabel(
  mode: AWSRootPasswordMode | "custom" | "random",
  t: TFunction,
) {
  return t(`cloud.form.root_access_modes.${mode}`, mode);
}

export function getEC2QuotaItems(
  quota: AWSEC2Quota | null | undefined,
  t: TFunction,
) {
  if (!quota) return [];

  return [
    {
      key: "running_standard_vcpus",
      label: t("cloud.providers.aws.standard_vcpus", "Standard vCPU"),
      value:
        quota.max_standard_vcpus > 0
          ? `${quota.running_standard_vcpus}v / ${quota.max_standard_vcpus}v`
          : quota.running_standard_vcpus > 0
            ? `${quota.running_standard_vcpus}v`
            : "0",
    },
    {
      key: "instance_standard_vcpus",
      label: t("cloud.providers.aws.instance_standard_vcpus", "Instance vCPU"),
      value: quota.instance_standard_vcpus > 0 ? `${quota.instance_standard_vcpus}v` : "0",
    },
    {
      key: "reserved_standard_vcpus",
      label: t("cloud.providers.aws.reserved_standard_vcpus", "Reserved vCPU"),
      value: quota.reserved_standard_vcpus > 0 ? `${quota.reserved_standard_vcpus}v` : "0",
    },
    {
      key: "running_instances",
      label: t("cloud.providers.aws.running_instances", "Running / Limit"),
      value: quota.max_instances > 0
        ? `${quota.running_instances} / ${quota.max_instances}`
        : String(quota.running_instances),
    },
    {
      key: "total_instances",
      label: t("cloud.providers.aws.total_instances", "Tracked instances"),
      value: String(quota.total_instances),
    },
    {
      key: "vpc_max_security_groups_per_interface",
      label: t("cloud.providers.aws.max_security_groups_per_interface", "SGs / ENI"),
      value: String(quota.vpc_max_security_groups_per_interface),
    },
  ].filter((item) => item.value !== "0");
}

export function getEntryCountSummary(count: number, t: TFunction) {
  return t("cloud.providers.aws.entry_summary", {
    count,
    defaultValue: `${count} entries`,
  });
}

export function getVolumeSummary(volumes: AWSVolume[], t: TFunction) {
  const totalSize = volumes.reduce((sum, volume) => sum + volume.size_gib, 0);
  return t("cloud.providers.aws.volume_summary", {
    count: volumes.length,
    size: totalSize,
    defaultValue: `${volumes.length} volumes · ${totalSize} GiB`,
  });
}

export function getStaticIPSummary(
  staticIPs: AWSLightsailStaticIP[],
  attachedTo: string,
  t: TFunction,
) {
  const attached = staticIPs.filter((staticIP) => staticIP.attached_to === attachedTo).length;
  const free = staticIPs.filter((staticIP) => !staticIP.is_attached).length;
  return t("cloud.providers.aws.static_ip_summary", {
    attached,
    free,
    defaultValue: `${attached} attached · ${free} free`,
  });
}

export function getConsoleOutputSummary(output: string, t: TFunction) {
  const lines = output
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0).length;
  return t("cloud.providers.aws.console_output_summary", {
    count: lines,
    defaultValue: `${lines} lines`,
  });
}

export function getInstanceControlsSummary(
  instanceType: string,
  monitoringState: string,
  t: TFunction,
) {
  return t("cloud.providers.aws.instance_controls_summary", {
    type: instanceType || "-",
    monitoring: getCloudStatusLabel(monitoringState, t),
    defaultValue: `${instanceType || "-"} · ${getCloudStatusLabel(monitoringState, t)}`,
  });
}

export function getMachineImageSummary(imageName: string, t: TFunction) {
  return t("cloud.providers.aws.machine_image_summary", {
    name: imageName || "-",
    defaultValue: imageName || "-",
  });
}

export function joinSummaryParts(
  parts: Array<ReactNode | null | undefined | false>,
) {
  const normalized = parts
    .map((part) => {
      if (part === null || part === undefined || part === false) return "";
      if (typeof part === "string" || typeof part === "number") return String(part).trim();
      return "";
    })
    .filter(Boolean);
  return normalized.join(" · ");
}

export function formatTagMap(tags: Record<string, string>) {
  const entries = Object.entries(tags || {});
  if (!entries.length) return "";
  return entries.map(([key, value]) => `${key}=${value}`).join("\n");
}

export function formatElasticAddress(address: AWSElasticAddress) {
  const parts = [address.public_ip, address.allocation_id].filter(Boolean);
  return parts.join(" / ") || "-";
}

export function formatAddressList(values: string[]) {
  const normalized = values.map((value) => value.trim()).filter(Boolean);
  return normalized.length ? normalized.join(", ") : "-";
}

export function getEC2PrimaryAddress(instance: AWSInstance) {
  return instance.public_ip || instance.ipv6_addresses[0] || instance.private_ip || "";
}

export function getCreateFollowUpWarningMessage(
  t: TFunction,
  warning: string,
) {
  return t("cloud.providers.aws.post_create_warning", {
    message: warning,
    defaultValue: `The resource was created. kelicloud is still processing a post-create step in the background: ${warning}`,
  });
}

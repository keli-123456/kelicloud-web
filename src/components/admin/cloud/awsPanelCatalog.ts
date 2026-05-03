export type AWSRootPasswordMode = "none" | "custom" | "random";

export type AWSRegionOption = {
  name: string;
  label: string;
  country?: string;
  endpoint?: string;
};

export type StaticEC2InstanceTypePreset = {
  value: string;
  label: string;
  summary: string;
  architecture: "x86_64" | "arm64";
};

export type StaticEC2ImagePreset = {
  value: string;
  label: string;
  summary: string;
  architecture: "x86_64" | "arm64";
};

export type StaticLightsailBlueprintPreset = {
  value: string;
  label: string;
  summary: string;
  platform: "linux" | "windows";
};

export type StaticLightsailBundlePreset = {
  value: string;
  label: string;
  summary: string;
  platform: "linux" | "windows";
};

export const SELECT_NONE = "__none__";
export const BACKGROUND_TASK_FILTER_ALL = "__all__";
export const AWS_BACKGROUND_TASK_POLL_INTERVAL = 15_000;

export const AWS_REGION_OPTIONS = [
  { name: "us-east-2", label: "US East (Ohio)", country: "us" },
  { name: "us-east-1", label: "US East (N. Virginia)", country: "us" },
  { name: "us-west-1", label: "US West (N. California)", country: "us" },
  { name: "us-west-2", label: "US West (Oregon)", country: "us" },
  { name: "af-south-1", label: "Africa (Cape Town)", country: "za" },
  { name: "ap-east-1", label: "Asia Pacific (Hong Kong)", country: "hk" },
  { name: "ap-south-2", label: "Asia Pacific (Hyderabad)", country: "in" },
  { name: "ap-southeast-3", label: "Asia Pacific (Jakarta)", country: "id" },
  { name: "ap-southeast-5", label: "Asia Pacific (Malaysia)", country: "my" },
  { name: "ap-southeast-4", label: "Asia Pacific (Melbourne)", country: "au" },
  { name: "ap-south-1", label: "Asia Pacific (Mumbai)", country: "in" },
  { name: "ap-southeast-6", label: "Asia Pacific (New Zealand)", country: "nz" },
  { name: "ap-northeast-3", label: "Asia Pacific (Osaka)", country: "jp" },
  { name: "ap-northeast-2", label: "Asia Pacific (Seoul)", country: "kr" },
  { name: "ap-southeast-1", label: "Asia Pacific (Singapore)", country: "sg" },
  { name: "ap-southeast-2", label: "Asia Pacific (Sydney)", country: "au" },
  { name: "ap-east-2", label: "Asia Pacific (Taipei)", country: "tw" },
  { name: "ap-southeast-7", label: "Asia Pacific (Thailand)", country: "th" },
  { name: "ap-northeast-1", label: "Asia Pacific (Tokyo)", country: "jp" },
  { name: "ca-central-1", label: "Canada (Central)", country: "ca" },
  { name: "ca-west-1", label: "Canada West (Calgary)", country: "ca" },
  { name: "cn-north-1", label: "China (Beijing)", country: "cn" },
  { name: "cn-northwest-1", label: "China (Ningxia)", country: "cn" },
  { name: "eu-central-1", label: "Europe (Frankfurt)", country: "de" },
  { name: "eu-west-1", label: "Europe (Ireland)", country: "ie" },
  { name: "eu-west-2", label: "Europe (London)", country: "gb" },
  { name: "eu-south-1", label: "Europe (Milan)", country: "it" },
  { name: "eu-west-3", label: "Europe (Paris)", country: "fr" },
  { name: "eu-south-2", label: "Europe (Spain)", country: "es" },
  { name: "eu-north-1", label: "Europe (Stockholm)", country: "se" },
  { name: "eu-central-2", label: "Europe (Zurich)", country: "ch" },
  { name: "il-central-1", label: "Israel (Tel Aviv)", country: "il" },
  { name: "mx-central-1", label: "Mexico (Central)", country: "mx" },
  { name: "me-south-1", label: "Middle East (Bahrain)", country: "bh" },
  { name: "me-central-1", label: "Middle East (UAE)", country: "ae" },
  { name: "sa-east-1", label: "South America (Sao Paulo)", country: "br" },
  { name: "us-gov-east-1", label: "AWS GovCloud (US-East)", country: "gov" },
  { name: "us-gov-west-1", label: "AWS GovCloud (US-West)", country: "gov" },
] as const;

export const STATIC_EC2_INSTANCE_TYPE_PRESETS: StaticEC2InstanceTypePreset[] = [
  {
    value: "t3.micro",
    label: "t3.micro",
    summary: "Burstable x86 general purpose",
    architecture: "x86_64",
  },
  {
    value: "t3.small",
    label: "t3.small",
    summary: "Burstable x86 general purpose",
    architecture: "x86_64",
  },
  {
    value: "t3.medium",
    label: "t3.medium",
    summary: "Burstable x86 general purpose",
    architecture: "x86_64",
  },
  {
    value: "m7i.large",
    label: "m7i.large",
    summary: "Balanced x86 general purpose",
    architecture: "x86_64",
  },
  {
    value: "c7i.large",
    label: "c7i.large",
    summary: "x86 compute optimized",
    architecture: "x86_64",
  },
  {
    value: "r7i.large",
    label: "r7i.large",
    summary: "x86 memory optimized",
    architecture: "x86_64",
  },
  {
    value: "t4g.micro",
    label: "t4g.micro",
    summary: "Burstable Graviton (ARM64)",
    architecture: "arm64",
  },
  {
    value: "t4g.small",
    label: "t4g.small",
    summary: "Burstable Graviton (ARM64)",
    architecture: "arm64",
  },
  {
    value: "t4g.medium",
    label: "t4g.medium",
    summary: "Burstable Graviton (ARM64)",
    architecture: "arm64",
  },
  {
    value: "m7g.large",
    label: "m7g.large",
    summary: "Balanced Graviton (ARM64)",
    architecture: "arm64",
  },
  {
    value: "c7g.large",
    label: "c7g.large",
    summary: "Graviton compute optimized",
    architecture: "arm64",
  },
  {
    value: "r7g.large",
    label: "r7g.large",
    summary: "Graviton memory optimized",
    architecture: "arm64",
  },
];

export const STATIC_EC2_IMAGE_PRESETS: StaticEC2ImagePreset[] = [
  {
    value: "resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64",
    label: "Amazon Linux 2023",
    summary: "AWS public parameter, x86_64, default kernel",
    architecture: "x86_64",
  },
  {
    value: "resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-minimal-kernel-default-x86_64",
    label: "Amazon Linux 2023 Minimal",
    summary: "AWS public parameter, x86_64, minimal image",
    architecture: "x86_64",
  },
  {
    value: "resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64",
    label: "Amazon Linux 2023 ARM64",
    summary: "AWS public parameter, arm64, Graviton-ready",
    architecture: "arm64",
  },
  {
    value: "resolve:ssm:/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2",
    label: "Amazon Linux 2",
    summary: "AWS public parameter, x86_64, legacy-compatible",
    architecture: "x86_64",
  },
  {
    value: "resolve:ssm:/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-arm64-gp2",
    label: "Amazon Linux 2 ARM64",
    summary: "AWS public parameter, arm64, legacy-compatible",
    architecture: "arm64",
  },
  {
    value: "resolve:ssm:/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id",
    label: "Ubuntu Server 24.04 LTS",
    summary: "Canonical public parameter, amd64, gp3",
    architecture: "x86_64",
  },
  {
    value: "resolve:ssm:/aws/service/canonical/ubuntu/server/24.04/stable/current/arm64/hvm/ebs-gp3/ami-id",
    label: "Ubuntu Server 24.04 LTS ARM64",
    summary: "Canonical public parameter, arm64, gp3",
    architecture: "arm64",
  },
  {
    value: "resolve:ssm:/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id",
    label: "Ubuntu Server 22.04 LTS",
    summary: "Canonical public parameter, amd64, gp2",
    architecture: "x86_64",
  },
  {
    value: "resolve:ssm:/aws/service/canonical/ubuntu/server/22.04/stable/current/arm64/hvm/ebs-gp2/ami-id",
    label: "Ubuntu Server 22.04 LTS ARM64",
    summary: "Canonical public parameter, arm64, gp2",
    architecture: "arm64",
  },
  {
    value: "komari:debian-13-amd64",
    label: "Debian 13",
    summary: "Official Debian public AMI, latest amd64",
    architecture: "x86_64",
  },
  {
    value: "komari:debian-13-arm64",
    label: "Debian 13 ARM64",
    summary: "Official Debian public AMI, latest arm64",
    architecture: "arm64",
  },
  {
    value: "komari:debian-12-amd64",
    label: "Debian 12",
    summary: "Official Debian public AMI, latest amd64",
    architecture: "x86_64",
  },
  {
    value: "komari:debian-12-arm64",
    label: "Debian 12 ARM64",
    summary: "Official Debian public AMI, latest arm64",
    architecture: "arm64",
  },
  {
    value: "resolve:ssm:/aws/service/ami-windows-latest/Windows_Server-2022-English-Full-Base",
    label: "Windows Server 2022",
    summary: "AWS public parameter, x86_64, English Full Base",
    architecture: "x86_64",
  },
];

export const DEFAULT_STATIC_EC2_INSTANCE_TYPE =
  STATIC_EC2_INSTANCE_TYPE_PRESETS[0]?.value || "t3.micro";
export const DEFAULT_STATIC_EC2_IMAGE_ID =
  STATIC_EC2_IMAGE_PRESETS[0]?.value ||
  "resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64";

export const STATIC_LIGHTSAIL_BLUEPRINT_PRESETS: StaticLightsailBlueprintPreset[] = [
  {
    value: "amazon_linux_2023",
    label: "Amazon Linux 2023",
    summary: "OS only, Linux",
    platform: "linux",
  },
  {
    value: "ubuntu_24_04",
    label: "Ubuntu 24.04 LTS",
    summary: "OS only, Linux",
    platform: "linux",
  },
  {
    value: "ubuntu_22_04",
    label: "Ubuntu 22.04 LTS",
    summary: "OS only, Linux",
    platform: "linux",
  },
  {
    value: "ubuntu_20_04",
    label: "Ubuntu 20.04 LTS",
    summary: "OS only, Linux",
    platform: "linux",
  },
  {
    value: "debian_12",
    label: "Debian 12",
    summary: "OS only, Linux",
    platform: "linux",
  },
  {
    value: "debian_11",
    label: "Debian 11",
    summary: "OS only, Linux",
    platform: "linux",
  },
  {
    value: "wordpress",
    label: "WordPress",
    summary: "Bitnami app image, Linux",
    platform: "linux",
  },
  {
    value: "windows_server_2022",
    label: "Windows Server 2022",
    summary: "OS only, Windows",
    platform: "windows",
  },
];

export const STATIC_LIGHTSAIL_BUNDLE_PRESETS: StaticLightsailBundlePreset[] = [
  {
    value: "nano_3_0",
    label: "Nano",
    summary: "$5/mo, 0.5 GB RAM, 20 GB SSD",
    platform: "linux",
  },
  {
    value: "micro_3_0",
    label: "Micro",
    summary: "$7/mo, 1 GB RAM, 40 GB SSD",
    platform: "linux",
  },
  {
    value: "small_3_0",
    label: "Small",
    summary: "$12/mo, 2 GB RAM, 60 GB SSD",
    platform: "linux",
  },
  {
    value: "medium_3_0",
    label: "Medium",
    summary: "$24/mo, 4 GB RAM, 80 GB SSD",
    platform: "linux",
  },
  {
    value: "large_3_0",
    label: "Large",
    summary: "$44/mo, 8 GB RAM, 160 GB SSD",
    platform: "linux",
  },
  {
    value: "large_win_3_0",
    label: "Large Windows",
    summary: "Windows plan example from AWS docs",
    platform: "windows",
  },
];

export const DEFAULT_STATIC_LIGHTSAIL_BLUEPRINT_ID =
  STATIC_LIGHTSAIL_BLUEPRINT_PRESETS[0]?.value || "amazon_linux_2023";
export const DEFAULT_STATIC_LIGHTSAIL_BUNDLE_ID =
  STATIC_LIGHTSAIL_BUNDLE_PRESETS.find((preset) => preset.platform === "linux")
    ?.value || "nano_3_0";
export const DEFAULT_STATIC_LIGHTSAIL_WINDOWS_BUNDLE_ID =
  STATIC_LIGHTSAIL_BUNDLE_PRESETS.find((preset) => preset.platform === "windows")
    ?.value || "large_win_3_0";

export function getAWSRegionOptionLabel(region: { label?: string; name: string }) {
  return region.label ? `${region.label} (${region.name})` : region.name;
}

export function getStaticEC2ImagePresetLabel(preset: StaticEC2ImagePreset) {
  return `${preset.label} (${preset.summary})`;
}

export function getStaticEC2InstanceTypePresetLabel(
  preset: StaticEC2InstanceTypePreset,
) {
  return `${preset.label} (${preset.summary})`;
}

export function getStaticLightsailBlueprintPresetLabel(
  preset: StaticLightsailBlueprintPreset,
) {
  return `${preset.label} (${preset.summary})`;
}

export function getStaticLightsailBundlePresetLabel(
  preset: StaticLightsailBundlePreset,
) {
  return `${preset.label} (${preset.summary})`;
}

export function getDefaultLightsailAvailabilityZone(region: string) {
  const normalized = region.trim();
  if (!normalized) return "";
  return `${normalized}a`;
}

export function getDefaultLightsailBundleForPlatform(
  platform: "linux" | "windows" | "",
) {
  if (platform === "windows") {
    return DEFAULT_STATIC_LIGHTSAIL_WINDOWS_BUNDLE_ID;
  }
  return DEFAULT_STATIC_LIGHTSAIL_BUNDLE_ID;
}

export function inferLightsailBlueprintPlatform(
  blueprintId: string,
): "linux" | "windows" | "" {
  const normalized = blueprintId.trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("windows") || normalized.includes("sqlserver")) {
    return "windows";
  }
  return STATIC_LIGHTSAIL_BLUEPRINT_PRESETS.some(
    (preset) => preset.value === normalized,
  )
    ? STATIC_LIGHTSAIL_BLUEPRINT_PRESETS.find(
        (preset) => preset.value === normalized,
      )?.platform || ""
    : "";
}

export function inferLightsailBundlePlatform(
  bundleId: string,
): "linux" | "windows" | "" {
  const normalized = bundleId.trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("_win_")) {
    return "windows";
  }
  return STATIC_LIGHTSAIL_BUNDLE_PRESETS.some(
    (preset) => preset.value === normalized,
  )
    ? STATIC_LIGHTSAIL_BUNDLE_PRESETS.find(
        (preset) => preset.value === normalized,
      )?.platform || ""
    : "";
}

export function getLightsailBundleForBlueprintSelection(
  blueprint: StaticLightsailBlueprintPreset,
  currentBundleId: string,
) {
  const currentBundlePlatform =
    STATIC_LIGHTSAIL_BUNDLE_PRESETS.find((preset) => preset.value === currentBundleId)?.platform
    || inferLightsailBundlePlatform(currentBundleId);
  const defaultBundle = getDefaultLightsailBundleForPlatform(blueprint.platform);

  return currentBundlePlatform && currentBundlePlatform !== blueprint.platform
    ? defaultBundle
    : currentBundleId || defaultBundle;
}

export function inferEC2InstanceArchitecture(
  instanceType: string,
): "x86_64" | "arm64" | "" {
  const normalized = instanceType.trim().toLowerCase();
  if (!normalized) return "";
  if (
    /^(a1|t4g|m6g|m7g|m6gd|m7gd|c6g|c7g|c6gd|c7gd|r6g|r7g|r6gd|r7gd|x2gd)\./.test(
      normalized,
    )
  ) {
    return "arm64";
  }
  return "";
}

export function inferEC2ImageArchitecture(
  imageId: string,
): "x86_64" | "arm64" | "" {
  const normalized = imageId.trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("arm64")) {
    return "arm64";
  }
  if (normalized.includes("x86_64") || normalized.includes("windows")) {
    return "x86_64";
  }
  return "";
}

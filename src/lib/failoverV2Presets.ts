export type BuiltinPlanOption = {
  value: string;
  label: string;
  hint?: string;
  zh?: string;
  platform?: "linux" | "windows";
};

export const COMMON_AWS_REGIONS: BuiltinPlanOption[] = [
  { value: "us-east-2", label: "US East (Ohio)", zh: "\u7f8e\u56fd\u4e1c\u90e8\uff08\u4fc4\u4ea5\u4fc4\uff09" },
  { value: "us-east-1", label: "US East (N. Virginia)", zh: "\u7f8e\u56fd\u4e1c\u90e8\uff08\u5f17\u5409\u5c3c\u4e9a\u5317\u90e8\uff09" },
  { value: "us-west-1", label: "US West (N. California)", zh: "\u7f8e\u56fd\u897f\u90e8\uff08\u5317\u52a0\u5229\u798f\u5c3c\u4e9a\uff09" },
  { value: "us-west-2", label: "US West (Oregon)", zh: "\u7f8e\u56fd\u897f\u90e8\uff08\u4fc4\u52d2\u5188\uff09" },
  { value: "af-south-1", label: "Africa (Cape Town)", zh: "\u975e\u6d32\uff08\u5f00\u666e\u6566\uff09" },
  { value: "ap-east-1", label: "Asia Pacific (Hong Kong)", zh: "\u4e9a\u592a\uff08\u9999\u6e2f\uff09" },
  { value: "ap-south-2", label: "Asia Pacific (Hyderabad)", zh: "\u4e9a\u592a\uff08\u6d77\u5f97\u62c9\u5df4\uff09" },
  { value: "ap-southeast-3", label: "Asia Pacific (Jakarta)", zh: "\u4e9a\u592a\uff08\u96c5\u52a0\u8fbe\uff09" },
  { value: "ap-southeast-5", label: "Asia Pacific (Malaysia)", zh: "\u4e9a\u592a\uff08\u9a6c\u6765\u897f\u4e9a\uff09" },
  { value: "ap-southeast-4", label: "Asia Pacific (Melbourne)", zh: "\u4e9a\u592a\uff08\u58a8\u5c14\u672c\uff09" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai)", zh: "\u4e9a\u592a\uff08\u5b5f\u4e70\uff09" },
  { value: "ap-southeast-6", label: "Asia Pacific (New Zealand)", zh: "\u4e9a\u592a\uff08\u65b0\u897f\u5170\uff09" },
  { value: "ap-northeast-3", label: "Asia Pacific (Osaka)", zh: "\u4e9a\u592a\uff08\u5927\u962a\uff09" },
  { value: "ap-northeast-2", label: "Asia Pacific (Seoul)", zh: "\u4e9a\u592a\uff08\u9996\u5c14\uff09" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)", zh: "\u4e9a\u592a\uff08\u65b0\u52a0\u5761\uff09" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)", zh: "\u4e9a\u592a\uff08\u6089\u5c3c\uff09" },
  { value: "ap-east-2", label: "Asia Pacific (Taipei)", zh: "\u4e9a\u592a\uff08\u53f0\u5317\uff09" },
  { value: "ap-southeast-7", label: "Asia Pacific (Thailand)", zh: "\u4e9a\u592a\uff08\u6cf0\u56fd\uff09" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)", zh: "\u4e9a\u592a\uff08\u4e1c\u4eac\uff09" },
  { value: "ca-central-1", label: "Canada (Central)", zh: "\u52a0\u62ff\u5927\uff08\u4e2d\u90e8\uff09" },
  { value: "ca-west-1", label: "Canada West (Calgary)", zh: "\u52a0\u62ff\u5927\u897f\u90e8\uff08\u5361\u5c14\u52a0\u91cc\uff09" },
  { value: "cn-north-1", label: "China (Beijing)", zh: "\u4e2d\u56fd\uff08\u5317\u4eac\uff09" },
  { value: "cn-northwest-1", label: "China (Ningxia)", zh: "\u4e2d\u56fd\uff08\u5b81\u590f\uff09" },
  { value: "eu-central-1", label: "Europe (Frankfurt)", zh: "\u6b27\u6d32\uff08\u6cd5\u5170\u514b\u798f\uff09" },
  { value: "eu-west-1", label: "Europe (Ireland)", zh: "\u6b27\u6d32\uff08\u7231\u5c14\u5170\uff09" },
  { value: "eu-west-2", label: "Europe (London)", zh: "\u6b27\u6d32\uff08\u4f26\u6566\uff09" },
  { value: "eu-south-1", label: "Europe (Milan)", zh: "\u6b27\u6d32\uff08\u7c73\u5170\uff09" },
  { value: "eu-west-3", label: "Europe (Paris)", zh: "\u6b27\u6d32\uff08\u5df4\u9ece\uff09" },
  { value: "eu-south-2", label: "Europe (Spain)", zh: "\u6b27\u6d32\uff08\u897f\u73ed\u7259\uff09" },
  { value: "eu-north-1", label: "Europe (Stockholm)", zh: "\u6b27\u6d32\uff08\u65af\u5fb7\u54e5\u5c14\u6469\uff09" },
  { value: "eu-central-2", label: "Europe (Zurich)", zh: "\u6b27\u6d32\uff08\u82cf\u9ece\u4e16\uff09" },
  { value: "il-central-1", label: "Israel (Tel Aviv)", zh: "\u4ee5\u8272\u5217\uff08\u7279\u62c9\u7ef4\u592b\uff09" },
  { value: "mx-central-1", label: "Mexico (Central)", zh: "\u58a8\u897f\u54e5\uff08\u4e2d\u90e8\uff09" },
  { value: "me-south-1", label: "Middle East (Bahrain)", zh: "\u4e2d\u4e1c\uff08\u5df4\u6797\uff09" },
  { value: "me-central-1", label: "Middle East (UAE)", zh: "\u4e2d\u4e1c\uff08\u963f\u8054\u914b\uff09" },
  { value: "sa-east-1", label: "South America (Sao Paulo)", zh: "\u5357\u7f8e\u6d32\uff08\u5723\u4fdd\u7f57\uff09" },
  { value: "us-gov-east-1", label: "AWS GovCloud (US-East)", zh: "AWS GovCloud\uff08\u7f8e\u56fd\u4e1c\u90e8\uff09" },
  { value: "us-gov-west-1", label: "AWS GovCloud (US-West)", zh: "AWS GovCloud\uff08\u7f8e\u56fd\u897f\u90e8\uff09" },
];

export const STATIC_EC2_INSTANCE_TYPE_PRESETS: BuiltinPlanOption[] = [
  { value: "t3.micro", label: "t3.micro", hint: "Burstable x86 general purpose" },
  { value: "t3.small", label: "t3.small", hint: "Burstable x86 general purpose" },
  { value: "t3.medium", label: "t3.medium", hint: "Burstable x86 general purpose" },
  { value: "m8i.large", label: "m8i.large", hint: "Latest x86 general purpose" },
  { value: "c8i.large", label: "c8i.large", hint: "Latest x86 compute optimized" },
  { value: "r8i.large", label: "r8i.large", hint: "Latest x86 memory optimized" },
  { value: "m7i.large", label: "m7i.large", hint: "Balanced x86 general purpose" },
  { value: "c7i.large", label: "c7i.large", hint: "x86 compute optimized" },
  { value: "r7i.large", label: "r7i.large", hint: "x86 memory optimized" },
  { value: "t4g.micro", label: "t4g.micro", hint: "Burstable Graviton (ARM64)" },
  { value: "t4g.small", label: "t4g.small", hint: "Burstable Graviton (ARM64)" },
  { value: "t4g.medium", label: "t4g.medium", hint: "Burstable Graviton (ARM64)" },
  { value: "m8g.large", label: "m8g.large", hint: "Latest Graviton general purpose" },
  { value: "c8g.large", label: "c8g.large", hint: "Latest Graviton compute optimized" },
  { value: "r8g.large", label: "r8g.large", hint: "Latest Graviton memory optimized" },
  { value: "m7g.large", label: "m7g.large", hint: "Balanced Graviton (ARM64)" },
  { value: "c7g.large", label: "c7g.large", hint: "Graviton compute optimized" },
  { value: "r7g.large", label: "r7g.large", hint: "Graviton memory optimized" },
];

export const STATIC_EC2_IMAGE_PRESETS: BuiltinPlanOption[] = [
  {
    value: "resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64",
    label: "Amazon Linux 2023",
    hint: "AWS public parameter, x86_64, default kernel",
  },
  {
    value: "resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-minimal-kernel-default-x86_64",
    label: "Amazon Linux 2023 Minimal",
    hint: "AWS public parameter, x86_64, minimal image",
  },
  {
    value: "resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64",
    label: "Amazon Linux 2023 ARM64",
    hint: "AWS public parameter, arm64, Graviton-ready",
  },
  {
    value: "resolve:ssm:/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2",
    label: "Amazon Linux 2",
    hint: "AWS public parameter, x86_64, legacy-compatible",
  },
  {
    value: "resolve:ssm:/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-arm64-gp2",
    label: "Amazon Linux 2 ARM64",
    hint: "AWS public parameter, arm64, legacy-compatible",
  },
  {
    value: "resolve:ssm:/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id",
    label: "Ubuntu Server 24.04 LTS",
    hint: "Canonical public parameter, amd64, gp3",
  },
  {
    value: "resolve:ssm:/aws/service/canonical/ubuntu/server/24.04/stable/current/arm64/hvm/ebs-gp3/ami-id",
    label: "Ubuntu Server 24.04 LTS ARM64",
    hint: "Canonical public parameter, arm64, gp3",
  },
  {
    value: "resolve:ssm:/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id",
    label: "Ubuntu Server 22.04 LTS",
    hint: "Canonical public parameter, amd64, gp2",
  },
  {
    value: "resolve:ssm:/aws/service/canonical/ubuntu/server/22.04/stable/current/arm64/hvm/ebs-gp2/ami-id",
    label: "Ubuntu Server 22.04 LTS ARM64",
    hint: "Canonical public parameter, arm64, gp2",
  },
  { value: "komari:debian-13-amd64", label: "Debian 13", hint: "Official Debian public AMI, latest amd64" },
  { value: "komari:debian-13-arm64", label: "Debian 13 ARM64", hint: "Official Debian public AMI, latest arm64" },
  { value: "komari:debian-12-amd64", label: "Debian 12", hint: "Official Debian public AMI, latest amd64" },
  { value: "komari:debian-12-arm64", label: "Debian 12 ARM64", hint: "Official Debian public AMI, latest arm64" },
  {
    value: "resolve:ssm:/aws/service/ami-windows-latest/Windows_Server-2022-English-Full-Base",
    label: "Windows Server 2022",
    hint: "AWS public parameter, x86_64, English Full Base",
  },
];

export const STATIC_LIGHTSAIL_BLUEPRINT_PRESETS: BuiltinPlanOption[] = [
  { value: "amazon_linux_2023", label: "Amazon Linux 2023", hint: "OS only, Linux", platform: "linux" },
  { value: "ubuntu_24_04", label: "Ubuntu 24.04 LTS", hint: "OS only, Linux", platform: "linux" },
  { value: "ubuntu_22_04", label: "Ubuntu 22.04 LTS", hint: "OS only, Linux", platform: "linux" },
  { value: "ubuntu_20_04", label: "Ubuntu 20.04 LTS", hint: "OS only, Linux", platform: "linux" },
  { value: "debian_12", label: "Debian 12", hint: "OS only, Linux", platform: "linux" },
  { value: "debian_11", label: "Debian 11", hint: "OS only, Linux", platform: "linux" },
  { value: "wordpress", label: "WordPress", hint: "Bitnami app image, Linux", platform: "linux" },
  { value: "windows_server_2022", label: "Windows Server 2022", hint: "OS only, Windows", platform: "windows" },
];

export const STATIC_LIGHTSAIL_BUNDLE_PRESETS: BuiltinPlanOption[] = [
  { value: "nano_3_0", label: "Nano", hint: "$5/mo, 0.5 GB RAM, 20 GB SSD", platform: "linux" },
  { value: "micro_3_0", label: "Micro", hint: "$7/mo, 1 GB RAM, 40 GB SSD", platform: "linux" },
  { value: "small_3_0", label: "Small", hint: "$12/mo, 2 GB RAM, 60 GB SSD", platform: "linux" },
  { value: "medium_3_0", label: "Medium", hint: "$24/mo, 4 GB RAM, 80 GB SSD", platform: "linux" },
  { value: "large_3_0", label: "Large", hint: "$44/mo, 8 GB RAM, 160 GB SSD", platform: "linux" },
  { value: "xlarge_3_0", label: "XLarge", hint: "16 GB RAM, 320 GB SSD", platform: "linux" },
  { value: "2xlarge_3_0", label: "2XLarge", hint: "32 GB RAM, 640 GB SSD", platform: "linux" },
  { value: "large_win_3_0", label: "Large Windows", hint: "Windows plan example from AWS docs", platform: "windows" },
];

export const COMMON_DIGITALOCEAN_REGIONS: BuiltinPlanOption[] = [
  { value: "nyc1", label: "New York 1", zh: "\u7ebd\u7ea6 1" },
  { value: "nyc2", label: "New York 2", zh: "\u7ebd\u7ea6 2" },
  { value: "nyc3", label: "New York 3", zh: "\u7ebd\u7ea6 3" },
  { value: "ams3", label: "Amsterdam 3", zh: "\u963f\u59c6\u65af\u7279\u4e39 3" },
  { value: "sfo2", label: "San Francisco 2", zh: "\u65e7\u91d1\u5c71 2" },
  { value: "sfo3", label: "San Francisco 3", zh: "\u65e7\u91d1\u5c71 3" },
  { value: "sgp1", label: "Singapore 1", zh: "\u65b0\u52a0\u5761 1" },
  { value: "lon1", label: "London 1", zh: "\u4f26\u6566 1" },
  { value: "fra1", label: "Frankfurt 1", zh: "\u6cd5\u5170\u514b\u798f 1" },
  { value: "tor1", label: "Toronto 1", zh: "\u591a\u4f26\u591a 1" },
  { value: "blr1", label: "Bangalore 1", zh: "\u73ed\u52a0\u7f57\u5c14 1" },
  { value: "syd1", label: "Sydney 1", zh: "\u6089\u5c3c 1" },
  { value: "atl1", label: "Atlanta 1", zh: "\u4e9a\u7279\u5170\u5927 1" },
  { value: "ric1", label: "Richmond 1", zh: "\u91cc\u58eb\u6ee1 1" },
];

export const COMMON_DIGITALOCEAN_SIZES: BuiltinPlanOption[] = [
  { value: "s-1vcpu-1gb", label: "Basic 1 GB", hint: "1 vCPU / 1 GB" },
  { value: "s-1vcpu-2gb", label: "Basic 2 GB", hint: "1 vCPU / 2 GB" },
  { value: "s-2vcpu-2gb", label: "Basic 2 vCPU", hint: "2 vCPU / 2 GB" },
  { value: "s-2vcpu-4gb", label: "Basic 4 GB", hint: "2 vCPU / 4 GB" },
  { value: "s-4vcpu-8gb", label: "Basic 8 GB", hint: "4 vCPU / 8 GB" },
];

export const COMMON_DIGITALOCEAN_IMAGES: BuiltinPlanOption[] = [
  { value: "ubuntu-24-04-x64", label: "Ubuntu 24.04 LTS" },
  { value: "ubuntu-22-04-x64", label: "Ubuntu 22.04 LTS" },
  { value: "ubuntu-25-10-x64", label: "Ubuntu 25.10" },
  { value: "debian-13-x64", label: "Debian 13" },
  { value: "debian-12-x64", label: "Debian 12" },
  { value: "rockylinux-10-x64", label: "Rocky Linux 10" },
  { value: "rockylinux-9-x64", label: "Rocky Linux 9" },
  { value: "almalinux-10-x64", label: "AlmaLinux 10" },
  { value: "fedora-43-x64", label: "Fedora 43" },
];

export const COMMON_LINODE_REGIONS: BuiltinPlanOption[] = [
  { value: "nl-ams", label: "Amsterdam, NL", zh: "\u963f\u59c6\u65af\u7279\u4e39", hint: "core / nl" },
  { value: "fr-par-2", label: "Paris 2, FR", zh: "\u5df4\u9ece 2", hint: "core / fr" },
  { value: "jp-tyo-3", label: "Tokyo 3, JP", zh: "\u4e1c\u4eac 3", hint: "core / jp" },
  { value: "sg-sin-2", label: "Singapore 2, SG", zh: "\u65b0\u52a0\u5761 2", hint: "core / sg" },
  { value: "de-fra-2", label: "Frankfurt 2, DE", zh: "\u6cd5\u5170\u514b\u798f 2", hint: "core / de" },
  { value: "in-bom-2", label: "Mumbai 2, IN", zh: "\u5b5f\u4e70 2", hint: "core / in" },
  { value: "au-mel", label: "Melbourne, AU", zh: "\u58a8\u5c14\u672c", hint: "core / au" },
  { value: "gb-lon", label: "London 2, UK", zh: "\u4f26\u6566 2", hint: "core / gb" },
  { value: "us-lax", label: "Los Angeles, CA", zh: "\u6d1b\u6749\u77f6", hint: "core / us" },
  { value: "id-cgk", label: "Jakarta, ID", zh: "\u96c5\u52a0\u8fbe", hint: "core / id" },
  { value: "us-mia", label: "Miami, FL", zh: "\u8fc8\u963f\u5bc6", hint: "core / us" },
  { value: "it-mil", label: "Milan, IT", zh: "\u7c73\u5170", hint: "core / it" },
  { value: "jp-osa", label: "Osaka, JP", zh: "\u5927\u962a", hint: "core / jp" },
  { value: "in-maa", label: "Chennai, IN", zh: "\u91d1\u5948", hint: "core / in" },
  { value: "es-mad", label: "Madrid, ES", zh: "\u9a6c\u5fb7\u91cc", hint: "core / es" },
  { value: "se-sto", label: "Stockholm, SE", zh: "\u65af\u5fb7\u54e5\u5c14\u6469", hint: "core / se" },
  { value: "br-gru", label: "Sao Paulo, BR", zh: "\u5723\u4fdd\u7f57", hint: "core / br" },
  { value: "us-sea", label: "Seattle, WA", zh: "\u897f\u96c5\u56fe", hint: "core / us" },
  { value: "fr-par", label: "Paris, FR", zh: "\u5df4\u9ece", hint: "core / fr" },
  { value: "us-ord", label: "Chicago, IL", zh: "\u829d\u52a0\u54e5", hint: "core / us" },
  { value: "us-iad", label: "Washington, DC", zh: "\u534e\u76db\u987f\u7279\u533a", hint: "core / us" },
  { value: "ap-southeast", label: "Sydney, AU", zh: "\u6089\u5c3c", hint: "legacy / au" },
  { value: "ca-central", label: "Toronto, CA", zh: "\u591a\u4f26\u591a", hint: "legacy / ca" },
  { value: "ap-west", label: "Mumbai, IN", zh: "\u5b5f\u4e70", hint: "legacy / in" },
  { value: "us-central", label: "Dallas, TX", zh: "\u8fbe\u62c9\u65af", hint: "legacy / us" },
  { value: "ap-northeast", label: "Tokyo 2, JP", zh: "\u4e1c\u4eac 2", hint: "legacy / jp" },
  { value: "eu-central", label: "Frankfurt, DE", zh: "\u6cd5\u5170\u514b\u798f", hint: "legacy / de" },
  { value: "ap-south", label: "Singapore, SG", zh: "\u65b0\u52a0\u5761", hint: "legacy / sg" },
  { value: "eu-west", label: "London, UK", zh: "\u4f26\u6566", hint: "legacy / gb" },
  { value: "us-east", label: "Newark, NJ", zh: "\u7ebd\u74e6\u514b", hint: "legacy / us" },
  { value: "us-southeast", label: "Atlanta, GA", zh: "\u4e9a\u7279\u5170\u5927", hint: "legacy / us" },
  { value: "us-west", label: "Fremont, CA", zh: "\u5f17\u91cc\u8499\u7279", hint: "legacy / us" },
];

export const COMMON_LINODE_TYPES: BuiltinPlanOption[] = [
  { value: "g6-nanode-1", label: "Nanode 1 GB", hint: "1 vCPU / 1 GB" },
  { value: "g6-standard-1", label: "Shared 2 GB", hint: "1 vCPU / 2 GB" },
  { value: "g6-standard-2", label: "Shared 4 GB", hint: "2 vCPU / 4 GB" },
  { value: "g6-standard-4", label: "Shared 8 GB", hint: "4 vCPU / 8 GB" },
  { value: "g6-standard-6", label: "Shared 16 GB", hint: "6 vCPU / 16 GB" },
  { value: "g8-dedicated-4-2", label: "G8 Dedicated 4x2", hint: "2 vCPU / 4 GB" },
  { value: "g8-dedicated-8-4", label: "G8 Dedicated 8x4", hint: "4 vCPU / 8 GB" },
  { value: "g8-dedicated-16-8", label: "G8 Dedicated 16x8", hint: "8 vCPU / 16 GB" },
  { value: "g7-premium-2", label: "Premium 4 GB", hint: "2 vCPU / 4 GB" },
  { value: "g7-premium-4", label: "Premium 8 GB", hint: "4 vCPU / 8 GB" },
];

export const COMMON_LINODE_IMAGES: BuiltinPlanOption[] = [
  { value: "linode/ubuntu24.04", label: "Ubuntu 24.04 LTS" },
  { value: "linode/ubuntu22.04", label: "Ubuntu 22.04 LTS" },
  { value: "linode/ubuntu25.10", label: "Ubuntu 25.10" },
  { value: "linode/debian13", label: "Debian 13" },
  { value: "linode/debian12", label: "Debian 12" },
  { value: "linode/almalinux10", label: "AlmaLinux 10" },
  { value: "linode/rocky10", label: "Rocky Linux 10" },
  { value: "linode/rocky9", label: "Rocky Linux 9" },
  { value: "linode/fedora43", label: "Fedora 43" },
];

export const DEFAULT_AWS_REGION = "us-east-1";
export const DEFAULT_STATIC_EC2_INSTANCE_TYPE = STATIC_EC2_INSTANCE_TYPE_PRESETS[0]?.value || "t3.micro";
export const DEFAULT_STATIC_EC2_IMAGE_ID =
  STATIC_EC2_IMAGE_PRESETS[0]?.value || "resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64";
export const DEFAULT_STATIC_LIGHTSAIL_BLUEPRINT_ID = STATIC_LIGHTSAIL_BLUEPRINT_PRESETS[0]?.value || "amazon_linux_2023";
export const DEFAULT_STATIC_LIGHTSAIL_BUNDLE_ID =
  STATIC_LIGHTSAIL_BUNDLE_PRESETS.find((preset) => preset.platform === "linux")?.value || "nano_3_0";
export const DEFAULT_DIGITALOCEAN_REGION = COMMON_DIGITALOCEAN_REGIONS.find((region) => region.value === "sgp1")?.value || "sgp1";
export const DEFAULT_DIGITALOCEAN_SIZE = COMMON_DIGITALOCEAN_SIZES[0]?.value || "s-1vcpu-1gb";
export const DEFAULT_DIGITALOCEAN_IMAGE = COMMON_DIGITALOCEAN_IMAGES[0]?.value || "ubuntu-24-04-x64";
export const DEFAULT_LINODE_REGION = COMMON_LINODE_REGIONS.find((region) => region.value === "sg-sin-2")?.value || "sg-sin-2";
export const DEFAULT_LINODE_TYPE = COMMON_LINODE_TYPES[0]?.value || "g6-nanode-1";
export const DEFAULT_LINODE_IMAGE = COMMON_LINODE_IMAGES[0]?.value || "linode/ubuntu24.04";

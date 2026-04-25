import React from "react";
import { Navigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Eye,
  LoaderCircle,
  PencilLine,
  Play,
  Plus,
  RefreshCw,
  Square,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import Loading from "@/components/loading";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent as BaseSelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  getCloudProviderEntries,
  getDigitalOceanTokens,
  type CloudProviderCredentialEntry,
} from "@/lib/cloud";
import { getAWSCredentials } from "@/lib/cloudAws";
import { getLinodeTokens } from "@/lib/cloudLinode";
import { useSettings } from "@/lib/api";
import {
  createFailoverTask,
  deleteFailoverTask,
  type FailoverPreviewCheck,
  type FailoverTaskPreview,
  type FailoverExecutionStep,
  getFailoverDnsCatalog,
  getFailoverPlanCatalog,
  getFailoverExecution,
  getFailoverNodes,
  getFailoverScripts,
  getFailoverTask,
  getFailoverTasks,
  isFailoverExecutionActive,
  normalizeProviderEntryID,
  previewFailoverTask,
  retryFailoverExecutionCleanup,
  retryFailoverExecutionDNS,
  runFailoverTask,
  stopFailoverExecution,
  toggleFailoverTask,
  updateFailoverTask,
  type FailoverCatalogOption,
  type FailoverExecution,
  type FailoverDnsOption,
  type FailoverPlanCatalog,
  type FailoverDnsCatalog,
  type FailoverDnsRecordOption,
  type FailoverNodeOption,
  type FailoverPlanInput,
  type FailoverScriptOption,
  type FailoverTask,
  type FailoverTaskInput,
} from "@/lib/failover";
import { cn } from "@/lib/utils";
import { getDefaultAdminPath, type AccountFeature, useAccount } from "@/contexts/AccountContext";
import {
  ActionSummaryCard,
  DetailItemsList,
  type DetailItem,
  type SummaryStatusTone,
} from "./failover/EditorSummarySections";
import type { TFunction } from "i18next";

type TaskFormState = {
  name: string;
  enabled: boolean;
  current_client_uuid: string;
  failure_threshold: string;
  stale_after_seconds: string;
  cooldown_seconds: string;
  provision_retry_limit: string;
  provision_failure_fallback_limit: string;
  dns_provider: string;
  dns_entry_id: string;
  dns_zone_name: string;
  dns_record_name: string;
  dns_record_type: string;
  dns_ttl: string;
  dns_proxied: boolean;
  dns_domain_name: string;
  dns_rr: string;
  dns_line: string;
  dns_lines: string[];
  dns_sync_ipv6: boolean;
  delete_strategy: string;
  delete_delay_seconds: string;
  plans: PlanFormState[];
};

type PlanFormState = {
  local_id: string;
  name: string;
  priority: string;
  enabled: boolean;
  provider: string;
  provider_entry_id: string;
  provider_entry_group: string;
  action_type: string;
  payload: string;
  auto_connect_group: string;
  script_clipboard_ids: string[];
  script_timeout_sec: string;
  wait_agent_timeout_sec: string;
};

type ProviderEntry = CloudProviderCredentialEntry & {
  active?: boolean;
  group?: string;
};

type ProviderEntriesMap = Record<string, ProviderEntry[]>;

type ProviderEntryOption = {
  id: string;
  label: string;
  disabled?: boolean;
};

type EntryValues = Record<string, unknown>;
type DnsSyncMode = "ipv4" | "ipv6" | "dual_stack";

type StaticEC2InstanceTypePreset = {
  value: string;
  label: string;
  summary: string;
};

type StaticEC2ImagePreset = {
  value: string;
  label: string;
  summary: string;
};

type StaticLightsailBlueprintPreset = {
  value: string;
  label: string;
  summary: string;
  platform: "linux" | "windows";
};

type StaticLightsailBundlePreset = {
  value: string;
  label: string;
  summary: string;
  platform: "linux" | "windows";
};

type AWSPlanTag = {
  key: string;
  value: string;
};

type SearchableCatalogSelectProps = {
  value?: string;
  options: FailoverCatalogOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  onValueChange: (value: string) => void;
  formatOptionLabel?: (option: FailoverCatalogOption) => string;
};

function SelectContent({
  position = "popper",
  align = "start",
  sideOffset = 6,
  className,
  ...props
}: React.ComponentProps<typeof BaseSelectContent>) {
  return (
    <BaseSelectContent
      position={position}
      align={align}
      sideOffset={sideOffset}
      className={cn("z-[60]", className)}
      {...props}
    />
  );
}

function SearchableCatalogSelect({
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  onValueChange,
  formatOptionLabel = formatCatalogOptionLabel,
}: SearchableCatalogSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const deferredSearchQuery = React.useDeferredValue(searchQuery.trim().toLowerCase());
  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value) || null,
    [options, value],
  );
  const filteredOptions = React.useMemo(
    () => {
      if (!deferredSearchQuery) {
        return options;
      }

      return options.filter((option) => {
        const label = formatOptionLabel(option);
        const haystack = `${option.value} ${option.label} ${option.hint} ${label}`.toLowerCase();
        return haystack.includes(deferredSearchQuery);
      });
    },
    [deferredSearchQuery, formatOptionLabel, options],
  );
  const triggerLabel = selectedOption ? formatOptionLabel(selectedOption) : value || "";

  React.useEffect(() => {
    if (!open && searchQuery) {
      setSearchQuery("");
    }
  }, [open, searchQuery]);

  const stopScrollPropagation = React.useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full min-w-0 justify-between font-normal"
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-left",
              !triggerLabel ? "text-muted-foreground" : "",
            )}
            title={triggerLabel || placeholder}
          >
            {triggerLabel || placeholder}
          </span>
          <ChevronDown className="ml-2 size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="z-[60] flex max-h-[min(24rem,calc(100vh-2rem))] w-[var(--radix-popover-trigger-width)] min-w-[18rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0"
        onWheelCapture={stopScrollPropagation}
        onTouchMoveCapture={stopScrollPropagation}
      >
        <div className="border-b p-2">
          <Input
            autoFocus
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>
        <div
          className="h-[min(18rem,calc(100vh-10rem))] min-h-0 overflow-y-auto overscroll-contain touch-pan-y [scrollbar-gutter:stable] p-1"
          onWheelCapture={stopScrollPropagation}
          onTouchMoveCapture={stopScrollPropagation}
        >
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-6 text-sm text-muted-foreground">
              {emptyLabel}
            </div>
          ) : (
            filteredOptions.map((option) => {
              const optionLabel = formatOptionLabel(option);
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-3 rounded-md px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground",
                    isSelected ? "bg-accent/60 text-accent-foreground" : "",
                  )}
                  onClick={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="break-words text-sm font-medium leading-5">{optionLabel}</div>
                    {option.value && option.value !== option.label ? (
                      <div className="break-all text-xs text-muted-foreground">{option.value}</div>
                    ) : null}
                  </div>
                  <Check className={cn("mt-0.5 size-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const FAILOVER_PROVIDER_KEYS = [
  "cloudflare",
  "aliyun",
  "aws",
  "digitalocean",
  "linode",
] as const;

const DELETE_STRATEGY_VALUES = [
  "keep",
  "delete_after_success",
  "delete_after_success_delay",
] as const;

const DNS_PROVIDER_VALUES = ["cloudflare", "aliyun"] as const;

const PLAN_PROVIDER_VALUES = ["aws", "digitalocean", "linode"] as const;
const PLAN_PROVIDER_REQUIRED_FEATURES: Record<(typeof PLAN_PROVIDER_VALUES)[number], AccountFeature> = {
  aws: "cloud_aws",
  digitalocean: "cloud_digitalocean",
  linode: "cloud_linode",
};

const ACTION_TYPE_VALUES: Record<string, string[]> = {
  aws: ["rebind_public_ip"],
  digitalocean: ["provision_instance"],
  linode: ["provision_instance"],
};

const DNS_RECORD_TYPE_VALUES = ["A", "AAAA"] as const;
const AWS_SERVICE_VALUES = ["ec2", "lightsail"] as const;
const DNS_TTL_OPTIONS = [1, 60, 120, 300, 600, 900, 1800, 3600, 7200] as const;
const COMMON_AWS_REGIONS: FailoverCatalogOption[] = [
  { value: "us-east-2", label: "US East (Ohio)", hint: "" },
  { value: "us-east-1", label: "US East (N. Virginia)", hint: "" },
  { value: "us-west-1", label: "US West (N. California)", hint: "" },
  { value: "us-west-2", label: "US West (Oregon)", hint: "" },
  { value: "af-south-1", label: "Africa (Cape Town)", hint: "" },
  { value: "ap-east-1", label: "Asia Pacific (Hong Kong)", hint: "" },
  { value: "ap-south-2", label: "Asia Pacific (Hyderabad)", hint: "" },
  { value: "ap-southeast-3", label: "Asia Pacific (Jakarta)", hint: "" },
  { value: "ap-southeast-5", label: "Asia Pacific (Malaysia)", hint: "" },
  { value: "ap-southeast-4", label: "Asia Pacific (Melbourne)", hint: "" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai)", hint: "" },
  { value: "ap-southeast-6", label: "Asia Pacific (New Zealand)", hint: "" },
  { value: "ap-northeast-3", label: "Asia Pacific (Osaka)", hint: "" },
  { value: "ap-northeast-2", label: "Asia Pacific (Seoul)", hint: "" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)", hint: "" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)", hint: "" },
  { value: "ap-east-2", label: "Asia Pacific (Taipei)", hint: "" },
  { value: "ap-southeast-7", label: "Asia Pacific (Thailand)", hint: "" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)", hint: "" },
  { value: "ca-central-1", label: "Canada (Central)", hint: "" },
  { value: "ca-west-1", label: "Canada West (Calgary)", hint: "" },
  { value: "cn-north-1", label: "China (Beijing)", hint: "" },
  { value: "cn-northwest-1", label: "China (Ningxia)", hint: "" },
  { value: "eu-central-1", label: "Europe (Frankfurt)", hint: "" },
  { value: "eu-west-1", label: "Europe (Ireland)", hint: "" },
  { value: "eu-west-2", label: "Europe (London)", hint: "" },
  { value: "eu-south-1", label: "Europe (Milan)", hint: "" },
  { value: "eu-west-3", label: "Europe (Paris)", hint: "" },
  { value: "eu-south-2", label: "Europe (Spain)", hint: "" },
  { value: "eu-north-1", label: "Europe (Stockholm)", hint: "" },
  { value: "eu-central-2", label: "Europe (Zurich)", hint: "" },
  { value: "il-central-1", label: "Israel (Tel Aviv)", hint: "" },
  { value: "mx-central-1", label: "Mexico (Central)", hint: "" },
  { value: "me-south-1", label: "Middle East (Bahrain)", hint: "" },
  { value: "me-central-1", label: "Middle East (UAE)", hint: "" },
  { value: "sa-east-1", label: "South America (Sao Paulo)", hint: "" },
  { value: "us-gov-east-1", label: "AWS GovCloud (US-East)", hint: "" },
  { value: "us-gov-west-1", label: "AWS GovCloud (US-West)", hint: "" },
];
const STATIC_EC2_INSTANCE_TYPE_PRESETS: StaticEC2InstanceTypePreset[] = [
  { value: "t3.micro", label: "t3.micro", summary: "Burstable x86 general purpose" },
  { value: "t3.small", label: "t3.small", summary: "Burstable x86 general purpose" },
  { value: "t3.medium", label: "t3.medium", summary: "Burstable x86 general purpose" },
  { value: "m7i.large", label: "m7i.large", summary: "Balanced x86 general purpose" },
  { value: "c7i.large", label: "c7i.large", summary: "x86 compute optimized" },
  { value: "r7i.large", label: "r7i.large", summary: "x86 memory optimized" },
  { value: "t4g.micro", label: "t4g.micro", summary: "Burstable Graviton (ARM64)" },
  { value: "t4g.small", label: "t4g.small", summary: "Burstable Graviton (ARM64)" },
  { value: "t4g.medium", label: "t4g.medium", summary: "Burstable Graviton (ARM64)" },
  { value: "m7g.large", label: "m7g.large", summary: "Balanced Graviton (ARM64)" },
  { value: "c7g.large", label: "c7g.large", summary: "Graviton compute optimized" },
  { value: "r7g.large", label: "r7g.large", summary: "Graviton memory optimized" },
];
const STATIC_EC2_IMAGE_PRESETS: StaticEC2ImagePreset[] = [
  {
    value: "resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64",
    label: "Amazon Linux 2023",
    summary: "AWS public parameter, x86_64, default kernel",
  },
  {
    value: "resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-minimal-kernel-default-x86_64",
    label: "Amazon Linux 2023 Minimal",
    summary: "AWS public parameter, x86_64, minimal image",
  },
  {
    value: "resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64",
    label: "Amazon Linux 2023 ARM64",
    summary: "AWS public parameter, arm64, Graviton-ready",
  },
  {
    value: "resolve:ssm:/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2",
    label: "Amazon Linux 2",
    summary: "AWS public parameter, x86_64, legacy-compatible",
  },
  {
    value: "resolve:ssm:/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-arm64-gp2",
    label: "Amazon Linux 2 ARM64",
    summary: "AWS public parameter, arm64, legacy-compatible",
  },
  {
    value: "resolve:ssm:/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id",
    label: "Ubuntu Server 24.04 LTS",
    summary: "Canonical public parameter, amd64, gp3",
  },
  {
    value: "resolve:ssm:/aws/service/canonical/ubuntu/server/24.04/stable/current/arm64/hvm/ebs-gp3/ami-id",
    label: "Ubuntu Server 24.04 LTS ARM64",
    summary: "Canonical public parameter, arm64, gp3",
  },
  {
    value: "resolve:ssm:/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id",
    label: "Ubuntu Server 22.04 LTS",
    summary: "Canonical public parameter, amd64, gp2",
  },
  {
    value: "resolve:ssm:/aws/service/canonical/ubuntu/server/22.04/stable/current/arm64/hvm/ebs-gp2/ami-id",
    label: "Ubuntu Server 22.04 LTS ARM64",
    summary: "Canonical public parameter, arm64, gp2",
  },
  {
    value: "komari:debian-13-amd64",
    label: "Debian 13",
    summary: "Official Debian public AMI, latest amd64",
  },
  {
    value: "komari:debian-13-arm64",
    label: "Debian 13 ARM64",
    summary: "Official Debian public AMI, latest arm64",
  },
  {
    value: "komari:debian-12-amd64",
    label: "Debian 12",
    summary: "Official Debian public AMI, latest amd64",
  },
  {
    value: "komari:debian-12-arm64",
    label: "Debian 12 ARM64",
    summary: "Official Debian public AMI, latest arm64",
  },
  {
    value: "resolve:ssm:/aws/service/ami-windows-latest/Windows_Server-2022-English-Full-Base",
    label: "Windows Server 2022",
    summary: "AWS public parameter, x86_64, English Full Base",
  },
];
const STATIC_LIGHTSAIL_BLUEPRINT_PRESETS: StaticLightsailBlueprintPreset[] = [
  { value: "amazon_linux_2023", label: "Amazon Linux 2023", summary: "OS only, Linux", platform: "linux" },
  { value: "ubuntu_24_04", label: "Ubuntu 24.04 LTS", summary: "OS only, Linux", platform: "linux" },
  { value: "ubuntu_22_04", label: "Ubuntu 22.04 LTS", summary: "OS only, Linux", platform: "linux" },
  { value: "ubuntu_20_04", label: "Ubuntu 20.04 LTS", summary: "OS only, Linux", platform: "linux" },
  { value: "debian_12", label: "Debian 12", summary: "OS only, Linux", platform: "linux" },
  { value: "debian_11", label: "Debian 11", summary: "OS only, Linux", platform: "linux" },
  { value: "wordpress", label: "WordPress", summary: "Bitnami app image, Linux", platform: "linux" },
  { value: "windows_server_2022", label: "Windows Server 2022", summary: "OS only, Windows", platform: "windows" },
];
const STATIC_LIGHTSAIL_BUNDLE_PRESETS: StaticLightsailBundlePreset[] = [
  { value: "nano_3_0", label: "Nano", summary: "$5/mo, 0.5 GB RAM, 20 GB SSD", platform: "linux" },
  { value: "micro_3_0", label: "Micro", summary: "$7/mo, 1 GB RAM, 40 GB SSD", platform: "linux" },
  { value: "small_3_0", label: "Small", summary: "$12/mo, 2 GB RAM, 60 GB SSD", platform: "linux" },
  { value: "medium_3_0", label: "Medium", summary: "$24/mo, 4 GB RAM, 80 GB SSD", platform: "linux" },
  { value: "large_3_0", label: "Large", summary: "$44/mo, 8 GB RAM, 160 GB SSD", platform: "linux" },
  { value: "large_win_3_0", label: "Large Windows", summary: "Windows plan example from AWS docs", platform: "windows" },
];
const DEFAULT_AWS_FAILOVER_EC2_INSTANCE_TYPE = STATIC_EC2_INSTANCE_TYPE_PRESETS[0]?.value || "t3.micro";
const DEFAULT_AWS_FAILOVER_EC2_IMAGE_ID = STATIC_EC2_IMAGE_PRESETS[0]?.value || "resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64";
const DEFAULT_AWS_FAILOVER_LIGHTSAIL_BLUEPRINT_ID = STATIC_LIGHTSAIL_BLUEPRINT_PRESETS[0]?.value || "amazon_linux_2023";
const DEFAULT_AWS_FAILOVER_LIGHTSAIL_BUNDLE_ID = STATIC_LIGHTSAIL_BUNDLE_PRESETS.find((preset) => preset.platform === "linux")?.value || "nano_3_0";
const DEFAULT_DIGITALOCEAN_IMAGE = "ubuntu-24-04-x64";
const DEFAULT_LINODE_IMAGE = "linode/ubuntu24.04";
const AUTOMATIC_PROVIDER_ENTRY_ID = "active";
const COMMON_DIGITALOCEAN_REGIONS: FailoverCatalogOption[] = [
  { value: "nyc3", label: "New York 3", hint: "" },
  { value: "sfo3", label: "San Francisco 3", hint: "" },
  { value: "tor1", label: "Toronto 1", hint: "" },
  { value: "lon1", label: "London 1", hint: "" },
  { value: "fra1", label: "Frankfurt 1", hint: "" },
  { value: "ams3", label: "Amsterdam 3", hint: "" },
  { value: "sgp1", label: "Singapore 1", hint: "" },
  { value: "blr1", label: "Bangalore 1", hint: "" },
];
const COMMON_DIGITALOCEAN_SIZES: FailoverCatalogOption[] = [
  { value: "s-1vcpu-1gb", label: "Basic 1 GB", hint: "1 vCPU · 1 GB" },
  { value: "s-1vcpu-2gb", label: "Basic 2 GB", hint: "1 vCPU · 2 GB" },
  { value: "s-2vcpu-2gb", label: "Basic 2 vCPU", hint: "2 vCPU · 2 GB" },
  { value: "s-2vcpu-4gb", label: "Basic 4 GB", hint: "2 vCPU · 4 GB" },
  { value: "s-4vcpu-8gb", label: "Basic 8 GB", hint: "4 vCPU · 8 GB" },
];
const COMMON_DIGITALOCEAN_IMAGES: FailoverCatalogOption[] = [
  { value: "ubuntu-24-04-x64", label: "Ubuntu 24.04 LTS", hint: "" },
  { value: "ubuntu-22-04-x64", label: "Ubuntu 22.04 LTS", hint: "" },
  { value: "debian-12-x64", label: "Debian 12", hint: "" },
];
const COMMON_LINODE_REGIONS: FailoverCatalogOption[] = [
  { value: "us-east", label: "Newark", hint: "us" },
  { value: "us-central", label: "Dallas", hint: "us" },
  { value: "us-west", label: "Fremont", hint: "us" },
  { value: "ap-south", label: "Singapore", hint: "sg" },
  { value: "ap-northeast", label: "Tokyo", hint: "jp" },
  { value: "ap-west", label: "Mumbai", hint: "in" },
  { value: "eu-central", label: "Frankfurt", hint: "de" },
  { value: "eu-west", label: "London", hint: "gb" },
];
const COMMON_LINODE_TYPES: FailoverCatalogOption[] = [
  { value: "g6-nanode-1", label: "Nanode 1 GB", hint: "1 vCPU · 1 GB" },
  { value: "g6-standard-1", label: "Shared 2 GB", hint: "1 vCPU · 2 GB" },
  { value: "g6-standard-2", label: "Shared 4 GB", hint: "2 vCPU · 4 GB" },
  { value: "g6-standard-4", label: "Shared 8 GB", hint: "4 vCPU · 8 GB" },
];
const COMMON_LINODE_IMAGES: FailoverCatalogOption[] = [
  { value: "linode/ubuntu24.04", label: "Ubuntu 24.04 LTS", hint: "" },
  { value: "linode/ubuntu22.04", label: "Ubuntu 22.04 LTS", hint: "" },
  { value: "linode/debian12", label: "Debian 12", hint: "" },
];
const DIGITALOCEAN_REGION_COUNTRIES: Record<string, string> = {
  ams: "nl",
  atl: "us",
  blr: "in",
  fra: "de",
  lon: "gb",
  nyc: "us",
  sfo: "us",
  sgp: "sg",
  syd: "au",
  tor: "ca",
};

function isDnsRecordType(value: string): value is (typeof DNS_RECORD_TYPE_VALUES)[number] {
  return DNS_RECORD_TYPE_VALUES.includes(value as (typeof DNS_RECORD_TYPE_VALUES)[number]);
}

function getStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getBooleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeAWSTag(tag: unknown): AWSPlanTag | null {
  if (!tag || typeof tag !== "object") {
    return null;
  }

  const key = getStringValue((tag as { key?: unknown }).key);
  const value = getStringValue((tag as { value?: unknown }).value);
  if (!key || !value) {
    return null;
  }

  return { key, value };
}

function getAWSTagArrayValue(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const tags: AWSPlanTag[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const tag = normalizeAWSTag(item);
    if (!tag) {
      continue;
    }

    const dedupeKey = `${tag.key}\u0000${tag.value}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    tags.push(tag);
  }

  return tags;
}

function parseAWSTagsText(value: string) {
  const tags: AWSPlanTag[] = [];
  const seen = new Set<string>();

  for (const entry of String(value || "").split(/\r?\n|,/)) {
    const normalized = entry.trim();
    if (!normalized) {
      continue;
    }

    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = normalized.slice(0, separatorIndex).trim();
    const tagValue = normalized.slice(separatorIndex + 1).trim();
    if (!key || !tagValue) {
      continue;
    }

    const dedupeKey = `${key}\u0000${tagValue}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    tags.push({ key, value: tagValue });
  }

  return tags;
}

function formatAWSTagsText(tags: AWSPlanTag[]) {
  return tags.map((tag) => `${tag.key}=${tag.value}`).join("\n");
}

function getNumberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getStringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : [];
}

function createLocalID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function formatDurationSeconds(value: number | null | undefined, t: TFunction) {
  const total = Number(value || 0);
  if (!Number.isFinite(total) || total <= 0) {
    return t("failover.duration.zero", { defaultValue: "0s" });
  }

  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = Math.floor(total % 60);

  const parts: string[] = [];
  if (days > 0) {
    parts.push(
      t("failover.duration.day", {
        defaultValue: "{{count}}d",
        count: days,
      }),
    );
  }
  if (hours > 0) {
    parts.push(
      t("failover.duration.hour", {
        defaultValue: "{{count}}h",
        count: hours,
      }),
    );
  }
  if (minutes > 0) {
    parts.push(
      t("failover.duration.minute", {
        defaultValue: "{{count}}m",
        count: minutes,
      }),
    );
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(
      t("failover.duration.second", {
        defaultValue: "{{count}}s",
        count: seconds,
      }),
    );
  }
  return parts.slice(0, 3).join(" ");
}

function humanizeStatus(value: string) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "Unknown";
  }

  return normalized
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusLabel(t: TFunction, value: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return t("failover.status.unknown", { defaultValue: "Unknown" });
  }
  return t(`failover.status.${normalized}`, {
    defaultValue: humanizeStatus(value),
  });
}

function getFailoverExecutionStepLabel(t: TFunction, step: FailoverExecutionStep) {
  const stepKey = String(step.step_key || "").trim().toLowerCase();

  if (stepKey === "detect") {
    return t("failover.execution.step_labels.detect", { defaultValue: "Detect trigger" });
  }
  if (stepKey.startsWith("plan:")) {
    return t("failover.execution.step_labels.plan", { defaultValue: "Plan attempt" });
  }
  if (stepKey === "wait_agent") {
    return t("failover.execution.step_labels.wait_agent", { defaultValue: "Wait for agent" });
  }
  if (stepKey === "validate_outlet") {
    return t("failover.execution.step_labels.validate_outlet", { defaultValue: "Validate new outlet" });
  }
  if (stepKey === "run_scripts") {
    return t("failover.execution.step_labels.run_scripts", { defaultValue: "Run scripts" });
  }
  if (stepKey.startsWith("run_script:")) {
    const match = stepKey.match(/:(\d+)$/);
    const index = match ? Number.parseInt(match[1], 10) : 0;
    return t("failover.execution.step_labels.run_script_index", {
      defaultValue: index > 0 ? "Run script {{index}}" : "Run script",
      index,
    });
  }
  if (stepKey === "switch_dns") {
    return t("failover.execution.step_labels.switch_dns", { defaultValue: "Switch DNS" });
  }
  if (stepKey === "retry_dns") {
    return t("failover.execution.step_labels.retry_dns", { defaultValue: "Retry DNS" });
  }
  if (stepKey === "cleanup_old") {
    return t("failover.execution.step_labels.cleanup_old", { defaultValue: "Cleanup old instance" });
  }
  if (stepKey === "retry_cleanup") {
    return t("failover.execution.step_labels.retry_cleanup", { defaultValue: "Retry old instance cleanup" });
  }
  if (stepKey === "rollback_new") {
    return t("failover.execution.step_labels.rollback_new", { defaultValue: "Rollback new instance" });
  }
  if (stepKey === "reclaim_current") {
    return t("failover.execution.step_labels.reclaim_current", { defaultValue: "Reclaim current outlet capacity" });
  }
  if (stepKey === "retry_same_entry") {
    return t("failover.execution.step_labels.retry_same_entry", { defaultValue: "Retry same provider entry" });
  }

  return step.step_label || step.step_key;
}

function getFailoverExecutionStepMessage(t: TFunction, step: FailoverExecutionStep) {
  const message = String(step.message || "").trim();
  const normalized = message.toLowerCase();

  switch (normalized) {
    case "trigger snapshot recorded":
      return t("failover.execution.step_messages.trigger_snapshot_recorded", { defaultValue: "Trigger snapshot recorded" });
    case "manual trigger without live cn_connectivity snapshot":
      return t("failover.execution.step_messages.manual_trigger_without_live_snapshot", {
        defaultValue: "Manual trigger without a live CN connectivity snapshot",
      });
    case "plan completed":
      return t("failover.execution.step_messages.plan_completed", { defaultValue: "Plan completed" });
    case "agent connected":
      return t("failover.execution.step_messages.agent_connected", { defaultValue: "Agent connected" });
    case "connectivity validation skipped because no target client is available":
      return t("failover.execution.step_messages.validation_skipped_no_target_client", {
        defaultValue: "Connectivity validation skipped because no target client is available",
      });
    case "new outlet connectivity looks healthy":
      return t("failover.execution.step_messages.new_outlet_healthy", {
        defaultValue: "New outlet connectivity looks healthy",
      });
    case "new instance root password could not be saved; deleted the new instance automatically":
      return t("failover.execution.step_messages.new_instance_password_cleanup_success", {
        defaultValue: "New instance root password could not be saved; deleted the new instance automatically",
      });
    case "new instance root password could not be saved and automatic cleanup failed":
      return t("failover.execution.step_messages.new_instance_password_cleanup_failed", {
        defaultValue: "New instance root password could not be saved and automatic cleanup failed",
      });
    case "scripts finished successfully":
      return t("failover.execution.step_messages.scripts_finished_successfully", { defaultValue: "Scripts finished successfully" });
    case "script finished successfully":
      return t("failover.execution.step_messages.script_finished_successfully", { defaultValue: "Script finished successfully" });
    case "dns switching skipped":
      return t("failover.execution.step_messages.dns_switching_skipped", { defaultValue: "DNS switching skipped" });
    case "dns updated":
      return t("failover.execution.step_messages.dns_updated", { defaultValue: "DNS updated" });
    case "dns updated and verified":
      return t("failover.execution.step_messages.dns_updated_and_verified", {
        defaultValue: "DNS updated and verified",
      });
    case "old instance deleted":
      return t("failover.execution.step_messages.old_instance_deleted", { defaultValue: "Old instance deleted" });
    case "old instance already missing; no cleanup required":
      return t("failover.execution.step_messages.old_instance_missing_no_cleanup", {
        defaultValue: "Old instance already missing; no cleanup required",
      });
    case "original cloud credential was deleted; manual cleanup review required":
      return t("failover.execution.step_messages.cleanup_manual_review_deleted_entry", {
        defaultValue: "Original cloud credential was deleted; manual cleanup review required",
      });
    case "original cloud credential is unavailable; manual cleanup review required":
      return t("failover.execution.step_messages.cleanup_manual_review_unavailable_entry", {
        defaultValue: "Original cloud credential is unavailable; manual cleanup review required",
      });
    case "old instance cleanup could not be verified; manual review required":
      return t("failover.execution.step_messages.cleanup_manual_review_unknown", {
        defaultValue: "Old instance cleanup could not be verified; manual review required",
      });
    case "failed new instance deleted":
      return t("failover.execution.step_messages.failed_new_instance_deleted", {
        defaultValue: "Failed new instance deleted",
      });
    case "current failed outlet deleted to free capacity":
      return t("failover.execution.step_messages.reclaimed_current_instance", {
        defaultValue: "Current failed outlet deleted to free capacity",
      });
    case "current outlet was already missing; skipping delete":
      return t("failover.execution.step_messages.current_outlet_missing_skipped", {
        defaultValue: "Current outlet was already missing; skipping delete",
      });
    case "retryable new-outlet failure detected; retrying the same provider entry":
      return t("failover.execution.step_messages.retry_same_entry", {
        defaultValue: "Retryable new-outlet failure detected; retrying the same provider entry",
      });
    default:
      return message;
  }
}

type CleanupResultInfo = {
  classification: string;
  title: string;
  description: string;
  tone: "success" | "warning" | "destructive" | "secondary";
  errorMessage: string;
};

type ExecutionEntryAttemptSummary = {
  entry_id: string;
  entry_name: string;
  entry_group: string;
  attempt: number;
  status: string;
  error: string;
  failure_class: string;
  cleanup_status: string;
  cleanup_error: string;
  cleanup_label: string;
  preferred: boolean;
  active: boolean;
};

type ExecutionPlanAttemptSummary = {
  plan_id: number;
  plan_name: string;
  priority: number;
  provider: string;
  action_type: string;
  preferred_entry_id: string;
  preferred_entry_group: string;
  provider_entry_id: string;
  status: string;
  error: string;
  provider_entry_attempts: ExecutionEntryAttemptSummary[];
};

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function getCleanupFailureClassLabel(t: TFunction, failureClass: string) {
  const normalized = String(failureClass || "").trim().toLowerCase();
  switch (normalized) {
    case "auth_invalid":
      return t("failover.execution.cleanup_failure_classes.auth_invalid", {
        defaultValue: "credential rejected",
      });
    case "billing_locked":
      return t("failover.execution.cleanup_failure_classes.billing_locked", {
        defaultValue: "account locked or billing restricted",
      });
    case "rate_limited":
      return t("failover.execution.cleanup_failure_classes.rate_limited", {
        defaultValue: "provider API rate limited the request",
      });
    case "quota_exhausted":
      return t("failover.execution.cleanup_failure_classes.quota_exhausted", {
        defaultValue: "provider quota or account limits blocked the request",
      });
    case "transient_error":
      return t("failover.execution.cleanup_failure_classes.transient_error", {
        defaultValue: "provider API query failed",
      });
    default:
      return "";
  }
}

function getCleanupResultInfo(
  t: TFunction,
  cleanupStatus: string,
  cleanupResult: unknown,
): CleanupResultInfo | null {
  const raw = asRecord(cleanupResult);
  const classification = getStringValue(raw?.classification).toLowerCase();
  const backendSummary = getStringValue(raw?.summary);
  const errorMessage = getStringValue(raw?.error_message);
  const failureLabel = getCleanupFailureClassLabel(t, getStringValue(raw?.provider_failure_class));
  const summaryWithReason = failureLabel
    ? t("failover.execution.cleanup_messages.reason", {
      defaultValue: "Reason: {{reason}}",
      reason: failureLabel,
    })
    : "";

  switch (classification) {
    case "not_requested":
    case "":
      if (!backendSummary) {
        return null;
      }
      break;
    case "instance_deleted":
      return {
        classification,
        title: t("failover.execution.cleanup_messages.instance_deleted_title", {
          defaultValue: "Old instance deleted",
        }),
        description: t("failover.execution.cleanup_messages.instance_deleted_description", {
          defaultValue: "The old instance was deleted successfully.",
        }),
        tone: "success",
        errorMessage,
      };
    case "instance_missing":
      return {
        classification,
        title: t("failover.execution.cleanup_messages.instance_missing_title", {
          defaultValue: "Old instance already missing",
        }),
        description: t("failover.execution.cleanup_messages.instance_missing_description", {
          defaultValue: "The system confirmed the old instance was already gone, so no cleanup action was required.",
        }),
        tone: "secondary",
        errorMessage,
      };
    case "provider_entry_missing":
      return {
        classification,
        title: t("failover.execution.cleanup_messages.provider_entry_missing_title", {
          defaultValue: "Original cloud credential was deleted",
        }),
        description: t("failover.execution.cleanup_messages.provider_entry_missing_description", {
          defaultValue: "The system can no longer access the original cloud account, so it could not confirm whether the old instance still exists or is still billing. Review the original cloud account manually.",
        }),
        tone: "warning",
        errorMessage,
      };
    case "provider_entry_unhealthy":
      return {
        classification,
        title: t("failover.execution.cleanup_messages.provider_entry_unhealthy_title", {
          defaultValue: "Original cloud credential is unavailable",
        }),
        description: [t("failover.execution.cleanup_messages.provider_entry_unhealthy_description", {
          defaultValue: "The original cloud credential is no longer usable, so the system could not confirm the old instance state. Review the original cloud account manually.",
        }), summaryWithReason].filter(Boolean).join(" "),
        tone: "warning",
        errorMessage,
      };
    case "cleanup_status_unknown":
      return {
        classification,
        title: t("failover.execution.cleanup_messages.cleanup_status_unknown_title", {
          defaultValue: "Old instance cleanup status is unknown",
        }),
        description: [t("failover.execution.cleanup_messages.cleanup_status_unknown_description", {
          defaultValue: "The system could not query the original cloud account successfully, so it could not confirm whether the old instance still exists. Review the original cloud account manually.",
        }), summaryWithReason].filter(Boolean).join(" "),
        tone: "warning",
        errorMessage,
      };
    case "instance_confirmed_delete_failed":
      return {
        classification,
        title: t("failover.execution.cleanup_messages.instance_confirmed_delete_failed_title", {
          defaultValue: "Old instance still exists, but delete failed",
        }),
        description: t("failover.execution.cleanup_messages.instance_confirmed_delete_failed_description", {
          defaultValue: "The system confirmed the old instance still existed before the delete failed, so it is likely still billing until removed.",
        }),
        tone: "destructive",
        errorMessage,
      };
    default:
      break;
  }

  const normalizedStatus = String(cleanupStatus || "").trim().toLowerCase();
  if (!backendSummary && !errorMessage) {
    return null;
  }

  return {
    classification,
    title: backendSummary || getStatusLabel(t, cleanupStatus),
    description: "",
    tone:
      normalizedStatus === "failed"
        ? "destructive"
        : normalizedStatus === "warning"
          ? "warning"
          : normalizedStatus === "success"
            ? "success"
            : "secondary",
    errorMessage,
  };
}

function getRetryExecutionDNSAvailability(execution: FailoverExecution | null) {
  if (!execution) {
    return { available: false, reason: "" };
  }
  if (execution.available_actions?.retry_dns) {
    return execution.available_actions.retry_dns;
  }
  if (isFailoverExecutionActive(execution.status)) {
    return { available: false, reason: "" };
  }
  return {
    available: String(execution.dns_status || "").trim().toLowerCase() === "failed",
    reason: "",
  };
}

function getRetryExecutionCleanupAvailability(execution: FailoverExecution | null) {
  if (!execution) {
    return { available: false, reason: "" };
  }
  if (execution.available_actions?.retry_cleanup) {
    return execution.available_actions.retry_cleanup;
  }
  if (isFailoverExecutionActive(execution.status)) {
    return { available: false, reason: "" };
  }
  if (String(execution.dns_status || "").trim().toLowerCase() !== "success") {
    return { available: false, reason: "" };
  }
  const cleanupStatus = String(execution.cleanup_status || "").trim().toLowerCase();
  const oldInstanceRef = asRecord(execution.old_instance_ref);
  return {
    available: ["pending", "failed", "warning"].includes(cleanupStatus) && Boolean(oldInstanceRef && Object.keys(oldInstanceRef).length > 0),
    reason: "",
  };
}

type ExecutionSummaryCardData = {
  title: string;
  description: string;
  items: DetailItem[];
  detailLines: string[];
  detailLinesTitle: string;
  emptyLabel: string;
};

type RetryGuidanceItem = {
  key: string;
  label: string;
  reason: string;
  nextStep: string;
};

function firstNonEmptyString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      const normalized = String(value).trim();
      if (normalized) {
        return normalized;
      }
    }
  }
  return "";
}

function isIPv4Address(value: string) {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

function isIPv6Address(value: string) {
  return value.includes(":") && /^[0-9a-f:]+$/i.test(value);
}

function normalizeExecutionIPAddress(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }
  const candidate = trimmed.includes("/") ? trimmed.split("/")[0].trim() : trimmed;
  if (!candidate) {
    return "";
  }
  if (isIPv4Address(candidate) || isIPv6Address(candidate)) {
    return candidate;
  }
  return "";
}

function pickExecutionAddressFamily(value: string, family: "ipv4" | "ipv6") {
  const normalized = normalizeExecutionIPAddress(value);
  if (!normalized) {
    return "";
  }
  if (family === "ipv4") {
    return isIPv4Address(normalized) ? normalized : "";
  }
  return isIPv6Address(normalized) ? normalized : "";
}

function getPrimaryAddressFromNetworkEntries(value: unknown, family: "ipv4" | "ipv6") {
  if (typeof value === "string") {
    return pickExecutionAddressFamily(value, family);
  }
  if (!Array.isArray(value)) {
    return "";
  }

  let fallback = "";
  for (const entry of value) {
    if (typeof entry === "string") {
      const candidate = pickExecutionAddressFamily(entry, family);
      if (candidate) {
        return candidate;
      }
      continue;
    }

    const raw = asRecord(entry);
    if (!raw) {
      continue;
    }

    const candidate = pickExecutionAddressFamily(
      firstNonEmptyString(raw.ip_address, raw.address, raw.public_ip),
      family,
    );
    if (!candidate) {
      continue;
    }

    if (!fallback) {
      fallback = candidate;
    }

    const type = getStringValue(raw.type).toLowerCase();
    if (!type || type === "public") {
      return candidate;
    }
  }

  return fallback;
}

function getPrimaryExecutionIPv4(value: unknown) {
  const raw = asRecord(value);
  if (!raw) {
    return "";
  }
  return firstNonEmptyString(
    pickExecutionAddressFamily(getStringValue(raw.public_ip), "ipv4"),
    getPrimaryAddressFromNetworkEntries(raw.ipv4, "ipv4"),
    pickExecutionAddressFamily(getStringValue(raw.ipv4), "ipv4"),
    getPrimaryAddressFromNetworkEntries(raw.addresses, "ipv4"),
  );
}

function getPrimaryExecutionIPv6(value: unknown) {
  const raw = asRecord(value);
  if (!raw) {
    return "";
  }
  return firstNonEmptyString(
    getPrimaryAddressFromNetworkEntries(raw.ipv6_addresses, "ipv6"),
    pickExecutionAddressFamily(getStringValue(raw.ipv6), "ipv6"),
    getPrimaryAddressFromNetworkEntries(raw.ipv6, "ipv6"),
    getPrimaryAddressFromNetworkEntries(raw.addresses, "ipv6"),
  );
}

function getExecutionProviderEntryLabel(ref: Record<string, unknown> | null) {
  if (!ref) {
    return "";
  }
  const entryName = getStringValue(ref.provider_entry_name);
  const entryID = getStringValue(ref.provider_entry_id);
  if (entryName && entryID && entryName !== entryID) {
    return `${entryName} (${entryID})`;
  }
  return entryName || entryID;
}

function getExecutionInstanceIdentifier(t: TFunction, ref: Record<string, unknown> | null) {
  if (!ref) {
    return "";
  }

  const dropletID = firstNonEmptyString(ref.droplet_id);
  const instanceID = firstNonEmptyString(ref.instance_id);
  const instanceName = firstNonEmptyString(ref.instance_name);
  const label = firstNonEmptyString(ref.label);
  const name = firstNonEmptyString(ref.name);

  if (dropletID) {
    return [t("failover.execution.instance_identifier.droplet", {
      defaultValue: "Droplet #{{id}}",
      id: dropletID,
    }), name].filter(Boolean).join(" · ");
  }
  if (instanceID) {
    return [t("failover.execution.instance_identifier.instance", {
      defaultValue: "Instance {{id}}",
      id: instanceID,
    }), label || name].filter(Boolean).join(" · ");
  }
  return instanceName || label || name;
}

function getExecutionServiceLabel(t: TFunction, ref: Record<string, unknown> | null) {
  if (!ref) {
    return "";
  }
  const provider = getStringValue(ref.provider);
  const service = getStringValue(ref.service);
  if (!service) {
    return "";
  }
  if (provider === "aws") {
    return service === "ec2"
      ? t("failover.execution.services.ec2", { defaultValue: "EC2" })
      : service === "lightsail"
        ? t("failover.execution.services.lightsail", { defaultValue: "Lightsail" })
        : humanizeStatus(service);
  }
  return humanizeStatus(service);
}

function getExecutionDnsRecordSummaries(t: TFunction, value: unknown) {
  const raw = asRecord(value);
  if (!raw) {
    return [] as string[];
  }

  const seen = new Set<string>();
  const lines: string[] = [];
  const appendSummary = (entry: unknown) => {
    const record = asRecord(entry);
    if (!record) {
      return;
    }
    const line = [firstNonEmptyString(
      getStringValue(record.name),
      joinRecordName(getStringValue(record.domain), getStringValue(record.rr)),
    ), [
      normalizeDnsRecordType(getStringValue(record.type)),
      getStringValue(record.value),
      getStringValue(record.line) ? localizeAliyunLineLabel(t, getStringValue(record.line)) : "",
    ].filter(Boolean).join(" · ")].filter(Boolean).join(" · ");
    if (!line || seen.has(line)) {
      return;
    }
    seen.add(line);
    lines.push(line);
  };

  appendSummary(raw);
  if (Array.isArray(raw.records)) {
    raw.records.forEach(appendSummary);
  }

  return lines;
}

function collectDnsResultPrunedTypes(value: unknown) {
  const raw = asRecord(value);
  return new Set(
    getStringArrayValue(raw?.pruned_types)
      .map((item) => normalizeDnsRecordType(item))
      .filter(Boolean),
  );
}

function getExecutionDnsVerificationSummary(t: TFunction, value: unknown) {
  const verification = asRecord(asRecord(value)?.verification);
  if (!verification) {
    return "";
  }

  const missingCount = Array.isArray(verification.missing_records) ? verification.missing_records.length : 0;
  const unexpectedCount = Array.isArray(verification.unexpected_records) ? verification.unexpected_records.length : 0;
  const attempts = getNumberValue(verification.attempts, 0);
  const success = getBooleanValue(verification.success);

  if (success && missingCount === 0 && unexpectedCount === 0) {
    if (attempts > 0) {
      return t("failover.execution.dns_verification_verified_after", {
        defaultValue: "Verified after {{count}} attempt(s)",
        count: attempts,
      });
    }
    return t("failover.execution.dns_verification_verified", {
      defaultValue: "Verified against provider records",
    });
  }

  if (missingCount > 0 || unexpectedCount > 0) {
    return t("failover.execution.dns_verification_needs_review", {
      defaultValue: "Missing {{missing}}, unexpected {{unexpected}}",
      missing: missingCount,
      unexpected: unexpectedCount,
    });
  }

  if (attempts > 0) {
    return t("failover.execution.dns_verification_attempted", {
      defaultValue: "Verification attempted {{count}} time(s)",
      count: attempts,
    });
  }

  return "";
}

function buildExecutionDnsSummaryCard(t: TFunction, execution: FailoverExecution): ExecutionSummaryCardData | null {
  if (!execution.dns_provider && !asRecord(execution.new_addresses) && !asRecord(execution.dns_result)) {
    return null;
  }

  const ipv4 = getPrimaryExecutionIPv4(execution.new_addresses);
  const ipv6 = getPrimaryExecutionIPv6(execution.new_addresses);
  const recordTypes = Array.from(collectDnsResultRecordTypes(execution.dns_result));
  const skippedTypes = Array.from(new Set([
    ...Array.from(collectDnsResultSkippedTypes(execution.dns_result)),
    ...Array.from(collectDnsResultPrunedTypes(execution.dns_result)),
  ]));
  const verification = getExecutionDnsVerificationSummary(t, execution.dns_result);

  return {
    title: t("failover.execution.dns_target_title", { defaultValue: "DNS target" }),
    description: t("failover.execution.dns_target_description", {
      defaultValue: "Retry DNS reuses these saved addresses and record snapshots. No new instance will be created.",
    }),
    items: [
      buildDetailItem(
        t("failover.execution.detail_labels.provider", { defaultValue: "Provider" }),
        execution.dns_provider ? getDnsProviderLabel(t, execution.dns_provider) : "",
      ),
      buildDetailItem(
        t("failover.execution.detail_labels.status", { defaultValue: "Status" }),
        getStatusLabel(t, execution.dns_status),
      ),
      buildDetailItem(
        t("failover.execution.detail_labels.ipv4_target", { defaultValue: "IPv4 target" }),
        ipv4,
      ),
      buildDetailItem(
        t("failover.execution.detail_labels.ipv6_target", { defaultValue: "IPv6 target" }),
        ipv6,
      ),
      buildDetailItem(
        t("failover.execution.detail_labels.record_types", { defaultValue: "Record types" }),
        recordTypes.join(", "),
      ),
      buildDetailItem(
        t("failover.execution.detail_labels.skipped_types", { defaultValue: "Skipped types" }),
        skippedTypes.join(", "),
      ),
      buildDetailItem(
        t("failover.execution.detail_labels.verification", { defaultValue: "Verification" }),
        verification,
      ),
    ].filter((item): item is DetailItem => Boolean(item)),
    detailLines: getExecutionDnsRecordSummaries(t, execution.dns_result),
    detailLinesTitle: t("failover.execution.latest_dns_records", { defaultValue: "Latest records" }),
    emptyLabel: t("failover.execution.no_dns_target", {
      defaultValue: "No saved DNS target details are available for this execution yet.",
    }),
  };
}

function buildExecutionOldInstanceSummaryCard(
  t: TFunction,
  execution: FailoverExecution,
  cleanupInfo: CleanupResultInfo | null,
): ExecutionSummaryCardData | null {
  const cleanupRaw = asRecord(execution.cleanup_result);
  const ref = asRecord(cleanupRaw?.instance_ref) || asRecord(execution.old_instance_ref);
  const cleanupLabel = firstNonEmptyString(cleanupRaw?.cleanup_label);

  if (!ref && !cleanupInfo && !cleanupLabel) {
    return null;
  }

  return {
    title: t("failover.execution.old_instance_title", { defaultValue: "Old instance" }),
    description: t("failover.execution.old_instance_description", {
      defaultValue: "Cleanup retry uses this saved provider reference. Confirm it before deleting anything.",
    }),
    items: [
      buildDetailItem(
        t("failover.execution.detail_labels.provider", { defaultValue: "Provider" }),
        ref
          ? getPlanProviderLabel(t, getStringValue(ref.provider))
          : firstNonEmptyString(cleanupRaw?.provider)
            ? getPlanProviderLabel(t, firstNonEmptyString(cleanupRaw?.provider))
            : "",
      ),
      buildDetailItem(
        t("failover.execution.detail_labels.entry_name", { defaultValue: "Entry name" }),
        getExecutionProviderEntryLabel(ref) || firstNonEmptyString(cleanupRaw?.provider_entry_name, cleanupRaw?.provider_entry_id),
      ),
      buildDetailItem(
        t("failover.execution.detail_labels.service", { defaultValue: "Service" }),
        getExecutionServiceLabel(t, ref),
      ),
      buildDetailItem(
        t("failover.execution.detail_labels.region", { defaultValue: "Region" }),
        ref ? getStringValue(ref.region) : "",
      ),
      buildDetailItem(
        t("failover.execution.detail_labels.instance", { defaultValue: "Instance" }),
        getExecutionInstanceIdentifier(t, ref),
      ),
      buildDetailItem(
        t("failover.execution.detail_labels.ipv4_target", { defaultValue: "IPv4 target" }),
        getPrimaryExecutionIPv4(execution.old_addresses),
      ),
      buildDetailItem(
        t("failover.execution.detail_labels.ipv6_target", { defaultValue: "IPv6 target" }),
        getPrimaryExecutionIPv6(execution.old_addresses),
      ),
      buildDetailItem(
        t("failover.execution.detail_labels.cleanup_state", { defaultValue: "Cleanup state" }),
        cleanupInfo?.title || getStatusLabel(t, execution.cleanup_status),
      ),
      buildDetailItem(
        t("failover.execution.detail_labels.cleanup_action", { defaultValue: "Cleanup action" }),
        cleanupLabel,
      ),
    ].filter((item): item is DetailItem => Boolean(item)),
    detailLines: [],
    detailLinesTitle: "",
    emptyLabel: t("failover.execution.no_old_instance", {
      defaultValue: "No saved old instance reference is available for this execution.",
    }),
  };
}

function shouldShowRetryDNSGuidance(execution: FailoverExecution | null) {
  const dnsStatus = String(execution?.dns_status || "").trim().toLowerCase();
  return dnsStatus === "failed" || dnsStatus === "pending" || dnsStatus === "skipped";
}

function shouldShowRetryCleanupGuidance(execution: FailoverExecution | null) {
  const cleanupStatus = String(execution?.cleanup_status || "").trim().toLowerCase();
  const classification = getStringValue(asRecord(execution?.cleanup_result)?.classification).toLowerCase();
  return (
    cleanupStatus === "pending"
    || cleanupStatus === "failed"
    || cleanupStatus === "warning"
    || classification === "provider_entry_missing"
    || classification === "provider_entry_unhealthy"
    || classification === "cleanup_status_unknown"
  );
}

function getRetryActionNextStep(
  t: TFunction,
  action: "retry_dns" | "retry_cleanup",
  reason: string,
) {
  const normalized = String(reason || "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  if (normalized.includes("still running")) {
    return t("failover.execution.retry_guidance.wait_or_stop", {
      defaultValue: "Wait for the current execution to finish, or stop it first if it is stuck.",
    });
  }
  if (normalized.includes("dns must succeed")) {
    return t("failover.execution.retry_guidance.retry_dns_first", {
      defaultValue: "Retry DNS first. Cleanup stays blocked until the DNS step succeeds.",
    });
  }
  if (normalized.includes("no saved execution addresses")) {
    return t("failover.execution.retry_guidance.inspect_addresses", {
      defaultValue: "Review the execution timeline or rerun failover so a new target address is saved.",
    });
  }
  if (normalized.includes("manual review is required")) {
    return t("failover.execution.retry_guidance.manual_review", {
      defaultValue: "Open the original cloud account directly and verify whether the old instance still exists or is still billing.",
    });
  }
  if (normalized.includes("already succeeded") || normalized.includes("already missing")) {
    return t("failover.execution.retry_guidance.no_retry_needed", {
      defaultValue: "No retry is needed for this step unless you are validating it manually.",
    });
  }
  if (normalized.includes("did not require old instance cleanup")) {
    return t("failover.execution.retry_guidance.no_cleanup_required", {
      defaultValue: "This execution did not create a saved old-instance cleanup action.",
    });
  }
  return action === "retry_dns"
    ? t("failover.execution.retry_guidance.review_dns_summary", {
      defaultValue: "Review the DNS target summary and timeline before retrying the DNS step again.",
    })
    : t("failover.execution.retry_guidance.review_cleanup_summary", {
      defaultValue: "Review the old instance summary and cleanup timeline before retrying deletion.",
    });
}

function buildRetryGuidanceItems(
  t: TFunction,
  execution: FailoverExecution | null,
  retryDNSAvailability: { available: boolean; reason: string },
  retryCleanupAvailability: { available: boolean; reason: string },
) {
  if (!execution) {
    return [] as RetryGuidanceItem[];
  }

  return [
    !retryDNSAvailability.available && retryDNSAvailability.reason && shouldShowRetryDNSGuidance(execution)
      ? {
        key: "retry-dns",
        label: t("failover.actions.retry_dns", { defaultValue: "Retry DNS" }),
        reason: retryDNSAvailability.reason,
        nextStep: getRetryActionNextStep(t, "retry_dns", retryDNSAvailability.reason),
      }
      : null,
    !retryCleanupAvailability.available && retryCleanupAvailability.reason && shouldShowRetryCleanupGuidance(execution)
      ? {
        key: "retry-cleanup",
        label: t("failover.actions.retry_cleanup", { defaultValue: "Retry Cleanup" }),
        reason: retryCleanupAvailability.reason,
        nextStep: getRetryActionNextStep(t, "retry_cleanup", retryCleanupAvailability.reason),
      }
      : null,
  ].filter((item): item is RetryGuidanceItem => Boolean(item));
}

function normalizeExecutionEntryAttempt(value: unknown): ExecutionEntryAttemptSummary {
  const raw = asRecord(value);
  return {
    entry_id: getStringValue(raw?.entry_id),
    entry_name: getStringValue(raw?.entry_name),
    entry_group: getStringValue(raw?.entry_group),
    attempt: getNumberValue(raw?.attempt, 0),
    status: getStringValue(raw?.status),
    error: getStringValue(raw?.error),
    failure_class: getStringValue(raw?.failure_class),
    cleanup_status: getStringValue(raw?.cleanup_status),
    cleanup_error: getStringValue(raw?.cleanup_error),
    cleanup_label: getStringValue(raw?.label),
    preferred: getBooleanValue(raw?.preferred),
    active: getBooleanValue(raw?.active),
  };
}

function normalizeExecutionPlanAttempt(value: unknown): ExecutionPlanAttemptSummary {
  const raw = asRecord(value);
  return {
    plan_id: getNumberValue(raw?.plan_id, 0),
    plan_name: getStringValue(raw?.plan_name),
    priority: getNumberValue(raw?.priority, 0),
    provider: getStringValue(raw?.provider),
    action_type: getStringValue(raw?.action_type),
    preferred_entry_id: getStringValue(raw?.preferred_entry_id),
    preferred_entry_group: getStringValue(raw?.preferred_entry_group),
    provider_entry_id: getStringValue(raw?.provider_entry_id),
    status: getStringValue(raw?.status),
    error: getStringValue(raw?.error),
    provider_entry_attempts: Array.isArray(raw?.provider_entry_attempts)
      ? raw.provider_entry_attempts.map(normalizeExecutionEntryAttempt)
      : [],
  };
}

function getExecutionPlanAttempts(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as ExecutionPlanAttemptSummary[];
  }

  return value
    .map(normalizeExecutionPlanAttempt)
    .filter((attempt) => (
      attempt.plan_id > 0
      || attempt.plan_name
      || attempt.provider
      || attempt.action_type
      || attempt.status
      || attempt.error
      || attempt.provider_entry_attempts.length > 0
    ));
}

function getLastExecutionPlanAttempt(value: unknown) {
  const attempts = getExecutionPlanAttempts(value);
  return attempts.length > 0 ? attempts[attempts.length - 1] : null;
}

function getLastExecutionEntryAttempt(attempt: ExecutionPlanAttemptSummary | null) {
  if (!attempt) {
    return null;
  }
  if (attempt.provider_entry_attempts.length > 0) {
    return attempt.provider_entry_attempts[attempt.provider_entry_attempts.length - 1];
  }
  if (!attempt.provider_entry_id) {
    return null;
  }
  return {
    entry_id: attempt.provider_entry_id,
    entry_name: "",
    entry_group: attempt.preferred_entry_group,
    attempt: 0,
    status: attempt.status,
    error: attempt.error,
    failure_class: "",
    cleanup_status: "",
    cleanup_error: "",
    cleanup_label: "",
    preferred: false,
    active: false,
  } satisfies ExecutionEntryAttemptSummary;
}

function getSelectedTaskPlan(
  plans: FailoverTask["plans"],
  selectedPlanID: number | null | undefined,
) {
  if (!selectedPlanID) {
    return null;
  }
  return plans.find((plan) => plan.id === selectedPlanID) || null;
}

function getExecutionPlanSummaryText(
  t: TFunction,
  taskPlan: FailoverTask["plans"][number] | null,
  attempt: ExecutionPlanAttemptSummary | null,
) {
  const planName = taskPlan?.name || attempt?.plan_name || "";
  const provider = taskPlan?.provider || attempt?.provider || "";
  const actionType = taskPlan?.action_type || attempt?.action_type || "";
  const parts = [
    planName || (taskPlan?.id || attempt?.plan_id
      ? t("failover.execution.summary.plan_id", {
        defaultValue: "Plan #{{id}}",
        id: taskPlan?.id || attempt?.plan_id || 0,
      })
      : ""),
    provider ? getPlanProviderLabel(t, provider) : "",
    actionType ? getActionTypeLabel(t, actionType) : "",
  ].filter(Boolean);

  return parts.join(" · ");
}

function getExecutionEntrySummaryText(
  t: TFunction,
  attempt: ExecutionPlanAttemptSummary | null,
  entryAttempt: ExecutionEntryAttemptSummary | null,
) {
  if (!attempt && !entryAttempt) {
    return "";
  }

  const entryID = entryAttempt?.entry_id || attempt?.provider_entry_id || attempt?.preferred_entry_id || "";
  const entryName = entryAttempt?.entry_name || "";
  const entryGroup = entryAttempt?.entry_group || attempt?.preferred_entry_group || "";
  const parts = [
    entryName || entryID,
    entryGroup
      ? t("failover.execution.summary.entry_group", {
        defaultValue: "Group {{group}}",
        group: entryGroup,
      })
      : "",
    entryAttempt?.status
      ? getStatusLabel(t, entryAttempt.status)
      : attempt?.status
        ? getStatusLabel(t, attempt.status)
        : "",
  ].filter(Boolean);

  return parts.join(" · ");
}

function getFailureClassSummaryLabel(t: TFunction, value: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  switch (normalized) {
    case "pre_reclaim_error":
      return t("failover.execution.failure_classes.pre_reclaim_error", {
        defaultValue: "pre-cleanup failed",
      });
    case "post_provision_error":
      return t("failover.execution.failure_classes.post_provision_error", {
        defaultValue: "post-provision setup failed",
      });
    default:
      return t(`failover.execution.failure_classes.${normalized}`, {
        defaultValue: humanizeStatus(normalized),
      });
  }
}

function buildDetailItem(label: string, value: string) {
  const normalizedLabel = String(label || "").trim();
  const normalizedValue = String(value || "").trim();
  if (!normalizedLabel || !normalizedValue) {
    return null;
  }
  return {
    label: normalizedLabel,
    value: normalizedValue,
  } satisfies DetailItem;
}

function formatDetailValue(t: TFunction, key: string, value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  switch (key) {
    case "provider":
      return getPlanProviderLabel(t, getStringValue(value));
    case "action_type":
      return getActionTypeLabel(t, getStringValue(value));
    case "status":
      return getStatusLabel(t, getStringValue(value));
    case "cleanup_status":
      return humanizeStatus(getStringValue(value));
    case "retry_after_seconds":
      return formatDurationSeconds(getNumberValue(value, 0), t);
    case "latency":
      return `${getNumberValue(value, 0)} ms`;
    case "checked_at":
      return formatDateTime(typeof value === "string" ? value : String(value));
    case "preferred":
    case "active":
    case "output_truncated":
    case "script_output_available":
      return getBooleanValue(value)
        ? t("common.yes", { defaultValue: "Yes" })
        : t("common.no", { defaultValue: "No" });
    case "availability":
    case "availability_after_recycle": {
      const raw = asRecord(value);
      if (!raw) {
        return "";
      }
      const status = getStringValue(raw.status);
      const used = getNumberValue(raw.used, -1);
      const limit = getNumberValue(raw.limit, -1);
      if (used >= 0 && limit >= 0) {
        return `${status || t("failover.status.unknown", { defaultValue: "Unknown" })} (${used}/${limit})`;
      }
      return status;
    }
    default:
      if (typeof value === "boolean") {
        return value
          ? t("common.yes", { defaultValue: "Yes" })
          : t("common.no", { defaultValue: "No" });
      }
      if (typeof value === "number") {
        return String(value);
      }
      if (typeof value === "string") {
        return value.trim();
      }
      if (Array.isArray(value)) {
        return value.map((item) => String(item || "").trim()).filter(Boolean).join(", ");
      }
      return "";
  }
}

function getDetailLabel(t: TFunction, key: string) {
  switch (key) {
    case "reason":
      return t("failover.execution.detail_labels.reason", { defaultValue: "Reason" });
    case "plan_name":
      return t("failover.execution.detail_labels.plan_name", { defaultValue: "Plan" });
    case "plan_id":
      return t("failover.execution.detail_labels.plan_id", { defaultValue: "Plan ID" });
    case "priority":
      return t("failover.execution.detail_labels.priority", { defaultValue: "Priority" });
    case "provider":
      return t("failover.execution.detail_labels.provider", { defaultValue: "Provider" });
    case "action_type":
      return t("failover.execution.detail_labels.action", { defaultValue: "Action" });
    case "resource_type":
      return t("failover.execution.detail_labels.resource_type", { defaultValue: "Resource type" });
    case "resource_id":
      return t("failover.execution.detail_labels.resource_id", { defaultValue: "Resource ID" });
    case "entry_id":
    case "provider_entry_id":
      return t("failover.execution.detail_labels.entry_id", { defaultValue: "Provider entry" });
    case "entry_name":
      return t("failover.execution.detail_labels.entry_name", { defaultValue: "Entry name" });
    case "entry_group":
      return t("failover.execution.detail_labels.entry_group", { defaultValue: "Entry group" });
    case "preferred_entry_id":
      return t("failover.execution.detail_labels.preferred_entry_id", { defaultValue: "Preferred entry" });
    case "preferred_entry_group":
      return t("failover.execution.detail_labels.preferred_entry_group", { defaultValue: "Preferred group" });
    case "status":
      return t("failover.execution.detail_labels.status", { defaultValue: "Status" });
    case "message":
      return t("failover.execution.detail_labels.message", { defaultValue: "Message" });
    case "error":
    case "error_message":
      return t("failover.execution.detail_labels.error", { defaultValue: "Error" });
    case "failure_class":
      return t("failover.execution.detail_labels.failure_class", { defaultValue: "Failure class" });
    case "cleanup_status":
      return t("failover.execution.detail_labels.cleanup_result", { defaultValue: "Cleanup result" });
    case "cleanup_error":
      return t("failover.execution.detail_labels.cleanup_error", { defaultValue: "Cleanup error" });
    case "attempt":
      return t("failover.execution.detail_labels.attempt", { defaultValue: "Attempt" });
    case "next_attempt":
      return t("failover.execution.detail_labels.next_attempt", { defaultValue: "Next attempt" });
    case "retry_after_seconds":
      return t("failover.execution.detail_labels.retry_after", { defaultValue: "Retry after" });
    case "client_uuid":
      return t("failover.execution.detail_labels.client", { defaultValue: "Client" });
    case "clipboard_id":
      return t("failover.execution.detail_labels.clipboard_id", { defaultValue: "Clipboard ID" });
    case "script_name":
      return t("failover.execution.detail_labels.script_name", { defaultValue: "Script" });
    case "task_id":
      return t("failover.execution.detail_labels.task_id", { defaultValue: "Task ID" });
    case "exit_code":
      return t("failover.execution.detail_labels.exit_code", { defaultValue: "Exit code" });
    case "checked_at":
      return t("failover.execution.detail_labels.checked_at", { defaultValue: "Checked at" });
    case "latency":
      return t("failover.execution.detail_labels.latency", { defaultValue: "Latency" });
    case "consecutive_failures":
      return t("failover.execution.detail_labels.consecutive_failures", { defaultValue: "Consecutive failures" });
    case "strategy":
      return t("failover.execution.detail_labels.strategy", { defaultValue: "Cleanup strategy" });
    case "label":
      return t("failover.execution.detail_labels.operation", { defaultValue: "Operation" });
    case "output_truncated":
      return t("failover.execution.detail_labels.output_truncated", { defaultValue: "Output truncated" });
    case "script_output_available":
      return t("failover.execution.detail_labels.output_available", { defaultValue: "Output captured" });
    case "availability":
      return t("failover.execution.detail_labels.availability", { defaultValue: "Availability" });
    case "availability_after_recycle":
      return t("failover.execution.detail_labels.availability_after_recycle", { defaultValue: "Availability after recycle" });
    default:
      return "";
  }
}

function getExecutionStepDetailItems(t: TFunction, detail: unknown) {
  const raw = asRecord(detail);
  if (!raw) {
    return [] as DetailItem[];
  }

  const orderedKeys = [
    "reason",
    "plan_name",
    "plan_id",
    "priority",
    "provider",
    "action_type",
    "resource_type",
    "resource_id",
    "preferred_entry_id",
    "preferred_entry_group",
    "provider_entry_id",
    "entry_id",
    "entry_name",
    "entry_group",
    "client_uuid",
    "status",
    "message",
    "consecutive_failures",
    "latency",
    "checked_at",
    "clipboard_id",
    "script_name",
    "task_id",
    "exit_code",
    "failure_class",
    "attempt",
    "next_attempt",
    "retry_after_seconds",
    "strategy",
    "label",
    "cleanup_status",
    "cleanup_error",
    "output_truncated",
    "script_output_available",
    "availability",
    "availability_after_recycle",
    "error_message",
    "error",
  ] as const;

  const items: DetailItem[] = [];
  for (const key of orderedKeys) {
    const label = getDetailLabel(t, key);
    if (!label) {
      continue;
    }
    const rawValue = raw[key];
    const value = key === "failure_class"
      ? getFailureClassSummaryLabel(t, getStringValue(rawValue))
      : formatDetailValue(t, key, rawValue);
    const item = buildDetailItem(label, value);
    if (item) {
      items.push(item);
    }
  }
  return items;
}

function planRequiresInstanceCleanup(plan: Pick<PlanFormState, "enabled" | "provider" | "action_type">) {
  return Boolean(plan.enabled) && planCanProvision(plan.provider, plan.action_type);
}

function resolveTaskDeleteStrategy(
  currentValue: string,
  plans: Array<Pick<PlanFormState, "enabled" | "provider" | "action_type">>,
) {
  const hasProvisionPlan = plans.some(planRequiresInstanceCleanup);
  if (!hasProvisionPlan) {
    return "keep";
  }

  const normalized = String(currentValue || "").trim().toLowerCase();
  if (normalized === "delete_after_success_delay") {
    return "delete_after_success_delay";
  }
  return "delete_after_success";
}

function getDeleteStrategyOptions(
  t: TFunction,
  plans: Array<Pick<PlanFormState, "enabled" | "provider" | "action_type">>,
) {
  const values = plans.some(planRequiresInstanceCleanup)
    ? DELETE_STRATEGY_VALUES.filter((value) => value !== "keep")
    : DELETE_STRATEGY_VALUES.filter((value) => value === "keep");

  return values.map((value) => ({
    value,
    label: t(`failover.delete_strategy.${value}`, {
      defaultValue:
        value === "keep"
          ? "Keep old instance"
          : value === "delete_after_success"
            ? "Delete after success"
            : "Delete after delay",
    }),
  }));
}

function getDnsProviderLabel(t: TFunction, value: string) {
  return t(`failover.dns_provider.${value}`, {
    defaultValue:
      value === "cloudflare"
        ? "Cloudflare DNS"
        : value === "aliyun"
          ? "Aliyun DNS"
          : humanizeStatus(value),
  });
}

function getDnsProviderOptions(t: TFunction, providerEntries: ProviderEntriesMap) {
  return DNS_PROVIDER_VALUES.map((value) => ({
    value,
    label: getDnsProviderLabel(t, value),
    disabled: (providerEntries[value] || []).length === 0,
  }));
}

function normalizeDnsRecordType(value: string) {
  const normalized = String(value || "").trim().toUpperCase();
  return isDnsRecordType(normalized) ? normalized : "";
}

function getDnsSyncMode(recordType: string, syncIPv6: boolean): DnsSyncMode {
  if (syncIPv6) {
    return "dual_stack";
  }
  return normalizeDnsRecordType(recordType) === "AAAA" ? "ipv6" : "ipv4";
}

function applyDnsSyncMode(mode: string) {
  switch (mode) {
    case "ipv6":
      return {
        dns_record_type: "AAAA",
        dns_sync_ipv6: false,
      } satisfies Pick<TaskFormState, "dns_record_type" | "dns_sync_ipv6">;
    case "dual_stack":
      return {
        dns_record_type: "A",
        dns_sync_ipv6: true,
      } satisfies Pick<TaskFormState, "dns_record_type" | "dns_sync_ipv6">;
    default:
      return {
        dns_record_type: "A",
        dns_sync_ipv6: false,
      } satisfies Pick<TaskFormState, "dns_record_type" | "dns_sync_ipv6">;
  }
}

function getDnsSyncModeOptions(t: TFunction) {
  return [
    {
      value: "ipv4",
      label: t("failover.editor.dns_sync_mode_ipv4", {
        defaultValue: "IPv4 only (A)",
      }),
    },
    {
      value: "ipv6",
      label: t("failover.editor.dns_sync_mode_ipv6", {
        defaultValue: "IPv6 only (AAAA)",
      }),
    },
    {
      value: "dual_stack",
      label: t("failover.editor.dns_sync_mode_dual_stack", {
        defaultValue: "Dual stack (A + AAAA)",
      }),
    },
  ] satisfies Array<{ value: DnsSyncMode; label: string }>;
}

function getPlanProviderLabel(t: TFunction, value: string) {
  return t(`failover.plan_provider.${value}`, {
    defaultValue:
      value === "digitalocean"
        ? "DigitalOcean"
        : value === "linode"
          ? "Linode"
          : value === "aws"
            ? "AWS"
            : humanizeStatus(value),
  });
}

function getPlanProviderOptions(
  t: TFunction,
  providerEntries: ProviderEntriesMap,
  allowedProviders: readonly string[],
) {
  return PLAN_PROVIDER_VALUES.map((value) => ({
    value,
    label: getPlanProviderLabel(t, value),
    disabled: !allowedProviders.includes(value) || (providerEntries[value] || []).length === 0,
  }));
}

function getActionTypeLabel(t: TFunction, value: string) {
  return t(`failover.action_type.${value}`, {
    defaultValue:
      value === "rebind_public_ip"
        ? "Reuse IP or create"
        : value === "provision_instance"
          ? "Provision instance"
          : humanizeStatus(value),
  });
}

function getDefaultPlanActionType(provider: string) {
  return (ACTION_TYPE_VALUES[provider] || [])[0] || "";
}

function normalizePlanActionTypeForProvider(provider: string, actionType: string) {
  const normalizedProvider = String(provider || "").trim().toLowerCase();
  const forced = getDefaultPlanActionType(normalizedProvider);
  if (forced) {
    return forced;
  }
  return String(actionType || "").trim();
}

function planCanProvision(provider: string, actionType: string) {
  return String(provider || "").trim().toLowerCase() === "aws"
    || String(actionType || "").trim() === "provision_instance";
}

function normalizeAWSService(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return AWS_SERVICE_VALUES.includes(normalized as (typeof AWS_SERVICE_VALUES)[number]) ? normalized : "ec2";
}

function getDefaultLightsailAvailabilityZone(region: string) {
  const normalized = region.trim();
  if (!normalized) {
    return "";
  }
  return `${normalized}a`;
}

function inferLightsailBundlePlatform(bundleId: string): "linux" | "windows" | "" {
  const normalized = bundleId.trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  return STATIC_LIGHTSAIL_BUNDLE_PRESETS.find((preset) => preset.value === normalized)?.platform || "";
}

function inferLightsailBlueprintPlatform(blueprintId: string): "linux" | "windows" | "" {
  const normalized = blueprintId.trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  if (normalized.includes("windows") || normalized.includes("sqlserver")) {
    return "windows";
  }
  return STATIC_LIGHTSAIL_BLUEPRINT_PRESETS.find((preset) => preset.value === normalized)?.platform || "";
}

function inferEC2InstanceArchitecture(instanceType: string): "x86_64" | "arm64" | "" {
  const normalized = instanceType.trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  if (/^(a1|t4g|m6g|m7g|m6gd|m7gd|c6g|c7g|c6gd|c7gd|r6g|r7g|r6gd|r7gd|x2gd)\./.test(normalized)) {
    return "arm64";
  }
  return "x86_64";
}

function inferEC2ImageArchitecture(imageId: string): "x86_64" | "arm64" | "" {
  const normalized = imageId.trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  if (normalized.includes("arm64")) {
    return "arm64";
  }
  if (normalized.includes("x86_64") || normalized.includes("amd64") || normalized.includes("windows")) {
    return "x86_64";
  }
  return "";
}

function getDefaultLightsailBundleForPlatform(platform: "linux" | "windows" | "") {
  if (platform === "windows") {
    return STATIC_LIGHTSAIL_BUNDLE_PRESETS.find((preset) => preset.platform === "windows")?.value || "large_win_3_0";
  }
  return STATIC_LIGHTSAIL_BUNDLE_PRESETS.find((preset) => preset.platform === "linux")?.value || DEFAULT_AWS_FAILOVER_LIGHTSAIL_BUNDLE_ID;
}

function getAWSRegionOptionLabel(option: { value: string; label: string }) {
  const value = String(option.value || "").trim();
  return option.label ? `${option.label} (${value})` : value;
}

function getStaticEC2ImagePresetLabel(preset: StaticEC2ImagePreset) {
  return `${preset.label} (${preset.summary})`;
}

function getStaticEC2InstanceTypePresetLabel(preset: StaticEC2InstanceTypePreset) {
  return `${preset.label} (${preset.summary})`;
}

function getStaticLightsailBlueprintPresetLabel(preset: StaticLightsailBlueprintPreset) {
  return `${preset.label} (${preset.summary})`;
}

function getStaticLightsailBundlePresetLabel(preset: StaticLightsailBundlePreset) {
  return `${preset.label} (${preset.summary})`;
}

function formatCatalogOptionLabel(option: { label: string; hint?: string }) {
  return option.hint ? `${option.label} · ${option.hint}` : option.label;
}

function appendCatalogOptionIfMissing(
  options: FailoverCatalogOption[] = [],
  value: string,
  label?: string,
) {
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) {
    return options;
  }
  if (options.some((option) => String(option.value || "").trim() === normalizedValue)) {
    return options;
  }
  return [
    ...options,
    {
      value: normalizedValue,
      label: String(label || normalizedValue).trim() || normalizedValue,
      hint: "",
    },
  ];
}

function describeTaskMonitoringCoreSettings(t: TFunction, state: TaskFormState) {
  return [
    `${t("failover.editor.failure_threshold", { defaultValue: "Failure threshold" })}: ${state.failure_threshold || "-"}`,
    `${t("failover.editor.stale_after", { defaultValue: "Stale after (s)" })}: ${state.stale_after_seconds || "-"}`,
    `${t("failover.editor.cooldown", { defaultValue: "Cooldown (s)" })}: ${state.cooldown_seconds || "-"}`,
  ].join(" · ")
    || t("failover.editor.monitoring_core_hint", {
      defaultValue: "Failure threshold, stale window, and cooldown usually stay near their defaults.",
    });
}

function describeTaskRetrySettings(t: TFunction, state: TaskFormState) {
  return [
    `${t("failover.editor.provision_retry_limit", { defaultValue: "Blocked retry limit" })}: ${state.provision_retry_limit || "-"}`,
    `${t("failover.editor.provision_failure_fallback_limit", { defaultValue: "Plan fallback after provision failures" })}: ${state.provision_failure_fallback_limit || "-"}`,
  ].join(" · ");
}

function describePlanAdvancedSettings(t: TFunction, plan: PlanFormState | null) {
  if (!plan) {
    return "";
  }

  return [
    `${t("failover.editor.priority", { defaultValue: "Priority" })}: ${plan.priority || "-"}`,
    `${t("failover.editor.script_timeout", { defaultValue: "Script timeout (s)" })}: ${plan.script_timeout_sec || "-"}`,
    `${t("failover.editor.wait_agent_timeout", { defaultValue: "Wait agent timeout (s)" })}: ${plan.wait_agent_timeout_sec || "-"}`,
  ].join(" · ");
}

function describePlanCoreSettings(
  t: TFunction,
  plan: PlanFormState | null,
  entrySummary: string,
) {
  if (!plan) {
    return "";
  }

  const providerLabel = plan.provider ? getPlanProviderLabel(t, plan.provider) : "";
  const actionLabel = plan.action_type ? getActionTypeLabel(t, plan.action_type) : "";

  return [
    providerLabel,
    actionLabel,
    entrySummary,
  ].filter(Boolean).join(" · ")
    || t("failover.editor.plan_core_hint", {
      defaultValue: "A plan usually only needs provider, credentials, and action type.",
    });
}

function describePlanConfigSettings(t: TFunction, plan: PlanFormState | null) {
  if (!plan) {
    return "";
  }

  const providerLabel = plan.provider ? getPlanProviderLabel(t, plan.provider) : "";
  const actionLabel = plan.action_type ? getActionTypeLabel(t, plan.action_type) : "";
  const payloadSummary = summarizePlanPayload(t, plan);

  return [
    providerLabel,
    actionLabel,
    payloadSummary,
  ].filter(Boolean).join(" · ")
    || t("failover.editor.plan_config_hint", {
      defaultValue: "Choose provider options and instance parameters only when this plan needs them.",
    });
}

function describePlanOptionalSettings(
  t: TFunction,
  plan: PlanFormState | null,
  scriptNames: string[],
) {
  if (!plan) {
    return "";
  }

  const normalizedName = String(plan.name || "").trim();
  const normalizedGroup = String(plan.auto_connect_group || "").trim();
  const summaryScriptNames = scriptNames.slice(0, 2).join(" -> ");
  const scriptSummary = plan.script_clipboard_ids.length > 0
    ? `${t("failover.editor.scripts", { defaultValue: "Scripts" })}: ${summaryScriptNames}${scriptNames.length > 2 ? ` +${scriptNames.length - 2}` : ""}`
    : "";

  return [
    normalizedName
      ? `${t("common.name", { defaultValue: "Name" })}: ${normalizedName}`
      : "",
    normalizedGroup
      ? `${t("failover.editor.auto_connect_group", { defaultValue: "Auto-connect group" })}: ${normalizedGroup}`
      : "",
    scriptSummary,
  ].filter(Boolean).join(" · ")
    || t("failover.editor.show_plan_optional_hint", {
      defaultValue: "Name, auto-connect group, and scripts can stay empty unless this plan needs them.",
    });
}

function describePlanOrganizerSummary(
  t: TFunction,
  plan: PlanFormState | null,
  planIndex: number,
  totalPlans: number,
  coreSummary: string,
  scriptCount: number,
) {
  if (!plan) {
    return "";
  }

  const displayIndex = planIndex >= 0 ? planIndex + 1 : 1;

  return [
    getPlanDisplayName(plan, displayIndex - 1, t),
    t("failover.editor.priority_label", {
      defaultValue: "Priority {{value}}",
      value: displayIndex,
    }),
    totalPlans > 1
      ? t("failover.editor.plan_count_summary", {
        defaultValue: "{{count}} plan(s)",
        count: totalPlans,
      })
      : t("failover.editor.plan_single", {
        defaultValue: "1 plan",
      }),
    coreSummary,
    scriptCount > 0
      ? t("failover.editor.scripts_selected", {
        defaultValue: "{{count}} selected",
        count: scriptCount,
      })
      : "",
  ].filter(Boolean).join(" · ");
}

function describeDnsCoreSettings(
  t: TFunction,
  enabled: boolean,
  providerLabel: string,
  entryLabel: string,
  targetLabel: string,
  syncModeLabel: string,
  ttl: string,
) {
  if (!enabled) {
    return t("failover.editor.no_dns_hint", {
      defaultValue: "This task will skip DNS switching and only manage cloud failover actions.",
    });
  }

  return [
    providerLabel,
    entryLabel,
    targetLabel
      ? `${t("failover.task.dns_target_label", { defaultValue: "DNS target" })}: ${targetLabel}`
      : "",
    syncModeLabel,
    ttl
      ? `${t("failover.editor.ttl", { defaultValue: "TTL" })}: ${ttl}`
      : "",
  ].filter(Boolean).join(" · ")
    || t("failover.editor.dns_summary_hint", {
      defaultValue: "Review the DNS target, sync mode, and old-instance cleanup here. Open the secondary dialog only when you need to change the details.",
    });
}

function describeDnsAdvancedSettings(
  t: TFunction,
  deleteStrategyLabel: string,
  deleteDelaySeconds: string,
  deleteStrategy: string,
) {
  return [
    deleteStrategyLabel
      ? `${t("failover.editor.delete_strategy", { defaultValue: "Old instance strategy" })}: ${deleteStrategyLabel}`
      : "",
    deleteStrategy === "delete_after_success_delay" && deleteDelaySeconds
      ? `${t("failover.editor.delete_delay", { defaultValue: "Delete delay (s)" })}: ${deleteDelaySeconds}`
      : "",
  ].filter(Boolean).join(" · ")
    || t("failover.editor.show_dns_advanced_hint", {
      defaultValue: "Cleanup strategy and custom DNS behavior usually stay on their defaults.",
    });
}

function localizeCountryLabel(t: TFunction, rawValue: string) {
  const normalized = String(rawValue || "").trim();
  if (!normalized) {
    return "";
  }

  const countryCode = normalized.toLowerCase();
  if (/^[a-z]{2,3}$/.test(countryCode)) {
    return t(`cloud.region_countries.${countryCode}`, {
      defaultValue: normalized.toUpperCase(),
    });
  }

  return normalized;
}

function getDigitalOceanRegionPrefix(slug: string) {
  return String(slug || "").trim().toLowerCase().replace(/[0-9]+$/, "");
}

function formatPlanRegionOptionLabel(
  t: TFunction,
  provider: string,
  option: { value: string; label: string; hint?: string },
) {
  if (provider === "digitalocean") {
    const countryCode = DIGITALOCEAN_REGION_COUNTRIES[getDigitalOceanRegionPrefix(option.value)];
    const country = countryCode ? localizeCountryLabel(t, countryCode) : "";
    if (country) {
      return `${option.value} (${country}) / ${option.label}`;
    }
  }

  if (provider === "linode") {
    const country = localizeCountryLabel(t, option.hint || "");
    if (country) {
      return `${option.value} (${country}) / ${option.label}`;
    }
  }

  return formatCatalogOptionLabel(option);
}

function formatDnsTTLLabel(t: TFunction, ttl: number) {
  return t("failover.editor.ttl_option", { count: ttl });
}

function buildSelectableDnsOptions(
  options: FailoverDnsOption[],
  currentValue: string,
) {
  const result: FailoverDnsOption[] = [];
  const seen = new Set<string>();

  for (const option of options) {
    const value = String(option.value || "").trim();
    if (!value || seen.has(value)) {
      continue;
    }
    result.push({
      value,
      label: String(option.label || value).trim() || value,
    });
    seen.add(value);
  }

  const normalizedCurrentValue = String(currentValue || "").trim();
  if (normalizedCurrentValue && !seen.has(normalizedCurrentValue)) {
    result.push({
      value: normalizedCurrentValue,
      label: normalizedCurrentValue,
    });
  }

  return result;
}

function getDNSZoneOptions(catalog: FailoverDnsCatalog | null, currentValue: string) {
  const options = catalog?.zones || [];
  if (options.length > 0) {
    return buildSelectableDnsOptions(options, currentValue);
  }

  const fallbackOptions: FailoverDnsOption[] = [];
  if (catalog?.defaults.zone_name) {
    fallbackOptions.push({
      value: catalog.defaults.zone_name,
      label: catalog.defaults.zone_name,
    });
  }
  return buildSelectableDnsOptions(fallbackOptions, currentValue);
}

function getDNSDomainOptions(catalog: FailoverDnsCatalog | null, currentValue: string) {
  const options = catalog?.domains || [];
  if (options.length > 0) {
    return buildSelectableDnsOptions(options, currentValue);
  }

  const fallbackOptions: FailoverDnsOption[] = [];
  if (catalog?.defaults.domain_name) {
    fallbackOptions.push({
      value: catalog.defaults.domain_name,
      label: catalog.defaults.domain_name,
    });
  }
  return buildSelectableDnsOptions(fallbackOptions, currentValue);
}

function getDNSTTLOptions(
  t: TFunction,
  catalog: FailoverDnsCatalog | null,
  currentValue: string,
) {
  const options = (catalog?.ttls?.length
    ? catalog.ttls
    : DNS_TTL_OPTIONS.map((value) => ({
        value: String(value),
        label: formatDnsTTLLabel(t, value),
      }))).map((option) => {
        const numericValue = Number.parseInt(String(option.value || "").trim(), 10);
        return {
          value: String(option.value || "").trim(),
          label: Number.isFinite(numericValue) && numericValue > 0
            ? formatDnsTTLLabel(t, numericValue)
            : String(option.label || option.value || "").trim(),
        };
      });
  return buildSelectableDnsOptions(options, currentValue);
}

function localizeAliyunLineLabel(t: TFunction, value: string, fallback?: string) {
  const normalized = String(value || "").trim().toLowerCase();
  switch (normalized) {
    case "default":
      return t("failover.editor.aliyun_line_default");
    case "telecom":
      return t("failover.editor.aliyun_line_telecom");
    case "unicom":
      return t("failover.editor.aliyun_line_unicom");
    case "mobile":
      return t("failover.editor.aliyun_line_mobile");
    case "edu":
      return t("failover.editor.aliyun_line_edu");
    case "oversea":
      return t("failover.editor.aliyun_line_oversea");
    case "search":
      return t("failover.editor.aliyun_line_search");
    case "school":
      return t("failover.editor.aliyun_line_school");
    default:
      return String(fallback || value || "").trim() || normalized;
  }
}

function getAliyunLineOptions(
  t: TFunction,
  catalog: FailoverDnsCatalog | null,
  currentValues: string[],
) {
  const normalizedOptions = (catalog?.lines || []).map((option) => ({
    value: option.value,
    label: localizeAliyunLineLabel(t, option.value, option.label),
  }));
  const currentOptions = (currentValues.length > 0 ? currentValues : ["default"]).map((value) => ({
    value,
    label: localizeAliyunLineLabel(t, value),
  }));
  return buildSelectableDnsOptions(
    [...normalizedOptions, ...currentOptions],
    "",
  );
}

function prettyJson(value: unknown, fallback = "{}") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
}

function parsePlanPayloadObject(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return {} as Record<string, unknown>;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function defaultAWSProvisionLikePayload() {
  return {
    service: "ec2",
    region: "",
    name: "",
    image_id: DEFAULT_AWS_FAILOVER_EC2_IMAGE_ID,
    instance_type: DEFAULT_AWS_FAILOVER_EC2_INSTANCE_TYPE,
    key_name: "",
    subnet_id: "",
    security_group_ids: [],
    user_data: "",
    tags: [],
    assign_public_ip: true,
    assign_ipv6: true,
    allow_all_traffic: true,
    availability_zone: "",
    blueprint_id: DEFAULT_AWS_FAILOVER_LIGHTSAIL_BLUEPRINT_ID,
    bundle_id: DEFAULT_AWS_FAILOVER_LIGHTSAIL_BUNDLE_ID,
    key_pair_name: "",
    ip_address_type: "dualstack",
  };
}

function defaultPlanPayload(provider: string, actionType: string) {
  if (provider === "aws") {
    if (actionType === "rebind_public_ip") {
      return {
        ...defaultAWSProvisionLikePayload(),
        instance_id: "",
        private_ip: "",
        instance_name: "",
        static_ip_name: "",
      };
    }

    return defaultAWSProvisionLikePayload();
  }

  if (provider === "digitalocean") {
    return {
      region: "",
      size: "",
      image: DEFAULT_DIGITALOCEAN_IMAGE,
      ipv6: false,
      root_password_mode: "random",
      root_password: "",
    };
  }

  if (provider === "linode") {
    return {
      region: "",
      type: "",
      image: DEFAULT_LINODE_IMAGE,
      root_password_mode: "random",
      root_password: "",
    };
  }

  return {};
}

function createEmptyPlanCatalog(
  provider: string,
  actionType: string,
  service = "",
  region = "",
  regions: FailoverCatalogOption[] = [],
): FailoverPlanCatalog {
  return {
    provider,
    action_type: actionType,
    service,
    region,
    regions,
    instances: [],
    availability_zones: [],
    images: [],
    instance_types: [],
    key_pairs: [],
    subnets: [],
    security_groups: [],
    bundles: [],
    blueprints: [],
    sizes: [],
    types: [],
  };
}

function keepPlanCatalogRegions(
  catalog: FailoverPlanCatalog | null,
  provider: string,
  actionType: string,
  service: string,
  region: string,
): FailoverPlanCatalog | null {
  if (!catalog || catalog.provider !== provider) {
    return createEmptyPlanCatalog(provider, actionType, service, region);
  }

  return createEmptyPlanCatalog(
    provider,
    actionType,
    service,
    region,
    Array.isArray(catalog.regions) ? catalog.regions : [],
  );
}

function mergeCatalogOptions(
  preferred: FailoverCatalogOption[] = [],
  loaded: FailoverCatalogOption[] = [],
) {
  const loadedByValue = new Map(
    loaded
      .map((option) => [String(option.value || "").trim(), option] as const)
      .filter(([value]) => Boolean(value)),
  );
  const seen = new Set<string>();
  const merged: FailoverCatalogOption[] = [];

  for (const option of preferred) {
    const value = String(option.value || "").trim();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    merged.push(loadedByValue.get(value) || option);
  }

  for (const option of loaded) {
    const value = String(option.value || "").trim();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    merged.push(option);
  }

  return merged;
}

function buildCommonDigitalOceanPlanCatalog(region = "") {
  return {
    ...createEmptyPlanCatalog("digitalocean", "provision_instance", "", region, COMMON_DIGITALOCEAN_REGIONS),
    sizes: COMMON_DIGITALOCEAN_SIZES,
    images: COMMON_DIGITALOCEAN_IMAGES,
  } satisfies FailoverPlanCatalog;
}

function mergeDigitalOceanPlanCatalogWithCommon(
  catalog: FailoverPlanCatalog | null,
  region = "",
) {
  const commonCatalog = buildCommonDigitalOceanPlanCatalog(region);
  if (!catalog || catalog.provider !== "digitalocean") {
    return commonCatalog;
  }

  return {
    ...catalog,
    region: catalog.region || region,
    regions: mergeCatalogOptions(commonCatalog.regions, catalog.regions),
    sizes: mergeCatalogOptions(commonCatalog.sizes, catalog.sizes),
    images: mergeCatalogOptions(commonCatalog.images, catalog.images),
  } satisfies FailoverPlanCatalog;
}

function buildCommonLinodePlanCatalog(region = "") {
  return {
    ...createEmptyPlanCatalog("linode", "provision_instance", "", region, COMMON_LINODE_REGIONS),
    types: COMMON_LINODE_TYPES,
    images: COMMON_LINODE_IMAGES,
  } satisfies FailoverPlanCatalog;
}

function mergeLinodePlanCatalogWithCommon(
  catalog: FailoverPlanCatalog | null,
  region = "",
) {
  const commonCatalog = buildCommonLinodePlanCatalog(region);
  if (!catalog || catalog.provider !== "linode") {
    return commonCatalog;
  }

  return {
    ...catalog,
    region: catalog.region || region,
    regions: mergeCatalogOptions(commonCatalog.regions, catalog.regions),
    types: mergeCatalogOptions(commonCatalog.types, catalog.types),
    images: mergeCatalogOptions(commonCatalog.images, catalog.images),
  } satisfies FailoverPlanCatalog;
}

function requirePlanField(
  t: TFunction,
  index: number,
  fieldLabel: string,
  value: unknown,
) {
  const normalized = getStringValue(value);
  if (!normalized) {
    throw new Error(
      t("failover.validation.plan_field_required", {
        defaultValue: "Plan {{index}} requires {{field}}",
        index: index + 1,
        field: fieldLabel,
      }),
    );
  }
  return normalized;
}

function validatePlanPayload(
  t: TFunction,
  index: number,
  provider: string,
  actionType: string,
  payload: Record<string, unknown>,
) {
  if (provider === "aws" && actionType === "provision_instance") {
    const service = normalizeAWSService(payload.service);
    requirePlanField(t, index, t("failover.editor.region", { defaultValue: "Region" }), payload.region);
    if (service === "ec2") {
      requirePlanField(t, index, t("failover.editor.image", { defaultValue: "Image" }), payload.image_id);
      requirePlanField(t, index, t("failover.editor.instance_type", { defaultValue: "Instance type" }), payload.instance_type);
      return;
    }
    requirePlanField(t, index, t("failover.editor.availability_zone", { defaultValue: "Availability zone" }), payload.availability_zone);
    requirePlanField(t, index, t("failover.editor.blueprint", { defaultValue: "Blueprint" }), payload.blueprint_id);
    requirePlanField(t, index, t("failover.editor.bundle", { defaultValue: "Bundle" }), payload.bundle_id);
    return;
  }

  if (provider === "aws" && actionType === "rebind_public_ip") {
    requirePlanField(t, index, t("failover.editor.region", { defaultValue: "Region" }), payload.region);
    const service = normalizeAWSService(payload.service);
    if (service === "ec2") {
      requirePlanField(t, index, t("failover.editor.image", { defaultValue: "Image" }), payload.image_id);
      requirePlanField(t, index, t("failover.editor.instance_type", { defaultValue: "Instance type" }), payload.instance_type);
      return;
    }
    requirePlanField(t, index, t("failover.editor.availability_zone", { defaultValue: "Availability zone" }), payload.availability_zone);
    requirePlanField(t, index, t("failover.editor.blueprint", { defaultValue: "Blueprint" }), payload.blueprint_id);
    requirePlanField(t, index, t("failover.editor.bundle", { defaultValue: "Bundle" }), payload.bundle_id);
    return;
  }

  if (provider === "digitalocean" && actionType === "provision_instance") {
    requirePlanField(t, index, t("failover.editor.region", { defaultValue: "Region" }), payload.region);
    requirePlanField(t, index, t("failover.editor.size", { defaultValue: "Size" }), payload.size);
    requirePlanField(t, index, t("failover.editor.image", { defaultValue: "Image" }), payload.image);
    return;
  }

  if (provider === "linode" && actionType === "provision_instance") {
    requirePlanField(t, index, t("failover.editor.region", { defaultValue: "Region" }), payload.region);
    requirePlanField(t, index, t("failover.editor.type", { defaultValue: "Plan type" }), payload.type);
    requirePlanField(t, index, t("failover.editor.image", { defaultValue: "Image" }), payload.image);
  }
}

function normalizePlanPayloadForSubmit(
  provider: string,
  actionType: string,
  payload: Record<string, unknown>,
) {
  const nextPayload = { ...payload };

  if (provider === "aws" && actionType === "provision_instance") {
    const service = normalizeAWSService(nextPayload.service);
    const region = getStringValue(nextPayload.region);
    nextPayload.service = service;
    nextPayload.region = region;
    nextPayload.name = getStringValue(nextPayload.name);
    nextPayload.user_data = typeof nextPayload.user_data === "string" ? String(nextPayload.user_data).trim() : "";
    nextPayload.tags = getAWSTagArrayValue(nextPayload.tags);
    nextPayload.allow_all_traffic = getBooleanValue(nextPayload.allow_all_traffic, true);

    if (service === "ec2") {
      nextPayload.image_id = getStringValue(nextPayload.image_id) || DEFAULT_AWS_FAILOVER_EC2_IMAGE_ID;
      nextPayload.instance_type = getStringValue(nextPayload.instance_type) || DEFAULT_AWS_FAILOVER_EC2_INSTANCE_TYPE;
      nextPayload.key_name = getStringValue(nextPayload.key_name);
      nextPayload.subnet_id = getStringValue(nextPayload.subnet_id);
      nextPayload.security_group_ids = getStringArrayValue(nextPayload.security_group_ids);
      nextPayload.assign_public_ip = getBooleanValue(nextPayload.assign_public_ip, true);
      nextPayload.assign_ipv6 = getBooleanValue(nextPayload.assign_ipv6, true);
      return nextPayload;
    }

    nextPayload.availability_zone = getStringValue(nextPayload.availability_zone) || getDefaultLightsailAvailabilityZone(region);
    nextPayload.blueprint_id = getStringValue(nextPayload.blueprint_id) || DEFAULT_AWS_FAILOVER_LIGHTSAIL_BLUEPRINT_ID;
    nextPayload.bundle_id = getStringValue(nextPayload.bundle_id) || DEFAULT_AWS_FAILOVER_LIGHTSAIL_BUNDLE_ID;
    nextPayload.key_pair_name = getStringValue(nextPayload.key_pair_name);
    nextPayload.ip_address_type = getStringValue(nextPayload.ip_address_type) || "dualstack";
    return nextPayload;
  }

  if (provider === "aws" && actionType === "rebind_public_ip") {
    const service = normalizeAWSService(nextPayload.service);
    const region = getStringValue(nextPayload.region);
    nextPayload.service = service;
    nextPayload.region = region;
    nextPayload.name = getStringValue(nextPayload.name);
    nextPayload.user_data = typeof nextPayload.user_data === "string" ? String(nextPayload.user_data).trim() : "";
    nextPayload.tags = getAWSTagArrayValue(nextPayload.tags);
    nextPayload.instance_id = getStringValue(nextPayload.instance_id);
    nextPayload.private_ip = getStringValue(nextPayload.private_ip);
    nextPayload.instance_name = getStringValue(nextPayload.instance_name);
    nextPayload.static_ip_name = getStringValue(nextPayload.static_ip_name);
    nextPayload.allow_all_traffic = getBooleanValue(nextPayload.allow_all_traffic, true);

    if (service === "ec2") {
      nextPayload.image_id = getStringValue(nextPayload.image_id) || DEFAULT_AWS_FAILOVER_EC2_IMAGE_ID;
      nextPayload.instance_type = getStringValue(nextPayload.instance_type) || DEFAULT_AWS_FAILOVER_EC2_INSTANCE_TYPE;
      nextPayload.key_name = getStringValue(nextPayload.key_name);
      nextPayload.subnet_id = getStringValue(nextPayload.subnet_id);
      nextPayload.security_group_ids = getStringArrayValue(nextPayload.security_group_ids);
      nextPayload.assign_public_ip = getBooleanValue(nextPayload.assign_public_ip, true);
      nextPayload.assign_ipv6 = getBooleanValue(nextPayload.assign_ipv6, true);
      return nextPayload;
    }

    nextPayload.availability_zone = getStringValue(nextPayload.availability_zone) || getDefaultLightsailAvailabilityZone(region);
    nextPayload.blueprint_id = getStringValue(nextPayload.blueprint_id) || DEFAULT_AWS_FAILOVER_LIGHTSAIL_BLUEPRINT_ID;
    nextPayload.bundle_id = getStringValue(nextPayload.bundle_id) || DEFAULT_AWS_FAILOVER_LIGHTSAIL_BUNDLE_ID;
    nextPayload.key_pair_name = getStringValue(nextPayload.key_pair_name);
    nextPayload.ip_address_type = getStringValue(nextPayload.ip_address_type) || "dualstack";
    return nextPayload;
  }

  if (provider === "digitalocean" && actionType === "provision_instance") {
    const rootPassword = getStringValue(nextPayload.root_password);
    nextPayload.image = getStringValue(nextPayload.image) || DEFAULT_DIGITALOCEAN_IMAGE;
    nextPayload.root_password = rootPassword;
    nextPayload.root_password_mode = rootPassword ? "custom" : "random";
    nextPayload.ipv6 = getBooleanValue(nextPayload.ipv6, false);
    return nextPayload;
  }

  if (provider === "linode" && actionType === "provision_instance") {
    const rootPassword = getStringValue(nextPayload.root_password);
    nextPayload.image = getStringValue(nextPayload.image) || DEFAULT_LINODE_IMAGE;
    nextPayload.root_password = rootPassword;
    nextPayload.root_password_mode = rootPassword ? "custom" : "random";
    return nextPayload;
  }

  return nextPayload;
}

function numberOrDefault(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function compareString(left: string, right: string) {
  return left.localeCompare(right, "zh-CN", { sensitivity: "base" });
}

function normalizePlanScriptClipboardIDs(values: string[]) {
  return Array.from(new Set(
    values
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  ));
}

function moveItemInArray<T>(values: T[], currentIndex: number, targetIndex: number) {
  if (currentIndex < 0 || currentIndex >= values.length) {
    return values;
  }
  if (targetIndex < 0 || targetIndex >= values.length || targetIndex === currentIndex) {
    return values;
  }

  const nextValues = [...values];
  const [movedValue] = nextValues.splice(currentIndex, 1);
  nextValues.splice(targetIndex, 0, movedValue);
  return nextValues;
}

function splitScriptSnapshotNames(value: string) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getNodeLabel(node: FailoverNodeOption) {
  const address = node.ipv4 || node.ipv6;
  const suffix = address ? ` · ${address}` : "";
  const group = node.group ? ` [${node.group}]` : "";
  return `${node.name || node.uuid}${group}${suffix}`;
}

function getStatusVariant(
  status: string,
  kind: "probe" | "execution" | "script" | "dns" | "cleanup",
): React.ComponentProps<typeof Badge>["variant"] {
  const normalized = String(status || "").trim().toLowerCase();

  if (kind === "probe") {
    if (["ok", "healthy"].includes(normalized)) return "success";
    if (["blocked_suspected", "failed"].includes(normalized)) return "destructive";
    if (["degraded", "warning", "error"].includes(normalized)) return "warning";
    return "secondary";
  }

  if (kind === "execution") {
    if (normalized === "success") return "success";
    if (normalized === "failed") return "destructive";
    if (normalized === "retry") return "info";
    if (isFailoverExecutionActive(normalized)) return "info";
    return "secondary";
  }

  if (kind === "script") {
    if (normalized === "success") return "success";
    if (["failed", "timeout"].includes(normalized)) return "destructive";
    if (normalized === "running") return "info";
    if (normalized === "skipped") return "outline";
    return "secondary";
  }

  if (kind === "dns" || kind === "cleanup") {
    if (normalized === "success") return "success";
    if (normalized === "failed") return "destructive";
    if (normalized === "warning") return "warning";
    if (normalized === "skipped") return "outline";
    return "secondary";
  }

  return "secondary";
}

function getPreviewStatusVariant(status: string): React.ComponentProps<typeof Badge>["variant"] {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "success") return "success";
  if (normalized === "error") return "destructive";
  if (normalized === "warning") return "warning";
  if (normalized === "info") return "info";
  return "secondary";
}

function getPreviewStatusLabel(t: TFunction, status: string) {
  const normalized = String(status || "").trim().toLowerCase();
  switch (normalized) {
    case "success":
      return t("common.success", { defaultValue: "Success" });
    case "warning":
      return t("common.warning", { defaultValue: "Warning" });
    case "error":
      return t("common.error", { defaultValue: "Error" });
    case "info":
      return t("common.info", { defaultValue: "Info" });
    default:
      return humanizeStatus(normalized || "unknown");
  }
}

type FailoverPreviewSummary = {
  total: number;
  successCount: number;
  warningCount: number;
  errorCount: number;
  infoCount: number;
};

function getFailoverPreviewChecks(preview: FailoverTaskPreview | null) {
  if (!preview) {
    return [] as FailoverPreviewCheck[];
  }

  return [
    ...preview.checks,
    ...preview.plans.flatMap((plan) => plan.checks),
  ];
}

function summarizeFailoverPreview(preview: FailoverTaskPreview | null): FailoverPreviewSummary {
  const summary: FailoverPreviewSummary = {
    total: 0,
    successCount: 0,
    warningCount: 0,
    errorCount: 0,
    infoCount: 0,
  };

  for (const check of getFailoverPreviewChecks(preview)) {
    summary.total += 1;
    const normalized = String(check.status || "").trim().toLowerCase();
    if (normalized === "success") {
      summary.successCount += 1;
    } else if (normalized === "warning") {
      summary.warningCount += 1;
    } else if (normalized === "error") {
      summary.errorCount += 1;
    } else if (normalized === "info") {
      summary.infoCount += 1;
    }
  }

  return summary;
}

function normalizeEntries(entries: ProviderEntry[]) {
  return [...entries]
    .map((entry) => ({
      ...entry,
      id: normalizeProviderEntryID(String(entry.id || "")),
      name: String(entry.name || "").trim(),
      group: String(entry.group || "").trim(),
      active: Boolean(entry.active),
    }))
    .sort((left, right) => {
      if (Boolean(left.active) !== Boolean(right.active)) {
        return left.active ? -1 : 1;
      }
      return compareString(left.name || left.id, right.name || right.id);
    });
}

function buildProviderEntryOptions(args: {
  entries: ProviderEntry[];
  includeActive?: boolean;
  currentValue?: string;
  activeLabel?: string;
}) {
  const options: ProviderEntryOption[] = [];
  const seen = new Set<string>();

  if (args.includeActive && args.entries.length > 0) {
    options.push({
      id: "active",
      label: args.activeLabel || "Active credential",
    });
    seen.add("active");
  }

  for (const entry of args.entries) {
    const id = normalizeProviderEntryID(String(entry.id || "").trim());
    if (!id || seen.has(id)) {
      continue;
    }
    const label = String(entry.name || id).trim() || id;
    options.push({ id, label });
    seen.add(id);
  }

  const currentValue = String(args.currentValue || "").trim();
  if (currentValue && !seen.has(currentValue)) {
    options.push({ id: currentValue, label: currentValue });
  }

  return options;
}

function buildPlanProviderEntryOptions(
  t: TFunction,
  provider: string,
  providerEntries: ProviderEntriesMap,
  entryGroup: string,
  currentValue: string,
) {
  const entries = entryGroup.trim()
    ? (providerEntries[provider] || []).filter((entry) => String(entry.group || "").trim() === entryGroup.trim())
    : providerEntries[provider] || [];
  const activeEntry = entries.find((entry) => entry.active);
  return buildProviderEntryOptions({
    entries,
    includeActive: entries.length > 0,
    currentValue,
    activeLabel: activeEntry
      ? t("failover.editor.provider_entry_active_named", {
        defaultValue: "Use active entry ({{name}})",
        name: activeEntry.name || activeEntry.id,
      })
      : t("failover.editor.provider_entry_active", {
        defaultValue: "Use active entry",
      }),
  });
}

function getProviderEntryGroups(
  providerEntries: ProviderEntriesMap,
  provider: string,
) {
  return Array.from(
    new Set(
      (providerEntries[provider] || [])
        .map((entry) => String(entry.group || "").trim())
        .filter(Boolean),
    ),
  ).sort(compareString);
}

function resolvePlanProviderPoolGroup(
  provider: string,
  providerEntries: ProviderEntriesMap,
  entryGroup: string,
  entryID: string,
) {
  const normalizedGroup = getStringValue(entryGroup);
  if (normalizedGroup) {
    return normalizedGroup;
  }

  const normalizedEntryID = normalizePlanProviderEntryID(provider, entryID);
  if (!normalizedEntryID || normalizedEntryID === AUTOMATIC_PROVIDER_ENTRY_ID) {
    return "";
  }

  const matched = (providerEntries[provider] || []).find(
    (entry) => normalizeProviderEntryID(String(entry.id || "").trim()) === normalizedEntryID,
  );
  return getStringValue(matched?.group);
}

function buildSuggestedAutoConnectGroup(
  provider: string,
  providerEntries: ProviderEntriesMap,
  entryGroup: string,
  entryID: string,
) {
  const normalizedProvider = getStringValue(provider).toLowerCase();
  const normalizedGroup = resolvePlanProviderPoolGroup(
    provider,
    providerEntries,
    entryGroup,
    entryID,
  );
  if (!normalizedProvider || !normalizedGroup) {
    return "";
  }
  return `${normalizedProvider}/${normalizedGroup}`;
}

function shouldSyncAutoConnectGroup(
  plan: Pick<PlanFormState, "provider" | "provider_entry_group" | "provider_entry_id" | "auto_connect_group">,
  providerEntries: ProviderEntriesMap,
) {
  const currentGroup = getStringValue(plan.auto_connect_group);
  if (!currentGroup) {
    return true;
  }
  return currentGroup === buildSuggestedAutoConnectGroup(
    plan.provider,
    providerEntries,
    plan.provider_entry_group,
    plan.provider_entry_id,
  );
}

function applySuggestedAutoConnectGroup(
  plan: PlanFormState,
  providerEntries: ProviderEntriesMap,
  overrides: Partial<PlanFormState>,
) {
  const nextPlan = {
    ...plan,
    ...overrides,
  };
  if (!shouldSyncAutoConnectGroup(plan, providerEntries)) {
    return nextPlan;
  }
  return {
    ...nextPlan,
    auto_connect_group: buildSuggestedAutoConnectGroup(
      nextPlan.provider,
      providerEntries,
      nextPlan.provider_entry_group,
      nextPlan.provider_entry_id,
    ),
  };
}

function getFirstConfiguredProvider(
  providerEntries: ProviderEntriesMap,
  providers: readonly string[],
) {
  return providers.find((provider) => (providerEntries[provider] || []).length > 0) || "";
}

function getProviderEntryValues(
  providerEntries: ProviderEntriesMap,
  provider: string,
  entryID: string,
): EntryValues {
  const normalizedEntryID = normalizeProviderEntryID(String(entryID || "").trim());
  const entries = providerEntries[provider] || [];
  const matched = entries.find((entry) => normalizeProviderEntryID(String(entry.id || "").trim()) === normalizedEntryID);
  return matched?.values && typeof matched.values === "object"
    ? matched.values as EntryValues
    : {};
}

function normalizePlanProviderEntryID(provider: string, entryID: string) {
  const normalizedProvider = String(provider || "").trim().toLowerCase();
  const normalizedEntryID = normalizeProviderEntryID(String(entryID || "").trim());
  if (
    ["aws", "digitalocean", "linode"].includes(normalizedProvider)
    && (!normalizedEntryID || normalizedEntryID === "default")
  ) {
    return AUTOMATIC_PROVIDER_ENTRY_ID;
  }
  return normalizedEntryID;
}

function buildDefaultDnsFields(
  provider: string,
  providerEntries: ProviderEntriesMap,
  entryID: string,
) {
  const entryValues = getProviderEntryValues(providerEntries, provider, entryID);
  return {
    dns_zone_name: getStringValue(entryValues.zone_name),
    dns_record_name: "",
    dns_record_type: "A",
    dns_ttl: provider === "aliyun" ? "600" : "120",
    dns_proxied: getBooleanValue(entryValues.proxied, false),
    dns_domain_name: getStringValue(entryValues.domain_name),
    dns_rr: "@",
    dns_line: "default",
    dns_lines: ["default"],
    dns_sync_ipv6: false,
  };
}

async function getFailoverProviderEntries(provider: string): Promise<ProviderEntry[]> {
  if (provider === "aws") {
    const pool = await getAWSCredentials();
    return normalizeEntries(pool.credentials.map((credential) => ({
      id: credential.id,
      name: credential.name,
      group: credential.group,
      active: credential.is_active,
      values: {
        default_region: credential.default_region,
      },
    })));
  }

  if (provider === "digitalocean") {
    const pool = await getDigitalOceanTokens();
    return normalizeEntries(pool.tokens.map((token) => ({
      id: token.id,
      name: token.name,
      group: token.group,
      active: token.is_active,
      values: {},
    })));
  }

  if (provider === "linode") {
    const pool = await getLinodeTokens();
    return normalizeEntries(pool.tokens.map((token) => ({
      id: token.id,
      name: token.name,
      group: token.group,
      active: token.is_active,
      values: {},
    })));
  }

  return normalizeEntries(await getCloudProviderEntries(provider));
}

function applyDnsCatalogDefaults(
  current: TaskFormState,
  catalog: FailoverDnsCatalog | null | undefined,
) {
  if (!catalog) {
    return current;
  }

  const nextState = { ...current };
  if (catalog.provider === "cloudflare") {
    if (!nextState.dns_zone_name.trim()) {
      nextState.dns_zone_name = catalog.defaults.zone_name || "";
    }
    if (catalog.defaults.proxied !== null && !nextState.dns_proxied) {
      nextState.dns_proxied = Boolean(catalog.defaults.proxied);
    }
  }

  if (catalog.provider === "aliyun" && !nextState.dns_domain_name.trim()) {
    nextState.dns_domain_name = catalog.defaults.domain_name || "";
  }

  return nextState;
}

function toCloudflareRecordInput(recordName: string, zoneName: string) {
  const normalizedRecordName = String(recordName || "").trim();
  const normalizedZoneName = String(zoneName || "").trim();
  if (!normalizedRecordName) {
    return "";
  }
  if (!normalizedZoneName) {
    return normalizedRecordName;
  }
  if (normalizedRecordName === normalizedZoneName) {
    return "@";
  }
  const suffix = `.${normalizedZoneName}`;
  if (normalizedRecordName.endsWith(suffix)) {
    return normalizedRecordName.slice(0, -suffix.length);
  }
  return normalizedRecordName;
}

function normalizeAliyunRRInput(domainName: string, rr: string) {
  const normalizedDomain = String(domainName || "").trim().replace(/\.+$/, "");
  let normalizedRR = String(rr || "").trim().replace(/\.+$/, "");
  if (!normalizedRR || normalizedRR === "@") {
    return "@";
  }
  if (!normalizedDomain) {
    return normalizedRR;
  }
  if (normalizedRR.toLowerCase() === normalizedDomain.toLowerCase()) {
    return "@";
  }
  const suffix = `.${normalizedDomain}`;
  if (normalizedRR.length > suffix.length && normalizedRR.toLowerCase().endsWith(suffix.toLowerCase())) {
    normalizedRR = normalizedRR.slice(0, -suffix.length).trim();
    if (!normalizedRR || normalizedRR === "@") {
      return "@";
    }
  }
  return normalizedRR;
}

function fillDnsFieldsFromRecord(
  current: TaskFormState,
  record: FailoverDnsRecordOption,
) {
  const nextState = { ...current };
  if (current.dns_provider === "cloudflare") {
    nextState.dns_zone_name = record.zone_name || nextState.dns_zone_name;
    nextState.dns_record_name = toCloudflareRecordInput(record.name, record.zone_name || nextState.dns_zone_name) || nextState.dns_record_name;
    nextState.dns_record_type = normalizeDnsRecordType(record.type) || nextState.dns_record_type;
    nextState.dns_ttl = String(record.ttl || numberOrDefault(nextState.dns_ttl, 120));
    if (record.proxied !== null) {
      nextState.dns_proxied = Boolean(record.proxied);
    }
    return nextState;
  }

  nextState.dns_domain_name = record.domain_name || nextState.dns_domain_name;
  nextState.dns_rr = record.rr || nextState.dns_rr;
  nextState.dns_record_type = normalizeDnsRecordType(record.type) || nextState.dns_record_type;
  nextState.dns_ttl = String(record.ttl || numberOrDefault(nextState.dns_ttl, 600));
  nextState.dns_line = record.line || nextState.dns_line;
  nextState.dns_lines = record.lines.length > 0
    ? [...record.lines]
    : record.line
      ? [record.line]
      : nextState.dns_lines;
  return nextState;
}

function collectAliyunRecordLines(
  records: FailoverDnsRecordOption[],
  selectedRecord: FailoverDnsRecordOption,
) {
  const relatedLines = records
    .filter((record) =>
      record.domain_name === selectedRecord.domain_name
      && record.rr === selectedRecord.rr
      && normalizeDnsRecordType(record.type) === normalizeDnsRecordType(selectedRecord.type)
      && record.value === selectedRecord.value
      && record.ttl === selectedRecord.ttl,
    )
    .map((record) => record.line)
    .filter(Boolean);

  const deduped = Array.from(new Set(relatedLines));
  if (deduped.length > 0) {
    return deduped;
  }
  return selectedRecord.line ? [selectedRecord.line] : [];
}

function toggleDnsLineSelection(current: string[], value: string, checked: boolean) {
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) {
    return current;
  }
  if (checked) {
    return current.includes(normalizedValue) ? current : [...current, normalizedValue];
  }
  const next = current.filter((item) => item !== normalizedValue);
  return next.length > 0 ? next : ["default"];
}

function dnsRecordSummary(t: TFunction, record: FailoverDnsRecordOption) {
  const left = record.name || joinRecordName(record.domain_name, record.rr);
  const right = [
    record.type,
    record.value,
    record.line ? localizeAliyunLineLabel(t, record.line) : "",
  ].filter(Boolean).join(" · ");
  return [left, right].filter(Boolean).join(" · ");
}

function getDnsRecordKey(record: FailoverDnsRecordOption) {
  return [
    record.id,
    record.name,
    record.domain_name,
    record.rr,
    record.type,
    record.line,
  ].join("|");
}

function joinRecordName(domainName: string, rr: string) {
  const normalizedDomain = String(domainName || "").trim();
  const normalizedRR = String(rr || "").trim();
  if (!normalizedRR || normalizedRR === "@") {
    return normalizedDomain;
  }
  if (!normalizedDomain) {
    return normalizedRR;
  }
  return `${normalizedRR}.${normalizedDomain}`;
}

function joinCloudflareRecordName(zoneName: string, recordName: string) {
  const normalizedZone = String(zoneName || "").trim();
  const normalizedRecord = String(recordName || "").trim();
  if (!normalizedRecord || normalizedRecord === "@") {
    return normalizedZone;
  }
  if (!normalizedZone || normalizedRecord === normalizedZone || normalizedRecord.endsWith(`.${normalizedZone}`)) {
    return normalizedRecord;
  }
  return `${normalizedRecord}.${normalizedZone}`;
}

function getTaskDnsTargetLabel(task: FailoverTask) {
  const raw = task.dns_payload && typeof task.dns_payload === "object"
    ? task.dns_payload as Record<string, unknown>
    : {};

  if (task.dns_provider === "cloudflare") {
    return joinCloudflareRecordName(getStringValue(raw.zone_name), getStringValue(raw.record_name));
  }
  if (task.dns_provider === "aliyun") {
    const domainName = getStringValue(raw.domain_name);
    return joinRecordName(domainName, normalizeAliyunRRInput(domainName, getStringValue(raw.rr)));
  }
  return "";
}

function collectDnsResultRecordTypes(value: unknown) {
  const types = new Set<string>();
  const appendType = (entry: unknown) => {
    const raw = entry && typeof entry === "object"
      ? entry as Record<string, unknown>
      : {};
    const recordType = normalizeDnsRecordType(getStringValue(raw.type));
    if (recordType) {
      types.add(recordType);
    }
  };

  appendType(value);

  const raw = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  if (Array.isArray(raw.records)) {
    raw.records.forEach(appendType);
  }

  return types;
}

function collectDnsResultSkippedTypes(value: unknown) {
  const raw = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  return new Set(
    getStringArrayValue(raw.skipped_types)
      .map((item) => normalizeDnsRecordType(item))
      .filter(Boolean),
  );
}

function getTaskDnsIPv6Badge(
  t: TFunction,
  task: FailoverTask,
  latestExecution: FailoverTask["latest_execution"],
) {
  if (!task.dns_provider) {
    return null;
  }

  const raw = task.dns_payload && typeof task.dns_payload === "object"
    ? task.dns_payload as Record<string, unknown>
    : {};
  const syncMode = getDnsSyncMode(
    getStringValue(raw.record_type),
    getBooleanValue(raw.sync_ipv6),
  );
  if (syncMode === "ipv4") {
    return null;
  }

  if (!latestExecution) {
    return {
      variant: "outline" as const,
      title: t("failover.task.ipv6_pending", {
        defaultValue: "IPv6 sync has not completed yet.",
      }),
    };
  }

  const dnsStatus = String(latestExecution.dns_status || "").trim().toLowerCase();
  if (dnsStatus === "failed") {
    return {
      variant: "destructive" as const,
      title: t("failover.task.ipv6_failed", {
        defaultValue: "IPv6 / AAAA sync failed in the latest DNS run.",
      }),
    };
  }
  if (dnsStatus === "skipped") {
    return {
      variant: "outline" as const,
      title: t("failover.task.ipv6_pending", {
        defaultValue: "IPv6 sync has not completed yet.",
      }),
    };
  }

  const recordTypes = collectDnsResultRecordTypes(latestExecution.dns_result);
  const skippedTypes = collectDnsResultSkippedTypes(latestExecution.dns_result);
  if (recordTypes.has("AAAA")) {
    return {
      variant: "success" as const,
      title: t("failover.task.ipv6_success", {
        defaultValue: "AAAA synced successfully.",
      }),
    };
  }
  if (skippedTypes.has("AAAA")) {
    return {
      variant: "warning" as const,
      title: t("failover.task.ipv6_skipped", {
        defaultValue: "The new outlet has no IPv6, so AAAA was skipped.",
      }),
    };
  }
  if (syncMode === "ipv6" && dnsStatus === "success") {
    return {
      variant: "success" as const,
      title: t("failover.task.ipv6_success", {
        defaultValue: "AAAA synced successfully.",
      }),
    };
  }

  return {
    variant: isFailoverExecutionActive(latestExecution.status) ? "info" as const : "outline" as const,
    title: t("failover.task.ipv6_pending", {
      defaultValue: "IPv6 sync has not completed yet.",
    }),
  };
}

function getDnsTaskStatusLabel(t: TFunction, status: string) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "success") {
    return t("failover.task.dns_success", { defaultValue: "DNS resolved" });
  }
  if (normalized === "failed") {
    return t("failover.task.dns_failed", { defaultValue: "DNS failed" });
  }
  if (normalized === "skipped") {
    return t("failover.task.dns_skipped", { defaultValue: "DNS skipped" });
  }
  if (!normalized) {
    return t("failover.task.dns_pending", { defaultValue: "DNS pending" });
  }
  return getStatusLabel(t, status);
}

function getTaskScriptStatusLabel(
  t: TFunction,
  status: string,
  hasConfiguredScript: boolean,
  hasExecution: boolean,
) {
  const normalized = String(status || "").trim().toLowerCase();
  if (!hasConfiguredScript) {
    return t("failover.task.script_none", { defaultValue: "No script" });
  }
  if (!hasExecution && !normalized) {
    return t("failover.task.script_pending", { defaultValue: "Not run yet" });
  }
  if (!normalized) {
    return t("failover.task.script_pending", { defaultValue: "Not run yet" });
  }
  return getStatusLabel(t, status);
}

type TaskRiskBadge = {
  key: string;
  label: string;
  variant: React.ComponentProps<typeof Badge>["variant"];
  title: string;
};

function getFailoverTaskRiskBadges(
  t: TFunction,
  latestExecution: FailoverTask["latest_execution"],
  cleanupInfo: CleanupResultInfo | null,
) {
  if (!latestExecution) {
    return [] as TaskRiskBadge[];
  }

  const badges: TaskRiskBadge[] = [];
  const executionActive = isFailoverExecutionActive(latestExecution.status);
  const dnsStatus = String(latestExecution.dns_status || "").trim().toLowerCase();
  const cleanupStatus = String(latestExecution.cleanup_status || "").trim().toLowerCase();
  const cleanupClassification = String(cleanupInfo?.classification || "").trim().toLowerCase();
  const cleanupDescription = [cleanupInfo?.description, cleanupInfo?.errorMessage].filter(Boolean).join(" ");

  if (dnsStatus === "failed") {
    badges.push({
      key: "dns-failed",
      label: t("failover.task.risk_dns_failed", { defaultValue: "DNS failed" }),
      variant: "destructive",
      title: latestExecution.error_message || getDnsTaskStatusLabel(t, latestExecution.dns_status),
    });
  }

  if (cleanupClassification === "instance_confirmed_delete_failed") {
    badges.push({
      key: "cleanup-billing-risk",
      label: t("failover.task.risk_cleanup_billing", { defaultValue: "Old instance may still bill" }),
      variant: "destructive",
      title: cleanupDescription || cleanupInfo?.title || "",
    });
  } else if (["provider_entry_missing", "provider_entry_unhealthy", "cleanup_status_unknown"].includes(cleanupClassification)) {
    badges.push({
      key: "cleanup-review",
      label: t("failover.task.risk_cleanup_review", { defaultValue: "Cleanup needs review" }),
      variant: "warning",
      title: cleanupDescription || cleanupInfo?.title || "",
    });
  }

  const retryDNSAvailable = !executionActive && dnsStatus === "failed";
  const retryCleanupAvailable = (
    !executionActive
    && String(latestExecution.dns_status || "").trim().toLowerCase() === "success"
    && ["pending", "failed", "warning"].includes(cleanupStatus)
    && ![
      "not_requested",
      "instance_deleted",
      "instance_missing",
      "provider_entry_missing",
      "provider_entry_unhealthy",
    ].includes(cleanupClassification)
  );

  if (retryDNSAvailable || retryCleanupAvailable) {
    badges.push({
      key: "retry-available",
      label: retryDNSAvailable && retryCleanupAvailable
        ? t("failover.task.risk_retry_available", { defaultValue: "Retry available" })
        : retryDNSAvailable
          ? t("failover.task.risk_retry_dns", { defaultValue: "Retry DNS" })
          : t("failover.task.risk_retry_cleanup", { defaultValue: "Retry cleanup" }),
      variant: "info",
      title: retryDNSAvailable && retryCleanupAvailable
        ? t("failover.task.risk_retry_available_hint", {
          defaultValue: "The latest execution looks eligible for step-level retry actions.",
        })
        : retryDNSAvailable
          ? t("failover.task.risk_retry_dns_hint", {
            defaultValue: "The latest execution can retry the DNS step without reprovisioning.",
          })
          : t("failover.task.risk_retry_cleanup_hint", {
            defaultValue: "The latest execution can retry old-instance cleanup.",
          }),
    });
  }

  return badges;
}

function parseDnsPayloadFields(
  task: FailoverTask,
  providerEntries: ProviderEntriesMap,
) {
  if (!task.dns_provider) {
    return buildDefaultDnsFields("", providerEntries, "");
  }

  const raw = task.dns_payload && typeof task.dns_payload === "object"
    ? task.dns_payload as Record<string, unknown>
    : {};
  const defaults = buildDefaultDnsFields(task.dns_provider, providerEntries, normalizeProviderEntryID(task.dns_entry_id));

  if (task.dns_provider === "cloudflare") {
    return {
      ...defaults,
      dns_zone_name: getStringValue(raw.zone_name) || defaults.dns_zone_name,
      dns_record_name: toCloudflareRecordInput(
        getStringValue(raw.record_name),
        getStringValue(raw.zone_name) || defaults.dns_zone_name,
      ),
      dns_record_type: normalizeDnsRecordType(getStringValue(raw.record_type)) || defaults.dns_record_type,
      dns_ttl: String(getNumberValue(raw.ttl, numberOrDefault(defaults.dns_ttl, 120))),
      dns_proxied: typeof raw.proxied === "boolean" ? raw.proxied : defaults.dns_proxied,
      dns_sync_ipv6: getBooleanValue(raw.sync_ipv6, defaults.dns_sync_ipv6),
    };
  }

  return {
    ...defaults,
    dns_domain_name: getStringValue(raw.domain_name) || defaults.dns_domain_name,
    dns_rr: normalizeAliyunRRInput(
      getStringValue(raw.domain_name) || defaults.dns_domain_name,
      getStringValue(raw.rr) || defaults.dns_rr,
    ),
    dns_record_type: normalizeDnsRecordType(getStringValue(raw.record_type)) || defaults.dns_record_type,
    dns_ttl: String(getNumberValue(raw.ttl, numberOrDefault(defaults.dns_ttl, 600))),
    dns_line: getStringValue(raw.line) || defaults.dns_line,
    dns_lines: (() => {
      const normalized = getStringArrayValue(raw.lines);
      if (normalized.length > 0) {
        return normalized;
      }
      const single = getStringValue(raw.line);
      return single ? [single] : defaults.dns_lines;
    })(),
    dns_sync_ipv6: getBooleanValue(raw.sync_ipv6, defaults.dns_sync_ipv6),
  };
}

function createEmptyPlanForm(providerEntries: ProviderEntriesMap): PlanFormState {
  const defaultProvider = getFirstConfiguredProvider(providerEntries, PLAN_PROVIDER_VALUES);
  const defaultActionType = getDefaultPlanActionType(defaultProvider);

  return {
    local_id: createLocalID(),
    name: "",
    priority: "1",
    enabled: true,
    provider: defaultProvider,
    provider_entry_id: AUTOMATIC_PROVIDER_ENTRY_ID,
    provider_entry_group: "",
    action_type: defaultActionType,
    payload: prettyJson(defaultPlanPayload(defaultProvider, defaultActionType)),
    auto_connect_group: buildSuggestedAutoConnectGroup(
      defaultProvider,
      providerEntries,
      "",
      AUTOMATIC_PROVIDER_ENTRY_ID,
    ),
    script_clipboard_ids: [],
    script_timeout_sec: "600",
    wait_agent_timeout_sec: "600",
  };
}

function renumberPlanPriorities(plans: PlanFormState[]) {
  return plans.map((plan, index) => ({
    ...plan,
    priority: String(index + 1),
  }));
}

function createEmptyTaskForm(providerEntries: ProviderEntriesMap): TaskFormState {
  const defaultProvider = "";
  const dnsOptions = buildProviderEntryOptions({
    entries: providerEntries[defaultProvider] || [],
  });
  const defaultEntryID = dnsOptions[0]?.id || "";
  const dnsDefaults = buildDefaultDnsFields(defaultProvider, providerEntries, defaultEntryID);
  const defaultPlan = createEmptyPlanForm(providerEntries);

  return {
    name: "",
    enabled: true,
    current_client_uuid: "",
    failure_threshold: "2",
    stale_after_seconds: "300",
    cooldown_seconds: "1800",
    provision_retry_limit: "6",
    provision_failure_fallback_limit: "3",
    dns_provider: defaultProvider,
    dns_entry_id: defaultEntryID,
    ...dnsDefaults,
    delete_strategy: resolveTaskDeleteStrategy("", [defaultPlan]),
    delete_delay_seconds: "0",
    plans: [defaultPlan],
  };
}

function taskToForm(task: FailoverTask, providerEntries: ProviderEntriesMap): TaskFormState {
  const dnsFields = parseDnsPayloadFields(task, providerEntries);
  const plans = task.plans.length > 0
    ? renumberPlanPriorities(
      [...task.plans]
        .sort((left, right) => {
          const priorityDiff = (left.priority || Number.MAX_SAFE_INTEGER) - (right.priority || Number.MAX_SAFE_INTEGER);
          if (priorityDiff !== 0) {
            return priorityDiff;
          }
          return left.id - right.id;
        })
        .map((plan) => ({
        action_type: normalizePlanActionTypeForProvider(plan.provider, plan.action_type),
        local_id: createLocalID(),
        name: plan.name,
        priority: String(plan.priority || 1),
        enabled: plan.enabled,
        provider: plan.provider,
        provider_entry_id: normalizePlanProviderEntryID(plan.provider, plan.provider_entry_id) || AUTOMATIC_PROVIDER_ENTRY_ID,
        provider_entry_group: plan.provider_entry_group.trim(),
        payload: prettyJson(normalizePlanPayloadForSubmit(
          plan.provider,
          normalizePlanActionTypeForProvider(plan.provider, plan.action_type),
          {
            ...defaultPlanPayload(plan.provider, normalizePlanActionTypeForProvider(plan.provider, plan.action_type)),
            ...(asRecord(plan.payload) || {}),
          },
        )),
        auto_connect_group: plan.auto_connect_group.trim() || buildSuggestedAutoConnectGroup(
          plan.provider,
          providerEntries,
          plan.provider_entry_group.trim(),
          normalizePlanProviderEntryID(plan.provider, plan.provider_entry_id) || AUTOMATIC_PROVIDER_ENTRY_ID,
        ),
        script_clipboard_ids: normalizePlanScriptClipboardIDs(
          (plan.script_clipboard_ids.length > 0
            ? plan.script_clipboard_ids
            : plan.script_clipboard_id
              ? [plan.script_clipboard_id]
              : []
          ).map((scriptClipboardID) => String(scriptClipboardID)),
        ),
        script_timeout_sec: String(plan.script_timeout_sec || 600),
        wait_agent_timeout_sec: String(plan.wait_agent_timeout_sec || 600),
        })),
    )
    : [createEmptyPlanForm(providerEntries)];

  return {
    name: task.name,
    enabled: task.enabled,
    current_client_uuid: task.current_client_uuid || task.watch_client_uuid || "",
    failure_threshold: String(task.failure_threshold || 2),
    stale_after_seconds: String(task.stale_after_seconds || 300),
    cooldown_seconds: String(task.cooldown_seconds || 1800),
    provision_retry_limit: String(task.provision_retry_limit || 6),
    provision_failure_fallback_limit: String(task.provision_failure_fallback_limit || 3),
    dns_provider: task.dns_provider,
    dns_entry_id: normalizeProviderEntryID(task.dns_entry_id),
    ...dnsFields,
    delete_strategy: resolveTaskDeleteStrategy(task.delete_strategy || "", plans),
    delete_delay_seconds: String(task.delete_delay_seconds || 0),
    plans,
  };
}

function taskToDuplicateForm(
  task: FailoverTask,
  providerEntries: ProviderEntriesMap,
  copyLabel: string,
): TaskFormState {
  const nextState = taskToForm(task, providerEntries);
  const normalizedCopyLabel = String(copyLabel || "").trim();
  const normalizedName = String(nextState.name || "").trim();

  return {
    ...nextState,
    name: [normalizedName, normalizedCopyLabel].filter(Boolean).join(" ").trim(),
    // Duplicated tasks should stay off until the operator confirms the copied setup.
    enabled: false,
  };
}

function getDnsFormTargetLabel(formState: TaskFormState) {
  if (!formState.dns_provider.trim()) {
    return "";
  }

  if (formState.dns_provider === "cloudflare") {
    return joinCloudflareRecordName(formState.dns_zone_name, formState.dns_record_name);
  }

  if (formState.dns_provider === "aliyun") {
    return joinRecordName(
      formState.dns_domain_name,
      normalizeAliyunRRInput(formState.dns_domain_name, formState.dns_rr),
    );
  }

  return "";
}

function summarizePlanPayload(t: TFunction, plan: PlanFormState) {
  const payload = parsePlanPayloadObject(plan.payload);
  const region = getStringValue(payload.region);
  const parts: string[] = [];

  if (plan.provider === "aws") {
    const service = normalizeAWSService(payload.service);
    const name = getStringValue(payload.name);
    const userData = typeof payload.user_data === "string" ? String(payload.user_data).trim() : "";
    const tags = getAWSTagArrayValue(payload.tags);
    parts.push(service === "lightsail" ? "Lightsail" : "EC2");
    if (region) {
      parts.push(region);
    }
    if (plan.action_type === "provision_instance") {
      if (service === "ec2") {
        const instanceType = getStringValue(payload.instance_type);
        const image = getStringValue(payload.image_id);
        const securityGroupIDs = getStringArrayValue(payload.security_group_ids);
        if (instanceType) {
          parts.push(instanceType);
        }
        if (image) {
          parts.push(image);
        }
        if (securityGroupIDs.length > 0) {
          parts.push(t("failover.editor.security_groups_summary", {
            defaultValue: "{{count}} security groups",
            count: securityGroupIDs.length,
          }));
        }
        if (getBooleanValue(payload.assign_ipv6, false)) {
          parts.push(t("cloud.form.ipv6", { defaultValue: "Enable IPv6" }));
        }
        if (getBooleanValue(payload.allow_all_traffic, false)) {
          parts.push(t("cloud.providers.aws.allow_all_traffic", { defaultValue: "Allow All Traffic" }));
        }
      } else {
        const zone = getStringValue(payload.availability_zone);
        const blueprint = getStringValue(payload.blueprint_id);
        const bundle = getStringValue(payload.bundle_id);
        const ipAddressType = getStringValue(payload.ip_address_type);
        if (zone) {
          parts.push(zone);
        }
        if (blueprint) {
          parts.push(blueprint);
        }
        if (bundle) {
          parts.push(bundle);
        }
        if (ipAddressType) {
          parts.push(ipAddressType);
        }
        if (getBooleanValue(payload.allow_all_traffic, false)) {
          parts.push(t("cloud.providers.aws.allow_all_traffic", { defaultValue: "Allow All Traffic" }));
        }
      }
    } else {
      const instanceID = getStringValue(payload.instance_id);
      const instanceName = getStringValue(payload.instance_name);
      const staticIPName = getStringValue(payload.static_ip_name);
      if (instanceID) {
        parts.push(instanceID);
      } else if (instanceName) {
        parts.push(instanceName);
      } else {
        parts.push(t("failover.editor.use_tracked_current_instance", {
          defaultValue: "Use tracked current instance",
        }));
      }
      if (staticIPName) {
        parts.push(staticIPName);
      }
      if (service === "ec2") {
        const instanceType = getStringValue(payload.instance_type);
        const image = getStringValue(payload.image_id);
        if (instanceType) {
          parts.push(instanceType);
        }
        if (image) {
          parts.push(image);
        }
        if (getBooleanValue(payload.assign_ipv6, false)) {
          parts.push(t("cloud.form.ipv6", { defaultValue: "Enable IPv6" }));
        }
        if (getBooleanValue(payload.allow_all_traffic, false)) {
          parts.push(t("cloud.providers.aws.allow_all_traffic", { defaultValue: "Allow All Traffic" }));
        }
      } else {
        const zone = getStringValue(payload.availability_zone);
        const blueprint = getStringValue(payload.blueprint_id);
        const bundle = getStringValue(payload.bundle_id);
        if (zone) {
          parts.push(zone);
        }
        if (blueprint) {
          parts.push(blueprint);
        }
        if (bundle) {
          parts.push(bundle);
        }
        if (getBooleanValue(payload.allow_all_traffic, false)) {
          parts.push(t("cloud.providers.aws.allow_all_traffic", { defaultValue: "Allow All Traffic" }));
        }
      }
    }
    if (name) {
      parts.push(name);
    }
    if (tags.length > 0) {
      parts.push(t("failover.editor.tags_summary", {
        defaultValue: "{{count}} tags",
        count: tags.length,
      }));
    }
    if (userData) {
      parts.push(t("cloud.form.user_data", { defaultValue: "Cloud-Init / User Data" }));
    }
    return parts.filter(Boolean).join(" · ");
  }

  if (plan.provider === "digitalocean") {
    if (region) {
      parts.push(region);
    }
    const size = getStringValue(payload.size);
    const image = getStringValue(payload.image);
    if (size) {
      parts.push(size);
    }
    if (image) {
      parts.push(image);
    }
    if (getBooleanValue(payload.ipv6, false)) {
      parts.push(t("cloud.form.ipv6", { defaultValue: "Enable IPv6" }));
    }
    return parts.filter(Boolean).join(" · ");
  }

  if (plan.provider === "linode") {
    if (region) {
      parts.push(region);
    }
    const type = getStringValue(payload.type);
    const image = getStringValue(payload.image);
    if (type) {
      parts.push(type);
    }
    if (image) {
      parts.push(image);
    }
    return parts.filter(Boolean).join(" · ");
  }

  return region;
}

function getPlanDisplayName(plan: PlanFormState, index: number, t: TFunction) {
  return plan.name.trim() || t("failover.editor.plan_label", {
    defaultValue: "Plan {{index}}",
    index: index + 1,
  });
}

function buildTaskInput(formState: TaskFormState, t: TFunction): FailoverTaskInput {
  const taskName = formState.name.trim();
  if (!taskName) {
    throw new Error(
      t("failover.validation.task_name_required", {
        defaultValue: "Task name is required",
      }),
    );
  }
  const currentClientUUID = formState.current_client_uuid.trim();
  if (!currentClientUUID) {
    throw new Error(
      t("failover.validation.current_client_required", {
        defaultValue: "Current client is required",
      }),
    );
  }
  if (formState.plans.length === 0) {
    throw new Error(
      t("failover.validation.plan_required", {
        defaultValue: "At least one failover plan is required",
      }),
    );
  }

  const dnsProvider = String(formState.dns_provider || "").trim();
  const dnsRecordType = normalizeDnsRecordType(formState.dns_record_type) || "A";
  const dnsSyncIPv6 = Boolean(formState.dns_sync_ipv6);
  const dnsTTL = numberOrDefault(formState.dns_ttl, 0);
  const normalizedDnsLines = Array.from(
    new Set(
      formState.dns_lines
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
  const normalizedAliyunRR = normalizeAliyunRRInput(formState.dns_domain_name, formState.dns_rr);
  if (dnsProvider && dnsTTL <= 0) {
    throw new Error(
      t("failover.validation.dns_ttl_invalid", {
        defaultValue: "TTL must be greater than 0",
      }),
    );
  }
  if (dnsProvider && !formState.dns_entry_id.trim()) {
    throw new Error(
      t("failover.validation.dns_entry_required", {
        defaultValue: "DNS credential entry is required",
      }),
    );
  }
  if (dnsProvider === "cloudflare" && !formState.dns_zone_name.trim()) {
    throw new Error(
      t("failover.validation.dns_zone_required", {
        defaultValue: "Cloudflare zone or domain is required",
      }),
    );
  }
  if (dnsProvider === "aliyun" && !formState.dns_domain_name.trim()) {
    throw new Error(
      t("failover.validation.dns_domain_required", {
        defaultValue: "Aliyun domain is required",
      }),
    );
  }
  if (dnsProvider === "aliyun" && (normalizedAliyunRR.includes("://") || /[/\\\s]/.test(normalizedAliyunRR) || normalizedAliyunRR.startsWith(".") || normalizedAliyunRR.endsWith(".") || normalizedAliyunRR.includes(".."))) {
    throw new Error(
      t("failover.validation.aliyun_rr_invalid", {
        defaultValue: "Aliyun host record must be like @, www, or api. Do not enter a full URL or invalid separators.",
      }),
    );
  }

  const plans: FailoverPlanInput[] = formState.plans.map((plan, index) => {
    const normalizedActionType = normalizePlanActionTypeForProvider(plan.provider, plan.action_type);
    if (!plan.provider.trim()) {
      throw new Error(
        t("failover.validation.plan_provider_required", {
          defaultValue: "Plan {{index}} requires a cloud provider",
          index: index + 1,
        }),
      );
    }
    if (!normalizedActionType.trim()) {
      throw new Error(
        t("failover.validation.plan_action_required", {
          defaultValue: "Plan {{index}} requires an action type",
          index: index + 1,
        }),
      );
    }
    const planPayload = normalizePlanPayloadForSubmit(
      plan.provider,
      normalizedActionType,
      parsePlanPayloadObject(plan.payload),
    );
    validatePlanPayload(t, index, plan.provider, normalizedActionType, planPayload);

    const scriptClipboardIDs = normalizePlanScriptClipboardIDs(plan.script_clipboard_ids);
    return {
      name: plan.name.trim(),
      priority: numberOrDefault(plan.priority, index + 1),
      enabled: plan.enabled,
      provider: plan.provider,
      provider_entry_id: normalizePlanProviderEntryID(plan.provider, plan.provider_entry_id.trim() || AUTOMATIC_PROVIDER_ENTRY_ID),
      provider_entry_group: plan.provider_entry_group.trim(),
      action_type: normalizedActionType,
      payload: planPayload,
      auto_connect_group: plan.auto_connect_group.trim(),
      script_clipboard_id: scriptClipboardIDs.length > 0
        ? numberOrDefault(scriptClipboardIDs[0], 0)
        : null,
      script_clipboard_ids: scriptClipboardIDs.map((scriptClipboardID) => numberOrDefault(scriptClipboardID, 0)).filter((scriptClipboardID) => scriptClipboardID > 0),
      script_timeout_sec: numberOrDefault(plan.script_timeout_sec, 600),
      wait_agent_timeout_sec: numberOrDefault(plan.wait_agent_timeout_sec, 600),
    };
  });
  const deleteStrategy = resolveTaskDeleteStrategy(formState.delete_strategy, formState.plans);

  const dnsPayload =
    dnsProvider === "cloudflare"
      ? {
          zone_name: formState.dns_zone_name.trim(),
          record_name: formState.dns_record_name.trim(),
          record_type: dnsRecordType,
          sync_ipv6: dnsSyncIPv6,
          ttl: dnsTTL,
          proxied: formState.dns_proxied,
        }
      : dnsProvider === "aliyun"
        ? {
          domain_name: formState.dns_domain_name.trim(),
          rr: normalizedAliyunRR,
          record_type: dnsRecordType,
          sync_ipv6: dnsSyncIPv6,
          ttl: dnsTTL,
          line: normalizedDnsLines[0] || formState.dns_line.trim() || "default",
          lines: normalizedDnsLines.length > 0 ? normalizedDnsLines : ["default"],
        }
        : {};

  return {
    name: taskName,
    enabled: formState.enabled,
    current_client_uuid: currentClientUUID,
    failure_threshold: numberOrDefault(formState.failure_threshold, 2),
    stale_after_seconds: numberOrDefault(formState.stale_after_seconds, 300),
    cooldown_seconds: numberOrDefault(formState.cooldown_seconds, 1800),
    provision_retry_limit: numberOrDefault(formState.provision_retry_limit, 6),
    provision_failure_fallback_limit: numberOrDefault(formState.provision_failure_fallback_limit, 3),
    dns_provider: dnsProvider,
    dns_entry_id: dnsProvider ? normalizeProviderEntryID(formState.dns_entry_id.trim()) : "",
    dns_payload: dnsPayload,
    delete_strategy: deleteStrategy,
    delete_delay_seconds:
      deleteStrategy === "delete_after_success_delay"
        ? numberOrDefault(formState.delete_delay_seconds, 0)
        : 0,
    plans,
  };
}

function tryBuildTaskInput(formState: TaskFormState, t: TFunction): FailoverTaskInput | null {
  try {
    return buildTaskInput(formState, t);
  } catch {
    return null;
  }
}

function JsonBlock({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </div>
      <pre className="max-h-56 overflow-auto overscroll-contain rounded-lg border bg-muted/25 p-3 text-xs leading-6 text-slate-800 [scrollbar-gutter:stable] dark:text-slate-200">
        {prettyJson(value, "null")}
      </pre>
    </div>
  );
}

function ExecutionSummaryCard({
  title,
  description,
  items,
  detailLines,
  detailLinesTitle,
  emptyLabel,
  className,
}: ExecutionSummaryCardData & { className?: string }) {
  return (
    <div className={cn("space-y-3 rounded-xl border border-slate-200/80 px-4 py-4 dark:border-slate-800/80", className)}>
      <div className="space-y-1">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-50">{title}</div>
        {description ? (
          <div className="text-xs leading-5 text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {items.length > 0 ? (
        <DetailItemsList items={items} />
      ) : (
        <div className="rounded-lg border border-dashed px-3 py-3 text-xs leading-5 text-muted-foreground">
          {emptyLabel}
        </div>
      )}
      {detailLines.length > 0 ? (
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {detailLinesTitle}
          </div>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            {detailLines.map((line) => (
              <div key={line} className="break-all rounded-md border border-dashed border-slate-200/80 px-3 py-2 dark:border-slate-800/80">
                {line}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PreviewCheckCard({
  check,
}: {
  check: FailoverPreviewCheck;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-slate-200/80 p-3 dark:border-slate-800/80">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
            {check.title || t("failover.preview.check", { defaultValue: "Check" })}
          </div>
          {check.message ? (
            <div className="mt-1 text-xs leading-5 text-muted-foreground">
              {check.message}
            </div>
          ) : null}
        </div>
        <Badge variant={getPreviewStatusVariant(check.status)}>
          {getPreviewStatusLabel(t, check.status)}
        </Badge>
      </div>
      {check.detail ? (
        <div className="mt-3">
          <JsonBlock
            title={t("failover.preview.detail", { defaultValue: "Detail" })}
            value={check.detail}
          />
        </div>
      ) : null}
    </div>
  );
}

function TaskPreviewSection({
  preview,
  loading,
  error,
  stale,
  hideHeader = false,
}: {
  preview: FailoverTaskPreview | null;
  loading: boolean;
  error: string;
  stale: boolean;
  hideHeader?: boolean;
}) {
  const { t } = useTranslation();
  const previewSummary = React.useMemo(
    () => summarizeFailoverPreview(preview),
    [preview],
  );

  if (!loading && !error && !preview) {
    return null;
  }

  const statusMessage = stale
    ? t("failover.preview.outdated_hint", {
      defaultValue: "The form changed after the last preview. Run Preview again before saving.",
    })
    : error
      ? t("failover.preview.failed_hint", {
        defaultValue: "Preview failed for the current form. Saving is blocked until Preview succeeds.",
      })
      : previewSummary.errorCount > 0
        ? t("failover.preview.blocking_hint", {
          defaultValue: "Preview found blocking errors. Fix them before saving.",
        })
        : previewSummary.warningCount > 0
          ? t("failover.preview.warning_hint", {
            defaultValue: "Preview has warnings. You can still save, but review them first.",
          })
          : preview
            ? t("failover.preview.fresh_hint", {
              defaultValue: "Preview is up to date for the current form.",
            })
            : "";

  return (
    <section className="space-y-4">
      {!hideHeader ? (
        <div className="space-y-1">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
            {t("failover.preview.title", { defaultValue: "Preview checks" })}
          </div>
          <div className="text-xs text-muted-foreground">
            {t("failover.preview.hint", {
              defaultValue: "Preview validates the current form and does not create resources or change DNS.",
            })}
          </div>
        </div>
      ) : null}
      <div className="space-y-4 rounded-xl border px-4 py-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            {t("failover.preview.loading", { defaultValue: "Running preview checks..." })}
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {!loading && preview ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={preview.success ? "success" : "warning"}>
                {preview.success
                  ? t("failover.preview.ready", { defaultValue: "Ready" })
                  : t("failover.preview.attention", { defaultValue: "Needs attention" })}
              </Badge>
              {preview.generated_at ? (
                <div className="text-xs text-muted-foreground">
                  {t("failover.preview.generated_at", {
                    defaultValue: "Generated at {{value}}",
                    value: formatDateTime(preview.generated_at),
                  })}
                </div>
              ) : null}
              {stale ? (
                <Badge variant="warning">
                  {t("failover.preview.outdated", { defaultValue: "Outdated" })}
                </Badge>
              ) : (
                <Badge variant="outline">
                  {t("failover.preview.fresh", { defaultValue: "Fresh" })}
                </Badge>
              )}
              {previewSummary.errorCount > 0 ? (
                <Badge variant="destructive">
                  {t("failover.preview.error_count", {
                    defaultValue: "{{count}} error(s)",
                    count: previewSummary.errorCount,
                  })}
                </Badge>
              ) : null}
              {previewSummary.warningCount > 0 ? (
                <Badge variant="warning">
                  {t("failover.preview.warning_count", {
                    defaultValue: "{{count}} warning(s)",
                    count: previewSummary.warningCount,
                  })}
                </Badge>
              ) : null}
            </div>

            {statusMessage ? (
              <div className="rounded-lg border border-dashed border-slate-200/80 px-3 py-3 text-xs leading-5 text-muted-foreground dark:border-slate-800/80">
                {statusMessage}
              </div>
            ) : null}

            {preview.checks.length > 0 ? (
              <div className="space-y-3">
                {preview.checks.map((check) => (
                  <PreviewCheckCard key={`global:${check.key}:${check.title}`} check={check} />
                ))}
              </div>
            ) : null}

            {preview.plans.length > 0 ? (
              <div className="space-y-3">
                {preview.plans.map((plan) => {
                  const title = plan.name || t("failover.editor.plan_label", {
                    defaultValue: "Plan {{index}}",
                    index: plan.index || 1,
                  });
                  const summary = [
                    plan.provider ? getPlanProviderLabel(t, plan.provider) : "",
                    plan.action_type ? getActionTypeLabel(t, plan.action_type) : "",
                    plan.provider_entry_id
                      ? t("failover.preview.entry", {
                        defaultValue: "Entry {{value}}",
                        value: plan.provider_entry_id,
                      })
                      : "",
                  ].filter(Boolean).join(" · ");

                  return (
                    <div key={`plan:${plan.index}:${plan.name}`} className="rounded-lg border border-slate-200/80 p-3 dark:border-slate-800/80">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-50">{title}</div>
                        {summary ? (
                          <div className="text-xs text-muted-foreground">{summary}</div>
                        ) : null}
                      </div>
                      <div className="mt-3 space-y-3">
                        {plan.checks.map((check) => (
                          <PreviewCheckCard key={`plan:${plan.index}:${check.key}:${check.title}`} check={check} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ExecutionAttemptSection({
  execution,
}: {
  execution: FailoverExecution;
}) {
  const { t } = useTranslation();
  const attempts = getExecutionPlanAttempts(execution.attempted_plans);
  if (attempts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-xl border border-slate-200/80 px-4 py-4 dark:border-slate-800/80">
      <div className="space-y-1">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
          {t("failover.execution.attempt_overview", { defaultValue: "Attempt overview" })}
        </div>
        <div className="text-xs text-muted-foreground">
          {t("failover.execution.attempt_overview_hint", {
            defaultValue: "This shows which plan and provider entry the backend tried before the execution finished.",
          })}
        </div>
      </div>
      <div className="space-y-3">
        {attempts.map((attempt, index) => {
          const entryAttempts = attempt.provider_entry_attempts;
          const lastEntryAttempt = getLastExecutionEntryAttempt(attempt);
          const planTitle = attempt.plan_name
            || t("failover.execution.summary.plan_id", {
              defaultValue: "Plan #{{id}}",
              id: attempt.plan_id || index + 1,
            });
          const planSummary = [
            attempt.provider ? getPlanProviderLabel(t, attempt.provider) : "",
            attempt.action_type ? getActionTypeLabel(t, attempt.action_type) : "",
            attempt.priority > 0
              ? t("failover.execution.detail_labels.priority_value", {
                defaultValue: "Priority {{value}}",
                value: attempt.priority,
              })
              : "",
          ].filter(Boolean).join(" · ");
          const planItems = [
            buildDetailItem(
              t("failover.execution.detail_labels.preferred_entry_id", { defaultValue: "Preferred entry" }),
              attempt.preferred_entry_id,
            ),
            buildDetailItem(
              t("failover.execution.detail_labels.preferred_entry_group", { defaultValue: "Preferred group" }),
              attempt.preferred_entry_group,
            ),
            buildDetailItem(
              t("failover.execution.detail_labels.entry_id", { defaultValue: "Provider entry" }),
              lastEntryAttempt?.entry_id || attempt.provider_entry_id,
            ),
            buildDetailItem(
              t("failover.execution.detail_labels.failure_class", { defaultValue: "Failure class" }),
              getFailureClassSummaryLabel(t, lastEntryAttempt?.failure_class || ""),
            ),
            buildDetailItem(
              t("failover.execution.detail_labels.cleanup_result", { defaultValue: "Cleanup result" }),
              formatDetailValue(t, "cleanup_status", lastEntryAttempt?.cleanup_status),
            ),
            buildDetailItem(
              t("failover.execution.detail_labels.cleanup_action", { defaultValue: "Cleanup action" }),
              lastEntryAttempt?.cleanup_label || "",
            ),
            buildDetailItem(
              t("failover.execution.detail_labels.cleanup_error", { defaultValue: "Cleanup error" }),
              lastEntryAttempt?.cleanup_error || "",
            ),
            buildDetailItem(
              t("failover.execution.detail_labels.error", { defaultValue: "Error" }),
              lastEntryAttempt?.error || attempt.error,
            ),
          ].filter((item): item is DetailItem => Boolean(item));

          return (
            <div key={`${attempt.plan_id}:${index}`} className="rounded-lg border border-slate-200/80 p-3 dark:border-slate-800/80">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1 font-medium text-slate-900 dark:text-slate-50" title={planTitle}>
                  {planTitle}
                </div>
                <Badge variant={getStatusVariant(attempt.status, "execution")}>
                  {getStatusLabel(t, attempt.status)}
                </Badge>
              </div>
              {planSummary ? (
                <div className="mt-1 text-xs text-muted-foreground">{planSummary}</div>
              ) : null}
              <DetailItemsList items={planItems} />

              {entryAttempts.length > 0 ? (
                <div className="mt-3 space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {t("failover.execution.entry_attempts", { defaultValue: "Provider entry attempts" })}
                  </div>
                  <div className="space-y-2">
                    {entryAttempts.map((entryAttempt, entryIndex) => {
                      const entryTitle = entryAttempt.entry_name || entryAttempt.entry_id || t("failover.execution.entry_attempt", {
                        defaultValue: "Entry attempt {{index}}",
                        index: entryIndex + 1,
                      });
                      const entryItems = [
                        buildDetailItem(
                          t("failover.execution.detail_labels.entry_id", { defaultValue: "Provider entry" }),
                          entryAttempt.entry_id,
                        ),
                        buildDetailItem(
                          t("failover.execution.detail_labels.entry_group", { defaultValue: "Entry group" }),
                          entryAttempt.entry_group,
                        ),
                        buildDetailItem(
                          t("failover.execution.detail_labels.attempt", { defaultValue: "Attempt" }),
                          entryAttempt.attempt > 0 ? String(entryAttempt.attempt) : "",
                        ),
                        buildDetailItem(
                          t("failover.execution.detail_labels.failure_class", { defaultValue: "Failure class" }),
                          getFailureClassSummaryLabel(t, entryAttempt.failure_class),
                        ),
                        buildDetailItem(
                          t("failover.execution.detail_labels.cleanup_result", { defaultValue: "Cleanup result" }),
                          formatDetailValue(t, "cleanup_status", entryAttempt.cleanup_status),
                        ),
                        buildDetailItem(
                          t("failover.execution.detail_labels.cleanup_action", { defaultValue: "Cleanup action" }),
                          entryAttempt.cleanup_label,
                        ),
                        buildDetailItem(
                          t("failover.execution.detail_labels.cleanup_error", { defaultValue: "Cleanup error" }),
                          entryAttempt.cleanup_error,
                        ),
                        buildDetailItem(
                          t("failover.execution.detail_labels.error", { defaultValue: "Error" }),
                          entryAttempt.error,
                        ),
                      ].filter((item): item is DetailItem => Boolean(item));

                      return (
                        <div key={`${entryAttempt.entry_id}:${entryAttempt.attempt}:${entryIndex}`} className="rounded-md border border-dashed border-slate-200/80 p-3 dark:border-slate-800/80">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="min-w-0 flex-1 text-sm font-medium text-slate-900 dark:text-slate-50" title={entryTitle}>
                              {entryTitle}
                            </div>
                            <Badge variant={getStatusVariant(entryAttempt.status, "execution")}>
                              {getStatusLabel(t, entryAttempt.status)}
                            </Badge>
                          </div>
                          <DetailItemsList items={entryItems} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExecutionDetailDialog({
  executionID,
  taskName,
  open,
  onOpenChange,
  onExecutionUpdated,
}: {
  executionID: number | null;
  taskName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExecutionUpdated?: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [execution, setExecution] = React.useState<FailoverExecution | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [showRawData, setShowRawData] = React.useState(false);
  const [stopping, setStopping] = React.useState(false);
  const [retryingDNS, setRetryingDNS] = React.useState(false);
  const [retryingCleanup, setRetryingCleanup] = React.useState(false);
  const [pendingRetryAction, setPendingRetryAction] = React.useState<"retry_dns" | "retry_cleanup" | null>(null);

  const loadExecution = React.useCallback(async (showLoading = true) => {
    if (!executionID) {
      return;
    }

    if (showLoading) {
      setLoading(true);
    }
    setError("");
    try {
      const detail = await getFailoverExecution(executionID);
      setExecution(detail);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : t("failover.messages.load_execution_failed", {
            defaultValue: "Failed to load execution details",
          }),
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [executionID, t]);

  React.useEffect(() => {
    if (!open || !executionID) {
      return;
    }
    void loadExecution();
  }, [executionID, loadExecution, open]);

  React.useEffect(() => {
    if (!open || !execution || !isFailoverExecutionActive(execution.status)) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadExecution(false);
    }, 3000);

    return () => {
      window.clearInterval(timer);
    };
  }, [execution, loadExecution, open]);

  React.useEffect(() => {
    if (!open) {
      setPendingRetryAction(null);
    }
  }, [open]);

  const handleStopExecution = async () => {
    if (!executionID) {
      return;
    }

    setStopping(true);
    try {
      const updated = await stopFailoverExecution(executionID);
      setExecution(updated);
      toast.success(t("failover.messages.stopped", { defaultValue: "Failover execution stopped" }));
      await onExecutionUpdated?.();
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : t("common.unknown_error"));
    } finally {
      setStopping(false);
    }
  };

  const handleRetryDNS = async () => {
    if (!executionID) {
      return false;
    }

    setRetryingDNS(true);
    try {
      const updated = await retryFailoverExecutionDNS(executionID);
      setExecution(updated);
      toast.success(t("failover.messages.retry_dns_success", { defaultValue: "DNS retry finished" }));
      await onExecutionUpdated?.();
      return true;
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : t("common.unknown_error"));
      await loadExecution(false);
      return false;
    } finally {
      setRetryingDNS(false);
    }
  };

  const handleRetryCleanup = async () => {
    if (!executionID) {
      return false;
    }

    setRetryingCleanup(true);
    try {
      const updated = await retryFailoverExecutionCleanup(executionID);
      setExecution(updated);
      toast.success(t("failover.messages.retry_cleanup_success", { defaultValue: "Cleanup retry finished" }));
      await onExecutionUpdated?.();
      return true;
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : t("common.unknown_error"));
      await loadExecution(false);
      return false;
    } finally {
      setRetryingCleanup(false);
    }
  };

  const executionScriptNames = splitScriptSnapshotNames(execution?.script_name_snapshot || "");
  const cleanupInfo = execution
    ? getCleanupResultInfo(t, execution.cleanup_status, execution.cleanup_result)
    : null;
  const retryDNSAvailability = getRetryExecutionDNSAvailability(execution);
  const retryCleanupAvailability = getRetryExecutionCleanupAvailability(execution);
  const canRetryDNS = retryDNSAvailability.available;
  const canRetryCleanup = retryCleanupAvailability.available;
  const retryGuidance = buildRetryGuidanceItems(t, execution, retryDNSAvailability, retryCleanupAvailability);
  const dnsSummaryCard = execution ? buildExecutionDnsSummaryCard(t, execution) : null;
  const oldInstanceSummaryCard = execution ? buildExecutionOldInstanceSummaryCard(t, execution, cleanupInfo) : null;
  const confirmActionLoading = pendingRetryAction === "retry_dns" ? retryingDNS : retryingCleanup;

  const handleConfirmRetryAction = async () => {
    if (pendingRetryAction === "retry_dns") {
      if (await handleRetryDNS()) {
        setPendingRetryAction(null);
      }
      return;
    }
    if (pendingRetryAction === "retry_cleanup") {
      if (await handleRetryCleanup()) {
        setPendingRetryAction(null);
      }
    }
  };

  const confirmTitle = pendingRetryAction === "retry_cleanup"
    ? t("failover.execution.retry_cleanup_confirm_title", {
      defaultValue: "Retry old instance cleanup?",
    })
    : t("failover.execution.retry_dns_confirm_title", {
      defaultValue: "Retry DNS update?",
    });
  const confirmDescription = pendingRetryAction === "retry_cleanup"
    ? t("failover.execution.retry_cleanup_confirm_description", {
      defaultValue: "This only reruns old-instance cleanup with the saved provider reference. Verify the target below before deleting anything.",
    })
    : t("failover.execution.retry_dns_confirm_description", {
      defaultValue: "This only reruns the DNS step with the saved execution addresses. It will not create a new instance.",
    });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[88vh] max-w-4xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle>
              {t("failover.execution.title", { defaultValue: "Execution details" })}
            </DialogTitle>
            <DialogDescription>
              {taskName || t("failover.execution.description", { defaultValue: "Track failover progress, script results, and DNS changes." })}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [scrollbar-gutter:stable]">
            {loading && !execution ? <Loading /> : null}

            {!loading && error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                {error}
              </div>
            ) : null}

          {execution ? (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-xl border border-slate-200/80 px-4 py-4 sm:grid-cols-2 xl:grid-cols-4 dark:border-slate-800/80">
                <div className="min-w-0 space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {t("failover.execution.status", { defaultValue: "Execution status" })}
                  </div>
                  <Badge variant={getStatusVariant(execution.status, "execution")}>{getStatusLabel(t, execution.status)}</Badge>
                  <div className="text-xs text-muted-foreground">{formatDateTime(execution.started_at)}</div>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {t("failover.execution.script", { defaultValue: "Script" })}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getStatusVariant(execution.script_status, "script")}>{getStatusLabel(t, execution.script_status)}</Badge>
                    {executionScriptNames.length > 0 ? (
                      <Badge variant="outline">
                        {t("failover.task.script_count", {
                          count: executionScriptNames.length,
                          defaultValue: "{{count}} script(s)",
                        })}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="line-clamp-2 break-words text-xs leading-5 text-muted-foreground" title={execution.script_name_snapshot || undefined}>
                    {executionScriptNames.length > 0
                      ? executionScriptNames.join(" · ")
                      : t("failover.execution.no_script", { defaultValue: "No script recorded" })}
                  </div>
                  {execution.script_exit_code !== null ? (
                    <div className="text-xs text-muted-foreground">
                      {t("failover.execution.exit_code", {
                        defaultValue: "Exit code: {{code}}",
                        code: execution.script_exit_code,
                      })}
                    </div>
                  ) : null}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {t("failover.execution.dns", { defaultValue: "DNS" })}
                  </div>
                  <Badge variant={getStatusVariant(execution.dns_status, "dns")}>{getStatusLabel(t, execution.dns_status)}</Badge>
                  <div className="truncate text-xs text-muted-foreground" title={execution.dns_provider ? getDnsProviderLabel(t, execution.dns_provider) : undefined}>
                    {execution.dns_provider ? getDnsProviderLabel(t, execution.dns_provider) : "-"}
                  </div>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {t("failover.execution.cleanup", { defaultValue: "Cleanup" })}
                  </div>
                  <Badge variant={getStatusVariant(execution.cleanup_status, "cleanup")}>{getStatusLabel(t, execution.cleanup_status)}</Badge>
                  <div className="text-xs text-muted-foreground">
                    {execution.finished_at
                      ? formatDateTime(execution.finished_at)
                      : t("failover.execution.running", { defaultValue: "Still running" })}
                  </div>
                </div>
              </div>

              {execution.error_message ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                  {execution.error_message}
                </div>
              ) : null}

              {cleanupInfo && cleanupInfo.classification !== "not_requested" && cleanupInfo.tone !== "success" ? (
                <div
                  className={cn(
                    "rounded-xl border px-4 py-3",
                    cleanupInfo.tone === "destructive"
                      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
                      : cleanupInfo.tone === "warning"
                        ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
                        : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200",
                  )}
                >
                  <div className="text-sm font-medium">{cleanupInfo.title}</div>
                  {cleanupInfo.description ? (
                    <div className="mt-1 text-sm leading-6">{cleanupInfo.description}</div>
                  ) : null}
                  {cleanupInfo.errorMessage ? (
                    <div className="mt-2 text-xs opacity-90">
                      {t("failover.execution.cleanup_messages.last_error", {
                        defaultValue: "Last error: {{error}}",
                        error: cleanupInfo.errorMessage,
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {dnsSummaryCard || oldInstanceSummaryCard ? (
                <div className={cn("grid gap-3", dnsSummaryCard && oldInstanceSummaryCard ? "xl:grid-cols-2" : "")}>
                  {dnsSummaryCard ? <ExecutionSummaryCard {...dnsSummaryCard} /> : null}
                  {oldInstanceSummaryCard ? <ExecutionSummaryCard {...oldInstanceSummaryCard} /> : null}
                </div>
              ) : null}

              <ExecutionAttemptSection execution={execution} />

              <div className="space-y-2 rounded-xl border border-slate-200/80 px-4 py-4 dark:border-slate-800/80">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                    {t("failover.execution.timeline", { defaultValue: "Timeline" })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("failover.execution.timeline_hint", { defaultValue: "Each step is persisted by the backend so you can see exactly where a run failed." })}
                  </div>
                </div>
                {execution.steps.length === 0 ? (
                  <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                    {t("failover.execution.steps_empty", { defaultValue: "No step data is available yet." })}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                    {execution.steps.map((step) => {
                      const stepLabel = getFailoverExecutionStepLabel(t, step);
                      const stepMessage = getFailoverExecutionStepMessage(t, step);
                      const stepDetailItems = getExecutionStepDetailItems(t, step.detail);

                      return (
                        <div key={step.id} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={getStatusVariant(step.status, "execution")}>{getStatusLabel(t, step.status)}</Badge>
                            <div className="min-w-0 flex-1 truncate font-medium text-slate-900 dark:text-slate-50" title={stepLabel || undefined}>
                              {stepLabel}
                            </div>
                            <div className="text-xs text-muted-foreground">#{step.sort}</div>
                          </div>
                          {stepMessage ? (
                            <div className="mt-1.5 text-sm text-slate-700 dark:text-slate-300">{stepMessage}</div>
                          ) : null}
                          <DetailItemsList items={stepDetailItems} />
                          <div className="mt-1.5 text-xs text-muted-foreground">
                            {formatDateTime(step.started_at)}
                            {step.finished_at ? ` → ${formatDateTime(step.finished_at)}` : ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {execution.script_output ? (
                <div className="space-y-2 rounded-xl border border-slate-200/80 px-4 py-4 dark:border-slate-800/80">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                      {t("failover.execution.script_output", { defaultValue: "Script output" })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {execution.script_output_truncated
                        ? t("failover.execution.script_output_truncated", { defaultValue: "The backend truncated this output for storage safety." })
                        : t("failover.execution.script_output_full", { defaultValue: "Captured task output from the target agent." })}
                    </div>
                  </div>
                  <pre className="max-h-72 overflow-auto overscroll-contain rounded-lg border bg-muted/25 p-3 text-xs leading-6 [scrollbar-gutter:stable]">{execution.script_output}</pre>
                </div>
              ) : null}

              <Collapsible open={showRawData} onOpenChange={setShowRawData}>
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex h-auto w-full items-center justify-between rounded-xl px-4 py-3 text-left"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                          {t("failover.execution.raw_data", { defaultValue: "Raw data" })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("failover.execution.raw_data_hint", { defaultValue: "Expand only when you need the backend snapshots and raw execution payloads." })}
                        </div>
                      </div>
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-muted-foreground transition-transform",
                          showRawData ? "rotate-180" : "",
                        )}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t px-4 py-4">
                    <div className="grid gap-4 xl:grid-cols-2">
                      <JsonBlock title={t("failover.execution.steps_raw", { defaultValue: "Steps raw data" })} value={execution.steps} />
                      <JsonBlock title={t("failover.execution.trigger_snapshot", { defaultValue: "Trigger snapshot" })} value={execution.trigger_snapshot} />
                      <JsonBlock title={t("failover.execution.attempted_plans", { defaultValue: "Attempted plans" })} value={execution.attempted_plans} />
                      <JsonBlock title={t("failover.execution.old_instance", { defaultValue: "Old instance" })} value={execution.old_instance_ref} />
                      <JsonBlock title={t("failover.execution.old_addresses", { defaultValue: "Old addresses" })} value={execution.old_addresses} />
                      <JsonBlock title={t("failover.execution.new_instance", { defaultValue: "New instance" })} value={execution.new_instance_ref} />
                      <JsonBlock title={t("failover.execution.new_addresses", { defaultValue: "New addresses" })} value={execution.new_addresses} />
                      <JsonBlock title={t("failover.execution.dns_result", { defaultValue: "DNS result" })} value={execution.dns_result} />
                      <JsonBlock title={t("failover.execution.cleanup_result", { defaultValue: "Cleanup result" })} value={execution.cleanup_result} />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>
          ) : null}
        </div>

        {retryGuidance.length > 0 ? (
          <div className="border-t px-5 py-3">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {t("failover.execution.retry_guidance_title", { defaultValue: "Retry guidance" })}
              </div>
              {retryGuidance.map((guidance) => (
                <div key={guidance.key} className="rounded-lg border border-dashed border-slate-200/80 px-3 py-3 text-xs text-muted-foreground dark:border-slate-800/80">
                  <div className="font-medium text-slate-700 dark:text-slate-200">{guidance.label}</div>
                  <div className="mt-1.5 leading-5">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {t("failover.execution.retry_guidance_blocked", { defaultValue: "Blocked because" })}:
                    </span>{" "}
                    {guidance.reason}
                  </div>
                  <div className="mt-1 leading-5">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {t("failover.execution.retry_guidance_next_step", { defaultValue: "Next step" })}:
                    </span>{" "}
                    {guidance.nextStep}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <DialogFooter className={cn("px-5 py-4", retryGuidance.length > 0 ? "" : "border-t")}>
          {execution && isFailoverExecutionActive(execution.status) ? (
            <Button type="button" variant="outline" onClick={() => void handleStopExecution()} disabled={stopping || loading}>
              {stopping ? <LoaderCircle className="size-4 animate-spin" /> : <Square className="size-4" />}
              {t("failover.actions.stop", { defaultValue: "Stop" })}
            </Button>
          ) : null}
          {canRetryDNS ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingRetryAction("retry_dns")}
              disabled={retryingDNS || retryingCleanup || loading}
            >
              {retryingDNS ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              {t("failover.actions.retry_dns", { defaultValue: "Retry DNS" })}
            </Button>
          ) : null}
          {canRetryCleanup ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingRetryAction("retry_cleanup")}
              disabled={retryingCleanup || retryingDNS || loading}
            >
              {retryingCleanup ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              {t("failover.actions.retry_cleanup", { defaultValue: "Retry Cleanup" })}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => void loadExecution()} disabled={!executionID || loading}>
            <RefreshCw className={cn("size-4", loading ? "animate-spin" : "")} />
            {t("common.refresh", { defaultValue: "Refresh" })}
          </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingRetryAction !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !confirmActionLoading) {
            setPendingRetryAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>

          {pendingRetryAction === "retry_dns" && dnsSummaryCard ? (
            <ExecutionSummaryCard {...dnsSummaryCard} className="mt-1" />
          ) : null}
          {pendingRetryAction === "retry_cleanup" && oldInstanceSummaryCard ? (
            <ExecutionSummaryCard {...oldInstanceSummaryCard} className="mt-1" />
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmActionLoading}>
              {t("common.cancel", { defaultValue: "Cancel" })}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmRetryAction();
              }}
              disabled={confirmActionLoading}
            >
              {confirmActionLoading ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {pendingRetryAction === "retry_cleanup"
                ? t("failover.actions.retry_cleanup", { defaultValue: "Retry Cleanup" })
                : t("failover.actions.retry_dns", { defaultValue: "Retry DNS" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TaskEditorDialog({
  open,
  mode,
  task,
  templateTask,
  nodes,
  scripts,
  providerEntries,
  allowedPlanProviders,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  task: FailoverTask | null;
  templateTask: FailoverTask | null;
  nodes: FailoverNodeOption[];
  scripts: FailoverScriptOption[];
  providerEntries: ProviderEntriesMap;
  allowedPlanProviders: readonly string[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const {
    settings: userSettings,
    loading: settingsLoading,
    refetch: refetchSettings,
  } = useSettings();
  const copyLabel = t("copy", { defaultValue: "Copy" });
  const [submitting, setSubmitting] = React.useState(false);
  const [formState, setFormState] = React.useState<TaskFormState>(() => createEmptyTaskForm(providerEntries));
  const [taskDialogOpen, setTaskDialogOpen] = React.useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = React.useState(false);
  const [dnsDialogOpen, setDnsDialogOpen] = React.useState(false);
  const [dnsCoreOpen, setDnsCoreOpen] = React.useState(true);
  const [dnsAdvancedOpen, setDnsAdvancedOpen] = React.useState(false);
  const [planDialogOpen, setPlanDialogOpen] = React.useState(false);
  const [taskAdvancedOpen, setTaskAdvancedOpen] = React.useState(true);
  const [taskRetryOpen, setTaskRetryOpen] = React.useState(false);
  const [selectedPlanID, setSelectedPlanID] = React.useState("");
  const [planAdvancedOpenState, setPlanAdvancedOpenState] = React.useState<Record<string, boolean>>({});
  const [planSectionOpenState, setPlanSectionOpenState] = React.useState<Record<string, {
    organizer?: boolean;
    core?: boolean;
    config?: boolean;
    optional?: boolean;
  }>>({});
  const [customAutoConnectGroupModes, setCustomAutoConnectGroupModes] = React.useState<Record<string, boolean>>({});
  const [planScriptSearchQueries, setPlanScriptSearchQueries] = React.useState<Record<string, string>>({});
  const [dnsCatalog, setDnsCatalog] = React.useState<FailoverDnsCatalog | null>(null);
  const [dnsCatalogLoading, setDnsCatalogLoading] = React.useState(false);
  const [dnsCatalogError, setDnsCatalogError] = React.useState("");
  const [selectedDnsRecordKey, setSelectedDnsRecordKey] = React.useState("");
  const [planCatalog, setPlanCatalog] = React.useState<FailoverPlanCatalog | null>(null);
  const [planCatalogLoading, setPlanCatalogLoading] = React.useState(false);
  const [planCatalogLoadMode, setPlanCatalogLoadMode] = React.useState<"regions" | "full">("regions");
  const [planCatalogError, setPlanCatalogError] = React.useState("");
  const [previewResult, setPreviewResult] = React.useState<FailoverTaskPreview | null>(null);
  const [previewError, setPreviewError] = React.useState("");
  const [previewing, setPreviewing] = React.useState(false);
  const [previewPayloadSignature, setPreviewPayloadSignature] = React.useState("");
  const lastEnabledDnsRef = React.useRef<{ provider: string; entryID: string } | null>(null);
  const dnsCatalogRequestRef = React.useRef(0);
  const planCatalogRequestRef = React.useRef(0);
  const resetPlanCatalogState = React.useCallback((
    nextCatalog: FailoverPlanCatalog | null = null,
    nextMode: "regions" | "full" = "regions",
  ) => {
    planCatalogRequestRef.current += 1;
    setPlanCatalog(nextCatalog);
    setPlanCatalogError("");
    setPlanCatalogLoading(false);
    setPlanCatalogLoadMode(nextMode);
  }, []);
  const resetPreviewState = React.useCallback(() => {
    setPreviewResult(null);
    setPreviewError("");
    setPreviewPayloadSignature("");
  }, []);

  React.useEffect(() => {
    if (!open) {
      setTaskDialogOpen(false);
      setPreviewDialogOpen(false);
      setTaskAdvancedOpen(true);
      setTaskRetryOpen(false);
      setDnsDialogOpen(false);
      setDnsCoreOpen(true);
      setDnsAdvancedOpen(false);
      setPlanDialogOpen(false);
      return;
    }
    const nextFormState = mode === "edit" && task
      ? taskToForm(task, providerEntries)
      : templateTask
        ? taskToDuplicateForm(templateTask, providerEntries, copyLabel)
        : createEmptyTaskForm(providerEntries);
    setFormState(nextFormState);
    setTaskDialogOpen(false);
    setPreviewDialogOpen(false);
    setTaskAdvancedOpen(true);
    setTaskRetryOpen(false);
    setDnsCoreOpen(true);
    setDnsAdvancedOpen(false);
    setSelectedPlanID(nextFormState.plans[0]?.local_id || "");
    setPlanAdvancedOpenState({});
    setPlanSectionOpenState({});
    setCustomAutoConnectGroupModes(
      Object.fromEntries(
        nextFormState.plans.map((plan) => [plan.local_id, !shouldSyncAutoConnectGroup(plan, providerEntries)]),
      ),
    );
    setPlanScriptSearchQueries({});
    setDnsCatalog(null);
    setDnsCatalogError("");
    setSelectedDnsRecordKey("");
    resetPlanCatalogState();
    resetPreviewState();
    lastEnabledDnsRef.current = nextFormState.dns_provider
      ? {
          provider: nextFormState.dns_provider,
          entryID: nextFormState.dns_entry_id,
        }
      : null;
  }, [copyLabel, mode, open, providerEntries, resetPlanCatalogState, resetPreviewState, task, templateTask]);

  const nodeLookup = React.useMemo(
    () => new Map(nodes.map((node) => [node.uuid, node])),
    [nodes],
  );
  const currentClientOptions = React.useMemo(
    () => {
      const options = nodes.map((node) => ({
        value: node.uuid,
        label: node.name || node.uuid,
        hint: [node.group, node.ipv4 || node.ipv6].filter(Boolean).join(" · "),
      }));
      return appendCatalogOptionIfMissing(options, formState.current_client_uuid, formState.current_client_uuid);
    },
    [formState.current_client_uuid, nodes],
  );
  const selectedCurrentClientNode = React.useMemo(
    () => {
      const currentClientUUID = formState.current_client_uuid.trim();
      return currentClientUUID ? nodeLookup.get(currentClientUUID) || null : null;
    },
    [formState.current_client_uuid, nodeLookup],
  );
  const currentOutletNode = React.useMemo(
    () => {
      const currentClientUUID = mode === "edit"
        ? task?.current_client_uuid || task?.watch_client_uuid || ""
        : "";
      return currentClientUUID ? nodeLookup.get(currentClientUUID) || null : null;
    },
    [mode, nodeLookup, task?.current_client_uuid, task?.watch_client_uuid],
  );
  const sortedScripts = React.useMemo(
    () => [...scripts].sort((left, right) => {
      if (right.weight !== left.weight) {
        return right.weight - left.weight;
      }
      return compareString(left.name, right.name);
    }),
    [scripts],
  );
  const scriptLookup = React.useMemo(
    () => new Map(scripts.map((script) => [String(script.id), script])),
    [scripts],
  );
  const selectedPlan = React.useMemo(
    () => formState.plans.find((plan) => plan.local_id === selectedPlanID) || formState.plans[0] || null,
    [formState.plans, selectedPlanID],
  );
  const selectedPlanScriptEntries = React.useMemo(
    () => {
      if (!selectedPlan) {
        return [];
      }
      return normalizePlanScriptClipboardIDs(selectedPlan.script_clipboard_ids).map((scriptID) => ({
        id: scriptID,
        script: scriptLookup.get(scriptID) || null,
      }));
    },
    [scriptLookup, selectedPlan],
  );
  const selectedPlanScriptNames = React.useMemo(
    () => selectedPlanScriptEntries.map(({ id, script }) =>
      script?.name
      || t("failover.editor.script_missing", {
        defaultValue: "Missing script #{{id}}",
        id,
      })),
    [selectedPlanScriptEntries, t],
  );
  const selectedPlanScriptSearch = React.useMemo(
    () => (selectedPlan ? planScriptSearchQueries[selectedPlan.local_id] || "" : ""),
    [planScriptSearchQueries, selectedPlan],
  );
  const filteredScripts = React.useMemo(
    () => {
      const normalizedQuery = selectedPlanScriptSearch.trim().toLowerCase();
      if (!normalizedQuery) {
        return sortedScripts;
      }
      return sortedScripts.filter((script) => {
        const haystack = `${String(script.name || "").trim()} ${String(script.remark || "").trim()}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      });
    },
    [selectedPlanScriptSearch, sortedScripts],
  );
  const configuredScriptDomain = React.useMemo(
    () => String(userSettings.script_domain || "").trim(),
    [userSettings.script_domain],
  );
  const selectedPlanIndex = selectedPlan
    ? formState.plans.findIndex((plan) => plan.local_id === selectedPlan.local_id)
    : -1;
  const selectedPlanPayload = React.useMemo(
    () => parsePlanPayloadObject(selectedPlan?.payload || "{}"),
    [selectedPlan?.payload],
  );
  const selectedPlanService = React.useMemo(
    () => normalizeAWSService(selectedPlanPayload.service),
    [selectedPlanPayload],
  );
  const selectedPlanRegion = React.useMemo(
    () => getStringValue(selectedPlanPayload.region),
    [selectedPlanPayload],
  );
  const selectedPlanSize = React.useMemo(
    () => getStringValue(selectedPlanPayload.size),
    [selectedPlanPayload],
  );
  const selectedPlanImage = React.useMemo(
    () => getStringValue(selectedPlanPayload.image),
    [selectedPlanPayload],
  );
  const selectedPlanType = React.useMemo(
    () => getStringValue(selectedPlanPayload.type),
    [selectedPlanPayload],
  );
  const selectedAWSEC2ImageID = React.useMemo(
    () => getStringValue(selectedPlanPayload.image_id),
    [selectedPlanPayload],
  );
  const selectedAWSEC2InstanceType = React.useMemo(
    () => getStringValue(selectedPlanPayload.instance_type),
    [selectedPlanPayload],
  );
  const selectedAWSEC2ImageArchitecture = React.useMemo(
    () => inferEC2ImageArchitecture(selectedAWSEC2ImageID),
    [selectedAWSEC2ImageID],
  );
  const selectedAWSEC2InstanceArchitecture = React.useMemo(
    () => inferEC2InstanceArchitecture(selectedAWSEC2InstanceType),
    [selectedAWSEC2InstanceType],
  );
  const awsEc2ArchitectureMismatch = Boolean(
    selectedAWSEC2ImageArchitecture
      && selectedAWSEC2InstanceArchitecture
      && selectedAWSEC2ImageArchitecture !== selectedAWSEC2InstanceArchitecture,
  );
  const selectedLightsailBlueprintID = React.useMemo(
    () => getStringValue(selectedPlanPayload.blueprint_id),
    [selectedPlanPayload],
  );
  const selectedLightsailBundleID = React.useMemo(
    () => getStringValue(selectedPlanPayload.bundle_id),
    [selectedPlanPayload],
  );
  const selectedLightsailBlueprintPlatform = React.useMemo(
    () => inferLightsailBlueprintPlatform(selectedLightsailBlueprintID),
    [selectedLightsailBlueprintID],
  );
  const selectedLightsailBundlePlatform = React.useMemo(
    () => inferLightsailBundlePlatform(selectedLightsailBundleID),
    [selectedLightsailBundleID],
  );
  const awsLightsailPlatformMismatch = Boolean(
    selectedLightsailBlueprintPlatform
      && selectedLightsailBundlePlatform
      && selectedLightsailBlueprintPlatform !== selectedLightsailBundlePlatform,
  );
  const selectedAWSTagsText = React.useMemo(
    () => formatAWSTagsText(getAWSTagArrayValue(selectedPlanPayload.tags)),
    [selectedPlanPayload],
  );
  const isAWSPlan = selectedPlan?.provider === "aws";
  const awsRegionOptions = React.useMemo(
    () => appendCatalogOptionIfMissing(
      mergeCatalogOptions(COMMON_AWS_REGIONS, planCatalog?.regions || []),
      selectedPlanRegion,
    ),
    [planCatalog, selectedPlanRegion],
  );
  const awsEc2ImageOptions = React.useMemo(
    () => appendCatalogOptionIfMissing(
      STATIC_EC2_IMAGE_PRESETS.map((preset) => ({
        value: preset.value,
        label: preset.label,
        hint: preset.summary,
      })),
      getStringValue(selectedPlanPayload.image_id),
    ),
    [selectedPlanPayload],
  );
  const awsEc2InstanceTypeOptions = React.useMemo(
    () => appendCatalogOptionIfMissing(
      STATIC_EC2_INSTANCE_TYPE_PRESETS.map((preset) => ({
        value: preset.value,
        label: preset.label,
        hint: preset.summary,
      })),
      getStringValue(selectedPlanPayload.instance_type),
    ),
    [selectedPlanPayload],
  );
  const awsLightsailBlueprintOptions = React.useMemo(
    () => appendCatalogOptionIfMissing(
      STATIC_LIGHTSAIL_BLUEPRINT_PRESETS.map((preset) => ({
        value: preset.value,
        label: preset.label,
        hint: preset.summary,
      })),
      getStringValue(selectedPlanPayload.blueprint_id),
    ),
    [selectedPlanPayload],
  );
  const awsLightsailBundleOptions = React.useMemo(
    () => appendCatalogOptionIfMissing(
      STATIC_LIGHTSAIL_BUNDLE_PRESETS.map((preset) => ({
        value: preset.value,
        label: preset.label,
        hint: preset.summary,
      })),
      getStringValue(selectedPlanPayload.bundle_id),
    ),
    [selectedPlanPayload],
  );
  const isDigitalOceanProvisionPlan = selectedPlan?.provider === "digitalocean" && selectedPlan.action_type === "provision_instance";
  const digitalOceanPlanCatalog = React.useMemo(
    () => (
      isDigitalOceanProvisionPlan
        ? mergeDigitalOceanPlanCatalogWithCommon(planCatalog, selectedPlanRegion)
        : null
    ),
    [isDigitalOceanProvisionPlan, planCatalog, selectedPlanRegion],
  );
  const isLinodeProvisionPlan = selectedPlan?.provider === "linode" && selectedPlan.action_type === "provision_instance";
  const linodePlanCatalog = React.useMemo(
    () => (
      isLinodeProvisionPlan
        ? mergeLinodePlanCatalogWithCommon(planCatalog, selectedPlanRegion)
        : null
    ),
    [isLinodeProvisionPlan, planCatalog, selectedPlanRegion],
  );
  const digitalOceanRegionOptions = React.useMemo(
    () => appendCatalogOptionIfMissing(digitalOceanPlanCatalog?.regions || [], selectedPlanRegion),
    [digitalOceanPlanCatalog, selectedPlanRegion],
  );
  const digitalOceanSizeOptions = React.useMemo(
    () => appendCatalogOptionIfMissing(digitalOceanPlanCatalog?.sizes || [], selectedPlanSize),
    [digitalOceanPlanCatalog, selectedPlanSize],
  );
  const digitalOceanImageOptions = React.useMemo(
    () => appendCatalogOptionIfMissing(digitalOceanPlanCatalog?.images || [], selectedPlanImage),
    [digitalOceanPlanCatalog, selectedPlanImage],
  );
  const linodeRegionOptions = React.useMemo(
    () => appendCatalogOptionIfMissing(linodePlanCatalog?.regions || [], selectedPlanRegion),
    [linodePlanCatalog, selectedPlanRegion],
  );
  const linodeTypeOptions = React.useMemo(
    () => appendCatalogOptionIfMissing(linodePlanCatalog?.types || [], selectedPlanType),
    [linodePlanCatalog, selectedPlanType],
  );
  const linodeImageOptions = React.useMemo(
    () => appendCatalogOptionIfMissing(linodePlanCatalog?.images || [], selectedPlanImage),
    [linodePlanCatalog, selectedPlanImage],
  );
  const canLoadPlanCatalog = Boolean(
    selectedPlan?.provider.trim()
    && (selectedPlan.provider_entry_id.trim() || selectedPlan.provider_entry_group.trim()),
  );
  const usesCommonPlanCatalogDefaults = isDigitalOceanProvisionPlan || isLinodeProvisionPlan;
  const showPlanCatalogLoadActions = !isAWSPlan;
  const canLoadPlanDetails = canLoadPlanCatalog && (usesCommonPlanCatalogDefaults || Boolean(selectedPlanRegion.trim()));
  const suggestedAutoConnectGroup = React.useMemo(
    () => (
      selectedPlan
        ? buildSuggestedAutoConnectGroup(
          selectedPlan.provider,
          providerEntries,
          selectedPlan.provider_entry_group,
          selectedPlan.provider_entry_id,
        )
        : ""
    ),
    [providerEntries, selectedPlan],
  );
  const selectedPlanUsesCustomAutoConnectGroup = React.useMemo(
    () => {
      if (!selectedPlan) {
        return false;
      }
      const explicitValue = customAutoConnectGroupModes[selectedPlan.local_id];
      if (typeof explicitValue === "boolean") {
        return explicitValue;
      }
      return !shouldSyncAutoConnectGroup(selectedPlan, providerEntries);
    },
    [customAutoConnectGroupModes, providerEntries, selectedPlan],
  );
  const selectedPlanDisplayedAutoConnectGroup = selectedPlanUsesCustomAutoConnectGroup
    ? getStringValue(selectedPlan?.auto_connect_group)
    : suggestedAutoConnectGroup;
  const selectedPlanAdvancedOpen = selectedPlan ? Boolean(planAdvancedOpenState[selectedPlan.local_id]) : false;
  const selectedPlanOrganizerOpen = selectedPlan
    ? planSectionOpenState[selectedPlan.local_id]?.organizer ?? false
    : false;
  const selectedPlanCoreOpen = selectedPlan
    ? planSectionOpenState[selectedPlan.local_id]?.core ?? true
    : true;
  const selectedPlanConfigOpen = selectedPlan
    ? planSectionOpenState[selectedPlan.local_id]?.config ?? true
    : true;
  const selectedPlanOptionalOpen = selectedPlan
    ? planSectionOpenState[selectedPlan.local_id]?.optional ?? false
    : false;
  const dnsCatalogRecords = React.useMemo(
    () => (dnsCatalog?.records || []).filter((record) => {
      const recordType = normalizeDnsRecordType(record.type);
      return recordType === "A" || recordType === "AAAA";
    }),
    [dnsCatalog],
  );
  const dnsZoneOptions = React.useMemo(
    () => getDNSZoneOptions(dnsCatalog, formState.dns_zone_name),
    [dnsCatalog, formState.dns_zone_name],
  );
  const dnsDomainOptions = React.useMemo(
    () => getDNSDomainOptions(dnsCatalog, formState.dns_domain_name),
    [dnsCatalog, formState.dns_domain_name],
  );
  const dnsTTLOptions = React.useMemo(
    () => getDNSTTLOptions(t, dnsCatalog, formState.dns_ttl),
    [dnsCatalog, formState.dns_ttl, t],
  );
  const dnsSyncMode = React.useMemo(
    () => getDnsSyncMode(formState.dns_record_type, formState.dns_sync_ipv6),
    [formState.dns_record_type, formState.dns_sync_ipv6],
  );
  const dnsSyncModeOptions = React.useMemo(
    () => getDnsSyncModeOptions(t),
    [t],
  );
  const dnsSyncModeLabel = React.useMemo(
    () => dnsSyncModeOptions.find((option) => option.value === dnsSyncMode)?.label || dnsSyncMode,
    [dnsSyncMode, dnsSyncModeOptions],
  );
  const aliyunLineOptions = React.useMemo(
    () => getAliyunLineOptions(t, dnsCatalog, formState.dns_lines),
    [dnsCatalog, formState.dns_lines, t],
  );
  const hasDnsEnabled = Boolean(formState.dns_provider.trim());
  const firstConfiguredDnsProvider = React.useMemo(
    () => getFirstConfiguredProvider(providerEntries, DNS_PROVIDER_VALUES),
    [providerEntries],
  );
  const hasAnyDnsCredential = Boolean(firstConfiguredDnsProvider);
  const hasMultiplePlans = formState.plans.length > 1;
  const hasEnabledProvisionPlan = React.useMemo(
    () => formState.plans.some((plan) =>
      plan.enabled
      && plan.provider.trim()
      && planCanProvision(plan.provider, plan.action_type),
    ),
    [formState.plans],
  );
  const currentTaskInput = React.useMemo(
    () => tryBuildTaskInput(formState, t),
    [formState, t],
  );
  const currentPreviewSignature = React.useMemo(
    () => (currentTaskInput ? JSON.stringify(currentTaskInput) : ""),
    [currentTaskInput],
  );
  const previewSummary = React.useMemo(
    () => summarizeFailoverPreview(previewResult),
    [previewResult],
  );
  const previewHasRun = Boolean(previewPayloadSignature);
  const previewOutdated = previewHasRun && previewPayloadSignature !== currentPreviewSignature;
  const previewSaveBlockedReason = previewOutdated
    ? t("failover.preview.outdated_blocked", {
      defaultValue: "Preview is outdated. Run Preview again before saving.",
    })
    : String(previewError || "").trim()
      ? t("failover.preview.error_blocked", {
        defaultValue: "Preview failed for the current form. Run Preview again before saving.",
      })
      : previewSummary.errorCount > 0
        ? t("failover.preview.checks_blocked", {
          defaultValue: "Preview found blocking errors. Fix them before saving.",
        })
        : "";
  const previewFooterHint = previewSaveBlockedReason
    || (
      previewHasRun && previewSummary.warningCount > 0
        ? t("failover.preview.warning_footer", {
          defaultValue: "Preview has warnings. Saving is allowed, but review them first.",
        })
        : previewHasRun
          ? t("failover.preview.ready_footer", {
            defaultValue: "Preview is up to date for the current form.",
          })
          : t("failover.preview.recommended_footer", {
            defaultValue: "Preview is recommended before saving cloud failover changes.",
          })
    );
  const hasPreviewDetail = previewing || Boolean(String(previewError || "").trim()) || Boolean(previewResult);
  const previewSummaryStatusTone: SummaryStatusTone = String(previewError || "").trim()
    ? "danger"
    : previewSaveBlockedReason || (previewHasRun && previewSummary.warningCount > 0)
      ? "warning"
      : "neutral";
  const previewSummaryStatusMessage = hasPreviewDetail
    ? String(previewError || "").trim() || previewFooterHint
    : "";
  const previewSummaryItems = React.useMemo(
    () => {
      const statusLabel = previewing
        ? t("failover.preview.running", { defaultValue: "Running" })
        : String(previewError || "").trim()
          ? t("failover.preview.failed", { defaultValue: "Failed" })
          : previewResult
            ? (previewResult.success
              ? t("failover.preview.ready", { defaultValue: "Ready" })
              : t("failover.preview.attention", { defaultValue: "Needs attention" }))
            : t("failover.preview.not_run", { defaultValue: "Not run yet" });
      const items = [
        buildDetailItem(
          t("failover.preview.status_label", { defaultValue: "Preview status" }),
          statusLabel,
        ),
        buildDetailItem(
          t("failover.preview.generated_at_label", { defaultValue: "Last preview" }),
          previewResult?.generated_at ? formatDateTime(previewResult.generated_at) : "",
        ),
        buildDetailItem(
          t("failover.preview.freshness_label", { defaultValue: "Freshness" }),
          previewHasRun
            ? (previewOutdated
              ? t("failover.preview.outdated", { defaultValue: "Outdated" })
              : t("failover.preview.fresh", { defaultValue: "Fresh" }))
            : "",
        ),
        buildDetailItem(
          t("failover.preview.check_total_label", { defaultValue: "Checks" }),
          previewResult ? String(previewSummary.total) : "",
        ),
        buildDetailItem(
          t("failover.preview.error_total_label", { defaultValue: "Errors" }),
          previewResult ? String(previewSummary.errorCount) : "",
        ),
        buildDetailItem(
          t("failover.preview.warning_total_label", { defaultValue: "Warnings" }),
          previewResult ? String(previewSummary.warningCount) : "",
        ),
      ].filter((item): item is DetailItem => Boolean(item));
      return items;
    },
    [
      previewError,
      previewHasRun,
      previewOutdated,
      previewResult,
      previewSummary.errorCount,
      previewSummary.total,
      previewSummary.warningCount,
      previewing,
      t,
    ],
  );
  const taskMonitoringSummaryItems = React.useMemo(
    () => {
      const items = [
        buildDetailItem(
          t("failover.editor.failure_threshold", { defaultValue: "Failure threshold" }),
          formState.failure_threshold,
        ),
        buildDetailItem(
          t("failover.editor.stale_after", { defaultValue: "Stale after (s)" }),
          formState.stale_after_seconds,
        ),
        buildDetailItem(
          t("failover.editor.cooldown", { defaultValue: "Cooldown (s)" }),
          formState.cooldown_seconds,
        ),
        buildDetailItem(
          t("failover.editor.provision_retry_limit", { defaultValue: "Blocked retry limit" }),
          formState.provision_retry_limit,
        ),
        buildDetailItem(
          t("failover.editor.provision_failure_fallback_limit", { defaultValue: "Plan fallback after provision failures" }),
          formState.provision_failure_fallback_limit,
        ),
      ].filter((item): item is DetailItem => Boolean(item));
      return items;
    },
    [
      formState.cooldown_seconds,
      formState.failure_threshold,
      formState.provision_failure_fallback_limit,
      formState.provision_retry_limit,
      formState.stale_after_seconds,
      t,
    ],
  );
  const taskCoreSummary = React.useMemo(
    () => describeTaskMonitoringCoreSettings(t, formState),
    [
      formState,
      t,
    ],
  );
  const taskRetrySummary = React.useMemo(
    () => describeTaskRetrySettings(t, formState),
    [
      formState,
      t,
    ],
  );
  const selectedDnsEntryLabel = React.useMemo(
    () => {
      if (!formState.dns_provider.trim()) {
        return "";
      }
      const options = buildProviderEntryOptions({
        entries: providerEntries[formState.dns_provider] || [],
        currentValue: formState.dns_entry_id,
      });
      return options.find((option) => option.id === formState.dns_entry_id)?.label || formState.dns_entry_id;
    },
    [formState.dns_entry_id, formState.dns_provider, providerEntries],
  );
  const dnsTargetSummaryLabel = React.useMemo(
    () => getDnsFormTargetLabel(formState),
    [formState],
  );
  const deleteStrategyLabel = React.useMemo(
    () => getDeleteStrategyOptions(t, formState.plans).find((option) => option.value === formState.delete_strategy)?.label || formState.delete_strategy,
    [formState.delete_strategy, formState.plans, t],
  );
  const dnsSummaryItems = React.useMemo(
    () => {
      const items = [
        buildDetailItem(
          t("failover.editor.dns_provider", { defaultValue: "DNS provider" }),
          formState.dns_provider ? getDnsProviderLabel(t, formState.dns_provider) : "",
        ),
        buildDetailItem(
          t("failover.editor.dns_entry", { defaultValue: "DNS credential entry" }),
          selectedDnsEntryLabel,
        ),
        buildDetailItem(
          t("failover.task.dns_target_label", { defaultValue: "DNS target" }),
          dnsTargetSummaryLabel,
        ),
        buildDetailItem(
          t("failover.editor.dns_sync_mode", { defaultValue: "DNS sync mode" }),
          formState.dns_provider ? dnsSyncModeLabel : "",
        ),
        buildDetailItem(
          t("failover.editor.ttl", { defaultValue: "TTL" }),
          formState.dns_provider ? formState.dns_ttl : "",
        ),
        buildDetailItem(
          t("failover.editor.line", { defaultValue: "Routing line" }),
          formState.dns_provider === "aliyun"
            ? formState.dns_lines.map((line) => localizeAliyunLineLabel(t, line)).join(", ")
            : "",
        ),
        buildDetailItem(
          t("failover.editor.proxied", { defaultValue: "Cloudflare proxy" }),
          formState.dns_provider === "cloudflare"
            ? (formState.dns_proxied
              ? t("common.yes", { defaultValue: "Yes" })
              : t("common.no", { defaultValue: "No" }))
            : "",
        ),
        buildDetailItem(
          t("failover.editor.delete_strategy", { defaultValue: "Old instance strategy" }),
          deleteStrategyLabel,
        ),
        buildDetailItem(
          t("failover.editor.delete_delay", { defaultValue: "Delete delay (s)" }),
          formState.delete_strategy === "delete_after_success_delay"
            ? formState.delete_delay_seconds
            : "",
        ),
      ].filter((item): item is DetailItem => Boolean(item));
      return items;
    },
    [
      deleteStrategyLabel,
      dnsSyncModeLabel,
      dnsTargetSummaryLabel,
      formState.delete_delay_seconds,
      formState.delete_strategy,
      formState.dns_lines,
      formState.dns_proxied,
      formState.dns_provider,
      formState.dns_ttl,
      selectedDnsEntryLabel,
      t,
    ],
  );
  const dnsProviderSummaryLabel = React.useMemo(
    () => formState.dns_provider ? getDnsProviderLabel(t, formState.dns_provider) : "",
    [formState.dns_provider, t],
  );
  const dnsCoreSummary = React.useMemo(
    () => describeDnsCoreSettings(
      t,
      hasDnsEnabled,
      dnsProviderSummaryLabel,
      selectedDnsEntryLabel,
      dnsTargetSummaryLabel,
      dnsSyncModeLabel,
      formState.dns_ttl,
    ),
    [
      dnsProviderSummaryLabel,
      dnsSyncModeLabel,
      dnsTargetSummaryLabel,
      formState.dns_ttl,
      hasDnsEnabled,
      selectedDnsEntryLabel,
      t,
    ],
  );
  const dnsAdvancedSummary = React.useMemo(
    () => describeDnsAdvancedSettings(
      t,
      deleteStrategyLabel,
      formState.delete_delay_seconds,
      formState.delete_strategy,
    ),
    [
      deleteStrategyLabel,
      formState.delete_delay_seconds,
      formState.delete_strategy,
      t,
    ],
  );
  const getPlanEntrySummaryLabel = React.useCallback(
    (plan: PlanFormState) => {
      if (!plan.provider.trim()) {
        return "";
      }
      const options = buildPlanProviderEntryOptions(
        t,
        plan.provider,
        providerEntries,
        plan.provider_entry_group,
        plan.provider_entry_id,
      );
      return options.find((option) => option.id === plan.provider_entry_id)?.label || plan.provider_entry_id;
    },
    [providerEntries, t],
  );
  const getScriptDisplayName = React.useCallback((scriptID: string) => {
    const script = scriptLookup.get(scriptID);
    return script?.name || t("failover.editor.script_missing", {
      defaultValue: "Missing script #{{id}}",
      id: scriptID,
    });
  }, [scriptLookup, t]);
  const getPlanScriptPreview = React.useCallback((scriptIDs: string[], limit = Number.MAX_SAFE_INTEGER) => (
    normalizePlanScriptClipboardIDs(scriptIDs)
      .slice(0, limit)
      .map((scriptID) => getScriptDisplayName(scriptID))
      .join(" · ")
  ), [getScriptDisplayName]);
  const selectedPlanEntrySummary = React.useMemo(
    () => {
      if (!selectedPlan) {
        return "";
      }
      return [
        selectedPlan.provider_entry_group
          ? t("failover.execution.summary.entry_group", {
            defaultValue: "Group {{group}}",
            group: selectedPlan.provider_entry_group,
          })
          : "",
        getPlanEntrySummaryLabel(selectedPlan),
      ].filter(Boolean).join(" · ");
    },
    [getPlanEntrySummaryLabel, selectedPlan, t],
  );
  const setSelectedPlanSectionOpen = React.useCallback((section: "organizer" | "core" | "config" | "optional", openState: boolean) => {
    if (!selectedPlan) {
      return;
    }
    setPlanSectionOpenState((current) => ({
      ...current,
      [selectedPlan.local_id]: {
        ...current[selectedPlan.local_id],
        [section]: openState,
      },
    }));
  }, [selectedPlan]);
  const selectedPlanCoreSummary = React.useMemo(
    () => describePlanCoreSettings(t, selectedPlan, selectedPlanEntrySummary),
    [selectedPlan, selectedPlanEntrySummary, t],
  );
  const selectedPlanOrganizerSummary = React.useMemo(
    () => describePlanOrganizerSummary(
      t,
      selectedPlan,
      selectedPlanIndex,
      formState.plans.length,
      selectedPlanCoreSummary,
      selectedPlan?.script_clipboard_ids.length || 0,
    ),
    [formState.plans.length, selectedPlan, selectedPlanCoreSummary, selectedPlanIndex, t],
  );
  const selectedPlanConfigSummary = React.useMemo(
    () => describePlanConfigSettings(t, selectedPlan),
    [selectedPlan, t],
  );
  const selectedPlanOptionalSummary = React.useMemo(
    () => describePlanOptionalSettings(t, selectedPlan, selectedPlanScriptNames),
    [selectedPlan, selectedPlanScriptNames, t],
  );
  const openPlanDialogFor = React.useCallback((localID: string) => {
    setSelectedPlanID(localID);
    setPlanDialogOpen(true);
  }, []);

  React.useEffect(() => {
    if (formState.plans.length === 0) {
      if (selectedPlanID) {
        setSelectedPlanID("");
      }
      return;
    }
    if (!formState.plans.some((plan) => plan.local_id === selectedPlanID)) {
      setSelectedPlanID(formState.plans[0].local_id);
    }
  }, [formState.plans, selectedPlanID]);

  const refreshDnsCatalog = React.useCallback(async (overrides?: { zone_name?: string; domain_name?: string }) => {
    if (!formState.dns_provider.trim() || !formState.dns_entry_id.trim()) {
      setDnsCatalog(null);
      setDnsCatalogError("");
      return;
    }

    const requestID = dnsCatalogRequestRef.current + 1;
    dnsCatalogRequestRef.current = requestID;
    setDnsCatalogLoading(true);
    setDnsCatalogError("");
    try {
      const catalog = await getFailoverDnsCatalog({
        provider: formState.dns_provider,
        entry_id: normalizeProviderEntryID(formState.dns_entry_id),
        zone_name: overrides?.zone_name,
        domain_name: overrides?.domain_name,
      });
      if (dnsCatalogRequestRef.current !== requestID) {
        return;
      }
      setDnsCatalog(catalog);
      setFormState((current) => applyDnsCatalogDefaults(current, catalog));
    } catch (error) {
      if (dnsCatalogRequestRef.current !== requestID) {
        return;
      }
      setDnsCatalog(null);
      setDnsCatalogError(error instanceof Error ? error.message : t("common.unknown_error"));
    } finally {
      if (dnsCatalogRequestRef.current === requestID) {
        setDnsCatalogLoading(false);
      }
    }
  }, [
    formState.dns_entry_id,
    formState.dns_provider,
    t,
  ]);

  React.useEffect(() => {
    if (!open) {
      return;
    }
    if (!formState.dns_entry_id.trim()) {
      setDnsCatalog(null);
      setDnsCatalogError("");
      setDnsCatalogLoading(false);
      return;
    }
    void refreshDnsCatalog();
  }, [open, formState.dns_provider, formState.dns_entry_id, refreshDnsCatalog]);

  const updateTaskField = <K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) => {
    setFormState((current) => {
      const nextState = { ...current, [key]: value };
      return {
        ...nextState,
        delete_strategy: resolveTaskDeleteStrategy(nextState.delete_strategy, nextState.plans),
      };
    });
  };

  const setDnsEnabled = React.useCallback((enabled: boolean) => {
    if (!enabled) {
      if (formState.dns_provider.trim()) {
        lastEnabledDnsRef.current = {
          provider: formState.dns_provider,
          entryID: formState.dns_entry_id,
        };
      }
      setFormState((current) => ({
        ...current,
        dns_provider: "",
        dns_entry_id: "",
      }));
      setDnsCatalog(null);
      setDnsCatalogError("");
      setSelectedDnsRecordKey("");
      return;
    }

    const remembered = lastEnabledDnsRef.current;
    const rememberedProvider =
      remembered?.provider && (providerEntries[remembered.provider] || []).length > 0
        ? remembered.provider
        : "";
    const nextProvider = rememberedProvider || firstConfiguredDnsProvider;
    if (!nextProvider) {
      return;
    }

    const options = buildProviderEntryOptions({
      entries: providerEntries[nextProvider] || [],
      currentValue: remembered?.provider === nextProvider ? remembered.entryID : undefined,
    });
    const rememberedEntry =
      remembered?.provider === nextProvider && remembered.entryID
        ? remembered.entryID
        : "";
    const nextEntryID =
      options.find((option) => option.id === rememberedEntry)?.id
      || options[0]?.id
      || "";

    setFormState((current) => ({
      ...current,
      dns_provider: nextProvider,
      dns_entry_id: nextEntryID,
      ...(remembered?.provider === nextProvider
        ? {}
        : buildDefaultDnsFields(nextProvider, providerEntries, nextEntryID)),
    }));
    setDnsCatalog(null);
    setDnsCatalogError("");
    setSelectedDnsRecordKey("");
  }, [
    firstConfiguredDnsProvider,
    formState.dns_entry_id,
    formState.dns_provider,
    providerEntries,
  ]);

  const updatePlan = React.useCallback((localID: string, updater: (plan: PlanFormState) => PlanFormState) => {
    setFormState((current) => {
      const nextState = {
        ...current,
        plans: current.plans.map((plan) => (plan.local_id === localID ? updater(plan) : plan)),
      };
      return {
        ...nextState,
        delete_strategy: resolveTaskDeleteStrategy(nextState.delete_strategy, nextState.plans),
      };
    });
  }, []);

  const setSelectedPlanAdvancedOpen = React.useCallback((openState: boolean) => {
    if (!selectedPlan) {
      return;
    }
    setPlanAdvancedOpenState((current) => ({
      ...current,
      [selectedPlan.local_id]: openState,
    }));
  }, [selectedPlan]);

  const setSelectedPlanCustomAutoConnectGroup = React.useCallback((custom: boolean) => {
    if (!selectedPlan) {
      return;
    }

    setCustomAutoConnectGroupModes((current) => ({
      ...current,
      [selectedPlan.local_id]: custom,
    }));

    if (!custom) {
      updatePlan(selectedPlan.local_id, (current) => ({
        ...current,
        auto_connect_group: suggestedAutoConnectGroup,
      }));
    }
  }, [selectedPlan, suggestedAutoConnectGroup, updatePlan]);

  const togglePlanScript = React.useCallback((localID: string, scriptID: string, checked: boolean) => {
    updatePlan(localID, (current) => {
      const currentIDs = normalizePlanScriptClipboardIDs(current.script_clipboard_ids);
      if (checked) {
        if (currentIDs.includes(scriptID)) {
          return current;
        }
        return {
          ...current,
          script_clipboard_ids: [...currentIDs, scriptID],
        };
      }
      return {
        ...current,
        script_clipboard_ids: currentIDs.filter((currentID) => currentID !== scriptID),
      };
    });
  }, [updatePlan]);

  const movePlanScriptToIndex = React.useCallback((localID: string, scriptID: string, targetIndex: number) => {
    updatePlan(localID, (current) => {
      const currentIDs = normalizePlanScriptClipboardIDs(current.script_clipboard_ids);
      const currentIndex = currentIDs.indexOf(scriptID);
      if (currentIndex < 0) {
        return current;
      }

      const clampedIndex = Math.max(0, Math.min(targetIndex, currentIDs.length - 1));
      if (clampedIndex === currentIndex) {
        return current;
      }

      return {
        ...current,
        script_clipboard_ids: moveItemInArray(currentIDs, currentIndex, clampedIndex),
      };
    });
  }, [updatePlan]);

  const removePlanScript = React.useCallback((localID: string, scriptID: string) => {
    updatePlan(localID, (current) => ({
      ...current,
      script_clipboard_ids: normalizePlanScriptClipboardIDs(current.script_clipboard_ids)
        .filter((currentID) => currentID !== scriptID),
    }));
  }, [updatePlan]);

  const updateSelectedPlanPayload = React.useCallback((updater: (payload: Record<string, unknown>) => Record<string, unknown>) => {
    if (!selectedPlan) {
      return;
    }

    updatePlan(selectedPlan.local_id, (current) => {
      const nextPayload = updater({ ...parsePlanPayloadObject(current.payload) });
      return {
        ...current,
        payload: prettyJson(nextPayload),
      };
    });
  }, [selectedPlan, updatePlan]);

  const movePlanToIndex = React.useCallback((localID: string, targetIndex: number) => {
    setFormState((current) => {
      const currentIndex = current.plans.findIndex((plan) => plan.local_id === localID);
      if (currentIndex < 0) {
        return current;
      }

      const clampedIndex = Math.max(0, Math.min(targetIndex, current.plans.length - 1));
      if (clampedIndex === currentIndex) {
        return current;
      }

      const nextPlans = [...current.plans];
      const [movedPlan] = nextPlans.splice(currentIndex, 1);
      nextPlans.splice(clampedIndex, 0, movedPlan);

      const nextState = {
        ...current,
        plans: renumberPlanPriorities(nextPlans),
      };
      return {
        ...nextState,
        delete_strategy: resolveTaskDeleteStrategy(nextState.delete_strategy, nextState.plans),
      };
    });
    setSelectedPlanID(localID);
  }, []);

  const refreshPlanCatalog = React.useCallback(async (overrides?: { service?: string; region?: string; mode?: "regions" | "full" }) => {
    if (!selectedPlan?.provider.trim() || (!selectedPlan.provider_entry_id.trim() && !selectedPlan.provider_entry_group.trim())) {
      resetPlanCatalogState();
      return;
    }

    const requestedMode = overrides?.mode || "full";
    const requestID = planCatalogRequestRef.current + 1;
    planCatalogRequestRef.current = requestID;
    setPlanCatalogLoading(true);
    setPlanCatalogLoadMode(requestedMode);
    setPlanCatalogError("");
    try {
      const catalog = await getFailoverPlanCatalog({
        provider: selectedPlan.provider,
        entry_id: normalizePlanProviderEntryID(selectedPlan.provider, selectedPlan.provider_entry_id),
        entry_group: selectedPlan.provider_entry_group.trim(),
        action_type: selectedPlan.action_type,
        service: overrides?.service || selectedPlanService,
        region: overrides?.region || selectedPlanRegion,
        mode: requestedMode,
      });
      if (planCatalogRequestRef.current !== requestID) {
        return;
      }
      setPlanCatalog(catalog);
      if (requestedMode === "full" && !selectedPlanRegion.trim() && catalog.region) {
        updateSelectedPlanPayload((current) => ({
          ...current,
          region: catalog.region,
        }));
      }
    } catch (error) {
      if (planCatalogRequestRef.current !== requestID) {
        return;
      }
      resetPlanCatalogState();
      setPlanCatalogError(error instanceof Error ? error.message : t("common.unknown_error"));
    } finally {
      if (planCatalogRequestRef.current === requestID) {
        setPlanCatalogLoading(false);
      }
    }
  }, [
    resetPlanCatalogState,
    selectedPlan,
    selectedPlanRegion,
    selectedPlanService,
    t,
    updateSelectedPlanPayload,
  ]);

  React.useEffect(() => {
    if (!open) {
      resetPlanCatalogState();
      return;
    }
    resetPlanCatalogState();
  }, [open, resetPlanCatalogState, selectedPlan?.local_id]);

  const addPlan = () => {
    const nextPlan = {
      ...createEmptyPlanForm(providerEntries),
      priority: String(formState.plans.length + 1),
    };
    setFormState((current) => {
      const nextState = {
        ...current,
        plans: renumberPlanPriorities([...current.plans, nextPlan]),
      };
      return {
        ...nextState,
        delete_strategy: resolveTaskDeleteStrategy(nextState.delete_strategy, nextState.plans),
      };
    });
    setSelectedPlanID(nextPlan.local_id);
  };

  const duplicateSelectedPlan = React.useCallback(() => {
    if (!selectedPlan) {
      return;
    }

    const nextPlan: PlanFormState = {
      ...selectedPlan,
      local_id: createLocalID(),
      name: [String(selectedPlan.name || "").trim(), copyLabel].filter(Boolean).join(" ").trim(),
      enabled: false,
      priority: String(formState.plans.length + 1),
      script_clipboard_ids: [...selectedPlan.script_clipboard_ids],
    };

    setFormState((current) => {
      const nextState = {
        ...current,
        plans: renumberPlanPriorities([...current.plans, nextPlan]),
      };
      return {
        ...nextState,
        delete_strategy: resolveTaskDeleteStrategy(nextState.delete_strategy, nextState.plans),
      };
    });
    setSelectedPlanID(nextPlan.local_id);
  }, [copyLabel, formState.plans.length, selectedPlan]);

  const removePlan = (localID: string) => {
    setFormState((current) => {
      const nextState = {
        ...current,
        plans: renumberPlanPriorities(current.plans.filter((plan) => plan.local_id !== localID)),
      };
      return {
        ...nextState,
        delete_strategy: resolveTaskDeleteStrategy(nextState.delete_strategy, nextState.plans),
      };
    });
  };

  const handlePreview = async () => {
    setPreviewing(true);
    setPreviewError("");

    try {
      const payload = buildTaskInput(formState, t);
      const preview = await previewFailoverTask(payload);
      setPreviewResult(preview);
      setPreviewPayloadSignature(JSON.stringify(payload));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("common.unknown_error");
      setPreviewResult(null);
      setPreviewError(message);
      setPreviewPayloadSignature("");
      toast.error(message);
    } finally {
      setPreviewing(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (previewSaveBlockedReason) {
      toast.error(previewSaveBlockedReason);
      return;
    }
    setSubmitting(true);

    try {
      const settingsSnapshot = settingsLoading
        ? await refetchSettings()
        : userSettings;
      const scriptDomain = String(settingsSnapshot.script_domain || "").trim();
      if (hasEnabledProvisionPlan && !scriptDomain) {
        throw new Error(
          t("failover.validation.script_domain_required", {
            defaultValue:
              "Agent connection address is required for failover auto-connect. Set it in Settings -> Site before saving or running this task.",
          }),
        );
      }
      const payload = buildTaskInput(formState, t);
      if (mode === "edit" && task) {
        await updateFailoverTask(task.id, payload);
        toast.success(t("failover.messages.updated", { defaultValue: "Failover task updated" }));
      } else {
        await createFailoverTask(payload);
        toast.success(t("failover.messages.created", { defaultValue: "Failover task created" }));
      }
      await onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.unknown_error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex h-[95vh] min-h-0 w-[calc(100vw-2rem)] max-w-[96rem] flex-col overflow-hidden p-0",
          "[&_.grid>*]:min-w-0",
          "[&_button[data-slot=select-trigger]]:w-full",
          "[&_button[data-slot=select-trigger]]:min-w-0",
          "[&_button[data-slot=select-trigger]]:max-w-full",
          "[&_button[data-slot=select-trigger]]:overflow-hidden",
          "[&_button[data-slot=select-trigger]_[data-slot=select-value]]:min-w-0",
          "[&_button[data-slot=select-trigger]_[data-slot=select-value]]:flex-1",
          "[&_button[data-slot=select-trigger]_[data-slot=select-value]]:truncate",
          "[&_button[data-slot=select-trigger]_[data-slot=select-value]]:text-left",
        )}
      >
        <DialogHeader className="shrink-0 border-b bg-background px-5 py-4">
          <DialogTitle>
            {mode === "edit"
              ? t("failover.editor.edit_title", { defaultValue: "Edit failover task" })
              : t("failover.editor.create_title", { defaultValue: "Create failover task" })}
          </DialogTitle>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-5 [scrollbar-gutter:stable]">
              <div className="space-y-6">
                <section className="space-y-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                      {t("failover.editor.step_task", { defaultValue: "1. Task" })}
                    </div>
                  </div>
                  <div className="space-y-4 rounded-xl border px-4 py-4">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                      <div className="space-y-2">
                        <Label htmlFor="failover-name">{t("common.name", { defaultValue: "Name" })}</Label>
                        <Input
                          id="failover-name"
                          value={formState.name}
                          onChange={(event) => updateTaskField("name", event.target.value)}
                          placeholder={t("failover.editor.name_placeholder", { defaultValue: "CN failover for production edge" })}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/20 px-4 py-3 lg:min-w-56">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                            {t("failover.editor.enabled", { defaultValue: "Task enabled" })}
                          </div>
                        </div>
                        <Switch
                          checked={formState.enabled}
                          onCheckedChange={(checked) => updateTaskField("enabled", Boolean(checked))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("failover.editor.current_client", { defaultValue: "Current client" })}</Label>
                      <SearchableCatalogSelect
                        value={formState.current_client_uuid || undefined}
                        options={currentClientOptions}
                        placeholder={t("failover.editor.current_client_placeholder", { defaultValue: "Choose a current client" })}
                        searchPlaceholder={t("failover.editor.current_client_search_placeholder", { defaultValue: "Search clients..." })}
                        emptyLabel={t("failover.editor.current_client_search_empty", { defaultValue: "No matching client" })}
                        onValueChange={(value) => updateTaskField("current_client_uuid", value)}
                      />
                      <div className="text-xs text-muted-foreground">
                        {selectedCurrentClientNode
                          ? `${t("failover.editor.current_ip", { defaultValue: "IP" })}: ${selectedCurrentClientNode.ipv4 || selectedCurrentClientNode.ipv6 || t("failover.editor.current_ip_empty", { defaultValue: "IP not recorded yet." })}`
                          : t("failover.editor.current_client_hint", {
                            defaultValue: "Select the client that represents the current outlet so failover can match the existing instance before deciding to create a replacement.",
                          })}
                      </div>
                    </div>
                    <div className="rounded-xl border bg-background px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {t("failover.editor.current_outlet", { defaultValue: "Current outlet" })}
                      </div>
                      {mode === "edit" && (task?.current_client_uuid || task?.current_address) ? (
                        <div className="mt-2 space-y-1 text-sm">
                          <div className="truncate font-medium text-slate-900 dark:text-slate-50" title={currentOutletNode ? getNodeLabel(currentOutletNode) : task.current_client_uuid || task.current_address || undefined}>
                            {currentOutletNode ? getNodeLabel(currentOutletNode) : task.current_client_uuid || task.current_address}
                          </div>
                          <div className="truncate text-xs text-muted-foreground" title={task.current_address || undefined}>
                            {task.current_address
                              ? `${t("failover.editor.current_ip", { defaultValue: "IP" })}: ${task.current_address}`
                              : t("failover.editor.current_ip_empty", { defaultValue: "IP not recorded yet." })}
                          </div>
                          {task.current_client_uuid ? (
                            <div className="truncate text-xs text-muted-foreground" title={task.current_client_uuid}>
                              {t("failover.editor.current_client", { defaultValue: "Client" })}: {task.current_client_uuid}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {t("failover.editor.current_outlet_hint", {
                            defaultValue: "This task is not initialized yet. Save it first, then run initialization to create the first outlet.",
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <ActionSummaryCard
                    title={t("failover.editor.show_task_advanced", {
                      defaultValue: "Advanced monitoring settings",
                    })}
                    hint={t("failover.editor.task_summary_hint", {
                      defaultValue: "Keep the main dialog focused on task identity and current outlet. Open the secondary dialog when you need to tune thresholds or retry behavior.",
                    })}
                    actionLabel={t("common.edit", { defaultValue: "Edit" })}
                    onAction={() => setTaskDialogOpen(true)}
                    items={taskMonitoringSummaryItems}
                  />
              </section>

              <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                <DialogContent className="flex h-[82vh] min-h-0 w-[calc(100vw-2rem)] max-w-4xl flex-col overflow-hidden p-0">
                  <DialogHeader className="shrink-0 border-b bg-background px-5 py-4">
                    <DialogTitle>
                      {t("failover.editor.show_task_advanced", {
                        defaultValue: "Advanced monitoring settings",
                      })}
                    </DialogTitle>
                    <DialogDescription>
                      {t("failover.editor.task_dialog_description", {
                        defaultValue: "Tune failure thresholds, stale-data windows, cooldown, and retry behavior without crowding the main task dialog.",
                      })}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-5 [scrollbar-gutter:stable]">
                    <section className="space-y-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                          {t("failover.editor.step_task", { defaultValue: "1. Task" })}
                        </div>
                      </div>
                      <Collapsible open={taskAdvancedOpen} onOpenChange={setTaskAdvancedOpen}>
                        <div className="rounded-xl border">
                          <CollapsibleTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              className="flex min-w-0 h-auto w-full items-center justify-between rounded-xl px-4 py-4 text-left"
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                  {t("failover.editor.monitoring_core", {
                                    defaultValue: "Monitoring thresholds",
                                  })}
                                </div>
                                <div className="line-clamp-2 break-words text-xs text-muted-foreground">
                                  {taskCoreSummary}
                                </div>
                              </div>
                              <ChevronDown
                                className={cn(
                                  "size-4 shrink-0 text-muted-foreground transition-transform",
                                  taskAdvancedOpen ? "rotate-180" : "",
                                )}
                              />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="border-t px-4 py-4">
                            <div className="grid gap-4 lg:grid-cols-3">
                              <div className="space-y-2">
                                <Label htmlFor="failover-threshold">{t("failover.editor.failure_threshold", { defaultValue: "Failure threshold" })}</Label>
                                <Input
                                  id="failover-threshold"
                                  type="number"
                                  min={1}
                                  value={formState.failure_threshold}
                                  onChange={(event) => updateTaskField("failure_threshold", event.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="failover-stale">{t("failover.editor.stale_after", { defaultValue: "Stale after (s)" })}</Label>
                                <Input
                                  id="failover-stale"
                                  type="number"
                                  min={1}
                                  value={formState.stale_after_seconds}
                                  onChange={(event) => updateTaskField("stale_after_seconds", event.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="failover-cooldown">{t("failover.editor.cooldown", { defaultValue: "Cooldown (s)" })}</Label>
                                <Input
                                  id="failover-cooldown"
                                  type="number"
                                  min={0}
                                  value={formState.cooldown_seconds}
                                  onChange={(event) => updateTaskField("cooldown_seconds", event.target.value)}
                                />
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                      <Collapsible open={taskRetryOpen} onOpenChange={setTaskRetryOpen}>
                        <div className="rounded-xl border">
                          <CollapsibleTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              className="flex min-w-0 h-auto w-full items-center justify-between rounded-xl px-4 py-4 text-left"
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                  {t("failover.editor.task_retry", {
                                    defaultValue: "Retry and fallback",
                                  })}
                                </div>
                                <div className="line-clamp-2 break-words text-xs text-muted-foreground">
                                  {taskRetrySummary}
                                </div>
                              </div>
                              <ChevronDown
                                className={cn(
                                  "size-4 shrink-0 text-muted-foreground transition-transform",
                                  taskRetryOpen ? "rotate-180" : "",
                                )}
                              />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="border-t px-4 py-4">
                            <div className="grid gap-4 lg:grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor="failover-provision-retry-limit">
                                  {t("failover.editor.provision_retry_limit", { defaultValue: "Blocked retry limit" })}
                                </Label>
                                <Input
                                  id="failover-provision-retry-limit"
                                  type="number"
                                  min={1}
                                  value={formState.provision_retry_limit}
                                  onChange={(event) => updateTaskField("provision_retry_limit", event.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="failover-provision-fallback-limit">
                                  {t("failover.editor.provision_failure_fallback_limit", { defaultValue: "Plan fallback after provision failures" })}
                                </Label>
                                <Input
                                  id="failover-provision-fallback-limit"
                                  type="number"
                                  min={1}
                                  value={formState.provision_failure_fallback_limit}
                                  onChange={(event) => updateTaskField("provision_failure_fallback_limit", event.target.value)}
                                />
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    </section>
                  </div>
                </DialogContent>
              </Dialog>

              <section className="space-y-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                    {t("failover.editor.step_dns", { defaultValue: "2. DNS" })}
                  </div>
                </div>
                <div className="space-y-4 rounded-xl border px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                        {t("failover.editor.dns", { defaultValue: "DNS and cleanup" })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {hasDnsEnabled
                          ? t("failover.editor.dns_summary_hint", {
                            defaultValue: "Review the DNS target, sync mode, and old-instance cleanup here. Open the secondary dialog only when you need to change the details.",
                          })
                          : t("failover.editor.no_dns_hint", {
                            defaultValue: "This task will skip DNS switching and only manage cloud failover actions.",
                          })}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDnsDialogOpen(true)}
                      disabled={!hasDnsEnabled && !hasAnyDnsCredential}
                    >
                      <PencilLine className="size-4" />
                      {t("common.edit", { defaultValue: "Edit" })}
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={hasDnsEnabled ? "success" : "outline"}>
                      {hasDnsEnabled
                        ? t("failover.editor.dns_enabled", { defaultValue: "Enable DNS switching" })
                        : t("failover.editor.no_dns", { defaultValue: "Do not switch DNS" })}
                    </Badge>
                    {formState.dns_provider ? (
                      <Badge variant="secondary">
                        {getDnsProviderLabel(t, formState.dns_provider)}
                      </Badge>
                    ) : null}
                    {dnsCatalogLoading && hasDnsEnabled ? (
                      <Badge variant="info">
                        {t("common.loading", { defaultValue: "Loading" })}
                      </Badge>
                    ) : null}
                  </div>

                  {!hasDnsEnabled && !hasAnyDnsCredential ? (
                    <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                      {t("failover.editor.no_dns_provider_configured", {
                        defaultValue: "No DNS credential is configured yet. Add one first if you want this task to update DNS records.",
                      })}
                    </div>
                  ) : hasDnsEnabled ? (
                    <DetailItemsList items={dnsSummaryItems} />
                  ) : (
                    <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                      {t("failover.editor.no_dns_hint", {
                        defaultValue: "This task will skip DNS switching and only manage cloud failover actions.",
                      })}
                    </div>
                  )}

                  {dnsCatalogError && hasDnsEnabled ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                      {dnsCatalogError}
                    </div>
                  ) : null}
                </div>
              </section>

              <Dialog open={dnsDialogOpen} onOpenChange={setDnsDialogOpen}>
                <DialogContent className="flex h-[90vh] min-h-0 w-[calc(100vw-2rem)] max-w-5xl flex-col overflow-hidden p-0">
                  <DialogHeader className="shrink-0 border-b bg-background px-5 py-4">
                    <DialogTitle>{t("failover.editor.dns", { defaultValue: "DNS and cleanup" })}</DialogTitle>
                    <DialogDescription>
                      {t("failover.editor.dns_dialog_description", {
                        defaultValue: "Configure DNS provider credentials, target records, sync mode, and old-instance cleanup without leaving the task summary.",
                      })}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-5 [scrollbar-gutter:stable]">
                    <section className="space-y-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                          {t("failover.editor.step_dns", { defaultValue: "2. DNS" })}
                        </div>
                      </div>
                      <Collapsible open={dnsCoreOpen} onOpenChange={setDnsCoreOpen}>
                        <div className="rounded-xl border">
                          <CollapsibleTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              className="flex min-w-0 h-auto w-full items-center justify-between rounded-xl px-4 py-4 text-left"
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                  {t("failover.editor.dns", { defaultValue: "DNS and cleanup" })}
                                </div>
                                <div className="line-clamp-2 break-words text-xs text-muted-foreground">
                                  {dnsCoreSummary}
                                </div>
                              </div>
                              <ChevronDown
                                className={cn(
                                  "size-4 shrink-0 text-muted-foreground transition-transform",
                                  dnsCoreOpen ? "rotate-180" : "",
                                )}
                              />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="border-t px-4 py-4">
                            <div className="space-y-4">
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                {t("failover.editor.dns", { defaultValue: "DNS and cleanup" })}
                              </div>
                              <div className="rounded-xl bg-muted/20 px-4 py-3">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                    {t("failover.editor.dns_enabled", { defaultValue: "Enable DNS switching" })}
                                  </div>
                                  <Switch
                                    checked={hasDnsEnabled}
                                    onCheckedChange={(checked) => setDnsEnabled(Boolean(checked))}
                                    disabled={!hasDnsEnabled && !hasAnyDnsCredential}
                                  />
                                </div>
                                {!hasDnsEnabled && !hasAnyDnsCredential ? (
                                  <div className="mt-3 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
                                    {t("failover.editor.no_dns_provider_configured", {
                                      defaultValue: "No DNS credential is configured yet. Add one first if you want this task to update DNS records.",
                                    })}
                                  </div>
                                ) : null}
                              </div>
                              {hasDnsEnabled ? (
                                <div className="grid gap-4 lg:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>{t("failover.editor.dns_provider", { defaultValue: "DNS provider" })}</Label>
                                    <Select
                                      value={formState.dns_provider || undefined}
                                      onValueChange={(value) => {
                                        const nextEntryOptions = buildProviderEntryOptions({
                                          entries: providerEntries[value] || [],
                                        });
                                        const nextEntryID = nextEntryOptions[0]?.id || "";
                                        setFormState((current) => ({
                                          ...current,
                                          dns_provider: value,
                                          dns_entry_id: nextEntryID,
                                          ...buildDefaultDnsFields(value, providerEntries, nextEntryID),
                                        }));
                                        setDnsCatalog(null);
                                        setDnsCatalogError("");
                                        setSelectedDnsRecordKey("");
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder={t("failover.editor.dns_provider_placeholder", { defaultValue: "Choose a DNS provider" })} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {getDnsProviderOptions(t, providerEntries).map((option) => (
                                          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("failover.editor.dns_entry", { defaultValue: "DNS credential entry" })}</Label>
                                    {(() => {
                                      const options = buildProviderEntryOptions({
                                        entries: providerEntries[formState.dns_provider] || [],
                                        currentValue: formState.dns_entry_id,
                                      });
                                      if (!formState.dns_provider) {
                                        return (
                                          <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                            {t("failover.editor.dns_provider_required_hint", {
                                              defaultValue: "Choose a DNS provider first.",
                                            })}
                                          </div>
                                        );
                                      }
                                      if (options.length === 0) {
                                        return (
                                          <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                            {t("failover.editor.dns_entry_missing", {
                                              defaultValue: "No DNS credential is configured for this provider yet.",
                                            })}
                                          </div>
                                        );
                                      }
                                      return (
                                        <Select
                                          value={formState.dns_entry_id || undefined}
                                          onValueChange={(value) => {
                                            setFormState((current) => ({
                                              ...current,
                                              dns_entry_id: value,
                                              ...buildDefaultDnsFields(current.dns_provider, providerEntries, value),
                                            }));
                                            setDnsCatalog(null);
                                            setDnsCatalogError("");
                                            setSelectedDnsRecordKey("");
                                          }}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder={t("failover.editor.dns_entry_placeholder", { defaultValue: "Choose an entry" })} />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {options.map((option) => (
                                              <SelectItem key={option.id} value={option.id}>
                                                {option.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      );
                                    })()}
                                  </div>
                                </div>
                              ) : null}

                              {hasDnsEnabled ? (
                                <div className="flex flex-wrap items-end gap-2">
                                  <div className="min-w-0 flex-1 space-y-2">
                                    <Label>{t("failover.editor.existing_record", { defaultValue: "Existing DNS record" })}</Label>
                                    <Select
                                      value={selectedDnsRecordKey || "__none"}
                                      onValueChange={(value) => {
                                        setSelectedDnsRecordKey(value);
                                        if (value === "__none") {
                                          return;
                                        }
                                        const record = dnsCatalogRecords.find((item) => getDnsRecordKey(item) === value);
                                        if (!record) {
                                          return;
                                        }
                                        setFormState((current) => {
                                          const nextState = fillDnsFieldsFromRecord(current, record);
                                          if (current.dns_provider === "aliyun") {
                                            const lines = collectAliyunRecordLines(dnsCatalogRecords, record);
                                            if (lines.length > 0) {
                                              nextState.dns_lines = lines;
                                              nextState.dns_line = lines[0];
                                            }
                                          }
                                          return nextState;
                                        });
                                      }}
                                      disabled={!dnsCatalogRecords.length}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder={t("failover.editor.existing_record_placeholder", { defaultValue: "Choose an existing DNS record" })} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none">
                                          {t("failover.editor.existing_record_placeholder", { defaultValue: "Choose an existing DNS record" })}
                                        </SelectItem>
                                        {dnsCatalogRecords.map((record) => (
                                          <SelectItem key={getDnsRecordKey(record)} value={getDnsRecordKey(record)}>
                                            {dnsRecordSummary(t, record)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => void refreshDnsCatalog({
                                      zone_name: formState.dns_zone_name.trim(),
                                      domain_name: formState.dns_domain_name.trim(),
                                    })}
                                    disabled={dnsCatalogLoading || !formState.dns_provider.trim() || !formState.dns_entry_id.trim()}
                                  >
                                    <RefreshCw className={cn("size-4", dnsCatalogLoading ? "animate-spin" : "")} />
                                    {t("failover.editor.load_records", { defaultValue: "Load records" })}
                                  </Button>
                                </div>
                              ) : null}

                              {dnsCatalogError && hasDnsEnabled ? (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                                  {dnsCatalogError}
                                </div>
                              ) : null}

                              {formState.dns_provider === "cloudflare" ? (
                                <div className="grid gap-4 lg:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>{t("failover.editor.zone_name", { defaultValue: "Zone / domain" })}</Label>
                                    <Select
                                      value={formState.dns_zone_name || undefined}
                                      onValueChange={(value) => {
                                        updateTaskField("dns_zone_name", value);
                                        setSelectedDnsRecordKey("");
                                        void refreshDnsCatalog({ zone_name: value });
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="example.com" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {dnsZoneOptions.map((option) => (
                                          <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="failover-record-name">{t("failover.editor.record_name", { defaultValue: "Record name" })}</Label>
                                    <Input
                                      id="failover-record-name"
                                      value={formState.dns_record_name}
                                      onChange={(event) => updateTaskField("dns_record_name", event.target.value)}
                                      placeholder="@ / www / api"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("failover.editor.dns_sync_mode", { defaultValue: "DNS sync mode" })}</Label>
                                    <Select
                                      value={dnsSyncMode}
                                      onValueChange={(value) => {
                                        setFormState((current) => ({
                                          ...current,
                                          ...applyDnsSyncMode(value),
                                        }));
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {dnsSyncModeOptions.map((option) => (
                                          <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <div className="text-xs text-muted-foreground">
                                      {t("failover.editor.dns_sync_mode_hint", {
                                        defaultValue: "Dual stack always updates the A record and only adds AAAA when the new outlet reports IPv6. IPv6-only mode still requires an IPv6 address.",
                                      })}
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("failover.editor.ttl", { defaultValue: "TTL" })}</Label>
                                    <Select
                                      value={formState.dns_ttl || undefined}
                                      onValueChange={(value) => updateTaskField("dns_ttl", value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {dnsTTLOptions.map((option) => (
                                          <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="rounded-xl bg-muted/20 px-4 py-3 lg:col-span-2">
                                    <div className="flex items-center justify-between gap-4">
                                      <div className="space-y-1">
                                        <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                          {t("failover.editor.proxied", { defaultValue: "Cloudflare proxy" })}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {t("failover.editor.proxied_hint", { defaultValue: "Use the credential default unless this task needs a different proxy mode." })}
                                        </div>
                                      </div>
                                      <Switch
                                        checked={formState.dns_proxied}
                                        onCheckedChange={(checked) => updateTaskField("dns_proxied", Boolean(checked))}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : formState.dns_provider === "aliyun" ? (
                                <div className="grid gap-4 lg:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>{t("failover.editor.domain_name", { defaultValue: "Domain" })}</Label>
                                    <Select
                                      value={formState.dns_domain_name || undefined}
                                      onValueChange={(value) => {
                                        updateTaskField("dns_domain_name", value);
                                        setSelectedDnsRecordKey("");
                                        void refreshDnsCatalog({ domain_name: value });
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="example.com" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {dnsDomainOptions.map((option) => (
                                          <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="failover-rr">{t("failover.editor.rr", { defaultValue: "Host / RR" })}</Label>
                                    <Input
                                      id="failover-rr"
                                      value={formState.dns_rr}
                                      onChange={(event) => updateTaskField("dns_rr", event.target.value)}
                                      onBlur={(event) => updateTaskField("dns_rr", normalizeAliyunRRInput(formState.dns_domain_name, event.target.value))}
                                      placeholder="@ / www / api"
                                    />
                                    <div className="text-xs text-muted-foreground">
                                      {t("failover.editor.aliyun_rr_hint", {
                                        defaultValue: "Use @ for the apex record. Enter only the host part such as www or api, not the full domain.",
                                      })}
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("failover.editor.dns_sync_mode", { defaultValue: "DNS sync mode" })}</Label>
                                    <Select
                                      value={dnsSyncMode}
                                      onValueChange={(value) => {
                                        setFormState((current) => ({
                                          ...current,
                                          ...applyDnsSyncMode(value),
                                        }));
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {dnsSyncModeOptions.map((option) => (
                                          <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <div className="text-xs text-muted-foreground">
                                      {t("failover.editor.dns_sync_mode_hint", {
                                        defaultValue: "Dual stack always updates the A record and only adds AAAA when the new outlet reports IPv6. IPv6-only mode still requires an IPv6 address.",
                                      })}
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("failover.editor.ttl", { defaultValue: "TTL" })}</Label>
                                    <Select
                                      value={formState.dns_ttl || undefined}
                                      onValueChange={(value) => updateTaskField("dns_ttl", value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {dnsTTLOptions.map((option) => (
                                          <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2 lg:col-span-2">
                                    <Label>{t("failover.editor.line", { defaultValue: "Routing line" })}</Label>
                                    <div className="grid gap-3 rounded-xl border border-dashed p-4 sm:grid-cols-2">
                                      {aliyunLineOptions.map((line) => {
                                        const checked = formState.dns_lines.includes(line.value);
                                        return (
                                          <label
                                            key={line.value}
                                            className="flex items-center gap-3 rounded-lg border border-transparent px-2 py-1.5 text-sm hover:bg-muted/30"
                                          >
                                            <Checkbox
                                              checked={checked}
                                              onCheckedChange={(nextChecked) => {
                                                setFormState((current) => {
                                                  const nextLines = toggleDnsLineSelection(
                                                    current.dns_lines,
                                                    line.value,
                                                    Boolean(nextChecked),
                                                  );
                                                  return {
                                                    ...current,
                                                    dns_lines: nextLines,
                                                    dns_line: nextLines[0] || "default",
                                                  };
                                                });
                                              }}
                                            />
                                            <span>{line.label}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                      <Collapsible open={dnsAdvancedOpen} onOpenChange={setDnsAdvancedOpen}>
                        <div className="rounded-xl border">
                          <CollapsibleTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              className="flex min-w-0 h-auto w-full items-center justify-between rounded-xl px-4 py-4 text-left"
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                  {t("failover.editor.show_dns_advanced", {
                                    defaultValue: "Advanced DNS settings",
                                  })}
                                </div>
                                <div className="line-clamp-2 break-words text-xs text-muted-foreground">
                                  {dnsAdvancedSummary}
                                </div>
                              </div>
                              <ChevronDown
                                className={cn(
                                  "size-4 shrink-0 text-muted-foreground transition-transform",
                                  dnsAdvancedOpen ? "rotate-180" : "",
                                )}
                              />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="border-t px-4 py-4">
                            <div className="space-y-4">
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                {t("failover.editor.show_dns_advanced", {
                                  defaultValue: "Advanced DNS settings",
                                })}
                              </div>
                              <div className="grid gap-4 lg:grid-cols-2">
                                <div className="space-y-2">
                                  <Label>{t("failover.editor.delete_strategy", { defaultValue: "Old instance strategy" })}</Label>
                                  <Select
                                    value={formState.delete_strategy}
                                    onValueChange={(value) => updateTaskField("delete_strategy", value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getDeleteStrategyOptions(t, formState.plans).map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="failover-delete-delay">{t("failover.editor.delete_delay", { defaultValue: "Delete delay (s)" })}</Label>
                                  <Input
                                    id="failover-delete-delay"
                                    type="number"
                                    min={0}
                                    value={formState.delete_delay_seconds}
                                    onChange={(event) => updateTaskField("delete_delay_seconds", event.target.value)}
                                    disabled={formState.delete_strategy !== "delete_after_success_delay"}
                                  />
                                </div>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    </section>
                  </div>
                </DialogContent>
              </Dialog>

              <section className="space-y-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                    {t("failover.editor.step_plans", { defaultValue: "3. Plans" })}
                  </div>
                </div>
                <div className="space-y-4 rounded-xl border px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                        {t("failover.editor.plans", { defaultValue: "Failover plans" })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("failover.editor.plans_summary_hint", {
                          defaultValue: "Keep the main dialog focused on plan order and outcomes. Open the secondary dialog when you need to edit provider details, instance options, or scripts.",
                        })}
                      </div>
                    </div>
                    <Button type="button" variant="outline" onClick={() => setPlanDialogOpen(true)} disabled={!selectedPlan}>
                      <PencilLine className="size-4" />
                      {t("common.edit", { defaultValue: "Edit" })}
                    </Button>
                  </div>

                  {!settingsLoading && hasEnabledProvisionPlan && !configuredScriptDomain ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                      {t("failover.editor.script_domain_required_hint", {
                        defaultValue:
                          "Agent connection address is not configured yet. Set it in Settings -> Site, otherwise failover-created instances cannot auto-connect back to Komari.",
                      })}
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {formState.plans.map((plan, index) => {
                      const providerSummary = [
                        plan.provider ? getPlanProviderLabel(t, plan.provider) : "",
                        plan.action_type ? getActionTypeLabel(t, plan.action_type) : "",
                      ].filter(Boolean).join(" · ");
                      const entrySummary = [
                        plan.provider_entry_group
                          ? t("failover.execution.summary.entry_group", {
                            defaultValue: "Group {{group}}",
                            group: plan.provider_entry_group,
                          })
                          : "",
                        getPlanEntrySummaryLabel(plan),
                      ].filter(Boolean).join(" · ");
                      const payloadSummary = summarizePlanPayload(t, plan);
                      const selectedScriptIDs = normalizePlanScriptClipboardIDs(plan.script_clipboard_ids);
                      const scriptPreview = getPlanScriptPreview(selectedScriptIDs, 2);

                      return (
                        <button
                          key={plan.local_id}
                          type="button"
                          onClick={() => openPlanDialogFor(plan.local_id)}
                          className={cn(
                            "w-full rounded-xl border px-4 py-4 text-left transition-colors hover:bg-muted/20",
                            selectedPlan?.local_id === plan.local_id
                              ? "border-primary/40 bg-primary/5"
                              : "border-border/70",
                          )}
                        >
                          <div className="flex flex-wrap items-start gap-2">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                                  {getPlanDisplayName(plan, index, t)}
                                </div>
                                <Badge variant={plan.enabled ? "success" : "outline"}>
                                  {plan.enabled
                                    ? t("common.enabled", { defaultValue: "Enabled" })
                                    : t("common.disabled", { defaultValue: "Disabled" })}
                                </Badge>
                                <Badge variant="secondary">
                                  {t("failover.editor.priority_label", {
                                    defaultValue: "Priority {{value}}",
                                    value: index + 1,
                                  })}
                                </Badge>
                              </div>
                              {providerSummary ? (
                                <div className="break-words text-xs text-muted-foreground">{providerSummary}</div>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-2 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
                            {entrySummary ? (
                              <div className="min-w-0 break-words">{entrySummary}</div>
                            ) : null}
                            {plan.auto_connect_group ? (
                              <div className="min-w-0 break-words">
                                {t("failover.editor.auto_connect_group", { defaultValue: "Auto-connect group" })}: {plan.auto_connect_group}
                              </div>
                            ) : null}
                            {payloadSummary ? (
                              <div className="min-w-0 break-words sm:col-span-2">{payloadSummary}</div>
                            ) : null}
                            <div className="min-w-0 break-words sm:col-span-2">
                              {selectedScriptIDs.length > 0
                                ? t("failover.editor.scripts_selected", {
                                  defaultValue: "{{count}} selected",
                                  count: selectedScriptIDs.length,
                                })
                                : t("failover.editor.no_script", { defaultValue: "No script" })}
                              {scriptPreview ? ` · ${scriptPreview}` : ""}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
                <DialogContent className="flex h-[92vh] min-h-0 w-[calc(100vw-2rem)] max-w-[96rem] flex-col overflow-hidden p-0">
                  <DialogHeader className="shrink-0 border-b bg-background px-5 py-4">
                    <DialogTitle>{t("failover.editor.plans", { defaultValue: "Failover plans" })}</DialogTitle>
                    <DialogDescription>
                      {t("failover.editor.plans_dialog_description", {
                        defaultValue: "Adjust plan order, provider settings, instance options, scripts, and runtime details while keeping the main task dialog compact.",
                      })}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-5 [scrollbar-gutter:stable]">
                    <section className="space-y-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                          {t("failover.editor.step_plans", { defaultValue: "3. Plans" })}
                        </div>
                      </div>
                      {selectedPlan ? (
                        <>
                    <Collapsible
                      open={selectedPlanOrganizerOpen}
                      onOpenChange={(openState) => setSelectedPlanSectionOpen("organizer", openState)}
                    >
                      <div className="rounded-xl border">
                        <CollapsibleTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            className="flex min-w-0 h-auto w-full items-center justify-between rounded-xl px-4 py-4 text-left"
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                {t("failover.editor.plans", { defaultValue: "Failover plans" })}
                              </div>
                              <div className="line-clamp-2 break-words text-xs text-muted-foreground">
                                {selectedPlanOrganizerSummary}
                              </div>
                            </div>
                            <ChevronDown
                              className={cn(
                                "size-4 shrink-0 text-muted-foreground transition-transform",
                                selectedPlanOrganizerOpen ? "rotate-180" : "",
                              )}
                            />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="border-t px-4 py-4">
                          <div className="space-y-4">
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                              {t("failover.editor.plans", { defaultValue: "Failover plans" })}
                            </div>
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                              <div className="min-w-0 flex-1 space-y-2">
                                {hasMultiplePlans ? (
                                  <div className="space-y-2">
                                    <Label>{t("failover.editor.current_plan", { defaultValue: "Current plan" })}</Label>
                                    <Select value={selectedPlan.local_id} onValueChange={setSelectedPlanID}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {formState.plans.map((plan, index) => (
                                          <SelectItem key={plan.local_id} value={plan.local_id}>
                                            {getPlanDisplayName(plan, index, t)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                ) : (
                                  <div className="rounded-xl bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                                    {t("failover.editor.plan_single", {
                                      defaultValue: "1 plan",
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button type="button" variant="outline" onClick={addPlan}>
                                  <Plus className="size-4" />
                                  {hasMultiplePlans
                                    ? t("failover.editor.add_plan", { defaultValue: "Add plan" })
                                    : t("failover.editor.add_backup_plan", { defaultValue: "Add backup plan" })}
                                </Button>
                                <Button type="button" variant="outline" onClick={duplicateSelectedPlan}>
                                  <Copy className="size-4" />
                                  {t("copy", { defaultValue: "Copy" })}
                                </Button>
                                {hasMultiplePlans ? (
                                  <>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => movePlanToIndex(selectedPlan.local_id, selectedPlanIndex - 1)}
                                      disabled={selectedPlanIndex <= 0}
                                    >
                                      <ArrowUp className="size-4" />
                                      {t("failover.editor.move_plan_up", { defaultValue: "Move up" })}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => movePlanToIndex(selectedPlan.local_id, selectedPlanIndex + 1)}
                                      disabled={selectedPlanIndex < 0 || selectedPlanIndex >= formState.plans.length - 1}
                                    >
                                      <ArrowDown className="size-4" />
                                      {t("failover.editor.move_plan_down", { defaultValue: "Move down" })}
                                    </Button>
                                  </>
                                ) : null}
                                {hasMultiplePlans ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => removePlan(selectedPlan.local_id)}
                                  >
                                    <Trash2 className="size-4" />
                                    {t("common.delete", { defaultValue: "Delete" })}
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex items-center justify-between rounded-xl bg-muted/20 px-4 py-3">
                              <div className="min-w-0 space-y-1">
                                <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                                  {getPlanDisplayName(selectedPlan, selectedPlanIndex >= 0 ? selectedPlanIndex : 0, t)}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Label className="text-sm">
                                  {t("failover.editor.plan_enabled", { defaultValue: "Plan enabled" })}
                                </Label>
                                <Switch
                                  checked={selectedPlan.enabled}
                                  onCheckedChange={(checked) => updatePlan(selectedPlan.local_id, (current) => ({ ...current, enabled: Boolean(checked) }))}
                                />
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>

                    <Collapsible
                      open={selectedPlanCoreOpen}
                      onOpenChange={(openState) => setSelectedPlanSectionOpen("core", openState)}
                    >
                      <div className="rounded-xl border">
                        <CollapsibleTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            className="flex min-w-0 h-auto w-full items-center justify-between rounded-xl px-4 py-4 text-left"
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                {t("failover.editor.plan_core", { defaultValue: "Plan core fields" })}
                              </div>
                              <div className="line-clamp-2 break-words text-xs text-muted-foreground">
                                {selectedPlanCoreSummary}
                              </div>
                            </div>
                            <ChevronDown
                              className={cn(
                                "size-4 shrink-0 text-muted-foreground transition-transform",
                                selectedPlanCoreOpen ? "rotate-180" : "",
                              )}
                            />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="border-t px-4 py-4">
                          <div className="space-y-4">
                            {!settingsLoading && hasEnabledProvisionPlan && !configuredScriptDomain ? (
                              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                                {t("failover.editor.script_domain_required_hint", {
                                  defaultValue:
                                    "Agent connection address is not configured yet. Set it in Settings -> Site, otherwise failover-created instances cannot auto-connect back to Komari.",
                                })}
                              </div>
                            ) : null}
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                              {t("failover.editor.plan_core", { defaultValue: "Plan core fields" })}
                            </div>
                            <div className="grid gap-4 lg:grid-cols-2">
	                          <div className="space-y-2">
	                          <Label>{t("cloud.title", { defaultValue: "Cloud" })}</Label>
		                          <Select
		                            value={selectedPlan.provider || undefined}
		                            onValueChange={(value) => {
	                              const nextActionType = getDefaultPlanActionType(value);
	                              updatePlan(selectedPlan.local_id, (current) => applySuggestedAutoConnectGroup(
                                  current,
                                  providerEntries,
                                  {
	                                  provider: value,
	                                  action_type: nextActionType,
	                                  provider_entry_id: AUTOMATIC_PROVIDER_ENTRY_ID,
	                                  provider_entry_group: "",
	                                  payload: prettyJson(defaultPlanPayload(value, nextActionType)),
                                  },
                                ));
	                              resetPlanCatalogState();
	                            }}
	                          >
	                            <SelectTrigger>
	                              <SelectValue placeholder={t("failover.editor.plan_provider_placeholder", { defaultValue: "Choose a cloud provider" })} />
	                            </SelectTrigger>
	                            <SelectContent>
	                              {getPlanProviderOptions(t, providerEntries, allowedPlanProviders).map((option) => (
		                                <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
		                                  {option.label}
		                                </SelectItem>
		                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t("failover.editor.provider_entry_group", { defaultValue: "Token pool group" })}</Label>
                          {(() => {
                            const groups = getProviderEntryGroups(providerEntries, selectedPlan.provider);
                            if (!selectedPlan.provider) {
                              return (
                                <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                  {t("failover.editor.plan_provider_required_hint", {
                                    defaultValue: "Choose a cloud provider first.",
                                  })}
                                </div>
                              );
                            }
                            if (groups.length === 0) {
                              return (
                                <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                  {t("failover.editor.provider_entry_group_missing", {
                                    defaultValue: "No token groups have been assigned for this provider yet. You can still use all entries below.",
                                  })}
                                </div>
                              );
                            }
                            return (
                              <div className="space-y-2">
                                <Select
                                  value={selectedPlan.provider_entry_group || "__all__"}
                                  onValueChange={(value) => {
                                    updatePlan(selectedPlan.local_id, (current) => applySuggestedAutoConnectGroup(
                                      current,
                                      providerEntries,
                                      {
                                        provider_entry_group: value === "__all__" ? "" : value,
                                        provider_entry_id: AUTOMATIC_PROVIDER_ENTRY_ID,
                                      },
                                    ));
                                    resetPlanCatalogState();
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("failover.editor.provider_entry_group_placeholder", { defaultValue: "Choose a token group" })} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__all__">
                                      {t("failover.editor.provider_entry_group_all", { defaultValue: "All entries" })}
                                    </SelectItem>
                                    {groups.map((group) => (
                                      <SelectItem key={group} value={group}>
                                        {group}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <div className="text-xs text-muted-foreground">
                                  {t("failover.editor.provider_entry_group_hint", {
                                    defaultValue: "If a group is selected, failover will only rotate within that token pool group.",
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="space-y-2">
                          <Label>{t("failover.editor.provider_entry", { defaultValue: "Specific credential entry (optional)" })}</Label>
                          {(() => {
                            const options = buildPlanProviderEntryOptions(
                              t,
                              selectedPlan.provider,
                              providerEntries,
                              selectedPlan.provider_entry_group,
                              selectedPlan.provider_entry_id,
                            );
                            if (!selectedPlan.provider) {
                              return (
                                <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                  {t("failover.editor.plan_provider_required_hint", {
                                    defaultValue: "Choose a cloud provider first.",
                                  })}
                                </div>
                              );
                            }
                            if (options.length === 0) {
                              return (
                                <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                  {t("failover.editor.provider_entry_missing", {
                                    defaultValue: "No cloud credential entry matches this provider or group yet.",
                                  })}
                                </div>
                              );
                            }
                            return (
                              <div className="space-y-2">
                                <Select
                                  value={selectedPlan.provider_entry_id || undefined}
                                  onValueChange={(value) => {
                                    updatePlan(selectedPlan.local_id, (current) => applySuggestedAutoConnectGroup(
                                      current,
                                      providerEntries,
                                      {
                                        provider_entry_id: value,
                                      },
                                    ));
                                    resetPlanCatalogState();
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("failover.editor.provider_entry_placeholder", { defaultValue: "Choose an entry" })} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {options.map((option) => (
                                      <SelectItem key={option.id} value={option.id}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <div className="text-xs text-muted-foreground">
                                  {t("failover.editor.provider_entry_hint", {
                                    defaultValue: "Leave this on the active entry to follow the group dynamically, or pin a specific token inside the group.",
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="space-y-2 lg:col-span-2">
	                          <Label>{t("failover.editor.action_type", { defaultValue: "Action type" })}</Label>
                          <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                            {selectedPlan.provider === "aws"
                              ? t("failover.editor.aws_action_auto_hint", {
                                defaultValue: "AWS automatically checks whether the selected credential already has the current outlet IP. If it does, Komari only replaces the public IP; otherwise it creates a new instance.",
                              })
                              : t("failover.editor.provision_action_auto_hint", {
                                defaultValue: "This provider always creates a new instance for failover.",
                              })}
                          </div>
                        </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>

                    <Collapsible
                      open={selectedPlanConfigOpen}
                      onOpenChange={(openState) => setSelectedPlanSectionOpen("config", openState)}
                    >
                      <div className="rounded-xl border">
                        <CollapsibleTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            className="flex min-w-0 h-auto w-full items-center justify-between rounded-xl px-4 py-4 text-left"
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                {t("failover.editor.plan_config", { defaultValue: "Instance configuration" })}
                              </div>
                              <div className="line-clamp-2 break-words text-xs text-muted-foreground">
                                {selectedPlanConfigSummary}
                              </div>
                            </div>
                            <ChevronDown
                              className={cn(
                                "size-4 shrink-0 text-muted-foreground transition-transform",
                                selectedPlanConfigOpen ? "rotate-180" : "",
                              )}
                            />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="border-t px-4 py-4">
                          <div className="space-y-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                {t("failover.editor.plan_config", { defaultValue: "Instance configuration" })}
                              </div>
                              <div className="flex flex-wrap gap-2">
                          {showPlanCatalogLoadActions && !usesCommonPlanCatalogDefaults ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!canLoadPlanCatalog || planCatalogLoading}
                              onClick={() => void refreshPlanCatalog({ mode: "regions" })}
                            >
                              {planCatalogLoading && planCatalogLoadMode === "regions" ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
                              {t("failover.editor.load_plan_regions", { defaultValue: "Load regions" })}
                            </Button>
                          ) : null}
                          {showPlanCatalogLoadActions ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!canLoadPlanDetails || planCatalogLoading}
                              onClick={() => void refreshPlanCatalog({ mode: "full" })}
                            >
                              {planCatalogLoading && planCatalogLoadMode === "full" ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
                              {isDigitalOceanProvisionPlan
                                ? t("failover.editor.load_plan_options_full_digitalocean", { defaultValue: "Load full DigitalOcean list" })
                                : isLinodeProvisionPlan
                                  ? t("failover.editor.load_plan_options_full_linode", { defaultValue: "Load full Linode list" })
                                  : t("failover.editor.load_plan_options", { defaultValue: "Load options" })}
                            </Button>
                          ) : null}
                              </div>
                            </div>

                            {isAWSPlan ? (
                        <div className="rounded-xl border border-dashed px-4 py-3 text-xs text-muted-foreground">
                          {t("failover.editor.aws_static_presets_hint", {
                            defaultValue: "AWS failover uses the same built-in region, image, and instance-size presets as the AWS create-instance page. No catalog request is required for the basic form.",
                          })}
                        </div>
                      ) : null}

                            {isDigitalOceanProvisionPlan ? (
                        <div className="rounded-xl border border-dashed px-4 py-3 text-xs text-muted-foreground">
                          {t("failover.editor.digitalocean_common_options_hint", {
                            defaultValue: "Common DigitalOcean regions, sizes, and images are shown by default. Load the full DigitalOcean list only if you need uncommon options.",
                          })}
                        </div>
                      ) : null}

                            {isLinodeProvisionPlan ? (
                        <div className="rounded-xl border border-dashed px-4 py-3 text-xs text-muted-foreground">
                          {t("failover.editor.linode_common_options_hint", {
                            defaultValue: "Common Linode regions, plans, and images are shown by default. Load the full Linode list only if you need account-specific or uncommon options.",
                          })}
                        </div>
                      ) : null}

                      {planCatalogLoading ? (
                        <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                          {planCatalogLoadMode === "regions"
                            ? t("failover.editor.loading_plan_regions", { defaultValue: "Loading available regions..." })
                            : t("failover.editor.loading_plan_catalog", { defaultValue: "Loading provider configuration options..." })}
                        </div>
                      ) : null}

                      {planCatalogError ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                          {planCatalogError}
                        </div>
                      ) : null}

                      {!selectedPlan.provider ? (
                        <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                          {t("failover.editor.plan_provider_required_hint", {
                            defaultValue: "Choose a cloud provider first.",
                          })}
                        </div>
                      ) : null}

                      {selectedPlan.provider ? (
                        <>
                      {selectedPlan.provider === "aws" && selectedPlan.action_type === "provision_instance" ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-2">
                            <Label>{t("failover.editor.aws_service", { defaultValue: "AWS service" })}</Label>
                            <Select
                              value={selectedPlanService}
                              onValueChange={(value) => {
                                updateSelectedPlanPayload((current) => ({
                                  ...defaultPlanPayload("aws", selectedPlan.action_type),
                                  ...current,
                                  service: value,
                                  region: "",
                                }));
                                resetPlanCatalogState();
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ec2">EC2</SelectItem>
                                <SelectItem value="lightsail">Lightsail</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>{t("failover.editor.region", { defaultValue: "Region" })}</Label>
                            <SearchableCatalogSelect
                              value={selectedPlanRegion || undefined}
                              options={awsRegionOptions}
                              onValueChange={(value) => {
                                updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  region: value,
                                  availability_zone: selectedPlanService === "lightsail" && !getStringValue(current.availability_zone)
                                    ? getDefaultLightsailAvailabilityZone(value)
                                    : getStringValue(current.availability_zone),
                                }));
                                resetPlanCatalogState(keepPlanCatalogRegions(
                                  planCatalog,
                                  selectedPlan.provider,
                                  selectedPlan.action_type,
                                  selectedPlanService,
                                  value,
                                ));
                              }}
                              placeholder={t("failover.editor.region_placeholder", { defaultValue: "Choose a region" })}
                              searchPlaceholder={t("failover.editor.region_search_placeholder", { defaultValue: "Search regions..." })}
                              emptyLabel={t("failover.editor.region_search_empty", { defaultValue: "No matching region" })}
                              formatOptionLabel={(option) => formatPlanRegionOptionLabel(t, "aws", option)}
                            />
                          </div>

                          {selectedPlanService === "ec2" ? (
                            <>
                              <div className="space-y-2">
                                <Label>{t("failover.editor.image", { defaultValue: "Image" })}</Label>
                                <SearchableCatalogSelect
                                  value={getStringValue(selectedPlanPayload.image_id) || undefined}
                                  options={awsEc2ImageOptions}
                                  onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                    ...current,
                                    image_id: value,
                                  }))}
                                  placeholder={t("failover.editor.image_placeholder", { defaultValue: "Choose an image" })}
                                  searchPlaceholder={t("failover.editor.image_search_placeholder", { defaultValue: "Search images..." })}
                                  emptyLabel={t("failover.editor.image_search_empty", { defaultValue: "No matching image" })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t("failover.editor.instance_type", { defaultValue: "Instance type" })}</Label>
                                <SearchableCatalogSelect
                                  value={getStringValue(selectedPlanPayload.instance_type) || undefined}
                                  options={awsEc2InstanceTypeOptions}
                                  onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                    ...current,
                                    instance_type: value,
                                  }))}
                                  placeholder={t("failover.editor.instance_type_placeholder", { defaultValue: "Choose an instance type" })}
                                  searchPlaceholder={t("failover.editor.instance_type_search_placeholder", { defaultValue: "Search instance types..." })}
                                  emptyLabel={t("failover.editor.instance_type_search_empty", { defaultValue: "No matching instance type" })}
                                />
                              </div>
                              <div className="rounded-xl bg-muted/20 px-4 py-3 lg:col-span-2">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="space-y-1">
                                    <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                      {t("failover.editor.assign_public_ip", { defaultValue: "Assign public IP" })}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {t("failover.editor.assign_public_ip_hint", { defaultValue: "Keep this enabled so the new outlet gets a reachable IPv4 address." })}
                                    </div>
                                  </div>
                                  <Switch
                                    checked={Boolean(selectedPlanPayload.assign_public_ip)}
                                    onCheckedChange={(checked) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      assign_public_ip: Boolean(checked),
                                    }))}
                                  />
                                </div>
                              </div>
                              <div className="rounded-xl bg-muted/20 px-4 py-3 lg:col-span-2">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="space-y-1">
                                    <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                      {t("cloud.form.ipv6", { defaultValue: "Enable IPv6" })}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {t("failover.editor.assign_ipv6_hint", {
                                        defaultValue: "Request an IPv6 address during instance creation and verify it after launch.",
                                      })}
                                    </div>
                                  </div>
                                  <Switch
                                    checked={getBooleanValue(selectedPlanPayload.assign_ipv6, true)}
                                    onCheckedChange={(checked) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      assign_ipv6: Boolean(checked),
                                    }))}
                                  />
                                </div>
                              </div>
                              <div className="rounded-xl bg-muted/20 px-4 py-3 lg:col-span-2">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="space-y-1">
                                    <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                      {t("cloud.providers.aws.allow_all_traffic", { defaultValue: "Allow All Traffic" })}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {t("cloud.providers.aws.allow_all_traffic_on_create", {
                                        defaultValue: "After launch, allow all IPv4 and IPv6 traffic",
                                      })}
                                    </div>
                                  </div>
                                  <Switch
                                    checked={getBooleanValue(selectedPlanPayload.allow_all_traffic, true)}
                                    onCheckedChange={(checked) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      allow_all_traffic: Boolean(checked),
                                    }))}
                                  />
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="space-y-2">
                                <Label>{t("failover.editor.availability_zone", { defaultValue: "Availability zone" })}</Label>
                                {(planCatalog?.availability_zones || []).length > 0 ? (
                                  <Select
                                    value={getStringValue(selectedPlanPayload.availability_zone) || undefined}
                                    onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      availability_zone: value,
                                    }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={t("failover.editor.availability_zone_placeholder", { defaultValue: "Choose an availability zone" })} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {planCatalog?.availability_zones?.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {formatCatalogOptionLabel(option)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    value={getStringValue(selectedPlanPayload.availability_zone)}
                                    onChange={(event) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      availability_zone: event.target.value,
                                    }))}
                                    placeholder="us-east-1a"
                                  />
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>{t("failover.editor.blueprint", { defaultValue: "Blueprint" })}</Label>
                                <SearchableCatalogSelect
                                  value={getStringValue(selectedPlanPayload.blueprint_id) || undefined}
                                  options={awsLightsailBlueprintOptions}
                                  onValueChange={(value) => {
                                    const nextBlueprint = STATIC_LIGHTSAIL_BLUEPRINT_PRESETS.find((preset) => preset.value === value);
                                    if (!nextBlueprint) {
                                      updateSelectedPlanPayload((current) => ({
                                        ...current,
                                        blueprint_id: value,
                                      }));
                                      return;
                                    }
                                    updateSelectedPlanPayload((current) => {
                                      const currentBundlePlatform = inferLightsailBundlePlatform(getStringValue(current.bundle_id));
                                      return {
                                        ...current,
                                        blueprint_id: nextBlueprint.value,
                                        bundle_id:
                                          currentBundlePlatform && currentBundlePlatform !== nextBlueprint.platform
                                            ? getDefaultLightsailBundleForPlatform(nextBlueprint.platform)
                                            : getStringValue(current.bundle_id) || getDefaultLightsailBundleForPlatform(nextBlueprint.platform),
                                      };
                                    });
                                  }}
                                  placeholder={t("failover.editor.blueprint_placeholder", { defaultValue: "Choose a blueprint" })}
                                  searchPlaceholder={t("failover.editor.blueprint_search_placeholder", { defaultValue: "Search blueprints..." })}
                                  emptyLabel={t("failover.editor.blueprint_search_empty", { defaultValue: "No matching blueprint" })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t("failover.editor.bundle", { defaultValue: "Bundle" })}</Label>
                                <SearchableCatalogSelect
                                  value={getStringValue(selectedPlanPayload.bundle_id) || undefined}
                                  options={awsLightsailBundleOptions}
                                  onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                    ...current,
                                    bundle_id: value,
                                  }))}
                                  placeholder={t("failover.editor.bundle_placeholder", { defaultValue: "Choose a bundle" })}
                                  searchPlaceholder={t("failover.editor.bundle_search_placeholder", { defaultValue: "Search bundles..." })}
                                  emptyLabel={t("failover.editor.bundle_search_empty", { defaultValue: "No matching bundle" })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t("cloud.providers.aws.ip_address_type", { defaultValue: "IP Address Type" })}</Label>
                                <Select
                                  value={getStringValue(selectedPlanPayload.ip_address_type) || "dualstack"}
                                  onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                    ...current,
                                    ip_address_type: value,
                                  }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("cloud.providers.aws.ip_address_type", { defaultValue: "IP Address Type" })} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="dualstack">dualstack</SelectItem>
                                    <SelectItem value="ipv4">ipv4</SelectItem>
                                    <SelectItem value="ipv6">ipv6</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="rounded-xl bg-muted/20 px-4 py-3 lg:col-span-2">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="space-y-1">
                                    <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                      {t("cloud.providers.aws.allow_all_traffic", { defaultValue: "Allow All Traffic" })}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {t("cloud.providers.aws.allow_all_traffic_on_create", {
                                        defaultValue: "After launch, allow all IPv4 and IPv6 traffic",
                                      })}
                                    </div>
                                  </div>
                                  <Switch
                                    checked={getBooleanValue(selectedPlanPayload.allow_all_traffic, true)}
                                    onCheckedChange={(checked) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      allow_all_traffic: Boolean(checked),
                                    }))}
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ) : null}

                      {selectedPlan.provider === "aws" && selectedPlan.action_type === "rebind_public_ip" ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-2">
                            <Label>{t("failover.editor.aws_service", { defaultValue: "AWS service" })}</Label>
                            <Select
                              value={selectedPlanService}
                              onValueChange={(value) => {
                                updateSelectedPlanPayload((current) => ({
                                  ...defaultPlanPayload("aws", selectedPlan.action_type),
                                  ...current,
                                  service: value,
                                  region: "",
                                }));
                                resetPlanCatalogState();
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ec2">EC2</SelectItem>
                                <SelectItem value="lightsail">Lightsail</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>{t("failover.editor.region", { defaultValue: "Region" })}</Label>
                            <SearchableCatalogSelect
                              value={selectedPlanRegion || undefined}
                              options={awsRegionOptions}
                              onValueChange={(value) => {
                                updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  region: value,
                                  availability_zone: selectedPlanService === "lightsail" && !getStringValue(current.availability_zone)
                                    ? getDefaultLightsailAvailabilityZone(value)
                                    : getStringValue(current.availability_zone),
                                }));
                                resetPlanCatalogState(keepPlanCatalogRegions(
                                  planCatalog,
                                  selectedPlan.provider,
                                  selectedPlan.action_type,
                                  selectedPlanService,
                                  value,
                                ));
                              }}
                              placeholder={t("failover.editor.region_placeholder", { defaultValue: "Choose a region" })}
                              searchPlaceholder={t("failover.editor.region_search_placeholder", { defaultValue: "Search regions..." })}
                              emptyLabel={t("failover.editor.region_search_empty", { defaultValue: "No matching region" })}
                              formatOptionLabel={(option) => getAWSRegionOptionLabel(option)}
                            />
                          </div>
                          {selectedPlanService === "ec2" ? (
                            <>
                              <div className="rounded-xl border border-dashed px-4 py-3 text-xs text-muted-foreground lg:col-span-2">
                                {t("failover.editor.aws_rebind_by_ip_hint", {
                                  defaultValue: "Komari will first check whether this AWS credential already has an EC2 instance with the task's current IP. If it does, Komari only replaces that instance's public IP. If it does not, Komari creates a new EC2 instance with the configuration below.",
                                })}
                              </div>
                              <div className="rounded-xl border border-dashed px-4 py-3 text-xs text-muted-foreground lg:col-span-2">
                                {t("failover.editor.aws_rebind_static_presets_hint", {
                                  defaultValue: "The replacement-instance form follows the AWS create-instance page: common regions, AMIs, and instance types are built in, and you can still type uncommon values manually below.",
                                })}
                              </div>
                              {awsEc2ArchitectureMismatch ? (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200 lg:col-span-2">
                                  {t("failover.editor.aws_ec2_architecture_mismatch", {
                                    imageArch: selectedAWSEC2ImageArchitecture,
                                    instanceType: selectedAWSEC2InstanceType,
                                    typeArch: selectedAWSEC2InstanceArchitecture,
                                    defaultValue: "The selected image expects {{imageArch}}, but {{instanceType}} is {{typeArch}}. Use ARM64 images with Graviton families such as t4g/m7g/c7g/r7g, and use x86_64 images with t3/m7i/c7i/r7i families.",
                                  })}
                                </div>
                              ) : null}
                              <div className="space-y-2">
                                <Label>{t("failover.editor.image", { defaultValue: "Image" })}</Label>
                                <SearchableCatalogSelect
                                  value={selectedAWSEC2ImageID || undefined}
                                  options={awsEc2ImageOptions}
                                  onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                    ...current,
                                    image_id: value,
                                  }))}
                                  placeholder={t("failover.editor.image_placeholder", { defaultValue: "Choose an image" })}
                                  searchPlaceholder={t("failover.editor.image_search_placeholder", { defaultValue: "Search images..." })}
                                  emptyLabel={t("failover.editor.image_search_empty", { defaultValue: "No matching image" })}
                                  formatOptionLabel={(option) => {
                                    const preset = STATIC_EC2_IMAGE_PRESETS.find((item) => item.value === option.value);
                                    return preset ? getStaticEC2ImagePresetLabel(preset) : formatCatalogOptionLabel(option);
                                  }}
                                />
                                <Input
                                  value={selectedAWSEC2ImageID}
                                  onChange={(event) => updateSelectedPlanPayload((current) => ({
                                    ...current,
                                    image_id: event.target.value,
                                  }))}
                                  placeholder={t("cloud.providers.aws.ami_manual_placeholder", { defaultValue: "Or enter an AMI ID manually" })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t("failover.editor.instance_type", { defaultValue: "Instance type" })}</Label>
                                <SearchableCatalogSelect
                                  value={selectedAWSEC2InstanceType || undefined}
                                  options={awsEc2InstanceTypeOptions}
                                  onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                    ...current,
                                    instance_type: value,
                                  }))}
                                  placeholder={t("failover.editor.instance_type_placeholder", { defaultValue: "Choose an instance type" })}
                                  searchPlaceholder={t("failover.editor.instance_type_search_placeholder", { defaultValue: "Search instance types..." })}
                                  emptyLabel={t("failover.editor.instance_type_search_empty", { defaultValue: "No matching instance type" })}
                                  formatOptionLabel={(option) => {
                                    const preset = STATIC_EC2_INSTANCE_TYPE_PRESETS.find((item) => item.value === option.value);
                                    return preset ? getStaticEC2InstanceTypePresetLabel(preset) : formatCatalogOptionLabel(option);
                                  }}
                                />
                                <Input
                                  value={selectedAWSEC2InstanceType}
                                  onChange={(event) => updateSelectedPlanPayload((current) => ({
                                    ...current,
                                    instance_type: event.target.value,
                                  }))}
                                  placeholder={t("cloud.providers.aws.instance_type_manual_placeholder", { defaultValue: "Or enter an instance type manually" })}
                                />
                              </div>
                              <div className="rounded-xl bg-muted/20 px-4 py-3 lg:col-span-2">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="space-y-1">
                                    <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                      {t("failover.editor.assign_public_ip", { defaultValue: "Assign public IP" })}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {t("failover.editor.assign_public_ip_hint", { defaultValue: "Keep this enabled so the new outlet gets a reachable IPv4 address." })}
                                    </div>
                                  </div>
                                  <Switch
                                    checked={Boolean(selectedPlanPayload.assign_public_ip)}
                                    onCheckedChange={(checked) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      assign_public_ip: Boolean(checked),
                                    }))}
                                  />
                                </div>
                              </div>
                              <div className="rounded-xl bg-muted/20 px-4 py-3 lg:col-span-2">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="space-y-1">
                                    <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                      {t("cloud.form.ipv6", { defaultValue: "Enable IPv6" })}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {t("failover.editor.assign_ipv6_hint", {
                                        defaultValue: "Request an IPv6 address during instance creation and verify it after launch.",
                                      })}
                                    </div>
                                  </div>
                                  <Switch
                                    checked={getBooleanValue(selectedPlanPayload.assign_ipv6, true)}
                                    onCheckedChange={(checked) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      assign_ipv6: Boolean(checked),
                                    }))}
                                  />
                                </div>
                              </div>
                              <div className="rounded-xl bg-muted/20 px-4 py-3 lg:col-span-2">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="space-y-1">
                                    <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                      {t("cloud.providers.aws.allow_all_traffic", { defaultValue: "Allow All Traffic" })}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {t("cloud.providers.aws.allow_all_traffic_on_create", {
                                        defaultValue: "After launch, allow all IPv4 and IPv6 traffic",
                                      })}
                                    </div>
                                  </div>
                                  <Switch
                                    checked={getBooleanValue(selectedPlanPayload.allow_all_traffic, true)}
                                    onCheckedChange={(checked) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      allow_all_traffic: Boolean(checked),
                                    }))}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>{t("cloud.form.name", { defaultValue: "Name" })}</Label>
                                <Input
                                  value={getStringValue(selectedPlanPayload.name)}
                                  onChange={(event) => updateSelectedPlanPayload((current) => ({
                                    ...current,
                                    name: event.target.value,
                                  }))}
                                  placeholder={t("cloud.providers.aws.auto_name", { defaultValue: "Auto name" })}
                                />
                              </div>
                              <div className="space-y-2 lg:col-span-2">
                                <Label>{t("cloud.form.tags", { defaultValue: "Tags" })}</Label>
                                <div className="text-xs text-muted-foreground">
                                  {t("failover.editor.aws_tags_hint", {
                                    defaultValue: "Use key=value pairs separated by commas or new lines. These tags are applied only when Komari needs to create a replacement instance.",
                                  })}
                                </div>
                                <Textarea
                                  className="min-h-24 font-mono text-xs [overflow-wrap:anywhere]"
                                  value={selectedAWSTagsText}
                                  onChange={(event) => updateSelectedPlanPayload((current) => ({
                                    ...current,
                                    tags: parseAWSTagsText(event.target.value),
                                  }))}
                                />
                              </div>
                              <div className="space-y-2 lg:col-span-2">
                                <Label>{t("cloud.form.user_data", { defaultValue: "Cloud-Init / User Data" })}</Label>
                                <Textarea
                                  className="min-h-28 font-mono text-xs [overflow-wrap:anywhere]"
                                  value={typeof selectedPlanPayload.user_data === "string" ? selectedPlanPayload.user_data : ""}
                                  onChange={(event) => updateSelectedPlanPayload((current) => ({
                                    ...current,
                                    user_data: event.target.value,
                                  }))}
                                />
                                <div className="text-xs text-muted-foreground">
                                  {t("failover.editor.aws_user_data_hint", {
                                    defaultValue: "This runs before Komari's auto-connect bootstrap. Use shell script or cloud-init that is compatible with your selected image.",
                                  })}
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="rounded-xl border border-dashed px-4 py-3 text-xs text-muted-foreground lg:col-span-2">
                                {t("failover.editor.aws_rebind_by_ip_hint_lightsail", {
                                  defaultValue: "Komari will first check whether this AWS credential already has a Lightsail instance with the task's current IP. If it does, Komari only replaces that instance's public IP. If it does not, Komari creates a new Lightsail instance with the configuration below.",
                                })}
                              </div>
                              <div className="rounded-xl border border-dashed px-4 py-3 text-xs text-muted-foreground lg:col-span-2">
                                {t("failover.editor.aws_lightsail_static_presets_hint", {
                                  defaultValue: "This replacement-instance form follows the AWS Lightsail create page: common blueprints and bundles are built in, and you can still type uncommon values manually below.",
                                })}
                              </div>
                              <div className="space-y-2">
                                <Label>{t("failover.editor.availability_zone", { defaultValue: "Availability zone" })}</Label>
                                <Input
                                  value={getStringValue(selectedPlanPayload.availability_zone)}
                                  onChange={(event) => updateSelectedPlanPayload((current) => ({
                                    ...current,
                                    availability_zone: event.target.value,
                                  }))}
                                  placeholder={t("cloud.providers.aws.lightsail_az_manual_placeholder", { defaultValue: "Availability zone, for example us-east-1a" })}
                                />
                                <div className="text-xs text-muted-foreground">
                                  {t("failover.editor.aws_lightsail_az_hint", {
                                    az: getDefaultLightsailAvailabilityZone(selectedPlanRegion),
                                    defaultValue: "Lightsail requires a concrete availability zone. Komari usually starts with {{az}} when you pick a region, but you can replace it manually if the account prefers another zone.",
                                  })}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>{t("failover.editor.blueprint", { defaultValue: "Blueprint" })}</Label>
                                <SearchableCatalogSelect
                                  value={selectedLightsailBlueprintID || undefined}
                                  options={awsLightsailBlueprintOptions}
                                  onValueChange={(value) => {
                                    const nextBlueprint = STATIC_LIGHTSAIL_BLUEPRINT_PRESETS.find((preset) => preset.value === value);
                                    if (!nextBlueprint) {
                                      updateSelectedPlanPayload((current) => ({
                                        ...current,
                                        blueprint_id: value,
                                      }));
                                      return;
                                    }
                                    updateSelectedPlanPayload((current) => {
                                      const currentBundlePlatform = inferLightsailBundlePlatform(getStringValue(current.bundle_id));
                                      return {
                                        ...current,
                                        blueprint_id: nextBlueprint.value,
                                        bundle_id:
                                          currentBundlePlatform && currentBundlePlatform !== nextBlueprint.platform
                                            ? getDefaultLightsailBundleForPlatform(nextBlueprint.platform)
                                            : getStringValue(current.bundle_id) || getDefaultLightsailBundleForPlatform(nextBlueprint.platform),
                                      };
                                    });
                                  }}
                                  placeholder={t("failover.editor.blueprint_placeholder", { defaultValue: "Choose a blueprint" })}
                                  searchPlaceholder={t("failover.editor.blueprint_search_placeholder", { defaultValue: "Search blueprints..." })}
                                  emptyLabel={t("failover.editor.blueprint_search_empty", { defaultValue: "No matching blueprint" })}
                                  formatOptionLabel={(option) => {
                                    const preset = STATIC_LIGHTSAIL_BLUEPRINT_PRESETS.find((item) => item.value === option.value);
                                    return preset ? getStaticLightsailBlueprintPresetLabel(preset) : formatCatalogOptionLabel(option);
                                  }}
                                />
                                <Input
                                  value={selectedLightsailBlueprintID}
                                  onChange={(event) => updateSelectedPlanPayload((current) => ({
                                    ...current,
                                    blueprint_id: event.target.value,
                                  }))}
                                  placeholder={t("cloud.providers.aws.lightsail_blueprint_manual_placeholder", { defaultValue: "Or enter a blueprint ID manually" })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t("failover.editor.bundle", { defaultValue: "Bundle" })}</Label>
                                <SearchableCatalogSelect
                                  value={selectedLightsailBundleID || undefined}
                                  options={awsLightsailBundleOptions}
                                  onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                    ...current,
                                    bundle_id: value,
                                  }))}
                                  placeholder={t("failover.editor.bundle_placeholder", { defaultValue: "Choose a bundle" })}
                                  searchPlaceholder={t("failover.editor.bundle_search_placeholder", { defaultValue: "Search bundles..." })}
                                  emptyLabel={t("failover.editor.bundle_search_empty", { defaultValue: "No matching bundle" })}
                                  formatOptionLabel={(option) => {
                                    const preset = STATIC_LIGHTSAIL_BUNDLE_PRESETS.find((item) => item.value === option.value);
                                    return preset ? getStaticLightsailBundlePresetLabel(preset) : formatCatalogOptionLabel(option);
                                  }}
                                />
                                <Input
                                  value={selectedLightsailBundleID}
                                  onChange={(event) => updateSelectedPlanPayload((current) => ({
                                    ...current,
                                    bundle_id: event.target.value,
                                  }))}
                                  placeholder={t("cloud.providers.aws.lightsail_bundle_manual_placeholder", { defaultValue: "Or enter a bundle ID manually" })}
                                />
                              </div>
                              {awsLightsailPlatformMismatch ? (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200 lg:col-span-2">
                                  {t("failover.editor.aws_lightsail_platform_mismatch", {
                                    defaultValue: "The selected Lightsail blueprint and bundle look incompatible. Linux blueprints should use Linux bundles, and Windows blueprints should use Windows bundles.",
                                  })}
                                </div>
                              ) : null}
                              <div className="space-y-2">
                                <Label>{t("cloud.providers.aws.ip_address_type", { defaultValue: "IP Address Type" })}</Label>
                                <Select
                                  value={getStringValue(selectedPlanPayload.ip_address_type) || "dualstack"}
                                  onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                    ...current,
                                    ip_address_type: value,
                                  }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("cloud.providers.aws.ip_address_type", { defaultValue: "IP Address Type" })} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="dualstack">dualstack</SelectItem>
                                    <SelectItem value="ipv4">ipv4</SelectItem>
                                    <SelectItem value="ipv6">ipv6</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>{t("cloud.form.name", { defaultValue: "Name" })}</Label>
                                <Input
                                  value={getStringValue(selectedPlanPayload.name)}
                                  onChange={(event) => updateSelectedPlanPayload((current) => ({
                                    ...current,
                                    name: event.target.value,
                                  }))}
                                  placeholder={t("cloud.providers.aws.auto_name", { defaultValue: "Auto name" })}
                                />
                              </div>
                              <div className="rounded-xl bg-muted/20 px-4 py-3 lg:col-span-2">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="space-y-1">
                                    <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                      {t("cloud.providers.aws.allow_all_traffic", { defaultValue: "Allow All Traffic" })}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {t("cloud.providers.aws.allow_all_traffic_on_create", {
                                        defaultValue: "After launch, allow all IPv4 and IPv6 traffic",
                                      })}
                                    </div>
                                  </div>
                                  <Switch
                                    checked={getBooleanValue(selectedPlanPayload.allow_all_traffic, true)}
                                    onCheckedChange={(checked) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      allow_all_traffic: Boolean(checked),
                                    }))}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2 lg:col-span-2">
                                <Label>{t("cloud.form.tags", { defaultValue: "Tags" })}</Label>
                                <div className="text-xs text-muted-foreground">
                                  {t("failover.editor.aws_tags_hint", {
                                    defaultValue: "Use key=value pairs separated by commas or new lines. These tags are applied only when Komari needs to create a replacement instance.",
                                  })}
                                </div>
                                <Textarea
                                  className="min-h-24 font-mono text-xs [overflow-wrap:anywhere]"
                                  value={selectedAWSTagsText}
                                  onChange={(event) => updateSelectedPlanPayload((current) => ({
                                    ...current,
                                    tags: parseAWSTagsText(event.target.value),
                                  }))}
                                />
                              </div>
                              <div className="space-y-2 lg:col-span-2">
                                <Label>{t("cloud.form.user_data", { defaultValue: "Cloud-Init / User Data" })}</Label>
                                <Textarea
                                  className="min-h-28 font-mono text-xs [overflow-wrap:anywhere]"
                                  value={typeof selectedPlanPayload.user_data === "string" ? selectedPlanPayload.user_data : ""}
                                  onChange={(event) => updateSelectedPlanPayload((current) => ({
                                    ...current,
                                    user_data: event.target.value,
                                  }))}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      ) : null}

                      {selectedPlan.provider === "digitalocean" && selectedPlan.action_type === "provision_instance" ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-2">
                            <Label>{t("failover.editor.region", { defaultValue: "Region" })}</Label>
                            {digitalOceanRegionOptions.length > 0 ? (
                              <Select
                                value={getStringValue(selectedPlanPayload.region) || undefined}
                                onValueChange={(value) => {
                                  updateSelectedPlanPayload((current) => ({
                                    ...current,
                                    region: value,
                                  }));
                                  resetPlanCatalogState(keepPlanCatalogRegions(
                                    planCatalog,
                                    selectedPlan.provider,
                                    selectedPlan.action_type,
                                    selectedPlanService,
                                    value,
                                  ));
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("failover.editor.region_placeholder", { defaultValue: "Choose a region" })} />
                                </SelectTrigger>
                                <SelectContent>
                                  {digitalOceanRegionOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {formatPlanRegionOptionLabel(t, selectedPlan.provider, option)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                {t("failover.editor.load_plan_regions_first", {
                                  defaultValue: "Load regions first, then choose a region.",
                                })}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>{t("failover.editor.size", { defaultValue: "Size" })}</Label>
                            {digitalOceanSizeOptions.length > 0 ? (
                              <SearchableCatalogSelect
                                value={getStringValue(selectedPlanPayload.size) || undefined}
                                options={digitalOceanSizeOptions}
                                onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  size: value,
                                }))}
                                placeholder={t("failover.editor.size_placeholder", { defaultValue: "Choose a size" })}
                                searchPlaceholder={t("failover.editor.size_search_placeholder", { defaultValue: "Search sizes..." })}
                                emptyLabel={t("failover.editor.size_search_empty", { defaultValue: "No matching size" })}
                              />
                            ) : (
                              <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                {t("failover.editor.load_plan_options_first", {
                                  defaultValue: "Choose a region first, then load provider options.",
                                })}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>{t("failover.editor.image", { defaultValue: "Image" })}</Label>
                            {digitalOceanImageOptions.length > 0 ? (
                              <SearchableCatalogSelect
                                value={getStringValue(selectedPlanPayload.image) || undefined}
                                options={digitalOceanImageOptions}
                                onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  image: value,
                                }))}
                                placeholder={t("failover.editor.image_placeholder", { defaultValue: "Choose an image" })}
                                searchPlaceholder={t("failover.editor.image_search_placeholder", { defaultValue: "Search images..." })}
                                emptyLabel={t("failover.editor.image_search_empty", { defaultValue: "No matching image" })}
                              />
                            ) : (
                              <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                {t("failover.editor.load_plan_options_first", {
                                  defaultValue: "Choose a region first, then load provider options.",
                                })}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>{t("cloud.form.root_password", { defaultValue: "Root password" })}</Label>
                            <Input
                              type="password"
                              value={getStringValue(selectedPlanPayload.root_password)}
                              onChange={(event) => updateSelectedPlanPayload((current) => ({
                                ...current,
                                root_password: event.target.value,
                              }))}
                              placeholder={t("cloud.form.root_password_placeholder", {
                                defaultValue: "Enter a root password",
                              })}
                            />
                            <div className="text-xs text-muted-foreground">
                              {t("cloud.form.root_password_random_help", {
                                defaultValue: "Leave it empty to generate a random root password when the instance is created.",
                              })}
                            </div>
                          </div>
                          <div className="rounded-xl bg-muted/20 px-4 py-3 lg:col-span-2">
                            <div className="flex items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                  {t("cloud.form.ipv6", { defaultValue: "Enable IPv6" })}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {t("failover.editor.plan_default_image_hint", {
                                    defaultValue: "Region labels include Chinese country names, and image and size come from provider options.",
                                  })}
                                </div>
                              </div>
                              <Switch
                                checked={getBooleanValue(selectedPlanPayload.ipv6, false)}
                                onCheckedChange={(checked) => updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  ipv6: Boolean(checked),
                                }))}
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {selectedPlan.provider === "linode" && selectedPlan.action_type === "provision_instance" ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-2">
                            <Label>{t("failover.editor.region", { defaultValue: "Region" })}</Label>
                            {linodeRegionOptions.length > 0 ? (
                              <Select
                                value={getStringValue(selectedPlanPayload.region) || undefined}
                                onValueChange={(value) => {
                                  updateSelectedPlanPayload((current) => ({
                                    ...current,
                                    region: value,
                                  }));
                                  resetPlanCatalogState(keepPlanCatalogRegions(
                                    planCatalog,
                                    selectedPlan.provider,
                                    selectedPlan.action_type,
                                    selectedPlanService,
                                    value,
                                  ));
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("failover.editor.region_placeholder", { defaultValue: "Choose a region" })} />
                                </SelectTrigger>
                                <SelectContent>
                                  {linodeRegionOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {formatPlanRegionOptionLabel(t, selectedPlan.provider, option)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                {t("failover.editor.load_plan_regions_first", {
                                  defaultValue: "Load regions first, then choose a region.",
                                })}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>{t("failover.editor.type", { defaultValue: "Plan type" })}</Label>
                            {linodeTypeOptions.length > 0 ? (
                              <SearchableCatalogSelect
                                value={getStringValue(selectedPlanPayload.type) || undefined}
                                options={linodeTypeOptions}
                                onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  type: value,
                                }))}
                                placeholder={t("failover.editor.type_placeholder", { defaultValue: "Choose a plan type" })}
                                searchPlaceholder={t("failover.editor.type_search_placeholder", { defaultValue: "Search plan types..." })}
                                emptyLabel={t("failover.editor.type_search_empty", { defaultValue: "No matching plan type" })}
                              />
                            ) : (
                              <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                {t("failover.editor.load_plan_options_first", {
                                  defaultValue: "Choose a region first, then load provider options.",
                                })}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>{t("failover.editor.image", { defaultValue: "Image" })}</Label>
                            {linodeImageOptions.length > 0 ? (
                              <SearchableCatalogSelect
                                value={getStringValue(selectedPlanPayload.image) || undefined}
                                options={linodeImageOptions}
                                onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  image: value,
                                }))}
                                placeholder={t("failover.editor.image_placeholder", { defaultValue: "Choose an image" })}
                                searchPlaceholder={t("failover.editor.image_search_placeholder", { defaultValue: "Search images..." })}
                                emptyLabel={t("failover.editor.image_search_empty", { defaultValue: "No matching image" })}
                              />
                            ) : (
                              <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                {t("failover.editor.load_plan_options_first", {
                                  defaultValue: "Choose a region first, then load provider options.",
                                })}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>{t("cloud.form.root_password", { defaultValue: "Root password" })}</Label>
                            <Input
                              type="password"
                              value={getStringValue(selectedPlanPayload.root_password)}
                              onChange={(event) => updateSelectedPlanPayload((current) => ({
                                ...current,
                                root_password: event.target.value,
                              }))}
                              placeholder={t("cloud.form.root_password_placeholder", {
                                defaultValue: "Enter a root password",
                              })}
                            />
                            <div className="text-xs text-muted-foreground">
                              {t("failover.editor.plan_default_image_and_password_hint", {
                                defaultValue: "Pick the image from provider options. Leave the password empty to generate a random one.",
                              })}
                            </div>
                          </div>
                        </div>
                      ) : null}
                        </>
                      ) : null}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>

                    <Collapsible
                      open={selectedPlanOptionalOpen}
                      onOpenChange={(openState) => setSelectedPlanSectionOpen("optional", openState)}
                    >
                      <div className="rounded-xl border">
                        <CollapsibleTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            className="flex min-w-0 h-auto w-full items-center justify-between rounded-xl px-4 py-4 text-left"
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                {t("failover.editor.show_plan_optional", {
                                  defaultValue: "Optional plan settings",
                                })}
                              </div>
                              <div className="line-clamp-2 break-words text-xs text-muted-foreground">
                                {selectedPlanOptionalSummary}
                              </div>
                            </div>
                            <ChevronDown
                              className={cn(
                                "size-4 shrink-0 text-muted-foreground transition-transform",
                                selectedPlanOptionalOpen ? "rotate-180" : "",
                              )}
                            />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="border-t px-4 py-4">
                          <div className="space-y-4">
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                              {t("failover.editor.show_plan_optional", {
                                defaultValue: "Optional plan settings",
                              })}
                            </div>
                            <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                          <Label>{t("common.name", { defaultValue: "Name" })}</Label>
                          <Input
                            value={selectedPlan.name}
                            onChange={(event) => updatePlan(selectedPlan.local_id, (current) => ({ ...current, name: event.target.value }))}
                            placeholder={t("failover.editor.plan_name_placeholder", {
                              defaultValue: "AWS Elastic IP first",
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("failover.editor.auto_connect_group", { defaultValue: "Auto-connect group" })}</Label>
                          <div className="rounded-xl bg-muted/20 px-4 py-3">
                            <div className="flex items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                  {t("failover.editor.auto_connect_group_custom", { defaultValue: "Custom auto-connect group" })}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {selectedPlanUsesCustomAutoConnectGroup
                                    ? t("failover.editor.auto_connect_group_custom_enabled_hint", {
                                      defaultValue: "Manual mode is enabled. This value will not follow provider or token group changes.",
                                    })
                                    : t("failover.editor.auto_connect_group_custom_disabled_hint", {
                                      defaultValue: "Recommended value follows the selected provider entry group automatically.",
                                    })}
                                </div>
                              </div>
                              <Switch
                                checked={selectedPlanUsesCustomAutoConnectGroup}
                                onCheckedChange={(checked) => setSelectedPlanCustomAutoConnectGroup(Boolean(checked))}
                              />
                            </div>
                          </div>
                          <Input
                            value={selectedPlanDisplayedAutoConnectGroup}
                            readOnly={!selectedPlanUsesCustomAutoConnectGroup}
                            onChange={(event) => updatePlan(selectedPlan.local_id, (current) => ({
                              ...current,
                              auto_connect_group: event.target.value,
                            }))}
                            className={!selectedPlanUsesCustomAutoConnectGroup ? "bg-muted/30 text-muted-foreground" : ""}
                            placeholder={
                              suggestedAutoConnectGroup
                              || t("failover.editor.auto_connect_group_placeholder", { defaultValue: "digitalocean/sg-prod" })
                            }
                          />
                          <div className="text-xs text-muted-foreground">
                            {t("failover.editor.auto_connect_group_hint", {
                              defaultValue: "Keep the recommended value unless this plan should register servers into a different group or disable auto-connect entirely.",
                            })}
                          </div>
                        </div>
                        <div className="space-y-2 lg:col-span-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Label>{t("failover.editor.scripts", { defaultValue: "Scripts" })}</Label>
                            <div className="text-xs text-muted-foreground">
                              {selectedPlan.script_clipboard_ids.length > 0
                                ? t("failover.editor.scripts_selected", {
                                  defaultValue: "{{count}} selected",
                                  count: selectedPlan.script_clipboard_ids.length,
                                })
                                : t("failover.editor.no_script", { defaultValue: "No script" })}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                {t("failover.editor.scripts_execution_order_title", {
                                  defaultValue: "Execution order",
                                })}
                              </div>
                              {selectedPlanScriptEntries.length > 0 ? (
                                <div className="text-xs text-muted-foreground">
                                  {t("failover.editor.scripts_execution_order_hint", {
                                    defaultValue: "Scripts run from top to bottom. Move entries here to change the actual execution order.",
                                  })}
                                </div>
                              ) : null}
                            </div>
                            {selectedPlanScriptEntries.length > 0 ? (
                              <div className="overflow-hidden rounded-xl border">
                                {selectedPlanScriptEntries.map(({ id, script }, index) => {
                                  const canMoveUp = index > 0;
                                  const canMoveDown = index < selectedPlanScriptEntries.length - 1;
                                  return (
                                    <div
                                      key={id}
                                      className="flex items-start gap-3 border-b px-3 py-3 last:border-b-0"
                                    >
                                      <Badge variant="secondary" className="mt-0.5 min-w-8 justify-center">
                                        {index + 1}
                                      </Badge>
                                      <div className="min-w-0 flex-1">
                                        <div className="font-medium text-slate-900 dark:text-slate-50">
                                          {getScriptDisplayName(id)}
                                        </div>
                                        {script?.remark ? (
                                          <div className="truncate text-xs text-muted-foreground" title={script.remark}>
                                            {script.remark}
                                          </div>
                                        ) : null}
                                        {!script ? (
                                          <div className="text-xs text-amber-700 dark:text-amber-300">
                                            {t("failover.editor.script_missing_hint", {
                                              defaultValue: "This script is no longer in the library, but it will stay in the saved execution order until you remove it.",
                                            })}
                                          </div>
                                        ) : null}
                                      </div>
                                      <div className="flex shrink-0 items-center gap-1">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          onClick={() => movePlanScriptToIndex(selectedPlan.local_id, id, index - 1)}
                                          disabled={!canMoveUp}
                                          title={t("failover.editor.move_script_up", { defaultValue: "Move script up" })}
                                        >
                                          <ArrowUp className="size-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          onClick={() => movePlanScriptToIndex(selectedPlan.local_id, id, index + 1)}
                                          disabled={!canMoveDown}
                                          title={t("failover.editor.move_script_down", { defaultValue: "Move script down" })}
                                        >
                                          <ArrowDown className="size-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          onClick={() => removePlanScript(selectedPlan.local_id, id)}
                                          title={t("failover.editor.remove_script", { defaultValue: "Remove script" })}
                                        >
                                          <Trash2 className="size-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                {t("failover.editor.scripts_execution_order_empty_detail", {
                                  defaultValue: "No scripts are selected yet. Pick scripts below, then reorder them here from top to bottom.",
                                })}
                              </div>
                            )}
                          </div>
                          <Input
                            value={selectedPlanScriptSearch}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              setPlanScriptSearchQueries((current) => ({
                                ...current,
                                [selectedPlan.local_id]: nextValue,
                              }));
                            }}
                            placeholder={t("failover.editor.scripts_search_placeholder", {
                              defaultValue: "Search scripts by name or remark, e.g. sg1",
                            })}
                          />
                          <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            {t("failover.editor.available_scripts", {
                              defaultValue: "Available scripts",
                            })}
                          </div>
                          <div className="max-h-56 overflow-y-auto overscroll-contain rounded-xl border [scrollbar-gutter:stable]">
                            {sortedScripts.length === 0 ? (
                              <div className="px-3 py-3 text-sm text-muted-foreground">
                                {t("scripts.empty", { defaultValue: "No saved scripts yet." })}
                              </div>
                            ) : filteredScripts.length === 0 ? (
                              <div className="px-3 py-3 text-sm text-muted-foreground">
                                {t("failover.editor.scripts_search_empty", {
                                  defaultValue: "No matching scripts",
                                })}
                              </div>
                            ) : (
                              filteredScripts.map((script) => {
                                const checked = selectedPlan.script_clipboard_ids.includes(String(script.id));
                                return (
                                  <label
                                    key={script.id}
                                    className="flex cursor-pointer items-start gap-3 border-b px-3 py-3 text-sm last:border-b-0"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(nextChecked) => togglePlanScript(selectedPlan.local_id, String(script.id), Boolean(nextChecked))}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="font-medium text-slate-900 dark:text-slate-50">{script.name}</div>
                                      {script.remark ? (
                                        <div className="truncate text-xs text-muted-foreground" title={script.remark}>
                                          {script.remark}
                                        </div>
                                      ) : null}
                                    </div>
                                  </label>
                                );
                              })
                            )}
                          </div>
                          <div className="line-clamp-2 break-words text-xs leading-5 text-muted-foreground">
                            {selectedPlanScriptNames.length > 0
                              ? selectedPlanScriptNames.join(" -> ")
                              : t("failover.editor.scripts_execution_order_empty", {
                                defaultValue: "Selected scripts run from top to bottom.",
                              })}
                          </div>
                        </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>

                    <Collapsible open={selectedPlanAdvancedOpen} onOpenChange={setSelectedPlanAdvancedOpen}>
                      <div className="rounded-xl border">
                        <CollapsibleTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            className="flex min-w-0 h-auto w-full items-center justify-between rounded-xl px-4 py-4 text-left"
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                {t("failover.editor.show_plan_advanced", {
                                  defaultValue: "Advanced plan settings",
                                })}
                              </div>
                              <div className="line-clamp-2 break-words text-xs text-muted-foreground">
                                {describePlanAdvancedSettings(t, selectedPlan)}
                              </div>
                            </div>
                            <ChevronDown
                              className={cn(
                                "size-4 shrink-0 text-muted-foreground transition-transform",
                                selectedPlanAdvancedOpen ? "rotate-180" : "",
                              )}
                            />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="border-t px-4 py-4">
                          <div className="grid gap-4 lg:grid-cols-3">
                            <div className="space-y-2">
                              <Label>{t("failover.editor.priority", { defaultValue: "Priority" })}</Label>
                              <Input
                                type="number"
                                min={1}
                                max={formState.plans.length}
                                value={selectedPlanIndex >= 0 ? String(selectedPlanIndex + 1) : selectedPlan.priority}
                                onChange={(event) => {
                                  const nextPriority = Number.parseInt(event.target.value, 10);
                                  if (!Number.isFinite(nextPriority)) {
                                    return;
                                  }
                                  movePlanToIndex(selectedPlan.local_id, nextPriority - 1);
                                }}
                              />
                              <div className="text-xs text-muted-foreground">
                                {t("failover.editor.priority_reorder_hint", {
                                  defaultValue: "Priority always follows the visible plan order. Change this number or use move up/down to reorder.",
                                })}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>{t("failover.editor.script_timeout", { defaultValue: "Script timeout (s)" })}</Label>
                              <Input
                                type="number"
                                min={1}
                                value={selectedPlan.script_timeout_sec}
                                onChange={(event) => updatePlan(selectedPlan.local_id, (current) => ({ ...current, script_timeout_sec: event.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t("failover.editor.wait_agent_timeout", { defaultValue: "Wait agent timeout (s)" })}</Label>
                              <Input
                                type="number"
                                min={1}
                                value={selectedPlan.wait_agent_timeout_sec}
                                onChange={(event) => updatePlan(selectedPlan.local_id, (current) => ({ ...current, wait_agent_timeout_sec: event.target.value }))}
                              />
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                        </>
                      ) : null}
                    </section>
                  </div>
                </DialogContent>
              </Dialog>

              <section className="space-y-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                    {t("failover.preview.title", { defaultValue: "Preview checks" })}
                  </div>
                </div>
                <ActionSummaryCard
                  title={t("failover.preview.title", { defaultValue: "Preview checks" })}
                  hint={t("failover.preview.summary_hint", {
                    defaultValue: "Keep the main dialog focused on preview status and save readiness. Open the secondary dialog only when you need to inspect check details.",
                  })}
                  actionLabel={t("failover.preview.details_action", { defaultValue: "View details" })}
                  onAction={() => setPreviewDialogOpen(true)}
                  actionDisabled={!hasPreviewDetail}
                  actionIcon="view"
                  items={previewSummaryItems}
                  emptyLabel={t("failover.preview.summary_empty", {
                    defaultValue: "Preview has not run yet. Use the Preview button below to validate the current task before saving.",
                  })}
                  showEmptyState={!hasPreviewDetail}
                  statusMessage={previewSummaryStatusMessage}
                  statusTone={previewSummaryStatusTone}
                />
              </section>

              <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
                <DialogContent className="flex h-[88vh] min-h-0 w-[calc(100vw-2rem)] max-w-5xl flex-col overflow-hidden p-0">
                  <DialogHeader className="shrink-0 border-b bg-background px-5 py-4">
                    <DialogTitle>{t("failover.preview.title", { defaultValue: "Preview checks" })}</DialogTitle>
                    <DialogDescription>
                      {t("failover.preview.dialog_description", {
                        defaultValue: "Inspect task-level and plan-level checks from the latest preview run without crowding the main task dialog.",
                      })}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-5 [scrollbar-gutter:stable]">
                    <TaskPreviewSection
                      preview={previewResult}
                      loading={previewing}
                      error={previewError}
                      stale={previewOutdated}
                      hideHeader
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t bg-background/95 px-5 py-4 backdrop-blur sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1 text-xs text-muted-foreground">
              <div
                className={cn(
                  "line-clamp-2 break-words",
                  previewSaveBlockedReason
                    ? "text-amber-700 dark:text-amber-300"
                    : previewHasRun && previewSummary.warningCount > 0
                      ? "text-amber-700 dark:text-amber-300"
                      : "",
                )}
                title={previewFooterHint}
              >
                {previewFooterHint}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                {t("common.cancel", { defaultValue: "Cancel" })}
              </Button>
              <Button type="button" variant="outline" onClick={() => void handlePreview()} disabled={submitting || previewing}>
                {previewing ? <LoaderCircle className="size-4 animate-spin" /> : <Eye className="size-4" />}
                {t("failover.preview.action", { defaultValue: "Preview" })}
              </Button>
              <Button type="submit" disabled={submitting || Boolean(previewSaveBlockedReason)} title={previewSaveBlockedReason || undefined}>
                {submitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {mode === "edit"
                  ? t("common.save", { defaultValue: "Save" })
                  : t("common.create", { defaultValue: "Create" })}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FailoverPageContent() {
  const { t } = useTranslation();
  const { account, hasFeature, loading: accountLoading } = useAccount();
  const [tasks, setTasks] = React.useState<FailoverTask[]>([]);
  const [nodes, setNodes] = React.useState<FailoverNodeOption[]>([]);
  const [scripts, setScripts] = React.useState<FailoverScriptOption[]>([]);
  const [providerEntries, setProviderEntries] = React.useState<ProviderEntriesMap>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [refreshing, setRefreshing] = React.useState(false);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editorMode, setEditorMode] = React.useState<"create" | "edit">("create");
  const [editingTask, setEditingTask] = React.useState<FailoverTask | null>(null);
  const [templateTask, setTemplateTask] = React.useState<FailoverTask | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<FailoverTask | null>(null);
  const [selectedExecutionID, setSelectedExecutionID] = React.useState<number | null>(null);
  const [selectedExecutionTaskName, setSelectedExecutionTaskName] = React.useState("");
  const [runningTaskID, setRunningTaskID] = React.useState<number | null>(null);
  const [busyTaskID, setBusyTaskID] = React.useState<number | null>(null);
  const [stoppingExecutionID, setStoppingExecutionID] = React.useState<number | null>(null);
  const [clockNow, setClockNow] = React.useState(() => Date.now());
  const allowedPlanProviders = React.useMemo(
    () => PLAN_PROVIDER_VALUES.filter((provider) => hasFeature(PLAN_PROVIDER_REQUIRED_FEATURES[provider])),
    [hasFeature],
  );

  const refreshTasks = React.useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError("");

    try {
      const list = await getFailoverTasks();
      setTasks(list);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : t("failover.messages.load_tasks_failed", {
            defaultValue: "Failed to load failover tasks",
          }),
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, [t]);

  const refreshResources = React.useCallback(async () => {
    const providerKeys = FAILOVER_PROVIDER_KEYS.filter((provider) => {
      if (provider === "aws" || provider === "digitalocean" || provider === "linode") {
        return allowedPlanProviders.includes(provider);
      }
      return true;
    });
    const [nodesResult, scriptsResult, providerResults] = await Promise.all([
      getFailoverNodes(),
      getFailoverScripts().catch(() => []),
      Promise.allSettled(
        providerKeys.map(async (provider) => ({
          provider,
          entries: await getFailoverProviderEntries(provider),
        })),
      ),
    ]);

    setNodes([...nodesResult].sort((left, right) => compareString(left.name || left.uuid, right.name || right.uuid)));
    setScripts(scriptsResult);

    const nextEntries: ProviderEntriesMap = {};
    for (const result of providerResults) {
      if (result.status === "fulfilled") {
        nextEntries[result.value.provider] = result.value.entries;
      }
    }
    setProviderEntries(nextEntries);
  }, [allowedPlanProviders]);

  React.useEffect(() => {
    if (accountLoading || !hasFeature("cloud_failover") || !hasFeature("cn_connectivity")) {
      return;
    }

    void Promise.all([refreshTasks(), refreshResources()]);
  }, [accountLoading, hasFeature, refreshResources, refreshTasks]);

  React.useEffect(() => {
    if (accountLoading || !hasFeature("cloud_failover") || !hasFeature("cn_connectivity")) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshTasks({ silent: true });
    }, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, [accountLoading, hasFeature, refreshTasks]);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const openCreateDialog = () => {
    setEditorMode("create");
    setEditingTask(null);
    setTemplateTask(null);
    setEditorOpen(true);
    void refreshResources();
  };

  const openEditDialog = async (task: FailoverTask) => {
    setBusyTaskID(task.id);
    try {
      const detail = await getFailoverTask(task.id);
      setEditorMode("edit");
      setEditingTask(detail);
      setTemplateTask(null);
      setEditorOpen(true);
      void refreshResources();
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : t("common.unknown_error"));
    } finally {
      setBusyTaskID(null);
    }
  };

  const openDuplicateDialog = async (task: FailoverTask) => {
    setBusyTaskID(task.id);
    try {
      const detail = await getFailoverTask(task.id);
      setEditorMode("create");
      setEditingTask(null);
      setTemplateTask(detail);
      setEditorOpen(true);
      void refreshResources();
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : t("common.unknown_error"));
    } finally {
      setBusyTaskID(null);
    }
  };

  const openExecutionDialog = (executionID: number, taskName: string) => {
    setSelectedExecutionID(executionID);
    setSelectedExecutionTaskName(taskName);
  };

  const handleRunTask = async (task: FailoverTask) => {
    setRunningTaskID(task.id);
    try {
      const execution = await runFailoverTask(task.id);
      toast.success(t("failover.messages.started", { defaultValue: "Failover task started" }));
      openExecutionDialog(execution.id, task.name);
      await refreshTasks({ silent: true });
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : t("common.unknown_error"));
    } finally {
      setRunningTaskID(null);
    }
  };

  const handleStopExecution = async (executionID: number, taskName: string) => {
    setStoppingExecutionID(executionID);
    try {
      await stopFailoverExecution(executionID);
      toast.success(t("failover.messages.stopped", { defaultValue: "Failover execution stopped" }));
      await refreshTasks({ silent: true });
      openExecutionDialog(executionID, taskName);
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : t("common.unknown_error"));
    } finally {
      setStoppingExecutionID(null);
    }
  };

  const handleToggleTask = async (task: FailoverTask) => {
    setBusyTaskID(task.id);
    try {
      await toggleFailoverTask(task.id, !task.enabled);
      toast.success(
        task.enabled
          ? t("failover.messages.disabled", { defaultValue: "Failover task disabled" })
          : t("failover.messages.enabled", { defaultValue: "Failover task enabled" }),
      );
      await refreshTasks({ silent: true });
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : t("common.unknown_error"));
    } finally {
      setBusyTaskID(null);
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTarget) {
      return;
    }

    setBusyTaskID(deleteTarget.id);
    try {
      await deleteFailoverTask(deleteTarget.id);
      toast.success(t("failover.messages.deleted", { defaultValue: "Failover task deleted" }));
      setDeleteTarget(null);
      await refreshTasks({ silent: true });
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : t("common.unknown_error"));
    } finally {
      setBusyTaskID(null);
    }
  };

  if (accountLoading) {
    return <Loading />;
  }

  if (!hasFeature("cloud_failover") || !hasFeature("cn_connectivity")) {
    return <Navigate to={getDefaultAdminPath(account)} replace />;
  }

  return (
    <>
      <AdminPageShell
        className="gap-3"
        contentClassName="gap-3"
        actions={(
          <>
            <Button type="button" variant="outline" onClick={() => void Promise.all([refreshTasks({ silent: true }), refreshResources()])} disabled={refreshing || loading}>
              <RefreshCw className={cn("size-4", refreshing ? "animate-spin" : "")} />
              {t("common.refresh", { defaultValue: "Refresh" })}
            </Button>
            <Button type="button" onClick={openCreateDialog}>
              <Plus className="size-4" />
              {t("failover.create", { defaultValue: "New task" })}
            </Button>
          </>
        )}
      >
        {loading ? <Loading /> : null}

        {!loading && error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {!loading && !error && tasks.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("failover.empty_title", { defaultValue: "No failover tasks yet" })}</CardTitle>
              <CardDescription>
                {t("failover.empty_description", {
                  defaultValue:
                    "Create your first task to watch CN connectivity, provision or rebind IPs, optionally run a clipboard script, and switch DNS only when needed.",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" onClick={openCreateDialog}>
                <Plus className="size-4" />
                {t("failover.create", { defaultValue: "New task" })}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {!loading && !error && tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map((task) => {
              const currentClientUUID = task.current_client_uuid || task.watch_client_uuid;
              const latestExecution = task.latest_execution;
              const taskBusy = busyTaskID === task.id;
              const taskRunning = runningTaskID === task.id;
              const executionStopping = latestExecution ? stoppingExecutionID === latestExecution.id : false;
              const requiresInitialization = !currentClientUUID;
              const currentOutletIP = task.current_address || "";
              const currentOutletLabel = currentOutletIP || t("failover.task.uninitialized", { defaultValue: "Not initialized" });
              const dnsTargetLabel = getTaskDnsTargetLabel(task);
              const dnsStatus = latestExecution?.dns_status || "";
              const dnsIPv6Badge = getTaskDnsIPv6Badge(t, task, latestExecution);
              const hasConfiguredScript = task.plans.some((plan) => plan.script_clipboard_ids.length > 0 || plan.script_clipboard_id !== null);
              const scriptStatus = latestExecution?.script_status || "";
              const scriptName = latestExecution?.script_name_snapshot || "";
              const scriptNames = splitScriptSnapshotNames(scriptName);
              const scriptPreviewNames = scriptNames.slice(0, 2);
              const hiddenScriptCount = Math.max(0, scriptNames.length - scriptPreviewNames.length);
              const latestCleanupInfo = latestExecution
                ? getCleanupResultInfo(t, latestExecution.cleanup_status, latestExecution.cleanup_result)
                : null;
              const selectedExecutionPlan = latestExecution
                ? getSelectedTaskPlan(task.plans, latestExecution.selected_plan_id)
                : null;
              const latestPlanAttempt = latestExecution
                ? getLastExecutionPlanAttempt(latestExecution.attempted_plans)
                : null;
              const latestEntryAttempt = getLastExecutionEntryAttempt(latestPlanAttempt);
              const latestPlanSummary = getExecutionPlanSummaryText(t, selectedExecutionPlan, latestPlanAttempt);
              const latestEntrySummary = getExecutionEntrySummaryText(t, latestPlanAttempt, latestEntryAttempt);
              const latestStep = latestExecution?.last_step || null;
              const latestStepLabel = latestStep ? getFailoverExecutionStepLabel(t, latestStep) : "";
              const latestStepMessage = latestStep ? getFailoverExecutionStepMessage(t, latestStep) : "";
              const taskRiskBadges = getFailoverTaskRiskBadges(t, latestExecution, latestCleanupInfo);
              const latestExecutionSummary = latestExecution
                ? latestExecution.error_message
                  || (
                    latestCleanupInfo
                    && ["warning", "failed"].includes(String(latestExecution.cleanup_status || "").trim().toLowerCase())
                      ? latestCleanupInfo.title
                      : formatDateTime(latestExecution.started_at)
                  )
                : t("failover.task.no_execution", { defaultValue: "No execution recorded yet." });
              const cooldownSummary = task.cooldown_remaining_seconds > 0
                ? formatDurationSeconds(task.cooldown_remaining_seconds, t)
                : t("failover.cooldown.ready", { defaultValue: "Ready" });
              const nextCycleAt = task.next_scheduled_check_at ? new Date(task.next_scheduled_check_at).getTime() : Number.NaN;
              const nextCycleRemainingSeconds = Number.isFinite(nextCycleAt)
                ? Math.max(0, Math.ceil((nextCycleAt - clockNow) / 1000))
                : Math.max(0, task.next_scheduled_check_remaining_seconds);
              const nextCycleSummary = task.enabled && !task.has_active_execution && (task.next_scheduled_check_at || task.next_scheduled_check_remaining_seconds > 0)
                ? nextCycleRemainingSeconds > 0
                  ? formatDurationSeconds(nextCycleRemainingSeconds, t)
                  : t("failover.table.next_cycle_now", { defaultValue: "Now" })
                : null;
              const staleRetrySummary = task.probe.stale && task.failure_threshold > 0
                ? t("failover.probe.stale_with_retry", {
                  defaultValue: "Stale ({{current}}/{{total}})",
                  current: Math.min(Math.max(0, task.trigger_failure_count), task.failure_threshold),
                  total: task.failure_threshold,
                })
                : null;

              return (
                <Card
                  key={task.id}
                  className={cn(
                    "overflow-hidden border-slate-200/80 bg-card py-0 dark:border-slate-800/80",
                    task.has_active_execution && "border-amber-300/80 dark:border-amber-700/60",
                  )}
                >
                  <div className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1.35fr)_auto] lg:items-center">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-50" title={task.name}>
                          {task.name}
                        </div>
                        <Badge variant={task.enabled ? "success" : "outline"}>
                          {task.enabled
                            ? t("common.enabled", { defaultValue: "Enabled" })
                            : t("common.disabled", { defaultValue: "Disabled" })}
                        </Badge>
                        <Badge variant={getStatusVariant(task.last_status, "execution")}>
                          {getStatusLabel(t, task.last_status)}
                        </Badge>
                        {task.has_active_execution ? (
                          <Badge variant="warning">
                            {t("failover.task.active_execution", { defaultValue: "Active execution" })}
                          </Badge>
                        ) : null}
                        {task.probe.stale ? (
                          <Badge variant="warning" title={task.last_message || undefined}>
                            {staleRetrySummary || t("failover.probe.stale", { defaultValue: "Stale" })}
                          </Badge>
                        ) : (
                          <Badge variant={getStatusVariant(task.probe.status, "probe")}>
                            {t("failover.table.probe", { defaultValue: "Probe" })}: {getStatusLabel(t, task.probe.status)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {t("failover.task.script_status_label", { defaultValue: "Script status" })}:
                        </span>
                        <Badge variant={getStatusVariant(
                          scriptStatus || (hasConfiguredScript ? "pending" : "skipped"),
                          "script",
                        )}>
                          {getTaskScriptStatusLabel(t, scriptStatus, hasConfiguredScript, Boolean(latestExecution))}
                        </Badge>
                        {scriptNames.length > 0 ? (
                          <Badge variant="outline">
                            {t("failover.task.script_count", {
                              count: scriptNames.length,
                              defaultValue: "{{count}} script(s)",
                            })}
                          </Badge>
                        ) : null}
                        {scriptName ? (
                          <div className="min-w-0 flex-1 line-clamp-2 leading-5" title={scriptName}>
                            {scriptPreviewNames.join(" · ")}
                            {hiddenScriptCount > 0 ? ` +${hiddenScriptCount}` : ""}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {t("failover.task.outlet_ip_label", { defaultValue: "Outlet IP" })}:
                        </span>
                        <div className="min-w-0 truncate" title={currentOutletLabel}>
                          {currentOutletLabel}
                        </div>
                        {dnsTargetLabel ? (
                          <>
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {t("failover.task.dns_target_label", { defaultValue: "DNS target" })}:
                            </span>
                            <div className="min-w-0 truncate" title={dnsTargetLabel}>
                              {dnsTargetLabel}
                            </div>
                          </>
                        ) : null}
                        {task.dns_provider ? (
                          <>
                            <Badge variant={getStatusVariant(dnsStatus || "pending", "dns")}>
                              {getDnsTaskStatusLabel(t, dnsStatus)}
                            </Badge>
                            {dnsIPv6Badge ? (
                              <Badge
                                variant={dnsIPv6Badge.variant}
                                className="px-1.5 py-0 text-[10px] font-semibold lowercase tracking-[0.06em]"
                                title={dnsIPv6Badge.title}
                                aria-label={dnsIPv6Badge.title}
                              >
                                v6
                              </Badge>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {t("failover.table.latest", { defaultValue: "Latest execution" })}
                        </div>
                        {latestExecution ? (
                          <Badge variant={getStatusVariant(latestExecution.status, "execution")}>
                            {getStatusLabel(t, latestExecution.status)}
                          </Badge>
                        ) : null}
                      </div>
                      {taskRiskBadges.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {taskRiskBadges.map((badge) => (
                            <Badge key={badge.key} variant={badge.variant} title={badge.title || undefined}>
                              {badge.label}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                        <div
                          className={cn(
                          "break-words text-sm leading-5",
                          latestExecution?.error_message ? "text-red-600 dark:text-red-300" : "text-slate-900 dark:text-slate-50",
                        )}
                        title={latestExecution?.error_message || latestExecutionSummary}
                      >
                        {latestExecutionSummary}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{t("failover.table.cooldown", { defaultValue: "Cooldown" })}: {cooldownSummary}</span>
                        {nextCycleSummary ? (
                          <span>{t("failover.table.next_cycle", { defaultValue: "Next cycle" })}: {nextCycleSummary}</span>
                        ) : null}
                        {latestExecution ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-auto px-0 text-xs"
                            onClick={() => openExecutionDialog(latestExecution.id, task.name)}
                          >
                            <Eye className="size-3.5" />
                            {t("failover.table.view_latest", { defaultValue: "View details" })}
                          </Button>
                        ) : null}
                      </div>
                      {latestPlanSummary ? (
                        <div className="min-w-0 text-xs text-muted-foreground">
                          <span className="font-medium text-slate-600 dark:text-slate-300">
                            {t("failover.execution.summary.plan", { defaultValue: "Plan" })}:
                          </span>{" "}
                          <span className="break-words" title={latestPlanSummary}>{latestPlanSummary}</span>
                        </div>
                      ) : null}
                      {latestEntrySummary ? (
                        <div className="min-w-0 text-xs text-muted-foreground">
                          <span className="font-medium text-slate-600 dark:text-slate-300">
                            {t("failover.execution.summary.entry", { defaultValue: "Entry" })}:
                          </span>{" "}
                          <span className="break-words" title={latestEntrySummary}>{latestEntrySummary}</span>
                        </div>
                      ) : null}
                      {latestStepLabel ? (
                        <div className="min-w-0 text-xs text-muted-foreground">
                          <span className="font-medium text-slate-600 dark:text-slate-300">
                            {t("failover.execution.summary.last_step", { defaultValue: "Last step" })}:
                          </span>{" "}
                          <span className="break-words" title={[latestStepLabel, latestStepMessage].filter(Boolean).join(" · ")}>
                            {latestStepLabel}
                            {latestStepMessage ? ` · ${latestStepMessage}` : ""}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button type="button" size="sm" variant="outline" onClick={() => void openEditDialog(task)} disabled={taskBusy || taskRunning}>
                        {taskBusy ? <LoaderCircle className="size-4 animate-spin" /> : <PencilLine className="size-4" />}
                        {t("common.edit", { defaultValue: "Edit" })}
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => void openDuplicateDialog(task)} disabled={taskBusy || taskRunning}>
                        {taskBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Copy className="size-4" />}
                        {t("copy", { defaultValue: "Copy" })}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleRunTask(task)}
                        disabled={taskRunning || task.has_active_execution || !task.enabled}
                      >
                        {taskRunning ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />}
                        {requiresInitialization
                          ? t("failover.actions.initialize", { defaultValue: "Initialize" })
                          : t("failover.actions.run", { defaultValue: "Run" })}
                      </Button>
                      {latestExecution && task.has_active_execution ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleStopExecution(latestExecution.id, task.name)}
                          disabled={executionStopping || taskBusy || taskRunning}
                        >
                          {executionStopping ? <LoaderCircle className="size-4 animate-spin" /> : <Square className="size-4" />}
                          {t("failover.actions.stop", { defaultValue: "Stop" })}
                        </Button>
                      ) : null}
                      <Button type="button" size="sm" variant="outline" onClick={() => void handleToggleTask(task)} disabled={taskBusy || taskRunning}>
                        {task.enabled
                          ? t("failover.actions.disable", { defaultValue: "Disable" })
                          : t("failover.actions.enable", { defaultValue: "Enable" })}
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setDeleteTarget(task)} disabled={taskBusy || taskRunning}>
                        <Trash2 className="size-4" />
                        {t("common.delete", { defaultValue: "Delete" })}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : null}
      </AdminPageShell>

      <TaskEditorDialog
        open={editorOpen}
        mode={editorMode}
        task={editingTask}
        templateTask={templateTask}
        nodes={nodes}
        scripts={scripts}
        providerEntries={providerEntries}
        allowedPlanProviders={allowedPlanProviders}
        onOpenChange={(nextOpen) => {
          setEditorOpen(nextOpen);
          if (!nextOpen) {
            setEditorMode("create");
            setEditingTask(null);
            setTemplateTask(null);
          }
        }}
        onSaved={async () => {
          await Promise.all([refreshTasks({ silent: true }), refreshResources()]);
        }}
      />

      <ExecutionDetailDialog
        executionID={selectedExecutionID}
        taskName={selectedExecutionTaskName}
        open={selectedExecutionID !== null}
        onExecutionUpdated={() => refreshTasks({ silent: true })}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedExecutionID(null);
            setSelectedExecutionTaskName("");
          }
        }}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setDeleteTarget(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("failover.delete_title", { defaultValue: "Delete failover task?" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("failover.delete_description", {
                defaultValue:
                  "This removes the task configuration and execution history from the panel. Existing cloud resources are not touched automatically.",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", { defaultValue: "Cancel" })}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteTask()}>
              {t("common.delete", { defaultValue: "Delete" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function FailoverPage() {
  return <FailoverPageContent />;
}

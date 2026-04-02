import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  CheckCircle2,
  Eye,
  MoreHorizontal,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  RotateCcw,
  Share2,
  Server,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import CloudInstanceShareDialog, { type CloudInstanceShareTarget } from "@/components/admin/cloud/CloudInstanceShareDialog";
import CloudInstanceScriptDialog, { type CloudInstanceScriptTarget } from "@/components/admin/cloud/CloudInstanceScriptDialog";
import {
  Badge,
  Button,
  Checkbox,
  CloudCopyBlock,
  CloudDetailItem,
  cloudDetailListClassName,
  cloudDetailListItemClassName,
  cloudDetailSectionClassName,
  cloudPanelBodyTextClassName,
  cloudPanelCardClassName,
  cloudPanelDescriptionClassName,
  cloudDialogContentClassName,
  cloudPanelFieldLabelClassName,
  cloudPanelHeaderClassName,
  cloudPanelSectionClassName,
  cloudPanelTitleClassName,
  cloudLongTextClassName,
  Dialog,
  Flex,
  Select,
  Tabs,
  TextArea,
  TextField,
} from "@/components/admin/cloud/cloud-ui";
import Loading from "@/components/loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { WarningAlert } from "@/components/ui/warning-alert";
import { useWarningDialog } from "@/components/ui/warning-dialog";
import {
  clearAWSFollowUpTerminalTasks,
  checkAWSCredentials,
  createAWSInstance,
  createAWSLightsailInstance,
  deleteAWSInstance,
  deleteAWSCredential,
  deleteAWSLightsailInstance,
  getAWSAccount,
  getAWSCatalog,
  getAWSCredentialSecret,
  getAWSCredentials,
  getAWSInstanceDetail,
  getAWSLightsailCatalog,
  getAWSLightsailInstanceDetail,
  listAWSFollowUpTasks,
  listAWSInstances,
  listAWSLightsailInstances,
  postAWSInstanceAction,
  postAWSLightsailInstanceAction,
  retryAWSFollowUpTask,
  saveAWSCredentials,
  setAWSActiveCredential,
  setAWSActiveRegion,
  type AWSAccount,
  type AWSCatalog,
  type AWSCredentialInput,
  type AWSCredentialPool,
  type AWSCredentialRecord,
  type AWSCredentialSecret,
  type AWSEC2Quota,
  type AWSElasticAddress,
  type AWSFollowUpTask,
  type AWSImage,
  type AWSInstance,
  type AWSInstanceDetail,
  type AWSInstanceType,
  type AWSLightsailBlueprint,
  type AWSLightsailBundle,
  type AWSLightsailCatalog,
  type AWSLightsailInstance,
  type AWSLightsailInstanceDetail,
  type AWSLightsailStaticIP,
  type AWSSubnet,
  type AWSTag,
  type AWSVolume,
  type CreateAWSInstanceInput,
  type CreateAWSLightsailInstanceInput,
} from "@/lib/cloudAws";
import { getCloudStatusLabel } from "@/lib/cloudStatus";
import {
  buildCloudInstanceShareUrl,
  deleteCloudInstanceShare,
  fromCloudShareDateTimeLocalValue,
  getCloudInstanceShare,
  saveCloudInstanceShare,
  toCloudShareDateTimeLocalValue,
  type CloudShareAccessPolicy,
  type CloudInstanceShareRecord,
} from "@/lib/cloudShare";

type CreateFormState = Omit<CreateAWSInstanceInput, "tags"> & {
  tagsText: string;
};

type LightsailCreateFormState = Omit<CreateAWSLightsailInstanceInput, "tags"> & {
  tagsText: string;
};

type AWSRegionOption = {
  name: string;
  label: string;
  country?: string;
  endpoint?: string;
};

const SELECT_NONE = "__none__";
const BACKGROUND_TASK_FILTER_ALL = "__all__";
const DEFAULT_AWS_REGION = "us-east-1";
const AWS_BACKGROUND_TASK_POLL_INTERVAL = 15_000;
const AWS_REGION_OPTIONS = [
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

type CredentialSecretState = {
  secret: AWSCredentialSecret;
};

const initialCreateForm: CreateFormState = {
  name: "",
  image_id: "",
  instance_type: "",
  key_name: "",
  subnet_id: "",
  security_group_ids: [],
  user_data: "",
  assign_public_ip: true,
  assign_ipv6: true,
  allow_all_traffic: true,
  auto_connect: true,
  auto_connect_group: "",
  tagsText: "",
};

const initialLightsailCreateForm: LightsailCreateFormState = {
  name: "",
  availability_zone: "",
  blueprint_id: "",
  bundle_id: "",
  key_pair_name: "",
  user_data: "",
  ip_address_type: "dualstack",
  allow_all_traffic: true,
  auto_connect: true,
  auto_connect_group: "",
  tagsText: "",
};

type Ec2DetailActionFormState = {
  imageName: string;
  imageDescription: string;
  noReboot: boolean;
  instanceType: string;
  tagsText: string;
  allocationId: string;
  privateIp: string;
};

type LightsailDetailActionFormState = {
  snapshotName: string;
  staticIpName: string;
};

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

function hasActiveCredential(pool: AWSCredentialPool | null) {
  return Boolean(pool?.active_credential_id);
}

function getActiveCredential(pool: AWSCredentialPool | null) {
  return pool?.credentials.find((credential) => credential.id === pool.active_credential_id) || null;
}

function getDefaultAutoConnectGroup(provider: string, credentialName: string) {
  const normalizedProvider = provider.trim().toLowerCase() || "cloud";
  const normalizedCredentialName = credentialName.trim() || "default";
  return `${normalizedProvider}/${normalizedCredentialName}`;
}

function isLikelyAWSAccessKeyId(value: string) {
  const normalized = value.trim().toUpperCase();
  return /^(AKIA|ASIA)[A-Z0-9]{12,}$/.test(normalized);
}

function buildDefaultCredentialName(accessKeyId: string) {
  const normalized = accessKeyId.trim();
  const suffix = normalized.slice(-6).toLowerCase() || "default";
  return `aws-${suffix}`;
}

function findImportSeparator(line: string) {
  for (const separator of ["|", ",", "\t"]) {
    if (line.includes(separator)) {
      return separator;
    }
  }
  return "";
}

function splitCredentialImportParts(line: string) {
  const separator = findImportSeparator(line);
  if (separator) {
    return line.split(separator).map((part) => part.trim()).filter(Boolean);
  }
  return line.split(/\s+/).map((part) => part.trim()).filter(Boolean);
}

function parseCredentialImports(
  text: string,
  fallbackRegion = DEFAULT_AWS_REGION,
): AWSCredentialInput[] {
  const lines = text.split(/\r?\n/);
  const credentials: AWSCredentialInput[] = [];
  const seen = new Set<string>();
  const normalizedFallbackRegion = fallbackRegion.trim() || DEFAULT_AWS_REGION;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const parts = splitCredentialImportParts(line);
    if (parts.length < 2) continue;

    let name = "";
    let accessKeyId = "";
    let secretAccessKey = "";
    let defaultRegion = "";
    let sessionToken = "";

    if (parts.length === 2) {
      [accessKeyId, secretAccessKey] = parts;
    } else if (parts.length === 3) {
      if (isLikelyAWSAccessKeyId(parts[0])) {
        [accessKeyId, secretAccessKey, defaultRegion] = parts;
      } else {
        [name, accessKeyId, secretAccessKey] = parts;
      }
    } else if (isLikelyAWSAccessKeyId(parts[0])) {
      [accessKeyId, secretAccessKey, defaultRegion] = parts;
      sessionToken = parts.slice(3).join(" ").trim();
    } else {
      [name, accessKeyId, secretAccessKey, defaultRegion] = parts;
      sessionToken = parts.slice(4).join(" ").trim();
    }

    const resolvedAccessKeyId = accessKeyId.trim();
    const resolvedSecretAccessKey = secretAccessKey.trim();
    const resolvedDefaultRegion = defaultRegion.trim() || normalizedFallbackRegion;
    const resolvedName = name.trim() || buildDefaultCredentialName(resolvedAccessKeyId);
    const key = resolvedAccessKeyId;
    if (!resolvedAccessKeyId || !resolvedSecretAccessKey || seen.has(key)) continue;
    seen.add(key);

    credentials.push({
      name: resolvedName,
      access_key_id: resolvedAccessKeyId,
      secret_access_key: resolvedSecretAccessKey,
      default_region: resolvedDefaultRegion,
      session_token: sessionToken || "",
    });
  }

  return credentials;
}

function parseTags(tagsText: string): AWSTag[] {
  return tagsText
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const index = entry.indexOf("=");
      if (index === -1) return null;
      const key = entry.slice(0, index).trim();
      const value = entry.slice(index + 1).trim();
      if (!key || !value) return null;
      return { key, value };
    })
    .filter((tag): tag is AWSTag => Boolean(tag));
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function getCredentialStatusColor(status: string) {
  switch (status) {
    case "healthy":
      return "green";
    case "error":
      return "red";
    default:
      return "gray";
  }
}

function getInstanceStateColor(state: string) {
  switch (state) {
    case "running":
      return "green";
    case "stopped":
      return "amber";
    case "pending":
      return "blue";
    case "terminated":
      return "red";
    default:
      return "gray";
  }
}

function getFollowUpStatusColor(status: string) {
  switch (status) {
    case "pending":
      return "blue";
    case "failed":
      return "red";
    case "success":
      return "green";
    case "cancelled":
    case "skipped":
    default:
      return "gray";
  }
}

function getFollowUpTaskLabel(taskType: string, t: ReturnType<typeof useTranslation>["t"]) {
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

function getAWSCountryLabel(regionName: string, t: ReturnType<typeof useTranslation>["t"]) {
  const regionMeta = getAWSRegionMeta(regionName);
  if (!regionMeta) {
    return "-";
  }
  return t(`cloud.providers.aws.countries.${regionMeta.country}`, regionMeta.label);
}

function getCompactQuotaSummary(
  quota: AWSEC2Quota | null | undefined,
  t: ReturnType<typeof useTranslation>["t"],
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
  const instances = quota.max_instances > 0 ? `${quota.running_instances}/${quota.max_instances}` : String(quota.running_instances);
  const elasticIps =
    quota.max_elastic_ips > 0 ? `${quota.allocated_elastic_ips}/${quota.max_elastic_ips}` : String(quota.allocated_elastic_ips);
  return t("cloud.providers.aws.quota_compact", {
    instances,
    elastic_ips: elasticIps,
    defaultValue: `EC2 ${instances} · EIP ${elasticIps}`,
  });
}

function getEC2QuotaItems(
  quota: AWSEC2Quota | null | undefined,
  t: ReturnType<typeof useTranslation>["t"],
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
      value: quota.max_instances > 0 ? `${quota.running_instances} / ${quota.max_instances}` : String(quota.running_instances),
    },
    {
      key: "total_instances",
      label: t("cloud.providers.aws.total_instances", "Tracked instances"),
      value: String(quota.total_instances),
    },
    {
      key: "allocated_elastic_ips",
      label: t("cloud.providers.aws.allocated_elastic_ips", "Allocated EIPs"),
      value: quota.max_elastic_ips > 0 ? `${quota.allocated_elastic_ips} / ${quota.max_elastic_ips}` : String(quota.allocated_elastic_ips),
    },
    {
      key: "associated_elastic_ips",
      label: t("cloud.providers.aws.associated_elastic_ips", "Attached EIPs"),
      value: String(quota.associated_elastic_ips),
    },
    {
      key: "vpc_max_elastic_ips",
      label: t("cloud.providers.aws.vpc_max_elastic_ips", "VPC EIPs"),
      value: String(quota.vpc_max_elastic_ips),
    },
    {
      key: "vpc_max_security_groups_per_interface",
      label: t("cloud.providers.aws.max_security_groups_per_interface", "SGs / ENI"),
      value: String(quota.vpc_max_security_groups_per_interface),
    },
  ].filter((item) => item.value !== "0");
}

function AWSQuotaSummary({
  quota,
  error,
  t,
  compact = false,
}: {
  quota: AWSEC2Quota | null | undefined;
  error?: string;
  t: ReturnType<typeof useTranslation>["t"];
  compact?: boolean;
}) {
  const items = getEC2QuotaItems(quota, t);

  if (!items.length && !error) {
    return <span className="text-sm text-slate-400">-</span>;
  }

  return (
    <div className="space-y-2">
      {quota ? (
        <div className={compact ? "text-xs font-semibold text-slate-700" : "text-sm font-semibold text-slate-800"}>
          {getCompactQuotaSummary(quota, t)}
          {quota.region ? (
            <span className="font-normal text-slate-500">
              {" · "}
              {quota.region}
            </span>
          ) : null}
        </div>
      ) : null}
      {items.length ? (
        <div className={compact ? "space-y-1 text-xs" : "space-y-1.5 text-sm"}>
          {items.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-1 last:border-b-0 last:pb-0"
            >
              <span className="text-slate-500">{item.label}</span>
              <span className="text-right font-medium text-slate-700">{item.value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {error ? <div className="text-xs text-amber-700">{error}</div> : null}
    </div>
  );
}

const PlainDetailItem = (props: React.ComponentProps<typeof CloudDetailItem>) => (
  <CloudDetailItem variant="plain" {...props} />
);

function CompactCredentialRow({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-slate-200/80 py-2.5 first:border-t-0 first:pt-0 last:pb-0 dark:border-slate-800">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className={`min-w-0 text-right text-sm text-slate-900 dark:text-slate-100 ${cloudLongTextClassName}`}>
        {value === undefined || value === null || value === "" ? "-" : value}
      </div>
    </div>
  );
}

function CompactCredentialCopyBlock({
  title,
  value,
  copyLabel,
  onCopy,
}: {
  title: React.ReactNode;
  value: string;
  copyLabel: React.ReactNode;
  onCopy: () => void;
}) {
  return (
    <CloudCopyBlock
      title={title}
      copyLabel={copyLabel}
      onCopy={onCopy}
      className="px-3 py-2"
      titleClassName="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400"
      contentClassName="mt-2"
    >
      <div className="max-h-28 overflow-auto overscroll-contain rounded-lg bg-slate-100/90 px-3 py-2 font-mono text-[11px] leading-5 text-slate-700 [scrollbar-gutter:stable] dark:bg-slate-900 dark:text-slate-200 [overflow-wrap:anywhere]">
        {value || "-"}
      </div>
    </CloudCopyBlock>
  );
}

function CompactSummaryMetric({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-baseline gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className={`min-w-0 text-sm text-slate-800 dark:text-slate-100 ${cloudLongTextClassName}`}>
        {value === undefined || value === null || value === "" ? "-" : value}
      </span>
    </div>
  );
}

function CompactDetailSection({
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  title: React.ReactNode;
  summary: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section className={cloudDetailSectionClassName}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="flex h-auto w-full items-start justify-between rounded-lg px-0 py-0 text-left hover:bg-transparent"
          >
            <div className="min-w-0 space-y-1">
              <div className={cloudPanelTitleClassName}>{title}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {summary === undefined || summary === null || summary === "" ? "-" : summary}
              </div>
            </div>
            <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 border-t border-slate-200/80 pt-4 dark:border-slate-800/80">
          {children}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

function getEntryCountSummary(
  count: number,
  t: ReturnType<typeof useTranslation>["t"],
) {
  return t("cloud.providers.aws.entry_summary", {
    count,
    defaultValue: `${count} entries`,
  });
}

function getVolumeSummary(
  volumes: AWSVolume[],
  t: ReturnType<typeof useTranslation>["t"],
) {
  const totalSize = volumes.reduce((sum, volume) => sum + volume.size_gib, 0);
  return t("cloud.providers.aws.volume_summary", {
    count: volumes.length,
    size: totalSize,
    defaultValue: `${volumes.length} volumes · ${totalSize} GiB`,
  });
}

function getStaticIPSummary(
  staticIPs: AWSLightsailStaticIP[],
  attachedTo: string,
  t: ReturnType<typeof useTranslation>["t"],
) {
  const attached = staticIPs.filter((staticIP) => staticIP.attached_to === attachedTo).length;
  const free = staticIPs.filter((staticIP) => !staticIP.is_attached).length;
  return t("cloud.providers.aws.static_ip_summary", {
    attached,
    free,
    defaultValue: `${attached} attached · ${free} free`,
  });
}

function getConsoleOutputSummary(
  output: string,
  t: ReturnType<typeof useTranslation>["t"],
) {
  const lines = output
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0).length;
  return t("cloud.providers.aws.console_output_summary", {
    count: lines,
    defaultValue: `${lines} lines`,
  });
}

function getInstanceControlsSummary(
  instanceType: string,
  monitoringState: string,
  t: ReturnType<typeof useTranslation>["t"],
) {
  return t("cloud.providers.aws.instance_controls_summary", {
    type: instanceType || "-",
    monitoring: getCloudStatusLabel(monitoringState, t),
    defaultValue: `${instanceType || "-"} · ${getCloudStatusLabel(monitoringState, t)}`,
  });
}

function getMachineImageSummary(
  imageName: string,
  t: ReturnType<typeof useTranslation>["t"],
) {
  return t("cloud.providers.aws.machine_image_summary", {
    name: imageName || "-",
    defaultValue: imageName || "-",
  });
}

function getSubnetVpcId(subnets: AWSSubnet[], subnetId: string) {
  return subnets.find((subnet) => subnet.subnet_id === subnetId)?.vpc_id || "";
}

function getInstanceTypeAvailabilityZones(catalog: AWSCatalog | null, instanceType: string) {
  const normalized = instanceType.trim();
  if (!normalized) return [];
  return (
    catalog?.instance_type_offerings.find((offering) => offering.instance_type === normalized)?.availability_zones
    || []
  );
}

function getImageLabel(image: AWSImage) {
  if (image.name && image.image_id) return `${image.name} (${image.image_id})`;
  return image.name || image.image_id || "-";
}

function getAWSRegionOptionLabel(region: { label?: string; name: string }) {
  return region.label ? `${region.label} (${region.name})` : region.name;
}

function AWSRegionSelect({
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  disabled = false,
  onValueChange,
}: {
  value?: string;
  options: AWSRegionOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const deferredSearchQuery = React.useDeferredValue(searchQuery.trim().toLowerCase());
  const selectedOption = React.useMemo(
    () => options.find((option) => option.name === value) || null,
    [options, value],
  );
  const filteredOptions = React.useMemo(() => {
    if (!deferredSearchQuery) {
      return options;
    }

    return options.filter((option) => {
      const haystack = [
        option.name,
        option.label,
        option.country,
        option.endpoint,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(deferredSearchQuery);
    });
  }, [deferredSearchQuery, options]);
  const triggerLabel = selectedOption ? getAWSRegionOptionLabel(selectedOption) : value || "";

  React.useEffect(() => {
    if (!open && searchQuery) {
      setSearchQuery("");
    }
  }, [open, searchQuery]);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (disabled && nextOpen) {
          return;
        }
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full min-w-0 justify-between font-normal"
        >
          <span
            className={`min-w-0 flex-1 truncate text-left ${!triggerLabel ? "text-muted-foreground" : ""}`}
            title={triggerLabel || placeholder}
          >
            {triggerLabel || placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="z-[60] flex max-h-[min(24rem,calc(100vh-2rem))] w-[var(--radix-popover-trigger-width)] min-w-[18rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0"
      >
        <div className="border-b p-2">
          <TextField.Root
            autoFocus
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>
        <div className="h-[min(18rem,calc(100vh-10rem))] min-h-0 overflow-y-auto overscroll-contain p-1 [scrollbar-gutter:stable]">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-6 text-sm text-muted-foreground">
              {emptyLabel}
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = option.name === value;
              const primaryLabel = option.label || option.name;
              const detailLabel = option.label && option.label !== option.name
                ? [option.name, option.endpoint].filter(Boolean).join(" · ")
                : option.endpoint || "";

              return (
                <button
                  key={option.name}
                  type="button"
                  className={`flex w-full items-start gap-3 rounded-md px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground ${
                    isSelected ? "bg-accent/60 text-accent-foreground" : ""
                  }`}
                  onClick={() => {
                    onValueChange(option.name);
                    setOpen(false);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{primaryLabel}</div>
                    {detailLabel ? (
                      <div className="truncate text-xs text-muted-foreground">{detailLabel}</div>
                    ) : null}
                  </div>
                  <Check className={`mt-0.5 h-4 w-4 shrink-0 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function getAWSInstanceTypeOptionLabel(instanceType: AWSInstanceType) {
  return `${instanceType.name} / ${instanceType.vcpus} vCPU / ${(instanceType.memory_mib / 1024).toFixed(1)} GB`;
}

function getLightsailBundleOptionLabel(bundle: AWSLightsailBundle) {
  return `${bundle.bundle_id} / ${bundle.cpu_count} vCPU / ${bundle.ram_size_in_gb} GB / $${bundle.price.toFixed(2)}`;
}

function getLightsailBlueprintLabel(blueprint: AWSLightsailBlueprint) {
  return `${blueprint.platform ? `${blueprint.platform} / ` : ""}${blueprint.name || blueprint.blueprint_id}`;
}

function joinSummaryParts(parts: Array<React.ReactNode | null | undefined | false>) {
  const normalized = parts
    .map((part) => {
      if (part === null || part === undefined || part === false) return "";
      if (typeof part === "string" || typeof part === "number") return String(part).trim();
      return "";
    })
    .filter(Boolean);
  return normalized.join(" · ");
}

function formatTagMap(tags: Record<string, string>) {
  const entries = Object.entries(tags || {});
  if (!entries.length) return "";
  return entries.map(([key, value]) => `${key}=${value}`).join("\n");
}

function formatElasticAddress(address: AWSElasticAddress) {
  const parts = [address.public_ip, address.allocation_id].filter(Boolean);
  return parts.join(" / ") || "-";
}

function getCreateFollowUpWarningMessage(t: ReturnType<typeof useTranslation>["t"], warning: string) {
  return t("cloud.providers.aws.post_create_warning", {
    message: warning,
    defaultValue: `The resource was created. Komari is still processing a post-create step in the background: ${warning}`,
  });
}

export default function AWSPanel() {
  const { t } = useTranslation();
  const { confirm, dialog } = useWarningDialog();

  const [instanceView, setInstanceView] = React.useState<"ec2" | "lightsail">("ec2");
  const [initializing, setInitializing] = React.useState(true);
  const [panelLoading, setPanelLoading] = React.useState(false);
  const [credentialSaving, setCredentialSaving] = React.useState(false);
  const [credentialChecking, setCredentialChecking] = React.useState(false);
  const [credentialImportOpen, setCredentialImportOpen] = React.useState(false);
  const [credentialImportText, setCredentialImportText] = React.useState("");
  const [credentialImportGroup, setCredentialImportGroup] = React.useState("");
  const [credentialCheckDialogOpen, setCredentialCheckDialogOpen] = React.useState(false);
  const [credentialCheckRegion, setCredentialCheckRegion] = React.useState("");
  const [backgroundTasksOpen, setBackgroundTasksOpen] = React.useState(false);
  const [backgroundTasksLoading, setBackgroundTasksLoading] = React.useState(false);
  const [backgroundTasks, setBackgroundTasks] = React.useState<AWSFollowUpTask[]>([]);
  const [backgroundTaskCredentialFilter, setBackgroundTaskCredentialFilter] = React.useState(BACKGROUND_TASK_FILTER_ALL);
  const [backgroundTaskRegionFilter, setBackgroundTaskRegionFilter] = React.useState(BACKGROUND_TASK_FILTER_ALL);
  const [backgroundTaskStatusFilter, setBackgroundTaskStatusFilter] = React.useState(BACKGROUND_TASK_FILTER_ALL);
  const [backgroundTaskRetryingId, setBackgroundTaskRetryingId] = React.useState<number | null>(null);
  const [backgroundTaskClearing, setBackgroundTaskClearing] = React.useState(false);
  const [credentialCheckTargetIds, setCredentialCheckTargetIds] = React.useState<string[]>([]);
  const [regionSelectionRequired, setRegionSelectionRequired] = React.useState(false);
  const [credentialPool, setCredentialPool] = React.useState<AWSCredentialPool | null>(null);
  const [selectedCredentialIds, setSelectedCredentialIds] = React.useState<string[]>([]);
  const [credentialGroupEditorOpen, setCredentialGroupEditorOpen] = React.useState(false);
  const [credentialGroupEditorValue, setCredentialGroupEditorValue] = React.useState("");
  const [credentialGroupEditorIds, setCredentialGroupEditorIds] = React.useState<string[]>([]);
  const [account, setAccount] = React.useState<AWSAccount | null>(null);
  const [catalog, setCatalog] = React.useState<AWSCatalog | null>(null);
  const [lightsailCatalog, setLightsailCatalog] = React.useState<AWSLightsailCatalog | null>(null);
  const [instances, setInstances] = React.useState<AWSInstance[]>([]);
  const [lightsailInstances, setLightsailInstances] = React.useState<AWSLightsailInstance[]>([]);
  const [detailInstance, setDetailInstance] = React.useState<AWSInstance | null>(null);
  const [detailData, setDetailData] = React.useState<AWSInstanceDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailActionLoading, setDetailActionLoading] = React.useState(false);
  const [detailActionForm, setDetailActionForm] = React.useState<Ec2DetailActionFormState>({
    imageName: "",
    imageDescription: "",
    noReboot: true,
    instanceType: "",
    tagsText: "",
    allocationId: "",
    privateIp: "",
  });
  const [lightsailDetailInstance, setLightsailDetailInstance] = React.useState<AWSLightsailInstance | null>(null);
  const [lightsailDetailData, setLightsailDetailData] = React.useState<AWSLightsailInstanceDetail | null>(null);
  const [lightsailDetailLoading, setLightsailDetailLoading] = React.useState(false);
  const [lightsailActionLoading, setLightsailActionLoading] = React.useState(false);
  const [lightsailDetailActionForm, setLightsailDetailActionForm] = React.useState<LightsailDetailActionFormState>({
    snapshotName: "",
    staticIpName: "",
  });
  const [credentialSecret, setCredentialSecret] = React.useState<CredentialSecretState | null>(null);
  const [credentialSecretLoading, setCredentialSecretLoading] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareTarget, setShareTarget] = React.useState<CloudInstanceShareTarget | null>(null);
  const [scriptTarget, setScriptTarget] = React.useState<CloudInstanceScriptTarget | null>(null);
  const [shareRecord, setShareRecord] = React.useState<CloudInstanceShareRecord | null>(null);
  const [shareLoading, setShareLoading] = React.useState(false);
  const [shareSaving, setShareSaving] = React.useState(false);
  const [shareDeleting, setShareDeleting] = React.useState(false);
  const [shareTitle, setShareTitle] = React.useState("");
  const [shareNote, setShareNote] = React.useState("");
  const [shareAccessPolicy, setShareAccessPolicy] = React.useState<CloudShareAccessPolicy>("public");
  const [shareExpiresAt, setShareExpiresAt] = React.useState("");
  const [error, setError] = React.useState("");
  const [lightsailError, setLightsailError] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createSubmitting, setCreateSubmitting] = React.useState(false);
  const [ec2CatalogLoading, setEc2CatalogLoading] = React.useState(false);
  const [resourcesLoaded, setResourcesLoaded] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<CreateFormState>(initialCreateForm);
  const [lightsailCreateOpen, setLightsailCreateOpen] = React.useState(false);
  const [lightsailCreateSubmitting, setLightsailCreateSubmitting] = React.useState(false);
  const [lightsailCatalogLoading, setLightsailCatalogLoading] = React.useState(false);
  const [lightsailCreateForm, setLightsailCreateForm] = React.useState<LightsailCreateFormState>(
    initialLightsailCreateForm,
  );
  const activeCredential = getActiveCredential(credentialPool);
  const resolvedActiveRegion =
    activeCredential
      ? credentialPool?.active_region || account?.region || activeCredential.default_region || DEFAULT_AWS_REGION
      : "";
  const activeRegion = regionSelectionRequired ? "" : resolvedActiveRegion;

  const clearPanelState = React.useCallback(() => {
    setAccount(null);
    setCatalog(null);
    setLightsailCatalog(null);
    setInstances([]);
    setLightsailInstances([]);
    setDetailData(null);
    setLightsailDetailData(null);
    setError("");
    setLightsailError("");
    setResourcesLoaded(false);
  }, []);

  const copyText = React.useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t("copy_success", "Copied!"));
      } catch (copyError) {
        toast.error(toErrorMessage(copyError));
      }
    },
    [t],
  );

  const loadCredentialPool = React.useCallback(async () => {
    const nextPool = await getAWSCredentials();
    setCredentialPool(nextPool);
    return nextPool;
  }, []);

  const loadBackgroundTasks = React.useCallback(
    async (showError = true, showLoading = true) => {
      if (showLoading) {
        setBackgroundTasksLoading(true);
      }
      try {
        const nextTasks = await listAWSFollowUpTasks();
        setBackgroundTasks(nextTasks);
        return nextTasks;
      } catch (backgroundTaskError) {
        if (showError) {
          toast.error(toErrorMessage(backgroundTaskError));
        }
        return [];
      } finally {
        if (showLoading) {
          setBackgroundTasksLoading(false);
        }
      }
    },
    [],
  );

  const loadLightsailData = React.useCallback(async () => {
    try {
      const [nextLightsailCatalog, nextLightsailInstances] = await Promise.all([
        getAWSLightsailCatalog(),
        listAWSLightsailInstances(),
      ]);
      setLightsailCatalog(nextLightsailCatalog);
      setLightsailInstances(nextLightsailInstances);
      setLightsailError("");
    } catch (lightsailLoadError) {
      setLightsailCatalog(null);
      setLightsailInstances([]);
      setLightsailError(toErrorMessage(lightsailLoadError));
    }
  }, []);

  const loadPanelData = React.useCallback(async () => {
    setPanelLoading(true);
    try {
      const [nextAccount, nextCatalog, nextInstances] = await Promise.all([
        getAWSAccount(),
        getAWSCatalog(),
        listAWSInstances(),
      ]);
      setAccount(nextAccount);
      setCatalog(nextCatalog);
      setInstances(nextInstances);
      setError("");
      await loadLightsailData();
      setResourcesLoaded(true);
    } catch (panelError) {
      setAccount(null);
      setCatalog(null);
      setLightsailCatalog(null);
      setInstances([]);
      setLightsailInstances([]);
      setError(toErrorMessage(panelError));
      setLightsailError("");
      setResourcesLoaded(false);
    } finally {
      setPanelLoading(false);
    }
  }, [loadLightsailData]);

  const refreshAll = React.useCallback(async () => {
    const nextPool = await loadCredentialPool();
    if (hasActiveCredential(nextPool) && !regionSelectionRequired) {
      await loadPanelData();
    } else {
      clearPanelState();
    }
    await loadBackgroundTasks(false);
  }, [clearPanelState, loadBackgroundTasks, loadCredentialPool, loadPanelData, regionSelectionRequired]);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const nextPool = await getAWSCredentials();
        if (cancelled) return;
        setCredentialPool(nextPool);
        const needsRegionSelection = Boolean(nextPool.active_credential_id && !nextPool.active_region);
        setRegionSelectionRequired(needsRegionSelection);
        if (!hasActiveCredential(nextPool) || needsRegionSelection) {
          clearPanelState();
        } else {
          await loadPanelData();
        }
      } catch (bootstrapError) {
        if (!cancelled) {
          setError(toErrorMessage(bootstrapError));
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearPanelState, loadPanelData]);

  React.useEffect(() => {
    void loadBackgroundTasks(false);
  }, [loadBackgroundTasks]);

  React.useEffect(() => {
    if (!backgroundTasksOpen) {
      return;
    }
    void loadBackgroundTasks();
  }, [backgroundTasksOpen, loadBackgroundTasks]);

  React.useEffect(() => {
    if (!backgroundTasksOpen && !backgroundTasks.some((task) => task.status === "pending")) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadBackgroundTasks(false, false);
    }, AWS_BACKGROUND_TASK_POLL_INTERVAL);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [backgroundTasks, backgroundTasksOpen, loadBackgroundTasks]);

  React.useEffect(() => {
    if (!catalog) return;
    setCreateForm((previous) => ({
      ...previous,
      image_id: previous.image_id || catalog.images[0]?.image_id || "",
      instance_type: previous.instance_type || catalog.instance_types[0]?.name || "",
      subnet_id: previous.subnet_id || "",
    }));
  }, [catalog]);

  React.useEffect(() => {
    if (!lightsailCatalog) return;
    setLightsailCreateForm((previous) => ({
      ...previous,
      availability_zone:
        previous.availability_zone ||
        lightsailCatalog.regions.find((region) => region.name === activeRegion)?.availability_zones[0]?.name ||
        lightsailCatalog.regions[0]?.availability_zones[0]?.name ||
        "",
      blueprint_id: previous.blueprint_id || lightsailCatalog.blueprints[0]?.blueprint_id || "",
      bundle_id: previous.bundle_id || lightsailCatalog.bundles[0]?.bundle_id || "",
    }));
  }, [activeRegion, lightsailCatalog]);

  React.useEffect(() => {
    setSelectedCredentialIds((current) => {
      if (current.length === 0) {
        return current;
      }

      const validIds = new Set((credentialPool?.credentials ?? []).map((credential) => credential.id));
      const next = current.filter((id) => validIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [credentialPool]);

  const credentialRows = credentialPool?.credentials ?? [];
  const selectedCredentials = credentialRows.filter((credential) => selectedCredentialIds.includes(credential.id));
  const allCredentialsSelected =
    credentialRows.length > 0 && selectedCredentialIds.length === credentialRows.length;
  const someCredentialsSelected =
    selectedCredentialIds.length > 0 && selectedCredentialIds.length < credentialRows.length;
  const defaultCreateGroup = getDefaultAutoConnectGroup("aws", activeCredential?.name || "");
  const activeContextReady = Boolean(activeCredential && activeRegion);
  const activeQuota = activeContextReady ? account?.ec2_quota || activeCredential?.ec2_quota || null : null;
  const activeQuotaError = activeContextReady ? account?.ec2_quota_error || activeCredential?.ec2_quota_error || "" : "";
  const pendingBackgroundTaskCount = backgroundTasks.filter((task) => task.status === "pending").length;
  const failedBackgroundTaskCount = backgroundTasks.filter((task) => task.status === "failed").length;
  const cancelledBackgroundTaskCount = backgroundTasks.filter((task) => task.status === "cancelled").length;
  const skippedBackgroundTaskCount = backgroundTasks.filter((task) => task.status === "skipped").length;
  const terminalBackgroundTaskCount =
    failedBackgroundTaskCount + cancelledBackgroundTaskCount + skippedBackgroundTaskCount;
  const backgroundTaskCredentialOptions = React.useMemo(
    () =>
      Array.from(
        backgroundTasks.reduce((map, task) => {
          const label =
            task.credential_name && task.credential_name !== task.credential_id
              ? task.credential_name
              : t("cloud.providers.aws.deleted_credential", "Deleted Credential");
          map.set(task.credential_id, label);
          return map;
        }, new Map<string, string>()),
      ),
    [backgroundTasks, t],
  );
  const backgroundTaskRegionOptions = React.useMemo(
    () => Array.from(new Set(backgroundTasks.map((task) => task.region).filter(Boolean))).sort(),
    [backgroundTasks],
  );
  const filteredBackgroundTasks = React.useMemo(
    () =>
      backgroundTasks.filter((task) => {
        if (backgroundTaskCredentialFilter !== BACKGROUND_TASK_FILTER_ALL && task.credential_id !== backgroundTaskCredentialFilter) {
          return false;
        }
        if (backgroundTaskRegionFilter !== BACKGROUND_TASK_FILTER_ALL && task.region !== backgroundTaskRegionFilter) {
          return false;
        }
        if (backgroundTaskStatusFilter !== BACKGROUND_TASK_FILTER_ALL && task.status !== backgroundTaskStatusFilter) {
          return false;
        }
        return true;
      }),
    [backgroundTaskCredentialFilter, backgroundTaskRegionFilter, backgroundTaskStatusFilter, backgroundTasks],
  );
  React.useEffect(() => {
    if (
      backgroundTaskCredentialFilter !== BACKGROUND_TASK_FILTER_ALL
      && !backgroundTaskCredentialOptions.some(([value]) => value === backgroundTaskCredentialFilter)
    ) {
      setBackgroundTaskCredentialFilter(BACKGROUND_TASK_FILTER_ALL);
    }
    if (
      backgroundTaskRegionFilter !== BACKGROUND_TASK_FILTER_ALL
      && !backgroundTaskRegionOptions.includes(backgroundTaskRegionFilter)
    ) {
      setBackgroundTaskRegionFilter(BACKGROUND_TASK_FILTER_ALL);
    }
    if (
      backgroundTaskStatusFilter !== BACKGROUND_TASK_FILTER_ALL
      && !backgroundTasks.some((task) => task.status === backgroundTaskStatusFilter)
    ) {
      setBackgroundTaskStatusFilter(BACKGROUND_TASK_FILTER_ALL);
    }
  }, [
    backgroundTaskCredentialFilter,
    backgroundTaskCredentialOptions,
    backgroundTaskRegionFilter,
    backgroundTaskRegionOptions,
    backgroundTaskStatusFilter,
    backgroundTasks,
  ]);
  const standardVCPUQuotaReached = Boolean(
    activeQuota && activeQuota.max_standard_vcpus > 0 && activeQuota.running_standard_vcpus >= activeQuota.max_standard_vcpus,
  );
  const runningInstanceLimitReached = Boolean(
    !standardVCPUQuotaReached && activeQuota && activeQuota.max_instances > 0 && activeQuota.running_instances >= activeQuota.max_instances,
  );
  const elasticIPLimitReached = Boolean(
    activeQuota && activeQuota.max_elastic_ips > 0 && activeQuota.allocated_elastic_ips >= activeQuota.max_elastic_ips,
  );
  const selectedSubnet = (catalog?.subnets || []).find((subnet) => subnet.subnet_id === createForm.subnet_id) || null;
  const selectedSubnetVpcId = getSubnetVpcId(catalog?.subnets || [], createForm.subnet_id);
  const selectedSubnetAz = selectedSubnet?.availability_zone || "";
  const regionOptions = React.useMemo(() => {
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

    AWS_REGION_OPTIONS.forEach((region) => addRegion(region.name, region.label, region.country));
    addRegion(activeCredential?.default_region);
    addRegion(credentialPool?.active_region);
    addRegion(account?.region);
    catalog?.regions.forEach((region) =>
      addRegion(region.name, entries.get(region.name)?.label, entries.get(region.name)?.country, region.endpoint),
    );
    lightsailCatalog?.regions.forEach((region) =>
      addRegion(region.name, entries.get(region.name)?.label, entries.get(region.name)?.country),
    );

    return Array.from(entries.values());
  }, [account?.region, activeCredential?.default_region, catalog?.regions, credentialPool?.active_region, lightsailCatalog?.regions]);
  const regionSearchPlaceholder = t(
    "cloud.providers.aws.region_search_placeholder",
    "Search region by name or code",
  );
  const regionSearchEmpty = t(
    "cloud.providers.aws.region_search_empty",
    "No matching AWS region found",
  );
  const selectedInstanceTypeZones = getInstanceTypeAvailabilityZones(catalog, createForm.instance_type);
  const instanceTypeAvailabilityKnown = Boolean(catalog?.instance_type_offerings.length);
  const instanceTypeAvailableInRegion =
    !instanceTypeAvailabilityKnown || !createForm.instance_type || selectedInstanceTypeZones.length > 0;
  const instanceTypeAvailableForCreate =
    !instanceTypeAvailabilityKnown ||
    !selectedSubnetAz ||
    selectedInstanceTypeZones.includes(selectedSubnetAz);
  const filteredSecurityGroups = (catalog?.security_groups || []).filter((group) =>
    selectedSubnetVpcId ? group.vpc_id === selectedSubnetVpcId : true,
  );
  const selectedRegionOption = regionOptions.find((region) => region.name === activeRegion) || null;
  const selectedImage = (catalog?.images || []).find((image) => image.image_id === createForm.image_id) || null;
  const selectedInstanceType =
    (catalog?.instance_types || []).find((instanceType) => instanceType.name === createForm.instance_type) || null;
  const selectedSecurityGroups = (catalog?.security_groups || []).filter((group) =>
    createForm.security_group_ids.includes(group.group_id),
  );
  const ec2CoreSummary = joinSummaryParts([
    selectedImage ? getImageLabel(selectedImage) : createForm.image_id,
    selectedInstanceType ? getAWSInstanceTypeOptionLabel(selectedInstanceType) : createForm.instance_type,
  ]);
  const ec2NetworkSummary = joinSummaryParts([
    selectedSubnet
      ? `${selectedSubnet.availability_zone || selectedSubnet.subnet_id} / ${selectedSubnet.cidr_block || selectedSubnet.subnet_id}`
      : t("cloud.providers.aws.default_network", "Default network"),
    `${selectedSecurityGroups.length} ${t("cloud.providers.aws.security_groups", "Security Groups")}`,
    createForm.assign_public_ip
      ? t("cloud.providers.aws.public_ipv4", "Public IPv4")
      : t("cloud.providers.aws.private_only", "Private only"),
    createForm.assign_ipv6
      ? t("cloud.providers.aws.ipv6_enabled", "IPv6")
      : t("cloud.providers.aws.ipv6_disabled", "IPv4 only"),
    createForm.allow_all_traffic
      ? t("cloud.providers.aws.allow_all_traffic", "Allow All Traffic")
      : t("cloud.providers.aws.restricted_traffic", "Restricted traffic"),
  ]);
  const ec2BootstrapSummary = joinSummaryParts([
    createForm.name || t("cloud.providers.aws.auto_name", "Auto name"),
    `${parseTags(createForm.tagsText).length} ${t("cloud.form.tags", "Tags")}`,
    createForm.user_data.trim() ? t("cloud.form.user_data", "Cloud-Init / User Data") : "",
  ]);
  const selectedLightsailRegion =
    lightsailCatalog?.regions.find((region) => region.name === activeRegion)
    || lightsailCatalog?.regions[0]
    || null;
  const activeLightsailAvailabilityZones = selectedLightsailRegion?.availability_zones || [];
  const selectedLightsailBlueprint =
    (lightsailCatalog?.blueprints || []).find((blueprint) => blueprint.blueprint_id === lightsailCreateForm.blueprint_id)
    || null;
  const selectedLightsailBundle =
    (lightsailCatalog?.bundles || []).find((bundle) => bundle.bundle_id === lightsailCreateForm.bundle_id)
    || null;
  const lightsailCoreSummary = joinSummaryParts([
    lightsailCreateForm.availability_zone || activeRegion,
    selectedLightsailBlueprint ? getLightsailBlueprintLabel(selectedLightsailBlueprint) : lightsailCreateForm.blueprint_id,
    selectedLightsailBundle ? getLightsailBundleOptionLabel(selectedLightsailBundle) : lightsailCreateForm.bundle_id,
  ]);
  const lightsailAccessSummary = joinSummaryParts([
    lightsailCreateForm.key_pair_name || t("cloud.providers.aws.none", "None"),
    lightsailCreateForm.ip_address_type || "dualstack",
    lightsailCreateForm.allow_all_traffic
      ? t("cloud.providers.aws.allow_all_traffic", "Allow All Traffic")
      : t("cloud.providers.aws.restricted_traffic", "Restricted traffic"),
  ]);
  const lightsailBootstrapSummary = joinSummaryParts([
    lightsailCreateForm.name || t("cloud.providers.aws.auto_name", "Auto name"),
    `${parseTags(lightsailCreateForm.tagsText).length} ${t("cloud.form.tags", "Tags")}`,
    (lightsailCreateForm.user_data || "").trim() ? t("cloud.form.user_data", "Cloud-Init / User Data") : "",
  ]);
  const detailTargetElasticAddress = React.useMemo(() => {
    if (!detailData) return null;
    const targetPrivateIp = detailActionForm.privateIp.trim();
    return (
      detailData.addresses.find((address) => address.association_id && (!targetPrivateIp || address.private_ip === targetPrivateIp))
      || detailData.addresses.find((address) => Boolean(address.association_id))
      || null
    );
  }, [detailActionForm.privateIp, detailData]);
  const currentLightsailStaticIP =
    lightsailDetailData?.static_ips.find((staticIP) => staticIP.attached_to === lightsailDetailData.instance.name) || null;

  const assertCredentialsDeleted = (nextPool: AWSCredentialPool, credentialIds: string[]) => {
    const remaining = nextPool.credentials.filter((credential) => credentialIds.includes(credential.id));
    if (remaining.length > 0) {
      throw new Error(
        t("cloud.tokens.delete_not_applied", {
          defaultValue: "Delete request returned success, but the token still exists. Refresh and try again.",
        }),
      );
    }
  };

  const syncCredentialPoolAfterDelete = async (
    nextPool: AWSCredentialPool,
    removedCredentialIds: string[],
  ) => {
    setCredentialPool(nextPool);
    setSelectedCredentialIds((current) => current.filter((id) => !removedCredentialIds.includes(id)));
    if (hasActiveCredential(nextPool) && !regionSelectionRequired) {
      await loadPanelData();
    } else {
      clearPanelState();
    }
  };

  const toggleCredentialSelection = (credentialId: string, checked: boolean) => {
    setSelectedCredentialIds((current) => {
      if (checked) {
        return current.includes(credentialId) ? current : [...current, credentialId];
      }
      return current.filter((id) => id !== credentialId);
    });
  };

  const openCredentialGroupEditor = (credentials: AWSCredentialRecord[]) => {
    if (!credentials.length) {
      return;
    }
    const groups = Array.from(new Set(credentials.map((credential) => credential.group.trim())));
    setCredentialGroupEditorIds(credentials.map((credential) => credential.id));
    setCredentialGroupEditorValue(groups.length === 1 ? groups[0] : "");
    setCredentialGroupEditorOpen(true);
  };

  const openCredentialCheckDialog = (credentialIds?: string[]) => {
    setCredentialCheckTargetIds(credentialIds || []);
    setCredentialCheckRegion(activeRegion || activeCredential?.default_region || DEFAULT_AWS_REGION);
    setCredentialCheckDialogOpen(true);
  };

  const handleRetryBackgroundTask = async (task: AWSFollowUpTask) => {
    setBackgroundTaskRetryingId(task.id);
    try {
      await retryAWSFollowUpTask(task.id);
      await loadBackgroundTasks(false);
      toast.success(t("cloud.providers.aws.background_retry_success", "Background task queued again"));
    } catch (retryError) {
      toast.error(toErrorMessage(retryError));
    } finally {
      setBackgroundTaskRetryingId(null);
    }
  };

  const handleClearTerminalBackgroundTasks = async () => {
    if (!terminalBackgroundTaskCount) {
      return;
    }

    const confirmed = await confirm({
      title: t("cloud.providers.aws.clear_terminal_tasks", "Clear Terminal Tasks"),
      description: t("cloud.providers.aws.clear_terminal_tasks_confirm", {
        count: terminalBackgroundTaskCount,
        defaultValue: `Delete ${terminalBackgroundTaskCount} finished AWS background tasks from the list?`,
      }),
      confirmLabel: t("cloud.providers.aws.clear_terminal_tasks", "Clear Terminal Tasks"),
      tone: "warning",
    });
    if (!confirmed) return;

    setBackgroundTaskClearing(true);
    try {
      const deletedCount = await clearAWSFollowUpTerminalTasks();
      await loadBackgroundTasks(false);
      toast.success(
        t("cloud.providers.aws.clear_terminal_tasks_success", {
          count: deletedCount,
          defaultValue: `Cleared ${deletedCount} AWS background tasks`,
        }),
      );
    } catch (clearError) {
      toast.error(toErrorMessage(clearError));
    } finally {
      setBackgroundTaskClearing(false);
    }
  };

  const handleImportCredentials = async () => {
    const importGroup = credentialImportGroup.trim();
    const credentials = parseCredentialImports(credentialImportText).map((credential) => ({
      ...credential,
      group: importGroup,
    }));
    if (!credentials.length) {
      toast.error(t("cloud.providers.aws.import_empty", "No valid credentials found"));
      return;
    }

    setCredentialSaving(true);
    try {
      const nextPool = await saveAWSCredentials({
        credentials,
        active_credential_id: credentialPool?.active_credential_id || undefined,
        active_region: credentialPool?.active_region || undefined,
      });
      setCredentialPool(nextPool);
      setCredentialImportText("");
      setCredentialImportGroup("");
      setCredentialImportOpen(false);
      toast.success(
        t("cloud.providers.aws.import_success", {
          count: credentials.length,
          defaultValue: `Imported ${credentials.length} credentials`,
        }),
      );
      if (hasActiveCredential(nextPool) && !regionSelectionRequired) {
        await loadPanelData();
      } else {
        clearPanelState();
      }
    } catch (saveError) {
      toast.error(toErrorMessage(saveError));
    } finally {
      setCredentialSaving(false);
    }
  };

  const handleSaveCredentialGroup = async () => {
    if (!credentialGroupEditorIds.length || !credentialPool) {
      return;
    }

    const updates = credentialRows
      .filter((credential) => credentialGroupEditorIds.includes(credential.id))
      .map((credential) => ({
        id: credential.id,
        name: credential.name,
        group: credentialGroupEditorValue.trim(),
        access_key_id: "",
        secret_access_key: "",
        session_token: "",
        default_region: credential.default_region,
      }));

    if (!updates.length) {
      setCredentialGroupEditorOpen(false);
      return;
    }

    setCredentialSaving(true);
    try {
      const nextPool = await saveAWSCredentials({
        credentials: updates,
        active_credential_id: credentialPool.active_credential_id || undefined,
        active_region: credentialPool.active_region || undefined,
      });
      setCredentialPool(nextPool);
      setCredentialGroupEditorOpen(false);
      setCredentialGroupEditorIds([]);
      setCredentialGroupEditorValue("");
      toast.success(t("cloud.tokens.group_save_success", "Token group updated"));
    } catch (saveError) {
      toast.error(toErrorMessage(saveError));
    } finally {
      setCredentialSaving(false);
    }
  };

  const handleCheckCredentials = async (credentialIds?: string[], regionOverride?: string) => {
    setCredentialChecking(true);
    try {
      let requiresRegionSelection = regionSelectionRequired;
      if (regionOverride && regionOverride !== credentialPool?.active_region) {
        const regionPool = await setAWSActiveRegion(regionOverride);
        setCredentialPool(regionPool);
        setRegionSelectionRequired(false);
        requiresRegionSelection = false;
      }
      const nextPool = await checkAWSCredentials(credentialIds);
      setCredentialPool(nextPool);
      toast.success(t("cloud.tokens.check_success", "Token health check finished"));
      if (hasActiveCredential(nextPool) && !requiresRegionSelection) {
        await loadPanelData();
      } else {
        clearPanelState();
      }
    } catch (checkError) {
      toast.error(toErrorMessage(checkError));
    } finally {
      setCredentialChecking(false);
    }
  };

  const handleSubmitCredentialCheck = async () => {
    const targetIds = credentialCheckTargetIds.length ? credentialCheckTargetIds : undefined;
    setCredentialCheckDialogOpen(false);
    await handleCheckCredentials(targetIds, credentialCheckRegion || DEFAULT_AWS_REGION);
  };

  const handleSelectCredential = async (credential: AWSCredentialRecord) => {
    try {
      const nextPool = await setAWSActiveCredential(credential.id);
      setCredentialPool(nextPool);
      setRegionSelectionRequired(true);
      clearPanelState();
      toast.success(
        t("cloud.tokens.active_success", {
          name: credential.name,
          defaultValue: `Using token ${credential.name}`,
        }),
      );
    } catch (selectError) {
      toast.error(toErrorMessage(selectError));
    }
  };

  const handleDeleteCredential = async (credential: AWSCredentialRecord) => {
    const confirmed = await confirm({
      title: t("cloud.tokens.delete", "Delete credential"),
      description: t("cloud.tokens.delete_confirm", {
        name: credential.name,
        defaultValue: `Delete token "${credential.name}"?`,
      }),
      confirmLabel: t("cloud.tokens.delete", "Delete"),
    });
    if (!confirmed) return;

    try {
      const nextPool = await deleteAWSCredential(credential.id);
      if (!nextPool.active_credential_id) {
        setRegionSelectionRequired(false);
      }
      assertCredentialsDeleted(nextPool, [credential.id]);
      await syncCredentialPoolAfterDelete(nextPool, [credential.id]);
      await loadBackgroundTasks(false);
      toast.success(t("cloud.tokens.delete_success", "Token deleted"));
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  };

  const handleDeleteSelectedCredentials = async () => {
    if (!selectedCredentials.length) {
      return;
    }

    const confirmed = await confirm({
      title: t("cloud.tokens.delete_selected", {
        count: selectedCredentials.length,
        defaultValue: "Delete selected tokens",
      }),
      description: t("cloud.tokens.delete_selected_confirm", {
        count: selectedCredentials.length,
        defaultValue: `Delete ${selectedCredentials.length} selected tokens?`,
      }),
      confirmLabel: t("cloud.tokens.delete", "Delete"),
    });
    if (!confirmed) return;

    let latestPool: AWSCredentialPool | null = null;
    const removedIds: string[] = [];
    const failedIds: string[] = [];
    const failures: string[] = [];

    for (const credential of selectedCredentials) {
      try {
        const nextPool = await deleteAWSCredential(credential.id);
        assertCredentialsDeleted(nextPool, [credential.id]);
        latestPool = nextPool;
        removedIds.push(credential.id);
      } catch (deleteError) {
        failedIds.push(credential.id);
        failures.push(`${credential.name}: ${toErrorMessage(deleteError)}`);
      }
    }

    if (latestPool && removedIds.length > 0) {
      if (!latestPool.active_credential_id) {
        setRegionSelectionRequired(false);
      }
      await syncCredentialPoolAfterDelete(latestPool, removedIds);
      await loadBackgroundTasks(false);
    }

    setSelectedCredentialIds(failedIds);

    if (failures.length > 0) {
      toast.error(failures.join("；"));
      return;
    }

    toast.success(
      t("cloud.tokens.delete_selected_success", {
        count: removedIds.length,
        defaultValue: `Deleted ${removedIds.length} tokens`,
      }),
    );
  };

  const handleViewCredentialSecret = async (credential: AWSCredentialRecord) => {
    setCredentialSecretLoading(true);
    try {
      const secret = await getAWSCredentialSecret(credential.id);
      setCredentialSecret({ secret });
    } catch (viewError) {
      toast.error(toErrorMessage(viewError));
    } finally {
      setCredentialSecretLoading(false);
    }
  };

  const handleRegionChange = async (region: string) => {
    try {
      const nextPool = await setAWSActiveRegion(region);
      setCredentialPool(nextPool);
      setRegionSelectionRequired(false);
      if (hasActiveCredential(nextPool)) {
        await loadPanelData();
      } else {
        clearPanelState();
      }
    } catch (regionError) {
      toast.error(toErrorMessage(regionError));
    }
  };

  const handleCreateDialogRegionChange = async (region: string) => {
    setCreateForm((previous) => ({
      ...previous,
      image_id: "",
      instance_type: "",
      key_name: "",
      subnet_id: "",
      security_group_ids: [],
    }));
    await handleRegionChange(region);
  };

  const handleLightsailDialogRegionChange = async (region: string) => {
    setLightsailCreateForm((previous) => ({
      ...previous,
      availability_zone: "",
      blueprint_id: "",
      bundle_id: "",
    }));
    await handleRegionChange(region);
  };

  const handleCreateInstance = async () => {
    setCreateSubmitting(true);
    try {
      const payload: CreateAWSInstanceInput = {
        name: createForm.name,
        image_id: createForm.image_id,
        instance_type: createForm.instance_type,
        key_name: createForm.key_name,
        subnet_id: createForm.subnet_id,
        security_group_ids: createForm.security_group_ids,
        user_data: createForm.user_data,
        assign_public_ip: createForm.assign_public_ip,
        assign_ipv6: createForm.assign_ipv6,
        allow_all_traffic: createForm.allow_all_traffic,
        tags: parseTags(createForm.tagsText),
        auto_connect: true,
        auto_connect_group: createForm.auto_connect_group || defaultCreateGroup,
      };
      const result = await createAWSInstance(payload);
      toast.success(t("cloud.providers.aws.create_success", "EC2 instance launch submitted"));
      if (result.warning) {
        toast.warning(getCreateFollowUpWarningMessage(t, result.warning));
        await loadBackgroundTasks(false);
      }
      setCreateOpen(false);
      setCreateForm((previous) => ({
        ...initialCreateForm,
        image_id: previous.image_id,
        instance_type: previous.instance_type,
        auto_connect: true,
        auto_connect_group: defaultCreateGroup,
      }));
      await loadPanelData();
    } catch (createError) {
      toast.error(toErrorMessage(createError));
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleCreateLightsailInstance = async () => {
    setLightsailCreateSubmitting(true);
    try {
      const payload: CreateAWSLightsailInstanceInput = {
        name: lightsailCreateForm.name,
        availability_zone: lightsailCreateForm.availability_zone,
        blueprint_id: lightsailCreateForm.blueprint_id,
        bundle_id: lightsailCreateForm.bundle_id,
        key_pair_name: lightsailCreateForm.key_pair_name || "",
        user_data: lightsailCreateForm.user_data || "",
        ip_address_type: lightsailCreateForm.ip_address_type || "dualstack",
        allow_all_traffic: lightsailCreateForm.allow_all_traffic,
        tags: parseTags(lightsailCreateForm.tagsText),
        auto_connect: true,
        auto_connect_group: lightsailCreateForm.auto_connect_group || defaultCreateGroup,
      };
      const result = await createAWSLightsailInstance(payload);
      toast.success(t("cloud.providers.aws.lightsail_create_success", "Lightsail instance launch submitted"));
      if (result.warning) {
        toast.warning(getCreateFollowUpWarningMessage(t, result.warning));
        await loadBackgroundTasks(false);
      }
      setLightsailCreateOpen(false);
      setLightsailCreateForm((previous) => ({
        ...initialLightsailCreateForm,
        availability_zone: previous.availability_zone,
        blueprint_id: previous.blueprint_id,
        bundle_id: previous.bundle_id,
        auto_connect: true,
        auto_connect_group: defaultCreateGroup,
      }));
      await loadPanelData();
    } catch (createError) {
      toast.error(toErrorMessage(createError));
    } finally {
      setLightsailCreateSubmitting(false);
    }
  };

  const ensureEc2CatalogLoaded = React.useCallback(async () => {
    if (catalog) {
      return catalog;
    }

    setEc2CatalogLoading(true);
    try {
      const nextCatalog = await getAWSCatalog();
      setCatalog(nextCatalog);
      setError("");
      return nextCatalog;
    } catch (catalogError) {
      toast.error(toErrorMessage(catalogError));
      return null;
    } finally {
      setEc2CatalogLoading(false);
    }
  }, [catalog]);

  const ensureLightsailCatalogLoaded = React.useCallback(async () => {
    if (lightsailCatalog) {
      return lightsailCatalog;
    }

    setLightsailCatalogLoading(true);
    try {
      const nextLightsailCatalog = await getAWSLightsailCatalog();
      setLightsailCatalog(nextLightsailCatalog);
      setLightsailError("");
      return nextLightsailCatalog;
    } catch (catalogError) {
      toast.error(toErrorMessage(catalogError));
      return null;
    } finally {
      setLightsailCatalogLoading(false);
    }
  }, [lightsailCatalog]);

  const handleOpenCreateDialog = async () => {
    setCreateForm((previous) => ({
      ...previous,
      auto_connect: true,
      auto_connect_group: defaultCreateGroup,
    }));
    const nextCatalog = await ensureEc2CatalogLoaded();
    if (!nextCatalog) {
      return;
    }
    setCreateOpen(true);
  };

  const handleOpenLightsailCreateDialog = async () => {
    setLightsailCreateForm((previous) => ({
      ...previous,
      auto_connect: true,
      auto_connect_group: defaultCreateGroup,
    }));
    const nextCatalog = await ensureLightsailCatalogLoaded();
    if (!nextCatalog) {
      return;
    }
    setLightsailCreateOpen(true);
  };

  const handleInstanceAction = async (instance: AWSInstance, type: string) => {
    try {
      await postAWSInstanceAction(instance.instance_id, { type });
      toast.success(t("cloud.action_success", "Operation submitted"));
      await loadPanelData();
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    }
  };

  const loadInstanceDetail = React.useCallback(async (instance: AWSInstance) => {
    setDetailInstance(instance);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const detail = await getAWSInstanceDetail(instance.instance_id);
      setDetailData(detail);
      setDetailActionForm({
        imageName: `${instance.name || instance.instance_id}-ami-${Date.now()}`,
        imageDescription: "",
        noReboot: true,
        instanceType: detail.instance.instance_type || "",
        tagsText: formatTagMap(detail.instance.tags),
        allocationId: "",
        privateIp: detail.instance.private_ip || "",
      });
    } catch (detailError) {
      toast.error(toErrorMessage(detailError));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleDetailedEc2Action = async (
    input: {
      type: string;
      name?: string;
      description?: string;
      no_reboot?: boolean;
      instance_type?: string;
      tags?: AWSTag[];
      allocation_id?: string;
      association_id?: string;
      private_ip?: string;
    },
  ) => {
    if (!detailInstance) return;
    setDetailActionLoading(true);
    try {
      await postAWSInstanceAction(detailInstance.instance_id, input);
      toast.success(t("cloud.action_success", "Operation submitted"));
      await loadPanelData();
      await loadInstanceDetail({
        ...detailInstance,
        instance_type: input.instance_type || detailInstance.instance_type,
      });
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    } finally {
      setDetailActionLoading(false);
    }
  };

  const handleAllowAllEc2Traffic = async () => {
    if (!detailInstance) return;

    const confirmed = await confirm({
      title: t("cloud.providers.aws.allow_all_traffic", "Allow All Traffic"),
      description: t("cloud.providers.aws.allow_all_traffic_confirm", {
        name: detailInstance.name || detailInstance.instance_id,
        defaultValue: `Allow all IPv4 and IPv6 ingress and egress traffic on every security group attached to "${detailInstance.name || detailInstance.instance_id}"?`,
      }),
      confirmLabel: t("cloud.providers.aws.allow_all_traffic", "Allow All Traffic"),
      tone: "warning",
    });
    if (!confirmed) return;

    await handleDetailedEc2Action({ type: "allow_all_traffic" });
  };

  const handleReplaceEc2Address = async () => {
    if (!detailInstance) return;

    const confirmed = await confirm({
      title: t("cloud.providers.aws.replace_ip", "Replace IP"),
      description: t("cloud.providers.aws.replace_ip_confirm", {
        name: detailInstance.name || detailInstance.instance_id,
        current: detailTargetElasticAddress?.public_ip || "-",
        defaultValue: `Allocate a new public IP for "${detailInstance.name || detailInstance.instance_id}" and release the old IP ${detailTargetElasticAddress?.public_ip || ""}?`,
      }),
      confirmLabel: t("cloud.providers.aws.replace_ip", "Replace IP"),
      tone: "warning",
    });
    if (!confirmed) return;

    await handleDetailedEc2Action({
      type: "replace_address",
      private_ip: detailActionForm.privateIp,
    });
  };

  const handleLightsailInstanceAction = async (instance: AWSLightsailInstance, type: string) => {
    try {
      await postAWSLightsailInstanceAction(instance.name, { type });
      toast.success(t("cloud.action_success", "Operation submitted"));
      await loadPanelData();
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    }
  };

  const loadLightsailDetail = React.useCallback(async (instance: AWSLightsailInstance) => {
    setLightsailDetailInstance(instance);
    setLightsailDetailLoading(true);
    setLightsailDetailData(null);
    try {
      const detail = await getAWSLightsailInstanceDetail(instance.name);
      setLightsailDetailData(detail);
      setLightsailDetailActionForm({
        snapshotName: `${instance.name}-${Date.now()}`,
        staticIpName: `${instance.name}-ip-${Date.now()}`,
      });
    } catch (detailError) {
      toast.error(toErrorMessage(detailError));
    } finally {
      setLightsailDetailLoading(false);
    }
  }, []);

  const handleDetailedLightsailAction = async (
    input: {
      type: string;
      snapshot_name?: string;
      static_ip_name?: string;
      tags?: AWSTag[];
    },
  ) => {
    if (!lightsailDetailInstance) return;
    setLightsailActionLoading(true);
    try {
      await postAWSLightsailInstanceAction(lightsailDetailInstance.name, input);
      toast.success(t("cloud.action_success", "Operation submitted"));
      await loadPanelData();
      await loadLightsailDetail(lightsailDetailInstance);
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    } finally {
      setLightsailActionLoading(false);
    }
  };

  const handleAllowAllLightsailTraffic = async () => {
    if (!lightsailDetailInstance) return;

    const confirmed = await confirm({
      title: t("cloud.providers.aws.allow_all_traffic", "Allow All Traffic"),
      description: t("cloud.providers.aws.allow_all_lightsail_traffic_confirm", {
        name: lightsailDetailInstance.name,
        defaultValue: `Open all public ports for "${lightsailDetailInstance.name}" to 0.0.0.0/0 and ::/0 when IPv6 is enabled?`,
      }),
      confirmLabel: t("cloud.providers.aws.allow_all_traffic", "Allow All Traffic"),
      tone: "warning",
    });
    if (!confirmed) return;

    await handleDetailedLightsailAction({ type: "allow_all_traffic" });
  };

  const handleReplaceLightsailStaticIP = async () => {
    if (!lightsailDetailInstance) return;

    const confirmed = await confirm({
      title: t("cloud.providers.aws.replace_ip", "Replace IP"),
      description: t("cloud.providers.aws.replace_static_ip_confirm", {
        name: lightsailDetailInstance.name,
        current: currentLightsailStaticIP?.ip_address || "-",
        defaultValue: `Allocate a new static IP for "${lightsailDetailInstance.name}" and release the old IP ${currentLightsailStaticIP?.ip_address || ""}?`,
      }),
      confirmLabel: t("cloud.providers.aws.replace_ip", "Replace IP"),
      tone: "warning",
    });
    if (!confirmed) return;

    await handleDetailedLightsailAction({
      type: "replace_static_ip",
      static_ip_name: lightsailDetailActionForm.staticIpName,
    });
  };

  const handleDeleteInstance = async (instance: AWSInstance) => {
    const confirmed = await confirm({
      title: t("cloud.delete", "Delete instance"),
      description: t("cloud.providers.aws.delete_confirm", {
        name: instance.name || instance.instance_id,
        defaultValue: `Delete instance "${instance.name || instance.instance_id}"? This action cannot be undone.`,
      }),
      confirmLabel: t("cloud.delete", "Delete"),
    });
    if (!confirmed) return;

    try {
      await deleteAWSInstance(instance.instance_id);
      toast.success(t("cloud.providers.aws.delete_success", "Instance deleted"));
      if (detailInstance?.instance_id === instance.instance_id) {
        setDetailInstance(null);
        setDetailData(null);
      }
      await loadPanelData();
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  };

  const handleDeleteLightsailInstance = async (instance: AWSLightsailInstance) => {
    const confirmed = await confirm({
      title: t("cloud.delete", "Delete instance"),
      description: t("cloud.providers.aws.delete_confirm", {
        name: instance.name,
        defaultValue: `Delete instance "${instance.name}"? This action cannot be undone.`,
      }),
      confirmLabel: t("cloud.delete", "Delete"),
    });
    if (!confirmed) return;

    try {
      await deleteAWSLightsailInstance(instance.name);
      toast.success(t("cloud.providers.aws.delete_success", "Instance deleted"));
      if (lightsailDetailInstance?.name === instance.name) {
        setLightsailDetailInstance(null);
        setLightsailDetailData(null);
      }
      await loadPanelData();
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  };

  const handleOpenShareDialog = async (target: CloudInstanceShareTarget) => {
    setShareTarget(target);
    setShareRecord(null);
    setShareTitle(target.resourceName);
    setShareNote("");
    setShareAccessPolicy("public");
    setShareExpiresAt("");
    setShareOpen(true);
    setShareLoading(true);

    try {
      const nextShare = await getCloudInstanceShare(
        target.provider,
        target.resourceType,
        target.resourceId,
      );
      setShareRecord(nextShare.token ? nextShare : null);
      setShareTitle(nextShare.title || target.resourceName);
      setShareNote(nextShare.note || "");
      setShareAccessPolicy(nextShare.access_policy || "public");
      setShareExpiresAt(toCloudShareDateTimeLocalValue(nextShare.expires_at));
    } catch (shareError) {
      toast.error(toErrorMessage(shareError));
    } finally {
      setShareLoading(false);
    }
  };

  const handleSaveShare = async () => {
    if (!shareTarget) return;

    setShareSaving(true);
    try {
      const nextShare = await saveCloudInstanceShare(
        shareTarget.provider,
        shareTarget.resourceType,
        shareTarget.resourceId,
        {
          title: shareTitle,
          note: shareNote,
          access_policy: shareAccessPolicy,
          expires_at: fromCloudShareDateTimeLocalValue(shareExpiresAt),
          share_password: false,
          share_managed_ssh_key: false,
        },
      );
      setShareRecord(nextShare);
      setShareTitle(nextShare.title || shareTarget.resourceName);
      setShareNote(nextShare.note || "");
      setShareAccessPolicy(nextShare.access_policy || "public");
      setShareExpiresAt(toCloudShareDateTimeLocalValue(nextShare.expires_at));
      toast.success(t("cloud.share.save_success", "Share link saved"));
    } catch (shareError) {
      toast.error(toErrorMessage(shareError));
    } finally {
      setShareSaving(false);
    }
  };

  const handleDeleteShare = async () => {
    if (!shareTarget) return;

    const confirmed = await confirm({
      title: t("cloud.share.delete", "Revoke share link"),
      description: t("cloud.share.delete_confirm", {
        name: shareTarget.resourceName,
        defaultValue: `Revoke the share link for "${shareTarget.resourceName}"?`,
      }),
      confirmLabel: t("cloud.share.delete", "Revoke link"),
      tone: "warning",
    });
    if (!confirmed) return;

    setShareDeleting(true);
    try {
      await deleteCloudInstanceShare(
        shareTarget.provider,
        shareTarget.resourceType,
        shareTarget.resourceId,
      );
      setShareRecord(null);
      setShareNote("");
      setShareAccessPolicy("public");
      setShareExpiresAt("");
      toast.success(t("cloud.share.delete_success", "Share link revoked"));
    } catch (shareError) {
      toast.error(toErrorMessage(shareError));
    } finally {
      setShareDeleting(false);
    }
  };

  if (initializing) {
    return <Loading text="" />;
  }

  return (
    <AdminPageShell
        actions={
          <Button
            variant="outline"
            size="1"
            onClick={() => {
              void refreshAll();
            }}
            disabled={panelLoading || credentialChecking}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("cloud.refresh", "Refresh")}
          </Button>
        }
      >
      {error ? (
        <WarningAlert tone="warning" description={error} />
      ) : null}

      {activeQuotaError ? (
        <WarningAlert
          tone="warning"
          description={
            <>
              {t(
                "cloud.providers.aws.quota_warning",
                "AWS credentials are valid, but Komari could not read EC2 account quotas for the active region.",
              )}{" "}
              {activeQuotaError}
            </>
          }
        />
      ) : null}

      {standardVCPUQuotaReached ? (
        <WarningAlert
          tone="warning"
          description={t("cloud.providers.aws.standard_vcpu_quota_reached", {
            used: activeQuota?.running_standard_vcpus || 0,
            limit: activeQuota?.max_standard_vcpus || 0,
            defaultValue: `Running standard On-Demand vCPU usage has reached the current regional limit (${activeQuota?.running_standard_vcpus || 0}/${activeQuota?.max_standard_vcpus || 0}). Launching a new EC2 instance may fail until capacity is freed or the quota is raised.`,
          })}
        />
      ) : null}

      {runningInstanceLimitReached ? (
        <WarningAlert
          tone="warning"
          description={t("cloud.providers.aws.instance_quota_reached", {
            running: activeQuota?.running_instances || 0,
            limit: activeQuota?.max_instances || 0,
            defaultValue: `Running instances have reached the current regional limit (${activeQuota?.running_instances || 0}/${activeQuota?.max_instances || 0}). New launches may fail until capacity is freed or the quota is raised.`,
          })}
        />
      ) : null}

      {elasticIPLimitReached ? (
        <WarningAlert
          tone="warning"
          description={t("cloud.providers.aws.elastic_ip_quota_reached", {
            used: activeQuota?.allocated_elastic_ips || 0,
            limit: activeQuota?.max_elastic_ips || 0,
            defaultValue: `Elastic IP usage has reached the current regional limit (${activeQuota?.allocated_elastic_ips || 0}/${activeQuota?.max_elastic_ips || 0}). Allocating a new Elastic IP may fail.`,
          })}
        />
      ) : null}

      <div className={`order-1 ${cloudPanelCardClassName}`}>
            <div className={cloudPanelHeaderClassName}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className={cloudPanelTitleClassName}>
                    {t("cloud.providers.aws.credentials", "Credentials")}
                  </div>
                  <div className={cloudPanelDescriptionClassName}>
                    {t(
                      "cloud.providers.aws.credentials_description",
                      "Save AWS access keys here. Pick one credential first, then switch region and operate EC2 or Lightsail from the active context below.",
                    )}
                  </div>
                </div>
                <Flex gap="2" wrap="wrap" align="center">
                  <div className="w-full sm:w-72">
                    <AWSRegionSelect
                      value={activeRegion || undefined}
                      options={regionOptions}
                      placeholder={t("cloud.providers.aws.active_region", "Active Region")}
                      searchPlaceholder={regionSearchPlaceholder}
                      emptyLabel={regionSearchEmpty}
                      onValueChange={(value) => {
                        void handleRegionChange(value);
                      }}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="1"
                    onClick={() => {
                      if (!activeCredential) {
                        return;
                      }
                      void handleCheckCredentials([activeCredential.id]);
                    }}
                    disabled={!activeContextReady || credentialChecking}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {t("cloud.providers.aws.check_current", "Check Current")}
                  </Button>
                  <Button
                    variant="outline"
                    size="1"
                    onClick={() => {
                      openCredentialCheckDialog();
                    }}
                    disabled={credentialChecking || !credentialPool?.credentials.length}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {t("cloud.tokens.check_all", "Check All Tokens")}
                  </Button>
                  <Button size="1" onClick={() => setCredentialImportOpen(true)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {t("cloud.providers.aws.import", "Import Credentials")}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="1"
                        aria-label={t("cloud.providers.aws.more_actions", "More actions")}
                      >
                        <MoreHorizontal className="mr-2 h-4 w-4" />
                        {t("cloud.providers.aws.more_actions", "More actions")}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-48">
                      <DropdownMenuItem
                        onSelect={() => {
                          setBackgroundTasksOpen(true);
                        }}
                      >
                        {t("cloud.providers.aws.background_tasks", "Background Tasks")}
                        {pendingBackgroundTaskCount > 0 ? ` (${pendingBackgroundTaskCount})` : ""}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={selectedCredentials.length === 0}
                        onSelect={() => {
                          openCredentialGroupEditor(selectedCredentials);
                        }}
                      >
                        {t("cloud.tokens.set_group", "Set Group")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={selectedCredentials.length === 0}
                        onSelect={() => {
                          void handleDeleteSelectedCredentials();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("cloud.tokens.delete_selected", {
                          count: selectedCredentials.length,
                          defaultValue: "Delete selected",
                        })}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Flex>
              </div>
            </div>

            <div className="max-h-[560px] overflow-auto overscroll-contain [scrollbar-gutter:stable]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={allCredentialsSelected || (someCredentialsSelected && "indeterminate")}
                          onCheckedChange={(checked) => {
                            setSelectedCredentialIds(checked === true ? credentialRows.map((credential) => credential.id) : []);
                          }}
                          aria-label={t("cloud.tokens.select_all", "Select all tokens")}
                        />
                      </div>
                    </TableHead>
                    <TableHead>{t("cloud.tokens.table.name", "Name")}</TableHead>
                    <TableHead>{t("cloud.tokens.group", "Group")}</TableHead>
                    <TableHead>{t("cloud.providers.aws.access_key", "Access Key")}</TableHead>
                    <TableHead>{t("cloud.providers.aws.country", "Country")}</TableHead>
                    <TableHead>{t("cloud.providers.aws.ec2_quota", "EC2 Quota")}</TableHead>
                    <TableHead>{t("cloud.tokens.table.status", "Status")}</TableHead>
                    <TableHead>{t("cloud.tokens.table.checked_at", "Last Checked")}</TableHead>
                    <TableHead className="text-right">{t("common.action", "Action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!credentialRows.length ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-slate-500">
                        {t("cloud.providers.aws.credentials_empty", "No AWS credentials saved yet")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    credentialRows.map((credential) => (
                      <TableRow key={credential.id}>
                        <TableCell className="w-10">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={selectedCredentialIds.includes(credential.id)}
                              onCheckedChange={(checked) => {
                                toggleCredentialSelection(credential.id, Boolean(checked));
                              }}
                              aria-label={t("cloud.tokens.select_one", {
                                name: credential.name,
                                defaultValue: `Select token ${credential.name}`,
                              })}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="max-w-40 truncate">{credential.name}</span>
                            {credential.is_active ? (
                              <Badge color="blue">{t("cloud.tokens.active", "Active")}</Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{credential.group || "-"}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">
                          {credential.masked_access_key_id || "-"}
                        </TableCell>
                        <TableCell>
                          {getAWSCountryLabel(credential.default_region, t)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-700 dark:text-slate-300">
                          {getCompactQuotaSummary(credential.ec2_quota, t)}
                        </TableCell>
                        <TableCell>
                          <Badge color={getCredentialStatusColor(credential.last_status)}>
                            {t(`cloud.tokens.status.${credential.last_status}`, credential.last_status || "unknown")}
                          </Badge>
                          {credential.last_error ? (
                            <div className={`mt-1 max-w-64 text-xs text-red-600 ${cloudLongTextClassName}`}>
                              {credential.last_error}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>{formatDateTime(credential.last_checked_at)}</TableCell>
                        <TableCell className="text-right">
                          <Flex justify="end" gap="2" wrap="nowrap">
                            <Button
                              variant="soft"
                              size="1"
                              color={credential.is_active ? "blue" : undefined}
                              disabled={credential.is_active}
                              onClick={() => {
                                void handleSelectCredential(credential);
                              }}
                            >
                              <Server className="mr-1 h-3.5 w-3.5" />
                              {credential.is_active
                                ? t("cloud.tokens.current", "Current")
                                : t("cloud.tokens.use", "Use")}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  aria-label={t("common.action", "Action")}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-44">
                                <DropdownMenuItem
                                  onSelect={() => {
                                    openCredentialGroupEditor([credential]);
                                  }}
                                >
                                  {t("cloud.tokens.set_group", "Set Group")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={credentialSecretLoading}
                                  onSelect={() => {
                                    void handleViewCredentialSecret(credential);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                  {t("cloud.providers.aws.view_credential", "View Credential")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() => {
                                    void handleDeleteCredential(credential);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  {t("cloud.tokens.delete", "Delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </Flex>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
      </div>

        <div className="order-2">
          <Tabs.Root value={instanceView} onValueChange={(value) => setInstanceView(value as "ec2" | "lightsail")}>
            <div className={cloudPanelCardClassName}>
              <div className={cloudPanelHeaderClassName}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className={cloudPanelTitleClassName}>
                      {t("cloud.providers.aws.compute", "Compute")}
                    </div>
                    <div className={cloudPanelDescriptionClassName}>
                      {t(
                        "cloud.providers.aws.instance_list_description",
                        "The list is scoped to the active credential and active region.",
                      )}
                    </div>
                  </div>
                  <Flex gap="2" wrap="wrap" align="center">
                    <Tabs.List>
                      <Tabs.Trigger value="ec2">
                        {t("cloud.providers.aws.instance_list", "EC2 Instances")} ({instances.length})
                      </Tabs.Trigger>
                      <Tabs.Trigger value="lightsail">
                        {t("cloud.providers.aws.lightsail_instances", "Lightsail")} ({lightsailInstances.length})
                      </Tabs.Trigger>
                    </Tabs.List>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="1"
                          disabled={!activeContextReady || (ec2CatalogLoading && lightsailCatalogLoading)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          {t("common.create", "Create")}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-44">
                        <DropdownMenuItem
                          disabled={!activeContextReady || ec2CatalogLoading}
                          onSelect={() => {
                            setInstanceView("ec2");
                            void handleOpenCreateDialog();
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          {t("cloud.providers.aws.create", "Launch EC2")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!activeContextReady || lightsailCatalogLoading}
                          onSelect={() => {
                            setInstanceView("lightsail");
                            void handleOpenLightsailCreateDialog();
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          {t("cloud.providers.aws.lightsail_create", "Create Lightsail")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Flex>
                </div>
              </div>

              <Tabs.Content value="ec2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("cloud.table.name", "Name")}</TableHead>
                      <TableHead>{t("cloud.table.status", "Status")}</TableHead>
                      <TableHead>{t("cloud.providers.aws.az", "AZ")}</TableHead>
                      <TableHead>{t("cloud.table.ip", "Public IP")}</TableHead>
                      <TableHead>{t("cloud.table.size", "Size")}</TableHead>
                      <TableHead>{t("cloud.table.image", "Image")}</TableHead>
                      <TableHead>{t("cloud.providers.aws.key_pair", "Key Pair")}</TableHead>
                      <TableHead>{t("cloud.table.created_at", "Created")}</TableHead>
                      <TableHead className="text-right">{t("common.action", "Action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center text-slate-500">
                          {panelLoading
                            ? t("cloud.loading", "Loading cloud resources...")
                            : error
                              ? t("cloud.load_failed", "Unable to load cloud resources. Check the warning above and try again.")
                              : !hasActiveCredential(credentialPool)
                                ? t("cloud.providers.aws.no_active_credential", "Select an active AWS credential first")
                                : !activeContextReady
                                  ? t("cloud.providers.aws.select_region_to_load", "Select a region first to load resources in this AWS account.")
                                : !resourcesLoaded
                                  ? t("cloud.load_resources_prompt", "Click Refresh to load cloud resources on demand.")
                                  : t("cloud.providers.aws.empty", "No EC2 instances found in this region")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      instances.map((instance) => (
                        <TableRow key={instance.instance_id}>
                          <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                            <button
                              type="button"
                              className="text-left text-blue-700 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                              onClick={() => {
                                void loadInstanceDetail(instance);
                              }}
                            >
                              {instance.name || instance.instance_id}
                            </button>
                          </TableCell>
                          <TableCell>
                            <Badge color={getInstanceStateColor(instance.state)}>
                              {getCloudStatusLabel(instance.state, t)}
                            </Badge>
                          </TableCell>
                          <TableCell>{instance.availability_zone || "-"}</TableCell>
                          <TableCell>{instance.public_ip || instance.private_ip || "-"}</TableCell>
                          <TableCell>{instance.instance_type || "-"}</TableCell>
                          <TableCell>{instance.image_id || "-"}</TableCell>
                          <TableCell>{instance.key_name || "-"}</TableCell>
                          <TableCell>{formatDateTime(instance.launch_time)}</TableCell>
                          <TableCell className="text-right">
                            <Flex justify="end" gap="2" wrap="nowrap">
                              {instance.state === "running" ? (
                                <Button
                                  variant="soft"
                                  size="1"
                                  color="amber"
                                  onClick={() => {
                                    void handleInstanceAction(instance, "stop");
                                  }}
                                >
                                  <PowerOff className="mr-1 h-3.5 w-3.5" />
                                  {t("cloud.power_off", "Power Off")}
                                </Button>
                              ) : (
                                <Button
                                  variant="soft"
                                  size="1"
                                  color="green"
                                  disabled={instance.state === "terminated"}
                                  onClick={() => {
                                    void handleInstanceAction(instance, "start");
                                  }}
                                >
                                  <Power className="mr-1 h-3.5 w-3.5" />
                                  {t("cloud.power_on", "Power On")}
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    aria-label={t("common.action", "Action")}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-44">
                                  <DropdownMenuItem
                                    disabled={instance.state === "terminated"}
                                    onSelect={() => {
                                      void handleInstanceAction(instance, "reboot");
                                    }}
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                    {t("cloud.reboot", "Reboot")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      setScriptTarget({
                                        providerLabel: t("cloud.providers.aws.ec2_label", "AWS EC2"),
                                        instanceName: instance.name || instance.instance_id,
                                        instanceIdentifier: instance.instance_id,
                                        addresses: [instance.public_ip, instance.private_ip].filter(Boolean),
                                        groupHint: getDefaultAutoConnectGroup("aws", activeCredential?.name || ""),
                                      });
                                    }}
                                  >
                                    {t("cloud.script.action", "Run Script")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      void handleOpenShareDialog({
                                        provider: "aws",
                                        resourceType: "ec2",
                                        resourceId: instance.instance_id,
                                        resourceName: instance.name || instance.instance_id,
                                        providerLabel: t("cloud.providers.aws.ec2_label", "AWS EC2"),
                                        credentialName: getActiveCredential(credentialPool)?.name || "",
                                        region: activeRegion,
                                        primaryAddress: instance.public_ip || instance.private_ip || "",
                                        canSharePassword: false,
                                        canShareManagedSSHKey: false,
                                      });
                                    }}
                                  >
                                    <Share2 className="h-4 w-4" />
                                    {t("cloud.share.action", "Share")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    variant="destructive"
                                    disabled={instance.state === "terminated"}
                                    onSelect={() => {
                                      void handleDeleteInstance(instance);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    {t("cloud.delete", "Delete")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </Flex>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Tabs.Content>

              <Tabs.Content value="lightsail">
                {lightsailError ? (
                  <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                    {lightsailError}
                  </div>
                ) : null}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("cloud.table.name", "Name")}</TableHead>
                      <TableHead>{t("cloud.table.status", "Status")}</TableHead>
                      <TableHead>{t("cloud.providers.aws.az", "AZ")}</TableHead>
                      <TableHead>{t("cloud.table.ip", "Public IP")}</TableHead>
                      <TableHead>{t("cloud.table.size", "Size")}</TableHead>
                      <TableHead>{t("cloud.table.image", "Image")}</TableHead>
                      <TableHead>{t("cloud.providers.aws.static_ip", "Static IP")}</TableHead>
                      <TableHead>{t("cloud.table.created_at", "Created")}</TableHead>
                      <TableHead className="text-right">{t("common.action", "Action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lightsailInstances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center text-slate-500">
                          {panelLoading
                            ? t("cloud.loading", "Loading cloud resources...")
                            : lightsailError || error
                              ? t("cloud.load_failed", "Unable to load cloud resources. Check the warning above and try again.")
                              : !hasActiveCredential(credentialPool)
                                ? t("cloud.providers.aws.no_active_credential", "Select an active AWS credential first")
                                : !activeContextReady
                                  ? t("cloud.providers.aws.select_region_to_load", "Select a region first to load resources in this AWS account.")
                                : !resourcesLoaded
                                  ? t("cloud.load_resources_prompt", "Click Refresh to load cloud resources on demand.")
                                  : t("cloud.providers.aws.lightsail_empty", "No Lightsail instances found in this region")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      lightsailInstances.map((instance) => (
                        <TableRow key={instance.name}>
                          <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                            <button
                              type="button"
                              className="text-left text-blue-700 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                              onClick={() => {
                                void loadLightsailDetail(instance);
                              }}
                            >
                              {instance.name}
                            </button>
                          </TableCell>
                          <TableCell>
                            <Badge color={getInstanceStateColor(instance.state)}>
                              {getCloudStatusLabel(instance.state, t)}
                            </Badge>
                          </TableCell>
                          <TableCell>{instance.availability_zone || "-"}</TableCell>
                          <TableCell>{instance.public_ip || instance.private_ip || "-"}</TableCell>
                          <TableCell>{instance.bundle_id || "-"}</TableCell>
                          <TableCell>{instance.blueprint_name || instance.blueprint_id || "-"}</TableCell>
                          <TableCell>{instance.is_static_ip ? t("common.yes", "Yes") : "-"}</TableCell>
                          <TableCell>{formatDateTime(instance.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <Flex justify="end" gap="2" wrap="nowrap">
                              {instance.state === "running" ? (
                                <Button
                                  variant="soft"
                                  size="1"
                                  color="amber"
                                  onClick={() => {
                                    void handleLightsailInstanceAction(instance, "stop");
                                  }}
                                >
                                  <PowerOff className="mr-1 h-3.5 w-3.5" />
                                  {t("cloud.power_off", "Power Off")}
                                </Button>
                              ) : (
                                <Button
                                  variant="soft"
                                  size="1"
                                  color="green"
                                  onClick={() => {
                                    void handleLightsailInstanceAction(instance, "start");
                                  }}
                                >
                                  <Power className="mr-1 h-3.5 w-3.5" />
                                  {t("cloud.power_on", "Power On")}
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    aria-label={t("common.action", "Action")}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-44">
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      void handleLightsailInstanceAction(instance, "reboot");
                                    }}
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                    {t("cloud.reboot", "Reboot")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      setScriptTarget({
                                        providerLabel: t("cloud.providers.aws.lightsail_label", "AWS Lightsail"),
                                        instanceName: instance.name,
                                        instanceIdentifier: instance.name,
                                        addresses: [instance.public_ip, instance.private_ip, ...instance.ipv6_addresses].filter(Boolean),
                                        groupHint: getDefaultAutoConnectGroup("aws", activeCredential?.name || ""),
                                      });
                                    }}
                                  >
                                    {t("cloud.script.action", "Run Script")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      void handleOpenShareDialog({
                                        provider: "aws",
                                        resourceType: "lightsail",
                                        resourceId: instance.name,
                                        resourceName: instance.name,
                                        providerLabel: t("cloud.providers.aws.lightsail_label", "AWS Lightsail"),
                                        credentialName: getActiveCredential(credentialPool)?.name || "",
                                        region: activeRegion,
                                        primaryAddress: instance.public_ip || instance.private_ip || "",
                                        canSharePassword: false,
                                        canShareManagedSSHKey: false,
                                      });
                                    }}
                                  >
                                    <Share2 className="h-4 w-4" />
                                    {t("cloud.share.action", "Share")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => {
                                      void handleDeleteLightsailInstance(instance);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    {t("cloud.delete", "Delete")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </Flex>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Tabs.Content>
            </div>
          </Tabs.Root>
        </div>

      <Dialog.Root open={credentialImportOpen} onOpenChange={setCredentialImportOpen}>
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{t("cloud.providers.aws.import_dialog_title", "Batch Import AWS Credentials")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.aws.import_dialog_description",
              "One line per credential. Supported formats: accessKeyId,secretAccessKey; accessKeyId,secretAccessKey,region; or name,accessKeyId,secretAccessKey[,region[,sessionToken]]. Region is optional and only used as an initial fallback.",
            )}
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-4">
            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.tokens.group", "Group")}
            </label>
            <TextField.Root
              value={credentialImportGroup}
              placeholder={t("cloud.tokens.group_placeholder", "Optional token group")}
              onChange={(event) => setCredentialImportGroup(event.target.value)}
            />
            <TextArea
              className="min-h-40 font-mono text-xs [overflow-wrap:anywhere]"
              value={credentialImportText}
              placeholder={"AKIA...,secret...\nAKIA... secret...\nprod,AKIA...,secret...,ap-southeast-1\nbackup|AKIA...|secret...|ap-southeast-1|session-token"}
              onChange={(event) => setCredentialImportText(event.target.value)}
            />
            <div className={cloudPanelBodyTextClassName}>
              {t(
                "cloud.providers.aws.import_dialog_hint",
                `If name is omitted, Komari will generate one from the access key. If region is omitted, ${DEFAULT_AWS_REGION} is used as the initial fallback and you can switch region after selecting the credential.`,
              )}
            </div>
            <Flex justify="end" gap="2">
              <Button variant="outline" onClick={() => setCredentialImportOpen(false)} disabled={credentialSaving}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button onClick={() => { void handleImportCredentials(); }} disabled={credentialSaving}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {credentialSaving
                  ? t("cloud.tokens.importing", "Importing...")
                  : t("cloud.providers.aws.import", "Import Credentials")}
              </Button>
            </Flex>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={credentialGroupEditorOpen} onOpenChange={setCredentialGroupEditorOpen}>
        <Dialog.Content className={cloudDialogContentClassName}>
          <Dialog.Title>{t("cloud.tokens.set_group", "Set Group")}</Dialog.Title>
          <Dialog.Description>
            {t("cloud.tokens.set_group_description", {
              count: credentialGroupEditorIds.length,
              defaultValue: `Update the group for ${credentialGroupEditorIds.length} selected credential(s). Leave empty to remove the group.`,
            })}
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-4">
            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.tokens.group", "Group")}
            </label>
            <TextField.Root
              value={credentialGroupEditorValue}
              placeholder={t("cloud.tokens.group_placeholder", "Optional token group")}
              onChange={(event) => setCredentialGroupEditorValue(event.target.value)}
            />
            <Flex justify="end" gap="2">
              <Button
                variant="outline"
                onClick={() => setCredentialGroupEditorOpen(false)}
                disabled={credentialSaving}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button onClick={() => { void handleSaveCredentialGroup(); }} disabled={credentialSaving}>
                {credentialSaving ? t("common.saving", "Saving...") : t("common.save", "Save")}
              </Button>
            </Flex>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={credentialCheckDialogOpen} onOpenChange={setCredentialCheckDialogOpen}>
        <Dialog.Content className={cloudDialogContentClassName}>
          <Dialog.Title>{t("cloud.providers.aws.check_dialog_title", "Batch Check AWS Credentials")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.aws.check_dialog_description",
              "Choose the AWS region used for this batch health check before Komari validates the selected credentials.",
            )}
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-4">
            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.providers.aws.region", "Region")}
            </label>
            <AWSRegionSelect
              value={credentialCheckRegion}
              options={regionOptions}
              placeholder={t("cloud.providers.aws.region", "Region")}
              searchPlaceholder={regionSearchPlaceholder}
              emptyLabel={regionSearchEmpty}
              onValueChange={setCredentialCheckRegion}
            />
            <Flex justify="end" gap="2">
              <Button
                variant="outline"
                onClick={() => setCredentialCheckDialogOpen(false)}
                disabled={credentialChecking}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                onClick={() => {
                  void handleSubmitCredentialCheck();
                }}
                disabled={credentialChecking || !credentialCheckRegion}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                {t("cloud.tokens.check_all", "Check All Tokens")}
              </Button>
            </Flex>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{t("cloud.providers.aws.create", "Launch EC2")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.aws.create_description",
              "Launch a single EC2 instance in the active region. If your account has no default VPC, choose a subnet and matching security groups.",
            )}
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-4">
            <section className="pt-0">
              <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                <CompactSummaryMetric
                  label={t("cloud.providers.aws.region", "Region")}
                  value={selectedRegionOption ? getAWSRegionOptionLabel(selectedRegionOption) : activeRegion || "-"}
                />
                <CompactSummaryMetric
                  label={t("cloud.table.image", "Image")}
                  value={selectedImage ? getImageLabel(selectedImage) : createForm.image_id || "-"}
                />
                <CompactSummaryMetric
                  label={t("cloud.table.size", "Size")}
                  value={selectedInstanceType ? getAWSInstanceTypeOptionLabel(selectedInstanceType) : createForm.instance_type || "-"}
                />
                <CompactSummaryMetric
                  label={t("cloud.providers.aws.create_network", "Network & Access")}
                  value={ec2NetworkSummary || "-"}
                />
              </div>
            </section>

            {!instanceTypeAvailableInRegion ? (
              <WarningAlert
                tone="warning"
                description={t("cloud.providers.aws.instance_type_unavailable_region", {
                  instanceType: createForm.instance_type,
                  region: activeRegion,
                  defaultValue: `${createForm.instance_type} is not currently offered in ${activeRegion}. Choose another instance type or region.`,
                })}
              />
            ) : selectedSubnetAz && !instanceTypeAvailableForCreate ? (
              <WarningAlert
                tone="warning"
                description={t("cloud.providers.aws.instance_type_unavailable_az", {
                  instanceType: createForm.instance_type,
                  az: selectedSubnetAz,
                  defaultValue: `${createForm.instance_type} is not currently offered in ${selectedSubnetAz}. Choose another subnet or instance type.`,
                })}
              />
            ) : instanceTypeAvailabilityKnown && createForm.instance_type ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                {selectedSubnetAz
                  ? t("cloud.providers.aws.instance_type_available_az", {
                      instanceType: createForm.instance_type,
                      az: selectedSubnetAz,
                      count: selectedInstanceTypeZones.length,
                      defaultValue: `${createForm.instance_type} is offered in ${selectedSubnetAz}. AWS reports ${selectedInstanceTypeZones.length} supported AZs in ${activeRegion}.`,
                    })
                  : t("cloud.providers.aws.instance_type_available_region", {
                      instanceType: createForm.instance_type,
                      region: activeRegion,
                      count: selectedInstanceTypeZones.length,
                      defaultValue: `${createForm.instance_type} is currently offered in ${selectedInstanceTypeZones.length} AZs in ${activeRegion}.`,
                    })}
              </div>
            ) : null}

            <CompactDetailSection
              title={t("cloud.providers.aws.create_core", "Core")}
              summary={ec2CoreSummary || "-"}
              defaultOpen
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={cloudPanelFieldLabelClassName}>
                    {t("cloud.providers.aws.region", "Region")}
                  </label>
                  <AWSRegionSelect
                    value={activeRegion || undefined}
                    options={regionOptions}
                    placeholder={t("cloud.providers.aws.region", "Region")}
                    searchPlaceholder={regionSearchPlaceholder}
                    emptyLabel={regionSearchEmpty}
                    onValueChange={(value) => {
                      void handleCreateDialogRegionChange(value);
                    }}
                  />
                </div>
                <div>
                  <label className={cloudPanelFieldLabelClassName}>
                    {t("cloud.providers.aws.instance_type", "Instance Type")}
                  </label>
                  <Select.Root
                    value={createForm.instance_type}
                    onValueChange={(value) => setCreateForm((previous) => ({ ...previous, instance_type: value }))}
                  >
                    <Select.Trigger placeholder={t("cloud.form.size_placeholder", "Select a size")} />
                    <Select.Content>
                      {(catalog?.instance_types || []).map((instanceType) => (
                        <Select.Item key={instanceType.name} value={instanceType.name}>
                          {getAWSInstanceTypeOptionLabel(instanceType)}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
              </div>

              <div className="mt-4">
                <label className={cloudPanelFieldLabelClassName}>
                  {t("cloud.providers.aws.ami", "AMI")}
                </label>
                <Select.Root
                  value={createForm.image_id}
                  onValueChange={(value) => setCreateForm((previous) => ({ ...previous, image_id: value }))}
                >
                  <Select.Trigger placeholder={t("cloud.form.image_placeholder", "Select an image")} />
                  <Select.Content>
                    {(catalog?.images || []).map((image) => (
                      <Select.Item key={image.image_id} value={image.image_id}>
                        {getImageLabel(image)}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>

              <div className="mt-4">
                <label className={cloudPanelFieldLabelClassName}>
                  {t("cloud.providers.aws.ami", "AMI")}
                </label>
                <TextField.Root
                  value={createForm.image_id}
                  placeholder={t("cloud.providers.aws.ami_manual_placeholder", "Or enter an AMI ID manually")}
                  onChange={(event) => setCreateForm((previous) => ({ ...previous, image_id: event.target.value }))}
                />
              </div>
            </CompactDetailSection>

            <CompactDetailSection
              title={t("cloud.providers.aws.create_network", "Network & Access")}
              summary={ec2NetworkSummary || "-"}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={cloudPanelFieldLabelClassName}>
                    {t("cloud.providers.aws.key_pair", "Key Pair")}
                  </label>
                  <Select.Root
                    value={createForm.key_name || SELECT_NONE}
                    onValueChange={(value) =>
                      setCreateForm((previous) => ({
                        ...previous,
                        key_name: value === SELECT_NONE ? "" : value,
                      }))
                    }
                  >
                    <Select.Trigger placeholder={t("cloud.providers.aws.key_pair_optional", "Optional")} />
                    <Select.Content>
                      <Select.Item value={SELECT_NONE}>{t("cloud.providers.aws.none", "None")}</Select.Item>
                      {(catalog?.key_pairs || []).map((keyPair) => (
                        <Select.Item key={keyPair.key_name} value={keyPair.key_name}>
                          {keyPair.key_name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
                <div>
                  <label className={cloudPanelFieldLabelClassName}>
                    {t("cloud.providers.aws.subnet", "Subnet")}
                  </label>
                  <Select.Root
                    value={createForm.subnet_id || SELECT_NONE}
                    onValueChange={(value) =>
                      setCreateForm((previous) => ({
                        ...previous,
                        subnet_id: value === SELECT_NONE ? "" : value,
                        security_group_ids: [],
                      }))
                    }
                  >
                    <Select.Trigger placeholder={t("cloud.providers.aws.subnet_optional", "Optional")} />
                    <Select.Content>
                      <Select.Item value={SELECT_NONE}>{t("cloud.providers.aws.none", "None")}</Select.Item>
                      {(catalog?.subnets || []).map((subnet) => (
                        <Select.Item key={subnet.subnet_id} value={subnet.subnet_id}>
                          {subnet.subnet_id} / {subnet.availability_zone} / {subnet.cidr_block}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
              </div>

              <div className="mt-4">
                <div className={cloudPanelFieldLabelClassName}>
                  {t("cloud.providers.aws.security_groups", "Security Groups")}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {selectedSubnetVpcId
                    ? t("cloud.providers.aws.security_group_hint_vpc", {
                        vpc: selectedSubnetVpcId,
                        defaultValue: `Showing groups from VPC ${selectedSubnetVpcId}`,
                      })
                    : t(
                        "cloud.providers.aws.security_group_hint",
                        "Select matching security groups when you choose a subnet. Leave empty to let AWS use the subnet default behavior.",
                      )}
                </div>
                <div className={`${cloudDetailListClassName} mt-3 max-h-52 overflow-auto overscroll-contain [scrollbar-gutter:stable]`}>
                  {filteredSecurityGroups.length ? (
                    filteredSecurityGroups.map((group) => {
                      const checked = createForm.security_group_ids.includes(group.group_id);
                      return (
                        <label
                          key={group.group_id}
                          className={`${cloudDetailListItemClassName} flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(nextChecked) =>
                              setCreateForm((previous) => ({
                                ...previous,
                                security_group_ids: nextChecked === true
                                  ? [...previous.security_group_ids, group.group_id]
                                  : previous.security_group_ids.filter((value) => value !== group.group_id),
                              }))
                            }
                          />
                          <span className="min-w-0">
                            <span className="block font-medium text-slate-900 dark:text-slate-100">
                              {group.group_name}
                            </span>
                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                              {group.group_id} / {group.vpc_id}
                            </span>
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <div className={`${cloudDetailListItemClassName} text-sm text-slate-500 dark:text-slate-400`}>
                      {t("cloud.providers.aws.security_groups_empty", "No security groups found")}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
                  <Checkbox
                    checked={createForm.assign_public_ip}
                    onCheckedChange={(checked) =>
                      setCreateForm((previous) => ({ ...previous, assign_public_ip: Boolean(checked) }))
                    }
                  />
                  {t("cloud.providers.aws.assign_public_ip", "Assign public IPv4 when subnet configuration allows it")}
                </label>
                <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
                  <Checkbox
                    checked={createForm.assign_ipv6}
                    onCheckedChange={(checked) =>
                      setCreateForm((previous) => ({ ...previous, assign_ipv6: Boolean(checked) }))
                    }
                  />
                  {t("cloud.providers.aws.enable_ipv6", "Enable IPv6")}
                </label>
                <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
                  <Checkbox
                    checked={createForm.allow_all_traffic}
                    onCheckedChange={(checked) =>
                      setCreateForm((previous) => ({ ...previous, allow_all_traffic: Boolean(checked) }))
                    }
                  />
                  {t("cloud.providers.aws.allow_all_traffic_on_create", "After launch, allow all IPv4 and IPv6 traffic")}
                </label>
              </div>
            </CompactDetailSection>

            <CompactDetailSection
              title={t("cloud.providers.aws.create_bootstrap", "Bootstrap")}
              summary={ec2BootstrapSummary || "-"}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={cloudPanelFieldLabelClassName}>
                    {t("cloud.form.name", "Name")}
                  </label>
                  <TextField.Root
                    value={createForm.name}
                    placeholder={t("cloud.providers.aws.auto_name", "Auto name")}
                    onChange={(event) => setCreateForm((previous) => ({ ...previous, name: event.target.value }))}
                  />
                </div>
                <div>
                  <label className={cloudPanelFieldLabelClassName}>
                    {t("cloud.form.auto_connect_group", "Auto-connect group")}
                  </label>
                  <TextField.Root
                    value={createForm.auto_connect_group}
                    placeholder={t("cloud.form.auto_connect_group_placeholder", "Generated from the active credential by default")}
                    onChange={(event) =>
                      setCreateForm((previous) => ({ ...previous, auto_connect_group: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <label className={cloudPanelFieldLabelClassName}>
                    {t("cloud.form.tags", "Tags")}
                  </label>
                  <TextArea
                    className="min-h-28 font-mono text-xs [overflow-wrap:anywhere]"
                    value={createForm.tagsText}
                    onChange={(event) => setCreateForm((previous) => ({ ...previous, tagsText: event.target.value }))}
                  />
                </div>
                <div>
                  <label className={cloudPanelFieldLabelClassName}>
                    {t("cloud.form.user_data", "Cloud-Init / User Data")}
                  </label>
                  <TextArea
                    className="min-h-28 font-mono text-xs [overflow-wrap:anywhere]"
                    value={createForm.user_data}
                    onChange={(event) => setCreateForm((previous) => ({ ...previous, user_data: event.target.value }))}
                  />
                </div>
              </div>
            </CompactDetailSection>

            <Flex justify="end" gap="2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createSubmitting}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                onClick={() => {
                  void handleCreateInstance();
                }}
                disabled={
                  createSubmitting ||
                  !createForm.image_id ||
                  !createForm.instance_type ||
                  !instanceTypeAvailableInRegion ||
                  !instanceTypeAvailableForCreate
                }
              >
                {createSubmitting
                  ? t("cloud.creating", "Creating...")
                  : t("cloud.providers.aws.create", "Launch EC2")}
              </Button>
            </Flex>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={lightsailCreateOpen} onOpenChange={setLightsailCreateOpen}>
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{t("cloud.providers.aws.lightsail_create", "Create Lightsail")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.aws.lightsail_create_description",
              "Create a Lightsail instance in the active region using a blueprint and bundle.",
            )}
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-4">
            <section className="pt-0">
              <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                <CompactSummaryMetric
                  label={t("cloud.providers.aws.region", "Region")}
                  value={selectedRegionOption ? getAWSRegionOptionLabel(selectedRegionOption) : activeRegion || "-"}
                />
                <CompactSummaryMetric
                  label={t("cloud.providers.aws.az", "AZ")}
                  value={lightsailCreateForm.availability_zone || "-"}
                />
                <CompactSummaryMetric
                  label={t("cloud.table.image", "Image")}
                  value={selectedLightsailBlueprint ? getLightsailBlueprintLabel(selectedLightsailBlueprint) : lightsailCreateForm.blueprint_id || "-"}
                />
                <CompactSummaryMetric
                  label={t("cloud.table.size", "Size")}
                  value={selectedLightsailBundle ? getLightsailBundleOptionLabel(selectedLightsailBundle) : lightsailCreateForm.bundle_id || "-"}
                />
              </div>
            </section>

            <CompactDetailSection
              title={t("cloud.providers.aws.create_core", "Core")}
              summary={lightsailCoreSummary || "-"}
              defaultOpen
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={cloudPanelFieldLabelClassName}>
                    {t("cloud.providers.aws.region", "Region")}
                  </label>
                  <AWSRegionSelect
                    value={activeRegion || undefined}
                    options={regionOptions}
                    placeholder={t("cloud.providers.aws.region", "Region")}
                    searchPlaceholder={regionSearchPlaceholder}
                    emptyLabel={regionSearchEmpty}
                    onValueChange={(value) => {
                      void handleLightsailDialogRegionChange(value);
                    }}
                  />
                </div>
                <div>
                  <label className={cloudPanelFieldLabelClassName}>
                    {t("cloud.providers.aws.az", "AZ")}
                  </label>
                  <Select.Root
                    value={lightsailCreateForm.availability_zone}
                    onValueChange={(value) =>
                      setLightsailCreateForm((previous) => ({ ...previous, availability_zone: value }))
                    }
                  >
                    <Select.Trigger placeholder={t("cloud.providers.aws.az", "AZ")} />
                    <Select.Content>
                      {activeLightsailAvailabilityZones.map((zone) => (
                        <Select.Item key={zone.name} value={zone.name}>
                          {zone.name} / {zone.state || "-"}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={cloudPanelFieldLabelClassName}>
                    {t("cloud.form.image", "Image")}
                  </label>
                  <Select.Root
                    value={lightsailCreateForm.blueprint_id}
                    onValueChange={(value) =>
                      setLightsailCreateForm((previous) => ({ ...previous, blueprint_id: value }))
                    }
                  >
                    <Select.Trigger placeholder={t("cloud.form.image_placeholder", "Select an image")} />
                    <Select.Content>
                      {(lightsailCatalog?.blueprints || []).map((blueprint) => (
                        <Select.Item key={blueprint.blueprint_id} value={blueprint.blueprint_id}>
                          {getLightsailBlueprintLabel(blueprint)}
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
                    value={lightsailCreateForm.bundle_id}
                    onValueChange={(value) =>
                      setLightsailCreateForm((previous) => ({ ...previous, bundle_id: value }))
                    }
                  >
                    <Select.Trigger placeholder={t("cloud.form.size_placeholder", "Select a size")} />
                    <Select.Content>
                      {(lightsailCatalog?.bundles || []).map((bundle) => (
                        <Select.Item key={bundle.bundle_id} value={bundle.bundle_id}>
                          {getLightsailBundleOptionLabel(bundle)}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
              </div>
            </CompactDetailSection>

            <CompactDetailSection
              title={t("cloud.providers.aws.create_access", "Access")}
              summary={lightsailAccessSummary || "-"}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={cloudPanelFieldLabelClassName}>
                    {t("cloud.providers.aws.key_pair", "Key Pair")}
                  </label>
                  <Select.Root
                    value={lightsailCreateForm.key_pair_name || SELECT_NONE}
                    onValueChange={(value) =>
                      setLightsailCreateForm((previous) => ({
                        ...previous,
                        key_pair_name: value === SELECT_NONE ? "" : value,
                      }))
                    }
                  >
                    <Select.Trigger placeholder={t("cloud.providers.aws.key_pair_optional", "Optional")} />
                    <Select.Content>
                      <Select.Item value={SELECT_NONE}>{t("cloud.providers.aws.none", "None")}</Select.Item>
                      {(lightsailCatalog?.key_pairs || []).map((keyPair) => (
                        <Select.Item key={keyPair.name} value={keyPair.name}>
                          {keyPair.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
                <div>
                  <label className={`mb-2 flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
                    <Checkbox
                      checked={lightsailCreateForm.ip_address_type !== "ipv4"}
                      onCheckedChange={(checked) =>
                        setLightsailCreateForm((previous) => ({
                          ...previous,
                          ip_address_type: Boolean(checked)
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
                    value={lightsailCreateForm.ip_address_type || "dualstack"}
                    onValueChange={(value) =>
                      setLightsailCreateForm((previous) => ({ ...previous, ip_address_type: value }))
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
                  checked={lightsailCreateForm.allow_all_traffic}
                  onCheckedChange={(checked) =>
                    setLightsailCreateForm((previous) => ({ ...previous, allow_all_traffic: Boolean(checked) }))
                  }
                />
                {t("cloud.providers.aws.allow_all_traffic_on_create", "After launch, allow all IPv4 and IPv6 traffic")}
              </label>
            </CompactDetailSection>

            <CompactDetailSection
              title={t("cloud.providers.aws.create_bootstrap", "Bootstrap")}
              summary={lightsailBootstrapSummary || "-"}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={cloudPanelFieldLabelClassName}>
                    {t("cloud.form.name", "Name")}
                  </label>
                  <TextField.Root
                    value={lightsailCreateForm.name}
                    placeholder={t("cloud.providers.aws.auto_name", "Auto name")}
                    onChange={(event) =>
                      setLightsailCreateForm((previous) => ({ ...previous, name: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className={cloudPanelFieldLabelClassName}>
                    {t("cloud.form.auto_connect_group", "Auto-connect group")}
                  </label>
                  <TextField.Root
                    value={lightsailCreateForm.auto_connect_group}
                    placeholder={t("cloud.form.auto_connect_group_placeholder", "Generated from the active credential by default")}
                    onChange={(event) =>
                      setLightsailCreateForm((previous) => ({ ...previous, auto_connect_group: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <label className={cloudPanelFieldLabelClassName}>
                    {t("cloud.form.tags", "Tags")}
                  </label>
                  <TextArea
                    className="min-h-28 font-mono text-xs [overflow-wrap:anywhere]"
                    value={lightsailCreateForm.tagsText}
                    onChange={(event) =>
                      setLightsailCreateForm((previous) => ({ ...previous, tagsText: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className={cloudPanelFieldLabelClassName}>
                    {t("cloud.form.user_data", "Cloud-Init / User Data")}
                  </label>
                  <TextArea
                    className="min-h-28 font-mono text-xs [overflow-wrap:anywhere]"
                    value={lightsailCreateForm.user_data || ""}
                    onChange={(event) =>
                      setLightsailCreateForm((previous) => ({ ...previous, user_data: event.target.value }))
                    }
                  />
                </div>
              </div>
            </CompactDetailSection>

            <Flex justify="end" gap="2">
              <Button variant="outline" onClick={() => setLightsailCreateOpen(false)} disabled={lightsailCreateSubmitting}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                onClick={() => {
                  void handleCreateLightsailInstance();
                }}
                disabled={
                  lightsailCreateSubmitting ||
                  !lightsailCreateForm.availability_zone ||
                  !lightsailCreateForm.blueprint_id ||
                  !lightsailCreateForm.bundle_id
                }
              >
                {lightsailCreateSubmitting
                  ? t("cloud.creating", "Creating...")
                  : t("cloud.providers.aws.lightsail_create", "Create Lightsail")}
              </Button>
            </Flex>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(detailInstance)}
        onOpenChange={(open) => {
          if (open) return;
          setDetailInstance(null);
          setDetailData(null);
        }}
      >
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{detailInstance?.name || detailInstance?.instance_id || t("cloud.providers.aws.ec2_label", "AWS EC2")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.aws.detail_description",
              "Current EC2 overview and actions.",
            )}
          </Dialog.Description>

          {detailLoading ? (
            <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t("cloud.loading", "Loading cloud resources...")}</div>
          ) : detailData ? (
            <div className="mt-4 flex flex-col gap-4">
              <section className="pt-0">
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 lg:flex-row lg:items-start lg:justify-between">
                  <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    <CompactSummaryMetric
                      label={t("cloud.table.status", "Status")}
                      value={
                        <Badge color={getInstanceStateColor(detailData.instance.state)}>
                          {getCloudStatusLabel(detailData.instance.state, t)}
                        </Badge>
                      }
                    />
                    <CompactSummaryMetric
                      label={t("cloud.table.ip", "Public IP")}
                      value={detailData.instance.public_ip || detailData.instance.private_ip || "-"}
                    />
                    <CompactSummaryMetric
                      label={t("cloud.providers.aws.az", "AZ")}
                      value={detailData.instance.availability_zone || "-"}
                    />
                    <CompactSummaryMetric
                      label={t("cloud.table.size", "Size")}
                      value={detailData.instance.instance_type || "-"}
                    />
                  </div>
                  <Flex gap="2" wrap="wrap">
                    {detailData.instance.state === "running" ? (
                      <Button
                        variant="soft"
                        size="1"
                        color="amber"
                        disabled={detailActionLoading}
                        onClick={() => {
                          void handleDetailedEc2Action({ type: "stop" });
                        }}
                      >
                        <PowerOff className="mr-1 h-3.5 w-3.5" />
                        {t("cloud.power_off", "Power Off")}
                      </Button>
                    ) : (
                      <Button
                        variant="soft"
                        size="1"
                        color="green"
                        disabled={detailActionLoading || detailData.instance.state === "terminated"}
                        onClick={() => {
                          void handleDetailedEc2Action({ type: "start" });
                        }}
                      >
                        <Power className="mr-1 h-3.5 w-3.5" />
                        {t("cloud.power_on", "Power On")}
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="1"
                          aria-label={t("common.action", "Action")}
                        >
                          <MoreHorizontal className="mr-2 h-4 w-4" />
                          {t("cloud.providers.aws.more_actions", "More actions")}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-44">
                        <DropdownMenuItem
                          disabled={detailActionLoading || detailData.instance.state === "terminated"}
                          onSelect={() => {
                            void handleDetailedEc2Action({ type: "reboot" });
                          }}
                        >
                          <RotateCcw className="h-4 w-4" />
                          {t("cloud.reboot", "Reboot")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            setScriptTarget({
                              providerLabel: t("cloud.providers.aws.ec2_label", "AWS EC2"),
                              instanceName: detailData.instance.name || detailData.instance.instance_id,
                              instanceIdentifier: detailData.instance.instance_id,
                              addresses: [detailData.instance.public_ip, detailData.instance.private_ip].filter(Boolean),
                              groupHint: getDefaultAutoConnectGroup("aws", activeCredential?.name || ""),
                            });
                          }}
                        >
                          {t("cloud.script.action", "Run Script")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            void handleOpenShareDialog({
                              provider: "aws",
                              resourceType: "ec2",
                              resourceId: detailData.instance.instance_id,
                              resourceName: detailData.instance.name || detailData.instance.instance_id,
                              providerLabel: t("cloud.providers.aws.ec2_label", "AWS EC2"),
                              credentialName: getActiveCredential(credentialPool)?.name || "",
                              region: activeRegion,
                              primaryAddress: detailData.instance.public_ip || detailData.instance.private_ip || "",
                              canSharePassword: false,
                              canShareManagedSSHKey: false,
                            });
                          }}
                        >
                          <Share2 className="h-4 w-4" />
                          {t("cloud.share.action", "Share")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={detailActionLoading || detailData.instance.state === "terminated"}
                          onSelect={() => {
                            void handleDeleteInstance(detailData.instance);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t("cloud.delete", "Delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Flex>
                </div>
                <div className="mt-4 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
                  <PlainDetailItem
                  label={t("cloud.providers.aws.instance_id", "EC2 Instance ID")}
                  value={detailData.instance.instance_id}
                  />
                  <PlainDetailItem label={t("cloud.table.image", "Image")} value={detailData.instance.image_id || "-"} />
                  <PlainDetailItem label={t("cloud.providers.aws.key_pair", "Key Pair")} value={detailData.instance.key_name || "-"} />
                  <PlainDetailItem label={t("cloud.table.created_at", "Created")} value={formatDateTime(detailData.instance.launch_time)} />
                  <PlainDetailItem label={t("cloud.providers.aws.vpc", "VPC")} value={detailData.vpc_id || "-"} />
                  <PlainDetailItem label={t("cloud.providers.aws.subnet", "Subnet")} value={detailData.subnet_id || "-"} />
                  <PlainDetailItem
                  label={t("cloud.providers.aws.monitoring", "Monitoring")}
                  value={getCloudStatusLabel(detailData.monitoring_state, t)}
                  />
                  <PlainDetailItem label={t("cloud.providers.aws.architecture", "Architecture")} value={detailData.architecture || "-"} />
                  <PlainDetailItem label={t("cloud.providers.aws.public_dns", "Public DNS")} value={detailData.public_dns_name || "-"} />
                  <PlainDetailItem label={t("cloud.providers.aws.private_dns", "Private DNS")} value={detailData.private_dns_name || "-"} />
                </div>
              </section>

              <CompactDetailSection
                title={t("cloud.detail.tags", "Tags")}
                summary={getEntryCountSummary(Object.keys(detailData.instance.tags || {}).length, t)}
              >
                <TextArea
                  className="min-h-28"
                  value={detailActionForm.tagsText}
                  onChange={(event) =>
                    setDetailActionForm((previous) => ({ ...previous, tagsText: event.target.value }))
                  }
                />
                <Flex justify="end" gap="2" className="mt-3">
                  <Button
                    size="1"
                    disabled={detailActionLoading}
                    onClick={() => {
                      void handleDetailedEc2Action({
                        type: "sync_tags",
                        tags: parseTags(detailActionForm.tagsText),
                      });
                    }}
                  >
                    {t("cloud.providers.aws.sync_tags", "Sync Tags")}
                  </Button>
                </Flex>
              </CompactDetailSection>

              <CompactDetailSection
                title={t("cloud.providers.aws.storage", "Volumes")}
                summary={getVolumeSummary(detailData.volumes, t)}
              >
                <div className={cloudDetailListClassName}>
                  {detailData.volumes.length ? detailData.volumes.map((volume) => (
                    <div key={volume.volume_id} className={cloudDetailListItemClassName}>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{volume.device_name || volume.volume_id}</div>
                      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {volume.size_gib} GiB / {volume.volume_type} / {volume.state}
                      </div>
                    </div>
                  )) : (
                    <div className="text-sm text-slate-500 dark:text-slate-400">-</div>
                  )}
                </div>
                <Flex justify="end" gap="2" className="mt-3">
                  <Button
                    size="1"
                    disabled={detailActionLoading || !detailData.volumes.length}
                    onClick={() => {
                      void handleDetailedEc2Action({
                        type: "create_snapshots",
                        description: `Snapshots for ${detailData.instance.instance_id}`,
                      });
                    }}
                  >
                    {t("cloud.providers.aws.create_snapshots", "Create Snapshots")}
                  </Button>
                </Flex>
              </CompactDetailSection>

              <CompactDetailSection
                title={t("cloud.providers.aws.instance_controls", "Instance Controls")}
                summary={getInstanceControlsSummary(
                  detailActionForm.instanceType || detailData.instance.instance_type || "",
                  detailData.monitoring_state,
                  t,
                )}
              >
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <div className={cloudPanelTitleClassName}>
                      {t("cloud.providers.aws.change_type", "Change Instance Type")}
                    </div>
                    <Select.Root
                      value={detailActionForm.instanceType || SELECT_NONE}
                      onValueChange={(value) =>
                        setDetailActionForm((previous) => ({
                          ...previous,
                          instanceType: value === SELECT_NONE ? "" : value,
                        }))
                      }
                    >
                      <Select.Trigger className="mt-3" placeholder={t("cloud.providers.aws.instance_type", "Instance Type")} />
                      <Select.Content>
                        <Select.Item value={SELECT_NONE}>{t("cloud.providers.aws.none", "None")}</Select.Item>
                        {(catalog?.instance_types || []).map((instanceType) => (
                          <Select.Item key={instanceType.name} value={instanceType.name}>
                            {instanceType.name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                    <Flex justify="end" gap="2" className="mt-3">
                      <Button
                        size="1"
                        disabled={detailActionLoading || !detailActionForm.instanceType}
                        onClick={() => {
                          void handleDetailedEc2Action({
                            type: "change_type",
                            instance_type: detailActionForm.instanceType,
                          });
                        }}
                      >
                        {t("cloud.providers.aws.change_type", "Change Instance Type")}
                      </Button>
                    </Flex>
                  </div>

                  <div>
                    <div className={cloudPanelTitleClassName}>
                      {t("cloud.providers.aws.monitoring", "Monitoring")}
                    </div>
                    <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {getCloudStatusLabel(detailData.monitoring_state, t)}
                    </div>
                    <Flex justify="end" gap="2" className="mt-3">
                      <Button
                        size="1"
                        disabled={detailActionLoading}
                        onClick={() => {
                          void handleDetailedEc2Action({
                            type: detailData.monitoring_state === "enabled" ? "disable_monitoring" : "enable_monitoring",
                          });
                        }}
                      >
                        {detailData.monitoring_state === "enabled"
                          ? t("cloud.providers.aws.disable_monitoring", "Disable Monitoring")
                          : t("cloud.providers.aws.enable_monitoring", "Enable Monitoring")}
                      </Button>
                    </Flex>
                  </div>
                </div>
              </CompactDetailSection>

              <CompactDetailSection
                title={t("cloud.providers.aws.machine_image", "Machine Image")}
                summary={getMachineImageSummary(detailActionForm.imageName, t)}
              >
                <TextField.Root
                  value={detailActionForm.imageName}
                  placeholder="komari-ami"
                  onChange={(event) =>
                    setDetailActionForm((previous) => ({ ...previous, imageName: event.target.value }))
                  }
                />
                <TextField.Root
                  className="mt-3"
                  value={detailActionForm.imageDescription}
                  placeholder={t("cloud.providers.aws.description_optional", "Description")}
                  onChange={(event) =>
                    setDetailActionForm((previous) => ({ ...previous, imageDescription: event.target.value }))
                  }
                />
                <label className={`mt-3 flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
                  <Checkbox
                    checked={detailActionForm.noReboot}
                    onCheckedChange={(checked) =>
                      setDetailActionForm((previous) => ({ ...previous, noReboot: Boolean(checked) }))
                    }
                  />
                  {t("cloud.providers.aws.no_reboot", "Create image without reboot")}
                </label>
                <Flex justify="end" gap="2" className="mt-3">
                  <Button
                    size="1"
                    disabled={detailActionLoading || !detailActionForm.imageName}
                    onClick={() => {
                      void handleDetailedEc2Action({
                        type: "create_image",
                        name: detailActionForm.imageName,
                        description: detailActionForm.imageDescription,
                        no_reboot: detailActionForm.noReboot,
                      });
                    }}
                  >
                    {t("cloud.providers.aws.create_image", "Create AMI")}
                  </Button>
                </Flex>
              </CompactDetailSection>

              <CompactDetailSection
                title={t("cloud.providers.aws.elastic_ip", "Elastic IP")}
                summary={getEntryCountSummary(detailData.addresses.length, t)}
              >
                <div className={cloudDetailListClassName}>
                  {detailData.addresses.length ? detailData.addresses.map((address) => (
                    <div key={address.allocation_id || address.public_ip} className={cloudDetailListItemClassName}>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{formatElasticAddress(address)}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {address.association_id ? (
                          <Button
                            variant="soft"
                            size="1"
                            disabled={detailActionLoading}
                            onClick={() => {
                              void handleDetailedEc2Action({
                                type: "disassociate_address",
                                association_id: address.association_id,
                              });
                            }}
                          >
                            {t("cloud.providers.aws.disassociate", "Disassociate")}
                          </Button>
                        ) : null}
                        {address.allocation_id ? (
                          <Button
                            variant="soft"
                            size="1"
                            color="red"
                            disabled={detailActionLoading}
                            onClick={() => {
                              void handleDetailedEc2Action({
                                type: "release_address",
                                allocation_id: address.allocation_id,
                              });
                            }}
                          >
                            {t("cloud.providers.aws.release", "Release")}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )) : (
                    <div className="text-sm text-slate-500 dark:text-slate-400">-</div>
                  )}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Select.Root
                    value={detailActionForm.allocationId || SELECT_NONE}
                    onValueChange={(value) =>
                      setDetailActionForm((previous) => ({
                        ...previous,
                        allocationId: value === SELECT_NONE ? "" : value,
                      }))
                    }
                  >
                    <Select.Trigger placeholder={t("cloud.providers.aws.elastic_ip_existing", "Existing Elastic IP")} />
                    <Select.Content>
                      <Select.Item value={SELECT_NONE}>{t("cloud.providers.aws.none", "None")}</Select.Item>
                      {(catalog?.elastic_addresses || [])
                        .filter((address) => !address.association_id)
                        .map((address) => (
                          <Select.Item key={address.allocation_id} value={address.allocation_id}>
                            {formatElasticAddress(address)}
                          </Select.Item>
                        ))}
                    </Select.Content>
                  </Select.Root>
                  <TextField.Root
                    value={detailActionForm.privateIp}
                    placeholder={t("cloud.providers.aws.private_ip_optional", "Optional private IP")}
                    onChange={(event) =>
                      setDetailActionForm((previous) => ({ ...previous, privateIp: event.target.value }))
                    }
                  />
                </div>
                <Flex justify="end" gap="2" className="mt-3">
                  <Button
                    size="1"
                    disabled={detailActionLoading}
                    onClick={() => {
                      void handleDetailedEc2Action({
                        type: "allocate_address",
                        private_ip: detailActionForm.privateIp,
                      });
                    }}
                  >
                    {t("cloud.providers.aws.allocate_attach", "Allocate and Attach")}
                  </Button>
                  <Button
                    size="1"
                    variant="outline"
                    disabled={detailActionLoading || !detailActionForm.allocationId}
                    onClick={() => {
                      void handleDetailedEc2Action({
                        type: "associate_address",
                        allocation_id: detailActionForm.allocationId,
                        private_ip: detailActionForm.privateIp,
                      });
                    }}
                  >
                    {t("cloud.providers.aws.attach_existing", "Attach Existing")}
                  </Button>
                  <Button
                    size="1"
                    variant="outline"
                    disabled={detailActionLoading || !detailTargetElasticAddress}
                    onClick={() => {
                      void handleReplaceEc2Address();
                    }}
                  >
                    {t("cloud.providers.aws.replace_ip", "Replace IP")}
                  </Button>
                </Flex>
              </CompactDetailSection>

              {detailData.security_groups.length ? (
                <CompactDetailSection
                  title={t("cloud.providers.aws.security_groups", "Security Groups")}
                  summary={getEntryCountSummary(detailData.security_groups.length, t)}
                >
                  <div className={cloudDetailListClassName}>
                    {detailData.security_groups.map((group) => (
                      <div key={group.group_id} className={cloudDetailListItemClassName}>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{group.group_name || group.group_id}</div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{group.group_id}</div>
                      </div>
                    ))}
                  </div>
                  <Flex justify="end" gap="2" className="mt-3">
                    <Button
                      size="1"
                      color="amber"
                      disabled={detailActionLoading || !detailData.security_groups.length}
                      onClick={() => {
                        void handleAllowAllEc2Traffic();
                      }}
                    >
                      <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                      {t("cloud.providers.aws.allow_all_traffic", "Allow All Traffic")}
                    </Button>
                  </Flex>
                </CompactDetailSection>
              ) : null}

              {detailData.console_output ? (
                <CompactDetailSection
                  title={t("cloud.providers.aws.console_output", "Console Output")}
                  summary={getConsoleOutputSummary(detailData.console_output, t)}
                >
                  <TextArea className="min-h-40 font-mono text-xs" readOnly value={detailData.console_output} />
                </CompactDetailSection>
              ) : null}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(lightsailDetailInstance)}
        onOpenChange={(open) => {
          if (open) return;
          setLightsailDetailInstance(null);
          setLightsailDetailData(null);
        }}
      >
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{lightsailDetailInstance?.name || t("cloud.providers.aws.lightsail_label", "AWS Lightsail")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.aws.lightsail_detail_description",
              "Current Lightsail overview and actions.",
            )}
          </Dialog.Description>

          {lightsailDetailLoading ? (
            <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t("cloud.loading", "Loading cloud resources...")}</div>
          ) : lightsailDetailData ? (
            <div className="mt-4 flex flex-col gap-4">
              <section className="pt-0">
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 lg:flex-row lg:items-start lg:justify-between">
                  <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    <CompactSummaryMetric
                      label={t("cloud.table.status", "Status")}
                      value={
                        <Badge color={getInstanceStateColor(lightsailDetailData.instance.state)}>
                          {getCloudStatusLabel(lightsailDetailData.instance.state, t)}
                        </Badge>
                      }
                    />
                    <CompactSummaryMetric
                      label={t("cloud.table.ip", "Public IP")}
                      value={lightsailDetailData.instance.public_ip || lightsailDetailData.instance.private_ip || "-"}
                    />
                    <CompactSummaryMetric
                      label={t("cloud.providers.aws.az", "AZ")}
                      value={lightsailDetailData.instance.availability_zone || "-"}
                    />
                    <CompactSummaryMetric
                      label={t("cloud.table.size", "Size")}
                      value={lightsailDetailData.instance.bundle_id || "-"}
                    />
                  </div>
                  <Flex gap="2" wrap="wrap">
                    {lightsailDetailData.instance.state === "running" ? (
                      <Button
                        variant="soft"
                        size="1"
                        color="amber"
                        disabled={lightsailActionLoading}
                        onClick={() => {
                          void handleDetailedLightsailAction({ type: "stop" });
                        }}
                      >
                        <PowerOff className="mr-1 h-3.5 w-3.5" />
                        {t("cloud.power_off", "Power Off")}
                      </Button>
                    ) : (
                      <Button
                        variant="soft"
                        size="1"
                        color="green"
                        disabled={lightsailActionLoading}
                        onClick={() => {
                          void handleDetailedLightsailAction({ type: "start" });
                        }}
                      >
                        <Power className="mr-1 h-3.5 w-3.5" />
                        {t("cloud.power_on", "Power On")}
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="1"
                          aria-label={t("common.action", "Action")}
                        >
                          <MoreHorizontal className="mr-2 h-4 w-4" />
                          {t("cloud.providers.aws.more_actions", "More actions")}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-44">
                        <DropdownMenuItem
                          disabled={lightsailActionLoading}
                          onSelect={() => {
                            void handleDetailedLightsailAction({ type: "reboot" });
                          }}
                        >
                          <RotateCcw className="h-4 w-4" />
                          {t("cloud.reboot", "Reboot")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            setScriptTarget({
                              providerLabel: t("cloud.providers.aws.lightsail_label", "AWS Lightsail"),
                              instanceName: lightsailDetailData.instance.name,
                              instanceIdentifier: lightsailDetailData.instance.name,
                              addresses: [
                                lightsailDetailData.instance.public_ip,
                                lightsailDetailData.instance.private_ip,
                                ...lightsailDetailData.instance.ipv6_addresses,
                              ].filter(Boolean),
                              groupHint: getDefaultAutoConnectGroup("aws", activeCredential?.name || ""),
                            });
                          }}
                        >
                          {t("cloud.script.action", "Run Script")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            void handleOpenShareDialog({
                              provider: "aws",
                              resourceType: "lightsail",
                              resourceId: lightsailDetailData.instance.name,
                              resourceName: lightsailDetailData.instance.name,
                              providerLabel: t("cloud.providers.aws.lightsail_label", "AWS Lightsail"),
                              credentialName: getActiveCredential(credentialPool)?.name || "",
                              region: activeRegion,
                              primaryAddress: lightsailDetailData.instance.public_ip || lightsailDetailData.instance.private_ip || "",
                              canSharePassword: false,
                              canShareManagedSSHKey: false,
                            });
                          }}
                        >
                          <Share2 className="h-4 w-4" />
                          {t("cloud.share.action", "Share")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={lightsailActionLoading}
                          onSelect={() => {
                            void handleDeleteLightsailInstance(lightsailDetailData.instance);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t("cloud.delete", "Delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Flex>
                </div>
                <div className="mt-4 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
                  <PlainDetailItem label={t("cloud.table.image", "Image")} value={lightsailDetailData.instance.blueprint_name || lightsailDetailData.instance.blueprint_id || "-"} />
                  <PlainDetailItem label={t("cloud.providers.aws.key_pair", "Key Pair")} value={lightsailDetailData.instance.ssh_key_name || "-"} />
                  <PlainDetailItem label={t("cloud.table.created_at", "Created")} value={formatDateTime(lightsailDetailData.instance.created_at)} />
                  <PlainDetailItem
                    label={t("cloud.providers.aws.static_ip", "Static IP")}
                    value={
                      lightsailDetailData.static_ips.find((staticIP) => staticIP.attached_to === lightsailDetailData.instance.name)?.ip_address ||
                      "-"
                    }
                  />
                </div>
              </section>

              <CompactDetailSection
                title={t("cloud.providers.aws.ports", "Firewall Ports")}
                summary={getEntryCountSummary(lightsailDetailData.ports.length, t)}
              >
                <div className={cloudDetailListClassName}>
                  {lightsailDetailData.ports.length ? lightsailDetailData.ports.map((port) => (
                    <div key={`${port.protocol}-${port.from_port}-${port.to_port}`} className={cloudDetailListItemClassName}>
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {port.common_name || `${port.protocol}:${port.from_port}-${port.to_port}`}
                      </div>
                      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {port.access_type || "-"} / {port.access_from || "-"} / {(port.cidrs || []).join(", ") || "-"}
                      </div>
                    </div>
                  )) : (
                    <div className="text-sm text-slate-500 dark:text-slate-400">-</div>
                  )}
                </div>
                <Flex justify="end" gap="2" className="mt-3">
                  <Button
                    size="1"
                    color="amber"
                    disabled={lightsailActionLoading}
                    onClick={() => {
                      void handleAllowAllLightsailTraffic();
                    }}
                  >
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                    {t("cloud.providers.aws.allow_all_traffic", "Allow All Traffic")}
                  </Button>
                </Flex>
              </CompactDetailSection>

              <CompactDetailSection
                title={t("cloud.providers.aws.static_ip", "Static IP")}
                summary={getStaticIPSummary(lightsailDetailData.static_ips, lightsailDetailData.instance.name, t)}
              >
                <div className={cloudDetailListClassName}>
                  {lightsailDetailData.static_ips.length ? lightsailDetailData.static_ips.map((staticIP) => (
                    <div key={staticIP.name} className={cloudDetailListItemClassName}>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{staticIP.name}</div>
                      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {staticIP.ip_address || "-"} / {staticIP.attached_to || "-"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {staticIP.attached_to === lightsailDetailData.instance.name ? (
                          <Button
                            variant="soft"
                            size="1"
                            disabled={lightsailActionLoading}
                            onClick={() => {
                              void handleDetailedLightsailAction({
                                type: "detach_static_ip",
                                static_ip_name: staticIP.name,
                              });
                            }}
                          >
                            {t("cloud.providers.aws.disassociate", "Disassociate")}
                          </Button>
                        ) : !staticIP.is_attached ? (
                          <Button
                            variant="soft"
                            size="1"
                            disabled={lightsailActionLoading}
                            onClick={() => {
                              void handleDetailedLightsailAction({
                                type: "attach_static_ip",
                                static_ip_name: staticIP.name,
                              });
                            }}
                          >
                            {t("cloud.providers.aws.attach_existing", "Attach Existing")}
                          </Button>
                        ) : null}
                        {!staticIP.is_attached ? (
                          <Button
                            variant="soft"
                            size="1"
                            color="red"
                            disabled={lightsailActionLoading}
                            onClick={() => {
                              void handleDetailedLightsailAction({
                                type: "release_static_ip",
                                static_ip_name: staticIP.name,
                              });
                            }}
                          >
                            {t("cloud.providers.aws.release", "Release")}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )) : (
                    <div className="text-sm text-slate-500 dark:text-slate-400">-</div>
                  )}
                </div>
                <TextField.Root
                  className="mt-3"
                  value={lightsailDetailActionForm.staticIpName}
                  placeholder={t("cloud.providers.aws.static_ip_name", "Static IP name")}
                  onChange={(event) =>
                    setLightsailDetailActionForm((previous) => ({
                      ...previous,
                      staticIpName: event.target.value,
                    }))
                  }
                />
                <Flex justify="end" gap="2" className="mt-3">
                  <Button
                    size="1"
                    disabled={lightsailActionLoading || !lightsailDetailActionForm.staticIpName}
                    onClick={() => {
                      void handleDetailedLightsailAction({
                        type: "allocate_static_ip",
                        static_ip_name: lightsailDetailActionForm.staticIpName,
                      });
                    }}
                  >
                    {t("cloud.providers.aws.allocate_static_ip", "Allocate Static IP")}
                  </Button>
                  <Button
                    size="1"
                    variant="outline"
                    disabled={
                      lightsailActionLoading
                      || !currentLightsailStaticIP
                      || !lightsailDetailActionForm.staticIpName.trim()
                      || lightsailDetailActionForm.staticIpName.trim() === (currentLightsailStaticIP?.name || "")
                    }
                    onClick={() => {
                      void handleReplaceLightsailStaticIP();
                    }}
                  >
                    {t("cloud.providers.aws.replace_ip", "Replace IP")}
                  </Button>
                </Flex>
              </CompactDetailSection>

              <CompactDetailSection
                title={t("cloud.providers.aws.snapshots", "Snapshots")}
                summary={getEntryCountSummary(lightsailDetailData.snapshots.length, t)}
              >
                <div className={cloudDetailListClassName}>
                  {lightsailDetailData.snapshots.length ? lightsailDetailData.snapshots.map((snapshot) => (
                    <div key={snapshot.name} className={cloudDetailListItemClassName}>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{snapshot.name}</div>
                      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {snapshot.state || "-"} / {snapshot.size_in_gb} GB / {formatDateTime(snapshot.created_at)}
                      </div>
                    </div>
                  )) : (
                    <div className="text-sm text-slate-500 dark:text-slate-400">-</div>
                  )}
                </div>
                <TextField.Root
                  className="mt-3"
                  value={lightsailDetailActionForm.snapshotName}
                  placeholder={t("cloud.providers.aws.snapshot_name", "Snapshot name")}
                  onChange={(event) =>
                    setLightsailDetailActionForm((previous) => ({
                      ...previous,
                      snapshotName: event.target.value,
                    }))
                  }
                />
                <Flex justify="end" gap="2" className="mt-3">
                  <Button
                    size="1"
                    disabled={lightsailActionLoading || !lightsailDetailActionForm.snapshotName}
                    onClick={() => {
                      void handleDetailedLightsailAction({
                        type: "create_snapshot",
                        snapshot_name: lightsailDetailActionForm.snapshotName,
                      });
                    }}
                  >
                    {t("cloud.providers.aws.create_snapshot", "Create Snapshot")}
                  </Button>
                </Flex>
              </CompactDetailSection>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Root>

      <CloudInstanceShareDialog
        open={shareOpen}
        onOpenChange={(open) => {
          setShareOpen(open);
          if (!open) {
            setShareTarget(null);
            setShareRecord(null);
            setShareLoading(false);
            setShareSaving(false);
            setShareDeleting(false);
            setShareAccessPolicy("public");
            setShareExpiresAt("");
          }
        }}
        target={shareTarget}
        share={shareRecord}
        loading={shareLoading}
        saving={shareSaving}
        deleting={shareDeleting}
        title={shareTitle}
        note={shareNote}
        accessPolicy={shareAccessPolicy}
        expiresAt={shareExpiresAt}
        sharePassword={false}
        shareManagedSSHKey={false}
        shareUrl={shareRecord?.token ? buildCloudInstanceShareUrl(shareRecord.token) : ""}
        onTitleChange={setShareTitle}
        onNoteChange={setShareNote}
        onAccessPolicyChange={setShareAccessPolicy}
        onExpiresAtChange={setShareExpiresAt}
        onSharePasswordChange={() => {}}
        onShareManagedSSHKeyChange={() => {}}
        onCopyLink={() => {
          if (!shareRecord?.token) return;
          void copyText(buildCloudInstanceShareUrl(shareRecord.token));
        }}
        onSave={() => {
          void handleSaveShare();
        }}
        onDelete={() => {
          void handleDeleteShare();
        }}
      />

      <CloudInstanceScriptDialog
        open={Boolean(scriptTarget)}
        target={scriptTarget}
        onOpenChange={(open) => {
          if (open) return;
          setScriptTarget(null);
        }}
      />

      <Dialog.Root open={backgroundTasksOpen} onOpenChange={setBackgroundTasksOpen}>
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{t("cloud.providers.aws.background_tasks", "Background Tasks")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.aws.background_tasks_description",
              "Pending, failed, cancelled, and skipped AWS post-create tasks.",
            )}
          </Dialog.Description>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-4">
              <CompactSummaryMetric
                label={t("cloud.providers.aws.background_pending", "Pending")}
                value={pendingBackgroundTaskCount}
              />
              <CompactSummaryMetric
                label={t("cloud.providers.aws.background_failed", "Failed")}
                value={failedBackgroundTaskCount}
              />
              <CompactSummaryMetric
                label={t("cloud.providers.aws.background_cancelled", "Cancelled")}
                value={cancelledBackgroundTaskCount}
              />
              <CompactSummaryMetric
                label={t("cloud.providers.aws.background_skipped", "Skipped")}
                value={skippedBackgroundTaskCount}
              />
            </div>
            <Flex gap="2" align="center" wrap="wrap">
              <Button
                variant="outline"
                size="1"
                onClick={() => {
                  void handleClearTerminalBackgroundTasks();
                }}
                disabled={backgroundTasksLoading || backgroundTaskClearing || terminalBackgroundTaskCount === 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("cloud.providers.aws.clear_terminal_tasks", "Clear Terminal Tasks")}
              </Button>
              <Button
                variant="outline"
                size="1"
                onClick={() => {
                  void loadBackgroundTasks();
                }}
                disabled={backgroundTasksLoading || backgroundTaskClearing}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("cloud.refresh", "Refresh")}
              </Button>
            </Flex>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {t(
              "cloud.providers.aws.background_auto_refresh",
              "Auto refreshes every 15 seconds while pending tasks exist.",
            )}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div>
              <div className={cloudPanelFieldLabelClassName}>
                {t("cloud.providers.aws.filter_credential", "Credential")}
              </div>
              <Select.Root value={backgroundTaskCredentialFilter} onValueChange={setBackgroundTaskCredentialFilter}>
                <Select.Trigger className="mt-2" />
                <Select.Content>
                  <Select.Item value={BACKGROUND_TASK_FILTER_ALL}>
                    {t("cloud.providers.aws.filter_all_credentials", "All Credentials")}
                  </Select.Item>
                  {backgroundTaskCredentialOptions.map(([credentialId, credentialLabel]) => (
                    <Select.Item key={credentialId || "deleted"} value={credentialId}>
                      {credentialLabel}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
            <div>
              <div className={cloudPanelFieldLabelClassName}>
                {t("cloud.providers.aws.filter_region", "Region")}
              </div>
              <Select.Root value={backgroundTaskRegionFilter} onValueChange={setBackgroundTaskRegionFilter}>
                <Select.Trigger className="mt-2" />
                <Select.Content>
                  <Select.Item value={BACKGROUND_TASK_FILTER_ALL}>
                    {t("cloud.providers.aws.filter_all_regions", "All Regions")}
                  </Select.Item>
                  {backgroundTaskRegionOptions.map((region) => (
                    <Select.Item key={region} value={region}>
                      {region}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
            <div>
              <div className={cloudPanelFieldLabelClassName}>
                {t("cloud.providers.aws.filter_status", "Status")}
              </div>
              <Select.Root value={backgroundTaskStatusFilter} onValueChange={setBackgroundTaskStatusFilter}>
                <Select.Trigger className="mt-2" />
                <Select.Content>
                  <Select.Item value={BACKGROUND_TASK_FILTER_ALL}>
                    {t("cloud.providers.aws.filter_all_statuses", "All Statuses")}
                  </Select.Item>
                  {["pending", "failed", "cancelled", "skipped"].map((status) => (
                    <Select.Item key={status} value={status}>
                      {t(`cloud.providers.aws.follow_up_status.${status}`, status)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {t("cloud.providers.aws.background_filtered_count", {
              shown: filteredBackgroundTasks.length,
              total: backgroundTasks.length,
              defaultValue: `Showing ${filteredBackgroundTasks.length} of ${backgroundTasks.length} tasks`,
            })}
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800">
            {backgroundTasksLoading ? (
              <div className="px-4 py-6 text-sm text-slate-500">
                {t("cloud.loading", "Loading...")}
              </div>
            ) : !backgroundTasks.length ? (
              <div className="px-4 py-6 text-sm text-slate-500">
                {t("cloud.providers.aws.background_tasks_empty", "No AWS background tasks")}
              </div>
            ) : !filteredBackgroundTasks.length ? (
              <div className="px-4 py-6 text-sm text-slate-500">
                {t("cloud.providers.aws.background_tasks_filtered_empty", "No AWS background tasks match the current filters")}
              </div>
            ) : (
              <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
                {filteredBackgroundTasks.map((task) => {
                  const credentialLabel =
                    task.credential_name && task.credential_name !== task.credential_id
                      ? task.credential_name
                      : t("cloud.providers.aws.deleted_credential", "Deleted Credential");
                  const timingLabel =
                    task.status === "pending"
                      ? t("cloud.providers.aws.next_run", "Next Run")
                      : t("cloud.providers.aws.completed_at", "Completed");
                  const timingValue =
                    task.status === "pending"
                      ? formatDateTime(task.next_run_at)
                      : formatDateTime(task.completed_at || task.updated_at);

                  return (
                    <div key={task.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {getFollowUpTaskLabel(task.task_type, t)}
                          </div>
                          <div className={`mt-1 text-xs text-slate-500 ${cloudLongTextClassName}`}>
                            {task.resource_id || "-"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge color={getFollowUpStatusColor(task.status)}>
                            {t(`cloud.providers.aws.follow_up_status.${task.status}`, task.status || "unknown")}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {task.attempts}/{task.max_attempts}
                          </span>
                          {task.status !== "pending" ? (
                            <Button
                              variant="outline"
                              size="1"
                              onClick={() => {
                                void handleRetryBackgroundTask(task);
                              }}
                              disabled={backgroundTasksLoading || backgroundTaskRetryingId === task.id || backgroundTaskClearing}
                            >
                              <RotateCcw className="mr-2 h-3.5 w-3.5" />
                              {t("cloud.providers.aws.retry_task", "Retry")}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <span>
                          {t("cloud.providers.aws.credentials", "Credentials")}: {credentialLabel}
                        </span>
                        <span>
                          {t("cloud.providers.aws.region", "Region")}: {task.region || "-"}
                        </span>
                        <span>
                          {timingLabel}: {timingValue}
                        </span>
                        <span>
                          {t("cloud.providers.aws.last_attempt_at", "Last Attempt")}: {formatDateTime(task.last_attempt_at)}
                        </span>
                      </div>
                      {task.last_error ? (
                        <div className={`mt-2 text-xs text-amber-700 ${cloudLongTextClassName}`}>
                          {task.last_error}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={Boolean(credentialSecret)} onOpenChange={(open) => !open && setCredentialSecret(null)}>
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{t("cloud.providers.aws.credential_dialog_title", "Credential Details")}</Dialog.Title>
              <Dialog.Description>
            {t(
              "cloud.providers.aws.credential_dialog_description",
              "View the full AWS credentials only when you need to copy or verify them.",
            )}
          </Dialog.Description>

          {credentialSecret ? (
            <div className="mt-4 flex flex-col gap-3">
              <div className={cloudPanelSectionClassName}>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  {t("cloud.providers.aws.credentials", "Credentials")}
                </div>
                <div className="mt-2">
                  <CompactCredentialRow
                    label={t("cloud.tokens.table.name", "Name")}
                    value={credentialSecret.secret.credential_name}
                  />
                  <CompactCredentialRow
                    label={t("cloud.providers.aws.access_key", "Access Key")}
                    value={credentialSecret.secret.access_key_id || "-"}
                  />
                </div>
              </div>
              {(credentialSecret.secret.ec2_quota || credentialSecret.secret.ec2_quota_error) ? (
                <div className={cloudPanelSectionClassName}>
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    {t("cloud.providers.aws.ec2_quota", "EC2 Quota")}
                  </div>
                  <div className="mt-2">
                    <AWSQuotaSummary
                      quota={credentialSecret.secret.ec2_quota}
                      error={credentialSecret.secret.ec2_quota_error}
                      t={t}
                    />
                  </div>
                </div>
              ) : null}
              <CompactCredentialCopyBlock
                title={t("cloud.providers.aws.secret_access_key", "Secret Access Key")}
                copyLabel={t("copy", "Copy")}
                onCopy={() => { void copyText(credentialSecret.secret.secret_access_key); }}
                value={credentialSecret.secret.secret_access_key}
              />
              {credentialSecret.secret.session_token ? (
                <CompactCredentialCopyBlock
                  title={t("cloud.providers.aws.session_token", "Session Token")}
                  copyLabel={t("copy", "Copy")}
                  onCopy={() => { void copyText(credentialSecret.secret.session_token); }}
                  value={credentialSecret.secret.session_token}
                />
              ) : null}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Root>
      {dialog}
    </AdminPageShell>
  );
}

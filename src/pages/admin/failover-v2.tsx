import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { LoaderCircle, PencilLine, Play, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import Loading from "@/components/loading";
import { AdminPageShell, AdminSurface } from "@/components/admin/AdminPageShell";
import { Badge } from "@/components/admin/admin-ui";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getDefaultAdminPath, useAccount } from "@/contexts/AccountContext";
import { updateSettingsWithToast, useSettings } from "@/lib/api";
import {
  getCloudProviderEntries,
  type CloudProviderCredentialEntry,
} from "@/lib/cloud";
import {
  type FailoverNodeOption,
  type FailoverScriptOption,
  getFailoverNodes,
  getFailoverScripts,
} from "@/lib/failover";
import {
  createFailoverV2Member,
  createFailoverV2Service,
  deleteFailoverV2Member,
  deleteFailoverV2Service,
  detachFailoverV2MemberDNS,
  FailoverV2ApiError,
  type FailoverV2BulkValidationResult,
  type FailoverV2Execution,
  type FailoverV2ExecutionSummary,
  type FailoverV2Member,
  type FailoverV2MemberInput,
  markFailoverV2PendingCleanupManualReview,
  type FailoverV2PendingCleanup,
  type FailoverV2Service,
  type FailoverV2ServiceInput,
  type FailoverV2ValidationResult,
  getFailoverV2Execution,
  getFailoverV2Executions,
  getFailoverV2PendingCleanups,
  getFailoverV2Services,
  resolveFailoverV2PendingCleanup,
  retryFailoverV2ExecutionAttachDNS,
  retryFailoverV2ExecutionCleanup,
  retryFailoverV2PendingCleanup,
  runFailoverV2MemberNow,
  setFailoverV2MemberEnabled,
  setFailoverV2ServiceEnabled,
  stopFailoverV2Execution,
  updateFailoverV2Member,
  updateFailoverV2Service,
  validateAllFailoverV2Services,
  validateFailoverV2Member,
  validateFailoverV2Service,
} from "@/lib/failoverV2";

type ServiceFormState = {
  name: string;
  enabled: boolean;
  dns_provider: string;
  dns_entry_id: string;
  dns_payload: string;
  script_clipboard_ids: number[];
  script_timeout_sec: string;
  wait_agent_timeout_sec: string;
  delete_strategy: string;
  delete_delay_seconds: string;
};

type MemberFormState = {
  name: string;
  enabled: boolean;
  priority: string;
  watch_client_uuid: string;
  dns_line: string;
  dns_record_refs: string;
  current_address: string;
  current_instance_ref: string;
  provider: string;
  provider_entry_id: string;
  plan_payload: string;
  failure_threshold: string;
  stale_after_seconds: string;
  cooldown_seconds: string;
};

type DeleteTarget =
  | { kind: "service"; service: FailoverV2Service }
  | { kind: "member"; service: FailoverV2Service; member: FailoverV2Member }
  | null;

type DetachTarget =
  | { service: FailoverV2Service; member: FailoverV2Member }
  | null;

type FailoverTarget =
  | { service: FailoverV2Service; member: FailoverV2Member }
  | null;

type ExecutionDialogTarget =
  | { service: FailoverV2Service; preferredExecutionID: number | null }
  | null;

type ExecutionActionTarget =
  | { action: "stop" | "retry_attach_dns" | "retry_cleanup"; serviceID: number; executionID: number }
  | null;

type PendingCleanupDialogTarget =
  | { service: FailoverV2Service }
  | null;

type PendingCleanupActionTarget =
  | { action: "retry" | "resolve" | "mark_manual_review"; serviceID: number; cleanupID: number }
  | null;

type ValidationDialogTarget =
  | { title: string; result: FailoverV2ValidationResult }
  | null;

const FAILOVER_V2_DNS_PROVIDER = "aliyun";
const FAILOVER_V2_MEMBER_PROVIDER = "digitalocean";
const FAILOVER_V2_DNS_PROVIDERS = [
  { value: "aliyun", label: "Aliyun" },
  { value: "cloudflare", label: "Cloudflare" },
] as const;
const FAILOVER_V2_MEMBER_PROVIDERS = [
  { value: "digitalocean", label: "DigitalOcean" },
  { value: "linode", label: "Linode" },
  { value: "aws", label: "AWS" },
] as const;
const FAILOVER_V2_POLL_INTERVAL_MS = 5000;
const FAILOVER_V2_ACTIVE_EXECUTION_STATUSES = new Set([
  "queued",
  "detaching_dns",
  "verifying_detach_dns",
  "provisioning",
  "waiting_agent",
  "validating_outlet",
  "running_scripts",
  "attaching_dns",
  "verifying_attach_dns",
  "cleaning_old",
]);

function normalizeProviderKey(value: string, fallback: string) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || fallback;
}

function getStatusBadgeColor(status: string): "gray" | "green" | "amber" | "red" | "blue" {
  switch ((status || "").trim().toLowerCase()) {
    case "healthy":
    case "success":
    case "succeeded":
      return "green";
    case "running":
      return "blue";
    case "triggered":
    case "cooldown":
    case "pending":
    case "manual_review":
      return "amber";
    case "failed":
      return "red";
    default:
      return "gray";
  }
}

function isFailoverV2ExecutionStatusActive(status: string | null | undefined) {
  return FAILOVER_V2_ACTIVE_EXECUTION_STATUSES.has(String(status || "").trim().toLowerCase());
}

function isFailoverV2ServiceBusy(service: FailoverV2Service) {
  if (String(service.last_status || "").trim().toLowerCase() === "running") {
    return true;
  }
  return service.recent_executions.some((execution) => (
    !execution.finished_at && isFailoverV2ExecutionStatusActive(execution.status)
  ));
}

function isFailoverV2MemberBusy(service: FailoverV2Service, member: FailoverV2Member) {
  if (String(member.last_status || "").trim().toLowerCase() === "running") {
    return true;
  }
  return service.recent_executions.some((execution) => (
    execution.member_id === member.id
    && !execution.finished_at
    && isFailoverV2ExecutionStatusActive(execution.status)
  ));
}

function getValidationBadgeColor(status: string): "gray" | "green" | "amber" | "red" | "blue" {
  switch (String(status || "").trim().toLowerCase()) {
    case "pass":
      return "green";
    case "warn":
      return "amber";
    case "fail":
      return "red";
    default:
      return "gray";
  }
}

function validationResultHasWarnings(result: FailoverV2ValidationResult | null | undefined) {
  return Boolean(result?.checks.some((check) => String(check.status || "").trim().toLowerCase() === "warn"));
}

function bulkValidationHasWarnings(result: FailoverV2BulkValidationResult | null | undefined) {
  return Boolean(
    result
    && (
      result.warnings > 0
      || result.checked === 0
      || result.services.some((service) => service.checks.some((check) => String(check.status || "").trim().toLowerCase() === "warn"))
    ),
  );
}

function flattenBulkValidationResult(
  result: FailoverV2BulkValidationResult,
  noEnabledServicesLabel = "Enabled services",
  noEnabledServicesMessage = "No enabled V2 services will be scheduled.",
): FailoverV2ValidationResult {
  const checks = result.services.flatMap((service) => {
    const serviceLabel = service.service_name || `Service #${service.service_id}`;
    return service.checks.map((check) => ({
      ...check,
      key: `${service.service_id}:${check.key}`,
      label: `${serviceLabel} / ${check.label || check.key}`,
    }));
  });
  if (result.checked === 0) {
    checks.push({
      key: "scheduler:no_enabled_services",
      label: noEnabledServicesLabel,
      status: "warn",
      message: noEnabledServicesMessage,
    });
  }
  return {
    ok: result.ok,
    checks,
  };
}

function formatMemberSubtitle(member: FailoverV2Member) {
  const parts = [formatProviderLabel(member.provider), member.provider_entry_id, member.watch_client_uuid]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return parts.join(" / ");
}

function formatJsonTextareaValue(value: unknown, fallback: string) {
  if (value === null || value === undefined) {
    return fallback;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
}

function formatProviderLabel(provider: string) {
  switch (normalizeProviderKey(provider, "")) {
    case "aliyun":
      return "Aliyun";
    case "cloudflare":
      return "Cloudflare";
    case "digitalocean":
      return "DigitalOcean";
    case "linode":
      return "Linode";
    case "aws":
      return "AWS";
    default:
      return String(provider || "").trim() || "Unknown";
  }
}

function getDefaultServiceDNSPayload(provider: string) {
  switch (normalizeProviderKey(provider, FAILOVER_V2_DNS_PROVIDER)) {
    case "cloudflare":
      return JSON.stringify({
        zone_name: "",
        record_name: "",
        record_type: "A",
        sync_ipv6: false,
        ttl: 120,
        proxied: false,
      }, null, 2);
    default:
      return JSON.stringify({
        domain_name: "",
        rr: "@",
        record_type: "A",
        sync_ipv6: false,
        ttl: 600,
      }, null, 2);
  }
}

function getServiceDNSPayloadHint(provider: string) {
  switch (normalizeProviderKey(provider, FAILOVER_V2_DNS_PROVIDER)) {
    case "cloudflare":
      return "Cloudflare payload accepts zone_id or zone_name, a full record_name, optional sync_ipv6, TTL, and optional proxied override.";
    default:
      return "Aliyun payload accepts domain_name, rr, record_type, optional sync_ipv6, and TTL.";
  }
}

function getDefaultMemberPlanPayload(provider: string) {
  switch (normalizeProviderKey(provider, FAILOVER_V2_MEMBER_PROVIDER)) {
    case "linode":
      return JSON.stringify({
        region: "",
        type: "",
        image: "",
        backups_enabled: false,
        tags: [],
        user_data: "",
      }, null, 2);
    case "aws":
      return JSON.stringify({
        service: "ec2",
        region: "",
        image_id: "",
        instance_type: "",
        subnet_id: "",
        security_group_ids: [],
        assign_public_ip: true,
        assign_ipv6: true,
        allow_all_traffic: false,
        user_data: "",
        tags: [],
      }, null, 2);
    default:
      return JSON.stringify({
        region: "",
        size: "",
        image: "",
        ipv6: true,
        monitoring: true,
        tags: [],
        user_data: "",
      }, null, 2);
  }
}

function getMemberPlanPayloadHint(provider: string) {
  switch (normalizeProviderKey(provider, FAILOVER_V2_MEMBER_PROVIDER)) {
    case "linode":
      return "Linode payload must include region, type, and image. Optional authorized_keys, backups_enabled, tags, and user_data are supported. V2 auto-connect is injected automatically.";
    case "aws":
      return "AWS payload must include region. EC2 requires image_id and instance_type. Lightsail requires service: lightsail plus availability_zone, blueprint_id, and bundle_id. V2 auto-connect is injected automatically.";
    default:
      return "DigitalOcean payload must include region, size, and image. Optional IPv6, monitoring, tags, VPC, and user_data are supported. V2 auto-connect is injected automatically.";
  }
}

function createEmptyServiceForm(): ServiceFormState {
  return {
    name: "",
    enabled: true,
    dns_provider: FAILOVER_V2_DNS_PROVIDER,
    dns_entry_id: "",
    dns_payload: getDefaultServiceDNSPayload(FAILOVER_V2_DNS_PROVIDER),
    script_clipboard_ids: [],
    script_timeout_sec: "600",
    wait_agent_timeout_sec: "600",
    delete_strategy: "keep",
    delete_delay_seconds: "0",
  };
}

function createServiceForm(service?: FailoverV2Service | null): ServiceFormState {
  if (!service) {
    return createEmptyServiceForm();
  }

  return {
    name: service.name || "",
    enabled: service.enabled,
    dns_provider: normalizeProviderKey(service.dns_provider, FAILOVER_V2_DNS_PROVIDER),
    dns_entry_id: service.dns_entry_id || "",
    dns_payload: formatJsonTextareaValue(
      service.dns_payload,
      getDefaultServiceDNSPayload(service.dns_provider || FAILOVER_V2_DNS_PROVIDER),
    ),
    script_clipboard_ids: Array.isArray(service.script_clipboard_ids) ? service.script_clipboard_ids : [],
    script_timeout_sec: String(service.script_timeout_sec || 600),
    wait_agent_timeout_sec: String(service.wait_agent_timeout_sec || 600),
    delete_strategy: service.delete_strategy || "keep",
    delete_delay_seconds: String(service.delete_delay_seconds || 0),
  };
}

function createEmptyMemberForm(): MemberFormState {
  return {
    name: "",
    enabled: true,
    priority: "1",
    watch_client_uuid: "",
    dns_line: "",
    dns_record_refs: "{}",
    current_address: "",
    current_instance_ref: "null",
    provider: FAILOVER_V2_MEMBER_PROVIDER,
    provider_entry_id: "",
    plan_payload: getDefaultMemberPlanPayload(FAILOVER_V2_MEMBER_PROVIDER),
    failure_threshold: "2",
    stale_after_seconds: "300",
    cooldown_seconds: "1800",
  };
}

function createMemberForm(member?: FailoverV2Member | null): MemberFormState {
  if (!member) {
    return createEmptyMemberForm();
  }

  return {
    name: member.name || "",
    enabled: member.enabled,
    priority: String(member.priority || 1),
    watch_client_uuid: member.watch_client_uuid || "",
    dns_line: member.dns_line || "",
    dns_record_refs: formatJsonTextareaValue(member.dns_record_refs, "{}"),
    current_address: member.current_address || "",
    current_instance_ref: formatJsonTextareaValue(member.current_instance_ref, "null"),
    provider: normalizeProviderKey(member.provider, FAILOVER_V2_MEMBER_PROVIDER),
    provider_entry_id: member.provider_entry_id || "",
    plan_payload: formatJsonTextareaValue(
      member.plan_payload,
      getDefaultMemberPlanPayload(member.provider || FAILOVER_V2_MEMBER_PROVIDER),
    ),
    failure_threshold: String(member.failure_threshold || 2),
    stale_after_seconds: String(member.stale_after_seconds || 300),
    cooldown_seconds: String(member.cooldown_seconds || 1800),
  };
}

function parseNumberField(
  rawValue: string,
  label: string,
  fallback = 0,
  options: { min?: number; max?: number } = {},
) {
  const trimmed = String(rawValue || "").trim();
  if (!trimmed) {
    return fallback;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid number`);
  }
  const value = Math.trunc(parsed);
  if (options.min !== undefined && value < options.min) {
    throw new Error(`${label} must be at least ${options.min}`);
  }
  if (options.max !== undefined && value > options.max) {
    throw new Error(`${label} must be at most ${options.max}`);
  }
  return value;
}

function parseJsonField(rawValue: string, fallback: unknown, label: string) {
  const trimmed = String(rawValue || "").trim();
  if (!trimmed) {
    return fallback;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error(`${label} JSON is invalid`);
  }
}

function buildServiceInput(formState: ServiceFormState): FailoverV2ServiceInput {
  return {
    name: String(formState.name || "").trim(),
    enabled: Boolean(formState.enabled),
    dns_provider: normalizeProviderKey(formState.dns_provider, FAILOVER_V2_DNS_PROVIDER),
    dns_entry_id: String(formState.dns_entry_id || "").trim(),
    dns_payload: parseJsonField(formState.dns_payload, {}, "DNS payload"),
    script_clipboard_ids: Array.from(new Set(formState.script_clipboard_ids.filter((id) => Number.isFinite(id) && id > 0))),
    script_timeout_sec: parseNumberField(formState.script_timeout_sec, "Script timeout", 600, { min: 1 }),
    wait_agent_timeout_sec: parseNumberField(formState.wait_agent_timeout_sec, "Wait agent timeout", 600, { min: 1 }),
    delete_strategy: String(formState.delete_strategy || "keep").trim() || "keep",
    delete_delay_seconds: parseNumberField(formState.delete_delay_seconds, "Delete delay", 0, { min: 0 }),
  };
}

function buildMemberInput(formState: MemberFormState): FailoverV2MemberInput {
  return {
    name: String(formState.name || "").trim(),
    enabled: Boolean(formState.enabled),
    priority: parseNumberField(formState.priority, "Priority", 1, { min: 1 }),
    watch_client_uuid: String(formState.watch_client_uuid || "").trim(),
    dns_line: String(formState.dns_line || "").trim(),
    dns_record_refs: parseJsonField(formState.dns_record_refs, {}, "DNS record refs"),
    current_address: String(formState.current_address || "").trim(),
    current_instance_ref: parseJsonField(formState.current_instance_ref, null, "Current instance ref"),
    provider: normalizeProviderKey(formState.provider, FAILOVER_V2_MEMBER_PROVIDER),
    provider_entry_id: String(formState.provider_entry_id || "").trim(),
    plan_payload: parseJsonField(formState.plan_payload, {}, "Plan payload"),
    failure_threshold: parseNumberField(formState.failure_threshold, "Failure threshold", 2, { min: 1 }),
    stale_after_seconds: parseNumberField(formState.stale_after_seconds, "Stale after", 300, { min: 1 }),
    cooldown_seconds: parseNumberField(formState.cooldown_seconds, "Cooldown", 1800, { min: 0 }),
  };
}

function findNodeAddress(nodes: FailoverNodeOption[], watchClientUUID: string) {
  const target = String(watchClientUUID || "").trim();
  if (!target) {
    return "";
  }
  const node = nodes.find((item) => item.uuid === target);
  if (!node) {
    return "";
  }
  return String(node.ipv4 || node.ipv6 || "").trim();
}

function mergeCurrentEntry(
  entries: CloudProviderCredentialEntry[],
  currentValue: string,
): CloudProviderCredentialEntry[] {
  const normalizedCurrent = String(currentValue || "").trim();
  if (!normalizedCurrent) {
    return entries;
  }
  if (entries.some((entry) => entry.id === normalizedCurrent)) {
    return entries;
  }
  return [
    {
      id: normalizedCurrent,
      name: normalizedCurrent,
      values: {},
    },
    ...entries,
  ];
}

function mergeCurrentNode(
  nodes: FailoverNodeOption[],
  currentValue: string,
): FailoverNodeOption[] {
  const normalizedCurrent = String(currentValue || "").trim();
  if (!normalizedCurrent) {
    return nodes;
  }
  if (nodes.some((node) => node.uuid === normalizedCurrent)) {
    return nodes;
  }
  return [
    {
      uuid: normalizedCurrent,
      name: normalizedCurrent,
      group: "",
      ipv4: "",
      ipv6: "",
    },
    ...nodes,
  ];
}

function formatNodeLabel(node: FailoverNodeOption) {
  const parts = [node.name, node.group, node.ipv4 || node.ipv6, node.uuid]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return parts.join(" / ");
}

function formatEntryLabel(entry: CloudProviderCredentialEntry) {
  const parts = [entry.name, entry.id]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return parts.join(" / ");
}

function findMemberLabel(service: FailoverV2Service, memberID: number) {
  const member = service.members.find((item) => item.id === memberID);
  if (!member) {
    return `#${memberID}`;
  }
  return member.name || member.dns_line || `#${memberID}`;
}

function formatPendingCleanupLabel(cleanup: FailoverV2PendingCleanup) {
  return cleanup.cleanup_label
    || [cleanup.provider, cleanup.resource_type, cleanup.resource_id]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" / ")
    || `#${cleanup.id}`;
}

function formatTimestamp(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "-";
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return normalized;
  }
  return date.toLocaleString();
}

function formatJsonBlock(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "null") {
      return "";
    }
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      return trimmed;
    }
  }
  try {
    const serialized = JSON.stringify(value, null, 2);
    return serialized === "null" ? "" : serialized;
  } catch {
    return String(value);
  }
}

export default function FailoverV2Page() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { account, hasFeature, loading, platformAdmin } = useAccount();
  const systemState = useSettings("system", { enabled: platformAdmin });
  const serviceLoadSeqRef = React.useRef(0);

  const [services, setServices] = React.useState<FailoverV2Service[]>([]);
  const [loadingServices, setLoadingServices] = React.useState(true);
  const [error, setError] = React.useState("");
  const [savingSchedulerSetting, setSavingSchedulerSetting] = React.useState(false);
  const [schedulerEnableConfirmOpen, setSchedulerEnableConfirmOpen] = React.useState(false);
  const [validatingSchedulerPreflight, setValidatingSchedulerPreflight] = React.useState(false);
  const [schedulerPreflightResult, setSchedulerPreflightResult] = React.useState<FailoverV2BulkValidationResult | null>(null);

  const [scripts, setScripts] = React.useState<FailoverScriptOption[]>([]);
  const [nodes, setNodes] = React.useState<FailoverNodeOption[]>([]);
  const [dnsEntriesByProvider, setDnsEntriesByProvider] = React.useState<Record<string, CloudProviderCredentialEntry[]>>({});
  const [providerEntriesByProvider, setProviderEntriesByProvider] = React.useState<Record<string, CloudProviderCredentialEntry[]>>({});

  const [serviceDialogOpen, setServiceDialogOpen] = React.useState(false);
  const [editingService, setEditingService] = React.useState<FailoverV2Service | null>(null);
  const [serviceForm, setServiceForm] = React.useState<ServiceFormState>(createEmptyServiceForm());
  const [savingService, setSavingService] = React.useState(false);
  const [validatingService, setValidatingService] = React.useState(false);
  const [validatingServiceID, setValidatingServiceID] = React.useState<number | null>(null);
  const [togglingServiceID, setTogglingServiceID] = React.useState<number | null>(null);

  const [memberDialogOpen, setMemberDialogOpen] = React.useState(false);
  const [memberDialogService, setMemberDialogService] = React.useState<FailoverV2Service | null>(null);
  const [editingMember, setEditingMember] = React.useState<FailoverV2Member | null>(null);
  const [memberForm, setMemberForm] = React.useState<MemberFormState>(createEmptyMemberForm());
  const [savingMember, setSavingMember] = React.useState(false);
  const [validatingMember, setValidatingMember] = React.useState(false);
  const [togglingMemberKey, setTogglingMemberKey] = React.useState("");
  const [memberAdvancedOpen, setMemberAdvancedOpen] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [detachTarget, setDetachTarget] = React.useState<DetachTarget>(null);
  const [detachingDNS, setDetachingDNS] = React.useState(false);
  const [failoverTarget, setFailoverTarget] = React.useState<FailoverTarget>(null);
  const [runningFailover, setRunningFailover] = React.useState(false);
  const [executionDialogTarget, setExecutionDialogTarget] = React.useState<ExecutionDialogTarget>(null);
  const [executionSummaries, setExecutionSummaries] = React.useState<FailoverV2ExecutionSummary[]>([]);
  const [loadingExecutions, setLoadingExecutions] = React.useState(false);
  const [selectedExecutionID, setSelectedExecutionID] = React.useState<number | null>(null);
  const [selectedExecution, setSelectedExecution] = React.useState<FailoverV2Execution | null>(null);
  const [loadingExecutionDetail, setLoadingExecutionDetail] = React.useState(false);
  const [executionError, setExecutionError] = React.useState("");
  const [executionActionTarget, setExecutionActionTarget] = React.useState<ExecutionActionTarget>(null);
  const [stoppingExecution, setStoppingExecution] = React.useState(false);
  const [retryingAttachDNS, setRetryingAttachDNS] = React.useState(false);
  const [retryingCleanup, setRetryingCleanup] = React.useState(false);
  const [pendingCleanupDialogTarget, setPendingCleanupDialogTarget] = React.useState<PendingCleanupDialogTarget>(null);
  const [pendingCleanups, setPendingCleanups] = React.useState<FailoverV2PendingCleanup[]>([]);
  const [loadingPendingCleanups, setLoadingPendingCleanups] = React.useState(false);
  const [pendingCleanupError, setPendingCleanupError] = React.useState("");
  const [pendingCleanupActionTarget, setPendingCleanupActionTarget] = React.useState<PendingCleanupActionTarget>(null);
  const [retryingPendingCleanup, setRetryingPendingCleanup] = React.useState(false);
  const [resolvingPendingCleanup, setResolvingPendingCleanup] = React.useState(false);
  const [markingPendingCleanupReview, setMarkingPendingCleanupReview] = React.useState(false);
  const [validationDialogTarget, setValidationDialogTarget] = React.useState<ValidationDialogTarget>(null);

  const loadServices = React.useCallback(async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    const requestSeq = serviceLoadSeqRef.current + 1;
    serviceLoadSeqRef.current = requestSeq;

    if (!silent) {
      setLoadingServices(true);
      setError("");
    }
    try {
      const data = await getFailoverV2Services();
      if (serviceLoadSeqRef.current === requestSeq) {
        setServices(Array.isArray(data) ? data : []);
      }
    } catch (loadError) {
      const message =
        loadError instanceof FailoverV2ApiError
          ? loadError.message
          : t("failover_v2.load_failed", {
            defaultValue: "Failed to load failover v2 services",
          });
      if (!silent && serviceLoadSeqRef.current === requestSeq) {
        setError(message);
      }
    } finally {
      if (!silent) {
        setLoadingServices(false);
      }
    }
  }, [t]);

  const loadCatalogs = React.useCallback(async () => {
    const results = await Promise.allSettled([
      getFailoverScripts(),
      getFailoverNodes(),
      ...FAILOVER_V2_DNS_PROVIDERS.map((provider) => getCloudProviderEntries(provider.value)),
      ...FAILOVER_V2_MEMBER_PROVIDERS.map((provider) => getCloudProviderEntries(provider.value)),
    ]);

    if (results[0].status === "fulfilled") {
      setScripts(results[0].value);
    }
    if (results[1].status === "fulfilled") {
      setNodes(results[1].value);
    }

    const nextDNSEntriesByProvider: Record<string, CloudProviderCredentialEntry[]> = {};
    const dnsOffset = 2;
    FAILOVER_V2_DNS_PROVIDERS.forEach((provider, index) => {
      const result = results[dnsOffset + index];
      nextDNSEntriesByProvider[provider.value] =
        result && result.status === "fulfilled"
          ? result.value as CloudProviderCredentialEntry[]
          : [];
    });
    setDnsEntriesByProvider(nextDNSEntriesByProvider);

    const nextProviderEntriesByProvider: Record<string, CloudProviderCredentialEntry[]> = {};
    const memberOffset = dnsOffset + FAILOVER_V2_DNS_PROVIDERS.length;
    FAILOVER_V2_MEMBER_PROVIDERS.forEach((provider, index) => {
      const result = results[memberOffset + index];
      nextProviderEntriesByProvider[provider.value] =
        result && result.status === "fulfilled"
          ? result.value as CloudProviderCredentialEntry[]
          : [];
    });
    setProviderEntriesByProvider(nextProviderEntriesByProvider);
  }, []);

  React.useEffect(() => {
    if (loading) {
      return;
    }
    if (!hasFeature("cloud_failover") || !hasFeature("cn_connectivity")) {
      return;
    }

    void loadServices();
    void loadCatalogs();
  }, [hasFeature, loadCatalogs, loadServices, loading]);

  const enabledServiceCount = React.useMemo(
    () => services.filter((service) => service.enabled).length,
    [services],
  );
  const schedulerEnabled = Boolean(systemState.settings.failover_v2_scheduler_enabled);
  const schedulerPreflightHasWarnings = bulkValidationHasWarnings(schedulerPreflightResult);
  const schedulerEnableBusy = savingSchedulerSetting || validatingSchedulerPreflight;
  const totalMemberCount = React.useMemo(
    () => services.reduce((sum, service) => sum + service.member_count, 0),
    [services],
  );
  const hasBusyService = React.useMemo(
    () => services.some((service) => isFailoverV2ServiceBusy(service)),
    [services],
  );

  React.useEffect(() => {
    if (loading || !hasFeature("cloud_failover") || !hasFeature("cn_connectivity") || !hasBusyService) {
      return undefined;
    }

    const intervalID = window.setInterval(() => {
      void loadServices({ silent: true });
    }, FAILOVER_V2_POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalID);
  }, [hasBusyService, hasFeature, loadServices, loading]);

  const currentDnsEntries = React.useMemo(
    () => mergeCurrentEntry(
      dnsEntriesByProvider[normalizeProviderKey(serviceForm.dns_provider, FAILOVER_V2_DNS_PROVIDER)] || [],
      serviceForm.dns_entry_id,
    ),
    [dnsEntriesByProvider, serviceForm.dns_entry_id, serviceForm.dns_provider],
  );
  const currentProviderEntries = React.useMemo(
    () => mergeCurrentEntry(
      providerEntriesByProvider[normalizeProviderKey(memberForm.provider, FAILOVER_V2_MEMBER_PROVIDER)] || [],
      memberForm.provider_entry_id,
    ),
    [memberForm.provider, memberForm.provider_entry_id, providerEntriesByProvider],
  );
  const currentNodeOptions = React.useMemo(
    () => mergeCurrentNode(nodes, memberForm.watch_client_uuid),
    [memberForm.watch_client_uuid, nodes],
  );

  const handleServiceDNSProviderChange = React.useCallback((provider: string) => {
    const nextProvider = normalizeProviderKey(provider, FAILOVER_V2_DNS_PROVIDER);
    setServiceForm((current) => ({
      ...current,
      dns_provider: nextProvider,
      dns_entry_id: "",
      dns_payload: getDefaultServiceDNSPayload(nextProvider),
    }));
  }, []);

  const handleMemberProviderChange = React.useCallback((provider: string) => {
    const nextProvider = normalizeProviderKey(provider, FAILOVER_V2_MEMBER_PROVIDER);
    setMemberForm((current) => ({
      ...current,
      provider: nextProvider,
      provider_entry_id: "",
      plan_payload: getDefaultMemberPlanPayload(nextProvider),
    }));
  }, []);

  const openCreateServiceDialog = React.useCallback(() => {
    setEditingService(null);
    setServiceForm(createEmptyServiceForm());
    setServiceDialogOpen(true);
  }, []);

  const openEditServiceDialog = React.useCallback((service: FailoverV2Service) => {
    setEditingService(service);
    setServiceForm(createServiceForm(service));
    setServiceDialogOpen(true);
  }, []);

  const openCreateMemberDialog = React.useCallback((service: FailoverV2Service) => {
    setMemberDialogService(service);
    setEditingMember(null);
    setMemberForm(createEmptyMemberForm());
    setMemberAdvancedOpen(false);
    setMemberDialogOpen(true);
  }, []);

  const openEditMemberDialog = React.useCallback((service: FailoverV2Service, member: FailoverV2Member) => {
    setMemberDialogService(service);
    setEditingMember(member);
    setMemberForm(createMemberForm(member));
    setMemberAdvancedOpen(false);
    setMemberDialogOpen(true);
  }, []);

  const handleServiceScriptToggle = React.useCallback((scriptID: number, checked: boolean) => {
    setServiceForm((current) => {
      const nextIDs = new Set(current.script_clipboard_ids);
      if (checked) {
        nextIDs.add(scriptID);
      } else {
        nextIDs.delete(scriptID);
      }
      return {
        ...current,
        script_clipboard_ids: Array.from(nextIDs).sort((left, right) => left - right),
      };
    });
  }, []);

  const handleSaveService = React.useCallback(async () => {
    try {
      const input = buildServiceInput(serviceForm);
      setSavingService(true);
      if (editingService) {
        await updateFailoverV2Service(editingService.id, input);
        toast.success(t("common.updated_successfully", { defaultValue: "Updated successfully" }));
      } else {
        await createFailoverV2Service(input);
        toast.success(t("common.created_successfully", { defaultValue: "Created successfully" }));
      }
      setServiceDialogOpen(false);
      await loadServices();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : t("common.error", { defaultValue: "Error" });
      toast.error(message);
    } finally {
      setSavingService(false);
    }
  }, [editingService, loadServices, serviceForm, t]);

  const handleSaveMember = React.useCallback(async () => {
    if (!memberDialogService) {
      return;
    }

    try {
      const input = buildMemberInput(memberForm);
      setSavingMember(true);
      if (editingMember) {
        await updateFailoverV2Member(memberDialogService.id, editingMember.id, input);
        toast.success(t("common.updated_successfully", { defaultValue: "Updated successfully" }));
      } else {
        await createFailoverV2Member(memberDialogService.id, input);
        toast.success(t("common.created_successfully", { defaultValue: "Created successfully" }));
      }
      setMemberDialogOpen(false);
      await loadServices();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : t("common.error", { defaultValue: "Error" });
      toast.error(message);
    } finally {
      setSavingMember(false);
    }
  }, [editingMember, loadServices, memberDialogService, memberForm, t]);

  const showValidationResult = React.useCallback((title: string, result: FailoverV2ValidationResult) => {
    setValidationDialogTarget({ title, result });
    if (result.ok) {
      if (validationResultHasWarnings(result)) {
        toast.warning(t("failover_v2.validation_warnings", { defaultValue: "Validation passed with warnings" }));
      } else {
        toast.success(t("failover_v2.validation_passed", { defaultValue: "Validation passed" }));
      }
      return;
    }
    toast.error(t("failover_v2.validation_failed", { defaultValue: "Validation found issues" }));
  }, [t]);

  const handleValidateServiceForm = React.useCallback(async () => {
    try {
      setValidatingService(true);
      const input = buildServiceInput(serviceForm);
      const result = await validateFailoverV2Service(input, editingService?.id ?? null);
      showValidationResult(
        editingService
          ? t("failover_v2.validation_service_title", { defaultValue: "Service validation" })
          : t("failover_v2.validation_new_service_title", { defaultValue: "New service validation" }),
        result,
      );
    } catch (validateError) {
      const message = validateError instanceof Error ? validateError.message : t("common.error", { defaultValue: "Error" });
      toast.error(message);
    } finally {
      setValidatingService(false);
    }
  }, [editingService, serviceForm, showValidationResult, t]);

  const handleValidateExistingService = React.useCallback(async (service: FailoverV2Service) => {
    try {
      setValidatingServiceID(service.id);
      const input = buildServiceInput(createServiceForm(service));
      const result = await validateFailoverV2Service(input, service.id);
      showValidationResult(
        t("failover_v2.validation_existing_service_title", {
          defaultValue: `Validate ${service.name || "service"}`,
          name: service.name || "service",
        }),
        result,
      );
    } catch (validateError) {
      const message = validateError instanceof Error ? validateError.message : t("common.error", { defaultValue: "Error" });
      toast.error(message);
    } finally {
      setValidatingServiceID(null);
    }
  }, [showValidationResult, t]);

  const handleValidateMemberForm = React.useCallback(async () => {
    if (!memberDialogService) {
      return;
    }
    try {
      setValidatingMember(true);
      const input = buildMemberInput(memberForm);
      const result = await validateFailoverV2Member(memberDialogService.id, input, editingMember?.id ?? null);
      showValidationResult(
        editingMember
          ? t("failover_v2.validation_member_title", { defaultValue: "Member validation" })
          : t("failover_v2.validation_new_member_title", { defaultValue: "New member validation" }),
        result,
      );
    } catch (validateError) {
      const message = validateError instanceof Error ? validateError.message : t("common.error", { defaultValue: "Error" });
      toast.error(message);
    } finally {
      setValidatingMember(false);
    }
  }, [editingMember, memberDialogService, memberForm, showValidationResult, t]);

  const replaceServiceInState = React.useCallback((nextService: FailoverV2Service) => {
    setServices((current) => current.map((service) => (service.id === nextService.id ? nextService : service)));
    setEditingService((current) => (current && current.id === nextService.id ? nextService : current));
    setMemberDialogService((current) => (current && current.id === nextService.id ? nextService : current));
    setExecutionDialogTarget((current) => (
      current && current.service.id === nextService.id
        ? { ...current, service: nextService }
        : current
    ));
    setPendingCleanupDialogTarget((current) => (
      current && current.service.id === nextService.id
        ? { ...current, service: nextService }
        : current
    ));
  }, []);

  const handleToggleServiceEnabled = React.useCallback(async (service: FailoverV2Service, enabled: boolean) => {
    try {
      setTogglingServiceID(service.id);
      const updated = await setFailoverV2ServiceEnabled(service.id, enabled);
      replaceServiceInState(updated);
      toast.success(
        enabled
          ? t("failover_v2.service_resumed", { defaultValue: "Service resumed for automatic scheduling" })
          : t("failover_v2.service_paused", { defaultValue: "Service paused from automatic scheduling" }),
      );
    } catch (toggleError) {
      const message = toggleError instanceof Error ? toggleError.message : t("common.error", { defaultValue: "Error" });
      toast.error(message);
    } finally {
      setTogglingServiceID(null);
    }
  }, [replaceServiceInState, t]);

  const handleToggleMemberEnabled = React.useCallback(async (
    service: FailoverV2Service,
    member: FailoverV2Member,
    enabled: boolean,
  ) => {
    const actionKey = `${service.id}:${member.id}`;
    try {
      setTogglingMemberKey(actionKey);
      const updated = await setFailoverV2MemberEnabled(service.id, member.id, enabled);
      replaceServiceInState(updated);
      toast.success(
        enabled
          ? t("failover_v2.member_resumed", { defaultValue: "Member resumed for automatic checks" })
          : t("failover_v2.member_paused", { defaultValue: "Member paused from automatic checks" }),
      );
    } catch (toggleError) {
      const message = toggleError instanceof Error ? toggleError.message : t("common.error", { defaultValue: "Error" });
      toast.error(message);
    } finally {
      setTogglingMemberKey("");
    }
  }, [replaceServiceInState, t]);

  const handleConfirmDelete = React.useCallback(async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeleting(true);
      if (deleteTarget.kind === "service") {
        await deleteFailoverV2Service(deleteTarget.service.id);
      } else {
        await deleteFailoverV2Member(deleteTarget.service.id, deleteTarget.member.id);
      }
      toast.success(t("common.deleted_successfully", { defaultValue: "Deleted successfully" }));
      setDeleteTarget(null);
      await loadServices();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : t("common.error", { defaultValue: "Error" });
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, loadServices, t]);

  const handleConfirmDetachDNS = React.useCallback(async () => {
    if (!detachTarget) {
      return;
    }

    try {
      setDetachingDNS(true);
      await detachFailoverV2MemberDNS(detachTarget.service.id, detachTarget.member.id);
      toast.success(t("failover_v2.detach_dns_started", { defaultValue: "DNS detach started" }));
      setDetachTarget(null);
      await loadServices();
    } catch (detachError) {
      const message = detachError instanceof Error ? detachError.message : t("common.error", { defaultValue: "Error" });
      toast.error(message);
    } finally {
      setDetachingDNS(false);
    }
  }, [detachTarget, loadServices, t]);

  const handleConfirmFailover = React.useCallback(async () => {
    if (!failoverTarget) {
      return;
    }

    try {
      setRunningFailover(true);
      await runFailoverV2MemberNow(failoverTarget.service.id, failoverTarget.member.id);
      toast.success(t("failover_v2.failover_started", { defaultValue: "Failover started" }));
      setFailoverTarget(null);
      await loadServices();
    } catch (failoverError) {
      const message = failoverError instanceof Error ? failoverError.message : t("common.error", { defaultValue: "Error" });
      toast.error(message);
    } finally {
      setRunningFailover(false);
    }
  }, [failoverTarget, loadServices, t]);

  const loadExecutionDetail = React.useCallback(async (
    serviceID: number,
    executionID: number,
    options?: { silent?: boolean },
  ) => {
    const silent = Boolean(options?.silent);
    if (!silent) {
      setLoadingExecutionDetail(true);
    }
    try {
      const data = await getFailoverV2Execution(serviceID, executionID);
      setSelectedExecution(data);
      setSelectedExecutionID(executionID);
      setExecutionError("");
    } catch (loadError) {
      const message =
        loadError instanceof FailoverV2ApiError
          ? loadError.message
          : t("failover_v2.execution_load_failed", {
            defaultValue: "Failed to load execution details",
          });
      if (!silent) {
        setExecutionError(message);
        setSelectedExecution(null);
      }
    } finally {
      if (!silent) {
        setLoadingExecutionDetail(false);
      }
    }
  }, [t]);

  const loadExecutionHistory = React.useCallback(async (
    service: FailoverV2Service,
    preferredExecutionID?: number | null,
    options?: { silent?: boolean },
  ) => {
    const silent = Boolean(options?.silent);
    if (!silent) {
      setLoadingExecutions(true);
      setExecutionError("");
    }
    try {
      const data = await getFailoverV2Executions(service.id, 30);
      setExecutionSummaries(data);

      const nextExecutionID = preferredExecutionID ?? data[0]?.id ?? null;
      if (nextExecutionID) {
        await loadExecutionDetail(service.id, nextExecutionID, options);
      } else {
        setSelectedExecutionID(null);
        setSelectedExecution(null);
      }
    } catch (loadError) {
      const message =
        loadError instanceof FailoverV2ApiError
          ? loadError.message
          : t("failover_v2.execution_history_failed", {
            defaultValue: "Failed to load execution history",
          });
      if (!silent) {
        setExecutionError(message);
        setExecutionSummaries([]);
        setSelectedExecutionID(null);
        setSelectedExecution(null);
      }
    } finally {
      if (!silent) {
        setLoadingExecutions(false);
      }
    }
  }, [loadExecutionDetail, t]);

  const openExecutionDialog = React.useCallback((service: FailoverV2Service, preferredExecutionID?: number | null) => {
    const nextPreferredID = preferredExecutionID ?? service.last_execution_id ?? null;
    setExecutionDialogTarget({ service, preferredExecutionID: nextPreferredID });
    setExecutionSummaries([]);
    setSelectedExecutionID(nextPreferredID);
    setSelectedExecution(null);
    setExecutionError("");
    void loadExecutionHistory(service, nextPreferredID);
  }, [loadExecutionHistory]);

  const handleSelectExecution = React.useCallback((executionID: number) => {
    if (!executionDialogTarget) {
      return;
    }
    void loadExecutionDetail(executionDialogTarget.service.id, executionID);
  }, [executionDialogTarget, loadExecutionDetail]);

  const selectedExecutionActive = React.useMemo(() => {
    if (!selectedExecutionID) {
      return false;
    }
    if (selectedExecution && selectedExecution.id === selectedExecutionID) {
      return !selectedExecution.finished_at && isFailoverV2ExecutionStatusActive(selectedExecution.status);
    }
    const summary = executionSummaries.find((execution) => execution.id === selectedExecutionID);
    return Boolean(summary && !summary.finished_at && isFailoverV2ExecutionStatusActive(summary.status));
  }, [executionSummaries, selectedExecution, selectedExecutionID]);

  React.useEffect(() => {
    if (!executionDialogTarget || !selectedExecutionID || !selectedExecutionActive) {
      return undefined;
    }

    const intervalID = window.setInterval(() => {
      void loadExecutionHistory(executionDialogTarget.service, selectedExecutionID, { silent: true });
    }, FAILOVER_V2_POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalID);
  }, [executionDialogTarget, loadExecutionHistory, selectedExecutionActive, selectedExecutionID]);

  const handleConfirmExecutionAction = React.useCallback(async () => {
    if (!executionActionTarget) {
      return;
    }

    try {
      let updated: FailoverV2Execution;
      if (executionActionTarget.action === "stop") {
        setStoppingExecution(true);
        updated = await stopFailoverV2Execution(executionActionTarget.serviceID, executionActionTarget.executionID);
        toast.success(t("failover_v2.stop_execution_success", { defaultValue: "Execution stopped" }));
      } else if (executionActionTarget.action === "retry_attach_dns") {
        setRetryingAttachDNS(true);
        updated = await retryFailoverV2ExecutionAttachDNS(executionActionTarget.serviceID, executionActionTarget.executionID);
        toast.success(t("failover_v2.retry_attach_dns_success", { defaultValue: "DNS attach retry finished" }));
      } else {
        setRetryingCleanup(true);
        updated = await retryFailoverV2ExecutionCleanup(executionActionTarget.serviceID, executionActionTarget.executionID);
        toast.success(t("failover_v2.retry_cleanup_success", { defaultValue: "Cleanup retry finished" }));
      }

      setExecutionActionTarget(null);
      await loadServices();
      if (executionDialogTarget) {
        await loadExecutionHistory(executionDialogTarget.service, updated.id);
      } else {
        setSelectedExecution(updated);
        setSelectedExecutionID(updated.id);
      }
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : t("common.error", { defaultValue: "Error" });
      toast.error(message);
    } finally {
      setStoppingExecution(false);
      setRetryingAttachDNS(false);
      setRetryingCleanup(false);
    }
  }, [executionActionTarget, executionDialogTarget, loadExecutionHistory, loadServices, t]);

  const loadPendingCleanupHistory = React.useCallback(async (service: FailoverV2Service) => {
    setLoadingPendingCleanups(true);
    setPendingCleanupError("");
    try {
      const data = await getFailoverV2PendingCleanups(service.id, 50);
      setPendingCleanups(data);
    } catch (loadError) {
      const message =
        loadError instanceof FailoverV2ApiError
          ? loadError.message
          : t("failover_v2.pending_cleanup_load_failed", {
            defaultValue: "Failed to load pending cleanups",
          });
      setPendingCleanupError(message);
      setPendingCleanups([]);
    } finally {
      setLoadingPendingCleanups(false);
    }
  }, [t]);

  const openPendingCleanupDialog = React.useCallback((service: FailoverV2Service) => {
    setPendingCleanupDialogTarget({ service });
    setPendingCleanups([]);
    setPendingCleanupError("");
    void loadPendingCleanupHistory(service);
  }, [loadPendingCleanupHistory]);

  const hasRunningPendingCleanup = React.useMemo(
    () => pendingCleanups.some((cleanup) => String(cleanup.status || "").trim().toLowerCase() === "running"),
    [pendingCleanups],
  );

  React.useEffect(() => {
    if (!pendingCleanupDialogTarget || !hasRunningPendingCleanup) {
      return undefined;
    }

    const intervalID = window.setInterval(() => {
      void loadPendingCleanupHistory(pendingCleanupDialogTarget.service);
    }, FAILOVER_V2_POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalID);
  }, [hasRunningPendingCleanup, loadPendingCleanupHistory, pendingCleanupDialogTarget]);

  const handleConfirmPendingCleanupAction = React.useCallback(async () => {
    if (!pendingCleanupActionTarget) {
      return;
    }

    try {
      if (pendingCleanupActionTarget.action === "retry") {
        setRetryingPendingCleanup(true);
        await retryFailoverV2PendingCleanup(pendingCleanupActionTarget.serviceID, pendingCleanupActionTarget.cleanupID);
        toast.success(t("failover_v2.pending_cleanup_retry_queued", { defaultValue: "Pending cleanup retry queued" }));
      } else if (pendingCleanupActionTarget.action === "resolve") {
        setResolvingPendingCleanup(true);
        await resolveFailoverV2PendingCleanup(pendingCleanupActionTarget.serviceID, pendingCleanupActionTarget.cleanupID);
        toast.success(t("failover_v2.pending_cleanup_resolve_success", { defaultValue: "Pending cleanup marked resolved" }));
      } else {
        setMarkingPendingCleanupReview(true);
        await markFailoverV2PendingCleanupManualReview(pendingCleanupActionTarget.serviceID, pendingCleanupActionTarget.cleanupID);
        toast.success(t("failover_v2.pending_cleanup_manual_review_success", { defaultValue: "Pending cleanup moved to manual review" }));
      }

      setPendingCleanupActionTarget(null);
      await loadServices();
      if (pendingCleanupDialogTarget) {
        await loadPendingCleanupHistory(pendingCleanupDialogTarget.service);
      }
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : t("common.error", { defaultValue: "Error" });
      toast.error(message);
    } finally {
      setRetryingPendingCleanup(false);
      setResolvingPendingCleanup(false);
      setMarkingPendingCleanupReview(false);
    }
  }, [loadPendingCleanupHistory, loadServices, pendingCleanupActionTarget, pendingCleanupDialogTarget, t]);

  const handleToggleScheduler = React.useCallback(async (checked: boolean) => {
    if (!platformAdmin) {
      return;
    }
    try {
      setSavingSchedulerSetting(true);
      await updateSettingsWithToast({ failover_v2_scheduler_enabled: checked }, t, "system");
      await systemState.refetch();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : t("common.error", { defaultValue: "Error" });
      toast.error(message);
    } finally {
      setSavingSchedulerSetting(false);
    }
  }, [platformAdmin, systemState, t]);

  const handleRequestToggleScheduler = React.useCallback((checked: boolean) => {
    if (checked && !schedulerEnabled) {
      setSchedulerPreflightResult(null);
      setSchedulerEnableConfirmOpen(true);
      return;
    }
    void handleToggleScheduler(checked);
  }, [handleToggleScheduler, schedulerEnabled]);

  const handleConfirmEnableScheduler = React.useCallback(async () => {
    if (schedulerPreflightResult && bulkValidationHasWarnings(schedulerPreflightResult)) {
      setSchedulerEnableConfirmOpen(false);
      setSchedulerPreflightResult(null);
      await handleToggleScheduler(true);
      return;
    }

    try {
      setValidatingSchedulerPreflight(true);
      const result = await validateAllFailoverV2Services();
      const flattened = flattenBulkValidationResult(
        result,
        t("failover_v2.scheduler.preflight_no_enabled_services_label", { defaultValue: "Enabled services" }),
        t("failover_v2.scheduler.preflight_no_enabled_services_message", { defaultValue: "No enabled V2 services will be scheduled." }),
      );
      if (!result.ok) {
        setSchedulerEnableConfirmOpen(false);
        setSchedulerPreflightResult(null);
        showValidationResult(
          t("failover_v2.scheduler.preflight_failed_title", { defaultValue: "Scheduler preflight failed" }),
          flattened,
        );
        return;
      }

      if (bulkValidationHasWarnings(result)) {
        setSchedulerPreflightResult(result);
        showValidationResult(
          t("failover_v2.scheduler.preflight_warning_title", { defaultValue: "Scheduler preflight warnings" }),
          flattened,
        );
        return;
      }

      setSchedulerEnableConfirmOpen(false);
      setSchedulerPreflightResult(null);
      await handleToggleScheduler(true);
    } catch (preflightError) {
      const message = preflightError instanceof Error ? preflightError.message : t("common.error", { defaultValue: "Error" });
      toast.error(message);
    } finally {
      setValidatingSchedulerPreflight(false);
    }
  }, [handleToggleScheduler, schedulerPreflightResult, showValidationResult, t]);

  if (loading) {
    return <Loading />;
  }

  if (!hasFeature("cloud_failover") || !hasFeature("cn_connectivity")) {
    return <Navigate to={getDefaultAdminPath(account)} replace />;
  }

  return (
    <>
      <AdminPageShell contentClassName="gap-3">
        <AdminSurface>
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Badge color="blue">
                {t("failover_v2.phase.title", { defaultValue: "Phase 2" })}
              </Badge>
              <span className="hidden font-medium text-slate-700 dark:text-slate-300 md:inline">
                {t("failover_v2.phase.badge", { defaultValue: "Expanded provider support" })}
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700 sm:inline-block" />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {t("failover_v2.stats.services", { defaultValue: "Services" })}: {services.length}
              </span>
              <span>
                {t("failover_v2.stats.enabled_services", { defaultValue: "Enabled" })}: {enabledServiceCount}
              </span>
              <span>
                {t("failover_v2.stats.members", { defaultValue: "Members" })}: {totalMemberCount}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              {platformAdmin ? (
                <div className="flex shrink-0 items-center justify-between gap-3 rounded-full border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                    <span>{t("failover_v2.scheduler.title", { defaultValue: "Automatic Scheduler" })}</span>
                    <Badge color={schedulerEnabled ? "green" : "amber"}>
                      {schedulerEnabled
                        ? t("failover_v2.scheduler.enabled", { defaultValue: "Enabled" })
                        : t("failover_v2.scheduler.disabled", { defaultValue: "Disabled" })}
                    </Badge>
                  </div>
                  <Switch
                    checked={schedulerEnabled}
                    disabled={schedulerEnableBusy || systemState.loading}
                    onCheckedChange={(checked) => {
                      handleRequestToggleScheduler(checked);
                    }}
                  />
                </div>
              ) : null}
              <Button size="sm" variant="outline" onClick={() => void loadServices()} disabled={loadingServices}>
                <RefreshCw className="mr-2 size-4" />
                {t("common.refresh", { defaultValue: "Refresh" })}
              </Button>
              <Button size="sm" variant="outline" onClick={openCreateServiceDialog}>
                <Plus className="mr-2 size-4" />
                {t("failover_v2.create_service", { defaultValue: "Create service" })}
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/admin/failover")}>
                {t("failover_v2.open_v1", { defaultValue: "Open V1" })}
              </Button>
            </div>
          </div>
        </AdminSurface>

        {error ? (
          <AdminSurface>
            <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/20 dark:text-red-300">
              {error}
            </div>
          </AdminSurface>
        ) : null}

        {!loadingServices && services.length === 0 ? (
          <AdminSurface>
            <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/80 px-5 py-6 dark:border-slate-700 dark:bg-slate-950/50">
              <div className="max-w-2xl space-y-3">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  {t("failover_v2.empty_title", { defaultValue: "No V2 services yet" })}
                </h2>
                <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {t("failover_v2.empty_description", {
                    defaultValue:
                      "Create your first isolated V2 service. Each service will later manage multiple line-bound members without affecting V1.",
                  })}
                </p>
                <Button onClick={openCreateServiceDialog}>
                  <Plus className="mr-2 size-4" />
                  {t("failover_v2.create_service", { defaultValue: "Create service" })}
                </Button>
              </div>
            </div>
          </AdminSurface>
        ) : null}

        {services.map((service) => {
          const serviceBusy = isFailoverV2ServiceBusy(service);
          const busyTitle = serviceBusy
            ? t("failover_v2.active_execution_action_disabled", {
              defaultValue: "Actions are disabled while this service has an active execution.",
            })
            : undefined;

          return (
            <AdminSurface key={service.id}>
              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                <div className="border-b border-slate-200/80 bg-slate-50/70 px-5 py-4 dark:border-slate-800/80 dark:bg-slate-900/35">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-50">
                        <span>{service.name}</span>
                        <Badge color={service.enabled ? "green" : "gray"}>
                          {service.enabled
                            ? t("common.enabled", { defaultValue: "Enabled" })
                            : t("common.disabled", { defaultValue: "Disabled" })}
                        </Badge>
                        <Badge color={getStatusBadgeColor(service.last_status || "unknown")}>
                          {service.last_status || t("common.unknown", { defaultValue: "Unknown" })}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>{service.dns_provider ? formatProviderLabel(service.dns_provider) : "-"} / {service.dns_entry_id || "-"}</span>
                        <span>{t("failover_v2.summary.delete_strategy", { defaultValue: "Delete strategy" })}: {service.delete_strategy || "-"}</span>
                      </div>
                      {service.last_message ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {service.last_message}
                        </p>
                      ) : null}
                      {serviceBusy ? (
                        <p className="text-xs font-medium text-sky-700 dark:text-sky-300">
                          {t("failover_v2.active_execution_notice", {
                            defaultValue: "An execution is active. Configuration and destructive actions are temporarily locked.",
                          })}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                      <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950/70">
                        <div className="text-right">
                          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {t("failover_v2.quick_service_toggle", { defaultValue: "Automatic scheduling" })}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {service.enabled
                              ? t("failover_v2.quick_toggle_active", { defaultValue: "Active" })
                              : t("failover_v2.quick_toggle_paused", { defaultValue: "Paused" })}
                          </div>
                        </div>
                        {togglingServiceID === service.id ? <LoaderCircle className="size-4 animate-spin text-slate-400" /> : null}
                        <Switch
                          checked={service.enabled}
                          disabled={serviceBusy || togglingServiceID === service.id}
                          onCheckedChange={(checked) => {
                            void handleToggleServiceEnabled(service, checked);
                          }}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openExecutionDialog(service, service.last_execution_id ?? null)}
                      >
                        {t("failover_v2.execution_history", { defaultValue: "Executions" })}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openPendingCleanupDialog(service)}>
                        {t("failover_v2.pending_cleanup_history", { defaultValue: "Pending cleanup" })}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleValidateExistingService(service)}
                        disabled={validatingServiceID === service.id}
                      >
                        {validatingServiceID === service.id ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
                        {t("failover_v2.validate", { defaultValue: "Validate" })}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openCreateMemberDialog(service)} disabled={serviceBusy} title={busyTitle}>
                        <Plus className="mr-2 size-4" />
                        {t("failover_v2.add_member", { defaultValue: "Add member" })}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEditServiceDialog(service)} disabled={serviceBusy} title={busyTitle}>
                        <PencilLine className="mr-2 size-4" />
                        {t("common.edit", { defaultValue: "Edit" })}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDeleteTarget({ kind: "service", service })} disabled={serviceBusy} title={busyTitle}>
                        <Trash2 className="mr-2 size-4" />
                        {t("common.delete", { defaultValue: "Delete" })}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950/70 dark:text-slate-300 dark:ring-slate-800">
                      {t("failover_v2.summary.members", { defaultValue: "Members" })}: {service.member_count}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950/70 dark:text-slate-300 dark:ring-slate-800">
                      {t("failover_v2.summary.enabled_members", { defaultValue: "Enabled members" })}: {service.enabled_member_count}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950/70 dark:text-slate-300 dark:ring-slate-800">
                      {t("failover_v2.summary.scripts", { defaultValue: "Scripts" })}: {service.script_clipboard_ids.length}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                  {service.members.length === 0 ? (
                    <div className="px-5 py-5 text-sm text-slate-500 dark:text-slate-400">
                      {t("failover_v2.no_members", {
                        defaultValue: "This service has no members yet.",
                      })}
                    </div>
                  ) : null}

                  {service.members.map((member) => {
                    const memberBusy = isFailoverV2MemberBusy(service, member);
                    const memberActionsDisabled = serviceBusy || memberBusy;
                    const memberBusyTitle = memberActionsDisabled
                      ? t("failover_v2.active_execution_action_disabled", {
                        defaultValue: "Actions are disabled while this service has an active execution.",
                      })
                      : undefined;

                    return (
                      <div
                        key={member.id}
                        className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(220px,0.8fr)_auto] lg:items-center"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                              {member.name || member.dns_line}
                            </span>
                            <Badge color={member.enabled ? "green" : "gray"}>
                              {member.enabled
                                ? t("common.enabled", { defaultValue: "Enabled" })
                                : t("common.disabled", { defaultValue: "Disabled" })}
                            </Badge>
                            <Badge color={getStatusBadgeColor(member.last_status || "unknown")}>
                              {member.last_status || t("common.unknown", { defaultValue: "Unknown" })}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {member.dns_line || "-"}
                          </div>
                        </div>

                        <div className="min-w-0 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <div>{formatMemberSubtitle(member) || "-"}</div>
                          <div>{member.current_address || t("failover_v2.no_current_ip", { defaultValue: "No current IP" })}</div>
                          {member.last_message ? <div className="truncate">{member.last_message}</div> : null}
                        </div>

                        <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50/80 px-3 py-2 ring-1 ring-slate-200 dark:bg-slate-900/50 dark:ring-slate-800">
                          <div className="space-y-1">
                            <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              {t("failover_v2.quick_member_toggle", { defaultValue: "Automatic checks" })}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {member.enabled
                                ? t("failover_v2.quick_toggle_active", { defaultValue: "Active" })
                                : t("failover_v2.quick_toggle_paused", { defaultValue: "Paused" })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {togglingMemberKey === `${service.id}:${member.id}` ? <LoaderCircle className="size-4 animate-spin text-slate-400" /> : null}
                            <Switch
                              checked={member.enabled}
                              disabled={memberActionsDisabled || togglingMemberKey === `${service.id}:${member.id}`}
                              onCheckedChange={(checked) => {
                                void handleToggleMemberEnabled(service, member, checked);
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <Button size="sm" onClick={() => setFailoverTarget({ service, member })} disabled={memberActionsDisabled} title={memberBusyTitle}>
                            <Play className="mr-2 size-4" />
                            {t("failover_v2.failover_now", { defaultValue: "Failover now" })}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setDetachTarget({ service, member })} disabled={memberActionsDisabled} title={memberBusyTitle}>
                            <LoaderCircle className="mr-2 size-4" />
                            {t("failover_v2.detach_dns", { defaultValue: "Detach DNS" })}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEditMemberDialog(service, member)} disabled={memberActionsDisabled} title={memberBusyTitle}>
                            <PencilLine className="mr-2 size-4" />
                            {t("common.edit", { defaultValue: "Edit" })}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setDeleteTarget({ kind: "member", service, member })} disabled={memberActionsDisabled} title={memberBusyTitle}>
                            <Trash2 className="mr-2 size-4" />
                            {t("common.delete", { defaultValue: "Delete" })}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </AdminSurface>
          );
        })}
      </AdminPageShell>

      <AlertDialog
        open={schedulerEnableConfirmOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !schedulerEnableBusy) {
            setSchedulerEnableConfirmOpen(false);
            setSchedulerPreflightResult(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {schedulerPreflightHasWarnings
                ? t("failover_v2.scheduler.enable_warning_confirm_title", { defaultValue: "Enable scheduler with warnings?" })
                : t("failover_v2.scheduler.enable_confirm_title", { defaultValue: "Enable V2 automatic scheduler?" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {schedulerPreflightHasWarnings
                ? t("failover_v2.scheduler.enable_warning_confirm_description", {
                  defaultValue: "Preflight passed with warnings. Review the validation result, then confirm again if you still want to enable automatic scheduling.",
                })
                : t("failover_v2.scheduler.enable_confirm_description", {
                  defaultValue: "V2 will automatically trigger failover for every enabled V2 service based on CN connectivity checks. V1 conflicts are blocked, but run one service manually first before enabling this globally.",
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={schedulerEnableBusy}>
              {t("common.cancel", { defaultValue: "Cancel" })}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmEnableScheduler()} disabled={schedulerEnableBusy}>
              {schedulerEnableBusy ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
              {validatingSchedulerPreflight
                ? t("failover_v2.scheduler.preflight_running", { defaultValue: "Running preflight" })
                : schedulerPreflightHasWarnings
                  ? t("failover_v2.scheduler.enable_with_warnings_action", { defaultValue: "Enable anyway" })
                  : t("failover_v2.scheduler.enable_confirm_action", { defaultValue: "Run preflight and enable" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(validationDialogTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setValidationDialogTarget(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {validationDialogTarget?.title || t("failover_v2.validation_title", { defaultValue: "Validation" })}
            </DialogTitle>
            <DialogDescription>
              {validationDialogTarget?.result.ok
                ? t("failover_v2.validation_passed_description", { defaultValue: "All blocking checks passed. Review warnings before enabling automation." })
                : t("failover_v2.validation_failed_description", { defaultValue: "Fix failed checks before saving or enabling V2 automation." })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {validationDialogTarget?.result.checks.map((check) => (
              <div
                key={check.key}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {check.label || check.key}
                    </div>
                    {check.message ? (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {check.message}
                      </div>
                    ) : null}
                  </div>
                  <Badge color={getValidationBadgeColor(check.status)}>
                    {check.status || "unknown"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setValidationDialogTarget(null)}>
              {t("common.close", { defaultValue: "Close" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="flex max-h-[88vh] max-w-4xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingService
                ? t("failover_v2.edit_service", { defaultValue: "Edit V2 service" })
                : t("failover_v2.create_service", { defaultValue: "Create V2 service" })}
            </DialogTitle>
            <DialogDescription>
              {t("failover_v2.service_dialog_description", {
                defaultValue: "This service owns the shared DNS target and script policy for its members.",
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 overflow-y-auto pr-1">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="v2-service-name">{t("common.name", { defaultValue: "Name" })}</Label>
                <Input
                  id="v2-service-name"
                  value={serviceForm.name}
                  onChange={(event) => setServiceForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                    {t("common.enabled", { defaultValue: "Enabled" })}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t("failover_v2.enabled_hint", {
                      defaultValue: "Disabled services are skipped by automatic scheduling. Manual actions remain available from the service card.",
                    })}
                  </div>
                </div>
                <Switch
                  checked={serviceForm.enabled}
                  onCheckedChange={(checked) => setServiceForm((current) => ({ ...current, enabled: checked }))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("failover_v2.dns_provider", { defaultValue: "DNS provider" })}</Label>
                <Select value={serviceForm.dns_provider} onValueChange={handleServiceDNSProviderChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FAILOVER_V2_DNS_PROVIDERS.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("failover_v2.dns_entry", { defaultValue: "DNS entry" })}</Label>
                {currentDnsEntries.length > 0 ? (
                  <Select
                    value={serviceForm.dns_entry_id}
                    onValueChange={(value) => setServiceForm((current) => ({ ...current, dns_entry_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("failover_v2.dns_entry_placeholder", {
                          defaultValue: `Choose a ${formatProviderLabel(serviceForm.dns_provider)} entry`,
                          provider: formatProviderLabel(serviceForm.dns_provider),
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {currentDnsEntries.map((entry) => (
                        <SelectItem key={entry.id} value={entry.id}>
                          {formatEntryLabel(entry)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={serviceForm.dns_entry_id}
                    onChange={(event) => setServiceForm((current) => ({ ...current, dns_entry_id: event.target.value }))}
                    placeholder={t("failover_v2.dns_entry_id_placeholder", {
                      defaultValue: `${formatProviderLabel(serviceForm.dns_provider)} entry id`,
                      provider: formatProviderLabel(serviceForm.dns_provider),
                    })}
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("failover_v2.dns_payload", { defaultValue: "DNS payload" })}</Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {normalizeProviderKey(serviceForm.dns_provider, FAILOVER_V2_DNS_PROVIDER) === "cloudflare"
                  ? t("failover_v2.dns_payload_hint_cloudflare", {
                    defaultValue: getServiceDNSPayloadHint(serviceForm.dns_provider),
                  })
                  : t("failover_v2.dns_payload_hint_aliyun", {
                    defaultValue: getServiceDNSPayloadHint(serviceForm.dns_provider),
                  })}
              </p>
              <Textarea
                className="min-h-40 font-mono text-xs"
                value={serviceForm.dns_payload}
                onChange={(event) => setServiceForm((current) => ({ ...current, dns_payload: event.target.value }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>{t("failover_v2.script_timeout", { defaultValue: "Script timeout" })}</Label>
                <Input
                  type="number"
                  min={1}
                  value={serviceForm.script_timeout_sec}
                  onChange={(event) => setServiceForm((current) => ({ ...current, script_timeout_sec: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("failover_v2.wait_agent_timeout", { defaultValue: "Wait agent timeout" })}</Label>
                <Input
                  type="number"
                  min={1}
                  value={serviceForm.wait_agent_timeout_sec}
                  onChange={(event) => setServiceForm((current) => ({ ...current, wait_agent_timeout_sec: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("failover_v2.delete_strategy", { defaultValue: "Delete strategy" })}</Label>
                <Select
                  value={serviceForm.delete_strategy}
                  onValueChange={(value) => setServiceForm((current) => ({ ...current, delete_strategy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keep">keep</SelectItem>
                    <SelectItem value="delete_after_success">delete_after_success</SelectItem>
                    <SelectItem value="delete_after_success_delay">delete_after_success_delay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("failover_v2.delete_delay", { defaultValue: "Delete delay" })}</Label>
                <Input
                  type="number"
                  min={0}
                  value={serviceForm.delete_delay_seconds}
                  onChange={(event) => setServiceForm((current) => ({ ...current, delete_delay_seconds: event.target.value }))}
                  disabled={serviceForm.delete_strategy !== "delete_after_success_delay"}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>{t("failover_v2.service_scripts", { defaultValue: "Scripts" })}</Label>
              {scripts.length === 0 ? (
                <div className="rounded-2xl border border-dashed px-4 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {t("failover_v2.no_scripts", { defaultValue: "No clipboard scripts available." })}
                </div>
              ) : (
                <div className="grid max-h-56 gap-3 overflow-y-auto rounded-2xl border p-4 md:grid-cols-2">
                  {scripts.map((script) => {
                    const checked = serviceForm.script_clipboard_ids.includes(script.id);
                    return (
                      <label
                        key={script.id}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3 text-sm dark:border-slate-800 dark:bg-slate-950/30"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(nextChecked) => handleServiceScriptToggle(script.id, Boolean(nextChecked))}
                        />
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-900 dark:text-slate-50">{script.name || `#${script.id}`}</span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">
                            {script.remark || `ID ${script.id}`}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceDialogOpen(false)} disabled={savingService}>
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button variant="outline" onClick={() => void handleValidateServiceForm()} disabled={savingService || validatingService}>
              {validatingService ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
              {t("failover_v2.validate", { defaultValue: "Validate" })}
            </Button>
            <Button onClick={() => void handleSaveService()} disabled={savingService || validatingService}>
              {savingService ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
              {editingService
                ? t("common.save", { defaultValue: "Save" })
                : t("common.create", { defaultValue: "Create" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent className="flex max-h-[88vh] max-w-4xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingMember
                ? t("failover_v2.edit_member", { defaultValue: "Edit V2 member" })
                : t("failover_v2.add_member", { defaultValue: "Add V2 member" })}
            </DialogTitle>
            <DialogDescription>
              {t("failover_v2.member_dialog_description", {
                defaultValue: "Each member maps one DNS line to one current outlet definition inside the selected service.",
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 overflow-y-auto pr-1">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("common.name", { defaultValue: "Name" })}</Label>
                <Input
                  value={memberForm.name}
                  onChange={(event) => setMemberForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                    {t("common.enabled", { defaultValue: "Enabled" })}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {memberDialogService?.name || "-"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t("failover_v2.member_enabled_hint", {
                      defaultValue: "Disabled members are skipped by automatic checks. Manual actions remain available from the member card.",
                    })}
                  </div>
                </div>
                <Switch
                  checked={memberForm.enabled}
                  onCheckedChange={(checked) => setMemberForm((current) => ({ ...current, enabled: checked }))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("failover_v2.watch_client", { defaultValue: "Current client" })}</Label>
                {currentNodeOptions.length > 0 ? (
                  <Select
                    value={memberForm.watch_client_uuid}
                    onValueChange={(value) => {
                      const nextAddress = findNodeAddress(nodes, value);
                      setMemberForm((current) => ({
                        ...current,
                        watch_client_uuid: value,
                        current_address: nextAddress || current.current_address,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("failover_v2.watch_client_placeholder", { defaultValue: "Choose a client" })} />
                    </SelectTrigger>
                    <SelectContent>
                      {currentNodeOptions.map((node) => (
                        <SelectItem key={node.uuid} value={node.uuid}>
                          {formatNodeLabel(node)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={memberForm.watch_client_uuid}
                    onChange={(event) => setMemberForm((current) => ({ ...current, watch_client_uuid: event.target.value }))}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>{t("failover_v2.current_address", { defaultValue: "Current address" })}</Label>
                <Input
                  value={memberForm.current_address}
                  onChange={(event) => setMemberForm((current) => ({ ...current, current_address: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>{t("failover_v2.dns_line", { defaultValue: "DNS line" })}</Label>
                <Input
                  value={memberForm.dns_line}
                  onChange={(event) => setMemberForm((current) => ({ ...current, dns_line: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("failover_v2.provider", { defaultValue: "Provider" })}</Label>
                <Select value={memberForm.provider} onValueChange={handleMemberProviderChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FAILOVER_V2_MEMBER_PROVIDERS.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 xl:col-span-2">
                <Label>{t("failover_v2.provider_entry", { defaultValue: "Provider entry" })}</Label>
                {currentProviderEntries.length > 0 ? (
                  <Select
                    value={memberForm.provider_entry_id}
                    onValueChange={(value) => setMemberForm((current) => ({ ...current, provider_entry_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("failover_v2.provider_entry_placeholder", {
                          defaultValue: `Choose a ${formatProviderLabel(memberForm.provider)} entry`,
                          provider: formatProviderLabel(memberForm.provider),
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {currentProviderEntries.map((entry) => (
                        <SelectItem key={entry.id} value={entry.id}>
                          {formatEntryLabel(entry)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={memberForm.provider_entry_id}
                    onChange={(event) => setMemberForm((current) => ({ ...current, provider_entry_id: event.target.value }))}
                    placeholder={t("failover_v2.provider_entry_id_placeholder", {
                      defaultValue: `${formatProviderLabel(memberForm.provider)} entry id`,
                      provider: formatProviderLabel(memberForm.provider),
                    })}
                  />
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>{t("failover_v2.priority", { defaultValue: "Priority" })}</Label>
                <Input
                  type="number"
                  min={1}
                  value={memberForm.priority}
                  onChange={(event) => setMemberForm((current) => ({ ...current, priority: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("failover_v2.failure_threshold", { defaultValue: "Failure threshold" })}</Label>
                <Input
                  type="number"
                  min={1}
                  value={memberForm.failure_threshold}
                  onChange={(event) => setMemberForm((current) => ({ ...current, failure_threshold: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("failover_v2.stale_after", { defaultValue: "Stale after" })}</Label>
                <Input
                  type="number"
                  min={1}
                  value={memberForm.stale_after_seconds}
                  onChange={(event) => setMemberForm((current) => ({ ...current, stale_after_seconds: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("failover_v2.cooldown", { defaultValue: "Cooldown" })}</Label>
                <Input
                  type="number"
                  min={0}
                  value={memberForm.cooldown_seconds}
                  onChange={(event) => setMemberForm((current) => ({ ...current, cooldown_seconds: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("failover_v2.plan_payload", { defaultValue: "Plan payload" })}</Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {normalizeProviderKey(memberForm.provider, FAILOVER_V2_MEMBER_PROVIDER) === "linode"
                  ? t("failover_v2.plan_payload_hint_linode", {
                    defaultValue: getMemberPlanPayloadHint(memberForm.provider),
                  })
                  : normalizeProviderKey(memberForm.provider, FAILOVER_V2_MEMBER_PROVIDER) === "aws"
                    ? t("failover_v2.plan_payload_hint_aws", {
                      defaultValue: getMemberPlanPayloadHint(memberForm.provider),
                    })
                    : t("failover_v2.plan_payload_hint_digitalocean", {
                      defaultValue: getMemberPlanPayloadHint(memberForm.provider),
                    })}
              </p>
              <Textarea
                className="min-h-32 font-mono text-xs"
                value={memberForm.plan_payload}
                onChange={(event) => setMemberForm((current) => ({ ...current, plan_payload: event.target.value }))}
              />
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                    {t("failover_v2.advanced_state_fields", { defaultValue: "Advanced state fields" })}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("failover_v2.advanced_state_fields_hint", {
                      defaultValue: "DNS record refs and current instance refs are V2 recovery anchors. Leave them unchanged unless you are importing or repairing state.",
                    })}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setMemberAdvancedOpen((current) => !current)}
                >
                  {memberAdvancedOpen
                    ? t("failover_v2.hide_advanced_fields", { defaultValue: "Hide advanced" })
                    : t("failover_v2.show_advanced_fields", { defaultValue: "Show advanced" })}
                </Button>
              </div>

              {memberAdvancedOpen ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("failover_v2.dns_record_refs", { defaultValue: "DNS record refs" })}</Label>
                    <Textarea
                      className="min-h-28 font-mono text-xs"
                      value={memberForm.dns_record_refs}
                      onChange={(event) => setMemberForm((current) => ({ ...current, dns_record_refs: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("failover_v2.current_instance_ref", { defaultValue: "Current instance ref" })}</Label>
                    <Textarea
                      className="min-h-32 font-mono text-xs"
                      value={memberForm.current_instance_ref}
                      onChange={(event) => setMemberForm((current) => ({ ...current, current_instance_ref: event.target.value }))}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberDialogOpen(false)} disabled={savingMember}>
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button variant="outline" onClick={() => void handleValidateMemberForm()} disabled={savingMember || validatingMember}>
              {validatingMember ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
              {t("failover_v2.validate", { defaultValue: "Validate" })}
            </Button>
            <Button onClick={() => void handleSaveMember()} disabled={savingMember || validatingMember}>
              {savingMember ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
              {editingMember
                ? t("common.save", { defaultValue: "Save" })
                : t("common.create", { defaultValue: "Create" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(nextOpen) => {
        if (!nextOpen && !deleting) {
          setDeleteTarget(null);
        }
      }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.kind === "service"
                ? t("failover_v2.delete_service_title", { defaultValue: "Delete V2 service?" })
                : t("failover_v2.delete_member_title", { defaultValue: "Delete V2 member?" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === "service"
                ? t("failover_v2.delete_service_description", {
                  defaultValue: "This only removes the isolated V2 configuration. It does not touch V1 tasks.",
                })
                : t("failover_v2.delete_member_description", {
                  defaultValue: "This only removes the selected V2 member definition.",
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {t("common.cancel", { defaultValue: "Cancel" })}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmDelete()} disabled={deleting}>
              {deleting ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
              {t("common.delete", { defaultValue: "Delete" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(detachTarget)} onOpenChange={(nextOpen) => {
        if (!nextOpen && !detachingDNS) {
          setDetachTarget(null);
        }
      }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("failover_v2.detach_dns", { defaultValue: "Detach DNS" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("failover_v2.detach_dns_description", {
                defaultValue: "This will immediately remove the selected member line from the configured DNS provider and mark the member as detached until later recovery.",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={detachingDNS}>
              {t("common.cancel", { defaultValue: "Cancel" })}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmDetachDNS()} disabled={detachingDNS}>
              {detachingDNS ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
              {detachingDNS
                ? t("failover_v2.detaching_dns", { defaultValue: "Detaching" })
                : t("failover_v2.detach_dns_confirm", { defaultValue: "Detach now" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(failoverTarget)} onOpenChange={(nextOpen) => {
        if (!nextOpen && !runningFailover) {
          setFailoverTarget(null);
        }
      }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("failover_v2.failover_now", { defaultValue: "Failover now" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("failover_v2.failover_now_description", {
                defaultValue: "This will detach the selected member line from DNS, create a replacement instance with the configured member provider, wait for the new agent, validate outlet connectivity, run service scripts, and then attach the new IP back to this line. The old instance is kept for now.",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={runningFailover}>
              {t("common.cancel", { defaultValue: "Cancel" })}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmFailover()} disabled={runningFailover}>
              {runningFailover ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
              {runningFailover
                ? t("failover_v2.failing_over", { defaultValue: "Starting" })
                : t("failover_v2.failover_confirm", { defaultValue: "Start failover" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(pendingCleanupDialogTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !loadingPendingCleanups) {
            setPendingCleanupDialogTarget(null);
            setPendingCleanups([]);
            setPendingCleanupError("");
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {t("failover_v2.pending_cleanup_history", { defaultValue: "Pending cleanup" })}
            </DialogTitle>
            <DialogDescription>
              {pendingCleanupDialogTarget
                ? `${pendingCleanupDialogTarget.service.name} · ${t("failover_v2.pending_cleanup_description", {
                  defaultValue: "Review leftover old-instance cleanup work, retry deletion, or mark items handled without affecting V1.",
                })}`
                : t("failover_v2.pending_cleanup_description", {
                  defaultValue: "Review leftover old-instance cleanup work, retry deletion, or mark items handled without affecting V1.",
                })}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {t("failover_v2.pending_cleanup_hint", {
                  defaultValue: "These are old instances V2 could not delete automatically. Retry removes the saved resource now; resolve closes the item after manual handling.",
                })}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => pendingCleanupDialogTarget && void loadPendingCleanupHistory(pendingCleanupDialogTarget.service)}
                disabled={!pendingCleanupDialogTarget || loadingPendingCleanups}
              >
                {loadingPendingCleanups ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
                {t("common.refresh", { defaultValue: "Refresh" })}
              </Button>
            </div>

            {pendingCleanupError ? (
              <div className="mb-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/20 dark:text-red-300">
                {pendingCleanupError}
              </div>
            ) : null}

            {loadingPendingCleanups && pendingCleanups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {t("failover_v2.pending_cleanup_loading", { defaultValue: "Loading pending cleanups..." })}
              </div>
            ) : null}

            {!loadingPendingCleanups && pendingCleanups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {t("failover_v2.pending_cleanup_empty", { defaultValue: "No pending cleanup items recorded for this service." })}
              </div>
            ) : null}

            <div className="space-y-3">
              {pendingCleanupDialogTarget && pendingCleanups.map((cleanup) => {
                const instanceRefBlock = formatJsonBlock(cleanup.instance_ref);
                return (
                  <div
                    key={cleanup.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {formatPendingCleanupLabel(cleanup)}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {findMemberLabel(pendingCleanupDialogTarget.service, cleanup.member_id)} · execution #{cleanup.execution_id || 0}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge color={getStatusBadgeColor(cleanup.status || "unknown")}>
                          {cleanup.status || t("common.unknown", { defaultValue: "Unknown" })}
                        </Badge>
                        <Badge color="gray">
                          {cleanup.provider || "-"} / {cleanup.resource_type || "-"} / {cleanup.resource_id || "-"}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t("failover_v2.pending_cleanup_attempts", { defaultValue: "Attempts" })}
                        </div>
                        <div className="mt-2 font-semibold text-slate-900 dark:text-slate-50">
                          {cleanup.attempt_count}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t("failover_v2.pending_cleanup_last_attempt", { defaultValue: "Last attempt" })}
                        </div>
                        <div className="mt-2 font-semibold text-slate-900 dark:text-slate-50">
                          {formatTimestamp(cleanup.last_attempted_at)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t("failover_v2.pending_cleanup_next_retry", { defaultValue: "Next retry" })}
                        </div>
                        <div className="mt-2 font-semibold text-slate-900 dark:text-slate-50">
                          {formatTimestamp(cleanup.next_retry_at)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t("failover_v2.pending_cleanup_resolved_at", { defaultValue: "Resolved" })}
                        </div>
                        <div className="mt-2 font-semibold text-slate-900 dark:text-slate-50">
                          {formatTimestamp(cleanup.resolved_at)}
                        </div>
                      </div>
                    </div>

                    {cleanup.last_error ? (
                      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
                        {cleanup.last_error}
                      </div>
                    ) : null}

                    {instanceRefBlock ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t("failover_v2.pending_cleanup_instance_ref", { defaultValue: "Saved instance ref" })}
                        </div>
                        <pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs text-slate-700 dark:text-slate-200">
                          {instanceRefBlock}
                        </pre>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => setPendingCleanupActionTarget({
                          action: "retry",
                          serviceID: pendingCleanupDialogTarget.service.id,
                          cleanupID: cleanup.id,
                        })}
                        disabled={!cleanup.available_actions?.retry.available}
                      >
                        {t("failover_v2.pending_cleanup_retry", { defaultValue: "Retry cleanup" })}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPendingCleanupActionTarget({
                          action: "resolve",
                          serviceID: pendingCleanupDialogTarget.service.id,
                          cleanupID: cleanup.id,
                        })}
                        disabled={!cleanup.available_actions?.mark_resolved.available}
                      >
                        {t("failover_v2.pending_cleanup_resolve", { defaultValue: "Mark resolved" })}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPendingCleanupActionTarget({
                          action: "mark_manual_review",
                          serviceID: pendingCleanupDialogTarget.service.id,
                          cleanupID: cleanup.id,
                        })}
                        disabled={!cleanup.available_actions?.mark_manual_review.available}
                      >
                        {t("failover_v2.pending_cleanup_manual_review", { defaultValue: "Manual review" })}
                      </Button>
                      {cleanup.execution_id > 0 ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setPendingCleanupDialogTarget(null);
                            openExecutionDialog(pendingCleanupDialogTarget.service, cleanup.execution_id);
                          }}
                        >
                          {t("failover_v2.pending_cleanup_open_execution", { defaultValue: "Open execution" })}
                        </Button>
                      ) : null}
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {!cleanup.available_actions?.retry.available && cleanup.available_actions?.retry.reason ? (
                        <div>{cleanup.available_actions.retry.reason}</div>
                      ) : null}
                      {!cleanup.available_actions?.mark_resolved.available && cleanup.available_actions?.mark_resolved.reason ? (
                        <div>{cleanup.available_actions.mark_resolved.reason}</div>
                      ) : null}
                      {!cleanup.available_actions?.mark_manual_review.available && cleanup.available_actions?.mark_manual_review.reason ? (
                        <div>{cleanup.available_actions.mark_manual_review.reason}</div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingCleanupDialogTarget(null)}
              disabled={loadingPendingCleanups}
            >
              {t("common.close", { defaultValue: "Close" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(executionDialogTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !loadingExecutions && !loadingExecutionDetail) {
            setExecutionDialogTarget(null);
            setExecutionSummaries([]);
            setSelectedExecutionID(null);
            setSelectedExecution(null);
            setExecutionError("");
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-6xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {t("failover_v2.execution_history", { defaultValue: "Executions" })}
            </DialogTitle>
            <DialogDescription>
              {executionDialogTarget
                ? `${executionDialogTarget.service.name} · ${t("failover_v2.execution_history_description", {
                  defaultValue: "Review V2 execution history and per-step details without touching V1.",
                })}`
                : t("failover_v2.execution_history_description", {
                  defaultValue: "Review V2 execution history and per-step details without touching V1.",
                })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {t("failover_v2.execution_list", { defaultValue: "History" })}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => executionDialogTarget && void loadExecutionHistory(executionDialogTarget.service, selectedExecutionID)}
                  disabled={!executionDialogTarget || loadingExecutions}
                >
                  {loadingExecutions ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
                  {t("common.refresh", { defaultValue: "Refresh" })}
                </Button>
              </div>

              {loadingExecutions && executionSummaries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {t("failover_v2.execution_loading", { defaultValue: "Loading executions..." })}
                </div>
              ) : null}

              {!loadingExecutions && executionSummaries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {t("failover_v2.execution_empty", { defaultValue: "No executions recorded yet." })}
                </div>
              ) : null}

              <div className="space-y-2">
                {executionDialogTarget && executionSummaries.map((execution) => (
                  <button
                    key={execution.id}
                    type="button"
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                      execution.id === selectedExecutionID
                        ? "border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-slate-700"
                    }`}
                    onClick={() => handleSelectExecution(execution.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {findMemberLabel(executionDialogTarget.service, execution.member_id)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          #{execution.id} · {execution.trigger_reason || t("failover_v2.execution_manual", { defaultValue: "manual" })}
                        </div>
                      </div>
                      <Badge color={getStatusBadgeColor(execution.status || "unknown")}>
                        {execution.status || t("common.unknown", { defaultValue: "Unknown" })}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {formatTimestamp(execution.started_at)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
              {executionError ? (
                <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/20 dark:text-red-300">
                  {executionError}
                </div>
              ) : null}

              {loadingExecutionDetail ? (
                <div className="flex min-h-52 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                  {t("failover_v2.execution_loading_detail", { defaultValue: "Loading execution details..." })}
                </div>
              ) : null}

              {!loadingExecutionDetail && !executionError && !selectedExecution ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {t("failover_v2.execution_select_hint", { defaultValue: "Select an execution to inspect its timeline." })}
                </div>
              ) : null}

              {!loadingExecutionDetail && selectedExecution && executionDialogTarget ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                        {findMemberLabel(executionDialogTarget.service, selectedExecution.member_id)}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        #{selectedExecution.id} · {selectedExecution.trigger_reason || t("failover_v2.execution_manual", { defaultValue: "manual" })}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge color={getStatusBadgeColor(selectedExecution.status || "unknown")}>
                        {selectedExecution.status || t("common.unknown", { defaultValue: "Unknown" })}
                      </Badge>
                      <Badge color={getStatusBadgeColor(selectedExecution.detach_dns_status || "pending")}>
                        detach:{selectedExecution.detach_dns_status || "pending"}
                      </Badge>
                      <Badge color={getStatusBadgeColor(selectedExecution.attach_dns_status || "pending")}>
                        attach:{selectedExecution.attach_dns_status || "pending"}
                      </Badge>
                      <Badge color={getStatusBadgeColor(selectedExecution.cleanup_status || "pending")}>
                        cleanup:{selectedExecution.cleanup_status || "pending"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t("failover_v2.execution_started", { defaultValue: "Started" })}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {formatTimestamp(selectedExecution.started_at)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t("failover_v2.execution_finished", { defaultValue: "Finished" })}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {formatTimestamp(selectedExecution.finished_at)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t("failover_v2.execution_old_client", { defaultValue: "Old client" })}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {selectedExecution.old_client_uuid || "-"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t("failover_v2.execution_new_client", { defaultValue: "New client" })}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {selectedExecution.new_client_uuid || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 dark:border-red-900/60 dark:bg-red-950/20">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {t("failover_v2.stop_execution", { defaultValue: "Stop Execution" })}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {t("failover_v2.stop_execution_hint", {
                          defaultValue: "Stop the active V2 execution and prevent it from continuing to later steps. Already completed work is not reverted automatically.",
                        })}
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExecutionActionTarget({
                            action: "stop",
                            serviceID: executionDialogTarget.service.id,
                            executionID: selectedExecution.id,
                          })}
                          disabled={!selectedExecution.available_actions?.stop.available}
                        >
                          {t("failover_v2.stop_execution", { defaultValue: "Stop Execution" })}
                        </Button>
                        {!selectedExecution.available_actions?.stop.available && selectedExecution.available_actions?.stop.reason ? (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {selectedExecution.available_actions.stop.reason}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {t("failover_v2.retry_attach_dns", { defaultValue: "Retry Attach DNS" })}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {t("failover_v2.retry_attach_dns_hint", {
                          defaultValue: "Reuse the saved replacement IPs and attach this member line back to DNS. No new instance will be created.",
                        })}
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <Button
                          size="sm"
                          onClick={() => setExecutionActionTarget({
                            action: "retry_attach_dns",
                            serviceID: executionDialogTarget.service.id,
                            executionID: selectedExecution.id,
                          })}
                          disabled={!selectedExecution.available_actions?.retry_attach_dns.available}
                        >
                          {t("failover_v2.retry_attach_dns", { defaultValue: "Retry Attach DNS" })}
                        </Button>
                        {!selectedExecution.available_actions?.retry_attach_dns.available && selectedExecution.available_actions?.retry_attach_dns.reason ? (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {selectedExecution.available_actions.retry_attach_dns.reason}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {t("failover_v2.retry_cleanup", { defaultValue: "Retry Cleanup" })}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {t("failover_v2.retry_cleanup_hint", {
                          defaultValue: "Retry deletion of the saved old instance without touching DNS or provisioning another machine.",
                        })}
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExecutionActionTarget({
                            action: "retry_cleanup",
                            serviceID: executionDialogTarget.service.id,
                            executionID: selectedExecution.id,
                          })}
                          disabled={!selectedExecution.available_actions?.retry_cleanup.available}
                        >
                          {t("failover_v2.retry_cleanup", { defaultValue: "Retry Cleanup" })}
                        </Button>
                        {!selectedExecution.available_actions?.retry_cleanup.available && selectedExecution.available_actions?.retry_cleanup.reason ? (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {selectedExecution.available_actions.retry_cleanup.reason}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {selectedExecution.error_message ? (
                    <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/20 dark:text-red-300">
                      {selectedExecution.error_message}
                    </div>
                  ) : null}

                  <div className="grid gap-4 xl:grid-cols-2">
                    {[
                      [t("failover_v2.execution_block_trigger_snapshot", { defaultValue: "Trigger snapshot" }), formatJsonBlock(selectedExecution.trigger_snapshot)],
                      [t("failover_v2.execution_block_old_instance", { defaultValue: "Old instance" }), formatJsonBlock(selectedExecution.old_instance_ref)],
                      [t("failover_v2.execution_block_old_addresses", { defaultValue: "Old addresses" }), formatJsonBlock(selectedExecution.old_addresses)],
                      [t("failover_v2.execution_block_detach_dns_result", { defaultValue: "Detach DNS result" }), formatJsonBlock(selectedExecution.detach_dns_result)],
                      [t("failover_v2.execution_block_new_instance", { defaultValue: "New instance" }), formatJsonBlock(selectedExecution.new_instance_ref)],
                      [t("failover_v2.execution_block_new_addresses", { defaultValue: "New addresses" }), formatJsonBlock(selectedExecution.new_addresses)],
                      [t("failover_v2.execution_block_attach_dns_result", { defaultValue: "Attach DNS result" }), formatJsonBlock(selectedExecution.attach_dns_result)],
                      [t("failover_v2.execution_block_cleanup_result", { defaultValue: "Cleanup result" }), formatJsonBlock(selectedExecution.cleanup_result)],
                    ].map(([label, content]) => content ? (
                      <div
                        key={label}
                        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30"
                      >
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {label}
                        </div>
                        <pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs text-slate-700 dark:text-slate-200">
                          {content}
                        </pre>
                      </div>
                    ) : null)}
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {t("failover_v2.execution_steps", { defaultValue: "Steps" })}
                    </div>
                    {selectedExecution.steps.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        {t("failover_v2.execution_steps_empty", { defaultValue: "No step records yet." })}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedExecution.steps.map((step) => {
                          const detailBlock = formatJsonBlock(step.detail);
                          return (
                            <div
                              key={step.id}
                              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                                    {step.step_label || step.step_key}
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {step.step_key || "-"} · {formatTimestamp(step.started_at)}{" -> "}{formatTimestamp(step.finished_at)}
                                  </div>
                                </div>
                                <Badge color={getStatusBadgeColor(step.status || "pending")}>
                                  {step.status || "pending"}
                                </Badge>
                              </div>
                              {step.message ? (
                                <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                                  {step.message}
                                </div>
                              ) : null}
                              {detailBlock ? (
                                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                                  {detailBlock}
                                </pre>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExecutionDialogTarget(null)}
              disabled={loadingExecutions || loadingExecutionDetail}
            >
              {t("common.close", { defaultValue: "Close" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pendingCleanupActionTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !retryingPendingCleanup && !resolvingPendingCleanup && !markingPendingCleanupReview) {
            setPendingCleanupActionTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingCleanupActionTarget?.action === "retry"
                ? t("failover_v2.pending_cleanup_retry_confirm_title", { defaultValue: "Retry this pending cleanup?" })
                : pendingCleanupActionTarget?.action === "resolve"
                ? t("failover_v2.pending_cleanup_resolve_confirm_title", { defaultValue: "Mark this pending cleanup resolved?" })
                : t("failover_v2.pending_cleanup_manual_review_confirm_title", { defaultValue: "Send this cleanup to manual review?" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCleanupActionTarget?.action === "retry"
                ? t("failover_v2.pending_cleanup_retry_confirm_description", {
                  defaultValue: "This will retry deletion of the saved old instance now. It does not create a new machine or change DNS.",
                })
                : pendingCleanupActionTarget?.action === "resolve"
                ? t("failover_v2.pending_cleanup_resolve_confirm_description", {
                  defaultValue: "Use this after the old instance was handled manually outside V2 and you only need to close the cleanup item.",
                })
                : t("failover_v2.pending_cleanup_manual_review_confirm_description", {
                  defaultValue: "This stops automatic retry attempts for the item and leaves it visible for manual follow-up.",
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={retryingPendingCleanup || resolvingPendingCleanup || markingPendingCleanupReview}>
              {t("common.cancel", { defaultValue: "Cancel" })}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmPendingCleanupAction()}
              disabled={retryingPendingCleanup || resolvingPendingCleanup || markingPendingCleanupReview}
            >
              {retryingPendingCleanup || resolvingPendingCleanup || markingPendingCleanupReview ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : null}
              {pendingCleanupActionTarget?.action === "retry"
                ? t("failover_v2.pending_cleanup_retry", { defaultValue: "Retry cleanup" })
                : pendingCleanupActionTarget?.action === "resolve"
                ? t("failover_v2.pending_cleanup_resolve", { defaultValue: "Mark resolved" })
                : t("failover_v2.pending_cleanup_manual_review", { defaultValue: "Manual review" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(executionActionTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !stoppingExecution && !retryingAttachDNS && !retryingCleanup) {
            setExecutionActionTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {executionActionTarget?.action === "stop"
                ? t("failover_v2.stop_execution_confirm_title", { defaultValue: "Stop this execution?" })
                : executionActionTarget?.action === "retry_cleanup"
                ? t("failover_v2.retry_cleanup_confirm_title", { defaultValue: "Retry old instance cleanup?" })
                : t("failover_v2.retry_attach_dns_confirm_title", { defaultValue: "Retry DNS attach?" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {executionActionTarget?.action === "stop"
                ? t("failover_v2.stop_execution_confirm_description", {
                  defaultValue: "This will stop the selected active V2 execution. It prevents later steps from continuing, but it does not undo work that has already completed.",
                })
                : executionActionTarget?.action === "retry_cleanup"
                ? t("failover_v2.retry_cleanup_confirm_description", {
                  defaultValue: "This will retry deletion of the saved old instance for the selected execution. It will not touch DNS.",
                })
                : t("failover_v2.retry_attach_dns_confirm_description", {
                  defaultValue: "This will retry attaching the saved replacement IP back to this member line. It will not provision another instance.",
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={stoppingExecution || retryingAttachDNS || retryingCleanup}>
              {t("common.cancel", { defaultValue: "Cancel" })}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmExecutionAction()} disabled={stoppingExecution || retryingAttachDNS || retryingCleanup}>
              {stoppingExecution || retryingAttachDNS || retryingCleanup ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
              {executionActionTarget?.action === "stop"
                ? t("failover_v2.stop_execution", { defaultValue: "Stop Execution" })
                : executionActionTarget?.action === "retry_cleanup"
                ? t("failover_v2.retry_cleanup", { defaultValue: "Retry Cleanup" })
                : t("failover_v2.retry_attach_dns", { defaultValue: "Retry Attach DNS" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

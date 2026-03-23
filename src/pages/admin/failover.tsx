import React from "react";
import { Navigate } from "react-router-dom";
import {
  ChevronDown,
  Eye,
  LoaderCircle,
  PencilLine,
  Play,
  Plus,
  RefreshCw,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCloudProviderEntries, type CloudProviderCredentialEntry } from "@/lib/cloud";
import {
  createFailoverTask,
  deleteFailoverTask,
  getFailoverDnsCatalog,
  getFailoverPlanCatalog,
  getFailoverExecution,
  getFailoverNodes,
  getFailoverScripts,
  getFailoverTask,
  getFailoverTasks,
  isFailoverExecutionActive,
  normalizeProviderEntryID,
  runFailoverTask,
  toggleFailoverTask,
  updateFailoverTask,
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
import { getDefaultAdminPath, useAccount } from "@/contexts/AccountContext";
import type { TFunction } from "i18next";

type TaskFormState = {
  name: string;
  enabled: boolean;
  failure_threshold: string;
  stale_after_seconds: string;
  cooldown_seconds: string;
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
  action_type: string;
  payload: string;
  auto_connect_group: string;
  script_clipboard_id: string;
  script_timeout_sec: string;
  wait_agent_timeout_sec: string;
};

type ProviderEntriesMap = Record<string, CloudProviderCredentialEntry[]>;

type ProviderEntryOption = {
  id: string;
  label: string;
  disabled?: boolean;
};

type EntryValues = Record<string, unknown>;

type EditorStep = "task" | "dns" | "plans";

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

const ACTION_TYPE_VALUES: Record<string, string[]> = {
  aws: ["provision_instance", "rebind_public_ip"],
  digitalocean: ["provision_instance"],
  linode: ["provision_instance"],
};

const EDITOR_STEPS: EditorStep[] = ["task", "dns", "plans"];
const DNS_RECORD_TYPE_VALUES = ["A"] as const;
const AWS_SERVICE_VALUES = ["ec2", "lightsail"] as const;
const DNS_TTL_OPTIONS = [60, 120, 300, 600, 900, 1800, 3600, 7200] as const;

function isDnsRecordType(value: string): value is (typeof DNS_RECORD_TYPE_VALUES)[number] {
  return DNS_RECORD_TYPE_VALUES.includes(value as (typeof DNS_RECORD_TYPE_VALUES)[number]);
}

function getStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getBooleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function getNumberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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

function getDeleteStrategyOptions(t: TFunction) {
  return DELETE_STRATEGY_VALUES.map((value) => ({
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

function getPlanProviderOptions(t: TFunction, providerEntries: ProviderEntriesMap) {
  return PLAN_PROVIDER_VALUES.map((value) => ({
    value,
    label: getPlanProviderLabel(t, value),
    disabled: (providerEntries[value] || []).length === 0,
  }));
}

function getActionTypeLabel(t: TFunction, value: string) {
  return t(`failover.action_type.${value}`, {
    defaultValue:
      value === "rebind_public_ip"
        ? "Rebind public IP"
        : value === "provision_instance"
          ? "Provision instance"
          : humanizeStatus(value),
  });
}

function getActionTypeOptions(t: TFunction, provider: string) {
  const values = ACTION_TYPE_VALUES[provider] || [];
  return values.map((value) => ({
    value,
    label: getActionTypeLabel(t, value),
  }));
}

function normalizeAWSService(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return AWS_SERVICE_VALUES.includes(normalized as (typeof AWS_SERVICE_VALUES)[number]) ? normalized : "ec2";
}

function formatCatalogOptionLabel(option: { label: string; hint?: string }) {
  return option.hint ? `${option.label} · ${option.hint}` : option.label;
}

function formatDnsTTLLabel(ttl: number) {
  return `${ttl} 秒`;
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

function getDNSTTLOptions(currentValue: string) {
  const options = DNS_TTL_OPTIONS.map((value) => ({
    value: String(value),
    label: formatDnsTTLLabel(value),
  }));
  return buildSelectableDnsOptions(options, currentValue);
}

function localizeAliyunLineLabel(value: string, fallback?: string) {
  const normalized = String(value || "").trim().toLowerCase();
  switch (normalized) {
    case "default":
      return "默认";
    case "telecom":
      return "电信";
    case "unicom":
      return "联通";
    case "mobile":
      return "移动";
    case "edu":
      return "教育网";
    case "oversea":
      return "境外";
    case "search":
      return "搜索引擎";
    case "school":
      return "校园网";
    default:
      return String(fallback || value || "").trim() || normalized;
  }
}

function getAliyunLineOptions(catalog: FailoverDnsCatalog | null, currentValue: string) {
  const normalizedOptions = (catalog?.lines || []).map((option) => ({
    value: option.value,
    label: localizeAliyunLineLabel(option.value, option.label),
  }));
  return buildSelectableDnsOptions(normalizedOptions, currentValue || "default");
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

function defaultPlanPayload(provider: string, actionType: string) {
  if (provider === "aws") {
    if (actionType === "rebind_public_ip") {
      return {
        service: "ec2",
        region: "",
        instance_id: "",
        private_ip: "",
        instance_name: "",
        static_ip_name: "",
      };
    }

    return {
      service: "ec2",
      region: "",
      image_id: "",
      instance_type: "",
      key_name: "",
      subnet_id: "",
      assign_public_ip: true,
      availability_zone: "",
      blueprint_id: "",
      bundle_id: "",
      key_pair_name: "",
    };
  }

  if (provider === "digitalocean") {
    return {
      region: "",
      size: "",
      image: "",
    };
  }

  if (provider === "linode") {
    return {
      region: "",
      type: "",
      image: "",
    };
  }

  return {};
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
    const service = normalizeAWSService(payload.service);
    requirePlanField(t, index, t("failover.editor.region", { defaultValue: "Region" }), payload.region);
    if (service === "ec2") {
      requirePlanField(t, index, t("failover.editor.instance_id", { defaultValue: "Instance ID" }), payload.instance_id);
      return;
    }
    requirePlanField(t, index, t("failover.editor.instance_name", { defaultValue: "Instance name" }), payload.instance_name);
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

function numberOrDefault(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function compareString(left: string, right: string) {
  return left.localeCompare(right, "zh-CN", { sensitivity: "base" });
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
    if (normalized === "skipped") return "outline";
    return "secondary";
  }

  return "secondary";
}

function normalizeEntries(entries: CloudProviderCredentialEntry[]) {
  return entries.map((entry) => ({
    ...entry,
    id: normalizeProviderEntryID(String(entry.id || "")),
  }));
}

function buildProviderEntryOptions(args: {
  entries: CloudProviderCredentialEntry[];
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
  };
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
  return nextState;
}

function dnsRecordSummary(record: FailoverDnsRecordOption) {
  const left = record.name || joinRecordName(record.domain_name, record.rr);
  const right = [record.type, record.value].filter(Boolean).join(" · ");
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
    };
  }

  return {
    ...defaults,
    dns_domain_name: getStringValue(raw.domain_name) || defaults.dns_domain_name,
    dns_rr: getStringValue(raw.rr) || defaults.dns_rr,
    dns_record_type: normalizeDnsRecordType(getStringValue(raw.record_type)) || defaults.dns_record_type,
    dns_ttl: String(getNumberValue(raw.ttl, numberOrDefault(defaults.dns_ttl, 600))),
    dns_line: getStringValue(raw.line) || defaults.dns_line,
  };
}

function createEmptyPlanForm(providerEntries: ProviderEntriesMap): PlanFormState {
  const defaultProvider = getFirstConfiguredProvider(providerEntries, PLAN_PROVIDER_VALUES);
  const providerOptions = buildProviderEntryOptions({
    entries: providerEntries[defaultProvider] || [],
    includeActive: true,
  });
  const defaultActionType = (ACTION_TYPE_VALUES[defaultProvider] || [])[0] || "";

  return {
    local_id: createLocalID(),
    name: "",
    priority: "1",
    enabled: true,
    provider: defaultProvider,
    provider_entry_id: providerOptions[0]?.id || "",
    action_type: defaultActionType,
    payload: prettyJson(defaultPlanPayload(defaultProvider, defaultActionType)),
    auto_connect_group: "",
    script_clipboard_id: "",
    script_timeout_sec: "600",
    wait_agent_timeout_sec: "600",
  };
}

function createEmptyTaskForm(providerEntries: ProviderEntriesMap): TaskFormState {
  const defaultProvider = "";
  const dnsOptions = buildProviderEntryOptions({
    entries: providerEntries[defaultProvider] || [],
  });
  const defaultEntryID = dnsOptions[0]?.id || "";
  const dnsDefaults = buildDefaultDnsFields(defaultProvider, providerEntries, defaultEntryID);

  return {
    name: "",
    enabled: true,
    failure_threshold: "2",
    stale_after_seconds: "300",
    cooldown_seconds: "1800",
    dns_provider: defaultProvider,
    dns_entry_id: defaultEntryID,
    ...dnsDefaults,
    delete_strategy: "keep",
    delete_delay_seconds: "0",
    plans: [createEmptyPlanForm(providerEntries)],
  };
}

function taskToForm(task: FailoverTask, providerEntries: ProviderEntriesMap): TaskFormState {
  const dnsFields = parseDnsPayloadFields(task, providerEntries);

  return {
    name: task.name,
    enabled: task.enabled,
    failure_threshold: String(task.failure_threshold || 2),
    stale_after_seconds: String(task.stale_after_seconds || 300),
    cooldown_seconds: String(task.cooldown_seconds || 1800),
    dns_provider: task.dns_provider,
    dns_entry_id: normalizeProviderEntryID(task.dns_entry_id),
    ...dnsFields,
    delete_strategy: task.delete_strategy || "keep",
    delete_delay_seconds: String(task.delete_delay_seconds || 0),
    plans: task.plans.length > 0
      ? task.plans.map((plan) => ({
          local_id: createLocalID(),
          name: plan.name,
          priority: String(plan.priority || 1),
          enabled: plan.enabled,
          provider: plan.provider,
          provider_entry_id: normalizeProviderEntryID(plan.provider_entry_id),
          action_type: plan.action_type,
          payload: prettyJson(plan.payload),
          auto_connect_group: plan.auto_connect_group,
          script_clipboard_id:
            plan.script_clipboard_id && plan.script_clipboard_id > 0
              ? String(plan.script_clipboard_id)
              : "",
          script_timeout_sec: String(plan.script_timeout_sec || 600),
          wait_agent_timeout_sec: String(plan.wait_agent_timeout_sec || 600),
        }))
      : [createEmptyPlanForm(providerEntries)],
  };
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
  if (formState.plans.length === 0) {
    throw new Error(
      t("failover.validation.plan_required", {
        defaultValue: "At least one failover plan is required",
      }),
    );
  }

  const dnsProvider = String(formState.dns_provider || "").trim();
  const dnsRecordType = "A";
  const dnsTTL = numberOrDefault(formState.dns_ttl, 0);
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

  const plans: FailoverPlanInput[] = formState.plans.map((plan, index) => {
    if (!plan.provider.trim()) {
      throw new Error(
        t("failover.validation.plan_provider_required", {
          defaultValue: "Plan {{index}} requires a cloud provider",
          index: index + 1,
        }),
      );
    }
    if (!plan.action_type.trim()) {
      throw new Error(
        t("failover.validation.plan_action_required", {
          defaultValue: "Plan {{index}} requires an action type",
          index: index + 1,
        }),
      );
    }
    if (!plan.provider_entry_id.trim()) {
      throw new Error(
        t("failover.validation.plan_provider_entry_required", {
          defaultValue: "Plan {{index}} requires a provider entry",
          index: index + 1,
        }),
      );
    }

    const planPayload = parsePlanPayloadObject(plan.payload);
    validatePlanPayload(t, index, plan.provider, plan.action_type, planPayload);

    return {
      name: plan.name.trim(),
      priority: numberOrDefault(plan.priority, index + 1),
      enabled: plan.enabled,
      provider: plan.provider,
      provider_entry_id: normalizeProviderEntryID(plan.provider_entry_id.trim()),
      action_type: plan.action_type,
      payload: planPayload,
      auto_connect_group: plan.auto_connect_group.trim(),
      script_clipboard_id: plan.script_clipboard_id
        ? numberOrDefault(plan.script_clipboard_id, 0)
        : null,
      script_timeout_sec: numberOrDefault(plan.script_timeout_sec, 600),
      wait_agent_timeout_sec: numberOrDefault(plan.wait_agent_timeout_sec, 600),
    };
  });

  const dnsPayload =
    dnsProvider === "cloudflare"
      ? {
          zone_name: formState.dns_zone_name.trim(),
          record_name: formState.dns_record_name.trim(),
          record_type: dnsRecordType,
          ttl: dnsTTL,
          proxied: formState.dns_proxied,
        }
      : dnsProvider === "aliyun"
        ? {
          domain_name: formState.dns_domain_name.trim(),
          rr: formState.dns_rr.trim() || "@",
          record_type: dnsRecordType,
          ttl: dnsTTL,
          line: formState.dns_line.trim() || "default",
        }
        : {};

  return {
    name: taskName,
    enabled: formState.enabled,
    failure_threshold: numberOrDefault(formState.failure_threshold, 2),
    stale_after_seconds: numberOrDefault(formState.stale_after_seconds, 300),
    cooldown_seconds: numberOrDefault(formState.cooldown_seconds, 1800),
    dns_provider: dnsProvider,
    dns_entry_id: dnsProvider ? normalizeProviderEntryID(formState.dns_entry_id.trim()) : "",
    dns_payload: dnsPayload,
    delete_strategy: formState.delete_strategy,
    delete_delay_seconds: numberOrDefault(formState.delete_delay_seconds, 0),
    plans,
  };
}

function TaskMetricCard({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-muted/20 p-4", className)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-3 space-y-2 text-sm">{children}</div>
    </div>
  );
}

function JsonBlock({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </div>
      <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs leading-6 text-slate-800 dark:text-slate-200">
        {prettyJson(value, "null")}
      </pre>
    </div>
  );
}

function ExecutionDetailDialog({
  executionID,
  taskName,
  open,
  onOpenChange,
}: {
  executionID: number | null;
  taskName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [execution, setExecution] = React.useState<FailoverExecution | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("failover.execution.title", { defaultValue: "Execution details" })}
          </DialogTitle>
          <DialogDescription>
            {taskName || t("failover.execution.description", { defaultValue: "Track failover progress, script results, and DNS changes." })}
          </DialogDescription>
        </DialogHeader>

        {loading && !execution ? <Loading /> : null}

        {!loading && error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {execution ? (
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Card className="gap-4 py-4">
                <CardHeader className="px-4 pb-0">
                  <CardTitle className="text-sm">{t("failover.execution.status", { defaultValue: "Execution status" })}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pt-0">
                  <Badge variant={getStatusVariant(execution.status, "execution")}>{getStatusLabel(t, execution.status)}</Badge>
                  <div className="mt-2 text-xs text-muted-foreground">{formatDateTime(execution.started_at)}</div>
                </CardContent>
              </Card>
              <Card className="gap-4 py-4">
                <CardHeader className="px-4 pb-0">
                  <CardTitle className="text-sm">{t("failover.execution.script", { defaultValue: "Script" })}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pt-0 space-y-2">
                  <Badge variant={getStatusVariant(execution.script_status, "script")}>{getStatusLabel(t, execution.script_status)}</Badge>
                  <div className="text-xs text-muted-foreground">
                    {execution.script_name_snapshot || t("failover.execution.no_script", { defaultValue: "No script recorded" })}
                  </div>
                  {execution.script_exit_code !== null ? (
                    <div className="text-xs text-muted-foreground">
                      {t("failover.execution.exit_code", {
                        defaultValue: "Exit code: {{code}}",
                        code: execution.script_exit_code,
                      })}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
              <Card className="gap-4 py-4">
                <CardHeader className="px-4 pb-0">
                  <CardTitle className="text-sm">{t("failover.execution.dns", { defaultValue: "DNS" })}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pt-0">
                  <Badge variant={getStatusVariant(execution.dns_status, "dns")}>{getStatusLabel(t, execution.dns_status)}</Badge>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {execution.dns_provider ? getDnsProviderLabel(t, execution.dns_provider) : "-"}
                  </div>
                </CardContent>
              </Card>
              <Card className="gap-4 py-4">
                <CardHeader className="px-4 pb-0">
                  <CardTitle className="text-sm">{t("failover.execution.cleanup", { defaultValue: "Cleanup" })}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pt-0">
                  <Badge variant={getStatusVariant(execution.cleanup_status, "cleanup")}>{getStatusLabel(t, execution.cleanup_status)}</Badge>
                  <div className="mt-2 text-xs text-muted-foreground">{formatDateTime(execution.finished_at)}</div>
                </CardContent>
              </Card>
            </div>

            <Card className="gap-4 py-4">
              <CardHeader className="px-4 pb-0">
                <CardTitle>{t("failover.execution.timeline", { defaultValue: "Timeline" })}</CardTitle>
                <CardDescription>
                  {t("failover.execution.timeline_hint", { defaultValue: "Each step is persisted by the backend so you can see exactly where a run failed." })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pt-0">
                {execution.steps.length === 0 ? (
                  <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                    {t("failover.execution.steps_empty", { defaultValue: "No step data is available yet." })}
                  </div>
                ) : (
                  execution.steps.map((step) => (
                    <div key={step.id} className="rounded-lg border px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getStatusVariant(step.status, "execution")}>{getStatusLabel(t, step.status)}</Badge>
                        <div className="font-medium text-slate-900 dark:text-slate-50">{step.step_label || step.step_key}</div>
                        <div className="text-xs text-muted-foreground">#{step.sort}</div>
                      </div>
                      {step.message ? (
                        <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">{step.message}</div>
                      ) : null}
                      <div className="mt-2 text-xs text-muted-foreground">
                        {formatDateTime(step.started_at)}
                        {step.finished_at ? ` → ${formatDateTime(step.finished_at)}` : ""}
                      </div>
                      {step.detail !== null && step.detail !== undefined && step.detail !== "" ? (
                        <pre className="mt-3 max-h-48 overflow-auto rounded-md bg-muted/40 p-3 text-xs leading-6">
                          {prettyJson(step.detail, "null")}
                        </pre>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {execution.script_output ? (
              <Card className="gap-4 py-4">
                <CardHeader className="px-4 pb-0">
                  <CardTitle>{t("failover.execution.script_output", { defaultValue: "Script output" })}</CardTitle>
                  <CardDescription>
                    {execution.script_output_truncated
                      ? t("failover.execution.script_output_truncated", { defaultValue: "The backend truncated this output for storage safety." })
                      : t("failover.execution.script_output_full", { defaultValue: "Captured task output from the target agent." })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pt-0">
                  <pre className="max-h-80 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs leading-6">{execution.script_output}</pre>
                </CardContent>
              </Card>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
              <JsonBlock title={t("failover.execution.trigger_snapshot", { defaultValue: "Trigger snapshot" })} value={execution.trigger_snapshot} />
              <JsonBlock title={t("failover.execution.attempted_plans", { defaultValue: "Attempted plans" })} value={execution.attempted_plans} />
              <JsonBlock title={t("failover.execution.new_instance", { defaultValue: "New instance" })} value={execution.new_instance_ref} />
              <JsonBlock title={t("failover.execution.new_addresses", { defaultValue: "New addresses" })} value={execution.new_addresses} />
              <JsonBlock title={t("failover.execution.dns_result", { defaultValue: "DNS result" })} value={execution.dns_result} />
              <JsonBlock title={t("failover.execution.cleanup_result", { defaultValue: "Cleanup result" })} value={execution.cleanup_result} />
            </div>

            {execution.error_message ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                {execution.error_message}
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => void loadExecution()} disabled={!executionID || loading}>
            <RefreshCw className={cn("size-4", loading ? "animate-spin" : "")} />
            {t("common.refresh", { defaultValue: "Refresh" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskEditorDialog({
  open,
  task,
  nodes,
  scripts,
  providerEntries,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  task: FailoverTask | null;
  nodes: FailoverNodeOption[];
  scripts: FailoverScriptOption[];
  providerEntries: ProviderEntriesMap;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = React.useState(false);
  const [formState, setFormState] = React.useState<TaskFormState>(() => createEmptyTaskForm(providerEntries));
  const [editorStep, setEditorStep] = React.useState<EditorStep>("task");
  const [selectedPlanID, setSelectedPlanID] = React.useState("");
  const [showTaskAdvanced, setShowTaskAdvanced] = React.useState(false);
  const [showDnsAdvanced, setShowDnsAdvanced] = React.useState(false);
  const [showPlanOptional, setShowPlanOptional] = React.useState(false);
  const [showPlanAdvanced, setShowPlanAdvanced] = React.useState(false);
  const [dnsCatalog, setDnsCatalog] = React.useState<FailoverDnsCatalog | null>(null);
  const [dnsCatalogLoading, setDnsCatalogLoading] = React.useState(false);
  const [dnsCatalogError, setDnsCatalogError] = React.useState("");
  const [selectedDnsRecordKey, setSelectedDnsRecordKey] = React.useState("");
  const [planCatalog, setPlanCatalog] = React.useState<FailoverPlanCatalog | null>(null);
  const [planCatalogLoading, setPlanCatalogLoading] = React.useState(false);
  const [planCatalogError, setPlanCatalogError] = React.useState("");
  const lastEnabledDnsRef = React.useRef<{ provider: string; entryID: string } | null>(null);
  const dnsCatalogRequestRef = React.useRef(0);
  const planCatalogRequestRef = React.useRef(0);

  React.useEffect(() => {
    if (!open) {
      return;
    }
    const nextFormState = task ? taskToForm(task, providerEntries) : createEmptyTaskForm(providerEntries);
    const hasTaskAdvanced =
      nextFormState.failure_threshold !== "2"
      || nextFormState.stale_after_seconds !== "300"
      || nextFormState.cooldown_seconds !== "1800";
    const hasDnsAdvanced =
      nextFormState.delete_strategy !== "keep"
      || nextFormState.delete_delay_seconds !== "0";
    const hasPlanOptional = nextFormState.plans.some((plan) =>
      Boolean(plan.auto_connect_group.trim() || plan.script_clipboard_id),
    );
    const hasPlanAdvanced = nextFormState.plans.some((plan, index) =>
      plan.priority !== String(index + 1)
      || plan.script_timeout_sec !== "600"
      || plan.wait_agent_timeout_sec !== "600"
    );
    setFormState(nextFormState);
    setEditorStep("task");
    setSelectedPlanID(nextFormState.plans[0]?.local_id || "");
    setShowTaskAdvanced(Boolean(task && hasTaskAdvanced));
    setShowDnsAdvanced(Boolean(task && hasDnsAdvanced));
    setShowPlanOptional(Boolean(task && hasPlanOptional));
    setShowPlanAdvanced(Boolean(task && hasPlanAdvanced));
    setDnsCatalog(null);
    setDnsCatalogError("");
    setSelectedDnsRecordKey("");
    setPlanCatalog(null);
    setPlanCatalogError("");
    lastEnabledDnsRef.current = nextFormState.dns_provider
      ? {
          provider: nextFormState.dns_provider,
          entryID: nextFormState.dns_entry_id,
        }
      : null;
  }, [open, providerEntries, task]);

  const nodeLookup = React.useMemo(
    () => new Map(nodes.map((node) => [node.uuid, node])),
    [nodes],
  );
  const currentOutletNode = React.useMemo(
    () => {
      const currentClientUUID = task?.current_client_uuid || task?.watch_client_uuid || "";
      return currentClientUUID ? nodeLookup.get(currentClientUUID) || null : null;
    },
    [nodeLookup, task?.current_client_uuid, task?.watch_client_uuid],
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
  const selectedPlan = React.useMemo(
    () => formState.plans.find((plan) => plan.local_id === selectedPlanID) || formState.plans[0] || null,
    [formState.plans, selectedPlanID],
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
  const dnsCatalogRecords = React.useMemo(
    () => (dnsCatalog?.records || []).filter((record) => normalizeDnsRecordType(record.type) === "A"),
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
    () => getDNSTTLOptions(formState.dns_ttl),
    [formState.dns_ttl],
  );
  const aliyunLineOptions = React.useMemo(
    () => getAliyunLineOptions(dnsCatalog, formState.dns_line),
    [dnsCatalog, formState.dns_line],
  );
  const hasDnsEnabled = Boolean(formState.dns_provider.trim());
  const firstConfiguredDnsProvider = React.useMemo(
    () => getFirstConfiguredProvider(providerEntries, DNS_PROVIDER_VALUES),
    [providerEntries],
  );
  const hasAnyDnsCredential = Boolean(firstConfiguredDnsProvider);
  const hasMultiplePlans = formState.plans.length > 1;
  const stepIndex = EDITOR_STEPS.indexOf(editorStep);
  const isLastStep = stepIndex === EDITOR_STEPS.length - 1;

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
    if (!open || editorStep !== "dns") {
      return;
    }
    if (!formState.dns_entry_id.trim()) {
      setDnsCatalog(null);
      setDnsCatalogError("");
      setDnsCatalogLoading(false);
      return;
    }
    void refreshDnsCatalog();
  }, [open, editorStep, formState.dns_provider, formState.dns_entry_id, refreshDnsCatalog]);

  const updateTaskField = <K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) => {
    setFormState((current) => ({ ...current, [key]: value }));
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

  const updatePlan = (localID: string, updater: (plan: PlanFormState) => PlanFormState) => {
    setFormState((current) => ({
      ...current,
      plans: current.plans.map((plan) => (plan.local_id === localID ? updater(plan) : plan)),
    }));
  };

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

  const refreshPlanCatalog = React.useCallback(async (overrides?: { service?: string; region?: string }) => {
    if (!selectedPlan?.provider.trim() || !selectedPlan.provider_entry_id.trim()) {
      setPlanCatalog(null);
      setPlanCatalogError("");
      return;
    }

    const requestID = planCatalogRequestRef.current + 1;
    planCatalogRequestRef.current = requestID;
    setPlanCatalogLoading(true);
    setPlanCatalogError("");
    try {
      const catalog = await getFailoverPlanCatalog({
        provider: selectedPlan.provider,
        entry_id: normalizeProviderEntryID(selectedPlan.provider_entry_id),
        action_type: selectedPlan.action_type,
        service: overrides?.service || selectedPlanService,
        region: overrides?.region || selectedPlanRegion,
      });
      if (planCatalogRequestRef.current !== requestID) {
        return;
      }
      setPlanCatalog(catalog);
      if (!selectedPlanRegion.trim() && catalog.region) {
        updateSelectedPlanPayload((current) => ({
          ...current,
          region: catalog.region,
        }));
      }
    } catch (error) {
      if (planCatalogRequestRef.current !== requestID) {
        return;
      }
      setPlanCatalog(null);
      setPlanCatalogError(error instanceof Error ? error.message : t("common.unknown_error"));
    } finally {
      if (planCatalogRequestRef.current === requestID) {
        setPlanCatalogLoading(false);
      }
    }
  }, [
    selectedPlan,
    selectedPlanRegion,
    selectedPlanService,
    t,
    updateSelectedPlanPayload,
  ]);

  React.useEffect(() => {
    if (!open || editorStep !== "plans" || !selectedPlan?.provider.trim() || !selectedPlan.provider_entry_id.trim()) {
      setPlanCatalog(null);
      setPlanCatalogError("");
      setPlanCatalogLoading(false);
      return;
    }
    void refreshPlanCatalog();
  }, [
    open,
    editorStep,
    selectedPlan?.provider,
    selectedPlan?.provider_entry_id,
    selectedPlan?.action_type,
    selectedPlanService,
    selectedPlanRegion,
    refreshPlanCatalog,
  ]);

  const addPlan = () => {
    const nextPlan = {
      ...createEmptyPlanForm(providerEntries),
      priority: String(formState.plans.length + 1),
    };
    setFormState((current) => ({
      ...current,
      plans: [...current.plans, nextPlan],
    }));
    setSelectedPlanID(nextPlan.local_id);
  };

  const removePlan = (localID: string) => {
    setFormState((current) => ({
      ...current,
      plans: current.plans.filter((plan) => plan.local_id !== localID),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const payload = buildTaskInput(formState, t);
      if (task) {
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

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!isLastStep) {
      event.preventDefault();
      setEditorStep(EDITOR_STEPS[Math.min(stepIndex + 1, EDITOR_STEPS.length - 1)]);
      return;
    }
    void handleSubmit(event);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[calc(100vw-2rem)] max-w-4xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>
            {task
              ? t("failover.editor.edit_title", { defaultValue: "Edit failover task" })
              : t("failover.editor.create_title", { defaultValue: "Create failover task" })}
          </DialogTitle>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleFormSubmit}>
          <Tabs
            value={editorStep}
            onValueChange={(value) => setEditorStep(value as EditorStep)}
            className="flex min-h-0 flex-1 flex-col gap-0"
          >
            <div className="border-b px-5 py-3">
              <TabsList className="grid h-auto w-full grid-cols-3 gap-2 bg-transparent p-0">
                <TabsTrigger
                  value="task"
                  className="h-auto rounded-lg border px-3 py-2 text-xs data-[state=active]:border-primary data-[state=active]:bg-primary/5 sm:text-sm"
                >
                  {t("failover.editor.step_task", { defaultValue: "1. Task" })}
                </TabsTrigger>
                <TabsTrigger
                  value="dns"
                  className="h-auto rounded-lg border px-3 py-2 text-xs data-[state=active]:border-primary data-[state=active]:bg-primary/5 sm:text-sm"
                >
                  {t("failover.editor.step_dns", { defaultValue: "2. DNS" })}
                </TabsTrigger>
                <TabsTrigger
                  value="plans"
                  className="h-auto rounded-lg border px-3 py-2 text-xs data-[state=active]:border-primary data-[state=active]:bg-primary/5 sm:text-sm"
                >
                  {t("failover.editor.step_plans", { defaultValue: "3. Plans" })}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-5">
              <TabsContent value="task" className="mt-0 space-y-5">
                <div className="space-y-4 rounded-xl border px-4 py-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                      {t("failover.editor.basics", { defaultValue: "Task basics" })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("failover.editor.basics_hint", {
                        defaultValue: "Create the task first. The current outlet will be filled after the first successful initialization or failover.",
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="space-y-2">
                      <Label htmlFor="failover-name">{t("common.name", { defaultValue: "Name" })}</Label>
                      <Input
                        id="failover-name"
                        value={formState.name}
                        onChange={(event) => updateTaskField("name", event.target.value)}
                        placeholder={t("failover.editor.name_placeholder", { defaultValue: "CN failover for production edge" })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-muted/20 px-4 py-3">
                    <div className="min-w-0 space-y-1">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                        {t("failover.editor.enabled", { defaultValue: "Task enabled" })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("failover.editor.enabled_hint", {
                          defaultValue: "Disabled tasks stay saved but will not run automatically.",
                        })}
                      </div>
                    </div>
                    <Switch
                      checked={formState.enabled}
                      onCheckedChange={(checked) => updateTaskField("enabled", Boolean(checked))}
                    />
                  </div>
                  <div className="rounded-xl border bg-background px-4 py-3">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                      {t("failover.editor.current_outlet", { defaultValue: "Current outlet" })}
                    </div>
                    {task?.current_client_uuid || task?.current_address ? (
                      <div className="mt-2 space-y-1 text-sm">
                        <div className="font-medium text-slate-900 dark:text-slate-50">
                          {currentOutletNode ? getNodeLabel(currentOutletNode) : task.current_client_uuid || task.current_address}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {task.current_address
                            ? `${t("failover.editor.current_ip", { defaultValue: "IP" })}: ${task.current_address}`
                            : t("failover.editor.current_ip_empty", { defaultValue: "IP not recorded yet." })}
                        </div>
                        {task.current_client_uuid ? (
                          <div className="text-xs text-muted-foreground">
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

                <Collapsible
                  open={showTaskAdvanced}
                  onOpenChange={setShowTaskAdvanced}
                  className="rounded-xl border"
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex h-auto w-full items-center justify-between rounded-xl px-4 py-3 text-left hover:bg-muted/20"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                          {t("failover.editor.show_task_advanced", {
                            defaultValue: "Advanced monitoring settings",
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("failover.editor.show_task_advanced_hint", {
                            defaultValue: "Failure threshold, stale timeout, and cooldown usually do not need changes.",
                          })}
                        </div>
                      </div>
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-muted-foreground transition-transform",
                          showTaskAdvanced ? "rotate-180" : "",
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
                </Collapsible>
              </TabsContent>

              <TabsContent value="dns" className="mt-0 space-y-5">
                <div className="space-y-4 rounded-xl border px-4 py-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                      {t("failover.editor.dns", { defaultValue: "DNS and cleanup" })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("failover.editor.dns_hint", {
                        defaultValue: "Select the DNS credential, then choose an existing record or fill the structured fields below.",
                      })}
                    </div>
                  </div>
                  <div className="rounded-xl bg-muted/20 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                          {t("failover.editor.dns_enabled", { defaultValue: "Enable DNS switching" })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {hasDnsEnabled
                            ? t("failover.editor.dns_enabled_hint", {
                                defaultValue: "This task will update the configured DNS record after the new outlet is ready.",
                              })
                            : t("failover.editor.no_dns_hint", {
                                defaultValue: "This task will skip DNS switching and only create or replace the outlet IP.",
                              })}
                        </div>
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
                            setFormState((current) => fillDnsFieldsFromRecord(current, record));
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
                                {dnsRecordSummary(record)}
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
                        <Label>{t("failover.editor.record_type", { defaultValue: "Record type" })}</Label>
                        <Input value="A" readOnly className="bg-muted/30" />
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
                          placeholder="@ / www / api"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("failover.editor.record_type", { defaultValue: "Record type" })}</Label>
                        <Input value="A" readOnly className="bg-muted/30" />
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
                        <Select
                          value={formState.dns_line || "default"}
                          onValueChange={(value) => updateTaskField("dns_line", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {aliyunLineOptions.map((line) => (
                              <SelectItem key={line.value} value={line.value}>
                                {line.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : null}
                </div>
                <Collapsible
                  open={showDnsAdvanced}
                  onOpenChange={setShowDnsAdvanced}
                  className="rounded-xl border"
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex h-auto w-full items-center justify-between rounded-xl px-4 py-3 text-left hover:bg-muted/20"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                          {t("failover.editor.show_dns_advanced", {
                            defaultValue: "Advanced DNS settings",
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("failover.editor.show_dns_advanced_hint", {
                            defaultValue: "Cleanup behavior belongs here. DNS record fields above should cover normal usage.",
                          })}
                        </div>
                      </div>
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-muted-foreground transition-transform",
                          showDnsAdvanced ? "rotate-180" : "",
                        )}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t px-4 py-4">
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
                              {getDeleteStrategyOptions(t).map((option) => (
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
                  </CollapsibleContent>
                </Collapsible>
              </TabsContent>

              <TabsContent value="plans" className="mt-0 space-y-5">
                {selectedPlan ? (
                  <>
                    <div className="space-y-4 rounded-xl border px-4 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                          {t("failover.editor.plans", { defaultValue: "Failover plans" })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("failover.editor.plans_hint", {
                            defaultValue: "Each plan is one fallback path. Keep the core fields first, then expand only if needed.",
                          })}
                        </div>
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
                              {t("failover.editor.single_plan_hint", {
                                defaultValue: "Start with one plan. Add a backup plan only when you need a second fallback path.",
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
                          <div className="text-xs text-muted-foreground">
                            {t("failover.editor.selected_plan_hint", {
                              defaultValue: "Use multiple plans only when you really need backup paths.",
                            })}
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

                    <div className="space-y-4 rounded-xl border px-4 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                          {t("failover.editor.plan_core", { defaultValue: "Plan core fields" })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("failover.editor.plan_core_hint", {
                            defaultValue: "A plan usually only needs cloud, credential, and action type.",
                          })}
                        </div>
                      </div>
	                      <div className="grid gap-4 lg:grid-cols-2">
	                        <div className="space-y-2">
	                          <Label>{t("cloud.title", { defaultValue: "Cloud" })}</Label>
	                          <Select
	                            value={selectedPlan.provider || undefined}
	                            onValueChange={(value) => {
	                              const nextActionOptions = ACTION_TYPE_VALUES[value] || [];
	                              const nextEntryOptions = buildProviderEntryOptions({
	                                entries: providerEntries[value] || [],
	                                includeActive: true,
	                                activeLabel: t("failover.provider_entry.active", {
	                                  defaultValue: "Active credential",
	                                }),
	                              });
	                              const nextActionType = nextActionOptions[0] || "";
	                              updatePlan(selectedPlan.local_id, (current) => ({
	                                ...current,
	                                provider: value,
	                                action_type: nextActionType,
	                                provider_entry_id: nextEntryOptions[0]?.id || "",
	                                payload: prettyJson(defaultPlanPayload(value, nextActionType)),
	                              }));
	                            }}
	                          >
	                            <SelectTrigger>
	                              <SelectValue placeholder={t("failover.editor.plan_provider_placeholder", { defaultValue: "Choose a cloud provider" })} />
	                            </SelectTrigger>
	                            <SelectContent>
	                              {getPlanProviderOptions(t, providerEntries).map((option) => (
	                                <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
	                                  {option.label}
	                                </SelectItem>
	                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t("failover.editor.provider_entry", { defaultValue: "Preferred credential" })}</Label>
                          {(() => {
                            const providerOptions = buildProviderEntryOptions({
	                              entries: providerEntries[selectedPlan.provider] || [],
	                              includeActive: true,
	                              currentValue: selectedPlan.provider_entry_id,
                              activeLabel: t("failover.provider_entry.active", {
                                defaultValue: "Active credential",
                              }),
                            });
	                            if (providerOptions.length === 0) {
	                              return (
	                                <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
	                                  {t("failover.editor.provider_entry_missing", {
	                                    defaultValue: "No cloud credential is configured for this provider yet.",
	                                  })}
	                                </div>
	                              );
	                            }
	                            return (
	                              <Select
	                                value={selectedPlan.provider_entry_id || undefined}
	                                onValueChange={(value) => updatePlan(selectedPlan.local_id, (current) => ({ ...current, provider_entry_id: value }))}
	                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {providerOptions.map((option) => (
                                    <SelectItem key={option.id} value={option.id}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            );
                          })()}
                          <div className="text-xs text-muted-foreground">
                            {t("failover.editor.provider_entry_hint", {
                              defaultValue: "Choose the preferred credential first. If it is unavailable, Komari will automatically try other credentials from the same provider.",
                            })}
                          </div>
                        </div>
	                        <div className="space-y-2 lg:col-span-2">
	                          <Label>{t("failover.editor.action_type", { defaultValue: "Action type" })}</Label>
	                          <Select
	                            value={selectedPlan.action_type || undefined}
	                            onValueChange={(value) => updatePlan(selectedPlan.local_id, (current) => ({
	                              ...current,
	                              action_type: value,
	                              payload: prettyJson(defaultPlanPayload(current.provider, value)),
	                            }))}
	                          >
	                            <SelectTrigger>
	                              <SelectValue placeholder={t("failover.editor.action_type_placeholder", { defaultValue: "Choose an action" })} />
	                            </SelectTrigger>
	                            <SelectContent>
	                              {getActionTypeOptions(t, selectedPlan.provider).map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-xl border px-4 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                          {t("failover.editor.plan_config", { defaultValue: "Instance configuration" })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("failover.editor.plan_config_hint", {
                            defaultValue: "Choose the region, image, and instance size here. The backend will generate the payload for you.",
                          })}
                        </div>
                      </div>

                      {planCatalogLoading ? (
                        <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                          {t("failover.editor.loading_plan_catalog", { defaultValue: "Loading provider configuration options..." })}
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
                      ) : !selectedPlan.provider_entry_id ? (
                        <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                          {t("failover.editor.plan_provider_entry_required_hint", {
                            defaultValue: "Choose a preferred credential first.",
                          })}
                        </div>
                      ) : null}

                      {!planCatalogLoading && planCatalog ? (
                        <>
                      {selectedPlan.provider === "aws" && selectedPlan.action_type === "provision_instance" ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-2">
                            <Label>{t("failover.editor.aws_service", { defaultValue: "AWS service" })}</Label>
                            <Select
                              value={selectedPlanService}
                              onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                ...defaultPlanPayload("aws", selectedPlan.action_type),
                                ...current,
                                service: value,
                                region: "",
                              }))}
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
                            {(planCatalog?.regions || []).length > 0 ? (
                              <Select
                                value={selectedPlanRegion || undefined}
                                onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  region: value,
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("failover.editor.region_placeholder", { defaultValue: "Choose a region" })} />
                                </SelectTrigger>
                                <SelectContent>
                                  {planCatalog?.regions?.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {formatCatalogOptionLabel(option)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={selectedPlanRegion}
                                onChange={(event) => updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  region: event.target.value,
                                }))}
                                placeholder="us-east-1"
                              />
                            )}
                          </div>

                          {selectedPlanService === "ec2" ? (
                            <>
                              <div className="space-y-2">
                                <Label>{t("failover.editor.image", { defaultValue: "Image" })}</Label>
                                {(planCatalog?.images || []).length > 0 ? (
                                  <Select
                                    value={getStringValue(selectedPlanPayload.image_id) || undefined}
                                    onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      image_id: value,
                                    }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={t("failover.editor.image_placeholder", { defaultValue: "Choose an image" })} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {planCatalog?.images?.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {formatCatalogOptionLabel(option)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    value={getStringValue(selectedPlanPayload.image_id)}
                                    onChange={(event) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      image_id: event.target.value,
                                    }))}
                                    placeholder="ami-..."
                                  />
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>{t("failover.editor.instance_type", { defaultValue: "Instance type" })}</Label>
                                {(planCatalog?.instance_types || []).length > 0 ? (
                                  <Select
                                    value={getStringValue(selectedPlanPayload.instance_type) || undefined}
                                    onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      instance_type: value,
                                    }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={t("failover.editor.instance_type_placeholder", { defaultValue: "Choose an instance type" })} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {planCatalog?.instance_types?.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {formatCatalogOptionLabel(option)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    value={getStringValue(selectedPlanPayload.instance_type)}
                                    onChange={(event) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      instance_type: event.target.value,
                                    }))}
                                    placeholder="t3.small"
                                  />
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>{t("failover.editor.subnet", { defaultValue: "Subnet" })}</Label>
                                {(planCatalog?.subnets || []).length > 0 ? (
                                  <Select
                                    value={getStringValue(selectedPlanPayload.subnet_id) || undefined}
                                    onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      subnet_id: value,
                                    }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={t("failover.editor.subnet_placeholder", { defaultValue: "Choose a subnet" })} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {planCatalog?.subnets?.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {formatCatalogOptionLabel(option)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    value={getStringValue(selectedPlanPayload.subnet_id)}
                                    onChange={(event) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      subnet_id: event.target.value,
                                    }))}
                                    placeholder="subnet-..."
                                  />
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>{t("failover.editor.key_pair", { defaultValue: "Key pair" })}</Label>
                                {(planCatalog?.key_pairs || []).length > 0 ? (
                                  <Select
                                    value={getStringValue(selectedPlanPayload.key_name) || "__none"}
                                    onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      key_name: value === "__none" ? "" : value,
                                    }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none">{t("failover.editor.no_key_pair", { defaultValue: "No key pair" })}</SelectItem>
                                      {planCatalog?.key_pairs?.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {formatCatalogOptionLabel(option)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    value={getStringValue(selectedPlanPayload.key_name)}
                                    onChange={(event) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      key_name: event.target.value,
                                    }))}
                                    placeholder={t("failover.editor.no_key_pair", { defaultValue: "No key pair" })}
                                  />
                                )}
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
                                {(planCatalog?.blueprints || []).length > 0 ? (
                                  <Select
                                    value={getStringValue(selectedPlanPayload.blueprint_id) || undefined}
                                    onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      blueprint_id: value,
                                    }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={t("failover.editor.blueprint_placeholder", { defaultValue: "Choose a blueprint" })} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {planCatalog?.blueprints?.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {formatCatalogOptionLabel(option)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    value={getStringValue(selectedPlanPayload.blueprint_id)}
                                    onChange={(event) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      blueprint_id: event.target.value,
                                    }))}
                                    placeholder="ubuntu_24_04"
                                  />
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>{t("failover.editor.bundle", { defaultValue: "Bundle" })}</Label>
                                {(planCatalog?.bundles || []).length > 0 ? (
                                  <Select
                                    value={getStringValue(selectedPlanPayload.bundle_id) || undefined}
                                    onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      bundle_id: value,
                                    }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={t("failover.editor.bundle_placeholder", { defaultValue: "Choose a bundle" })} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {planCatalog?.bundles?.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {formatCatalogOptionLabel(option)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    value={getStringValue(selectedPlanPayload.bundle_id)}
                                    onChange={(event) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      bundle_id: event.target.value,
                                    }))}
                                    placeholder="micro_3_0"
                                  />
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>{t("failover.editor.key_pair", { defaultValue: "Key pair" })}</Label>
                                {(planCatalog?.key_pairs || []).length > 0 ? (
                                  <Select
                                    value={getStringValue(selectedPlanPayload.key_pair_name) || "__none"}
                                    onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      key_pair_name: value === "__none" ? "" : value,
                                    }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none">{t("failover.editor.no_key_pair", { defaultValue: "No key pair" })}</SelectItem>
                                      {planCatalog?.key_pairs?.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {formatCatalogOptionLabel(option)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    value={getStringValue(selectedPlanPayload.key_pair_name)}
                                    onChange={(event) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      key_pair_name: event.target.value,
                                    }))}
                                    placeholder={t("failover.editor.no_key_pair", { defaultValue: "No key pair" })}
                                  />
                                )}
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
                              onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                ...defaultPlanPayload("aws", selectedPlan.action_type),
                                ...current,
                                service: value,
                                region: "",
                              }))}
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
                            {(planCatalog?.regions || []).length > 0 ? (
                              <Select
                                value={selectedPlanRegion || undefined}
                                onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  region: value,
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("failover.editor.region_placeholder", { defaultValue: "Choose a region" })} />
                                </SelectTrigger>
                                <SelectContent>
                                  {planCatalog?.regions?.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {formatCatalogOptionLabel(option)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={selectedPlanRegion}
                                onChange={(event) => updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  region: event.target.value,
                                }))}
                                placeholder="us-east-1"
                              />
                            )}
                          </div>
                          {selectedPlanService === "ec2" ? (
                            <>
                              <div className="space-y-2">
                                <Label>{t("failover.editor.instance_id", { defaultValue: "Instance ID" })}</Label>
                                {(planCatalog?.instances || []).length > 0 ? (
                                  <Select
                                    value={getStringValue(selectedPlanPayload.instance_id) || undefined}
                                    onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      instance_id: value,
                                      private_ip: "",
                                    }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={t("failover.editor.instance_name", { defaultValue: "Choose an instance" })} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {planCatalog?.instances?.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {formatCatalogOptionLabel(option)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                    {t("failover.editor.loading_plan_catalog", { defaultValue: "Loading provider configuration options..." })}
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="space-y-2">
                                <Label>{t("failover.editor.instance_name", { defaultValue: "Instance name" })}</Label>
                                {(planCatalog?.instances || []).length > 0 ? (
                                  <Select
                                    value={getStringValue(selectedPlanPayload.instance_name) || undefined}
                                    onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                      ...current,
                                      instance_name: value,
                                      static_ip_name: "",
                                    }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={t("failover.editor.instance_name", { defaultValue: "Choose an instance" })} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {planCatalog?.instances?.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {formatCatalogOptionLabel(option)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                    {t("failover.editor.loading_plan_catalog", { defaultValue: "Loading provider configuration options..." })}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ) : null}

                      {selectedPlan.provider === "digitalocean" && selectedPlan.action_type === "provision_instance" ? (
                        <div className="grid gap-4 lg:grid-cols-3">
                          <div className="space-y-2">
                            <Label>{t("failover.editor.region", { defaultValue: "Region" })}</Label>
                            {(planCatalog?.regions || []).length > 0 ? (
                              <Select
                                value={getStringValue(selectedPlanPayload.region) || undefined}
                                onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  region: value,
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("failover.editor.region_placeholder", { defaultValue: "Choose a region" })} />
                                </SelectTrigger>
                                <SelectContent>
                                  {planCatalog?.regions?.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {formatCatalogOptionLabel(option)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={getStringValue(selectedPlanPayload.region)}
                                onChange={(event) => updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  region: event.target.value,
                                }))}
                                placeholder="sgp1"
                              />
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>{t("failover.editor.size", { defaultValue: "Size" })}</Label>
                            {(planCatalog?.sizes || []).length > 0 ? (
                              <Select
                                value={getStringValue(selectedPlanPayload.size) || undefined}
                                onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  size: value,
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("failover.editor.size_placeholder", { defaultValue: "Choose a size" })} />
                                </SelectTrigger>
                                <SelectContent>
                                  {planCatalog?.sizes?.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {formatCatalogOptionLabel(option)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={getStringValue(selectedPlanPayload.size)}
                                onChange={(event) => updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  size: event.target.value,
                                }))}
                                placeholder="s-1vcpu-1gb"
                              />
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>{t("failover.editor.image", { defaultValue: "Image" })}</Label>
                            {(planCatalog?.images || []).length > 0 ? (
                              <Select
                                value={getStringValue(selectedPlanPayload.image) || undefined}
                                onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  image: value,
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("failover.editor.image_placeholder", { defaultValue: "Choose an image" })} />
                                </SelectTrigger>
                                <SelectContent>
                                  {planCatalog?.images?.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {formatCatalogOptionLabel(option)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={getStringValue(selectedPlanPayload.image)}
                                onChange={(event) => updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  image: event.target.value,
                                }))}
                                placeholder="ubuntu-24-04-x64"
                              />
                            )}
                          </div>
                        </div>
                      ) : null}

                      {selectedPlan.provider === "linode" && selectedPlan.action_type === "provision_instance" ? (
                        <div className="grid gap-4 lg:grid-cols-3">
                          <div className="space-y-2">
                            <Label>{t("failover.editor.region", { defaultValue: "Region" })}</Label>
                            {(planCatalog?.regions || []).length > 0 ? (
                              <Select
                                value={getStringValue(selectedPlanPayload.region) || undefined}
                                onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  region: value,
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("failover.editor.region_placeholder", { defaultValue: "Choose a region" })} />
                                </SelectTrigger>
                                <SelectContent>
                                  {planCatalog?.regions?.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {formatCatalogOptionLabel(option)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={getStringValue(selectedPlanPayload.region)}
                                onChange={(event) => updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  region: event.target.value,
                                }))}
                                placeholder="jp-osa"
                              />
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>{t("failover.editor.type", { defaultValue: "Plan type" })}</Label>
                            {(planCatalog?.types || []).length > 0 ? (
                              <Select
                                value={getStringValue(selectedPlanPayload.type) || undefined}
                                onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  type: value,
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("failover.editor.type_placeholder", { defaultValue: "Choose a plan type" })} />
                                </SelectTrigger>
                                <SelectContent>
                                  {planCatalog?.types?.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {formatCatalogOptionLabel(option)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={getStringValue(selectedPlanPayload.type)}
                                onChange={(event) => updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  type: event.target.value,
                                }))}
                                placeholder="g6-standard-1"
                              />
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>{t("failover.editor.image", { defaultValue: "Image" })}</Label>
                            {(planCatalog?.images || []).length > 0 ? (
                              <Select
                                value={getStringValue(selectedPlanPayload.image) || undefined}
                                onValueChange={(value) => updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  image: value,
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("failover.editor.image_placeholder", { defaultValue: "Choose an image" })} />
                                </SelectTrigger>
                                <SelectContent>
                                  {planCatalog?.images?.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {formatCatalogOptionLabel(option)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={getStringValue(selectedPlanPayload.image)}
                                onChange={(event) => updateSelectedPlanPayload((current) => ({
                                  ...current,
                                  image: event.target.value,
                                }))}
                                placeholder="linode/ubuntu24.04"
                              />
                            )}
                          </div>
                        </div>
                      ) : null}
                        </>
                      ) : null}
                    </div>

                    <Collapsible
                      open={showPlanOptional}
                      onOpenChange={setShowPlanOptional}
                      className="rounded-xl border"
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          className="flex h-auto w-full items-center justify-between rounded-xl px-4 py-3 text-left hover:bg-muted/20"
                        >
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                              {t("failover.editor.show_plan_optional", {
                                defaultValue: "Optional plan settings",
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t("failover.editor.show_plan_optional_hint", {
                                defaultValue: "Plan name, auto-connect group, and script can stay empty.",
                              })}
                            </div>
                          </div>
                          <ChevronDown
                            className={cn(
                              "size-4 shrink-0 text-muted-foreground transition-transform",
                              showPlanOptional ? "rotate-180" : "",
                            )}
                          />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="border-t px-4 py-4">
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
                            <Input
                              value={selectedPlan.auto_connect_group}
                              onChange={(event) => updatePlan(selectedPlan.local_id, (current) => ({ ...current, auto_connect_group: event.target.value }))}
                              placeholder={t("failover.editor.auto_connect_group_placeholder", { defaultValue: "edge/failover" })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t("failover.editor.script", { defaultValue: "Script" })}</Label>
                            <Select
                              value={selectedPlan.script_clipboard_id || "__none"}
                              onValueChange={(value) => updatePlan(selectedPlan.local_id, (current) => ({ ...current, script_clipboard_id: value === "__none" ? "" : value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none">{t("failover.editor.no_script", { defaultValue: "No script" })}</SelectItem>
                                {sortedScripts.map((script) => (
                                  <SelectItem key={script.id} value={String(script.id)}>
                                    {script.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <Collapsible
                      open={showPlanAdvanced}
                      onOpenChange={setShowPlanAdvanced}
                      className="rounded-xl border"
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          className="flex h-auto w-full items-center justify-between rounded-xl px-4 py-3 text-left hover:bg-muted/20"
                        >
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                              {t("failover.editor.show_plan_advanced", {
                                defaultValue: "Advanced plan settings",
                              })}
                            </div>
	                            <div className="text-xs text-muted-foreground">
	                              {t("failover.editor.show_plan_advanced_hint", {
	                                defaultValue: "Priority and timeout controls are only for custom tuning.",
	                              })}
	                            </div>
                          </div>
                          <ChevronDown
                            className={cn(
                              "size-4 shrink-0 text-muted-foreground transition-transform",
                              showPlanAdvanced ? "rotate-180" : "",
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
	                              value={selectedPlan.priority}
	                              onChange={(event) => updatePlan(selectedPlan.local_id, (current) => ({ ...current, priority: event.target.value }))}
	                            />
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
                    </Collapsible>
                  </>
                ) : null}
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="border-t bg-background/95 px-5 py-4 sm:justify-between">
            <div className="flex items-center gap-2">
              {stepIndex > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditorStep(EDITOR_STEPS[stepIndex - 1])}
                  disabled={submitting}
                >
                  {t("failover.actions.back", { defaultValue: "Back" })}
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                {t("common.cancel", { defaultValue: "Cancel" })}
              </Button>
              {isLastStep ? (
                <Button type="submit" disabled={submitting}>
                  {submitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
                  {task
                    ? t("common.save", { defaultValue: "Save" })
                    : t("common.create", { defaultValue: "Create" })}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => setEditorStep(EDITOR_STEPS[stepIndex + 1])}
                  disabled={submitting}
                >
                  {t("failover.actions.next", { defaultValue: "Next" })}
                </Button>
              )}
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
  const [editingTask, setEditingTask] = React.useState<FailoverTask | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<FailoverTask | null>(null);
  const [selectedExecutionID, setSelectedExecutionID] = React.useState<number | null>(null);
  const [selectedExecutionTaskName, setSelectedExecutionTaskName] = React.useState("");
  const [runningTaskID, setRunningTaskID] = React.useState<number | null>(null);
  const [busyTaskID, setBusyTaskID] = React.useState<number | null>(null);

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
    const [nodesResult, scriptsResult, providerResults] = await Promise.all([
      getFailoverNodes(),
      getFailoverScripts().catch(() => []),
      Promise.allSettled(
        FAILOVER_PROVIDER_KEYS.map(async (provider) => ({
          provider,
          entries: normalizeEntries(await getCloudProviderEntries(provider)),
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
  }, []);

  React.useEffect(() => {
    if (accountLoading || !hasFeature("cloud")) {
      return;
    }

    void Promise.all([refreshTasks(), refreshResources()]);
  }, [accountLoading, hasFeature, refreshResources, refreshTasks]);

  React.useEffect(() => {
    if (accountLoading || !hasFeature("cloud")) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshTasks({ silent: true });
    }, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, [accountLoading, hasFeature, refreshTasks]);

  const nodeLookup = React.useMemo(() => {
    const map = new Map<string, FailoverNodeOption>();
    for (const node of nodes) {
      map.set(node.uuid, node);
    }
    return map;
  }, [nodes]);

  const openCreateDialog = () => {
    setEditingTask(null);
    setEditorOpen(true);
    void refreshResources();
  };

  const openEditDialog = async (task: FailoverTask) => {
    setBusyTaskID(task.id);
    try {
      const detail = await getFailoverTask(task.id);
      setEditingTask(detail);
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

  if (!hasFeature("cloud")) {
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
          <div className="grid gap-4 2xl:grid-cols-2">
            {tasks.map((task) => {
              const currentClientUUID = task.current_client_uuid || task.watch_client_uuid;
              const node = currentClientUUID ? nodeLookup.get(currentClientUUID) : undefined;
              const latestExecution = task.latest_execution;
              const taskBusy = busyTaskID === task.id;
              const taskRunning = runningTaskID === task.id;
              const requiresInitialization = !currentClientUUID;
              const latestSummary = task.plans
                .slice(0, 3)
                .map((plan) => {
                  return `${getPlanProviderLabel(t, plan.provider)} / ${getActionTypeLabel(t, plan.action_type)}`;
                })
                .join(" · ");

              return (
                <Card
                  key={task.id}
                  className={cn(
                    "gap-0 overflow-hidden border-slate-200/80 bg-card py-0 dark:border-slate-800/80",
                    task.has_active_execution && "border-amber-300/80 shadow-sm dark:border-amber-700/60",
                  )}
                >
                  <CardHeader className="gap-4 border-b px-5 py-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-xl">{task.name}</CardTitle>
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
                        </div>
                        <CardDescription className="max-w-3xl">
                          {task.last_message || t("failover.task.no_message", { defaultValue: "No recent task message." })}
                        </CardDescription>
                      </div>

                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        <Button type="button" size="sm" variant="outline" onClick={() => void openEditDialog(task)} disabled={taskBusy || taskRunning}>
                          {taskBusy ? <LoaderCircle className="size-4 animate-spin" /> : <PencilLine className="size-4" />}
                          {t("common.edit", { defaultValue: "Edit" })}
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
                  </CardHeader>

                  <CardContent className="grid gap-4 px-5 py-5 md:grid-cols-2">
                    <TaskMetricCard label={t("failover.table.current", { defaultValue: "Current outlet" })}>
                      <div className="font-medium text-slate-900 dark:text-slate-50">
                        {node
                          ? getNodeLabel(node)
                          : task.current_address || currentClientUUID || t("failover.task.uninitialized", { defaultValue: "Not initialized" })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {task.current_address
                          ? `${t("failover.editor.current_ip", { defaultValue: "IP" })}: ${task.current_address}`
                          : t("failover.editor.current_ip_empty", { defaultValue: "IP not recorded yet." })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {currentClientUUID
                          ? `${t("failover.editor.current_client", { defaultValue: "Client" })}: ${currentClientUUID}`
                          : t("failover.task.uninitialized_hint", {
                            defaultValue: "Save the task first, then run initialization to create the first outlet.",
                          })}
                      </div>
                    </TaskMetricCard>

                    <TaskMetricCard label={t("failover.table.probe", { defaultValue: "Probe" })}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getStatusVariant(task.probe.status, "probe")}>
                          {getStatusLabel(t, task.probe.status)}
                        </Badge>
                        {task.probe.stale ? (
                          <Badge variant="warning">
                            {t("failover.probe.stale", { defaultValue: "Stale" })}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {task.probe.target || t("failover.probe.no_target", { defaultValue: "No target" })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("failover.probe.failures", {
                          defaultValue: "Failures: {{count}}",
                          count: task.probe.consecutive_failures,
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(task.probe.report_updated_at || task.probe.checked_at)}
                      </div>
                    </TaskMetricCard>

                    <TaskMetricCard label={t("failover.table.latest", { defaultValue: "Latest execution" })}>
                      {latestExecution ? (
                        <>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={getStatusVariant(latestExecution.status, "execution")}>
                              {getStatusLabel(t, latestExecution.status)}
                            </Badge>
                            <Badge variant={getStatusVariant(latestExecution.script_status, "script")}>
                              {t("failover.table.script", { defaultValue: "Script" })}: {getStatusLabel(t, latestExecution.script_status)}
                            </Badge>
                            <Badge variant={getStatusVariant(latestExecution.dns_status, "dns")}>
                              {t("failover.execution.dns", { defaultValue: "DNS" })}: {getStatusLabel(t, latestExecution.dns_status)}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDateTime(latestExecution.started_at)}
                          </div>
                          {latestExecution.error_message ? (
                            <div className="text-xs text-red-600 dark:text-red-300">
                              {latestExecution.error_message}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              {t("failover.task.latest_execution_hint", {
                                defaultValue: "Latest run state from the backend execution log.",
                              })}
                            </div>
                          )}
                          <div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openExecutionDialog(latestExecution.id, task.name)}
                            >
                              <Eye className="size-4" />
                              {t("failover.table.view_latest", { defaultValue: "View details" })}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {t("failover.task.no_execution", { defaultValue: "No execution recorded yet." })}
                        </div>
                      )}
                    </TaskMetricCard>

                    <TaskMetricCard label={t("failover.table.cooldown", { defaultValue: "Cooldown" })}>
                      <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                        {task.cooldown_remaining_seconds > 0
                          ? formatDurationSeconds(task.cooldown_remaining_seconds, t)
                          : t("failover.cooldown.ready", { defaultValue: "Ready" })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {task.next_eligible_at
                          ? formatDateTime(task.next_eligible_at)
                          : t("failover.cooldown.immediate", { defaultValue: "Can run immediately." })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("failover.table.plans", { defaultValue: "Plans" })}: {task.plans.length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {latestSummary || "-"}
                      </div>
                    </TaskMetricCard>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}
      </AdminPageShell>

      <TaskEditorDialog
        open={editorOpen}
        task={editingTask}
        nodes={nodes}
        scripts={scripts}
        providerEntries={providerEntries}
        onOpenChange={(nextOpen) => {
          setEditorOpen(nextOpen);
          if (!nextOpen) {
            setEditingTask(null);
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

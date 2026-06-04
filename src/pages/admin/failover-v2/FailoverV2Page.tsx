import React from "react";
import type { TFunction } from "i18next";
import { Navigate, useSearchParams } from "react-router-dom";
import { Check, ChevronDown, ChevronUp, LoaderCircle, MoreHorizontal, PencilLine, Play, Plus, RefreshCw, Share2, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  AdminPageShell,
  AdminDataPanel,
  AdminSurface,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
import {
  AdminPagination,
  useClientPagination,
} from "@/components/admin/AdminPagination";
import {
  AdminFormRequiredMark as RequiredMark,
  AdminFormSection as FlowSection,
  AdminFormToggle as ToggleCard,
} from "@/components/admin/AdminForm";
import FailoverV2ShareDialog from "@/components/admin/failover-v2/FailoverV2ShareDialog";
import FailoverScriptPolicyDialog from "@/components/admin/failover/FailoverScriptPolicyDialog";
import DnsSchedulerLinkedSummary from "@/components/admin/cloud/DnsSchedulerLinkedSummary";
import {
  azureImagePresets,
  initialAzureImagePreset,
} from "@/components/admin/cloud/azurePanelUtils";
import {
  ADMIN_FORM_DIALOG_CLASS,
  ADMIN_FORM_DIALOG_WIDE_CLASS,
  ADMIN_FORM_FIELD_CLASS as FORM_FIELD_CLASS,
  ADMIN_FORM_GRID_2_CLASS as FORM_GRID_2_CLASS,
  ADMIN_FORM_GRID_3_CLASS as FORM_GRID_3_CLASS,
  ADMIN_FORM_GRID_4_CLASS as FORM_GRID_4_CLASS,
  ADMIN_FORM_SCROLL_CLASS,
  ADMIN_FORM_SECTION_COMPACT_CLASS as FORM_SECTION_CLASS,
  ADMIN_FORM_SELECT_TRIGGER_CLASS as FORM_SELECT_TRIGGER_CLASS,
  ADMIN_FORM_TOGGLE_CLASS as FORM_TOGGLE_CLASS,
} from "@/components/admin/AdminFormStyles";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge as InlineBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger as BaseSelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getDefaultAdminPath, type AccountFeature, useAccount } from "@/contexts/AccountContext";
import { updateSettingsWithToast, useSettings } from "@/lib/api";
import {
  getPublicFailoverResultText,
} from "@/lib/failoverPublicView";
import {
  getCloudProviderEntries,
  getDigitalOceanTokens,
  type CloudProviderCredentialEntry,
} from "@/lib/cloud";
import { getAWSCredentials } from "@/lib/cloudAws";
import { getAzureCredentials } from "@/lib/cloudAzure";
import { getLinodeTokens } from "@/lib/cloudLinode";
import { getVultrTokens } from "@/lib/cloudVultr";
import {
  type FailoverDnsCatalog,
  type FailoverDnsOption,
  type FailoverDnsRecordOption,
  type FailoverNodeOption,
  type FailoverScriptOption,
  getFailoverDnsCatalog,
  getFailoverNodes,
  getFailoverScripts,
} from "@/lib/failover";
import {
  createFailoverV2Member,
  createFailoverV2Service,
  deleteFailoverV2Member,
  deleteFailoverV2Share,
  deleteFailoverV2Service,
  detachFailoverV2MemberDNS,
  buildFailoverV2ShareUrl,
  fromFailoverV2ShareDateTimeLocalValue,
  type FailoverV2BulkValidationResult,
  type FailoverV2Execution,
  type FailoverV2ExecutionAvailableActions,
  type FailoverV2ExecutionSummary,
  type FailoverV2Member,
  type FailoverV2MemberInput,
  type FailoverV2MemberMode,
  markFailoverV2PendingCleanupManualReview,
  type FailoverV2PendingCleanup,
  type FailoverV2Service,
  type FailoverV2ServiceInput,
  type FailoverV2ShareAccessPolicy,
  type FailoverV2ShareRecord,
  type FailoverV2ValidationResult,
  getFailoverV2Execution,
  getFailoverV2Executions,
  getFailoverV2PendingCleanups,
  getFailoverV2Share,
  getFailoverV2Services,
  resolveFailoverV2PendingCleanup,
  retryFailoverV2ExecutionAttachDNS,
  retryFailoverV2ExecutionCleanup,
  retryFailoverV2PendingCleanup,
  runFailoverV2MemberNow,
  saveFailoverV2Share,
  setFailoverV2MemberEnabled,
  setFailoverV2ServiceEnabled,
  stopFailoverV2Execution,
  syncFailoverV2ServiceDNS,
  toFailoverV2ShareDateTimeLocalValue,
  updateFailoverV2Member,
  updateFailoverV2Service,
  validateAllFailoverV2Services,
  validateFailoverV2Member,
  validateFailoverV2Service,
} from "@/lib/failoverV2";
import {
  COMMON_AWS_REGIONS,
  COMMON_AZURE_LOCATIONS,
  COMMON_AZURE_SIZES,
  COMMON_DIGITALOCEAN_IMAGES,
  COMMON_DIGITALOCEAN_REGIONS,
  COMMON_DIGITALOCEAN_SIZES,
  COMMON_LINODE_IMAGES,
  COMMON_LINODE_REGIONS,
  COMMON_LINODE_TYPES,
  COMMON_VULTR_IMAGES,
  COMMON_VULTR_PLANS,
  COMMON_VULTR_REGIONS,
  DEFAULT_AWS_REGION,
  DEFAULT_AZURE_IMAGE,
  DEFAULT_AZURE_LOCATION,
  DEFAULT_AZURE_SIZE,
  DEFAULT_DIGITALOCEAN_IMAGE,
  DEFAULT_DIGITALOCEAN_REGION,
  DEFAULT_DIGITALOCEAN_SIZE,
  DEFAULT_LINODE_IMAGE,
  DEFAULT_LINODE_REGION,
  DEFAULT_LINODE_TYPE,
  DEFAULT_VULTR_IMAGE,
  DEFAULT_VULTR_PLAN,
  DEFAULT_VULTR_REGION,
  DEFAULT_STATIC_EC2_IMAGE_ID,
  DEFAULT_STATIC_EC2_INSTANCE_TYPE,
  DEFAULT_STATIC_LIGHTSAIL_BLUEPRINT_ID,
  DEFAULT_STATIC_LIGHTSAIL_BUNDLE_ID,
  STATIC_EC2_IMAGE_PRESETS,
  STATIC_EC2_INSTANCE_TYPE_PRESETS,
  STATIC_LIGHTSAIL_BLUEPRINT_PRESETS,
  STATIC_LIGHTSAIL_BUNDLE_PRESETS,
  type BuiltinPlanOption,
} from "@/lib/failoverV2Presets";
import { cn } from "@/lib/utils";

type ServiceFormState = {
  name: string;
  enabled: boolean;
  dns_provider: string;
  dns_entry_id: string;
  dns_payload: string;
  script_clipboard_ids: number[];
  script_timeout_sec: string;
  wait_agent_timeout_sec: string;
  check_interval_seconds: string;
};

type MemberFormState = {
  name: string;
  enabled: boolean;
  priority: string;
  mode: FailoverV2MemberMode;
  watch_client_uuid: string;
  dns_lines: string;
  dns_record_refs: string;
  current_address: string;
  current_instance_ref: string;
  provider: string;
  provider_entry_id: string;
  provider_entry_group: string;
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

type ProviderEntry = CloudProviderCredentialEntry & {
  active?: boolean;
  group?: string;
};

type ProviderEntriesMap = Record<string, ProviderEntry[]>;

const FAILOVER_V2_DNS_PROVIDER = "aliyun";
const FAILOVER_V2_MEMBER_PROVIDER = "digitalocean";
const FAILOVER_V2_DEFAULT_DELETE_STRATEGY = "keep";
const FAILOVER_V2_DEFAULT_DELETE_DELAY_SECONDS = 0;
const FAILOVER_V2_DNS_PROVIDERS = [
  { value: "aliyun", label: "Aliyun" },
  { value: "cloudflare", label: "Cloudflare" },
] as const;
const FAILOVER_V2_MEMBER_PROVIDERS = [
  { value: "digitalocean", label: "DigitalOcean" },
  { value: "linode", label: "Linode" },
  { value: "vultr", label: "Vultr" },
  { value: "aws", label: "AWS" },
  { value: "azure", label: "Azure" },
] as const;
const FAILOVER_V2_MEMBER_PROVIDER_FEATURES: Record<
  (typeof FAILOVER_V2_MEMBER_PROVIDERS)[number]["value"],
  AccountFeature
> = {
  digitalocean: "cloud_digitalocean",
  linode: "cloud_linode",
  vultr: "cloud_vultr",
  aws: "cloud_aws",
  azure: "cloud_azure",
};
const FAILOVER_V2_PROVIDER_ENTRY_GROUP_ALL = "__all__";
const FAILOVER_V2_AUTOMATIC_PROVIDER_ENTRY_ID = "active";
const FAILOVER_V2_POLL_INTERVAL_MS = 5000;
const FAILOVER_V2_SCHEDULER_STATUS_POLL_INTERVAL_MS = 15000;
const FAILOVER_V2_COUNTDOWN_TICK_MS = 1000;
const FAILOVER_V2_ACTIVE_EXECUTION_STATUSES = new Set([
  "running",
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
  "stopping",
  "stop_requested",
]);
const FAILOVER_V2_TERMINAL_EXECUTION_STATUSES = new Set([
  "success",
  "failed",
  "warning",
  "skipped",
  "stopped",
  "completed",
  "cancelled",
  "canceled",
  "aborted",
  "timeout",
]);
const DNS_TTL_OPTIONS = [1, 60, 120, 300, 600, 900, 1800, 3600, 7200] as const;

function SelectTrigger({
  className,
  ...props
}: React.ComponentProps<typeof BaseSelectTrigger>) {
  return (
    <BaseSelectTrigger
      className={[FORM_SELECT_TRIGGER_CLASS, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

function MemberModeOption({
  value,
  title,
}: {
  value: FailoverV2MemberMode;
  title: string;
}) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "h-9 rounded-md px-3 text-sm font-medium",
        "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none",
      )}
    >
      <span>{title}</span>
    </TabsTrigger>
  );
}

function MemberDNSLinesEditor({
  t,
  value,
  onChange,
  domainName,
  refreshDisabled,
  refreshing,
  onRefresh,
  quickOptions,
  catalogError,
  hideLabel = false,
}: {
  t: TFunction;
  value: string;
  onChange: (value: string) => void;
  domainName: string;
  refreshDisabled: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  quickOptions: FailoverDnsOption[];
  catalogError: string;
  hideLabel?: boolean;
}) {
  const [draft, setDraft] = React.useState("");
  const lines = React.useMemo(() => parseMemberDNSLines(value), [value]);

  const applyDraft = React.useCallback((rawValue: string) => {
    const nextLines = parseStringArrayText(rawValue);
    if (nextLines.length === 0) {
      return;
    }
    onChange(formatStringArrayText(Array.from(new Set([...lines, ...nextLines]))));
    setDraft("");
  }, [lines, onChange]);

  const removeLine = React.useCallback((line: string) => {
    onChange(formatStringArrayText(lines.filter((item) => item !== line)));
  }, [lines, onChange]);

  return (
    <div className={FORM_FIELD_CLASS}>
      <div className={cn("flex items-center gap-2", hideLabel ? "justify-end" : "justify-between")}>
        {hideLabel ? null : (
          <Label className="flex items-center gap-1">
            {t("failover_v2.dns_lines", { defaultValue: "DNS lines" })}
            <RequiredMark />
          </Label>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshDisabled}
          title={t("failover_v2.dns_catalog_load", { defaultValue: "Load DNS options" })}
        >
          <RefreshCw className={cn("mr-2 size-4", refreshing && "animate-spin")} />
          {t("failover_v2.refresh_dns_lines", { defaultValue: "Refresh lines" })}
        </Button>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyDraft(draft);
              }
            }}
            placeholder={t("failover_v2.member_dns_lines_input_placeholder", {
              defaultValue: "Add a line, or separate multiple lines with commas",
            })}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => applyDraft(draft)}
            disabled={!draft.trim()}
          >
            <Plus className="mr-2 size-4" />
            {t("failover_v2.member_dns_lines_add", { defaultValue: "Add line" })}
          </Button>
        </div>

        <div className="border-y border-dashed border-slate-200/80 py-3 dark:border-slate-800/80">
          {lines.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {lines.map((line) => (
                <InlineBadge key={line} variant="secondary" className="gap-1.5 pr-1">
                  <span>{line}</span>
                  <button
                    type="button"
                    className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
                    onClick={() => removeLine(line)}
                    aria-label={`${t("common.delete", { defaultValue: "Delete" })} ${line}`}
                  >
                    <X className="size-3" />
                  </button>
                </InlineBadge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("failover_v2.member_dns_lines_empty", { defaultValue: "No DNS lines selected yet." })}
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {catalogError || formatMemberLinesFieldHint(t, domainName)}
        </p>

        {quickOptions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {quickOptions.map((line) => (
              <Button
                key={line.value}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyDraft(line.value)}
              >
                {line.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ReadonlyValueField({
  label,
  value,
  placeholder,
  description,
  multiline = false,
}: {
  label: React.ReactNode;
  value: string;
  placeholder: string;
  description?: React.ReactNode;
  multiline?: boolean;
}) {
  return (
    <div className={FORM_FIELD_CLASS}>
      <Label>{label}</Label>
      {multiline ? (
        <Textarea
          className="min-h-28 font-mono text-xs"
          readOnly
          value={value}
          placeholder={placeholder}
        />
      ) : (
        <Input
          readOnly
          value={value}
          placeholder={placeholder}
        />
      )}
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function ExecutionDetailSection({
  title,
  description,
  action,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">{title}</h3>
          {description ? <p className="text-sm leading-5 text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function ExecutionJsonBlock({
  label,
  expandLabel,
  collapseLabel,
  content,
  summaryItems = [],
}: {
  label: React.ReactNode;
  expandLabel: React.ReactNode;
  collapseLabel: React.ReactNode;
  content: string;
  summaryItems?: Array<{
    key: string;
    label: React.ReactNode;
    value: React.ReactNode;
  }>;
}) {
  if (!content) {
    return null;
  }

  return (
    <div className="min-w-0 px-4 py-3 first:pt-0 last:pb-0 sm:px-5">
      <div className="text-sm font-medium text-slate-900 dark:text-slate-50">{label}</div>
      {summaryItems.length > 0 ? (
        <dl className="mt-2 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
          {summaryItems.map((item) => (
            <div key={item.key} className="min-w-0">
              <dt className="text-xs text-slate-500 dark:text-slate-400">{item.label}</dt>
              <dd className="mt-1 break-words font-medium text-slate-800 dark:text-slate-100">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <details className="group mt-2 border-t border-dashed border-slate-200 pt-2 dark:border-slate-800">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-600 marker:hidden dark:text-slate-300 [&::-webkit-details-marker]:hidden">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            <span className="group-open:hidden">{expandLabel}</span>
            <span className="hidden group-open:inline">{collapseLabel}</span>
          </span>
        </summary>
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {content}
        </pre>
      </details>
    </div>
  );
}

function ExecutionActionCard({
  tone = "neutral",
  title,
  description,
  reason,
  children,
}: {
  tone?: "neutral" | "danger";
  title: React.ReactNode;
  description: React.ReactNode;
  reason?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5",
        tone === "danger"
          ? "bg-red-50/50 dark:bg-red-950/10"
          : "",
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              tone === "danger" ? "bg-red-500" : "bg-slate-300 dark:bg-slate-700",
            )}
          />
          <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">{title}</div>
        </div>
        <p className="text-sm leading-5 text-slate-500 dark:text-slate-400">{description}</p>
        {reason ? <p className="pt-1 text-xs text-slate-500 dark:text-slate-400">{reason}</p> : null}
      </div>
      <div className="shrink-0 sm:w-44">{children}</div>
    </div>
  );
}

function normalizeProviderKey(value: string, fallback: string) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || fallback;
}

function normalizeDnsRecordType(value: string) {
  const normalized = String(value || "").trim().toUpperCase();
  return normalized === "AAAA" ? "AAAA" : "A";
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

function toCloudflareRecordInput(recordName: string, zoneName: string) {
  const normalizedRecordName = String(recordName || "").trim().replace(/\.+$/, "");
  const normalizedZoneName = String(zoneName || "").trim().replace(/\.+$/, "");
  if (!normalizedRecordName) {
    return "";
  }
  if (!normalizedZoneName) {
    return normalizedRecordName;
  }
  if (normalizedRecordName.toLowerCase() === normalizedZoneName.toLowerCase()) {
    return "@";
  }
  const suffix = `.${normalizedZoneName}`;
  if (normalizedRecordName.length > suffix.length && normalizedRecordName.toLowerCase().endsWith(suffix.toLowerCase())) {
    const shortName = normalizedRecordName.slice(0, -suffix.length).trim();
    return shortName || "@";
  }
  return normalizedRecordName;
}

function getDnsRecordKey(record: FailoverDnsRecordOption) {
  return [
    record.id,
    record.zone_id,
    record.zone_name,
    record.domain_name,
    record.name,
    record.rr,
    record.type,
    record.value,
    record.line,
  ].map((value) => String(value || "").trim()).join("\u0000");
}

function dnsRecordSummary(t: TFunction, record: FailoverDnsRecordOption) {
  const parts = [
    record.name || record.rr,
    normalizeDnsRecordType(record.type),
    record.value,
    record.line ? localizeAliyunLineLabel(t, record.line) : "",
  ].map((value) => String(value || "").trim()).filter(Boolean);
  return parts.join(" / ");
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
    case "warning":
    case "manual_review":
      return "amber";
    case "failed":
      return "red";
    default:
      return "gray";
  }
}

function normalizeTranslationToken(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function humanizeBackendToken(value: string) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "Unknown";
  }
  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function localizeFailoverV2Status(t: TFunction, status: string | null | undefined) {
  const normalized = normalizeTranslationToken(String(status || ""));
  if (!normalized) {
    return t("failover_v2.status.unknown", { defaultValue: "Unknown" });
  }

  const cooldownUntilMatch = String(status || "").trim().match(/^cooldown\s+until\s+(.+)$/i);
  if (cooldownUntilMatch) {
    const untilRaw = cooldownUntilMatch[1]?.trim();
    const until = untilRaw ? formatTimestamp(untilRaw) : untilRaw;
    return t("failover_v2.status.cooldown_until", {
      until,
      defaultValue: `Cooldown until ${untilRaw || "..."}`,
    });
  }

  return t(`failover_v2.status.${normalized}`, {
    defaultValue: humanizeBackendToken(String(status || "")),
  });
}

function localizeFailoverV2Stage(t: TFunction, stage: string) {
  const normalized = normalizeTranslationToken(stage);
  return t(`failover_v2.stage.${normalized}`, {
    defaultValue: humanizeBackendToken(stage),
  });
}

function localizeFailoverV2TriggerReason(t: TFunction, triggerReason: string | null | undefined) {
  const normalized = normalizeTranslationToken(String(triggerReason || ""));
  if (!normalized) {
    return t("failover_v2.execution_manual", { defaultValue: "manual" });
  }
  if (normalized.startsWith("cn_connectivity")) {
    return t("failover_v2.trigger_reason.cn_connectivity", {
      defaultValue: "CN connectivity automation",
    });
  }
  return t(`failover_v2.trigger_reason.${normalized}`, {
    defaultValue: humanizeBackendToken(String(triggerReason || "")),
  });
}

function getFailoverV2ExecutionStepLabel(t: TFunction, step: { step_key: string; step_label: string }) {
  const normalized = normalizeTranslationToken(step.step_key);
  if (!normalized) {
    return step.step_label || t("failover_v2.step_labels.unknown", { defaultValue: "Unknown step" });
  }
  return t(`failover_v2.step_labels.${normalized}`, {
    defaultValue: humanizeBackendToken(step.step_label || step.step_key),
  });
}

function getFailoverV2ExecutionStepMessage(t: TFunction, message: string | null | undefined) {
  const normalizedMessage = String(message || "").trim().toLowerCase();
  if (!normalizedMessage) {
    return "";
  }
  return t(`failover_v2.step_messages.${normalizeTranslationToken(normalizedMessage)}`, {
    defaultValue: message,
  });
}

function localizeFailoverV2ActionReason(t: TFunction, reason: string | null | undefined) {
  const normalizedReason = String(reason || "").trim().toLowerCase();
  if (!normalizedReason) {
    return "";
  }
  return t(`failover_v2.action_reasons.${normalizeTranslationToken(normalizedReason)}`, {
    defaultValue: reason,
  });
}

function localizeFailoverV2BackendReason(t: TFunction, reason: string | null | undefined) {
  const normalizedReason = String(reason || "").trim();
  if (!normalizedReason) {
    return "";
  }
  const lowerReason = normalizedReason.toLowerCase();

  const serviceRunningMatch = lowerReason.match(/^failover v2 service (\d+) is already running$/);
  if (serviceRunningMatch) {
    return t("failover_v2.error_reasons.service_running", {
      id: serviceRunningMatch[1],
      defaultValue: `服务 #${serviceRunningMatch[1]} 当前已有执行在进行，请稍后重试。`,
    });
  }
  const serviceActiveMatch = lowerReason.match(/^failover v2 service (\d+) already has an active execution$/);
  if (serviceActiveMatch) {
    return t("failover_v2.error_reasons.service_has_active_execution", {
      id: serviceActiveMatch[1],
      defaultValue: `服务 #${serviceActiveMatch[1]} 当前已有活动执行，请稍后重试。`,
    });
  }
  if (lowerReason === "provider credential is busy provisioning another member") {
    return t("failover_v2.error_reasons.provider_credential_busy", {
      defaultValue: "同一云凭证正在创建实例，请稍后重试。",
    });
  }
  if (lowerReason.startsWith("failover v2 run lock ") && lowerReason.endsWith(" is already held")) {
    return t("failover_v2.error_reasons.provider_credential_busy", {
      defaultValue: "同一云凭证正在创建实例，请稍后重试。",
    });
  }
  const aliyunDNSRecordRefMissingMatch = normalizedReason.match(/^aliyun dns record ref for (A|AAAA) not found: (.+)$/i);
  if (aliyunDNSRecordRefMissingMatch) {
    return t("failover_v2.error_reasons.aliyun_dns_record_ref_missing", {
      recordType: String(aliyunDNSRecordRefMissingMatch[1] || "").toUpperCase(),
      ref: String(aliyunDNSRecordRefMissingMatch[2] || "").trim(),
      defaultValue: "Aliyun 的 {{recordType}} DNS 记录引用 {{ref}} 不存在。通常表示成员运行态里的 dns_record_refs 已过期，请在成员编辑中展开“高级状态字段”修复后再重试。",
    });
  }

  return localizeFailoverV2ActionReason(t, normalizedReason);
}

function localizeFailoverV2ApiMessage(t: TFunction, message: string | null | undefined) {
  const rawMessage = String(message || "").trim();
  if (!rawMessage) {
    return "";
  }

  const separatorIndex = rawMessage.indexOf(":");
  if (separatorIndex > 0) {
    const prefix = rawMessage.slice(0, separatorIndex).trim().toLowerCase();
    const reason = rawMessage.slice(separatorIndex + 1).trim();
    const localizedReason = localizeFailoverV2BackendReason(t, reason) || reason;
    if (prefix === "failed to start failover v2 execution") {
      return t("failover_v2.api_errors.start_execution_failed", {
        reason: localizedReason,
        defaultValue: `启动故障切换 V2 执行失败：${localizedReason}`,
      });
    }
    if (prefix === "failed to start failover v2 dns detach") {
      return t("failover_v2.api_errors.start_detach_failed", {
        reason: localizedReason,
        defaultValue: `启动 DNS 摘除失败：${localizedReason}`,
      });
    }
    if (prefix === "failed to detach member dns") {
      return t("failover_v2.api_errors.detach_member_dns_failed", {
        reason: localizedReason,
        defaultValue: `成员 DNS 摘除失败：${localizedReason}`,
      });
    }
  }

  return localizeFailoverV2BackendReason(t, rawMessage);
}

function resolveFailoverV2ErrorMessage(t: TFunction, error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    const localized = localizeFailoverV2ApiMessage(t, error.message);
    if (localized) {
      return localized;
    }
  }
  return fallbackMessage;
}

function asJsonObject(value: unknown): Record<string, unknown> | null {
  const parsed = parseJsonValue(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  return parsed as Record<string, unknown>;
}

function firstNonEmptyValue(values: Array<unknown>) {
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (normalized) {
      return normalized;
    }
  }
  return "";
}

function resolveExecutionActionsFallback(execution: FailoverV2Execution): FailoverV2ExecutionAvailableActions {
  if (execution.available_actions) {
    return execution.available_actions;
  }

  const isActive = !execution.finished_at && isFailoverV2ExecutionStatusActive(execution.status);
  const detachStatus = String(execution.detach_dns_status || "").trim().toLowerCase();
  const attachStatus = String(execution.attach_dns_status || "").trim().toLowerCase();
  const cleanupStatus = String(execution.cleanup_status || "").trim().toLowerCase();
  const cleanupResult = asJsonObject(execution.cleanup_result);
  const cleanupClassification = String(cleanupResult?.classification ?? "").trim().toLowerCase();
  const oldInstanceRef = asJsonObject(execution.old_instance_ref);
  const newInstanceRef = asJsonObject(execution.new_instance_ref);
  const newAddresses = asJsonObject(execution.new_addresses);
  const ipv4 = firstNonEmptyValue([
    newAddresses?.public_ip,
    newAddresses?.ipv4,
  ]);
  const ipv6List = Array.isArray(newAddresses?.ipv6_addresses)
    ? (newAddresses?.ipv6_addresses as unknown[])
    : [];
  const ipv6 = firstNonEmptyValue([
    ipv6List[0],
    newAddresses?.ipv6,
  ]);
  const hasReplacementAddress = Boolean(ipv4 || ipv6);

  const stop = isActive
    ? { available: true, reason: "" }
    : { available: false, reason: "execution is not running" };

  let retryAttachDNS: FailoverV2ExecutionAvailableActions["retry_attach_dns"];
  if (isActive) {
    retryAttachDNS = { available: false, reason: "execution is still running" };
  } else if (detachStatus !== "success") {
    retryAttachDNS = { available: false, reason: "member dns detach must succeed before attach retry is available" };
  } else if (attachStatus === "success") {
    retryAttachDNS = { available: false, reason: "replacement dns already succeeded for this execution" };
  } else if (attachStatus === "skipped") {
    retryAttachDNS = { available: false, reason: "replacement dns was skipped for this execution" };
  } else if (attachStatus !== "failed") {
    retryAttachDNS = { available: false, reason: "attach retry is only available after a failed dns attach" };
  } else if (!hasReplacementAddress) {
    retryAttachDNS = { available: false, reason: "no saved replacement addresses are available for attach retry" };
  } else if (!String(execution.new_client_uuid || "").trim() && !newInstanceRef) {
    retryAttachDNS = { available: false, reason: "replacement instance context is incomplete for attach retry" };
  } else {
    retryAttachDNS = { available: true, reason: "" };
  }

  let retryCleanup: FailoverV2ExecutionAvailableActions["retry_cleanup"];
  if (isActive) {
    retryCleanup = { available: false, reason: "execution is still running" };
  } else if (attachStatus !== "success") {
    retryCleanup = { available: false, reason: "replacement dns must succeed before old instance cleanup can be retried" };
  } else if (!oldInstanceRef) {
    retryCleanup = { available: false, reason: "no saved old instance reference is available for cleanup retry" };
  } else if (cleanupClassification === "instance_deleted") {
    retryCleanup = { available: false, reason: "old instance cleanup already succeeded" };
  } else if (cleanupClassification === "not_requested") {
    retryCleanup = { available: false, reason: "this execution did not require old instance cleanup" };
  } else if (cleanupStatus === "success") {
    retryCleanup = { available: false, reason: "old instance cleanup already succeeded" };
  } else if (cleanupStatus === "pending" || cleanupStatus === "failed" || cleanupStatus === "warning" || cleanupStatus === "skipped") {
    retryCleanup = { available: true, reason: "" };
  } else {
    retryCleanup = { available: false, reason: "cleanup retry is only available when cleanup is pending, failed, or needs review" };
  }

  return {
    stop,
    retry_attach_dns: retryAttachDNS,
    retry_cleanup: retryCleanup,
  };
}

function parseJsonValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "null") {
      return null;
    }
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return trimmed;
    }
  }
  return value;
}

function formatDetailSummaryValue(t: TFunction, key: string, value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    if (key === "classification" || key === "status" || key === "step_status") {
      return t(`failover_v2.detail_values.${normalizeTranslationToken(trimmed)}`, {
        defaultValue: humanizeBackendToken(trimmed),
      });
    }
    return trimmed;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => formatDetailSummaryValue(t, key, entry))
      .filter(Boolean)
      .slice(0, 3)
      .join(", ");
  }
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    return formatDetailSummaryValue(t, key, object.label ?? object.name ?? object.id ?? object.uuid ?? object.value ?? "");
  }
  return "";
}

function getFailoverV2DetailSummaryItems(t: TFunction, detail: unknown, maxItems = 6) {
  const parsed = parseJsonValue(detail);
  if (!parsed) {
    return [];
  }
  if (Array.isArray(parsed)) {
    const summaryValue = parsed
      .map((entry) => formatDetailSummaryValue(t, "addresses", entry))
      .filter(Boolean)
      .slice(0, 3)
      .join(", ");
    return summaryValue
      ? [
        {
          key: "addresses",
          label: t("failover_v2.detail_fields.addresses", { defaultValue: "Addresses" }),
          value: summaryValue,
        },
      ]
      : [];
  }
  if (typeof parsed !== "object") {
    return [
      {
        key: "summary",
        label: t("failover_v2.detail_fields.summary", { defaultValue: "Summary" }),
        value: String(parsed),
      },
    ];
  }

  const object = parsed as Record<string, unknown>;
  const candidates = [
    ["summary", t("failover_v2.detail_fields.summary", { defaultValue: "Summary" })],
    ["classification", t("failover_v2.detail_fields.classification", { defaultValue: "Classification" })],
    ["provider", t("failover_v2.detail_fields.provider", { defaultValue: "Provider" })],
    ["provider_entry_id", t("failover_v2.detail_fields.provider_entry_id", { defaultValue: "Credential ID" })],
    ["resource_type", t("failover_v2.detail_fields.resource_type", { defaultValue: "Resource type" })],
    ["resource_id", t("failover_v2.detail_fields.resource_id", { defaultValue: "Resource ID" })],
    ["record_name", t("failover_v2.detail_fields.record_name", { defaultValue: "Record" })],
    ["domain_name", t("failover_v2.detail_fields.domain_name", { defaultValue: "Domain" })],
    ["line", t("failover_v2.detail_fields.line", { defaultValue: "Line" })],
    ["region", t("failover_v2.detail_fields.region", { defaultValue: "Region" })],
    ["instance_id", t("failover_v2.detail_fields.instance_id", { defaultValue: "Instance ID" })],
    ["instance_name", t("failover_v2.detail_fields.instance_name", { defaultValue: "Instance name" })],
    ["public_ip", t("failover_v2.detail_fields.public_ip", { defaultValue: "Public IP" })],
    ["ipv4", t("failover_v2.detail_fields.ipv4", { defaultValue: "IPv4" })],
    ["ipv6", t("failover_v2.detail_fields.ipv6", { defaultValue: "IPv6" })],
    ["addresses", t("failover_v2.detail_fields.addresses", { defaultValue: "Addresses" })],
    ["new_client_uuid", t("failover_v2.execution_new_client", { defaultValue: "New client" })],
    ["old_client_uuid", t("failover_v2.execution_old_client", { defaultValue: "Old client" })],
    ["pending_cleanup_id", t("failover_v2.detail_fields.pending_cleanup_id", { defaultValue: "Pending cleanup" })],
    ["cleanup_label", t("failover_v2.detail_fields.cleanup_label", { defaultValue: "Cleanup target" })],
    ["error", t("failover_v2.detail_fields.error", { defaultValue: "Error" })],
  ] as const;

  return candidates
    .map(([key, label]) => ({
      key,
      label,
      value: formatDetailSummaryValue(t, key, object[key]),
    }))
    .filter((item) => Boolean(item.value))
    .slice(0, maxItems);
}

function isFailoverV2ExecutionStatusActive(status: string | null | undefined) {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (FAILOVER_V2_ACTIVE_EXECUTION_STATUSES.has(normalized)) {
    return true;
  }
  if (FAILOVER_V2_TERMINAL_EXECUTION_STATUSES.has(normalized)) {
    return false;
  }
  // Keep future in-progress statuses operable until they are explicitly marked terminal.
  return true;
}

function isFailoverV2ServiceBusy(service: FailoverV2Service) {
  // Do not lock by `last_status` alone: it can be stale after interruption/restart.
  // Rely on execution records (finished_at + status) as the source of truth.
  return service.recent_executions.some((execution) => (
    !execution.finished_at && isFailoverV2ExecutionStatusActive(execution.status)
  ));
}

function isFailoverV2MemberBusy(service: FailoverV2Service, member: FailoverV2Member) {
  // Same rule as service busy detection: do not trust stale member last_status.
  return service.recent_executions.some((execution) => (
    execution.member_id === member.id
    && !execution.finished_at
    && isFailoverV2ExecutionStatusActive(execution.status)
  ));
}

function findActiveFailoverV2ExecutionID(executions: FailoverV2ExecutionSummary[]) {
  const activeExecution = executions.find((execution) => (
    !execution.finished_at && isFailoverV2ExecutionStatusActive(execution.status)
  ));
  return activeExecution?.id ?? null;
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
  const mode = normalizeMemberModeValue(member.mode);
  const parts = mode === "existing_client"
    ? [member.watch_client_uuid]
    : [formatProviderLabel(member.provider), member.provider_entry_group, member.provider_entry_id, member.watch_client_uuid];
  return parts
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" / ");
}

function normalizeMemberModeValue(mode: unknown): FailoverV2MemberMode {
  return String(mode || "").trim() === "existing_client"
    ? "existing_client"
    : "provider_template";
}

function formatMemberModeLabel(t: TFunction, mode: unknown) {
  return normalizeMemberModeValue(mode) === "existing_client"
    ? t("failover_v2.member_mode_existing_client", { defaultValue: "Existing client" })
    : t("failover_v2.member_mode_provider_template", { defaultValue: "Provider template" });
}

function parseMemberDNSLines(value: string) {
  return Array.from(new Set(parseStringArrayText(value)));
}

function getMemberLineCodes(member: FailoverV2Member) {
  const fromLines = Array.isArray(member.lines)
    ? member.lines.map((line) => String(line.line_code || "").trim()).filter(Boolean)
    : [];
  const fallback = fromLines.length > 0
    ? fromLines
    : (Array.isArray(member.dns_lines) && member.dns_lines.length > 0
      ? member.dns_lines
      : (member.dns_line ? [member.dns_line] : []));
  return Array.from(
    new Set(
      fallback
        .map((line) => String(line || "").trim())
        .filter(Boolean),
    ),
  );
}

function formatMemberLinesSummary(t: TFunction, lines: string[]) {
  return lines
    .map((line) => localizeAliyunLineLabel(t, line))
    .filter(Boolean)
    .join(", ");
}

function localizeFailoverV2RuntimeMessage(t: TFunction, message: string | null | undefined) {
  const normalized = String(message || "").trim();
  if (!normalized) {
    return "";
  }

  const healthyMatch = normalized.match(/^(\d+)\s*\/\s*(\d+)\s+members\s+healthy$/i);
  if (healthyMatch) {
    return t("failover_v2.runtime_message_members_healthy", {
      healthy: healthyMatch[1],
      total: healthyMatch[2],
      defaultValue: `${healthyMatch[1]}/${healthyMatch[2]} members healthy`,
    });
  }

  const detachedLinesMatch = normalized.match(/^dns detached for lines\s+(.+)$/i);
  if (detachedLinesMatch) {
    const localizedLines = detachedLinesMatch[1]
      .split(",")
      .map((line) => localizeAliyunLineLabel(t, String(line || "").trim()))
      .filter(Boolean)
      .join(", ");
    return t("failover_v2.runtime_message_dns_detached_lines", {
      lines: localizedLines || detachedLinesMatch[1],
      defaultValue: `DNS detached for lines ${localizedLines || detachedLinesMatch[1]}`,
    });
  }

  return normalized;
}

function getMemberProbeBadgeLabel(
  t: TFunction,
  member: FailoverV2Member,
  memberBusy: boolean,
  detailed = true,
) {
  if (memberBusy) {
    return {
      type: "status" as const,
      label: localizeFailoverV2Status(t, "running"),
      status: "running",
    };
  }

  const runtimeStatus = String(member.last_status || "").trim().toLowerCase();
  if (runtimeStatus && runtimeStatus !== "healthy" && runtimeStatus !== "disabled") {
    return {
      type: "status" as const,
      label: localizeFailoverV2Status(t, member.last_status || runtimeStatus),
      status: runtimeStatus,
    };
  }

  const staleWithRetryText = member.probe?.stale && member.failure_threshold > 0
    ? t("failover_v2.probe.stale_with_retry", {
      defaultValue: "Stale ({{current}}/{{total}})",
      current: Math.min(Math.max(0, member.probe?.consecutive_failures || 0), member.failure_threshold),
      total: member.failure_threshold,
    })
    : null;

  if (member.probe?.stale) {
    return {
      type: "warning" as const,
      label: detailed
        ? staleWithRetryText || t("failover_v2.probe.stale", { defaultValue: "Stale" })
        : t("failover_v2.public.state_pending", { defaultValue: "状态待确认" }),
      status: "warning" as const,
    };
  }

  const probeStatus = member.probe?.status || "unknown";
  return {
    type: "status" as const,
    label: detailed
      ? `${t("failover_v2.table.probe", { defaultValue: "Probe" })}: ${localizeFailoverV2Status(t, probeStatus)}`
      : `${t("failover_v2.public.line_status", { defaultValue: "线路状态" })}: ${localizeFailoverV2Status(t, probeStatus)}`,
    status: probeStatus,
  };
}

function findLatestMemberExecutionSummary(service: FailoverV2Service, memberID: number) {
  let latestExecution: FailoverV2ExecutionSummary | null = null;
  let latestStartedAt = -1;
  for (const execution of service.recent_executions) {
    if (execution.member_id !== memberID) {
      continue;
    }
    const startedAt = new Date(String(execution.started_at || "")).getTime();
    if (Number.isNaN(startedAt)) {
      if (!latestExecution) {
        latestExecution = execution;
      }
      continue;
    }
    if (startedAt > latestStartedAt) {
      latestExecution = execution;
      latestStartedAt = startedAt;
    }
  }
  return latestExecution;
}

function formatMemberDnsStatusSummary(t: TFunction, execution: FailoverV2ExecutionSummary | null) {
  if (!execution) {
    return localizeFailoverV2Status(t, "unknown");
  }
  const detachStatus = String(execution.detach_dns_status || "").trim() || "pending";
  const attachStatus = String(execution.attach_dns_status || "").trim() || "pending";
  return `${localizeFailoverV2Stage(t, "detach_dns")}: ${localizeFailoverV2Status(t, detachStatus)} / ${localizeFailoverV2Stage(t, "attach_dns")}: ${localizeFailoverV2Status(t, attachStatus)}`;
}

function inferMemberScriptStatus(execution: FailoverV2ExecutionSummary | null) {
  if (!execution) {
    return "unknown";
  }

  const normalizedExecutionStatus = normalizeTranslationToken(execution.status);
  if (normalizedExecutionStatus === "running_scripts") {
    return "running";
  }

  const attachResult = asJsonObject(execution.attach_dns_result);
  const scriptsDetailRaw = attachResult ? (attachResult as Record<string, unknown>).scripts : null;
  const scriptsDetail = asJsonObject(scriptsDetailRaw);
  if (scriptsDetail) {
    if ((scriptsDetail as Record<string, unknown>).skipped) {
      return "skipped";
    }
    const detailError = String((scriptsDetail as Record<string, unknown>).error || "").trim();
    if (detailError) {
      return "failed";
    }
    const scriptItems = (scriptsDetail as Record<string, unknown>).scripts;
    if (Array.isArray(scriptItems)) {
      if (scriptItems.length === 0) {
        return "skipped";
      }
      for (const item of scriptItems) {
        const script = item && typeof item === "object" ? item as Record<string, unknown> : null;
        if (!script) {
          continue;
        }
        const scriptError = String(script.error || "").trim();
        if (scriptError) {
          return "failed";
        }
        const exitCode = script.exit_code;
        if (typeof exitCode === "number" && Number.isFinite(exitCode) && exitCode !== 0) {
          return "failed";
        }
      }
      return "success";
    }
  }

  if (normalizedExecutionStatus === "success") {
    return "success";
  }
  if (normalizedExecutionStatus === "failed") {
    return "failed";
  }
  if (normalizedExecutionStatus === "warning") {
    return "warning";
  }
  if (normalizedExecutionStatus === "skipped") {
    return "skipped";
  }
  if (FAILOVER_V2_ACTIVE_EXECUTION_STATUSES.has(normalizedExecutionStatus)) {
    return "running";
  }
  return "unknown";
}

function formatMemberScriptStatusSummary(t: TFunction, execution: FailoverV2ExecutionSummary | null) {
  return localizeFailoverV2Status(t, inferMemberScriptStatus(execution));
}

function formatMemberTaskStatusSummary(t: TFunction, execution: FailoverV2ExecutionSummary | null) {
  if (!execution) {
    return t("failover_v2.execution_empty", { defaultValue: "No executions recorded yet." });
  }
  const statusLabel = localizeFailoverV2Status(t, execution.status || "unknown");
  if (execution.id > 0) {
    return `#${execution.id} · ${statusLabel}`;
  }
  return statusLabel;
}

function getReadonlyJsonText(value: string, fallback: string) {
  const trimmed = String(value || "").trim();
  return trimmed || fallback;
}

function getRuntimeAddressText(currentAddress: string, detectedAddress: string) {
  const normalizedCurrentAddress = String(currentAddress || "").trim();
  if (normalizedCurrentAddress) {
    return normalizedCurrentAddress;
  }
  return String(detectedAddress || "").trim();
}

function getModeActionLabel(t: TFunction, member: FailoverV2Member) {
  return normalizeMemberModeValue(member.mode) === "existing_client"
    ? t("failover_v2.detach_existing_client_now", { defaultValue: "Detach now" })
    : t("failover_v2.failover_now", { defaultValue: "Failover now" });
}

function getModeActionDescription(t: TFunction, member: FailoverV2Member) {
  return normalizeMemberModeValue(member.mode) === "existing_client"
    ? t("failover_v2.existing_client_action_hint", { defaultValue: "Detach all bound DNS lines from the existing client." })
    : t("failover_v2.provider_template_action_hint", { defaultValue: "Current outlet can stay empty; V2 provisions a replacement instance and binds it after the first successful run." });
}

function getMemberDisplayTitle(member: FailoverV2Member) {
  const lineCodes = getMemberLineCodes(member);
  return member.name || lineCodes[0] || `#${member.id}`;
}

function formatMemberLinesFieldHint(t: TFunction, domainName: string) {
  return t("failover_v2.member_dns_lines_hint", {
    defaultValue: "Add the DNS routing lines that belong to this member. Use default if you do not need ISP-specific routing. Domain: {{domain}}",
    domain: domainName || "-",
  });
}

function formatRuntimeFieldHint(t: TFunction) {
  return t("failover_v2.runtime_fields_hint", {
    defaultValue: "Runtime fields are managed by V2 executions and shown here for inspection only.",
  });
}

function formatRuntimeClientHint(t: TFunction) {
  return t("failover_v2.runtime_client_hint", {
    defaultValue: "Empty before initialization; after a successful provider-template run, V2 stores the bound client UUID here.",
  });
}

function formatRuntimeAddressHint(t: TFunction) {
  return t("failover_v2.runtime_address_hint", {
    defaultValue: "Current resolved address tracked by V2.",
  });
}

function formatRuntimeDNSRefsHint(t: TFunction) {
  return t("failover_v2.runtime_dns_refs_hint", {
    defaultValue: "Per-line DNS record refs retained for detach and recovery.",
  });
}

function formatRuntimeInstanceHint(t: TFunction) {
  return t("failover_v2.runtime_instance_hint", {
    defaultValue: "Provider-side instance reference recorded by the last execution.",
  });
}

function getRuntimeLineCodes(dnsRecordRefsText: string, member?: FailoverV2Member | null) {
  const trimmed = String(dnsRecordRefsText || "").trim();
  if (trimmed) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const keys = Object.keys(parsed)
          .map((line) => String(line || "").trim())
          .filter(Boolean);
        if (keys.length > 0) {
          return Array.from(new Set(keys));
        }
      }
    } catch {
      // Ignore invalid runtime JSON here and fall back to persisted line metadata.
    }
  }

  if (member) {
    return getMemberLineCodes(member);
  }
  return [];
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

function parseJsonObjectTextareaValue(value: string, fallback = "{}") {
  const raw = String(value || "").trim() || fallback;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Keep structured controls usable even if the advanced JSON textarea is temporarily invalid.
  }
  return {};
}

function getJsonStringValue(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  if (value === null || value === undefined) {
    return "";
  }
  return typeof value === "string" ? value : String(value);
}

function getJsonNumberInputValue(payload: Record<string, unknown>, key: string, fallback: number) {
  const value = payload[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string") {
    return value;
  }
  return String(fallback);
}

function getJsonBooleanValue(payload: Record<string, unknown>, key: string, fallback = false) {
  const value = payload[key];
  return typeof value === "boolean" ? value : fallback;
}

function formatStringArrayText(values: string[]) {
  return values.join("\n");
}

function parseStringArrayText(value: string) {
  return String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergeJsonObjectTextareaValue(rawValue: string, fallback: string, updates: Record<string, unknown>) {
  const nextPayload = { ...parseJsonObjectTextareaValue(rawValue, fallback) };
  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined) {
      delete nextPayload[key];
      return;
    }
    nextPayload[key] = value;
  });
  return JSON.stringify(nextPayload, null, 2);
}

function parseJsonIntegerInputValue(rawValue: string, fallback: number) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.trunc(parsed));
}

function normalizeAWSPlanService(service: string) {
  return normalizeProviderKey(service, "ec2") === "lightsail" ? "lightsail" : "ec2";
}

function normalizeProviderEntryID(entryID: string) {
  const normalized = String(entryID || "").trim();
  if (!normalized || normalized === "default") {
    return FAILOVER_V2_AUTOMATIC_PROVIDER_ENTRY_ID;
  }
  return normalized;
}

function normalizeProviderEntryGroup(group: string) {
  return Array.from(String(group || "").trim()).slice(0, 100).join("");
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
    case "vultr":
      return "Vultr";
    case "aws":
      return "AWS";
    case "azure":
      return "Azure";
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
        sync_ipv6: true,
        ttl: 120,
        proxied: false,
      }, null, 2);
    default:
      return JSON.stringify({
        domain_name: "",
        rr: "@",
        record_type: "A",
        sync_ipv6: true,
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
        region: DEFAULT_LINODE_REGION,
        type: DEFAULT_LINODE_TYPE,
        image: DEFAULT_LINODE_IMAGE,
      }, null, 2);
    case "vultr":
      return JSON.stringify({
        region: DEFAULT_VULTR_REGION,
        plan: DEFAULT_VULTR_PLAN,
        os_id: Number(DEFAULT_VULTR_IMAGE),
        enable_ipv6: true,
        backups_enabled: false,
        ddos_protection: false,
        root_password_mode: "provider_default",
      }, null, 2);
    case "aws":
      return JSON.stringify({
        service: "ec2",
        region: DEFAULT_AWS_REGION,
        image_id: DEFAULT_STATIC_EC2_IMAGE_ID,
        instance_type: DEFAULT_STATIC_EC2_INSTANCE_TYPE,
        assign_public_ip: true,
        assign_ipv6: true,
        allow_all_traffic: true,
      }, null, 2);
    case "azure":
      return JSON.stringify({
        location: DEFAULT_AZURE_LOCATION,
        size: DEFAULT_AZURE_SIZE,
        public_ip: true,
        assign_ipv6: true,
        root_password_mode: "random",
        image_preset: "ubuntu-2404",
        image: DEFAULT_AZURE_IMAGE,
      }, null, 2);
    default:
      return JSON.stringify({
        region: DEFAULT_DIGITALOCEAN_REGION,
        size: DEFAULT_DIGITALOCEAN_SIZE,
        image: DEFAULT_DIGITALOCEAN_IMAGE,
        ipv6: true,
        monitoring: true,
        backups: false,
      }, null, 2);
  }
}

function getMemberPlanPayloadHint(provider: string) {
  switch (normalizeProviderKey(provider, FAILOVER_V2_MEMBER_PROVIDER)) {
    case "linode":
      return "Linode payload must include region, type, and image. V2 auto-connect is injected automatically and root password is generated automatically.";
    case "vultr":
      return "Vultr payload must include region, plan, and os_id. V2 auto-connect is injected automatically; the provider default root password is saved when Vultr returns one.";
    case "aws":
      return "AWS payload must include region. EC2 requires image_id and instance_type. Lightsail requires service: lightsail plus availability_zone, blueprint_id, and bundle_id. V2 auto-connect is injected automatically and all inbound traffic is opened by default.";
    case "azure":
      return "Azure payload must include location, size, and image publisher/offer/sku. V2 auto-connect is injected automatically; public IPv4, IPv6, and allow-all inbound rules are enabled by default.";
    default:
      return "DigitalOcean payload must include region, size, and image. V2 auto-connect is injected automatically and root password is generated automatically.";
  }
}

function isFailoverV2MemberProviderAllowed(
  provider: (typeof FAILOVER_V2_MEMBER_PROVIDERS)[number]["value"],
  hasFeature: (feature: AccountFeature) => boolean,
) {
  return hasFeature(FAILOVER_V2_MEMBER_PROVIDER_FEATURES[provider]);
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
    check_interval_seconds: "60",
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
    check_interval_seconds: String(service.check_interval_seconds || 60),
  };
}

function createEmptyMemberForm(provider = FAILOVER_V2_MEMBER_PROVIDER): MemberFormState {
  const normalizedProvider = normalizeProviderKey(provider, FAILOVER_V2_MEMBER_PROVIDER);
  return {
    name: "",
    enabled: true,
    priority: "1",
    mode: "provider_template",
    watch_client_uuid: "",
    dns_lines: "default",
    dns_record_refs: "{}",
    current_address: "",
    current_instance_ref: "null",
    provider: normalizedProvider,
    provider_entry_id: FAILOVER_V2_AUTOMATIC_PROVIDER_ENTRY_ID,
    provider_entry_group: "",
    plan_payload: getDefaultMemberPlanPayload(normalizedProvider),
    failure_threshold: "2",
    stale_after_seconds: "300",
    cooldown_seconds: "1800",
  };
}

function createMemberForm(member?: FailoverV2Member | null): MemberFormState {
  if (!member) {
    return createEmptyMemberForm();
  }

  const lineCodes = getMemberLineCodes(member);
  return {
    name: member.name || "",
    enabled: member.enabled,
    priority: String(member.priority || 1),
    mode: normalizeMemberModeValue(member.mode),
    watch_client_uuid: member.watch_client_uuid || "",
    dns_lines: formatStringArrayText(lineCodes),
    dns_record_refs: formatJsonTextareaValue(member.dns_record_refs, "{}"),
    current_address: member.current_address || "",
    current_instance_ref: formatJsonTextareaValue(member.current_instance_ref, "null"),
    provider: normalizeProviderKey(member.provider, FAILOVER_V2_MEMBER_PROVIDER),
    provider_entry_id: normalizeProviderEntryID(member.provider_entry_id || ""),
    provider_entry_group: normalizeProviderEntryGroup(member.provider_entry_group || ""),
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
  t: TFunction,
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
    throw new Error(t("failover_v2.field_invalid_number", {
      label,
      defaultValue: "{{label}} must be a valid number",
    }));
  }
  const value = Math.trunc(parsed);
  if (options.min !== undefined && value < options.min) {
    throw new Error(t("failover_v2.field_min_number", {
      label,
      min: options.min,
      defaultValue: "{{label}} must be at least {{min}}",
    }));
  }
  if (options.max !== undefined && value > options.max) {
    throw new Error(t("failover_v2.field_max_number", {
      label,
      max: options.max,
      defaultValue: "{{label}} must be at most {{max}}",
    }));
  }
  return value;
}

function parseJsonField(t: TFunction, rawValue: string, fallback: unknown, label: string) {
  const trimmed = String(rawValue || "").trim();
  if (!trimmed) {
    return fallback;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error(t("failover_v2.field_invalid_json", {
      label,
      defaultValue: "{{label}} must be valid JSON",
    }));
  }
}

function buildServiceInput(t: TFunction, formState: ServiceFormState): FailoverV2ServiceInput {
  return {
    name: String(formState.name || "").trim(),
    enabled: Boolean(formState.enabled),
    dns_provider: normalizeProviderKey(formState.dns_provider, FAILOVER_V2_DNS_PROVIDER),
    dns_entry_id: String(formState.dns_entry_id || "").trim(),
    dns_payload: parseJsonField(t, formState.dns_payload, {}, t("failover_v2.dns_payload", { defaultValue: "DNS payload" })),
    script_clipboard_ids: Array.from(new Set(formState.script_clipboard_ids.filter((id) => Number.isFinite(id) && id > 0))),
    script_timeout_sec: parseNumberField(t, formState.script_timeout_sec, t("failover_v2.script_timeout", { defaultValue: "Script timeout" }), 600, { min: 1 }),
    wait_agent_timeout_sec: parseNumberField(t, formState.wait_agent_timeout_sec, t("failover_v2.service_ready_timeout", { defaultValue: "服务准备时间" }), 600, { min: 1 }),
    check_interval_seconds: parseNumberField(t, formState.check_interval_seconds, t("failover_v2.check_interval", { defaultValue: "Check interval" }), 60, { min: 60 }),
    delete_strategy: FAILOVER_V2_DEFAULT_DELETE_STRATEGY,
    delete_delay_seconds: FAILOVER_V2_DEFAULT_DELETE_DELAY_SECONDS,
  };
}

function buildMemberInput(t: TFunction, formState: MemberFormState): FailoverV2MemberInput {
  const mode = normalizeMemberModeValue(formState.mode);
  const dnsLines = parseMemberDNSLines(formState.dns_lines);
  const provider = normalizeProviderKey(formState.provider, FAILOVER_V2_MEMBER_PROVIDER);
  return {
    name: String(formState.name || "").trim(),
    enabled: Boolean(formState.enabled),
    priority: parseNumberField(t, formState.priority, t("failover_v2.priority", { defaultValue: "Priority" }), 1, { min: 1 }),
    mode,
    watch_client_uuid: String(formState.watch_client_uuid || "").trim(),
    dns_lines: dnsLines,
    dns_line: dnsLines[0] || "",
    provider: mode === "provider_template" ? provider : "",
    provider_entry_id: mode === "provider_template" ? normalizeProviderEntryID(formState.provider_entry_id || "") : "",
    provider_entry_group: mode === "provider_template" ? normalizeProviderEntryGroup(formState.provider_entry_group || "") : "",
    plan_payload: mode === "provider_template"
      ? parseJsonField(t, formState.plan_payload, {}, t("failover_v2.plan_payload", { defaultValue: "Plan payload" }))
      : {},
    dns_record_refs: parseJsonField(
      t,
      formState.dns_record_refs,
      {},
      t("failover_v2.dns_record_refs", { defaultValue: "DNS record refs" }),
    ),
    current_address: String(formState.current_address || "").trim(),
    current_instance_ref: parseJsonField(
      t,
      formState.current_instance_ref,
      null,
      t("failover_v2.current_instance_ref", { defaultValue: "Current instance ref" }),
    ),
    failure_threshold: parseNumberField(t, formState.failure_threshold, t("failover_v2.failure_threshold", { defaultValue: "Failure threshold" }), 2, { min: 1 }),
    stale_after_seconds: parseNumberField(t, formState.stale_after_seconds, t("failover_v2.stale_after", { defaultValue: "Stale after" }), 300, { min: 1 }),
    cooldown_seconds: parseNumberField(t, formState.cooldown_seconds, t("failover_v2.cooldown", { defaultValue: "Cooldown" }), 1800, { min: 0 }),
  };
}

function findNodeByWatchClientUUID(nodes: FailoverNodeOption[], watchClientUUID: string) {
  const target = String(watchClientUUID || "").trim();
  if (!target) {
    return null;
  }
  return nodes.find((item) => item.uuid === target) || null;
}

function findNodeAddress(nodes: FailoverNodeOption[], watchClientUUID: string) {
  const node = findNodeByWatchClientUUID(nodes, watchClientUUID);
  return String(node?.ipv4 || node?.ipv6 || "").trim();
}

function inferAddressFamily(address: string): "ipv4" | "ipv6" | "unknown" {
  const normalizedAddress = String(address || "").trim();
  if (!normalizedAddress) {
    return "unknown";
  }
  if (normalizedAddress.includes(":")) {
    return "ipv6";
  }
  if (normalizedAddress.includes(".")) {
    return "ipv4";
  }
  return "unknown";
}

function extractAddressFromUnknown(value: unknown, family: "ipv4" | "ipv6"): string {
  const queue: unknown[] = [value];
  const prioritizedKeys = ["ip_address", "address", "value", "public_ip", "ipv4", "ipv6"];

  while (queue.length > 0) {
    const current = queue.shift();
    if (typeof current === "string") {
      const normalized = current.trim();
      if (normalized && inferAddressFamily(normalized) === family) {
        return normalized;
      }
      continue;
    }
    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }
    if (current && typeof current === "object") {
      const record = current as Record<string, unknown>;
      for (const key of prioritizedKeys) {
        if (record[key] !== undefined) {
          queue.unshift(record[key]);
        }
      }
      for (const nested of Object.values(record)) {
        queue.push(nested);
      }
    }
  }

  return "";
}

function resolveExecutionAddressByFamily(
  execution: FailoverV2ExecutionSummary | null,
  family: "ipv4" | "ipv6",
) {
  if (!execution) {
    return "";
  }

  const newAddresses = asJsonObject(execution.new_addresses);
  if (newAddresses) {
    const directAddress = family === "ipv4"
      ? firstNonEmptyValue([
        newAddresses.public_ip,
        newAddresses.ipv4,
      ])
      : firstNonEmptyValue([
        newAddresses.ipv6,
        Array.isArray(newAddresses.ipv6_addresses) ? newAddresses.ipv6_addresses[0] : undefined,
      ]);

    if (directAddress && inferAddressFamily(directAddress) === family) {
      return directAddress;
    }

    const nestedAddress = extractAddressFromUnknown(newAddresses, family);
    if (nestedAddress) {
      return nestedAddress;
    }
  }

  const attachResult = asJsonObject(execution.attach_dns_result);
  const applyResult = asJsonObject(attachResult?.apply);
  if (applyResult) {
    return extractAddressFromUnknown(applyResult, family);
  }

  return "";
}

function resolveMemberAddressByFamily(
  member: FailoverV2Member,
  execution: FailoverV2ExecutionSummary | null,
  node: FailoverNodeOption | null,
  family: "ipv4" | "ipv6",
) {
  const memberAddress = String((family === "ipv4" ? member.current_ipv4 : member.current_ipv6) || "").trim();
  if (memberAddress) {
    return memberAddress;
  }
  const nodeAddress = String((family === "ipv4" ? node?.ipv4 : node?.ipv6) || "").trim();
  if (nodeAddress) {
    return nodeAddress;
  }
  const executionAddress = resolveExecutionAddressByFamily(execution, family);
  if (executionAddress) {
    return executionAddress;
  }
  const currentAddress = String(member.current_address || "").trim();
  if (!currentAddress) {
    return "";
  }
  return inferAddressFamily(currentAddress) === family ? currentAddress : "";
}

function formatMemberResolveStatus(t: TFunction, member: FailoverV2Member, detailed = true) {
  const staleWithRetryText = member.probe?.stale && member.failure_threshold > 0
    ? t("failover_v2.probe.stale_with_retry", {
      defaultValue: "Stale ({{current}}/{{total}})",
      current: Math.min(Math.max(0, member.probe?.consecutive_failures || 0), member.failure_threshold),
      total: member.failure_threshold,
    })
    : null;
  if (member.probe?.stale) {
    return detailed
      ? staleWithRetryText || t("failover_v2.probe.stale", { defaultValue: "Stale" })
      : t("failover_v2.public.state_pending", { defaultValue: "状态待确认" });
  }
  return localizeFailoverV2Status(t, member.probe?.status || "unknown");
}

function mergeCurrentEntry<T extends CloudProviderCredentialEntry>(
  entries: T[],
  currentValue: string,
): T[] {
  const normalizedCurrent = String(currentValue || "").trim();
  if (!normalizedCurrent || normalizedCurrent === FAILOVER_V2_AUTOMATIC_PROVIDER_ENTRY_ID) {
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
    } as T,
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

function formatEntryLabel(entry: CloudProviderCredentialEntry | ProviderEntry) {
  const providerEntry = entry as ProviderEntry;
  const parts = [entry.name, providerEntry.group, entry.id]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return parts.join(" / ");
}

function normalizeProviderEntries(entries: ProviderEntry[]) {
  const seen = new Set<string>();
  const normalized: ProviderEntry[] = [];
  entries.forEach((entry) => {
    const id = String(entry.id || "").trim();
    if (!id || seen.has(id)) {
      return;
    }
    seen.add(id);
    normalized.push({
      ...entry,
      id,
      name: String(entry.name || id).trim() || id,
      group: normalizeProviderEntryGroup(entry.group || ""),
      active: Boolean(entry.active),
      values: entry.values && typeof entry.values === "object" ? entry.values : {},
    });
  });
  return normalized;
}

async function getFailoverV2ProviderEntries(provider: string): Promise<ProviderEntry[]> {
  if (provider === "aws") {
    const pool = await getAWSCredentials();
    return normalizeProviderEntries(pool.credentials.map((credential) => ({
      id: credential.id,
      name: credential.name,
      group: credential.group,
      active: credential.is_active,
      values: {
        default_region: credential.default_region,
      },
    })));
  }

  if (provider === "azure") {
    const pool = await getAzureCredentials();
    return normalizeProviderEntries(pool.credentials.map((credential) => ({
      id: credential.id,
      name: credential.name,
      group: credential.group,
      active: credential.is_active,
      values: {
        default_location: credential.default_location,
      },
    })));
  }

  if (provider === "digitalocean") {
    const pool = await getDigitalOceanTokens();
    return normalizeProviderEntries(pool.tokens.map((token) => ({
      id: token.id,
      name: token.name,
      group: token.group,
      active: token.is_active,
      values: {},
    })));
  }

  if (provider === "linode") {
    const pool = await getLinodeTokens();
    return normalizeProviderEntries(pool.tokens.map((token) => ({
      id: token.id,
      name: token.name,
      group: token.group,
      active: token.is_active,
      values: {},
    })));
  }

  if (provider === "vultr") {
    const pool = await getVultrTokens();
    return normalizeProviderEntries(pool.tokens.map((token) => ({
      id: token.id,
      name: token.name,
      group: token.group,
      active: token.is_active,
      values: {},
    })));
  }

  return normalizeProviderEntries(await getCloudProviderEntries(provider));
}

function getProviderEntryGroups(
  providerEntries: ProviderEntriesMap,
  provider: string,
) {
  const normalizedProvider = normalizeProviderKey(provider, FAILOVER_V2_MEMBER_PROVIDER);
  return Array.from(
    new Set(
      (providerEntries[normalizedProvider] || [])
        .map((entry) => normalizeProviderEntryGroup(entry.group || ""))
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

function filterProviderEntriesByGroup(entries: ProviderEntry[], group: string) {
  const normalizedGroup = normalizeProviderEntryGroup(group);
  if (!normalizedGroup) {
    return entries;
  }
  return entries.filter((entry) => normalizeProviderEntryGroup(entry.group || "") === normalizedGroup);
}

function resolveMemberProviderPoolGroup(
  provider: string,
  providerEntries: ProviderEntriesMap,
  entryGroup: string,
  entryID: string,
) {
  const normalizedGroup = normalizeProviderEntryGroup(entryGroup);
  if (normalizedGroup) {
    return normalizedGroup;
  }

  const normalizedEntryID = normalizeProviderEntryID(entryID);
  if (!normalizedEntryID || normalizedEntryID === FAILOVER_V2_AUTOMATIC_PROVIDER_ENTRY_ID) {
    return "";
  }

  const normalizedProvider = normalizeProviderKey(provider, FAILOVER_V2_MEMBER_PROVIDER);
  const matched = (providerEntries[normalizedProvider] || []).find((entry) => entry.id === normalizedEntryID);
  return normalizeProviderEntryGroup(matched?.group || "");
}

function buildSuggestedMemberAutoConnectGroup(
  provider: string,
  providerEntries: ProviderEntriesMap,
  entryGroup: string,
  entryID: string,
) {
  const normalizedProvider = normalizeProviderKey(provider, FAILOVER_V2_MEMBER_PROVIDER);
  const normalizedGroup = resolveMemberProviderPoolGroup(provider, providerEntries, entryGroup, entryID);
  if (!normalizedProvider || !normalizedGroup) {
    return "";
  }
  return `${normalizedProvider}/${normalizedGroup}`;
}

function getMemberPlanAutoConnectGroup(formState: MemberFormState) {
  return getJsonStringValue(
    parseJsonObjectTextareaValue(
      formState.plan_payload,
      getDefaultMemberPlanPayload(formState.provider),
    ),
    "auto_connect_group",
  ).trim();
}

function shouldSyncMemberAutoConnectGroup(
  formState: MemberFormState,
  providerEntries: ProviderEntriesMap,
) {
  const currentGroup = getMemberPlanAutoConnectGroup(formState);
  if (!currentGroup) {
    return true;
  }
  return currentGroup === buildSuggestedMemberAutoConnectGroup(
    formState.provider,
    providerEntries,
    formState.provider_entry_group,
    formState.provider_entry_id,
  );
}

function applySuggestedMemberAutoConnectGroup(
  formState: MemberFormState,
  providerEntries: ProviderEntriesMap,
  overrides: Partial<MemberFormState>,
) {
  const nextFormState = {
    ...formState,
    ...overrides,
  };
  if (!shouldSyncMemberAutoConnectGroup(formState, providerEntries)) {
    return nextFormState;
  }
  return {
    ...nextFormState,
    plan_payload: mergeJsonObjectTextareaValue(
      nextFormState.plan_payload,
      getDefaultMemberPlanPayload(nextFormState.provider),
      {
        auto_connect_group: buildSuggestedMemberAutoConnectGroup(
          nextFormState.provider,
          providerEntries,
          nextFormState.provider_entry_group,
          nextFormState.provider_entry_id,
        ),
      },
    ),
  };
}

function buildPlanSelectOptions(options: BuiltinPlanOption[], currentValue: string) {
  const result: BuiltinPlanOption[] = [];
  const seen = new Set<string>();
  options.forEach((option) => {
    const value = String(option.value || "").trim();
    if (!value || seen.has(value)) {
      return;
    }
    result.push({
      ...option,
      value,
      label: String(option.label || value).trim() || value,
      hint: String(option.hint || "").trim(),
      zh: String(option.zh || "").trim(),
    });
    seen.add(value);
  });

  const normalizedCurrentValue = String(currentValue || "").trim();
  if (normalizedCurrentValue && !seen.has(normalizedCurrentValue)) {
    result.unshift({
      value: normalizedCurrentValue,
      label: normalizedCurrentValue,
      hint: "Custom value",
    });
  }
  return result;
}

function formatPlanOptionLabel(option: BuiltinPlanOption) {
  const baseLabel = option.zh ? `${option.label || option.value} / ${option.zh}` : option.label || option.value;
  return option.hint ? `${baseLabel} · ${option.hint}` : baseLabel;
}

function getPlanOptionSearchText(option: BuiltinPlanOption) {
  return [option.value, option.label, option.zh, option.hint]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function PlanPresetSelect({
  value,
  options,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyText,
}: {
  value?: string;
  options: BuiltinPlanOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const resolvedPlaceholder = placeholder || t("failover_v2.plan_preset_placeholder", { defaultValue: "Select preset" });
  const resolvedSearchPlaceholder = searchPlaceholder || t("failover_v2.plan_preset_search", { defaultValue: "Search presets..." });
  const resolvedEmptyText = emptyText || t("failover_v2.plan_preset_empty", { defaultValue: "No matching preset" });
  const normalizedValue = String(value || "").trim();
  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === normalizedValue),
    [normalizedValue, options],
  );
  const selectedLabel = selectedOption
    ? formatPlanOptionLabel(selectedOption)
    : normalizedValue || resolvedPlaceholder;
  const filteredOptions = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }
    return options.filter((option) => getPlanOptionSearchText(option).includes(normalizedQuery));
  }, [options, query]);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full min-w-0 justify-between gap-2 overflow-hidden px-3 font-normal"
          title={selectedLabel}
        >
          <span className={normalizedValue ? "min-w-0 truncate" : "min-w-0 truncate text-muted-foreground"}>
            {selectedLabel}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-80 p-2"
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={resolvedSearchPlaceholder}
          className="mb-2 h-8"
        />
        <div className="max-h-72 overflow-y-auto overscroll-contain pr-1">
          {filteredOptions.length > 0 ? (
            <div className="space-y-1">
              {filteredOptions.map((option) => {
                const label = formatPlanOptionLabel(option);
                const selected = option.value === normalizedValue;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={[
                      "flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                      selected
                        ? "bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-slate-50"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800",
                    ].join(" ")}
                    title={label}
                    onClick={() => {
                      onValueChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[option.value, option.hint].filter(Boolean).join(" / ")}
                      </span>
                    </span>
                    {selected ? <Check className="size-4 shrink-0" /> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">{resolvedEmptyText}</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function getDefaultLightsailAvailabilityZone(region: string) {
  const normalizedRegion = String(region || "").trim() || DEFAULT_AWS_REGION;
  return `${normalizedRegion}a`;
}

function inferLightsailBlueprintPlatform(blueprintID: string) {
  const normalized = String(blueprintID || "").trim();
  return STATIC_LIGHTSAIL_BLUEPRINT_PRESETS.find((preset) => preset.value === normalized)?.platform || "";
}

function inferLightsailBundlePlatform(bundleID: string) {
  const normalized = String(bundleID || "").trim();
  return STATIC_LIGHTSAIL_BUNDLE_PRESETS.find((preset) => preset.value === normalized)?.platform || "";
}

function getDefaultLightsailBundleID(platform: string) {
  if (platform === "windows") {
    return STATIC_LIGHTSAIL_BUNDLE_PRESETS.find((preset) => preset.platform === "windows")?.value || "large_win_3_0";
  }
  return DEFAULT_STATIC_LIGHTSAIL_BUNDLE_ID;
}

function findMemberLabel(service: FailoverV2Service, memberID: number) {
  const member = service.members.find((item) => item.id === memberID);
  if (!member) {
    return `#${memberID}`;
  }
  return getMemberDisplayTitle(member);
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

function parseServiceDNSPayload(provider: string, payload: unknown) {
  return parseJsonObjectTextareaValue(
    formatJsonTextareaValue(payload, getDefaultServiceDNSPayload(provider)),
    getDefaultServiceDNSPayload(provider),
  );
}

export default function FailoverV2Page() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { account, hasFeature, loading, platformAdmin } = useAccount();
  const systemState = useSettings("system", { enabled: platformAdmin });
  const serviceLoadSeqRef = React.useRef(0);
  const serviceDNSCatalogSeqRef = React.useRef(0);
  const memberDNSCatalogSeqRef = React.useRef(0);
  const serviceDNSPayloadRef = React.useRef<Record<string, unknown>>({});

  const [services, setServices] = React.useState<FailoverV2Service[]>([]);
  const [expandedServiceID, setExpandedServiceID] = React.useState<number | null>(null);
  const [expandedMemberKey, setExpandedMemberKey] = React.useState<string | null>(null);
  const [nowTickMs, setNowTickMs] = React.useState(() => Date.now());
  const [loadingServices, setLoadingServices] = React.useState(true);
  const [error, setError] = React.useState("");
  const [savingSchedulerSetting, setSavingSchedulerSetting] = React.useState(false);
  const [schedulerEnableConfirmOpen, setSchedulerEnableConfirmOpen] = React.useState(false);
  const [validatingSchedulerPreflight, setValidatingSchedulerPreflight] = React.useState(false);
  const [schedulerPreflightResult, setSchedulerPreflightResult] = React.useState<FailoverV2BulkValidationResult | null>(null);

  const [scripts, setScripts] = React.useState<FailoverScriptOption[]>([]);
  const [nodes, setNodes] = React.useState<FailoverNodeOption[]>([]);
  const [dnsEntriesByProvider, setDnsEntriesByProvider] = React.useState<Record<string, CloudProviderCredentialEntry[]>>({});
  const [providerEntriesByProvider, setProviderEntriesByProvider] = React.useState<ProviderEntriesMap>({});

  const [serviceDialogOpen, setServiceDialogOpen] = React.useState(false);
  const [editingService, setEditingService] = React.useState<FailoverV2Service | null>(null);
  const [serviceForm, setServiceForm] = React.useState<ServiceFormState>(createEmptyServiceForm());
  const [serviceDNSAdvancedOpen, setServiceDNSAdvancedOpen] = React.useState(false);
  const [serviceDNSCatalog, setServiceDNSCatalog] = React.useState<FailoverDnsCatalog | null>(null);
  const [serviceDNSCatalogLoading, setServiceDNSCatalogLoading] = React.useState(false);
  const [serviceDNSCatalogError, setServiceDNSCatalogError] = React.useState("");
  const [serviceSelectedDNSRecordKey, setServiceSelectedDNSRecordKey] = React.useState("");
  const [serviceScriptSearchQuery, setServiceScriptSearchQuery] = React.useState("");
  const [savingService, setSavingService] = React.useState(false);
  const [validatingService, setValidatingService] = React.useState(false);
  const [validatingServiceID, setValidatingServiceID] = React.useState<number | null>(null);
  const [togglingServiceID, setTogglingServiceID] = React.useState<number | null>(null);
  const [syncingServiceID, setSyncingServiceID] = React.useState<number | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
  const [shareDialogService, setShareDialogService] = React.useState<FailoverV2Service | null>(null);
  const [shareRecord, setShareRecord] = React.useState<FailoverV2ShareRecord | null>(null);
  const [loadingShare, setLoadingShare] = React.useState(false);
  const [savingShare, setSavingShare] = React.useState(false);
  const [deletingShare, setDeletingShare] = React.useState(false);
  const [shareTitle, setShareTitle] = React.useState("");
  const [shareNote, setShareNote] = React.useState("");
  const [shareAccessPolicy, setShareAccessPolicy] = React.useState<FailoverV2ShareAccessPolicy>("public");
  const [shareExpiresAt, setShareExpiresAt] = React.useState("");

  const [memberDialogOpen, setMemberDialogOpen] = React.useState(false);
  const [memberDialogService, setMemberDialogService] = React.useState<FailoverV2Service | null>(null);
  const [editingMember, setEditingMember] = React.useState<FailoverV2Member | null>(null);
  const [memberForm, setMemberForm] = React.useState<MemberFormState>(createEmptyMemberForm());
  const [savingMember, setSavingMember] = React.useState(false);
  const [validatingMember, setValidatingMember] = React.useState(false);
  const [togglingMemberKey, setTogglingMemberKey] = React.useState("");
  const [memberPlanAdvancedOpen, setMemberPlanAdvancedOpen] = React.useState(false);
  const [memberStateAdvancedOpen, setMemberStateAdvancedOpen] = React.useState(false);
  const [memberDNSCatalog, setMemberDNSCatalog] = React.useState<FailoverDnsCatalog | null>(null);
  const [memberDNSCatalogLoading, setMemberDNSCatalogLoading] = React.useState(false);
  const [memberDNSCatalogError, setMemberDNSCatalogError] = React.useState("");

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
  const pageTitle = platformAdmin
    ? t("cloud.failover_v2.title", { defaultValue: "故障切换 V2" })
    : t("failover_v2.public.title", { defaultValue: "线路保障 V2" });
  const pageDescription = platformAdmin
    ? t("failover_v2.page_description", {
        defaultValue:
          "以服务和成员为单位管理第二代故障切换，支持独立调度、多线路 DNS 和云资源模板。",
      })
    : t("failover_v2.public.page_description", {
        defaultValue: "查看多线路服务状态、成员地址和最近处理结果，必要时手动发起恢复。",
      });
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
  const memberProviderOptions = React.useMemo(
    () => FAILOVER_V2_MEMBER_PROVIDERS.filter((provider) =>
      isFailoverV2MemberProviderAllowed(provider.value, hasFeature),
    ),
    [hasFeature],
  );
  const defaultMemberProvider = memberProviderOptions[0]?.value || FAILOVER_V2_MEMBER_PROVIDER;
  const memberProviderSelectOptions = React.useMemo(() => {
    const options: Array<{ value: string; label: string; disabled: boolean }> = memberProviderOptions.map((provider) => ({
      value: provider.value,
      label: provider.label,
      disabled: false,
    }));
    const currentProvider = normalizeProviderKey(memberForm.provider, FAILOVER_V2_MEMBER_PROVIDER);
    if (currentProvider && !options.some((option) => option.value === currentProvider)) {
      options.push({
        value: currentProvider,
        label: formatProviderLabel(currentProvider),
        disabled: true,
      });
    }
    return options;
  }, [memberForm.provider, memberProviderOptions]);

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
      const message = resolveFailoverV2ErrorMessage(
        t,
        loadError,
        t("failover_v2.load_failed", {
          defaultValue: "加载故障切换 V2 服务失败",
        }),
      );
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
      ...memberProviderOptions.map((provider) => getFailoverV2ProviderEntries(provider.value)),
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

    const nextProviderEntriesByProvider: ProviderEntriesMap = {};
    const memberOffset = dnsOffset + FAILOVER_V2_DNS_PROVIDERS.length;
    memberProviderOptions.forEach((provider, index) => {
      const result = results[memberOffset + index];
      nextProviderEntriesByProvider[provider.value] =
        result && result.status === "fulfilled"
          ? result.value as ProviderEntry[]
          : [];
    });
    setProviderEntriesByProvider(nextProviderEntriesByProvider);
  }, [memberProviderOptions]);

  React.useEffect(() => {
    if (loading) {
      return;
    }
    if (!hasFeature("cloud_failover_v2")) {
      return;
    }

    void loadServices();
    void loadCatalogs();
  }, [hasFeature, loadCatalogs, loadServices, loading]);

  React.useEffect(() => {
    const intervalID = window.setInterval(() => {
      setNowTickMs(Date.now());
    }, FAILOVER_V2_COUNTDOWN_TICK_MS);
    return () => window.clearInterval(intervalID);
  }, []);

  const enabledServiceCount = React.useMemo(
    () => services.filter((service) => service.enabled).length,
    [services],
  );
  const schedulerEnabled = Boolean(systemState.settings.failover_v2_scheduler_enabled);
  const schedulerPreflightHasWarnings = bulkValidationHasWarnings(schedulerPreflightResult);
  const schedulerEnableBusy = savingSchedulerSetting || validatingSchedulerPreflight;
  const hasBusyService = React.useMemo(
    () => services.some((service) => isFailoverV2ServiceBusy(service)),
    [services],
  );
  React.useEffect(() => {
    if (expandedServiceID !== null && !services.some((service) => service.id === expandedServiceID)) {
      setExpandedServiceID(null);
    }
  }, [expandedServiceID, services]);
  React.useEffect(() => {
    setExpandedMemberKey(null);
  }, [expandedServiceID]);
  const selectedMemberDetail = React.useMemo(() => {
    for (const service of services) {
      const member = service.members.find((candidate) => `${service.id}:${candidate.id}` === expandedMemberKey);
      if (member) {
        return { service, member };
      }
    }

    const expandedService = services.find((service) => service.id === expandedServiceID);
    if (expandedService?.members.length) {
      return { service: expandedService, member: expandedService.members[0] };
    }

    return null;
  }, [expandedMemberKey, expandedServiceID, services]);
  const selectedMemberDetailKey = selectedMemberDetail
    ? `${selectedMemberDetail.service.id}:${selectedMemberDetail.member.id}`
    : null;
  const servicePagination = useClientPagination(services, {
    initialPageSize: 8,
  });
  const servicePageSize = servicePagination.pageSize;
  const setServicePage = servicePagination.setPage;
  const focusedServiceID = React.useMemo(() => {
    const raw = String(searchParams.get("service") || searchParams.get("service_id") || "").trim();
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);
  const focusedMemberID = React.useMemo(() => {
    const raw = String(searchParams.get("member") || searchParams.get("member_id") || "").trim();
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);
  React.useEffect(() => {
    if (!focusedServiceID || services.length === 0) {
      return;
    }
    const focusedIndex = services.findIndex((service) => service.id === focusedServiceID);
    if (focusedIndex < 0) {
      return;
    }
    const focusedService = services[focusedIndex];
    setServicePage(Math.floor(focusedIndex / servicePageSize) + 1);
    setExpandedServiceID((current) => current === focusedServiceID ? current : focusedServiceID);
    if (focusedMemberID && focusedService.members.some((member) => member.id === focusedMemberID)) {
      const nextKey = `${focusedServiceID}:${focusedMemberID}`;
      setExpandedMemberKey((current) => current === nextKey ? current : nextKey);
    }
  }, [expandedServiceID, focusedMemberID, focusedServiceID, servicePageSize, services, setServicePage]);
  const handleServicePageChange = React.useCallback((nextPage: number) => {
    servicePagination.setPage(nextPage);
    setExpandedServiceID(null);
    setExpandedMemberKey(null);
  }, [servicePagination]);
  const handleServicePageSizeChange = React.useCallback((nextPageSize: number) => {
    servicePagination.setPageSize(nextPageSize);
    setExpandedServiceID(null);
    setExpandedMemberKey(null);
  }, [servicePagination]);
  const formatServiceNextCheckCountdown = React.useCallback((service: FailoverV2Service) => {
    const intervalSeconds = Math.max(60, Number(service.check_interval_seconds) || 60);
    const lastCheckedRaw = String(service.last_checked_at || "").trim();
    if (!lastCheckedRaw) {
      return t("failover_v2.summary.next_check_unknown", { defaultValue: "Pending first check" });
    }

    const lastCheckedAt = new Date(lastCheckedRaw);
    if (Number.isNaN(lastCheckedAt.getTime())) {
      return t("failover_v2.summary.next_check_unknown", { defaultValue: "Pending first check" });
    }

    const remainingMs = (lastCheckedAt.getTime() + (intervalSeconds * 1000)) - nowTickMs;
    if (remainingMs <= 0) {
      return t("failover_v2.summary.next_check_due", { defaultValue: "Due now" });
    }

    const totalSeconds = Math.ceil(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, [nowTickMs, t]);

  React.useEffect(() => {
    if (loading || !hasFeature("cloud_failover_v2") || !hasBusyService) {
      return undefined;
    }

    const intervalID = window.setInterval(() => {
      void loadServices({ silent: true });
    }, FAILOVER_V2_POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalID);
  }, [hasBusyService, hasFeature, loadServices, loading]);

  React.useEffect(() => {
    if (
      loading
      || !hasFeature("cloud_failover_v2")
      || hasBusyService
      || !schedulerEnabled
      || enabledServiceCount <= 0
    ) {
      return undefined;
    }

    const intervalID = window.setInterval(() => {
      void loadServices({ silent: true });
    }, FAILOVER_V2_SCHEDULER_STATUS_POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalID);
  }, [enabledServiceCount, hasBusyService, hasFeature, loadServices, loading, schedulerEnabled]);

  const currentDnsEntries = React.useMemo(
    () => mergeCurrentEntry(
      dnsEntriesByProvider[normalizeProviderKey(serviceForm.dns_provider, FAILOVER_V2_DNS_PROVIDER)] || [],
      serviceForm.dns_entry_id,
    ),
    [dnsEntriesByProvider, serviceForm.dns_entry_id, serviceForm.dns_provider],
  );
  const serviceDNSProvider = normalizeProviderKey(serviceForm.dns_provider, FAILOVER_V2_DNS_PROVIDER);
  const serviceDNSPayload = React.useMemo(
    () => parseJsonObjectTextareaValue(
      serviceForm.dns_payload,
      getDefaultServiceDNSPayload(serviceForm.dns_provider),
    ),
    [serviceForm.dns_payload, serviceForm.dns_provider],
  );
  React.useEffect(() => {
    serviceDNSPayloadRef.current = serviceDNSPayload;
  }, [serviceDNSPayload]);
  const serviceDNSRecordType = (() => {
    const recordType = getJsonStringValue(serviceDNSPayload, "record_type").toUpperCase();
    return recordType === "AAAA" ? "AAAA" : "A";
  })();
  const serviceDNSCatalogRecords = React.useMemo(
    () => serviceDNSCatalog?.records || [],
    [serviceDNSCatalog],
  );
  const serviceDNSZoneOptions = React.useMemo(
    () => getDNSZoneOptions(serviceDNSCatalog, getJsonStringValue(serviceDNSPayload, "zone_name")),
    [serviceDNSCatalog, serviceDNSPayload],
  );
  const serviceDNSDomainOptions = React.useMemo(
    () => getDNSDomainOptions(serviceDNSCatalog, getJsonStringValue(serviceDNSPayload, "domain_name")),
    [serviceDNSCatalog, serviceDNSPayload],
  );
  const serviceDNSTTLOptions = React.useMemo(
    () => getDNSTTLOptions(
      t,
      serviceDNSCatalog,
      getJsonNumberInputValue(serviceDNSPayload, "ttl", serviceDNSProvider === "cloudflare" ? 120 : 600),
    ),
    [serviceDNSCatalog, serviceDNSPayload, serviceDNSProvider, t],
  );
  const serviceDNSLineOptions = React.useMemo(
    () => getAliyunLineOptions(t, serviceDNSCatalog, ["default"]),
    [serviceDNSCatalog, t],
  );
  const memberFormMode = normalizeMemberModeValue(memberForm.mode);
  const memberUsesExistingClient = memberFormMode === "existing_client";
  const memberProvider = normalizeProviderKey(memberForm.provider, FAILOVER_V2_MEMBER_PROVIDER);
  const memberProviderEntryGroups = React.useMemo(
    () => getProviderEntryGroups(providerEntriesByProvider, memberProvider),
    [memberProvider, providerEntriesByProvider],
  );
  const currentProviderEntries = React.useMemo(
    () => mergeCurrentEntry(
      filterProviderEntriesByGroup(providerEntriesByProvider[memberProvider] || [], memberForm.provider_entry_group),
      memberForm.provider_entry_id,
    ),
    [memberForm.provider_entry_group, memberForm.provider_entry_id, memberProvider, providerEntriesByProvider],
  );
  const memberServiceDNSProvider = normalizeProviderKey(memberDialogService?.dns_provider || "", FAILOVER_V2_DNS_PROVIDER);
  const memberServiceDNSPayload = React.useMemo(
    () => parseServiceDNSPayload(
      memberDialogService?.dns_provider || FAILOVER_V2_DNS_PROVIDER,
      memberDialogService?.dns_payload,
    ),
    [memberDialogService],
  );
  const memberServiceDNSDomainName = memberServiceDNSProvider === "cloudflare"
    ? getJsonStringValue(memberServiceDNSPayload, "zone_name")
    : getJsonStringValue(memberServiceDNSPayload, "domain_name");
  const memberFormDNSLines = React.useMemo(
    () => parseMemberDNSLines(memberForm.dns_lines),
    [memberForm.dns_lines],
  );
  const memberDNSLineOptions = React.useMemo(
    () => getAliyunLineOptions(t, memberDNSCatalog, memberFormDNSLines),
    [memberDNSCatalog, memberFormDNSLines, t],
  );
  const memberPlanPayload = React.useMemo(
    () => parseJsonObjectTextareaValue(
      memberForm.plan_payload,
      getDefaultMemberPlanPayload(memberForm.provider),
    ),
    [memberForm.plan_payload, memberForm.provider],
  );
  const awsPlanService = normalizeAWSPlanService(getJsonStringValue(memberPlanPayload, "service"));
  const memberPlanRegion = getJsonStringValue(memberPlanPayload, "region");
  const awsLightsailBlueprintPlatform = inferLightsailBlueprintPlatform(getJsonStringValue(memberPlanPayload, "blueprint_id"));
  const awsLightsailBundlePresetSource = awsLightsailBlueprintPlatform
    ? STATIC_LIGHTSAIL_BUNDLE_PRESETS.filter((preset) => preset.platform === awsLightsailBlueprintPlatform)
    : STATIC_LIGHTSAIL_BUNDLE_PRESETS;
  const awsRegionOptions = React.useMemo(
    () => buildPlanSelectOptions(COMMON_AWS_REGIONS, memberPlanRegion || DEFAULT_AWS_REGION),
    [memberPlanRegion],
  );
  const awsEC2ImageOptions = React.useMemo(
    () => buildPlanSelectOptions(STATIC_EC2_IMAGE_PRESETS, getJsonStringValue(memberPlanPayload, "image_id") || DEFAULT_STATIC_EC2_IMAGE_ID),
    [memberPlanPayload],
  );
  const awsEC2InstanceTypeOptions = React.useMemo(
    () => buildPlanSelectOptions(STATIC_EC2_INSTANCE_TYPE_PRESETS, getJsonStringValue(memberPlanPayload, "instance_type") || DEFAULT_STATIC_EC2_INSTANCE_TYPE),
    [memberPlanPayload],
  );
  const awsLightsailAvailabilityZoneOptions = React.useMemo(
    () => buildPlanSelectOptions(
      ["a", "b", "c"].map((suffix) => ({
        value: `${memberPlanRegion || DEFAULT_AWS_REGION}${suffix}`,
        label: `${memberPlanRegion || DEFAULT_AWS_REGION}${suffix}`,
      })),
      getJsonStringValue(memberPlanPayload, "availability_zone") || getDefaultLightsailAvailabilityZone(memberPlanRegion),
    ),
    [memberPlanPayload, memberPlanRegion],
  );
  const awsLightsailBlueprintOptions = React.useMemo(
    () => buildPlanSelectOptions(STATIC_LIGHTSAIL_BLUEPRINT_PRESETS, getJsonStringValue(memberPlanPayload, "blueprint_id") || DEFAULT_STATIC_LIGHTSAIL_BLUEPRINT_ID),
    [memberPlanPayload],
  );
  const awsLightsailBundleOptions = React.useMemo(
    () => buildPlanSelectOptions(awsLightsailBundlePresetSource, getJsonStringValue(memberPlanPayload, "bundle_id") || getDefaultLightsailBundleID(awsLightsailBlueprintPlatform)),
    [awsLightsailBlueprintPlatform, awsLightsailBundlePresetSource, memberPlanPayload],
  );
  const digitalOceanRegionOptions = React.useMemo(
    () => buildPlanSelectOptions(COMMON_DIGITALOCEAN_REGIONS, getJsonStringValue(memberPlanPayload, "region") || DEFAULT_DIGITALOCEAN_REGION),
    [memberPlanPayload],
  );
  const digitalOceanSizeOptions = React.useMemo(
    () => buildPlanSelectOptions(COMMON_DIGITALOCEAN_SIZES, getJsonStringValue(memberPlanPayload, "size") || DEFAULT_DIGITALOCEAN_SIZE),
    [memberPlanPayload],
  );
  const digitalOceanImageOptions = React.useMemo(
    () => buildPlanSelectOptions(COMMON_DIGITALOCEAN_IMAGES, getJsonStringValue(memberPlanPayload, "image") || DEFAULT_DIGITALOCEAN_IMAGE),
    [memberPlanPayload],
  );
  const linodeRegionOptions = React.useMemo(
    () => buildPlanSelectOptions(COMMON_LINODE_REGIONS, getJsonStringValue(memberPlanPayload, "region") || DEFAULT_LINODE_REGION),
    [memberPlanPayload],
  );
  const linodeTypeOptions = React.useMemo(
    () => buildPlanSelectOptions(COMMON_LINODE_TYPES, getJsonStringValue(memberPlanPayload, "type") || DEFAULT_LINODE_TYPE),
    [memberPlanPayload],
  );
  const linodeImageOptions = React.useMemo(
    () => buildPlanSelectOptions(COMMON_LINODE_IMAGES, getJsonStringValue(memberPlanPayload, "image") || DEFAULT_LINODE_IMAGE),
    [memberPlanPayload],
  );
  const vultrRegionOptions = React.useMemo(
    () => buildPlanSelectOptions(COMMON_VULTR_REGIONS, getJsonStringValue(memberPlanPayload, "region") || DEFAULT_VULTR_REGION),
    [memberPlanPayload],
  );
  const vultrPlanOptions = React.useMemo(
    () => buildPlanSelectOptions(COMMON_VULTR_PLANS, getJsonStringValue(memberPlanPayload, "plan") || DEFAULT_VULTR_PLAN),
    [memberPlanPayload],
  );
  const vultrImageOptions = React.useMemo(
    () => buildPlanSelectOptions(COMMON_VULTR_IMAGES, getJsonNumberInputValue(memberPlanPayload, "os_id", Number(DEFAULT_VULTR_IMAGE))),
    [memberPlanPayload],
  );
  const azurePlanLocation = getJsonStringValue(memberPlanPayload, "location") || getJsonStringValue(memberPlanPayload, "region");
  const azureRootPasswordMode = (() => {
    const mode = getJsonStringValue(memberPlanPayload, "root_password_mode");
    return mode === "custom" || mode === "none" ? mode : "random";
  })();
  const azureLocationOptions = React.useMemo(
    () => buildPlanSelectOptions(COMMON_AZURE_LOCATIONS, azurePlanLocation || DEFAULT_AZURE_LOCATION),
    [azurePlanLocation],
  );
  const azureSizeOptions = React.useMemo(
    () => buildPlanSelectOptions(COMMON_AZURE_SIZES, getJsonStringValue(memberPlanPayload, "size") || DEFAULT_AZURE_SIZE),
    [memberPlanPayload],
  );
  const azureImagePresetOptions = React.useMemo(
    () => azureImagePresets.map((preset) => ({
      value: preset.id,
      label: preset.label,
    })),
    [],
  );
  const currentNodeOptions = React.useMemo(
    () => mergeCurrentNode(nodes, memberForm.watch_client_uuid),
    [memberForm.watch_client_uuid, nodes],
  );
  const detectedMemberCurrentAddress = React.useMemo(
    () => findNodeAddress(nodes, memberForm.watch_client_uuid),
    [memberForm.watch_client_uuid, nodes],
  );
  const memberRuntimeAddress = React.useMemo(
    () => getRuntimeAddressText(memberForm.current_address, detectedMemberCurrentAddress),
    [detectedMemberCurrentAddress, memberForm.current_address],
  );
  const memberRuntimeLines = React.useMemo(
    () => getRuntimeLineCodes(memberForm.dns_record_refs, editingMember),
    [editingMember, memberForm.dns_record_refs],
  );
  const serviceScriptLookup = React.useMemo(
    () => new Map(scripts.map((script) => [script.id, script])),
    [scripts],
  );
  const selectedServiceScriptEntries = React.useMemo(
    () => serviceForm.script_clipboard_ids.map((id) => ({
      id,
      script: serviceScriptLookup.get(id),
    })),
    [serviceForm.script_clipboard_ids, serviceScriptLookup],
  );
  const serviceDNSTargetLabel = (() => {
    if (serviceDNSProvider === "cloudflare") {
      return [
        getJsonStringValue(serviceDNSPayload, "record_name"),
        getJsonStringValue(serviceDNSPayload, "zone_name"),
      ].filter(Boolean).join(" / ");
    }

    return [
      getJsonStringValue(serviceDNSPayload, "rr") || "@",
      getJsonStringValue(serviceDNSPayload, "domain_name"),
    ].filter(Boolean).join(".");
  })();
  const serviceDialogSummaryRows = [
    {
      label: t("common.name", { defaultValue: "Name" }),
      value: serviceForm.name.trim() || t("common.not_set", { defaultValue: "Not set" }),
    },
    {
      label: t("common.status", { defaultValue: "Status" }),
      value: serviceForm.enabled
        ? t("common.enabled", { defaultValue: "Enabled" })
        : t("common.disabled", { defaultValue: "Disabled" }),
    },
    {
      label: t("failover_v2.dns_provider", { defaultValue: "DNS provider" }),
      value: formatProviderLabel(serviceDNSProvider),
    },
    {
      label: t("failover_v2.dns_entry", { defaultValue: "DNS entry" }),
      value: serviceForm.dns_entry_id || t("common.not_set", { defaultValue: "Not set" }),
    },
    {
      label: t("failover_v2.dns_target", { defaultValue: "DNS target" }),
      value: serviceDNSTargetLabel || t("common.not_set", { defaultValue: "Not set" }),
    },
    {
      label: t("failover_v2.dns_record_type", { defaultValue: "Record type" }),
      value: getJsonBooleanValue(serviceDNSPayload, "sync_ipv6")
        ? `${serviceDNSRecordType} + ${serviceDNSRecordType === "A" ? "AAAA" : "A"}`
        : serviceDNSRecordType,
    },
    {
      label: t("failover_v2.dns_ttl", { defaultValue: "TTL" }),
      value: getJsonNumberInputValue(serviceDNSPayload, "ttl", serviceDNSProvider === "cloudflare" ? 120 : 600),
    },
    {
      label: t("failover_v2.service_scripts", { defaultValue: "Scripts" }),
      value: selectedServiceScriptEntries.length > 0
        ? selectedServiceScriptEntries.slice(0, 2).map(({ id, script }) => script?.name || `#${id}`).join(" -> ")
        : t("failover.editor.no_script", { defaultValue: "No script" }),
    },
    {
      label: platformAdmin
        ? t("failover_v2.check_interval", { defaultValue: "Check interval" })
        : t("failover_v2.public.check_interval", { defaultValue: "检查间隔" }),
      value: `${serviceForm.check_interval_seconds || "60"}s`,
    },
  ];
  const serviceDialogPolicyNotes = [
    platformAdmin
      ? t("failover_v2.service_summary_dns_note", { defaultValue: "服务只管理共享 DNS 目标，具体线路会在成员里绑定。" })
      : t("failover_v2.public.service_summary_dns_note", { defaultValue: "服务会统一维护对外访问地址。" }),
    platformAdmin
      ? t("failover_v2.service_summary_scheduler_note", { defaultValue: "调度间隔决定服务级健康巡检频率，成员执行仍按自己的状态判断。" })
      : t("failover_v2.public.service_summary_scheduler_note", { defaultValue: "检查间隔决定服务状态更新频率。" }),
    platformAdmin
      ? t("failover_v2.service_summary_script_note", { defaultValue: "服务脚本会在替换出口通过检查后按顺序执行。" })
      : t("failover_v2.public.service_summary_script_note", { defaultValue: "服务脚本会在恢复资源准备完成后按顺序执行。" }),
  ];
  const sortedServiceScripts = React.useMemo(
    () => [...scripts].sort((left, right) => {
      const leftName = left.name || `#${left.id}`;
      const rightName = right.name || `#${right.id}`;
      return leftName.localeCompare(rightName);
    }),
    [scripts],
  );
  const memberDialogSummaryRows = (() => {
    const rows = [
      {
        label: t("common.name", { defaultValue: "Name" }),
        value: memberForm.name.trim() || t("common.not_set", { defaultValue: "Not set" }),
      },
      {
        label: t("failover_v2.member_mode", { defaultValue: "Mode" }),
        value: formatMemberModeLabel(t, memberFormMode),
      },
    ];

    if (memberUsesExistingClient) {
      rows.push({
        label: t("failover_v2.watch_client", { defaultValue: "Current client" }),
        value: memberForm.watch_client_uuid || t("common.not_set", { defaultValue: "Not set" }),
      });
      rows.push({
        label: t("failover_v2.current_address", { defaultValue: "Current address" }),
        value: memberRuntimeAddress || t("failover_v2.runtime_not_initialized", { defaultValue: "Not initialized yet" }),
      });
      return rows;
    }

    rows.push({
      label: t("failover_v2.provider", { defaultValue: "Provider" }),
      value: formatProviderLabel(memberProvider),
    });
    rows.push({
      label: t("failover_v2.provider_entry_group", { defaultValue: "Credential group" }),
      value: memberForm.provider_entry_group || t("failover_v2.provider_entry_group_all", { defaultValue: "All credentials" }),
    });
    rows.push({
      label: t("failover_v2.provider_entry", { defaultValue: "Provider credential" }),
      value: memberForm.provider_entry_id === FAILOVER_V2_AUTOMATIC_PROVIDER_ENTRY_ID
        ? t("failover_v2.provider_entry_active", { defaultValue: "Use active credential" })
        : memberForm.provider_entry_id || t("common.not_set", { defaultValue: "Not set" }),
    });

    if (memberProvider === "aws") {
      rows.push({ label: t("failover_v2.aws_service", { defaultValue: "AWS service" }), value: awsPlanService.toUpperCase() });
      rows.push({ label: t("failover_v2.plan_region", { defaultValue: "Region" }), value: memberPlanRegion || DEFAULT_AWS_REGION });
      rows.push({
        label: awsPlanService === "lightsail"
          ? t("failover_v2.aws_bundle_id", { defaultValue: "Bundle ID" })
          : t("failover_v2.aws_instance_type", { defaultValue: "Instance type" }),
        value: awsPlanService === "lightsail"
          ? getJsonStringValue(memberPlanPayload, "bundle_id") || DEFAULT_STATIC_LIGHTSAIL_BUNDLE_ID
          : getJsonStringValue(memberPlanPayload, "instance_type") || DEFAULT_STATIC_EC2_INSTANCE_TYPE,
      });
    } else if (memberProvider === "azure") {
      rows.push({ label: t("failover_v2.plan_location", { defaultValue: "Location" }), value: azurePlanLocation || DEFAULT_AZURE_LOCATION });
      rows.push({ label: t("failover_v2.azure_size", { defaultValue: "Size" }), value: getJsonStringValue(memberPlanPayload, "size") || DEFAULT_AZURE_SIZE });
      rows.push({
        label: t("failover_v2.plan_image", { defaultValue: "Image" }),
        value: azureImagePresets.find((preset) => preset.id === getJsonStringValue(memberPlanPayload, "image_preset"))?.label
          || initialAzureImagePreset.label,
      });
    } else {
      rows.push({ label: t("failover_v2.plan_region", { defaultValue: "Region" }), value: getJsonStringValue(memberPlanPayload, "region") || "-" });
      rows.push({
        label: memberProvider === "linode"
          ? t("failover_v2.linode_type", { defaultValue: "Type" })
          : memberProvider === "vultr"
            ? t("failover_v2.vultr_plan", { defaultValue: "Plan" })
            : t("failover_v2.digitalocean_size", { defaultValue: "Size" }),
        value: getJsonStringValue(memberPlanPayload, memberProvider === "linode" ? "type" : memberProvider === "vultr" ? "plan" : "size") || "-",
      });
    }

    return rows;
  })();
  const memberDialogPolicyNotes = memberUsesExistingClient
    ? [
      t("failover_v2.summary_existing_dns_detach", { defaultValue: "触发时只摘除所选 DNS 线路，不创建新云实例。" }),
      t("failover_v2.summary_existing_state_safe", { defaultValue: "当前出口状态从已绑定客户端读取，可在运行态字段中修复。" }),
    ]
    : [
      t("failover_v2.summary_provider_auto_network", { defaultValue: "云实例默认公网可达，并按后端策略放行必要网络。" }),
      t("failover_v2.summary_provider_dns_attach", { defaultValue: "实例创建成功后再挂载 DNS，避免提前切流。" }),
      t("failover_v2.summary_provider_json_advanced", { defaultValue: "不常用字段已收进 JSON 高级编辑，日常无需处理。" }),
    ];

  const handleServiceDNSProviderChange = React.useCallback((provider: string) => {
    const nextProvider = normalizeProviderKey(provider, FAILOVER_V2_DNS_PROVIDER);
    setServiceDNSAdvancedOpen(false);
    setServiceDNSCatalog(null);
    setServiceDNSCatalogError("");
    setServiceSelectedDNSRecordKey("");
    setServiceForm((current) => ({
      ...current,
      dns_provider: nextProvider,
      dns_entry_id: "",
      dns_payload: getDefaultServiceDNSPayload(nextProvider),
    }));
  }, []);

  const updateServiceDNSPayload = React.useCallback((updates: Record<string, unknown>) => {
    setServiceForm((current) => ({
      ...current,
      dns_payload: mergeJsonObjectTextareaValue(
        current.dns_payload,
        getDefaultServiceDNSPayload(current.dns_provider),
        updates,
      ),
    }));
  }, []);

  const loadServiceDNSCatalog = React.useCallback(async ({
    provider,
    entryID,
    payload,
    zoneName,
    domainName,
  }: {
    provider: string;
    entryID: string;
    payload: Record<string, unknown>;
    zoneName?: string;
    domainName?: string;
  }) => {
    const normalizedProvider = normalizeProviderKey(provider, FAILOVER_V2_DNS_PROVIDER);
    const normalizedEntryID = String(entryID || "").trim();
    const requestSeq = serviceDNSCatalogSeqRef.current + 1;
    serviceDNSCatalogSeqRef.current = requestSeq;

    if (!normalizedEntryID) {
      setServiceDNSCatalog(null);
      setServiceDNSCatalogError("");
      setServiceDNSCatalogLoading(false);
      setServiceSelectedDNSRecordKey("");
      return;
    }

    setServiceDNSCatalogLoading(true);
    setServiceDNSCatalogError("");
    try {
      const catalog = await getFailoverDnsCatalog({
        provider: normalizedProvider,
        entry_id: normalizedEntryID,
        zone_name: zoneName ?? getJsonStringValue(payload, "zone_name"),
        domain_name: domainName ?? getJsonStringValue(payload, "domain_name"),
      });
      if (serviceDNSCatalogSeqRef.current !== requestSeq) {
        return;
      }

      setServiceDNSCatalog(catalog);
      setServiceForm((current) => {
        if (normalizeProviderKey(current.dns_provider, FAILOVER_V2_DNS_PROVIDER) !== normalizedProvider
          || String(current.dns_entry_id || "").trim() !== normalizedEntryID) {
          return current;
        }

        const currentPayload = parseJsonObjectTextareaValue(
          current.dns_payload,
          getDefaultServiceDNSPayload(current.dns_provider),
        );
        const updates: Record<string, unknown> = {};
        if (normalizedProvider === "cloudflare") {
          if (!getJsonStringValue(currentPayload, "zone_name") && catalog.defaults.zone_name) {
            updates.zone_name = catalog.defaults.zone_name;
          }
          if (!getJsonStringValue(currentPayload, "zone_id") && catalog.defaults.zone_id) {
            updates.zone_id = catalog.defaults.zone_id;
          }
          if (catalog.defaults.proxied !== null && currentPayload.proxied === undefined) {
            updates.proxied = catalog.defaults.proxied;
          }
        } else if (!getJsonStringValue(currentPayload, "domain_name") && catalog.defaults.domain_name) {
          updates.domain_name = catalog.defaults.domain_name;
        }

        if (Object.keys(updates).length === 0) {
          return current;
        }
        return {
          ...current,
          dns_payload: mergeJsonObjectTextareaValue(
            current.dns_payload,
            getDefaultServiceDNSPayload(current.dns_provider),
            updates,
          ),
        };
      });
    } catch (loadError) {
      if (serviceDNSCatalogSeqRef.current !== requestSeq) {
        return;
      }
      const message = loadError instanceof Error
        ? loadError.message
        : t("failover_v2.dns_catalog_error", { defaultValue: "加载 DNS 选项失败。" });
      setServiceDNSCatalog(null);
      setServiceDNSCatalogError(message);
      setServiceSelectedDNSRecordKey("");
    } finally {
      if (serviceDNSCatalogSeqRef.current === requestSeq) {
        setServiceDNSCatalogLoading(false);
      }
    }
  }, [t]);

  const loadMemberDNSCatalog = React.useCallback(async (service: FailoverV2Service) => {
    const normalizedProvider = normalizeProviderKey(service.dns_provider, FAILOVER_V2_DNS_PROVIDER);
    const normalizedEntryID = String(service.dns_entry_id || "").trim();
    const requestSeq = memberDNSCatalogSeqRef.current + 1;
    memberDNSCatalogSeqRef.current = requestSeq;

    if (!normalizedEntryID) {
      setMemberDNSCatalog(null);
      setMemberDNSCatalogError("");
      setMemberDNSCatalogLoading(false);
      return;
    }

    const payload = parseServiceDNSPayload(normalizedProvider, service.dns_payload);
    setMemberDNSCatalogLoading(true);
    setMemberDNSCatalogError("");
    try {
      const catalog = await getFailoverDnsCatalog({
        provider: normalizedProvider,
        entry_id: normalizedEntryID,
        zone_name: getJsonStringValue(payload, "zone_name"),
        domain_name: getJsonStringValue(payload, "domain_name"),
      });
      if (memberDNSCatalogSeqRef.current !== requestSeq) {
        return;
      }
      setMemberDNSCatalog(catalog);
    } catch (loadError) {
      if (memberDNSCatalogSeqRef.current !== requestSeq) {
        return;
      }
      const message = loadError instanceof Error
        ? loadError.message
        : t("failover_v2.dns_catalog_error", { defaultValue: "加载 DNS 选项失败。" });
      setMemberDNSCatalog(null);
      setMemberDNSCatalogError(message);
    } finally {
      if (memberDNSCatalogSeqRef.current === requestSeq) {
        setMemberDNSCatalogLoading(false);
      }
    }
  }, [t]);

  React.useEffect(() => {
    if (!serviceDialogOpen) {
      setServiceDNSCatalog(null);
      setServiceDNSCatalogError("");
      setServiceDNSCatalogLoading(false);
      setServiceSelectedDNSRecordKey("");
      return;
    }
    if (!String(serviceForm.dns_entry_id || "").trim()) {
      setServiceDNSCatalog(null);
      setServiceDNSCatalogError("");
      setServiceDNSCatalogLoading(false);
      setServiceSelectedDNSRecordKey("");
      return;
    }

    void loadServiceDNSCatalog({
      provider: serviceDNSProvider,
      entryID: serviceForm.dns_entry_id,
      payload: serviceDNSPayloadRef.current,
    });
  }, [loadServiceDNSCatalog, serviceDNSProvider, serviceDialogOpen, serviceForm.dns_entry_id]);

  React.useEffect(() => {
    if (!memberDialogOpen || !memberDialogService) {
      setMemberDNSCatalog(null);
      setMemberDNSCatalogError("");
      setMemberDNSCatalogLoading(false);
      return;
    }

    void loadMemberDNSCatalog(memberDialogService);
  }, [loadMemberDNSCatalog, memberDialogOpen, memberDialogService]);

  const handleMemberProviderChange = React.useCallback((provider: string) => {
    const normalizedProvider = normalizeProviderKey(provider, FAILOVER_V2_MEMBER_PROVIDER);
    const nextProvider = memberProviderOptions.some((option) => option.value === normalizedProvider)
      ? normalizedProvider
      : defaultMemberProvider;
    setMemberPlanAdvancedOpen(false);
    setMemberForm((current) => applySuggestedMemberAutoConnectGroup(
      current,
      providerEntriesByProvider,
      {
        provider: nextProvider,
        provider_entry_id: FAILOVER_V2_AUTOMATIC_PROVIDER_ENTRY_ID,
        provider_entry_group: "",
        plan_payload: getDefaultMemberPlanPayload(nextProvider),
      },
    ));
  }, [defaultMemberProvider, memberProviderOptions, providerEntriesByProvider]);

  const handleMemberModeChange = React.useCallback((mode: string) => {
    const nextMode = normalizeMemberModeValue(mode);
    setMemberPlanAdvancedOpen(false);
    setMemberForm((current) => ({
      ...current,
      mode: nextMode,
    }));
  }, []);

  const updateMemberPlanPayload = React.useCallback((updates: Record<string, unknown>) => {
    setMemberForm((current) => ({
      ...current,
      plan_payload: mergeJsonObjectTextareaValue(
        current.plan_payload,
        getDefaultMemberPlanPayload(current.provider),
        updates,
      ),
    }));
  }, []);

  const openCreateServiceDialog = React.useCallback(() => {
    setEditingService(null);
    setServiceForm(createEmptyServiceForm());
    setServiceDNSAdvancedOpen(false);
    setServiceDNSCatalog(null);
    setServiceDNSCatalogError("");
    setServiceSelectedDNSRecordKey("");
    setServiceScriptSearchQuery("");
    setServiceDialogOpen(true);
  }, []);

  const openEditServiceDialog = React.useCallback((service: FailoverV2Service) => {
    setEditingService(service);
    setServiceForm(createServiceForm(service));
    setServiceDNSAdvancedOpen(false);
    setServiceDNSCatalog(null);
    setServiceDNSCatalogError("");
    setServiceSelectedDNSRecordKey("");
    setServiceScriptSearchQuery("");
    setServiceDialogOpen(true);
  }, []);

  const openShareDialog = React.useCallback((service: FailoverV2Service) => {
    setShareDialogService(service);
    setShareRecord(null);
    setShareTitle(service.name);
    setShareNote("");
    setShareAccessPolicy("public");
    setShareExpiresAt("");
    setShareDialogOpen(true);
    setLoadingShare(true);

    void (async () => {
      try {
        const data = await getFailoverV2Share(service.id);
        setShareRecord(data);
        setShareTitle(data.title || service.name);
        setShareNote(data.note || "");
        setShareAccessPolicy(data.access_policy);
        setShareExpiresAt(toFailoverV2ShareDateTimeLocalValue(data.expires_at));
      } catch (shareError) {
        const message = resolveFailoverV2ErrorMessage(
          t,
          shareError,
          t("failover_v2.share.load_failed", { defaultValue: "加载分享信息失败" }),
        );
        toast.error(message);
      } finally {
        setLoadingShare(false);
      }
    })();
  }, [t]);

  const openCreateMemberDialog = React.useCallback((service: FailoverV2Service) => {
    setMemberDialogService(service);
    setEditingMember(null);
    setMemberForm(createEmptyMemberForm(defaultMemberProvider));
    setMemberPlanAdvancedOpen(false);
    setMemberStateAdvancedOpen(false);
    setMemberDNSCatalog(null);
    setMemberDNSCatalogError("");
    setMemberDialogOpen(true);
  }, [defaultMemberProvider]);

  const openEditMemberDialog = React.useCallback((service: FailoverV2Service, member: FailoverV2Member) => {
    setMemberDialogService(service);
    setEditingMember(member);
    setMemberForm(createMemberForm(member));
    setMemberPlanAdvancedOpen(false);
    setMemberStateAdvancedOpen(false);
    setMemberDNSCatalog(null);
    setMemberDNSCatalogError("");
    setMemberDialogOpen(true);
  }, []);

  const handleServiceScriptToggle = React.useCallback((scriptID: number, checked: boolean) => {
    setServiceForm((current) => {
      if (checked) {
        if (current.script_clipboard_ids.includes(scriptID)) {
          return current;
        }
        return {
          ...current,
          script_clipboard_ids: [...current.script_clipboard_ids, scriptID],
        };
      }
      return {
        ...current,
        script_clipboard_ids: current.script_clipboard_ids.filter((id) => id !== scriptID),
      };
    });
  }, []);

  const moveServiceScriptToIndex = React.useCallback((scriptID: number, targetIndex: number) => {
    setServiceForm((current) => {
      const currentIndex = current.script_clipboard_ids.indexOf(scriptID);
      if (currentIndex < 0) {
        return current;
      }
      const nextIDs = [...current.script_clipboard_ids];
      const [item] = nextIDs.splice(currentIndex, 1);
      nextIDs.splice(Math.max(0, Math.min(targetIndex, nextIDs.length)), 0, item);
      return {
        ...current,
        script_clipboard_ids: nextIDs,
      };
    });
  }, []);

  const closeMemberDialog = React.useCallback(() => {
    setEditingMember(null);
    setMemberDialogOpen(false);
    setMemberDNSCatalog(null);
    setMemberDNSCatalogError("");
    setMemberPlanAdvancedOpen(false);
    setMemberStateAdvancedOpen(false);
  }, []);

  const handleSaveService = React.useCallback(async () => {
    try {
      const input = buildServiceInput(t, serviceForm);
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
      const message = resolveFailoverV2ErrorMessage(
        t,
        saveError,
        t("common.error", { defaultValue: "Error" }),
      );
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
      const input = buildMemberInput(t, memberForm);
      setSavingMember(true);
      if (editingMember) {
        await updateFailoverV2Member(memberDialogService.id, editingMember.id, input);
        toast.success(t("common.updated_successfully", { defaultValue: "Updated successfully" }));
      } else {
        await createFailoverV2Member(memberDialogService.id, input);
        toast.success(t("common.created_successfully", { defaultValue: "Created successfully" }));
      }
      closeMemberDialog();
      await loadServices();
    } catch (saveError) {
      const message = resolveFailoverV2ErrorMessage(
        t,
        saveError,
        t("common.error", { defaultValue: "Error" }),
      );
      toast.error(message);
    } finally {
      setSavingMember(false);
    }
  }, [closeMemberDialog, editingMember, loadServices, memberDialogService, memberForm, t]);

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
      const input = buildServiceInput(t, serviceForm);
      const result = await validateFailoverV2Service(input, editingService?.id ?? null);
      showValidationResult(
        editingService
          ? t("failover_v2.validation_service_title", { defaultValue: "Service validation" })
          : t("failover_v2.validation_new_service_title", { defaultValue: "New service validation" }),
        result,
      );
    } catch (validateError) {
      const message = resolveFailoverV2ErrorMessage(
        t,
        validateError,
        t("common.error", { defaultValue: "Error" }),
      );
      toast.error(message);
    } finally {
      setValidatingService(false);
    }
  }, [editingService, serviceForm, showValidationResult, t]);

  const handleValidateExistingService = React.useCallback(async (service: FailoverV2Service) => {
    try {
      setValidatingServiceID(service.id);
      const input = buildServiceInput(t, createServiceForm(service));
      const result = await validateFailoverV2Service(input, service.id);
      showValidationResult(
        t("failover_v2.validation_existing_service_title", {
          defaultValue: `Validate ${service.name || "service"}`,
          name: service.name || "service",
        }),
        result,
      );
    } catch (validateError) {
      const message = resolveFailoverV2ErrorMessage(
        t,
        validateError,
        t("common.error", { defaultValue: "Error" }),
      );
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
      const input = buildMemberInput(t, memberForm);
      const result = await validateFailoverV2Member(memberDialogService.id, input, editingMember?.id ?? null);
      showValidationResult(
        editingMember
          ? t("failover_v2.validation_member_title", { defaultValue: "Member validation" })
          : t("failover_v2.validation_new_member_title", { defaultValue: "New member validation" }),
        result,
      );
    } catch (validateError) {
      const message = resolveFailoverV2ErrorMessage(
        t,
        validateError,
        t("common.error", { defaultValue: "Error" }),
      );
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
      const message = resolveFailoverV2ErrorMessage(
        t,
        toggleError,
        t("common.error", { defaultValue: "Error" }),
      );
      toast.error(message);
    } finally {
      setTogglingServiceID(null);
    }
  }, [replaceServiceInState, t]);

  const handleSyncServiceDNS = React.useCallback(async (service: FailoverV2Service) => {
    try {
      setSyncingServiceID(service.id);
      const result = await syncFailoverV2ServiceDNS(service.id);
      replaceServiceInState(result.service);
      toast.success(t("failover_v2.dns_sync_now_success", {
        defaultValue: "DNS 对账完成：已同步 {{applied}} 个成员，跳过 {{skipped}} 个。",
        applied: result.sync.applied,
        skipped: result.sync.skipped,
      }));
    } catch (syncError) {
      const message = resolveFailoverV2ErrorMessage(
        t,
        syncError,
        t("failover_v2.dns_sync_now_failed", { defaultValue: "DNS 对账失败" }),
      );
      toast.error(message);
    } finally {
      setSyncingServiceID(null);
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
      const message = resolveFailoverV2ErrorMessage(
        t,
        toggleError,
        t("common.error", { defaultValue: "Error" }),
      );
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
      const message = resolveFailoverV2ErrorMessage(
        t,
        deleteError,
        t("common.error", { defaultValue: "Error" }),
      );
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
      const message = resolveFailoverV2ErrorMessage(
        t,
        detachError,
        t("common.error", { defaultValue: "Error" }),
      );
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
      const message = resolveFailoverV2ErrorMessage(
        t,
        failoverError,
        t("common.error", { defaultValue: "Error" }),
      );
      toast.error(message);
    } finally {
      setRunningFailover(false);
    }
  }, [failoverTarget, loadServices, t]);

  const shareUrl = React.useMemo(() => (
    shareRecord?.token ? buildFailoverV2ShareUrl(shareRecord.token) : ""
  ), [shareRecord?.token]);

  const handleCopyShareLink = React.useCallback(async () => {
    if (!shareUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t("copy_success", { defaultValue: "Copied!" }));
    } catch (copyError) {
      const message = resolveFailoverV2ErrorMessage(
        t,
        copyError,
        t("failover_v2.share.copy_failed", { defaultValue: "复制失败，请手动复制。" }),
      );
      toast.error(message);
    }
  }, [shareUrl, t]);

  const handleSaveShare = React.useCallback(async () => {
    if (!shareDialogService) {
      return;
    }

    const expiresAt = fromFailoverV2ShareDateTimeLocalValue(shareExpiresAt);
    if (shareExpiresAt.trim() && !expiresAt) {
      toast.error(t("failover_v2.share.invalid_expires_at", { defaultValue: "过期时间无效" }));
      return;
    }

    try {
      setSavingShare(true);
      const data = await saveFailoverV2Share(shareDialogService.id, {
        title: shareTitle,
        note: shareNote,
        access_policy: shareAccessPolicy,
        expires_at: expiresAt,
      });
      setShareRecord(data);
      setShareTitle(data.title || shareDialogService.name);
      setShareNote(data.note || "");
      setShareAccessPolicy(data.access_policy);
      setShareExpiresAt(toFailoverV2ShareDateTimeLocalValue(data.expires_at));
      toast.success(t("failover_v2.share.saved", { defaultValue: "分享链接已更新" }));
    } catch (saveError) {
      const message = resolveFailoverV2ErrorMessage(
        t,
        saveError,
        t("failover_v2.share.save_failed", { defaultValue: "保存分享链接失败" }),
      );
      toast.error(message);
    } finally {
      setSavingShare(false);
    }
  }, [shareAccessPolicy, shareDialogService, shareExpiresAt, shareNote, shareTitle, t]);

  const handleDeleteShare = React.useCallback(async () => {
    if (!shareDialogService) {
      return;
    }

    try {
      setDeletingShare(true);
      await deleteFailoverV2Share(shareDialogService.id);
      setShareRecord(null);
      setShareTitle(shareDialogService.name);
      setShareNote("");
      setShareAccessPolicy("public");
      setShareExpiresAt("");
      toast.success(t("failover_v2.share.revoked", { defaultValue: "分享链接已撤销" }));
    } catch (deleteError) {
      const message = resolveFailoverV2ErrorMessage(
        t,
        deleteError,
        t("failover_v2.share.delete_failed", { defaultValue: "撤销分享链接失败" }),
      );
      toast.error(message);
    } finally {
      setDeletingShare(false);
    }
  }, [shareDialogService, t]);

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
      const message = resolveFailoverV2ErrorMessage(
        t,
        loadError,
        t("failover_v2.execution_load_failed", {
          defaultValue: "加载执行详情失败",
        }),
      );
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

      const activeExecutionID = findActiveFailoverV2ExecutionID(data);
      const preferredExecution = preferredExecutionID
        ? data.find((execution) => execution.id === preferredExecutionID)
        : null;
      const preferredExecutionIsActive = Boolean(
        preferredExecution
        && !preferredExecution.finished_at
        && isFailoverV2ExecutionStatusActive(preferredExecution.status),
      );

      let nextExecutionID: number | null = null;
      if (activeExecutionID && (!preferredExecutionID || !preferredExecutionIsActive)) {
        nextExecutionID = activeExecutionID;
      } else if (preferredExecutionID && preferredExecution) {
        nextExecutionID = preferredExecutionID;
      } else {
        nextExecutionID = data[0]?.id ?? null;
      }

      if (nextExecutionID) {
        await loadExecutionDetail(service.id, nextExecutionID, options);
      } else {
        setSelectedExecutionID(null);
        setSelectedExecution(null);
      }
    } catch (loadError) {
      const message = resolveFailoverV2ErrorMessage(
        t,
        loadError,
        t("failover_v2.execution_history_failed", {
          defaultValue: "加载执行历史失败",
        }),
      );
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
    const nextPreferredID =
      findActiveFailoverV2ExecutionID(service.recent_executions) ??
      preferredExecutionID ??
      service.last_execution_id ??
      null;
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

  const selectedExecutionActions = React.useMemo(() => {
    if (!selectedExecution) {
      return null;
    }
    return resolveExecutionActionsFallback(selectedExecution);
  }, [selectedExecution]);

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
      const message = resolveFailoverV2ErrorMessage(
        t,
        actionError,
        t("common.error", { defaultValue: "Error" }),
      );
      toast.error(message);
      void loadServices({ silent: true });
      if (executionDialogTarget?.service.id === executionActionTarget.serviceID) {
        void loadExecutionHistory(
          executionDialogTarget.service,
          executionActionTarget.executionID,
          { silent: true },
        );
      }
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
      const message = resolveFailoverV2ErrorMessage(
        t,
        loadError,
        t("failover_v2.pending_cleanup_load_failed", {
          defaultValue: "加载待清理任务失败",
        }),
      );
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
      const message = resolveFailoverV2ErrorMessage(
        t,
        actionError,
        t("common.error", { defaultValue: "Error" }),
      );
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
      const message = resolveFailoverV2ErrorMessage(
        t,
        saveError,
        t("common.error", { defaultValue: "Error" }),
      );
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
      const message = resolveFailoverV2ErrorMessage(
        t,
        preflightError,
        t("common.error", { defaultValue: "Error" }),
      );
      toast.error(message);
    } finally {
      setValidatingSchedulerPreflight(false);
    }
  }, [handleToggleScheduler, schedulerPreflightResult, showValidationResult, t]);

  if (loading) {
    return (
      <AdminPageShell
        title={pageTitle}
        description={pageDescription}
        contentClassName="gap-3"
      >
        <AdminTableSkeleton columns={7} rows={5} />
      </AdminPageShell>
    );
  }

  if (!hasFeature("cloud_failover_v2")) {
    return <Navigate to={getDefaultAdminPath(account)} replace />;
  }

  return (
    <>
      <AdminPageShell
        title={pageTitle}
        description={pageDescription}
        contentClassName="gap-3"
      >
        {platformAdmin && !loadingServices && services.length > 0 ? (
          <AdminDataPanel bodyClassName="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">
                {t("failover_v2.scheduler.title", { defaultValue: "Automatic Scheduler" })}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {schedulerEnabled
                  ? t("failover_v2.scheduler.enabled_hint", { defaultValue: "调度器正在统一巡检 V2 任务。" })
                  : t("failover_v2.scheduler.disabled_hint", { defaultValue: "启用后由调度器统一巡检 V2 任务。" })}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Badge color={schedulerEnabled ? "green" : "amber"}>
                {schedulerEnabled
                  ? t("failover_v2.scheduler.enabled", { defaultValue: "Enabled" })
                  : t("failover_v2.scheduler.disabled", { defaultValue: "Disabled" })}
              </Badge>
              <Switch
                checked={schedulerEnabled}
                disabled={schedulerEnableBusy || systemState.loading}
                onCheckedChange={(checked) => {
                  handleRequestToggleScheduler(checked);
                }}
              />
            </div>
          </AdminDataPanel>
        ) : null}

        {error ? (
          <AdminSurface>
            <div className="admin-alert admin-alert-danger text-sm">
              {error}
            </div>
          </AdminSurface>
        ) : null}

        {!error && loadingServices ? (
          <AdminTableSkeleton columns={4} rows={4} />
        ) : null}

        {!loadingServices && services.length === 0 ? (
          <AdminDataPanel bodyClassName="px-5 py-8">
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
              <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-200">
                {t("failover_v2.empty_badge", { defaultValue: "V2 工作台" })}
              </div>
              <div className="space-y-2">
                <h2 className="text-base font-semibold text-foreground">
                  {t("failover_v2.empty_title", { defaultValue: "No V2 services yet" })}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  {t("failover_v2.empty_description", {
                    defaultValue:
                      "Create your first isolated V2 service. Each service can manage multiple members without affecting V1.",
                  })}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-md border border-border bg-background px-2.5 py-1">
                  {t("failover_v2.empty_tag_members", { defaultValue: "多成员" })}
                </span>
                <span className="rounded-md border border-border bg-background px-2.5 py-1">
                  {t("failover_v2.empty_tag_dns", { defaultValue: "独立 DNS" })}
                </span>
              </div>
              {platformAdmin ? (
                <Button onClick={openCreateServiceDialog} size="sm" className="shrink-0">
                  <Plus className="mr-2 size-4" />
                  {t("failover_v2.create_service", { defaultValue: "Create service" })}
                </Button>
              ) : null}
            </div>
          </AdminDataPanel>
        ) : null}

        {!loadingServices && services.length > 0 ? (
          <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_390px]">
            <AdminDataPanel
              title={t("failover_v2.workbench.task_queue", { defaultValue: "任务列表" })}
              description={platformAdmin
                ? t("failover_v2.workbench.task_queue_hint", { defaultValue: "先看任务健康和最近执行，点击任务展开子成员。" })
                : t("failover_v2.public.task_queue_hint", { defaultValue: "查看服务状态、成员地址和最近处理结果，点击任务展开成员。" })}
              bodyClassName="p-0"
              actions={(
                <>
                  <span className="rounded-md border border-border bg-[var(--surface-subtle)] px-2.5 py-1.5 text-xs text-muted-foreground">
                    {services.length} {t("failover_v2.workbench.task_count_suffix", { defaultValue: "个任务" })}
                  </span>
                  <Button size="sm" onClick={openCreateServiceDialog}>
                    <Plus className="size-4" />
                    {t("failover_v2.create_service", { defaultValue: "Create service" })}
                  </Button>
                </>
              )}
            >

              <div className="admin-data-table-scroll overflow-x-auto overscroll-x-contain [scrollbar-gutter:stable]">
              <div className="admin-grid-table min-w-[820px]">
                <div className="admin-grid-head grid grid-cols-[minmax(150px,0.72fr)_minmax(260px,1.25fr)_minmax(220px,1fr)_120px] items-center gap-3 px-3 py-2 text-[12px] font-semibold text-muted-foreground">
                  <div>{t("failover_v2.workbench.task_detail", { defaultValue: "任务" })}</div>
                  <div>{t("failover_v2.summary.members", { defaultValue: "Members" })}</div>
                  <div>{t("failover_v2.workbench.execution_state", { defaultValue: "执行状态" })}</div>
                  <div className="text-right">{t("common.actions", { defaultValue: "Actions" })}</div>
                </div>
                {servicePagination.pageItems.map((service) => {
                  const expanded = expandedServiceID === service.id;
                  const serviceBusy = isFailoverV2ServiceBusy(service);
                  const activeExecutionID = findActiveFailoverV2ExecutionID(service.recent_executions);
                  const latestExecution = service.recent_executions.find((execution) => execution.id === activeExecutionID)
                    || service.recent_executions[0]
                    || null;
                  const serviceStatus = String(service.last_status || "").trim().toLowerCase();
                  const serviceMemberWarning = service.members.some((member) => (
                    member.probe?.stale
                    || ["failed", "warning", "error"].includes(String(member.last_status || "").trim().toLowerCase())
                  ));
                  const serviceExecutionWarning = service.recent_executions.some((execution) => (
                    Boolean(execution.error_message)
                    || ["failed", "warning"].includes(String(execution.detach_dns_status || "").trim().toLowerCase())
                    || ["failed", "warning"].includes(String(execution.attach_dns_status || "").trim().toLowerCase())
                    || ["failed", "warning", "manual_review"].includes(String(execution.cleanup_status || "").trim().toLowerCase())
                  ));
                  const serviceNeedsAttention = !serviceBusy && (
                    Boolean(service.last_message)
                    || ["failed", "warning", "error"].includes(serviceStatus)
                    || serviceMemberWarning
                    || serviceExecutionWarning
                  );
                  const serviceHealthColor = serviceBusy
                    ? "blue"
                    : serviceNeedsAttention
                      ? "red"
                      : service.enabled
                        ? "green"
                        : "gray";
                  const serviceHealthLabel = serviceBusy
                    ? t("failover_v2.status.running", { defaultValue: "运行中" })
                    : serviceNeedsAttention
                      ? t("failover_v2.stats.attention", { defaultValue: "需关注" })
                      : service.enabled
                        ? t("failover_v2.status.healthy", { defaultValue: "健康" })
                        : t("common.disabled", { defaultValue: "Disabled" });
                  const toggleServiceExpanded = () => {
                    setExpandedServiceID(expanded ? null : service.id);
                  };
                  const serviceMemberSummary = `${t("failover_v2.summary.members", { defaultValue: "Members" })} ${service.enabled_member_count}/${service.member_count}`;
                  const serviceDnsSummary = platformAdmin && service.dns_provider
                    ? `${t("failover_v2.detail_fields.dns", { defaultValue: "DNS" })}: ${formatProviderLabel(service.dns_provider)}`
                    : null;
                  const latestExecutionLabel = latestExecution
                    ? localizeFailoverV2Status(t, latestExecution.status || "unknown")
                    : t("failover_v2.execution_empty_short", { defaultValue: "暂无执行" });
                  const nextCheckSummary = `${t("failover_v2.summary.next_check", { defaultValue: "Next check" })}: ${formatServiceNextCheckCountdown(service)}`;

                  return (
                    <div
                      key={service.id}
                      data-selected={expanded ? "true" : undefined}
                      className={cn(
                        "admin-grid-row",
                        serviceBusy && "bg-amber-50/70 dark:bg-amber-950/20",
                      )}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={toggleServiceExpanded}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleServiceExpanded();
                          }
                        }}
                        className="grid cursor-pointer grid-cols-[minmax(150px,0.72fr)_minmax(260px,1.25fr)_minmax(220px,1fr)_120px] items-center gap-3 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                            <span className="min-w-0 truncate text-sm font-semibold text-foreground" title={service.name}>
                              {service.name}
                            </span>
                            {serviceBusy ? <LoaderCircle className="size-3.5 shrink-0 animate-spin text-sky-500" /> : null}
                            <Badge color={serviceHealthColor}>{serviceHealthLabel}</Badge>
                            {!service.enabled ? (
                              <Badge color="gray">{t("common.disabled", { defaultValue: "Disabled" })}</Badge>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex min-w-0 items-center gap-2 whitespace-nowrap text-xs text-muted-foreground">
                          <span className="shrink-0 font-medium text-foreground">
                            {serviceMemberSummary}
                          </span>
                          {serviceDnsSummary ? (
                            <span className="min-w-0 truncate" title={serviceDnsSummary}>
                              {serviceDnsSummary}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                          <Badge color={latestExecution ? getStatusBadgeColor(latestExecution.status || "unknown") : "gray"}>
                            {latestExecutionLabel}
                          </Badge>
                          <span className="min-w-0 truncate text-xs text-muted-foreground" title={nextCheckSummary}>
                            {nextCheckSummary}
                          </span>
                        </div>

                        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                          {platformAdmin ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-md px-2 text-[12px]"
                              onClick={(event) => {
                                event.stopPropagation();
                                openCreateMemberDialog(service);
                              }}
                              disabled={serviceBusy}
                              title={t("failover_v2.add_member_short", { defaultValue: "成员" })}
                              aria-label={t("failover_v2.add_member_short", { defaultValue: "成员" })}
                            >
                              <Plus className="size-3.5" />
                              <span className="hidden 2xl:inline">
                                {t("failover_v2.add_member_short", { defaultValue: "成员" })}
                              </span>
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 rounded-md px-2.5 text-[12px]"
                            aria-expanded={expanded}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleServiceExpanded();
                            }}
                          >
                            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                            <span>
                              {expanded
                                ? t("failover_v2.workbench.collapse_task", { defaultValue: "收起" })
                                : t("failover_v2.workbench.expand_task", { defaultValue: "展开" })}
                            </span>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 rounded-md px-0"
                                onClick={(event) => event.stopPropagation()}
                                title={t("common.more_actions", { defaultValue: "More actions" })}
                                aria-label={t("common.more_actions", { defaultValue: "More actions" })}
                              >
                                <MoreHorizontal className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                              <DropdownMenuItem
                                onSelect={() => { void handleValidateExistingService(service); }}
                                disabled={validatingServiceID === service.id}
                              >
                                {validatingServiceID === service.id ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
                                {t("failover_v2.validate_short", { defaultValue: "校验" })}
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => openExecutionDialog(service, service.last_execution_id ?? null)}>
                                <RefreshCw className="size-4" />
                                {t("failover_v2.execution_history_short", { defaultValue: "记录" })}
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => openPendingCleanupDialog(service)}>
                                <RefreshCw className="size-4" />
                                {t("failover_v2.pending_cleanup_short", { defaultValue: "清理" })}
                              </DropdownMenuItem>
                              {platformAdmin ? (
                                <DropdownMenuItem
                                  onSelect={() => { void handleSyncServiceDNS(service); }}
                                  disabled={serviceBusy || syncingServiceID === service.id}
                                >
                                  <RefreshCw className={cn("size-4", syncingServiceID === service.id && "animate-spin")} />
                                  {t("failover_v2.sync_dns_now", { defaultValue: "同步 DNS" })}
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuItem onSelect={() => openShareDialog(service)}>
                                <Share2 className="size-4" />
                                {t("failover_v2.share.short", { defaultValue: "分享" })}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => openEditServiceDialog(service)}
                                disabled={serviceBusy}
                              >
                                <PencilLine className="size-4" />
                                {t("common.edit", { defaultValue: "Edit" })}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => { void handleToggleServiceEnabled(service, !service.enabled); }}
                                disabled={serviceBusy || togglingServiceID === service.id}
                              >
                                {togglingServiceID === service.id ? <LoaderCircle className="size-4 animate-spin" /> : null}
                                {service.enabled
                                  ? t("failover_v2.actions.disable_service", { defaultValue: "停用任务" })
                                  : t("failover_v2.actions.enable_service", { defaultValue: "启用任务" })}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => setDeleteTarget({ kind: "service", service })}
                                disabled={serviceBusy}
                              >
                                <Trash2 className="size-4" />
                                {t("common.delete", { defaultValue: "Delete" })}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {expanded ? (
                        <div className="border-t border-border bg-[var(--surface-subtle)]">
                          <div className="overflow-hidden">
                              <div className="admin-grid-head grid grid-cols-[minmax(230px,1fr)_minmax(160px,0.7fr)_minmax(180px,0.85fr)_74px] items-center gap-3 px-3 py-2 text-[12px] font-semibold text-muted-foreground">
                                <div>{t("failover_v2.workbench.member_list", { defaultValue: "子成员" })}</div>
                                <div>{t("failover_v2.detail_fields.addresses", { defaultValue: "地址" })}</div>
                                <div>{t("failover_v2.workbench.execution_state", { defaultValue: "执行状态" })}</div>
                                <div className="text-right">{t("common.status", { defaultValue: "Status" })}</div>
                              </div>

                              {service.members.length === 0 ? (
                                <div className="px-3 py-5 text-sm text-muted-foreground">
                                  {t("failover_v2.no_members", {
                                    defaultValue: "This service has no members yet.",
                                  })}
                                </div>
                              ) : (
                                <div className="max-h-[480px] divide-y divide-border overflow-y-auto">
                                  {service.members.map((member) => {
                                    const memberBusy = isFailoverV2MemberBusy(service, member);
                                    const memberActionsDisabled = memberBusy;
                                    const memberLineCodes = getMemberLineCodes(member);
                                    const latestMemberExecution = findLatestMemberExecutionSummary(service, member.id);
                                    const memberTaskStatus = formatMemberTaskStatusSummary(t, latestMemberExecution);
                                    const watchedNode = findNodeByWatchClientUUID(nodes, member.watch_client_uuid);
                                    const memberIPv4Address = resolveMemberAddressByFamily(member, latestMemberExecution, watchedNode, "ipv4");
                                    const memberIPv6Address = resolveMemberAddressByFamily(member, latestMemberExecution, watchedNode, "ipv6");
                                    const probeBadge = member.probe ? getMemberProbeBadgeLabel(t, member, memberBusy, platformAdmin) : null;
                                    const memberRowKey = `${service.id}:${member.id}`;
                                    const memberSelected = selectedMemberDetailKey === memberRowKey;
                                    const memberPrimaryAddress = memberIPv4Address
                                      || memberIPv6Address
                                      || t("failover_v2.no_current_ip", { defaultValue: "No current IP" });

                                    return (
                                      <div
                                        key={member.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setExpandedMemberKey(memberRowKey)}
                                        onKeyDown={(event) => {
                                          if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            setExpandedMemberKey(memberRowKey);
                                          }
                                        }}
                                        data-selected={memberSelected ? "true" : undefined}
                                        className={cn(
                                          "admin-grid-row admin-grid-row-nested grid cursor-pointer grid-cols-[minmax(230px,1fr)_minmax(160px,0.7fr)_minmax(180px,0.85fr)_74px] items-center gap-3 px-3 py-2",
                                          memberBusy && "bg-[var(--surface-pressed)]",
                                        )}
                                      >
                                        <div className="min-w-0">
                                          <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                                            <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                                              {getMemberDisplayTitle(member)}
                                            </span>
                                            <Badge color={member.enabled ? "green" : "gray"}>
                                              {member.enabled
                                                ? t("common.enabled", { defaultValue: "Enabled" })
                                                : t("common.disabled", { defaultValue: "Disabled" })}
                                            </Badge>
                                            {probeBadge ? (
                                              <Badge color={getStatusBadgeColor(probeBadge.status)}>
                                                {probeBadge.label}
                                              </Badge>
                                            ) : null}
                                            {memberBusy ? <LoaderCircle className="size-3.5 animate-spin text-sky-500" /> : null}
                                          </div>
                                          <div className="mt-1 truncate text-xs text-muted-foreground">
                                            {memberLineCodes.length > 0
                                              ? `${formatMemberLinesSummary(t, memberLineCodes)} · ${formatMemberModeLabel(t, member.mode)}`
                                              : formatMemberSubtitle(member) || formatMemberModeLabel(t, member.mode)}
                                          </div>
                                        </div>

                                        <div className="min-w-0 whitespace-nowrap text-xs text-muted-foreground">
                                          <div className="truncate text-sm font-medium text-foreground" title={memberPrimaryAddress}>
                                            {memberPrimaryAddress}
                                          </div>
                                        </div>

                                        <div className="min-w-0 whitespace-nowrap text-xs text-muted-foreground">
                                          <div className="truncate text-sm font-medium text-foreground" title={memberTaskStatus}>
                                            {memberTaskStatus}
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-end">
                                          <div className="flex items-center gap-1.5 border-l border-border pl-2">
                                            {togglingMemberKey === memberRowKey ? <LoaderCircle className="size-3.5 animate-spin text-muted-foreground" /> : null}
                                            <Switch
                                              checked={member.enabled}
                                              disabled={memberActionsDisabled || togglingMemberKey === memberRowKey}
                                              onClick={(event) => event.stopPropagation()}
                                              onCheckedChange={(checked) => {
                                                void handleToggleMemberEnabled(service, member, checked);
                                              }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              </div>
              <AdminPagination
                page={servicePagination.page}
                totalPages={servicePagination.totalPages}
                total={servicePagination.total}
                pageSize={servicePagination.pageSize}
                visibleStart={servicePagination.visibleStart}
                visibleEnd={servicePagination.visibleEnd}
                onPageChange={handleServicePageChange}
                onPageSizeChange={handleServicePageSizeChange}
                pageSizeOptions={[8, 20, 50]}
                itemLabel={t("admin.pagination.tasks", { defaultValue: "tasks" })}
                compact
              />
            </AdminDataPanel>

            <AdminDataPanel
              title={t("failover_v2.workbench.member_detail", { defaultValue: "子成员详情" })}
              bodyClassName="p-0"
              className="xl:sticky xl:top-4 xl:self-start"
            >
                {selectedMemberDetail ? (() => {
                  const { service, member } = selectedMemberDetail;
                  const memberBusy = isFailoverV2MemberBusy(service, member);
                  const memberActionsDisabled = memberBusy;
                  const latestMemberExecution = findLatestMemberExecutionSummary(service, member.id);
                  const watchedNode = findNodeByWatchClientUUID(nodes, member.watch_client_uuid);
                  const memberIPv4Address = resolveMemberAddressByFamily(member, latestMemberExecution, watchedNode, "ipv4");
                  const memberIPv6Address = resolveMemberAddressByFamily(member, latestMemberExecution, watchedNode, "ipv6");
                  const memberResolveStatus = formatMemberResolveStatus(t, member, platformAdmin);
                  const memberDnsStatus = formatMemberDnsStatusSummary(t, latestMemberExecution);
                  const memberScriptStatus = formatMemberScriptStatusSummary(t, latestMemberExecution);
                  const memberBusyTitle = memberActionsDisabled
                    ? t("failover_v2.active_member_execution_action_disabled", {
                      defaultValue: "Actions are disabled while this member has an active execution.",
                    })
                    : undefined;
                  const serviceActiveExecutionID = findActiveFailoverV2ExecutionID(service.recent_executions);
                  const serviceLatestExecution = service.recent_executions.find((execution) => execution.id === serviceActiveExecutionID)
                    || service.recent_executions[0]
                    || null;
                  const serviceExecutionStageItems = serviceLatestExecution
                    ? [
                      { key: "detach_dns", status: serviceLatestExecution.detach_dns_status || "pending" },
                      { key: "attach_dns", status: serviceLatestExecution.attach_dns_status || "pending" },
                      { key: "cleanup", status: serviceLatestExecution.cleanup_status || "pending" },
                    ]
                    : [];

                  return (
                    <div>
                      <div className="admin-panel-header px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-medium uppercase text-muted-foreground">
                              {service.name}
                            </div>
                            <div className="mt-1 truncate text-sm font-semibold text-foreground">
                              {getMemberDisplayTitle(member)}
                            </div>
                          </div>
                          {memberBusy ? <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-sky-500" /> : null}
                        </div>
                        <div className="mt-2 truncate text-xs text-muted-foreground">
                          {formatMemberSubtitle(member) || service.name}
                        </div>
                      </div>

                        <div className="divide-y divide-border">
                        <div className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[11px] font-medium uppercase text-muted-foreground">
                                {t("failover_v2.workbench.task_detail", { defaultValue: "主任务" })}
                              </div>
                              <div className="mt-1 truncate text-sm font-semibold text-foreground">
                                {service.name}
                              </div>
                            </div>
                            <Badge color={getStatusBadgeColor(service.last_status || "unknown")}>
                              {localizeFailoverV2Status(t, service.last_status || "unknown")}
                            </Badge>
                          </div>
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            {platformAdmin ? (
                              <div>{service.dns_provider ? formatProviderLabel(service.dns_provider) : "-"} / {service.dns_entry_id || "-"}</div>
                            ) : null}
                            <div>{t("failover_v2.summary.next_check", { defaultValue: "Next check" })}: {formatServiceNextCheckCountdown(service)}</div>
                            <div>{t("failover_v2.summary.members", { defaultValue: "Members" })}: {service.enabled_member_count} / {service.member_count}</div>
                          </div>
                          {serviceLatestExecution ? (
                            <div className="mt-3 border-t border-border pt-3">
                              <div className="flex flex-wrap items-center gap-2">
                                {platformAdmin ? (
                                  <span className="text-sm font-semibold text-foreground">
                                    #{serviceLatestExecution.id}
                                  </span>
                                ) : null}
                                <Badge color={getStatusBadgeColor(serviceLatestExecution.status || "unknown")}>
                                  {localizeFailoverV2Status(t, serviceLatestExecution.status || "unknown")}
                                </Badge>
                                {serviceActiveExecutionID === serviceLatestExecution.id ? <LoaderCircle className="size-3.5 animate-spin text-sky-500" /> : null}
                              </div>
                              <div className="mt-1 truncate text-xs text-muted-foreground">
                                {findMemberLabel(service, serviceLatestExecution.member_id)}
                                {platformAdmin ? ` / ${localizeFailoverV2TriggerReason(t, serviceLatestExecution.trigger_reason)}` : ""}
                              </div>
                              {platformAdmin ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {serviceExecutionStageItems.map((stage) => (
                                  <Badge key={stage.key} color={getStatusBadgeColor(stage.status)}>
                                    {localizeFailoverV2Stage(t, stage.key)}: {localizeFailoverV2Status(t, stage.status)}
                                  </Badge>
                                ))}
                              </div>
                              ) : null}
                              {serviceLatestExecution.error_message ? (
                                <div className="admin-alert admin-alert-danger mt-2 text-xs">
                                  {platformAdmin
                                    ? localizeFailoverV2RuntimeMessage(t, serviceLatestExecution.error_message)
                                    : getPublicFailoverResultText(t, serviceLatestExecution.status, serviceLatestExecution.error_message)}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          {platformAdmin && service.last_message ? (
                            <div className="admin-alert admin-alert-warning mt-3 text-xs">
                              {localizeFailoverV2RuntimeMessage(t, service.last_message)}
                            </div>
                          ) : null}
                          {platformAdmin ? (
                            <DnsSchedulerLinkedSummary
                              sourceType="failover_v2"
                              sourceId={service.id}
                              className="mt-3"
                            />
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-1.5 px-4 py-3">
                          <Badge color={member.enabled ? "green" : "gray"}>
                            {member.enabled
                              ? t("common.enabled", { defaultValue: "Enabled" })
                              : t("common.disabled", { defaultValue: "Disabled" })}
                          </Badge>
                          {platformAdmin ? (
                            <Badge color={normalizeMemberModeValue(member.mode) === "existing_client" ? "amber" : "blue"}>
                              {formatMemberModeLabel(t, member.mode)}
                            </Badge>
                          ) : null}
                          {member.probe ? (() => {
                            const probeBadge = getMemberProbeBadgeLabel(t, member, memberBusy, platformAdmin);
                            return (
                              <Badge color={getStatusBadgeColor(probeBadge.status)}>
                                {probeBadge.label}
                              </Badge>
                            );
                          })() : null}
                        </div>

                        <div className="px-4 py-3">
                          <div className="space-y-2 break-words text-xs text-muted-foreground">
                            {platformAdmin ? <div>{formatMemberSubtitle(member) || "-"}</div> : null}
                            <div>{t("failover_v2.detail_fields.ipv4", { defaultValue: "IPv4" })}: {memberIPv4Address || t("failover_v2.no_current_ip", { defaultValue: "No current IP" })}</div>
                            <div>{t("failover_v2.detail_fields.ipv6", { defaultValue: "IPv6" })}: {memberIPv6Address || t("failover_v2.no_current_ip", { defaultValue: "No current IP" })}</div>
                            <div>
                              {platformAdmin
                                ? t("failover_v2.member_resolve_status", { defaultValue: "Resolve status" })
                                : t("failover_v2.public.line_status", { defaultValue: "线路状态" })}: {memberResolveStatus}
                            </div>
                            {platformAdmin ? (
                              <>
                                <div>{t("failover_v2.member_dns_status", { defaultValue: "DNS status" })}: {memberDnsStatus}</div>
                                <div>{t("failover_v2.member_script_status", { defaultValue: "Script status" })}: {memberScriptStatus}</div>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 px-4 py-3">
                          <Button
                            size="sm"
                            onClick={() => setFailoverTarget({ service, member })}
                            disabled={memberActionsDisabled}
                            title={memberBusyTitle || getModeActionDescription(t, member)}
                          >
                            <Play className="size-4" />
                            {getModeActionLabel(t, member)}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setDetachTarget({ service, member })} disabled={memberActionsDisabled} title={memberBusyTitle}>
                            {platformAdmin
                              ? t("failover_v2.detach_dns", { defaultValue: "Detach DNS" })
                              : t("failover_v2.public.pause_line", { defaultValue: "暂停线路" })}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEditMemberDialog(service, member)} disabled={memberActionsDisabled} title={memberBusyTitle}>
                            <PencilLine className="size-4" />
                            {t("common.edit", { defaultValue: "Edit" })}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setDeleteTarget({ kind: "member", service, member })} disabled={memberActionsDisabled} title={memberBusyTitle}>
                            <Trash2 className="size-4" />
                            {t("common.delete", { defaultValue: "Delete" })}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="px-4 py-6">
                    <div className="text-sm font-semibold text-foreground">
                      {t("failover_v2.workbench.member_detail", { defaultValue: "子成员详情" })}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-muted-foreground">
                      {t("failover_v2.workbench.member_detail_empty", { defaultValue: "展开一个任务，然后选择子成员查看详情。" })}
                    </div>
                  </div>
                )}
            </AdminDataPanel>
            </div>
        ) : null}
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
                className="border-l-2 border-slate-300 bg-slate-50/60 px-3 py-2 dark:border-slate-700 dark:bg-slate-950/30"
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
        <DialogContent className={cn(ADMIN_FORM_DIALOG_WIDE_CLASS, "h-[90vh] max-w-[1180px] sm:max-w-[1180px]")}>
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

          <div className={cn(ADMIN_FORM_SCROLL_CLASS, "px-1")}>
            <div className="grid w-full gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="min-w-0 space-y-3">
            <section className={FORM_SECTION_CLASS}>
              <div className="mb-4 flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {t("failover_v2.service_section_basic", { defaultValue: "Basic" })}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("failover_v2.service_section_basic_hint", {
                    defaultValue: "Name the service and decide whether it can participate in automatic scheduling.",
                  })}
                </p>
              </div>
              <div className="grid items-start gap-3 md:grid-cols-[minmax(0,1fr)_18rem]">
                <div className={FORM_FIELD_CLASS}>
                  <Label htmlFor="v2-service-name" className="flex items-center gap-1">
                    {t("common.name", { defaultValue: "Name" })}
                    <RequiredMark />
                  </Label>
                  <Input
                    id="v2-service-name"
                    value={serviceForm.name}
                    onChange={(event) => setServiceForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder={t("failover_v2.service_name_placeholder", { defaultValue: "e.g. Hong Kong outlet pool" })}
                  />
                </div>
                <div className={FORM_TOGGLE_CLASS}>
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
            </section>

            <section className={FORM_SECTION_CLASS}>
              <div className="mb-4 flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {t("failover_v2.service_section_dns", { defaultValue: "DNS target" })}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("failover_v2.service_section_dns_hint", {
                    defaultValue: "V2 owns this shared DNS record target. Members bind their individual DNS lines later.",
                  })}
                </p>
              </div>
              <div className={FORM_GRID_2_CLASS}>
                <div className={FORM_FIELD_CLASS}>
                  <Label className="flex items-center gap-1">
                    {t("failover_v2.dns_provider", { defaultValue: "DNS provider" })}
                    <RequiredMark />
                  </Label>
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
                <div className={FORM_FIELD_CLASS}>
                  <Label className="flex items-center gap-1">
                    {t("failover_v2.dns_entry", { defaultValue: "DNS entry" })}
                    <RequiredMark />
                  </Label>
                  {currentDnsEntries.length > 0 ? (
                    <Select
                      value={serviceForm.dns_entry_id}
                      onValueChange={(value) => {
                        setServiceSelectedDNSRecordKey("");
                        setServiceForm((current) => ({ ...current, dns_entry_id: value }));
                      }}
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
                      onChange={(event) => {
                        setServiceSelectedDNSRecordKey("");
                        setServiceForm((current) => ({ ...current, dns_entry_id: event.target.value }));
                      }}
                      placeholder={t("failover_v2.dns_entry_id_placeholder", {
                        defaultValue: `${formatProviderLabel(serviceForm.dns_provider)} entry id`,
                        provider: formatProviderLabel(serviceForm.dns_provider),
                      })}
                    />
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Label className="flex items-center gap-1">
                      {t("failover_v2.dns_payload", { defaultValue: "DNS payload" })}
                      <RequiredMark />
                    </Label>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {serviceDNSProvider === "cloudflare"
                        ? t("failover_v2.dns_payload_hint_cloudflare", {
                          defaultValue: getServiceDNSPayloadHint(serviceForm.dns_provider),
                        })
                        : t("failover_v2.dns_payload_hint_aliyun", {
                          defaultValue: getServiceDNSPayloadHint(serviceForm.dns_provider),
                        })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setServiceDNSAdvancedOpen(false);
                      setServiceForm((current) => ({
                        ...current,
                        dns_payload: getDefaultServiceDNSPayload(current.dns_provider),
                      }));
                    }}
                  >
                    {t("failover_v2.reset_dns_template", { defaultValue: "Use template" })}
                  </Button>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-wrap items-end gap-2">
                      <div className={`${FORM_FIELD_CLASS} min-w-64 flex-1`}>
                        <Label>{t("failover_v2.dns_existing_record", { defaultValue: "Existing DNS record" })}</Label>
                        <Select
                          value={serviceSelectedDNSRecordKey || "__none"}
                          onValueChange={(value) => {
                            setServiceSelectedDNSRecordKey(value);
                            if (value === "__none") {
                              return;
                            }
                            const record = serviceDNSCatalogRecords.find((item) => getDnsRecordKey(item) === value);
                            if (!record) {
                              return;
                            }
                            if (serviceDNSProvider === "cloudflare") {
                              updateServiceDNSPayload({
                                zone_name: record.zone_name || getJsonStringValue(serviceDNSPayload, "zone_name"),
                                zone_id: record.zone_id || getJsonStringValue(serviceDNSPayload, "zone_id"),
                                record_name: toCloudflareRecordInput(record.name, record.zone_name || getJsonStringValue(serviceDNSPayload, "zone_name")) || record.name,
                                record_type: normalizeDnsRecordType(record.type),
                                ttl: record.ttl || parseJsonIntegerInputValue(getJsonNumberInputValue(serviceDNSPayload, "ttl", 120), 120),
                                proxied: record.proxied === null ? getJsonBooleanValue(serviceDNSPayload, "proxied") : record.proxied,
                              });
                              return;
                            }
                            updateServiceDNSPayload({
                              domain_name: record.domain_name || getJsonStringValue(serviceDNSPayload, "domain_name"),
                              rr: record.rr || getJsonStringValue(serviceDNSPayload, "rr") || "@",
                              record_type: normalizeDnsRecordType(record.type),
                              ttl: record.ttl || parseJsonIntegerInputValue(getJsonNumberInputValue(serviceDNSPayload, "ttl", 600), 600),
                            });
                          }}
                          disabled={serviceDNSCatalogRecords.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("failover_v2.dns_existing_record_placeholder", { defaultValue: "Choose an existing DNS record" })} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none">
                              {t("failover_v2.dns_existing_record_placeholder", { defaultValue: "Choose an existing DNS record" })}
                            </SelectItem>
                            {serviceDNSCatalogRecords.map((record) => (
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
                        onClick={() => void loadServiceDNSCatalog({
                          provider: serviceDNSProvider,
                          entryID: serviceForm.dns_entry_id,
                          payload: serviceDNSPayload,
                        })}
                        disabled={serviceDNSCatalogLoading || !serviceForm.dns_provider.trim() || !serviceForm.dns_entry_id.trim()}
                      >
                        <RefreshCw className={`mr-2 size-4 ${serviceDNSCatalogLoading ? "animate-spin" : ""}`} />
                        {serviceDNSCatalogLoading
                          ? t("failover_v2.dns_catalog_loading", { defaultValue: "Loading DNS options" })
                          : t("failover_v2.dns_catalog_load", { defaultValue: "Load DNS options" })}
                      </Button>
                    </div>

                    {serviceDNSCatalogError ? (
                      <div className="admin-alert admin-alert-danger text-xs">
                        {serviceDNSCatalogError}
                      </div>
                    ) : null}
                </div>

                {serviceDNSProvider === "cloudflare" ? (
                  <div className={FORM_GRID_2_CLASS}>
                    <div className={FORM_FIELD_CLASS}>
                      <Label>{t("failover_v2.cloudflare_zone_name", { defaultValue: "Zone name" })}</Label>
                      {serviceDNSZoneOptions.length > 0 ? (
                        <Select
                          value={getJsonStringValue(serviceDNSPayload, "zone_name") || undefined}
                          onValueChange={(value) => {
                            setServiceSelectedDNSRecordKey("");
                            updateServiceDNSPayload({ zone_name: value });
                            void loadServiceDNSCatalog({
                              provider: serviceDNSProvider,
                              entryID: serviceForm.dns_entry_id,
                              payload: { ...serviceDNSPayload, zone_name: value },
                              zoneName: value,
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="example.com" />
                          </SelectTrigger>
                          <SelectContent>
                            {serviceDNSZoneOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={getJsonStringValue(serviceDNSPayload, "zone_name")}
                          onChange={(event) => updateServiceDNSPayload({ zone_name: event.target.value })}
                          placeholder="example.com"
                        />
                      )}
                    </div>
                    <div className={FORM_FIELD_CLASS}>
                      <Label>{t("failover_v2.cloudflare_zone_id", { defaultValue: "Zone ID" })}</Label>
                      <Input
                        value={getJsonStringValue(serviceDNSPayload, "zone_id")}
                        onChange={(event) => updateServiceDNSPayload({ zone_id: event.target.value })}
                        placeholder={t("failover_v2.cloudflare_zone_id_placeholder", { defaultValue: "填写 Zone 名称时可选" })}
                      />
                    </div>
                    <div className={`${FORM_FIELD_CLASS} md:col-span-2`}>
                      <Label className="flex items-center gap-1">
                        {t("failover_v2.dns_record_name", { defaultValue: "Record name" })}
                        <RequiredMark />
                      </Label>
                      <Input
                        value={getJsonStringValue(serviceDNSPayload, "record_name")}
                        onChange={(event) => updateServiceDNSPayload({ record_name: event.target.value })}
                        placeholder="api.example.com"
                      />
                    </div>
                  </div>
                ) : (
                  <div className={FORM_GRID_2_CLASS}>
                    <div className={FORM_FIELD_CLASS}>
                      <Label className="flex items-center gap-1">
                        {t("failover_v2.dns_domain_name", { defaultValue: "Domain name" })}
                        <RequiredMark />
                      </Label>
                      {serviceDNSDomainOptions.length > 0 ? (
                        <Select
                          value={getJsonStringValue(serviceDNSPayload, "domain_name") || undefined}
                          onValueChange={(value) => {
                            setServiceSelectedDNSRecordKey("");
                            updateServiceDNSPayload({ domain_name: value });
                            void loadServiceDNSCatalog({
                              provider: serviceDNSProvider,
                              entryID: serviceForm.dns_entry_id,
                              payload: { ...serviceDNSPayload, domain_name: value },
                              domainName: value,
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="example.com" />
                          </SelectTrigger>
                          <SelectContent>
                            {serviceDNSDomainOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={getJsonStringValue(serviceDNSPayload, "domain_name")}
                          onChange={(event) => updateServiceDNSPayload({ domain_name: event.target.value })}
                          placeholder="example.com"
                        />
                      )}
                    </div>
                    <div className={FORM_FIELD_CLASS}>
                      <Label className="flex items-center gap-1">
                        {t("failover_v2.dns_rr", { defaultValue: "RR" })}
                        <RequiredMark />
                      </Label>
                      <Input
                        value={getJsonStringValue(serviceDNSPayload, "rr") || "@"}
                        onChange={(event) => updateServiceDNSPayload({ rr: event.target.value })}
                        onBlur={(event) => updateServiceDNSPayload({
                          rr: normalizeAliyunRRInput(getJsonStringValue(serviceDNSPayload, "domain_name"), event.target.value),
                        })}
                        placeholder="@"
                      />
                    </div>
                  </div>
                )}

                {serviceDNSProvider === "aliyun" ? (
                  <div className={FORM_FIELD_CLASS}>
                    <Label>{t("failover_v2.dns_available_lines", { defaultValue: "Available routing lines" })}</Label>
                    <div className="flex flex-wrap gap-2 border-y border-dashed border-slate-200/80 py-2 dark:border-slate-800/80">
                      {serviceDNSCatalog && serviceDNSLineOptions.length > 0 ? (
                        serviceDNSLineOptions.map((line) => (
                          <span
                            key={line.value}
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          >
                            {line.label}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {t("failover_v2.dns_lines_empty", { defaultValue: "No routing lines loaded yet." })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("failover_v2.dns_available_lines_hint", {
                        defaultValue: "Lines are loaded from the DNS provider and selected on each member.",
                      })}
                    </p>
                  </div>
                ) : null}

                <div className={FORM_GRID_2_CLASS}>
                  <div className={FORM_FIELD_CLASS}>
                    <Label>{t("failover_v2.dns_record_type", { defaultValue: "Record type" })}</Label>
                    <Select
                      value={serviceDNSRecordType}
                      onValueChange={(value) => updateServiceDNSPayload({ record_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="AAAA">AAAA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={FORM_FIELD_CLASS}>
                    <Label>{t("failover_v2.dns_ttl", { defaultValue: "TTL" })}</Label>
                    <Select
                      value={getJsonNumberInputValue(serviceDNSPayload, "ttl", serviceDNSProvider === "cloudflare" ? 120 : 600)}
                      onValueChange={(value) => updateServiceDNSPayload({
                        ttl: parseJsonIntegerInputValue(value, serviceDNSProvider === "cloudflare" ? 120 : 600),
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceDNSTTLOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className={FORM_TOGGLE_CLASS}>
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                        {t("failover_v2.sync_ipv6", { defaultValue: "Sync IPv6" })}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {t("failover_v2.sync_ipv6_hint", { defaultValue: "Also manage the counterpart AAAA/A record when an address is available." })}
                      </div>
                    </div>
                    <Switch
                      checked={getJsonBooleanValue(serviceDNSPayload, "sync_ipv6")}
                      onCheckedChange={(checked) => updateServiceDNSPayload({ sync_ipv6: checked })}
                    />
                  </div>
                  {serviceDNSProvider === "cloudflare" ? (
                    <div className={FORM_TOGGLE_CLASS}>
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                          {t("failover_v2.cloudflare_proxied", { defaultValue: "Cloudflare proxy" })}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {t("failover_v2.cloudflare_proxied_hint", { defaultValue: "Override the credential default proxied setting for this record." })}
                        </div>
                      </div>
                      <Switch
                        checked={getJsonBooleanValue(serviceDNSPayload, "proxied")}
                        onCheckedChange={(checked) => updateServiceDNSPayload({ proxied: checked })}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setServiceDNSAdvancedOpen((open) => !open)}
                  >
                    {serviceDNSAdvancedOpen
                      ? t("failover_v2.hide_dns_json", { defaultValue: "Hide JSON" })
                      : t("failover_v2.show_dns_json", { defaultValue: "Edit JSON" })}
                  </Button>
                  {serviceDNSAdvancedOpen ? (
                    <div className="space-y-2 border-l border-slate-200 pl-3 dark:border-slate-800">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t("failover_v2.dns_payload_advanced_hint", {
                          defaultValue: "Advanced: edit the raw DNS payload only when importing or repairing unsupported fields.",
                        })}
                      </p>
                      <Textarea
                        className="min-h-36 font-mono text-xs"
                        value={serviceForm.dns_payload}
                        onChange={(event) => setServiceForm((current) => ({ ...current, dns_payload: event.target.value }))}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className={FORM_SECTION_CLASS}>
              <div className="mb-4 flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {platformAdmin
                    ? t("failover_v2.service_section_policy", { defaultValue: "Execution policy" })
                    : t("failover_v2.public.service_section_policy", { defaultValue: "服务策略" })}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {platformAdmin
                    ? t("failover_v2.service_section_policy_hint", {
                        defaultValue: "Tune health-check and execution timeout settings for this service.",
                      })
                    : t("failover_v2.public.service_section_policy_hint", {
                        defaultValue: "设置服务检查频率和处理超时时间。",
                      })}
                </p>
              </div>
              <div className={FORM_GRID_4_CLASS}>
                <div className={FORM_FIELD_CLASS}>
                  <Label>{t("failover_v2.script_timeout", { defaultValue: "Script timeout" })}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={serviceForm.script_timeout_sec}
                    onChange={(event) => setServiceForm((current) => ({ ...current, script_timeout_sec: event.target.value }))}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("failover_v2.timeout_seconds_hint", { defaultValue: "Unit: seconds." })}
                  </p>
                </div>
                <div className={FORM_FIELD_CLASS}>
                  <Label>
                    {platformAdmin
                      ? t("failover_v2.wait_agent_timeout", { defaultValue: "接入等待时间" })
                      : t("failover_v2.public.ready_timeout", { defaultValue: "服务准备时间" })}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={serviceForm.wait_agent_timeout_sec}
                    onChange={(event) => setServiceForm((current) => ({ ...current, wait_agent_timeout_sec: event.target.value }))}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("failover_v2.timeout_seconds_hint", { defaultValue: "Unit: seconds." })}
                  </p>
                </div>
                <div className={FORM_FIELD_CLASS}>
                  <Label>
                    {platformAdmin
                      ? t("failover_v2.check_interval", { defaultValue: "Check interval" })
                      : t("failover_v2.public.check_interval", { defaultValue: "检查间隔" })}
                  </Label>
                  <Input
                    type="number"
                    min={60}
                    value={serviceForm.check_interval_seconds}
                    onChange={(event) => setServiceForm((current) => ({ ...current, check_interval_seconds: event.target.value }))}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {platformAdmin
                      ? t("failover_v2.check_interval_hint", {
                          defaultValue: "Controls how often this service runs automatic health checks. Unit: seconds.",
                        })
                      : t("failover_v2.public.check_interval_hint", {
                          defaultValue: "控制服务状态检查频率，单位：秒。",
                        })}
                  </p>
                </div>
              </div>
            </section>

            <section className={FORM_SECTION_CLASS}>
              <FailoverScriptPolicyDialog
                title={t("failover_v2.service_scripts", { defaultValue: "Scripts" })}
                description={platformAdmin
                  ? t("failover_v2.service_section_scripts_hint", {
                      defaultValue: "可选脚本会在替换实例通过连通性检查后执行。点击配置脚本再选择、排序和设置超时。",
                    })
                  : t("failover_v2.public.service_scripts_hint", {
                      defaultValue: "可选脚本会在恢复资源准备完成后执行。点击配置脚本再选择、排序和设置超时。",
                    })}
                scripts={sortedServiceScripts}
                selectedScriptIDs={serviceForm.script_clipboard_ids.map(String)}
                searchQuery={serviceScriptSearchQuery}
                onSearchQueryChange={setServiceScriptSearchQuery}
                onToggleScript={(scriptID, checked) => handleServiceScriptToggle(Number(scriptID), checked)}
                onMoveScript={(scriptID, targetIndex) => moveServiceScriptToIndex(Number(scriptID), targetIndex)}
                onRemoveScript={(scriptID) => handleServiceScriptToggle(Number(scriptID), false)}
                timeoutValue={serviceForm.script_timeout_sec}
                onTimeoutChange={(value) => setServiceForm((current) => ({ ...current, script_timeout_sec: value }))}
              />
            </section>
              </div>
              <aside className="hidden min-w-0 xl:block">
                <div className="sticky top-0 space-y-3 border-l border-slate-200/80 bg-transparent py-1 pl-4 dark:border-slate-800">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {t("failover_v2.service_summary_title", { defaultValue: "服务配置预览" })}
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {platformAdmin
                        ? t("failover_v2.service_summary_hint", {
                            defaultValue: "右侧固定展示服务级 DNS、调度和脚本策略，左侧负责编辑具体字段。",
                          })
                        : t("failover_v2.public.service_summary_hint", {
                            defaultValue: "右侧固定展示服务地址、检查间隔和脚本策略，左侧负责编辑具体字段。",
                          })}
                    </p>
                  </div>

                  <div className="overflow-hidden border-y border-slate-200/80 dark:border-slate-800">
                    {serviceDialogSummaryRows.map((row) => (
                      <div key={row.label} className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-b border-slate-200/80 py-2.5 text-sm last:border-b-0 dark:border-slate-800">
                        <div className="text-xs font-medium text-muted-foreground">{row.label}</div>
                        <div className="min-w-0 break-words font-medium text-slate-900 dark:text-slate-50">{row.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-200/80 pt-3 dark:border-slate-800">
                    <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                      {t("failover_v2.service_summary_policy", { defaultValue: "服务策略" })}
                    </div>
                    <div className="mt-2 space-y-2">
                      {serviceDialogPolicyNotes.map((note) => (
                        <div key={note} className="flex gap-2 text-xs leading-5 text-muted-foreground">
                          <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                          <span>{note}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-200/80 pt-3 dark:border-slate-800">
                    <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                      {t("failover_v2.dns_available_lines", { defaultValue: "Available routing lines" })}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {serviceDNSProvider === "aliyun" && serviceDNSLineOptions.length > 0 ? (
                        serviceDNSLineOptions.slice(0, 8).map((line) => (
                          <InlineBadge key={line.value} variant="secondary">{line.label}</InlineBadge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {serviceDNSProvider === "aliyun"
                            ? t("failover_v2.dns_lines_empty", { defaultValue: "No routing lines loaded yet." })
                            : t("failover_v2.dns_lines_member_hint", { defaultValue: "Cloudflare records do not use Aliyun routing lines." })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </aside>
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

      <Dialog
        open={memberDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeMemberDialog();
            return;
          }
          setMemberDialogOpen(true);
        }}
      >
        <DialogContent className={cn(ADMIN_FORM_DIALOG_WIDE_CLASS, "h-[90vh] max-w-[1180px] sm:max-w-[1180px]")}>
          <DialogHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <DialogTitle>
                  {editingMember
                    ? t("failover_v2.edit_member", { defaultValue: "Edit V2 member" })
                    : t("failover_v2.add_member", { defaultValue: "Add V2 member" })}
                </DialogTitle>
                <DialogDescription>
                  {t("failover_v2.member_dialog_description", {
                    defaultValue: "Configure how this member detaches or reprovisions the outlet for {{service}}.",
                    service: memberDialogService?.name || "V2 service",
                  })}
                </DialogDescription>
              </div>
              {memberDialogService ? <Badge color="blue">{memberDialogService.name}</Badge> : null}
            </div>
          </DialogHeader>

          <div className={cn(ADMIN_FORM_SCROLL_CLASS, "px-1")}>
            <div className="grid w-full gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="min-w-0 space-y-5">
                <FlowSection
                  title={t("failover_v2.member_section_basic", { defaultValue: "Member basics" })}
                  description={t("failover_v2.member_section_basic_hint", {
                    defaultValue: "Set the member name and whether it can participate in automatic checks.",
                  })}
                >
                  <div className="flex flex-col gap-4">
                    <div className={FORM_FIELD_CLASS}>
                      <Label className="flex items-center gap-1">
                        {t("common.name", { defaultValue: "Name" })}
                        <RequiredMark />
                      </Label>
                      <Input
                        value={memberForm.name}
                        onChange={(event) => setMemberForm((current) => ({ ...current, name: event.target.value }))}
                      />
                    </div>
                    <div className="flex items-start justify-between gap-4 border-b border-border/70 py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">
                          {t("common.enabled", { defaultValue: "Enabled" })}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("failover_v2.member_enabled_hint", {
                            defaultValue: "Disabled members are skipped by automatic checks. Manual actions remain available from the member card.",
                          })}
                        </p>
                      </div>
                      <Switch
                        checked={memberForm.enabled}
                        onCheckedChange={(checked) => setMemberForm((current) => ({ ...current, enabled: checked }))}
                      />
                    </div>
                  </div>
                </FlowSection>

                <Separator />

                <Tabs value={memberFormMode} onValueChange={handleMemberModeChange} className="space-y-6">
                  <FlowSection
                    title={t("failover_v2.member_section_mode", { defaultValue: "Mode selection" })}
                    description={t("failover_v2.member_section_mode_hint", {
                      defaultValue: "Choose the failover mode first. The outlet form below changes with this decision.",
                    })}
                  >
                    <div className="space-y-3">
                      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 border-b border-slate-200/80 pb-1 shadow-none dark:border-slate-800">
                        <MemberModeOption
                          value="existing_client"
                          title={t("failover_v2.member_mode_existing_client", { defaultValue: "Existing client" })}
                        />
                        <MemberModeOption
                          value="provider_template"
                          title={t("failover_v2.member_mode_provider_template", { defaultValue: "Provider template" })}
                        />
                      </TabsList>
                      <p className="text-sm text-muted-foreground">
                        {memberUsesExistingClient
                          ? t("failover_v2.existing_client_action_hint", { defaultValue: "Detach all bound DNS lines from the existing client." })
                          : t("failover_v2.provider_template_action_hint", { defaultValue: "Current outlet can stay empty; V2 provisions a replacement instance and binds it after the first successful run." })}
                      </p>
                    </div>
                  </FlowSection>

                  <TabsContent value="existing_client" className="mt-0 space-y-6">
                    <Separator />

                    <FlowSection
                      title={t("failover_v2.member_mode_existing_client", { defaultValue: "Existing client" })}
                      description={t("failover_v2.existing_client_watch_hint", {
                        defaultValue: "Use an existing client. When triggered, V2 only detaches the selected DNS lines.",
                      })}
                    >
                      <div className="flex flex-col gap-4">
                        <div className={FORM_FIELD_CLASS}>
                          <Label className="flex items-center gap-1">
                            {t("failover_v2.watch_client", { defaultValue: "Current client" })}
                            <RequiredMark />
                          </Label>
                          {currentNodeOptions.length > 0 ? (
                            <Select
                              value={memberForm.watch_client_uuid || undefined}
                              onValueChange={(value) => {
                                const nextWatchClientUUID = value;
                                const nextAddress = findNodeAddress(nodes, nextWatchClientUUID);
                                setMemberForm((current) => ({
                                  ...current,
                                  watch_client_uuid: nextWatchClientUUID,
                                  current_address: nextAddress || current.current_address,
                                }));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t("failover_v2.watch_client_placeholder", { defaultValue: "Choose a client" })} />
                              </SelectTrigger>
                              <SelectContent>
                                {currentNodeOptions.map((node, index) => (
                                  <SelectItem key={`${node.uuid}-${index}`} value={node.uuid}>
                                    {formatNodeLabel(node)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={memberForm.watch_client_uuid}
                              onChange={(event) => setMemberForm((current) => ({ ...current, watch_client_uuid: event.target.value }))}
                              placeholder={t("failover_v2.watch_client_placeholder", { defaultValue: "Choose a client" })}
                            />
                          )}
                        </div>
                      </div>
                    </FlowSection>
                  </TabsContent>

                  <TabsContent value="provider_template" className="mt-0 space-y-8">
                    <Separator />

                    <FlowSection
                      title={t("failover_v2.member_mode_provider_template", { defaultValue: "Provider template" })}
                      description={t("failover_v2.provider_template_hint", {
                        defaultValue: "Use provider credentials and a provisioning template. The current outlet is optional and will be recorded after initialization.",
                      })}
                    >
                      <div className="flex flex-col gap-6">
                        <div className={FORM_GRID_2_CLASS}>
                          <div className={FORM_FIELD_CLASS}>
                            <Label className="flex items-center gap-1">
                              {t("failover_v2.provider", { defaultValue: "Provider" })}
                              <RequiredMark />
                            </Label>
                            <Select
                              value={memberForm.provider}
                              onValueChange={handleMemberProviderChange}
                              disabled={memberProviderSelectOptions.length === 0}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {memberProviderSelectOptions.map((provider) => (
                                  <SelectItem key={provider.value} value={provider.value} disabled={provider.disabled}>
                                    {provider.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {memberProviderOptions.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                {t("failover_v2.provider_feature_required_hint", {
                                  defaultValue: "No cloud provider feature is enabled for this user. Enable AWS, Azure, DigitalOcean, Linode, or Vultr first.",
                                })}
                              </p>
                            ) : null}
                          </div>
                          <div className={FORM_FIELD_CLASS}>
                            <Label>{t("failover_v2.provider_entry_group", { defaultValue: "Credential group" })}</Label>
                            {memberProviderEntryGroups.length > 0 ? (
                              <Select
                                value={memberForm.provider_entry_group || FAILOVER_V2_PROVIDER_ENTRY_GROUP_ALL}
                                onValueChange={(value) => {
                                  const nextGroup = value === FAILOVER_V2_PROVIDER_ENTRY_GROUP_ALL ? "" : value;
                                  setMemberForm((current) => applySuggestedMemberAutoConnectGroup(
                                    current,
                                    providerEntriesByProvider,
                                    {
                                      provider_entry_group: nextGroup,
                                      provider_entry_id: FAILOVER_V2_AUTOMATIC_PROVIDER_ENTRY_ID,
                                    },
                                  ));
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t("failover_v2.provider_entry_group_placeholder", {
                                      defaultValue: "Choose a credential group",
                                    })}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={FAILOVER_V2_PROVIDER_ENTRY_GROUP_ALL}>
                                    {t("failover_v2.provider_entry_group_all", { defaultValue: "All credentials" })}
                                  </SelectItem>
                                  {memberProviderEntryGroups.map((group) => (
                                    <SelectItem key={group} value={group}>
                                      {group}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="border-y border-dashed border-slate-200/80 py-2 text-sm text-muted-foreground dark:border-slate-800/80">
                                {t("failover_v2.provider_entry_group_missing", {
                                  defaultValue: "No credential groups have been assigned for this provider yet.",
                                })}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {t("failover_v2.provider_entry_group_hint", {
                                defaultValue: "可选。选择后，V2 只会使用这个分组里的凭证。",
                              })}
                            </p>
                          </div>
                        </div>

                        <div className={FORM_FIELD_CLASS}>
                          <Label className="flex items-center gap-1">
                            {t("failover_v2.provider_entry", { defaultValue: "Provider credential" })}
                            <RequiredMark />
                          </Label>
                          {currentProviderEntries.length > 0 ? (
                            <Select
                              value={memberForm.provider_entry_id}
                              onValueChange={(value) => {
                                setMemberForm((current) => applySuggestedMemberAutoConnectGroup(
                                  current,
                                  providerEntriesByProvider,
                                  {
                                    provider_entry_id: normalizeProviderEntryID(value),
                                  },
                                ));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={t("failover_v2.provider_entry_placeholder", {
                                    defaultValue: `Choose a ${formatProviderLabel(memberForm.provider)} credential`,
                                    provider: formatProviderLabel(memberForm.provider),
                                  })}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={FAILOVER_V2_AUTOMATIC_PROVIDER_ENTRY_ID}>
                                  {t("failover_v2.provider_entry_active", { defaultValue: "Use active credential" })}
                                </SelectItem>
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
                              onChange={(event) => {
                                setMemberForm((current) => applySuggestedMemberAutoConnectGroup(
                                  current,
                                  providerEntriesByProvider,
                                  {
                                    provider_entry_id: normalizeProviderEntryID(event.target.value),
                                  },
                                ));
                              }}
                              placeholder={t("failover_v2.provider_entry_id_placeholder", {
                                defaultValue: `${formatProviderLabel(memberForm.provider)} credential id`,
                                provider: formatProviderLabel(memberForm.provider),
                              })}
                            />
                          )}
                          <p className="text-xs text-muted-foreground">
                            {currentProviderEntries.length > 0
                              ? t("failover_v2.provider_entry_hint", {
                                defaultValue: "Choose which saved cloud credential this provider should use.",
                              })
                              : t("failover_v2.provider_entry_manual_hint", {
                                defaultValue: "No saved credential list is available right now. Enter the credential ID manually.",
                              })}
                          </p>
                        </div>

                        <div className={FORM_FIELD_CLASS}>
                          <Label>{t("failover_v2.auto_connect_group", { defaultValue: "Auto-connect group" })}</Label>
                          <Input
                            value={getJsonStringValue(memberPlanPayload, "auto_connect_group")}
                            onChange={(event) => updateMemberPlanPayload({ auto_connect_group: event.target.value })}
                            placeholder={t("failover_v2.auto_connect_group_placeholder", { defaultValue: "可选，留空自动生成" })}
                          />
                          <p className="text-xs text-muted-foreground">
                            {t("failover_v2.auto_connect_group_hint", {
                              defaultValue: "可选。留空时 V2 会自动生成目标分组。",
                            })}
                          </p>
                        </div>
                      </div>
                    </FlowSection>

                    <Separator />

                    <FlowSection
                      title={t("failover_v2.plan_payload", { defaultValue: "Plan payload" })}
                      description={memberProvider === "linode"
                        ? t("failover_v2.plan_payload_hint_linode", {
                          defaultValue: getMemberPlanPayloadHint(memberForm.provider),
                        })
                        : memberProvider === "aws"
                          ? t("failover_v2.plan_payload_hint_aws", {
                            defaultValue: getMemberPlanPayloadHint(memberForm.provider),
                          })
                          : memberProvider === "azure"
                            ? getMemberPlanPayloadHint(memberForm.provider)
                            : memberProvider === "vultr"
                              ? t("failover_v2.plan_payload_hint_vultr", {
                                defaultValue: getMemberPlanPayloadHint(memberForm.provider),
                              })
                              : t("failover_v2.plan_payload_hint_digitalocean", {
                                defaultValue: getMemberPlanPayloadHint(memberForm.provider),
                              })}
                      action={(
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMemberPlanAdvancedOpen(false);
                            setMemberForm((current) => ({
                              ...current,
                              plan_payload: getDefaultMemberPlanPayload(current.provider),
                            }));
                          }}
                        >
                          {t("failover_v2.reset_plan_template", { defaultValue: "Use template" })}
                        </Button>
                      )}
                    >
                      <div className="flex flex-col gap-6">
              {memberProvider === "azure" ? (
                <div className="space-y-4">
                  <div className={FORM_GRID_2_CLASS}>
                    <div className={FORM_FIELD_CLASS}>
                      <Label className="flex items-center gap-1">
                        {t("failover_v2.plan_location", { defaultValue: "Location" })}
                        <RequiredMark />
                      </Label>
                      <PlanPresetSelect
                        value={azurePlanLocation || undefined}
                        onValueChange={(value) => updateMemberPlanPayload({ location: value, region: value })}
                        options={azureLocationOptions}
                      />
                    </div>
                    <div className={FORM_FIELD_CLASS}>
                      <Label className="flex items-center gap-1">
                        {t("failover_v2.azure_size", { defaultValue: "Size" })}
                        <RequiredMark />
                      </Label>
                      <PlanPresetSelect
                        value={getJsonStringValue(memberPlanPayload, "size") || undefined}
                        onValueChange={(value) => updateMemberPlanPayload({ size: value })}
                        options={azureSizeOptions}
                      />
                    </div>
                    <div className={FORM_FIELD_CLASS}>
                      <Label>{t("failover_v2.plan_instance_name", { defaultValue: "Instance name" })}</Label>
                      <Input
                        value={getJsonStringValue(memberPlanPayload, "name")}
                        onChange={(event) => updateMemberPlanPayload({ name: event.target.value })}
                        placeholder={t("failover_v2.plan_instance_name_placeholder", { defaultValue: "可选，留空自动生成" })}
                      />
                    </div>
                    <div className={FORM_FIELD_CLASS}>
                      <Label className="flex items-center gap-1">
                        {t("failover_v2.plan_image", { defaultValue: "Image" })}
                        <RequiredMark />
                      </Label>
                      <PlanPresetSelect
                        value={getJsonStringValue(memberPlanPayload, "image_preset") || "ubuntu-2404"}
                        onValueChange={(value) => {
                          const preset = azureImagePresets.find((item) => item.id === value) || initialAzureImagePreset;
                          updateMemberPlanPayload({
                            image_preset: preset.id,
                            image: {
                              publisher: preset.publisher,
                              offer: preset.offer,
                              sku: preset.sku,
                              version: preset.version || "latest",
                            },
                          });
                        }}
                        options={azureImagePresetOptions}
                      />
                    </div>
                  </div>

                  <div className={FORM_FIELD_CLASS}>
                    <Label>{t("failover_v2.root_password_mode", { defaultValue: "Root password mode" })}</Label>
                    <Select
                      value={azureRootPasswordMode}
                      onValueChange={(value) => updateMemberPlanPayload({ root_password_mode: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="random">{t("failover_v2.root_password_mode_random", { defaultValue: "Generate and save" })}</SelectItem>
                        <SelectItem value="custom">{t("failover_v2.root_password_mode_custom", { defaultValue: "Use custom password" })}</SelectItem>
                        <SelectItem value="none">{t("failover_v2.root_password_mode_none", { defaultValue: "SSH key only" })}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {azureRootPasswordMode === "custom" ? (
                    <div className={FORM_FIELD_CLASS}>
                      <Label className="flex items-center gap-1">
                        {t("failover_v2.root_password", { defaultValue: "Root password" })}
                        <RequiredMark />
                      </Label>
                      <Input
                        type="password"
                        value={getJsonStringValue(memberPlanPayload, "root_password")}
                        onChange={(event) => updateMemberPlanPayload({ root_password: event.target.value })}
                      />
                    </div>
                  ) : null}

                  {azureRootPasswordMode === "none" ? (
                    <div className={FORM_FIELD_CLASS}>
                      <Label className="flex items-center gap-1">
                        {t("cloud.providers.azure.ssh_public_key", { defaultValue: "SSH public key" })}
                        <RequiredMark />
                      </Label>
                      <Textarea
                        className="min-h-24 font-mono text-xs"
                        value={getJsonStringValue(memberPlanPayload, "ssh_public_key")}
                        onChange={(event) => updateMemberPlanPayload({ ssh_public_key: event.target.value })}
                        placeholder="ssh-ed25519 ..."
                      />
                    </div>
                  ) : null}

                </div>
              ) : memberProvider === "aws" ? (
                <div className="space-y-4">
                  <div className={FORM_GRID_2_CLASS}>
                    <div className={FORM_FIELD_CLASS}>
                      <Label>{t("failover_v2.aws_service", { defaultValue: "AWS service" })}</Label>
                      <Select
                        value={awsPlanService}
                        onValueChange={(value) => updateMemberPlanPayload({
                          service: value,
                          ...(value === "lightsail"
                            ? {
                              availability_zone: getJsonStringValue(memberPlanPayload, "availability_zone")
                                || getDefaultLightsailAvailabilityZone(memberPlanRegion),
                              blueprint_id: getJsonStringValue(memberPlanPayload, "blueprint_id")
                                || DEFAULT_STATIC_LIGHTSAIL_BLUEPRINT_ID,
                              bundle_id: getJsonStringValue(memberPlanPayload, "bundle_id")
                                || DEFAULT_STATIC_LIGHTSAIL_BUNDLE_ID,
                              ip_address_type: "dualstack",
                              allow_all_traffic: true,
                            }
                            : {
                              image_id: getJsonStringValue(memberPlanPayload, "image_id")
                                || DEFAULT_STATIC_EC2_IMAGE_ID,
                              instance_type: getJsonStringValue(memberPlanPayload, "instance_type")
                                || DEFAULT_STATIC_EC2_INSTANCE_TYPE,
                              assign_public_ip: true,
                              assign_ipv6: true,
                              allow_all_traffic: true,
                            }),
                        })}
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
                    <div className={FORM_FIELD_CLASS}>
                      <Label className="flex items-center gap-1">
                        {t("failover_v2.plan_region", { defaultValue: "Region" })}
                        <RequiredMark />
                      </Label>
                      <PlanPresetSelect
                        value={memberPlanRegion || undefined}
                        onValueChange={(value) => updateMemberPlanPayload({
                          region: value,
                          ...(awsPlanService === "lightsail"
                            ? { availability_zone: getDefaultLightsailAvailabilityZone(value) }
                            : {}),
                        })}
                        options={awsRegionOptions}
                      />
                    </div>
                    <div className={`${FORM_FIELD_CLASS} md:col-span-2`}>
                      <Label>{t("failover_v2.plan_instance_name", { defaultValue: "Instance name" })}</Label>
                      <Input
                        value={getJsonStringValue(memberPlanPayload, "name")}
                        onChange={(event) => updateMemberPlanPayload({ name: event.target.value })}
                        placeholder={t("failover_v2.plan_instance_name_placeholder", { defaultValue: "可选，留空自动生成" })}
                      />
                    </div>
                  </div>

                  {awsPlanService === "lightsail" ? (
                    <div className={FORM_GRID_2_CLASS}>
                      <div className={FORM_FIELD_CLASS}>
                        <Label className="flex items-center gap-1">
                          {t("failover_v2.aws_availability_zone", { defaultValue: "Availability zone" })}
                          <RequiredMark />
                        </Label>
                        <PlanPresetSelect
                          value={getJsonStringValue(memberPlanPayload, "availability_zone") || undefined}
                          onValueChange={(value) => updateMemberPlanPayload({ availability_zone: value })}
                          options={awsLightsailAvailabilityZoneOptions}
                        />
                      </div>
                      <div className={FORM_FIELD_CLASS}>
                        <Label className="flex items-center gap-1">
                          {t("failover_v2.aws_blueprint_id", { defaultValue: "Blueprint ID" })}
                          <RequiredMark />
                        </Label>
                        <PlanPresetSelect
                          value={getJsonStringValue(memberPlanPayload, "blueprint_id") || undefined}
                          onValueChange={(value) => {
                            const nextPlatform = inferLightsailBlueprintPlatform(value);
                            const currentBundleID = getJsonStringValue(memberPlanPayload, "bundle_id");
                            const currentBundlePlatform = inferLightsailBundlePlatform(currentBundleID);
                            updateMemberPlanPayload({
                              blueprint_id: value,
                              bundle_id: nextPlatform && currentBundlePlatform && currentBundlePlatform !== nextPlatform
                                ? getDefaultLightsailBundleID(nextPlatform)
                                : currentBundleID || getDefaultLightsailBundleID(nextPlatform),
                            });
                          }}
                          options={awsLightsailBlueprintOptions}
                        />
                      </div>
                      <div className={FORM_FIELD_CLASS}>
                        <Label className="flex items-center gap-1">
                          {t("failover_v2.aws_bundle_id", { defaultValue: "Bundle ID" })}
                          <RequiredMark />
                        </Label>
                        <PlanPresetSelect
                          value={getJsonStringValue(memberPlanPayload, "bundle_id") || undefined}
                          onValueChange={(value) => updateMemberPlanPayload({ bundle_id: value })}
                          options={awsLightsailBundleOptions}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className={FORM_GRID_2_CLASS}>
                      <div className={FORM_FIELD_CLASS}>
                        <Label className="flex items-center gap-1">
                          {t("failover_v2.aws_image_id", { defaultValue: "AMI image ID" })}
                          <RequiredMark />
                        </Label>
                        <PlanPresetSelect
                          value={getJsonStringValue(memberPlanPayload, "image_id") || undefined}
                          onValueChange={(value) => updateMemberPlanPayload({ image_id: value })}
                          options={awsEC2ImageOptions}
                        />
                      </div>
                      <div className={FORM_FIELD_CLASS}>
                        <Label className="flex items-center gap-1">
                          {t("failover_v2.aws_instance_type", { defaultValue: "Instance type" })}
                          <RequiredMark />
                        </Label>
                        <PlanPresetSelect
                          value={getJsonStringValue(memberPlanPayload, "instance_type") || undefined}
                          onValueChange={(value) => updateMemberPlanPayload({ instance_type: value })}
                          options={awsEC2InstanceTypeOptions}
                        />
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="space-y-4">
                  <div className={FORM_GRID_3_CLASS}>
                    <div className={FORM_FIELD_CLASS}>
                      <Label className="flex items-center gap-1">
                        {t("failover_v2.plan_region", { defaultValue: "Region" })}
                        <RequiredMark />
                      </Label>
                      <PlanPresetSelect
                        value={getJsonStringValue(memberPlanPayload, "region") || undefined}
                        onValueChange={(value) => updateMemberPlanPayload({ region: value })}
                        options={memberProvider === "linode"
                          ? linodeRegionOptions
                          : memberProvider === "vultr"
                            ? vultrRegionOptions
                            : digitalOceanRegionOptions}
                      />
                    </div>
                    <div className={FORM_FIELD_CLASS}>
                      <Label className="flex items-center gap-1">
                        {memberProvider === "linode"
                          ? t("failover_v2.linode_type", { defaultValue: "Type" })
                          : memberProvider === "vultr"
                            ? t("failover_v2.vultr_plan", { defaultValue: "Plan" })
                          : t("failover_v2.digitalocean_size", { defaultValue: "Size" })}
                        <RequiredMark />
                      </Label>
                      <PlanPresetSelect
                        value={getJsonStringValue(
                          memberPlanPayload,
                          memberProvider === "linode" ? "type" : memberProvider === "vultr" ? "plan" : "size",
                        ) || undefined}
                        onValueChange={(value) => updateMemberPlanPayload({
                          [memberProvider === "linode" ? "type" : memberProvider === "vultr" ? "plan" : "size"]: value,
                        })}
                        options={memberProvider === "linode"
                          ? linodeTypeOptions
                          : memberProvider === "vultr"
                            ? vultrPlanOptions
                            : digitalOceanSizeOptions}
                      />
                    </div>
                    <div className={FORM_FIELD_CLASS}>
                      <Label className="flex items-center gap-1">
                        {t("failover_v2.plan_image", { defaultValue: "Image" })}
                        <RequiredMark />
                      </Label>
                      <PlanPresetSelect
                        value={memberProvider === "vultr"
                          ? getJsonNumberInputValue(memberPlanPayload, "os_id", Number(DEFAULT_VULTR_IMAGE))
                          : getJsonStringValue(memberPlanPayload, "image") || undefined}
                        onValueChange={(value) => updateMemberPlanPayload(memberProvider === "vultr"
                          ? { os_id: Number(value) }
                          : { image: value })}
                        options={memberProvider === "linode"
                          ? linodeImageOptions
                          : memberProvider === "vultr"
                            ? vultrImageOptions
                            : digitalOceanImageOptions}
                      />
                    </div>
                  </div>

                  {memberProvider === "digitalocean" ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    <ToggleCard title={t("failover_v2.assign_ipv6", { defaultValue: "Assign IPv6" })}>
                      <Switch
                        checked={getJsonBooleanValue(memberPlanPayload, "ipv6", true)}
                        onCheckedChange={(checked) => updateMemberPlanPayload({ ipv6: checked })}
                      />
                    </ToggleCard>
                    <ToggleCard title={t("failover_v2.monitoring", { defaultValue: "Monitoring" })}>
                      <Switch
                        checked={getJsonBooleanValue(memberPlanPayload, "monitoring", true)}
                        onCheckedChange={(checked) => updateMemberPlanPayload({ monitoring: checked })}
                      />
                    </ToggleCard>
                    <ToggleCard title={t("failover_v2.backups", { defaultValue: "Backups" })}>
                      <Switch
                        checked={getJsonBooleanValue(memberPlanPayload, "backups")}
                        onCheckedChange={(checked) => updateMemberPlanPayload({ backups: checked })}
                      />
                    </ToggleCard>
                  </div>
                  ) : null}

                  {memberProvider === "vultr" ? (
                    <div className="grid gap-3 md:grid-cols-3">
                      <ToggleCard title={t("failover_v2.assign_ipv6", { defaultValue: "Assign IPv6" })}>
                        <Switch
                          checked={getJsonBooleanValue(memberPlanPayload, "enable_ipv6", true)}
                          onCheckedChange={(checked) => updateMemberPlanPayload({ enable_ipv6: checked })}
                        />
                      </ToggleCard>
                      <ToggleCard title={t("failover_v2.backups", { defaultValue: "Backups" })}>
                        <Switch
                          checked={getJsonBooleanValue(memberPlanPayload, "backups_enabled")}
                          onCheckedChange={(checked) => updateMemberPlanPayload({ backups_enabled: checked })}
                        />
                      </ToggleCard>
                      <ToggleCard title={t("failover_v2.vultr_ddos_protection", { defaultValue: "DDoS protection" })}>
                        <Switch
                          checked={getJsonBooleanValue(memberPlanPayload, "ddos_protection")}
                          onCheckedChange={(checked) => updateMemberPlanPayload({ ddos_protection: checked })}
                        />
                      </ToggleCard>
                    </div>
                  ) : null}
                </div>
              )}

              <div className={`${FORM_FIELD_CLASS} mt-3`}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => setMemberPlanAdvancedOpen((open) => !open)}
                >
                  {memberPlanAdvancedOpen
                    ? t("failover_v2.hide_plan_json", { defaultValue: "Hide JSON" })
                    : t("failover_v2.show_plan_json", { defaultValue: "Edit JSON" })}
                </Button>
                {memberPlanAdvancedOpen ? (
                  <div className="grid gap-3 border-y border-slate-200/80 py-3 dark:border-slate-800/80">
                    <p className="text-xs text-muted-foreground">
                      {t("failover_v2.plan_payload_advanced_hint", {
                        defaultValue: "Advanced: edit the raw plan payload only when importing or repairing unsupported fields.",
                      })}
                    </p>
                    <Textarea
                      className="min-h-32 font-mono text-xs"
                      value={memberForm.plan_payload}
                      onChange={(event) => setMemberForm((current) => ({ ...current, plan_payload: event.target.value }))}
                    />
                  </div>
                ) : null}
              </div>
                      </div>
                    </FlowSection>
                  </TabsContent>

                  <Separator />

                  <FlowSection
                    title={t("failover_v2.dns_lines", { defaultValue: "DNS lines" })}
                    description={formatMemberLinesFieldHint(
                      t,
                      memberServiceDNSDomainName || memberDialogService?.dns_entry_id || "-",
                    )}
                  >
                    <MemberDNSLinesEditor
                      t={t}
                      value={memberForm.dns_lines}
                      onChange={(value) => setMemberForm((current) => ({ ...current, dns_lines: value }))}
                      domainName={memberServiceDNSDomainName || memberDialogService?.dns_entry_id || "-"}
                      refreshDisabled={memberDNSCatalogLoading || !memberDialogService?.dns_entry_id}
                      refreshing={memberDNSCatalogLoading}
                      onRefresh={() => {
                        if (memberDialogService) {
                          void loadMemberDNSCatalog(memberDialogService);
                        }
                      }}
                      quickOptions={memberServiceDNSProvider === "aliyun" ? memberDNSLineOptions : []}
                      catalogError={memberDNSCatalogError}
                      hideLabel
                    />
                  </FlowSection>
                </Tabs>

                <Separator />

                <FlowSection
                  title={t("failover_v2.member_section_policy", { defaultValue: "Check policy" })}
                  description={t("failover_v2.member_section_policy_hint", {
                    defaultValue: "Tune member priority, failure threshold, stale window, and cooldown.",
                  })}
                >
                  <div className={FORM_GRID_4_CLASS}>
                  <div className={FORM_FIELD_CLASS}>
                    <Label>{t("failover_v2.priority", { defaultValue: "Priority" })}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={memberForm.priority}
                      onChange={(event) => setMemberForm((current) => ({ ...current, priority: event.target.value }))}
                    />
                  </div>
                  <div className={FORM_FIELD_CLASS}>
                    <Label>{t("failover_v2.failure_threshold", { defaultValue: "Failure threshold" })}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={memberForm.failure_threshold}
                      onChange={(event) => setMemberForm((current) => ({ ...current, failure_threshold: event.target.value }))}
                    />
                  </div>
                  <div className={FORM_FIELD_CLASS}>
                    <Label>{t("failover_v2.stale_after", { defaultValue: "Stale after" })}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={memberForm.stale_after_seconds}
                      onChange={(event) => setMemberForm((current) => ({ ...current, stale_after_seconds: event.target.value }))}
                    />
                  </div>
                  <div className={FORM_FIELD_CLASS}>
                    <Label>{t("failover_v2.cooldown", { defaultValue: "Cooldown" })}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={memberForm.cooldown_seconds}
                      onChange={(event) => setMemberForm((current) => ({ ...current, cooldown_seconds: event.target.value }))}
                    />
                  </div>
                  </div>
                </FlowSection>

              {editingMember ? (
                <>
                  <Separator />
                  <FlowSection
                    title={t("failover_v2.runtime_state", { defaultValue: "Runtime state" })}
                    description={formatRuntimeFieldHint(t)}
                    action={(
                      <div className="flex flex-wrap items-center gap-2">
                        <InlineBadge variant="outline">{formatMemberModeLabel(t, memberFormMode)}</InlineBadge>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setMemberStateAdvancedOpen((open) => !open)}
                        >
                          {memberStateAdvancedOpen ? <ChevronUp className="mr-2 size-4" /> : <ChevronDown className="mr-2 size-4" />}
                          {t("failover_v2.advanced_state_fields", { defaultValue: "Advanced state fields" })}
                        </Button>
                      </div>
                    )}
                  >
                    <div className="grid gap-4">
                    <ReadonlyValueField
                      label={t("failover_v2.watch_client", { defaultValue: "Current client" })}
                      value={memberForm.watch_client_uuid}
                      placeholder={t("failover_v2.runtime_not_initialized", { defaultValue: "Not initialized yet" })}
                      description={formatRuntimeClientHint(t)}
                    />
                    <ReadonlyValueField
                      label={t("failover_v2.current_address", { defaultValue: "Current address" })}
                      value={memberRuntimeAddress}
                      placeholder={t("failover_v2.runtime_not_initialized", { defaultValue: "Not initialized yet" })}
                      description={formatRuntimeAddressHint(t)}
                    />
                    <div className={FORM_FIELD_CLASS}>
                      <Label>{t("failover_v2.dns_lines", { defaultValue: "DNS lines" })}</Label>
                      <div className="border-y border-slate-200/80 py-3 dark:border-slate-800/80">
                        {memberRuntimeLines.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {memberRuntimeLines.map((line) => (
                              <InlineBadge key={line} variant="secondary">{line}</InlineBadge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {t("failover_v2.runtime_not_initialized", { defaultValue: "Not initialized yet" })}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{formatRuntimeDNSRefsHint(t)}</p>
                    </div>
                    <ReadonlyValueField
                      label={t("failover_v2.current_instance_ref", { defaultValue: "Current instance ref" })}
                      value={String(memberForm.current_instance_ref || "").trim() === "null"
                        ? ""
                        : getReadonlyJsonText(memberForm.current_instance_ref, "")}
                      placeholder={t("failover_v2.runtime_not_initialized", { defaultValue: "Not initialized yet" })}
                      description={formatRuntimeInstanceHint(t)}
                      multiline
                    />
                    </div>
                    {memberStateAdvancedOpen ? (
                      <div className="grid gap-4 border-y border-slate-200/80 py-3 dark:border-slate-800/80">
                        <p className="text-xs text-muted-foreground">
                          {t("failover_v2.advanced_state_fields_hint", {
                            defaultValue: "DNS record refs and current instance refs are V2 recovery anchors. Leave them unchanged unless you are importing or repairing state.",
                          })}
                        </p>
                        <div className={FORM_FIELD_CLASS}>
                          <Label>{t("failover_v2.dns_record_refs", { defaultValue: "DNS record refs" })}</Label>
                          <Textarea
                            className="min-h-32 font-mono text-xs"
                            value={memberForm.dns_record_refs}
                            onChange={(event) => setMemberForm((current) => ({ ...current, dns_record_refs: event.target.value }))}
                          />
                          <p className="text-xs text-muted-foreground">{formatRuntimeDNSRefsHint(t)}</p>
                        </div>
                        <div className={FORM_FIELD_CLASS}>
                          <Label>{t("failover_v2.current_address", { defaultValue: "Current address" })}</Label>
                          <Input
                            value={memberForm.current_address}
                            onChange={(event) => setMemberForm((current) => ({ ...current, current_address: event.target.value }))}
                            placeholder={t("failover_v2.runtime_not_initialized", { defaultValue: "Not initialized yet" })}
                          />
                          <p className="text-xs text-muted-foreground">{formatRuntimeAddressHint(t)}</p>
                        </div>
                        <div className={FORM_FIELD_CLASS}>
                          <Label>{t("failover_v2.current_instance_ref", { defaultValue: "Current instance ref" })}</Label>
                          <Textarea
                            className="min-h-32 font-mono text-xs"
                            value={memberForm.current_instance_ref}
                            onChange={(event) => setMemberForm((current) => ({ ...current, current_instance_ref: event.target.value }))}
                            placeholder="null"
                          />
                          <p className="text-xs text-muted-foreground">{formatRuntimeInstanceHint(t)}</p>
                        </div>
                      </div>
                    ) : null}
                  </FlowSection>
                </>
              ) : null}
              </div>
              <aside className="hidden min-w-0 xl:block">
                <div className="sticky top-0 space-y-3 border-l border-slate-200/80 bg-transparent py-1 pl-4 dark:border-slate-800">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {t("failover_v2.member_summary_title", { defaultValue: "出口配置预览" })}
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {t("failover_v2.member_summary_hint", {
                        defaultValue: "右侧只看关键结果，左侧负责编辑。默认网络与 DNS 挂载策略由后端统一处理。",
                      })}
                    </p>
                  </div>

                  <div className="overflow-hidden border-y border-slate-200/80 dark:border-slate-800">
                    {memberDialogSummaryRows.map((row) => (
                      <div key={row.label} className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-b border-slate-200/80 py-2.5 text-sm last:border-b-0 dark:border-slate-800">
                        <div className="text-xs font-medium text-muted-foreground">{row.label}</div>
                        <div className="min-w-0 break-words font-medium text-slate-900 dark:text-slate-50">{row.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-200/80 pt-3 dark:border-slate-800">
                    <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                      {t("failover_v2.member_summary_policy", { defaultValue: "默认策略" })}
                    </div>
                    <div className="mt-2 space-y-2">
                      {memberDialogPolicyNotes.map((note) => (
                        <div key={note} className="flex gap-2 text-xs leading-5 text-muted-foreground">
                          <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                          <span>{note}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-200/80 pt-3 dark:border-slate-800">
                    <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                      {t("failover_v2.member_summary_dns", { defaultValue: "DNS 线路" })}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {memberFormDNSLines.length > 0 ? memberFormDNSLines.map((line) => (
                        <InlineBadge key={line} variant="secondary">{line}</InlineBadge>
                      )) : (
                        <span className="text-xs text-muted-foreground">
                          {t("failover_v2.member_dns_lines_empty", { defaultValue: "No DNS lines selected yet." })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleValidateMemberForm()}
              disabled={savingMember || validatingMember}
              className="self-start text-muted-foreground"
            >
              {validatingMember ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
              {t("failover_v2.validate", { defaultValue: "Validate" })}
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => closeMemberDialog()}
              disabled={savingMember || validatingMember}
            >
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Button>
              <Button onClick={() => void handleSaveMember()} disabled={savingMember || validatingMember}>
                {savingMember ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
                {editingMember
                  ? t("common.save", { defaultValue: "Save" })
                  : t("common.create", { defaultValue: "Create" })}
              </Button>
            </div>
          </div>
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
              {platformAdmin
                ? t("failover_v2.detach_dns", { defaultValue: "Detach DNS" })
                : t("failover_v2.public.pause_line", { defaultValue: "暂停线路" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {platformAdmin
                ? t("failover_v2.detach_dns_description", {
                    defaultValue: "This will immediately remove the selected member line from the configured DNS provider and mark the member as detached until later recovery.",
                  })
                : t("failover_v2.public.pause_line_description", {
                    defaultValue: "这会暂停所选成员的对外服务，后续可重新恢复。",
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
                ? platformAdmin
                  ? t("failover_v2.detaching_dns", { defaultValue: "Detaching" })
                  : t("failover_v2.public.pausing_line", { defaultValue: "正在暂停" })
                : platformAdmin
                  ? t("failover_v2.detach_dns_confirm", { defaultValue: "Detach now" })
                  : t("failover_v2.public.pause_line_confirm", { defaultValue: "确认暂停" })}
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
              {platformAdmin
                ? t("failover_v2.failover_now_description", {
                    defaultValue: "This will detach the selected member line from DNS, create a replacement instance with the configured member provider, wait for the new agent, validate outlet connectivity, run service scripts, and then attach the new IP back to this line. The old instance is kept for now.",
                  })
                : t("failover_v2.public.failover_now_description", {
                    defaultValue: "这会立即为所选成员发起恢复流程。处理完成后，线路会切换到新的可用地址。",
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
        <DialogContent className={ADMIN_FORM_DIALOG_CLASS}>
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
              <div className="admin-alert admin-alert-danger mb-4 text-sm">
                {pendingCleanupError}
              </div>
            ) : null}

            {loadingPendingCleanups && pendingCleanups.length === 0 ? (
              <div className="border-y border-dashed border-slate-300 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {t("failover_v2.pending_cleanup_loading", { defaultValue: "Loading pending cleanups..." })}
              </div>
            ) : null}

            {!loadingPendingCleanups && pendingCleanups.length === 0 ? (
              <div className="border-y border-dashed border-slate-300 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {t("failover_v2.pending_cleanup_empty", { defaultValue: "No pending cleanup items recorded for this service." })}
              </div>
            ) : null}

            <div className="space-y-3">
              {pendingCleanupDialogTarget && pendingCleanups.map((cleanup) => {
                const instanceRefBlock = formatJsonBlock(cleanup.instance_ref);
                return (
                  <div
                    key={cleanup.id}
                    className="border-y border-slate-200 py-4 dark:border-slate-800"
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
                      <div className="border-l-2 border-slate-200 py-2 pl-3 dark:border-slate-800">
                        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t("failover_v2.pending_cleanup_attempts", { defaultValue: "Attempts" })}
                        </div>
                        <div className="mt-2 font-semibold text-slate-900 dark:text-slate-50">
                          {cleanup.attempt_count}
                        </div>
                      </div>
                      <div className="border-l-2 border-slate-200 py-2 pl-3 dark:border-slate-800">
                        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t("failover_v2.pending_cleanup_last_attempt", { defaultValue: "Last attempt" })}
                        </div>
                        <div className="mt-2 font-semibold text-slate-900 dark:text-slate-50">
                          {formatTimestamp(cleanup.last_attempted_at)}
                        </div>
                      </div>
                      <div className="border-l-2 border-slate-200 py-2 pl-3 dark:border-slate-800">
                        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t("failover_v2.pending_cleanup_next_retry", { defaultValue: "Next retry" })}
                        </div>
                        <div className="mt-2 font-semibold text-slate-900 dark:text-slate-50">
                          {formatTimestamp(cleanup.next_retry_at)}
                        </div>
                      </div>
                      <div className="border-l-2 border-slate-200 py-2 pl-3 dark:border-slate-800">
                        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t("failover_v2.pending_cleanup_resolved_at", { defaultValue: "Resolved" })}
                        </div>
                        <div className="mt-2 font-semibold text-slate-900 dark:text-slate-50">
                          {formatTimestamp(cleanup.resolved_at)}
                        </div>
                      </div>
                    </div>

                    {cleanup.last_error ? (
                      <div className="admin-alert admin-alert-danger mt-4 text-sm">
                        {cleanup.last_error}
                      </div>
                    ) : null}

                    {instanceRefBlock ? (
                      <div className="mt-4 border-y border-slate-200 py-3 dark:border-slate-800">
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
        <DialogContent className={cn(ADMIN_FORM_DIALOG_WIDE_CLASS, "max-w-[1120px] gap-0 p-0 sm:max-w-[1120px]")}>
          <DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-5 pr-14 dark:border-slate-800">
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

          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="min-h-0 overflow-y-auto border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/40 lg:border-b-0 lg:border-r">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {t("failover_v2.execution_list", { defaultValue: "History" })}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t("failover_v2.execution_list_hint", { defaultValue: "Select one run" })}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => executionDialogTarget && void loadExecutionHistory(executionDialogTarget.service, selectedExecutionID)}
                  disabled={!executionDialogTarget || loadingExecutions}
                >
                  {loadingExecutions ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  <span className="sr-only">{t("common.refresh", { defaultValue: "Refresh" })}</span>
                </Button>
              </div>

              {loadingExecutions && executionSummaries.length === 0 ? (
                <div className="border-y border-dashed border-slate-300 py-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {t("failover_v2.execution_loading", { defaultValue: "Loading executions..." })}
                </div>
              ) : null}

              {!loadingExecutions && executionSummaries.length === 0 ? (
                <div className="border-y border-dashed border-slate-300 py-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {t("failover_v2.execution_empty", { defaultValue: "No executions recorded yet." })}
                </div>
              ) : null}

              <div className="space-y-2">
                {executionDialogTarget && executionSummaries.map((execution) => (
                  <button
                    key={execution.id}
                    type="button"
                    className={cn(
                      "w-full border-l-2 px-3 py-3 text-left transition",
                      execution.id === selectedExecutionID
                        ? "border-sky-300 bg-sky-50 shadow-none dark:border-sky-800 dark:bg-sky-950/30"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-slate-700",
                    )}
                    onClick={() => handleSelectExecution(execution.id)}
                  >
                    <div className="min-w-0 space-y-2">
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {findMemberLabel(executionDialogTarget.service, execution.member_id)}
                          </div>
                          {platformAdmin ? (
                            <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                              #{execution.id} · {localizeFailoverV2TriggerReason(t, execution.trigger_reason)}
                            </div>
                          ) : null}
                        </div>
                        <Badge color={getStatusBadgeColor(execution.status || "unknown")}>
                          {localizeFailoverV2Status(t, execution.status)}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatTimestamp(execution.started_at)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <main className="min-h-0 overflow-y-auto bg-slate-100/60 p-4 dark:bg-slate-950/20 sm:p-5">
              {executionError ? (
                <div className="admin-alert admin-alert-danger text-sm">
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
                <div className="border-y border-dashed border-slate-300 py-8 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {t("failover_v2.execution_select_hint", { defaultValue: "Select an execution to inspect its timeline." })}
                </div>
              ) : null}

              {!loadingExecutionDetail && selectedExecution && executionDialogTarget ? (
                <div className="space-y-4">
                  <ExecutionDetailSection
                    title={t("failover_v2.execution_summary", { defaultValue: "执行摘要" })}
                    description={platformAdmin
                      ? t("failover_v2.execution_summary_hint", {
                          defaultValue: "集中展示执行对象、触发类型、总状态和基础元信息。",
                        })
                      : t("failover_v2.public.execution_summary_hint", {
                          defaultValue: "集中展示执行对象、状态和处理结果。",
                        })}
                  >
                    <div className="space-y-4">
                      <div className="space-y-2 border-b border-slate-200 pb-4 dark:border-slate-800">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {t("failover_v2.execution_member", { defaultValue: "执行对象" })}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="min-w-0 text-lg font-semibold text-slate-950 dark:text-slate-50">
                            {findMemberLabel(executionDialogTarget.service, selectedExecution.member_id)}
                          </div>
                          <Badge color={getStatusBadgeColor(selectedExecution.status || "unknown")}>
                            {localizeFailoverV2Status(t, selectedExecution.status)}
                          </Badge>
                          {platformAdmin ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                              {localizeFailoverV2TriggerReason(t, selectedExecution.trigger_reason)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className={cn("grid gap-5", platformAdmin ? "xl:grid-cols-[minmax(0,1.45fr)_minmax(240px,0.85fr)]" : "")}>
                        <div>
                          <div className="mb-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                            {t("failover_v2.execution_basic_info", { defaultValue: "基础信息" })}
                          </div>
                          <dl className="grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                            {platformAdmin ? (
                              <div className="min-w-0">
                                <dt className="text-xs text-slate-500 dark:text-slate-400">
                                  {t("failover_v2.execution_id", { defaultValue: "执行 ID" })}
                                </dt>
                                <dd className="mt-1 font-semibold text-slate-950 dark:text-slate-50">#{selectedExecution.id}</dd>
                              </div>
                            ) : null}
                            <div className="min-w-0">
                              <dt className="text-xs text-slate-500 dark:text-slate-400">
                                {t("failover_v2.execution_started", { defaultValue: "开始时间" })}
                              </dt>
                              <dd className="mt-1 font-semibold text-slate-950 dark:text-slate-50">{formatTimestamp(selectedExecution.started_at)}</dd>
                            </div>
                            <div className="min-w-0">
                              <dt className="text-xs text-slate-500 dark:text-slate-400">
                                {t("failover_v2.execution_finished", { defaultValue: "结束时间" })}
                              </dt>
                              <dd className="mt-1 font-semibold text-slate-950 dark:text-slate-50">{formatTimestamp(selectedExecution.finished_at)}</dd>
                            </div>
                            {platformAdmin ? (
                              <>
                                <div className="min-w-0">
                                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                                    {t("failover_v2.execution_old_client", { defaultValue: "旧客户端" })}
                                  </dt>
                                  <dd className="mt-1 break-words font-mono text-xs font-semibold text-slate-950 dark:text-slate-50">{selectedExecution.old_client_uuid || "-"}</dd>
                                </div>
                                <div className="min-w-0">
                                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                                    {t("failover_v2.execution_new_client", { defaultValue: "新客户端" })}
                                  </dt>
                                  <dd className="mt-1 break-words font-mono text-xs font-semibold text-slate-950 dark:text-slate-50">{selectedExecution.new_client_uuid || "-"}</dd>
                                </div>
                              </>
                            ) : (
                              <div className="min-w-0">
                                <dt className="text-xs text-slate-500 dark:text-slate-400">
                                  {t("common.result", { defaultValue: "结果" })}
                                </dt>
                                <dd className="mt-1 font-semibold text-slate-950 dark:text-slate-50">
                                  {getPublicFailoverResultText(t, selectedExecution.status, selectedExecution.error_message)}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>

                        {platformAdmin ? (
                        <div className="border-t border-slate-200 pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0 dark:border-slate-800">
                          <div className="mb-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                            {t("failover_v2.execution_stage_status", { defaultValue: "阶段状态" })}
                          </div>
                          <div className="space-y-2">
                            {[
                              ["detach_dns", selectedExecution.detach_dns_status],
                              ["attach_dns", selectedExecution.attach_dns_status],
                              ["cleanup", selectedExecution.cleanup_status],
                            ].map(([stage, status]) => (
                              <div
                                key={stage}
                                className="flex items-center justify-between gap-3 border-b border-slate-200 py-2 last:border-b-0 dark:border-slate-800"
                              >
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                  {localizeFailoverV2Stage(t, stage)}
                                </span>
                                <Badge color={getStatusBadgeColor(status || "pending")}>
                                  {localizeFailoverV2Status(t, status || "pending")}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                        ) : null}
                      </div>
                    </div>

                    {selectedExecution.error_message ? (
                      <div className="admin-alert admin-alert-danger mt-4 text-sm">
                        {platformAdmin
                          ? selectedExecution.error_message
                          : getPublicFailoverResultText(t, selectedExecution.status, selectedExecution.error_message)}
                      </div>
                    ) : null}
                  </ExecutionDetailSection>

                  {platformAdmin ? (
                  <>
                  <ExecutionDetailSection
                    title={t("failover_v2.execution_steps", { defaultValue: "步骤状态" })}
                    description={t("failover_v2.execution_steps_hint", {
                      defaultValue: "按时间顺序展示每个阶段的状态、摘要和排障信息。",
                    })}
                  >
                    {selectedExecution.steps.length === 0 ? (
                      <div className="border-y border-dashed border-slate-300 py-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        {t("failover_v2.execution_steps_empty", { defaultValue: "暂无步骤记录。" })}
                      </div>
                    ) : (
                      <ol className="relative overflow-hidden border-y border-slate-200 dark:border-slate-800">
                        {selectedExecution.steps.map((step, stepIndex) => {
                          const detailBlock = formatJsonBlock(step.detail);
                          const detailSummaryItems = getFailoverV2DetailSummaryItems(t, step.detail);
                          const localizedStepMessage = getFailoverV2ExecutionStepMessage(t, step.message);
                          return (
                            <li
                              key={step.id}
                              className="relative grid gap-3 border-b border-slate-200 px-4 py-4 pl-12 last:border-b-0 dark:border-slate-800"
                            >
                              <div className="absolute left-5 top-0 h-full w-px bg-slate-200 dark:bg-slate-800" />
                              <div className="absolute left-[13px] top-5 flex size-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                {stepIndex + 1}
                              </div>
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 space-y-1">
                                  <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                                    {getFailoverV2ExecutionStepLabel(t, step)}
                                  </div>
                                  <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                                    {t("failover_v2.step_key", { defaultValue: "步骤键" })}: {step.step_key || "-"}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2 lg:items-end">
                                  <Badge color={getStatusBadgeColor(step.status || "pending")}>
                                    {localizeFailoverV2Status(t, step.status || "pending")}
                                  </Badge>
                                  <dl className="grid gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                                    <div className="flex gap-1">
                                      <dt>{t("failover_v2.execution_started", { defaultValue: "开始时间" })}:</dt>
                                      <dd>{formatTimestamp(step.started_at)}</dd>
                                    </div>
                                    <div className="flex gap-1">
                                      <dt>{t("failover_v2.execution_finished", { defaultValue: "结束时间" })}:</dt>
                                      <dd>{formatTimestamp(step.finished_at)}</dd>
                                    </div>
                                  </dl>
                                </div>
                              </div>
                              {localizedStepMessage || detailSummaryItems.length > 0 ? (
                                <div className="grid gap-x-5 gap-y-3 border-t border-dashed border-slate-200 pt-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)] dark:border-slate-800">
                                  {localizedStepMessage ? (
                                    <div className="min-w-0">
                                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                        {t("failover_v2.step_summary", { defaultValue: "步骤摘要" })}
                                      </div>
                                      <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                        {localizedStepMessage}
                                      </div>
                                    </div>
                                  ) : null}
                                  {detailSummaryItems.length > 0 ? (
                                    <div className="min-w-0">
                                      <div className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                        {t("failover_v2.step_detail_summary", { defaultValue: "关键信息" })}
                                      </div>
                                      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                                        {detailSummaryItems.map((item) => (
                                          <div key={item.key} className="min-w-0">
                                            <dt className="text-xs text-slate-500 dark:text-slate-400">{item.label}</dt>
                                            <dd className="mt-1 break-words font-medium text-slate-800 dark:text-slate-100">{item.value}</dd>
                                          </div>
                                        ))}
                                      </dl>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                              {detailBlock ? (
                                <details className="group border-t border-dashed border-slate-200 pt-3 dark:border-slate-800">
                                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-600 marker:hidden dark:text-slate-300 [&::-webkit-details-marker]:hidden">
                                    <span>{t("failover_v2.raw_detail", { defaultValue: "原始 JSON" })}</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                      <span className="group-open:hidden">{t("failover_v2.expand_raw_detail", { defaultValue: "展开原始 JSON" })}</span>
                                      <span className="hidden group-open:inline">{t("failover_v2.collapse_raw_detail", { defaultValue: "收起原始 JSON" })}</span>
                                    </span>
                                  </summary>
                                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                    {detailBlock}
                                  </pre>
                                </details>
                              ) : null}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </ExecutionDetailSection>

                  <ExecutionDetailSection
                    title={t("failover_v2.execution_key_info", { defaultValue: "关键信息" })}
                    description={t("failover_v2.execution_key_info_hint", {
                      defaultValue: "默认先看结构化摘要，需要排障时再展开原始 JSON。",
                    })}
                  >
                    {(() => {
                      const infoBlocks = [
                        {
                          key: "trigger_snapshot",
                          label: t("failover_v2.execution_block_trigger_snapshot", { defaultValue: "触发快照" }),
                          rawValue: selectedExecution.trigger_snapshot,
                        },
                        {
                          key: "old_instance",
                          label: t("failover_v2.execution_block_old_instance", { defaultValue: "旧实例" }),
                          rawValue: selectedExecution.old_instance_ref,
                        },
                        {
                          key: "old_addresses",
                          label: t("failover_v2.execution_block_old_addresses", { defaultValue: "旧地址" }),
                          rawValue: selectedExecution.old_addresses,
                        },
                        {
                          key: "detach_dns_result",
                          label: t("failover_v2.execution_block_detach_dns_result", { defaultValue: "DNS 摘除结果" }),
                          rawValue: selectedExecution.detach_dns_result,
                        },
                        {
                          key: "new_instance",
                          label: t("failover_v2.execution_block_new_instance", { defaultValue: "新实例" }),
                          rawValue: selectedExecution.new_instance_ref,
                        },
                        {
                          key: "new_addresses",
                          label: t("failover_v2.execution_block_new_addresses", { defaultValue: "新地址" }),
                          rawValue: selectedExecution.new_addresses,
                        },
                        {
                          key: "attach_dns_result",
                          label: t("failover_v2.execution_block_attach_dns_result", { defaultValue: "DNS 挂载结果" }),
                          rawValue: selectedExecution.attach_dns_result,
                        },
                        {
                          key: "cleanup_result",
                          label: t("failover_v2.execution_block_cleanup_result", { defaultValue: "清理结果" }),
                          rawValue: selectedExecution.cleanup_result,
                        },
                      ].map((block) => ({
                        ...block,
                        content: formatJsonBlock(block.rawValue),
                        summaryItems: getFailoverV2DetailSummaryItems(t, block.rawValue, 4),
                      })).filter((block) => Boolean(block.content));

                      return infoBlocks.length > 0 ? (
                        <div className="overflow-hidden border-y border-slate-200 dark:border-slate-800 [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-slate-200 dark:[&>*:not(:last-child)]:border-slate-800">
                          {infoBlocks.map((block) => (
                            <ExecutionJsonBlock
                              key={block.key}
                              label={block.label}
                              expandLabel={t("failover_v2.expand_raw_detail", { defaultValue: "展开原始 JSON" })}
                              collapseLabel={t("failover_v2.collapse_raw_detail", { defaultValue: "收起原始 JSON" })}
                              content={block.content}
                              summaryItems={block.summaryItems}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="border-y border-dashed border-slate-300 py-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                          {t("failover_v2.execution_key_info_empty", { defaultValue: "本次执行没有记录结构化详情。" })}
                        </div>
                      );
                    })()}
                  </ExecutionDetailSection>

                  <ExecutionDetailSection
                    title={t("failover_v2.execution_actions", { defaultValue: "操作区" })}
                    description={t("failover_v2.execution_actions_hint", {
                      defaultValue: "操作按当前执行保存的数据进行复用，不会改动后端接口或既有流程。",
                    })}
                  >
                    <div className="overflow-hidden border-y border-slate-200 dark:border-slate-800 [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-slate-200 dark:[&>*:not(:last-child)]:border-slate-800">
                      <ExecutionActionCard
                        tone="danger"
                        title={t("failover_v2.stop_execution", { defaultValue: "停止执行" })}
                        description={t("failover_v2.stop_execution_hint", {
                          defaultValue: "停止当前仍在进行的执行，阻止继续进入后续步骤。已完成的步骤不会自动回滚。",
                        })}
                        reason={!selectedExecutionActions?.stop.available
                          ? localizeFailoverV2ActionReason(t, selectedExecutionActions?.stop.reason)
                          : undefined}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => setExecutionActionTarget({
                            action: "stop",
                            serviceID: executionDialogTarget.service.id,
                            executionID: selectedExecution.id,
                          })}
                          disabled={!selectedExecutionActions?.stop.available}
                        >
                          {t("failover_v2.stop_execution", { defaultValue: "停止执行" })}
                        </Button>
                      </ExecutionActionCard>

                      <ExecutionActionCard
                        title={t("failover_v2.retry_attach_dns", { defaultValue: "重试挂载 DNS" })}
                        description={t("failover_v2.retry_attach_dns_hint", {
                          defaultValue: "复用已保存的替换地址重新挂载 DNS，不会重新创建实例。",
                        })}
                        reason={!selectedExecutionActions?.retry_attach_dns.available
                          ? localizeFailoverV2ActionReason(t, selectedExecutionActions?.retry_attach_dns.reason)
                          : undefined}
                      >
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => setExecutionActionTarget({
                            action: "retry_attach_dns",
                            serviceID: executionDialogTarget.service.id,
                            executionID: selectedExecution.id,
                          })}
                          disabled={!selectedExecutionActions?.retry_attach_dns.available}
                        >
                          {t("failover_v2.retry_attach_dns", { defaultValue: "重试挂载 DNS" })}
                        </Button>
                      </ExecutionActionCard>

                      <ExecutionActionCard
                        title={t("failover_v2.retry_cleanup", { defaultValue: "重试清理" })}
                        description={t("failover_v2.retry_cleanup_hint", {
                          defaultValue: "仅重试旧实例清理，不会触碰 DNS，也不会再创建机器。",
                        })}
                        reason={!selectedExecutionActions?.retry_cleanup.available
                          ? localizeFailoverV2ActionReason(t, selectedExecutionActions?.retry_cleanup.reason)
                          : undefined}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => setExecutionActionTarget({
                            action: "retry_cleanup",
                            serviceID: executionDialogTarget.service.id,
                            executionID: selectedExecution.id,
                          })}
                          disabled={!selectedExecutionActions?.retry_cleanup.available}
                        >
                          {t("failover_v2.retry_cleanup", { defaultValue: "重试清理" })}
                        </Button>
                      </ExecutionActionCard>
                    </div>
                  </ExecutionDetailSection>
                  </>
                  ) : null}
                </div>
              ) : null}
            </main>
          </div>

          <DialogFooter className="shrink-0 border-t border-slate-200 bg-background/95 px-6 py-4 backdrop-blur dark:border-slate-800">
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

      <FailoverV2ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        service={shareDialogService}
        share={shareRecord}
        loading={loadingShare}
        saving={savingShare}
        deleting={deletingShare}
        title={shareTitle}
        note={shareNote}
        accessPolicy={shareAccessPolicy}
        expiresAt={shareExpiresAt}
        shareUrl={shareUrl}
        onTitleChange={setShareTitle}
        onNoteChange={setShareNote}
        onAccessPolicyChange={setShareAccessPolicy}
        onExpiresAtChange={setShareExpiresAt}
        onCopyLink={() => void handleCopyShareLink()}
        onSave={() => void handleSaveShare()}
        onDelete={() => void handleDeleteShare()}
      />

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

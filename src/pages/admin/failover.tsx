import React from "react";
import { Navigate } from "react-router-dom";
import {
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getCloudProviderEntries, type CloudProviderCredentialEntry } from "@/lib/cloud";
import {
  createFailoverTask,
  deleteFailoverTask,
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
  type FailoverNodeOption,
  type FailoverPlanInput,
  type FailoverScriptOption,
  type FailoverTask,
  type FailoverTaskInput,
} from "@/lib/failover";
import { cn } from "@/lib/utils";
import { getDefaultAdminPath, useAccount } from "@/contexts/AccountContext";

type TaskFormState = {
  name: string;
  enabled: boolean;
  watch_client_uuid: string;
  failure_threshold: string;
  stale_after_seconds: string;
  cooldown_seconds: string;
  dns_provider: string;
  dns_entry_id: string;
  dns_payload: string;
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
};

const FAILOVER_PROVIDER_KEYS = [
  "cloudflare",
  "aliyun",
  "aws",
  "digitalocean",
  "linode",
] as const;

const DELETE_STRATEGY_OPTIONS = [
  { value: "keep", label: "Keep old instance" },
  { value: "delete_after_success", label: "Delete after success" },
  { value: "delete_after_success_delay", label: "Delete after delay" },
] as const;

const DNS_PROVIDER_OPTIONS = [
  { value: "cloudflare", label: "Cloudflare DNS" },
  { value: "aliyun", label: "Aliyun DNS" },
] as const;

const PLAN_PROVIDER_OPTIONS = [
  { value: "aws", label: "AWS" },
  { value: "digitalocean", label: "DigitalOcean" },
  { value: "linode", label: "Linode" },
] as const;

const ACTION_TYPE_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  aws: [
    { value: "provision_instance", label: "Provision instance" },
    { value: "rebind_public_ip", label: "Rebind public IP" },
  ],
  digitalocean: [{ value: "provision_instance", label: "Provision instance" }],
  linode: [{ value: "provision_instance", label: "Provision instance" }],
};

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

function formatDurationSeconds(value?: number | null) {
  const total = Number(value || 0);
  if (!Number.isFinite(total) || total <= 0) {
    return "0s";
  }

  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = Math.floor(total % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
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

function parseJsonText(label: string, value: string, fallback: unknown) {
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error(`${label} must be valid JSON`);
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

  if (args.includeActive) {
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

function createEmptyPlanForm(providerEntries: ProviderEntriesMap): PlanFormState {
  const awsOptions = buildProviderEntryOptions({
    entries: providerEntries.aws || [],
    includeActive: true,
  });

  return {
    local_id: createLocalID(),
    name: "",
    priority: "1",
    enabled: true,
    provider: "aws",
    provider_entry_id: awsOptions[0]?.id || "active",
    action_type: "provision_instance",
    payload: "{}",
    auto_connect_group: "",
    script_clipboard_id: "",
    script_timeout_sec: "600",
    wait_agent_timeout_sec: "600",
  };
}

function createEmptyTaskForm(providerEntries: ProviderEntriesMap): TaskFormState {
  const dnsOptions = buildProviderEntryOptions({
    entries: providerEntries.cloudflare || [],
  });

  return {
    name: "",
    enabled: true,
    watch_client_uuid: "",
    failure_threshold: "2",
    stale_after_seconds: "300",
    cooldown_seconds: "1800",
    dns_provider: "cloudflare",
    dns_entry_id: dnsOptions[0]?.id || "",
    dns_payload: "{}",
    delete_strategy: "keep",
    delete_delay_seconds: "0",
    plans: [createEmptyPlanForm(providerEntries)],
  };
}

function taskToForm(task: FailoverTask): TaskFormState {
  return {
    name: task.name,
    enabled: task.enabled,
    watch_client_uuid: task.watch_client_uuid,
    failure_threshold: String(task.failure_threshold || 2),
    stale_after_seconds: String(task.stale_after_seconds || 300),
    cooldown_seconds: String(task.cooldown_seconds || 1800),
    dns_provider: task.dns_provider,
    dns_entry_id: normalizeProviderEntryID(task.dns_entry_id),
    dns_payload: prettyJson(task.dns_payload),
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
      : [createEmptyPlanForm({})],
  };
}

function buildTaskInput(formState: TaskFormState): FailoverTaskInput {
  const taskName = formState.name.trim();
  if (!taskName) {
    throw new Error("Task name is required");
  }
  if (!formState.watch_client_uuid.trim()) {
    throw new Error("Please choose a watch node");
  }
  if (!formState.dns_entry_id.trim()) {
    throw new Error("DNS credential entry is required");
  }
  if (formState.plans.length === 0) {
    throw new Error("At least one failover plan is required");
  }

  const plans: FailoverPlanInput[] = formState.plans.map((plan, index) => {
    if (!plan.provider_entry_id.trim()) {
      throw new Error(`Plan ${index + 1} requires a provider entry`);
    }

    return {
      name: plan.name.trim(),
      priority: numberOrDefault(plan.priority, index + 1),
      enabled: plan.enabled,
      provider: plan.provider,
      provider_entry_id: normalizeProviderEntryID(plan.provider_entry_id.trim()),
      action_type: plan.action_type,
      payload: parseJsonText(`Plan ${index + 1} payload`, plan.payload, {}),
      auto_connect_group: plan.auto_connect_group.trim(),
      script_clipboard_id: plan.script_clipboard_id
        ? numberOrDefault(plan.script_clipboard_id, 0)
        : null,
      script_timeout_sec: numberOrDefault(plan.script_timeout_sec, 600),
      wait_agent_timeout_sec: numberOrDefault(plan.wait_agent_timeout_sec, 600),
    };
  });

  return {
    name: taskName,
    enabled: formState.enabled,
    watch_client_uuid: formState.watch_client_uuid.trim(),
    failure_threshold: numberOrDefault(formState.failure_threshold, 2),
    stale_after_seconds: numberOrDefault(formState.stale_after_seconds, 300),
    cooldown_seconds: numberOrDefault(formState.cooldown_seconds, 1800),
    dns_provider: formState.dns_provider,
    dns_entry_id: normalizeProviderEntryID(formState.dns_entry_id.trim()),
    dns_payload: parseJsonText("DNS payload", formState.dns_payload, {}),
    delete_strategy: formState.delete_strategy,
    delete_delay_seconds: numberOrDefault(formState.delete_delay_seconds, 0),
    plans,
  };
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
      setError(nextError instanceof Error ? nextError.message : "Failed to load execution");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [executionID]);

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
                  <Badge variant={getStatusVariant(execution.status, "execution")}>{humanizeStatus(execution.status)}</Badge>
                  <div className="mt-2 text-xs text-muted-foreground">{formatDateTime(execution.started_at)}</div>
                </CardContent>
              </Card>
              <Card className="gap-4 py-4">
                <CardHeader className="px-4 pb-0">
                  <CardTitle className="text-sm">{t("failover.execution.script", { defaultValue: "Script" })}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pt-0 space-y-2">
                  <Badge variant={getStatusVariant(execution.script_status, "script")}>{humanizeStatus(execution.script_status)}</Badge>
                  <div className="text-xs text-muted-foreground">
                    {execution.script_name_snapshot || t("failover.execution.no_script", { defaultValue: "No script recorded" })}
                  </div>
                  {execution.script_exit_code !== null ? (
                    <div className="text-xs text-muted-foreground">Exit code: {execution.script_exit_code}</div>
                  ) : null}
                </CardContent>
              </Card>
              <Card className="gap-4 py-4">
                <CardHeader className="px-4 pb-0">
                  <CardTitle className="text-sm">DNS</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pt-0">
                  <Badge variant={getStatusVariant(execution.dns_status, "dns")}>{humanizeStatus(execution.dns_status)}</Badge>
                  <div className="mt-2 text-xs text-muted-foreground">{execution.dns_provider || "-"}</div>
                </CardContent>
              </Card>
              <Card className="gap-4 py-4">
                <CardHeader className="px-4 pb-0">
                  <CardTitle className="text-sm">{t("failover.execution.cleanup", { defaultValue: "Cleanup" })}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pt-0">
                  <Badge variant={getStatusVariant(execution.cleanup_status, "cleanup")}>{humanizeStatus(execution.cleanup_status)}</Badge>
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
                        <Badge variant={getStatusVariant(step.status, "execution")}>{humanizeStatus(step.status)}</Badge>
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

  React.useEffect(() => {
    if (!open) {
      return;
    }
    setFormState(task ? taskToForm(task) : createEmptyTaskForm(providerEntries));
  }, [open, providerEntries, task]);

  const sortedNodes = React.useMemo(
    () => [...nodes].sort((left, right) => compareString(left.name || left.uuid, right.name || right.uuid)),
    [nodes],
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

  const updateTaskField = <K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) => {
    setFormState((current) => ({ ...current, [key]: value }));
  };

  const updatePlan = (localID: string, updater: (plan: PlanFormState) => PlanFormState) => {
    setFormState((current) => ({
      ...current,
      plans: current.plans.map((plan) => (plan.local_id === localID ? updater(plan) : plan)),
    }));
  };

  const addPlan = () => {
    setFormState((current) => ({
      ...current,
      plans: [
        ...current.plans,
        {
          ...createEmptyPlanForm(providerEntries),
          priority: String(current.plans.length + 1),
        },
      ],
    }));
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
      const payload = buildTaskInput(formState);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {task
              ? t("failover.editor.edit_title", { defaultValue: "Edit failover task" })
              : t("failover.editor.create_title", { defaultValue: "Create failover task" })}
          </DialogTitle>
          <DialogDescription>
            {t("failover.editor.description", {
              defaultValue:
                "Configure how Komari reacts when CN connectivity turns abnormal: choose the watched node, cloud plans, scripts, and DNS update target.",
            })}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <Card className="gap-4 py-4">
            <CardHeader className="px-4 pb-0">
              <CardTitle>{t("failover.editor.basics", { defaultValue: "Task basics" })}</CardTitle>
              <CardDescription>
                {t("failover.editor.basics_hint", { defaultValue: "These values decide when the task triggers and which node is watched." })}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 px-4 pt-0 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 md:col-span-2 xl:col-span-2">
                <Label htmlFor="failover-name">{t("common.name", { defaultValue: "Name" })}</Label>
                <Input
                  id="failover-name"
                  value={formState.name}
                  onChange={(event) => updateTaskField("name", event.target.value)}
                  placeholder={t("failover.editor.name_placeholder", { defaultValue: "CN failover for production edge" })}
                />
              </div>
              <div className="space-y-2 md:col-span-2 xl:col-span-2">
                <Label>{t("failover.editor.watch_node", { defaultValue: "Watch node" })}</Label>
                <Select
                  value={formState.watch_client_uuid || undefined}
                  onValueChange={(value) => updateTaskField("watch_client_uuid", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("failover.editor.watch_node_placeholder", { defaultValue: "Choose a node" })} />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedNodes.map((node) => (
                      <SelectItem key={node.uuid} value={node.uuid}>
                        {getNodeLabel(node)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              <div className="flex items-center gap-3 rounded-lg border px-3 py-3">
                <Checkbox
                  id="failover-enabled"
                  checked={formState.enabled}
                  onCheckedChange={(checked) => updateTaskField("enabled", Boolean(checked))}
                />
                <Label htmlFor="failover-enabled" className="cursor-pointer">
                  {t("failover.editor.enabled", { defaultValue: "Task enabled" })}
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-4 py-4">
            <CardHeader className="px-4 pb-0">
              <CardTitle>{t("failover.editor.dns", { defaultValue: "DNS and cleanup" })}</CardTitle>
              <CardDescription>
                {t("failover.editor.dns_hint", { defaultValue: "Choose which DNS provider gets updated after a successful switch and how to handle the old instance." })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-4 pt-0">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label>{t("failover.editor.dns_provider", { defaultValue: "DNS provider" })}</Label>
                  <Select
                    value={formState.dns_provider}
                    onValueChange={(value) => {
                      const options = buildProviderEntryOptions({ entries: providerEntries[value] || [] });
                      setFormState((current) => ({
                        ...current,
                        dns_provider: value,
                        dns_entry_id:
                          current.dns_provider === value && current.dns_entry_id
                            ? current.dns_entry_id
                            : (options[0]?.id || ""),
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DNS_PROVIDER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-1 xl:col-span-1">
                  <Label>{t("failover.editor.dns_entry", { defaultValue: "DNS credential entry" })}</Label>
                  {(() => {
                    const options = buildProviderEntryOptions({
                      entries: providerEntries[formState.dns_provider] || [],
                      currentValue: formState.dns_entry_id,
                    });
                    if (options.length === 0) {
                      return (
                        <Input
                          value={formState.dns_entry_id}
                          onChange={(event) => updateTaskField("dns_entry_id", event.target.value)}
                          placeholder={t("failover.editor.dns_entry_placeholder", { defaultValue: "default" })}
                        />
                      );
                    }
                    return (
                      <Select
                        value={formState.dns_entry_id || undefined}
                        onValueChange={(value) => updateTaskField("dns_entry_id", value)}
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
                      {DELETE_STRATEGY_OPTIONS.map((option) => (
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
              <div className="space-y-2">
                <Label htmlFor="failover-dns-payload">{t("failover.editor.dns_payload", { defaultValue: "DNS payload JSON" })}</Label>
                <Textarea
                  id="failover-dns-payload"
                  rows={8}
                  className="font-mono text-xs"
                  value={formState.dns_payload}
                  onChange={(event) => updateTaskField("dns_payload", event.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="gap-4 py-4">
            <CardHeader className="px-4 pb-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{t("failover.editor.plans", { defaultValue: "Failover plans" })}</CardTitle>
                  <CardDescription>
                    {t("failover.editor.plans_hint", { defaultValue: "Plans run in ascending priority until one succeeds." })}
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" onClick={addPlan}>
                  <Plus className="size-4" />
                  {t("failover.editor.add_plan", { defaultValue: "Add plan" })}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-4 pt-0">
              {formState.plans.map((plan, index) => {
                const providerOptions = buildProviderEntryOptions({
                  entries: providerEntries[plan.provider] || [],
                  includeActive: true,
                  currentValue: plan.provider_entry_id,
                });
                const actionOptions = ACTION_TYPE_OPTIONS[plan.provider] || ACTION_TYPE_OPTIONS.aws;

                return (
                  <div key={plan.local_id} className="rounded-xl border bg-muted/20 p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {plan.name.trim() || t("failover.editor.plan_label", { defaultValue: "Plan {{index}}", index: index + 1 })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("failover.editor.plan_description", { defaultValue: "Cloud action, auto-connect group, and optional script execution." })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`plan-enabled-${plan.local_id}`}
                            checked={plan.enabled}
                            onCheckedChange={(checked) => updatePlan(plan.local_id, (current) => ({ ...current, enabled: Boolean(checked) }))}
                          />
                          <Label htmlFor={`plan-enabled-${plan.local_id}`}>{t("common.enabled", { defaultValue: "Enabled" })}</Label>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removePlan(plan.local_id)}
                          disabled={formState.plans.length <= 1}
                        >
                          <Trash2 className="size-4" />
                          {t("common.delete", { defaultValue: "Delete" })}
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="space-y-2 md:col-span-2 xl:col-span-2">
                        <Label>{t("common.name", { defaultValue: "Name" })}</Label>
                        <Input
                          value={plan.name}
                          onChange={(event) => updatePlan(plan.local_id, (current) => ({ ...current, name: event.target.value }))}
                          placeholder={t("failover.editor.plan_name_placeholder", { defaultValue: "AWS Elastic IP first" })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("failover.editor.priority", { defaultValue: "Priority" })}</Label>
                        <Input
                          type="number"
                          min={1}
                          value={plan.priority}
                          onChange={(event) => updatePlan(plan.local_id, (current) => ({ ...current, priority: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("cloud.title", { defaultValue: "Cloud" })}</Label>
                        <Select
                          value={plan.provider}
                          onValueChange={(value) => {
                            const nextActionOptions = ACTION_TYPE_OPTIONS[value] || ACTION_TYPE_OPTIONS.aws;
                            const nextEntryOptions = buildProviderEntryOptions({
                              entries: providerEntries[value] || [],
                              includeActive: true,
                            });
                            updatePlan(plan.local_id, (current) => ({
                              ...current,
                              provider: value,
                              action_type: nextActionOptions[0]?.value || "provision_instance",
                              provider_entry_id: nextEntryOptions[0]?.id || "active",
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLAN_PROVIDER_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("failover.editor.provider_entry", { defaultValue: "Provider entry" })}</Label>
                        {providerOptions.length === 0 ? (
                          <Input
                            value={plan.provider_entry_id}
                            onChange={(event) => updatePlan(plan.local_id, (current) => ({ ...current, provider_entry_id: event.target.value }))}
                            placeholder={t("failover.editor.provider_entry_placeholder", { defaultValue: "active" })}
                          />
                        ) : (
                          <Select
                            value={plan.provider_entry_id || undefined}
                            onValueChange={(value) => updatePlan(plan.local_id, (current) => ({ ...current, provider_entry_id: value }))}
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
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>{t("failover.editor.action_type", { defaultValue: "Action type" })}</Label>
                        <Select
                          value={plan.action_type}
                          onValueChange={(value) => updatePlan(plan.local_id, (current) => ({ ...current, action_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {actionOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("failover.editor.auto_connect_group", { defaultValue: "Auto-connect group" })}</Label>
                        <Input
                          value={plan.auto_connect_group}
                          onChange={(event) => updatePlan(plan.local_id, (current) => ({ ...current, auto_connect_group: event.target.value }))}
                          placeholder={t("failover.editor.auto_connect_group_placeholder", { defaultValue: "edge/failover" })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("failover.editor.script", { defaultValue: "Script" })}</Label>
                        <Select
                          value={plan.script_clipboard_id || "__none"}
                          onValueChange={(value) => updatePlan(plan.local_id, (current) => ({ ...current, script_clipboard_id: value === "__none" ? "" : value }))}
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
                      <div className="space-y-2">
                        <Label>{t("failover.editor.script_timeout", { defaultValue: "Script timeout (s)" })}</Label>
                        <Input
                          type="number"
                          min={1}
                          value={plan.script_timeout_sec}
                          onChange={(event) => updatePlan(plan.local_id, (current) => ({ ...current, script_timeout_sec: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("failover.editor.wait_agent_timeout", { defaultValue: "Wait agent timeout (s)" })}</Label>
                        <Input
                          type="number"
                          min={1}
                          value={plan.wait_agent_timeout_sec}
                          onChange={(event) => updatePlan(plan.local_id, (current) => ({ ...current, wait_agent_timeout_sec: event.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <Label>{t("failover.editor.plan_payload", { defaultValue: "Plan payload JSON" })}</Label>
                      <Textarea
                        rows={10}
                        className="font-mono text-xs"
                        value={plan.payload}
                        onChange={(event) => updatePlan(plan.local_id, (current) => ({ ...current, payload: event.target.value }))}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {task
                ? t("common.save", { defaultValue: "Save" })
                : t("common.create", { defaultValue: "Create" })}
            </Button>
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
      setError(nextError instanceof Error ? nextError.message : "Failed to load failover tasks");
    } finally {
      if (!silent) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, []);

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

  const stats = React.useMemo(() => {
    const unhealthyCount = tasks.filter((task) => task.probe.stale || task.probe.status === "blocked_suspected").length;
    const activeCount = tasks.filter((task) => task.has_active_execution).length;
    const disabledCount = tasks.filter((task) => !task.enabled).length;

    return [
      {
        label: t("failover.stats.total", { defaultValue: "Total tasks" }),
        value: tasks.length,
        hint: t("failover.stats.total_hint", { defaultValue: "Saved CN failover automations in this account." }),
        tone: "blue" as const,
      },
      {
        label: t("failover.stats.active", { defaultValue: "Active runs" }),
        value: activeCount,
        hint: t("failover.stats.active_hint", { defaultValue: "Executions still provisioning, waiting, scripting, or switching DNS." }),
        tone: activeCount > 0 ? "amber" as const : "slate" as const,
      },
      {
        label: t("failover.stats.probe", { defaultValue: "Probe attention" }),
        value: unhealthyCount,
        hint: t("failover.stats.probe_hint", { defaultValue: "Tasks with stale or blocked probe signals right now." }),
        tone: unhealthyCount > 0 ? "rose" as const : "emerald" as const,
      },
      {
        label: t("failover.stats.disabled", { defaultValue: "Disabled" }),
        value: disabledCount,
        hint: t("failover.stats.disabled_hint", { defaultValue: "Configured tasks that are currently paused." }),
        tone: disabledCount > 0 ? "slate" as const : "emerald" as const,
      },
    ];
  }, [tasks, t]);

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
        eyebrow={t("cloud.failover.title", { defaultValue: "Failover" })}
        title={t("failover.page_title", { defaultValue: "CN connectivity failover" })}
        description={t("failover.page_description", {
          defaultValue:
            "Create automatic failover tasks that watch CN connectivity, try cloud remediation plans in priority order, run optional scripts, and switch DNS only after the new endpoint is ready.",
        })}
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
        stats={stats}
        statsVariant="cards"
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
                    "Create your first task to watch CN connectivity, provision or rebind IPs, run a clipboard script, and update DNS after validation.",
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
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.name", { defaultValue: "Name" })}</TableHead>
                  <TableHead>{t("failover.table.watch", { defaultValue: "Watch node" })}</TableHead>
                  <TableHead>{t("failover.table.probe", { defaultValue: "Probe" })}</TableHead>
                  <TableHead>{t("failover.table.latest", { defaultValue: "Latest execution" })}</TableHead>
                  <TableHead>{t("failover.table.cooldown", { defaultValue: "Cooldown" })}</TableHead>
                  <TableHead>{t("failover.table.plans", { defaultValue: "Plans" })}</TableHead>
                  <TableHead className="text-right">{t("common.operation", { defaultValue: "Actions" })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => {
                  const node = nodeLookup.get(task.watch_client_uuid);
                  const latestExecution = task.latest_execution;
                  const taskBusy = busyTaskID === task.id;
                  const taskRunning = runningTaskID === task.id;
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="align-top">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium text-slate-900 dark:text-slate-50">{task.name}</div>
                            <Badge variant={task.enabled ? "success" : "outline"}>
                              {task.enabled
                                ? t("common.enabled", { defaultValue: "Enabled" })
                                : t("common.disabled", { defaultValue: "Disabled" })}
                            </Badge>
                            <Badge variant={getStatusVariant(task.last_status, "execution")}>
                              {humanizeStatus(task.last_status)}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">{task.last_message || "-"}</div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1 text-sm">
                          <div>{node ? getNodeLabel(node) : task.watch_client_uuid}</div>
                          <div className="text-xs text-muted-foreground">UUID: {task.watch_client_uuid}</div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-2 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={getStatusVariant(task.probe.status, "probe")}>{humanizeStatus(task.probe.status)}</Badge>
                            {task.probe.stale ? (
                              <Badge variant="warning">{t("failover.probe.stale", { defaultValue: "Stale" })}</Badge>
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
                          <div className="text-xs text-muted-foreground">{formatDateTime(task.probe.report_updated_at || task.probe.checked_at)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        {latestExecution ? (
                          <div className="space-y-2 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={getStatusVariant(latestExecution.status, "execution")}>{humanizeStatus(latestExecution.status)}</Badge>
                              <Badge variant={getStatusVariant(latestExecution.script_status, "script")}>
                                {t("failover.table.script", { defaultValue: "Script" })}: {humanizeStatus(latestExecution.script_status)}
                              </Badge>
                              <Badge variant={getStatusVariant(latestExecution.dns_status, "dns")}>
                                DNS: {humanizeStatus(latestExecution.dns_status)}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">{formatDateTime(latestExecution.started_at)}</div>
                            {latestExecution.error_message ? (
                              <div className="text-xs text-red-600 dark:text-red-300">{latestExecution.error_message}</div>
                            ) : null}
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
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">-</div>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1 text-sm">
                          <div>
                            {task.cooldown_remaining_seconds > 0
                              ? formatDurationSeconds(task.cooldown_remaining_seconds)
                              : t("failover.cooldown.ready", { defaultValue: "Ready" })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {task.next_eligible_at ? formatDateTime(task.next_eligible_at) : "-"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1 text-sm">
                          <div>{task.plans.length}</div>
                          <div className="text-xs text-muted-foreground">
                            {task.plans.slice(0, 2).map((plan) => `${plan.provider} / ${plan.action_type}`).join(" · ") || "-"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => void openEditDialog(task)} disabled={taskBusy || taskRunning}>
                            {taskBusy ? <LoaderCircle className="size-4 animate-spin" /> : <PencilLine className="size-4" />}
                            {t("common.edit", { defaultValue: "Edit" })}
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => void handleRunTask(task)} disabled={taskRunning || task.has_active_execution || !task.enabled}>
                            {taskRunning ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />}
                            {t("common.run", { defaultValue: "Run" })}
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => void handleToggleTask(task)} disabled={taskBusy || taskRunning}>
                            {task.enabled
                              ? t("common.disable", { defaultValue: "Disable" })
                              : t("common.enable", { defaultValue: "Enable" })}
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setDeleteTarget(task)} disabled={taskBusy || taskRunning}>
                            <Trash2 className="size-4" />
                            {t("common.delete", { defaultValue: "Delete" })}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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

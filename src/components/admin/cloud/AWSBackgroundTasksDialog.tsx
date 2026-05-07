import { RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import type { TFunction } from "i18next";

import { CompactSummaryMetric } from "@/components/admin/cloud/AWSPanelDetailComponents";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Badge,
  Button,
  CloudSensitiveDialogContent,
  cloudLongTextClassName,
  cloudPanelFieldLabelClassName,
  Dialog,
  Flex,
  Select,
} from "@/components/admin/cloud/cloud-ui";
import type { AWSFollowUpTask } from "@/lib/cloudAws";
import { BACKGROUND_TASK_FILTER_ALL } from "./awsPanelCatalog";
import {
  getFollowUpTaskLabel,
} from "./awsPanelSummaries";
import {
  formatDateTime,
  getFollowUpStatusColor,
} from "./awsPanelUtils";

type AWSBackgroundTasksDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: TFunction;
  tasks: AWSFollowUpTask[];
  filteredTasks: AWSFollowUpTask[];
  loading: boolean;
  clearing: boolean;
  retryingId: number | null;
  pendingCount: number;
  failedCount: number;
  cancelledCount: number;
  skippedCount: number;
  terminalCount: number;
  credentialFilter: string;
  onCredentialFilterChange: (value: string) => void;
  credentialOptions: Array<[string, string]>;
  regionFilter: string;
  onRegionFilterChange: (value: string) => void;
  regionOptions: string[];
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onClearTerminalTasks: () => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
  onRetryTask: (task: AWSFollowUpTask) => void | Promise<void>;
};

export function AWSBackgroundTasksDialog({
  open,
  onOpenChange,
  t,
  tasks,
  filteredTasks,
  loading,
  clearing,
  retryingId,
  pendingCount,
  failedCount,
  cancelledCount,
  skippedCount,
  terminalCount,
  credentialFilter,
  onCredentialFilterChange,
  credentialOptions,
  regionFilter,
  onRegionFilterChange,
  regionOptions,
  statusFilter,
  onStatusFilterChange,
  onClearTerminalTasks,
  onRefresh,
  onRetryTask,
}: AWSBackgroundTasksDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <CloudSensitiveDialogContent
        title={t("cloud.providers.aws.background_tasks", "Background Tasks")}
        description={t(
            "cloud.providers.aws.background_tasks_description",
            "Pending, failed, cancelled, and skipped AWS post-create tasks.",
          )}
        icon={<RefreshCw className="size-4" />}
        badge={<Badge color="blue">{t("cloud.providers.aws.name", "AWS")}</Badge>}
        className="sm:max-w-5xl"
      >

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-4">
            <CompactSummaryMetric
              label={t("cloud.providers.aws.background_pending", "Pending")}
              value={pendingCount}
            />
            <CompactSummaryMetric
              label={t("cloud.providers.aws.background_failed", "Failed")}
              value={failedCount}
            />
            <CompactSummaryMetric
              label={t("cloud.providers.aws.background_cancelled", "Cancelled")}
              value={cancelledCount}
            />
            <CompactSummaryMetric
              label={t("cloud.providers.aws.background_skipped", "Skipped")}
              value={skippedCount}
            />
          </div>
          <Flex gap="2" align="center" wrap="wrap">
            <Button
              variant="outline"
              size="1"
              onClick={() => {
                void onClearTerminalTasks();
              }}
              disabled={loading || clearing || terminalCount === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("cloud.providers.aws.clear_terminal_tasks", "Clear Terminal Tasks")}
            </Button>
            <Button
              variant="outline"
              size="1"
              onClick={() => {
                void onRefresh();
              }}
              disabled={loading || clearing}
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
            <Select.Root value={credentialFilter} onValueChange={onCredentialFilterChange}>
              <Select.Trigger className="mt-2" />
              <Select.Content>
                <Select.Item value={BACKGROUND_TASK_FILTER_ALL}>
                  {t("cloud.providers.aws.filter_all_credentials", "All Credentials")}
                </Select.Item>
                {credentialOptions.map(([credentialId, credentialLabel]) => (
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
            <Select.Root value={regionFilter} onValueChange={onRegionFilterChange}>
              <Select.Trigger className="mt-2" />
              <Select.Content>
                <Select.Item value={BACKGROUND_TASK_FILTER_ALL}>
                  {t("cloud.providers.aws.filter_all_regions", "All Regions")}
                </Select.Item>
                {regionOptions.map((region) => (
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
            <Select.Root value={statusFilter} onValueChange={onStatusFilterChange}>
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
            shown: filteredTasks.length,
            total: tasks.length,
            defaultValue: `Showing ${filteredTasks.length} of ${tasks.length} tasks`,
          })}
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200/80 dark:border-slate-800">
          {loading ? (
            <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-3 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-4/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : !tasks.length ? (
            <div className="px-4 py-6 text-sm text-slate-500">
              {t("cloud.providers.aws.background_tasks_empty", "No AWS background tasks")}
            </div>
          ) : !filteredTasks.length ? (
            <div className="px-4 py-6 text-sm text-slate-500">
              {t("cloud.providers.aws.background_tasks_filtered_empty", "No AWS background tasks match the current filters")}
            </div>
          ) : (
            <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
              {filteredTasks.map((task) => {
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
                              void onRetryTask(task);
                            }}
                            disabled={loading || retryingId === task.id || clearing}
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
      </CloudSensitiveDialogContent>
    </Dialog.Root>
  );
}

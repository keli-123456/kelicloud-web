import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import type { ConfirmDialogOptions } from "@/components/ui/warning-dialog";
import {
  clearAWSFollowUpTerminalTasks,
  listAWSFollowUpTasks,
  retryAWSFollowUpTask,
  type AWSFollowUpTask,
} from "@/lib/cloudAws";
import {
  AWS_BACKGROUND_TASK_POLL_INTERVAL,
} from "./awsPanelCatalog";
import { toErrorMessage } from "./awsPanelUtils";
import { useAWSBackgroundTaskFilters } from "./useAWSBackgroundTaskFilters";

type ConfirmDialog = (options: ConfirmDialogOptions) => Promise<boolean>;

type UseAWSBackgroundTasksOptions = {
  t: TFunction;
  confirm: ConfirmDialog;
};

export function useAWSBackgroundTasks({
  t,
  confirm,
}: UseAWSBackgroundTasksOptions) {
  const [backgroundTasksOpen, setBackgroundTasksOpen] = React.useState(false);
  const [backgroundTasksLoading, setBackgroundTasksLoading] = React.useState(false);
  const [backgroundTasks, setBackgroundTasks] = React.useState<AWSFollowUpTask[]>([]);
  const [backgroundTaskRetryingId, setBackgroundTaskRetryingId] = React.useState<number | null>(null);
  const [backgroundTaskClearing, setBackgroundTaskClearing] = React.useState(false);
  const {
    filteredBackgroundTasks,
    backgroundTaskCredentialFilter,
    setBackgroundTaskCredentialFilter,
    backgroundTaskCredentialOptions,
    backgroundTaskRegionFilter,
    setBackgroundTaskRegionFilter,
    backgroundTaskRegionOptions,
    backgroundTaskStatusFilter,
    setBackgroundTaskStatusFilter,
    pendingBackgroundTaskCount,
    failedBackgroundTaskCount,
    cancelledBackgroundTaskCount,
    skippedBackgroundTaskCount,
    terminalBackgroundTaskCount,
  } = useAWSBackgroundTaskFilters({ t, backgroundTasks });

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

  const handleRetryBackgroundTask = React.useCallback(
    async (task: AWSFollowUpTask) => {
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
    },
    [loadBackgroundTasks, t],
  );

  const handleClearTerminalBackgroundTasks = React.useCallback(
    async () => {
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
    },
    [confirm, loadBackgroundTasks, t, terminalBackgroundTaskCount],
  );

  return {
    backgroundTasksOpen,
    setBackgroundTasksOpen,
    backgroundTasksLoading,
    backgroundTasks,
    filteredBackgroundTasks,
    backgroundTaskCredentialFilter,
    setBackgroundTaskCredentialFilter,
    backgroundTaskCredentialOptions,
    backgroundTaskRegionFilter,
    setBackgroundTaskRegionFilter,
    backgroundTaskRegionOptions,
    backgroundTaskStatusFilter,
    setBackgroundTaskStatusFilter,
    backgroundTaskRetryingId,
    backgroundTaskClearing,
    pendingBackgroundTaskCount,
    failedBackgroundTaskCount,
    cancelledBackgroundTaskCount,
    skippedBackgroundTaskCount,
    terminalBackgroundTaskCount,
    loadBackgroundTasks,
    handleRetryBackgroundTask,
    handleClearTerminalBackgroundTasks,
  };
}

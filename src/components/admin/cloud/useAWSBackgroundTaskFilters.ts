import React from "react";
import type { TFunction } from "i18next";

import type { AWSFollowUpTask } from "@/lib/cloudAws";
import { BACKGROUND_TASK_FILTER_ALL } from "./awsPanelCatalog";
import {
  filterAWSBackgroundTasks,
  getAWSBackgroundTaskCounts,
  getAWSBackgroundTaskCredentialOptions,
  getAWSBackgroundTaskRegionOptions,
} from "./awsPanelDerived";

type UseAWSBackgroundTaskFiltersOptions = {
  t: TFunction;
  backgroundTasks: AWSFollowUpTask[];
};

export function useAWSBackgroundTaskFilters({
  t,
  backgroundTasks,
}: UseAWSBackgroundTaskFiltersOptions) {
  const [backgroundTaskCredentialFilter, setBackgroundTaskCredentialFilter] = React.useState(BACKGROUND_TASK_FILTER_ALL);
  const [backgroundTaskRegionFilter, setBackgroundTaskRegionFilter] = React.useState(BACKGROUND_TASK_FILTER_ALL);
  const [backgroundTaskStatusFilter, setBackgroundTaskStatusFilter] = React.useState(BACKGROUND_TASK_FILTER_ALL);

  const {
    pending: pendingBackgroundTaskCount,
    failed: failedBackgroundTaskCount,
    cancelled: cancelledBackgroundTaskCount,
    skipped: skippedBackgroundTaskCount,
    terminal: terminalBackgroundTaskCount,
  } = React.useMemo(() => getAWSBackgroundTaskCounts(backgroundTasks), [backgroundTasks]);

  const backgroundTaskCredentialOptions = React.useMemo(
    () => getAWSBackgroundTaskCredentialOptions(backgroundTasks, t),
    [backgroundTasks, t],
  );

  const backgroundTaskRegionOptions = React.useMemo(
    () => getAWSBackgroundTaskRegionOptions(backgroundTasks),
    [backgroundTasks],
  );

  const filteredBackgroundTasks = React.useMemo(
    () => filterAWSBackgroundTasks(
      backgroundTasks,
      {
        credentialId: backgroundTaskCredentialFilter,
        region: backgroundTaskRegionFilter,
        status: backgroundTaskStatusFilter,
        allValue: BACKGROUND_TASK_FILTER_ALL,
      },
    ),
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

  return {
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
  };
}

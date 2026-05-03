import React from "react";
import type { TFunction } from "i18next";

import type {
  AWSAccount,
  AWSCatalog,
  AWSCredentialPool,
} from "@/lib/cloudAws";
import {
  AWS_REGION_OPTIONS,
} from "./awsPanelCatalog";
import {
  buildAWSRegionOptions,
} from "./awsPanelDerived";
import {
  formatAWSQuotaErrorMessage,
} from "./awsPanelSummaries";
import {
  DEFAULT_AWS_REGION,
  getActiveCredential,
} from "./awsPanelUtils";

type UseAWSPanelContextOptions = {
  t: TFunction;
  credentialPool: AWSCredentialPool | null;
  account: AWSAccount | null;
  catalog: AWSCatalog | null;
  regionSelectionRequired: boolean;
};

export function useAWSPanelContext({
  t,
  credentialPool,
  account,
  catalog,
  regionSelectionRequired,
}: UseAWSPanelContextOptions) {
  const activeCredential = getActiveCredential(credentialPool);
  const activeCredentialName = activeCredential?.name || "";
  const passwordStorageEnabled = Boolean(credentialPool?.password_storage_enabled);
  const resolvedActiveRegion =
    activeCredential
      ? credentialPool?.active_region || account?.region || activeCredential.default_region || DEFAULT_AWS_REGION
      : "";
  const activeRegion = regionSelectionRequired ? "" : resolvedActiveRegion;
  const activeContextReady = Boolean(activeCredential && activeRegion);
  const activeQuota = activeContextReady ? account?.ec2_quota || activeCredential?.ec2_quota || null : null;
  const activeQuotaError = activeContextReady ? account?.ec2_quota_error || "" : "";
  const activeQuotaWarningMessage = formatAWSQuotaErrorMessage(activeQuotaError, t);
  const standardVCPUQuotaReached = Boolean(
    activeQuota && activeQuota.max_standard_vcpus > 0 && activeQuota.running_standard_vcpus >= activeQuota.max_standard_vcpus,
  );
  const runningInstanceLimitReached = Boolean(
    !standardVCPUQuotaReached && activeQuota && activeQuota.max_instances > 0 && activeQuota.running_instances >= activeQuota.max_instances,
  );
  const regionOptions = React.useMemo(
    () => buildAWSRegionOptions({
      staticRegions: AWS_REGION_OPTIONS,
      activeCredentialRegion: activeCredential?.default_region,
      activeRegion: credentialPool?.active_region,
      accountRegion: account?.region,
      catalogRegions: catalog?.regions,
    }),
    [
      account?.region,
      activeCredential?.default_region,
      catalog?.regions,
      credentialPool?.active_region,
    ],
  );
  const regionSearchPlaceholder = t(
    "cloud.providers.aws.region_search_placeholder",
    "Search region by name or code",
  );
  const regionSearchEmpty = t(
    "cloud.providers.aws.region_search_empty",
    "No matching AWS region found",
  );

  return {
    activeCredential,
    activeCredentialName,
    passwordStorageEnabled,
    activeRegion,
    activeContextReady,
    activeQuota,
    activeQuotaError,
    activeQuotaWarningMessage,
    standardVCPUQuotaReached,
    runningInstanceLimitReached,
    regionOptions,
    regionSearchPlaceholder,
    regionSearchEmpty,
  };
}

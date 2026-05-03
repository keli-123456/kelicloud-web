import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import {
  checkAWSCredentials,
  setAWSActiveRegion,
  type AWSAccount,
  type AWSCredentialPool,
} from "@/lib/cloudAws";
import {
  DEFAULT_AWS_REGION,
  buildAWSAccountFromCredential,
  getActiveCredential,
  toErrorMessage,
} from "./awsPanelUtils";

type UseAWSCredentialHealthOptions = {
  t: TFunction;
  credentialPool: AWSCredentialPool | null;
  setCredentialPool: React.Dispatch<React.SetStateAction<AWSCredentialPool | null>>;
  activeRegion: string;
  regionSelectionRequired: boolean;
  setRegionSelectionRequired: React.Dispatch<React.SetStateAction<boolean>>;
  resourcesLoaded: boolean;
  setAccount: React.Dispatch<React.SetStateAction<AWSAccount | null>>;
  clearPanelState: () => void;
};

export function useAWSCredentialHealth({
  t,
  credentialPool,
  setCredentialPool,
  activeRegion,
  regionSelectionRequired,
  setRegionSelectionRequired,
  resourcesLoaded,
  setAccount,
  clearPanelState,
}: UseAWSCredentialHealthOptions) {
  const [credentialChecking, setCredentialChecking] = React.useState(false);
  const [credentialCheckDialogOpen, setCredentialCheckDialogOpen] = React.useState(false);
  const [credentialCheckRegion, setCredentialCheckRegion] = React.useState("");
  const [credentialCheckTargetIds, setCredentialCheckTargetIds] = React.useState<string[]>([]);

  const activeCredential = getActiveCredential(credentialPool);

  const openCredentialCheckDialog = (credentialIds?: string[]) => {
    setCredentialCheckTargetIds(credentialIds || []);
    setCredentialCheckRegion(activeRegion || activeCredential?.default_region || DEFAULT_AWS_REGION);
    setCredentialCheckDialogOpen(true);
  };

  const handleCheckCredentials = async (credentialIds?: string[], regionOverride?: string) => {
    setCredentialChecking(true);
    try {
      let requiresRegionSelection = regionSelectionRequired;
      let regionChanged = false;
      if (regionOverride && regionOverride !== credentialPool?.active_region) {
        const regionPool = await setAWSActiveRegion(regionOverride);
        setCredentialPool(regionPool);
        setRegionSelectionRequired(false);
        requiresRegionSelection = false;
        regionChanged = true;
      }
      const nextPool = await checkAWSCredentials(credentialIds);
      setCredentialPool(nextPool);
      if (regionChanged) {
        clearPanelState();
      }
      const nextActiveCredential = getActiveCredential(nextPool);
      if (nextActiveCredential && !requiresRegionSelection) {
        setAccount(
          buildAWSAccountFromCredential(
            nextActiveCredential,
            nextPool.active_region || nextActiveCredential.default_region || DEFAULT_AWS_REGION,
          ),
        );
      } else if (regionChanged || !resourcesLoaded) {
        setAccount(null);
      }
      toast.success(t("cloud.tokens.check_success", "Token health check finished"));
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

  const handleRegionChange = async (region: string) => {
    try {
      const nextPool = await setAWSActiveRegion(region);
      setCredentialPool(nextPool);
      setRegionSelectionRequired(false);
      clearPanelState();
    } catch (regionError) {
      toast.error(toErrorMessage(regionError));
    }
  };

  return {
    credentialChecking,
    credentialCheckDialogOpen,
    setCredentialCheckDialogOpen,
    credentialCheckRegion,
    setCredentialCheckRegion,
    openCredentialCheckDialog,
    handleCheckCredentials,
    handleSubmitCredentialCheck,
    handleRegionChange,
  };
}

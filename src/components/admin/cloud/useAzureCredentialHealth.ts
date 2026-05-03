import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import {
  checkAzureCredentials,
  type AzureCredentialPool,
} from "@/lib/cloudAzure";
import {
  hasActiveCredential,
  toErrorMessage,
} from "./azurePanelUtils";

type UseAzureCredentialHealthOptions = {
  t: TFunction;
  setCredentialPool: React.Dispatch<React.SetStateAction<AzureCredentialPool | null>>;
  loadResources: (credentialPoolOverride?: AzureCredentialPool | null) => Promise<void>;
};

export function useAzureCredentialHealth({
  t,
  setCredentialPool,
  loadResources,
}: UseAzureCredentialHealthOptions) {
  const [checkingCredentialsState, setCheckingCredentialsState] = React.useState(false);

  const handleCheckCredentials = async () => {
    setCheckingCredentialsState(true);
    try {
      const nextPool = await checkAzureCredentials();
      setCredentialPool(nextPool);
      toast.success(t("cloud.providers.azure.check_success", "Azure credentials checked"));
      if (hasActiveCredential(nextPool)) {
        await loadResources(nextPool);
      }
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setCheckingCredentialsState(false);
    }
  };

  return {
    checkingCredentialsState,
    handleCheckCredentials,
  };
}

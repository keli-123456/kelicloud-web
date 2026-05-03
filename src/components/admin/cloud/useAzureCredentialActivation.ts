import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";

import {
  setAzureActiveCredential,
  type AzureCredentialPool,
  type AzureCredentialRecord,
} from "@/lib/cloudAzure";
import { toErrorMessage } from "./azurePanelUtils";

type UseAzureCredentialActivationOptions = {
  setCredentialPool: Dispatch<SetStateAction<AzureCredentialPool | null>>;
  loadAll: () => Promise<void>;
};

export function useAzureCredentialActivation({
  setCredentialPool,
  loadAll,
}: UseAzureCredentialActivationOptions) {
  const handleSelectCredential = async (credential: AzureCredentialRecord) => {
    try {
      const nextPool = await setAzureActiveCredential(credential.id);
      setCredentialPool(nextPool);
      await loadAll();
    } catch (error) {
      toast.error(toErrorMessage(error));
    }
  };

  return {
    handleSelectCredential,
  };
}

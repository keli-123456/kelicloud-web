import React from "react";
import { toast } from "sonner";

import {
  getAzureCredentialSecret,
  type AzureCredentialRecord,
} from "@/lib/cloudAzure";
import {
  toErrorMessage,
  type CredentialSecretState,
} from "./azurePanelUtils";

export function useAzureCredentialSecret() {
  const [credentialSecret, setCredentialSecret] = React.useState<CredentialSecretState | null>(null);

  const handleViewCredential = async (credential: AzureCredentialRecord) => {
    try {
      const secret = await getAzureCredentialSecret(credential.id);
      setCredentialSecret({ secret });
    } catch (error) {
      toast.error(toErrorMessage(error));
    }
  };

  return {
    credentialSecret,
    setCredentialSecret,
    handleViewCredential,
  };
}

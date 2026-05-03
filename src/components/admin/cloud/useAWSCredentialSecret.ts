import React from "react";
import { toast } from "sonner";

import {
  getAWSCredentialSecret,
  type AWSCredentialRecord,
} from "@/lib/cloudAws";
import type { CredentialSecretState } from "./awsPanelState";
import { toErrorMessage } from "./awsPanelUtils";

export function useAWSCredentialSecret() {
  const [credentialSecret, setCredentialSecret] = React.useState<CredentialSecretState | null>(null);
  const [credentialSecretLoading, setCredentialSecretLoading] = React.useState(false);

  const handleViewCredentialSecret = async (credential: AWSCredentialRecord) => {
    setCredentialSecretLoading(true);
    try {
      const secret = await getAWSCredentialSecret(credential.id);
      setCredentialSecret({ secret });
    } catch (viewError) {
      toast.error(toErrorMessage(viewError));
    } finally {
      setCredentialSecretLoading(false);
    }
  };

  return {
    credentialSecret,
    setCredentialSecret,
    credentialSecretLoading,
    handleViewCredentialSecret,
  };
}

import React from "react";
import { toast } from "sonner";

import {
  getAzureInstancePassword,
  type AzureInstance,
} from "@/lib/cloudAzure";
import {
  toErrorMessage,
  type SavedPasswordState,
} from "./azurePanelUtils";

export function useAzureInstancePasswords() {
  const [savedPassword, setSavedPassword] = React.useState<SavedPasswordState | null>(null);
  const [passwordLoading, setPasswordLoading] = React.useState(false);

  const handleViewPassword = async (instance: AzureInstance) => {
    setPasswordLoading(true);
    try {
      const credential = await getAzureInstancePassword(instance.instance_id);
      setSavedPassword({ instance, credential });
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setPasswordLoading(false);
    }
  };

  return {
    savedPassword,
    setSavedPassword,
    passwordLoading,
    handleViewPassword,
  };
}

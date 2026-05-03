import React from "react";
import { toast } from "sonner";

import {
  getLinodeInstancePassword,
  type LinodeInstance,
} from "@/lib/cloudLinode";
import type { SavedPasswordState } from "./linodePanelUtils";
import { toErrorMessage } from "./linodePanelUtils";

export function useLinodeInstancePasswords() {
  const [savedPassword, setSavedPassword] = React.useState<SavedPasswordState | null>(null);
  const [passwordLoading, setPasswordLoading] = React.useState(false);

  const handleViewPassword = async (instance: LinodeInstance) => {
    setPasswordLoading(true);
    try {
      const credential = await getLinodeInstancePassword(instance.id);
      setSavedPassword({ instance, credential });
    } catch (viewError) {
      toast.error(toErrorMessage(viewError));
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

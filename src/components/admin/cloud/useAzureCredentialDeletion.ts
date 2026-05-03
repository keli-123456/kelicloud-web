import type { Dispatch, SetStateAction } from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import type { ConfirmDialogOptions } from "@/components/ui/warning-dialog";
import {
  deleteAzureCredential,
  type AzureCredentialPool,
  type AzureCredentialRecord,
} from "@/lib/cloudAzure";
import {
  hasActiveCredential,
  toErrorMessage,
} from "./azurePanelUtils";

type ConfirmDialog = (options: ConfirmDialogOptions) => Promise<boolean>;

type UseAzureCredentialDeletionOptions = {
  t: TFunction;
  confirm: ConfirmDialog;
  setCredentialPool: Dispatch<SetStateAction<AzureCredentialPool | null>>;
  loadAll: () => Promise<void>;
  clearResourceData: () => void;
};

export function useAzureCredentialDeletion({
  t,
  confirm,
  setCredentialPool,
  loadAll,
  clearResourceData,
}: UseAzureCredentialDeletionOptions) {
  const handleDeleteCredential = async (credential: AzureCredentialRecord) => {
    const confirmed = await confirm({
      title: t("cloud.providers.azure.delete_credential", "Delete Credential"),
      description: t("cloud.providers.azure.delete_credential_confirm", {
        name: credential.name,
        defaultValue: `Delete Azure credential "${credential.name}"?`,
      }),
      confirmLabel: t("cloud.providers.azure.delete_credential", "Delete Credential"),
      tone: "destructive",
    });
    if (!confirmed) return;

    try {
      const nextPool = await deleteAzureCredential(credential.id);
      setCredentialPool(nextPool);
      toast.success(t("cloud.providers.azure.delete_credential_success", "Azure credential deleted"));
      if (hasActiveCredential(nextPool)) {
        await loadAll();
      } else {
        clearResourceData();
      }
    } catch (error) {
      toast.error(toErrorMessage(error));
    }
  };

  return {
    handleDeleteCredential,
  };
}

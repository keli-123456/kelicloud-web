import type { Dispatch, SetStateAction } from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import type { ConfirmDialogOptions } from "@/components/ui/warning-dialog";
import {
  deleteAWSCredential,
  type AWSCredentialPool,
  type AWSCredentialRecord,
} from "@/lib/cloudAws";
import { toErrorMessage } from "./awsPanelUtils";

type ConfirmDialog = (options: ConfirmDialogOptions) => Promise<boolean>;

type UseAWSCredentialDeletionOptions = {
  t: TFunction;
  confirm: ConfirmDialog;
  selectedCredentials: AWSCredentialRecord[];
  setSelectedCredentialIds: Dispatch<SetStateAction<string[]>>;
  setCredentialPool: Dispatch<SetStateAction<AWSCredentialPool | null>>;
  setRegionSelectionRequired: Dispatch<SetStateAction<boolean>>;
  removeCredentialSelection: (removedCredentialIds: string[]) => void;
  clearPanelState: () => void;
  loadBackgroundTasks: (showError?: boolean, showLoading?: boolean) => Promise<unknown>;
};

function assertCredentialsDeleted(
  t: TFunction,
  nextPool: AWSCredentialPool,
  credentialIds: string[],
) {
  const remaining = nextPool.credentials.filter((credential) => credentialIds.includes(credential.id));
  if (remaining.length > 0) {
    throw new Error(
      t("cloud.tokens.delete_not_applied", {
        defaultValue: "Delete request returned success, but the token still exists. Refresh and try again.",
      }),
    );
  }
}

export function useAWSCredentialDeletion({
  t,
  confirm,
  selectedCredentials,
  setSelectedCredentialIds,
  setCredentialPool,
  setRegionSelectionRequired,
  removeCredentialSelection,
  clearPanelState,
  loadBackgroundTasks,
}: UseAWSCredentialDeletionOptions) {
  const syncCredentialPoolAfterDelete = (
    nextPool: AWSCredentialPool,
    removedCredentialIds: string[],
  ) => {
    setCredentialPool(nextPool);
    removeCredentialSelection(removedCredentialIds);
    clearPanelState();
  };

  const handleDeleteCredential = async (credential: AWSCredentialRecord) => {
    const confirmed = await confirm({
      title: t("cloud.tokens.delete", "Delete credential"),
      description: credential.last_status === "error"
        ? t("cloud.tokens.delete_reclaimed_description", {
            name: credential.name,
            defaultValue: "Delete this unavailable credential only after confirming the cloud provider has reclaimed its old instances. Failover will switch to another available credential.",
          })
        : t("cloud.tokens.delete_confirm", {
            name: credential.name,
            defaultValue: "Delete this credential?",
          }),
      confirmLabel: t("cloud.tokens.delete", "Delete"),
    });
    if (!confirmed) return;

    try {
      const nextPool = await deleteAWSCredential(credential.id, credential.last_status === "error");
      if (!nextPool.active_credential_id) {
        setRegionSelectionRequired(false);
      }
      assertCredentialsDeleted(t, nextPool, [credential.id]);
      syncCredentialPoolAfterDelete(nextPool, [credential.id]);
      await loadBackgroundTasks(false);
      toast.success(t("cloud.tokens.delete_success", "Token deleted"));
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  };

  const handleDeleteSelectedCredentials = async () => {
    if (!selectedCredentials.length) {
      return;
    }

    const confirmed = await confirm({
      title: t("cloud.tokens.delete_selected", {
        count: selectedCredentials.length,
        defaultValue: "Delete selected tokens",
      }),
      description: selectedCredentials.some((credential) => credential.last_status === "error")
        ? t("cloud.tokens.delete_selected_reclaimed_confirm", {
            count: selectedCredentials.length,
            defaultValue: "Delete the selected credentials? Unavailable credentials will be retired only after you confirm their old cloud instances were reclaimed.",
          })
        : t("cloud.tokens.delete_selected_confirm", {
            count: selectedCredentials.length,
            defaultValue: "Delete the selected credentials?",
          }),
      confirmLabel: t("cloud.tokens.delete", "Delete"),
    });
    if (!confirmed) return;

    let latestPool: AWSCredentialPool | null = null;
    const removedIds: string[] = [];
    const failedIds: string[] = [];
    const failures: string[] = [];

    for (const credential of selectedCredentials) {
      try {
        const nextPool = await deleteAWSCredential(credential.id, credential.last_status === "error");
        assertCredentialsDeleted(t, nextPool, [credential.id]);
        latestPool = nextPool;
        removedIds.push(credential.id);
      } catch (deleteError) {
        failedIds.push(credential.id);
        failures.push(`${credential.name}: ${toErrorMessage(deleteError)}`);
      }
    }

    if (latestPool && removedIds.length > 0) {
      if (!latestPool.active_credential_id) {
        setRegionSelectionRequired(false);
      }
      syncCredentialPoolAfterDelete(latestPool, removedIds);
      await loadBackgroundTasks(false);
    }

    setSelectedCredentialIds(failedIds);

    if (failures.length > 0) {
      toast.error(failures.join("；"));
      return;
    }

    toast.success(
      t("cloud.tokens.delete_selected_success", {
        count: removedIds.length,
        defaultValue: `Deleted ${removedIds.length} tokens`,
      }),
    );
  };

  return {
    handleDeleteCredential,
    handleDeleteSelectedCredentials,
  };
}

import type { Dispatch, SetStateAction } from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import type { ConfirmDialogOptions } from "@/components/ui/warning-dialog";
import {
  deleteLinodeToken,
  type LinodeTokenPool,
  type LinodeTokenRecord,
} from "@/lib/cloudLinode";
import { toErrorMessage } from "./linodePanelUtils";

type ConfirmDialog = (options: ConfirmDialogOptions) => Promise<boolean>;

type UseLinodeTokenDeletionOptions = {
  t: TFunction;
  confirm: ConfirmDialog;
  selectedTokens: LinodeTokenRecord[];
  setSelectedTokenIds: Dispatch<SetStateAction<string[]>>;
  syncTokenPoolAfterDelete: (nextPool: LinodeTokenPool, removedTokenIds: string[]) => void | Promise<void>;
};

function assertTokensDeleted(
  t: TFunction,
  nextPool: LinodeTokenPool,
  tokenIds: string[],
) {
  const remaining = nextPool.tokens.filter((token) => tokenIds.includes(token.id));
  if (remaining.length > 0) {
    throw new Error(
      t("cloud.tokens.delete_not_applied", {
        defaultValue: "Delete request returned success, but the token still exists. Refresh and try again.",
      }),
    );
  }
}

export function useLinodeTokenDeletion({
  t,
  confirm,
  selectedTokens,
  setSelectedTokenIds,
  syncTokenPoolAfterDelete,
}: UseLinodeTokenDeletionOptions) {
  const handleDeleteToken = async (token: LinodeTokenRecord) => {
    const confirmed = await confirm({
      title: t("cloud.tokens.delete", "Delete token"),
      description: t("cloud.tokens.delete_confirm", {
        name: token.name,
        defaultValue: `Delete token "${token.name}"?`,
      }),
      confirmLabel: t("cloud.tokens.delete", "Delete"),
    });
    if (!confirmed) return;

    try {
      const nextPool = await deleteLinodeToken(token.id);
      assertTokensDeleted(t, nextPool, [token.id]);
      await syncTokenPoolAfterDelete(nextPool, [token.id]);
      toast.success(t("cloud.tokens.delete_success", "Token deleted"));
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  };

  const handleDeleteSelectedTokens = async () => {
    if (!selectedTokens.length) {
      return;
    }

    const confirmed = await confirm({
      title: t("cloud.tokens.delete_selected", {
        count: selectedTokens.length,
        defaultValue: "Delete selected tokens",
      }),
      description: t("cloud.tokens.delete_selected_confirm", {
        count: selectedTokens.length,
        defaultValue: `Delete ${selectedTokens.length} selected tokens?`,
      }),
      confirmLabel: t("cloud.tokens.delete", "Delete"),
    });
    if (!confirmed) return;

    let latestPool: LinodeTokenPool | null = null;
    const removedIds: string[] = [];
    const failedIds: string[] = [];
    const failures: string[] = [];

    for (const token of selectedTokens) {
      try {
        const nextPool = await deleteLinodeToken(token.id);
        assertTokensDeleted(t, nextPool, [token.id]);
        latestPool = nextPool;
        removedIds.push(token.id);
      } catch (deleteError) {
        failedIds.push(token.id);
        failures.push(`${token.name}: ${toErrorMessage(deleteError)}`);
      }
    }

    if (latestPool && removedIds.length > 0) {
      await syncTokenPoolAfterDelete(latestPool, removedIds);
    }

    setSelectedTokenIds(failedIds);

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
    handleDeleteToken,
    handleDeleteSelectedTokens,
  };
}

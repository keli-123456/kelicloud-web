import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import type { ConfirmDialogOptions } from "@/components/ui/warning-dialog";
import {
  deleteDigitalOceanDroplet,
  postDigitalOceanDropletAction,
  type DigitalOceanDroplet,
} from "@/lib/cloud";
import {
  confirmCloudBulkDelete,
  runCloudBulkDelete,
} from "./cloudBulkDeleteUtils";
import { toErrorMessage } from "./digitalOceanPanelUtils";

type ConfirmDialog = (options: ConfirmDialogOptions) => Promise<boolean>;

type UseDigitalOceanDropletActionsOptions = {
  t: TFunction;
  confirm: ConfirmDialog;
  loadPanelData: () => Promise<void>;
};

export function useDigitalOceanDropletActions({
  t,
  confirm,
  loadPanelData,
}: UseDigitalOceanDropletActionsOptions) {
  const [detailDroplet, setDetailDroplet] = React.useState<DigitalOceanDroplet | null>(null);

  const handleDropletAction = async (dropletId: number, type: string) => {
    try {
      await postDigitalOceanDropletAction(dropletId, type);
      toast.success(t("cloud.action_success", "Operation submitted"));
      await loadPanelData();
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    }
  };

  const handleDeleteDroplet = async (droplet: DigitalOceanDroplet) => {
    const confirmed = await confirm({
      title: t("cloud.delete", "Delete instance"),
      description: t("cloud.delete_confirm", {
        name: droplet.name,
        defaultValue: `Delete droplet "${droplet.name}"? This action cannot be undone.`,
      }),
      confirmLabel: t("cloud.delete", "Delete"),
    });
    if (!confirmed) return;

    try {
      await deleteDigitalOceanDroplet(droplet.id);
      toast.success(t("cloud.delete_success", "Droplet deleted"));
      await loadPanelData();
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  };

  const handleBatchDeleteDroplets = async (droplets: DigitalOceanDroplet[]) => {
    const confirmed = await confirmCloudBulkDelete({
      t,
      confirm,
      names: droplets.map((droplet) => droplet.name || String(droplet.id)),
    });
    if (!confirmed) return false;

    await runCloudBulkDelete({
      t,
      items: droplets,
      getName: (droplet) => droplet.name || String(droplet.id),
      deleteItem: (droplet) => deleteDigitalOceanDroplet(droplet.id),
      formatError: toErrorMessage,
    });
    await loadPanelData();
    return true;
  };

  return {
    detailDroplet,
    setDetailDroplet,
    handleDropletAction,
    handleDeleteDroplet,
    handleBatchDeleteDroplets,
  };
}

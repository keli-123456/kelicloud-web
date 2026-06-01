import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import type { ConfirmDialogOptions } from "@/components/ui/warning-dialog";
import {
  deleteAzureInstance,
  getAzureInstanceDetail,
  postAzureInstanceAction,
  type AzureInstance,
  type AzureInstanceDetail,
} from "@/lib/cloudAzure";
import {
  confirmCloudBulkDelete,
  runCloudBulkDelete,
} from "./cloudBulkDeleteUtils";
import { toErrorMessage } from "./azurePanelUtils";

type ConfirmDialog = (options: ConfirmDialogOptions) => Promise<boolean>;
type AzureInstanceActionType = "start" | "deallocate" | "restart" | "replace_public_ip";

type UseAzureInstanceActionsOptions = {
  t: TFunction;
  confirm: ConfirmDialog;
  loadResources: () => Promise<void>;
};

export function useAzureInstanceActions({
  t,
  confirm,
  loadResources,
}: UseAzureInstanceActionsOptions) {
  const [workingInstanceId, setWorkingInstanceId] = React.useState<string | null>(null);
  const [detailInstance, setDetailInstance] = React.useState<AzureInstance | null>(null);
  const [detailData, setDetailData] = React.useState<AzureInstanceDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);

  const handleOpenDetail = async (instance: AzureInstance) => {
    setDetailInstance(instance);
    setDetailLoading(true);
    try {
      const detail = await getAzureInstanceDetail(instance.instance_id);
      setDetailData(detail);
    } catch (error) {
      toast.error(toErrorMessage(error));
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleInstanceAction = async (
    instance: AzureInstance,
    type: AzureInstanceActionType,
  ) => {
    setWorkingInstanceId(instance.instance_id);
    try {
      await postAzureInstanceAction(instance.instance_id, type);
      toast.success(
        t(`cloud.providers.azure.action_${type}_success`, {
          defaultValue: `Azure VM ${type} request submitted`,
        }),
      );
      await loadResources();
      if (detailInstance?.instance_id === instance.instance_id) {
        await handleOpenDetail(instance);
      }
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setWorkingInstanceId(null);
    }
  };

  const handleReplaceInstanceIP = async (instance: AzureInstance) => {
    const current = instance.public_ips[0] || "-";
    const confirmed = await confirm({
      title: t("cloud.providers.azure.replace_ip", "Replace IP"),
      description: t("cloud.providers.azure.replace_ip_confirm", {
        name: instance.name || instance.instance_id,
        current,
        defaultValue: `Allocate a new public IP for "${instance.name || instance.instance_id}" and release the old IP ${current}?`,
      }),
      confirmLabel: t("cloud.providers.azure.replace_ip", "Replace IP"),
      tone: "warning",
    });
    if (!confirmed) return;
    await handleInstanceAction(instance, "replace_public_ip");
  };

  const handleDeleteInstance = async (instance: AzureInstance) => {
    const confirmed = await confirm({
      title: t("cloud.providers.azure.delete_instance", "Delete VM"),
      description: t("cloud.providers.azure.delete_instance_confirm", {
        name: instance.name,
        defaultValue: `Delete Azure VM "${instance.name}"? This action cannot be undone.`,
      }),
      confirmLabel: t("cloud.providers.azure.delete_instance", "Delete VM"),
      tone: "destructive",
    });
    if (!confirmed) return;

    setWorkingInstanceId(instance.instance_id);
    try {
      const result = await deleteAzureInstance(instance.instance_id);
      toast.success(t("cloud.providers.azure.delete_instance_success", "Azure VM delete request submitted"));
      if (result.cleanup_errors.length) {
        toast.warning(
          t("cloud.providers.azure.delete_cleanup_warning", {
            count: result.cleanup_errors.length,
            defaultValue: `${result.cleanup_errors.length} associated Azure resource cleanup task(s) need manual review`,
          }),
        );
      }
      if (detailInstance?.instance_id === instance.instance_id) {
        setDetailInstance(null);
        setDetailData(null);
      }
      await loadResources();
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setWorkingInstanceId(null);
    }
  };

  const handleBatchDeleteInstances = async (instances: AzureInstance[]) => {
    const confirmed = await confirmCloudBulkDelete({
      t,
      confirm,
      names: instances.map((instance) => instance.name || instance.instance_id),
    });
    if (!confirmed) return false;

    setWorkingInstanceId("__batch_delete__");
    try {
      let cleanupWarningCount = 0;
      await runCloudBulkDelete({
        t,
        items: instances,
        getName: (instance) => instance.name || instance.instance_id,
        deleteItem: async (instance) => {
          const result = await deleteAzureInstance(instance.instance_id);
          cleanupWarningCount += result.cleanup_errors.length;
        },
        formatError: toErrorMessage,
      });
      if (cleanupWarningCount > 0) {
        toast.warning(
          t("cloud.providers.azure.delete_cleanup_warning", {
            count: cleanupWarningCount,
            defaultValue: `${cleanupWarningCount} associated Azure resource cleanup task(s) need manual review`,
          }),
        );
      }
      if (detailInstance && instances.some((instance) => instance.instance_id === detailInstance.instance_id)) {
        setDetailInstance(null);
        setDetailData(null);
      }
      await loadResources();
      return true;
    } finally {
      setWorkingInstanceId(null);
    }
  };

  return {
    workingInstanceId,
    detailInstance,
    setDetailInstance,
    detailData,
    setDetailData,
    detailLoading,
    handleOpenDetail,
    handleInstanceAction,
    handleReplaceInstanceIP,
    handleDeleteInstance,
    handleBatchDeleteInstances,
  };
}

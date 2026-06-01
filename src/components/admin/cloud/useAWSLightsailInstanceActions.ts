import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import type { ConfirmDialogOptions } from "@/components/ui/warning-dialog";
import {
  deleteAWSLightsailInstance,
  getAWSLightsailInstanceDetail,
  postAWSLightsailInstanceAction,
  type AWSLightsailInstance,
  type AWSLightsailInstanceActionInput,
  type AWSLightsailInstanceDetail,
} from "@/lib/cloudAws";
import type { LightsailDetailActionFormState } from "./awsPanelState";
import { toErrorMessage } from "./awsPanelUtils";
import {
  confirmCloudBulkDelete,
  runCloudBulkDelete,
} from "./cloudBulkDeleteUtils";

type ConfirmDialog = (options: ConfirmDialogOptions) => Promise<boolean>;

type UseAWSLightsailInstanceActionsOptions = {
  t: TFunction;
  confirm: ConfirmDialog;
  loadPanelData: () => Promise<void>;
};

export function useAWSLightsailInstanceActions({
  t,
  confirm,
  loadPanelData,
}: UseAWSLightsailInstanceActionsOptions) {
  const [lightsailDetailInstance, setLightsailDetailInstance] = React.useState<AWSLightsailInstance | null>(null);
  const [lightsailDetailData, setLightsailDetailData] = React.useState<AWSLightsailInstanceDetail | null>(null);
  const [lightsailDetailLoading, setLightsailDetailLoading] = React.useState(false);
  const [lightsailActionLoading, setLightsailActionLoading] = React.useState(false);
  const [lightsailDetailActionForm, setLightsailDetailActionForm] = React.useState<LightsailDetailActionFormState>({
    snapshotName: "",
    staticIpName: "",
  });

  const currentLightsailStaticIP =
    lightsailDetailData?.static_ips.find((staticIP) => staticIP.attached_to === lightsailDetailData.instance.name) || null;

  const clearLightsailDetailData = React.useCallback(() => {
    setLightsailDetailData(null);
  }, []);

  const closeLightsailDetail = React.useCallback(() => {
    setLightsailDetailInstance(null);
    setLightsailDetailData(null);
  }, []);

  const handleLightsailInstanceAction = async (instance: AWSLightsailInstance, type: string) => {
    try {
      await postAWSLightsailInstanceAction(instance.name, { type });
      toast.success(t("cloud.action_success", "Operation submitted"));
      await loadPanelData();
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    }
  };

  const loadLightsailDetail = React.useCallback(async (instance: AWSLightsailInstance) => {
    setLightsailDetailInstance(instance);
    setLightsailDetailLoading(true);
    setLightsailDetailData(null);
    try {
      const detail = await getAWSLightsailInstanceDetail(instance.name);
      setLightsailDetailData(detail);
      setLightsailDetailActionForm({
        snapshotName: `${instance.name}-${Date.now()}`,
        staticIpName: `${instance.name}-ip-${Date.now()}`,
      });
    } catch (detailError) {
      toast.error(toErrorMessage(detailError));
    } finally {
      setLightsailDetailLoading(false);
    }
  }, []);

  const handleDetailedLightsailAction = async (input: AWSLightsailInstanceActionInput) => {
    if (!lightsailDetailInstance) return;
    setLightsailActionLoading(true);
    try {
      await postAWSLightsailInstanceAction(lightsailDetailInstance.name, input);
      toast.success(t("cloud.action_success", "Operation submitted"));
      await loadPanelData();
      await loadLightsailDetail(lightsailDetailInstance);
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    } finally {
      setLightsailActionLoading(false);
    }
  };

  const handleAllowAllLightsailTraffic = async () => {
    if (!lightsailDetailInstance) return;

    const confirmed = await confirm({
      title: t("cloud.providers.aws.allow_all_traffic", "Allow All Traffic"),
      description: t("cloud.providers.aws.allow_all_lightsail_traffic_confirm", {
        name: lightsailDetailInstance.name,
        defaultValue: `Open all public ports for "${lightsailDetailInstance.name}" to 0.0.0.0/0 and ::/0 when IPv6 is enabled?`,
      }),
      confirmLabel: t("cloud.providers.aws.allow_all_traffic", "Allow All Traffic"),
      tone: "warning",
    });
    if (!confirmed) return;

    await handleDetailedLightsailAction({ type: "allow_all_traffic" });
  };

  const handleReplaceLightsailStaticIP = async () => {
    if (!lightsailDetailInstance) return;

    const confirmed = await confirm({
      title: t("cloud.providers.aws.replace_ip", "Replace IP"),
      description: t("cloud.providers.aws.replace_static_ip_confirm", {
        name: lightsailDetailInstance.name,
        current: currentLightsailStaticIP?.ip_address || "-",
        defaultValue: `Allocate a new static IP for "${lightsailDetailInstance.name}" and release the old IP ${currentLightsailStaticIP?.ip_address || ""}?`,
      }),
      confirmLabel: t("cloud.providers.aws.replace_ip", "Replace IP"),
      tone: "warning",
    });
    if (!confirmed) return;

    await handleDetailedLightsailAction({
      type: "replace_static_ip",
      static_ip_name: lightsailDetailActionForm.staticIpName,
    });
  };

  const handleQuickReplaceLightsailStaticIP = async (instance: AWSLightsailInstance) => {
    const confirmed = await confirm({
      title: t("cloud.providers.aws.replace_ip", "Replace IP"),
      description: t("cloud.providers.aws.replace_static_ip_confirm", {
        name: instance.name,
        current: instance.public_ip || "-",
        defaultValue: `Allocate a new static IP for "${instance.name}" and release the old IP ${instance.public_ip || ""}?`,
      }),
      confirmLabel: t("cloud.providers.aws.replace_ip", "Replace IP"),
      tone: "warning",
    });
    if (!confirmed) return;

    try {
      await postAWSLightsailInstanceAction(instance.name, {
        type: "replace_static_ip",
        static_ip_name: `${instance.name}-ip-${Date.now()}`,
      });
      toast.success(t("cloud.action_success", "Operation submitted"));
      await loadPanelData();
      if (lightsailDetailInstance?.name === instance.name) {
        await loadLightsailDetail(instance);
      }
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    }
  };

  const handleDeleteLightsailInstance = async (instance: AWSLightsailInstance) => {
    const confirmed = await confirm({
      title: t("cloud.delete", "Delete instance"),
      description: t("cloud.providers.aws.delete_confirm", {
        name: instance.name,
        defaultValue: `Delete instance "${instance.name}"? This action cannot be undone.`,
      }),
      confirmLabel: t("cloud.delete", "Delete"),
    });
    if (!confirmed) return;

    try {
      await deleteAWSLightsailInstance(instance.name);
      toast.success(t("cloud.providers.aws.delete_success", "Instance deleted"));
      if (lightsailDetailInstance?.name === instance.name) {
        closeLightsailDetail();
      }
      await loadPanelData();
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  };

  const handleBatchDeleteLightsailInstances = async (instances: AWSLightsailInstance[]) => {
    const confirmed = await confirmCloudBulkDelete({
      t,
      confirm,
      names: instances.map((instance) => instance.name),
    });
    if (!confirmed) return false;

    await runCloudBulkDelete({
      t,
      items: instances,
      getName: (instance) => instance.name,
      deleteItem: (instance) => deleteAWSLightsailInstance(instance.name),
      formatError: toErrorMessage,
    });
    if (lightsailDetailInstance && instances.some((instance) => instance.name === lightsailDetailInstance.name)) {
      closeLightsailDetail();
    }
    await loadPanelData();
    return true;
  };

  return {
    lightsailDetailInstance,
    lightsailDetailData,
    lightsailDetailLoading,
    lightsailActionLoading,
    lightsailDetailActionForm,
    setLightsailDetailActionForm,
    currentLightsailStaticIP,
    clearLightsailDetailData,
    closeLightsailDetail,
    handleLightsailInstanceAction,
    loadLightsailDetail,
    handleDetailedLightsailAction,
    handleAllowAllLightsailTraffic,
    handleReplaceLightsailStaticIP,
    handleQuickReplaceLightsailStaticIP,
    handleDeleteLightsailInstance,
    handleBatchDeleteLightsailInstances,
  };
}

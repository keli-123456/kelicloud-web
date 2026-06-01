import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import type { ConfirmDialogOptions } from "@/components/ui/warning-dialog";
import {
  deleteAWSInstance,
  getAWSInstanceDetail,
  postAWSInstanceAction,
  type AWSInstance,
  type AWSInstanceDetail,
  type CreateAWSInstanceActionInput,
} from "@/lib/cloudAws";
import type { Ec2DetailActionFormState } from "./awsPanelState";
import { formatTagMap } from "./awsPanelSummaries";
import { toErrorMessage } from "./awsPanelUtils";
import {
  confirmCloudBulkDelete,
  runCloudBulkDelete,
} from "./cloudBulkDeleteUtils";

type ConfirmDialog = (options: ConfirmDialogOptions) => Promise<boolean>;

type UseAWSEC2InstanceActionsOptions = {
  t: TFunction;
  confirm: ConfirmDialog;
  loadPanelData: () => Promise<void>;
};

export function useAWSEC2InstanceActions({
  t,
  confirm,
  loadPanelData,
}: UseAWSEC2InstanceActionsOptions) {
  const [detailInstance, setDetailInstance] = React.useState<AWSInstance | null>(null);
  const [detailData, setDetailData] = React.useState<AWSInstanceDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailActionLoading, setDetailActionLoading] = React.useState(false);
  const [detailActionForm, setDetailActionForm] = React.useState<Ec2DetailActionFormState>({
    imageName: "",
    imageDescription: "",
    noReboot: true,
    instanceType: "",
    tagsText: "",
    allocationId: "",
    privateIp: "",
  });

  const detailTargetElasticAddress = React.useMemo(() => {
    if (!detailData) return null;
    const targetPrivateIp = detailActionForm.privateIp.trim();
    return (
      detailData.addresses.find((address) => address.association_id && (!targetPrivateIp || address.private_ip === targetPrivateIp))
      || detailData.addresses.find((address) => Boolean(address.association_id))
      || null
    );
  }, [detailActionForm.privateIp, detailData]);

  const clearEC2DetailData = React.useCallback(() => {
    setDetailData(null);
  }, []);

  const closeEC2Detail = React.useCallback(() => {
    setDetailInstance(null);
    setDetailData(null);
  }, []);

  const handleInstanceAction = async (instance: AWSInstance, type: string) => {
    try {
      await postAWSInstanceAction(instance.instance_id, { type });
      toast.success(t("cloud.action_success", "Operation submitted"));
      await loadPanelData();
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    }
  };

  const loadInstanceDetail = React.useCallback(async (instance: AWSInstance) => {
    setDetailInstance(instance);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const detail = await getAWSInstanceDetail(instance.instance_id);
      setDetailData(detail);
      setDetailActionForm({
        imageName: `${instance.name || instance.instance_id}-ami-${Date.now()}`,
        imageDescription: "",
        noReboot: true,
        instanceType: detail.instance.instance_type || "",
        tagsText: formatTagMap(detail.instance.tags),
        allocationId: "",
        privateIp: detail.instance.private_ip || "",
      });
    } catch (detailError) {
      toast.error(toErrorMessage(detailError));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleDetailedEc2Action = async (input: CreateAWSInstanceActionInput) => {
    if (!detailInstance) return;
    setDetailActionLoading(true);
    try {
      await postAWSInstanceAction(detailInstance.instance_id, input);
      toast.success(t("cloud.action_success", "Operation submitted"));
      await loadPanelData();
      await loadInstanceDetail({
        ...detailInstance,
        instance_type: input.instance_type || detailInstance.instance_type,
      });
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    } finally {
      setDetailActionLoading(false);
    }
  };

  const handleAllowAllEc2Traffic = async () => {
    if (!detailInstance) return;

    const confirmed = await confirm({
      title: t("cloud.providers.aws.allow_all_traffic", "Allow All Traffic"),
      description: t("cloud.providers.aws.allow_all_traffic_confirm", {
        name: detailInstance.name || detailInstance.instance_id,
        defaultValue: `Allow all IPv4 and IPv6 ingress and egress traffic on every security group attached to "${detailInstance.name || detailInstance.instance_id}"?`,
      }),
      confirmLabel: t("cloud.providers.aws.allow_all_traffic", "Allow All Traffic"),
      tone: "warning",
    });
    if (!confirmed) return;

    await handleDetailedEc2Action({ type: "allow_all_traffic" });
  };

  const handleReplaceEc2Address = async () => {
    if (!detailInstance) return;

    const confirmed = await confirm({
      title: t("cloud.providers.aws.replace_ip", "Replace IP"),
      description: t("cloud.providers.aws.replace_ip_confirm", {
        name: detailInstance.name || detailInstance.instance_id,
        current: detailTargetElasticAddress?.public_ip || "-",
        defaultValue: `Allocate a new public IP for "${detailInstance.name || detailInstance.instance_id}" and release the old IP ${detailTargetElasticAddress?.public_ip || ""}?`,
      }),
      confirmLabel: t("cloud.providers.aws.replace_ip", "Replace IP"),
      tone: "warning",
    });
    if (!confirmed) return;

    await handleDetailedEc2Action({
      type: "replace_address",
      private_ip: detailActionForm.privateIp,
    });
  };

  const handleQuickReplaceEc2Address = async (instance: AWSInstance) => {
    const confirmed = await confirm({
      title: t("cloud.providers.aws.replace_ip", "Replace IP"),
      description: t("cloud.providers.aws.replace_ip_confirm", {
        name: instance.name || instance.instance_id,
        current: instance.public_ip || "-",
        defaultValue: `Allocate a new public IP for "${instance.name || instance.instance_id}" and release the old IP ${instance.public_ip || ""}?`,
      }),
      confirmLabel: t("cloud.providers.aws.replace_ip", "Replace IP"),
      tone: "warning",
    });
    if (!confirmed) return;

    try {
      await postAWSInstanceAction(instance.instance_id, {
        type: "replace_address",
        private_ip: instance.private_ip || "",
      });
      toast.success(t("cloud.action_success", "Operation submitted"));
      await loadPanelData();
      if (detailInstance?.instance_id === instance.instance_id) {
        await loadInstanceDetail(instance);
      }
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    }
  };

  const handleDeleteInstance = async (instance: AWSInstance) => {
    const confirmed = await confirm({
      title: t("cloud.delete", "Delete instance"),
      description: t("cloud.providers.aws.delete_confirm", {
        name: instance.name || instance.instance_id,
        defaultValue: `Delete instance "${instance.name || instance.instance_id}"? This action cannot be undone.`,
      }),
      confirmLabel: t("cloud.delete", "Delete"),
    });
    if (!confirmed) return;

    try {
      await deleteAWSInstance(instance.instance_id);
      toast.success(t("cloud.providers.aws.delete_success", "Instance deleted"));
      if (detailInstance?.instance_id === instance.instance_id) {
        closeEC2Detail();
      }
      await loadPanelData();
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  };

  const handleBatchDeleteInstances = async (instances: AWSInstance[]) => {
    const confirmed = await confirmCloudBulkDelete({
      t,
      confirm,
      names: instances.map((instance) => instance.name || instance.instance_id),
    });
    if (!confirmed) return false;

    await runCloudBulkDelete({
      t,
      items: instances,
      getName: (instance) => instance.name || instance.instance_id,
      deleteItem: (instance) => deleteAWSInstance(instance.instance_id),
      formatError: toErrorMessage,
    });
    if (detailInstance && instances.some((instance) => instance.instance_id === detailInstance.instance_id)) {
      closeEC2Detail();
    }
    await loadPanelData();
    return true;
  };

  return {
    detailInstance,
    detailData,
    detailLoading,
    detailActionLoading,
    detailActionForm,
    setDetailActionForm,
    detailTargetElasticAddress,
    clearEC2DetailData,
    closeEC2Detail,
    handleInstanceAction,
    loadInstanceDetail,
    handleDetailedEc2Action,
    handleAllowAllEc2Traffic,
    handleReplaceEc2Address,
    handleQuickReplaceEc2Address,
    handleDeleteInstance,
    handleBatchDeleteInstances,
  };
}

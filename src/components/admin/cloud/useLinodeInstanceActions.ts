import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import type { ConfirmDialogOptions } from "@/components/ui/warning-dialog";
import {
  deleteLinodeInstance,
  getLinodeInstanceDetail,
  postLinodeInstanceAction,
  type LinodeImage,
  type LinodeInstance,
  type LinodeInstanceActionInput,
  type LinodeInstanceDetail,
} from "@/lib/cloudLinode";
import {
  toErrorMessage,
  type CreatedPasswordState,
  type DetailActionPasswordState,
} from "./linodePanelUtils";

type ConfirmDialog = (options: ConfirmDialogOptions) => Promise<boolean>;

type UseLinodeInstanceActionsOptions = {
  t: TFunction;
  confirm: ConfirmDialog;
  catalogImages: LinodeImage[] | undefined;
  setCreatedPassword: React.Dispatch<React.SetStateAction<CreatedPasswordState | null>>;
  loadPanelData: () => Promise<void>;
};

export function useLinodeInstanceActions({
  t,
  confirm,
  catalogImages,
  setCreatedPassword,
  loadPanelData,
}: UseLinodeInstanceActionsOptions) {
  const [detailInstance, setDetailInstance] = React.useState<LinodeInstance | null>(null);
  const [detailData, setDetailData] = React.useState<LinodeInstanceDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailActionLoading, setDetailActionLoading] = React.useState(false);
  const [resizeTargetType, setResizeTargetType] = React.useState("");
  const [detailPasswordState, setDetailPasswordState] = React.useState<DetailActionPasswordState>({
    mode: "random",
    password: "",
  });
  const [rebuildImage, setRebuildImage] = React.useState("");
  const [rebuildUserData, setRebuildUserData] = React.useState("");
  const [rebuildBooted, setRebuildBooted] = React.useState(true);

  const clearInstanceDetailData = React.useCallback(() => {
    setDetailData(null);
  }, []);

  const closeInstanceDetail = React.useCallback(() => {
    setDetailInstance(null);
    setDetailData(null);
  }, []);

  const loadInstanceDetail = React.useCallback(async (instance: LinodeInstance) => {
    setDetailInstance(instance);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const detail = await getLinodeInstanceDetail(instance.id);
      setDetailData(detail);
      setResizeTargetType(detail.instance.type || "");
      setDetailPasswordState({
        mode: "random",
        password: "",
      });
      setRebuildImage(detail.instance.image || catalogImages?.[0]?.id || "");
      setRebuildUserData("");
      setRebuildBooted(detail.instance.status === "running");
    } catch (detailError) {
      toast.error(toErrorMessage(detailError));
    } finally {
      setDetailLoading(false);
    }
  }, [catalogImages]);

  const handleInstanceAction = React.useCallback(async (instance: LinodeInstance, type: string) => {
    try {
      await postLinodeInstanceAction(instance.id, { type });
      toast.success(t("cloud.action_success", "Operation submitted"));
      await loadPanelData();
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    }
  }, [loadPanelData, t]);

  const handleDetailInstanceAction = React.useCallback(async (input: LinodeInstanceActionInput) => {
    if (!detailInstance) return;
    setDetailActionLoading(true);
    try {
      const result = await postLinodeInstanceAction(detailInstance.id, input);
      toast.success(t("cloud.action_success", "Operation submitted"));
      if (result.generated_password) {
        setCreatedPassword({
          instance: result.instance || detailInstance,
          rootPassword: result.generated_password,
          passwordMode: (input.root_password_mode || "random") as "custom" | "random",
          passwordSaved: result.password_saved,
          passwordSaveError: result.password_save_error,
        });
      } else if (result.password_save_error) {
        toast.error(result.password_save_error);
      }
      await loadPanelData();
      await loadInstanceDetail(detailInstance);
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    } finally {
      setDetailActionLoading(false);
    }
  }, [detailInstance, loadInstanceDetail, loadPanelData, setCreatedPassword, t]);

  const handleDeleteInstance = React.useCallback(async (instance: LinodeInstance) => {
    const confirmed = await confirm({
      title: t("cloud.delete", "Delete instance"),
      description: t("cloud.providers.linode.delete_confirm", {
        name: instance.label,
        defaultValue: `Delete Linode "${instance.label}"? This action cannot be undone.`,
      }),
      confirmLabel: t("cloud.delete", "Delete"),
    });
    if (!confirmed) return;

    try {
      await deleteLinodeInstance(instance.id);
      toast.success(t("cloud.providers.linode.delete_success", "Linode instance deleted"));
      await loadPanelData();
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  }, [confirm, loadPanelData, t]);

  return {
    detailInstance,
    detailData,
    detailLoading,
    detailActionLoading,
    resizeTargetType,
    setResizeTargetType,
    detailPasswordState,
    setDetailPasswordState,
    rebuildImage,
    setRebuildImage,
    rebuildUserData,
    setRebuildUserData,
    rebuildBooted,
    setRebuildBooted,
    clearInstanceDetailData,
    closeInstanceDetail,
    loadInstanceDetail,
    handleInstanceAction,
    handleDetailInstanceAction,
    handleDeleteInstance,
  };
}

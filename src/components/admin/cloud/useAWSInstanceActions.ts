import React from "react";
import type { TFunction } from "i18next";

import type { ConfirmDialogOptions } from "@/components/ui/warning-dialog";
import { useAWSEC2InstanceActions } from "./useAWSEC2InstanceActions";
import { useAWSLightsailInstanceActions } from "./useAWSLightsailInstanceActions";

type ConfirmDialog = (options: ConfirmDialogOptions) => Promise<boolean>;

type UseAWSInstanceActionsOptions = {
  t: TFunction;
  confirm: ConfirmDialog;
  loadPanelData: () => Promise<void>;
};

export function useAWSInstanceActions({
  t,
  confirm,
  loadPanelData,
}: UseAWSInstanceActionsOptions) {
  const ec2Actions = useAWSEC2InstanceActions({
    t,
    confirm,
    loadPanelData,
  });
  const lightsailActions = useAWSLightsailInstanceActions({
    t,
    confirm,
    loadPanelData,
  });
  const { clearEC2DetailData } = ec2Actions;
  const { clearLightsailDetailData } = lightsailActions;

  const clearResourceDetailData = React.useCallback(() => {
    clearEC2DetailData();
    clearLightsailDetailData();
  }, [clearEC2DetailData, clearLightsailDetailData]);

  return {
    ...ec2Actions,
    ...lightsailActions,
    clearResourceDetailData,
  };
}

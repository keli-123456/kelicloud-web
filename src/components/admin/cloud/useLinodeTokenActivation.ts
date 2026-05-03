import type { Dispatch, SetStateAction } from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import {
  setLinodeActiveToken,
  type LinodeTokenPool,
  type LinodeTokenRecord,
} from "@/lib/cloudLinode";
import { toErrorMessage } from "./linodePanelUtils";

type UseLinodeTokenActivationOptions = {
  t: TFunction;
  setTokenPool: Dispatch<SetStateAction<LinodeTokenPool | null>>;
  loadPanelData: () => Promise<void>;
  clearPanelState: () => void;
};

export function useLinodeTokenActivation({
  t,
  setTokenPool,
  loadPanelData,
  clearPanelState,
}: UseLinodeTokenActivationOptions) {
  const handleSelectToken = async (
    token: LinodeTokenRecord,
    options?: { loadResources?: boolean },
  ) => {
    try {
      const nextPool = await setLinodeActiveToken(token.id);
      setTokenPool(nextPool);
      toast.success(
        t("cloud.tokens.active_success", {
          name: token.name,
          defaultValue: `Using token ${token.name}`,
        }),
      );
      if (options?.loadResources) {
        await loadPanelData();
      } else {
        clearPanelState();
      }
    } catch (selectError) {
      toast.error(toErrorMessage(selectError));
    }
  };

  return {
    handleSelectToken,
  };
}

import type { Dispatch, SetStateAction } from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import {
  setDigitalOceanActiveToken,
  type DigitalOceanTokenPool,
  type DigitalOceanTokenRecord,
} from "@/lib/cloud";
import { toErrorMessage } from "./digitalOceanPanelUtils";

type UseDigitalOceanTokenActivationOptions = {
  t: TFunction;
  setTokenPool: Dispatch<SetStateAction<DigitalOceanTokenPool | null>>;
  loadPanelData: () => Promise<void>;
  clearPanelState: () => void;
};

export function useDigitalOceanTokenActivation({
  t,
  setTokenPool,
  loadPanelData,
  clearPanelState,
}: UseDigitalOceanTokenActivationOptions) {
  const handleSelectToken = async (
    token: DigitalOceanTokenRecord,
    options?: { loadResources?: boolean },
  ) => {
    try {
      const nextPool = await setDigitalOceanActiveToken(token.id);
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

import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import {
  checkDigitalOceanTokens,
  type DigitalOceanTokenPool,
} from "@/lib/cloud";
import {
  hasActiveToken,
  toErrorMessage,
} from "./digitalOceanPanelUtils";

type UseDigitalOceanTokenHealthOptions = {
  t: TFunction;
  setTokenPool: React.Dispatch<React.SetStateAction<DigitalOceanTokenPool | null>>;
  shouldPreserveLoadedResources: (nextPool: DigitalOceanTokenPool) => boolean;
  clearPanelState: () => void;
};

export function useDigitalOceanTokenHealth({
  t,
  setTokenPool,
  shouldPreserveLoadedResources,
  clearPanelState,
}: UseDigitalOceanTokenHealthOptions) {
  const [tokenChecking, setTokenChecking] = React.useState(false);

  const handleCheckTokens = async () => {
    setTokenChecking(true);
    try {
      const nextPool = await checkDigitalOceanTokens();
      setTokenPool(nextPool);
      toast.success(t("cloud.tokens.check_success", "Token health check finished"));
      if (!hasActiveToken(nextPool) || !shouldPreserveLoadedResources(nextPool)) {
        clearPanelState();
      }
    } catch (checkError) {
      toast.error(toErrorMessage(checkError));
    } finally {
      setTokenChecking(false);
    }
  };

  return {
    tokenChecking,
    handleCheckTokens,
  };
}

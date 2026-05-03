import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import {
  checkLinodeTokens,
  type LinodeTokenPool,
} from "@/lib/cloudLinode";
import {
  hasActiveToken,
  toErrorMessage,
} from "./linodePanelUtils";

type UseLinodeTokenHealthOptions = {
  t: TFunction;
  setTokenPool: React.Dispatch<React.SetStateAction<LinodeTokenPool | null>>;
  shouldPreserveLoadedResources: (nextPool: LinodeTokenPool) => boolean;
  clearPanelState: () => void;
};

export function useLinodeTokenHealth({
  t,
  setTokenPool,
  shouldPreserveLoadedResources,
  clearPanelState,
}: UseLinodeTokenHealthOptions) {
  const [tokenChecking, setTokenChecking] = React.useState(false);

  const handleCheckTokens = async () => {
    setTokenChecking(true);
    try {
      const nextPool = await checkLinodeTokens();
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

import type { Dispatch, SetStateAction } from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import {
  setAWSActiveCredential,
  type AWSCredentialPool,
  type AWSCredentialRecord,
} from "@/lib/cloudAws";
import { toErrorMessage } from "./awsPanelUtils";

type UseAWSCredentialActivationOptions = {
  t: TFunction;
  setCredentialPool: Dispatch<SetStateAction<AWSCredentialPool | null>>;
  setRegionSelectionRequired: Dispatch<SetStateAction<boolean>>;
  clearPanelState: () => void;
};

export function useAWSCredentialActivation({
  t,
  setCredentialPool,
  setRegionSelectionRequired,
  clearPanelState,
}: UseAWSCredentialActivationOptions) {
  const handleSelectCredential = async (credential: AWSCredentialRecord) => {
    try {
      const nextPool = await setAWSActiveCredential(credential.id);
      setCredentialPool(nextPool);
      setRegionSelectionRequired(true);
      clearPanelState();
      toast.success(
        t("cloud.tokens.active_success", {
          name: credential.name,
          defaultValue: `Using token ${credential.name}`,
        }),
      );
    } catch (selectError) {
      toast.error(toErrorMessage(selectError));
    }
  };

  return {
    handleSelectCredential,
  };
}

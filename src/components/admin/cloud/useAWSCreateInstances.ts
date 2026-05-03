import type { Dispatch, SetStateAction } from "react";
import type { TFunction } from "i18next";

import type {
  AWSCredentialRecord,
  AWSInstance,
} from "@/lib/cloudAws";
import type { AWSRegionOption } from "./awsPanelCatalog";
import type { CreatedPasswordState } from "./awsPanelState";
import { useAWSEC2CreateInstance } from "./useAWSEC2CreateInstance";
import { useAWSLightsailCreateInstance } from "./useAWSLightsailCreateInstance";

type UseAWSCreateInstancesOptions = {
  t: TFunction;
  activeCredential: AWSCredentialRecord | null;
  activeCredentialName: string;
  activeRegion: string;
  activeContextReady: boolean;
  resourcesLoaded: boolean;
  regionOptions: AWSRegionOption[];
  setInstances: Dispatch<SetStateAction<AWSInstance[]>>;
  setCreatedPassword: Dispatch<SetStateAction<CreatedPasswordState | null>>;
  loadLightsailData: () => Promise<void>;
  loadBackgroundTasks: (showError?: boolean, showLoading?: boolean) => Promise<unknown>;
};

export function useAWSCreateInstances({
  t,
  activeCredential,
  activeCredentialName,
  activeRegion,
  activeContextReady,
  resourcesLoaded,
  regionOptions,
  setInstances,
  setCreatedPassword,
  loadLightsailData,
  loadBackgroundTasks,
}: UseAWSCreateInstancesOptions) {
  const ec2Create = useAWSEC2CreateInstance({
    t,
    activeCredential,
    activeCredentialName,
    activeRegion,
    activeContextReady,
    resourcesLoaded,
    regionOptions,
    setInstances,
    setCreatedPassword,
    loadBackgroundTasks,
  });
  const lightsailCreate = useAWSLightsailCreateInstance({
    t,
    activeCredential,
    activeCredentialName,
    activeRegion,
    activeContextReady,
    resourcesLoaded,
    regionOptions,
    setCreatedPassword,
    loadLightsailData,
    loadBackgroundTasks,
  });

  return {
    ...ec2Create,
    ...lightsailCreate,
  };
}

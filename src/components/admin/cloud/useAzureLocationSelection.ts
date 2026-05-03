import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import {
  getAzureCatalog,
  setAzureActiveLocation,
  type AzureAccount,
  type AzureCatalog,
  type AzureCredentialPool,
} from "@/lib/cloudAzure";
import {
  normalizeLocation,
  toErrorMessage,
} from "./azurePanelUtils";

type UseAzureLocationSelectionOptions = {
  t: TFunction;
  setCredentialPool: React.Dispatch<React.SetStateAction<AzureCredentialPool | null>>;
  setCatalog: React.Dispatch<React.SetStateAction<AzureCatalog | null>>;
  setAccount: React.Dispatch<React.SetStateAction<AzureAccount | null>>;
};

export function useAzureLocationSelection({
  t,
  setCredentialPool,
  setCatalog,
  setAccount,
}: UseAzureLocationSelectionOptions) {
  const [locationUpdating, setLocationUpdating] = React.useState(false);

  const handleSetLocation = async (location: string) => {
    setLocationUpdating(true);
    try {
      const nextPool = await setAzureActiveLocation(location);
      const nextCatalog = await getAzureCatalog();
      setCredentialPool(nextPool);
      setCatalog(nextCatalog);
      setAccount((current) => current
        ? { ...current, active_location: normalizeLocation(location) }
        : current);
      toast.success(t("cloud.providers.azure.location_updated", "Active Azure location updated"));
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setLocationUpdating(false);
    }
  };

  return {
    locationUpdating,
    handleSetLocation,
  };
}

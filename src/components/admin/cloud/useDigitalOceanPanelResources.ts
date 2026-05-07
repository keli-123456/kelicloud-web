import React from "react";

import {
  getDigitalOceanAccount,
  listDigitalOceanDroplets,
  type DigitalOceanAccount,
  type DigitalOceanCatalog,
  type DigitalOceanDroplet,
} from "@/lib/cloud";
import { getReadableErrorMessage } from "@/lib/apiErrorMessage";
import { buildStaticDigitalOceanCatalog } from "./cloudStaticCatalogs";

function toErrorMessage(error: unknown) {
  return getReadableErrorMessage(error);
}

export function useDigitalOceanPanelResources() {
  const [initializing, setInitializing] = React.useState(true);
  const [panelLoading, setPanelLoading] = React.useState(false);
  const [account, setAccount] = React.useState<DigitalOceanAccount | null>(null);
  const [catalog, setCatalog] = React.useState<DigitalOceanCatalog | null>(() => buildStaticDigitalOceanCatalog());
  const [droplets, setDroplets] = React.useState<DigitalOceanDroplet[]>([]);
  const [error, setError] = React.useState("");
  const [resourcesLoaded, setResourcesLoaded] = React.useState(false);

  const loadPanelData = React.useCallback(async () => {
    setPanelLoading(true);
    try {
      const [nextAccount, nextDroplets] = await Promise.all([
        getDigitalOceanAccount(),
        listDigitalOceanDroplets(),
      ]);
      setAccount(nextAccount);
      setDroplets(nextDroplets);
      setError("");
      setResourcesLoaded(true);
    } catch (panelError) {
      setAccount(null);
      setDroplets([]);
      setError(toErrorMessage(panelError));
      setResourcesLoaded(false);
    } finally {
      setPanelLoading(false);
    }
  }, []);

  const clearResourceData = React.useCallback(() => {
    setAccount(null);
    setCatalog(buildStaticDigitalOceanCatalog());
    setDroplets([]);
    setError("");
    setResourcesLoaded(false);
  }, []);

  return {
    initializing,
    setInitializing,
    panelLoading,
    account,
    setAccount,
    catalog,
    setCatalog,
    droplets,
    error,
    setError,
    resourcesLoaded,
    loadPanelData,
    clearResourceData,
  };
}

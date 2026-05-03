import React from "react";

import {
  getDigitalOceanAccount,
  getDigitalOceanCatalog,
  listDigitalOceanDroplets,
  type DigitalOceanAccount,
  type DigitalOceanCatalog,
  type DigitalOceanDroplet,
} from "@/lib/cloud";

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

export function useDigitalOceanPanelResources() {
  const [initializing, setInitializing] = React.useState(true);
  const [panelLoading, setPanelLoading] = React.useState(false);
  const [account, setAccount] = React.useState<DigitalOceanAccount | null>(null);
  const [catalog, setCatalog] = React.useState<DigitalOceanCatalog | null>(null);
  const [droplets, setDroplets] = React.useState<DigitalOceanDroplet[]>([]);
  const [error, setError] = React.useState("");
  const [resourcesLoaded, setResourcesLoaded] = React.useState(false);

  const loadPanelData = React.useCallback(async () => {
    setPanelLoading(true);
    try {
      const [nextAccount, nextCatalog, nextDroplets] = await Promise.all([
        getDigitalOceanAccount(),
        getDigitalOceanCatalog(),
        listDigitalOceanDroplets(),
      ]);
      setAccount(nextAccount);
      setCatalog(nextCatalog);
      setDroplets(nextDroplets);
      setError("");
      setResourcesLoaded(true);
    } catch (panelError) {
      setAccount(null);
      setCatalog(null);
      setDroplets([]);
      setError(toErrorMessage(panelError));
      setResourcesLoaded(false);
    } finally {
      setPanelLoading(false);
    }
  }, []);

  const clearResourceData = React.useCallback(() => {
    setAccount(null);
    setCatalog(null);
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

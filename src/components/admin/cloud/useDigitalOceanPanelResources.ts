import React from "react";
import { useRequestTracker } from "../useRequestTracker";

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
  const requests = useRequestTracker();
  const [initializing, setInitializing] = React.useState(true);
  const [panelLoading, setPanelLoading] = React.useState(false);
  const [account, setAccount] = React.useState<DigitalOceanAccount | null>(null);
  const [catalog, setCatalog] = React.useState<DigitalOceanCatalog | null>(() => buildStaticDigitalOceanCatalog());
  const [droplets, setDroplets] = React.useState<DigitalOceanDroplet[]>([]);
  const [error, setError] = React.useState("");
  const [resourcesLoaded, setResourcesLoaded] = React.useState(false);

  const loadPanelData = React.useCallback(async () => {
    const ticket = requests.begin();
    setPanelLoading(true);
    try {
      const [nextAccount, nextDroplets] = await Promise.all([
        getDigitalOceanAccount(),
        listDigitalOceanDroplets(),
      ]);
      if (!requests.isCurrent(ticket)) return;
      setAccount(nextAccount);
      setDroplets(nextDroplets);
      setError("");
      setResourcesLoaded(true);
    } catch (panelError) {
      if (!requests.isCurrent(ticket)) return;
      setError(toErrorMessage(panelError));
    } finally {
      if (requests.isCurrent(ticket)) setPanelLoading(false);
      requests.finish(ticket);
    }
  }, [requests]);

  const clearResourceData = React.useCallback(() => {
    requests.invalidate();
    setPanelLoading(false);
    setAccount(null);
    setCatalog(buildStaticDigitalOceanCatalog());
    setDroplets([]);
    setError("");
    setResourcesLoaded(false);
  }, [requests]);

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

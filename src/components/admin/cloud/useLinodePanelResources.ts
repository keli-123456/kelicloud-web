import React from "react";
import { useRequestTracker } from "../useRequestTracker";

import {
  getLinodeAccount,
  listLinodeInstances,
  type LinodeAccount,
  type LinodeCatalog,
  type LinodeInstance,
} from "@/lib/cloudLinode";
import { toErrorMessage } from "./linodePanelUtils";
import { buildStaticLinodeCatalog } from "./cloudStaticCatalogs";

export function useLinodePanelResources() {
  const requests = useRequestTracker();
  const [initializing, setInitializing] = React.useState(true);
  const [panelLoading, setPanelLoading] = React.useState(false);
  const [account, setAccount] = React.useState<LinodeAccount | null>(null);
  const [catalog, setCatalog] = React.useState<LinodeCatalog | null>(() => buildStaticLinodeCatalog());
  const [instances, setInstances] = React.useState<LinodeInstance[]>([]);
  const [error, setError] = React.useState("");
  const [resourcesLoaded, setResourcesLoaded] = React.useState(false);

  const loadPanelData = React.useCallback(async () => {
    const ticket = requests.begin();
    setPanelLoading(true);
    try {
      const [nextAccount, nextInstances] = await Promise.all([
        getLinodeAccount(),
        listLinodeInstances(),
      ]);
      if (!requests.isCurrent(ticket)) return;
      setAccount(nextAccount);
      setInstances(nextInstances);
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
    setCatalog(buildStaticLinodeCatalog());
    setInstances([]);
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
    instances,
    error,
    setError,
    resourcesLoaded,
    loadPanelData,
    clearResourceData,
  };
}

import React from "react";

import {
  getLinodeAccount,
  getLinodeCatalog,
  listLinodeInstances,
  type LinodeAccount,
  type LinodeCatalog,
  type LinodeInstance,
} from "@/lib/cloudLinode";
import { toErrorMessage } from "./linodePanelUtils";

export function useLinodePanelResources() {
  const [initializing, setInitializing] = React.useState(true);
  const [panelLoading, setPanelLoading] = React.useState(false);
  const [account, setAccount] = React.useState<LinodeAccount | null>(null);
  const [catalog, setCatalog] = React.useState<LinodeCatalog | null>(null);
  const [instances, setInstances] = React.useState<LinodeInstance[]>([]);
  const [error, setError] = React.useState("");
  const [resourcesLoaded, setResourcesLoaded] = React.useState(false);

  const loadPanelData = React.useCallback(async () => {
    setPanelLoading(true);
    try {
      const [nextAccount, nextCatalog, nextInstances] = await Promise.all([
        getLinodeAccount(),
        getLinodeCatalog(),
        listLinodeInstances(),
      ]);
      setAccount(nextAccount);
      setCatalog(nextCatalog);
      setInstances(nextInstances);
      setError("");
      setResourcesLoaded(true);
    } catch (panelError) {
      setAccount(null);
      setCatalog(null);
      setInstances([]);
      setError(toErrorMessage(panelError));
      setResourcesLoaded(false);
    } finally {
      setPanelLoading(false);
    }
  }, []);

  const clearResourceData = React.useCallback(() => {
    setAccount(null);
    setCatalog(null);
    setInstances([]);
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
    instances,
    error,
    setError,
    resourcesLoaded,
    loadPanelData,
    clearResourceData,
  };
}

import React from "react";

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
  const [initializing, setInitializing] = React.useState(true);
  const [panelLoading, setPanelLoading] = React.useState(false);
  const [account, setAccount] = React.useState<LinodeAccount | null>(null);
  const [catalog, setCatalog] = React.useState<LinodeCatalog | null>(() => buildStaticLinodeCatalog());
  const [instances, setInstances] = React.useState<LinodeInstance[]>([]);
  const [error, setError] = React.useState("");
  const [resourcesLoaded, setResourcesLoaded] = React.useState(false);

  const loadPanelData = React.useCallback(async () => {
    setPanelLoading(true);
    try {
      const [nextAccount, nextInstances] = await Promise.all([
        getLinodeAccount(),
        listLinodeInstances(),
      ]);
      setAccount(nextAccount);
      setInstances(nextInstances);
      setError("");
      setResourcesLoaded(true);
    } catch (panelError) {
      setAccount(null);
      setInstances([]);
      setError(toErrorMessage(panelError));
      setResourcesLoaded(false);
    } finally {
      setPanelLoading(false);
    }
  }, []);

  const clearResourceData = React.useCallback(() => {
    setAccount(null);
    setCatalog(buildStaticLinodeCatalog());
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

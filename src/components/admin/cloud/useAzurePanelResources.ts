import React from "react";
import { useRequestTracker } from "../useRequestTracker";

import {
  getAzureAccount,
  getAzureCredentials,
  listAzureInstances,
  type AzureAccount,
  type AzureCatalog,
  type AzureCredentialPool,
  type AzureInstance,
} from "@/lib/cloudAzure";
import { getReadableErrorMessage } from "@/lib/apiErrorMessage";
import { buildStaticAzureCatalog } from "./cloudStaticCatalogs";

function toErrorMessage(error: unknown) {
  return getReadableErrorMessage(error);
}

function hasActiveCredential(pool: AzureCredentialPool | null) {
  return Boolean(pool?.active_credential_id);
}

async function loadAzureResourceSnapshot() {
  const [accountResult, instancesResult] = await Promise.allSettled([
    getAzureAccount(),
    listAzureInstances(),
  ]);

  const errors: string[] = [];
  if (accountResult.status === "rejected") {
    errors.push(toErrorMessage(accountResult.reason));
  }
  if (instancesResult.status === "rejected") {
    errors.push(toErrorMessage(instancesResult.reason));
  }

  return {
    account: accountResult.status === "fulfilled" ? accountResult.value : undefined,
    instances: instancesResult.status === "fulfilled" ? instancesResult.value : undefined,
    error: errors.filter(Boolean).join("; "),
  };
}

export function useAzurePanelResources() {
  const requests = useRequestTracker();
  const poolRequests = useRequestTracker();
  const [loading, setLoading] = React.useState(true);
  const [resourceLoading, setResourceLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");
  const [credentialPool, setCredentialPool] = React.useState<AzureCredentialPool | null>(null);
  const [account, setAccount] = React.useState<AzureAccount | null>(null);
  const [catalog, setCatalog] = React.useState<AzureCatalog | null>(() => buildStaticAzureCatalog());
  const [instances, setInstances] = React.useState<AzureInstance[]>([]);

  const clearResourceData = React.useCallback(() => {
    requests.invalidate();
    setResourceLoading(false);
    setAccount(null);
    setInstances([]);
  }, [requests]);

  const loadResources = React.useCallback(async (credentialPoolOverride?: AzureCredentialPool | null) => {
    const nextCredentialPool = credentialPoolOverride ?? credentialPool;
    if (!hasActiveCredential(nextCredentialPool)) {
      clearResourceData();
      return;
    }

    const ticket = requests.begin();
    setResourceLoading(true);
    try {
      const snapshot = await loadAzureResourceSnapshot();
      if (!requests.isCurrent(ticket)) return;
      if (snapshot.account !== undefined) setAccount(snapshot.account);
      if (snapshot.instances !== undefined) setInstances(snapshot.instances);
      setLoadError(snapshot.error);
    } catch (error) {
      if (!requests.isCurrent(ticket)) return;
      setLoadError(toErrorMessage(error));
    } finally {
      if (requests.isCurrent(ticket)) setResourceLoading(false);
      requests.finish(ticket);
    }
  }, [clearResourceData, credentialPool, requests]);

  const loadAll = React.useCallback(async () => {
    const ticket = poolRequests.begin();
    setLoading(true);
    try {
      const nextPool = await getAzureCredentials();
      if (!poolRequests.isCurrent(ticket)) return;
      setCredentialPool(nextPool);
      setLoadError("");
      clearResourceData();
    } catch (error) {
      if (!poolRequests.isCurrent(ticket)) return;
      setLoadError(toErrorMessage(error));
    } finally {
      if (poolRequests.isCurrent(ticket)) setLoading(false);
      poolRequests.finish(ticket);
    }
  }, [clearResourceData, poolRequests]);

  return {
    loading,
    resourceLoading,
    loadError,
    setLoadError,
    credentialPool,
    setCredentialPool,
    account,
    setAccount,
    catalog,
    setCatalog,
    instances,
    setInstances,
    loadResources,
    loadAll,
    clearResourceData,
  };
}

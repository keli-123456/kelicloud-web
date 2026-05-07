import React from "react";

import {
  getAzureAccount,
  getAzureCredentials,
  listAzureInstances,
  type AzureAccount,
  type AzureCatalog,
  type AzureCredentialPool,
  type AzureInstance,
} from "@/lib/cloudAzure";
import { buildStaticAzureCatalog } from "./cloudStaticCatalogs";

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown error";
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
    account: accountResult.status === "fulfilled" ? accountResult.value : null,
    instances: instancesResult.status === "fulfilled" ? instancesResult.value : [],
    error: errors.filter(Boolean).join("; "),
  };
}

export function useAzurePanelResources() {
  const [loading, setLoading] = React.useState(true);
  const [resourceLoading, setResourceLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");
  const [credentialPool, setCredentialPool] = React.useState<AzureCredentialPool | null>(null);
  const [account, setAccount] = React.useState<AzureAccount | null>(null);
  const [catalog, setCatalog] = React.useState<AzureCatalog | null>(() => buildStaticAzureCatalog());
  const [instances, setInstances] = React.useState<AzureInstance[]>([]);

  const clearResourceData = React.useCallback(() => {
    setAccount(null);
    setInstances([]);
  }, []);

  const loadResources = React.useCallback(async (credentialPoolOverride?: AzureCredentialPool | null) => {
    const nextCredentialPool = credentialPoolOverride ?? credentialPool;
    if (!hasActiveCredential(nextCredentialPool)) {
      clearResourceData();
      return;
    }

    setResourceLoading(true);
    try {
      const snapshot = await loadAzureResourceSnapshot();
      setAccount(snapshot.account);
      setInstances(snapshot.instances);
      setLoadError(snapshot.error);
    } catch (error) {
      setLoadError(toErrorMessage(error));
      clearResourceData();
    } finally {
      setResourceLoading(false);
    }
  }, [clearResourceData, credentialPool]);

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    try {
      const nextPool = await getAzureCredentials();
      setCredentialPool(nextPool);
      setLoadError("");
      clearResourceData();
    } catch (error) {
      setLoadError(toErrorMessage(error));
      setCredentialPool(null);
      clearResourceData();
    } finally {
      setLoading(false);
    }
  }, [clearResourceData]);

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

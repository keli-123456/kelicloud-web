import React from "react";

import {
  getAWSAccount,
  listAWSInstances,
  listAWSLightsailInstances,
  type AWSAccount,
  type AWSCatalog,
  type AWSInstance,
  type AWSLightsailInstance,
} from "@/lib/cloudAws";
import { toErrorMessage } from "./awsPanelUtils";

export function useAWSPanelResources() {
  const [initializing, setInitializing] = React.useState(true);
  const [panelLoading, setPanelLoading] = React.useState(false);
  const [account, setAccount] = React.useState<AWSAccount | null>(null);
  const [catalog, setCatalog] = React.useState<AWSCatalog | null>(null);
  const [instances, setInstances] = React.useState<AWSInstance[]>([]);
  const [lightsailInstances, setLightsailInstances] = React.useState<AWSLightsailInstance[]>([]);
  const [error, setError] = React.useState("");
  const [lightsailError, setLightsailError] = React.useState("");
  const [resourcesLoaded, setResourcesLoaded] = React.useState(false);

  const loadLightsailData = React.useCallback(async () => {
    try {
      const nextLightsailInstances = await listAWSLightsailInstances();
      setLightsailInstances(nextLightsailInstances);
      setLightsailError("");
    } catch (lightsailLoadError) {
      setLightsailError(toErrorMessage(lightsailLoadError));
    }
  }, []);

  const loadPanelData = React.useCallback(async () => {
    setPanelLoading(true);
    try {
      const [accountResult, instancesResult, lightsailResult] = await Promise.allSettled([
        getAWSAccount(false),
        listAWSInstances(),
        listAWSLightsailInstances(),
      ]);

      const errors: string[] = [];
      if (accountResult.status === "fulfilled") {
        setAccount(accountResult.value);
      } else {
        errors.push(toErrorMessage(accountResult.reason));
      }

      if (instancesResult.status === "fulfilled") {
        setInstances(instancesResult.value);
      } else {
        errors.push(toErrorMessage(instancesResult.reason));
      }

      if (lightsailResult.status === "fulfilled") {
        setLightsailInstances(lightsailResult.value);
        setLightsailError("");
      } else {
        setLightsailError(toErrorMessage(lightsailResult.reason));
      }

      setError(errors.join("; "));
      setResourcesLoaded(
        accountResult.status === "fulfilled"
        || instancesResult.status === "fulfilled",
      );
    } finally {
      setPanelLoading(false);
    }
  }, []);

  const clearResourceData = React.useCallback(() => {
    setAccount(null);
    setCatalog(null);
    setInstances([]);
    setLightsailInstances([]);
    setError("");
    setLightsailError("");
    setResourcesLoaded(false);
  }, []);

  return {
    initializing,
    setInitializing,
    panelLoading,
    account,
    setAccount,
    catalog,
    instances,
    setInstances,
    lightsailInstances,
    error,
    setError,
    lightsailError,
    resourcesLoaded,
    loadLightsailData,
    loadPanelData,
    clearResourceData,
  };
}

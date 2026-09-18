import React from "react";
import { useRequestTracker } from "../useRequestTracker";

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
  const requests = useRequestTracker();
  const lightsailRequests = useRequestTracker();
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
    const ticket = lightsailRequests.begin();
    try {
      const nextLightsailInstances = await listAWSLightsailInstances();
      if (!lightsailRequests.isCurrent(ticket)) return;
      setLightsailInstances(nextLightsailInstances);
      setLightsailError("");
    } catch (lightsailLoadError) {
      if (!lightsailRequests.isCurrent(ticket)) return;
      setLightsailError(toErrorMessage(lightsailLoadError));
    } finally {
      lightsailRequests.finish(ticket);
    }
  }, [lightsailRequests]);

  const loadPanelData = React.useCallback(async () => {
    const ticket = requests.begin();
    const lightsailTicket = lightsailRequests.begin();
    setPanelLoading(true);
    try {
      const [accountResult, instancesResult, lightsailResult] = await Promise.allSettled([
        getAWSAccount(false),
        listAWSInstances(),
        listAWSLightsailInstances(),
      ]);
      if (!requests.isCurrent(ticket)) return;

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

      if (lightsailRequests.isCurrent(lightsailTicket) && lightsailResult.status === "fulfilled") {
        setLightsailInstances(lightsailResult.value);
        setLightsailError("");
      } else if (lightsailRequests.isCurrent(lightsailTicket) && lightsailResult.status === "rejected") {
        setLightsailError(toErrorMessage(lightsailResult.reason));
      }

      setError(errors.join("; "));
      setResourcesLoaded((previous) => previous ||
        accountResult.status === "fulfilled"
        || instancesResult.status === "fulfilled",
      );
    } finally {
      if (requests.isCurrent(ticket)) setPanelLoading(false);
      requests.finish(ticket);
      lightsailRequests.finish(lightsailTicket);
    }
  }, [requests, lightsailRequests]);

  const clearResourceData = React.useCallback(() => {
    requests.invalidate();
    lightsailRequests.invalidate();
    setPanelLoading(false);
    setAccount(null);
    setCatalog(null);
    setInstances([]);
    setLightsailInstances([]);
    setError("");
    setLightsailError("");
    setResourcesLoaded(false);
  }, [requests, lightsailRequests]);

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

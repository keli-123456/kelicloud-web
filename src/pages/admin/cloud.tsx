import React from "react";
import { Navigate, useSearchParams } from "react-router-dom";

import Loading from "@/components/loading";
import { CommandClipboardProvider } from "@/contexts/CommandClipboardContext";
import { getDefaultAdminPath, useAccount } from "@/contexts/AccountContext";
import { NodeDetailsProvider } from "@/contexts/NodeDetailsContext";

type ProviderKey = "digitalocean" | "linode" | "azure" | "aws";

const providerPanels: Record<
  ProviderKey,
  React.LazyExoticComponent<React.ComponentType>
> = {
  digitalocean: React.lazy(
    () => import("@/components/admin/cloud/DigitalOceanPanel"),
  ),
  linode: React.lazy(() => import("@/components/admin/cloud/LinodePanel")),
  azure: React.lazy(() => import("@/components/admin/cloud/AzurePanel")),
  aws: React.lazy(() => import("@/components/admin/cloud/AWSPanel")),
};

export default function CloudPage() {
  const { account, hasFeature, loading: accountLoading } = useAccount();
  const [searchParams, setSearchParams] = useSearchParams();
  const providerParam = searchParams.get("provider");
  const allowedProviders = React.useMemo<ProviderKey[]>(() => {
    const providers: ProviderKey[] = [];
    if (hasFeature("cloud_digitalocean")) {
      providers.push("digitalocean");
    }
    if (hasFeature("cloud_linode")) {
      providers.push("linode");
    }
    if (hasFeature("cloud_azure")) {
      providers.push("azure");
    }
    if (hasFeature("cloud_aws")) {
      providers.push("aws");
    }
    return providers;
  }, [hasFeature]);

  const provider = React.useMemo<ProviderKey>(() => {
    if (
      (providerParam === "digitalocean" ||
        providerParam === "linode" ||
        providerParam === "azure" ||
        providerParam === "aws") &&
      allowedProviders.includes(providerParam)
    ) {
      return providerParam;
    }

    const saved = window.localStorage.getItem("komari-cloud-provider");
    if (
      (saved === "digitalocean" || saved === "linode" || saved === "azure" || saved === "aws") &&
      allowedProviders.includes(saved)
    ) {
      return saved;
    }

    return allowedProviders[0] || "digitalocean";
  }, [allowedProviders, providerParam]);

  React.useEffect(() => {
    if (accountLoading || allowedProviders.length === 0 || providerParam === provider) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("provider", provider);
    setSearchParams(nextSearchParams, { replace: true });
  }, [accountLoading, allowedProviders.length, provider, providerParam, searchParams, setSearchParams]);

  if (accountLoading) {
    return <Loading />;
  }

  if (allowedProviders.length === 0) {
    return <Navigate to={getDefaultAdminPath(account)} replace />;
  }

  const ActiveProviderPanel = providerPanels[provider];

  return (
    <NodeDetailsProvider>
      <CommandClipboardProvider>
        <React.Suspense fallback={<Loading />}>
          <ActiveProviderPanel />
        </React.Suspense>
      </CommandClipboardProvider>
    </NodeDetailsProvider>
  );
}

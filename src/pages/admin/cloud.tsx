import React from "react";
import { Navigate, useSearchParams } from "react-router-dom";

import AzurePanel from "@/components/admin/cloud/AzurePanel";
import AWSPanel from "@/components/admin/cloud/AWSPanel";
import DigitalOceanPanel from "@/components/admin/cloud/DigitalOceanPanel";
import LinodePanel from "@/components/admin/cloud/LinodePanel";
import Loading from "@/components/loading";
import { CommandClipboardProvider } from "@/contexts/CommandClipboardContext";
import { getDefaultAdminPath, useAccount } from "@/contexts/AccountContext";
import { NodeDetailsProvider } from "@/contexts/NodeDetailsContext";

type ProviderKey = "digitalocean" | "linode" | "azure" | "aws";

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

  if (accountLoading) {
    return <Loading />;
  }

  if (allowedProviders.length === 0) {
    return <Navigate to={getDefaultAdminPath(account)} replace />;
  }

  React.useEffect(() => {
    if (providerParam === provider) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("provider", provider);
    setSearchParams(nextSearchParams, { replace: true });
  }, [provider, providerParam, searchParams, setSearchParams]);

  return (
    <NodeDetailsProvider>
      <CommandClipboardProvider>
        {provider === "digitalocean" ? <DigitalOceanPanel /> : null}
        {provider === "linode" ? <LinodePanel /> : null}
        {provider === "azure" ? <AzurePanel /> : null}
        {provider === "aws" ? <AWSPanel /> : null}
      </CommandClipboardProvider>
    </NodeDetailsProvider>
  );
}

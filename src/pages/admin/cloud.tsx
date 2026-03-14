import React from "react";
import { useSearchParams } from "react-router-dom";

import AWSPanel from "@/components/admin/cloud/AWSPanel";
import DigitalOceanPanel from "@/components/admin/cloud/DigitalOceanPanel";
import LinodePanel from "@/components/admin/cloud/LinodePanel";
import { CommandClipboardProvider } from "@/contexts/CommandClipboardContext";
import { NodeDetailsProvider } from "@/contexts/NodeDetailsContext";

type ProviderKey = "digitalocean" | "linode" | "aws";

export default function CloudPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const providerParam = searchParams.get("provider");

  const provider = React.useMemo<ProviderKey>(() => {
    if (
      providerParam === "digitalocean" ||
      providerParam === "linode" ||
      providerParam === "aws"
    ) {
      return providerParam;
    }

    const saved = window.localStorage.getItem("komari-cloud-provider");
    if (saved === "digitalocean" || saved === "linode" || saved === "aws") {
      return saved;
    }

    return "digitalocean";
  }, [providerParam]);

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
        {provider === "aws" ? <AWSPanel /> : null}
      </CommandClipboardProvider>
    </NodeDetailsProvider>
  );
}

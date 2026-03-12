import React from "react";
import { useTranslation } from "react-i18next";
import { Cloud, Server, ShipWheel } from "lucide-react";

import { Tabs } from "@/components/ui/compat";
import AWSPanel from "@/components/admin/cloud/AWSPanel";
import DigitalOceanPanel from "@/components/admin/cloud/DigitalOceanPanel";
import LinodePanel from "@/components/admin/cloud/LinodePanel";

type ProviderKey = "digitalocean" | "linode" | "aws";

const PROVIDERS: Array<{
  key: ProviderKey;
  icon: React.ReactNode;
}> = [
  {
    key: "digitalocean",
    icon: <Cloud className="mr-2 h-4 w-4" />,
  },
  {
    key: "linode",
    icon: <Server className="mr-2 h-4 w-4" />,
  },
  {
    key: "aws",
    icon: <ShipWheel className="mr-2 h-4 w-4" />,
  },
];

export default function CloudPage() {
  const { t } = useTranslation();
  const [provider, setProvider] = React.useState<ProviderKey>("digitalocean");

  React.useEffect(() => {
    const saved = window.localStorage.getItem("komari-cloud-provider");
    if (saved === "digitalocean" || saved === "linode" || saved === "aws") {
      setProvider(saved);
    }
  }, []);

  const handleProviderChange = (value: string) => {
    const nextValue = value as ProviderKey;
    setProvider(nextValue);
    window.localStorage.setItem("komari-cloud-provider", nextValue);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-slate-900">
              {t("cloud.provider_switcher_title", "Cloud Provider")}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {t(
                "cloud.provider_switcher_description",
                "Switch between DigitalOcean, Linode, and AWS EC2 provider panels.",
              )}
            </div>
          </div>
          <Tabs.Root value={provider} onValueChange={handleProviderChange}>
            <Tabs.List>
              {PROVIDERS.map((item) => (
                <Tabs.Trigger key={item.key} value={item.key}>
                  {item.icon}
                  {t(`cloud.providers.${item.key}.title`, item.key)}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs.Root>
        </div>
      </div>

      {provider === "digitalocean" ? <DigitalOceanPanel /> : null}
      {provider === "linode" ? <LinodePanel /> : null}
      {provider === "aws" ? <AWSPanel /> : null}
    </div>
  );
}

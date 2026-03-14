import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import Loading from "@/components/loading";
import { WarningAlert } from "@/components/ui/warning-alert";
import {
  getCloudProviders,
  getCloudProviderValues,
  saveCloudProviderValues,
  type CloudProviderField,
} from "@/lib/cloud";
import { cn } from "@/lib/utils";
import { renderProviderInputs } from "@/utils/renderProviders";

function normalizeProviderKey(value: string) {
  return value.trim().toLowerCase();
}

function isCloudflareProvider(value: string) {
  return normalizeProviderKey(value) === "cloudflare";
}

function isAliyunProvider(value: string) {
  return ["aliyun", "alidns", "alicloud"].includes(normalizeProviderKey(value));
}

function isPreferredDnsProvider(value: string) {
  return isCloudflareProvider(value) || isAliyunProvider(value);
}

function isCloudComputeProvider(value: string) {
  const normalized = normalizeProviderKey(value);
  return [
    "aws",
    "ec2",
    "lightsail",
    "digitalocean",
    "linode",
  ].includes(normalized);
}

function isDnsProvider(value: string) {
  return !isCloudComputeProvider(value);
}

function formatProviderLabel(value: string) {
  if (isCloudflareProvider(value)) {
    return "Cloudflare DNS";
  }

  if (isAliyunProvider(value)) {
    return "Aliyun DNS";
  }

  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sortProviders(providers: string[]) {
  return [...providers].sort((left, right) => {
    const leftPriority = isCloudflareProvider(left)
      ? 0
      : isAliyunProvider(left)
        ? 1
        : 2;
    const rightPriority = isCloudflareProvider(right)
      ? 0
      : isAliyunProvider(right)
        ? 1
        : 2;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return formatProviderLabel(left).localeCompare(formatProviderLabel(right));
  });
}

function getProviderFooter(provider: string, t: ReturnType<typeof useTranslation>["t"]) {
  if (isCloudflareProvider(provider)) {
    return t(
      "cloud.dns.cloudflare_hint",
      "Use an API token that can edit DNS records for the target Cloudflare zone.",
    );
  }

  if (isAliyunProvider(provider)) {
    return t(
      "cloud.dns.aliyun_hint",
      "Use an AccessKey pair with AliDNS record permissions for the target domain.",
    );
  }

  return t(
    "cloud.dns.generic_hint",
    "Save DNS credentials here so Komari can reuse them in domain resolution workflows.",
  );
}

type CloudDnsProviderSectionProps = {
  className?: string;
};

export default function CloudDnsProviderSection({
  className,
}: CloudDnsProviderSectionProps) {
  const { t } = useTranslation();
  const [providerDefs, setProviderDefs] = React.useState<Record<string, CloudProviderField[]>>({});
  const [providerList, setProviderList] = React.useState<string[]>([]);
  const [definitionLoading, setDefinitionLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [providerValuesMap, setProviderValuesMap] = React.useState<
    Record<string, Record<string, unknown>>
  >({});
  const [providerReadyMap, setProviderReadyMap] = React.useState<Record<string, boolean>>({});
  const [providerErrorMap, setProviderErrorMap] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    let active = true;

    const loadProviders = async () => {
      setDefinitionLoading(true);
      setError("");

      try {
        const defs = await getCloudProviders();
        if (!active) return;

        const sortedProviders = sortProviders(
          Object.keys(defs || {}).filter(isDnsProvider),
        );
        setProviderDefs(defs || {});
        setProviderList(sortedProviders);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      } finally {
        if (active) {
          setDefinitionLoading(false);
        }
      }
    };

    void loadProviders();

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (providerList.length === 0) {
      setProviderValuesMap({});
      setProviderReadyMap({});
      setProviderErrorMap({});
      return;
    }

    let active = true;

    const loadProviderValues = async (provider: string) => {
      setProviderReadyMap((previous) => ({ ...previous, [provider]: false }));
      setProviderErrorMap((previous) => ({ ...previous, [provider]: "" }));
      try {
        const values = await getCloudProviderValues(provider);
        if (!active) return;
        setProviderValuesMap((previous) => ({ ...previous, [provider]: values }));
      } catch (loadError) {
        if (!active) return;
        setProviderValuesMap((previous) => ({ ...previous, [provider]: {} }));
        setProviderErrorMap((previous) => ({
          ...previous,
          [provider]: loadError instanceof Error ? loadError.message : String(loadError),
        }));
      } finally {
        if (active) {
          setProviderReadyMap((previous) => ({ ...previous, [provider]: true }));
        }
      }
    };

    providerList.forEach((provider) => {
      void loadProviderValues(provider);
    });

    return () => {
      active = false;
    };
  }, [providerList]);

  const handleSave = async (
    provider: string,
    values: Record<string, unknown>,
  ) => {
    try {
      await saveCloudProviderValues(provider, values);
      setProviderValuesMap((previous) => ({ ...previous, [provider]: values }));
      setProviderErrorMap((previous) => ({ ...previous, [provider]: "" }));
      toast.success(
        t("cloud.dns.save_success", "DNS provider configuration saved"),
      );
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : String(saveError);
      setProviderErrorMap((previous) => ({ ...previous, [provider]: message }));
      toast.error(message);
      throw saveError;
    }
  };

  const hasPreferredProvider = providerList.some(isPreferredDnsProvider);

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-slate-200 bg-white", className)}>
      <div className="border-b border-slate-200 px-5 py-4">
        <div>
          <div className="text-sm font-medium text-slate-900">
            {t("cloud.dns.title", "DNS Provider")}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {t(
              "cloud.dns.description",
              "Configure a DNS service provider so Komari can later point cloud instance IPs at your domain records.",
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        {error ? (
          <WarningAlert tone="warning" description={error} />
        ) : null}

        {definitionLoading ? (
          <Loading text="" />
        ) : providerList.length === 0 ? (
          <WarningAlert
            tone="info"
            description={t(
              "cloud.dns.empty",
              "The backend has not exposed any DNS provider configuration yet.",
            )}
          />
        ) : (
          <>
            {!hasPreferredProvider ? (
              <WarningAlert
                tone="warning"
                description={t(
                  "cloud.dns.preferred_missing",
                  "This backend response does not expose Cloudflare or Aliyun DNS providers yet. The DNS settings panel is ready, but those providers need to exist on the backend first.",
                )}
              />
            ) : null}

            <WarningAlert
              tone="info"
              description={t(
                "cloud.dns.multi_provider_hint",
                "You can save multiple DNS providers side by side here. Each provider currently stores one credential profile.",
              )}
            />

            <div className="grid gap-4">
              {providerList.map((provider) => {
                const providerLabel = formatProviderLabel(provider);
                const providerError = providerErrorMap[provider];
                const providerReady = providerReadyMap[provider];

                return (
                  <div
                    key={provider}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    {providerError ? (
                      <WarningAlert
                        className="mb-4"
                        tone="warning"
                        description={providerError}
                      />
                    ) : null}

                    {!providerReady ? (
                      <Loading text="" />
                    ) : renderProviderInputs({
                      currentProvider: provider,
                      providerDefs,
                      providerValues: providerValuesMap[provider] || {},
                      translationPrefix: `cloud.dns.providers.${normalizeProviderKey(provider)}`,
                      title: providerLabel,
                      description: t(
                        "cloud.dns.provider_fields_description",
                        "Save the API credentials Komari should use for this DNS provider.",
                      ),
                      footer: getProviderFooter(provider, t),
                      setProviderValues: (updater) => {
                        setProviderValuesMap((previous) => ({
                          ...previous,
                          [provider]: updater(previous[provider] || {}),
                        }));
                      },
                      handleSave: async (values) => handleSave(provider, values),
                      t,
                    })}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

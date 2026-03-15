import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import Loading from "@/components/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WarningAlert } from "@/components/ui/warning-alert";
import { useWarningDialog } from "@/components/ui/warning-dialog";
import {
  getCloudProviders,
  getCloudProviderEntries,
  saveCloudProviderEntries,
  type CloudProviderCredentialEntry,
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

function getProviderTranslationKey(value: string) {
  if (isCloudflareProvider(value)) {
    return "cloudflare";
  }

  if (isAliyunProvider(value)) {
    return "aliyun";
  }

  return normalizeProviderKey(value);
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

function valueToMonogram(value: string) {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
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

function getProviderAccent(provider: string) {
  if (isCloudflareProvider(provider)) {
    return {
      icon: "CF",
      iconClassName:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
      cardClassName:
        "border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-white dark:border-amber-900/50 dark:from-amber-950/20 dark:via-slate-950 dark:to-slate-950",
    };
  }

  if (isAliyunProvider(provider)) {
    return {
      icon: "AL",
      iconClassName:
        "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300",
      cardClassName:
        "border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-white dark:border-sky-900/50 dark:from-sky-950/20 dark:via-slate-950 dark:to-slate-950",
    };
  }

  return {
    icon: valueToMonogram(provider),
    iconClassName:
      "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
    cardClassName:
      "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50",
  };
}

function buildProviderNameField(): CloudProviderField {
  return {
    name: "name",
    required: true,
    type: "string",
    help: "Friendly label for this DNS credential set.",
  };
}

function isCredentialField(provider: string, field: CloudProviderField) {
  const normalized = normalizeProviderKey(field.name);

  if (isCloudflareProvider(provider)) {
    return normalized === "api_token";
  }

  if (isAliyunProvider(provider)) {
    return ["access_key_id", "access_key_secret"].includes(normalized);
  }

  return [
    "token",
    "secret",
    "key",
    "credential",
    "password",
  ].some((keyword) => normalized.includes(keyword));
}

function getEditableProviderFields(provider: string, fields: CloudProviderField[]) {
  const credentialFields = fields.filter((field) => isCredentialField(provider, field));
  return [buildProviderNameField(), ...credentialFields];
}

function buildEntryFormValues(
  entry?: CloudProviderCredentialEntry | null,
): Record<string, unknown> {
  return {
    name: entry?.name || "",
    ...(entry?.values || {}),
  };
}

function hasMeaningfulValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "boolean") {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (value && typeof value === "object") {
    return Object.keys(value).length > 0;
  }

  return false;
}

function getEntryCompletion(
  fields: CloudProviderField[],
  values: Record<string, unknown>,
) {
  const requiredFields = fields.filter((field) => field.required);
  const completedRequired = requiredFields.filter((field) =>
    hasMeaningfulValue(values[field.name])
  ).length;
  const completedFields = fields.filter((field) =>
    hasMeaningfulValue(values[field.name])
  ).length;

  return {
    requiredCount: requiredFields.length,
    completedRequired,
    totalFieldCount: fields.length,
    completedFields,
  };
}

type EntryStatus = "configured" | "incomplete";
type ProviderStatus = "configured" | "incomplete" | "unconfigured" | "loading" | "error";

function getEntryStatus(
  fields: CloudProviderField[],
  entry: CloudProviderCredentialEntry,
): EntryStatus {
  const completion = getEntryCompletion(fields, buildEntryFormValues(entry));
  return completion.completedRequired === completion.requiredCount
    ? "configured"
    : "incomplete";
}

function getProviderStatus(args: {
  fields: CloudProviderField[];
  entries: CloudProviderCredentialEntry[];
  ready: boolean;
  error: string;
}): ProviderStatus {
  if (args.error) {
    return "error";
  }

  if (!args.ready) {
    return "loading";
  }

  if (args.entries.length === 0) {
    return "unconfigured";
  }

  return args.entries.every((entry) => getEntryStatus(args.fields, entry) === "configured")
    ? "configured"
    : "incomplete";
}

function getStatusMeta(
  status: ProviderStatus | EntryStatus,
  t: ReturnType<typeof useTranslation>["t"],
) {
  switch (status) {
    case "configured":
      return {
        label: t("cloud.dns.status.configured", "Configured"),
        variant: "success" as const,
      };
    case "incomplete":
      return {
        label: t("cloud.dns.status.incomplete", "Incomplete"),
        variant: "warning" as const,
      };
    case "loading":
      return {
        label: t("cloud.dns.status.loading", "Loading"),
        variant: "info" as const,
      };
    case "error":
      return {
        label: t("cloud.dns.status.error", "Error"),
        variant: "destructive" as const,
      };
    default:
      return {
        label: t("cloud.dns.status.unconfigured", "Unconfigured"),
        variant: "outline" as const,
      };
  }
}

function getProviderSummaryItems(
  entries: CloudProviderCredentialEntry[],
  fields: CloudProviderField[],
  t: ReturnType<typeof useTranslation>["t"],
) {
  const configuredCount = entries.filter(
    (entry) => getEntryStatus(fields, entry) === "configured",
  ).length;
  const incompleteCount = entries.length - configuredCount;

  return [
    t("cloud.dns.summary.credential_sets", "{{count}} credential sets", {
      count: entries.length,
    }),
    t("cloud.dns.summary.ready_entries", "{{count}} ready", {
      count: configuredCount,
    }),
    t("cloud.dns.summary.incomplete_entries", "{{count}} incomplete", {
      count: incompleteCount,
    }),
  ];
}

function splitEntryFormValues(
  fields: CloudProviderField[],
  values: Record<string, unknown>,
) {
  let name = "";
  const credentialValues: Record<string, unknown> = {};

  fields.forEach((field) => {
    const rawValue = values[field.name];
    if (rawValue === undefined || rawValue === null) {
      return;
    }

    if (field.name === "name") {
      name = String(rawValue).trim();
      return;
    }

    if (typeof rawValue === "string") {
      const trimmed = rawValue.trim();
      if (trimmed.length > 0) {
        credentialValues[field.name] = trimmed;
      }
      return;
    }

    credentialValues[field.name] = rawValue;
  });

  return {
    name,
    values: credentialValues,
  };
}

type ProviderDialogState = {
  provider: string;
  entryId: string | null;
  values: Record<string, unknown>;
};

type CloudDnsProviderSectionProps = {
  className?: string;
};

export default function CloudDnsProviderSection({
  className,
}: CloudDnsProviderSectionProps) {
  const { t } = useTranslation();
  const { confirm, dialog } = useWarningDialog();
  const [providerDefs, setProviderDefs] = React.useState<Record<string, CloudProviderField[]>>({});
  const [providerList, setProviderList] = React.useState<string[]>([]);
  const [definitionLoading, setDefinitionLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [providerEntriesMap, setProviderEntriesMap] = React.useState<
    Record<string, CloudProviderCredentialEntry[]>
  >({});
  const [providerReadyMap, setProviderReadyMap] = React.useState<Record<string, boolean>>({});
  const [providerErrorMap, setProviderErrorMap] = React.useState<Record<string, string>>({});
  const [dialogState, setDialogState] = React.useState<ProviderDialogState | null>(null);

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
      setProviderEntriesMap({});
      setProviderReadyMap({});
      setProviderErrorMap({});
      return;
    }

    let active = true;

    const loadProviderEntries = async (provider: string) => {
      setProviderReadyMap((previous) => ({ ...previous, [provider]: false }));
      setProviderErrorMap((previous) => ({ ...previous, [provider]: "" }));

      try {
        const entries = await getCloudProviderEntries(provider);
        if (!active) return;
        setProviderEntriesMap((previous) => ({ ...previous, [provider]: entries }));
      } catch (loadError) {
        if (!active) return;
        setProviderEntriesMap((previous) => ({ ...previous, [provider]: [] }));
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
      void loadProviderEntries(provider);
    });

    return () => {
      active = false;
    };
  }, [providerList]);

  const persistProviderEntries = React.useCallback(async (
    provider: string,
    entries: CloudProviderCredentialEntry[],
    successMessage: string,
  ) => {
    try {
      const savedEntries = await saveCloudProviderEntries(provider, entries);
      setProviderEntriesMap((previous) => ({ ...previous, [provider]: savedEntries }));
      setProviderErrorMap((previous) => ({ ...previous, [provider]: "" }));
      toast.success(successMessage);
      return savedEntries;
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : String(saveError);
      setProviderErrorMap((previous) => ({ ...previous, [provider]: message }));
      toast.error(message);
      throw saveError;
    }
  }, []);

  const openCreateDialog = (provider: string) => {
    setDialogState({
      provider,
      entryId: null,
      values: buildEntryFormValues(),
    });
  };

  const openEditDialog = (provider: string, entry: CloudProviderCredentialEntry) => {
    setDialogState({
      provider,
      entryId: entry.id,
      values: buildEntryFormValues(entry),
    });
  };

  const closeDialog = () => {
    setDialogState(null);
  };

  const handleDeleteEntry = async (
    provider: string,
    entry: CloudProviderCredentialEntry,
  ) => {
    const confirmed = await confirm({
      tone: "destructive",
      title: t("cloud.dns.delete_confirm_title", "Delete credential"),
      description: t(
        "cloud.dns.delete_confirm_description",
        "Delete credential \"{{name}}\" from {{provider}}? This only removes the saved credential profile.",
        {
          name: entry.name,
          provider: formatProviderLabel(provider),
        },
      ),
      confirmLabel: t("common.delete", "Delete"),
      cancelLabel: t("common.cancel", "Cancel"),
    });
    if (!confirmed) {
      return;
    }

    const nextEntries = (providerEntriesMap[provider] || []).filter(
      (item) => item.id !== entry.id,
    );

    await persistProviderEntries(
      provider,
      nextEntries,
      t("cloud.dns.delete_success", "Credential deleted"),
    );
  };

  const hasPreferredProvider = providerList.some(isPreferredDnsProvider);
  const totalCredentialCount = providerList.reduce(
    (count, provider) => count + (providerEntriesMap[provider]?.length || 0),
    0,
  );
  const providerStatusMap = Object.fromEntries(
    providerList.map((provider) => {
      const fields = getEditableProviderFields(provider, providerDefs[provider] || []);
      const entries = providerEntriesMap[provider] || [];
      return [
        provider,
        getProviderStatus({
          fields,
          entries,
          ready: Boolean(providerReadyMap[provider]),
          error: providerErrorMap[provider] || "",
        }),
      ];
    }),
  ) as Record<string, ProviderStatus>;
  const configuredProviderCount = providerList.filter(
    (provider) => providerStatusMap[provider] === "configured",
  ).length;
  const incompleteProviderCount = providerList.filter(
    (provider) => providerStatusMap[provider] === "incomplete",
  ).length;

  const activeProvider = dialogState?.provider || "";
  const activeProviderLabel = activeProvider ? formatProviderLabel(activeProvider) : "";
  const activeProviderKey = activeProvider ? getProviderTranslationKey(activeProvider) : "";
  const activeProviderFields = activeProvider
    ? getEditableProviderFields(activeProvider, providerDefs[activeProvider] || [])
    : [];
  const activeProviderEntries = activeProvider ? (providerEntriesMap[activeProvider] || []) : [];

  return (
    <>
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40",
          className,
        )}
      >
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {t("cloud.dns.title", "DNS Providers")}
            </div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t(
                "cloud.dns.description",
                "Configure DNS service providers here so Komari can reuse their credentials later when it needs to create or update domain records.",
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
                  "You can save multiple named credential profiles for each DNS provider here.",
                )}
              />

              <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-slate-200 pb-1 text-[13px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {t("cloud.dns.overview.providers", "Providers")}:
                  </span>
                  <span className="text-slate-900 dark:text-slate-100">{providerList.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {t("cloud.dns.overview.credentials", "Credentials")}:
                  </span>
                  <span className="text-slate-900 dark:text-slate-100">{totalCredentialCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {t("cloud.dns.overview.configured", "Configured")}:
                  </span>
                  <span className="text-slate-900 dark:text-slate-100">
                    {configuredProviderCount}
                    {incompleteProviderCount > 0
                      ? t("cloud.dns.overview.incomplete_suffix", " ({{count}} incomplete)", {
                        count: incompleteProviderCount,
                      })
                      : null}
                  </span>
                </div>
              </div>

              <div className="grid gap-4">
                {providerList.map((provider) => {
                  const providerLabel = formatProviderLabel(provider);
                  const translationKey = getProviderTranslationKey(provider);
                  const providerEntries = providerEntriesMap[provider] || [];
                  const providerReady = Boolean(providerReadyMap[provider]);
                  const providerError = providerErrorMap[provider] || "";
                  const providerFields = getEditableProviderFields(
                    provider,
                    providerDefs[provider] || [],
                  );
                  const providerStatus = providerStatusMap[provider];
                  const providerStatusMeta = getStatusMeta(providerStatus, t);
                  const accent = getProviderAccent(provider);
                  const summaryItems = providerError
                    ? [t("cloud.dns.summary.load_failed", "Saved values could not be loaded")]
                    : providerReady
                      ? getProviderSummaryItems(providerEntries, providerFields, t)
                      : [t("cloud.dns.summary.loading", "Loading saved values...")];

                  return (
                    <div
                      key={provider}
                      className={cn("rounded-xl border px-4 py-4", accent.cardClassName)}
                    >
                      <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-800/80">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold tracking-[0.18em]",
                                accent.iconClassName,
                              )}
                            >
                              {accent.icon}
                            </div>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {providerLabel}
                                </div>
                                {isPreferredDnsProvider(provider) ? (
                                  <Badge variant="info">
                                    {t("cloud.dns.recommended", "Recommended")}
                                  </Badge>
                                ) : null}
                              </div>
                              <div className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                                {t(
                                  `cloud.dns.providers.${translationKey}.description`,
                                  "Store multiple named credential sets here. Domain binding will be selected later when the record is actually used.",
                                )}
                              </div>
                            </div>
                          </div>

                          <Badge variant={providerStatusMeta.variant}>
                            {providerStatusMeta.label}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {summaryItems.map((item, index) => (
                            <div
                              key={`${provider}-${index}`}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>

                      {providerError ? (
                        <WarningAlert
                          className="mt-4"
                          tone="warning"
                          description={providerError}
                        />
                      ) : null}

                      {!providerReady ? (
                        <div className="mt-4">
                          <Loading text="" />
                        </div>
                      ) : (
                        <>
                          <div className="mt-4 space-y-3">
                            {providerEntries.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-400">
                                {t(
                                  "cloud.dns.empty_entries",
                                  "No credential profiles saved for this provider yet.",
                                )}
                              </div>
                            ) : (
                              providerEntries.map((entry) => {
                                const entryStatus = getEntryStatus(providerFields, entry);
                                const entryStatusMeta = getStatusMeta(entryStatus, t);
                                const entryFormValues = buildEntryFormValues(entry);
                                const credentialFields = providerFields.filter(
                                  (field) => field.name !== "name",
                                );
                                const readyCredentialCount = credentialFields.filter((field) =>
                                  hasMeaningfulValue(entryFormValues[field.name])
                                ).length;

                                return (
                                  <div
                                    key={entry.id}
                                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60"
                                  >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                      <div className="min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                            {entry.name}
                                          </div>
                                          <Badge variant={entryStatusMeta.variant}>
                                            {entryStatusMeta.label}
                                          </Badge>
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                          {t(
                                            "cloud.dns.summary.credentials_ready",
                                            "{{filled}} / {{total}} credential fields ready",
                                            {
                                              filled: readyCredentialCount,
                                              total: credentialFields.length,
                                            },
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => openEditDialog(provider, entry)}
                                        >
                                          {t("common.edit", "Edit")}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => void handleDeleteEntry(provider, entry)}
                                        >
                                          {t("common.delete", "Delete")}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              {t(
                                "cloud.dns.dialog.credentials_only_hint",
                                "This page only stores config names and credentials. Domain or zone binding will be selected later.",
                              )}
                            </div>
                            <Button
                              size="sm"
                              disabled={Boolean(providerError)}
                              onClick={() => openCreateDialog(provider)}
                            >
                              {t("cloud.dns.add_entry", "Add Credential")}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={Boolean(dialogState)} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-slate-200 bg-white sm:max-w-2xl dark:border-slate-800 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle>
              {dialogState?.entryId
                ? t("cloud.dns.dialog.edit_entry_title", "Edit {{provider}} Credential", {
                  provider: activeProviderLabel,
                })
                : t("cloud.dns.dialog.add_entry_title", "Add {{provider}} Credential", {
                  provider: activeProviderLabel,
                })}
            </DialogTitle>
            <DialogDescription>
              {t(
                "cloud.dns.dialog.description",
                "Only config names and provider credentials are stored here. Domain binding will be selected later when DNS automation is actually used.",
              )}
            </DialogDescription>
          </DialogHeader>

          {dialogState ? (
            <>
              <WarningAlert
                tone="info"
                description={t(
                  "cloud.dns.dialog.credentials_only_hint",
                  "This page only stores config names and credentials. Domain or zone binding will be selected later.",
                )}
              />

              {renderProviderInputs({
                currentProvider: activeProvider,
                providerDefs: { [activeProvider]: activeProviderFields },
                providerValues: dialogState.values,
                translationPrefix: `cloud.dns.providers.${activeProviderKey}`,
                title: t("cloud.dns.dialog.form_title", "Credentials"),
                description: t(
                  "cloud.dns.dialog.form_description",
                  "Save a display name and the credentials Komari should use for this DNS provider.",
                ),
                footer: getProviderFooter(activeProvider, t),
                collapsible: false,
                setProviderValues: (updater) => {
                  setDialogState((previous) => {
                    if (!previous) return previous;
                    return {
                      ...previous,
                      values: updater(previous.values),
                    };
                  });
                },
                handleSave: async (values) => {
                  const nextEntry = splitEntryFormValues(activeProviderFields, values);
                  const nextEntries = [...activeProviderEntries];
                  if (dialogState.entryId) {
                    const editIndex = nextEntries.findIndex((entry) => entry.id === dialogState.entryId);
                    if (editIndex >= 0) {
                      nextEntries[editIndex] = {
                        id: nextEntries[editIndex].id,
                        name: nextEntry.name,
                        values: nextEntry.values,
                      };
                    }
                  } else {
                    nextEntries.push({
                      id: "",
                      name: nextEntry.name,
                      values: nextEntry.values,
                    });
                  }

                  await persistProviderEntries(
                    activeProvider,
                    nextEntries,
                    t("cloud.dns.entry_save_success", "Credential saved"),
                  );
                  closeDialog();
                },
                t,
              })}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {dialog}
    </>
  );
}

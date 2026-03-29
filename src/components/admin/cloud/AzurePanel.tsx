import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CheckCircle2,
  Eye,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  RotateCcw,
  Terminal,
  Trash2,
} from "lucide-react";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import CloudInstanceScriptDialog, { type CloudInstanceScriptTarget } from "@/components/admin/cloud/CloudInstanceScriptDialog";
import {
  Badge,
  Button,
  Checkbox,
  CloudCopyBlock,
  CloudDetailItem,
  cloudDialogContentClassName,
  cloudDialogWideContentClassName,
  cloudLongTextClassName,
  cloudPanelBodyTextClassName,
  cloudPanelCardClassName,
  cloudPanelDescriptionClassName,
  cloudPanelFieldLabelClassName,
  cloudPanelHeaderClassName,
  cloudPanelSectionClassName,
  cloudPanelTitleClassName,
  Dialog,
  Flex,
  Select,
  TextArea,
  TextField,
} from "@/components/admin/cloud/cloud-ui";
import Loading from "@/components/loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WarningAlert } from "@/components/ui/warning-alert";
import { useWarningDialog } from "@/components/ui/warning-dialog";
import {
  checkAzureCredentials,
  createAzureInstance,
  deleteAzureCredential,
  deleteAzureInstance,
  getAzureAccount,
  getAzureCatalog,
  getAzureCredentialSecret,
  getAzureCredentials,
  getAzureInstanceDetail,
  listAzureInstances,
  postAzureInstanceAction,
  saveAzureCredentials,
  setAzureActiveCredential,
  setAzureActiveLocation,
  type AzureAccount,
  type AzureCatalog,
  type AzureCredentialInput,
  type AzureCredentialPool,
  type AzureCredentialRecord,
  type AzureCredentialSecret,
  type AzureImageReference,
  type AzureInstance,
  type AzureInstanceDetail,
  type AzureVMSku,
  type CreateAzureInstanceInput,
} from "@/lib/cloudAzure";
import { getCloudStatusLabel } from "@/lib/cloudStatus";

type CredentialSecretState = {
  secret: AzureCredentialSecret;
};

type AzureImagePreset = AzureImageReference & {
  id: string;
  label: string;
};

type AzureCreateFormState = Omit<CreateAzureInstanceInput, "image"> & {
  image_preset: string;
  image_publisher: string;
  image_offer: string;
  image_sku: string;
  image_version: string;
  auth_mode: "password" | "ssh";
};

const azureImagePresets: AzureImagePreset[] = [
  {
    id: "ubuntu-2404",
    label: "Ubuntu Server 24.04 LTS",
    publisher: "Canonical",
    offer: "ubuntu-24_04-lts",
    sku: "server",
    version: "latest",
  },
  {
    id: "ubuntu-2204",
    label: "Ubuntu Server 22.04 LTS",
    publisher: "Canonical",
    offer: "0001-com-ubuntu-server-jammy",
    sku: "22_04-lts-gen2",
    version: "latest",
  },
  {
    id: "debian-12",
    label: "Debian 12",
    publisher: "Debian",
    offer: "debian-12",
    sku: "12",
    version: "latest",
  },
  {
    id: "rocky-9",
    label: "Rocky Linux 9",
    publisher: "erockyenterprisesoftwarefoundationinc1653071250513",
    offer: "rockylinux-9",
    sku: "9-gen2",
    version: "latest",
  },
  {
    id: "almalinux-9",
    label: "AlmaLinux 9",
    publisher: "almalinux",
    offer: "almalinux-x86_64",
    sku: "9-gen2",
    version: "latest",
  },
];

const initialAzureImagePreset = azureImagePresets[0];

const initialCreateForm: AzureCreateFormState = {
  name: "",
  resource_group: "",
  size: "",
  admin_username: "azureuser",
  admin_password: "",
  ssh_public_key: "",
  user_data: "",
  public_ip: true,
  auto_connect: true,
  auto_connect_group: "",
  image_preset: initialAzureImagePreset.id,
  image_publisher: initialAzureImagePreset.publisher,
  image_offer: initialAzureImagePreset.offer,
  image_sku: initialAzureImagePreset.sku,
  image_version: initialAzureImagePreset.version || "latest",
  auth_mode: "password",
};

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

function hasActiveCredential(pool: AzureCredentialPool | null) {
  return Boolean(pool?.active_credential_id);
}

function getActiveCredential(pool: AzureCredentialPool | null) {
  return pool?.credentials.find((credential) => credential.id === pool.active_credential_id) || null;
}

function normalizeLocation(location: string) {
  return location.trim().toLowerCase();
}

function findImportSeparator(line: string) {
  for (const separator of ["|", ",", "\t"]) {
    if (line.includes(separator)) {
      return separator;
    }
  }
  return "";
}

function parseCredentialImports(text: string): AzureCredentialInput[] {
  const lines = text.split(/\r?\n/);
  const credentials: AzureCredentialInput[] = [];
  const seen = new Set<string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = findImportSeparator(line);
    if (!separator) continue;

    const parts = line.split(separator).map((part) => part.trim());
    if (parts.length < 5) continue;

    const [name, tenantId, clientId, clientSecret, subscriptionId, defaultLocation] = parts;
    const key = `${tenantId}|${clientId}|${subscriptionId}`;
    if (!tenantId || !clientId || !clientSecret || !subscriptionId || seen.has(key)) continue;
    seen.add(key);

    credentials.push({
      name,
      tenant_id: tenantId,
      client_id: clientId,
      client_secret: clientSecret,
      subscription_id: subscriptionId,
      default_location: normalizeLocation(defaultLocation || ""),
    });
  }

  return credentials;
}

function getCredentialStatusColor(status: string) {
  switch (status) {
    case "healthy":
      return "green";
    case "error":
      return "red";
    default:
      return "gray";
  }
}

function getInstanceStateColor(instance: AzureInstance) {
  const value = (instance.power_state || instance.provisioning_state).trim().toLowerCase();
  if (value === "running") return "green";
  if (value === "deallocated" || value === "stopped") return "amber";
  if (value === "succeeded") return "blue";
  if (value.includes("fail")) return "red";
  return "gray";
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatList(values: string[]) {
  return values.length ? values.join(", ") : "-";
}

function getLocationLabel(catalog: AzureCatalog | null, location: string) {
  const normalized = normalizeLocation(location);
  const match = catalog?.locations.find((item) => normalizeLocation(item.name) === normalized) || null;
  if (!match) return normalized || "-";
  return match.regionalDisplayName || match.displayName || match.name;
}

function getInstanceAddresses(instance: AzureInstance) {
  return Array.from(new Set([...instance.public_ips, ...instance.private_ips].filter(Boolean)));
}

function getDefaultGroupHint(credentialName: string) {
  const normalized = credentialName.trim() || "default";
  return `azure/${normalized}`;
}

function buildCreateFormFromPreset(presetId: string, previous?: AzureCreateFormState): AzureCreateFormState {
  const preset = azureImagePresets.find((item) => item.id === presetId) || initialAzureImagePreset;
  return {
    ...(previous || initialCreateForm),
    image_preset: preset.id,
    image_publisher: preset.publisher,
    image_offer: preset.offer,
    image_sku: preset.sku,
    image_version: preset.version || "latest",
  };
}

function formatAzureSizeOption(size: AzureVMSku) {
  const parts = [size.name];
  if (size.vcpus > 0) parts.push(`${size.vcpus} vCPU`);
  if (size.memory_gb > 0) parts.push(`${size.memory_gb.toFixed(1)} GB`);
  return parts.join(" / ");
}

function getDefaultAzureSize(catalog: AzureCatalog | null) {
  const preferred = ["Standard_B1s", "Standard_B2s", "Standard_D2s_v5"];
  for (const name of preferred) {
    const match = catalog?.sizes.find((item) => item.name === name);
    if (match) return match.name;
  }
  return catalog?.sizes[0]?.name || "";
}

function buildScriptTarget(
  t: ReturnType<typeof useTranslation>["t"],
  instance: AzureInstance,
  credentialName: string,
): CloudInstanceScriptTarget {
  return {
    providerLabel: t("cloud.providers.azure.title", "Azure"),
    instanceName: instance.name,
    instanceIdentifier: instance.resource_id || instance.instance_id,
    addresses: getInstanceAddresses(instance),
    groupHint: getDefaultGroupHint(credentialName),
  };
}

export default function AzurePanel() {
  const { t } = useTranslation();
  const { confirm, dialog: warningDialog } = useWarningDialog();

  const [loading, setLoading] = React.useState(true);
  const [resourceLoading, setResourceLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");
  const [credentialPool, setCredentialPool] = React.useState<AzureCredentialPool | null>(null);
  const [account, setAccount] = React.useState<AzureAccount | null>(null);
  const [catalog, setCatalog] = React.useState<AzureCatalog | null>(null);
  const [instances, setInstances] = React.useState<AzureInstance[]>([]);
  const [credentialImportOpen, setCredentialImportOpen] = React.useState(false);
  const [credentialImportText, setCredentialImportText] = React.useState("");
  const [savingCredentials, setSavingCredentials] = React.useState(false);
  const [checkingCredentialsState, setCheckingCredentialsState] = React.useState(false);
  const [locationUpdating, setLocationUpdating] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createSubmitting, setCreateSubmitting] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<AzureCreateFormState>(() => ({ ...initialCreateForm }));
  const [workingInstanceId, setWorkingInstanceId] = React.useState<string | null>(null);
  const [credentialSecret, setCredentialSecret] = React.useState<CredentialSecretState | null>(null);
  const [detailInstance, setDetailInstance] = React.useState<AzureInstance | null>(null);
  const [detailData, setDetailData] = React.useState<AzureInstanceDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [scriptTarget, setScriptTarget] = React.useState<CloudInstanceScriptTarget | null>(null);

  const activeCredential = React.useMemo(
    () => getActiveCredential(credentialPool),
    [credentialPool],
  );

  const stats = React.useMemo(() => {
    const runningCount = instances.filter((instance) => instance.power_state.trim().toLowerCase() === "running").length;
    const withPublicIP = instances.filter((instance) => instance.public_ips.length > 0).length;
    return [
      {
        label: t("cloud.providers.azure.credentials_label", "Credentials"),
        value: credentialPool?.credentials.length || 0,
        tone: "slate" as const,
      },
      {
        label: t("cloud.providers.azure.instances_label", "Virtual Machines"),
        value: instances.length,
        tone: "blue" as const,
      },
      {
        label: t("cloud.providers.azure.running_label", "Running"),
        value: runningCount,
        tone: "emerald" as const,
      },
      {
        label: t("cloud.providers.azure.public_ip_label", "With Public IP"),
        value: withPublicIP,
        tone: "amber" as const,
      },
    ];
  }, [credentialPool, instances, t]);

  const loadResources = React.useCallback(async () => {
    if (!hasActiveCredential(credentialPool)) {
      setAccount(null);
      setCatalog(null);
      setInstances([]);
      return;
    }

    setResourceLoading(true);
    try {
      const [nextAccount, nextCatalog, nextInstances] = await Promise.all([
        getAzureAccount(),
        getAzureCatalog(),
        listAzureInstances(),
      ]);
      setAccount(nextAccount);
      setCatalog(nextCatalog);
      setInstances(nextInstances);
      setLoadError("");
    } catch (error) {
      setLoadError(toErrorMessage(error));
      setAccount(null);
      setCatalog(null);
      setInstances([]);
    } finally {
      setResourceLoading(false);
    }
  }, [credentialPool]);

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    try {
      const nextPool = await getAzureCredentials();
      setCredentialPool(nextPool);
      setLoadError("");
      if (!hasActiveCredential(nextPool)) {
        setAccount(null);
        setCatalog(null);
        setInstances([]);
        return;
      }

      const [nextAccount, nextCatalog, nextInstances] = await Promise.all([
        getAzureAccount(),
        getAzureCatalog(),
        listAzureInstances(),
      ]);
      setAccount(nextAccount);
      setCatalog(nextCatalog);
      setInstances(nextInstances);
    } catch (error) {
      setLoadError(toErrorMessage(error));
      setCredentialPool(null);
      setAccount(null);
      setCatalog(null);
      setInstances([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadAll();
  }, [loadAll]);

  React.useEffect(() => {
    if (!catalog?.sizes.length) return;
    setCreateForm((previous) => {
      if (previous.size && catalog.sizes.some((item) => item.name === previous.size)) {
        return previous;
      }
      return {
        ...previous,
        size: getDefaultAzureSize(catalog),
      };
    });
  }, [catalog]);

  const handleCopy = React.useCallback(async (text: string, successMessage: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  }, []);

  const handleImportCredentials = async () => {
    const credentials = parseCredentialImports(credentialImportText);
    if (!credentials.length) {
      toast.error(t("cloud.providers.azure.import_empty", "No valid Azure credentials found"));
      return;
    }

    setSavingCredentials(true);
    try {
      const nextPool = await saveAzureCredentials({ credentials });
      setCredentialPool(nextPool);
      setCredentialImportText("");
      setCredentialImportOpen(false);
      toast.success(
        t("cloud.providers.azure.import_success", {
          count: credentials.length,
          defaultValue: `Imported ${credentials.length} Azure credentials`,
        }),
      );
      if (hasActiveCredential(nextPool)) {
        await loadAll();
      } else {
        setAccount(null);
        setCatalog(null);
        setInstances([]);
      }
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleCheckCredentials = async () => {
    setCheckingCredentialsState(true);
    try {
      const nextPool = await checkAzureCredentials();
      setCredentialPool(nextPool);
      toast.success(t("cloud.providers.azure.check_success", "Azure credentials checked"));
      if (hasActiveCredential(nextPool)) {
        await loadResources();
      }
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setCheckingCredentialsState(false);
    }
  };

  const handleSelectCredential = async (credential: AzureCredentialRecord) => {
    try {
      const nextPool = await setAzureActiveCredential(credential.id);
      setCredentialPool(nextPool);
      await loadAll();
    } catch (error) {
      toast.error(toErrorMessage(error));
    }
  };

  const handleSetLocation = async (location: string) => {
    setLocationUpdating(true);
    try {
      const nextPool = await setAzureActiveLocation(location);
      const nextCatalog = await getAzureCatalog();
      setCredentialPool(nextPool);
      setCatalog(nextCatalog);
      setAccount((current) => current
        ? { ...current, active_location: normalizeLocation(location) }
        : current);
      toast.success(t("cloud.providers.azure.location_updated", "Active Azure location updated"));
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setLocationUpdating(false);
    }
  };

  const handleCreateInstance = async () => {
    setCreateSubmitting(true);
    try {
      const detail = await createAzureInstance({
        name: createForm.name || "",
        resource_group: createForm.resource_group || "",
        size: createForm.size,
        admin_username: createForm.admin_username || "azureuser",
        admin_password: createForm.auth_mode === "password" ? createForm.admin_password || "" : "",
        ssh_public_key: createForm.auth_mode === "ssh" ? createForm.ssh_public_key || "" : "",
        user_data: createForm.user_data || "",
        public_ip: createForm.public_ip,
        auto_connect: true,
        image: {
          publisher: createForm.image_publisher,
          offer: createForm.image_offer,
          sku: createForm.image_sku,
          version: createForm.image_version || "latest",
        },
      });
      toast.success(t("cloud.providers.azure.create_success", "Azure VM created"));
      setCreateOpen(false);
      setCreateForm({
        ...buildCreateFormFromPreset(initialAzureImagePreset.id),
        size: getDefaultAzureSize(catalog),
      });
      setDetailInstance(detail.instance);
      setDetailData(detail);
      await loadResources();
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleDeleteCredential = async (credential: AzureCredentialRecord) => {
    const confirmed = await confirm({
      title: t("cloud.providers.azure.delete_credential", "Delete Credential"),
      description: t("cloud.providers.azure.delete_credential_confirm", {
        name: credential.name,
        defaultValue: `Delete Azure credential "${credential.name}"?`,
      }),
      confirmLabel: t("cloud.providers.azure.delete_credential", "Delete Credential"),
      tone: "destructive",
    });
    if (!confirmed) return;

    try {
      const nextPool = await deleteAzureCredential(credential.id);
      setCredentialPool(nextPool);
      toast.success(t("cloud.providers.azure.delete_credential_success", "Azure credential deleted"));
      if (hasActiveCredential(nextPool)) {
        await loadAll();
      } else {
        setAccount(null);
        setCatalog(null);
        setInstances([]);
      }
    } catch (error) {
      toast.error(toErrorMessage(error));
    }
  };

  const handleViewCredential = async (credential: AzureCredentialRecord) => {
    try {
      const secret = await getAzureCredentialSecret(credential.id);
      setCredentialSecret({ secret });
    } catch (error) {
      toast.error(toErrorMessage(error));
    }
  };

  const handleOpenDetail = async (instance: AzureInstance) => {
    setDetailInstance(instance);
    setDetailLoading(true);
    try {
      const detail = await getAzureInstanceDetail(instance.instance_id);
      setDetailData(detail);
    } catch (error) {
      toast.error(toErrorMessage(error));
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleInstanceAction = async (
    instance: AzureInstance,
    type: "start" | "deallocate" | "restart",
  ) => {
    setWorkingInstanceId(instance.instance_id);
    try {
      await postAzureInstanceAction(instance.instance_id, type);
      toast.success(
        t(`cloud.providers.azure.action_${type}_success`, {
          defaultValue: `Azure VM ${type} request submitted`,
        }),
      );
      await loadResources();
      if (detailInstance?.instance_id === instance.instance_id) {
        await handleOpenDetail(instance);
      }
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setWorkingInstanceId(null);
    }
  };

  const handleDeleteInstance = async (instance: AzureInstance) => {
    const confirmed = await confirm({
      title: t("cloud.providers.azure.delete_instance", "Delete VM"),
      description: t("cloud.providers.azure.delete_instance_confirm", {
        name: instance.name,
        defaultValue: `Delete Azure VM "${instance.name}"? This action cannot be undone.`,
      }),
      confirmLabel: t("cloud.providers.azure.delete_instance", "Delete VM"),
      tone: "destructive",
    });
    if (!confirmed) return;

    setWorkingInstanceId(instance.instance_id);
    try {
      await deleteAzureInstance(instance.instance_id);
      toast.success(t("cloud.providers.azure.delete_instance_success", "Azure VM delete request submitted"));
      if (detailInstance?.instance_id === instance.instance_id) {
        setDetailInstance(null);
        setDetailData(null);
      }
      await loadResources();
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setWorkingInstanceId(null);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <AdminPageShell
        eyebrow={t("cloud.title", "Cloud")}
        title={t("cloud.providers.azure.title", "Azure")}
        description={t(
          "cloud.providers.azure.description",
          "Manage multiple Azure service principal credentials, inspect the active subscription, and operate virtual machines from one panel.",
        )}
        stats={stats}
        statsVariant="cards"
        actions={(
          <>
            <Button variant="outline" onClick={() => void loadAll()} disabled={resourceLoading}>
              <RefreshCw className={`mr-2 h-4 w-4${resourceLoading ? " animate-spin" : ""}`} />
              {t("cloud.refresh", "Refresh")}
            </Button>
            <Button onClick={() => setCreateOpen(true)} disabled={!activeCredential}>
              <Plus className="mr-2 h-4 w-4" />
              {t("cloud.providers.azure.create", "Create VM")}
            </Button>
            <Button onClick={() => setCredentialImportOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("cloud.providers.azure.import", "Import Credentials")}
            </Button>
          </>
        )}
      >
        {loadError ? (
          <WarningAlert
            tone="destructive"
            title={t("cloud.providers.azure.load_error_title", "Failed to load Azure resources")}
            description={loadError}
          />
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <section className={cloudPanelCardClassName}>
            <div className={cloudPanelHeaderClassName}>
              <Flex justify="between" align="center" wrap="wrap" gap="2">
                <div>
                  <div className={cloudPanelTitleClassName}>
                    {t("cloud.providers.azure.credentials", "Credentials")}
                  </div>
                  <div className={cloudPanelDescriptionClassName}>
                    {t(
                      "cloud.providers.azure.credentials_description",
                      "Save multiple Azure app credentials, choose the active subscription, and bulk-check whether they can still call the Azure Resource Manager API.",
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => void handleCheckCredentials()}
                  disabled={!credentialPool?.credentials.length || checkingCredentialsState}
                >
                  <CheckCircle2 className={`mr-2 h-4 w-4${checkingCredentialsState ? " animate-spin" : ""}`} />
                  {t("cloud.providers.azure.check", "Check")}
                </Button>
              </Flex>
            </div>
            <div className="p-5">
              {!credentialPool?.credentials.length ? (
                <div className={cloudPanelBodyTextClassName}>
                  {t("cloud.providers.azure.credentials_empty", "No Azure credentials saved yet")}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("cloud.table.name", "Name")}</TableHead>
                        <TableHead>{t("cloud.providers.azure.subscription", "Subscription")}</TableHead>
                        <TableHead>{t("cloud.table.region", "Region")}</TableHead>
                        <TableHead>{t("cloud.table.status", "Status")}</TableHead>
                        <TableHead>{t("cloud.providers.azure.checked_at", "Last Checked")}</TableHead>
                        <TableHead>{t("common.actions", "Actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {credentialPool.credentials.map((credential) => (
                        <TableRow key={credential.id}>
                          <TableCell className="align-top">
                            <div className={`font-medium ${cloudLongTextClassName}`}>
                              {credential.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {credential.masked_client_id || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className={cloudLongTextClassName}>
                              {credential.subscription_display_name || credential.subscription_id || "-"}
                            </div>
                            {credential.subscription_display_name && credential.subscription_id ? (
                              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {credential.subscription_id}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="align-top">
                            {getLocationLabel(catalog, credential.default_location)}
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="space-y-2">
                              <Badge color={getCredentialStatusColor(credential.last_status)}>
                                {getCloudStatusLabel(credential.last_status, t)}
                              </Badge>
                              {credential.is_active ? (
                                <div>
                                  <Badge color="blue">{t("cloud.active", "Active")}</Badge>
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            {formatDateTime(credential.last_checked_at)}
                            {credential.last_error ? (
                              <div className={`mt-1 text-xs text-red-600 dark:text-red-400 ${cloudLongTextClassName}`}>
                                {credential.last_error}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="align-top">
                            <Flex wrap="wrap" gap="2">
                              {!credential.is_active ? (
                                <Button variant="outline" size="sm" onClick={() => void handleSelectCredential(credential)}>
                                  {t("cloud.select", "Select")}
                                </Button>
                              ) : null}
                              <Button variant="outline" size="sm" onClick={() => void handleViewCredential(credential)}>
                                <Eye className="mr-1 h-3.5 w-3.5" />
                                {t("cloud.view", "View")}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => void handleDeleteCredential(credential)}>
                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                {t("cloud.delete", "Delete")}
                              </Button>
                            </Flex>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </section>

          <section className={cloudPanelCardClassName}>
            <div className={cloudPanelHeaderClassName}>
              <Flex justify="between" align="center" wrap="wrap" gap="2">
                <div>
                  <div className={cloudPanelTitleClassName}>
                    {t("cloud.providers.azure.account_snapshot", "Account Snapshot")}
                  </div>
                  <div className={cloudPanelDescriptionClassName}>
                    {t(
                      "cloud.providers.azure.account_snapshot_description",
                      "Shows the currently active Azure credential, subscription identity, and preferred location for future operations.",
                    )}
                  </div>
                </div>
                {catalog?.locations.length ? (
                  <div className="w-full sm:w-72">
                    <Select.Root
                      value={catalog.active_location || account?.active_location || activeCredential?.default_location || ""}
                      onValueChange={(value) => void handleSetLocation(value)}
                      disabled={locationUpdating}
                    >
                      <Select.Trigger placeholder={t("cloud.providers.azure.active_location", "Active Location")} />
                      <Select.Content>
                        {catalog.locations.map((location) => (
                          <Select.Item key={location.name} value={location.name}>
                            {location.regionalDisplayName || location.displayName || location.name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </div>
                ) : null}
              </Flex>
            </div>
            <div className="p-5">
              {!activeCredential || !account ? (
                <div className={cloudPanelBodyTextClassName}>
                  {t("cloud.providers.azure.no_active_credential", "Select an active Azure credential first")}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <CloudDetailItem
                    label={t("cloud.providers.azure.active_credential", "Active Credential")}
                    value={account.credential_name || activeCredential.name || "-"}
                  />
                  <CloudDetailItem
                    label={t("cloud.providers.azure.subscription", "Subscription")}
                    value={account.subscription_display_name || account.subscription_id || "-"}
                  />
                  <CloudDetailItem
                    label={t("cloud.providers.azure.subscription_state", "Subscription State")}
                    value={getCloudStatusLabel(account.subscription_state, t)}
                  />
                  <CloudDetailItem
                    label={t("cloud.providers.azure.tenant_id", "Tenant ID")}
                    value={account.tenant_id || "-"}
                  />
                  <CloudDetailItem
                    label={t("cloud.providers.azure.client_id", "Client ID")}
                    value={account.client_id || "-"}
                  />
                  <CloudDetailItem
                    label={t("cloud.providers.azure.active_location", "Active Location")}
                    value={getLocationLabel(catalog, account.active_location || activeCredential.default_location)}
                  />
                </div>
              )}
            </div>
          </section>
        </div>

        <section className={cloudPanelCardClassName}>
          <div className={cloudPanelHeaderClassName}>
            <Flex justify="between" align="center" wrap="wrap" gap="2">
              <div>
                <div className={cloudPanelTitleClassName}>
                  {t("cloud.providers.azure.instance_list", "Virtual Machines")}
                </div>
                <div className={cloudPanelDescriptionClassName}>
                  {t(
                    "cloud.providers.azure.instance_list_description",
                    "Lists all VMs under the current subscription. Open details to inspect network interfaces, disks, and runtime state.",
                  )}
                </div>
              </div>
              <Badge color="blue">{instances.length}</Badge>
            </Flex>
          </div>
          <div className="p-5">
            {!activeCredential ? (
              <div className={cloudPanelBodyTextClassName}>
                {t("cloud.providers.azure.no_active_credential", "Select an active Azure credential first")}
              </div>
            ) : !instances.length ? (
              <div className={cloudPanelBodyTextClassName}>
                {t("cloud.providers.azure.instances_empty", "No Azure virtual machines found")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("cloud.table.name", "Name")}</TableHead>
                      <TableHead>{t("cloud.providers.azure.resource_group", "Resource Group")}</TableHead>
                      <TableHead>{t("cloud.table.region", "Region")}</TableHead>
                      <TableHead>{t("cloud.table.status", "Status")}</TableHead>
                      <TableHead>{t("cloud.table.size", "Size")}</TableHead>
                      <TableHead>{t("cloud.table.ip", "Public IP")}</TableHead>
                      <TableHead>{t("cloud.providers.azure.private_ip", "Private IP")}</TableHead>
                      <TableHead>{t("common.actions", "Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instances.map((instance) => (
                      <TableRow key={instance.instance_id}>
                        <TableCell className="align-top">
                          <div className={`font-medium ${cloudLongTextClassName}`}>
                            {instance.name || "-"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {instance.os_type || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">{instance.resource_group || "-"}</TableCell>
                        <TableCell className="align-top">{getLocationLabel(catalog, instance.location)}</TableCell>
                        <TableCell className="align-top">
                          <Badge color={getInstanceStateColor(instance)}>
                            {getCloudStatusLabel(instance.power_state || instance.provisioning_state, t)}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top">{instance.size || "-"}</TableCell>
                        <TableCell className="align-top">{formatList(instance.public_ips)}</TableCell>
                        <TableCell className="align-top">{formatList(instance.private_ips)}</TableCell>
                        <TableCell className="align-top">
                          <Flex wrap="wrap" gap="2">
                            <Button variant="outline" size="sm" onClick={() => void handleOpenDetail(instance)}>
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              {t("cloud.view", "View")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setScriptTarget(buildScriptTarget(t, instance, activeCredential.name))}
                            >
                              <Terminal className="mr-1 h-3.5 w-3.5" />
                              {t("cloud.script.action", "Run Script")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={workingInstanceId === instance.instance_id}
                              onClick={() => void handleInstanceAction(instance, "start")}
                            >
                              <Power className="mr-1 h-3.5 w-3.5" />
                              {t("cloud.power_on", "Power On")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={workingInstanceId === instance.instance_id}
                              onClick={() => void handleInstanceAction(instance, "deallocate")}
                            >
                              <PowerOff className="mr-1 h-3.5 w-3.5" />
                              {t("cloud.power_off", "Power Off")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={workingInstanceId === instance.instance_id}
                              onClick={() => void handleInstanceAction(instance, "restart")}
                            >
                              <RotateCcw className="mr-1 h-3.5 w-3.5" />
                              {t("cloud.reboot", "Reboot")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={workingInstanceId === instance.instance_id}
                              onClick={() => void handleDeleteInstance(instance)}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              {t("cloud.delete", "Delete")}
                            </Button>
                          </Flex>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </section>
      </AdminPageShell>

      <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{t("cloud.providers.azure.create", "Create VM")}</Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
            {t(
              "cloud.providers.azure.create_description",
              "Create a Linux VM in the current active Azure location. Komari will automatically prepare the resource group network stack and bootstrap agent auto-connect.",
            )}
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
              {t("cloud.providers.azure.create_location_hint", {
                location: getLocationLabel(catalog, catalog?.active_location || account?.active_location || activeCredential?.default_location || ""),
                defaultValue: `Active location: ${getLocationLabel(catalog, catalog?.active_location || account?.active_location || activeCredential?.default_location || "")}`,
              })}
            </div>

            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.table.name", "Name")}
            </label>
            <TextField.Root
              value={createForm.name}
              placeholder={t("cloud.providers.azure.create_name_placeholder", "Leave empty to auto-generate a VM name")}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, name: event.target.value }))}
            />

            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.providers.azure.resource_group", "Resource Group")}
            </label>
            <TextField.Root
              value={createForm.resource_group || ""}
              placeholder={t("cloud.providers.azure.resource_group_placeholder", "Optional. Leave empty to auto-create a dedicated resource group")}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, resource_group: event.target.value }))}
            />

            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.form.image", "Image")}
            </label>
            <Select.Root
              value={createForm.image_preset}
              onValueChange={(value) => setCreateForm((previous) => buildCreateFormFromPreset(value, previous))}
            >
              <Select.Trigger placeholder={t("cloud.form.image_placeholder", "Select an image")} />
              <Select.Content>
                {azureImagePresets.map((preset) => (
                  <Select.Item key={preset.id} value={preset.id}>
                    {preset.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={cloudPanelFieldLabelClassName}>
                  {t("cloud.providers.azure.image_publisher", "Publisher")}
                </label>
                <TextField.Root
                  value={createForm.image_publisher}
                  onChange={(event) => setCreateForm((previous) => ({ ...previous, image_publisher: event.target.value }))}
                />
              </div>
              <div>
                <label className={cloudPanelFieldLabelClassName}>
                  {t("cloud.providers.azure.image_offer", "Offer")}
                </label>
                <TextField.Root
                  value={createForm.image_offer}
                  onChange={(event) => setCreateForm((previous) => ({ ...previous, image_offer: event.target.value }))}
                />
              </div>
              <div>
                <label className={cloudPanelFieldLabelClassName}>
                  {t("cloud.providers.azure.image_sku", "SKU")}
                </label>
                <TextField.Root
                  value={createForm.image_sku}
                  onChange={(event) => setCreateForm((previous) => ({ ...previous, image_sku: event.target.value }))}
                />
              </div>
              <div>
                <label className={cloudPanelFieldLabelClassName}>
                  {t("cloud.providers.azure.image_version", "Version")}
                </label>
                <TextField.Root
                  value={createForm.image_version || ""}
                  placeholder="latest"
                  onChange={(event) => setCreateForm((previous) => ({ ...previous, image_version: event.target.value }))}
                />
              </div>
            </div>

            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.form.size", "Size")}
            </label>
            <Select.Root
              value={createForm.size || getDefaultAzureSize(catalog)}
              onValueChange={(value) => setCreateForm((previous) => ({ ...previous, size: value }))}
            >
              <Select.Trigger placeholder={t("cloud.form.size_placeholder", "Select a size")} />
              <Select.Content>
                {(catalog?.sizes || []).map((size) => (
                  <Select.Item key={size.name} value={size.name}>
                    {formatAzureSizeOption(size)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <TextField.Root
              value={createForm.size}
              placeholder={t("cloud.providers.azure.size_manual_placeholder", "Or enter an Azure VM size manually")}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, size: event.target.value }))}
            />

            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.providers.azure.admin_username", "Admin Username")}
            </label>
            <TextField.Root
              value={createForm.admin_username || ""}
              placeholder="azureuser"
              onChange={(event) => setCreateForm((previous) => ({ ...previous, admin_username: event.target.value }))}
            />

            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.providers.azure.auth_mode", "Authentication")}
            </label>
            <Select.Root
              value={createForm.auth_mode}
              onValueChange={(value) =>
                setCreateForm((previous) => ({
                  ...previous,
                  auth_mode: value === "ssh" ? "ssh" : "password",
                }))
              }
            >
              <Select.Trigger placeholder={t("cloud.providers.azure.auth_mode", "Authentication")} />
              <Select.Content>
                <Select.Item value="password">{t("cloud.providers.azure.auth_password", "Password")}</Select.Item>
                <Select.Item value="ssh">{t("cloud.providers.azure.auth_ssh", "SSH Public Key")}</Select.Item>
              </Select.Content>
            </Select.Root>

            {createForm.auth_mode === "password" ? (
              <>
                <label className={cloudPanelFieldLabelClassName}>
                  {t("cloud.providers.azure.admin_password", "Admin Password")}
                </label>
                <TextField.Root
                  type="password"
                  value={createForm.admin_password || ""}
                  placeholder={t("cloud.providers.azure.admin_password_placeholder", "Use a strong password that meets Azure complexity requirements")}
                  onChange={(event) => setCreateForm((previous) => ({ ...previous, admin_password: event.target.value }))}
                />
              </>
            ) : (
              <>
                <label className={cloudPanelFieldLabelClassName}>
                  {t("cloud.providers.azure.ssh_public_key", "SSH Public Key")}
                </label>
                <TextArea
                  className="min-h-28 font-mono text-xs"
                  value={createForm.ssh_public_key || ""}
                  placeholder="ssh-ed25519 AAAA..."
                  onChange={(event) => setCreateForm((previous) => ({ ...previous, ssh_public_key: event.target.value }))}
                />
              </>
            )}

            <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
              <Checkbox
                checked={createForm.public_ip}
                onCheckedChange={(checked) =>
                  setCreateForm((previous) => ({ ...previous, public_ip: Boolean(checked) }))
                }
              />
              {t("cloud.providers.azure.public_ip_toggle", "Allocate a public IPv4 address and open inbound traffic by default")}
            </label>

            <Flex justify="end" gap="2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createSubmitting}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                onClick={() => {
                  void handleCreateInstance();
                }}
                disabled={
                  createSubmitting
                  || !createForm.size
                  || !createForm.image_publisher
                  || !createForm.image_offer
                  || !createForm.image_sku
                  || (createForm.auth_mode === "password" ? !createForm.admin_password : !createForm.ssh_public_key)
                }
              >
                {createSubmitting
                  ? t("cloud.creating", "Creating...")
                  : t("cloud.providers.azure.create", "Create VM")}
              </Button>
            </Flex>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={credentialImportOpen} onOpenChange={setCredentialImportOpen}>
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[80vh] overflow-y-auto`}>
          <Dialog.Title>{t("cloud.providers.azure.import_dialog_title", "Batch Import Azure Credentials")}</Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
            {t(
              "cloud.providers.azure.import_dialog_description",
              "One credential per line. Format: name,tenantId,clientId,clientSecret,subscriptionId[,defaultLocation].",
            )}
          </Dialog.Description>
          <TextArea
            className="mt-4 min-h-48 font-mono text-xs"
            value={credentialImportText}
            onChange={(event) => setCredentialImportText(event.target.value)}
            placeholder="team-a,tenant-id,client-id,client-secret,subscription-id,eastus"
          />
          <Flex justify="end" gap="2" className="mt-4">
            <Dialog.Close>
              <Button variant="outline">{t("common.cancel", "Cancel")}</Button>
            </Dialog.Close>
            <Button onClick={() => void handleImportCredentials()} disabled={savingCredentials}>
              {savingCredentials
                ? t("cloud.providers.azure.importing", "Importing...")
                : t("cloud.providers.azure.import", "Import Credentials")}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={Boolean(credentialSecret)} onOpenChange={(open) => !open && setCredentialSecret(null)}>
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[80vh] overflow-y-auto`}>
          <Dialog.Title>{t("cloud.providers.azure.credential_dialog_title", "Credential Details")}</Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
            {t(
              "cloud.providers.azure.credential_dialog_description",
              "View the full Azure app credential only when you need to copy or verify it.",
            )}
          </Dialog.Description>
          {credentialSecret ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <CloudDetailItem label={t("cloud.table.name", "Name")} value={credentialSecret.secret.credential_name || "-"} />
                <CloudDetailItem label={t("cloud.providers.azure.subscription", "Subscription")} value={credentialSecret.secret.subscription_display_name || credentialSecret.secret.subscription_id || "-"} />
                <CloudDetailItem label={t("cloud.providers.azure.tenant_id", "Tenant ID")} value={credentialSecret.secret.tenant_id || "-"} />
                <CloudDetailItem label={t("cloud.providers.azure.default_location", "Default Location")} value={credentialSecret.secret.default_location || "-"} />
              </div>

              <CloudCopyBlock
                title={t("cloud.providers.azure.client_id", "Client ID")}
                copyLabel={t("common.copy", "Copy")}
                onCopy={() => void handleCopy(credentialSecret.secret.client_id, t("cloud.providers.azure.copy_client_id", "Client ID copied"))}
              >
                <div className={`rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs dark:border-slate-800 dark:bg-slate-900/50 ${cloudLongTextClassName}`}>
                  {credentialSecret.secret.client_id || "-"}
                </div>
              </CloudCopyBlock>

              <CloudCopyBlock
                title={t("cloud.providers.azure.client_secret", "Client Secret")}
                copyLabel={t("common.copy", "Copy")}
                onCopy={() => void handleCopy(credentialSecret.secret.client_secret, t("cloud.providers.azure.copy_client_secret", "Client secret copied"))}
              >
                <div className={`rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs dark:border-slate-800 dark:bg-slate-900/50 ${cloudLongTextClassName}`}>
                  {credentialSecret.secret.client_secret || "-"}
                </div>
              </CloudCopyBlock>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={Boolean(detailInstance)} onOpenChange={(open) => !open && setDetailInstance(null)}>
        <Dialog.Content className={`${cloudDialogWideContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{detailInstance?.name || t("cloud.providers.azure.title", "Azure")}</Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
            {t(
              "cloud.providers.azure.detail_description",
              "View the selected Azure virtual machine details from the current active credential.",
            )}
          </Dialog.Description>
          {detailLoading ? (
            <div className="py-8">
              <Loading />
            </div>
          ) : detailData ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <CloudDetailItem label={t("cloud.table.name", "Name")} value={detailData.instance.name || "-"} />
                <CloudDetailItem label={t("cloud.providers.azure.resource_group", "Resource Group")} value={detailData.instance.resource_group || "-"} />
                <CloudDetailItem label={t("cloud.table.region", "Region")} value={getLocationLabel(catalog, detailData.instance.location)} />
                <CloudDetailItem label={t("cloud.table.status", "Status")} value={getCloudStatusLabel(detailData.instance.power_state || detailData.instance.provisioning_state, t)} />
                <CloudDetailItem label={t("cloud.table.size", "Size")} value={detailData.instance.size || "-"} />
                <CloudDetailItem label={t("cloud.providers.azure.os_type", "OS Type")} value={detailData.instance.os_type || "-"} />
                <CloudDetailItem label={t("cloud.providers.azure.computer_name", "Computer Name")} value={detailData.instance.computer_name || "-"} />
                <CloudDetailItem label={t("cloud.providers.azure.vm_id", "VM ID")} value={detailData.vm_id || "-"} />
                <CloudDetailItem label={t("cloud.providers.azure.image", "Image")} value={detailData.instance.image || "-"} />
                <CloudDetailItem label={t("cloud.table.ip", "Public IP")} value={formatList(detailData.instance.public_ips)} />
                <CloudDetailItem label={t("cloud.providers.azure.private_ip", "Private IP")} value={formatList(detailData.instance.private_ips)} />
                <CloudDetailItem label={t("cloud.providers.azure.zones", "Zones")} value={formatList(detailData.zones)} />
              </div>

              <section className={cloudPanelSectionClassName}>
                <Flex justify="between" align="center" wrap="wrap" gap="2">
                  <div className={cloudPanelTitleClassName}>
                    {t("cloud.providers.azure.actions", "Actions")}
                  </div>
                  {activeCredential ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setScriptTarget(buildScriptTarget(t, detailData.instance, activeCredential.name))}
                    >
                      <Terminal className="mr-1 h-3.5 w-3.5" />
                      {t("cloud.script.action", "Run Script")}
                    </Button>
                  ) : null}
                </Flex>
                <Flex wrap="wrap" gap="2" className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={workingInstanceId === detailData.instance.instance_id}
                    onClick={() => void handleInstanceAction(detailData.instance, "start")}
                  >
                    <Power className="mr-1 h-3.5 w-3.5" />
                    {t("cloud.power_on", "Power On")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={workingInstanceId === detailData.instance.instance_id}
                    onClick={() => void handleInstanceAction(detailData.instance, "deallocate")}
                  >
                    <PowerOff className="mr-1 h-3.5 w-3.5" />
                    {t("cloud.power_off", "Power Off")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={workingInstanceId === detailData.instance.instance_id}
                    onClick={() => void handleInstanceAction(detailData.instance, "restart")}
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    {t("cloud.reboot", "Reboot")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={workingInstanceId === detailData.instance.instance_id}
                    onClick={() => void handleDeleteInstance(detailData.instance)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    {t("cloud.delete", "Delete")}
                  </Button>
                </Flex>
              </section>

              <section className={cloudPanelSectionClassName}>
                <div className={cloudPanelTitleClassName}>
                  {t("cloud.providers.azure.network_interfaces", "Network Interfaces")}
                </div>
                <div className="mt-3 space-y-3">
                  {detailData.network_interfaces.length ? detailData.network_interfaces.map((networkInterface) => (
                    <div key={networkInterface.id || networkInterface.name} className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                      <div className={`font-medium ${cloudLongTextClassName}`}>
                        {networkInterface.name || networkInterface.id || "-"}
                      </div>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <CloudDetailItem label={t("cloud.providers.azure.primary", "Primary")} value={networkInterface.primary ? t("common.yes", "Yes") : t("common.no", "No")} />
                        <CloudDetailItem label={t("cloud.providers.azure.private_ip", "Private IP")} value={formatList(networkInterface.private_ips)} />
                        <CloudDetailItem label={t("cloud.table.ip", "Public IP")} value={formatList(networkInterface.public_ips)} />
                        <CloudDetailItem label={t("cloud.providers.azure.nsg", "NSG")} value={networkInterface.network_security_group_id || "-"} />
                      </div>
                    </div>
                  )) : (
                    <div className={cloudPanelBodyTextClassName}>
                      {t("cloud.providers.azure.network_interfaces_empty", "No network interfaces found")}
                    </div>
                  )}
                </div>
              </section>

              <div className="grid gap-4 xl:grid-cols-2">
                <section className={cloudPanelSectionClassName}>
                  <div className={cloudPanelTitleClassName}>
                    {t("cloud.providers.azure.os_disk", "OS Disk")}
                  </div>
                  <div className="mt-3">
                    {detailData.os_disk ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <CloudDetailItem label={t("cloud.table.name", "Name")} value={detailData.os_disk.name || "-"} />
                        <CloudDetailItem label={t("cloud.providers.azure.disk_size", "Disk Size")} value={detailData.os_disk.size_gb ? `${detailData.os_disk.size_gb} GiB` : "-"} />
                        <CloudDetailItem label={t("cloud.providers.azure.disk_type", "Disk Type")} value={detailData.os_disk.storage_account_type || "-"} />
                        <CloudDetailItem label={t("cloud.providers.azure.create_option", "Create Option")} value={detailData.os_disk.create_option || "-"} />
                      </div>
                    ) : (
                      <div className={cloudPanelBodyTextClassName}>
                        {t("cloud.providers.azure.os_disk_empty", "OS disk details unavailable")}
                      </div>
                    )}
                  </div>
                </section>

                <section className={cloudPanelSectionClassName}>
                  <div className={cloudPanelTitleClassName}>
                    {t("cloud.providers.azure.data_disks", "Data Disks")}
                  </div>
                  <div className="mt-3 space-y-3">
                    {detailData.data_disks.length ? detailData.data_disks.map((disk) => (
                      <div key={`${disk.id}-${disk.lun}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                        <div className={`font-medium ${cloudLongTextClassName}`}>
                          {disk.name || disk.id || "-"}
                        </div>
                        <div className="mt-2 grid gap-3 sm:grid-cols-2">
                          <CloudDetailItem label={t("cloud.providers.azure.lun", "LUN")} value={disk.lun} />
                          <CloudDetailItem label={t("cloud.providers.azure.disk_size", "Disk Size")} value={disk.size_gb ? `${disk.size_gb} GiB` : "-"} />
                          <CloudDetailItem label={t("cloud.providers.azure.disk_type", "Disk Type")} value={disk.storage_account_type || "-"} />
                          <CloudDetailItem label={t("cloud.providers.azure.create_option", "Create Option")} value={disk.create_option || "-"} />
                        </div>
                      </div>
                    )) : (
                      <div className={cloudPanelBodyTextClassName}>
                        {t("cloud.providers.azure.data_disks_empty", "No data disks attached")}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <section className={cloudPanelSectionClassName}>
                <div className={cloudPanelTitleClassName}>
                  {t("cloud.providers.azure.tags", "Tags")}
                </div>
                <div className="mt-3">
                  {Object.keys(detailData.instance.tags || {}).length ? (
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {Object.entries(detailData.instance.tags).map(([key, value]) => (
                        <div key={key} className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                            {key}
                          </div>
                          <div className={`mt-1 text-sm text-slate-900 dark:text-slate-100 ${cloudLongTextClassName}`}>
                            {value || "-"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={cloudPanelBodyTextClassName}>
                      {t("cloud.providers.azure.tags_empty", "No tags configured")}
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <div className={cloudPanelBodyTextClassName}>
              {t("cloud.providers.azure.detail_empty", "Unable to load Azure VM details")}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Root>

      <CloudInstanceScriptDialog
        open={Boolean(scriptTarget)}
        target={scriptTarget}
        onOpenChange={(open) => !open && setScriptTarget(null)}
      />

      {warningDialog}
    </>
  );
}

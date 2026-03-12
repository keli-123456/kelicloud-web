import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CheckCircle2,
  Copy,
  Eye,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import Loading from "@/components/loading";
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  Flex,
  Select,
  Tabs,
  TextArea,
  TextField,
} from "@/components/ui/compat";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  checkAWSCredentials,
  createAWSInstance,
  deleteAWSInstance,
  deleteAWSCredential,
  getAWSAccount,
  getAWSCatalog,
  getAWSCredentialSecret,
  getAWSCredentials,
  listAWSInstances,
  postAWSInstanceAction,
  saveAWSCredentials,
  setAWSActiveCredential,
  setAWSActiveRegion,
  type AWSAccount,
  type AWSCatalog,
  type AWSCredentialInput,
  type AWSCredentialPool,
  type AWSCredentialRecord,
  type AWSCredentialSecret,
  type AWSImage,
  type AWSInstance,
  type AWSSubnet,
  type AWSTag,
  type CreateAWSInstanceInput,
} from "@/lib/cloudAws";

type CreateFormState = Omit<CreateAWSInstanceInput, "tags"> & {
  tagsText: string;
};

const SELECT_NONE = "__none__";

type CredentialSecretState = {
  secret: AWSCredentialSecret;
};

const initialCreateForm: CreateFormState = {
  name: "",
  image_id: "",
  instance_type: "",
  key_name: "",
  subnet_id: "",
  security_group_ids: [],
  user_data: "",
  assign_public_ip: true,
  tagsText: "",
};

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

function hasActiveCredential(pool: AWSCredentialPool | null) {
  return Boolean(pool?.active_credential_id);
}

function getActiveCredential(pool: AWSCredentialPool | null) {
  return pool?.credentials.find((credential) => credential.id === pool.active_credential_id) || null;
}

function findImportSeparator(line: string) {
  for (const separator of ["|", ",", "\t"]) {
    if (line.includes(separator)) {
      return separator;
    }
  }
  return "";
}

function parseCredentialImports(text: string): AWSCredentialInput[] {
  const lines = text.split(/\r?\n/);
  const credentials: AWSCredentialInput[] = [];
  const seen = new Set<string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = findImportSeparator(line);
    if (!separator) continue;

    const parts = line.split(separator).map((part) => part.trim()).filter(Boolean);
    if (parts.length < 4) continue;

    const [name, accessKeyId, secretAccessKey, defaultRegion, sessionToken] = parts;
    const key = `${accessKeyId}|${defaultRegion || "us-east-1"}`;
    if (!accessKeyId || !secretAccessKey || seen.has(key)) continue;
    seen.add(key);

    credentials.push({
      name: name || `Credential ${credentials.length + 1}`,
      access_key_id: accessKeyId,
      secret_access_key: secretAccessKey,
      default_region: defaultRegion || "us-east-1",
      session_token: sessionToken || "",
    });
  }

  return credentials;
}

function parseTags(tagsText: string): AWSTag[] {
  return tagsText
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const index = entry.indexOf("=");
      if (index === -1) return null;
      const key = entry.slice(0, index).trim();
      const value = entry.slice(index + 1).trim();
      if (!key || !value) return null;
      return { key, value };
    })
    .filter((tag): tag is AWSTag => Boolean(tag));
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
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

function getInstanceStateColor(state: string) {
  switch (state) {
    case "running":
      return "green";
    case "stopped":
      return "amber";
    case "pending":
      return "blue";
    case "terminated":
      return "red";
    default:
      return "gray";
  }
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 break-all text-sm text-slate-900">{value}</div>
    </div>
  );
}

function getSubnetVpcId(subnets: AWSSubnet[], subnetId: string) {
  return subnets.find((subnet) => subnet.subnet_id === subnetId)?.vpc_id || "";
}

function getImageLabel(image: AWSImage) {
  if (image.name && image.image_id) return `${image.name} (${image.image_id})`;
  return image.name || image.image_id || "-";
}

export default function AWSPanel() {
  const { t } = useTranslation();

  const [panelSection, setPanelSection] = React.useState<"instances" | "credentials">("instances");
  const [initializing, setInitializing] = React.useState(true);
  const [panelLoading, setPanelLoading] = React.useState(false);
  const [credentialSaving, setCredentialSaving] = React.useState(false);
  const [credentialChecking, setCredentialChecking] = React.useState(false);
  const [credentialImportOpen, setCredentialImportOpen] = React.useState(false);
  const [credentialImportText, setCredentialImportText] = React.useState("");
  const [credentialPool, setCredentialPool] = React.useState<AWSCredentialPool | null>(null);
  const [account, setAccount] = React.useState<AWSAccount | null>(null);
  const [catalog, setCatalog] = React.useState<AWSCatalog | null>(null);
  const [instances, setInstances] = React.useState<AWSInstance[]>([]);
  const [detailInstance, setDetailInstance] = React.useState<AWSInstance | null>(null);
  const [credentialSecret, setCredentialSecret] = React.useState<CredentialSecretState | null>(null);
  const [credentialSecretLoading, setCredentialSecretLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createSubmitting, setCreateSubmitting] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<CreateFormState>(initialCreateForm);

  const clearPanelState = React.useCallback(() => {
    setAccount(null);
    setCatalog(null);
    setInstances([]);
    setError("");
  }, []);

  const copyText = React.useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t("copy_success", "Copied!"));
      } catch (copyError) {
        toast.error(toErrorMessage(copyError));
      }
    },
    [t],
  );

  const loadCredentialPool = React.useCallback(async () => {
    const nextPool = await getAWSCredentials();
    setCredentialPool(nextPool);
    return nextPool;
  }, []);

  const loadPanelData = React.useCallback(async () => {
    setPanelLoading(true);
    try {
      const [nextAccount, nextCatalog, nextInstances] = await Promise.all([
        getAWSAccount(),
        getAWSCatalog(),
        listAWSInstances(),
      ]);
      setAccount(nextAccount);
      setCatalog(nextCatalog);
      setInstances(nextInstances);
      setError("");
    } catch (panelError) {
      setAccount(null);
      setCatalog(null);
      setInstances([]);
      setError(toErrorMessage(panelError));
    } finally {
      setPanelLoading(false);
    }
  }, []);

  const refreshAll = React.useCallback(async () => {
    const nextPool = await loadCredentialPool();
    if (hasActiveCredential(nextPool)) {
      await loadPanelData();
      return;
    }
    clearPanelState();
  }, [clearPanelState, loadCredentialPool, loadPanelData]);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const nextPool = await getAWSCredentials();
        if (cancelled) return;
        setCredentialPool(nextPool);
        if (hasActiveCredential(nextPool)) {
          await loadPanelData();
        } else {
          clearPanelState();
        }
      } catch (bootstrapError) {
        if (!cancelled) {
          setError(toErrorMessage(bootstrapError));
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearPanelState, loadPanelData]);

  React.useEffect(() => {
    if (!catalog) return;
    setCreateForm((previous) => ({
      ...previous,
      image_id: previous.image_id || catalog.images[0]?.image_id || "",
      instance_type: previous.instance_type || catalog.instance_types[0]?.name || "",
      subnet_id: previous.subnet_id || "",
    }));
  }, [catalog]);

  React.useEffect(() => {
    if (!hasActiveCredential(credentialPool)) {
      setPanelSection("credentials");
    }
  }, [credentialPool]);

  if (initializing) {
    return <Loading text="" />;
  }

  const activeCredential = getActiveCredential(credentialPool);
  const connected = Boolean(account && activeCredential);
  const activeRegion = credentialPool?.active_region || account?.region || "us-east-1";
  const runningCount = instances.filter((instance) => instance.state === "running").length;
  const selectedSubnetVpcId = getSubnetVpcId(catalog?.subnets || [], createForm.subnet_id);
  const filteredSecurityGroups = (catalog?.security_groups || []).filter((group) =>
    selectedSubnetVpcId ? group.vpc_id === selectedSubnetVpcId : true,
  );

  const handleImportCredentials = async () => {
    const credentials = parseCredentialImports(credentialImportText);
    if (!credentials.length) {
      toast.error(t("cloud.providers.aws.import_empty", "No valid credentials found"));
      return;
    }

    setCredentialSaving(true);
    try {
      const nextPool = await saveAWSCredentials({
        credentials,
        active_credential_id: credentialPool?.active_credential_id || undefined,
        active_region: credentialPool?.active_region || undefined,
      });
      setCredentialPool(nextPool);
      setCredentialImportText("");
      setCredentialImportOpen(false);
      toast.success(
        t("cloud.providers.aws.import_success", {
          count: credentials.length,
          defaultValue: `Imported ${credentials.length} credentials`,
        }),
      );
      if (hasActiveCredential(nextPool)) {
        await loadPanelData();
      } else {
        clearPanelState();
      }
    } catch (saveError) {
      toast.error(toErrorMessage(saveError));
    } finally {
      setCredentialSaving(false);
    }
  };

  const handleCheckCredentials = async () => {
    setCredentialChecking(true);
    try {
      const nextPool = await checkAWSCredentials();
      setCredentialPool(nextPool);
      toast.success(t("cloud.tokens.check_success", "Token health check finished"));
      if (hasActiveCredential(nextPool)) {
        await loadPanelData();
      } else {
        clearPanelState();
      }
    } catch (checkError) {
      toast.error(toErrorMessage(checkError));
    } finally {
      setCredentialChecking(false);
    }
  };

  const handleSelectCredential = async (
    credential: AWSCredentialRecord,
    options?: { loadResources?: boolean; openInstances?: boolean },
  ) => {
    try {
      const nextPool = await setAWSActiveCredential(credential.id);
      setCredentialPool(nextPool);
      toast.success(
        t("cloud.tokens.active_success", {
          name: credential.name,
          defaultValue: `Using token ${credential.name}`,
        }),
      );
      if (options?.openInstances) {
        setPanelSection("instances");
      }
      if (options?.loadResources) {
        await loadPanelData();
      }
    } catch (selectError) {
      toast.error(toErrorMessage(selectError));
    }
  };

  const handleDeleteCredential = async (credential: AWSCredentialRecord) => {
    const confirmed = window.confirm(
      t("cloud.tokens.delete_confirm", {
        name: credential.name,
        defaultValue: `Delete token "${credential.name}"?`,
      }),
    );
    if (!confirmed) return;

    try {
      const nextPool = await deleteAWSCredential(credential.id);
      setCredentialPool(nextPool);
      toast.success(t("cloud.tokens.delete_success", "Token deleted"));
      if (hasActiveCredential(nextPool)) {
        await loadPanelData();
      } else {
        clearPanelState();
      }
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  };

  const handleViewCredentialSecret = async (credential: AWSCredentialRecord) => {
    setCredentialSecretLoading(true);
    try {
      const secret = await getAWSCredentialSecret(credential.id);
      setCredentialSecret({ secret });
    } catch (viewError) {
      toast.error(toErrorMessage(viewError));
    } finally {
      setCredentialSecretLoading(false);
    }
  };

  const handleRegionChange = async (region: string) => {
    try {
      const nextPool = await setAWSActiveRegion(region);
      setCredentialPool(nextPool);
      if (hasActiveCredential(nextPool)) {
        await loadPanelData();
      }
    } catch (regionError) {
      toast.error(toErrorMessage(regionError));
    }
  };

  const handleCreateInstance = async () => {
    setCreateSubmitting(true);
    try {
      const payload: CreateAWSInstanceInput = {
        name: createForm.name,
        image_id: createForm.image_id,
        instance_type: createForm.instance_type,
        key_name: createForm.key_name,
        subnet_id: createForm.subnet_id,
        security_group_ids: createForm.security_group_ids,
        user_data: createForm.user_data,
        assign_public_ip: createForm.assign_public_ip,
        tags: parseTags(createForm.tagsText),
      };
      await createAWSInstance(payload);
      toast.success(t("cloud.providers.aws.create_success", "EC2 instance launch submitted"));
      setCreateOpen(false);
      setCreateForm((previous) => ({
        ...initialCreateForm,
        image_id: previous.image_id,
        instance_type: previous.instance_type,
      }));
      await loadPanelData();
    } catch (createError) {
      toast.error(toErrorMessage(createError));
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleInstanceAction = async (instance: AWSInstance, type: string) => {
    try {
      await postAWSInstanceAction(instance.instance_id, type);
      toast.success(t("cloud.action_success", "Operation submitted"));
      await loadPanelData();
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    }
  };

  const handleDeleteInstance = async (instance: AWSInstance) => {
    const confirmed = window.confirm(
      t("cloud.delete_confirm", {
        name: instance.name || instance.instance_id,
        defaultValue: `Delete droplet "${instance.name || instance.instance_id}"? This action cannot be undone.`,
      }),
    );
    if (!confirmed) return;

    try {
      await deleteAWSInstance(instance.instance_id);
      toast.success(t("cloud.delete_success", "Droplet deleted"));
      await loadPanelData();
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  };

  return (
    <AdminPageShell
      eyebrow="AWS EC2"
      title={t("cloud.providers.aws.title", "AWS EC2")}
      description={t(
        "cloud.providers.aws.description",
        "Manage multiple AWS credentials, switch the active region, and launch or operate EC2 instances from one panel.",
      )}
      actions={
        <>
          <Button
            variant="outline"
            size="1"
            onClick={() => {
              void refreshAll();
            }}
            disabled={panelLoading || credentialChecking}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("cloud.refresh", "Refresh")}
          </Button>
          <Button size="1" onClick={() => setCreateOpen(true)} disabled={!connected || !catalog}>
            <Plus className="mr-2 h-4 w-4" />
            {t("cloud.providers.aws.create", "Launch EC2")}
          </Button>
        </>
      }
      stats={[
        {
          label: t("cloud.stats.provider", "Provider"),
          value: "AWS EC2",
        },
        {
          label: t("cloud.providers.aws.credentials", "Credentials"),
          value: credentialPool?.credentials.length || 0,
        },
        {
          label: t("cloud.stats.account", "Account"),
          value: account?.account_id || activeCredential?.account_id || "-",
        },
        {
          label: t("cloud.providers.aws.region", "Region"),
          value: activeRegion,
        },
        {
          label: t("cloud.stats.running", "Running"),
          value: runningCount,
        },
      ]}
    >
      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-900">
              {t("cloud.providers.aws.active_region", "Active Region")}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {t(
                "cloud.providers.aws.active_region_description",
                "EC2 instances, AMIs, key pairs, subnets, and security groups are all loaded from the currently selected AWS region.",
              )}
            </div>
          </div>
          <div className="min-w-56">
            <Select.Root value={activeRegion} onValueChange={(value) => { void handleRegionChange(value); }}>
              <Select.Trigger placeholder={t("cloud.providers.aws.active_region", "Active Region")} />
              <Select.Content>
                {(catalog?.regions || []).map((region) => (
                  <Select.Item key={region.name} value={region.name}>
                    {region.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>
        </div>
      </div>

      <Tabs.Root value={panelSection} onValueChange={(value) => setPanelSection(value as "instances" | "credentials")}>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-900">
                {t("cloud.panel_title", "Panel View")}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {t(
                  "cloud.providers.aws.panel_description",
                  "Split AWS credentials and EC2 instance operations so region changes and account switching stay clear.",
                )}
              </div>
            </div>
            <Tabs.List>
              <Tabs.Trigger value="instances">
                {t("cloud.providers.aws.instance_list", "EC2 Instances")} ({instances.length})
              </Tabs.Trigger>
              <Tabs.Trigger value="credentials">
                {t("cloud.providers.aws.credentials", "Credentials")} ({credentialPool?.credentials.length || 0})
              </Tabs.Trigger>
            </Tabs.List>
          </div>
        </div>

        <Tabs.Content value="instances">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {t("cloud.providers.aws.instance_list", "EC2 Instances")}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {t(
                      "cloud.providers.aws.instance_list_description",
                      "The list is scoped to the active credential and active region.",
                    )}
                  </div>
                </div>
                <Button variant="outline" size="1" onClick={() => setPanelSection("credentials")}>
                  <Server className="mr-2 h-4 w-4" />
                  {t("cloud.providers.aws.credentials", "Credentials")}
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("cloud.table.name", "Name")}</TableHead>
                  <TableHead>{t("cloud.table.status", "Status")}</TableHead>
                  <TableHead>{t("cloud.providers.aws.az", "AZ")}</TableHead>
                  <TableHead>{t("cloud.table.ip", "Public IP")}</TableHead>
                  <TableHead>{t("cloud.table.size", "Size")}</TableHead>
                  <TableHead>{t("cloud.table.image", "Image")}</TableHead>
                  <TableHead>{t("cloud.providers.aws.key_pair", "Key Pair")}</TableHead>
                  <TableHead>{t("cloud.table.created_at", "Created")}</TableHead>
                  <TableHead className="text-right">{t("common.action", "Action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-slate-500">
                      {panelLoading
                        ? t("cloud.loading", "Loading cloud resources...")
                        : hasActiveCredential(credentialPool)
                          ? t("cloud.providers.aws.empty", "No EC2 instances found in this region")
                          : t("cloud.providers.aws.no_active_credential", "Select an active AWS credential first")}
                    </TableCell>
                  </TableRow>
                ) : (
                  instances.map((instance) => (
                    <TableRow key={instance.instance_id}>
                      <TableCell className="font-medium text-slate-900">
                        <button
                          type="button"
                          className="text-left text-blue-700 hover:text-blue-800 hover:underline"
                          onClick={() => setDetailInstance(instance)}
                        >
                          {instance.name || instance.instance_id}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge color={getInstanceStateColor(instance.state)}>{instance.state || "-"}</Badge>
                      </TableCell>
                      <TableCell>{instance.availability_zone || "-"}</TableCell>
                      <TableCell>{instance.public_ip || instance.private_ip || "-"}</TableCell>
                      <TableCell>{instance.instance_type || "-"}</TableCell>
                      <TableCell>{instance.image_id || "-"}</TableCell>
                      <TableCell>{instance.key_name || "-"}</TableCell>
                      <TableCell>{formatDateTime(instance.launch_time)}</TableCell>
                      <TableCell className="text-right">
                        <Flex justify="end" gap="2" wrap="wrap">
                          {instance.state === "running" ? (
                            <Button
                              variant="soft"
                              size="1"
                              color="amber"
                              onClick={() => {
                                void handleInstanceAction(instance, "stop");
                              }}
                            >
                              <PowerOff className="mr-1 h-3.5 w-3.5" />
                              {t("cloud.power_off", "Power Off")}
                            </Button>
                          ) : (
                            <Button
                              variant="soft"
                              size="1"
                              color="green"
                              disabled={instance.state === "terminated"}
                              onClick={() => {
                                void handleInstanceAction(instance, "start");
                              }}
                            >
                              <Power className="mr-1 h-3.5 w-3.5" />
                              {t("cloud.power_on", "Power On")}
                            </Button>
                          )}
                          <Button
                            variant="soft"
                            size="1"
                            disabled={instance.state === "terminated"}
                            onClick={() => {
                              void handleInstanceAction(instance, "reboot");
                            }}
                          >
                            <RotateCcw className="mr-1 h-3.5 w-3.5" />
                            {t("cloud.reboot", "Reboot")}
                          </Button>
                          <Button
                            variant="soft"
                            size="1"
                            color="red"
                            disabled={instance.state === "terminated"}
                            onClick={() => {
                              void handleDeleteInstance(instance);
                            }}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            {t("cloud.delete", "Delete")}
                          </Button>
                        </Flex>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Tabs.Content>

        <Tabs.Content value="credentials">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {t("cloud.providers.aws.credentials", "Credentials")}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {t(
                      "cloud.providers.aws.credentials_description",
                      "Save multiple AWS accounts, choose the active one, and bulk-check whether the credentials can still call EC2 and STS.",
                    )}
                  </div>
                </div>
                <Flex gap="2" wrap="wrap">
                  <Button
                    variant="outline"
                    size="1"
                    onClick={() => {
                      void handleCheckCredentials();
                    }}
                    disabled={credentialChecking || !credentialPool?.credentials.length}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {t("cloud.tokens.check_all", "Check All Tokens")}
                  </Button>
                  <Button variant="outline" size="1" onClick={() => setPanelSection("instances")}>
                    <Server className="mr-2 h-4 w-4" />
                    {t("cloud.providers.aws.instance_list", "EC2 Instances")}
                  </Button>
                  <Button size="1" onClick={() => setCredentialImportOpen(true)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {t("cloud.providers.aws.import", "Import Credentials")}
                  </Button>
                </Flex>
              </div>
            </div>

            <div className="max-h-[560px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("cloud.tokens.table.name", "Name")}</TableHead>
                    <TableHead>{t("cloud.providers.aws.access_key", "Access Key")}</TableHead>
                    <TableHead>{t("cloud.tokens.table.account", "Account")}</TableHead>
                    <TableHead>{t("cloud.providers.aws.default_region", "Default Region")}</TableHead>
                    <TableHead>{t("cloud.tokens.table.status", "Status")}</TableHead>
                    <TableHead>{t("cloud.tokens.table.checked_at", "Last Checked")}</TableHead>
                    <TableHead className="text-right">{t("common.action", "Action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!credentialPool?.credentials.length ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                        {t("cloud.providers.aws.credentials_empty", "No AWS credentials saved yet")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    credentialPool.credentials.map((credential) => (
                      <TableRow key={credential.id}>
                        <TableCell className="font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="max-w-40 truncate">{credential.name}</span>
                            {credential.is_active ? (
                              <Badge color="blue">{t("cloud.tokens.active", "Active")}</Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">
                          {credential.masked_access_key_id || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-900">{credential.account_id || "-"}</div>
                          {credential.arn ? (
                            <div className="max-w-64 truncate text-xs text-slate-500">{credential.arn}</div>
                          ) : null}
                        </TableCell>
                        <TableCell>{credential.default_region || "-"}</TableCell>
                        <TableCell>
                          <Badge color={getCredentialStatusColor(credential.last_status)}>
                            {t(`cloud.tokens.status.${credential.last_status}`, credential.last_status || "unknown")}
                          </Badge>
                          {credential.last_error ? (
                            <div className="mt-1 max-w-64 text-xs text-red-600">{credential.last_error}</div>
                          ) : null}
                        </TableCell>
                        <TableCell>{formatDateTime(credential.last_checked_at)}</TableCell>
                        <TableCell className="text-right">
                          <Flex justify="end" gap="2" wrap="wrap">
                            <Button
                              variant="soft"
                              size="1"
                              color={credential.is_active ? "blue" : undefined}
                              disabled={credential.is_active}
                              onClick={() => {
                                void handleSelectCredential(credential);
                              }}
                            >
                              <Server className="mr-1 h-3.5 w-3.5" />
                              {credential.is_active
                                ? t("cloud.tokens.current", "Current")
                                : t("cloud.tokens.use", "Use")}
                            </Button>
                            <Button
                              variant="soft"
                              size="1"
                              onClick={() => {
                                void handleSelectCredential(credential, {
                                  loadResources: true,
                                  openInstances: true,
                                });
                              }}
                            >
                              <Server className="mr-1 h-3.5 w-3.5" />
                              {t("cloud.tokens.view_droplets", "View Droplets")}
                            </Button>
                            <Button
                              variant="soft"
                              size="1"
                              disabled={credentialSecretLoading}
                              onClick={() => {
                                void handleViewCredentialSecret(credential);
                              }}
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              {t("cloud.providers.aws.view_credential", "View Credential")}
                            </Button>
                            <Button
                              variant="soft"
                              size="1"
                              color="red"
                              onClick={() => {
                                void handleDeleteCredential(credential);
                              }}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              {t("cloud.tokens.delete", "Delete")}
                            </Button>
                          </Flex>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      <Dialog.Root open={credentialImportOpen} onOpenChange={setCredentialImportOpen}>
        <Dialog.Content className="max-h-[85vh] overflow-y-auto">
          <Dialog.Title>{t("cloud.providers.aws.import_dialog_title", "Batch Import AWS Credentials")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.aws.import_dialog_description",
              "One line per credential. Format: name,accessKeyId,secretAccessKey,region[,sessionToken].",
            )}
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-4">
            <TextArea
              className="min-h-40"
              value={credentialImportText}
              placeholder="prod,AKIA...,secret...,us-east-1\nbackup|AKIA...|secret...|ap-southeast-1|session-token"
              onChange={(event) => setCredentialImportText(event.target.value)}
            />
            <Flex justify="end" gap="2">
              <Button variant="outline" onClick={() => setCredentialImportOpen(false)} disabled={credentialSaving}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button onClick={() => { void handleImportCredentials(); }} disabled={credentialSaving}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {credentialSaving
                  ? t("cloud.tokens.importing", "Importing...")
                  : t("cloud.providers.aws.import", "Import Credentials")}
              </Button>
            </Flex>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
        <Dialog.Content className="max-h-[85vh] overflow-y-auto">
          <Dialog.Title>{t("cloud.providers.aws.create", "Launch EC2")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.aws.create_description",
              "Launch a single EC2 instance in the active region. If your account has no default VPC, choose a subnet and matching security groups.",
            )}
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-4">
            <label className="text-sm font-medium text-slate-800">
              {t("cloud.form.name", "Name")}
            </label>
            <TextField.Root
              value={createForm.name}
              placeholder="web-01"
              onChange={(event) => setCreateForm((previous) => ({ ...previous, name: event.target.value }))}
            />

            <label className="text-sm font-medium text-slate-800">
              {t("cloud.providers.aws.ami", "AMI")}
            </label>
            <Select.Root
              value={createForm.image_id}
              onValueChange={(value) => setCreateForm((previous) => ({ ...previous, image_id: value }))}
            >
              <Select.Trigger placeholder={t("cloud.form.image_placeholder", "Select an image")} />
              <Select.Content>
                {(catalog?.images || []).map((image) => (
                  <Select.Item key={image.image_id} value={image.image_id}>
                    {getImageLabel(image)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <TextField.Root
              value={createForm.image_id}
              placeholder={t("cloud.providers.aws.ami_manual_placeholder", "Or enter an AMI ID manually")}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, image_id: event.target.value }))}
            />

            <label className="text-sm font-medium text-slate-800">
              {t("cloud.providers.aws.instance_type", "Instance Type")}
            </label>
            <Select.Root
              value={createForm.instance_type}
              onValueChange={(value) => setCreateForm((previous) => ({ ...previous, instance_type: value }))}
            >
              <Select.Trigger placeholder={t("cloud.form.size_placeholder", "Select a size")} />
              <Select.Content>
                {(catalog?.instance_types || []).map((instanceType) => (
                  <Select.Item key={instanceType.name} value={instanceType.name}>
                    {instanceType.name} / {instanceType.vcpus} vCPU / {(instanceType.memory_mib / 1024).toFixed(1)} GB
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <label className="text-sm font-medium text-slate-800">
              {t("cloud.providers.aws.key_pair", "Key Pair")}
            </label>
            <Select.Root
              value={createForm.key_name || SELECT_NONE}
              onValueChange={(value) =>
                setCreateForm((previous) => ({
                  ...previous,
                  key_name: value === SELECT_NONE ? "" : value,
                }))
              }
            >
              <Select.Trigger placeholder={t("cloud.providers.aws.key_pair_optional", "Optional")} />
              <Select.Content>
                <Select.Item value={SELECT_NONE}>{t("cloud.providers.aws.none", "None")}</Select.Item>
                {(catalog?.key_pairs || []).map((keyPair) => (
                  <Select.Item key={keyPair.key_name} value={keyPair.key_name}>
                    {keyPair.key_name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <label className="text-sm font-medium text-slate-800">
              {t("cloud.providers.aws.subnet", "Subnet")}
            </label>
            <Select.Root
              value={createForm.subnet_id || SELECT_NONE}
              onValueChange={(value) =>
                setCreateForm((previous) => ({
                  ...previous,
                  subnet_id: value === SELECT_NONE ? "" : value,
                  security_group_ids: [],
                }))
              }
            >
              <Select.Trigger placeholder={t("cloud.providers.aws.subnet_optional", "Optional")} />
              <Select.Content>
                <Select.Item value={SELECT_NONE}>{t("cloud.providers.aws.none", "None")}</Select.Item>
                {(catalog?.subnets || []).map((subnet) => (
                  <Select.Item key={subnet.subnet_id} value={subnet.subnet_id}>
                    {subnet.subnet_id} / {subnet.availability_zone} / {subnet.cidr_block}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-sm font-medium text-slate-800">
                {t("cloud.providers.aws.security_groups", "Security Groups")}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {selectedSubnetVpcId
                  ? t("cloud.providers.aws.security_group_hint_vpc", {
                      vpc: selectedSubnetVpcId,
                      defaultValue: `Showing groups from VPC ${selectedSubnetVpcId}`,
                    })
                  : t(
                      "cloud.providers.aws.security_group_hint",
                      "Select matching security groups when you choose a subnet. Leave empty to let AWS use the subnet default behavior.",
                    )}
              </div>
              <div className="mt-3 flex max-h-48 flex-col gap-2 overflow-y-auto">
                {filteredSecurityGroups.length ? (
                  filteredSecurityGroups.map((group) => {
                    const checked = createForm.security_group_ids.includes(group.group_id);
                    return (
                      <label
                        key={group.group_id}
                        className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(nextChecked) =>
                            setCreateForm((previous) => ({
                              ...previous,
                              security_group_ids: Boolean(nextChecked)
                                ? [...previous.security_group_ids, group.group_id]
                                : previous.security_group_ids.filter((value) => value !== group.group_id),
                            }))
                          }
                        />
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-900">
                            {group.group_name}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {group.group_id} / {group.vpc_id}
                          </span>
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <div className="text-sm text-slate-500">
                    {t("cloud.providers.aws.security_groups_empty", "No security groups found")}
                  </div>
                )}
              </div>
            </div>

            <label className="text-sm font-medium text-slate-800">
              {t("cloud.form.tags", "Tags")}
            </label>
            <TextArea
              rows={4}
              value={createForm.tagsText}
              placeholder={"env=prod\nteam=platform"}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, tagsText: event.target.value }))}
            />

            <label className="text-sm font-medium text-slate-800">
              {t("cloud.form.user_data", "Cloud-Init / User Data")}
            </label>
            <TextArea
              rows={6}
              value={createForm.user_data}
              placeholder="#!/bin/bash"
              onChange={(event) => setCreateForm((previous) => ({ ...previous, user_data: event.target.value }))}
            />

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <Checkbox
                checked={createForm.assign_public_ip}
                onCheckedChange={(checked) =>
                  setCreateForm((previous) => ({ ...previous, assign_public_ip: Boolean(checked) }))
                }
              />
              {t("cloud.providers.aws.assign_public_ip", "Assign public IPv4 when subnet configuration allows it")}
            </label>

            <Flex justify="end" gap="2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createSubmitting}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                onClick={() => {
                  void handleCreateInstance();
                }}
                disabled={createSubmitting || !createForm.image_id || !createForm.instance_type}
              >
                {createSubmitting
                  ? t("cloud.creating", "Creating...")
                  : t("cloud.providers.aws.create", "Launch EC2")}
              </Button>
            </Flex>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={Boolean(detailInstance)} onOpenChange={(open) => !open && setDetailInstance(null)}>
        <Dialog.Content className="max-h-[85vh] overflow-y-auto">
          <Dialog.Title>{detailInstance?.name || detailInstance?.instance_id || "EC2"}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.aws.detail_description",
              "View the selected EC2 instance details from the current active credential and region.",
            )}
          </Dialog.Description>

          {detailInstance ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DetailItem label={t("cloud.detail.id", "Droplet ID")} value={detailInstance.instance_id} />
              <DetailItem label={t("cloud.table.status", "Status")} value={detailInstance.state || "-"} />
              <DetailItem label={t("cloud.providers.aws.az", "AZ")} value={detailInstance.availability_zone || "-"} />
              <DetailItem label={t("cloud.table.ip", "Public IP")} value={detailInstance.public_ip || detailInstance.private_ip || "-"} />
              <DetailItem label={t("cloud.table.size", "Size")} value={detailInstance.instance_type || "-"} />
              <DetailItem label={t("cloud.table.image", "Image")} value={detailInstance.image_id || "-"} />
              <DetailItem label={t("cloud.providers.aws.key_pair", "Key Pair")} value={detailInstance.key_name || "-"} />
              <DetailItem label={t("cloud.table.created_at", "Created")} value={formatDateTime(detailInstance.launch_time)} />
              <DetailItem
                label={t("cloud.detail.tags", "Tags")}
                value={
                  Object.keys(detailInstance.tags).length
                    ? Object.entries(detailInstance.tags).map(([key, value]) => `${key}=${value}`).join(", ")
                    : "-"
                }
              />
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={Boolean(credentialSecret)} onOpenChange={(open) => !open && setCredentialSecret(null)}>
        <Dialog.Content className="max-h-[85vh] overflow-y-auto">
          <Dialog.Title>{t("cloud.providers.aws.credential_dialog_title", "Credential Details")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.aws.credential_dialog_description",
              "View the full AWS credentials only when you need to copy or verify them.",
            )}
          </Dialog.Description>

          {credentialSecret ? (
            <div className="mt-4 flex flex-col gap-4">
              <DetailItem label={t("cloud.tokens.table.name", "Name")} value={credentialSecret.secret.credential_name} />
              <DetailItem label={t("cloud.providers.aws.default_region", "Default Region")} value={credentialSecret.secret.default_region || "-"} />
              <DetailItem label={t("cloud.tokens.table.account", "Account")} value={credentialSecret.secret.account_id || "-"} />
              <DetailItem label={t("cloud.providers.aws.access_key", "Access Key")} value={credentialSecret.secret.access_key_id || "-"} />
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-slate-800">
                    {t("cloud.providers.aws.secret_access_key", "Secret Access Key")}
                  </div>
                  <Button variant="outline" size="1" onClick={() => { void copyText(credentialSecret.secret.secret_access_key); }}>
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    {t("copy", "Copy")}
                  </Button>
                </div>
                <TextArea className="mt-3 min-h-24 font-mono text-xs" readOnly value={credentialSecret.secret.secret_access_key} />
              </div>
              {credentialSecret.secret.session_token ? (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-800">
                      {t("cloud.providers.aws.session_token", "Session Token")}
                    </div>
                    <Button variant="outline" size="1" onClick={() => { void copyText(credentialSecret.secret.session_token); }}>
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      {t("copy", "Copy")}
                    </Button>
                  </div>
                  <TextArea className="mt-3 min-h-24 font-mono text-xs" readOnly value={credentialSecret.secret.session_token} />
                </div>
              ) : null}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Root>
    </AdminPageShell>
  );
}

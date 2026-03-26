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
  Share2,
  Server,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import CloudInstanceShareDialog, { type CloudInstanceShareTarget } from "@/components/admin/cloud/CloudInstanceShareDialog";
import CloudInstanceScriptDialog, { type CloudInstanceScriptTarget } from "@/components/admin/cloud/CloudInstanceScriptDialog";
import {
  Badge,
  Button,
  Checkbox,
  CloudCopyBlock,
  CloudDetailItem,
  cloudPanelBodyTextClassName,
  cloudPanelCardClassName,
  cloudPanelDescriptionClassName,
  cloudDialogContentClassName,
  cloudPanelFieldLabelClassName,
  cloudPanelHeaderClassName,
  cloudPanelSectionClassName,
  cloudPanelSubcardClassName,
  cloudPanelTitleClassName,
  cloudLongTextClassName,
  cloudSecretTextareaClassName,
  Dialog,
  Flex,
  Select,
  Tabs,
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
  checkAWSCredentials,
  createAWSInstance,
  createAWSLightsailInstance,
  deleteAWSInstance,
  deleteAWSCredential,
  deleteAWSLightsailInstance,
  getAWSAccount,
  getAWSCatalog,
  getAWSCredentialSecret,
  getAWSCredentials,
  getAWSInstanceDetail,
  getAWSLightsailCatalog,
  getAWSLightsailInstanceDetail,
  listAWSInstances,
  listAWSLightsailInstances,
  postAWSInstanceAction,
  postAWSLightsailInstanceAction,
  saveAWSCredentials,
  setAWSActiveCredential,
  setAWSActiveRegion,
  type AWSAccount,
  type AWSCatalog,
  type AWSCredentialInput,
  type AWSCredentialPool,
  type AWSCredentialRecord,
  type AWSCredentialSecret,
  type AWSEC2Quota,
  type AWSElasticAddress,
  type AWSImage,
  type AWSInstance,
  type AWSInstanceDetail,
  type AWSLightsailCatalog,
  type AWSLightsailInstance,
  type AWSLightsailInstanceDetail,
  type AWSSubnet,
  type AWSTag,
  type CreateAWSInstanceInput,
  type CreateAWSLightsailInstanceInput,
} from "@/lib/cloudAws";
import { getCloudStatusLabel } from "@/lib/cloudStatus";
import {
  buildCloudInstanceShareUrl,
  deleteCloudInstanceShare,
  getCloudInstanceShare,
  saveCloudInstanceShare,
  type CloudInstanceShareRecord,
} from "@/lib/cloudShare";

type CreateFormState = Omit<CreateAWSInstanceInput, "tags"> & {
  tagsText: string;
};

type LightsailCreateFormState = Omit<CreateAWSLightsailInstanceInput, "tags"> & {
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
  auto_connect: true,
  auto_connect_group: "",
  tagsText: "",
};

const initialLightsailCreateForm: LightsailCreateFormState = {
  name: "",
  availability_zone: "",
  blueprint_id: "",
  bundle_id: "",
  key_pair_name: "",
  user_data: "",
  ip_address_type: "dualstack",
  auto_connect: true,
  auto_connect_group: "",
  tagsText: "",
};

type Ec2DetailActionFormState = {
  imageName: string;
  imageDescription: string;
  noReboot: boolean;
  instanceType: string;
  tagsText: string;
  allocationId: string;
  privateIp: string;
};

type LightsailDetailActionFormState = {
  snapshotName: string;
  staticIpName: string;
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

function getDefaultAutoConnectGroup(provider: string, credentialName: string) {
  const normalizedProvider = provider.trim().toLowerCase() || "cloud";
  const normalizedCredentialName = credentialName.trim() || "default";
  return `${normalizedProvider}/${normalizedCredentialName}`;
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
      name,
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

function getEC2QuotaItems(
  quota: AWSEC2Quota | null | undefined,
  t: ReturnType<typeof useTranslation>["t"],
) {
  if (!quota) return [];

  return [
    {
      key: "max_instances",
      label: t("cloud.providers.aws.max_instances", "Max instances"),
      value: quota.max_instances,
    },
    {
      key: "max_elastic_ips",
      label: t("cloud.providers.aws.max_elastic_ips", "Elastic IPs"),
      value: quota.max_elastic_ips,
    },
    {
      key: "vpc_max_elastic_ips",
      label: t("cloud.providers.aws.vpc_max_elastic_ips", "VPC EIPs"),
      value: quota.vpc_max_elastic_ips,
    },
    {
      key: "vpc_max_security_groups_per_interface",
      label: t("cloud.providers.aws.max_security_groups_per_interface", "SGs / ENI"),
      value: quota.vpc_max_security_groups_per_interface,
    },
  ].filter((item) => item.value > 0);
}

function AWSQuotaSummary({
  quota,
  error,
  t,
  compact = false,
}: {
  quota: AWSEC2Quota | null | undefined;
  error?: string;
  t: ReturnType<typeof useTranslation>["t"];
  compact?: boolean;
}) {
  const items = getEC2QuotaItems(quota, t);

  if (!items.length && !error) {
    return <span className="text-sm text-slate-400">-</span>;
  }

  return (
    <div className="space-y-2">
      {items.length ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item.key}
              className={
                compact
                  ? "rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                  : "rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
              }
            >
              {item.label}: {item.value}
            </span>
          ))}
        </div>
      ) : null}
      {quota?.region ? (
        <div className="text-xs text-slate-500">
          {t("cloud.providers.aws.quota_region", {
            region: quota.region,
            defaultValue: `Quota region: ${quota.region}`,
          })}
        </div>
      ) : null}
      {error ? <div className="text-xs text-amber-700">{error}</div> : null}
    </div>
  );
}

const DetailItem = CloudDetailItem;

function getSubnetVpcId(subnets: AWSSubnet[], subnetId: string) {
  return subnets.find((subnet) => subnet.subnet_id === subnetId)?.vpc_id || "";
}

function getImageLabel(image: AWSImage) {
  if (image.name && image.image_id) return `${image.name} (${image.image_id})`;
  return image.name || image.image_id || "-";
}

function formatTagMap(tags: Record<string, string>) {
  const entries = Object.entries(tags || {});
  if (!entries.length) return "";
  return entries.map(([key, value]) => `${key}=${value}`).join("\n");
}

function formatElasticAddress(address: AWSElasticAddress) {
  const parts = [address.public_ip, address.allocation_id].filter(Boolean);
  return parts.join(" / ") || "-";
}

export default function AWSPanel() {
  const { t } = useTranslation();
  const { confirm, dialog } = useWarningDialog();

  const [instanceView, setInstanceView] = React.useState<"ec2" | "lightsail">("ec2");
  const [initializing, setInitializing] = React.useState(true);
  const [panelLoading, setPanelLoading] = React.useState(false);
  const [credentialSaving, setCredentialSaving] = React.useState(false);
  const [credentialChecking, setCredentialChecking] = React.useState(false);
  const [credentialImportOpen, setCredentialImportOpen] = React.useState(false);
  const [credentialImportText, setCredentialImportText] = React.useState("");
  const [credentialPool, setCredentialPool] = React.useState<AWSCredentialPool | null>(null);
  const [selectedCredentialIds, setSelectedCredentialIds] = React.useState<string[]>([]);
  const [account, setAccount] = React.useState<AWSAccount | null>(null);
  const [catalog, setCatalog] = React.useState<AWSCatalog | null>(null);
  const [lightsailCatalog, setLightsailCatalog] = React.useState<AWSLightsailCatalog | null>(null);
  const [instances, setInstances] = React.useState<AWSInstance[]>([]);
  const [lightsailInstances, setLightsailInstances] = React.useState<AWSLightsailInstance[]>([]);
  const [detailInstance, setDetailInstance] = React.useState<AWSInstance | null>(null);
  const [detailData, setDetailData] = React.useState<AWSInstanceDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailActionLoading, setDetailActionLoading] = React.useState(false);
  const [detailActionForm, setDetailActionForm] = React.useState<Ec2DetailActionFormState>({
    imageName: "",
    imageDescription: "",
    noReboot: true,
    instanceType: "",
    tagsText: "",
    allocationId: "",
    privateIp: "",
  });
  const [lightsailDetailInstance, setLightsailDetailInstance] = React.useState<AWSLightsailInstance | null>(null);
  const [lightsailDetailData, setLightsailDetailData] = React.useState<AWSLightsailInstanceDetail | null>(null);
  const [lightsailDetailLoading, setLightsailDetailLoading] = React.useState(false);
  const [lightsailActionLoading, setLightsailActionLoading] = React.useState(false);
  const [lightsailDetailActionForm, setLightsailDetailActionForm] = React.useState<LightsailDetailActionFormState>({
    snapshotName: "",
    staticIpName: "",
  });
  const [credentialSecret, setCredentialSecret] = React.useState<CredentialSecretState | null>(null);
  const [credentialSecretLoading, setCredentialSecretLoading] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareTarget, setShareTarget] = React.useState<CloudInstanceShareTarget | null>(null);
  const [scriptTarget, setScriptTarget] = React.useState<CloudInstanceScriptTarget | null>(null);
  const [shareRecord, setShareRecord] = React.useState<CloudInstanceShareRecord | null>(null);
  const [shareLoading, setShareLoading] = React.useState(false);
  const [shareSaving, setShareSaving] = React.useState(false);
  const [shareDeleting, setShareDeleting] = React.useState(false);
  const [shareTitle, setShareTitle] = React.useState("");
  const [shareNote, setShareNote] = React.useState("");
  const [error, setError] = React.useState("");
  const [lightsailError, setLightsailError] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createSubmitting, setCreateSubmitting] = React.useState(false);
  const [ec2CatalogLoading, setEc2CatalogLoading] = React.useState(false);
  const [resourcesLoaded, setResourcesLoaded] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<CreateFormState>(initialCreateForm);
  const [lightsailCreateOpen, setLightsailCreateOpen] = React.useState(false);
  const [lightsailCreateSubmitting, setLightsailCreateSubmitting] = React.useState(false);
  const [lightsailCatalogLoading, setLightsailCatalogLoading] = React.useState(false);
  const [lightsailCreateForm, setLightsailCreateForm] = React.useState<LightsailCreateFormState>(
    initialLightsailCreateForm,
  );
  const activeRegion = credentialPool?.active_region || account?.region || "us-east-1";

  const clearPanelState = React.useCallback(() => {
    setAccount(null);
    setCatalog(null);
    setLightsailCatalog(null);
    setInstances([]);
    setLightsailInstances([]);
    setDetailData(null);
    setLightsailDetailData(null);
    setError("");
    setLightsailError("");
    setResourcesLoaded(false);
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

  const loadLightsailData = React.useCallback(async () => {
    try {
      const [nextLightsailCatalog, nextLightsailInstances] = await Promise.all([
        getAWSLightsailCatalog(),
        listAWSLightsailInstances(),
      ]);
      setLightsailCatalog(nextLightsailCatalog);
      setLightsailInstances(nextLightsailInstances);
      setLightsailError("");
    } catch (lightsailLoadError) {
      setLightsailCatalog(null);
      setLightsailInstances([]);
      setLightsailError(toErrorMessage(lightsailLoadError));
    }
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
      await loadLightsailData();
      setResourcesLoaded(true);
    } catch (panelError) {
      setAccount(null);
      setCatalog(null);
      setLightsailCatalog(null);
      setInstances([]);
      setLightsailInstances([]);
      setError(toErrorMessage(panelError));
      setLightsailError("");
      setResourcesLoaded(false);
    } finally {
      setPanelLoading(false);
    }
  }, [loadLightsailData]);

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
        if (!hasActiveCredential(nextPool)) {
          clearPanelState();
        } else {
          setError("");
          setLightsailError("");
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
    if (!lightsailCatalog) return;
    setLightsailCreateForm((previous) => ({
      ...previous,
      availability_zone:
        previous.availability_zone ||
        lightsailCatalog.regions.find((region) => region.name === activeRegion)?.availability_zones[0]?.name ||
        lightsailCatalog.regions[0]?.availability_zones[0]?.name ||
        "",
      blueprint_id: previous.blueprint_id || lightsailCatalog.blueprints[0]?.blueprint_id || "",
      bundle_id: previous.bundle_id || lightsailCatalog.bundles[0]?.bundle_id || "",
    }));
  }, [activeRegion, lightsailCatalog]);

  React.useEffect(() => {
    setSelectedCredentialIds((current) => {
      if (current.length === 0) {
        return current;
      }

      const validIds = new Set((credentialPool?.credentials ?? []).map((credential) => credential.id));
      const next = current.filter((id) => validIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [credentialPool]);

  const activeCredential = getActiveCredential(credentialPool);
  const credentialRows = credentialPool?.credentials ?? [];
  const selectedCredentials = credentialRows.filter((credential) => selectedCredentialIds.includes(credential.id));
  const allCredentialsSelected =
    credentialRows.length > 0 && selectedCredentialIds.length === credentialRows.length;
  const someCredentialsSelected =
    selectedCredentialIds.length > 0 && selectedCredentialIds.length < credentialRows.length;
  const defaultCreateGroup = getDefaultAutoConnectGroup("aws", activeCredential?.name || "");
  const activeQuota = account?.ec2_quota || activeCredential?.ec2_quota || null;
  const activeQuotaError = account?.ec2_quota_error || activeCredential?.ec2_quota_error || "";
  const selectedSubnetVpcId = getSubnetVpcId(catalog?.subnets || [], createForm.subnet_id);
  const filteredSecurityGroups = (catalog?.security_groups || []).filter((group) =>
    selectedSubnetVpcId ? group.vpc_id === selectedSubnetVpcId : true,
  );

  const assertCredentialsDeleted = (nextPool: AWSCredentialPool, credentialIds: string[]) => {
    const remaining = nextPool.credentials.filter((credential) => credentialIds.includes(credential.id));
    if (remaining.length > 0) {
      throw new Error(
        t("cloud.tokens.delete_not_applied", {
          defaultValue: "Delete request returned success, but the token still exists. Refresh and try again.",
        }),
      );
    }
  };

  const syncCredentialPoolAfterDelete = async (
    nextPool: AWSCredentialPool,
    removedCredentialIds: string[],
  ) => {
    setCredentialPool(nextPool);
    setSelectedCredentialIds((current) => current.filter((id) => !removedCredentialIds.includes(id)));
    if (hasActiveCredential(nextPool)) {
      if (resourcesLoaded) {
        await loadPanelData();
      } else {
        clearPanelState();
      }
    } else {
      clearPanelState();
    }
  };

  const toggleCredentialSelection = (credentialId: string, checked: boolean) => {
    setSelectedCredentialIds((current) => {
      if (checked) {
        return current.includes(credentialId) ? current : [...current, credentialId];
      }
      return current.filter((id) => id !== credentialId);
    });
  };

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
        if (resourcesLoaded) {
          await loadPanelData();
        } else {
          clearPanelState();
        }
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
        if (resourcesLoaded) {
          await loadPanelData();
        } else {
          clearPanelState();
        }
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
    options?: { loadResources?: boolean },
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
      if (options?.loadResources) {
        await loadPanelData();
      } else {
        clearPanelState();
      }
    } catch (selectError) {
      toast.error(toErrorMessage(selectError));
    }
  };

  const handleDeleteCredential = async (credential: AWSCredentialRecord) => {
    const confirmed = await confirm({
      title: t("cloud.tokens.delete", "Delete credential"),
      description: t("cloud.tokens.delete_confirm", {
        name: credential.name,
        defaultValue: `Delete token "${credential.name}"?`,
      }),
      confirmLabel: t("cloud.tokens.delete", "Delete"),
    });
    if (!confirmed) return;

    try {
      const nextPool = await deleteAWSCredential(credential.id);
      assertCredentialsDeleted(nextPool, [credential.id]);
      await syncCredentialPoolAfterDelete(nextPool, [credential.id]);
      toast.success(t("cloud.tokens.delete_success", "Token deleted"));
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  };

  const handleDeleteSelectedCredentials = async () => {
    if (!selectedCredentials.length) {
      return;
    }

    const confirmed = await confirm({
      title: t("cloud.tokens.delete_selected", {
        count: selectedCredentials.length,
        defaultValue: "Delete selected tokens",
      }),
      description: t("cloud.tokens.delete_selected_confirm", {
        count: selectedCredentials.length,
        defaultValue: `Delete ${selectedCredentials.length} selected tokens?`,
      }),
      confirmLabel: t("cloud.tokens.delete", "Delete"),
    });
    if (!confirmed) return;

    let latestPool: AWSCredentialPool | null = null;
    const removedIds: string[] = [];
    const failedIds: string[] = [];
    const failures: string[] = [];

    for (const credential of selectedCredentials) {
      try {
        const nextPool = await deleteAWSCredential(credential.id);
        assertCredentialsDeleted(nextPool, [credential.id]);
        latestPool = nextPool;
        removedIds.push(credential.id);
      } catch (deleteError) {
        failedIds.push(credential.id);
        failures.push(`${credential.name}: ${toErrorMessage(deleteError)}`);
      }
    }

    if (latestPool && removedIds.length > 0) {
      await syncCredentialPoolAfterDelete(latestPool, removedIds);
    }

    setSelectedCredentialIds(failedIds);

    if (failures.length > 0) {
      toast.error(failures.join("；"));
      return;
    }

    toast.success(
      t("cloud.tokens.delete_selected_success", {
        count: removedIds.length,
        defaultValue: `Deleted ${removedIds.length} tokens`,
      }),
    );
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
      if (hasActiveCredential(nextPool) && resourcesLoaded) {
        await loadPanelData();
      } else {
        clearPanelState();
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
        auto_connect: true,
        auto_connect_group: createForm.auto_connect_group || defaultCreateGroup,
      };
      await createAWSInstance(payload);
      toast.success(t("cloud.providers.aws.create_success", "EC2 instance launch submitted"));
      setCreateOpen(false);
      setCreateForm((previous) => ({
        ...initialCreateForm,
        image_id: previous.image_id,
        instance_type: previous.instance_type,
        auto_connect: true,
        auto_connect_group: defaultCreateGroup,
      }));
      await loadPanelData();
    } catch (createError) {
      toast.error(toErrorMessage(createError));
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleCreateLightsailInstance = async () => {
    setLightsailCreateSubmitting(true);
    try {
      const payload: CreateAWSLightsailInstanceInput = {
        name: lightsailCreateForm.name,
        availability_zone: lightsailCreateForm.availability_zone,
        blueprint_id: lightsailCreateForm.blueprint_id,
        bundle_id: lightsailCreateForm.bundle_id,
        key_pair_name: lightsailCreateForm.key_pair_name || "",
        user_data: lightsailCreateForm.user_data || "",
        ip_address_type: lightsailCreateForm.ip_address_type || "dualstack",
        tags: parseTags(lightsailCreateForm.tagsText),
        auto_connect: true,
        auto_connect_group: lightsailCreateForm.auto_connect_group || defaultCreateGroup,
      };
      await createAWSLightsailInstance(payload);
      toast.success(t("cloud.providers.aws.lightsail_create_success", "Lightsail instance launch submitted"));
      setLightsailCreateOpen(false);
      setLightsailCreateForm((previous) => ({
        ...initialLightsailCreateForm,
        availability_zone: previous.availability_zone,
        blueprint_id: previous.blueprint_id,
        bundle_id: previous.bundle_id,
        auto_connect: true,
        auto_connect_group: defaultCreateGroup,
      }));
      await loadPanelData();
    } catch (createError) {
      toast.error(toErrorMessage(createError));
    } finally {
      setLightsailCreateSubmitting(false);
    }
  };

  const ensureEc2CatalogLoaded = React.useCallback(async () => {
    if (catalog) {
      return catalog;
    }

    setEc2CatalogLoading(true);
    try {
      const nextCatalog = await getAWSCatalog();
      setCatalog(nextCatalog);
      setError("");
      return nextCatalog;
    } catch (catalogError) {
      toast.error(toErrorMessage(catalogError));
      return null;
    } finally {
      setEc2CatalogLoading(false);
    }
  }, [catalog]);

  const ensureLightsailCatalogLoaded = React.useCallback(async () => {
    if (lightsailCatalog) {
      return lightsailCatalog;
    }

    setLightsailCatalogLoading(true);
    try {
      const nextLightsailCatalog = await getAWSLightsailCatalog();
      setLightsailCatalog(nextLightsailCatalog);
      setLightsailError("");
      return nextLightsailCatalog;
    } catch (catalogError) {
      toast.error(toErrorMessage(catalogError));
      return null;
    } finally {
      setLightsailCatalogLoading(false);
    }
  }, [lightsailCatalog]);

  const handleOpenCreateDialog = async () => {
    setCreateForm((previous) => ({
      ...previous,
      auto_connect: true,
      auto_connect_group: defaultCreateGroup,
    }));
    const nextCatalog = await ensureEc2CatalogLoaded();
    if (!nextCatalog) {
      return;
    }
    setCreateOpen(true);
  };

  const handleOpenLightsailCreateDialog = async () => {
    setLightsailCreateForm((previous) => ({
      ...previous,
      auto_connect: true,
      auto_connect_group: defaultCreateGroup,
    }));
    const nextCatalog = await ensureLightsailCatalogLoaded();
    if (!nextCatalog) {
      return;
    }
    setLightsailCreateOpen(true);
  };

  const handleInstanceAction = async (instance: AWSInstance, type: string) => {
    try {
      await postAWSInstanceAction(instance.instance_id, { type });
      toast.success(t("cloud.action_success", "Operation submitted"));
      await loadPanelData();
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    }
  };

  const loadInstanceDetail = React.useCallback(async (instance: AWSInstance) => {
    setDetailInstance(instance);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const detail = await getAWSInstanceDetail(instance.instance_id);
      setDetailData(detail);
      setDetailActionForm({
        imageName: `${instance.name || instance.instance_id}-ami-${Date.now()}`,
        imageDescription: "",
        noReboot: true,
        instanceType: detail.instance.instance_type || "",
        tagsText: formatTagMap(detail.instance.tags),
        allocationId: "",
        privateIp: detail.instance.private_ip || "",
      });
    } catch (detailError) {
      toast.error(toErrorMessage(detailError));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleDetailedEc2Action = async (
    input: {
      type: string;
      name?: string;
      description?: string;
      no_reboot?: boolean;
      instance_type?: string;
      tags?: AWSTag[];
      allocation_id?: string;
      association_id?: string;
      private_ip?: string;
    },
  ) => {
    if (!detailInstance) return;
    setDetailActionLoading(true);
    try {
      await postAWSInstanceAction(detailInstance.instance_id, input);
      toast.success(t("cloud.action_success", "Operation submitted"));
      await loadPanelData();
      await loadInstanceDetail({
        ...detailInstance,
        instance_type: input.instance_type || detailInstance.instance_type,
      });
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    } finally {
      setDetailActionLoading(false);
    }
  };

  const handleLightsailInstanceAction = async (instance: AWSLightsailInstance, type: string) => {
    try {
      await postAWSLightsailInstanceAction(instance.name, { type });
      toast.success(t("cloud.action_success", "Operation submitted"));
      await loadPanelData();
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    }
  };

  const loadLightsailDetail = React.useCallback(async (instance: AWSLightsailInstance) => {
    setLightsailDetailInstance(instance);
    setLightsailDetailLoading(true);
    setLightsailDetailData(null);
    try {
      const detail = await getAWSLightsailInstanceDetail(instance.name);
      setLightsailDetailData(detail);
      setLightsailDetailActionForm({
        snapshotName: `${instance.name}-${Date.now()}`,
        staticIpName: `${instance.name}-ip-${Date.now()}`,
      });
    } catch (detailError) {
      toast.error(toErrorMessage(detailError));
    } finally {
      setLightsailDetailLoading(false);
    }
  }, []);

  const handleDetailedLightsailAction = async (
    input: {
      type: string;
      snapshot_name?: string;
      static_ip_name?: string;
      tags?: AWSTag[];
    },
  ) => {
    if (!lightsailDetailInstance) return;
    setLightsailActionLoading(true);
    try {
      await postAWSLightsailInstanceAction(lightsailDetailInstance.name, input);
      toast.success(t("cloud.action_success", "Operation submitted"));
      await loadPanelData();
      await loadLightsailDetail(lightsailDetailInstance);
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    } finally {
      setLightsailActionLoading(false);
    }
  };

  const handleDeleteInstance = async (instance: AWSInstance) => {
    const confirmed = await confirm({
      title: t("cloud.delete", "Delete instance"),
      description: t("cloud.providers.aws.delete_confirm", {
        name: instance.name || instance.instance_id,
        defaultValue: `Delete instance "${instance.name || instance.instance_id}"? This action cannot be undone.`,
      }),
      confirmLabel: t("cloud.delete", "Delete"),
    });
    if (!confirmed) return;

    try {
      await deleteAWSInstance(instance.instance_id);
      toast.success(t("cloud.providers.aws.delete_success", "Instance deleted"));
      await loadPanelData();
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  };

  const handleDeleteLightsailInstance = async (instance: AWSLightsailInstance) => {
    const confirmed = await confirm({
      title: t("cloud.delete", "Delete instance"),
      description: t("cloud.providers.aws.delete_confirm", {
        name: instance.name,
        defaultValue: `Delete instance "${instance.name}"? This action cannot be undone.`,
      }),
      confirmLabel: t("cloud.delete", "Delete"),
    });
    if (!confirmed) return;

    try {
      await deleteAWSLightsailInstance(instance.name);
      toast.success(t("cloud.providers.aws.delete_success", "Instance deleted"));
      await loadPanelData();
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  };

  const handleOpenShareDialog = async (target: CloudInstanceShareTarget) => {
    setShareTarget(target);
    setShareRecord(null);
    setShareTitle(target.resourceName);
    setShareNote("");
    setShareOpen(true);
    setShareLoading(true);

    try {
      const nextShare = await getCloudInstanceShare(
        target.provider,
        target.resourceType,
        target.resourceId,
      );
      setShareRecord(nextShare.token ? nextShare : null);
      setShareTitle(nextShare.title || target.resourceName);
      setShareNote(nextShare.note || "");
    } catch (shareError) {
      toast.error(toErrorMessage(shareError));
    } finally {
      setShareLoading(false);
    }
  };

  const handleSaveShare = async () => {
    if (!shareTarget) return;

    setShareSaving(true);
    try {
      const nextShare = await saveCloudInstanceShare(
        shareTarget.provider,
        shareTarget.resourceType,
        shareTarget.resourceId,
        {
          title: shareTitle,
          note: shareNote,
          share_password: false,
          share_managed_ssh_key: false,
        },
      );
      setShareRecord(nextShare);
      setShareTitle(nextShare.title || shareTarget.resourceName);
      setShareNote(nextShare.note || "");
      toast.success(t("cloud.share.save_success", "Share link saved"));
    } catch (shareError) {
      toast.error(toErrorMessage(shareError));
    } finally {
      setShareSaving(false);
    }
  };

  const handleDeleteShare = async () => {
    if (!shareTarget) return;

    const confirmed = await confirm({
      title: t("cloud.share.delete", "Revoke share link"),
      description: t("cloud.share.delete_confirm", {
        name: shareTarget.resourceName,
        defaultValue: `Revoke the share link for "${shareTarget.resourceName}"?`,
      }),
      confirmLabel: t("cloud.share.delete", "Revoke link"),
      tone: "warning",
    });
    if (!confirmed) return;

    setShareDeleting(true);
    try {
      await deleteCloudInstanceShare(
        shareTarget.provider,
        shareTarget.resourceType,
        shareTarget.resourceId,
      );
      setShareRecord(null);
      setShareNote("");
      toast.success(t("cloud.share.delete_success", "Share link revoked"));
    } catch (shareError) {
      toast.error(toErrorMessage(shareError));
    } finally {
      setShareDeleting(false);
    }
  };

  if (initializing) {
    return <Loading text="" />;
  }

  return (
    <AdminPageShell
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
            <Button
              size="1"
              onClick={() => {
                if (instanceView === "lightsail") {
                  void handleOpenLightsailCreateDialog();
                  return;
                }
                void handleOpenCreateDialog();
              }}
              disabled={!activeCredential || (instanceView === "lightsail" ? lightsailCatalogLoading : ec2CatalogLoading)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {instanceView === "lightsail"
                ? t("cloud.providers.aws.lightsail_create", "Create Lightsail")
                : t("cloud.providers.aws.create", "Launch EC2")}
            </Button>
          </>
        }
      >
      {error ? (
        <WarningAlert tone="warning" description={error} />
      ) : null}

      {activeQuotaError ? (
        <WarningAlert
          tone="warning"
          description={
            <>
              {t(
                "cloud.providers.aws.quota_warning",
                "AWS credentials are valid, but Komari could not read EC2 account quotas for the active region.",
              )}{" "}
              {activeQuotaError}
            </>
          }
        />
      ) : null}

      <div className={`order-1 ${cloudPanelCardClassName}`}>
            <div className={cloudPanelHeaderClassName}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className={cloudPanelTitleClassName}>
                    {t("cloud.providers.aws.credentials", "Credentials")}
                  </div>
                  <div className={cloudPanelDescriptionClassName}>
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
                  <Button
                    variant="outline"
                    size="1"
                    color="red"
                    onClick={() => {
                      void handleDeleteSelectedCredentials();
                    }}
                    disabled={selectedCredentials.length === 0}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("cloud.tokens.delete_selected", {
                      count: selectedCredentials.length,
                      defaultValue: "Delete selected",
                    })}
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
                    <TableHead className="w-10">
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={allCredentialsSelected || (someCredentialsSelected && "indeterminate")}
                          onCheckedChange={(checked) => {
                            setSelectedCredentialIds(Boolean(checked) ? credentialRows.map((credential) => credential.id) : []);
                          }}
                          aria-label={t("cloud.tokens.select_all", "Select all tokens")}
                        />
                      </div>
                    </TableHead>
                    <TableHead>{t("cloud.tokens.table.name", "Name")}</TableHead>
                    <TableHead>{t("cloud.providers.aws.access_key", "Access Key")}</TableHead>
                    <TableHead>{t("cloud.tokens.table.account", "Account")}</TableHead>
                    <TableHead>{t("cloud.providers.aws.default_region", "Default Region")}</TableHead>
                    <TableHead>{t("cloud.providers.aws.ec2_quota", "EC2 Quota")}</TableHead>
                    <TableHead>{t("cloud.tokens.table.status", "Status")}</TableHead>
                    <TableHead>{t("cloud.tokens.table.checked_at", "Last Checked")}</TableHead>
                    <TableHead className="text-right">{t("common.action", "Action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!credentialRows.length ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-slate-500">
                        {t("cloud.providers.aws.credentials_empty", "No AWS credentials saved yet")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    credentialRows.map((credential) => (
                      <TableRow key={credential.id}>
                        <TableCell className="w-10">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={selectedCredentialIds.includes(credential.id)}
                              onCheckedChange={(checked) => {
                                toggleCredentialSelection(credential.id, Boolean(checked));
                              }}
                              aria-label={t("cloud.tokens.select_one", {
                                name: credential.name,
                                defaultValue: `Select token ${credential.name}`,
                              })}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">
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
                          <div className="text-sm text-slate-900 dark:text-slate-100">{credential.account_id || "-"}</div>
                          {credential.arn ? (
                            <div className="max-w-64 truncate text-xs text-slate-500 dark:text-slate-400">{credential.arn}</div>
                          ) : null}
                        </TableCell>
                        <TableCell>{credential.default_region || "-"}</TableCell>
                        <TableCell className="min-w-64">
                          <AWSQuotaSummary
                            quota={credential.ec2_quota}
                            error={credential.ec2_quota_error}
                            t={t}
                            compact
                          />
                        </TableCell>
                        <TableCell>
                          <Badge color={getCredentialStatusColor(credential.last_status)}>
                            {t(`cloud.tokens.status.${credential.last_status}`, credential.last_status || "unknown")}
                          </Badge>
                          {credential.last_error ? (
                            <div className={`mt-1 max-w-64 text-xs text-red-600 ${cloudLongTextClassName}`}>
                              {credential.last_error}
                            </div>
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
                                });
                              }}
                            >
                              <Server className="mr-1 h-3.5 w-3.5" />
                              {t("cloud.providers.aws.view_instances", "View Instances")}
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

      <div className="order-2 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div className={cloudPanelCardClassName.replace("overflow-hidden ", "") + " px-5 py-4"}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className={cloudPanelTitleClassName}>
                  {t("cloud.providers.aws.active_region", "Active Region")}
                </div>
                <div className={cloudPanelDescriptionClassName}>
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

          <div className={cloudPanelCardClassName.replace("overflow-hidden ", "") + " px-5 py-4"}>
            <div className={cloudPanelTitleClassName}>
              {t("cloud.providers.aws.account_snapshot", "Account Snapshot")}
            </div>
            <div className={cloudPanelDescriptionClassName}>
              {t(
                "cloud.providers.aws.account_snapshot_description",
                "Review the active account identity and the EC2 quotas Komari can currently read for this region.",
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DetailItem
                label={t("cloud.tokens.table.account", "Account")}
                value={account?.account_id || activeCredential?.account_id || "-"}
              />
              <DetailItem
                label={t("cloud.providers.aws.user_id", "User ID")}
                value={account?.user_id || activeCredential?.user_id || "-"}
              />
              <DetailItem
                label={t("cloud.providers.aws.arn", "ARN")}
                value={account?.arn || activeCredential?.arn || "-"}
              />
              <DetailItem
                label={t("cloud.providers.aws.quota_scope", "Quota Scope")}
                value={activeQuota?.region || activeRegion}
              />
            </div>

            <div className={`mt-4 ${cloudPanelSectionClassName}`}>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                {t("cloud.providers.aws.ec2_quota", "EC2 Quota")}
              </div>
              <div className="mt-2">
                <AWSQuotaSummary quota={activeQuota} error={activeQuotaError} t={t} />
              </div>
            </div>
          </div>
        </div>

        <div className="order-3">
          <Tabs.Root value={instanceView} onValueChange={(value) => setInstanceView(value as "ec2" | "lightsail")}>
            <div className={cloudPanelCardClassName}>
              <div className={cloudPanelHeaderClassName}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className={cloudPanelTitleClassName}>
                      {t("cloud.providers.aws.compute", "Compute")}
                    </div>
                    <div className={cloudPanelDescriptionClassName}>
                      {t(
                        "cloud.providers.aws.instance_list_description",
                        "The list is scoped to the active credential and active region.",
                      )}
                    </div>
                  </div>
                  <Flex gap="2" wrap="wrap" align="center">
                    <Tabs.List>
                      <Tabs.Trigger value="ec2">
                        {t("cloud.providers.aws.instance_list", "EC2 Instances")} ({instances.length})
                      </Tabs.Trigger>
                      <Tabs.Trigger value="lightsail">
                        {t("cloud.providers.aws.lightsail_instances", "Lightsail")} ({lightsailInstances.length})
                      </Tabs.Trigger>
                    </Tabs.List>
                  </Flex>
                </div>
              </div>

              <Tabs.Content value="ec2">
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
                            : error
                              ? t("cloud.load_failed", "Unable to load cloud resources. Check the warning above and try again.")
                              : !hasActiveCredential(credentialPool)
                                ? t("cloud.providers.aws.no_active_credential", "Select an active AWS credential first")
                                : !resourcesLoaded
                                  ? t("cloud.load_resources_prompt", "Click Refresh to load cloud resources on demand.")
                                  : t("cloud.providers.aws.empty", "No EC2 instances found in this region")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      instances.map((instance) => (
                        <TableRow key={instance.instance_id}>
                          <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                            <button
                              type="button"
                              className="text-left text-blue-700 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                              onClick={() => {
                                void loadInstanceDetail(instance);
                              }}
                            >
                              {instance.name || instance.instance_id}
                            </button>
                          </TableCell>
                          <TableCell>
                            <Badge color={getInstanceStateColor(instance.state)}>
                              {getCloudStatusLabel(instance.state, t)}
                            </Badge>
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
                                onClick={() => {
                                  setScriptTarget({
                                    providerLabel: t("cloud.providers.aws.ec2_label", "AWS EC2"),
                                    instanceName: instance.name || instance.instance_id,
                                    instanceIdentifier: instance.instance_id,
                                    addresses: [instance.public_ip, instance.private_ip].filter(Boolean),
                                    groupHint: getDefaultAutoConnectGroup("aws", activeCredential?.name || ""),
                                  });
                                }}
                              >
                                {t("cloud.script.action", "Run Script")}
                              </Button>
                              <Button
                                variant="soft"
                                size="1"
                                onClick={() => {
                                  void handleOpenShareDialog({
                                    provider: "aws",
                                    resourceType: "ec2",
                                    resourceId: instance.instance_id,
                                    resourceName: instance.name || instance.instance_id,
                                    providerLabel: t("cloud.providers.aws.ec2_label", "AWS EC2"),
                                    credentialName: getActiveCredential(credentialPool)?.name || "",
                                    region: activeRegion,
                                    primaryAddress: instance.public_ip || instance.private_ip || "",
                                    canSharePassword: false,
                                    canShareManagedSSHKey: false,
                                  });
                                }}
                              >
                                <Share2 className="mr-1 h-3.5 w-3.5" />
                                {t("cloud.share.action", "Share")}
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
              </Tabs.Content>

              <Tabs.Content value="lightsail">
                {lightsailError ? (
                  <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                    {lightsailError}
                  </div>
                ) : null}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("cloud.table.name", "Name")}</TableHead>
                      <TableHead>{t("cloud.table.status", "Status")}</TableHead>
                      <TableHead>{t("cloud.providers.aws.az", "AZ")}</TableHead>
                      <TableHead>{t("cloud.table.ip", "Public IP")}</TableHead>
                      <TableHead>{t("cloud.table.size", "Size")}</TableHead>
                      <TableHead>{t("cloud.table.image", "Image")}</TableHead>
                      <TableHead>{t("cloud.providers.aws.static_ip", "Static IP")}</TableHead>
                      <TableHead>{t("cloud.table.created_at", "Created")}</TableHead>
                      <TableHead className="text-right">{t("common.action", "Action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lightsailInstances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center text-slate-500">
                          {panelLoading
                            ? t("cloud.loading", "Loading cloud resources...")
                            : lightsailError || error
                              ? t("cloud.load_failed", "Unable to load cloud resources. Check the warning above and try again.")
                              : !hasActiveCredential(credentialPool)
                                ? t("cloud.providers.aws.no_active_credential", "Select an active AWS credential first")
                                : !resourcesLoaded
                                  ? t("cloud.load_resources_prompt", "Click Refresh to load cloud resources on demand.")
                                  : t("cloud.providers.aws.lightsail_empty", "No Lightsail instances found in this region")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      lightsailInstances.map((instance) => (
                        <TableRow key={instance.name}>
                          <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                            <button
                              type="button"
                              className="text-left text-blue-700 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                              onClick={() => {
                                void loadLightsailDetail(instance);
                              }}
                            >
                              {instance.name}
                            </button>
                          </TableCell>
                          <TableCell>
                            <Badge color={getInstanceStateColor(instance.state)}>
                              {getCloudStatusLabel(instance.state, t)}
                            </Badge>
                          </TableCell>
                          <TableCell>{instance.availability_zone || "-"}</TableCell>
                          <TableCell>{instance.public_ip || instance.private_ip || "-"}</TableCell>
                          <TableCell>{instance.bundle_id || "-"}</TableCell>
                          <TableCell>{instance.blueprint_name || instance.blueprint_id || "-"}</TableCell>
                          <TableCell>{instance.is_static_ip ? t("common.yes", "Yes") : "-"}</TableCell>
                          <TableCell>{formatDateTime(instance.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <Flex justify="end" gap="2" wrap="wrap">
                              {instance.state === "running" ? (
                                <Button
                                  variant="soft"
                                  size="1"
                                  color="amber"
                                  onClick={() => {
                                    void handleLightsailInstanceAction(instance, "stop");
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
                                  onClick={() => {
                                    void handleLightsailInstanceAction(instance, "start");
                                  }}
                                >
                                  <Power className="mr-1 h-3.5 w-3.5" />
                                  {t("cloud.power_on", "Power On")}
                                </Button>
                              )}
                              <Button
                                variant="soft"
                                size="1"
                                onClick={() => {
                                  void handleLightsailInstanceAction(instance, "reboot");
                                }}
                              >
                                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                {t("cloud.reboot", "Reboot")}
                              </Button>
                              <Button
                                variant="soft"
                                size="1"
                                onClick={() => {
                                  setScriptTarget({
                                    providerLabel: t("cloud.providers.aws.lightsail_label", "AWS Lightsail"),
                                    instanceName: instance.name,
                                    instanceIdentifier: instance.name,
                                    addresses: [instance.public_ip, instance.private_ip, ...instance.ipv6_addresses].filter(Boolean),
                                    groupHint: getDefaultAutoConnectGroup("aws", activeCredential?.name || ""),
                                  });
                                }}
                              >
                                {t("cloud.script.action", "Run Script")}
                              </Button>
                              <Button
                                variant="soft"
                                size="1"
                                onClick={() => {
                                  void handleOpenShareDialog({
                                    provider: "aws",
                                    resourceType: "lightsail",
                                    resourceId: instance.name,
                                    resourceName: instance.name,
                                    providerLabel: t("cloud.providers.aws.lightsail_label", "AWS Lightsail"),
                                    credentialName: getActiveCredential(credentialPool)?.name || "",
                                    region: activeRegion,
                                    primaryAddress: instance.public_ip || instance.private_ip || "",
                                    canSharePassword: false,
                                    canShareManagedSSHKey: false,
                                  });
                                }}
                              >
                                <Share2 className="mr-1 h-3.5 w-3.5" />
                                {t("cloud.share.action", "Share")}
                              </Button>
                              <Button
                                variant="soft"
                                size="1"
                                color="red"
                                onClick={() => {
                                  void handleDeleteLightsailInstance(instance);
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
              </Tabs.Content>
            </div>
          </Tabs.Root>
        </div>

      <Dialog.Root open={credentialImportOpen} onOpenChange={setCredentialImportOpen}>
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{t("cloud.providers.aws.import_dialog_title", "Batch Import AWS Credentials")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.aws.import_dialog_description",
              "One line per credential. Format: name,accessKeyId,secretAccessKey,region[,sessionToken].",
            )}
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-4">
            <TextArea
              className="min-h-40 font-mono text-xs [overflow-wrap:anywhere]"
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
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{t("cloud.providers.aws.create", "Launch EC2")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.aws.create_description",
              "Launch a single EC2 instance in the active region. If your account has no default VPC, choose a subnet and matching security groups.",
            )}
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-4">
            <label className={cloudPanelFieldLabelClassName}>
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

            <label className={cloudPanelFieldLabelClassName}>
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

            <label className={cloudPanelFieldLabelClassName}>
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

            <label className={cloudPanelFieldLabelClassName}>
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

            <WarningAlert
              tone="warning"
              description={
                selectedSubnetVpcId
                  ? t("cloud.providers.aws.security_group_hint_vpc", {
                      vpc: selectedSubnetVpcId,
                      defaultValue: `Showing groups from VPC ${selectedSubnetVpcId}`,
                    })
                  : t(
                      "cloud.providers.aws.security_group_hint",
                      "Select matching security groups when you choose a subnet. Leave empty to let AWS use the subnet default behavior.",
                    )
              }
            />

            <div className={cloudPanelSubcardClassName}>
              <div className={cloudPanelFieldLabelClassName}>
                {t("cloud.providers.aws.security_groups", "Security Groups")}
              </div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
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
                        className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(nextChecked) =>
                            setCreateForm((previous) => ({
                              ...previous,
                              security_group_ids: nextChecked === true
                                ? [...previous.security_group_ids, group.group_id]
                                : previous.security_group_ids.filter((value) => value !== group.group_id),
                            }))
                          }
                        />
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-900 dark:text-slate-100">
                            {group.group_name}
                          </span>
                          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                            {group.group_id} / {group.vpc_id}
                          </span>
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {t("cloud.providers.aws.security_groups_empty", "No security groups found")}
                  </div>
                )}
              </div>
            </div>

            <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
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

      <Dialog.Root open={lightsailCreateOpen} onOpenChange={setLightsailCreateOpen}>
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{t("cloud.providers.aws.lightsail_create", "Create Lightsail")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.aws.lightsail_create_description",
              "Create a Lightsail instance in the active region using a blueprint and bundle.",
            )}
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-4">
            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.providers.aws.az", "AZ")}
            </label>
            <Select.Root
              value={lightsailCreateForm.availability_zone}
              onValueChange={(value) =>
                setLightsailCreateForm((previous) => ({ ...previous, availability_zone: value }))
              }
            >
              <Select.Trigger placeholder={t("cloud.providers.aws.az", "AZ")} />
              <Select.Content>
                {(lightsailCatalog?.regions.find((region) => region.name === activeRegion)?.availability_zones
                  || lightsailCatalog?.regions[0]?.availability_zones
                  || []).map((zone) => (
                  <Select.Item key={zone.name} value={zone.name}>
                    {zone.name} / {zone.state || "-"}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.form.image", "Image")}
            </label>
            <Select.Root
              value={lightsailCreateForm.blueprint_id}
              onValueChange={(value) =>
                setLightsailCreateForm((previous) => ({ ...previous, blueprint_id: value }))
              }
            >
              <Select.Trigger placeholder={t("cloud.form.image_placeholder", "Select an image")} />
              <Select.Content>
                {(lightsailCatalog?.blueprints || []).map((blueprint) => (
                  <Select.Item key={blueprint.blueprint_id} value={blueprint.blueprint_id}>
                    {blueprint.platform ? `${blueprint.platform} / ` : ""}
                    {blueprint.name || blueprint.blueprint_id}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.form.size", "Size")}
            </label>
            <Select.Root
              value={lightsailCreateForm.bundle_id}
              onValueChange={(value) =>
                setLightsailCreateForm((previous) => ({ ...previous, bundle_id: value }))
              }
            >
              <Select.Trigger placeholder={t("cloud.form.size_placeholder", "Select a size")} />
              <Select.Content>
                {(lightsailCatalog?.bundles || []).map((bundle) => (
                  <Select.Item key={bundle.bundle_id} value={bundle.bundle_id}>
                    {bundle.bundle_id} / {bundle.cpu_count} vCPU / {bundle.ram_size_in_gb} GB / ${bundle.price.toFixed(2)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.providers.aws.key_pair", "Key Pair")}
            </label>
            <Select.Root
              value={lightsailCreateForm.key_pair_name || SELECT_NONE}
              onValueChange={(value) =>
                setLightsailCreateForm((previous) => ({
                  ...previous,
                  key_pair_name: value === SELECT_NONE ? "" : value,
                }))
              }
            >
              <Select.Trigger placeholder={t("cloud.providers.aws.key_pair_optional", "Optional")} />
              <Select.Content>
                <Select.Item value={SELECT_NONE}>{t("cloud.providers.aws.none", "None")}</Select.Item>
                {(lightsailCatalog?.key_pairs || []).map((keyPair) => (
                  <Select.Item key={keyPair.name} value={keyPair.name}>
                    {keyPair.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.providers.aws.ip_address_type", "IP Address Type")}
            </label>
            <Select.Root
              value={lightsailCreateForm.ip_address_type || "dualstack"}
              onValueChange={(value) =>
                setLightsailCreateForm((previous) => ({ ...previous, ip_address_type: value }))
              }
            >
              <Select.Trigger placeholder={t("cloud.providers.aws.ip_address_type", "IP Address Type")} />
              <Select.Content>
                <Select.Item value="dualstack">dualstack</Select.Item>
                <Select.Item value="ipv4">ipv4</Select.Item>
                <Select.Item value="ipv6">ipv6</Select.Item>
              </Select.Content>
            </Select.Root>

            <Flex justify="end" gap="2">
              <Button variant="outline" onClick={() => setLightsailCreateOpen(false)} disabled={lightsailCreateSubmitting}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                onClick={() => {
                  void handleCreateLightsailInstance();
                }}
                disabled={
                  lightsailCreateSubmitting ||
                  !lightsailCreateForm.availability_zone ||
                  !lightsailCreateForm.blueprint_id ||
                  !lightsailCreateForm.bundle_id
                }
              >
                {lightsailCreateSubmitting
                  ? t("cloud.creating", "Creating...")
                  : t("cloud.providers.aws.lightsail_create", "Create Lightsail")}
              </Button>
            </Flex>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(detailInstance)}
        onOpenChange={(open) => {
          if (open) return;
          setDetailInstance(null);
          setDetailData(null);
        }}
      >
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{detailInstance?.name || detailInstance?.instance_id || t("cloud.providers.aws.ec2_label", "AWS EC2")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.aws.detail_description",
              "View the selected EC2 instance details from the current active credential and region.",
            )}
          </Dialog.Description>

          {detailLoading ? (
            <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t("cloud.loading", "Loading cloud resources...")}</div>
          ) : detailData ? (
            <div className="mt-4 flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem
                  label={t("cloud.providers.aws.instance_id", "EC2 Instance ID")}
                  value={detailData.instance.instance_id}
                />
                <DetailItem
                  label={t("cloud.table.status", "Status")}
                  value={getCloudStatusLabel(detailData.instance.state, t)}
                />
                <DetailItem label={t("cloud.providers.aws.az", "AZ")} value={detailData.instance.availability_zone || "-"} />
                <DetailItem label={t("cloud.table.ip", "Public IP")} value={detailData.instance.public_ip || detailData.instance.private_ip || "-"} />
                <DetailItem label={t("cloud.table.size", "Size")} value={detailData.instance.instance_type || "-"} />
                <DetailItem label={t("cloud.table.image", "Image")} value={detailData.instance.image_id || "-"} />
                <DetailItem label={t("cloud.providers.aws.key_pair", "Key Pair")} value={detailData.instance.key_name || "-"} />
                <DetailItem label={t("cloud.table.created_at", "Created")} value={formatDateTime(detailData.instance.launch_time)} />
                <DetailItem label={t("cloud.providers.aws.vpc", "VPC")} value={detailData.vpc_id || "-"} />
                <DetailItem label={t("cloud.providers.aws.subnet", "Subnet")} value={detailData.subnet_id || "-"} />
                <DetailItem
                  label={t("cloud.providers.aws.monitoring", "Monitoring")}
                  value={getCloudStatusLabel(detailData.monitoring_state, t)}
                />
                <DetailItem label={t("cloud.providers.aws.architecture", "Architecture")} value={detailData.architecture || "-"} />
                <DetailItem label={t("cloud.providers.aws.public_dns", "Public DNS")} value={detailData.public_dns_name || "-"} />
                <DetailItem label={t("cloud.providers.aws.private_dns", "Private DNS")} value={detailData.private_dns_name || "-"} />
              </div>

              <div className={cloudPanelSubcardClassName}>
                <div className={cloudPanelTitleClassName}>
                  {t("cloud.detail.tags", "Tags")}
                </div>
                <TextArea
                  className="mt-3 min-h-28"
                  value={detailActionForm.tagsText}
                  onChange={(event) =>
                    setDetailActionForm((previous) => ({ ...previous, tagsText: event.target.value }))
                  }
                />
                <Flex justify="end" gap="2" className="mt-3">
                  <Button
                    size="1"
                    disabled={detailActionLoading}
                    onClick={() => {
                      void handleDetailedEc2Action({
                        type: "sync_tags",
                        tags: parseTags(detailActionForm.tagsText),
                      });
                    }}
                  >
                    {t("cloud.providers.aws.sync_tags", "Sync Tags")}
                  </Button>
                </Flex>
              </div>

              <div className={cloudPanelSubcardClassName}>
                <div className={cloudPanelTitleClassName}>
                  {t("cloud.providers.aws.storage", "Volumes")}
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {detailData.volumes.length ? detailData.volumes.map((volume) => (
                    <div key={volume.volume_id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{volume.device_name || volume.volume_id}</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {volume.size_gib} GiB / {volume.volume_type} / {volume.state}
                      </div>
                    </div>
                  )) : (
                    <div className="text-sm text-slate-500 dark:text-slate-400">-</div>
                  )}
                </div>
                <Flex justify="end" gap="2" className="mt-3">
                  <Button
                    size="1"
                    disabled={detailActionLoading || !detailData.volumes.length}
                    onClick={() => {
                      void handleDetailedEc2Action({
                        type: "create_snapshots",
                        description: `Snapshots for ${detailData.instance.instance_id}`,
                      });
                    }}
                  >
                    {t("cloud.providers.aws.create_snapshots", "Create Snapshots")}
                  </Button>
                </Flex>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className={cloudPanelSubcardClassName}>
                  <div className={cloudPanelTitleClassName}>
                    {t("cloud.providers.aws.change_type", "Change Instance Type")}
                  </div>
                  <Select.Root
                    value={detailActionForm.instanceType || SELECT_NONE}
                    onValueChange={(value) =>
                      setDetailActionForm((previous) => ({
                        ...previous,
                        instanceType: value === SELECT_NONE ? "" : value,
                      }))
                    }
                  >
                    <Select.Trigger className="mt-3" placeholder={t("cloud.providers.aws.instance_type", "Instance Type")} />
                    <Select.Content>
                      <Select.Item value={SELECT_NONE}>{t("cloud.providers.aws.none", "None")}</Select.Item>
                      {(catalog?.instance_types || []).map((instanceType) => (
                        <Select.Item key={instanceType.name} value={instanceType.name}>
                          {instanceType.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                  <Flex justify="end" gap="2" className="mt-3">
                    <Button
                      size="1"
                      disabled={detailActionLoading || !detailActionForm.instanceType}
                      onClick={() => {
                        void handleDetailedEc2Action({
                          type: "change_type",
                          instance_type: detailActionForm.instanceType,
                        });
                      }}
                    >
                      {t("cloud.providers.aws.change_type", "Change Instance Type")}
                    </Button>
                  </Flex>
                </div>

                <div className={cloudPanelSubcardClassName}>
                  <div className={cloudPanelTitleClassName}>
                    {t("cloud.providers.aws.monitoring", "Monitoring")}
                  </div>
                  <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {getCloudStatusLabel(detailData.monitoring_state, t)}
                  </div>
                  <Flex justify="end" gap="2" className="mt-3">
                    <Button
                      size="1"
                      disabled={detailActionLoading}
                      onClick={() => {
                        void handleDetailedEc2Action({
                          type: detailData.monitoring_state === "enabled" ? "disable_monitoring" : "enable_monitoring",
                        });
                      }}
                    >
                      {detailData.monitoring_state === "enabled"
                        ? t("cloud.providers.aws.disable_monitoring", "Disable Monitoring")
                        : t("cloud.providers.aws.enable_monitoring", "Enable Monitoring")}
                    </Button>
                  </Flex>
                </div>
              </div>

              <div className={cloudPanelSubcardClassName}>
                <div className={cloudPanelTitleClassName}>
                  {t("cloud.providers.aws.machine_image", "Machine Image")}
                </div>
                <TextField.Root
                  className="mt-3"
                  value={detailActionForm.imageName}
                  placeholder="komari-ami"
                  onChange={(event) =>
                    setDetailActionForm((previous) => ({ ...previous, imageName: event.target.value }))
                  }
                />
                <TextField.Root
                  className="mt-3"
                  value={detailActionForm.imageDescription}
                  placeholder={t("cloud.providers.aws.description_optional", "Description")}
                  onChange={(event) =>
                    setDetailActionForm((previous) => ({ ...previous, imageDescription: event.target.value }))
                  }
                />
                <label className={`mt-3 flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
                  <Checkbox
                    checked={detailActionForm.noReboot}
                    onCheckedChange={(checked) =>
                      setDetailActionForm((previous) => ({ ...previous, noReboot: Boolean(checked) }))
                    }
                  />
                  {t("cloud.providers.aws.no_reboot", "Create image without reboot")}
                </label>
                <Flex justify="end" gap="2" className="mt-3">
                  <Button
                    size="1"
                    disabled={detailActionLoading || !detailActionForm.imageName}
                    onClick={() => {
                      void handleDetailedEc2Action({
                        type: "create_image",
                        name: detailActionForm.imageName,
                        description: detailActionForm.imageDescription,
                        no_reboot: detailActionForm.noReboot,
                      });
                    }}
                  >
                    {t("cloud.providers.aws.create_image", "Create AMI")}
                  </Button>
                </Flex>
              </div>

              <div className={cloudPanelSubcardClassName}>
                <div className={cloudPanelTitleClassName}>
                  {t("cloud.providers.aws.elastic_ip", "Elastic IP")}
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {detailData.addresses.length ? detailData.addresses.map((address) => (
                    <div key={address.allocation_id || address.public_ip} className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{formatElasticAddress(address)}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {address.association_id ? (
                          <Button
                            variant="soft"
                            size="1"
                            disabled={detailActionLoading}
                            onClick={() => {
                              void handleDetailedEc2Action({
                                type: "disassociate_address",
                                association_id: address.association_id,
                              });
                            }}
                          >
                            {t("cloud.providers.aws.disassociate", "Disassociate")}
                          </Button>
                        ) : null}
                        {address.allocation_id ? (
                          <Button
                            variant="soft"
                            size="1"
                            color="red"
                            disabled={detailActionLoading}
                            onClick={() => {
                              void handleDetailedEc2Action({
                                type: "release_address",
                                allocation_id: address.allocation_id,
                              });
                            }}
                          >
                            {t("cloud.providers.aws.release", "Release")}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )) : (
                    <div className="text-sm text-slate-500 dark:text-slate-400">-</div>
                  )}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Select.Root
                    value={detailActionForm.allocationId || SELECT_NONE}
                    onValueChange={(value) =>
                      setDetailActionForm((previous) => ({
                        ...previous,
                        allocationId: value === SELECT_NONE ? "" : value,
                      }))
                    }
                  >
                    <Select.Trigger placeholder={t("cloud.providers.aws.elastic_ip_existing", "Existing Elastic IP")} />
                    <Select.Content>
                      <Select.Item value={SELECT_NONE}>{t("cloud.providers.aws.none", "None")}</Select.Item>
                      {(catalog?.elastic_addresses || [])
                        .filter((address) => !address.association_id)
                        .map((address) => (
                          <Select.Item key={address.allocation_id} value={address.allocation_id}>
                            {formatElasticAddress(address)}
                          </Select.Item>
                        ))}
                    </Select.Content>
                  </Select.Root>
                  <TextField.Root
                    value={detailActionForm.privateIp}
                    placeholder={t("cloud.providers.aws.private_ip_optional", "Optional private IP")}
                    onChange={(event) =>
                      setDetailActionForm((previous) => ({ ...previous, privateIp: event.target.value }))
                    }
                  />
                </div>
                <Flex justify="end" gap="2" className="mt-3">
                  <Button
                    size="1"
                    disabled={detailActionLoading}
                    onClick={() => {
                      void handleDetailedEc2Action({
                        type: "allocate_address",
                        private_ip: detailActionForm.privateIp,
                      });
                    }}
                  >
                    {t("cloud.providers.aws.allocate_attach", "Allocate and Attach")}
                  </Button>
                  <Button
                    size="1"
                    variant="outline"
                    disabled={detailActionLoading || !detailActionForm.allocationId}
                    onClick={() => {
                      void handleDetailedEc2Action({
                        type: "associate_address",
                        allocation_id: detailActionForm.allocationId,
                        private_ip: detailActionForm.privateIp,
                      });
                    }}
                  >
                    {t("cloud.providers.aws.attach_existing", "Attach Existing")}
                  </Button>
                </Flex>
              </div>

              {detailData.security_groups.length ? (
                <div className={cloudPanelSubcardClassName}>
                  <div className={cloudPanelTitleClassName}>
                    {t("cloud.providers.aws.security_groups", "Security Groups")}
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    {detailData.security_groups.map((group) => (
                      <div key={group.group_id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{group.group_name || group.group_id}</div>
                        <div className="text-slate-500 dark:text-slate-400">{group.group_id}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {detailData.console_output ? (
                <div className={cloudPanelSubcardClassName}>
                  <div className={cloudPanelTitleClassName}>
                    {t("cloud.providers.aws.console_output", "Console Output")}
                  </div>
                  <TextArea className="mt-3 min-h-40 font-mono text-xs" readOnly value={detailData.console_output} />
                </div>
              ) : null}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(lightsailDetailInstance)}
        onOpenChange={(open) => {
          if (open) return;
          setLightsailDetailInstance(null);
          setLightsailDetailData(null);
        }}
      >
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{lightsailDetailInstance?.name || t("cloud.providers.aws.lightsail_label", "AWS Lightsail")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.aws.lightsail_detail_description",
              "View the selected Lightsail instance details from the current active credential and region.",
            )}
          </Dialog.Description>

          {lightsailDetailLoading ? (
            <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t("cloud.loading", "Loading cloud resources...")}</div>
          ) : lightsailDetailData ? (
            <div className="mt-4 flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label={t("cloud.table.name", "Name")} value={lightsailDetailData.instance.name} />
                <DetailItem
                  label={t("cloud.table.status", "Status")}
                  value={getCloudStatusLabel(lightsailDetailData.instance.state, t)}
                />
                <DetailItem label={t("cloud.providers.aws.az", "AZ")} value={lightsailDetailData.instance.availability_zone || "-"} />
                <DetailItem label={t("cloud.table.ip", "Public IP")} value={lightsailDetailData.instance.public_ip || lightsailDetailData.instance.private_ip || "-"} />
                <DetailItem label={t("cloud.table.size", "Size")} value={lightsailDetailData.instance.bundle_id || "-"} />
                <DetailItem label={t("cloud.table.image", "Image")} value={lightsailDetailData.instance.blueprint_name || lightsailDetailData.instance.blueprint_id || "-"} />
                <DetailItem label={t("cloud.providers.aws.key_pair", "Key Pair")} value={lightsailDetailData.instance.ssh_key_name || "-"} />
                <DetailItem label={t("cloud.table.created_at", "Created")} value={formatDateTime(lightsailDetailData.instance.created_at)} />
              </div>

              <div className={cloudPanelSubcardClassName}>
                <div className={cloudPanelTitleClassName}>
                  {t("cloud.providers.aws.ports", "Firewall Ports")}
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {lightsailDetailData.ports.length ? lightsailDetailData.ports.map((port) => (
                    <div key={`${port.protocol}-${port.from_port}-${port.to_port}`} className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {port.common_name || `${port.protocol}:${port.from_port}-${port.to_port}`}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {port.access_type || "-"} / {port.access_from || "-"} / {(port.cidrs || []).join(", ") || "-"}
                      </div>
                    </div>
                  )) : (
                    <div className="text-sm text-slate-500 dark:text-slate-400">-</div>
                  )}
                </div>
              </div>

              <div className={cloudPanelSubcardClassName}>
                <div className={cloudPanelTitleClassName}>
                  {t("cloud.providers.aws.static_ip", "Static IP")}
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {lightsailDetailData.static_ips.length ? lightsailDetailData.static_ips.map((staticIP) => (
                    <div key={staticIP.name} className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{staticIP.name}</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {staticIP.ip_address || "-"} / {staticIP.attached_to || "-"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {staticIP.attached_to === lightsailDetailData.instance.name ? (
                          <Button
                            variant="soft"
                            size="1"
                            disabled={lightsailActionLoading}
                            onClick={() => {
                              void handleDetailedLightsailAction({
                                type: "detach_static_ip",
                                static_ip_name: staticIP.name,
                              });
                            }}
                          >
                            {t("cloud.providers.aws.disassociate", "Disassociate")}
                          </Button>
                        ) : !staticIP.is_attached ? (
                          <Button
                            variant="soft"
                            size="1"
                            disabled={lightsailActionLoading}
                            onClick={() => {
                              void handleDetailedLightsailAction({
                                type: "attach_static_ip",
                                static_ip_name: staticIP.name,
                              });
                            }}
                          >
                            {t("cloud.providers.aws.attach_existing", "Attach Existing")}
                          </Button>
                        ) : null}
                        {!staticIP.is_attached ? (
                          <Button
                            variant="soft"
                            size="1"
                            color="red"
                            disabled={lightsailActionLoading}
                            onClick={() => {
                              void handleDetailedLightsailAction({
                                type: "release_static_ip",
                                static_ip_name: staticIP.name,
                              });
                            }}
                          >
                            {t("cloud.providers.aws.release", "Release")}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )) : (
                    <div className="text-sm text-slate-500 dark:text-slate-400">-</div>
                  )}
                </div>
                <TextField.Root
                  className="mt-3"
                  value={lightsailDetailActionForm.staticIpName}
                  placeholder={t("cloud.providers.aws.static_ip_name", "Static IP name")}
                  onChange={(event) =>
                    setLightsailDetailActionForm((previous) => ({
                      ...previous,
                      staticIpName: event.target.value,
                    }))
                  }
                />
                <Flex justify="end" gap="2" className="mt-3">
                  <Button
                    size="1"
                    disabled={lightsailActionLoading || !lightsailDetailActionForm.staticIpName}
                    onClick={() => {
                      void handleDetailedLightsailAction({
                        type: "allocate_static_ip",
                        static_ip_name: lightsailDetailActionForm.staticIpName,
                      });
                    }}
                  >
                    {t("cloud.providers.aws.allocate_static_ip", "Allocate Static IP")}
                  </Button>
                </Flex>
              </div>

              <div className={cloudPanelSubcardClassName}>
                <div className={cloudPanelTitleClassName}>
                  {t("cloud.providers.aws.snapshots", "Snapshots")}
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {lightsailDetailData.snapshots.length ? lightsailDetailData.snapshots.map((snapshot) => (
                    <div key={snapshot.name} className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{snapshot.name}</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {snapshot.state || "-"} / {snapshot.size_in_gb} GB / {formatDateTime(snapshot.created_at)}
                      </div>
                    </div>
                  )) : (
                    <div className="text-sm text-slate-500 dark:text-slate-400">-</div>
                  )}
                </div>
                <TextField.Root
                  className="mt-3"
                  value={lightsailDetailActionForm.snapshotName}
                  placeholder={t("cloud.providers.aws.snapshot_name", "Snapshot name")}
                  onChange={(event) =>
                    setLightsailDetailActionForm((previous) => ({
                      ...previous,
                      snapshotName: event.target.value,
                    }))
                  }
                />
                <Flex justify="end" gap="2" className="mt-3">
                  <Button
                    size="1"
                    disabled={lightsailActionLoading || !lightsailDetailActionForm.snapshotName}
                    onClick={() => {
                      void handleDetailedLightsailAction({
                        type: "create_snapshot",
                        snapshot_name: lightsailDetailActionForm.snapshotName,
                      });
                    }}
                  >
                    {t("cloud.providers.aws.create_snapshot", "Create Snapshot")}
                  </Button>
                </Flex>
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Root>

      <CloudInstanceShareDialog
        open={shareOpen}
        onOpenChange={(open) => {
          setShareOpen(open);
          if (!open) {
            setShareTarget(null);
            setShareRecord(null);
            setShareLoading(false);
            setShareSaving(false);
            setShareDeleting(false);
          }
        }}
        target={shareTarget}
        share={shareRecord}
        loading={shareLoading}
        saving={shareSaving}
        deleting={shareDeleting}
        title={shareTitle}
        note={shareNote}
        sharePassword={false}
        shareManagedSSHKey={false}
        shareUrl={shareRecord?.token ? buildCloudInstanceShareUrl(shareRecord.token) : ""}
        onTitleChange={setShareTitle}
        onNoteChange={setShareNote}
        onSharePasswordChange={() => {}}
        onShareManagedSSHKeyChange={() => {}}
        onCopyLink={() => {
          if (!shareRecord?.token) return;
          void copyText(buildCloudInstanceShareUrl(shareRecord.token));
        }}
        onSave={() => {
          void handleSaveShare();
        }}
        onDelete={() => {
          void handleDeleteShare();
        }}
      />

      <CloudInstanceScriptDialog
        open={Boolean(scriptTarget)}
        target={scriptTarget}
        onOpenChange={(open) => {
          if (open) return;
          setScriptTarget(null);
        }}
      />

      <Dialog.Root open={Boolean(credentialSecret)} onOpenChange={(open) => !open && setCredentialSecret(null)}>
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
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
              {(credentialSecret.secret.ec2_quota || credentialSecret.secret.ec2_quota_error) ? (
                <div className={cloudPanelSectionClassName}>
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    {t("cloud.providers.aws.ec2_quota", "EC2 Quota")}
                  </div>
                  <div className="mt-2">
                    <AWSQuotaSummary
                      quota={credentialSecret.secret.ec2_quota}
                      error={credentialSecret.secret.ec2_quota_error}
                      t={t}
                    />
                  </div>
                </div>
              ) : null}
              <CloudCopyBlock
                title={t("cloud.providers.aws.secret_access_key", "Secret Access Key")}
                copyLabel={t("copy", "Copy")}
                onCopy={() => { void copyText(credentialSecret.secret.secret_access_key); }}
              >
                <TextArea
                  className={cloudSecretTextareaClassName}
                  readOnly
                  value={credentialSecret.secret.secret_access_key}
                />
              </CloudCopyBlock>
              {credentialSecret.secret.session_token ? (
                <CloudCopyBlock
                  title={t("cloud.providers.aws.session_token", "Session Token")}
                  copyLabel={t("copy", "Copy")}
                  onCopy={() => { void copyText(credentialSecret.secret.session_token); }}
                >
                  <TextArea
                    className={cloudSecretTextareaClassName}
                    readOnly
                    value={credentialSecret.secret.session_token}
                  />
                </CloudCopyBlock>
              ) : null}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Root>
      {dialog}
    </AdminPageShell>
  );
}

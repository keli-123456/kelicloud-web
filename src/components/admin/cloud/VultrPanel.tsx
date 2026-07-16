import React from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CheckCircle2,
  Eye,
  KeyRound,
  LockKeyhole,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldCheck,
  Square,
  Terminal,
  Trash2,
  Upload,
} from "lucide-react";

import {
  AdminEmptyState,
  AdminPageShell,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
import {
  AdminDataTable,
  AdminDataTableCell,
  AdminDataTableHead,
  AdminDataTableHeadRow,
  AdminDataTableRow,
  AdminDataTableScroll,
} from "@/components/admin/AdminDataTable";
import {
  AdminPagination,
  useClientPagination,
} from "@/components/admin/AdminPagination";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import {
  CloudBulkDeleteToolbar,
  CloudBulkSelectCheckbox,
  useCloudBulkSelection,
} from "@/components/admin/cloud/CloudBulkActions";
import CloudInstanceScriptDialog, { type CloudInstanceScriptTarget } from "@/components/admin/cloud/CloudInstanceScriptDialog";
import {
  Badge,
  Button,
  Checkbox,
  CloudCodeTextarea,
  CloudDetailItem,
  CloudFormField,
  CloudFormGrid,
  CloudFormStack,
  CloudImportFormSection,
  CloudProviderHeader,
  CloudSecretValueBlock,
  CloudSensitiveDialogContent,
  CloudStatusNotice,
  Dialog,
  Select,
  TextField,
  cloudPanelCardClassName,
  cloudPanelDescriptionClassName,
  cloudPanelFieldLabelClassName,
  cloudPanelHeaderClassName,
  cloudPanelTitleClassName,
  cloudTableCodeTextClassName,
  cloudTableEmptyStateClassName,
  cloudTableNameButtonClassName,
  cloudTablePrimaryTextClassName,
  cloudTableSecondaryTextClassName,
} from "@/components/admin/cloud/cloud-ui";
import { WarningAlert } from "@/components/ui/warning-alert";
import { useWarningDialog } from "@/components/ui/warning-dialog";
import {
  checkVultrTokens,
  createVultrInstance,
  deleteVultrInstance,
  deleteVultrToken,
  getVultrAccount,
  getVultrInstanceDetail,
  getVultrInstancePassword,
  getVultrTokenSecret,
  getVultrTokens,
  listVultrInstances,
  postVultrInstanceAction,
  saveVultrTokens,
  setVultrActiveToken,
  type CreateVultrInstanceInput,
  type VultrCatalog,
  type VultrInstance,
  type VultrInstancePassword,
  type VultrOS,
  type VultrPlan,
  type VultrRegion,
  type VultrTokenInput,
  type VultrTokenPool,
  type VultrTokenRecord,
  type VultrTokenSecret,
} from "@/lib/cloudVultr";
import { getReadableErrorMessage } from "@/lib/apiErrorMessage";
import { getCloudStatusLabel } from "@/lib/cloudStatus";
import { cn } from "@/lib/utils";
import { buildStaticVultrCatalog } from "./cloudStaticCatalogs";
import {
  confirmCloudBulkDelete,
  runCloudBulkDelete,
} from "./cloudBulkDeleteUtils";

type CreateFormState = Omit<CreateVultrInstanceInput, "os_id" | "tags"> & {
  os_id: string;
  tagsText: string;
};

type TokenSecretState = {
  secret: VultrTokenSecret;
};

type SavedPasswordState = {
  instance: VultrInstance;
  credential: VultrInstancePassword;
};

type CreatedPasswordState = {
  instance: VultrInstance;
  rootPassword: string;
  passwordSaved: boolean;
  passwordSaveError: string;
};

const VULTR_LAST_TOKEN_GROUP_STORAGE_KEY = "komari-vultr-last-token-group";

const initialCreateForm: CreateFormState = {
  label: "",
  hostname: "",
  region: "",
  plan: "",
  os_id: "",
  sshkey_id: [],
  enable_ipv6: true,
  disable_public_ipv4: false,
  backups_enabled: false,
  ddos_protection: false,
  activation_email: false,
  firewall_group_id: "",
  tagsText: "",
  user_data: "",
  auto_connect: true,
  auto_connect_group: "",
};

function toErrorMessage(error: unknown) {
  return getReadableErrorMessage(error);
}

function getStoredTokenGroup() {
  try {
    return window.localStorage.getItem(VULTR_LAST_TOKEN_GROUP_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function setStoredTokenGroup(value: string) {
  try {
    const normalized = value.trim();
    if (normalized) {
      window.localStorage.setItem(VULTR_LAST_TOKEN_GROUP_STORAGE_KEY, normalized);
      return;
    }
    window.localStorage.removeItem(VULTR_LAST_TOKEN_GROUP_STORAGE_KEY);
  } catch {
    // ignore storage write failures
  }
}

function hasActiveToken(pool: VultrTokenPool | null) {
  return Boolean(pool?.active_token_id);
}

function getActiveToken(pool: VultrTokenPool | null) {
  return pool?.tokens.find((token) => token.id === pool.active_token_id) || null;
}

function getDefaultAutoConnectGroup(provider: string, credentialName: string) {
  const normalizedProvider = provider.trim().toLowerCase() || "cloud";
  const normalizedCredentialName = credentialName.trim() || "default";
  return `${normalizedProvider}/${normalizedCredentialName}`;
}

function findImportSeparator(line: string) {
  for (const separator of ["|", ",", "\t", ":"]) {
    if (line.includes(separator)) return separator;
  }
  return "";
}

function parseTokenImports(text: string): VultrTokenInput[] {
  const lines = text.split(/\r?\n/);
  const tokens: VultrTokenInput[] = [];
  const seen = new Set<string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = findImportSeparator(line);
    let name = "";
    let token = line;

    if (separator) {
      const index = line.indexOf(separator);
      name = line.slice(0, index).trim();
      token = line.slice(index + separator.length).trim();
    }

    if (!token || seen.has(token)) continue;
    seen.add(token);
    tokens.push({ name, token });
  }

  return tokens;
}

function parseTags(tagsText: string) {
  return tagsText
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatUsdCurrency(value: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function formatMemory(mb: number) {
  if (!mb) return "-";
  if (mb >= 1024) return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
  return `${mb} MB`;
}

function formatBandwidth(tb: number) {
  if (!tb) return "-";
  return `${tb} TB`;
}

function getTokenStatusColor(status: string) {
  switch (status) {
    case "healthy":
      return "green";
    case "error":
      return "red";
    default:
      return "gray";
  }
}

function getInstanceStatusColor(instance: VultrInstance) {
  const status = instance.status.trim().toLowerCase();
  const power = instance.power_status.trim().toLowerCase();
  if (status === "active" && power === "running") return "green";
  if (status === "pending" || status === "installing") return "blue";
  if (power === "stopped" || status === "suspended") return "amber";
  if (status === "locked") return "red";
  return "gray";
}

function getInstanceStatusLabel(instance: VultrInstance) {
  const status = instance.status || "-";
  const power = instance.power_status || "";
  if (!power || power === status) return status;
  return `${status} / ${power}`;
}

function getRegionLabel(region: VultrRegion | null | undefined) {
  if (!region?.id) return "-";
  const location = [region.city, region.country].filter(Boolean).join(", ");
  return location ? `${region.id} / ${location}` : region.id;
}

function getPlanLabel(plan: VultrPlan | null | undefined) {
  if (!plan?.id) return "-";
  const gpu = plan.gpu_type ? ` / ${plan.gpu_type}` : "";
  return `${plan.id} / ${plan.vcpu_count} vCPU / ${formatMemory(plan.ram)} RAM / ${plan.disk} GB${gpu} / ${formatUsdCurrency(plan.monthly_cost)}/mo`;
}

function getOSLabel(os: VultrOS | null | undefined) {
  if (!os?.id) return "-";
  const family = os.family ? `${os.family} / ` : "";
  const arch = os.arch ? ` / ${os.arch}` : "";
  return `${os.id} / ${family}${os.name}${arch}`;
}

function planSupportsRegion(plan: VultrPlan, region: string) {
  if (!region) return true;
  if (!plan.locations.length) return true;
  return plan.locations.includes(region);
}

function selectDefaultOS(oses: VultrOS[]) {
  const preferred = oses.find((os) => {
    const name = `${os.family} ${os.name}`.toLowerCase();
    return name.includes("ubuntu") || name.includes("debian");
  });
  return preferred || oses[0] || null;
}

export default function VultrPanel() {
  const { t } = useTranslation();
  const { confirm, dialog } = useWarningDialog();
  const [tokenPool, setTokenPool] = React.useState<VultrTokenPool | null>(null);
  const [initializing, setInitializing] = React.useState(true);
  const [panelLoading, setPanelLoading] = React.useState(false);
  const [catalog, setCatalog] = React.useState<VultrCatalog | null>(() => buildStaticVultrCatalog());
  const [instances, setInstances] = React.useState<VultrInstance[]>([]);
  const [resourcesLoaded, setResourcesLoaded] = React.useState(false);
  const [error, setError] = React.useState("");
  const [selectedInstance, setSelectedInstance] = React.useState<VultrInstance | null>(null);
  const [detailLoadingId, setDetailLoadingId] = React.useState("");
  const [actionLoadingId, setActionLoadingId] = React.useState("");
  const [scriptTarget, setScriptTarget] = React.useState<CloudInstanceScriptTarget | null>(null);
  const [tokenImportOpen, setTokenImportOpen] = React.useState(false);
  const [tokenImportText, setTokenImportText] = React.useState("");
  const [tokenImportGroup, setTokenImportGroup] = React.useState(getStoredTokenGroup);
  const [tokenSaving, setTokenSaving] = React.useState(false);
  const [tokenChecking, setTokenChecking] = React.useState(false);
  const [tokenSecret, setTokenSecret] = React.useState<TokenSecretState | null>(null);
  const [tokenSecretLoading, setTokenSecretLoading] = React.useState("");
  const [savedPassword, setSavedPassword] = React.useState<SavedPasswordState | null>(null);
  const [passwordLoading, setPasswordLoading] = React.useState("");
  const [createdPassword, setCreatedPassword] = React.useState<CreatedPasswordState | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const createCatalogLoading = false;
  const [createSubmitting, setCreateSubmitting] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<CreateFormState>(initialCreateForm);

  const activeToken = React.useMemo(() => getActiveToken(tokenPool), [tokenPool]);
  const passwordStorageEnabled = Boolean(tokenPool?.password_storage_enabled);
  const defaultCreateGroup = React.useMemo(
    () => getDefaultAutoConnectGroup("vultr", activeToken?.name || ""),
    [activeToken?.name],
  );

  const existingTokenGroups = React.useMemo(
    () => Array.from(new Set((tokenPool?.tokens || []).map((token) => token.group).filter(Boolean))).sort(),
    [tokenPool?.tokens],
  );
  const regionsByID = React.useMemo(
    () => new Map((catalog?.regions || []).map((region) => [region.id, region])),
    [catalog?.regions],
  );
  const plansByID = React.useMemo(
    () => new Map((catalog?.plans || []).map((plan) => [plan.id, plan])),
    [catalog?.plans],
  );
  const osByID = React.useMemo(
    () => new Map((catalog?.os || []).map((os) => [String(os.id), os])),
    [catalog?.os],
  );

  const clearResourceData = React.useCallback(() => {
    setCatalog(buildStaticVultrCatalog());
    setInstances([]);
    setSelectedInstance(null);
    setResourcesLoaded(false);
  }, []);

  const copyText = React.useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t("copy_success", "已复制！"));
      } catch (copyError) {
        toast.error(toErrorMessage(copyError));
      }
    },
    [t],
  );

  const loadPanelData = React.useCallback(async () => {
    setPanelLoading(true);
    try {
      const [, nextInstances] = await Promise.all([
        getVultrAccount(),
        listVultrInstances(),
      ]);
      setInstances(nextInstances);
      setResourcesLoaded(true);
      setError("");
      setSelectedInstance((current) => {
        if (current) {
          return nextInstances.find((instance) => instance.id === current.id) || null;
        }
        return null;
      });
    } catch (loadError) {
      setError(toErrorMessage(loadError));
    } finally {
      setPanelLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const nextPool = await getVultrTokens();
        if (cancelled) return;
        setTokenPool(nextPool);
        if (!hasActiveToken(nextPool)) {
          clearResourceData();
        } else {
          setError("");
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
  }, [clearResourceData]);

  const shouldPreserveLoadedResources = React.useCallback(
    (nextPool: VultrTokenPool) =>
      resourcesLoaded && Boolean(activeToken?.id) && nextPool.active_token_id === activeToken?.id,
    [activeToken?.id, resourcesLoaded],
  );

  const handleImportTokens = async () => {
    const tokens = parseTokenImports(tokenImportText).map((token) => ({
      ...token,
      group: tokenImportGroup.trim(),
    }));
    if (tokens.length === 0) {
      toast.error(t("cloud.tokens.empty_import", "未找到有效令牌。"));
      return;
    }

    setTokenSaving(true);
    try {
      const nextPool = await saveVultrTokens({ tokens });
      setTokenPool(nextPool);
      setStoredTokenGroup(tokenImportGroup);
      if (!shouldPreserveLoadedResources(nextPool)) {
        clearResourceData();
      }
      setTokenImportOpen(false);
      setTokenImportText("");
      toast.success(t("cloud.tokens.imported", "令牌导入成功。"));
    } catch (importError) {
      toast.error(toErrorMessage(importError));
    } finally {
      setTokenSaving(false);
    }
  };

  const handleCheckTokens = async (tokenIds?: string[]) => {
    setTokenChecking(true);
    try {
      const nextPool = await checkVultrTokens(tokenIds);
      setTokenPool(nextPool);
      if (!shouldPreserveLoadedResources(nextPool)) {
        clearResourceData();
      }
      toast.success(t("cloud.tokens.checked", "令牌健康状态已更新。"));
    } catch (checkError) {
      toast.error(toErrorMessage(checkError));
    } finally {
      setTokenChecking(false);
    }
  };

  const handleSelectToken = async (token: VultrTokenRecord, options?: { loadResources?: boolean }) => {
    try {
      const nextPool = await setVultrActiveToken(token.id);
      setTokenPool(nextPool);
      clearResourceData();
      toast.success(t("cloud.tokens.active_updated", "当前令牌已更新。"));
      if (options?.loadResources) {
        await loadPanelData();
      }
    } catch (selectError) {
      toast.error(toErrorMessage(selectError));
    }
  };

  const handleDeleteToken = async (token: VultrTokenRecord) => {
    const confirmed = await confirm({
      title: t("cloud.tokens.delete_title", "是否删除该令牌？"),
      description: token.last_status === "error"
        ? t("cloud.tokens.delete_reclaimed_description", {
            name: token.name,
            defaultValue: "Delete this unavailable credential only after confirming the cloud provider has reclaimed its old instances. Failover will switch to another available credential.",
          })
        : t("cloud.tokens.delete_description", {
            name: token.name,
            defaultValue: "Delete this token? Saved instance passwords for this token will also be removed.",
          }),
      confirmLabel: t("common.delete", "删除"),
      tone: "destructive",
    });
    if (!confirmed) return;

    try {
      const nextPool = await deleteVultrToken(token.id, token.last_status === "error");
      setTokenPool(nextPool);
      if (!hasActiveToken(nextPool) || !shouldPreserveLoadedResources(nextPool)) {
        clearResourceData();
      }
      toast.success(t("cloud.tokens.deleted", "令牌已删除。"));
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  };

  const handleViewTokenSecret = async (token: VultrTokenRecord) => {
    setTokenSecretLoading(token.id);
    try {
      const secret = await getVultrTokenSecret(token.id);
      setTokenSecret({ secret });
    } catch (secretError) {
      toast.error(toErrorMessage(secretError));
    } finally {
      setTokenSecretLoading("");
    }
  };

  const prepareCreateForm = React.useCallback(async () => {
    if (!activeToken) return null;
    try {
      const nextCatalog = catalog;
      if (!nextCatalog) return null;
      const defaultRegion = nextCatalog.regions[0]?.id || "";
      const defaultPlan = nextCatalog.plans.find((plan) => planSupportsRegion(plan, defaultRegion))?.id || nextCatalog.plans[0]?.id || "";
      const defaultOS = selectDefaultOS(nextCatalog.os);
      setCreateForm((previous) => ({
        ...previous,
        region: previous.region || defaultRegion,
        plan: previous.plan || defaultPlan,
        os_id: previous.os_id || (defaultOS ? String(defaultOS.id) : ""),
        auto_connect_group: previous.auto_connect_group || defaultCreateGroup,
      }));
      return nextCatalog;
    } catch (catalogError) {
      toast.error(toErrorMessage(catalogError));
      return null;
    }
  }, [activeToken, catalog, defaultCreateGroup]);

  const handleOpenCreateDialog = async () => {
    const nextCatalog = await prepareCreateForm();
    if (!nextCatalog) return;
    setCreateOpen(true);
  };

  const handleCreateInstance = async () => {
    const osID = Number.parseInt(createForm.os_id, 10);
    if (!createForm.region || !createForm.plan || !Number.isFinite(osID) || osID <= 0) {
      toast.error(t("cloud.providers.vultr.create_required", "请先选择地区、套餐和操作系统。"));
      return;
    }

    setCreateSubmitting(true);
    try {
      const result = await createVultrInstance({
        label: createForm.label?.trim() || "",
        hostname: createForm.hostname?.trim() || "",
        region: createForm.region,
        plan: createForm.plan,
        os_id: osID,
        sshkey_id: createForm.sshkey_id,
        enable_ipv6: createForm.enable_ipv6,
        disable_public_ipv4: createForm.disable_public_ipv4,
        backups_enabled: createForm.backups_enabled,
        ddos_protection: createForm.ddos_protection,
        activation_email: createForm.activation_email,
        firewall_group_id: createForm.firewall_group_id || "",
        tags: parseTags(createForm.tagsText),
        user_data: createForm.user_data,
        auto_connect: createForm.auto_connect,
        auto_connect_group: createForm.auto_connect_group.trim(),
      });
      setCreateOpen(false);
      toast.success(t("cloud.providers.vultr.created", "Vultr 实例创建成功。"));
      if (result.generated_password) {
        setCreatedPassword({
          instance: result.instance,
          rootPassword: result.generated_password,
          passwordSaved: result.password_saved,
          passwordSaveError: result.password_save_error,
        });
      }
      await loadPanelData();
    } catch (createError) {
      toast.error(toErrorMessage(createError));
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleInstanceAction = async (instance: VultrInstance, type: string) => {
    setActionLoadingId(`${instance.id}:${type}`);
    try {
      await postVultrInstanceAction(instance.id, type);
      toast.success(t("cloud.action_submitted", "操作提交成功。"));
      await loadPanelData();
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    } finally {
      setActionLoadingId("");
    }
  };

  const handleDeleteInstance = async (instance: VultrInstance) => {
    const confirmed = await confirm({
      title: t("cloud.delete_instance_title", "确认删除实例？"),
      description: t("cloud.providers.vultr.delete_instance_description", {
        name: instance.label || instance.id,
        defaultValue: "Permanently delete {{name}}? This cannot be undone.",
      }),
      confirmLabel: t("common.delete", "删除"),
      tone: "destructive",
    });
    if (!confirmed) return;

    setActionLoadingId(`${instance.id}:delete`);
    try {
      await deleteVultrInstance(instance.id);
      toast.success(t("cloud.deleted", "已删除。"));
      await loadPanelData();
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    } finally {
      setActionLoadingId("");
    }
  };

  const handleBatchDeleteInstances = async (targetInstances: VultrInstance[]) => {
    const confirmed = await confirmCloudBulkDelete({
      t,
      confirm,
      names: targetInstances.map((instance) => instance.label || instance.hostname || instance.id),
    });
    if (!confirmed) return false;

    setActionLoadingId("__batch_delete__");
    try {
      await runCloudBulkDelete({
        t,
        items: targetInstances,
        getName: (instance) => instance.label || instance.hostname || instance.id,
        deleteItem: (instance) => deleteVultrInstance(instance.id),
        formatError: toErrorMessage,
      });
      if (selectedInstance && targetInstances.some((instance) => instance.id === selectedInstance.id)) {
        setSelectedInstance(null);
      }
      await loadPanelData();
      return true;
    } finally {
      setActionLoadingId("");
    }
  };

  const handleLoadDetail = async (instance: VultrInstance) => {
    setDetailLoadingId(instance.id);
    try {
      const detail = await getVultrInstanceDetail(instance.id);
      setSelectedInstance(detail.instance);
      setInstances((current) =>
        current.map((item) => (item.id === detail.instance.id ? detail.instance : item)),
      );
    } catch (detailError) {
      toast.error(toErrorMessage(detailError));
    } finally {
      setDetailLoadingId("");
    }
  };

  const handleViewPassword = async (instance: VultrInstance) => {
    setPasswordLoading(instance.id);
    try {
      const credential = await getVultrInstancePassword(instance.id);
      setSavedPassword({ instance, credential });
    } catch (passwordError) {
      toast.error(toErrorMessage(passwordError));
    } finally {
      setPasswordLoading("");
    }
  };

  const handleOpenScriptDialog = React.useCallback((instance: VultrInstance) => {
    setScriptTarget({
      providerLabel: t("cloud.providers.vultr.title", "Vultr"),
      instanceName: instance.label || instance.hostname || instance.id,
      instanceIdentifier: instance.id,
      addresses: [instance.main_ip, instance.v6_main_ip].filter(Boolean),
      groupHint: getDefaultAutoConnectGroup("vultr", activeToken?.name || ""),
    });
  }, [activeToken?.name, t]);

  if (initializing) {
    return (
      <AdminPageShell
        eyebrow={t("cloud.title", "云平台")}
        title={t("cloud.providers.vultr.title", "Vultr")}
        description={t(
          "cloud.providers.vultr.description",
          "Manage Vultr tokens, inspect instance inventory, and operate compute resources from one panel.",
        )}
      >
        <AdminTableSkeleton columns={6} rows={5} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell title={t("cloud.providers.vultr.title", "Vultr")} hideHeader>
      <CloudProviderHeader
        title={t("cloud.providers.vultr.title", "Vultr")}
      />

      {error ? (
        <WarningAlert tone="warning" description={error} />
      ) : null}

      {tokenPool && !passwordStorageEnabled ? (
        <WarningAlert
          tone="info"
          description={t(
            "cloud.password.storage_disabled_help",
            "Set KOMARI_CLOUD_SECRET_KEY on the server to save root passwords for later viewing in the instance list.",
          )}
        />
      ) : null}

      <div className="grid min-w-0 items-stretch gap-4 xl:grid-cols-[minmax(340px,0.9fr)_minmax(380px,1.1fr)]">
        <VultrInlineCreatePanel
          t={t}
          activeToken={activeToken}
          catalog={catalog}
          form={createForm}
          setForm={setCreateForm}
          submitting={createSubmitting}
          catalogLoading={createCatalogLoading}
          onPrepare={prepareCreateForm}
          onOpenAdvanced={handleOpenCreateDialog}
          onOpenTokenImport={() => setTokenImportOpen(true)}
          onCreate={handleCreateInstance}
        />

        <VultrTokensSection
          t={t}
          tokenPool={tokenPool}
          tokenChecking={tokenChecking}
          tokenSecretLoading={tokenSecretLoading}
          onCheckTokens={handleCheckTokens}
          onOpenTokenImport={() => setTokenImportOpen(true)}
          onSelectToken={handleSelectToken}
          onViewTokenSecret={handleViewTokenSecret}
          onDeleteToken={handleDeleteToken}
        />
      </div>

      <VultrInstancesSection
        t={t}
        instances={instances}
        panelLoading={panelLoading}
        error={error}
        hasActiveToken={hasActiveToken(tokenPool)}
        resourcesLoaded={resourcesLoaded}
        regionsByID={regionsByID}
        plansByID={plansByID}
        passwordStorageEnabled={passwordStorageEnabled}
        passwordLoading={passwordLoading}
        detailLoadingId={detailLoadingId}
        actionLoadingId={actionLoadingId}
        onLoadDetail={handleLoadDetail}
        onViewPassword={handleViewPassword}
        onInstanceAction={handleInstanceAction}
        onOpenScriptDialog={handleOpenScriptDialog}
        onDeleteInstance={handleDeleteInstance}
        onBatchDeleteInstances={handleBatchDeleteInstances}
      />

      <VultrTokenImportDialog
        t={t}
        open={tokenImportOpen}
        onOpenChange={setTokenImportOpen}
        tokenImportGroup={tokenImportGroup}
        setTokenImportGroup={setTokenImportGroup}
        tokenImportText={tokenImportText}
        setTokenImportText={setTokenImportText}
        existingTokenGroups={existingTokenGroups}
        saving={tokenSaving}
        onImport={handleImportTokens}
      />

      <VultrCreateDialog
        t={t}
        open={createOpen}
        onOpenChange={setCreateOpen}
        catalog={catalog}
        form={createForm}
        setForm={setCreateForm}
        submitting={createSubmitting}
        regionsByID={regionsByID}
        plansByID={plansByID}
        osByID={osByID}
        onCreate={handleCreateInstance}
      />

      <VultrTokenSecretDialog
        t={t}
        tokenSecret={tokenSecret}
        onClose={() => setTokenSecret(null)}
        copyText={copyText}
      />

      <VultrSavedPasswordDialog
        t={t}
        savedPassword={savedPassword}
        onClose={() => setSavedPassword(null)}
        copyText={copyText}
      />

      <VultrCreatedPasswordDialog
        t={t}
        createdPassword={createdPassword}
        onClose={() => setCreatedPassword(null)}
        copyText={copyText}
      />

      <VultrInstanceDetailDialog
        t={t}
        instance={selectedInstance}
        regionsByID={regionsByID}
        plansByID={plansByID}
        passwordStorageEnabled={passwordStorageEnabled}
        passwordLoading={passwordLoading}
        onClose={() => setSelectedInstance(null)}
        onViewPassword={(instance) => { void handleViewPassword(instance); }}
      />

      <CloudInstanceScriptDialog
        open={Boolean(scriptTarget)}
        target={scriptTarget}
        onOpenChange={(open) => {
          if (open) return;
          setScriptTarget(null);
        }}
      />

      {dialog}
    </AdminPageShell>
  );
}

type VultrInstancesSectionProps = {
  t: TFunction;
  instances: VultrInstance[];
  panelLoading: boolean;
  error: string;
  hasActiveToken: boolean;
  resourcesLoaded: boolean;
  regionsByID: Map<string, VultrRegion>;
  plansByID: Map<string, VultrPlan>;
  passwordStorageEnabled: boolean;
  passwordLoading: string;
  detailLoadingId: string;
  actionLoadingId: string;
  onLoadDetail: (instance: VultrInstance) => void;
  onViewPassword: (instance: VultrInstance) => void;
  onInstanceAction: (instance: VultrInstance, type: string) => void;
  onOpenScriptDialog: (instance: VultrInstance) => void;
  onDeleteInstance: (instance: VultrInstance) => void;
  onBatchDeleteInstances: (instances: VultrInstance[]) => Promise<boolean>;
};

type VultrInlineCreatePanelProps = {
  t: TFunction;
  activeToken: VultrTokenRecord | null;
  catalog: VultrCatalog | null;
  form: CreateFormState;
  setForm: React.Dispatch<React.SetStateAction<CreateFormState>>;
  submitting: boolean;
  catalogLoading: boolean;
  onPrepare: () => Promise<VultrCatalog | null>;
  onOpenAdvanced: () => void | Promise<void>;
  onOpenTokenImport: () => void;
  onCreate: () => void | Promise<void>;
};

function VultrInlineCreatePanel({
  t,
  activeToken,
  catalog,
  form,
  setForm,
  submitting,
  catalogLoading,
  onPrepare,
  onOpenAdvanced,
  onOpenTokenImport,
  onCreate,
}: VultrInlineCreatePanelProps) {
  React.useEffect(() => {
    if (!activeToken) return;
    void onPrepare();
  }, [activeToken, onPrepare]);

  const disabled = !activeToken || catalogLoading;
  const plans = React.useMemo(
    () => (catalog?.plans || []).filter((plan) => !form.region || planSupportsRegion(plan, form.region)),
    [catalog?.plans, form.region],
  );

  return (
    <section className={`${cloudPanelCardClassName} flex h-full min-h-[520px] flex-col`}>
      <div className={cloudPanelHeaderClassName}>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className={cloudPanelTitleClassName}>
                {t("cloud.providers.vultr.create", "创建实例")}
              </div>
              <Badge color={activeToken ? "green" : "amber"}>
                {activeToken ? t("cloud.tokens.active", "已激活") : t("cloud.no_active", "未激活")}
              </Badge>
            </div>
            <div className={cloudPanelDescriptionClassName}>
              {t("cloud.create_inline_description", "核心字段保持展开；只有需要额外网络或启动配置时才使用高级选项。")}
            </div>
          </div>
          <Button variant="outline" size="1" onClick={() => { void onOpenAdvanced(); }} disabled={!activeToken}>
            {t("cloud.advanced_options", "高级")}
          </Button>
        </div>
      </div>
      {!activeToken ? (
        <div className="p-4">
          <AdminEmptyState
            icon={<Upload className="h-5 w-5" />}
            title={t("cloud.tokens.no_active_token", "未配置当前令牌")}
            description={t(
              "cloud.providers.vultr.empty_instances_description",
              "导入并选择令牌后，可以加载资源或创建新实例。",
            )}
            actions={(
              <Button size="1" onClick={onOpenTokenImport}>
                <Upload className="mr-2 h-4 w-4" />
                {t("cloud.tokens.import", "导入令牌")}
              </Button>
            )}
            className="min-h-28 border-solid border-border/70 bg-transparent"
          />
        </div>
      ) : (
        <>
      <div className="grid gap-3 p-4">
        <div>
          <label className={cloudPanelFieldLabelClassName}>{t("cloud.form.region", "地区")}</label>
          <Select.Root
            value={form.region}
            disabled={disabled}
            onValueChange={(value) => setForm((previous) => ({ ...previous, region: value, plan: "" }))}
          >
            <Select.Trigger placeholder={catalogLoading ? t("common.loading", "加载中") : t("cloud.form.region_placeholder", "选择地区")} />
            <Select.Content>
              {(catalog?.regions || []).map((region) => (
                <Select.Item key={region.id} value={region.id}>
                  {region.city ? `${region.city} / ${region.country}` : region.id}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
        <div>
          <label className={cloudPanelFieldLabelClassName}>{t("cloud.form.size", "规格")}</label>
          <Select.Root
            value={form.plan}
            disabled={disabled}
            onValueChange={(value) => setForm((previous) => ({ ...previous, plan: value }))}
          >
            <Select.Trigger placeholder={catalogLoading ? t("common.loading", "加载中") : t("cloud.form.size_placeholder", "选择规格")} />
            <Select.Content>
              {plans.map((plan) => (
                <Select.Item key={plan.id} value={plan.id}>
                  {plan.id} / {formatMemory(plan.ram)} / {formatUsdCurrency(plan.monthly_cost)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
        <div>
          <label className={cloudPanelFieldLabelClassName}>{t("cloud.form.image", "镜像")}</label>
          <Select.Root
            value={form.os_id}
            disabled={disabled}
            onValueChange={(value) => setForm((previous) => ({ ...previous, os_id: value }))}
          >
            <Select.Trigger placeholder={catalogLoading ? t("common.loading", "加载中") : t("cloud.form.image_placeholder", "选择镜像")} />
            <Select.Content>
              {(catalog?.os || []).map((os) => (
                <Select.Item key={os.id} value={String(os.id)}>
                  {os.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
        <div>
          <label className={cloudPanelFieldLabelClassName}>{t("cloud.table.name", "名称")}</label>
          <TextField.Root
            value={form.label || ""}
            disabled={disabled}
            placeholder={t("cloud.providers.vultr.label_placeholder", "自动命名")}
            onChange={(event) => setForm((previous) => ({ ...previous, label: event.target.value }))}
          />
        </div>
      </div>
      <div className="mt-auto flex items-center justify-end gap-2 border-t border-border px-4 py-3">
        <Button
          onClick={() => { void onCreate(); }}
          disabled={submitting || disabled || !form.region || !form.plan || !form.os_id}
        >
          {submitting ? t("cloud.creating", "正在创建...") : t("cloud.providers.vultr.create", "创建实例")}
        </Button>
      </div>
        </>
      )}
    </section>
  );
}

function VultrInstancesSection({
  t,
  instances,
  panelLoading,
  error,
  hasActiveToken: activeTokenConfigured,
  resourcesLoaded,
  regionsByID,
  plansByID,
  passwordStorageEnabled,
  passwordLoading,
  detailLoadingId,
  actionLoadingId,
  onLoadDetail,
  onViewPassword,
  onInstanceAction,
  onOpenScriptDialog,
  onDeleteInstance,
  onBatchDeleteInstances,
}: VultrInstancesSectionProps) {
  const instancePagination = useClientPagination(instances, {
    initialPageSize: 10,
  });
  const paginatedInstances = instancePagination.pageItems;
  const getSelectionKey = React.useCallback((instance: VultrInstance) => instance.id, []);
  const bulkSelection = useCloudBulkSelection(instances, getSelectionKey);
  const batchDeleting = actionLoadingId === "__batch_delete__";
  const handleBatchDelete = async () => {
    const completed = await onBatchDeleteInstances(bulkSelection.selectedItems);
    if (completed) {
      bulkSelection.clearSelection();
    }
  };
  const hasInstances = instances.length > 0;
  const emptyTitle = panelLoading
    ? t("cloud.loading", "正在加载云资源...")
    : error
      ? t("cloud.load_failed", "无法加载云资源，请检查上方提示后重试。")
      : resourcesLoaded
        ? t("cloud.providers.vultr.empty_instances", "未找到 Vultr 实例")
        : activeTokenConfigured
          ? t("cloud.providers.vultr.load_instances_prompt", "加载清单查看实例")
          : t("cloud.tokens.no_active_token", "未配置当前令牌");
  const emptyDescription = panelLoading
    ? t("cloud.loading_description", "供应商 API 可达时通常需要几秒。")
    : error || t(
      "cloud.providers.vultr.empty_instances_description",
      "Import and select a token, then load resources or create a new instance.",
    );

  return (
    <section className={cloudPanelCardClassName}>
      <div className={cloudPanelHeaderClassName}>
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className={cloudPanelTitleClassName}>
              {t("cloud.providers.vultr.instances_title", "实例")}
            </div>
            <div className={cloudPanelDescriptionClassName}>
              {t(
                "cloud.providers.vultr.instances_description",
                "Click an instance name to inspect details and use the current token to manage its power state.",
              )}
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <CloudBulkDeleteToolbar
              t={t}
              selectedCount={bulkSelection.selectedCount}
              totalCount={instances.length}
              deleting={batchDeleting}
              hideWhenEmpty={!hasInstances}
              onClear={bulkSelection.clearSelection}
              onDelete={() => {
                void handleBatchDelete();
              }}
            />
          </div>
        </div>
      </div>

      <div className="p-0">
        {hasInstances ? (
          <>
            <AdminDataTableScroll>
              <AdminDataTable minWidth={1040}>
            <thead>
              <AdminDataTableHeadRow>
                <AdminDataTableHead className="w-10">
                  <CloudBulkSelectCheckbox
                    label={t("cloud.bulk.select_all", "选择全部实例")}
                    checked={bulkSelection.allSelected ? true : bulkSelection.someSelected ? "indeterminate" : false}
                    disabled={instances.length === 0 || panelLoading || batchDeleting}
                    onCheckedChange={bulkSelection.toggleAll}
                  />
                </AdminDataTableHead>
                <AdminDataTableHead>{t("cloud.table.instance", "实例")}</AdminDataTableHead>
                <AdminDataTableHead>{t("cloud.table.status", "状态")}</AdminDataTableHead>
                <AdminDataTableHead>{t("cloud.table.region", "地区")}</AdminDataTableHead>
                <AdminDataTableHead>{t("cloud.table.size", "规格")}</AdminDataTableHead>
                <AdminDataTableHead>{t("cloud.table.ip", "IP")}</AdminDataTableHead>
                <AdminDataTableHead>{t("cloud.table.created_at", "创建时间")}</AdminDataTableHead>
                <AdminDataTableHead align="right" sticky="right">
                  {t("common.actions", "操作")}
                </AdminDataTableHead>
              </AdminDataTableHeadRow>
            </thead>
            <tbody>
              {paginatedInstances.map((instance) => {
                  const plan = plansByID.get(instance.plan);
                  const region = regionsByID.get(instance.region);
                  const loadingDetail = detailLoadingId === instance.id;
                  const loadingStart = actionLoadingId === `${instance.id}:start`;
                  const loadingStop = actionLoadingId === `${instance.id}:halt`;
                  const loadingReboot = actionLoadingId === `${instance.id}:reboot`;
                  const loadingDelete = actionLoadingId === `${instance.id}:delete`;

                  return (
                    <AdminDataTableRow key={instance.id} selected={bulkSelection.isSelected(instance)}>
                      <AdminDataTableCell className="w-10">
                        <CloudBulkSelectCheckbox
                          label={t("cloud.bulk.select_instance", {
                            name: instance.label || instance.hostname || instance.id,
                            defaultValue: `选择 ${instance.label || instance.hostname || instance.id}`,
                          })}
                          checked={bulkSelection.isSelected(instance)}
                          disabled={batchDeleting}
                          onCheckedChange={(checked) => bulkSelection.toggleItem(instance, checked)}
                        />
                      </AdminDataTableCell>
                      <AdminDataTableCell className="min-w-56">
                        <button
                          type="button"
                          className={cloudTableNameButtonClassName}
                          onClick={() => {
                            onLoadDetail(instance);
                          }}
                        >
                          {instance.label || instance.hostname || instance.id}
                        </button>
                        <div className={cloudTableSecondaryTextClassName}>
                          {instance.hostname || instance.id}
                        </div>
                      </AdminDataTableCell>
                      <AdminDataTableCell>
                        <Badge color={getInstanceStatusColor(instance)}>
                          {getInstanceStatusLabel(instance)}
                        </Badge>
                        <div className={cloudTableSecondaryTextClassName}>
                          {instance.server_status || "-"}
                        </div>
                      </AdminDataTableCell>
                      <AdminDataTableCell>
                        <div className={cloudTablePrimaryTextClassName}>
                          {instance.region || "-"}
                        </div>
                        <div className={cloudTableSecondaryTextClassName}>
                          {region ? [region.city, region.country].filter(Boolean).join(", ") : "-"}
                        </div>
                      </AdminDataTableCell>
                      <AdminDataTableCell>
                        <div className={cloudTablePrimaryTextClassName}>
                          {instance.plan || "-"}
                        </div>
                        <div className={cloudTableSecondaryTextClassName}>
                          {plan
                            ? `${plan.vcpu_count} vCPU / ${formatMemory(plan.ram)} / ${formatUsdCurrency(plan.monthly_cost)}/mo`
                            : `${instance.vcpu_count} vCPU / ${formatMemory(instance.ram)}`}
                        </div>
                      </AdminDataTableCell>
                      <AdminDataTableCell>
                        <div className={cloudTableCodeTextClassName}>
                          {instance.main_ip || "-"}
                        </div>
                        <div className={cloudTableCodeTextClassName}>
                          {instance.v6_main_ip || "-"}
                        </div>
                      </AdminDataTableCell>
                      <AdminDataTableCell>{formatDateTime(instance.date_created)}</AdminDataTableCell>
                      <AdminDataTableCell align="right" sticky="right">
                        <AdminRowActions
                          contentClassName="min-w-44"
                          actions={[
                            {
                              label: t("cloud.view", "查看"),
                              icon: loadingDetail ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              ),
                              disabled: loadingDetail,
                              onSelect: () => onLoadDetail(instance),
                            },
                            {
                              label: t("cloud.password.view", "查看密码"),
                              icon: <KeyRound className="h-4 w-4" />,
                              disabled: !passwordStorageEnabled || !instance.saved_root_password || passwordLoading === instance.id,
                              onSelect: () => onViewPassword(instance),
                            },
                            {
                              label: t("cloud.power_on", "开机"),
                              icon: loadingStart ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              ),
                              disabled: loadingStart,
                              onSelect: () => onInstanceAction(instance, "start"),
                            },
                            {
                              label: t("cloud.power_off", "关机"),
                              icon: loadingStop ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Square className="h-4 w-4" />
                              ),
                              disabled: loadingStop,
                              onSelect: () => onInstanceAction(instance, "halt"),
                            },
                            {
                              label: t("cloud.reboot", "重启"),
                              icon: loadingReboot ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <RotateCcw className="h-4 w-4" />
                              ),
                              disabled: loadingReboot,
                              onSelect: () => onInstanceAction(instance, "reboot"),
                            },
                            {
                              label: t("cloud.script.action", "执行脚本"),
                              icon: <Terminal className="h-4 w-4" />,
                              onSelect: () => onOpenScriptDialog(instance),
                            },
                            {
                              label: t("cloud.delete", "删除"),
                              icon: loadingDelete ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              ),
                              destructive: true,
                              disabled: loadingDelete,
                              onSelect: () => onDeleteInstance(instance),
                            },
                          ]}
                        />
                      </AdminDataTableCell>
                    </AdminDataTableRow>
                  );
                })}
            </tbody>
              </AdminDataTable>
            </AdminDataTableScroll>
            <AdminPagination
              page={instancePagination.page}
              totalPages={instancePagination.totalPages}
              total={instancePagination.total}
              pageSize={instancePagination.pageSize}
              visibleStart={instancePagination.visibleStart}
              visibleEnd={instancePagination.visibleEnd}
              onPageChange={instancePagination.setPage}
              onPageSizeChange={instancePagination.setPageSize}
              pageSizeOptions={[10, 20, 50]}
              itemLabel={t("admin.pagination.instances", { defaultValue: "instances" })}
              compact
            />
          </>
        ) : (
          <div className="p-4">
            <div className={cn(cloudTableEmptyStateClassName, "rounded-lg px-4 py-8 text-center")}>
              <div className="text-sm font-semibold text-foreground">{emptyTitle}</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {emptyDescription}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

type VultrInstanceDetailDialogProps = {
  t: TFunction;
  instance: VultrInstance | null;
  regionsByID: Map<string, VultrRegion>;
  plansByID: Map<string, VultrPlan>;
  passwordStorageEnabled: boolean;
  passwordLoading: string;
  onClose: () => void;
  onViewPassword: (instance: VultrInstance) => void;
};

function VultrInstanceDetailDialog({
  t,
  instance,
  regionsByID,
  plansByID,
  passwordStorageEnabled,
  passwordLoading,
  onClose,
  onViewPassword,
}: VultrInstanceDetailDialogProps) {
  const region = instance ? regionsByID.get(instance.region) : null;
  const plan = instance ? plansByID.get(instance.plan) : null;

  return (
    <Dialog.Root open={Boolean(instance)} onOpenChange={(open) => !open && onClose()}>
      {instance ? (
        <CloudSensitiveDialogContent
          title={instance.label || instance.hostname || instance.id}
          description={t(
            "cloud.providers.vultr.detail_description",
            "View the selected Vultr instance details from the current active token.",
          )}
          icon={<Server className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.vultr.title", "Vultr")}</Badge>
              <Badge color={getInstanceStatusColor(instance)}>
                {getInstanceStatusLabel(instance)}
              </Badge>
            </>
          )}
          className="sm:max-w-5xl"
        >
          <div className="flex flex-col gap-4">
            <section className="pt-0">
              <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                {t("cloud.detail.summary", "概览")}
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <CloudDetailItem label={t("cloud.detail.id", "实例 ID")} value={instance.id} className="bg-card" />
                <CloudDetailItem label={t("cloud.table.status", "状态")} value={getInstanceStatusLabel(instance)} className="bg-card" />
                <CloudDetailItem label={t("cloud.table.region", "地区")} value={getRegionLabel(region) || instance.region} className="bg-card" />
                <CloudDetailItem label={t("cloud.table.size", "规格")} value={plan ? getPlanLabel(plan) : instance.plan || "-"} className="bg-card" />
                <CloudDetailItem label={t("cloud.table.image", "镜像")} value={instance.os || String(instance.os_id || "-")} className="bg-card" />
                <CloudDetailItem label={t("cloud.table.created_at", "创建时间")} value={formatDateTime(instance.date_created)} className="bg-card" />
                <CloudDetailItem label={t("cloud.detail.memory", "内存")} value={formatMemory(instance.ram)} className="bg-card" />
                <CloudDetailItem label={t("cloud.detail.vcpus", "vCPUs")} value={instance.vcpu_count} className="bg-card" />
                <CloudDetailItem label={t("cloud.detail.disk", "Disk")} value={`${instance.disk} GB`} className="bg-card" />
              </div>
            </section>

            <section>
              <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                {t("cloud.detail.network", "网络")}
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <CloudDetailItem label="IPv4" value={instance.main_ip || "-"} className="bg-card" />
                <CloudDetailItem label="IPv6" value={instance.v6_main_ip || instance.v6_network || "-"} className="bg-card" />
                <CloudDetailItem label={t("cloud.table.bandwidth", "带宽")} value={formatBandwidth(instance.allowed_bandwidth)} className="bg-card" />
              </div>
            </section>

            <section>
              <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                {t("cloud.detail.access", "访问")}
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <CloudDetailItem
                  label={t("cloud.table.password", "登录密码")}
                  value={instance.saved_root_password ? (
                    <Button
                      variant="soft"
                      size="1"
                      disabled={!passwordStorageEnabled || passwordLoading === instance.id}
                      onClick={() => onViewPassword(instance)}
                    >
                      <KeyRound className="mr-1 h-3.5 w-3.5" />
                      {t("cloud.password.view", "查看密码")}
                    </Button>
                  ) : (
                    t("cloud.password.not_saved", "未保存")
                  )}
                  className="bg-card"
                />
                <CloudDetailItem
                  label={t("cloud.detail.features", "功能")}
                  value={instance.features.length ? instance.features.join(", ") : "-"}
                  className="bg-card"
                />
                <CloudDetailItem
                  label={t("cloud.form.tags", "标签")}
                  value={instance.tags.length ? instance.tags.join(", ") : "-"}
                  className="bg-card"
                />
              </div>
            </section>
          </div>
        </CloudSensitiveDialogContent>
      ) : null}
    </Dialog.Root>
  );
}

type VultrTokensSectionProps = {
  t: TFunction;
  tokenPool: VultrTokenPool | null;
  tokenChecking: boolean;
  tokenSecretLoading: string;
  onCheckTokens: (tokenIds?: string[]) => void;
  onOpenTokenImport: () => void;
  onSelectToken: (token: VultrTokenRecord, options?: { loadResources?: boolean }) => void;
  onViewTokenSecret: (token: VultrTokenRecord) => void;
  onDeleteToken: (token: VultrTokenRecord) => void;
};

function VultrTokensSection({
  t,
  tokenPool,
  tokenChecking,
  tokenSecretLoading,
  onCheckTokens,
  onOpenTokenImport,
  onSelectToken,
  onViewTokenSecret,
  onDeleteToken,
}: VultrTokensSectionProps) {
  const tokenRows = tokenPool?.tokens || [];
  const tokenPagination = useClientPagination(tokenRows, {
    initialPageSize: 5,
  });
  const visibleTokenRows = tokenPagination.pageItems;
  const activeToken = tokenRows.find((token) => token.is_active) || null;
  const hasSelectableTokens = tokenRows.length > 0;

  return (
    <section className={`${cloudPanelCardClassName} flex h-full min-h-[520px] flex-col`}>
      <div className={cloudPanelHeaderClassName}>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className={cloudPanelTitleClassName}>
                {t("cloud.providers.vultr.tokens_title", "Vultr 令牌")}
              </div>
              <Badge color={activeToken ? "green" : "amber"}>
                {activeToken ? t("cloud.tokens.active", "已激活") : t("cloud.no_active", "未激活")}
              </Badge>
              <Badge color="gray">
                {t("cloud.tokens.count", {
                  count: tokenRows.length,
                  defaultValue: "{{count}} tokens",
                })}
              </Badge>
            </div>
            <div className="mt-1 min-w-0 truncate text-xs leading-5 text-muted-foreground">
              {activeToken
                ? t("cloud.tokens.active_hint", {
                  name: activeToken.name || activeToken.account_email || activeToken.id,
                  defaultValue: "Active: {{name}}",
                })
                : t("cloud.tokens.no_active_hint", "需要管理凭证时，请先导入或选择令牌。")}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="1" onClick={onOpenTokenImport}>
              <Upload className="mr-2 h-4 w-4" />
              {t("cloud.tokens.import", "导入令牌")}
            </Button>
            {hasSelectableTokens ? (
              <>
                <Button
                  variant="outline"
                  size="1"
                  disabled={!activeToken}
                  onClick={() => {
                    if (!activeToken) return;
                    void onSelectToken(activeToken, { loadResources: true });
                  }}
                >
                  <Server className="mr-2 h-4 w-4" />
                  {t("cloud.providers.vultr.view_instances", "查看实例")}
                </Button>
                <Button
                  variant="outline"
                  size="1"
                  disabled={tokenChecking}
                  onClick={() => { void onCheckTokens(); }}
                >
                  <RefreshCw className={cn("mr-2 h-4 w-4", tokenChecking && "animate-spin")} />
                  {t("cloud.tokens.check", "检查")}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-gutter:stable]">
        {tokenRows.length ? (
          <AdminDataTableScroll className="rounded-lg border border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-950">
            <AdminDataTable minWidth={480} className="[&_td]:px-2 [&_th]:px-2">
              <thead>
                <AdminDataTableHeadRow>
                  <AdminDataTableHead>{t("cloud.tokens.table.name", "名称")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.tokens.group", "分组")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.providers.vultr.balance", "余额")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.tokens.table.status", "状态")}</AdminDataTableHead>
                  <AdminDataTableHead align="right" sticky="right">
                    {t("common.action", "操作")}
                  </AdminDataTableHead>
                </AdminDataTableHeadRow>
              </thead>
              <tbody>
                {visibleTokenRows.map((token) => (
                  <AdminDataTableRow key={token.id}>
                    <AdminDataTableCell className={cloudTablePrimaryTextClassName}>
                      <span className="block max-w-44 truncate">
                        {token.name || token.account_email || token.id}
                      </span>
                    </AdminDataTableCell>
                    <AdminDataTableCell className={cloudTableSecondaryTextClassName}>
                      <span className="block max-w-36 truncate">
                        {token.group || t("cloud.tokens.no_group", "未分组")}
                      </span>
                    </AdminDataTableCell>
                    <AdminDataTableCell className={cloudTableSecondaryTextClassName}>
                      {formatUsdCurrency(token.account_balance)}
                    </AdminDataTableCell>
                    <AdminDataTableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {token.is_active ? (
                          <Badge color="green">{t("cloud.tokens.active", "已激活")}</Badge>
                        ) : null}
                        <Badge color={getTokenStatusColor(token.last_status)}>
                          {getCloudStatusLabel(token.last_status || "unknown", t)}
                        </Badge>
                      </div>
                    </AdminDataTableCell>
                    <AdminDataTableCell align="right" sticky="right">
                      <AdminRowActions
                        contentClassName="min-w-44"
                        actions={[
                          {
                            label: token.is_active
                              ? t("cloud.tokens.current", "当前")
                              : t("cloud.tokens.use", "使用"),
                            icon: <Server className="h-4 w-4" />,
                            disabled: token.is_active,
                            onSelect: () => {
                              void onSelectToken(token);
                            },
                          },
                          {
                            label: t("cloud.tokens.check", "检查"),
                            icon: <RefreshCw className={cn("h-4 w-4", tokenChecking && "animate-spin")} />,
                            disabled: tokenChecking,
                            onSelect: () => {
                              void onCheckTokens([token.id]);
                            },
                          },
                          {
                            label: t("cloud.tokens.view_token", "查看令牌"),
                            icon: <KeyRound className="h-4 w-4" />,
                            disabled: tokenSecretLoading === token.id,
                            onSelect: () => {
                              void onViewTokenSecret(token);
                            },
                          },
                          {
                            label: t("cloud.tokens.delete", "删除"),
                            icon: <Trash2 className="h-4 w-4" />,
                            destructive: true,
                            onSelect: () => {
                              void onDeleteToken(token);
                            },
                          },
                        ]}
                      />
                    </AdminDataTableCell>
                  </AdminDataTableRow>
                ))}
              </tbody>
            </AdminDataTable>
          </AdminDataTableScroll>
        ) : (
          <div className={cn(cloudTableEmptyStateClassName, "rounded-lg px-4 py-8 text-center")}>
            <div className="text-sm font-semibold text-foreground">
              {t("cloud.providers.vultr.no_tokens", "暂无 Vultr 令牌")}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t(
                "cloud.providers.vultr.no_tokens_description",
                "Import an API token to start loading accounts and instances.",
              )}
            </p>
          </div>
        )}
      </div>
      <AdminPagination
        page={tokenPagination.page}
        totalPages={tokenPagination.totalPages}
        total={tokenPagination.total}
        pageSize={tokenPagination.pageSize}
        visibleStart={tokenPagination.visibleStart}
        visibleEnd={tokenPagination.visibleEnd}
        onPageChange={tokenPagination.setPage}
        onPageSizeChange={tokenPagination.setPageSize}
        pageSizeOptions={[5, 10, 20]}
        itemLabel={t("admin.pagination.credentials", { defaultValue: "credentials" })}
        compact
      />
    </section>
  );
}

type VultrTokenImportDialogProps = {
  t: TFunction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokenImportGroup: string;
  setTokenImportGroup: (value: string) => void;
  tokenImportText: string;
  setTokenImportText: (value: string) => void;
  existingTokenGroups: string[];
  saving: boolean;
  onImport: () => void;
};

function VultrTokenImportDialog({
  t,
  open,
  onOpenChange,
  tokenImportGroup,
  setTokenImportGroup,
  tokenImportText,
  setTokenImportText,
  existingTokenGroups,
  saving,
  onImport,
}: VultrTokenImportDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <CloudSensitiveDialogContent
        title={t("cloud.tokens.import_dialog_title", "批量导入令牌")}
        description={t(
          "cloud.tokens.import_dialog_description",
          "每行一个令牌。支持 name,token、name|token，或只填 token。",
        )}
        badge={<Badge color="blue">{t("cloud.providers.vultr.title", "Vultr")}</Badge>}
        maxWidth="40rem"
        headerClassName="px-4 py-3 sm:px-4"
        bodyClassName="space-y-3 px-4 py-3 sm:px-4 sm:py-3"
        footerClassName="px-4 py-3 sm:px-4"
        footer={(
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("common.cancel", "取消")}
            </Button>
            <Button onClick={() => { void onImport(); }} disabled={saving}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {saving ? t("cloud.tokens.importing", "导入中...") : t("cloud.tokens.import", "导入令牌")}
            </Button>
          </>
        )}
      >
        <CloudImportFormSection
          groupLabel={t("cloud.tokens.group", "分组")}
          groupControl={(
            <div
              className={
                existingTokenGroups.length
                  ? "grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center"
                  : "min-w-0"
              }
            >
              <TextField.Root
                className="min-w-0"
                value={tokenImportGroup}
                placeholder={t("cloud.tokens.group_placeholder", "可选令牌分组")}
                onChange={(event) => setTokenImportGroup(event.target.value)}
              />
              {existingTokenGroups.length ? (
                <Select.Root
                  value={existingTokenGroups.includes(tokenImportGroup.trim()) ? tokenImportGroup.trim() : ""}
                  onValueChange={setTokenImportGroup}
                >
                  <Select.Trigger
                    className="w-full"
                    placeholder={t("cloud.tokens.pick_existing_group", "选择已有分组")}
                  />
                  <Select.Content>
                    {existingTokenGroups.map((group) => (
                      <Select.Item key={group} value={group}>
                        {group}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              ) : null}
            </div>
          )}
          editorLabel={t("cloud.tokens.import_content", "令牌内容")}
          editor={(
            <CloudCodeTextarea
              value={tokenImportText}
              showLineNumbers={false}
              minHeightClassName="min-h-[clamp(170px,24vh,210px)]"
              placeholder={t(
                "cloud.providers.vultr.import_placeholder",
                "prod-account,vultr_api_token_xxx\nbackup-account|vultr_api_token_yyy\nvultr_api_token_zzz",
              )}
              onChange={(event) => setTokenImportText(event.target.value)}
            />
          )}
        />
      </CloudSensitiveDialogContent>
    </Dialog.Root>
  );
}

type VultrCreateDialogProps = {
  t: TFunction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: VultrCatalog | null;
  form: CreateFormState;
  setForm: React.Dispatch<React.SetStateAction<CreateFormState>>;
  submitting: boolean;
  regionsByID: Map<string, VultrRegion>;
  plansByID: Map<string, VultrPlan>;
  osByID: Map<string, VultrOS>;
  onCreate: () => void;
};

function VultrCreateDialog({
  t,
  open,
  onOpenChange,
  catalog,
  form,
  setForm,
  submitting,
  regionsByID,
  plansByID,
  osByID,
  onCreate,
}: VultrCreateDialogProps) {
  const availablePlans = React.useMemo(
    () => (catalog?.plans || []).filter((plan) => planSupportsRegion(plan, form.region)),
    [catalog?.plans, form.region],
  );

  React.useEffect(() => {
    if (!open || !form.region || !form.plan) return;
    if (availablePlans.some((plan) => plan.id === form.plan)) return;
    setForm((current) => ({
      ...current,
      plan: availablePlans[0]?.id || "",
    }));
  }, [availablePlans, form.plan, form.region, open, setForm]);

  const selectedRegion = regionsByID.get(form.region);
  const selectedPlan = plansByID.get(form.plan);
  const selectedOS = osByID.get(form.os_id);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <CloudSensitiveDialogContent
        title={t("cloud.providers.vultr.create", "创建实例")}
        description={t(
          "cloud.providers.vultr.create_description",
          "创建 Vultr 实例，可按需启用 IPv6、备份、SSH 密钥、标签，并在创建完成后自动接入平台。",
        )}
        icon={<Server className="size-4" />}
        badge={<Badge color="blue">{t("cloud.providers.vultr.title", "Vultr")}</Badge>}
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t("common.cancel", "取消")}
            </Button>
            <Button onClick={() => { void onCreate(); }} disabled={submitting}>
              {submitting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {submitting ? t("cloud.creating", "正在创建...") : t("cloud.providers.vultr.create", "创建实例")}
            </Button>
          </>
        }
        side={(
          <div className="space-y-4">
            <CloudStatusNotice tone="blue">
              {t(
                "cloud.providers.vultr.create_hint",
                "Vultr user data is base64 encoded by the backend before calling the API.",
              )}
            </CloudStatusNotice>
            <CloudDetailItem
              label={t("cloud.table.region", "地区")}
              value={selectedRegion ? getRegionLabel(selectedRegion) : "-"}
              className="bg-card"
            />
            <CloudDetailItem
              label={t("cloud.table.size", "规格")}
              value={selectedPlan ? getPlanLabel(selectedPlan) : "-"}
              className="bg-card"
            />
            <CloudDetailItem
              label={t("cloud.table.image", "镜像")}
              value={selectedOS ? getOSLabel(selectedOS) : "-"}
              className="bg-card"
            />
          </div>
        )}
      >
        <CloudFormStack>
        <CloudFormGrid>
          <CloudFormField label={t("cloud.form.label", "标签")}>
            <TextField.Root
              value={form.label}
              placeholder="komari-vultr-01"
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
            />
          </CloudFormField>
          <CloudFormField label={t("cloud.form.hostname", "主机名")}>
            <TextField.Root
              value={form.hostname}
              placeholder={t("cloud.form.hostname_placeholder", "默认为标签名")}
              onChange={(event) => setForm((current) => ({ ...current, hostname: event.target.value }))}
            />
          </CloudFormField>
          <CloudFormField label={t("cloud.table.region", "地区")}>
            <Select.Root
              value={form.region}
              onValueChange={(value) => setForm((current) => ({ ...current, region: value }))}
            >
              <Select.Trigger />
              <Select.Content>
                {(catalog?.regions || []).map((region) => (
                  <Select.Item key={region.id} value={region.id}>
                    {getRegionLabel(region)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </CloudFormField>
          <CloudFormField label={t("cloud.table.size", "规格")}>
            <Select.Root
              value={form.plan}
              onValueChange={(value) => setForm((current) => ({ ...current, plan: value }))}
            >
              <Select.Trigger />
              <Select.Content>
                {availablePlans.map((plan) => (
                  <Select.Item key={plan.id} value={plan.id}>
                    {getPlanLabel(plan)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </CloudFormField>
          <CloudFormField label={t("cloud.table.image", "镜像")} className="sm:col-span-2">
            <Select.Root
              value={form.os_id}
              onValueChange={(value) => setForm((current) => ({ ...current, os_id: value }))}
            >
              <Select.Trigger />
              <Select.Content>
                {(catalog?.os || []).map((os) => (
                  <Select.Item key={os.id} value={String(os.id)}>
                    {getOSLabel(os)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </CloudFormField>
        </CloudFormGrid>

        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleRow
            label={t("cloud.form.enable_ipv6", "启用 IPv6")}
            checked={form.enable_ipv6}
            onCheckedChange={(checked) => setForm((current) => ({ ...current, enable_ipv6: checked }))}
          />
          <ToggleRow
            label={t("cloud.form.disable_public_ipv4", "禁用公网 IPv4")}
            checked={form.disable_public_ipv4}
            onCheckedChange={(checked) => setForm((current) => ({ ...current, disable_public_ipv4: checked }))}
          />
          <ToggleRow
            label={t("cloud.form.backups", "备份")}
            checked={form.backups_enabled}
            onCheckedChange={(checked) => setForm((current) => ({ ...current, backups_enabled: checked }))}
          />
          <ToggleRow
            label={t("cloud.form.ddos_protection", "DDoS 防护")}
            checked={form.ddos_protection}
            onCheckedChange={(checked) => setForm((current) => ({ ...current, ddos_protection: checked }))}
          />
          <ToggleRow
            label={t("cloud.form.activation_email", "激活邮箱")}
            checked={form.activation_email}
            onCheckedChange={(checked) => setForm((current) => ({ ...current, activation_email: checked }))}
          />
          <ToggleRow
            label={t("cloud.form.auto_connect", "kelicloud 自动连接")}
            checked={form.auto_connect}
            onCheckedChange={(checked) => setForm((current) => ({ ...current, auto_connect: checked }))}
          />
        </div>

        <CloudFormGrid>
          <CloudFormField label={t("cloud.form.auto_connect_group", "自动连接分组")}>
            <TextField.Root
              value={form.auto_connect_group}
              disabled={!form.auto_connect}
              onChange={(event) => setForm((current) => ({ ...current, auto_connect_group: event.target.value }))}
            />
          </CloudFormField>
          <CloudFormField label={t("cloud.form.tags", "标签")}>
            <TextField.Root
              value={form.tagsText}
              placeholder={t("cloud.form.tags_placeholder", "英文逗号分隔")}
              onChange={(event) => setForm((current) => ({ ...current, tagsText: event.target.value }))}
            />
          </CloudFormField>
        </CloudFormGrid>

        <CloudFormField label={t("cloud.form.ssh_keys", "SSH 密钥")}>
          {(catalog?.ssh_keys || []).length ? (
            <div className="grid max-h-52 gap-2 overflow-y-auto border-y border-slate-200/80 py-3 shadow-none [scrollbar-gutter:stable] dark:border-slate-800 sm:grid-cols-2">
              {(catalog?.ssh_keys || []).map((key) => {
                const checked = form.sshkey_id.includes(key.id);
                return (
                  <label
                    key={key.id}
                    className="flex min-w-0 cursor-pointer items-start gap-2 rounded-md border border-border bg-muted/20 px-3 py-2"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        setForm((current) => ({
                          ...current,
                          sshkey_id: value
                            ? Array.from(new Set([...current.sshkey_id, key.id]))
                            : current.sshkey_id.filter((id) => id !== key.id),
                        }));
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {key.name || key.id}
                      </span>
                      <span className={cn("block truncate", cloudTableCodeTextClassName)}>
                        {key.id}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <CloudStatusNotice tone="gray">
              {t("cloud.form.no_ssh_keys", "当前账号未返回 SSH 密钥。")}
            </CloudStatusNotice>
          )}
        </CloudFormField>

        <CloudFormField label={t("cloud.form.user_data", "用户数据")}>
          <CloudCodeTextarea
            value={form.user_data}
            minHeightClassName="min-h-36"
            placeholder="#!/bin/bash"
            onChange={(event) => setForm((current) => ({ ...current, user_data: event.target.value }))}
          />
        </CloudFormField>

        </CloudFormStack>
      </CloudSensitiveDialogContent>
    </Dialog.Root>
  );
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-w-0 items-center justify-between gap-3 border-t border-slate-200/80 pt-3 shadow-none dark:border-slate-800">
      <span className="min-w-0 text-sm font-medium text-foreground">{label}</span>
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(Boolean(value))}
      />
    </label>
  );
}

function VultrTokenSecretDialog({
  t,
  tokenSecret,
  onClose,
  copyText,
}: {
  t: TFunction;
  tokenSecret: TokenSecretState | null;
  onClose: () => void;
  copyText: (text: string) => void | Promise<void>;
}) {
  return (
    <Dialog.Root open={Boolean(tokenSecret)} onOpenChange={(open) => !open && onClose()}>
      {tokenSecret ? (
        <CloudSensitiveDialogContent
          title={t("cloud.tokens.token_dialog_title", "令牌详情")}
          description={t(
            "cloud.providers.vultr.token_dialog_description",
            "View the full Vultr token only when you need to copy or verify it.",
          )}
          icon={<KeyRound className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.vultr.title", "Vultr")}</Badge>
              <Badge color="amber">{t("cloud.tokens.token", "令牌")}</Badge>
            </>
          )}
          side={(
            <SecretSidePanel
              t={t}
              title={t("cloud.secret.scope", "访问范围")}
              description={t(
                "cloud.secret.token_scope_hint",
                "This credential can manage cloud resources through the provider API.",
              )}
            >
              <CloudDetailItem
                label={t("cloud.tokens.masked_token", "脱敏令牌")}
                value={tokenSecret.secret.masked_token || "-"}
                className="bg-card"
              />
            </SecretSidePanel>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CloudDetailItem
              label={t("cloud.tokens.table.name", "名称")}
              value={tokenSecret.secret.token_name}
              className="bg-card"
            />
            <CloudDetailItem
              label={t("cloud.tokens.table.account", "账户")}
              value={tokenSecret.secret.account_email || tokenSecret.secret.account_name || "-"}
              className="bg-card"
            />
          </div>
          <CloudSecretValueBlock
            title={t("cloud.tokens.full_token", "完整令牌")}
            copyLabel={t("copy", "复制")}
            onCopy={() => { void copyText(tokenSecret.secret.token); }}
            value={tokenSecret.secret.token}
          />
        </CloudSensitiveDialogContent>
      ) : null}
    </Dialog.Root>
  );
}

function VultrSavedPasswordDialog({
  t,
  savedPassword,
  onClose,
  copyText,
}: {
  t: TFunction;
  savedPassword: SavedPasswordState | null;
  onClose: () => void;
  copyText: (text: string) => void | Promise<void>;
}) {
  return (
    <Dialog.Root open={Boolean(savedPassword)} onOpenChange={(open) => !open && onClose()}>
      {savedPassword ? (
        <CloudSensitiveDialogContent
          title={t("cloud.password.dialog_title", "保存的 Root 密码")}
          description={t(
            "cloud.providers.vultr.password_dialog_description",
            "View the saved root password for this Vultr instance from the current active token.",
          )}
          icon={<LockKeyhole className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.vultr.title", "Vultr")}</Badge>
              <Badge color="green">{t("cloud.password.saved", "已保存")}</Badge>
            </>
          )}
          side={(
            <SecretSidePanel
              t={t}
              title={t("cloud.password.login_context", "登录上下文")}
              description={t(
                "cloud.password.login_context_description",
                "Use the username and password together when connecting to this instance.",
              )}
            >
              <CloudDetailItem
                label={t("cloud.password.saved_at", "保存时间")}
                value={formatDateTime(savedPassword.credential.updated_at)}
                className="bg-card"
              />
            </SecretSidePanel>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CloudDetailItem label={t("cloud.table.name", "名称")} value={savedPassword.instance.label || savedPassword.instance.id} className="bg-card" />
            <CloudDetailItem label={t("cloud.password.username", "用户名")} value={savedPassword.credential.username} className="bg-card" />
            <CloudDetailItem label={t("cloud.password.mode", "密码模式")} value={savedPassword.credential.password_mode || "-"} className="bg-card" />
          </div>
          <CloudSecretValueBlock
            title={t("cloud.form.root_password", "登录密码")}
            copyLabel={t("copy", "复制")}
            onCopy={() => { void copyText(savedPassword.credential.root_password); }}
            value={savedPassword.credential.root_password}
          />
        </CloudSensitiveDialogContent>
      ) : null}
    </Dialog.Root>
  );
}

function VultrCreatedPasswordDialog({
  t,
  createdPassword,
  onClose,
  copyText,
}: {
  t: TFunction;
  createdPassword: CreatedPasswordState | null;
  onClose: () => void;
  copyText: (text: string) => void | Promise<void>;
}) {
  return (
    <Dialog.Root open={Boolean(createdPassword)} onOpenChange={(open) => !open && onClose()}>
      {createdPassword ? (
        <CloudSensitiveDialogContent
          title={t("cloud.providers.vultr.create_credentials_title", "Root 访问凭证")}
          description={t(
            "cloud.providers.vultr.create_credentials_description",
            "Store this password now. You can reopen it later only if password vault storage is enabled and the save succeeded.",
          )}
          icon={<LockKeyhole className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.vultr.title", "Vultr")}</Badge>
              <Badge color={createdPassword.passwordSaved ? "green" : "amber"}>
                {createdPassword.passwordSaved
                  ? t("cloud.password.saved", "已保存")
                  : t("cloud.password.not_saved", "未保存")}
              </Badge>
            </>
          )}
          side={(
            <SecretSidePanel
              t={t}
              title={t("cloud.password.storage_status", "保存状态")}
              description={t(
                "cloud.password.storage_status_description",
                "The generated password is shown here so you can copy it immediately.",
              )}
            >
              <CloudStatusNotice tone={createdPassword.passwordSaved ? "green" : "amber"}>
                {createdPassword.passwordSaved
                  ? t("cloud.password.create_saved", "该 Root 密码已加密保存，可在实例列表再次打开。")
                  : createdPassword.passwordSaveError
                    ? t("cloud.password.create_unsaved_reason", {
                        reason: createdPassword.passwordSaveError,
                        defaultValue: `Password save failed: ${createdPassword.passwordSaveError}`,
                      })
                    : t("cloud.password.create_unsaved", "该 Root 密码未保存在服务器上，如仍需后续使用请先保存。")}
              </CloudStatusNotice>
            </SecretSidePanel>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CloudDetailItem label={t("cloud.table.name", "名称")} value={createdPassword.instance.label || createdPassword.instance.id} className="bg-card" />
            <CloudDetailItem label={t("cloud.password.mode", "密码模式")} value="provider_default" className="bg-card" />
          </div>
          <CloudSecretValueBlock
            title={t("cloud.form.root_password", "登录密码")}
            copyLabel={t("copy", "复制")}
            onCopy={() => { void copyText(createdPassword.rootPassword); }}
            value={createdPassword.rootPassword}
          />
        </CloudSensitiveDialogContent>
      ) : null}
    </Dialog.Root>
  );
}

function SecretSidePanel({
  t,
  title,
  description,
  children,
}: {
  t: TFunction;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="border-t border-slate-200/80 pt-3 shadow-none dark:border-slate-800">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck className="size-4 text-blue-600" />
          {title}
        </div>
        <div className="mt-2 text-xs leading-5 text-muted-foreground">
          {description}
        </div>
      </div>
      {children}
      <CloudStatusNotice tone="blue">
        {t(
          "cloud.secret.copy_hint",
          "Copy sensitive values only when needed, then close this dialog when you are done.",
        )}
      </CloudStatusNotice>
    </div>
  );
}

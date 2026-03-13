import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CheckCircle2,
  Copy,
  Eye,
  KeyRound,
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
  checkLinodeTokens,
  createLinodeInstance,
  deleteLinodeInstance,
  deleteLinodeToken,
  getLinodeAccount,
  getLinodeCatalog,
  getLinodeInstanceDetail,
  getLinodeInstancePassword,
  getLinodeTokenSecret,
  getLinodeTokens,
  listLinodeInstances,
  postLinodeInstanceAction,
  saveLinodeTokens,
  setLinodeActiveToken,
  type CreateLinodeInstanceInput,
  type LinodeAccount,
  type LinodeCatalog,
  type LinodeConfig,
  type LinodeDisk,
  type LinodeInstanceActionInput,
  type LinodeInstanceDetail,
  type LinodeImage,
  type LinodeInstance,
  type LinodeInstancePassword,
  type LinodeTokenInput,
  type LinodeTokenPool,
  type LinodeTokenRecord,
  type LinodeTokenSecret,
} from "@/lib/cloudLinode";
import {
  buildCloudInstanceShareUrl,
  deleteCloudInstanceShare,
  getCloudInstanceShare,
  saveCloudInstanceShare,
  type CloudInstanceShareRecord,
} from "@/lib/cloudShare";

type CreateFormState = Omit<CreateLinodeInstanceInput, "tags"> & {
  tagsText: string;
};

type TokenSecretState = {
  secret: LinodeTokenSecret;
};

type SavedPasswordState = {
  instance: LinodeInstance;
  credential: LinodeInstancePassword;
};

type CreatedPasswordState = {
  instance: LinodeInstance;
  rootPassword: string;
  passwordMode: "custom" | "random";
  passwordSaved: boolean;
  passwordSaveError: string;
};

const SELECT_NONE = "__none__";

type DetailActionPasswordState = {
  mode: "custom" | "random";
  password: string;
};

const initialCreateForm: CreateFormState = {
  label: "",
  region: "",
  type: "",
  image: "",
  authorized_keys: [],
  backups_enabled: false,
  booted: true,
  tagsText: "",
  user_data: "",
  root_password_mode: "random",
  root_password: "",
};

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

function hasActiveToken(pool: LinodeTokenPool | null) {
  return Boolean(pool?.active_token_id);
}

function getActiveToken(pool: LinodeTokenPool | null) {
  return pool?.tokens.find((token) => token.id === pool.active_token_id) || null;
}

function findImportSeparator(line: string) {
  for (const separator of ["|", ",", "\t", ":"]) {
    if (line.includes(separator)) {
      return separator;
    }
  }
  return "";
}

function parseTokenImports(text: string): LinodeTokenInput[] {
  const lines = text.split(/\r?\n/);
  const tokens: LinodeTokenInput[] = [];
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
    tokens.push({
      name: name || `Token ${tokens.length + 1}`,
      token,
    });
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

function formatList(values: Array<string | number>) {
  if (!values.length) return "-";
  return values.join(", ");
}

function getLinodeCountryLabel(
  region: Pick<LinodeCatalog["regions"][number], "country"> | null | undefined,
  t: ReturnType<typeof useTranslation>["t"],
) {
  const rawCountry = region?.country?.trim();
  if (!rawCountry) return "";

  const normalizedCountry = rawCountry.toLowerCase();
  if (/^[a-z]{2,3}$/.test(normalizedCountry)) {
    return t(`cloud.region_countries.${normalizedCountry}`, rawCountry.toUpperCase());
  }

  return rawCountry;
}

function getLinodeRegionOptionLabel(
  region: LinodeCatalog["regions"][number] | null | undefined,
  t: ReturnType<typeof useTranslation>["t"],
) {
  if (!region?.id) return region?.label || "-";
  const country = getLinodeCountryLabel(region, t);
  if (!country) return `${region.id} / ${region.label}`;
  return `${region.id} (${country}) / ${region.label}`;
}

function getLinodeTypeOptionLabel(type: LinodeCatalog["types"][number] | null | undefined) {
  if (!type?.id) return "-";

  const details = [
    type.id,
    type.label,
    `${type.vcpus} vCPU`,
    `${(type.memory / 1024).toFixed(1)} GB RAM`,
    `${type.disk} GB SSD`,
    `$${type.price.monthly.toFixed(2)}/mo`,
  ].filter(Boolean);

  return details.join(" / ");
}

function getStatusColor(status: string) {
  switch (status) {
    case "running":
      return "green";
    case "offline":
      return "amber";
    case "provisioning":
    case "booting":
      return "blue";
    default:
      return "gray";
  }
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

function isRestrictedLinodeToken(token: LinodeTokenRecord) {
  return token.last_status === "error" && token.last_error.toLowerCase().includes("restricted");
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

export default function LinodePanel() {
  const { t } = useTranslation();

  const [panelSection, setPanelSection] = React.useState<"instances" | "tokens">("instances");
  const [initializing, setInitializing] = React.useState(true);
  const [panelLoading, setPanelLoading] = React.useState(false);
  const [tokenSaving, setTokenSaving] = React.useState(false);
  const [tokenChecking, setTokenChecking] = React.useState(false);
  const [tokenImportOpen, setTokenImportOpen] = React.useState(false);
  const [tokenImportText, setTokenImportText] = React.useState("");
  const [tokenPool, setTokenPool] = React.useState<LinodeTokenPool | null>(null);
  const [account, setAccount] = React.useState<LinodeAccount | null>(null);
  const [catalog, setCatalog] = React.useState<LinodeCatalog | null>(null);
  const [instances, setInstances] = React.useState<LinodeInstance[]>([]);
  const [detailInstance, setDetailInstance] = React.useState<LinodeInstance | null>(null);
  const [detailData, setDetailData] = React.useState<LinodeInstanceDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailActionLoading, setDetailActionLoading] = React.useState(false);
  const [resizeTargetType, setResizeTargetType] = React.useState("");
  const [detailPasswordState, setDetailPasswordState] = React.useState<DetailActionPasswordState>({
    mode: "random",
    password: "",
  });
  const [rebuildImage, setRebuildImage] = React.useState("");
  const [rebuildUserData, setRebuildUserData] = React.useState("");
  const [rebuildBooted, setRebuildBooted] = React.useState(true);
  const [tokenSecret, setTokenSecret] = React.useState<TokenSecretState | null>(null);
  const [tokenSecretLoading, setTokenSecretLoading] = React.useState(false);
  const [savedPassword, setSavedPassword] = React.useState<SavedPasswordState | null>(null);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareTarget, setShareTarget] = React.useState<CloudInstanceShareTarget | null>(null);
  const [shareRecord, setShareRecord] = React.useState<CloudInstanceShareRecord | null>(null);
  const [shareLoading, setShareLoading] = React.useState(false);
  const [shareSaving, setShareSaving] = React.useState(false);
  const [shareDeleting, setShareDeleting] = React.useState(false);
  const [shareTitle, setShareTitle] = React.useState("");
  const [shareNote, setShareNote] = React.useState("");
  const [sharePassword, setSharePassword] = React.useState(false);
  const [passwordLoading, setPasswordLoading] = React.useState(false);
  const [createdPassword, setCreatedPassword] = React.useState<CreatedPasswordState | null>(null);
  const [error, setError] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createSubmitting, setCreateSubmitting] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<CreateFormState>(initialCreateForm);

  const clearPanelState = React.useCallback(() => {
    setAccount(null);
    setCatalog(null);
    setInstances([]);
    setDetailData(null);
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

  const loadTokenPool = React.useCallback(async () => {
    const nextPool = await getLinodeTokens();
    setTokenPool(nextPool);
    return nextPool;
  }, []);

  const loadPanelData = React.useCallback(async () => {
    setPanelLoading(true);
    try {
      const [nextAccount, nextCatalog, nextInstances] = await Promise.all([
        getLinodeAccount(),
        getLinodeCatalog(),
        listLinodeInstances(),
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
    const nextPool = await loadTokenPool();
    if (hasActiveToken(nextPool)) {
      await loadPanelData();
      return;
    }
    clearPanelState();
  }, [clearPanelState, loadPanelData, loadTokenPool]);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const nextPool = await getLinodeTokens();
        if (cancelled) return;
        setTokenPool(nextPool);
        if (hasActiveToken(nextPool)) {
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
      region: previous.region || catalog.regions[0]?.id || "",
      type: previous.type || catalog.types[0]?.id || "",
      image: previous.image || catalog.images[0]?.id || "",
    }));
  }, [catalog]);

  React.useEffect(() => {
    if (!hasActiveToken(tokenPool)) {
      setPanelSection("tokens");
    }
  }, [tokenPool]);

  const activeToken = getActiveToken(tokenPool);
  const connected = Boolean(account && activeToken);
  const passwordStorageEnabled = Boolean(tokenPool?.password_storage_enabled);
  const runningCount = instances.filter((instance) => instance.status === "running").length;
  const typePriceMap = new Map((catalog?.types || []).map((type) => [type.id, type]));

  const handleImportTokens = async () => {
    const tokens = parseTokenImports(tokenImportText);
    if (!tokens.length) {
      toast.error(t("cloud.tokens.import_empty", "No valid tokens found"));
      return;
    }

    setTokenSaving(true);
    try {
      const nextPool = await saveLinodeTokens({
        tokens,
        active_token_id: tokenPool?.active_token_id || undefined,
      });
      setTokenPool(nextPool);
      setTokenImportText("");
      setTokenImportOpen(false);
      toast.success(
        t("cloud.tokens.import_success", {
          count: tokens.length,
          defaultValue: `Imported ${tokens.length} tokens`,
        }),
      );
      if (hasActiveToken(nextPool)) {
        await loadPanelData();
      } else {
        clearPanelState();
      }
    } catch (saveError) {
      toast.error(toErrorMessage(saveError));
    } finally {
      setTokenSaving(false);
    }
  };

  const handleCheckTokens = async () => {
    setTokenChecking(true);
    try {
      const nextPool = await checkLinodeTokens();
      setTokenPool(nextPool);
      toast.success(t("cloud.tokens.check_success", "Token health check finished"));
      if (hasActiveToken(nextPool)) {
        await loadPanelData();
      } else {
        clearPanelState();
      }
    } catch (checkError) {
      toast.error(toErrorMessage(checkError));
    } finally {
      setTokenChecking(false);
    }
  };

  const handleSelectToken = async (
    token: LinodeTokenRecord,
    options?: { loadResources?: boolean; openInstances?: boolean },
  ) => {
    try {
      const nextPool = await setLinodeActiveToken(token.id);
      setTokenPool(nextPool);
      toast.success(
        t("cloud.tokens.active_success", {
          name: token.name,
          defaultValue: `Using token ${token.name}`,
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

  const handleDeleteToken = async (token: LinodeTokenRecord) => {
    const confirmed = window.confirm(
      t("cloud.tokens.delete_confirm", {
        name: token.name,
        defaultValue: `Delete token "${token.name}"?`,
      }),
    );
    if (!confirmed) return;

    try {
      const nextPool = await deleteLinodeToken(token.id);
      setTokenPool(nextPool);
      toast.success(t("cloud.tokens.delete_success", "Token deleted"));
      if (hasActiveToken(nextPool)) {
        await loadPanelData();
      } else {
        clearPanelState();
      }
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  };

  const handleViewTokenSecret = async (token: LinodeTokenRecord) => {
    setTokenSecretLoading(true);
    try {
      const secret = await getLinodeTokenSecret(token.id);
      setTokenSecret({ secret });
    } catch (viewError) {
      toast.error(toErrorMessage(viewError));
    } finally {
      setTokenSecretLoading(false);
    }
  };

  const handleViewPassword = async (instance: LinodeInstance) => {
    setPasswordLoading(true);
    try {
      const credential = await getLinodeInstancePassword(instance.id);
      setSavedPassword({ instance, credential });
    } catch (viewError) {
      toast.error(toErrorMessage(viewError));
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleOpenShareDialog = async (instance: LinodeInstance) => {
    const nextTarget: CloudInstanceShareTarget = {
      provider: "linode",
      resourceType: "instance",
      resourceId: String(instance.id),
      resourceName: instance.label || String(instance.id),
      providerLabel: "Linode",
      credentialName: activeToken?.name || activeToken?.profile_email || "",
      region: instance.region || "",
      primaryAddress: instance.ipv4[0] || instance.ipv6 || "",
      canSharePassword: Boolean(instance.saved_root_password),
      canShareManagedSSHKey: false,
    };

    setShareTarget(nextTarget);
    setShareRecord(null);
    setShareTitle(instance.label || "");
    setShareNote("");
    setSharePassword(false);
    setShareOpen(true);
    setShareLoading(true);

    try {
      const nextShare = await getCloudInstanceShare("linode", "instance", String(instance.id));
      setShareRecord(nextShare.token ? nextShare : null);
      setShareTitle(nextShare.title || instance.label || "");
      setShareNote(nextShare.note || "");
      setSharePassword(Boolean(nextShare.share_password && nextTarget.canSharePassword));
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
          share_password: sharePassword,
          share_managed_ssh_key: false,
        },
      );
      setShareRecord(nextShare);
      setShareTitle(nextShare.title || shareTarget.resourceName);
      setShareNote(nextShare.note || "");
      setSharePassword(Boolean(nextShare.share_password));
      toast.success(t("cloud.share.save_success", "Share link saved"));
    } catch (shareError) {
      toast.error(toErrorMessage(shareError));
    } finally {
      setShareSaving(false);
    }
  };

  const handleDeleteShare = async () => {
    if (!shareTarget) return;

    const confirmed = window.confirm(
      t("cloud.share.delete_confirm", {
        name: shareTarget.resourceName,
        defaultValue: `Revoke the share link for "${shareTarget.resourceName}"?`,
      }),
    );
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
      setSharePassword(false);
      toast.success(t("cloud.share.delete_success", "Share link revoked"));
    } catch (shareError) {
      toast.error(toErrorMessage(shareError));
    } finally {
      setShareDeleting(false);
    }
  };

  const loadInstanceDetail = React.useCallback(async (instance: LinodeInstance) => {
    setDetailInstance(instance);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const detail = await getLinodeInstanceDetail(instance.id);
      setDetailData(detail);
      setResizeTargetType(detail.instance.type || "");
      setDetailPasswordState({
        mode: "random",
        password: "",
      });
      setRebuildImage(detail.instance.image || catalog?.images[0]?.id || "");
      setRebuildUserData("");
      setRebuildBooted(detail.instance.status === "running");
    } catch (detailError) {
      toast.error(toErrorMessage(detailError));
    } finally {
      setDetailLoading(false);
    }
  }, [catalog?.images]);

  const handleCreateInstance = async () => {
    setCreateSubmitting(true);
    try {
      const payload: CreateLinodeInstanceInput = {
        label: createForm.label,
        region: createForm.region,
        type: createForm.type,
        image: createForm.image,
        authorized_keys: createForm.authorized_keys,
        backups_enabled: createForm.backups_enabled,
        booted: createForm.booted,
        tags: parseTags(createForm.tagsText),
        user_data: createForm.user_data,
        root_password_mode: createForm.root_password_mode,
        root_password: createForm.root_password,
      };
      const result = await createLinodeInstance(payload);
      toast.success(t("cloud.providers.linode.create_success", "Linode instance created"));
      setCreateOpen(false);
      setCreatedPassword({
        instance: result.instance,
        rootPassword:
          createForm.root_password_mode === "random"
            ? result.generated_password
            : createForm.root_password,
        passwordMode: createForm.root_password_mode,
        passwordSaved: result.password_saved,
        passwordSaveError: result.password_save_error,
      });
      if (result.password_save_error) {
        toast.error(result.password_save_error);
      }
      setCreateForm((previous) => ({
        ...initialCreateForm,
        region: previous.region,
        type: previous.type,
        image: previous.image,
      }));
      await loadPanelData();
    } catch (createError) {
      toast.error(toErrorMessage(createError));
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleInstanceAction = async (instance: LinodeInstance, type: string) => {
    try {
      await postLinodeInstanceAction(instance.id, { type });
      toast.success(t("cloud.action_success", "Operation submitted"));
      await loadPanelData();
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    }
  };

  const handleDetailInstanceAction = async (input: LinodeInstanceActionInput) => {
    if (!detailInstance) return;
    setDetailActionLoading(true);
    try {
      const result = await postLinodeInstanceAction(detailInstance.id, input);
      toast.success(t("cloud.action_success", "Operation submitted"));
      if (result.generated_password) {
        setCreatedPassword({
          instance: result.instance || detailInstance,
          rootPassword: result.generated_password,
          passwordMode: (input.root_password_mode || "random") as "custom" | "random",
          passwordSaved: result.password_saved,
          passwordSaveError: result.password_save_error,
        });
      } else if (result.password_save_error) {
        toast.error(result.password_save_error);
      }
      await loadPanelData();
      await loadInstanceDetail(detailInstance);
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    } finally {
      setDetailActionLoading(false);
    }
  };

  const handleDeleteInstance = async (instance: LinodeInstance) => {
    const confirmed = window.confirm(
      t("cloud.delete_confirm", {
        name: instance.label,
        defaultValue: `Delete instance "${instance.label}"? This action cannot be undone.`,
      }),
    );
    if (!confirmed) return;

    try {
      await deleteLinodeInstance(instance.id);
      toast.success(t("cloud.delete_success", "Droplet deleted"));
      await loadPanelData();
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  };

  if (initializing) {
    return <Loading text="" />;
  }

  return (
    <AdminPageShell
      eyebrow="Linode"
      title={t("cloud.providers.linode.title", "Linode")}
      description={t(
        "cloud.providers.linode.description",
        "Manage multiple Linode API tokens, create instances, and save generated root passwords for later viewing.",
      )}
      actions={
        <>
          <Button
            variant="outline"
            size="1"
            onClick={() => {
              void refreshAll();
            }}
            disabled={panelLoading || tokenChecking}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("cloud.refresh", "Refresh")}
          </Button>
          <Button size="1" onClick={() => setCreateOpen(true)} disabled={!connected || !catalog}>
            <Plus className="mr-2 h-4 w-4" />
            {t("cloud.providers.linode.create", "Create Instance")}
          </Button>
        </>
      }
      stats={[
        {
          label: t("cloud.stats.provider", "Provider"),
          value: "Linode",
        },
        {
          label: t("cloud.stats.tokens", "Tokens"),
          value: tokenPool?.tokens.length || 0,
        },
        {
          label: t("cloud.stats.account", "Account"),
          value: (
            <span className="inline-flex items-center gap-2">
              <span>{account?.email || activeToken?.profile_email || "-"}</span>
              {account?.restricted ? (
                <Badge color="red">{t("cloud.providers.linode.restricted", "Restricted")}</Badge>
              ) : null}
            </span>
          ),
        },
        {
          label: t("cloud.providers.linode.instances", "Instances"),
          value: instances.length,
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

      {account?.restricted ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {t(
            "cloud.providers.linode.restricted_account_help",
            "This Linode account is currently restricted. New health checks and instance operations may continue to fail until Linode removes the restriction.",
          )}
        </div>
      ) : null}

      {!passwordStorageEnabled ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {t(
            "cloud.password.storage_disabled_help",
            "Set KOMARI_CLOUD_SECRET_KEY on the server to save root passwords for later viewing in the Droplet list.",
          )}
        </div>
      ) : null}

      <Tabs.Root value={panelSection} onValueChange={(value) => setPanelSection(value as "instances" | "tokens")}>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-900">
                {t("cloud.panel_title", "Panel View")}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {t(
                  "cloud.providers.linode.panel_description",
                  "Switch between Linode instance operations and token management to keep the panel compact.",
                )}
              </div>
            </div>
            <Tabs.List>
              <Tabs.Trigger value="instances">
                {t("cloud.providers.linode.instance_list", "Instance List")} ({instances.length})
              </Tabs.Trigger>
              <Tabs.Trigger value="tokens">
                {t("cloud.sections.tokens", "Token Management")} ({tokenPool?.tokens.length || 0})
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
                    {t("cloud.providers.linode.instance_list", "Instance List")}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {t(
                      "cloud.providers.linode.instance_list_description",
                      "Click an instance label to inspect details and use the current token to manage its power state.",
                    )}
                  </div>
                </div>
                <Button variant="outline" size="1" onClick={() => setPanelSection("tokens")}>
                  <Server className="mr-2 h-4 w-4" />
                  {t("cloud.tokens.open_manager", "Manage Tokens")}
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("cloud.table.name", "Name")}</TableHead>
                  <TableHead>{t("cloud.table.status", "Status")}</TableHead>
                  <TableHead>{t("cloud.table.region", "Region")}</TableHead>
                  <TableHead>{t("cloud.table.ip", "Public IP")}</TableHead>
                  <TableHead>{t("cloud.table.size", "Size")}</TableHead>
                  <TableHead>{t("cloud.table.image", "Image")}</TableHead>
                  <TableHead>{t("cloud.table.price", "Monthly")}</TableHead>
                  <TableHead>{t("cloud.table.password", "Root Password")}</TableHead>
                  <TableHead>{t("cloud.table.created_at", "Created")}</TableHead>
                  <TableHead className="text-right">{t("common.action", "Action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-slate-500">
                      {panelLoading
                        ? t("cloud.loading", "Loading cloud resources...")
                        : hasActiveToken(tokenPool)
                          ? t("cloud.empty", "No Droplets found")
                          : t("cloud.no_active_token", "Select an active token to load DigitalOcean resources")}
                    </TableCell>
                  </TableRow>
                ) : (
                  instances.map((instance) => {
                    const typeInfo = typePriceMap.get(instance.type);
                    return (
                      <TableRow key={instance.id}>
                        <TableCell className="font-medium text-slate-900">
                          <button
                            type="button"
                            className="text-left text-blue-700 hover:text-blue-800 hover:underline"
                            onClick={() => {
                              void loadInstanceDetail(instance);
                            }}
                          >
                            {instance.label}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge color={getStatusColor(instance.status)}>{instance.status}</Badge>
                        </TableCell>
                        <TableCell>{instance.region || "-"}</TableCell>
                        <TableCell>{instance.ipv4[0] || instance.ipv6 || "-"}</TableCell>
                        <TableCell>{instance.type || "-"}</TableCell>
                        <TableCell>{instance.image || "-"}</TableCell>
                        <TableCell>
                          {typeInfo ? `$${typeInfo.price.monthly.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell>
                          {instance.saved_root_password ? (
                            <div className="space-y-1">
                              <Badge color={passwordStorageEnabled ? "green" : "amber"}>
                                {passwordStorageEnabled
                                  ? t("cloud.password.saved", "Saved")
                                  : t("cloud.password.locked", "Locked")}
                              </Badge>
                              {instance.saved_root_password_updated_at ? (
                                <div className="text-xs text-slate-500">
                                  {formatDateTime(instance.saved_root_password_updated_at)}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">
                              {passwordStorageEnabled
                                ? t("cloud.password.not_saved", "Not saved")
                                : t("cloud.password.disabled_short", "Vault off")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{formatDateTime(instance.created)}</TableCell>
                        <TableCell className="text-right">
                          <Flex justify="end" gap="2" wrap="wrap">
                            <Button
                              variant="soft"
                              size="1"
                              disabled={!instance.saved_root_password || !passwordStorageEnabled || passwordLoading}
                              onClick={() => {
                                void handleViewPassword(instance);
                              }}
                            >
                              <KeyRound className="mr-1 h-3.5 w-3.5" />
                              {t("cloud.password.view", "View Password")}
                            </Button>
                            {instance.status === "running" ? (
                              <Button
                                variant="soft"
                                size="1"
                                color="amber"
                                onClick={() => {
                                  void handleInstanceAction(instance, "shutdown");
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
                                  void handleInstanceAction(instance, "boot");
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
                                void handleOpenShareDialog(instance);
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
                                void handleDeleteInstance(instance);
                              }}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              {t("cloud.delete", "Delete")}
                            </Button>
                          </Flex>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Tabs.Content>

        <Tabs.Content value="tokens">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {t("cloud.tokens.title", "Token Pool")}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {t(
                      "cloud.providers.linode.tokens_description",
                      "Save multiple Linode personal access tokens, choose the active one, and verify them in bulk.",
                    )}
                  </div>
                </div>
                <Flex gap="2" wrap="wrap">
                  <Button
                    variant="outline"
                    size="1"
                    onClick={() => {
                      void handleCheckTokens();
                    }}
                    disabled={tokenChecking || !tokenPool?.tokens.length}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {t("cloud.tokens.check_all", "Check All Tokens")}
                  </Button>
                  <Button variant="outline" size="1" onClick={() => setPanelSection("instances")}>
                    <Server className="mr-2 h-4 w-4" />
                    {t("cloud.providers.linode.instance_list", "Instance List")}
                  </Button>
                  <Button size="1" onClick={() => setTokenImportOpen(true)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {t("cloud.tokens.import", "Import Tokens")}
                  </Button>
                </Flex>
              </div>
            </div>

            <div className="max-h-[560px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("cloud.tokens.table.name", "Name")}</TableHead>
                    <TableHead>{t("cloud.tokens.table.token", "Token")}</TableHead>
                    <TableHead>{t("cloud.tokens.table.account", "Account")}</TableHead>
                    <TableHead>{t("cloud.tokens.table.status", "Status")}</TableHead>
                    <TableHead>{t("cloud.tokens.table.checked_at", "Last Checked")}</TableHead>
                    <TableHead className="text-right">{t("common.action", "Action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!tokenPool?.tokens.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                        {t("cloud.providers.linode.tokens_empty", "No Linode tokens saved yet")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    tokenPool.tokens.map((token) => (
                      <TableRow key={token.id}>
                        <TableCell className="font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="max-w-44 truncate">{token.name}</span>
                            {token.is_active ? (
                              <Badge color="blue">{t("cloud.tokens.active", "Active")}</Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-44 truncate font-mono text-xs text-slate-600">
                          {token.masked_token || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-900">
                            {token.profile_email || token.profile_username || "-"}
                          </div>
                          {token.account_company ? (
                            <div className="text-xs text-slate-500">{token.account_company}</div>
                          ) : null}
                          {isRestrictedLinodeToken(token) ? (
                            <div className="mt-1">
                              <Badge color="red">{t("cloud.providers.linode.restricted", "Restricted")}</Badge>
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Badge color={getTokenStatusColor(token.last_status)}>
                            {t(`cloud.tokens.status.${token.last_status}`, token.last_status || "unknown")}
                          </Badge>
                          {token.last_error ? (
                            <div className="mt-1 max-w-64 text-xs text-red-600">{token.last_error}</div>
                          ) : null}
                        </TableCell>
                        <TableCell>{formatDateTime(token.last_checked_at)}</TableCell>
                        <TableCell className="text-right">
                          <Flex justify="end" gap="2" wrap="wrap">
                            <Button
                              variant="soft"
                              size="1"
                              color={token.is_active ? "blue" : undefined}
                              disabled={token.is_active}
                              onClick={() => {
                                void handleSelectToken(token);
                              }}
                            >
                              <Server className="mr-1 h-3.5 w-3.5" />
                              {token.is_active
                                ? t("cloud.tokens.current", "Current")
                                : t("cloud.tokens.use", "Use")}
                            </Button>
                            <Button
                              variant="soft"
                              size="1"
                              onClick={() => {
                                void handleSelectToken(token, {
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
                              disabled={tokenSecretLoading}
                              onClick={() => {
                                void handleViewTokenSecret(token);
                              }}
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              {t("cloud.tokens.view_token", "View Token")}
                            </Button>
                            <Button
                              variant="soft"
                              size="1"
                              color="red"
                              onClick={() => {
                                void handleDeleteToken(token);
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

      <Dialog.Root open={tokenImportOpen} onOpenChange={setTokenImportOpen}>
        <Dialog.Content className="max-h-[85vh] overflow-y-auto">
          <Dialog.Title>{t("cloud.tokens.import_dialog_title", "Batch Import Tokens")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.tokens.import_dialog_description",
              "One line per token. Supported formats: name,token ; name|token ; or token only.",
            )}
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-4">
            <TextArea
              className="min-h-40"
              value={tokenImportText}
              placeholder={t(
                "cloud.tokens.import_placeholder",
                "prod-account,dop_v1_xxx\nbackup-account|dop_v1_yyy\ndop_v1_zzz",
              )}
              onChange={(event) => setTokenImportText(event.target.value)}
            />
            <Flex justify="end" gap="2">
              <Button variant="outline" onClick={() => setTokenImportOpen(false)} disabled={tokenSaving}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button onClick={() => { void handleImportTokens(); }} disabled={tokenSaving}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {tokenSaving ? t("cloud.tokens.importing", "Importing...") : t("cloud.tokens.import", "Import Tokens")}
              </Button>
            </Flex>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
        <Dialog.Content className="max-h-[85vh] overflow-y-auto">
          <Dialog.Title>{t("cloud.providers.linode.create", "Create Instance")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.linode.create_description",
              "Choose the region, plan, image, and root password mode for the new Linode instance.",
            )}
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-4">
            <label className="text-sm font-medium text-slate-800">
              {t("cloud.form.name", "Name")}
            </label>
            <TextField.Root
              value={createForm.label}
              placeholder="web-01"
              onChange={(event) => setCreateForm((previous) => ({ ...previous, label: event.target.value }))}
            />

            <label className="text-sm font-medium text-slate-800">
              {t("cloud.form.region", "Region")}
            </label>
            <Select.Root
              value={createForm.region}
              onValueChange={(value) => setCreateForm((previous) => ({ ...previous, region: value }))}
            >
              <Select.Trigger placeholder={t("cloud.form.region_placeholder", "Select a region")} />
              <Select.Content>
                {(catalog?.regions || []).map((region) => (
                  <Select.Item key={region.id} value={region.id}>
                    {getLinodeRegionOptionLabel(region, t)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <label className="text-sm font-medium text-slate-800">
              {t("cloud.form.size", "Size")}
            </label>
            <Select.Root
              value={createForm.type}
              onValueChange={(value) => setCreateForm((previous) => ({ ...previous, type: value }))}
            >
              <Select.Trigger placeholder={t("cloud.form.size_placeholder", "Select a size")} />
              <Select.Content>
                {(catalog?.types || []).map((type) => (
                  <Select.Item key={type.id} value={type.id}>
                    {getLinodeTypeOptionLabel(type)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <label className="text-sm font-medium text-slate-800">
              {t("cloud.form.image", "Image")}
            </label>
            <Select.Root
              value={createForm.image}
              onValueChange={(value) => setCreateForm((previous) => ({ ...previous, image: value }))}
            >
              <Select.Trigger placeholder={t("cloud.form.image_placeholder", "Select an image")} />
              <Select.Content>
                {(catalog?.images || []).map((image: LinodeImage) => (
                  <Select.Item key={image.id} value={image.id}>
                    {image.vendor ? `${image.vendor} / ` : ""}{image.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <label className="text-sm font-medium text-slate-800">
              {t("cloud.form.root_access", "Root Access")}
            </label>
            <Select.Root
              value={createForm.root_password_mode}
              onValueChange={(value) =>
                setCreateForm((previous) => ({
                  ...previous,
                  root_password_mode: value as "custom" | "random",
                  root_password: value === "custom" ? previous.root_password : "",
                }))
              }
            >
              <Select.Trigger placeholder={t("cloud.form.root_access_placeholder", "Select access mode")} />
              <Select.Content>
                <Select.Item value="custom">
                  {t("cloud.form.root_access_modes.custom", "Custom root password")}
                </Select.Item>
                <Select.Item value="random">
                  {t("cloud.form.root_access_modes.random", "Random root password")}
                </Select.Item>
              </Select.Content>
            </Select.Root>
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              {t(
                "cloud.providers.linode.root_access_help",
                "Linode can create the instance directly with a root password. SSH keys are optional and only add extra login methods.",
              )}
            </div>

            {createForm.root_password_mode === "custom" ? (
              <>
                <label className="text-sm font-medium text-slate-800">
                  {t("cloud.form.root_password", "Root Password")}
                </label>
                <TextField.Root
                  type="password"
                  value={createForm.root_password}
                  placeholder={t("cloud.form.root_password_placeholder", "Enter a root password")}
                  onChange={(event) => setCreateForm((previous) => ({ ...previous, root_password: event.target.value }))}
                />
              </>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {t(
                  "cloud.form.root_password_random_help",
                  "A random root password will be generated on the server and shown once after creation succeeds.",
                )}
              </div>
            )}

            <label className="text-sm font-medium text-slate-800">
              {t("cloud.form.tags", "Tags")}
            </label>
            <TextField.Root
              value={createForm.tagsText}
              placeholder="prod, web"
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

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-sm font-medium text-slate-800">
                {t("cloud.form.options", "Options")}
              </div>
              <div className="mt-3 flex flex-col gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <Checkbox
                    checked={createForm.backups_enabled}
                    onCheckedChange={(checked) => setCreateForm((previous) => ({ ...previous, backups_enabled: Boolean(checked) }))}
                  />
                  {t("cloud.form.backups", "Enable backups")}
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <Checkbox
                    checked={createForm.booted}
                    onCheckedChange={(checked) => setCreateForm((previous) => ({ ...previous, booted: Boolean(checked) }))}
                  />
                  {t("cloud.providers.linode.booted", "Boot after creation")}
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-sm font-medium text-slate-800">
                {t("cloud.providers.linode.ssh_keys_optional", "SSH Keys (Optional)")}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {t(
                  "cloud.providers.linode.ssh_keys_optional_description",
                  "You can leave this empty. The selected keys are only attached as additional login methods.",
                )}
              </div>
              <div className="mt-3 flex max-h-48 flex-col gap-2 overflow-y-auto">
                {(catalog?.ssh_keys || []).length ? (
                  catalog!.ssh_keys.map((sshKey) => {
                    const checked = createForm.authorized_keys.includes(sshKey.ssh_key);
                    return (
                      <label
                        key={sshKey.label}
                        className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(nextChecked) =>
                            setCreateForm((previous) => ({
                              ...previous,
                              authorized_keys: nextChecked === true
                                ? [...previous.authorized_keys, sshKey.ssh_key]
                                : previous.authorized_keys.filter((value) => value !== sshKey.ssh_key),
                            }))
                          }
                        />
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-900">{sshKey.label}</span>
                          <span className="block truncate text-xs text-slate-500">{sshKey.ssh_key}</span>
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <div className="text-sm text-slate-500">
                    {t("cloud.form.ssh_keys_empty", "No SSH keys found in this account")}
                  </div>
                )}
              </div>
            </div>

            <Flex justify="end" gap="2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createSubmitting}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                onClick={() => {
                  void handleCreateInstance();
                }}
                disabled={
                  createSubmitting ||
                  !createForm.label ||
                  !createForm.region ||
                  !createForm.type ||
                  !createForm.image ||
                  (createForm.root_password_mode === "custom" && !createForm.root_password)
                }
              >
                {createSubmitting
                  ? t("cloud.creating", "Creating...")
                  : t("cloud.providers.linode.create", "Create Instance")}
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
        <Dialog.Content className="max-h-[85vh] overflow-y-auto">
          <Dialog.Title>{detailInstance?.label || t("cloud.detail.title", "Droplet Details")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.linode.detail_description",
              "View the selected Linode instance details from the current active token.",
            )}
          </Dialog.Description>

          {detailLoading ? (
            <div className="mt-4 text-sm text-slate-500">{t("cloud.loading", "Loading cloud resources...")}</div>
          ) : detailData ? (
            <div className="mt-4 flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label={t("cloud.detail.id", "Droplet ID")} value={detailData.instance.id} />
                <DetailItem label={t("cloud.table.status", "Status")} value={detailData.instance.status || "-"} />
                <DetailItem label={t("cloud.table.region", "Region")} value={detailData.instance.region || "-"} />
                <DetailItem label={t("cloud.table.ip", "Public IP")} value={detailData.instance.ipv4[0] || detailData.instance.ipv6 || "-"} />
                <DetailItem label={t("cloud.table.size", "Size")} value={detailData.instance.type || "-"} />
                <DetailItem label={t("cloud.table.image", "Image")} value={detailData.instance.image || "-"} />
                <DetailItem label={t("cloud.table.created_at", "Created")} value={formatDateTime(detailData.instance.created)} />
                <DetailItem label={t("cloud.detail.memory", "Memory")} value={`${detailData.instance.specs.memory} MB`} />
                <DetailItem label={t("cloud.detail.vcpus", "vCPUs")} value={detailData.instance.specs.vcpus} />
                <DetailItem label={t("cloud.detail.disk", "Disk")} value={`${detailData.instance.specs.disk} GB`} />
                <DetailItem label={t("cloud.detail.tags", "Tags")} value={formatList(detailData.instance.tags)} />
                <DetailItem
                  label={t("cloud.table.password", "Root Password")}
                  value={
                    detailData.instance.saved_root_password ? (
                      <Button
                        variant="soft"
                        size="1"
                        disabled={!passwordStorageEnabled || passwordLoading}
                        onClick={() => {
                          void handleViewPassword(detailData.instance);
                        }}
                      >
                        <KeyRound className="mr-1 h-3.5 w-3.5" />
                        {t("cloud.password.view", "View Password")}
                      </Button>
                    ) : (
                      t("cloud.password.not_saved", "Not saved")
                    )
                  }
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-sm font-medium text-slate-900">
                  {t("cloud.providers.linode.disks", "Disks")}
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {detailData.disks.length ? detailData.disks.map((disk: LinodeDisk) => (
                    <div key={disk.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <div className="font-medium text-slate-900">{disk.label || `Disk ${disk.id}`}</div>
                      <div className="text-slate-500">
                        {disk.size} MB / {disk.filesystem || "-"} / {disk.status || "-"}
                      </div>
                    </div>
                  )) : (
                    <div className="text-sm text-slate-500">-</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-sm font-medium text-slate-900">
                  {t("cloud.providers.linode.configs", "Configs")}
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {detailData.configs.length ? detailData.configs.map((config: LinodeConfig) => (
                    <div key={config.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <div className="font-medium text-slate-900">{config.label || `Config ${config.id}`}</div>
                      <div className="text-slate-500">
                        {config.kernel || "-"} / {config.root_device || "-"} / {config.run_level || "-"}
                      </div>
                    </div>
                  )) : (
                    <div className="text-sm text-slate-500">-</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-sm font-medium text-slate-900">
                  {t("cloud.providers.linode.backups", "Backups")}
                </div>
                {detailData.backups ? (
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <div>
                      {t("cloud.form.backups", "Enable backups")}: {detailData.backups.enabled ? t("common.yes", "Yes") : t("common.no", "No")}
                    </div>
                    <div>
                      {t("cloud.providers.linode.last_successful", "Last Successful")}: {formatDateTime(detailData.backups.last_successful)}
                    </div>
                    <div>
                      {t("cloud.providers.linode.backup_schedule", "Schedule")}: {detailData.backups.schedule.day || "-"} / {detailData.backups.schedule.window || "-"}
                    </div>
                    <div>
                      {t("cloud.providers.linode.backup_automatic", "Automatic")}: {detailData.backups.automatic.length}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-slate-500">-</div>
                )}
                <Flex justify="end" gap="2" className="mt-3">
                  <Button
                    size="1"
                    disabled={detailActionLoading}
                    onClick={() => {
                      void handleDetailInstanceAction({ type: "snapshot" });
                    }}
                  >
                    {t("cloud.providers.linode.create_snapshot", "Create Snapshot")}
                  </Button>
                </Flex>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-sm font-medium text-slate-900">
                    {t("cloud.providers.linode.resize", "Resize")}
                  </div>
                  <Select.Root value={resizeTargetType || SELECT_NONE} onValueChange={(value) => setResizeTargetType(value === SELECT_NONE ? "" : value)}>
                    <Select.Trigger className="mt-3" placeholder={t("cloud.form.size_placeholder", "Select a size")} />
                    <Select.Content>
                      <Select.Item value={SELECT_NONE}>{t("cloud.providers.aws.none", "None")}</Select.Item>
                      {(catalog?.types || []).map((type) => (
                        <Select.Item key={type.id} value={type.id}>
                          {getLinodeTypeOptionLabel(type)}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                  <Flex justify="end" gap="2" className="mt-3">
                    <Button
                      size="1"
                      disabled={detailActionLoading || !resizeTargetType}
                      onClick={() => {
                        void handleDetailInstanceAction({
                          type: "resize",
                          target_type: resizeTargetType,
                        });
                      }}
                    >
                      {t("cloud.providers.linode.resize", "Resize")}
                    </Button>
                  </Flex>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-sm font-medium text-slate-900">
                    {t("cloud.providers.linode.reset_password", "Reset Root Password")}
                  </div>
                  <Select.Root
                    value={detailPasswordState.mode}
                    onValueChange={(value) =>
                      setDetailPasswordState((previous) => ({
                        ...previous,
                        mode: value as "custom" | "random",
                        password: value === "custom" ? previous.password : "",
                      }))
                    }
                  >
                    <Select.Trigger className="mt-3" placeholder={t("cloud.form.root_access_placeholder", "Select access mode")} />
                    <Select.Content>
                      <Select.Item value="custom">
                        {t("cloud.form.root_access_modes.custom", "Custom root password")}
                      </Select.Item>
                      <Select.Item value="random">
                        {t("cloud.form.root_access_modes.random", "Random root password")}
                      </Select.Item>
                    </Select.Content>
                  </Select.Root>
                  {detailPasswordState.mode === "custom" ? (
                    <TextField.Root
                      className="mt-3"
                      type="password"
                      value={detailPasswordState.password}
                      placeholder={t("cloud.form.root_password_placeholder", "Enter a root password")}
                      onChange={(event) =>
                        setDetailPasswordState((previous) => ({
                          ...previous,
                          password: event.target.value,
                        }))
                      }
                    />
                  ) : null}
                  <Flex justify="end" gap="2" className="mt-3">
                    <Button
                      size="1"
                      disabled={detailActionLoading || (detailPasswordState.mode === "custom" && !detailPasswordState.password)}
                      onClick={() => {
                        void handleDetailInstanceAction({
                          type: "reset_root_password",
                          root_password_mode: detailPasswordState.mode,
                          root_password: detailPasswordState.password,
                        });
                      }}
                    >
                      {t("cloud.providers.linode.reset_password", "Reset Root Password")}
                    </Button>
                  </Flex>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-sm font-medium text-slate-900">
                  {t("cloud.providers.linode.rebuild", "Rebuild")}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 mt-3">
                  <Select.Root value={rebuildImage || SELECT_NONE} onValueChange={(value) => setRebuildImage(value === SELECT_NONE ? "" : value)}>
                    <Select.Trigger placeholder={t("cloud.form.image_placeholder", "Select an image")} />
                    <Select.Content>
                      <Select.Item value={SELECT_NONE}>{t("cloud.providers.aws.none", "None")}</Select.Item>
                      {(catalog?.images || []).map((image: LinodeImage) => (
                        <Select.Item key={image.id} value={image.id}>
                          {image.vendor ? `${image.vendor} / ` : ""}{image.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                  <Select.Root
                    value={detailPasswordState.mode}
                    onValueChange={(value) =>
                      setDetailPasswordState((previous) => ({
                        ...previous,
                        mode: value as "custom" | "random",
                        password: value === "custom" ? previous.password : "",
                      }))
                    }
                  >
                    <Select.Trigger placeholder={t("cloud.form.root_access_placeholder", "Select access mode")} />
                    <Select.Content>
                      <Select.Item value="custom">
                        {t("cloud.form.root_access_modes.custom", "Custom root password")}
                      </Select.Item>
                      <Select.Item value="random">
                        {t("cloud.form.root_access_modes.random", "Random root password")}
                      </Select.Item>
                    </Select.Content>
                  </Select.Root>
                </div>
                {detailPasswordState.mode === "custom" ? (
                  <TextField.Root
                    className="mt-3"
                    type="password"
                    value={detailPasswordState.password}
                    placeholder={t("cloud.form.root_password_placeholder", "Enter a root password")}
                    onChange={(event) =>
                      setDetailPasswordState((previous) => ({
                        ...previous,
                        password: event.target.value,
                      }))
                    }
                  />
                ) : null}
                <TextArea
                  className="mt-3 min-h-28"
                  value={rebuildUserData}
                  placeholder="#!/bin/bash"
                  onChange={(event) => setRebuildUserData(event.target.value)}
                />
                <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                  <Checkbox checked={rebuildBooted} onCheckedChange={(checked) => setRebuildBooted(Boolean(checked))} />
                  {t("cloud.providers.linode.booted", "Boot after creation")}
                </label>
                <Flex justify="end" gap="2" className="mt-3">
                  <Button
                    size="1"
                    disabled={detailActionLoading || !rebuildImage || (detailPasswordState.mode === "custom" && !detailPasswordState.password)}
                    onClick={() => {
                      void handleDetailInstanceAction({
                        type: "rebuild",
                        image: rebuildImage,
                        root_password_mode: detailPasswordState.mode,
                        root_password: detailPasswordState.password,
                        booted: rebuildBooted,
                        user_data: rebuildUserData,
                      });
                    }}
                  >
                    {t("cloud.providers.linode.rebuild", "Rebuild")}
                  </Button>
                </Flex>
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={Boolean(tokenSecret)} onOpenChange={(open) => !open && setTokenSecret(null)}>
        <Dialog.Content className="max-h-[85vh] overflow-y-auto">
          <Dialog.Title>{t("cloud.tokens.token_dialog_title", "Token Details")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.linode.token_dialog_description",
              "View the full Linode token only when you need to copy or verify it.",
            )}
          </Dialog.Description>

          {tokenSecret ? (
            <div className="mt-4 flex flex-col gap-4">
              <DetailItem label={t("cloud.tokens.table.name", "Name")} value={tokenSecret.secret.token_name} />
              <DetailItem label={t("cloud.tokens.table.account", "Account")} value={tokenSecret.secret.profile_email || tokenSecret.secret.profile_username || "-"} />
              <DetailItem label={t("cloud.tokens.masked_token", "Masked Token")} value={tokenSecret.secret.masked_token || "-"} />
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-slate-800">
                    {t("cloud.tokens.full_token", "Full Token")}
                  </div>
                  <Button variant="outline" size="1" onClick={() => { void copyText(tokenSecret.secret.token); }}>
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    {t("copy", "Copy")}
                  </Button>
                </div>
                <TextArea className="mt-3 min-h-24 font-mono text-xs" readOnly value={tokenSecret.secret.token} />
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
        sharePassword={sharePassword}
        shareManagedSSHKey={false}
        shareUrl={shareRecord?.token ? buildCloudInstanceShareUrl(shareRecord.token) : ""}
        onTitleChange={setShareTitle}
        onNoteChange={setShareNote}
        onSharePasswordChange={setSharePassword}
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

      <Dialog.Root open={Boolean(savedPassword)} onOpenChange={(open) => !open && setSavedPassword(null)}>
        <Dialog.Content className="max-h-[85vh] overflow-y-auto">
          <Dialog.Title>{t("cloud.password.dialog_title", "Saved Root Password")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.linode.password_dialog_description",
              "View the saved root password for this Linode instance from the current active token.",
            )}
          </Dialog.Description>

          {savedPassword ? (
            <div className="mt-4 flex flex-col gap-4">
              <DetailItem label={t("cloud.table.name", "Name")} value={savedPassword.instance.label} />
              <DetailItem label={t("cloud.password.username", "Username")} value={savedPassword.credential.username} />
              <DetailItem label={t("cloud.password.mode", "Password Mode")} value={savedPassword.credential.password_mode || "-"} />
              <DetailItem label={t("cloud.password.saved_at", "Saved At")} value={formatDateTime(savedPassword.credential.updated_at)} />
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-slate-800">{t("cloud.form.root_password", "Root Password")}</div>
                  <Button variant="outline" size="1" onClick={() => { void copyText(savedPassword.credential.root_password); }}>
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    {t("copy", "Copy")}
                  </Button>
                </div>
                <TextArea className="mt-3 min-h-24 font-mono text-xs" readOnly value={savedPassword.credential.root_password} />
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={Boolean(createdPassword)} onOpenChange={(open) => !open && setCreatedPassword(null)}>
        <Dialog.Content className="max-h-[85vh] overflow-y-auto">
          <Dialog.Title>{t("cloud.providers.linode.create_credentials_title", "Root Access Credentials")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.linode.create_credentials_description",
              "Store this root password now. You can reopen it later only if password vault storage is enabled and the save succeeded.",
            )}
          </Dialog.Description>

          {createdPassword ? (
            <div className="mt-4 flex flex-col gap-4">
              <DetailItem label={t("cloud.table.name", "Name")} value={createdPassword.instance.label} />
              <DetailItem label={t("cloud.password.mode", "Password Mode")} value={createdPassword.passwordMode} />
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-slate-800">{t("cloud.form.root_password", "Root Password")}</div>
                  <Button variant="outline" size="1" onClick={() => { void copyText(createdPassword.rootPassword); }}>
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    {t("copy", "Copy")}
                  </Button>
                </div>
                <TextArea className="mt-3 min-h-24 font-mono text-xs" readOnly value={createdPassword.rootPassword} />
              </div>
              <div className={`rounded-xl px-4 py-3 text-sm ${createdPassword.passwordSaved ? "border border-emerald-200 bg-emerald-50 text-emerald-800" : "border border-amber-200 bg-amber-50 text-amber-800"}`}>
                {createdPassword.passwordSaved
                  ? t("cloud.password.create_saved", "This root password has been encrypted and saved. You can reopen it later from the Droplet list.")
                  : createdPassword.passwordSaveError
                    ? t("cloud.password.create_unsaved_reason", {
                        reason: createdPassword.passwordSaveError,
                        defaultValue: `Password save failed: ${createdPassword.passwordSaveError}`,
                      })
                    : t("cloud.password.create_unsaved", "This root password was not saved on the server. Save it now if you still need it later.")}
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Root>
    </AdminPageShell>
  );
}

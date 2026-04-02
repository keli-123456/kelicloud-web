import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CheckCircle2,
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
import CloudInstanceScriptDialog, { type CloudInstanceScriptTarget } from "@/components/admin/cloud/CloudInstanceScriptDialog";
import {
  Badge,
  Button,
  Checkbox,
  CloudCopyBlock,
  CloudDetailItem,
  cloudDetailListClassName,
  cloudDetailListItemClassName,
  cloudDetailSectionClassName,
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
  redeemLinodePromoCode,
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
import { getCloudStatusLabel } from "@/lib/cloudStatus";
import {
  buildCloudInstanceShareUrl,
  deleteCloudInstanceShare,
  fromCloudShareDateTimeLocalValue,
  getCloudInstanceShare,
  saveCloudInstanceShare,
  toCloudShareDateTimeLocalValue,
  type CloudShareAccessPolicy,
  type CloudInstanceShareRecord,
} from "@/lib/cloudShare";

type CreateFormState = Omit<CreateLinodeInstanceInput, "tags" | "root_password_mode"> & {
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
  root_password: "",
  auto_connect: true,
  auto_connect_group: "",
};

const LINODE_LAST_TOKEN_GROUP_STORAGE_KEY = "komari-linode-last-token-group";

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

function getStoredTokenGroup() {
  try {
    return window.localStorage.getItem(LINODE_LAST_TOKEN_GROUP_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function setStoredTokenGroup(value: string) {
  try {
    const normalized = value.trim();
    if (normalized) {
      window.localStorage.setItem(LINODE_LAST_TOKEN_GROUP_STORAGE_KEY, normalized);
      return;
    }
    window.localStorage.removeItem(LINODE_LAST_TOKEN_GROUP_STORAGE_KEY);
  } catch {
    // ignore storage write failures
  }
}

function hasActiveToken(pool: LinodeTokenPool | null) {
  return Boolean(pool?.active_token_id);
}

function getActiveToken(pool: LinodeTokenPool | null) {
  return pool?.tokens.find((token) => token.id === pool.active_token_id) || null;
}

function getDefaultAutoConnectGroup(provider: string, credentialName: string) {
  const normalizedProvider = provider.trim().toLowerCase() || "cloud";
  const normalizedCredentialName = credentialName.trim() || "default";
  return `${normalizedProvider}/${normalizedCredentialName}`;
}

function getCreateRootPasswordMode(rootPassword: string): "custom" | "random" {
  return rootPassword.trim() ? "custom" : "random";
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
      name,
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

function isLinodeRestrictedMessage(message: string) {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return false;

  return (
    normalized.includes("restricted")
    || normalized.includes("team has been locked")
    || normalized.includes("lack of payment")
    || normalized.includes("open a ticket")
    || normalized.includes("improper use")
    || normalized.includes("support staff can help")
  );
}

function isRestrictedLinodeToken(token: LinodeTokenRecord) {
  return token.last_status === "error" && isLinodeRestrictedMessage(token.last_error);
}

function getLinodeStatusSummary(
  message: string,
  t: ReturnType<typeof useTranslation>["t"],
) {
  const normalizedMessage = message.trim();
  if (!normalizedMessage) return "";
  if (isLinodeRestrictedMessage(normalizedMessage)) {
    return t("cloud.providers.linode.restricted", "Restricted");
  }
  return normalizedMessage;
}

const DetailItem = CloudDetailItem;

export default function LinodePanel() {
  const { t } = useTranslation();
  const { confirm, dialog } = useWarningDialog();

  const [initializing, setInitializing] = React.useState(true);
  const [panelLoading, setPanelLoading] = React.useState(false);
  const [tokenSaving, setTokenSaving] = React.useState(false);
  const [tokenChecking, setTokenChecking] = React.useState(false);
  const [tokenImportOpen, setTokenImportOpen] = React.useState(false);
  const [tokenImportText, setTokenImportText] = React.useState("");
  const [tokenImportGroup, setTokenImportGroup] = React.useState(() => getStoredTokenGroup());
  const [tokenPool, setTokenPool] = React.useState<LinodeTokenPool | null>(null);
  const [selectedTokenIds, setSelectedTokenIds] = React.useState<string[]>([]);
  const [tokenGroupEditorOpen, setTokenGroupEditorOpen] = React.useState(false);
  const [tokenGroupEditorValue, setTokenGroupEditorValue] = React.useState("");
  const [tokenGroupEditorIds, setTokenGroupEditorIds] = React.useState<string[]>([]);
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
  const [scriptTarget, setScriptTarget] = React.useState<CloudInstanceScriptTarget | null>(null);
  const [shareRecord, setShareRecord] = React.useState<CloudInstanceShareRecord | null>(null);
  const [shareLoading, setShareLoading] = React.useState(false);
  const [shareSaving, setShareSaving] = React.useState(false);
  const [shareDeleting, setShareDeleting] = React.useState(false);
  const [shareTitle, setShareTitle] = React.useState("");
  const [shareNote, setShareNote] = React.useState("");
  const [shareAccessPolicy, setShareAccessPolicy] = React.useState<CloudShareAccessPolicy>("public");
  const [shareExpiresAt, setShareExpiresAt] = React.useState("");
  const [sharePassword, setSharePassword] = React.useState(false);
  const [passwordLoading, setPasswordLoading] = React.useState(false);
  const [createdPassword, setCreatedPassword] = React.useState<CreatedPasswordState | null>(null);
  const [error, setError] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createSubmitting, setCreateSubmitting] = React.useState(false);
  const [promoOpen, setPromoOpen] = React.useState(false);
  const [promoCode, setPromoCode] = React.useState("");
  const [promoSubmitting, setPromoSubmitting] = React.useState(false);
  const [createCatalogLoading, setCreateCatalogLoading] = React.useState(false);
  const [resourcesLoaded, setResourcesLoaded] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<CreateFormState>(initialCreateForm);
  const activeToken = getActiveToken(tokenPool);
  const defaultCreateGroup = getDefaultAutoConnectGroup("linode", activeToken?.name || "");

  const clearPanelState = React.useCallback(() => {
    setAccount(null);
    setCatalog(null);
    setInstances([]);
    setDetailData(null);
    setError("");
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
      setResourcesLoaded(true);
    } catch (panelError) {
      setAccount(null);
      setCatalog(null);
      setInstances([]);
      setError(toErrorMessage(panelError));
      setResourcesLoaded(false);
    } finally {
      setPanelLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const nextPool = await getLinodeTokens();
        if (cancelled) return;
        setTokenPool(nextPool);
        if (!hasActiveToken(nextPool)) {
          clearPanelState();
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
    setSelectedTokenIds((current) => {
      if (current.length === 0) {
        return current;
      }

      const validIds = new Set((tokenPool?.tokens ?? []).map((token) => token.id));
      const next = current.filter((id) => validIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [tokenPool]);

  const passwordStorageEnabled = Boolean(tokenPool?.password_storage_enabled);
  const tokenRows = React.useMemo(() => tokenPool?.tokens ?? [], [tokenPool?.tokens]);
  const existingTokenGroups = React.useMemo(
    () =>
      Array.from(new Set(
        tokenRows
          .map((token) => token.group.trim())
          .filter(Boolean),
      )),
    [tokenRows],
  );
  const selectedTokens = tokenRows.filter((token) => selectedTokenIds.includes(token.id));
  const allTokensSelected = tokenRows.length > 0 && selectedTokenIds.length === tokenRows.length;
  const someTokensSelected = selectedTokenIds.length > 0 && selectedTokenIds.length < tokenRows.length;
  const typePriceMap = new Map((catalog?.types || []).map((type) => [type.id, type]));

  const assertTokensDeleted = (nextPool: LinodeTokenPool, tokenIds: string[]) => {
    const remaining = nextPool.tokens.filter((token) => tokenIds.includes(token.id));
    if (remaining.length > 0) {
      throw new Error(
        t("cloud.tokens.delete_not_applied", {
          defaultValue: "Delete request returned success, but the token still exists. Refresh and try again.",
        }),
      );
    }
  };

  const shouldPreserveLoadedResources = (nextPool: LinodeTokenPool) =>
    resourcesLoaded && Boolean(activeToken?.id) && nextPool.active_token_id === activeToken?.id;

  const syncTokenPoolAfterDelete = (
    nextPool: LinodeTokenPool,
    removedTokenIds: string[],
  ) => {
    setTokenPool(nextPool);
    setSelectedTokenIds((current) => current.filter((id) => !removedTokenIds.includes(id)));
    if (!hasActiveToken(nextPool) || !shouldPreserveLoadedResources(nextPool)) {
      clearPanelState();
    }
  };

  const toggleTokenSelection = (tokenId: string, checked: boolean) => {
    setSelectedTokenIds((current) => {
      if (checked) {
        return current.includes(tokenId) ? current : [...current, tokenId];
      }
      return current.filter((id) => id !== tokenId);
    });
  };

  const openTokenGroupEditor = (tokens: LinodeTokenRecord[]) => {
    if (!tokens.length) {
      return;
    }
    const groups = Array.from(new Set(tokens.map((token) => token.group.trim())));
    setTokenGroupEditorIds(tokens.map((token) => token.id));
    setTokenGroupEditorValue(groups.length === 1 ? groups[0] : "");
    setTokenGroupEditorOpen(true);
  };

  const handleImportTokens = async () => {
    const importGroup = tokenImportGroup.trim();
    const tokens = parseTokenImports(tokenImportText).map((token) => ({
      ...token,
      group: importGroup,
    }));
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
      setTokenImportGroup(importGroup);
      setTokenImportOpen(false);
      setStoredTokenGroup(importGroup);
      toast.success(
        t("cloud.tokens.import_success", {
          count: tokens.length,
          defaultValue: `Imported ${tokens.length} tokens`,
        }),
      );
      if (!hasActiveToken(nextPool) || !shouldPreserveLoadedResources(nextPool)) {
        clearPanelState();
      }
    } catch (saveError) {
      toast.error(toErrorMessage(saveError));
    } finally {
      setTokenSaving(false);
    }
  };

  const handleSaveTokenGroup = async () => {
    if (!tokenGroupEditorIds.length || !tokenPool) {
      return;
    }

    const updates = tokenRows
      .filter((token) => tokenGroupEditorIds.includes(token.id))
      .map((token) => ({
        id: token.id,
        name: token.name,
        group: tokenGroupEditorValue.trim(),
        token: "",
      }));

    if (!updates.length) {
      setTokenGroupEditorOpen(false);
      return;
    }

    setTokenSaving(true);
    try {
      const nextPool = await saveLinodeTokens({
        tokens: updates,
        active_token_id: tokenPool.active_token_id || undefined,
      });
      setTokenPool(nextPool);
      setTokenGroupEditorOpen(false);
      setTokenGroupEditorIds([]);
      setTokenGroupEditorValue("");
      setStoredTokenGroup(tokenGroupEditorValue);
      toast.success(t("cloud.tokens.group_save_success", "Token group updated"));
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
      if (!hasActiveToken(nextPool) || !shouldPreserveLoadedResources(nextPool)) {
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
    options?: { loadResources?: boolean },
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
      if (options?.loadResources) {
        await loadPanelData();
      } else {
        clearPanelState();
      }
    } catch (selectError) {
      toast.error(toErrorMessage(selectError));
    }
  };

  const handleDeleteToken = async (token: LinodeTokenRecord) => {
    const confirmed = await confirm({
      title: t("cloud.tokens.delete", "Delete token"),
      description: t("cloud.tokens.delete_confirm", {
        name: token.name,
        defaultValue: `Delete token "${token.name}"?`,
      }),
      confirmLabel: t("cloud.tokens.delete", "Delete"),
    });
    if (!confirmed) return;

    try {
      const nextPool = await deleteLinodeToken(token.id);
      assertTokensDeleted(nextPool, [token.id]);
      await syncTokenPoolAfterDelete(nextPool, [token.id]);
      toast.success(t("cloud.tokens.delete_success", "Token deleted"));
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  };

  const handleDeleteSelectedTokens = async () => {
    if (!selectedTokens.length) {
      return;
    }

    const confirmed = await confirm({
      title: t("cloud.tokens.delete_selected", {
        count: selectedTokens.length,
        defaultValue: "Delete selected tokens",
      }),
      description: t("cloud.tokens.delete_selected_confirm", {
        count: selectedTokens.length,
        defaultValue: `Delete ${selectedTokens.length} selected tokens?`,
      }),
      confirmLabel: t("cloud.tokens.delete", "Delete"),
    });
    if (!confirmed) return;

    let latestPool: LinodeTokenPool | null = null;
    const removedIds: string[] = [];
    const failedIds: string[] = [];
    const failures: string[] = [];

    for (const token of selectedTokens) {
      try {
        const nextPool = await deleteLinodeToken(token.id);
        assertTokensDeleted(nextPool, [token.id]);
        latestPool = nextPool;
        removedIds.push(token.id);
      } catch (deleteError) {
        failedIds.push(token.id);
        failures.push(`${token.name}: ${toErrorMessage(deleteError)}`);
      }
    }

    if (latestPool && removedIds.length > 0) {
      await syncTokenPoolAfterDelete(latestPool, removedIds);
    }

    setSelectedTokenIds(failedIds);

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
      providerLabel: t("cloud.providers.linode.title", "Linode"),
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
    setShareAccessPolicy("public");
    setShareExpiresAt("");
    setSharePassword(false);
    setShareOpen(true);
    setShareLoading(true);

    try {
      const nextShare = await getCloudInstanceShare("linode", "instance", String(instance.id));
      setShareRecord(nextShare.token ? nextShare : null);
      setShareTitle(nextShare.title || instance.label || "");
      setShareNote(nextShare.note || "");
      setShareAccessPolicy(nextShare.access_policy || "public");
      setShareExpiresAt(toCloudShareDateTimeLocalValue(nextShare.expires_at));
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
          access_policy: shareAccessPolicy,
          expires_at: fromCloudShareDateTimeLocalValue(shareExpiresAt),
          share_password: sharePassword,
          share_managed_ssh_key: false,
        },
      );
      setShareRecord(nextShare);
      setShareTitle(nextShare.title || shareTarget.resourceName);
      setShareNote(nextShare.note || "");
      setShareAccessPolicy(nextShare.access_policy || "public");
      setShareExpiresAt(toCloudShareDateTimeLocalValue(nextShare.expires_at));
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
      setShareAccessPolicy("public");
      setShareExpiresAt("");
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
      const passwordMode = getCreateRootPasswordMode(createForm.root_password);
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
        root_password_mode: passwordMode,
        root_password: createForm.root_password,
        auto_connect: true,
        auto_connect_group: createForm.auto_connect_group || defaultCreateGroup,
      };
      const result = await createLinodeInstance(payload);
      toast.success(t("cloud.providers.linode.create_success", "Linode instance created"));
      setCreateOpen(false);
      setCreatedPassword({
        instance: result.instance,
        rootPassword:
          passwordMode === "random"
            ? result.generated_password
            : createForm.root_password,
        passwordMode,
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
    const confirmed = await confirm({
      title: t("cloud.delete", "Delete instance"),
      description: t("cloud.providers.linode.delete_confirm", {
        name: instance.label,
        defaultValue: `Delete Linode "${instance.label}"? This action cannot be undone.`,
      }),
      confirmLabel: t("cloud.delete", "Delete"),
    });
    if (!confirmed) return;

    try {
      await deleteLinodeInstance(instance.id);
      toast.success(t("cloud.providers.linode.delete_success", "Linode instance deleted"));
      await loadPanelData();
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  };

  const ensureCreateCatalogLoaded = React.useCallback(async () => {
    if (catalog) {
      return catalog;
    }

    setCreateCatalogLoading(true);
    try {
      const nextCatalog = await getLinodeCatalog();
      setCatalog(nextCatalog);
      setError("");
      return nextCatalog;
    } catch (catalogError) {
      toast.error(toErrorMessage(catalogError));
      return null;
    } finally {
      setCreateCatalogLoading(false);
    }
  }, [catalog]);

  const handleOpenCreateDialog = async () => {
    if (!activeToken) {
      return;
    }
    setCreateForm((previous) => ({
      ...previous,
      auto_connect: true,
      auto_connect_group: defaultCreateGroup,
    }));
    const nextCatalog = await ensureCreateCatalogLoaded();
    if (!nextCatalog) {
      return;
    }
    setCreateOpen(true);
  };

  const handleRedeemPromoCode = async () => {
    const trimmedPromoCode = promoCode.trim();
    if (!trimmedPromoCode) {
      toast.error(t("cloud.providers.linode.promo_code_required", "Enter a promo code"));
      return;
    }

    setPromoSubmitting(true);
    try {
      await redeemLinodePromoCode(trimmedPromoCode);
      setPromoOpen(false);
      setPromoCode("");
      toast.success(t("cloud.providers.linode.promo_redeem_success", "Promo credit redeemed"));
      try {
        const nextAccount = await getLinodeAccount();
        setAccount(nextAccount);
        setError("");
      } catch {
        // The promo code may still be applied even if the follow-up refresh fails.
      }
    } catch (promoError) {
      toast.error(toErrorMessage(promoError));
    } finally {
      setPromoSubmitting(false);
    }
  };

  const handleLoadResources = async () => {
    if (!activeToken) {
      return;
    }
    await loadPanelData();
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
                window.location.reload();
              }}
              disabled={panelLoading || tokenChecking}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("cloud.refresh", "Refresh")}
            </Button>
            <Button
              variant="outline"
              size="1"
              onClick={() => {
                void handleLoadResources();
              }}
              disabled={!activeToken || panelLoading}
            >
              <Eye className="mr-2 h-4 w-4" />
              {t("cloud.view", "View")}
            </Button>
            <Button
              size="1"
              onClick={() => {
                void handleOpenCreateDialog();
              }}
              disabled={!activeToken}
              aria-busy={createCatalogLoading}
            >
              {createCatalogLoading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {t("cloud.providers.linode.create", "Create Instance")}
            </Button>
          </>
        }
      >
      {error ? (
        <WarningAlert tone="warning" description={error} />
      ) : null}

      {account?.restricted ? (
        <WarningAlert
          tone="destructive"
          description={t(
            "cloud.providers.linode.restricted_account_help",
            "This Linode account is currently restricted. New health checks and instance operations may continue to fail until Linode removes the restriction.",
          )}
        />
      ) : null}

      {!passwordStorageEnabled ? (
        <WarningAlert
          tone="info"
          description={t(
            "cloud.password.storage_disabled_help",
            "Set KOMARI_CLOUD_SECRET_KEY on the server to save root passwords for later viewing in the instance list.",
          )}
        />
      ) : null}

      <div className={`order-2 ${cloudPanelCardClassName}`}>
            <div className={cloudPanelHeaderClassName}>
              <div>
                <div className={cloudPanelTitleClassName}>
                  {t("cloud.providers.linode.instance_list", "Instance List")}
                </div>
                <div className={cloudPanelDescriptionClassName}>
                  {t(
                    "cloud.providers.linode.instance_list_description",
                    "Click an instance label to inspect details and use the current token to manage its power state.",
                  )}
                </div>
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
                        : error
                          ? t("cloud.load_failed", "Unable to load cloud resources. Check the warning above and try again.")
                          : !hasActiveToken(tokenPool)
                            ? t("cloud.providers.linode.no_active_token", "Select an active Linode token first")
                            : !resourcesLoaded
                              ? t("cloud.load_resources_prompt", "Click View to load cloud resources on demand.")
                              : t("cloud.providers.linode.instance_empty", "No Linode instances found")}
                    </TableCell>
                  </TableRow>
                ) : (
                  instances.map((instance) => {
                    const typeInfo = typePriceMap.get(instance.type);
                    return (
                      <TableRow key={instance.id}>
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                          <button
                            type="button"
                            className="text-left text-blue-700 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                            onClick={() => {
                              void loadInstanceDetail(instance);
                            }}
                          >
                            {instance.label}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge color={getStatusColor(instance.status)}>
                            {getCloudStatusLabel(instance.status, t)}
                          </Badge>
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
                                setScriptTarget({
                                  providerLabel: t("cloud.providers.linode.title", "Linode"),
                                  instanceName: instance.label || String(instance.id),
                                  instanceIdentifier: String(instance.id),
                                  addresses: [...instance.ipv4, instance.ipv6].filter(Boolean),
                                  groupHint: getDefaultAutoConnectGroup("linode", activeToken?.name || ""),
                                });
                              }}
                            >
                              {t("cloud.script.action", "Run Script")}
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

      <div className={`order-1 ${cloudPanelCardClassName}`}>
            <div className={cloudPanelHeaderClassName}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className={cloudPanelTitleClassName}>
                    {t("cloud.tokens.title", "Token Pool")}
                  </div>
                  <div className={cloudPanelDescriptionClassName}>
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
                    onClick={() => setPromoOpen(true)}
                    disabled={!activeToken || panelLoading || promoSubmitting || account?.restricted}
                  >
                    {promoSubmitting
                      ? t("cloud.providers.linode.promo_redeeming", "Redeeming...")
                      : t("cloud.providers.linode.redeem_promo", "Redeem Promo")}
                  </Button>
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
                  <Button
                    variant="outline"
                    size="1"
                    onClick={() => {
                      openTokenGroupEditor(selectedTokens);
                    }}
                    disabled={selectedTokens.length === 0}
                  >
                    {t("cloud.tokens.set_group", "Set Group")}
                  </Button>
                  <Button
                    variant="outline"
                    size="1"
                    color="red"
                    onClick={() => {
                      void handleDeleteSelectedTokens();
                    }}
                    disabled={selectedTokens.length === 0}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("cloud.tokens.delete_selected", {
                      count: selectedTokens.length,
                      defaultValue: "Delete selected",
                    })}
                  </Button>
                  <Button size="1" onClick={() => setTokenImportOpen(true)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {t("cloud.tokens.import", "Import Tokens")}
                  </Button>
                </Flex>
              </div>
            </div>

            <div className="max-h-[560px] overflow-auto overscroll-contain [scrollbar-gutter:stable]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={allTokensSelected || (someTokensSelected && "indeterminate")}
                          onCheckedChange={(checked) => {
                            setSelectedTokenIds(checked === true ? tokenRows.map((token) => token.id) : []);
                          }}
                          aria-label={t("cloud.tokens.select_all", "Select all tokens")}
                        />
                      </div>
                    </TableHead>
                    <TableHead>{t("cloud.tokens.table.name", "Name")}</TableHead>
                    <TableHead>{t("cloud.tokens.group", "Group")}</TableHead>
                    <TableHead>{t("cloud.tokens.table.token", "Token")}</TableHead>
                    <TableHead>{t("cloud.tokens.table.account", "Account")}</TableHead>
                    <TableHead>{t("cloud.tokens.table.status", "Status")}</TableHead>
                    <TableHead>{t("cloud.tokens.table.checked_at", "Last Checked")}</TableHead>
                    <TableHead className="text-right">{t("common.action", "Action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!tokenRows.length ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                        {t("cloud.providers.linode.tokens_empty", "No Linode tokens saved yet")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    tokenRows.map((token) => (
                      <TableRow key={token.id}>
                        <TableCell className="w-10">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={selectedTokenIds.includes(token.id)}
                              onCheckedChange={(checked) => {
                                toggleTokenSelection(token.id, Boolean(checked));
                              }}
                              aria-label={t("cloud.tokens.select_one", {
                                name: token.name,
                                defaultValue: `Select token ${token.name}`,
                              })}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="max-w-44 truncate">{token.name}</span>
                            {token.is_active ? (
                              <Badge color="blue">{t("cloud.tokens.active", "Active")}</Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{token.group || "-"}</TableCell>
                        <TableCell className="max-w-44 truncate font-mono text-xs text-slate-600">
                          {token.masked_token || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-900 dark:text-slate-100">
                            {token.profile_email || token.profile_username || "-"}
                          </div>
                          {token.last_status === "healthy" ? (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {t("cloud.providers.linode.balance", "Balance")}
                              : {" "}
                              {formatUsdCurrency(token.account_balance)}
                            </div>
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
                            <div
                              className="mt-1 max-w-64 truncate text-xs text-red-600"
                              title={token.last_error}
                            >
                              {getLinodeStatusSummary(token.last_error, t)}
                            </div>
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
                                });
                              }}
                            >
                              <Server className="mr-1 h-3.5 w-3.5" />
                              {t("cloud.providers.linode.view_instances", "View Instances")}
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

      <Dialog.Root open={tokenImportOpen} onOpenChange={setTokenImportOpen}>
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{t("cloud.tokens.import_dialog_title", "Batch Import Tokens")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.tokens.import_dialog_description",
              "One line per token. Supported formats: name,token ; name|token ; or token only.",
            )}
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-4">
            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.tokens.group", "Group")}
            </label>
            <TextField.Root
              value={tokenImportGroup}
              placeholder={t("cloud.tokens.group_placeholder", "Optional token group")}
              onChange={(event) => setTokenImportGroup(event.target.value)}
            />
            {existingTokenGroups.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {existingTokenGroups.map((group) => (
                  <Button
                    key={group}
                    variant={tokenImportGroup.trim() === group ? "solid" : "outline"}
                    size="1"
                    type="button"
                    onClick={() => setTokenImportGroup(group)}
                  >
                    {group}
                  </Button>
                ))}
              </div>
            ) : null}
            <TextArea
              className="min-h-40 font-mono text-xs [overflow-wrap:anywhere]"
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

      <Dialog.Root open={tokenGroupEditorOpen} onOpenChange={setTokenGroupEditorOpen}>
        <Dialog.Content className={cloudDialogContentClassName}>
          <Dialog.Title>{t("cloud.tokens.set_group", "Set Group")}</Dialog.Title>
          <Dialog.Description>
            {t("cloud.tokens.set_group_description", {
              count: tokenGroupEditorIds.length,
              defaultValue: `Update the group for ${tokenGroupEditorIds.length} selected token(s). Leave empty to remove the group.`,
            })}
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-4">
            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.tokens.group", "Group")}
            </label>
            <TextField.Root
              value={tokenGroupEditorValue}
              placeholder={t("cloud.tokens.group_placeholder", "Optional token group")}
              onChange={(event) => setTokenGroupEditorValue(event.target.value)}
            />
            {existingTokenGroups.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {existingTokenGroups.map((group) => (
                  <Button
                    key={group}
                    variant={tokenGroupEditorValue.trim() === group ? "solid" : "outline"}
                    size="1"
                    type="button"
                    onClick={() => setTokenGroupEditorValue(group)}
                  >
                    {group}
                  </Button>
                ))}
              </div>
            ) : null}
            <Flex justify="end" gap="2">
              <Button
                variant="outline"
                onClick={() => setTokenGroupEditorOpen(false)}
                disabled={tokenSaving}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button onClick={() => { void handleSaveTokenGroup(); }} disabled={tokenSaving}>
                {tokenSaving ? t("common.saving", "Saving...") : t("common.save", "Save")}
              </Button>
            </Flex>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{t("cloud.providers.linode.create", "Create Instance")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.linode.create_description",
              "Choose the region, plan, image, and root password mode for the new Linode instance.",
            )}
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-4">
            <label className={cloudPanelFieldLabelClassName}>
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

            <label className={cloudPanelFieldLabelClassName}>
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

            <label className={cloudPanelFieldLabelClassName}>
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

            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.form.root_password", "Root Password")}
            </label>
            <TextField.Root
              type="password"
              value={createForm.root_password}
              placeholder={t("cloud.form.root_password_placeholder", "Enter a root password")}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, root_password: event.target.value }))}
            />
            <WarningAlert
              tone="info"
              description={t(
                "cloud.providers.linode.root_access_help",
                "Linode can create the instance directly with a root password. SSH keys are optional and only add extra login methods.",
              )}
            />
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              {t(
                "cloud.form.root_password_random_help",
                "A random root password will be generated on the server and shown once after creation succeeds.",
              )}
            </div>

            <div className={cloudPanelSectionClassName}>
              <div className={cloudPanelFieldLabelClassName}>
                {t("cloud.form.options", "Options")}
              </div>
              <div className="mt-3 flex flex-col gap-3">
                <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
                  <Checkbox
                    checked={createForm.backups_enabled}
                    onCheckedChange={(checked) => setCreateForm((previous) => ({ ...previous, backups_enabled: Boolean(checked) }))}
                  />
                  {t("cloud.form.backups", "Enable backups")}
                </label>
                <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
                  <Checkbox
                    checked={createForm.booted}
                    onCheckedChange={(checked) => setCreateForm((previous) => ({ ...previous, booted: Boolean(checked) }))}
                  />
                  {t("cloud.providers.linode.booted", "Boot after creation")}
                </label>
              </div>
            </div>

            <div className={cloudPanelSubcardClassName}>
              <div className={cloudPanelFieldLabelClassName}>
                {t("cloud.providers.linode.ssh_keys_optional", "SSH Keys (Optional)")}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t(
                  "cloud.providers.linode.ssh_keys_optional_description",
                  "You can leave this empty. The selected keys are only attached as additional login methods.",
                )}
              </div>
              <div className="mt-3 flex max-h-48 flex-col gap-2 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
                {(catalog?.ssh_keys || []).length ? (
                  catalog!.ssh_keys.map((sshKey) => {
                    const checked = createForm.authorized_keys.includes(sshKey.ssh_key);
                    return (
                      <label
                        key={sshKey.label}
                        className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300"
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
                          <span className="block font-medium text-slate-900 dark:text-slate-100">{sshKey.label}</span>
                          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{sshKey.ssh_key}</span>
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <div className="text-sm text-slate-500 dark:text-slate-400">
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
                  !createForm.region ||
                  !createForm.type ||
                  !createForm.image
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
        open={promoOpen}
        onOpenChange={(open) => {
          setPromoOpen(open);
          if (!open && !promoSubmitting) {
            setPromoCode("");
          }
        }}
      >
        <Dialog.Content className={cloudDialogContentClassName}>
          <Dialog.Title>{t("cloud.providers.linode.redeem_promo", "Redeem Promo")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.linode.promo_dialog_description",
              "Submit a Linode promo code for the current active account. Linode may reject codes when the account does not meet their eligibility rules.",
            )}
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-4">
            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.providers.linode.promo_code", "Promo Code")}
            </label>
            <TextField.Root
              value={promoCode}
              placeholder={t("cloud.providers.linode.promo_code_placeholder", "Enter a Linode promo code")}
              onChange={(event) => setPromoCode(event.target.value)}
              disabled={promoSubmitting}
            />
            <Flex justify="end" gap="2">
              <Button variant="outline" onClick={() => setPromoOpen(false)} disabled={promoSubmitting}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                onClick={() => {
                  void handleRedeemPromoCode();
                }}
                disabled={promoSubmitting || !promoCode.trim()}
              >
                {promoSubmitting
                  ? t("cloud.providers.linode.promo_redeeming", "Redeeming...")
                  : t("cloud.providers.linode.redeem_promo", "Redeem Promo")}
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
          <Dialog.Title>
            {detailInstance?.label || t("cloud.providers.linode.detail_title", "Linode Details")}
          </Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.providers.linode.detail_description",
              "View the selected Linode instance details from the current active token.",
            )}
          </Dialog.Description>

          {detailLoading ? (
            <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t("cloud.loading", "Loading cloud resources...")}</div>
          ) : detailData ? (
            <div className="mt-4 flex flex-col gap-4">
              <section className="pt-0">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  {t("cloud.detail.summary", "Summary")}
                </div>
                <div className="mt-2 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
                  <DetailItem
                    variant="plain"
                    label={t("cloud.providers.linode.instance_id", "Linode ID")}
                    value={detailData.instance.id}
                  />
                  <DetailItem
                    variant="plain"
                    label={t("cloud.table.status", "Status")}
                    value={getCloudStatusLabel(detailData.instance.status, t)}
                  />
                  <DetailItem variant="plain" label={t("cloud.table.region", "Region")} value={detailData.instance.region || "-"} />
                  <DetailItem variant="plain" label={t("cloud.table.ip", "Public IP")} value={detailData.instance.ipv4[0] || detailData.instance.ipv6 || "-"} />
                  <DetailItem variant="plain" label={t("cloud.table.size", "Size")} value={detailData.instance.type || "-"} />
                  <DetailItem variant="plain" label={t("cloud.table.image", "Image")} value={detailData.instance.image || "-"} />
                  <DetailItem variant="plain" label={t("cloud.table.created_at", "Created")} value={formatDateTime(detailData.instance.created)} />
                  <DetailItem variant="plain" label={t("cloud.detail.memory", "Memory")} value={`${detailData.instance.specs.memory} MB`} />
                  <DetailItem variant="plain" label={t("cloud.detail.vcpus", "vCPUs")} value={detailData.instance.specs.vcpus} />
                  <DetailItem variant="plain" label={t("cloud.detail.disk", "Disk")} value={`${detailData.instance.specs.disk} GB`} />
                  <DetailItem variant="plain" label={t("cloud.detail.tags", "Tags")} value={formatList(detailData.instance.tags)} />
                  <DetailItem
                    variant="plain"
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
              </section>

              <section className={cloudDetailSectionClassName}>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  {t("cloud.providers.linode.disks", "Disks")}
                </div>
                {detailData.disks.length ? (
                  <div className={`mt-2 ${cloudDetailListClassName}`}>
                    {detailData.disks.map((disk: LinodeDisk) => (
                      <div key={disk.id} className={cloudDetailListItemClassName}>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{disk.label || `Disk ${disk.id}`}</div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {disk.size} MB / {disk.filesystem || "-"} / {disk.status || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">-</div>
                )}
              </section>

              <section className={cloudDetailSectionClassName}>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  {t("cloud.providers.linode.configs", "Configs")}
                </div>
                {detailData.configs.length ? (
                  <div className={`mt-2 ${cloudDetailListClassName}`}>
                    {detailData.configs.map((config: LinodeConfig) => (
                      <div key={config.id} className={cloudDetailListItemClassName}>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{config.label || `Config ${config.id}`}</div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {config.kernel || "-"} / {config.root_device || "-"} / {config.run_level || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">-</div>
                )}
              </section>

              <section className={cloudDetailSectionClassName}>
                <Flex justify="between" align="center" wrap="wrap" gap="2">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    {t("cloud.providers.linode.backups", "Backups")}
                  </div>
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
                {detailData.backups ? (
                  <div className="mt-2 grid gap-x-6 sm:grid-cols-2">
                    <DetailItem
                      variant="plain"
                      label={t("cloud.form.backups", "Enable backups")}
                      value={detailData.backups.enabled ? t("common.yes", "Yes") : t("common.no", "No")}
                    />
                    <DetailItem
                      variant="plain"
                      label={t("cloud.providers.linode.last_successful", "Last Successful")}
                      value={formatDateTime(detailData.backups.last_successful)}
                    />
                    <DetailItem
                      variant="plain"
                      label={t("cloud.providers.linode.backup_schedule", "Schedule")}
                      value={`${detailData.backups.schedule.day || "-"} / ${detailData.backups.schedule.window || "-"}`}
                    />
                    <DetailItem
                      variant="plain"
                      label={t("cloud.providers.linode.backup_automatic", "Automatic")}
                      value={detailData.backups.automatic.length}
                    />
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">-</div>
                )}
              </section>

              <section className={cloudDetailSectionClassName}>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
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

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
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
              </section>

              <section className={cloudDetailSectionClassName}>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  {t("cloud.providers.linode.rebuild", "Rebuild")}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
              </section>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={Boolean(tokenSecret)} onOpenChange={(open) => !open && setTokenSecret(null)}>
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
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
              <CloudCopyBlock
                title={t("cloud.tokens.full_token", "Full Token")}
                copyLabel={t("copy", "Copy")}
                onCopy={() => { void copyText(tokenSecret.secret.token); }}
              >
                <TextArea
                  className={cloudSecretTextareaClassName}
                  readOnly
                  value={tokenSecret.secret.token}
                />
              </CloudCopyBlock>
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
            setShareAccessPolicy("public");
            setShareExpiresAt("");
          }
        }}
        target={shareTarget}
        share={shareRecord}
        loading={shareLoading}
        saving={shareSaving}
        deleting={shareDeleting}
        title={shareTitle}
        note={shareNote}
        accessPolicy={shareAccessPolicy}
        expiresAt={shareExpiresAt}
        sharePassword={sharePassword}
        shareManagedSSHKey={false}
        shareUrl={shareRecord?.token ? buildCloudInstanceShareUrl(shareRecord.token) : ""}
        onTitleChange={setShareTitle}
        onNoteChange={setShareNote}
        onAccessPolicyChange={setShareAccessPolicy}
        onExpiresAtChange={setShareExpiresAt}
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

      <CloudInstanceScriptDialog
        open={Boolean(scriptTarget)}
        target={scriptTarget}
        onOpenChange={(open) => {
          if (open) return;
          setScriptTarget(null);
        }}
      />

      <Dialog.Root open={Boolean(savedPassword)} onOpenChange={(open) => !open && setSavedPassword(null)}>
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
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
              <CloudCopyBlock
                title={t("cloud.form.root_password", "Root Password")}
                copyLabel={t("copy", "Copy")}
                onCopy={() => { void copyText(savedPassword.credential.root_password); }}
              >
                <TextArea
                  className={cloudSecretTextareaClassName}
                  readOnly
                  value={savedPassword.credential.root_password}
                />
              </CloudCopyBlock>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={Boolean(createdPassword)} onOpenChange={(open) => !open && setCreatedPassword(null)}>
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
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
              <CloudCopyBlock
                title={t("cloud.form.root_password", "Root Password")}
                copyLabel={t("copy", "Copy")}
                onCopy={() => { void copyText(createdPassword.rootPassword); }}
              >
                <TextArea
                  className={cloudSecretTextareaClassName}
                  readOnly
                  value={createdPassword.rootPassword}
                />
              </CloudCopyBlock>
              <div className={`rounded-xl px-4 py-3 text-sm ${createdPassword.passwordSaved ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300" : "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"}`}>
                <div className={cloudLongTextClassName}>
                  {createdPassword.passwordSaved
                    ? t("cloud.password.create_saved", "This root password has been encrypted and saved. You can reopen it later from the instance list.")
                    : createdPassword.passwordSaveError
                      ? t("cloud.password.create_unsaved_reason", {
                          reason: createdPassword.passwordSaveError,
                          defaultValue: `Password save failed: ${createdPassword.passwordSaveError}`,
                        })
                      : t("cloud.password.create_unsaved", "This root password was not saved on the server. Save it now if you still need it later.")}
                </div>
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Root>
      {dialog}
    </AdminPageShell>
  );
}

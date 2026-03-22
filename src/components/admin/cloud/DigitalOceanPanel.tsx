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
  cloudPanelBodyTextClassName,
  cloudPanelCardClassName,
  cloudPanelDescriptionClassName,
  cloudDialogContentClassName,
  cloudPanelFieldLabelClassName,
  cloudPanelHeaderClassName,
  cloudPanelSectionClassName,
  cloudPanelTitleClassName,
  cloudLongTextClassName,
  cloudSecretTextareaClassName,
  cloudTallSecretTextareaClassName,
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
  checkDigitalOceanTokens,
  createDigitalOceanDroplet,
  deleteDigitalOceanDroplet,
  deleteDigitalOceanToken,
  getDigitalOceanAccount,
  getDigitalOceanCatalog,
  getDigitalOceanDropletPassword,
  getDigitalOceanManagedSSHKey,
  getDigitalOceanTokenSecret,
  getDigitalOceanTokens,
  listDigitalOceanDroplets,
  postDigitalOceanDropletAction,
  saveDigitalOceanTokens,
  setDigitalOceanActiveToken,
  type CreateDigitalOceanDropletInput,
  type DigitalOceanAccount,
  type DigitalOceanCatalog,
  type DigitalOceanDroplet,
  type DigitalOceanDropletPassword,
  type DigitalOceanImage,
  type DigitalOceanManagedSSHKeyMaterial,
  type DigitalOceanTokenSecret,
  type DigitalOceanTokenInput,
  type DigitalOceanTokenPool,
  type DigitalOceanTokenRecord,
} from "@/lib/cloud";
import { getCloudStatusLabel } from "@/lib/cloudStatus";
import {
  buildCloudInstanceShareUrl,
  deleteCloudInstanceShare,
  getCloudInstanceShare,
  saveCloudInstanceShare,
  type CloudInstanceShareRecord,
} from "@/lib/cloudShare";

type CreateDropletFormState = Omit<CreateDigitalOceanDropletInput, "tags"> & {
  tagsText: string;
};

type DropletAccessSecrets = {
  droplet: DigitalOceanDroplet;
  rootPassword: string;
  passwordMode: "custom" | "random";
  managedSSHKey: DigitalOceanManagedSSHKeyMaterial | null;
  passwordSaved: boolean;
  passwordSaveError: string;
};

type SavedDropletPasswordState = {
  droplet: DigitalOceanDroplet;
  credential: DigitalOceanDropletPassword;
};

type TokenSecretState = {
  secret: DigitalOceanTokenSecret;
};

const initialCreateForm: CreateDropletFormState = {
  name: "",
  region: "",
  size: "",
  image: "",
  backups: false,
  ipv6: true,
  monitoring: true,
  user_data: "",
  vpc_uuid: "",
  root_password_mode: "random",
  root_password: "",
  auto_connect: true,
  auto_connect_group: "",
  tagsText: "",
};

const DIGITALOCEAN_REGION_COUNTRIES: Record<string, string> = {
  ams: "nl",
  atl: "us",
  blr: "in",
  fra: "de",
  lon: "gb",
  nyc: "us",
  sfo: "us",
  sgp: "sg",
  syd: "au",
  tor: "ca",
};

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

function hasActiveToken(pool: DigitalOceanTokenPool | null) {
  return Boolean(pool?.active_token_id);
}

function parseTags(tagsText: string) {
  return tagsText
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getDropletPrimaryIp(droplet: DigitalOceanDroplet) {
  const ipv4 = droplet.networks.v4.find((network) => network.type === "public");
  if (ipv4?.ip_address) return ipv4.ip_address;
  const ipv6 = droplet.networks.v6.find((network) => network.type === "public");
  return ipv6?.ip_address || "-";
}

function getDropletMatchAddresses(droplet: DigitalOceanDroplet) {
  return [
    ...droplet.networks.v4
      .filter((network) => network.type === "public")
      .map((network) => network.ip_address),
    ...droplet.networks.v6
      .filter((network) => network.type === "public")
      .map((network) => network.ip_address),
  ].filter(Boolean);
}

function getDropletStatusColor(status: string) {
  switch (status) {
    case "active":
      return "green";
    case "off":
      return "amber";
    case "new":
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

function isDigitalOceanLockedMessage(message: string) {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return false;

  return (
    normalized.includes("lock on the account")
    || normalized.includes("contact support")
    || normalized.includes("team has been locked")
    || normalized.includes("lack of payment")
    || normalized.includes("open a ticket")
    || normalized.includes("improper use")
    || normalized === "digitalocean account is locked"
  );
}

function getDigitalOceanStatusSummary(
  status: string,
  message: string,
  t: ReturnType<typeof useTranslation>["t"],
) {
  const normalizedStatus = status.trim().toLowerCase();
  const normalizedMessage = message.trim();
  if (!normalizedMessage && normalizedStatus !== "locked") {
    return "";
  }
  if (normalizedStatus === "locked" || isDigitalOceanLockedMessage(normalizedMessage)) {
    return t("cloud.password.locked", "Locked");
  }
  return normalizedMessage;
}

function hasSharedManagedSSHKey(tokens: DigitalOceanTokenRecord[]) {
  return tokens.some((token) => token.managed_ssh_key_ready);
}

function formatMonthlyPrice(droplet: DigitalOceanDroplet) {
  const monthly = droplet.size?.price_monthly ?? 0;
  return `$${monthly.toFixed(2)}`;
}

function getImageValue(image: DigitalOceanImage) {
  return image.slug || String(image.id);
}

function getImageLabel(image: DigitalOceanImage) {
  const distro = image.distribution?.trim();
  const name = image.name?.trim();
  if (distro && name) return `${distro} / ${name}`;
  return name || distro || image.slug || String(image.id);
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

function getRegionPrefix(slug: string) {
  return slug.toLowerCase().replace(/[0-9]+$/, "");
}

function getRegionCountryLabel(slug: string, t: ReturnType<typeof useTranslation>["t"]) {
  const countryCode = DIGITALOCEAN_REGION_COUNTRIES[getRegionPrefix(slug)];
  if (!countryCode) return "";
  return t(`cloud.region_countries.${countryCode}`, countryCode.toUpperCase());
}

function getRegionOptionLabel(
  region: { slug: string; name: string } | null | undefined,
  t: ReturnType<typeof useTranslation>["t"],
) {
  if (!region?.slug) return region?.name || "-";
  const country = getRegionCountryLabel(region.slug, t);
  if (!country) return `${region.slug} / ${region.name}`;
  return `${region.slug} (${country}) / ${region.name}`;
}

function findImportSeparator(line: string) {
  for (const separator of ["|", ",", "\t", ":"]) {
    if (line.includes(separator)) {
      return separator;
    }
  }
  return "";
}

function parseTokenImports(text: string): DigitalOceanTokenInput[] {
  const lines = text.split(/\r?\n/);
  const tokens: DigitalOceanTokenInput[] = [];
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

function getActiveToken(pool: DigitalOceanTokenPool | null) {
  return pool?.tokens.find((token) => token.id === pool.active_token_id) || null;
}

function getDefaultAutoConnectGroup(provider: string, credentialName: string) {
  const normalizedProvider = provider.trim().toLowerCase() || "cloud";
  const normalizedCredentialName = credentialName.trim() || "default";
  return `${normalizedProvider}/${normalizedCredentialName}`;
}

const DetailItem = CloudDetailItem;

export default function DigitalOceanPanel() {
  const { t } = useTranslation();
  const { confirm, dialog } = useWarningDialog();

  const [initializing, setInitializing] = React.useState(true);
  const [panelLoading, setPanelLoading] = React.useState(false);
  const [tokenSaving, setTokenSaving] = React.useState(false);
  const [tokenChecking, setTokenChecking] = React.useState(false);
  const [tokenImportOpen, setTokenImportOpen] = React.useState(false);
  const [tokenImportText, setTokenImportText] = React.useState("");
  const [tokenPool, setTokenPool] = React.useState<DigitalOceanTokenPool | null>(null);
  const [selectedTokenIds, setSelectedTokenIds] = React.useState<string[]>([]);
  const [account, setAccount] = React.useState<DigitalOceanAccount | null>(null);
  const [catalog, setCatalog] = React.useState<DigitalOceanCatalog | null>(null);
  const [droplets, setDroplets] = React.useState<DigitalOceanDroplet[]>([]);
  const [detailDroplet, setDetailDroplet] = React.useState<DigitalOceanDroplet | null>(null);
  const [managedKeyMaterial, setManagedKeyMaterial] =
    React.useState<DigitalOceanManagedSSHKeyMaterial | null>(null);
  const [managedKeyLoading, setManagedKeyLoading] = React.useState(false);
  const [tokenSecret, setTokenSecret] = React.useState<TokenSecretState | null>(null);
  const [tokenSecretLoading, setTokenSecretLoading] = React.useState(false);
  const [accessSecrets, setAccessSecrets] = React.useState<DropletAccessSecrets | null>(null);
  const [savedDropletPassword, setSavedDropletPassword] =
    React.useState<SavedDropletPasswordState | null>(null);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareTarget, setShareTarget] = React.useState<CloudInstanceShareTarget | null>(null);
  const [scriptTarget, setScriptTarget] = React.useState<CloudInstanceScriptTarget | null>(null);
  const [shareRecord, setShareRecord] = React.useState<CloudInstanceShareRecord | null>(null);
  const [shareLoading, setShareLoading] = React.useState(false);
  const [shareSaving, setShareSaving] = React.useState(false);
  const [shareDeleting, setShareDeleting] = React.useState(false);
  const [shareTitle, setShareTitle] = React.useState("");
  const [shareNote, setShareNote] = React.useState("");
  const [sharePassword, setSharePassword] = React.useState(false);
  const [shareManagedSSHKey, setShareManagedSSHKey] = React.useState(false);
  const [dropletPasswordLoading, setDropletPasswordLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createSubmitting, setCreateSubmitting] = React.useState(false);
  const [createForm, setCreateForm] =
    React.useState<CreateDropletFormState>(initialCreateForm);

  const clearPanelState = React.useCallback(() => {
    setAccount(null);
    setCatalog(null);
    setDroplets([]);
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
    const nextPool = await getDigitalOceanTokens();
    setTokenPool(nextPool);
    return nextPool;
  }, []);

  const loadPanelData = React.useCallback(async () => {
    setPanelLoading(true);
    try {
      const [nextAccount, nextCatalog, nextDroplets] = await Promise.all([
        getDigitalOceanAccount(),
        getDigitalOceanCatalog(),
        listDigitalOceanDroplets(),
      ]);
      setAccount(nextAccount);
      setCatalog(nextCatalog);
      setDroplets(nextDroplets);
      setError("");
    } catch (panelError) {
      setAccount(null);
      setCatalog(null);
      setDroplets([]);
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
        const nextPool = await getDigitalOceanTokens();
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
      region:
        previous.region ||
        catalog.regions.find((region) => region.available)?.slug ||
        catalog.regions[0]?.slug ||
        "",
      size:
        previous.size ||
        catalog.sizes.find((size) => size.available)?.slug ||
        catalog.sizes[0]?.slug ||
        "",
      image:
        previous.image ||
        (catalog.images[0] ? getImageValue(catalog.images[0]) : "") ||
        "",
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

  if (initializing) {
    return <Loading text="" />;
  }

  const activeToken = getActiveToken(tokenPool);
  const defaultCreateGroup = getDefaultAutoConnectGroup("digitalocean", activeToken?.name || "");
  const connected = Boolean(account && activeToken);
  const passwordStorageEnabled = Boolean(tokenPool?.password_storage_enabled);
  const tokenRows = tokenPool?.tokens ?? [];
  const selectedTokens = tokenRows.filter((token) => selectedTokenIds.includes(token.id));
  const allTokensSelected = tokenRows.length > 0 && selectedTokenIds.length === tokenRows.length;
  const someTokensSelected = selectedTokenIds.length > 0 && selectedTokenIds.length < tokenRows.length;
  const sharedManagedKeyReady = hasSharedManagedSSHKey(tokenRows);
  const accountStatusSummary = getDigitalOceanStatusSummary(
    account?.status || "",
    account?.status_message || "",
    t,
  );

  const assertTokensDeleted = (nextPool: DigitalOceanTokenPool, tokenIds: string[]) => {
    const remaining = nextPool.tokens.filter((token) => tokenIds.includes(token.id));
    if (remaining.length > 0) {
      throw new Error(
        t("cloud.tokens.delete_not_applied", {
          defaultValue: "Delete request returned success, but the token still exists. Refresh and try again.",
        }),
      );
    }
  };

  const syncTokenPoolAfterDelete = async (
    nextPool: DigitalOceanTokenPool,
    removedTokenIds: string[],
  ) => {
    setTokenPool(nextPool);
    setSelectedTokenIds((current) => current.filter((id) => !removedTokenIds.includes(id)));
    if (hasActiveToken(nextPool)) {
      await loadPanelData();
    } else {
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

  const handleImportTokens = async () => {
    const tokens = parseTokenImports(tokenImportText);
    if (!tokens.length) {
      toast.error(t("cloud.tokens.import_empty", "No valid tokens found"));
      return;
    }

    setTokenSaving(true);
    try {
      const nextPool = await saveDigitalOceanTokens({
        tokens,
        active_token_id: tokenPool?.active_token_id || undefined,
      });
      setTokenPool(nextPool);
      setTokenImportText("");
      setTokenImportOpen(false);
      toast.success(
        t("cloud.tokens.import_success", { count: tokens.length, defaultValue: `Imported ${tokens.length} tokens` }),
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
      const nextPool = await checkDigitalOceanTokens();
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

  const handleSelectToken = async (token: DigitalOceanTokenRecord, options?: { loadResources?: boolean }) => {
    try {
      const nextPool = await setDigitalOceanActiveToken(token.id);
      setTokenPool(nextPool);
      toast.success(
        t("cloud.tokens.active_success", {
          name: token.name,
          defaultValue: `Using token ${token.name}`,
        }),
      );
      if (options?.loadResources) {
        await loadPanelData();
      }
    } catch (selectError) {
      toast.error(toErrorMessage(selectError));
    }
  };

  const handleDeleteToken = async (token: DigitalOceanTokenRecord) => {
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
      const nextPool = await deleteDigitalOceanToken(token.id);
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

    let latestPool: DigitalOceanTokenPool | null = null;
    const removedIds: string[] = [];
    const failedIds: string[] = [];
    const failures: string[] = [];

    for (const token of selectedTokens) {
      try {
        const nextPool = await deleteDigitalOceanToken(token.id);
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

  const handleViewManagedKey = async (token: DigitalOceanTokenRecord) => {
    setManagedKeyLoading(true);
    try {
      const material = await getDigitalOceanManagedSSHKey(token.id);
      setManagedKeyMaterial(material);
    } catch (viewError) {
      toast.error(toErrorMessage(viewError));
    } finally {
      setManagedKeyLoading(false);
    }
  };

  const handleOpenDropletsForToken = async (token: DigitalOceanTokenRecord) => {
    await handleSelectToken(token, {
      loadResources: true,
    });
  };

  const handleViewTokenSecret = async (token: DigitalOceanTokenRecord) => {
    setTokenSecretLoading(true);
    try {
      const secret = await getDigitalOceanTokenSecret(token.id);
      setTokenSecret({ secret });
    } catch (viewError) {
      toast.error(toErrorMessage(viewError));
    } finally {
      setTokenSecretLoading(false);
    }
  };

  const handleViewDropletPassword = async (droplet: DigitalOceanDroplet) => {
    setDropletPasswordLoading(true);
    try {
      const credential = await getDigitalOceanDropletPassword(droplet.id);
      setSavedDropletPassword({ droplet, credential });
    } catch (viewError) {
      toast.error(toErrorMessage(viewError));
    } finally {
      setDropletPasswordLoading(false);
    }
  };

  const handleOpenShareDialog = async (droplet: DigitalOceanDroplet) => {
    const nextTarget: CloudInstanceShareTarget = {
      provider: "digitalocean",
      resourceType: "droplet",
      resourceId: String(droplet.id),
      resourceName: droplet.name || String(droplet.id),
      providerLabel: t("cloud.providers.digitalocean.title", "DigitalOcean"),
      credentialName: activeToken?.name || activeToken?.account_email || "",
      region: getRegionOptionLabel(droplet.region, t),
      primaryAddress: getDropletPrimaryIp(droplet),
      canSharePassword: Boolean(droplet.saved_root_password),
      canShareManagedSSHKey: Boolean(activeToken?.managed_ssh_key_ready),
    };

    setShareTarget(nextTarget);
    setShareRecord(null);
    setShareTitle(droplet.name || "");
    setShareNote("");
    setSharePassword(false);
    setShareManagedSSHKey(false);
    setShareOpen(true);
    setShareLoading(true);

    try {
      const nextShare = await getCloudInstanceShare("digitalocean", "droplet", String(droplet.id));
      setShareRecord(nextShare.token ? nextShare : null);
      setShareTitle(nextShare.title || droplet.name || "");
      setShareNote(nextShare.note || "");
      setSharePassword(Boolean(nextShare.share_password && nextTarget.canSharePassword));
      setShareManagedSSHKey(Boolean(nextShare.share_managed_ssh_key && nextTarget.canShareManagedSSHKey));
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
          share_managed_ssh_key: shareManagedSSHKey,
        },
      );
      setShareRecord(nextShare);
      setShareTitle(nextShare.title || shareTarget.resourceName);
      setShareNote(nextShare.note || "");
      setSharePassword(Boolean(nextShare.share_password));
      setShareManagedSSHKey(Boolean(nextShare.share_managed_ssh_key));
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
      setSharePassword(false);
      setShareManagedSSHKey(false);
      toast.success(t("cloud.share.delete_success", "Share link revoked"));
    } catch (shareError) {
      toast.error(toErrorMessage(shareError));
    } finally {
      setShareDeleting(false);
    }
  };

  const handleCreateDroplet = async () => {
    setCreateSubmitting(true);
    try {
      const passwordMode = createForm.root_password_mode;
      const payload: CreateDigitalOceanDropletInput = {
        name: createForm.name,
        region: createForm.region,
        size: createForm.size,
        image: createForm.image,
        backups: createForm.backups,
        ipv6: createForm.ipv6,
        monitoring: createForm.monitoring,
        tags: parseTags(createForm.tagsText),
        user_data: createForm.user_data,
        vpc_uuid: createForm.vpc_uuid,
        root_password_mode: passwordMode,
        root_password: createForm.root_password,
        auto_connect: createForm.auto_connect,
        auto_connect_group: createForm.auto_connect_group,
      };

      const result = await createDigitalOceanDroplet(payload);
      toast.success(
        t("cloud.create_success", "Droplet creation request submitted"),
      );
      setCreateOpen(false);
      const rootPassword =
        passwordMode === "random" ? result.generated_password : createForm.root_password;
      setAccessSecrets({
        droplet: result.droplet,
        rootPassword,
        passwordMode,
        managedSSHKey: result.managed_ssh_key,
        passwordSaved: result.password_saved,
        passwordSaveError: result.password_save_error,
      });
      if (result.password_save_error) {
        toast.error(result.password_save_error);
      }
      setCreateForm((previous) => ({
        ...initialCreateForm,
        region: previous.region,
        size: previous.size,
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

  const handleDropletAction = async (dropletId: number, type: string) => {
    try {
      await postDigitalOceanDropletAction(dropletId, type);
      toast.success(
        t("cloud.action_success", "Operation submitted"),
      );
      await loadPanelData();
    } catch (actionError) {
      toast.error(toErrorMessage(actionError));
    }
  };

  const handleDeleteDroplet = async (droplet: DigitalOceanDroplet) => {
    const confirmed = await confirm({
      title: t("cloud.delete", "Delete instance"),
      description: t("cloud.delete_confirm", {
        name: droplet.name,
        defaultValue: `Delete droplet "${droplet.name}"? This action cannot be undone.`,
      }),
      confirmLabel: t("cloud.delete", "Delete"),
    });
    if (!confirmed) return;

    try {
      await deleteDigitalOceanDroplet(droplet.id);
      toast.success(
        t("cloud.delete_success", "Droplet deleted"),
      );
      await loadPanelData();
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  };

  const regions = catalog?.regions ?? [];
  const sizes = catalog?.sizes ?? [];
  const images = catalog?.images ?? [];

  const handleOpenCreateDialog = () => {
    setCreateForm((previous) => ({
      ...previous,
      auto_connect: true,
      auto_connect_group: defaultCreateGroup,
    }));
    setCreateOpen(true);
  };

  return (
    <>
      <AdminPageShell
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
            <Button
              size="1"
              onClick={handleOpenCreateDialog}
              disabled={!connected || !catalog}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("cloud.create", "Create Droplet")}
            </Button>
          </>
        }
      >
      {error ? (
        <WarningAlert tone="warning" description={error} />
      ) : null}

      {accountStatusSummary ? (
        <WarningAlert
          tone="warning"
          description={
            <span title={account?.status_message || accountStatusSummary}>
              {t(
                "cloud.providers.digitalocean.locked_account_help",
                "This DigitalOcean account is locked. Health checks and Droplet operations may continue to fail.",
              )}
            </span>
          }
        />
      ) : null}

      {tokenPool && !passwordStorageEnabled ? (
        <WarningAlert
          tone="info"
          description={t(
            "cloud.password.storage_disabled_help",
            "Set KOMARI_CLOUD_SECRET_KEY on the server to save root passwords for later viewing in the Droplet list.",
          )}
        />
      ) : null}

      {sharedManagedKeyReady ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {t(
            "cloud.tokens.shared_managed_key_help",
            "Komari now reuses one shared managed SSH key across DigitalOcean credentials. Each DigitalOcean account registers the same public key on first use, so every credential can launch Droplets without generating a separate fallback key.",
          )}
        </div>
      ) : null}

      <div className={`order-2 ${cloudPanelCardClassName}`}>
            <div className={cloudPanelHeaderClassName}>
              <div>
                <div className={cloudPanelTitleClassName}>
                  {t("cloud.droplet_list", "Droplet List")}
                </div>
                <div className={cloudPanelDescriptionClassName}>
                  {t(
                    "cloud.droplet_list_description",
                    "Click a Droplet name to view details, and use the current active token to perform lifecycle actions.",
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
                  <TableHead className="text-right">
                    {t("common.action", "Action")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {droplets.length === 0 ? (
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
                  droplets.map((droplet) => (
                    <TableRow key={droplet.id}>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                        <button
                          type="button"
                          className="text-left text-blue-700 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                          onClick={() => setDetailDroplet(droplet)}
                        >
                          {droplet.name}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge color={getDropletStatusColor(droplet.status)}>
                          {getCloudStatusLabel(droplet.status, t)}
                        </Badge>
                      </TableCell>
                      <TableCell>{getRegionOptionLabel(droplet.region, t)}</TableCell>
                      <TableCell>{getDropletPrimaryIp(droplet)}</TableCell>
                      <TableCell>{droplet.size_slug || droplet.size?.slug || "-"}</TableCell>
                      <TableCell>{getImageLabel(droplet.image)}</TableCell>
                      <TableCell>{formatMonthlyPrice(droplet)}</TableCell>
                      <TableCell>
                        {droplet.saved_root_password ? (
                          <div className="space-y-1">
                            <Badge color={passwordStorageEnabled ? "green" : "amber"}>
                              {passwordStorageEnabled
                                ? t("cloud.password.saved", "Saved")
                                : t("cloud.password.locked", "Locked")}
                            </Badge>
                            {droplet.saved_root_password_updated_at ? (
                              <div className="text-xs text-slate-500">
                                {formatDateTime(droplet.saved_root_password_updated_at)}
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
                      <TableCell>{formatDateTime(droplet.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Flex justify="end" gap="2" wrap="wrap">
                          <Button
                            variant="soft"
                            size="1"
                            disabled={!droplet.saved_root_password || !passwordStorageEnabled || dropletPasswordLoading}
                            onClick={() => {
                              void handleViewDropletPassword(droplet);
                            }}
                          >
                            <KeyRound className="mr-1 h-3.5 w-3.5" />
                            {t("cloud.password.view", "View Password")}
                          </Button>
                          {droplet.status === "active" ? (
                            <Button
                              variant="soft"
                              size="1"
                              color="amber"
                              onClick={() => {
                                void handleDropletAction(droplet.id, "power_off");
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
                                void handleDropletAction(droplet.id, "power_on");
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
                              void handleDropletAction(droplet.id, "reboot");
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
                                providerLabel: t("cloud.providers.digitalocean.title", "DigitalOcean"),
                                instanceName: droplet.name || String(droplet.id),
                                instanceIdentifier: String(droplet.id),
                                addresses: getDropletMatchAddresses(droplet),
                                groupHint: getDefaultAutoConnectGroup("digitalocean", activeToken?.name || ""),
                              });
                            }}
                          >
                            {t("cloud.script.action", "Run Script")}
                          </Button>
                          <Button
                            variant="soft"
                            size="1"
                            onClick={() => {
                              void handleOpenShareDialog(droplet);
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
                              void handleDeleteDroplet(droplet);
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

      <div className={`order-1 ${cloudPanelCardClassName}`}>
            <div className={cloudPanelHeaderClassName}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className={cloudPanelTitleClassName}>
                    {t("cloud.tokens.title", "Token Pool")}
                  </div>
                  <div className={cloudPanelDescriptionClassName}>
                    {t(
                      "cloud.tokens.description_compact",
                      "Save multiple DigitalOcean tokens, switch the active one, check token health in bulk, and inspect stored credentials when needed.",
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
                    disabled={tokenChecking || tokenRows.length === 0}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {t("cloud.tokens.check_all", "Check All Tokens")}
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
                  <Button
                    size="1"
                    onClick={() => setTokenImportOpen(true)}
                  >
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
                    <TableHead className="w-10">
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={allTokensSelected || (someTokensSelected && "indeterminate")}
                          onCheckedChange={(checked) => {
                            setSelectedTokenIds(Boolean(checked) ? tokenRows.map((token) => token.id) : []);
                          }}
                          aria-label={t("cloud.tokens.select_all", "Select all tokens")}
                        />
                      </div>
                    </TableHead>
                    <TableHead>{t("cloud.tokens.table.name", "Name")}</TableHead>
                    <TableHead>{t("cloud.tokens.table.token", "Token")}</TableHead>
                    <TableHead>{t("cloud.tokens.table.account", "Account")}</TableHead>
                    <TableHead>{t("cloud.tokens.table.status", "Status")}</TableHead>
                    <TableHead>{t("cloud.tokens.table.checked_at", "Last Checked")}</TableHead>
                    <TableHead className="text-right">
                      {t("common.action", "Action")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokenRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                        {t("cloud.tokens.empty", "No DigitalOcean tokens saved yet")}
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
                              <Badge color="blue">
                                {t("cloud.tokens.active", "Active")}
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-44 truncate font-mono text-xs text-slate-600">
                          {token.masked_token || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-900 dark:text-slate-100">
                            {token.account_email || "-"}
                          </div>
                          {token.droplet_limit ? (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {t("cloud.tokens.droplet_limit", {
                                count: token.droplet_limit,
                                defaultValue: `Droplet limit ${token.droplet_limit}`,
                              })}
                            </div>
                          ) : null}
                          {token.managed_ssh_key_ready ? (
                            <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                              {t("cloud.tokens.shared_managed_key_ready", {
                                name: token.managed_ssh_key_name || "Komari Managed Key",
                                defaultValue: `Shared managed SSH key: ${token.managed_ssh_key_name || "Komari Managed Key"}`,
                              })}
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
                              {getDigitalOceanStatusSummary("", token.last_error, t) || token.last_error}
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
                                void handleOpenDropletsForToken(token);
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
                              disabled={!token.managed_ssh_key_ready || managedKeyLoading}
                              onClick={() => {
                                void handleViewManagedKey(token);
                              }}
                            >
                              <KeyRound className="mr-1 h-3.5 w-3.5" />
                              {t("cloud.tokens.view_managed_key", "View Managed Key")}
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
              {t("cloud.tokens.import_label", "Batch Import")}
            </label>
            <TextArea
              className="min-h-40 font-mono text-xs [overflow-wrap:anywhere]"
              value={tokenImportText}
              placeholder={t(
                "cloud.tokens.import_placeholder",
                "prod-account,dop_v1_xxx\nbackup-account|dop_v1_yyy\ndop_v1_zzz",
              )}
              onChange={(event) => setTokenImportText(event.target.value)}
            />
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {t(
                "cloud.tokens.import_hint",
                "One line per token. Supported formats: name,token ; name|token ; or token only.",
              )}
            </div>
            <Flex justify="end" gap="2">
              <Button
                variant="outline"
                onClick={() => setTokenImportOpen(false)}
                disabled={tokenSaving}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                onClick={() => {
                  void handleImportTokens();
                }}
                disabled={tokenSaving}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {tokenSaving
                  ? t("cloud.tokens.importing", "Importing...")
                  : t("cloud.tokens.import", "Import Tokens")}
              </Button>
            </Flex>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{t("cloud.create", "Create Droplet")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.create_description",
              "Select a region, size, and image to provision a new Droplet.",
            )}
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-4">
            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.form.name", "Name")}
            </label>
            <TextField.Root
              value={createForm.name}
              placeholder="web-01"
              onChange={(event) =>
                setCreateForm((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
            />

            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.form.region", "Region")}
            </label>
            <Select.Root
              value={createForm.region}
              onValueChange={(value) =>
                setCreateForm((previous) => ({ ...previous, region: value }))
              }
            >
              <Select.Trigger
                placeholder={t("cloud.form.region_placeholder", "Select a region")}
              />
              <Select.Content>
                {regions.map((region) => (
                  <Select.Item key={region.slug} value={region.slug}>
                    {getRegionOptionLabel(region, t)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.form.size", "Size")}
            </label>
            <Select.Root
              value={createForm.size}
              onValueChange={(value) =>
                setCreateForm((previous) => ({ ...previous, size: value }))
              }
            >
              <Select.Trigger
                placeholder={t("cloud.form.size_placeholder", "Select a size")}
              />
              <Select.Content>
                {sizes.map((size) => (
                  <Select.Item key={size.slug} value={size.slug}>
                    {size.slug} / {size.vcpus} vCPU / {(size.memory / 1024).toFixed(0)} GB / $
                    {size.price_monthly.toFixed(2)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.form.image", "Image")}
            </label>
            <Select.Root
              value={createForm.image}
              onValueChange={(value) =>
                setCreateForm((previous) => ({ ...previous, image: value }))
              }
            >
              <Select.Trigger
                placeholder={t("cloud.form.image_placeholder", "Select an image")}
              />
              <Select.Content>
                {images.map((image) => (
                  <Select.Item key={`${image.id}-${image.slug}`} value={getImageValue(image)}>
                    {getImageLabel(image)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <label className={cloudPanelFieldLabelClassName}>
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
              <Select.Trigger
                placeholder={t("cloud.form.root_access_placeholder", "Select access mode")}
              />
              <Select.Content>
                <Select.Item value="random">
                  {t("cloud.form.root_access_modes.random", "Random root password")}
                </Select.Item>
                <Select.Item value="custom">
                  {t("cloud.form.root_access_modes.custom", "Custom root password")}
                </Select.Item>
              </Select.Content>
            </Select.Root>

            <WarningAlert
              tone="info"
              description={t(
                "cloud.form.root_access_password_help",
                "Komari will ensure a managed SSH key exists for this token, attach it to the Droplet, and run a startup script to set the root password and enable password login.",
              )}
            />

            {createForm.root_password_mode === "custom" ? (
              <>
                <label className={cloudPanelFieldLabelClassName}>
                  {t("cloud.form.root_password", "Root Password")}
                </label>
                <TextField.Root
                  type="password"
                  value={createForm.root_password}
                  placeholder={t("cloud.form.root_password_placeholder", "Enter a root password")}
                  onChange={(event) =>
                    setCreateForm((previous) => ({
                      ...previous,
                      root_password: event.target.value,
                    }))
                  }
                />
              </>
            ) : null}

            {createForm.root_password_mode === "random" ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                {t(
                  "cloud.form.root_password_random_help",
                  "A random root password will be generated on the server and shown once after creation succeeds.",
                )}
              </div>
            ) : null}

            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.form.tags", "Tags")}
            </label>
            <TextField.Root
              value={createForm.tagsText}
              placeholder="prod, web"
              onChange={(event) =>
                setCreateForm((previous) => ({
                  ...previous,
                  tagsText: event.target.value,
                }))
              }
            />

            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.form.vpc_uuid", "VPC UUID")}
            </label>
            <TextField.Root
              value={createForm.vpc_uuid}
              placeholder={t("cloud.form.vpc_uuid_placeholder", "Optional")}
              onChange={(event) =>
                setCreateForm((previous) => ({
                  ...previous,
                  vpc_uuid: event.target.value,
                }))
              }
            />

            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.form.user_data", "Cloud-Init / User Data")}
            </label>
            <WarningAlert
              tone="warning"
              description={t(
                "cloud.form.user_data_password_help",
                "When root password mode is enabled, this field is appended as shell commands. #cloud-config is not supported in this mode.",
              )}
            />
            <TextArea
              rows={6}
              value={createForm.user_data}
              placeholder="#cloud-config"
              onChange={(event) =>
                setCreateForm((previous) => ({
                  ...previous,
                  user_data: event.target.value,
                }))
              }
            />

            <div className={cloudPanelSectionClassName}>
              <label className={`flex items-start gap-2 ${cloudPanelBodyTextClassName}`}>
                <Checkbox
                  checked={createForm.auto_connect}
                  onCheckedChange={(checked) =>
                    setCreateForm((previous) => ({
                      ...previous,
                      auto_connect: Boolean(checked),
                      auto_connect_group: previous.auto_connect_group || defaultCreateGroup,
                    }))
                  }
                />
                  <span>
                    <span className="block font-medium text-slate-900 dark:text-slate-100">
                      {t("cloud.form.auto_connect", "Auto-connect to Komari on first boot")}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                      {t(
                        "cloud.form.auto_connect_help",
                        "Requires Auto Discovery Key. When enabled, shell user_data is injected and #cloud-config is not supported.",
                    )}
                  </span>
                </span>
              </label>
              <div className="mt-3">
                <label className={cloudPanelFieldLabelClassName}>
                  {t("cloud.form.auto_connect_group", "Auto-connect group")}
                </label>
                <TextField.Root
                  className="mt-2"
                  value={createForm.auto_connect_group}
                  disabled={!createForm.auto_connect}
                  placeholder={t("cloud.form.auto_connect_group_placeholder", "digitalocean/Primary Token")}
                  onChange={(event) =>
                    setCreateForm((previous) => ({
                      ...previous,
                      auto_connect_group: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className={cloudPanelSectionClassName}>
              <div className={cloudPanelFieldLabelClassName}>
                {t("cloud.form.options", "Options")}
              </div>
              <div className="mt-3 flex flex-col gap-3">
                <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
                  <Checkbox
                    checked={createForm.backups}
                    onCheckedChange={(checked) =>
                      setCreateForm((previous) => ({
                        ...previous,
                        backups: Boolean(checked),
                      }))
                    }
                  />
                  {t("cloud.form.backups", "Enable backups")}
                </label>
                <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
                  <Checkbox
                    checked={createForm.ipv6}
                    onCheckedChange={(checked) =>
                      setCreateForm((previous) => ({
                        ...previous,
                        ipv6: Boolean(checked),
                      }))
                    }
                  />
                  {t("cloud.form.ipv6", "Enable IPv6")}
                </label>
                <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
                  <Checkbox
                    checked={createForm.monitoring}
                    onCheckedChange={(checked) =>
                      setCreateForm((previous) => ({
                        ...previous,
                        monitoring: Boolean(checked),
                      }))
                    }
                  />
                  {t("cloud.form.monitoring", "Enable monitoring")}
                </label>
              </div>
            </div>

            <Flex justify="end" gap="2" className="mt-2">
              <Button
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={createSubmitting}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                onClick={() => {
                  void handleCreateDroplet();
                }}
                disabled={
                  createSubmitting ||
                  !createForm.name ||
                  !createForm.region ||
                  !createForm.size ||
                  !createForm.image ||
                  (createForm.root_password_mode === "custom" && !createForm.root_password)
                }
              >
                {createSubmitting
                  ? t("cloud.creating", "Creating...")
                  : t("cloud.create", "Create Droplet")}
              </Button>
            </Flex>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(detailDroplet)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailDroplet(null);
          }
        }}
      >
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{detailDroplet?.name || t("cloud.detail.title", "Droplet Details")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.detail.description",
              "View the selected DigitalOcean Droplet details from the current active token.",
            )}
          </Dialog.Description>

          {detailDroplet ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DetailItem label={t("cloud.detail.id", "Droplet ID")} value={detailDroplet.id} />
              <DetailItem
                label={t("cloud.table.status", "Status")}
                value={getCloudStatusLabel(detailDroplet.status, t)}
              />
              <DetailItem
                label={t("cloud.table.region", "Region")}
                value={getRegionOptionLabel(detailDroplet.region, t)}
              />
              <DetailItem label={t("cloud.table.ip", "Public IP")} value={getDropletPrimaryIp(detailDroplet)} />
              <DetailItem
                label={t("cloud.table.size", "Size")}
                value={detailDroplet.size_slug || detailDroplet.size?.slug || "-"}
              />
              <DetailItem
                label={t("cloud.table.image", "Image")}
                value={getImageLabel(detailDroplet.image)}
              />
              <DetailItem
                label={t("cloud.table.created_at", "Created")}
                value={formatDateTime(detailDroplet.created_at)}
              />
              <DetailItem
                label={t("cloud.table.password", "Root Password")}
                value={
                  detailDroplet.saved_root_password ? (
                    <Button
                      variant="soft"
                      size="1"
                      disabled={!passwordStorageEnabled || dropletPasswordLoading}
                      onClick={() => {
                        void handleViewDropletPassword(detailDroplet);
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
              <DetailItem label={t("cloud.detail.memory", "Memory")} value={`${detailDroplet.memory} MB`} />
              <DetailItem label={t("cloud.detail.vcpus", "vCPUs")} value={detailDroplet.vcpus} />
              <DetailItem label={t("cloud.detail.disk", "Disk")} value={`${detailDroplet.disk} GB`} />
              <DetailItem label={t("cloud.detail.vpc_uuid", "VPC UUID")} value={detailDroplet.vpc_uuid || "-"} />
              <DetailItem label={t("cloud.detail.tags", "Tags")} value={formatList(detailDroplet.tags)} />
              <DetailItem
                label={t("cloud.detail.features", "Features")}
                value={formatList(detailDroplet.features)}
              />
              <DetailItem
                label={t("cloud.detail.backup_ids", "Backup IDs")}
                value={formatList(detailDroplet.backup_ids)}
              />
              <DetailItem
                label={t("cloud.detail.snapshot_ids", "Snapshot IDs")}
                value={formatList(detailDroplet.snapshot_ids)}
              />
              <DetailItem
                label={t("cloud.detail.volume_ids", "Volume IDs")}
                value={formatList(detailDroplet.volume_ids)}
              />
              <DetailItem
                label={t("cloud.detail.ipv4", "IPv4 Networks")}
                value={detailDroplet.networks.v4.length
                  ? detailDroplet.networks.v4.map((network) => `${network.type}: ${network.ip_address}`).join(" | ")
                  : "-"}
              />
              <DetailItem
                label={t("cloud.detail.ipv6", "IPv6 Networks")}
                value={detailDroplet.networks.v6.length
                  ? detailDroplet.networks.v6.map((network) => `${network.type}: ${network.ip_address}`).join(" | ")
                  : "-"}
              />
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(tokenSecret)}
        onOpenChange={(open) => {
          if (!open) {
            setTokenSecret(null);
          }
        }}
      >
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{t("cloud.tokens.token_dialog_title", "Token Details")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.tokens.token_dialog_description",
              "View the full DigitalOcean token only when you need to copy or verify it.",
            )}
          </Dialog.Description>

          {tokenSecret ? (
            <div className="mt-4 flex flex-col gap-4">
              <DetailItem label={t("cloud.tokens.table.name", "Name")} value={tokenSecret.secret.token_name} />
              <DetailItem
                label={t("cloud.tokens.table.account", "Account")}
                value={tokenSecret.secret.account_email || "-"}
              />
              <DetailItem
                label={t("cloud.tokens.masked_token", "Masked Token")}
                value={tokenSecret.secret.masked_token || "-"}
              />
              <CloudCopyBlock
                title={t("cloud.tokens.full_token", "Full Token")}
                copyLabel={t("copy", "Copy")}
                onCopy={() => {
                  void copyText(tokenSecret.secret.token);
                }}
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
        shareManagedSSHKey={shareManagedSSHKey}
        shareUrl={shareRecord?.token ? buildCloudInstanceShareUrl(shareRecord.token) : ""}
        onTitleChange={setShareTitle}
        onNoteChange={setShareNote}
        onSharePasswordChange={setSharePassword}
        onShareManagedSSHKeyChange={setShareManagedSSHKey}
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

      <Dialog.Root
        open={Boolean(managedKeyMaterial)}
        onOpenChange={(open) => {
          if (!open) {
            setManagedKeyMaterial(null);
          }
        }}
      >
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{t("cloud.tokens.managed_key_dialog_title", "Managed SSH Key")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.tokens.managed_key_dialog_description",
              "This is the shared managed SSH key Komari reuses as a fallback when creating DigitalOcean Droplets with root password mode.",
            )}
          </Dialog.Description>

          {managedKeyMaterial ? (
            <div className="mt-4 flex flex-col gap-4">
              <DetailItem label={t("cloud.tokens.table.name", "Name")} value={managedKeyMaterial.token_name} />
              <DetailItem label={t("cloud.tokens.managed_key_name", "Key Name")} value={managedKeyMaterial.name} />
              <DetailItem
                label={t("cloud.tokens.managed_key_registration", "Account Registration")}
                value={managedKeyMaterial.key_id > 0
                  ? t("cloud.tokens.managed_key_registered", {
                    keyId: managedKeyMaterial.key_id,
                    defaultValue: `Registered for this account as key #${managedKeyMaterial.key_id}`,
                  })
                  : t(
                    "cloud.tokens.managed_key_pending_registration",
                    "Not registered for this account yet. Komari will register the shared public key the first time this credential creates a Droplet with root password mode.",
                  )}
              />
              <DetailItem
                label={t("cloud.tokens.managed_key_fingerprint", "Fingerprint")}
                value={managedKeyMaterial.fingerprint || "-"}
              />
              <CloudCopyBlock
                title={t("cloud.tokens.public_key", "Public Key")}
                copyLabel={t("copy", "Copy")}
                onCopy={() => {
                  void copyText(managedKeyMaterial.public_key);
                }}
              >
                <TextArea
                  className={cloudSecretTextareaClassName}
                  readOnly
                  value={managedKeyMaterial.public_key}
                />
              </CloudCopyBlock>
              <CloudCopyBlock
                title={t("cloud.tokens.private_key", "Private Key")}
                copyLabel={t("copy", "Copy")}
                onCopy={() => {
                  void copyText(managedKeyMaterial.private_key);
                }}
              >
                <TextArea
                  className={cloudTallSecretTextareaClassName}
                  readOnly
                  value={managedKeyMaterial.private_key}
                />
              </CloudCopyBlock>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(savedDropletPassword)}
        onOpenChange={(open) => {
          if (!open) {
            setSavedDropletPassword(null);
          }
        }}
      >
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{t("cloud.password.dialog_title", "Saved Root Password")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.password.dialog_description",
              "View the saved root password for this Droplet from the current active token.",
            )}
          </Dialog.Description>

          {savedDropletPassword ? (
            <div className="mt-4 flex flex-col gap-4">
              <DetailItem label={t("cloud.table.name", "Name")} value={savedDropletPassword.droplet.name} />
              <DetailItem
                label={t("cloud.table.ip", "Public IP")}
                value={getDropletPrimaryIp(savedDropletPassword.droplet)}
              />
              <DetailItem
                label={t("cloud.password.username", "Username")}
                value={savedDropletPassword.credential.username || "root"}
              />
              <DetailItem
                label={t("cloud.password.mode", "Password Mode")}
                value={
                  savedDropletPassword.credential.password_mode
                    ? t(
                        `cloud.form.root_access_modes.${savedDropletPassword.credential.password_mode}`,
                        savedDropletPassword.credential.password_mode,
                      )
                    : "-"
                }
              />
              <DetailItem
                label={t("cloud.password.saved_at", "Saved At")}
                value={formatDateTime(savedDropletPassword.credential.updated_at)}
              />
              <CloudCopyBlock
                title={t("cloud.access.root_password", "Root Password")}
                copyLabel={t("copy", "Copy")}
                onCopy={() => {
                  void copyText(savedDropletPassword.credential.root_password);
                }}
              >
                <TextArea
                  className={cloudSecretTextareaClassName}
                  readOnly
                  rows={3}
                  value={savedDropletPassword.credential.root_password}
                />
              </CloudCopyBlock>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(accessSecrets)}
        onOpenChange={(open) => {
          if (!open) {
            setAccessSecrets(null);
          }
        }}
      >
        <Dialog.Content className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}>
          <Dialog.Title>{t("cloud.access.title", "Access Details")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.access.description",
              "Save these credentials now. The generated password is only shown here once, and the managed SSH key is your fallback access method.",
            )}
          </Dialog.Description>

          {accessSecrets ? (
            <div className="mt-4 flex flex-col gap-4">
              {accessSecrets.passwordSaved ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {t(
                    "cloud.password.create_saved",
                    "This root password has been encrypted and saved. You can reopen it later from the Droplet list.",
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                  <div className={cloudLongTextClassName}>
                    {t(
                      "cloud.password.create_unsaved",
                      "This root password was not saved on the server. Save it now if you still need it later.",
                    )}
                  </div>
                  {accessSecrets.passwordSaveError ? (
                    <div className={`mt-2 ${cloudLongTextClassName}`}>
                      {t("cloud.password.create_unsaved_reason", {
                        reason: accessSecrets.passwordSaveError,
                        defaultValue: `Password save failed: ${accessSecrets.passwordSaveError}`,
                      })}
                    </div>
                  ) : null}
                </div>
              )}
              <DetailItem label={t("cloud.table.name", "Name")} value={accessSecrets.droplet.name} />
              <DetailItem label={t("cloud.table.ip", "Public IP")} value={getDropletPrimaryIp(accessSecrets.droplet)} />

              <CloudCopyBlock
                title={t("cloud.access.root_password", "Root Password")}
                copyLabel={t("copy", "Copy")}
                onCopy={() => {
                  void copyText(accessSecrets.rootPassword);
                }}
              >
                <TextArea
                  className={cloudSecretTextareaClassName}
                  readOnly
                  rows={3}
                  value={accessSecrets.rootPassword}
                />
              </CloudCopyBlock>

              {accessSecrets.managedSSHKey ? (
                <>
                  <CloudCopyBlock
                    title={t("cloud.access.private_key", "Managed Private Key")}
                    copyLabel={t("copy", "Copy")}
                    onCopy={() => {
                      void copyText(accessSecrets.managedSSHKey?.private_key || "");
                    }}
                  >
                    <TextArea
                      className={cloudTallSecretTextareaClassName}
                      readOnly
                      value={accessSecrets.managedSSHKey.private_key}
                    />
                  </CloudCopyBlock>
                  <DetailItem
                    label={t("cloud.access.ssh_hint", "SSH Login Example")}
                    value={`ssh -i ./id_ed25519 root@${getDropletPrimaryIp(accessSecrets.droplet)}`}
                  />
                </>
              ) : null}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Root>
      </AdminPageShell>
      {dialog}
    </>
  );
}

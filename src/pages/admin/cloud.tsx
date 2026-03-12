import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CheckCircle2,
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
  checkDigitalOceanTokens,
  createDigitalOceanDroplet,
  deleteDigitalOceanDroplet,
  deleteDigitalOceanToken,
  getDigitalOceanAccount,
  getDigitalOceanCatalog,
  getDigitalOceanTokens,
  listDigitalOceanDroplets,
  postDigitalOceanDropletAction,
  saveDigitalOceanTokens,
  setDigitalOceanActiveToken,
  type CreateDigitalOceanDropletInput,
  type DigitalOceanAccount,
  type DigitalOceanCatalog,
  type DigitalOceanDroplet,
  type DigitalOceanImage,
  type DigitalOceanTokenInput,
  type DigitalOceanTokenPool,
  type DigitalOceanTokenRecord,
} from "@/lib/cloud";

type CreateDropletFormState = Omit<CreateDigitalOceanDropletInput, "tags"> & {
  tagsText: string;
};

const initialCreateForm: CreateDropletFormState = {
  name: "",
  region: "",
  size: "",
  image: "",
  ssh_keys: [],
  backups: false,
  ipv6: true,
  monitoring: true,
  user_data: "",
  vpc_uuid: "",
  tagsText: "",
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
      name: name || `Token ${tokens.length + 1}`,
      token,
    });
  }

  return tokens;
}

function getActiveToken(pool: DigitalOceanTokenPool | null) {
  return pool?.tokens.find((token) => token.id === pool.active_token_id) || null;
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

export default function CloudPage() {
  const { t } = useTranslation();

  const [initializing, setInitializing] = React.useState(true);
  const [panelLoading, setPanelLoading] = React.useState(false);
  const [tokenSaving, setTokenSaving] = React.useState(false);
  const [tokenChecking, setTokenChecking] = React.useState(false);
  const [tokenImportText, setTokenImportText] = React.useState("");
  const [tokenPool, setTokenPool] = React.useState<DigitalOceanTokenPool | null>(null);
  const [account, setAccount] = React.useState<DigitalOceanAccount | null>(null);
  const [catalog, setCatalog] = React.useState<DigitalOceanCatalog | null>(null);
  const [droplets, setDroplets] = React.useState<DigitalOceanDroplet[]>([]);
  const [detailDroplet, setDetailDroplet] = React.useState<DigitalOceanDroplet | null>(null);
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

  if (initializing) {
    return <Loading text="" />;
  }

  const activeToken = getActiveToken(tokenPool);
  const connected = Boolean(account && activeToken);
  const runningCount = droplets.filter((droplet) => droplet.status === "active").length;

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

  const handleSelectToken = async (token: DigitalOceanTokenRecord) => {
    try {
      const nextPool = await setDigitalOceanActiveToken(token.id);
      setTokenPool(nextPool);
      toast.success(
        t("cloud.tokens.active_success", {
          name: token.name,
          defaultValue: `Using token ${token.name}`,
        }),
      );
      await loadPanelData();
    } catch (selectError) {
      toast.error(toErrorMessage(selectError));
    }
  };

  const handleDeleteToken = async (token: DigitalOceanTokenRecord) => {
    const confirmed = window.confirm(
      t("cloud.tokens.delete_confirm", {
        name: token.name,
        defaultValue: `Delete token "${token.name}"?`,
      }),
    );
    if (!confirmed) return;

    try {
      const nextPool = await deleteDigitalOceanToken(token.id);
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

  const handleCreateDroplet = async () => {
    setCreateSubmitting(true);
    try {
      const payload: CreateDigitalOceanDropletInput = {
        name: createForm.name,
        region: createForm.region,
        size: createForm.size,
        image: createForm.image,
        ssh_keys: createForm.ssh_keys,
        backups: createForm.backups,
        ipv6: createForm.ipv6,
        monitoring: createForm.monitoring,
        tags: parseTags(createForm.tagsText),
        user_data: createForm.user_data,
        vpc_uuid: createForm.vpc_uuid,
      };

      await createDigitalOceanDroplet(payload);
      toast.success(
        t("cloud.create_success", "Droplet creation request submitted"),
      );
      setCreateOpen(false);
      setCreateForm((previous) => ({
        ...initialCreateForm,
        region: previous.region,
        size: previous.size,
        image: previous.image,
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
    const confirmed = window.confirm(
      t("cloud.delete_confirm", {
        name: droplet.name,
        defaultValue: `Delete droplet "${droplet.name}"? This action cannot be undone.`,
      }),
    );
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
  const sshKeys = catalog?.ssh_keys ?? [];
  const tokenRows = tokenPool?.tokens ?? [];

  return (
    <AdminPageShell
      eyebrow="DigitalOcean"
      title={t("cloud.title", "Cloud")}
      description={t(
        "cloud.description",
        "Manage a pool of DigitalOcean tokens, switch the active token for operations, bulk check token health, and operate Droplets from one panel.",
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
          <Button
            size="1"
            onClick={() => setCreateOpen(true)}
            disabled={!connected || !catalog}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("cloud.create", "Create Droplet")}
          </Button>
        </>
      }
      stats={[
        {
          label: t("cloud.stats.provider", "Provider"),
          value: "DigitalOcean",
        },
        {
          label: t("cloud.stats.tokens", "Tokens"),
          value: tokenRows.length,
        },
        {
          label: t("cloud.stats.account", "Account"),
          value: account?.email || activeToken?.account_email || "-",
        },
        {
          label: t("cloud.stats.droplets", "Droplets"),
          value: droplets.length,
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

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-900">
                {t("cloud.tokens.title", "Token Pool")}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {t(
                  "cloud.tokens.description",
                  "Batch import DigitalOcean tokens into the database, choose the active token for panel operations, and bulk check whether tokens are still valid.",
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
                size="1"
                onClick={() => {
                  void handleImportTokens();
                }}
                disabled={tokenSaving}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t("cloud.tokens.import", "Import Tokens")}
              </Button>
            </Flex>
          </div>
        </div>

        <div className="border-b border-slate-200 px-5 py-4">
          <label className="text-sm font-medium text-slate-800">
            {t("cloud.tokens.import_label", "Batch Import")}
          </label>
          <div className="mt-1 text-sm text-slate-500">
            {t(
              "cloud.tokens.import_hint",
              "One line per token. Supported formats: name,token ; name|token ; or token only.",
            )}
          </div>
          <TextArea
            className="mt-3 min-h-32"
            value={tokenImportText}
            placeholder={t(
              "cloud.tokens.import_placeholder",
              "prod-account,dop_v1_xxx\nbackup-account|dop_v1_yyy\ndop_v1_zzz",
            )}
            onChange={(event) => setTokenImportText(event.target.value)}
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                  {t("cloud.tokens.empty", "No DigitalOcean tokens saved yet")}
                </TableCell>
              </TableRow>
            ) : (
              tokenRows.map((token) => (
                <TableRow key={token.id}>
                  <TableCell className="font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <span>{token.name}</span>
                      {token.is_active ? (
                        <Badge color="blue">
                          {t("cloud.tokens.active", "Active")}
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">
                    {token.masked_token || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-900">
                      {token.account_email || "-"}
                    </div>
                    {token.droplet_limit ? (
                      <div className="text-xs text-slate-500">
                        {t("cloud.tokens.droplet_limit", {
                          count: token.droplet_limit,
                          defaultValue: `Droplet limit ${token.droplet_limit}`,
                        })}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge color={getTokenStatusColor(token.last_status)}>
                      {t(`cloud.tokens.status.${token.last_status}`, token.last_status || "unknown")}
                    </Badge>
                    {token.last_error ? (
                      <div className="mt-1 max-w-64 text-xs text-red-600">
                        {token.last_error}
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

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="text-sm font-medium text-slate-900">
            {t("cloud.droplet_list", "Droplet List")}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {t(
              "cloud.droplet_list_description",
              "Click a Droplet name to view details, and use the current active token to perform lifecycle actions.",
            )}
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
              <TableHead>{t("cloud.table.created_at", "Created")}</TableHead>
              <TableHead className="text-right">
                {t("common.action", "Action")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {droplets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-slate-500">
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
                  <TableCell className="font-medium text-slate-900">
                    <button
                      type="button"
                      className="text-left text-blue-700 hover:text-blue-800 hover:underline"
                      onClick={() => setDetailDroplet(droplet)}
                    >
                      {droplet.name}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge color={getDropletStatusColor(droplet.status)}>
                      {droplet.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{droplet.region?.slug || "-"}</TableCell>
                  <TableCell>{getDropletPrimaryIp(droplet)}</TableCell>
                  <TableCell>{droplet.size_slug || droplet.size?.slug || "-"}</TableCell>
                  <TableCell>{getImageLabel(droplet.image)}</TableCell>
                  <TableCell>{formatMonthlyPrice(droplet)}</TableCell>
                  <TableCell>{formatDateTime(droplet.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Flex justify="end" gap="2" wrap="wrap">
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

      <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
        <Dialog.Content className="max-h-[85vh] overflow-y-auto">
          <Dialog.Title>{t("cloud.create", "Create Droplet")}</Dialog.Title>
          <Dialog.Description>
            {t(
              "cloud.create_description",
              "Select a region, size, and image to provision a new Droplet.",
            )}
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-4">
            <label className="text-sm font-medium text-slate-800">
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

            <label className="text-sm font-medium text-slate-800">
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
                    {region.slug} / {region.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <label className="text-sm font-medium text-slate-800">
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

            <label className="text-sm font-medium text-slate-800">
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

            <label className="text-sm font-medium text-slate-800">
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

            <label className="text-sm font-medium text-slate-800">
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

            <label className="text-sm font-medium text-slate-800">
              {t("cloud.form.user_data", "Cloud-Init / User Data")}
            </label>
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

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-sm font-medium text-slate-800">
                {t("cloud.form.options", "Options")}
              </div>
              <div className="mt-3 flex flex-col gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
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
                <label className="flex items-center gap-2 text-sm text-slate-700">
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
                <label className="flex items-center gap-2 text-sm text-slate-700">
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

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-sm font-medium text-slate-800">
                {t("cloud.form.ssh_keys", "SSH Keys")}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {t(
                  "cloud.form.ssh_keys_description",
                  "Attach existing account SSH keys to the new Droplet.",
                )}
              </div>
              <div className="mt-3 flex max-h-48 flex-col gap-2 overflow-y-auto">
                {sshKeys.length ? (
                  sshKeys.map((sshKey) => {
                    const checked = createForm.ssh_keys.includes(sshKey.id);
                    return (
                      <label
                        key={sshKey.id}
                        className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(nextChecked) =>
                            setCreateForm((previous) => ({
                              ...previous,
                              ssh_keys: Boolean(nextChecked)
                                ? [...previous.ssh_keys, sshKey.id]
                                : previous.ssh_keys.filter((id) => id !== sshKey.id),
                            }))
                          }
                        />
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-900">
                            {sshKey.name}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {sshKey.fingerprint}
                          </span>
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
                  !createForm.image
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
        <Dialog.Content className="max-h-[85vh] overflow-y-auto">
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
              <DetailItem label={t("cloud.table.status", "Status")} value={detailDroplet.status || "-"} />
              <DetailItem label={t("cloud.table.region", "Region")} value={detailDroplet.region?.slug || "-"} />
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
    </AdminPageShell>
  );
}

import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import Loading from "@/components/loading";
import { renderProviderInputs } from "@/utils/renderProviders";
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
  CloudApiError,
  createDigitalOceanDroplet,
  deleteDigitalOceanDroplet,
  getCloudProviderValues,
  getCloudProviders,
  getDigitalOceanAccount,
  getDigitalOceanCatalog,
  listDigitalOceanDroplets,
  postDigitalOceanDropletAction,
  saveCloudProviderValues,
  type CreateDigitalOceanDropletInput,
  type DigitalOceanAccount,
  type DigitalOceanCatalog,
  type DigitalOceanDroplet,
  type DigitalOceanImage,
} from "@/lib/cloud";

const DIGITALOCEAN_PROVIDER = "digitalocean";

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

export default function CloudPage() {
  const { t } = useTranslation();

  const [initializing, setInitializing] = React.useState(true);
  const [panelLoading, setPanelLoading] = React.useState(false);
  const [providerDefs, setProviderDefs] = React.useState<Record<string, any[]>>(
    {},
  );
  const [providerValues, setProviderValues] = React.useState<Record<string, unknown>>(
    {},
  );
  const [account, setAccount] = React.useState<DigitalOceanAccount | null>(null);
  const [catalog, setCatalog] = React.useState<DigitalOceanCatalog | null>(null);
  const [droplets, setDroplets] = React.useState<DigitalOceanDroplet[]>([]);
  const [error, setError] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createSubmitting, setCreateSubmitting] = React.useState(false);
  const [createForm, setCreateForm] =
    React.useState<CreateDropletFormState>(initialCreateForm);

  const loadProviderState = async () => {
    const defs = await getCloudProviders();
    setProviderDefs(defs);

    try {
      const values = await getCloudProviderValues(DIGITALOCEAN_PROVIDER);
      setProviderValues(values);
    } catch (providerError) {
      if (
        providerError instanceof CloudApiError &&
        providerError.status === 404
      ) {
        setProviderValues({});
        return;
      }
      throw providerError;
    }
  };

  const loadPanelData = async () => {
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
  };

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await loadProviderState();
        if (!cancelled) {
          await loadPanelData();
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
  }, []);

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

  const connected = Boolean(account);
  const runningCount = droplets.filter((droplet) => droplet.status === "active").length;

  const refreshAll = async () => {
    await loadProviderState();
    await loadPanelData();
  };

  const handleProviderSave = async (values: Record<string, unknown>) => {
    await saveCloudProviderValues(DIGITALOCEAN_PROVIDER, values);
    setProviderValues(values);
    toast.success(
      t("settings.settings_saved", "Settings saved"),
    );
    await refreshAll();
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
      t(
        "cloud.delete_confirm",
        `Delete droplet "${droplet.name}"? This action cannot be undone.`,
      ),
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

  return (
    <AdminPageShell
      eyebrow="DigitalOcean"
      title={t("cloud.title", "Cloud")}
      description={t(
        "cloud.description",
        "Configure a DigitalOcean token once, then query resources, create Droplets, and perform common power operations from one panel.",
      )}
      actions={
        <>
          <Button
            variant="outline"
            size="1"
            onClick={() => {
              void refreshAll();
            }}
            disabled={panelLoading}
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
          label: t("cloud.stats.account", "Account"),
          value: account?.email || "-",
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

      {renderProviderInputs({
        currentProvider: DIGITALOCEAN_PROVIDER,
        providerDefs,
        providerValues,
        translationPrefix: "cloud.providers.digitalocean",
        title: t("cloud.connection_title", "Connection"),
        description: t(
          "cloud.connection_description",
          "Save a Personal Access Token with Droplet read/write permissions. The panel will use the official DigitalOcean v2 API on your behalf.",
        ),
        setProviderValues,
        handleSave: handleProviderSave,
        t,
      })}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="text-sm font-medium text-slate-900">
            {t("cloud.droplet_list", "Droplet List")}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {t(
              "cloud.droplet_list_description",
              "List existing Droplets and execute common lifecycle operations.",
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
                    : t("cloud.empty", "No Droplets found")}
                </TableCell>
              </TableRow>
            ) : (
              droplets.map((droplet) => (
                <TableRow key={droplet.id}>
                  <TableCell className="font-medium text-slate-900">
                    {droplet.name}
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
                  <TableCell>
                    {droplet.created_at
                      ? new Date(droplet.created_at).toLocaleString()
                      : "-"}
                  </TableCell>
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
                {catalog?.regions.map((region) => (
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
                {catalog?.sizes.map((size) => (
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
                {catalog?.images.map((image) => (
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
                {catalog?.ssh_keys.length ? (
                  catalog.ssh_keys.map((sshKey) => {
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
                  !createForm.name.trim() ||
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
    </AdminPageShell>
  );
}

import * as React from "react";
import { Globe, RefreshCw, Trash2 } from "lucide-react";
import { t } from "i18next";
import { toast } from "sonner";

import {
  Badge,
  Button,
  Dialog,
  Flex,
  IconButton,
  SegmentedControl,
  Select,
  Switch,
  TextArea,
  TextField,
} from "@/components/admin/admin-ui";
import { getCloudProviderEntries, type CloudProviderCredentialEntry } from "@/lib/cloud";
import {
  deleteClientDDNSBinding,
  getClientDDNSBinding,
  getClientDDNSCatalog,
  saveClientDDNSBinding,
  syncClientDDNSBinding,
  type ClientDDNSBinding,
} from "@/lib/clientDDNS";
import type { FailoverDnsCatalog } from "@/lib/failover";

type NodeDDNSTarget = {
  uuid: string;
  ipv4?: string;
  ipv6?: string;
};
type DDNSProvider = "cloudflare" | "aliyun";
type AddressMode = "ipv4" | "ipv6" | "dual";

type CloudflareFormState = {
  zoneName: string;
  recordName: string;
  ttl: string;
  proxied: boolean;
};

type AliyunFormState = {
  domainName: string;
  rr: string;
  ttl: string;
  line: string;
};

const DEFAULT_CLOUDFLARE_FORM: CloudflareFormState = {
  zoneName: "",
  recordName: "",
  ttl: "60",
  proxied: false,
};

const DEFAULT_ALIYUN_FORM: AliyunFormState = {
  domainName: "",
  rr: "@",
  ttl: "600",
  line: "default",
};

const NODE_DIALOG_CONTENT_CLASS =
  "max-h-[90vh] w-[min(96vw,760px)] overflow-y-auto overscroll-contain rounded-lg border border-slate-200/80 bg-card p-6 [scrollbar-gutter:stable] dark:border-slate-800 dark:bg-slate-950";
const NODE_DIALOG_SECTION_CLASS =
  "dialog-section px-4 py-4";
const NODE_DIALOG_INFO_CLASS =
  "rounded-lg border border-border/60 bg-background p-4 shadow-none";
const NODE_DIALOG_DANGER_CLASS =
  "dialog-danger px-3 py-2";

function normalizeProvider(value: string): DDNSProvider {
  return value === "aliyun" ? "aliyun" : "cloudflare";
}

function normalizeAddressMode(value: string): AddressMode {
  if (value === "ipv6" || value === "dual") {
    return value;
  }
  return "ipv4";
}

function normalizeObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  return {};
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function buildCloudflareForm(binding: ClientDDNSBinding | null): CloudflareFormState {
  const payload = normalizeObject(binding?.payload);
  return {
    zoneName: readString(payload.zone_name),
    recordName: readString(payload.record_name),
    ttl: String(readNumber(payload.ttl) || 60),
    proxied: readBoolean(payload.proxied),
  };
}

function buildAliyunForm(binding: ClientDDNSBinding | null): AliyunFormState {
  const payload = normalizeObject(binding?.payload);
  return {
    domainName: readString(payload.domain_name),
    rr: readString(payload.rr) || "@",
    ttl: String(readNumber(payload.ttl) || 600),
    line: readString(payload.line) || "default",
  };
}

function getStatusColor(status: string) {
  switch (status) {
    case "synced":
      return "green" as const;
    case "pending":
      return "amber" as const;
    case "error":
      return "red" as const;
    default:
      return "gray" as const;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "synced":
      return t("admin.nodeTable.ddns.status.synced", "Synced");
    case "pending":
      return t("admin.nodeTable.ddns.status.pending", "Pending");
    case "error":
      return t("admin.nodeTable.ddns.status.error", "Error");
    case "disabled":
      return t("admin.nodeTable.ddns.status.disabled", "Disabled");
    default:
      return status || t("admin.nodeTable.ddns.status.pending", "Pending");
  }
}

function parseTTL(value: string) {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function chooseEntryID(current: string, entries: CloudProviderCredentialEntry[]) {
  if (current && entries.some((entry) => entry.id === current)) {
    return current;
  }
  return entries[0]?.id || "";
}

export function NodeDDNSDialog({
  item,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  item: NodeDDNSTarget;
  trigger?: React.ReactNode | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const [binding, setBinding] = React.useState<ClientDDNSBinding | null>(null);
  const [provider, setProvider] = React.useState<DDNSProvider>("cloudflare");
  const [entryID, setEntryID] = React.useState("");
  const [entries, setEntries] = React.useState<CloudProviderCredentialEntry[]>([]);
  const [enabled, setEnabled] = React.useState(true);
  const [addressMode, setAddressMode] = React.useState<AddressMode>("ipv4");
  const [cloudflareForm, setCloudflareForm] = React.useState<CloudflareFormState>(DEFAULT_CLOUDFLARE_FORM);
  const [aliyunForm, setAliyunForm] = React.useState<AliyunFormState>(DEFAULT_ALIYUN_FORM);
  const [catalog, setCatalog] = React.useState<FailoverDnsCatalog | null>(null);
  const [catalogError, setCatalogError] = React.useState("");
  const [loadingBinding, setLoadingBinding] = React.useState(false);
  const [loadingEntries, setLoadingEntries] = React.useState(false);
  const [loadingCatalog, setLoadingCatalog] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const open = typeof controlledOpen === "boolean" ? controlledOpen : uncontrolledOpen;
  const setOpen = React.useCallback((nextOpen: boolean) => {
    if (typeof controlledOpen !== "boolean") {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }, [controlledOpen, onOpenChange]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadBinding = async () => {
      setLoadingBinding(true);
      try {
        const existing = await getClientDDNSBinding(item.uuid);
        if (cancelled) {
          return;
        }
        setBinding(existing);
        setEnabled(existing?.enabled ?? true);
        setProvider(normalizeProvider(existing?.provider || "cloudflare"));
        setEntryID(existing?.entry_id || "");
        setAddressMode(normalizeAddressMode(existing?.address_mode || "ipv4"));
        setCloudflareForm(buildCloudflareForm(existing));
        setAliyunForm(buildAliyunForm(existing));
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : t("admin.nodeTable.ddns.loadFailed", "Failed to load DDNS settings"),
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingBinding(false);
        }
      }
    };

    void loadBinding();

    return () => {
      cancelled = true;
    };
  }, [open, item.uuid]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadEntries = async () => {
      setLoadingEntries(true);
      try {
        const nextEntries = await getCloudProviderEntries(provider);
        if (cancelled) {
          return;
        }
        setEntries(nextEntries);
        setEntryID((current) => chooseEntryID(current, nextEntries));
      } catch (error) {
        if (!cancelled) {
          setEntries([]);
          toast.error(
            error instanceof Error
              ? error.message
              : t("admin.nodeTable.ddns.entryLoadFailed", "Failed to load credential entries"),
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingEntries(false);
        }
      }
    };

    void loadEntries();

    return () => {
      cancelled = true;
    };
  }, [open, provider]);

  React.useEffect(() => {
    if (!open || !entryID) {
      setCatalog(null);
      setCatalogError("");
      return;
    }

    let cancelled = false;

    const loadCatalog = async () => {
      setLoadingCatalog(true);
      setCatalogError("");
      try {
        const nextCatalog = await getClientDDNSCatalog({
          clientUUID: item.uuid,
          provider,
          entryID,
        });
        if (cancelled) {
          return;
        }
        setCatalog(nextCatalog);

        if (provider === "cloudflare") {
          setCloudflareForm((current) => ({
            zoneName:
              current.zoneName
              || nextCatalog.defaults.zone_name
              || nextCatalog.zones[0]?.value
              || "",
            recordName: current.recordName,
            ttl: current.ttl || nextCatalog.ttls[0]?.value || "60",
            proxied: current.proxied,
          }));
          return;
        }

        setAliyunForm((current) => ({
          domainName:
            current.domainName
            || nextCatalog.defaults.domain_name
            || nextCatalog.domains[0]?.value
            || "",
          rr: current.rr || "@",
          ttl: current.ttl || nextCatalog.ttls[0]?.value || "600",
          line: current.line || nextCatalog.lines[0]?.value || "default",
        }));
      } catch (error) {
        if (!cancelled) {
          setCatalog(null);
          setCatalogError(
            error instanceof Error
              ? error.message
              : t("admin.nodeTable.ddns.catalogLoadFailed", "Failed to load DNS catalog"),
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingCatalog(false);
        }
      }
    };

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [open, item.uuid, provider, entryID]);

  const providerLabel =
    provider === "cloudflare"
      ? t("admin.nodeTable.ddns.providers.cloudflare", "Cloudflare")
      : t("admin.nodeTable.ddns.providers.aliyun", "Aliyun DNS");

  const currentIPv4 = item.ipv4 || "-";
  const currentIPv6 = item.ipv6 || "-";
  const selectedEntryMissing = open && !loadingEntries && entries.length === 0;

  const handleSave = async () => {
    if (!entryID) {
      toast.error(t("admin.nodeTable.ddns.entryRequired", "Select a credential entry first"));
      return;
    }

    let payload: Record<string, unknown>;

    if (provider === "cloudflare") {
      const ttl = parseTTL(cloudflareForm.ttl);
      if (ttl <= 0) {
        toast.error(t("admin.nodeTable.ddns.ttlInvalid", "TTL must be greater than 0"));
        return;
      }

      payload = {
        zone_name: cloudflareForm.zoneName.trim() || catalog?.defaults.zone_name || "",
        record_name: cloudflareForm.recordName.trim(),
        ttl,
        proxied: cloudflareForm.proxied,
      };
    } else {
      const ttl = parseTTL(aliyunForm.ttl);
      if (ttl <= 0) {
        toast.error(t("admin.nodeTable.ddns.ttlInvalid", "TTL must be greater than 0"));
        return;
      }

      payload = {
        domain_name: aliyunForm.domainName.trim() || catalog?.defaults.domain_name || "",
        rr: aliyunForm.rr.trim() || "@",
        ttl,
        line: aliyunForm.line.trim() || "default",
      };
    }

    setSaving(true);
    try {
      const saved = await saveClientDDNSBinding(item.uuid, {
        enabled,
        provider,
        entry_id: entryID,
        address_mode: addressMode,
        payload,
      });
      setBinding(saved);
      toast.success(t("admin.nodeTable.ddns.saveSuccess", "DDNS settings saved"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("admin.nodeTable.ddns.saveFailed", "Failed to save DDNS settings"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const synced = await syncClientDDNSBinding(item.uuid);
      setBinding(synced);
      setEnabled(synced.enabled);
      setAddressMode(normalizeAddressMode(synced.address_mode));
      setCloudflareForm(buildCloudflareForm(synced));
      setAliyunForm(buildAliyunForm(synced));
      toast.success(t("admin.nodeTable.ddns.syncSuccess", "DDNS synced"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("admin.nodeTable.ddns.syncFailed", "Failed to sync DDNS"),
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    setRemoving(true);
    try {
      await deleteClientDDNSBinding(item.uuid);
      setBinding(null);
      toast.success(t("admin.nodeTable.ddns.deleteSuccess", "DDNS binding removed"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("admin.nodeTable.ddns.deleteFailed", "Failed to remove DDNS binding"),
      );
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {trigger === null ? null : trigger ? (
        <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      ) : (
        <Dialog.Trigger>
          <IconButton variant="ghost" title={t("admin.nodeTable.ddns.title", "DDNS")}>
            <Globe className="p-1" />
          </IconButton>
        </Dialog.Trigger>
      )}
      <Dialog.Content
        maxWidth={720}
        className={NODE_DIALOG_CONTENT_CLASS}
      >
        <Dialog.Title>{t("admin.nodeTable.ddns.title", "DDNS")}</Dialog.Title>
        <Dialog.Description>
          {t(
            "admin.nodeTable.ddns.description",
            "Bind this node to a DNS record and keep it updated when the node IP changes.",
          )}
        </Dialog.Description>

        <div className="mt-4 flex flex-col gap-4">
          <div className={NODE_DIALOG_SECTION_CLASS}>
            <div className="text-sm font-semibold">
              {t("admin.nodeTable.ddns.currentIPs", "Current node IPs")}
            </div>
            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="font-medium">IPv4: </span>
                <span>{currentIPv4}</span>
              </div>
              <div>
                <span className="font-medium">IPv6: </span>
                <span>{currentIPv6}</span>
              </div>
            </div>
          </div>

          <Flex direction="column" gap="2">
            <label className="text-sm font-semibold">
              {t("admin.nodeTable.ddns.enabled", "Enable DDNS")}
            </label>
            <div className={NODE_DIALOG_INFO_CLASS}>
              <div className="text-sm text-muted-foreground">
                {t(
                  "admin.nodeTable.ddns.enabledHint",
                  "When enabled, the server checks this node once per minute and updates the DNS record after its public IP changes.",
                )}
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </Flex>

          <div className="grid gap-4 sm:grid-cols-2">
            <Flex direction="column" gap="2">
              <label className="text-sm font-semibold">
                {t("admin.nodeTable.ddns.provider", "DNS provider")}
              </label>
              <Select.Root value={provider} onValueChange={(value) => setProvider(normalizeProvider(value))}>
                <Select.Trigger placeholder={t("admin.nodeTable.ddns.provider", "DNS provider")} />
                <Select.Content>
                  <Select.Item value="cloudflare">
                    {t("admin.nodeTable.ddns.providers.cloudflare", "Cloudflare")}
                  </Select.Item>
                  <Select.Item value="aliyun">
                    {t("admin.nodeTable.ddns.providers.aliyun", "Aliyun DNS")}
                  </Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>

            <Flex direction="column" gap="2">
              <label className="text-sm font-semibold">
                {t("admin.nodeTable.ddns.entry", "Credential entry")}
              </label>
              <Select.Root value={entryID} onValueChange={setEntryID}>
                <Select.Trigger
                  placeholder={t("admin.nodeTable.ddns.entryPlaceholder", "Select a credential entry")}
                />
                <Select.Content>
                  {entries.map((entry) => (
                    <Select.Item key={entry.id} value={entry.id}>
                      {entry.name || entry.id}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              {selectedEntryMissing ? (
                <div className="text-xs text-amber-600">
                  {t(
                    "admin.nodeTable.ddns.entryMissing",
                    "No credential entries are available for this provider yet.",
                  )}
                </div>
              ) : null}
            </Flex>
          </div>

          <Flex direction="column" gap="2">
            <label className="text-sm font-semibold">
              {t("admin.nodeTable.ddns.addressMode", "Address mode")}
            </label>
            <SegmentedControl.Root
              value={addressMode}
              onValueChange={(value) => setAddressMode(normalizeAddressMode(value))}
            >
              <SegmentedControl.Item value="ipv4">IPv4</SegmentedControl.Item>
              <SegmentedControl.Item value="ipv6">IPv6</SegmentedControl.Item>
              <SegmentedControl.Item value="dual">
                {t("admin.nodeTable.ddns.addressModeDual", "Dual-stack")}
              </SegmentedControl.Item>
            </SegmentedControl.Root>
          </Flex>

          <div className={NODE_DIALOG_SECTION_CLASS}>
            <div className="mb-3 text-sm font-semibold">
              {providerLabel}
            </div>

            {provider === "cloudflare" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Flex direction="column" gap="2">
                  <label className="text-sm font-semibold">
                    {t("admin.nodeTable.ddns.zoneName", "Zone / domain")}
                  </label>
                  {catalog?.zones.length ? (
                    <Select.Root
                      value={cloudflareForm.zoneName}
                      onValueChange={(value) =>
                        setCloudflareForm((current) => ({ ...current, zoneName: value }))
                      }
                    >
                      <Select.Trigger
                        placeholder={t("admin.nodeTable.ddns.zonePlaceholder", "Select a zone")}
                      />
                      <Select.Content>
                        {catalog.zones.map((zone) => (
                          <Select.Item key={zone.value} value={zone.value}>
                            {zone.label || zone.value}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  ) : (
                    <TextField.Root
                      value={cloudflareForm.zoneName}
                      placeholder={t("admin.nodeTable.ddns.zonePlaceholder", "example.com")}
                      onChange={(event) =>
                        setCloudflareForm((current) => ({
                          ...current,
                          zoneName: event.target.value,
                        }))
                      }
                    />
                  )}
                </Flex>

                <Flex direction="column" gap="2">
                  <label className="text-sm font-semibold">
                    {t("admin.nodeTable.ddns.recordName", "Record name")}
                  </label>
                  <TextField.Root
                    value={cloudflareForm.recordName}
                    placeholder={t("admin.nodeTable.ddns.recordPlaceholder", "@ or edge")}
                    onChange={(event) =>
                      setCloudflareForm((current) => ({
                        ...current,
                        recordName: event.target.value,
                      }))
                    }
                  />
                </Flex>

                <Flex direction="column" gap="2">
                  <label className="text-sm font-semibold">
                    {t("admin.nodeTable.ddns.ttl", "TTL")}
                  </label>
                  {catalog?.ttls.length ? (
                    <Select.Root
                      value={cloudflareForm.ttl}
                      onValueChange={(value) =>
                        setCloudflareForm((current) => ({ ...current, ttl: value }))
                      }
                    >
                      <Select.Trigger placeholder="60" />
                      <Select.Content>
                        {catalog.ttls.map((ttl) => (
                          <Select.Item key={ttl.value} value={ttl.value}>
                            {ttl.label || ttl.value}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  ) : (
                    <TextField.Root
                      value={cloudflareForm.ttl}
                      onChange={(event) =>
                        setCloudflareForm((current) => ({
                          ...current,
                          ttl: event.target.value,
                        }))
                      }
                    />
                  )}
                </Flex>

                <Flex direction="column" gap="2">
                  <label className="text-sm font-semibold">
                    {t("admin.nodeTable.ddns.proxied", "Cloudflare proxy")}
                  </label>
                  <div className={NODE_DIALOG_INFO_CLASS}>
                    <div className="text-sm text-muted-foreground">
                      {t(
                        "admin.nodeTable.ddns.proxiedHint",
                        "Turn this on only if this record should go through the Cloudflare proxy.",
                      )}
                    </div>
                    <Switch
                      checked={cloudflareForm.proxied}
                      onCheckedChange={(checked) =>
                        setCloudflareForm((current) => ({
                          ...current,
                          proxied: checked,
                        }))
                      }
                    />
                  </div>
                </Flex>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Flex direction="column" gap="2">
                  <label className="text-sm font-semibold">
                    {t("admin.nodeTable.ddns.domainName", "Domain")}
                  </label>
                  {catalog?.domains.length ? (
                    <Select.Root
                      value={aliyunForm.domainName}
                      onValueChange={(value) =>
                        setAliyunForm((current) => ({ ...current, domainName: value }))
                      }
                    >
                      <Select.Trigger
                        placeholder={t("admin.nodeTable.ddns.domainPlaceholder", "Select a domain")}
                      />
                      <Select.Content>
                        {catalog.domains.map((domain) => (
                          <Select.Item key={domain.value} value={domain.value}>
                            {domain.label || domain.value}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  ) : (
                    <TextField.Root
                      value={aliyunForm.domainName}
                      placeholder={t("admin.nodeTable.ddns.domainPlaceholder", "example.com")}
                      onChange={(event) =>
                        setAliyunForm((current) => ({
                          ...current,
                          domainName: event.target.value,
                        }))
                      }
                    />
                  )}
                </Flex>

                <Flex direction="column" gap="2">
                  <label className="text-sm font-semibold">
                    {t("admin.nodeTable.ddns.rr", "Host / RR")}
                  </label>
                  <TextField.Root
                    value={aliyunForm.rr}
                    placeholder="@"
                    onChange={(event) =>
                      setAliyunForm((current) => ({
                        ...current,
                        rr: event.target.value,
                      }))
                    }
                  />
                </Flex>

                <Flex direction="column" gap="2">
                  <label className="text-sm font-semibold">
                    {t("admin.nodeTable.ddns.line", "Line")}
                  </label>
                  {catalog?.lines.length ? (
                    <Select.Root
                      value={aliyunForm.line}
                      onValueChange={(value) =>
                        setAliyunForm((current) => ({ ...current, line: value }))
                      }
                    >
                      <Select.Trigger placeholder="default" />
                      <Select.Content>
                        {catalog.lines.map((line) => (
                          <Select.Item key={line.value} value={line.value}>
                            {line.label || line.value}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  ) : (
                    <TextField.Root
                      value={aliyunForm.line}
                      onChange={(event) =>
                        setAliyunForm((current) => ({
                          ...current,
                          line: event.target.value,
                        }))
                      }
                    />
                  )}
                </Flex>

                <Flex direction="column" gap="2">
                  <label className="text-sm font-semibold">
                    {t("admin.nodeTable.ddns.ttl", "TTL")}
                  </label>
                  {catalog?.ttls.length ? (
                    <Select.Root
                      value={aliyunForm.ttl}
                      onValueChange={(value) =>
                        setAliyunForm((current) => ({ ...current, ttl: value }))
                      }
                    >
                      <Select.Trigger placeholder="600" />
                      <Select.Content>
                        {catalog.ttls.map((ttl) => (
                          <Select.Item key={ttl.value} value={ttl.value}>
                            {ttl.label || ttl.value}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  ) : (
                    <TextField.Root
                      value={aliyunForm.ttl}
                      onChange={(event) =>
                        setAliyunForm((current) => ({
                          ...current,
                          ttl: event.target.value,
                        }))
                      }
                    />
                  )}
                </Flex>
              </div>
            )}
          </div>

          {catalogError ? (
            <div className="rounded-lg border border-amber-200/80 bg-amber-50/92 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              {catalogError}
            </div>
          ) : null}

          <div className={NODE_DIALOG_SECTION_CLASS}>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">
                {t("admin.nodeTable.ddns.syncState", "Sync status")}
              </div>
              <Badge color={getStatusColor(binding?.sync_status || (enabled ? "pending" : "disabled"))}>
                {getStatusLabel(binding?.sync_status || (enabled ? "pending" : "disabled"))}
              </Badge>
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="font-medium">
                  {t("admin.nodeTable.ddns.lastIPv4", "Last IPv4")}:
                </span>{" "}
                {binding?.last_ipv4 || "-"}
              </div>
              <div>
                <span className="font-medium">
                  {t("admin.nodeTable.ddns.lastIPv6", "Last IPv6")}:
                </span>{" "}
                {binding?.last_ipv6 || "-"}
              </div>
              <div>
                <span className="font-medium">
                  {t("admin.nodeTable.ddns.lastSyncedAt", "Last synced")}:
                </span>{" "}
                {formatDateTime(binding?.last_synced_at)}
              </div>
              <div>
                <span className="font-medium">
                  {t("admin.nodeTable.ddns.recordKey", "Record key")}:
                </span>{" "}
                {binding?.record_key || "-"}
              </div>
            </div>

            {binding?.last_error ? (
              <div className={`mt-3 ${NODE_DIALOG_DANGER_CLASS}`}>
                {binding.last_error}
              </div>
            ) : null}

            {binding?.last_result ? (
              <div className="mt-3">
                <div className="mb-2 text-sm font-medium">
                  {t("admin.nodeTable.ddns.lastResult", "Last result")}
                </div>
                <TextArea
                  disabled
                  className="min-h-[100px] rounded-lg border-border/70 bg-slate-50/90 font-mono text-xs dark:bg-slate-950"
                  value={JSON.stringify(binding.last_result, null, 2)}
                />
              </div>
            ) : null}
          </div>

          <Flex justify="between" align="center" wrap="wrap" gap="2">
            <div className="text-xs text-muted-foreground">
              {loadingBinding || loadingEntries || loadingCatalog
                ? t("admin.nodeTable.ddns.loading", "Loading DDNS data...")
                : selectedEntryMissing
                  ? t(
                      "admin.nodeTable.ddns.providerSetupHint",
                      "Add at least one DNS credential entry before enabling DDNS on this node.",
                    )
                  : t(
                      "admin.nodeTable.ddns.schedulerHint",
                      "The server checks enabled DDNS bindings once per minute.",
                    )}
            </div>

            <Flex gap="2" justify="end" wrap="wrap">
              {binding ? (
                <Button
                  color="red"
                  variant="soft"
                  disabled={removing}
                  onClick={() => {
                    void handleDelete();
                  }}
                >
                  <Trash2 size={14} />
                  {removing
                    ? t("admin.nodeTable.ddns.removing", "Removing...")
                    : t("admin.nodeTable.ddns.remove", "Remove")}
                </Button>
              ) : null}

              <Button
                variant="soft"
                disabled={!binding || syncing}
                onClick={() => {
                  void handleSync();
                }}
              >
                <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
                {syncing
                  ? t("admin.nodeTable.ddns.syncing", "Syncing...")
                  : t("admin.nodeTable.ddns.syncNow", "Sync now")}
              </Button>

              <Button
                disabled={saving || selectedEntryMissing}
                onClick={() => {
                  void handleSave();
                }}
              >
                {saving
                  ? t("admin.nodeTable.ddns.saving", "Saving...")
                  : t("admin.nodeTable.ddns.save", "Save DDNS")}
              </Button>
            </Flex>
          </Flex>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

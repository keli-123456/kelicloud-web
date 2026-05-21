import type { TFunction } from "i18next";

import type { CloudInstanceScriptTarget } from "@/components/admin/cloud/CloudInstanceScriptDialog";
import { getReadableErrorMessage } from "@/lib/apiErrorMessage";
import { COMMON_AZURE_LOCATIONS } from "@/lib/failoverV2Presets";
import type {
  AzureCatalog,
  AzureCredentialInput,
  AzureCredentialPool,
  AzureCredentialSecret,
  AzureImageReference,
  AzureInstance,
  AzureInstancePassword,
  AzureLocation,
  AzureVMSku,
  CreateAzureInstanceInput,
} from "@/lib/cloudAzure";

export type CredentialSecretState = {
  secret: AzureCredentialSecret;
};

export type SavedPasswordState = {
  instance: AzureInstance;
  credential: AzureInstancePassword;
};

export type AzureImagePreset = AzureImageReference & {
  id: string;
  label: string;
};

export type AzureCreateFormState = Omit<CreateAzureInstanceInput, "image"> & {
  image_preset: string;
  image_publisher: string;
  image_offer: string;
  image_sku: string;
  image_version: string;
};

export const azureImagePresets: AzureImagePreset[] = [
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
    id: "windows-2022",
    label: "Windows Server 2022",
    publisher: "MicrosoftWindowsServer",
    offer: "WindowsServer",
    sku: "2022-datacenter-g2",
    version: "latest",
  },
];

export const initialAzureImagePreset = azureImagePresets[0];

export const initialCreateForm: AzureCreateFormState = {
  name: "",
  resource_group: "",
  size: "",
  admin_password: "",
  user_data: "",
  public_ip: true,
  assign_ipv6: true,
  auto_connect: true,
  auto_connect_group: "",
  image_preset: initialAzureImagePreset.id,
  image_publisher: initialAzureImagePreset.publisher,
  image_offer: initialAzureImagePreset.offer,
  image_sku: initialAzureImagePreset.sku,
  image_version: initialAzureImagePreset.version || "latest",
};

export function getCreateRootPasswordMode(rootPassword: string): "custom" | "random" {
  return rootPassword.trim() ? "custom" : "random";
}

export function toErrorMessage(error: unknown) {
  return getReadableErrorMessage(error);
}

export function hasActiveCredential(pool: AzureCredentialPool | null) {
  return Boolean(pool?.active_credential_id);
}

export function getActiveCredential(pool: AzureCredentialPool | null) {
  return pool?.credentials.find((credential) => credential.id === pool.active_credential_id) || null;
}

export function normalizeLocation(location: string) {
  return location.trim().toLowerCase();
}

function getCommonAzureLocation(location: string) {
  const normalized = normalizeLocation(location);
  return COMMON_AZURE_LOCATIONS.find((item) => (
    normalizeLocation(item.value) === normalized
    || normalizeLocation(item.label) === normalized
  )) || null;
}

function getAzureLocationChineseLabel(location: string) {
  const match = getCommonAzureLocation(location);
  if (!match) return "";
  if (match.value === "southeastasia") return "新加坡";
  if (match.value === "eastasia") return "香港";
  return match.zh || "";
}

function formatAzureLocationLabel(location: string, fallbackLabel?: string) {
  const fallback = (fallbackLabel || location).trim();
  const chineseLabel = getAzureLocationChineseLabel(location || fallback);
  if (!chineseLabel) return fallback || "-";
  if (!fallback || normalizeLocation(fallback) === normalizeLocation(chineseLabel)) {
    return chineseLabel;
  }
  return `${chineseLabel} · ${fallback}`;
}

function toOptionalString(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function looksLikeGuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function buildDefaultAzureCredentialName(clientId: string) {
  const normalized = clientId.trim();
  const suffix = normalized.slice(-6).toLowerCase() || "default";
  return `azure-${suffix}`;
}

function findImportSeparator(line: string) {
  for (const separator of ["|", ",", "\t"]) {
    if (line.includes(separator)) {
      return separator;
    }
  }
  return "";
}

function normalizeImportCredentialRecord(
  record: Record<string, unknown>,
): AzureCredentialInput | null {
  const tenantId = toOptionalString(record.tenant_id || record.tenantId || record.tenant);
  const clientId = toOptionalString(record.client_id || record.clientId || record.appId || record.app_id);
  const clientSecret = toOptionalString(record.client_secret || record.clientSecret || record.password);
  const subscriptionId = toOptionalString(record.subscription_id || record.subscriptionId || record.subscription);
  if (!tenantId || !clientId || !clientSecret) return null;

  const name = toOptionalString(
    record.name || record.displayName || record.display_name || record.login_user || record.loginUser,
  )
    || buildDefaultAzureCredentialName(clientId);
  const group = toOptionalString(record.group || record.credential_group || record.credentialGroup);
  const defaultLocation = normalizeLocation(
    toOptionalString(record.default_location || record.defaultLocation || record.location),
  );

  return {
    name,
    group,
    tenant_id: tenantId,
    client_id: clientId,
    client_secret: clientSecret,
    subscription_id: subscriptionId,
    default_location: defaultLocation,
  };
}

export function parseCredentialImports(text: string): AzureCredentialInput[] {
  const credentials: AzureCredentialInput[] = [];
  const seen = new Set<string>();

  const pushCredential = (credential: AzureCredentialInput | null) => {
    if (!credential) return;
    if (!credential.tenant_id || !credential.client_id || !credential.client_secret) return;
    const key = `${credential.tenant_id}|${credential.client_id}|${credential.subscription_id || ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    credentials.push(credential);
  };

  const trimmedText = text.trim();
  if (trimmedText) {
    const startsWithJSON = trimmedText.startsWith("{") || trimmedText.startsWith("[");
    if (startsWithJSON) {
      try {
        const parsed = JSON.parse(trimmedText);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && typeof item === "object") {
              pushCredential(normalizeImportCredentialRecord(item as Record<string, unknown>));
            }
          }
          if (credentials.length > 0) return credentials;
        } else if (parsed && typeof parsed === "object") {
          pushCredential(normalizeImportCredentialRecord(parsed as Record<string, unknown>));
          if (credentials.length > 0) return credentials;
        }
      } catch {
        // fallback to line-based parser
      }
    }
  }

  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("{") && line.endsWith("}")) {
      try {
        const parsedLine = JSON.parse(line);
        if (parsedLine && typeof parsedLine === "object") {
          pushCredential(normalizeImportCredentialRecord(parsedLine as Record<string, unknown>));
          continue;
        }
      } catch {
        // continue with delimited parser
      }
    }

    const separator = findImportSeparator(line);
    if (!separator) continue;

    const parts = line.split(separator).map((part) => part.trim());
    if (parts.length < 3) continue;

    let name = "";
    let tenantId = "";
    let clientId = "";
    let clientSecret = "";
    let subscriptionId = "";
    let defaultLocation = "";
    let group = "";

    if (parts.length >= 7) {
      [name, group, tenantId, clientId, clientSecret, subscriptionId, defaultLocation] = parts;
    } else if (parts.length >= 6) {
      [name, tenantId, clientId, clientSecret, subscriptionId, defaultLocation] = parts;
    } else if (parts.length === 5) {
      if (looksLikeGuid(parts[0]) && looksLikeGuid(parts[1])) {
        [tenantId, clientId, clientSecret, subscriptionId, defaultLocation] = parts;
      } else {
        [name, tenantId, clientId, clientSecret, subscriptionId] = parts;
      }
    } else if (parts.length === 4) {
      if (looksLikeGuid(parts[0]) && looksLikeGuid(parts[1])) {
        [tenantId, clientId, clientSecret, subscriptionId] = parts;
      } else {
        [name, tenantId, clientId, clientSecret] = parts;
      }
    } else {
      [tenantId, clientId, clientSecret] = parts;
    }

    if (!tenantId || !clientId || !clientSecret) {
      continue;
    }

    pushCredential({
      name: name || buildDefaultAzureCredentialName(clientId),
      group,
      tenant_id: tenantId,
      client_id: clientId,
      client_secret: clientSecret,
      subscription_id: subscriptionId,
      default_location: normalizeLocation(defaultLocation || ""),
    });
  }

  return credentials;
}

export function getCredentialStatusColor(status: string) {
  switch (status) {
    case "healthy":
      return "green";
    case "error":
      return "red";
    default:
      return "gray";
  }
}

export function getInstanceStateColor(instance: AzureInstance) {
  const value = (instance.power_state || instance.provisioning_state).trim().toLowerCase();
  if (value === "running") return "green";
  if (value === "deallocated" || value === "stopped") return "amber";
  if (value === "succeeded") return "blue";
  if (value.includes("fail")) return "red";
  return "gray";
}

export function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function formatList(values: string[]) {
  return values.length ? values.join(", ") : "-";
}

export function getLocationLabel(catalog: AzureCatalog | null, location: string) {
  const normalized = normalizeLocation(location);
  const match = catalog?.locations.find((item) => normalizeLocation(item.name) === normalized) || null;
  if (!match) return formatAzureLocationLabel(normalized || location);
  return formatAzureLocationOption(match);
}

export function formatAzureLocationOption(location: AzureLocation) {
  return formatAzureLocationLabel(
    location.name,
    location.regionalDisplayName || location.displayName || location.name,
  );
}

export function getInstanceAddresses(instance: AzureInstance) {
  return Array.from(new Set([...instance.public_ips, ...instance.private_ips].filter(Boolean)));
}

export function getDefaultGroupHint(credentialName: string) {
  const normalized = credentialName.trim() || "default";
  return `azure/${normalized}`;
}

export function buildCreateFormFromPreset(
  presetId: string,
  previous?: AzureCreateFormState,
): AzureCreateFormState {
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

export function formatAzureSizeOption(size: AzureVMSku) {
  const parts = [size.name];
  if (size.vcpus > 0) parts.push(`${size.vcpus} vCPU`);
  if (size.memory_gb > 0) {
    const memory = Number.isInteger(size.memory_gb)
      ? String(size.memory_gb)
      : size.memory_gb.toFixed(1);
    parts.push(`${memory} GB RAM`);
  }
  return parts.join(" · ");
}

export function getDefaultAzureSize(catalog: AzureCatalog | null) {
  const preferred = ["Standard_B1s", "Standard_B2s", "Standard_D2s_v5"];
  for (const name of preferred) {
    const match = catalog?.sizes.find((item) => item.name === name);
    if (match) return match.name;
  }
  return catalog?.sizes[0]?.name || "";
}

export function buildScriptTarget(
  t: TFunction,
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

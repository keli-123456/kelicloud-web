import type { TFunction } from "i18next";

import type {
  CreateDigitalOceanDropletInput,
  DigitalOceanDroplet,
  DigitalOceanDropletPassword,
  DigitalOceanImage,
  DigitalOceanManagedSSHKeyMaterial,
  DigitalOceanTokenInput,
  DigitalOceanTokenPool,
  DigitalOceanTokenSecret,
} from "@/lib/cloud";

export type CreateDropletFormState = Omit<CreateDigitalOceanDropletInput, "tags" | "root_password_mode"> & {
  tagsText: string;
};

export type DropletAccessSecrets = {
  droplet: DigitalOceanDroplet;
  rootPassword: string;
  passwordMode: "custom" | "random";
  managedSSHKey: DigitalOceanManagedSSHKeyMaterial | null;
  passwordSaved: boolean;
  passwordSaveError: string;
};

export type SavedDropletPasswordState = {
  droplet: DigitalOceanDroplet;
  credential: DigitalOceanDropletPassword;
};

export type TokenSecretState = {
  secret: DigitalOceanTokenSecret;
};

export const initialCreateForm: CreateDropletFormState = {
  name: "",
  region: "",
  size: "",
  image: "",
  backups: false,
  ipv6: true,
  monitoring: true,
  user_data: "",
  vpc_uuid: "",
  root_password: "",
  auto_connect: true,
  auto_connect_group: "",
  tagsText: "",
};

export const DIGITALOCEAN_LAST_TOKEN_GROUP_STORAGE_KEY = "komari-digitalocean-last-token-group";

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

export function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

export function getStoredTokenGroup() {
  try {
    return window.localStorage.getItem(DIGITALOCEAN_LAST_TOKEN_GROUP_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function setStoredTokenGroup(value: string) {
  try {
    const normalized = value.trim();
    if (normalized) {
      window.localStorage.setItem(DIGITALOCEAN_LAST_TOKEN_GROUP_STORAGE_KEY, normalized);
      return;
    }
    window.localStorage.removeItem(DIGITALOCEAN_LAST_TOKEN_GROUP_STORAGE_KEY);
  } catch {
    // ignore storage write failures
  }
}

export function hasActiveToken(pool: DigitalOceanTokenPool | null) {
  return Boolean(pool?.active_token_id);
}

export function getActiveToken(pool: DigitalOceanTokenPool | null) {
  return pool?.tokens.find((token) => token.id === pool.active_token_id) || null;
}

export function getDefaultAutoConnectGroup(provider: string, credentialName: string) {
  const normalizedProvider = provider.trim().toLowerCase() || "cloud";
  const normalizedCredentialName = credentialName.trim() || "default";
  return `${normalizedProvider}/${normalizedCredentialName}`;
}

export function parseTags(tagsText: string) {
  return tagsText
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function getCreateRootPasswordMode(rootPassword: string): "custom" | "random" {
  return rootPassword.trim() ? "custom" : "random";
}

export function getDropletPrimaryIp(droplet: DigitalOceanDroplet) {
  const ipv4 = droplet.networks.v4.find((network) => network.type === "public");
  if (ipv4?.ip_address) return ipv4.ip_address;
  const ipv6 = droplet.networks.v6.find((network) => network.type === "public");
  return ipv6?.ip_address || "-";
}

export function getDropletMatchAddresses(droplet: DigitalOceanDroplet) {
  return [
    ...droplet.networks.v4
      .filter((network) => network.type === "public")
      .map((network) => network.ip_address),
    ...droplet.networks.v6
      .filter((network) => network.type === "public")
      .map((network) => network.ip_address),
  ].filter(Boolean);
}

export function getDropletStatusColor(status: string) {
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

export function getTokenStatusColor(status: string) {
  switch (status) {
    case "healthy":
      return "green";
    case "error":
      return "red";
    default:
      return "gray";
  }
}

export function isDigitalOceanLockedMessage(message: string) {
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

export function getDigitalOceanStatusSummary(
  status: string,
  message: string,
  t: TFunction,
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

export function formatMonthlyPrice(droplet: DigitalOceanDroplet) {
  const monthly = droplet.size?.price_monthly ?? 0;
  return `$${monthly.toFixed(2)}`;
}

export function getImageValue(image: DigitalOceanImage) {
  return image.slug || String(image.id);
}

export function getImageLabel(image: DigitalOceanImage) {
  const distro = image.distribution?.trim();
  const name = image.name?.trim();
  if (distro && name) return `${distro} / ${name}`;
  return name || distro || image.slug || String(image.id);
}

export function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function formatList(values: Array<string | number>) {
  if (!values.length) return "-";
  return values.join(", ");
}

function getRegionPrefix(slug: string) {
  return slug.toLowerCase().replace(/[0-9]+$/, "");
}

function getRegionCountryLabel(slug: string, t: TFunction) {
  const countryCode = DIGITALOCEAN_REGION_COUNTRIES[getRegionPrefix(slug)];
  if (!countryCode) return "";
  return t(`cloud.region_countries.${countryCode}`, countryCode.toUpperCase());
}

export function getRegionOptionLabel(
  region: { slug: string; name: string } | null | undefined,
  t: TFunction,
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

export function parseTokenImports(text: string): DigitalOceanTokenInput[] {
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

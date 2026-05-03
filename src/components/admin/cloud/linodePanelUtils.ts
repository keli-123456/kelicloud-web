import type { TFunction } from "i18next";

import type {
  CreateLinodeInstanceInput,
  LinodeCatalog,
  LinodeInstance,
  LinodeInstancePassword,
  LinodeTokenInput,
  LinodeTokenPool,
  LinodeTokenRecord,
  LinodeTokenSecret,
} from "@/lib/cloudLinode";

export type CreateFormState = Omit<CreateLinodeInstanceInput, "tags" | "root_password_mode"> & {
  tagsText: string;
};

export type TokenSecretState = {
  secret: LinodeTokenSecret;
};

export type SavedPasswordState = {
  instance: LinodeInstance;
  credential: LinodeInstancePassword;
};

export type CreatedPasswordState = {
  instance: LinodeInstance;
  rootPassword: string;
  passwordMode: "custom" | "random";
  passwordSaved: boolean;
  passwordSaveError: string;
};

export type DetailActionPasswordState = {
  mode: "custom" | "random";
  password: string;
};

export const SELECT_NONE = "__none__";
export const LINODE_LAST_TOKEN_GROUP_STORAGE_KEY = "komari-linode-last-token-group";

export const initialCreateForm: CreateFormState = {
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

export function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

export function getStoredTokenGroup() {
  try {
    return window.localStorage.getItem(LINODE_LAST_TOKEN_GROUP_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function setStoredTokenGroup(value: string) {
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

export function hasActiveToken(pool: LinodeTokenPool | null) {
  return Boolean(pool?.active_token_id);
}

export function getActiveToken(pool: LinodeTokenPool | null) {
  return pool?.tokens.find((token) => token.id === pool.active_token_id) || null;
}

export function getDefaultAutoConnectGroup(provider: string, credentialName: string) {
  const normalizedProvider = provider.trim().toLowerCase() || "cloud";
  const normalizedCredentialName = credentialName.trim() || "default";
  return `${normalizedProvider}/${normalizedCredentialName}`;
}

export function getCreateRootPasswordMode(rootPassword: string): "custom" | "random" {
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

export function parseTokenImports(text: string): LinodeTokenInput[] {
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

export function parseTags(tagsText: string) {
  return tagsText
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function formatUsdCurrency(value: number) {
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

export function formatList(values: Array<string | number>) {
  if (!values.length) return "-";
  return values.join(", ");
}

export function getLinodeCountryLabel(
  region: Pick<LinodeCatalog["regions"][number], "country"> | null | undefined,
  t: TFunction,
) {
  const rawCountry = region?.country?.trim();
  if (!rawCountry) return "";

  const normalizedCountry = rawCountry.toLowerCase();
  if (/^[a-z]{2,3}$/.test(normalizedCountry)) {
    return t(`cloud.region_countries.${normalizedCountry}`, rawCountry.toUpperCase());
  }

  return rawCountry;
}

export function getLinodeRegionOptionLabel(
  region: LinodeCatalog["regions"][number] | null | undefined,
  t: TFunction,
) {
  if (!region?.id) return region?.label || "-";
  const country = getLinodeCountryLabel(region, t);
  if (!country) return `${region.id} / ${region.label}`;
  return `${region.id} (${country}) / ${region.label}`;
}

export function getLinodeTypeOptionLabel(type: LinodeCatalog["types"][number] | null | undefined) {
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

export function getStatusColor(status: string) {
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

export function isLinodeRestrictedMessage(message: string) {
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

export function isRestrictedLinodeToken(token: LinodeTokenRecord) {
  return token.last_status === "error" && isLinodeRestrictedMessage(token.last_error);
}

export function getLinodeStatusSummary(
  message: string,
  t: TFunction,
) {
  const normalizedMessage = message.trim();
  if (!normalizedMessage) return "";
  if (isLinodeRestrictedMessage(normalizedMessage)) {
    return t("cloud.providers.linode.restricted", "Restricted");
  }
  return normalizedMessage;
}

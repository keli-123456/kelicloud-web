import { formatApiErrorMessage } from "@/lib/apiErrorMessage";

export class CloudApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(formatApiErrorMessage(message, { status }));
    this.name = "CloudApiError";
    this.status = status;
  }
}

type ApiEnvelope<T> = {
  status: string;
  message: string;
  data: T;
};

export type CloudProviderField = {
  name: string;
  required: boolean;
  type: string;
  options?: string;
  default?: string;
  help?: string;
};

export type CloudProviderCredentialEntry = {
  id: string;
  name: string;
  values: Record<string, unknown>;
};

export type DigitalOceanAccount = {
  uuid: string;
  email: string;
  email_verified: boolean;
  droplet_limit: number;
  status: string;
  status_message: string;
};

export type DigitalOceanTokenInput = {
  id?: string;
  name: string;
  group?: string;
  token: string;
};

export type DigitalOceanTokenRecord = {
  id: string;
  name: string;
  group: string;
  masked_token: string;
  account_email: string;
  account_uuid: string;
  droplet_limit: number;
  last_status: string;
  last_error: string;
  last_checked_at: string;
  managed_ssh_key_name: string;
  managed_ssh_key_fingerprint: string;
  managed_ssh_key_ready: boolean;
  is_active: boolean;
};

export type DigitalOceanTokenPool = {
  active_token_id: string;
  password_storage_enabled: boolean;
  tokens: DigitalOceanTokenRecord[];
};

export type DigitalOceanManagedSSHKeyMaterial = {
  token_id: string;
  token_name: string;
  key_id: number;
  name: string;
  fingerprint: string;
  public_key: string;
  private_key: string;
};

export type DigitalOceanTokenSecret = {
  token_id: string;
  token_name: string;
  token: string;
  masked_token: string;
  account_email: string;
};

export type DigitalOceanRegion = {
  name: string;
  slug: string;
  available: boolean;
  features: string[];
  sizes: string[];
};

export type DigitalOceanSize = {
  slug: string;
  memory: number;
  vcpus: number;
  disk: number;
  transfer: number;
  price_monthly: number;
  price_hourly: number;
  available: boolean;
  regions: string[];
  description: string;
};

export type DigitalOceanImage = {
  id: number;
  name: string;
  type: string;
  distribution: string;
  slug: string;
  public: boolean;
  regions: string[];
  min_disk_size: number;
  description: string;
};

export type DigitalOceanSSHKey = {
  id: number;
  name: string;
  fingerprint: string;
  public_key: string;
};

export type DigitalOceanNetworkV4 = {
  ip_address: string;
  netmask: string;
  gateway: string;
  type: string;
};

export type DigitalOceanNetworkV6 = {
  ip_address: string;
  netmask: number;
  gateway: string;
  type: string;
};

export type DigitalOceanDroplet = {
  id: number;
  name: string;
  memory: number;
  vcpus: number;
  disk: number;
  locked: boolean;
  status: string;
  created_at: string;
  features: string[];
  backup_ids: number[];
  snapshot_ids: number[];
  size_slug: string;
  volume_ids: string[];
  vpc_uuid: string;
  tags: string[];
  image: DigitalOceanImage;
  region: DigitalOceanRegion;
  size: DigitalOceanSize;
  networks: {
    v4: DigitalOceanNetworkV4[];
    v6: DigitalOceanNetworkV6[];
  };
  saved_root_password: boolean;
  saved_root_password_updated_at: string;
};

export type DigitalOceanDropletPassword = {
  droplet_id: number;
  droplet_name: string;
  username: string;
  password_mode: string;
  root_password: string;
  updated_at: string;
};

export type DigitalOceanAction = {
  id: number;
  status: string;
  type: string;
  started_at: string;
  completed_at: string;
  resource_id: number;
  resource_type: string;
};

export type DigitalOceanCatalog = {
  regions: DigitalOceanRegion[];
  sizes: DigitalOceanSize[];
  images: DigitalOceanImage[];
  ssh_keys: DigitalOceanSSHKey[];
};

export type CreateDigitalOceanDropletInput = {
  name?: string;
  region: string;
  size: string;
  image: string;
  backups: boolean;
  ipv6: boolean;
  monitoring: boolean;
  tags: string[];
  user_data: string;
  vpc_uuid: string;
  root_password_mode: "custom" | "random";
  root_password: string;
  auto_connect: boolean;
  auto_connect_group: string;
};

export type CreateDigitalOceanDropletResult = {
  droplet: DigitalOceanDroplet;
  generated_password: string;
  managed_ssh_key: DigitalOceanManagedSSHKeyMaterial | null;
  password_saved: boolean;
  password_save_error: string;
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeTokenRecord(
  token: Partial<DigitalOceanTokenRecord> | null | undefined,
): DigitalOceanTokenRecord {
  return {
    id: String(token?.id || ""),
    name: String(token?.name || ""),
    group: String(token?.group || ""),
    masked_token: String(token?.masked_token || ""),
    account_email: String(token?.account_email || ""),
    account_uuid: String(token?.account_uuid || ""),
    droplet_limit: Number(token?.droplet_limit || 0),
    last_status: String(token?.last_status || "unknown"),
    last_error: String(token?.last_error || ""),
    last_checked_at: String(token?.last_checked_at || ""),
    managed_ssh_key_name: String(token?.managed_ssh_key_name || ""),
    managed_ssh_key_fingerprint: String(token?.managed_ssh_key_fingerprint || ""),
    managed_ssh_key_ready: Boolean(token?.managed_ssh_key_ready),
    is_active: Boolean(token?.is_active),
  };
}

function normalizeManagedSSHKey(
  key: Partial<DigitalOceanManagedSSHKeyMaterial> | null | undefined,
): DigitalOceanManagedSSHKeyMaterial {
  return {
    token_id: String(key?.token_id || ""),
    token_name: String(key?.token_name || ""),
    key_id: Number(key?.key_id || 0),
    name: String(key?.name || ""),
    fingerprint: String(key?.fingerprint || ""),
    public_key: String(key?.public_key || ""),
    private_key: String(key?.private_key || ""),
  };
}

function normalizeTokenSecret(
  token: Partial<DigitalOceanTokenSecret> | null | undefined,
): DigitalOceanTokenSecret {
  return {
    token_id: String(token?.token_id || ""),
    token_name: String(token?.token_name || ""),
    token: String(token?.token || ""),
    masked_token: String(token?.masked_token || ""),
    account_email: String(token?.account_email || ""),
  };
}

function normalizeNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is number => typeof item === "number");
}

function normalizeRegion(region: Partial<DigitalOceanRegion> | null | undefined): DigitalOceanRegion {
  return {
    name: String(region?.name || ""),
    slug: String(region?.slug || ""),
    available: Boolean(region?.available),
    features: normalizeStringArray(region?.features),
    sizes: normalizeStringArray(region?.sizes),
  };
}

function normalizeSize(size: Partial<DigitalOceanSize> | null | undefined): DigitalOceanSize {
  return {
    slug: String(size?.slug || ""),
    memory: Number(size?.memory || 0),
    vcpus: Number(size?.vcpus || 0),
    disk: Number(size?.disk || 0),
    transfer: Number(size?.transfer || 0),
    price_monthly: Number(size?.price_monthly || 0),
    price_hourly: Number(size?.price_hourly || 0),
    available: Boolean(size?.available),
    regions: normalizeStringArray(size?.regions),
    description: String(size?.description || ""),
  };
}

function normalizeImage(image: Partial<DigitalOceanImage> | null | undefined): DigitalOceanImage {
  return {
    id: Number(image?.id || 0),
    name: String(image?.name || ""),
    type: String(image?.type || ""),
    distribution: String(image?.distribution || ""),
    slug: String(image?.slug || ""),
    public: Boolean(image?.public),
    regions: normalizeStringArray(image?.regions),
    min_disk_size: Number(image?.min_disk_size || 0),
    description: String(image?.description || ""),
  };
}

function normalizeSSHKey(key: Partial<DigitalOceanSSHKey> | null | undefined): DigitalOceanSSHKey {
  return {
    id: Number(key?.id || 0),
    name: String(key?.name || ""),
    fingerprint: String(key?.fingerprint || ""),
    public_key: String(key?.public_key || ""),
  };
}

function normalizeDroplet(droplet: Partial<DigitalOceanDroplet> | null | undefined): DigitalOceanDroplet {
  const networks = (droplet?.networks as
    | {
        v4?: Array<Partial<DigitalOceanNetworkV4> | null | undefined>;
        v6?: Array<Partial<DigitalOceanNetworkV6> | null | undefined>;
      }
    | undefined) || {};
  const rawV4 = Array.isArray(networks.v4) ? networks.v4 : [];
  const rawV6 = Array.isArray(networks.v6) ? networks.v6 : [];

  return {
    id: Number(droplet?.id || 0),
    name: String(droplet?.name || ""),
    memory: Number(droplet?.memory || 0),
    vcpus: Number(droplet?.vcpus || 0),
    disk: Number(droplet?.disk || 0),
    locked: Boolean(droplet?.locked),
    status: String(droplet?.status || ""),
    created_at: String(droplet?.created_at || ""),
    features: normalizeStringArray(droplet?.features),
    backup_ids: normalizeNumberArray(droplet?.backup_ids),
    snapshot_ids: normalizeNumberArray(droplet?.snapshot_ids),
    size_slug: String(droplet?.size_slug || ""),
    volume_ids: normalizeStringArray(droplet?.volume_ids),
    vpc_uuid: String(droplet?.vpc_uuid || ""),
    tags: normalizeStringArray(droplet?.tags),
    image: normalizeImage(droplet?.image),
    region: normalizeRegion(droplet?.region),
    size: normalizeSize(droplet?.size),
    networks: {
      v4: rawV4.map((network: Partial<DigitalOceanNetworkV4> | null | undefined) => ({
        ip_address: String(network?.ip_address || ""),
        netmask: String(network?.netmask || ""),
        gateway: String(network?.gateway || ""),
        type: String(network?.type || ""),
      })),
      v6: rawV6.map((network: Partial<DigitalOceanNetworkV6> | null | undefined) => ({
        ip_address: String(network?.ip_address || ""),
        netmask: Number(network?.netmask || 0),
        gateway: String(network?.gateway || ""),
        type: String(network?.type || ""),
      })),
    },
    saved_root_password: Boolean((droplet as { saved_root_password?: unknown } | null | undefined)?.saved_root_password),
    saved_root_password_updated_at: String(
      (droplet as { saved_root_password_updated_at?: unknown } | null | undefined)?.saved_root_password_updated_at || "",
    ),
  };
}

function normalizeDropletPassword(
  password: Partial<DigitalOceanDropletPassword> | null | undefined,
): DigitalOceanDropletPassword {
  return {
    droplet_id: Number(password?.droplet_id || 0),
    droplet_name: String(password?.droplet_name || ""),
    username: String(password?.username || "root"),
    password_mode: String(password?.password_mode || ""),
    root_password: String(password?.root_password || ""),
    updated_at: String(password?.updated_at || ""),
  };
}

async function requestCloud<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const requestUrl =
    method === "GET"
      ? `${path}${path.includes("?") ? "&" : "?"}__ts=${Date.now()}`
      : path;

  const response = await fetch(requestUrl, {
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache, no-store, max-age=0",
      Pragma: "no-cache",
      "X-Requested-With": "XMLHttpRequest",
      ...(init?.headers || {}),
    },
    ...init,
  });
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  const trimmed = text.trim();
  let payload: ApiEnvelope<T> | null = null;

  if (trimmed) {
    const looksLikeJson =
      contentType.includes("application/json")
      || trimmed.startsWith("{")
      || trimmed.startsWith("[");

    if (!looksLikeJson) {
      throw new CloudApiError(
        `Expected JSON from ${path}, but received HTML or another unexpected response${response.url ? ` (${response.url})` : ""}. Check whether the backend route exists, whether the session is still valid, and whether a stale service worker or proxy is returning index.html.`,
        response.status,
      );
    }

    try {
      payload = JSON.parse(trimmed) as ApiEnvelope<T>;
    } catch {
      throw new CloudApiError(`Invalid JSON response from ${path}`, response.status);
    }
  }

  if (!response.ok || payload?.status === "error") {
    throw new CloudApiError(
      payload?.message || `HTTP ${response.status}`,
      response.status,
    );
  }

  return payload?.data as T;
}

export async function getCloudProviders(): Promise<Record<string, CloudProviderField[]>> {
  return requestCloud<Record<string, CloudProviderField[]>>("/api/admin/cloud/providers");
}

function normalizeCloudProviderCredentialEntry(
  entry: Partial<CloudProviderCredentialEntry> | null | undefined,
): CloudProviderCredentialEntry {
  return {
    id: String(entry?.id || ""),
    name: String(entry?.name || ""),
    values:
      entry?.values && typeof entry.values === "object"
        ? { ...(entry.values as Record<string, unknown>) }
        : {},
  };
}

export async function getCloudProviderEntries(
  provider: string,
): Promise<CloudProviderCredentialEntry[]> {
  const data = await requestCloud<{
    name: string;
    entries?: Array<Partial<CloudProviderCredentialEntry>>;
    addition?: string;
  }>(
    `/api/admin/cloud/providers/${provider}`,
  );

  if (Array.isArray(data?.entries)) {
    return data.entries.map(normalizeCloudProviderCredentialEntry);
  }

  if (!data?.addition) {
    return [];
  }

  const parsed = JSON.parse(data.addition) as Record<string, unknown> | null;
  if (!parsed || typeof parsed !== "object") {
    return [];
  }

  return [{
    id: "default",
    name: "Default",
    values: parsed,
  }];
}

export async function saveCloudProviderEntries(
  provider: string,
  entries: CloudProviderCredentialEntry[],
): Promise<CloudProviderCredentialEntry[]> {
  const data = await requestCloud<{
    name: string;
    entries?: Array<Partial<CloudProviderCredentialEntry>>;
  }>(
    `/api/admin/cloud/providers/${provider}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entries,
      }),
    },
  );

  if (!Array.isArray(data?.entries)) {
    return entries.map(normalizeCloudProviderCredentialEntry);
  }

  return data.entries.map(normalizeCloudProviderCredentialEntry);
}

export async function getCloudProviderValues(
  provider: string,
): Promise<Record<string, unknown>> {
  const entries = await getCloudProviderEntries(provider);
  return entries[0]?.values || {};
}

export async function saveCloudProviderValues(
  provider: string,
  values: Record<string, unknown>,
): Promise<void> {
  await saveCloudProviderEntries(provider, [{
    id: "default",
    name: "Default",
    values,
  }]);
}

export async function getDigitalOceanAccount(): Promise<DigitalOceanAccount> {
  return requestCloud<DigitalOceanAccount>("/api/admin/cloud/digitalocean/account");
}

export async function getDigitalOceanTokens(): Promise<DigitalOceanTokenPool> {
  const data = await requestCloud<Partial<DigitalOceanTokenPool>>(
    "/api/admin/cloud/digitalocean/tokens",
  );

  return {
    active_token_id: String(data?.active_token_id || ""),
    password_storage_enabled: Boolean(data?.password_storage_enabled),
    tokens: Array.isArray(data?.tokens) ? data.tokens.map(normalizeTokenRecord) : [],
  };
}

export async function saveDigitalOceanTokens(
  input: {
    tokens: DigitalOceanTokenInput[];
    active_token_id?: string;
  },
): Promise<DigitalOceanTokenPool> {
  const data = await requestCloud<Partial<DigitalOceanTokenPool>>(
    "/api/admin/cloud/digitalocean/tokens",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return {
    active_token_id: String(data?.active_token_id || ""),
    password_storage_enabled: Boolean(data?.password_storage_enabled),
    tokens: Array.isArray(data?.tokens) ? data.tokens.map(normalizeTokenRecord) : [],
  };
}

export async function setDigitalOceanActiveToken(tokenId: string): Promise<DigitalOceanTokenPool> {
  const data = await requestCloud<Partial<DigitalOceanTokenPool>>(
    "/api/admin/cloud/digitalocean/tokens/active",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token_id: tokenId }),
    },
  );

  return {
    active_token_id: String(data?.active_token_id || ""),
    password_storage_enabled: Boolean(data?.password_storage_enabled),
    tokens: Array.isArray(data?.tokens) ? data.tokens.map(normalizeTokenRecord) : [],
  };
}

export async function checkDigitalOceanTokens(tokenIds?: string[]): Promise<DigitalOceanTokenPool> {
  const data = await requestCloud<Partial<DigitalOceanTokenPool>>(
    "/api/admin/cloud/digitalocean/tokens/check",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tokenIds?.length ? { token_ids: tokenIds } : {}),
    },
  );

  return {
    active_token_id: String(data?.active_token_id || ""),
    password_storage_enabled: Boolean(data?.password_storage_enabled),
    tokens: Array.isArray(data?.tokens) ? data.tokens.map(normalizeTokenRecord) : [],
  };
}

export async function deleteDigitalOceanToken(tokenId: string): Promise<DigitalOceanTokenPool> {
  const data = await requestCloud<Partial<DigitalOceanTokenPool>>(
    `/api/admin/cloud/digitalocean/tokens/${tokenId}`,
    {
      method: "DELETE",
    },
  );

  return {
    active_token_id: String(data?.active_token_id || ""),
    password_storage_enabled: Boolean(data?.password_storage_enabled),
    tokens: Array.isArray(data?.tokens) ? data.tokens.map(normalizeTokenRecord) : [],
  };
}

export async function getDigitalOceanManagedSSHKey(
  tokenId: string,
): Promise<DigitalOceanManagedSSHKeyMaterial> {
  const data = await requestCloud<Partial<DigitalOceanManagedSSHKeyMaterial>>(
    `/api/admin/cloud/digitalocean/tokens/${tokenId}/managed-ssh-key`,
  );
  return normalizeManagedSSHKey(data);
}

export async function getDigitalOceanTokenSecret(
  tokenId: string,
): Promise<DigitalOceanTokenSecret> {
  const data = await requestCloud<Partial<DigitalOceanTokenSecret>>(
    `/api/admin/cloud/digitalocean/tokens/${tokenId}/secret`,
  );
  return normalizeTokenSecret(data);
}

export async function getDigitalOceanCatalog(): Promise<DigitalOceanCatalog> {
  const data = await requestCloud<Partial<DigitalOceanCatalog>>(
    "/api/admin/cloud/digitalocean/catalog",
  );

  return {
    regions: Array.isArray(data?.regions) ? data.regions.map(normalizeRegion) : [],
    sizes: Array.isArray(data?.sizes) ? data.sizes.map(normalizeSize) : [],
    images: Array.isArray(data?.images) ? data.images.map(normalizeImage) : [],
    ssh_keys: Array.isArray(data?.ssh_keys) ? data.ssh_keys.map(normalizeSSHKey) : [],
  };
}

export async function listDigitalOceanDroplets(): Promise<DigitalOceanDroplet[]> {
  const data = await requestCloud<Partial<DigitalOceanDroplet>[]>(
    "/api/admin/cloud/digitalocean/droplets",
  );
  return Array.isArray(data) ? data.map(normalizeDroplet) : [];
}

export async function createDigitalOceanDroplet(
  input: CreateDigitalOceanDropletInput,
): Promise<CreateDigitalOceanDropletResult> {
  const data = await requestCloud<{
    droplet?: Partial<DigitalOceanDroplet> | null;
    generated_password?: string;
    managed_ssh_key?: Partial<DigitalOceanManagedSSHKeyMaterial> | null;
    password_saved?: boolean;
    password_save_error?: string;
  }>(
    "/api/admin/cloud/digitalocean/droplets",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return {
    droplet: normalizeDroplet(data?.droplet),
    generated_password: String(data?.generated_password || ""),
    managed_ssh_key: data?.managed_ssh_key ? normalizeManagedSSHKey(data.managed_ssh_key) : null,
    password_saved: Boolean(data?.password_saved),
    password_save_error: String(data?.password_save_error || ""),
  };
}

export async function getDigitalOceanDropletPassword(
  dropletId: number,
): Promise<DigitalOceanDropletPassword> {
  const data = await requestCloud<Partial<DigitalOceanDropletPassword>>(
    `/api/admin/cloud/digitalocean/droplets/${dropletId}/password`,
  );
  return normalizeDropletPassword(data);
}

export async function deleteDigitalOceanDroplet(dropletId: number): Promise<void> {
  await requestCloud(`/api/admin/cloud/digitalocean/droplets/${dropletId}`, {
    method: "DELETE",
  });
}

export async function postDigitalOceanDropletAction(
  dropletId: number,
  type: string,
): Promise<DigitalOceanAction> {
  return requestCloud<DigitalOceanAction>(
    `/api/admin/cloud/digitalocean/droplets/${dropletId}/actions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type }),
    },
  );
}

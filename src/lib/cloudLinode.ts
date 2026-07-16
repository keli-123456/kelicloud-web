import { formatApiErrorMessage } from "@/lib/apiErrorMessage";

type ApiEnvelope<T> = {
  status: string;
  message: string;
  data: T;
};

class CloudApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(formatApiErrorMessage(message, { status }));
    this.name = "CloudApiError";
    this.status = status;
  }
}

export type LinodeAccount = {
  username: string;
  email: string;
  company: string;
  balance: number;
  restricted: boolean;
};

export type LinodeTokenInput = {
  id?: string;
  name: string;
  group?: string;
  token: string;
};

export type LinodeTokenRecord = {
  id: string;
  name: string;
  group: string;
  masked_token: string;
  profile_username: string;
  profile_email: string;
  account_company: string;
  account_balance: number;
  last_status: string;
  last_error: string;
  last_checked_at: string;
  is_active: boolean;
};

export type LinodeTokenPool = {
  active_token_id: string;
  password_storage_enabled: boolean;
  tokens: LinodeTokenRecord[];
};

export type LinodeTokenSecret = {
  token_id: string;
  token_name: string;
  token: string;
  masked_token: string;
  profile_username: string;
  profile_email: string;
};

export type LinodeRegion = {
  id: string;
  label: string;
  country: string;
  capabilities: string[];
};

export type LinodePrice = {
  hourly: number;
  monthly: number;
};

export type LinodeType = {
  id: string;
  label: string;
  memory: number;
  disk: number;
  vcpus: number;
  transfer: number;
  price: LinodePrice;
  addons: {
    backups: LinodePrice;
  };
  network_out: number;
  class: string;
};

export type LinodeImage = {
  id: string;
  label: string;
  description: string;
  vendor: string;
  deprecated: boolean;
  is_public: boolean;
  created: string;
};

export type LinodeSSHKey = {
  label: string;
  ssh_key: string;
  created: string;
};

export type LinodeInstance = {
  id: number;
  label: string;
  group: string;
  status: string;
  region: string;
  type: string;
  image: string;
  ipv4: string[];
  ipv6: string;
  specs: {
    disk: number;
    memory: number;
    vcpus: number;
    transfer: number;
  };
  tags: string[];
  created: string;
  saved_root_password: boolean;
  saved_root_password_updated_at: string;
};

export type LinodeInstancePassword = {
  instance_id: number;
  instance_label: string;
  username: string;
  password_mode: string;
  root_password: string;
  updated_at: string;
};

export type LinodeDisk = {
  id: number;
  label: string;
  status: string;
  size: number;
  filesystem: string;
  created: string;
  updated: string;
};

export type LinodeConfig = {
  id: number;
  label: string;
  kernel: string;
  root_device: string;
  run_level: string;
  memory_limit: number;
  comments: string;
};

export type LinodeBackup = {
  id: number;
  label: string;
  type: string;
  status: string;
  created: string;
  updated: string;
  finished: string;
};

export type LinodeBackups = {
  enabled: boolean;
  available: boolean;
  schedule: {
    day: string;
    window: string;
  };
  last_successful: string;
  snapshot: LinodeBackup | null;
  automatic: LinodeBackup[];
};

export type LinodeInstanceDetail = {
  instance: LinodeInstance;
  disks: LinodeDisk[];
  configs: LinodeConfig[];
  backups: LinodeBackups | null;
};

export type LinodeCatalog = {
  regions: LinodeRegion[];
  types: LinodeType[];
  images: LinodeImage[];
  ssh_keys: LinodeSSHKey[];
};

export type CreateLinodeInstanceInput = {
  label?: string;
  region: string;
  type: string;
  image: string;
  authorized_keys: string[];
  backups_enabled: boolean;
  booted: boolean;
  tags: string[];
  user_data: string;
  root_password_mode: "custom" | "random";
  root_password: string;
  auto_connect: boolean;
  auto_connect_group: string;
};

export type CreateLinodeInstanceResult = {
  instance: LinodeInstance;
  generated_password: string;
  password_saved: boolean;
  password_save_error: string;
};

export type LinodeInstanceActionInput = {
  type: string;
  target_type?: string;
  image?: string;
  root_password_mode?: "custom" | "random";
  root_password?: string;
  authorized_keys?: string[];
  booted?: boolean;
  user_data?: string;
};

export type LinodeInstanceActionResult = {
  type: string;
  resource_id: number;
  status: string;
  generated_password: string;
  password_saved: boolean;
  password_save_error: string;
  instance: LinodeInstance | null;
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeAccount(account: Partial<LinodeAccount> | null | undefined): LinodeAccount {
  return {
    username: String(account?.username || ""),
    email: String(account?.email || ""),
    company: String(account?.company || ""),
    balance: Number(account?.balance || 0),
    restricted: Boolean(account?.restricted),
  };
}

function normalizeTokenRecord(
  token: Partial<LinodeTokenRecord> | null | undefined,
): LinodeTokenRecord {
  return {
    id: String(token?.id || ""),
    name: String(token?.name || ""),
    group: String(token?.group || ""),
    masked_token: String(token?.masked_token || ""),
    profile_username: String(token?.profile_username || ""),
    profile_email: String(token?.profile_email || ""),
    account_company: String(token?.account_company || ""),
    account_balance: Number(token?.account_balance || 0),
    last_status: String(token?.last_status || "unknown"),
    last_error: String(token?.last_error || ""),
    last_checked_at: String(token?.last_checked_at || ""),
    is_active: Boolean(token?.is_active),
  };
}

function normalizeTokenSecret(
  token: Partial<LinodeTokenSecret> | null | undefined,
): LinodeTokenSecret {
  return {
    token_id: String(token?.token_id || ""),
    token_name: String(token?.token_name || ""),
    token: String(token?.token || ""),
    masked_token: String(token?.masked_token || ""),
    profile_username: String(token?.profile_username || ""),
    profile_email: String(token?.profile_email || ""),
  };
}

function normalizePrice(price: Partial<LinodePrice> | null | undefined): LinodePrice {
  return {
    hourly: Number(price?.hourly || 0),
    monthly: Number(price?.monthly || 0),
  };
}

function normalizeRegion(region: Partial<LinodeRegion> | null | undefined): LinodeRegion {
  return {
    id: String(region?.id || ""),
    label: String(region?.label || ""),
    country: String(region?.country || ""),
    capabilities: normalizeStringArray(region?.capabilities),
  };
}

function normalizeType(type: Partial<LinodeType> | null | undefined): LinodeType {
  const addons = (type?.addons as { backups?: Partial<LinodePrice> } | undefined) || {};
  return {
    id: String(type?.id || ""),
    label: String(type?.label || ""),
    memory: Number(type?.memory || 0),
    disk: Number(type?.disk || 0),
    vcpus: Number(type?.vcpus || 0),
    transfer: Number(type?.transfer || 0),
    price: normalizePrice(type?.price),
    addons: {
      backups: normalizePrice(addons.backups),
    },
    network_out: Number(type?.network_out || 0),
    class: String(type?.class || ""),
  };
}

function normalizeImage(image: Partial<LinodeImage> | null | undefined): LinodeImage {
  return {
    id: String(image?.id || ""),
    label: String(image?.label || ""),
    description: String(image?.description || ""),
    vendor: String(image?.vendor || ""),
    deprecated: Boolean(image?.deprecated),
    is_public: Boolean(image?.is_public),
    created: String(image?.created || ""),
  };
}

function normalizeSSHKey(key: Partial<LinodeSSHKey> | null | undefined): LinodeSSHKey {
  return {
    label: String(key?.label || ""),
    ssh_key: String(key?.ssh_key || ""),
    created: String(key?.created || ""),
  };
}

function normalizeInstance(
  instance: Partial<LinodeInstance> | null | undefined,
): LinodeInstance {
  const specs = (instance?.specs as
    | Partial<LinodeInstance["specs"]>
    | undefined) || {};

  return {
    id: Number(instance?.id || 0),
    label: String(instance?.label || ""),
    group: String(instance?.group || ""),
    status: String(instance?.status || ""),
    region: String(instance?.region || ""),
    type: String(instance?.type || ""),
    image: String(instance?.image || ""),
    ipv4: normalizeStringArray(instance?.ipv4),
    ipv6: String(instance?.ipv6 || ""),
    specs: {
      disk: Number(specs.disk || 0),
      memory: Number(specs.memory || 0),
      vcpus: Number(specs.vcpus || 0),
      transfer: Number(specs.transfer || 0),
    },
    tags: normalizeStringArray(instance?.tags),
    created: String(instance?.created || ""),
    saved_root_password: Boolean(
      (instance as { saved_root_password?: unknown } | null | undefined)?.saved_root_password,
    ),
    saved_root_password_updated_at: String(
      (instance as { saved_root_password_updated_at?: unknown } | null | undefined)
        ?.saved_root_password_updated_at || "",
    ),
  };
}

function normalizeInstancePassword(
  password: Partial<LinodeInstancePassword> | null | undefined,
): LinodeInstancePassword {
  return {
    instance_id: Number(password?.instance_id || 0),
    instance_label: String(password?.instance_label || ""),
    username: String(password?.username || "root"),
    password_mode: String(password?.password_mode || ""),
    root_password: String(password?.root_password || ""),
    updated_at: String(password?.updated_at || ""),
  };
}

function normalizeBackup(backup: Partial<LinodeBackup> | null | undefined): LinodeBackup {
  return {
    id: Number(backup?.id || 0),
    label: String(backup?.label || ""),
    type: String(backup?.type || ""),
    status: String(backup?.status || ""),
    created: String(backup?.created || ""),
    updated: String(backup?.updated || ""),
    finished: String(backup?.finished || ""),
  };
}

function normalizeDisk(disk: Partial<LinodeDisk> | null | undefined): LinodeDisk {
  return {
    id: Number(disk?.id || 0),
    label: String(disk?.label || ""),
    status: String(disk?.status || ""),
    size: Number(disk?.size || 0),
    filesystem: String(disk?.filesystem || ""),
    created: String(disk?.created || ""),
    updated: String(disk?.updated || ""),
  };
}

function normalizeConfig(config: Partial<LinodeConfig> | null | undefined): LinodeConfig {
  return {
    id: Number(config?.id || 0),
    label: String(config?.label || ""),
    kernel: String(config?.kernel || ""),
    root_device: String(config?.root_device || ""),
    run_level: String(config?.run_level || ""),
    memory_limit: Number(config?.memory_limit || 0),
    comments: String(config?.comments || ""),
  };
}

function normalizeBackups(
  backups: Partial<LinodeBackups> | null | undefined,
): LinodeBackups | null {
  if (!backups) return null;
  const schedule = (backups.schedule as Partial<LinodeBackups["schedule"]> | undefined) || {};
  return {
    enabled: Boolean(backups.enabled),
    available: Boolean(backups.available),
    schedule: {
      day: String(schedule.day || ""),
      window: String(schedule.window || ""),
    },
    last_successful: String(backups.last_successful || ""),
    snapshot: backups.snapshot ? normalizeBackup(backups.snapshot) : null,
    automatic: Array.isArray(backups.automatic)
      ? backups.automatic.map(normalizeBackup)
      : [],
  };
}

function normalizeInstanceDetail(
  detail: Partial<LinodeInstanceDetail> | null | undefined,
): LinodeInstanceDetail {
  return {
    instance: normalizeInstance(detail?.instance),
    disks: Array.isArray(detail?.disks) ? detail.disks.map(normalizeDisk) : [],
    configs: Array.isArray(detail?.configs) ? detail.configs.map(normalizeConfig) : [],
    backups: normalizeBackups(detail?.backups),
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
    throw new CloudApiError(payload?.message || `HTTP ${response.status}`, response.status);
  }

  return payload?.data as T;
}

export async function getLinodeAccount(): Promise<LinodeAccount> {
  const data = await requestCloud<Partial<LinodeAccount>>("/api/admin/cloud/linode/account");
  return normalizeAccount(data);
}

export async function redeemLinodePromoCode(promoCode: string): Promise<void> {
  await requestCloud("/api/admin/cloud/linode/promo-codes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ promo_code: promoCode }),
  });
}

export async function getLinodeTokens(): Promise<LinodeTokenPool> {
  const data = await requestCloud<Partial<LinodeTokenPool>>("/api/admin/cloud/linode/tokens");
  return {
    active_token_id: String(data?.active_token_id || ""),
    password_storage_enabled: Boolean(data?.password_storage_enabled),
    tokens: Array.isArray(data?.tokens) ? data.tokens.map(normalizeTokenRecord) : [],
  };
}

export async function saveLinodeTokens(input: {
  tokens: LinodeTokenInput[];
  active_token_id?: string;
}): Promise<LinodeTokenPool> {
  const data = await requestCloud<Partial<LinodeTokenPool>>(
    "/api/admin/cloud/linode/tokens",
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

export async function setLinodeActiveToken(tokenId: string): Promise<LinodeTokenPool> {
  const data = await requestCloud<Partial<LinodeTokenPool>>(
    "/api/admin/cloud/linode/tokens/active",
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

export async function checkLinodeTokens(tokenIds?: string[]): Promise<LinodeTokenPool> {
  const data = await requestCloud<Partial<LinodeTokenPool>>(
    "/api/admin/cloud/linode/tokens/check",
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

export async function deleteLinodeToken(
  tokenId: string,
  providerResourcesReclaimed = false,
): Promise<LinodeTokenPool> {
  const reclaimQuery = providerResourcesReclaimed ? "?provider_resources_reclaimed=true" : "";
  const data = await requestCloud<Partial<LinodeTokenPool>>(
    `/api/admin/cloud/linode/tokens/${tokenId}${reclaimQuery}`,
    { method: "DELETE" },
  );

  return {
    active_token_id: String(data?.active_token_id || ""),
    password_storage_enabled: Boolean(data?.password_storage_enabled),
    tokens: Array.isArray(data?.tokens) ? data.tokens.map(normalizeTokenRecord) : [],
  };
}

export async function getLinodeTokenSecret(tokenId: string): Promise<LinodeTokenSecret> {
  const data = await requestCloud<Partial<LinodeTokenSecret>>(
    `/api/admin/cloud/linode/tokens/${tokenId}/secret`,
  );
  return normalizeTokenSecret(data);
}

export async function getLinodeCatalog(): Promise<LinodeCatalog> {
  const data = await requestCloud<Partial<LinodeCatalog>>("/api/admin/cloud/linode/catalog");
  return {
    regions: Array.isArray(data?.regions) ? data.regions.map(normalizeRegion) : [],
    types: Array.isArray(data?.types) ? data.types.map(normalizeType) : [],
    images: Array.isArray(data?.images) ? data.images.map(normalizeImage) : [],
    ssh_keys: Array.isArray(data?.ssh_keys) ? data.ssh_keys.map(normalizeSSHKey) : [],
  };
}

export async function listLinodeInstances(): Promise<LinodeInstance[]> {
  const data = await requestCloud<Partial<LinodeInstance>[]>(
    "/api/admin/cloud/linode/instances",
  );
  return Array.isArray(data) ? data.map(normalizeInstance) : [];
}

export async function createLinodeInstance(
  input: CreateLinodeInstanceInput,
): Promise<CreateLinodeInstanceResult> {
  const data = await requestCloud<{
    instance?: Partial<LinodeInstance> | null;
    generated_password?: string;
    password_saved?: boolean;
    password_save_error?: string;
  }>("/api/admin/cloud/linode/instances", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return {
    instance: normalizeInstance(data?.instance),
    generated_password: String(data?.generated_password || ""),
    password_saved: Boolean(data?.password_saved),
    password_save_error: String(data?.password_save_error || ""),
  };
}

export async function getLinodeInstancePassword(
  instanceId: number,
): Promise<LinodeInstancePassword> {
  const data = await requestCloud<Partial<LinodeInstancePassword>>(
    `/api/admin/cloud/linode/instances/${instanceId}/password`,
  );
  return normalizeInstancePassword(data);
}

export async function getLinodeInstanceDetail(
  instanceId: number,
): Promise<LinodeInstanceDetail> {
  const data = await requestCloud<Partial<LinodeInstanceDetail>>(
    `/api/admin/cloud/linode/instances/${instanceId}`,
  );
  return normalizeInstanceDetail(data);
}

export async function deleteLinodeInstance(instanceId: number): Promise<void> {
  await requestCloud(`/api/admin/cloud/linode/instances/${instanceId}`, {
    method: "DELETE",
  });
}

export async function postLinodeInstanceAction(
  instanceId: number,
  input: string | LinodeInstanceActionInput,
): Promise<LinodeInstanceActionResult> {
  const data = await requestCloud<Partial<LinodeInstanceActionResult>>(`/api/admin/cloud/linode/instances/${instanceId}/actions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(typeof input === "string" ? { type: input } : input),
  });
  return {
    type: String(data?.type || ""),
    resource_id: Number(data?.resource_id || 0),
    status: String(data?.status || ""),
    generated_password: String(data?.generated_password || ""),
    password_saved: Boolean(data?.password_saved),
    password_save_error: String(data?.password_save_error || ""),
    instance: data?.instance ? normalizeInstance(data.instance) : null,
  };
}

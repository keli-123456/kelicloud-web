type ApiEnvelope<T> = {
  status: string;
  message: string;
  data: T;
};

class CloudApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CloudApiError";
    this.status = status;
  }
}

export type VultrAccount = {
  name: string;
  email: string;
  acls: string[];
  balance: number;
  pending_charges: number;
  last_payment_date: string;
  last_payment_amount: number;
};

export type VultrTokenInput = {
  id?: string;
  name: string;
  group?: string;
  token: string;
};

export type VultrTokenRecord = {
  id: string;
  name: string;
  group: string;
  masked_token: string;
  account_name: string;
  account_email: string;
  account_balance: number;
  pending_charges: number;
  last_status: string;
  last_error: string;
  last_checked_at: string;
  is_active: boolean;
};

export type VultrTokenPool = {
  active_token_id: string;
  password_storage_enabled: boolean;
  tokens: VultrTokenRecord[];
};

export type VultrTokenSecret = {
  token_id: string;
  token_name: string;
  token: string;
  masked_token: string;
  account_name: string;
  account_email: string;
};

export type VultrRegion = {
  id: string;
  city: string;
  country: string;
  continent: string;
  options: string[];
};

export type VultrPlan = {
  id: string;
  vcpu_count: number;
  ram: number;
  disk: number;
  disk_count: number;
  bandwidth: number;
  monthly_cost: number;
  type: string;
  locations: string[];
  gpu_vram_gb?: number;
  gpu_type?: string;
};

export type VultrOS = {
  id: number;
  name: string;
  arch: string;
  family: string;
};

export type VultrSSHKey = {
  id: string;
  name: string;
  ssh_key: string;
  date_created: string;
};

export type VultrInstance = {
  id: string;
  os: string;
  ram: number;
  disk: number;
  main_ip: string;
  vcpu_count: number;
  region: string;
  plan: string;
  date_created: string;
  status: string;
  allowed_bandwidth: number;
  power_status: string;
  server_status: string;
  v6_network: string;
  v6_main_ip: string;
  v6_network_size: number;
  label: string;
  hostname: string;
  os_id: number;
  features: string[];
  tags: string[];
  pending_charges: number;
  saved_root_password: boolean;
  saved_root_password_updated_at: string;
};

export type VultrInstancePassword = {
  instance_id: string;
  instance_label: string;
  username: string;
  password_mode: string;
  root_password: string;
  updated_at: string;
};

export type VultrCatalog = {
  regions: VultrRegion[];
  plans: VultrPlan[];
  os: VultrOS[];
  ssh_keys: VultrSSHKey[];
};

export type VultrInstanceDetail = {
  instance: VultrInstance;
};

export type CreateVultrInstanceInput = {
  label?: string;
  hostname?: string;
  region: string;
  plan: string;
  os_id: number;
  sshkey_id: string[];
  enable_ipv6: boolean;
  disable_public_ipv4: boolean;
  backups_enabled: boolean;
  ddos_protection: boolean;
  activation_email: boolean;
  tags: string[];
  user_data: string;
  auto_connect: boolean;
  auto_connect_group: string;
};

export type CreateVultrInstanceResult = {
  instance: VultrInstance;
  generated_password: string;
  password_saved: boolean;
  password_save_error: string;
};

export type VultrInstanceActionResult = {
  type: string;
  resource_id: string;
  status: string;
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeAccount(account: Partial<VultrAccount> | null | undefined): VultrAccount {
  return {
    name: String(account?.name || ""),
    email: String(account?.email || ""),
    acls: normalizeStringArray(account?.acls),
    balance: normalizeNumber(account?.balance),
    pending_charges: normalizeNumber(account?.pending_charges),
    last_payment_date: String(account?.last_payment_date || ""),
    last_payment_amount: normalizeNumber(account?.last_payment_amount),
  };
}

function normalizeTokenRecord(
  token: Partial<VultrTokenRecord> | null | undefined,
): VultrTokenRecord {
  return {
    id: String(token?.id || ""),
    name: String(token?.name || ""),
    group: String(token?.group || ""),
    masked_token: String(token?.masked_token || ""),
    account_name: String(token?.account_name || ""),
    account_email: String(token?.account_email || ""),
    account_balance: normalizeNumber(token?.account_balance),
    pending_charges: normalizeNumber(token?.pending_charges),
    last_status: String(token?.last_status || "unknown"),
    last_error: String(token?.last_error || ""),
    last_checked_at: String(token?.last_checked_at || ""),
    is_active: Boolean(token?.is_active),
  };
}

function normalizeTokenPool(pool: Partial<VultrTokenPool> | null | undefined): VultrTokenPool {
  return {
    active_token_id: String(pool?.active_token_id || ""),
    password_storage_enabled: Boolean(pool?.password_storage_enabled),
    tokens: Array.isArray(pool?.tokens) ? pool.tokens.map(normalizeTokenRecord) : [],
  };
}

function normalizeTokenSecret(
  token: Partial<VultrTokenSecret> | null | undefined,
): VultrTokenSecret {
  return {
    token_id: String(token?.token_id || ""),
    token_name: String(token?.token_name || ""),
    token: String(token?.token || ""),
    masked_token: String(token?.masked_token || ""),
    account_name: String(token?.account_name || ""),
    account_email: String(token?.account_email || ""),
  };
}

function normalizeRegion(region: Partial<VultrRegion> | null | undefined): VultrRegion {
  return {
    id: String(region?.id || ""),
    city: String(region?.city || ""),
    country: String(region?.country || ""),
    continent: String(region?.continent || ""),
    options: normalizeStringArray(region?.options),
  };
}

function normalizePlan(plan: Partial<VultrPlan> | null | undefined): VultrPlan {
  return {
    id: String(plan?.id || ""),
    vcpu_count: normalizeNumber(plan?.vcpu_count),
    ram: normalizeNumber(plan?.ram),
    disk: normalizeNumber(plan?.disk),
    disk_count: normalizeNumber(plan?.disk_count),
    bandwidth: normalizeNumber(plan?.bandwidth),
    monthly_cost: normalizeNumber(plan?.monthly_cost),
    type: String(plan?.type || ""),
    locations: normalizeStringArray(plan?.locations),
    gpu_vram_gb: plan?.gpu_vram_gb === undefined ? undefined : normalizeNumber(plan.gpu_vram_gb),
    gpu_type: plan?.gpu_type === undefined ? undefined : String(plan.gpu_type || ""),
  };
}

function normalizeOS(os: Partial<VultrOS> | null | undefined): VultrOS {
  return {
    id: normalizeNumber(os?.id),
    name: String(os?.name || ""),
    arch: String(os?.arch || ""),
    family: String(os?.family || ""),
  };
}

function normalizeSSHKey(key: Partial<VultrSSHKey> | null | undefined): VultrSSHKey {
  return {
    id: String(key?.id || ""),
    name: String(key?.name || ""),
    ssh_key: String(key?.ssh_key || ""),
    date_created: String(key?.date_created || ""),
  };
}

function normalizeInstance(
  instance: Partial<VultrInstance> | null | undefined,
): VultrInstance {
  return {
    id: String(instance?.id || ""),
    os: String(instance?.os || ""),
    ram: normalizeNumber(instance?.ram),
    disk: normalizeNumber(instance?.disk),
    main_ip: String(instance?.main_ip || ""),
    vcpu_count: normalizeNumber(instance?.vcpu_count),
    region: String(instance?.region || ""),
    plan: String(instance?.plan || ""),
    date_created: String(instance?.date_created || ""),
    status: String(instance?.status || ""),
    allowed_bandwidth: normalizeNumber(instance?.allowed_bandwidth),
    power_status: String(instance?.power_status || ""),
    server_status: String(instance?.server_status || ""),
    v6_network: String(instance?.v6_network || ""),
    v6_main_ip: String(instance?.v6_main_ip || ""),
    v6_network_size: normalizeNumber(instance?.v6_network_size),
    label: String(instance?.label || ""),
    hostname: String(instance?.hostname || ""),
    os_id: normalizeNumber(instance?.os_id),
    features: normalizeStringArray(instance?.features),
    tags: normalizeStringArray(instance?.tags),
    pending_charges: normalizeNumber(instance?.pending_charges),
    saved_root_password: Boolean(instance?.saved_root_password),
    saved_root_password_updated_at: String(instance?.saved_root_password_updated_at || ""),
  };
}

function normalizePassword(
  password: Partial<VultrInstancePassword> | null | undefined,
): VultrInstancePassword {
  return {
    instance_id: String(password?.instance_id || ""),
    instance_label: String(password?.instance_label || ""),
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
        `Expected JSON from ${path}, but received an unexpected response${response.url ? ` (${response.url})` : ""}.`,
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

export async function getVultrAccount(): Promise<VultrAccount> {
  const data = await requestCloud<Partial<VultrAccount>>("/api/admin/cloud/vultr/account");
  return normalizeAccount(data);
}

export async function getVultrTokens(): Promise<VultrTokenPool> {
  const data = await requestCloud<Partial<VultrTokenPool>>("/api/admin/cloud/vultr/tokens");
  return normalizeTokenPool(data);
}

export async function saveVultrTokens(input: {
  tokens: VultrTokenInput[];
  active_token_id?: string;
}): Promise<VultrTokenPool> {
  const data = await requestCloud<Partial<VultrTokenPool>>("/api/admin/cloud/vultr/tokens", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return normalizeTokenPool(data);
}

export async function setVultrActiveToken(tokenId: string): Promise<VultrTokenPool> {
  const data = await requestCloud<Partial<VultrTokenPool>>(
    "/api/admin/cloud/vultr/tokens/active",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token_id: tokenId }),
    },
  );
  return normalizeTokenPool(data);
}

export async function checkVultrTokens(tokenIds?: string[]): Promise<VultrTokenPool> {
  const data = await requestCloud<Partial<VultrTokenPool>>(
    "/api/admin/cloud/vultr/tokens/check",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tokenIds?.length ? { token_ids: tokenIds } : {}),
    },
  );
  return normalizeTokenPool(data);
}

export async function deleteVultrToken(tokenId: string): Promise<VultrTokenPool> {
  const data = await requestCloud<Partial<VultrTokenPool>>(
    `/api/admin/cloud/vultr/tokens/${tokenId}`,
    { method: "DELETE" },
  );
  return normalizeTokenPool(data);
}

export async function getVultrTokenSecret(tokenId: string): Promise<VultrTokenSecret> {
  const data = await requestCloud<Partial<VultrTokenSecret>>(
    `/api/admin/cloud/vultr/tokens/${tokenId}/secret`,
  );
  return normalizeTokenSecret(data);
}

export async function getVultrCatalog(): Promise<VultrCatalog> {
  const data = await requestCloud<Partial<VultrCatalog>>("/api/admin/cloud/vultr/catalog");
  return {
    regions: Array.isArray(data?.regions) ? data.regions.map(normalizeRegion) : [],
    plans: Array.isArray(data?.plans) ? data.plans.map(normalizePlan) : [],
    os: Array.isArray(data?.os) ? data.os.map(normalizeOS) : [],
    ssh_keys: Array.isArray(data?.ssh_keys) ? data.ssh_keys.map(normalizeSSHKey) : [],
  };
}

export async function listVultrInstances(): Promise<VultrInstance[]> {
  const data = await requestCloud<Partial<VultrInstance>[]>(
    "/api/admin/cloud/vultr/instances",
  );
  return Array.isArray(data) ? data.map(normalizeInstance) : [];
}

export async function getVultrInstanceDetail(
  instanceId: string,
): Promise<VultrInstanceDetail> {
  const data = await requestCloud<Partial<VultrInstanceDetail>>(
    `/api/admin/cloud/vultr/instances/${instanceId}`,
  );
  return {
    instance: normalizeInstance(data?.instance),
  };
}

export async function getVultrInstancePassword(
  instanceId: string,
): Promise<VultrInstancePassword> {
  const data = await requestCloud<Partial<VultrInstancePassword>>(
    `/api/admin/cloud/vultr/instances/${instanceId}/password`,
  );
  return normalizePassword(data);
}

export async function createVultrInstance(
  input: CreateVultrInstanceInput,
): Promise<CreateVultrInstanceResult> {
  const data = await requestCloud<{
    instance?: Partial<VultrInstance> | null;
    generated_password?: string;
    password_saved?: boolean;
    password_save_error?: string;
  }>("/api/admin/cloud/vultr/instances", {
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

export async function deleteVultrInstance(instanceId: string): Promise<void> {
  await requestCloud(`/api/admin/cloud/vultr/instances/${instanceId}`, {
    method: "DELETE",
  });
}

export async function postVultrInstanceAction(
  instanceId: string,
  type: string,
): Promise<VultrInstanceActionResult> {
  const data = await requestCloud<Partial<VultrInstanceActionResult>>(
    `/api/admin/cloud/vultr/instances/${instanceId}/actions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type }),
    },
  );
  return {
    type: String(data?.type || type),
    resource_id: String(data?.resource_id || instanceId),
    status: String(data?.status || "submitted"),
  };
}

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

export type AzureCredentialInput = {
  id?: string;
  name: string;
  tenant_id: string;
  client_id: string;
  client_secret: string;
  subscription_id: string;
  default_location?: string;
};

export type AzureCredentialRecord = {
  id: string;
  name: string;
  tenant_id: string;
  masked_client_id: string;
  subscription_id: string;
  default_location: string;
  subscription_display_name: string;
  subscription_state: string;
  last_status: string;
  last_error: string;
  last_checked_at: string;
  is_active: boolean;
};

export type AzureCredentialPool = {
  active_credential_id: string;
  active_location: string;
  password_storage_enabled: boolean;
  credentials: AzureCredentialRecord[];
};

export type AzureCredentialSecret = {
  credential_id: string;
  credential_name: string;
  tenant_id: string;
  client_id: string;
  client_secret: string;
  masked_client_id: string;
  subscription_id: string;
  default_location: string;
  subscription_display_name: string;
  subscription_state: string;
};

export type AzureAccount = {
  credential_name: string;
  tenant_id: string;
  client_id: string;
  subscription_id: string;
  subscription_display_name: string;
  subscription_state: string;
  default_location: string;
  active_location: string;
};

export type AzureLocation = {
  name: string;
  displayName: string;
  regionalDisplayName: string;
};

export type AzureCatalog = {
  active_location: string;
  locations: AzureLocation[];
  sizes: AzureVMSku[];
};

export type AzureVMSku = {
  name: string;
  vcpus: number;
  memory_gb: number;
  zones: string[];
  max_data_disk_count: number;
};

export type AzureInstance = {
  instance_id: string;
  resource_id: string;
  name: string;
  resource_group: string;
  location: string;
  size: string;
  provisioning_state: string;
  power_state: string;
  computer_name: string;
  os_type: string;
  image: string;
  private_ips: string[];
  public_ips: string[];
  tags: Record<string, string>;
  saved_root_password: boolean;
  saved_root_password_updated_at: string;
};

export type AzureNetworkInterface = {
  id: string;
  name: string;
  primary: boolean;
  private_ips: string[];
  public_ips: string[];
  subnet_ids: string[];
  network_security_group_id: string;
};

export type AzureDisk = {
  id: string;
  name: string;
  lun: number;
  size_gb: number;
  create_option: string;
  storage_account_type: string;
};

export type AzureInstanceDetail = {
  instance: AzureInstance;
  vm_id: string;
  zones: string[];
  license_type: string;
  network_interfaces: AzureNetworkInterface[];
  os_disk: AzureDisk | null;
  data_disks: AzureDisk[];
};

export type AzureInstancePassword = {
  instance_id: string;
  instance_name: string;
  username: string;
  password_mode: string;
  root_password: string;
  updated_at: string;
};

export type AzureImageReference = {
  publisher: string;
  offer: string;
  sku: string;
  version?: string;
};

export type CreateAzureInstanceInput = {
  name?: string;
  resource_group?: string;
  size: string;
  admin_username?: string;
  admin_password?: string;
  ssh_public_key?: string;
  user_data?: string;
  public_ip: boolean;
  assign_ipv6: boolean;
  image: AzureImageReference;
  auto_connect?: boolean;
  auto_connect_group?: string;
};

export type CreateAzureInstanceResult = {
  instance: AzureInstance;
  detail: AzureInstanceDetail;
  password_saved: boolean;
  password_save_error: string;
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeLocation(location: unknown) {
  return String(location || "").trim().toLowerCase();
}

function normalizeCredentialRecord(
  credential: Partial<AzureCredentialRecord> | null | undefined,
): AzureCredentialRecord {
  return {
    id: String(credential?.id || ""),
    name: String(credential?.name || ""),
    tenant_id: String(credential?.tenant_id || ""),
    masked_client_id: String(credential?.masked_client_id || ""),
    subscription_id: String(credential?.subscription_id || ""),
    default_location: normalizeLocation(credential?.default_location),
    subscription_display_name: String(credential?.subscription_display_name || ""),
    subscription_state: String(credential?.subscription_state || ""),
    last_status: String(credential?.last_status || "unknown"),
    last_error: String(credential?.last_error || ""),
    last_checked_at: String(credential?.last_checked_at || ""),
    is_active: Boolean(credential?.is_active),
  };
}

function normalizeCredentialSecret(
  credential: Partial<AzureCredentialSecret> | null | undefined,
): AzureCredentialSecret {
  return {
    credential_id: String(credential?.credential_id || ""),
    credential_name: String(credential?.credential_name || ""),
    tenant_id: String(credential?.tenant_id || ""),
    client_id: String(credential?.client_id || ""),
    client_secret: String(credential?.client_secret || ""),
    masked_client_id: String(credential?.masked_client_id || ""),
    subscription_id: String(credential?.subscription_id || ""),
    default_location: normalizeLocation(credential?.default_location),
    subscription_display_name: String(credential?.subscription_display_name || ""),
    subscription_state: String(credential?.subscription_state || ""),
  };
}

function normalizeAccount(account: Partial<AzureAccount> | null | undefined): AzureAccount {
  return {
    credential_name: String(account?.credential_name || ""),
    tenant_id: String(account?.tenant_id || ""),
    client_id: String(account?.client_id || ""),
    subscription_id: String(account?.subscription_id || ""),
    subscription_display_name: String(account?.subscription_display_name || ""),
    subscription_state: String(account?.subscription_state || ""),
    default_location: normalizeLocation(account?.default_location),
    active_location: normalizeLocation(account?.active_location),
  };
}

function normalizeLocationItem(location: Partial<AzureLocation> | null | undefined): AzureLocation {
  return {
    name: normalizeLocation(location?.name),
    displayName: String(location?.displayName || ""),
    regionalDisplayName: String(location?.regionalDisplayName || ""),
  };
}

function normalizeVMSku(item: Partial<AzureVMSku> | null | undefined): AzureVMSku {
  return {
    name: String(item?.name || ""),
    vcpus: Number(item?.vcpus || 0),
    memory_gb: Number(item?.memory_gb || 0),
    zones: normalizeStringArray(item?.zones),
    max_data_disk_count: Number(item?.max_data_disk_count || 0),
  };
}

function normalizeInstance(instance: Partial<AzureInstance> | null | undefined): AzureInstance {
  return {
    instance_id: String(instance?.instance_id || ""),
    resource_id: String(instance?.resource_id || ""),
    name: String(instance?.name || ""),
    resource_group: String(instance?.resource_group || ""),
    location: normalizeLocation(instance?.location),
    size: String(instance?.size || ""),
    provisioning_state: String(instance?.provisioning_state || ""),
    power_state: String(instance?.power_state || ""),
    computer_name: String(instance?.computer_name || ""),
    os_type: String(instance?.os_type || ""),
    image: String(instance?.image || ""),
    private_ips: normalizeStringArray(instance?.private_ips),
    public_ips: normalizeStringArray(instance?.public_ips),
    tags:
      instance?.tags && typeof instance.tags === "object"
        ? Object.fromEntries(
            Object.entries(instance.tags)
              .filter(([key]) => key)
              .map(([key, value]) => [String(key), String(value || "")]),
          )
        : {},
    saved_root_password: Boolean(
      (instance as { saved_root_password?: unknown } | null | undefined)?.saved_root_password,
    ),
    saved_root_password_updated_at: String(
      (instance as { saved_root_password_updated_at?: unknown } | null | undefined)
        ?.saved_root_password_updated_at || "",
    ),
  };
}

function normalizeNetworkInterface(
  item: Partial<AzureNetworkInterface> | null | undefined,
): AzureNetworkInterface {
  return {
    id: String(item?.id || ""),
    name: String(item?.name || ""),
    primary: Boolean(item?.primary),
    private_ips: normalizeStringArray(item?.private_ips),
    public_ips: normalizeStringArray(item?.public_ips),
    subnet_ids: normalizeStringArray(item?.subnet_ids),
    network_security_group_id: String(item?.network_security_group_id || ""),
  };
}

function normalizeDisk(item: Partial<AzureDisk> | null | undefined): AzureDisk {
  return {
    id: String(item?.id || ""),
    name: String(item?.name || ""),
    lun: Number(item?.lun || 0),
    size_gb: Number(item?.size_gb || 0),
    create_option: String(item?.create_option || ""),
    storage_account_type: String(item?.storage_account_type || ""),
  };
}

function normalizeInstanceDetail(
  detail: Partial<AzureInstanceDetail> | null | undefined,
): AzureInstanceDetail {
  return {
    instance: normalizeInstance(detail?.instance),
    vm_id: String(detail?.vm_id || ""),
    zones: normalizeStringArray(detail?.zones),
    license_type: String(detail?.license_type || ""),
    network_interfaces: Array.isArray(detail?.network_interfaces)
      ? detail.network_interfaces.map(normalizeNetworkInterface)
      : [],
    os_disk: detail?.os_disk ? normalizeDisk(detail.os_disk) : null,
    data_disks: Array.isArray(detail?.data_disks)
      ? detail.data_disks.map(normalizeDisk)
      : [],
  };
}

function normalizeInstancePassword(
  value: Partial<AzureInstancePassword> | null | undefined,
): AzureInstancePassword {
  return {
    instance_id: String(value?.instance_id || ""),
    instance_name: String(value?.instance_name || ""),
    username: String(value?.username || ""),
    password_mode: String(value?.password_mode || ""),
    root_password: String(value?.root_password || ""),
    updated_at: String(value?.updated_at || ""),
  };
}

function normalizeCredentialPool(
  data: Partial<AzureCredentialPool> | null | undefined,
): AzureCredentialPool {
  return {
    active_credential_id: String(data?.active_credential_id || ""),
    active_location: normalizeLocation(data?.active_location),
    password_storage_enabled: Boolean(data?.password_storage_enabled),
    credentials: Array.isArray(data?.credentials) ? data.credentials.map(normalizeCredentialRecord) : [],
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
        `Expected JSON from ${path}, but received HTML or another unexpected response${response.url ? ` (${response.url})` : ""}.`,
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

export async function getAzureCredentials(): Promise<AzureCredentialPool> {
  const data = await requestCloud<Partial<AzureCredentialPool>>("/api/admin/cloud/azure/credentials");
  return normalizeCredentialPool(data);
}

export async function saveAzureCredentials(input: {
  credentials: AzureCredentialInput[];
  active_credential_id?: string;
  active_location?: string;
}): Promise<AzureCredentialPool> {
  const data = await requestCloud<Partial<AzureCredentialPool>>("/api/admin/cloud/azure/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return normalizeCredentialPool(data);
}

export async function setAzureActiveCredential(credentialId: string): Promise<AzureCredentialPool> {
  const data = await requestCloud<Partial<AzureCredentialPool>>("/api/admin/cloud/azure/credentials/active", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ credential_id: credentialId }),
  });
  return normalizeCredentialPool(data);
}

export async function setAzureActiveLocation(location: string): Promise<AzureCredentialPool> {
  const data = await requestCloud<Partial<AzureCredentialPool>>("/api/admin/cloud/azure/credentials/location", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ location }),
  });
  return normalizeCredentialPool(data);
}

export async function checkAzureCredentials(credentialIds?: string[]): Promise<AzureCredentialPool> {
  const data = await requestCloud<Partial<AzureCredentialPool>>("/api/admin/cloud/azure/credentials/check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ credential_ids: credentialIds || [] }),
  });
  return normalizeCredentialPool(data);
}

export async function getAzureCredentialSecret(credentialId: string): Promise<AzureCredentialSecret> {
  const data = await requestCloud<Partial<AzureCredentialSecret>>(`/api/admin/cloud/azure/credentials/${encodeURIComponent(credentialId)}/secret`);
  return normalizeCredentialSecret(data);
}

export async function deleteAzureCredential(credentialId: string): Promise<AzureCredentialPool> {
  const data = await requestCloud<Partial<AzureCredentialPool>>(`/api/admin/cloud/azure/credentials/${encodeURIComponent(credentialId)}`, {
    method: "DELETE",
  });
  return normalizeCredentialPool(data);
}

export async function getAzureAccount(): Promise<AzureAccount> {
  const data = await requestCloud<Partial<AzureAccount>>("/api/admin/cloud/azure/account");
  return normalizeAccount(data);
}

export async function getAzureCatalog(): Promise<AzureCatalog> {
  const data = await requestCloud<Partial<AzureCatalog>>("/api/admin/cloud/azure/catalog");
  return {
    active_location: normalizeLocation(data?.active_location),
    locations: Array.isArray(data?.locations) ? data.locations.map(normalizeLocationItem) : [],
    sizes: Array.isArray(data?.sizes) ? data.sizes.map(normalizeVMSku) : [],
  };
}

export async function listAzureInstances(): Promise<AzureInstance[]> {
  const data = await requestCloud<Array<Partial<AzureInstance>>>("/api/admin/cloud/azure/instances");
  return Array.isArray(data) ? data.map(normalizeInstance) : [];
}

export async function getAzureInstanceDetail(instanceId: string): Promise<AzureInstanceDetail> {
  const data = await requestCloud<Partial<AzureInstanceDetail>>(`/api/admin/cloud/azure/instances/${encodeURIComponent(instanceId)}`);
  return normalizeInstanceDetail(data);
}

export async function getAzureInstancePassword(instanceId: string): Promise<AzureInstancePassword> {
  const data = await requestCloud<Partial<AzureInstancePassword>>(`/api/admin/cloud/azure/instances/${encodeURIComponent(instanceId)}/password`);
  return normalizeInstancePassword(data);
}

export async function createAzureInstance(input: CreateAzureInstanceInput): Promise<CreateAzureInstanceResult> {
  const data = await requestCloud<{
    instance?: Partial<AzureInstance>;
    detail?: Partial<AzureInstanceDetail>;
    password_saved?: boolean;
    password_save_error?: string;
  }>("/api/admin/cloud/azure/instances", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return {
    instance: normalizeInstance(data?.instance),
    detail: normalizeInstanceDetail(data?.detail),
    password_saved: Boolean(data?.password_saved),
    password_save_error: String(data?.password_save_error || ""),
  };
}

export async function postAzureInstanceAction(instanceId: string, type: string): Promise<void> {
  await requestCloud(`/api/admin/cloud/azure/instances/${encodeURIComponent(instanceId)}/actions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type }),
  });
}

export async function deleteAzureInstance(instanceId: string): Promise<void> {
  await requestCloud(`/api/admin/cloud/azure/instances/${encodeURIComponent(instanceId)}`, {
    method: "DELETE",
  });
}

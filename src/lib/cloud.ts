export class CloudApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
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

export type DigitalOceanAccount = {
  uuid: string;
  email: string;
  email_verified: boolean;
  droplet_limit: number;
  status: string;
  status_message: string;
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
  name: string;
  region: string;
  size: string;
  image: string;
  ssh_keys: number[];
  backups: boolean;
  ipv6: boolean;
  monitoring: boolean;
  tags: string[];
  user_data: string;
  vpc_uuid: string;
};

async function requestCloud<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as ApiEnvelope<T>) : null;

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

export async function getCloudProviderValues(
  provider: string,
): Promise<Record<string, unknown>> {
  const data = await requestCloud<{ name: string; addition: string }>(
    `/api/admin/cloud/providers/${provider}`,
  );

  if (!data?.addition) {
    return {};
  }

  return JSON.parse(data.addition) as Record<string, unknown>;
}

export async function saveCloudProviderValues(
  provider: string,
  values: Record<string, unknown>,
): Promise<void> {
  await requestCloud(
    `/api/admin/cloud/providers/${provider}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        addition: JSON.stringify(values),
      }),
    },
  );
}

export async function getDigitalOceanAccount(): Promise<DigitalOceanAccount> {
  return requestCloud<DigitalOceanAccount>("/api/admin/cloud/digitalocean/account");
}

export async function getDigitalOceanCatalog(): Promise<DigitalOceanCatalog> {
  return requestCloud<DigitalOceanCatalog>("/api/admin/cloud/digitalocean/catalog");
}

export async function listDigitalOceanDroplets(): Promise<DigitalOceanDroplet[]> {
  return requestCloud<DigitalOceanDroplet[]>("/api/admin/cloud/digitalocean/droplets");
}

export async function createDigitalOceanDroplet(
  input: CreateDigitalOceanDropletInput,
): Promise<DigitalOceanDroplet> {
  return requestCloud<DigitalOceanDroplet>(
    "/api/admin/cloud/digitalocean/droplets",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
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

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

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
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
  };
}

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

  const parsed = JSON.parse(data.addition) as Record<string, unknown> | null;
  return parsed && typeof parsed === "object" ? parsed : {};
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

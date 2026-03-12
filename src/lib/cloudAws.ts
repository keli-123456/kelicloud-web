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

export type AWSAccount = {
  account_id: string;
  arn: string;
  user_id: string;
  region: string;
};

export type AWSCredentialInput = {
  id?: string;
  name: string;
  access_key_id: string;
  secret_access_key: string;
  session_token?: string;
  default_region?: string;
};

export type AWSCredentialRecord = {
  id: string;
  name: string;
  masked_access_key_id: string;
  default_region: string;
  account_id: string;
  arn: string;
  user_id: string;
  last_status: string;
  last_error: string;
  last_checked_at: string;
  is_active: boolean;
};

export type AWSCredentialPool = {
  active_credential_id: string;
  active_region: string;
  credentials: AWSCredentialRecord[];
};

export type AWSCredentialSecret = {
  credential_id: string;
  credential_name: string;
  access_key_id: string;
  secret_access_key: string;
  session_token: string;
  masked_access_key_id: string;
  default_region: string;
  account_id: string;
  arn: string;
  user_id: string;
};

export type AWSRegion = {
  name: string;
  endpoint: string;
};

export type AWSInstanceType = {
  name: string;
  vcpus: number;
  memory_mib: number;
  hypervisor: string;
  bare_metal: boolean;
  current_generation: boolean;
  free_tier_eligible: boolean;
  network_performance: string;
  supported_usage_class: string[];
};

export type AWSImage = {
  image_id: string;
  name: string;
  description: string;
  architecture: string;
  creation_date: string;
  owner_id: string;
  platform_details: string;
};

export type AWSKeyPair = {
  key_name: string;
  key_pair_id: string;
  fingerprint: string;
  key_type: string;
};

export type AWSSubnet = {
  subnet_id: string;
  vpc_id: string;
  availability_zone: string;
  cidr_block: string;
  available_ip_count: number;
  default_for_az: boolean;
  map_public_ip_on_launch: boolean;
};

export type AWSSecurityGroup = {
  group_id: string;
  group_name: string;
  description: string;
  vpc_id: string;
};

export type AWSInstance = {
  instance_id: string;
  name: string;
  state: string;
  instance_type: string;
  image_id: string;
  key_name: string;
  public_ip: string;
  private_ip: string;
  availability_zone: string;
  launch_time: string;
  tags: Record<string, string>;
};

export type AWSTag = {
  key: string;
  value: string;
};

export type AWSCatalog = {
  active_region: string;
  regions: AWSRegion[];
  instance_types: AWSInstanceType[];
  images: AWSImage[];
  key_pairs: AWSKeyPair[];
  subnets: AWSSubnet[];
  security_groups: AWSSecurityGroup[];
};

export type CreateAWSInstanceInput = {
  name: string;
  image_id: string;
  instance_type: string;
  key_name: string;
  subnet_id: string;
  security_group_ids: string[];
  user_data: string;
  assign_public_ip: boolean;
  tags: AWSTag[];
};

export type CreateAWSInstanceResult = {
  instance: AWSInstance;
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeCredentialRecord(
  credential: Partial<AWSCredentialRecord> | null | undefined,
): AWSCredentialRecord {
  return {
    id: String(credential?.id || ""),
    name: String(credential?.name || ""),
    masked_access_key_id: String(credential?.masked_access_key_id || ""),
    default_region: String(credential?.default_region || "us-east-1"),
    account_id: String(credential?.account_id || ""),
    arn: String(credential?.arn || ""),
    user_id: String(credential?.user_id || ""),
    last_status: String(credential?.last_status || "unknown"),
    last_error: String(credential?.last_error || ""),
    last_checked_at: String(credential?.last_checked_at || ""),
    is_active: Boolean(credential?.is_active),
  };
}

function normalizeCredentialSecret(
  credential: Partial<AWSCredentialSecret> | null | undefined,
): AWSCredentialSecret {
  return {
    credential_id: String(credential?.credential_id || ""),
    credential_name: String(credential?.credential_name || ""),
    access_key_id: String(credential?.access_key_id || ""),
    secret_access_key: String(credential?.secret_access_key || ""),
    session_token: String(credential?.session_token || ""),
    masked_access_key_id: String(credential?.masked_access_key_id || ""),
    default_region: String(credential?.default_region || "us-east-1"),
    account_id: String(credential?.account_id || ""),
    arn: String(credential?.arn || ""),
    user_id: String(credential?.user_id || ""),
  };
}

function normalizeRegion(region: Partial<AWSRegion> | null | undefined): AWSRegion {
  return {
    name: String(region?.name || ""),
    endpoint: String(region?.endpoint || ""),
  };
}

function normalizeInstanceType(
  instanceType: Partial<AWSInstanceType> | null | undefined,
): AWSInstanceType {
  return {
    name: String(instanceType?.name || ""),
    vcpus: Number(instanceType?.vcpus || 0),
    memory_mib: Number(instanceType?.memory_mib || 0),
    hypervisor: String(instanceType?.hypervisor || ""),
    bare_metal: Boolean(instanceType?.bare_metal),
    current_generation: Boolean(instanceType?.current_generation),
    free_tier_eligible: Boolean(instanceType?.free_tier_eligible),
    network_performance: String(instanceType?.network_performance || ""),
    supported_usage_class: normalizeStringArray(instanceType?.supported_usage_class),
  };
}

function normalizeImage(image: Partial<AWSImage> | null | undefined): AWSImage {
  return {
    image_id: String(image?.image_id || ""),
    name: String(image?.name || ""),
    description: String(image?.description || ""),
    architecture: String(image?.architecture || ""),
    creation_date: String(image?.creation_date || ""),
    owner_id: String(image?.owner_id || ""),
    platform_details: String(image?.platform_details || ""),
  };
}

function normalizeKeyPair(keyPair: Partial<AWSKeyPair> | null | undefined): AWSKeyPair {
  return {
    key_name: String(keyPair?.key_name || ""),
    key_pair_id: String(keyPair?.key_pair_id || ""),
    fingerprint: String(keyPair?.fingerprint || ""),
    key_type: String(keyPair?.key_type || ""),
  };
}

function normalizeSubnet(subnet: Partial<AWSSubnet> | null | undefined): AWSSubnet {
  return {
    subnet_id: String(subnet?.subnet_id || ""),
    vpc_id: String(subnet?.vpc_id || ""),
    availability_zone: String(subnet?.availability_zone || ""),
    cidr_block: String(subnet?.cidr_block || ""),
    available_ip_count: Number(subnet?.available_ip_count || 0),
    default_for_az: Boolean(subnet?.default_for_az),
    map_public_ip_on_launch: Boolean(subnet?.map_public_ip_on_launch),
  };
}

function normalizeSecurityGroup(
  securityGroup: Partial<AWSSecurityGroup> | null | undefined,
): AWSSecurityGroup {
  return {
    group_id: String(securityGroup?.group_id || ""),
    group_name: String(securityGroup?.group_name || ""),
    description: String(securityGroup?.description || ""),
    vpc_id: String(securityGroup?.vpc_id || ""),
  };
}

function normalizeInstance(
  instance: Partial<AWSInstance> | null | undefined,
): AWSInstance {
  const tags = ((instance?.tags as Record<string, string> | null | undefined) || {});
  return {
    instance_id: String(instance?.instance_id || ""),
    name: String(instance?.name || ""),
    state: String(instance?.state || ""),
    instance_type: String(instance?.instance_type || ""),
    image_id: String(instance?.image_id || ""),
    key_name: String(instance?.key_name || ""),
    public_ip: String(instance?.public_ip || ""),
    private_ip: String(instance?.private_ip || ""),
    availability_zone: String(instance?.availability_zone || ""),
    launch_time: String(instance?.launch_time || ""),
    tags,
  };
}

async function requestCloud<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as ApiEnvelope<T>) : null;

  if (!response.ok || payload?.status === "error") {
    throw new CloudApiError(payload?.message || `HTTP ${response.status}`, response.status);
  }

  return payload?.data as T;
}

export async function getAWSAccount(): Promise<AWSAccount> {
  return requestCloud<AWSAccount>("/api/admin/cloud/aws/account");
}

export async function getAWSCredentials(): Promise<AWSCredentialPool> {
  const data = await requestCloud<Partial<AWSCredentialPool>>(
    "/api/admin/cloud/aws/credentials",
  );
  return {
    active_credential_id: String(data?.active_credential_id || ""),
    active_region: String(data?.active_region || "us-east-1"),
    credentials: Array.isArray(data?.credentials)
      ? data.credentials.map(normalizeCredentialRecord)
      : [],
  };
}

export async function saveAWSCredentials(input: {
  credentials: AWSCredentialInput[];
  active_credential_id?: string;
  active_region?: string;
}): Promise<AWSCredentialPool> {
  const data = await requestCloud<Partial<AWSCredentialPool>>(
    "/api/admin/cloud/aws/credentials",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
  return {
    active_credential_id: String(data?.active_credential_id || ""),
    active_region: String(data?.active_region || "us-east-1"),
    credentials: Array.isArray(data?.credentials)
      ? data.credentials.map(normalizeCredentialRecord)
      : [],
  };
}

export async function setAWSActiveCredential(
  credentialId: string,
): Promise<AWSCredentialPool> {
  const data = await requestCloud<Partial<AWSCredentialPool>>(
    "/api/admin/cloud/aws/credentials/active",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ credential_id: credentialId }),
    },
  );

  return {
    active_credential_id: String(data?.active_credential_id || ""),
    active_region: String(data?.active_region || "us-east-1"),
    credentials: Array.isArray(data?.credentials)
      ? data.credentials.map(normalizeCredentialRecord)
      : [],
  };
}

export async function setAWSActiveRegion(region: string): Promise<AWSCredentialPool> {
  const data = await requestCloud<Partial<AWSCredentialPool>>(
    "/api/admin/cloud/aws/credentials/region",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ region }),
    },
  );

  return {
    active_credential_id: String(data?.active_credential_id || ""),
    active_region: String(data?.active_region || "us-east-1"),
    credentials: Array.isArray(data?.credentials)
      ? data.credentials.map(normalizeCredentialRecord)
      : [],
  };
}

export async function checkAWSCredentials(
  credentialIds?: string[],
): Promise<AWSCredentialPool> {
  const data = await requestCloud<Partial<AWSCredentialPool>>(
    "/api/admin/cloud/aws/credentials/check",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentialIds?.length ? { credential_ids: credentialIds } : {}),
    },
  );

  return {
    active_credential_id: String(data?.active_credential_id || ""),
    active_region: String(data?.active_region || "us-east-1"),
    credentials: Array.isArray(data?.credentials)
      ? data.credentials.map(normalizeCredentialRecord)
      : [],
  };
}

export async function deleteAWSCredential(
  credentialId: string,
): Promise<AWSCredentialPool> {
  const data = await requestCloud<Partial<AWSCredentialPool>>(
    `/api/admin/cloud/aws/credentials/${credentialId}`,
    {
      method: "DELETE",
    },
  );

  return {
    active_credential_id: String(data?.active_credential_id || ""),
    active_region: String(data?.active_region || "us-east-1"),
    credentials: Array.isArray(data?.credentials)
      ? data.credentials.map(normalizeCredentialRecord)
      : [],
  };
}

export async function getAWSCredentialSecret(
  credentialId: string,
): Promise<AWSCredentialSecret> {
  const data = await requestCloud<Partial<AWSCredentialSecret>>(
    `/api/admin/cloud/aws/credentials/${credentialId}/secret`,
  );
  return normalizeCredentialSecret(data);
}

export async function getAWSCatalog(): Promise<AWSCatalog> {
  const data = await requestCloud<Partial<AWSCatalog>>("/api/admin/cloud/aws/catalog");
  return {
    active_region: String(data?.active_region || "us-east-1"),
    regions: Array.isArray(data?.regions) ? data.regions.map(normalizeRegion) : [],
    instance_types: Array.isArray(data?.instance_types)
      ? data.instance_types.map(normalizeInstanceType)
      : [],
    images: Array.isArray(data?.images) ? data.images.map(normalizeImage) : [],
    key_pairs: Array.isArray(data?.key_pairs) ? data.key_pairs.map(normalizeKeyPair) : [],
    subnets: Array.isArray(data?.subnets) ? data.subnets.map(normalizeSubnet) : [],
    security_groups: Array.isArray(data?.security_groups)
      ? data.security_groups.map(normalizeSecurityGroup)
      : [],
  };
}

export async function listAWSInstances(): Promise<AWSInstance[]> {
  const data = await requestCloud<Partial<AWSInstance>[]>(
    "/api/admin/cloud/aws/instances",
  );
  return Array.isArray(data) ? data.map(normalizeInstance) : [];
}

export async function createAWSInstance(
  input: CreateAWSInstanceInput,
): Promise<CreateAWSInstanceResult> {
  const data = await requestCloud<{
    instance?: Partial<AWSInstance> | null;
  }>("/api/admin/cloud/aws/instances", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return {
    instance: normalizeInstance(data?.instance),
  };
}

export async function deleteAWSInstance(instanceId: string): Promise<void> {
  await requestCloud(`/api/admin/cloud/aws/instances/${instanceId}`, {
    method: "DELETE",
  });
}

export async function postAWSInstanceAction(
  instanceId: string,
  type: string,
): Promise<void> {
  await requestCloud(`/api/admin/cloud/aws/instances/${instanceId}/actions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type }),
  });
}

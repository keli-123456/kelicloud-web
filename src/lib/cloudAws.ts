type ApiEnvelope<T> = {
  status: string;
  message: string;
  data: T;
};

const AWS_CLOUD_REQUEST_TIMEOUT_MS = 60000;
const AWS_CLOUD_CREATE_REQUEST_TIMEOUT_MS = 90000;

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
  ec2_quota: AWSEC2Quota | null;
  ec2_quota_error: string;
};

export type AWSEC2Quota = {
  region: string;
  max_standard_vcpus: number;
  max_instances: number;
  max_elastic_ips: number;
  vpc_max_elastic_ips: number;
  vpc_max_security_groups_per_interface: number;
  instance_standard_vcpus: number;
  reserved_standard_vcpus: number;
  running_standard_vcpus: number;
  running_instances: number;
  total_instances: number;
  allocated_elastic_ips: number;
  associated_elastic_ips: number;
};

export type AWSCredentialInput = {
  id?: string;
  name: string;
  group?: string;
  access_key_id: string;
  secret_access_key: string;
  session_token?: string;
  default_region?: string;
};

export type AWSCredentialRecord = {
  id: string;
  name: string;
  group: string;
  masked_access_key_id: string;
  default_region: string;
  account_id: string;
  arn: string;
  user_id: string;
  ec2_quota: AWSEC2Quota | null;
  ec2_quota_error: string;
  last_status: string;
  last_error: string;
  last_checked_at: string;
  is_active: boolean;
};

export type AWSCredentialPool = {
  active_credential_id: string;
  active_region: string;
  password_storage_enabled: boolean;
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
  ec2_quota: AWSEC2Quota | null;
  ec2_quota_error: string;
};

export type AWSFollowUpTask = {
  id: number;
  credential_id: string;
  credential_name: string;
  region: string;
  task_type: string;
  resource_id: string;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string;
  last_attempt_at: string;
  next_run_at: string;
  completed_at: string;
  created_at: string;
  updated_at: string;
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

export type AWSInstanceTypeOffering = {
  instance_type: string;
  availability_zones: string[];
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

export type AWSElasticAddress = {
  allocation_id: string;
  association_id: string;
  public_ip: string;
  private_ip: string;
  domain: string;
  network_interface_id: string;
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
  saved_root_password: boolean;
  saved_root_password_updated_at: string;
};

export type AWSResourcePassword = {
  resource_type: string;
  resource_id: string;
  resource_name: string;
  username: string;
  password_mode: string;
  root_password: string;
  updated_at: string;
};

export type AWSVolume = {
  volume_id: string;
  device_name: string;
  size_gib: number;
  volume_type: string;
  state: string;
  delete_on_termination: boolean;
  encrypted: boolean;
  iops: number;
  throughput: number;
  snapshot_id: string;
  created_at: string;
};

export type AWSInstanceDetail = {
  instance: AWSInstance;
  vpc_id: string;
  subnet_id: string;
  architecture: string;
  platform_details: string;
  virtualization_type: string;
  root_device_name: string;
  monitoring_state: string;
  state_reason: string;
  public_dns_name: string;
  private_dns_name: string;
  security_groups: AWSSecurityGroup[];
  volumes: AWSVolume[];
  addresses: AWSElasticAddress[];
  console_output: string;
};

export type AWSTag = {
  key: string;
  value: string;
};

export type AWSLightsailAvailabilityZone = {
  name: string;
  state: string;
};

export type AWSLightsailRegion = {
  name: string;
  display_name: string;
  description: string;
  availability_zones: AWSLightsailAvailabilityZone[];
};

export type AWSLightsailBundle = {
  bundle_id: string;
  name: string;
  price: number;
  ram_size_in_gb: number;
  disk_size_in_gb: number;
  transfer_per_month_in_gb: number;
  cpu_count: number;
  is_active: boolean;
};

export type AWSLightsailBlueprint = {
  blueprint_id: string;
  name: string;
  description: string;
  group: string;
  platform: string;
  is_active: boolean;
};

export type AWSLightsailKeyPair = {
  name: string;
  fingerprint: string;
  created_at: string;
};

export type AWSLightsailStaticIP = {
  name: string;
  ip_address: string;
  attached_to: string;
  is_attached: boolean;
  created_at: string;
};

export type AWSLightsailDisk = {
  name: string;
  path: string;
  size_in_gb: number;
  is_system: boolean;
  attached_to: string;
  state: string;
};

export type AWSLightsailInstance = {
  name: string;
  state: string;
  blueprint_id: string;
  blueprint_name: string;
  bundle_id: string;
  public_ip: string;
  private_ip: string;
  ipv6_addresses: string[];
  username: string;
  ssh_key_name: string;
  availability_zone: string;
  region: string;
  is_static_ip: boolean;
  created_at: string;
  cpu_count: number;
  ram_size_in_gb: number;
  disks: AWSLightsailDisk[];
  tags: Record<string, string>;
  saved_root_password: boolean;
  saved_root_password_updated_at: string;
};

export type AWSLightsailPort = {
  from_port: number;
  to_port: number;
  protocol: string;
  access_from: string;
  access_type: string;
  cidrs: string[];
  ipv6_cidrs: string[];
  cidr_aliases: string[];
  common_name: string;
  access_direction: string;
};

export type AWSLightsailSnapshot = {
  name: string;
  from_instance_name: string;
  from_blueprint_id: string;
  from_bundle_id: string;
  state: string;
  size_in_gb: number;
  is_auto: boolean;
  created_at: string;
};

export type AWSLightsailInstanceDetail = {
  instance: AWSLightsailInstance;
  ports: AWSLightsailPort[];
  static_ips: AWSLightsailStaticIP[];
  snapshots: AWSLightsailSnapshot[];
};

export type AWSCatalog = {
  active_region: string;
  regions: AWSRegion[];
  instance_types: AWSInstanceType[];
  instance_type_offerings: AWSInstanceTypeOffering[];
  images: AWSImage[];
  key_pairs: AWSKeyPair[];
  subnets: AWSSubnet[];
  security_groups: AWSSecurityGroup[];
  elastic_addresses: AWSElasticAddress[];
};

export type CreateAWSInstanceInput = {
  region?: string;
  name?: string;
  image_id: string;
  instance_type: string;
  key_name: string;
  subnet_id: string;
  security_group_ids: string[];
  user_data: string;
  assign_public_ip: boolean;
  assign_ipv6: boolean;
  allow_all_traffic: boolean;
  root_password_mode?: "none" | "custom" | "random";
  root_password?: string;
  tags: AWSTag[];
  auto_connect: boolean;
  auto_connect_group: string;
};

export type CreateAWSInstanceResult = {
  instance: AWSInstance;
  warning: string;
  generated_password: string;
  password_saved: boolean;
  password_save_error: string;
};

export type CreateAWSInstanceActionInput = {
  type: string;
  name?: string;
  description?: string;
  no_reboot?: boolean;
  instance_type?: string;
  tags?: AWSTag[];
  allocation_id?: string;
  association_id?: string;
  private_ip?: string;
};

export type CreateAWSLightsailInstanceInput = {
  region?: string;
  name?: string;
  availability_zone: string;
  blueprint_id: string;
  bundle_id: string;
  key_pair_name?: string;
  user_data?: string;
  ip_address_type?: string;
  allow_all_traffic: boolean;
  root_password_mode?: "none" | "custom" | "random";
  root_password?: string;
  tags?: AWSTag[];
  auto_connect: boolean;
  auto_connect_group: string;
};

export type CreateAWSLightsailInstanceResult = {
  name: string;
  status: string;
  warning: string;
  generated_password: string;
  password_saved: boolean;
  password_save_error: string;
};

export type AWSLightsailCatalog = {
  active_region: string;
  regions: AWSLightsailRegion[];
  bundles: AWSLightsailBundle[];
  blueprints: AWSLightsailBlueprint[];
  key_pairs: AWSLightsailKeyPair[];
  static_ips: AWSLightsailStaticIP[];
};

export type AWSLightsailInstanceActionInput = {
  type: string;
  snapshot_name?: string;
  static_ip_name?: string;
  tags?: AWSTag[];
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeEC2Quota(quota: Partial<AWSEC2Quota> | null | undefined): AWSEC2Quota | null {
  if (!quota) return null;

  const normalized = {
    region: String(quota.region || ""),
    max_standard_vcpus: Number(quota.max_standard_vcpus || 0),
    max_instances: Number(quota.max_instances || 0),
    max_elastic_ips: Number(quota.max_elastic_ips || 0),
    vpc_max_elastic_ips: Number(quota.vpc_max_elastic_ips || 0),
    vpc_max_security_groups_per_interface: Number(quota.vpc_max_security_groups_per_interface || 0),
    instance_standard_vcpus: Number(quota.instance_standard_vcpus || 0),
    reserved_standard_vcpus: Number(quota.reserved_standard_vcpus || 0),
    running_standard_vcpus: Number(quota.running_standard_vcpus || 0),
    running_instances: Number(quota.running_instances || 0),
    total_instances: Number(quota.total_instances || 0),
    allocated_elastic_ips: Number(quota.allocated_elastic_ips || 0),
    associated_elastic_ips: Number(quota.associated_elastic_ips || 0),
  };

  if (
    !normalized.region
    && normalized.max_standard_vcpus <= 0
    && normalized.max_instances <= 0
    && normalized.max_elastic_ips <= 0
    && normalized.vpc_max_elastic_ips <= 0
    && normalized.vpc_max_security_groups_per_interface <= 0
    && normalized.instance_standard_vcpus <= 0
    && normalized.reserved_standard_vcpus <= 0
    && normalized.running_standard_vcpus <= 0
    && normalized.running_instances <= 0
    && normalized.total_instances <= 0
    && normalized.allocated_elastic_ips <= 0
    && normalized.associated_elastic_ips <= 0
  ) {
    return null;
  }

  return normalized;
}

function normalizeAccount(account: Partial<AWSAccount> | null | undefined): AWSAccount {
  return {
    account_id: String(account?.account_id || ""),
    arn: String(account?.arn || ""),
    user_id: String(account?.user_id || ""),
    region: String(account?.region || "us-east-1"),
    ec2_quota: normalizeEC2Quota(account?.ec2_quota),
    ec2_quota_error: String(account?.ec2_quota_error || ""),
  };
}

function normalizeCredentialRecord(
  credential: Partial<AWSCredentialRecord> | null | undefined,
): AWSCredentialRecord {
  return {
    id: String(credential?.id || ""),
    name: String(credential?.name || ""),
    group: String(credential?.group || ""),
    masked_access_key_id: String(credential?.masked_access_key_id || ""),
    default_region: String(credential?.default_region || "us-east-1"),
    account_id: String(credential?.account_id || ""),
    arn: String(credential?.arn || ""),
    user_id: String(credential?.user_id || ""),
    ec2_quota: normalizeEC2Quota(credential?.ec2_quota),
    ec2_quota_error: String(credential?.ec2_quota_error || ""),
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
    ec2_quota: normalizeEC2Quota(credential?.ec2_quota),
    ec2_quota_error: String(credential?.ec2_quota_error || ""),
  };
}

function normalizeFollowUpTask(
  task: Partial<AWSFollowUpTask> | null | undefined,
): AWSFollowUpTask {
  return {
    id: Number(task?.id || 0),
    credential_id: String(task?.credential_id || ""),
    credential_name: String(task?.credential_name || ""),
    region: String(task?.region || ""),
    task_type: String(task?.task_type || ""),
    resource_id: String(task?.resource_id || ""),
    status: String(task?.status || ""),
    attempts: Number(task?.attempts || 0),
    max_attempts: Number(task?.max_attempts || 0),
    last_error: String(task?.last_error || ""),
    last_attempt_at: String(task?.last_attempt_at || ""),
    next_run_at: String(task?.next_run_at || ""),
    completed_at: String(task?.completed_at || ""),
    created_at: String(task?.created_at || ""),
    updated_at: String(task?.updated_at || ""),
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

function normalizeInstanceTypeOffering(
  offering: Partial<AWSInstanceTypeOffering> | null | undefined,
): AWSInstanceTypeOffering {
  return {
    instance_type: String(offering?.instance_type || ""),
    availability_zones: normalizeStringArray(offering?.availability_zones),
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

function normalizeElasticAddress(
  address: Partial<AWSElasticAddress> | null | undefined,
): AWSElasticAddress {
  return {
    allocation_id: String(address?.allocation_id || ""),
    association_id: String(address?.association_id || ""),
    public_ip: String(address?.public_ip || ""),
    private_ip: String(address?.private_ip || ""),
    domain: String(address?.domain || ""),
    network_interface_id: String(address?.network_interface_id || ""),
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
    saved_root_password: Boolean(instance?.saved_root_password),
    saved_root_password_updated_at: String(instance?.saved_root_password_updated_at || ""),
  };
}

function normalizeResourcePassword(
  credential: Partial<AWSResourcePassword> | null | undefined,
): AWSResourcePassword {
  return {
    resource_type: String(credential?.resource_type || ""),
    resource_id: String(credential?.resource_id || ""),
    resource_name: String(credential?.resource_name || ""),
    username: String(credential?.username || ""),
    password_mode: String(credential?.password_mode || ""),
    root_password: String(credential?.root_password || ""),
    updated_at: String(credential?.updated_at || ""),
  };
}

function normalizeVolume(volume: Partial<AWSVolume> | null | undefined): AWSVolume {
  return {
    volume_id: String(volume?.volume_id || ""),
    device_name: String(volume?.device_name || ""),
    size_gib: Number(volume?.size_gib || 0),
    volume_type: String(volume?.volume_type || ""),
    state: String(volume?.state || ""),
    delete_on_termination: Boolean(volume?.delete_on_termination),
    encrypted: Boolean(volume?.encrypted),
    iops: Number(volume?.iops || 0),
    throughput: Number(volume?.throughput || 0),
    snapshot_id: String(volume?.snapshot_id || ""),
    created_at: String(volume?.created_at || ""),
  };
}

function normalizeInstanceDetail(
  detail: Partial<AWSInstanceDetail> | null | undefined,
): AWSInstanceDetail {
  return {
    instance: normalizeInstance(detail?.instance),
    vpc_id: String(detail?.vpc_id || ""),
    subnet_id: String(detail?.subnet_id || ""),
    architecture: String(detail?.architecture || ""),
    platform_details: String(detail?.platform_details || ""),
    virtualization_type: String(detail?.virtualization_type || ""),
    root_device_name: String(detail?.root_device_name || ""),
    monitoring_state: String(detail?.monitoring_state || ""),
    state_reason: String(detail?.state_reason || ""),
    public_dns_name: String(detail?.public_dns_name || ""),
    private_dns_name: String(detail?.private_dns_name || ""),
    security_groups: Array.isArray(detail?.security_groups)
      ? detail.security_groups.map(normalizeSecurityGroup)
      : [],
    volumes: Array.isArray(detail?.volumes) ? detail.volumes.map(normalizeVolume) : [],
    addresses: Array.isArray(detail?.addresses)
      ? detail.addresses.map(normalizeElasticAddress)
      : [],
    console_output: String(detail?.console_output || ""),
  };
}

function normalizeLightsailAvailabilityZone(
  zone: Partial<AWSLightsailAvailabilityZone> | null | undefined,
): AWSLightsailAvailabilityZone {
  return {
    name: String(zone?.name || ""),
    state: String(zone?.state || ""),
  };
}

function normalizeLightsailRegion(
  region: Partial<AWSLightsailRegion> | null | undefined,
): AWSLightsailRegion {
  return {
    name: String(region?.name || ""),
    display_name: String(region?.display_name || ""),
    description: String(region?.description || ""),
    availability_zones: Array.isArray(region?.availability_zones)
      ? region.availability_zones.map(normalizeLightsailAvailabilityZone)
      : [],
  };
}

function normalizeLightsailBundle(
  bundle: Partial<AWSLightsailBundle> | null | undefined,
): AWSLightsailBundle {
  return {
    bundle_id: String(bundle?.bundle_id || ""),
    name: String(bundle?.name || ""),
    price: Number(bundle?.price || 0),
    ram_size_in_gb: Number(bundle?.ram_size_in_gb || 0),
    disk_size_in_gb: Number(bundle?.disk_size_in_gb || 0),
    transfer_per_month_in_gb: Number(bundle?.transfer_per_month_in_gb || 0),
    cpu_count: Number(bundle?.cpu_count || 0),
    is_active: Boolean(bundle?.is_active),
  };
}

function normalizeLightsailBlueprint(
  blueprint: Partial<AWSLightsailBlueprint> | null | undefined,
): AWSLightsailBlueprint {
  return {
    blueprint_id: String(blueprint?.blueprint_id || ""),
    name: String(blueprint?.name || ""),
    description: String(blueprint?.description || ""),
    group: String(blueprint?.group || ""),
    platform: String(blueprint?.platform || ""),
    is_active: Boolean(blueprint?.is_active),
  };
}

function normalizeLightsailKeyPair(
  keyPair: Partial<AWSLightsailKeyPair> | null | undefined,
): AWSLightsailKeyPair {
  return {
    name: String(keyPair?.name || ""),
    fingerprint: String(keyPair?.fingerprint || ""),
    created_at: String(keyPair?.created_at || ""),
  };
}

function normalizeLightsailStaticIP(
  staticIP: Partial<AWSLightsailStaticIP> | null | undefined,
): AWSLightsailStaticIP {
  return {
    name: String(staticIP?.name || ""),
    ip_address: String(staticIP?.ip_address || ""),
    attached_to: String(staticIP?.attached_to || ""),
    is_attached: Boolean(staticIP?.is_attached),
    created_at: String(staticIP?.created_at || ""),
  };
}

function normalizeLightsailDisk(
  disk: Partial<AWSLightsailDisk> | null | undefined,
): AWSLightsailDisk {
  return {
    name: String(disk?.name || ""),
    path: String(disk?.path || ""),
    size_in_gb: Number(disk?.size_in_gb || 0),
    is_system: Boolean(disk?.is_system),
    attached_to: String(disk?.attached_to || ""),
    state: String(disk?.state || ""),
  };
}

function normalizeLightsailInstance(
  instance: Partial<AWSLightsailInstance> | null | undefined,
): AWSLightsailInstance {
  const tags = ((instance?.tags as Record<string, string> | null | undefined) || {});
  return {
    name: String(instance?.name || ""),
    state: String(instance?.state || ""),
    blueprint_id: String(instance?.blueprint_id || ""),
    blueprint_name: String(instance?.blueprint_name || ""),
    bundle_id: String(instance?.bundle_id || ""),
    public_ip: String(instance?.public_ip || ""),
    private_ip: String(instance?.private_ip || ""),
    ipv6_addresses: normalizeStringArray(instance?.ipv6_addresses),
    username: String(instance?.username || ""),
    ssh_key_name: String(instance?.ssh_key_name || ""),
    availability_zone: String(instance?.availability_zone || ""),
    region: String(instance?.region || ""),
    is_static_ip: Boolean(instance?.is_static_ip),
    created_at: String(instance?.created_at || ""),
    cpu_count: Number(instance?.cpu_count || 0),
    ram_size_in_gb: Number(instance?.ram_size_in_gb || 0),
    disks: Array.isArray(instance?.disks) ? instance.disks.map(normalizeLightsailDisk) : [],
    tags,
    saved_root_password: Boolean(instance?.saved_root_password),
    saved_root_password_updated_at: String(instance?.saved_root_password_updated_at || ""),
  };
}

function normalizeLightsailPort(
  port: Partial<AWSLightsailPort> | null | undefined,
): AWSLightsailPort {
  return {
    from_port: Number(port?.from_port || 0),
    to_port: Number(port?.to_port || 0),
    protocol: String(port?.protocol || ""),
    access_from: String(port?.access_from || ""),
    access_type: String(port?.access_type || ""),
    cidrs: normalizeStringArray(port?.cidrs),
    ipv6_cidrs: normalizeStringArray(port?.ipv6_cidrs),
    cidr_aliases: normalizeStringArray(port?.cidr_aliases),
    common_name: String(port?.common_name || ""),
    access_direction: String(port?.access_direction || ""),
  };
}

function normalizeLightsailSnapshot(
  snapshot: Partial<AWSLightsailSnapshot> | null | undefined,
): AWSLightsailSnapshot {
  return {
    name: String(snapshot?.name || ""),
    from_instance_name: String(snapshot?.from_instance_name || ""),
    from_blueprint_id: String(snapshot?.from_blueprint_id || ""),
    from_bundle_id: String(snapshot?.from_bundle_id || ""),
    state: String(snapshot?.state || ""),
    size_in_gb: Number(snapshot?.size_in_gb || 0),
    is_auto: Boolean(snapshot?.is_auto),
    created_at: String(snapshot?.created_at || ""),
  };
}

function normalizeLightsailInstanceDetail(
  detail: Partial<AWSLightsailInstanceDetail> | null | undefined,
): AWSLightsailInstanceDetail {
  return {
    instance: normalizeLightsailInstance(detail?.instance),
    ports: Array.isArray(detail?.ports) ? detail.ports.map(normalizeLightsailPort) : [],
    static_ips: Array.isArray(detail?.static_ips)
      ? detail.static_ips.map(normalizeLightsailStaticIP)
      : [],
    snapshots: Array.isArray(detail?.snapshots)
      ? detail.snapshots.map(normalizeLightsailSnapshot)
      : [],
  };
}

async function requestCloud<T>(path: string, init?: RequestInit, timeoutMs = AWS_CLOUD_REQUEST_TIMEOUT_MS): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const requestUrl =
    method === "GET"
      ? `${path}${path.includes("?") ? "&" : "?"}__ts=${Date.now()}`
      : path;

  const controller = new AbortController();
  const timeoutID = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(requestUrl, {
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
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new CloudApiError(`Request timed out while loading ${path}`, 408);
    }
    throw error;
  } finally {
    clearTimeout(timeoutID);
  }

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

export async function getAWSAccount(includeQuota = false): Promise<AWSAccount> {
  const path = includeQuota
    ? "/api/admin/cloud/aws/account?include_quota=1"
    : "/api/admin/cloud/aws/account";
  const data = await requestCloud<Partial<AWSAccount>>(path);
  return normalizeAccount(data);
}

export async function getAWSCredentials(): Promise<AWSCredentialPool> {
  const data = await requestCloud<Partial<AWSCredentialPool>>(
    "/api/admin/cloud/aws/credentials",
  );
  return {
    active_credential_id: String(data?.active_credential_id || ""),
    active_region: String(data?.active_region || "us-east-1"),
    password_storage_enabled: Boolean(data?.password_storage_enabled),
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
    password_storage_enabled: Boolean(data?.password_storage_enabled),
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
    password_storage_enabled: Boolean(data?.password_storage_enabled),
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
    password_storage_enabled: Boolean(data?.password_storage_enabled),
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
    password_storage_enabled: Boolean(data?.password_storage_enabled),
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
    password_storage_enabled: Boolean(data?.password_storage_enabled),
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

export async function listAWSFollowUpTasks(): Promise<AWSFollowUpTask[]> {
  const data = await requestCloud<Partial<AWSFollowUpTask>[]>(
    "/api/admin/cloud/aws/follow-up-tasks",
  );
  return Array.isArray(data) ? data.map(normalizeFollowUpTask) : [];
}

export async function retryAWSFollowUpTask(taskId: number): Promise<void> {
  await requestCloud(`/api/admin/cloud/aws/follow-up-tasks/${taskId}/retry`, {
    method: "POST",
  });
}

export async function clearAWSFollowUpTerminalTasks(): Promise<number> {
  const data = await requestCloud<{ deleted_count?: number | null }>(
    "/api/admin/cloud/aws/follow-up-tasks/terminal",
    {
      method: "DELETE",
    },
  );
  return Number(data?.deleted_count || 0);
}

export async function getAWSCatalog(region?: string): Promise<AWSCatalog> {
  const path = region
    ? `/api/admin/cloud/aws/catalog?region=${encodeURIComponent(region)}`
    : "/api/admin/cloud/aws/catalog";
  const data = await requestCloud<Partial<AWSCatalog>>(path);
  return {
    active_region: String(data?.active_region || "us-east-1"),
    regions: Array.isArray(data?.regions) ? data.regions.map(normalizeRegion) : [],
    instance_types: Array.isArray(data?.instance_types)
      ? data.instance_types.map(normalizeInstanceType)
      : [],
    instance_type_offerings: Array.isArray(data?.instance_type_offerings)
      ? data.instance_type_offerings.map(normalizeInstanceTypeOffering)
      : [],
    images: Array.isArray(data?.images) ? data.images.map(normalizeImage) : [],
    key_pairs: Array.isArray(data?.key_pairs) ? data.key_pairs.map(normalizeKeyPair) : [],
    subnets: Array.isArray(data?.subnets) ? data.subnets.map(normalizeSubnet) : [],
    security_groups: Array.isArray(data?.security_groups)
      ? data.security_groups.map(normalizeSecurityGroup)
      : [],
    elastic_addresses: Array.isArray(data?.elastic_addresses)
      ? data.elastic_addresses.map(normalizeElasticAddress)
      : [],
  };
}

export async function listAWSInstances(): Promise<AWSInstance[]> {
  const data = await requestCloud<Partial<AWSInstance>[]>(
    "/api/admin/cloud/aws/instances",
  );
  return Array.isArray(data) ? data.map(normalizeInstance) : [];
}

export async function getAWSInstanceDetail(instanceId: string): Promise<AWSInstanceDetail> {
  const data = await requestCloud<Partial<AWSInstanceDetail>>(
    `/api/admin/cloud/aws/instances/${instanceId}`,
  );
  return normalizeInstanceDetail(data);
}

export async function getAWSInstancePassword(
  instanceId: string,
): Promise<AWSResourcePassword> {
  const data = await requestCloud<Partial<AWSResourcePassword>>(
    `/api/admin/cloud/aws/instances/${instanceId}/password`,
  );
  return normalizeResourcePassword(data);
}

export async function createAWSInstance(
  input: CreateAWSInstanceInput,
): Promise<CreateAWSInstanceResult> {
  const data = await requestCloud<{
    instance?: Partial<AWSInstance> | null;
    warning?: string | null;
    generated_password?: string | null;
    password_saved?: boolean;
    password_save_error?: string | null;
  }>("/api/admin/cloud/aws/instances", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  }, AWS_CLOUD_CREATE_REQUEST_TIMEOUT_MS);
  return {
    instance: normalizeInstance(data?.instance),
    warning: String(data?.warning || ""),
    generated_password: String(data?.generated_password || ""),
    password_saved: Boolean(data?.password_saved),
    password_save_error: String(data?.password_save_error || ""),
  };
}

export async function deleteAWSInstance(instanceId: string): Promise<void> {
  await requestCloud(`/api/admin/cloud/aws/instances/${instanceId}`, {
    method: "DELETE",
  });
}

export async function postAWSInstanceAction(
  instanceId: string,
  input: string | CreateAWSInstanceActionInput,
): Promise<void> {
  await requestCloud(`/api/admin/cloud/aws/instances/${instanceId}/actions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(typeof input === "string" ? { type: input } : input),
  });
}

export async function getAWSLightsailCatalog(region?: string): Promise<AWSLightsailCatalog> {
  const path = region
    ? `/api/admin/cloud/aws/lightsail/catalog?region=${encodeURIComponent(region)}`
    : "/api/admin/cloud/aws/lightsail/catalog";
  const data = await requestCloud<Partial<AWSLightsailCatalog>>(path);
  return {
    active_region: String(data?.active_region || "us-east-1"),
    regions: Array.isArray(data?.regions) ? data.regions.map(normalizeLightsailRegion) : [],
    bundles: Array.isArray(data?.bundles) ? data.bundles.map(normalizeLightsailBundle) : [],
    blueprints: Array.isArray(data?.blueprints)
      ? data.blueprints.map(normalizeLightsailBlueprint)
      : [],
    key_pairs: Array.isArray(data?.key_pairs) ? data.key_pairs.map(normalizeLightsailKeyPair) : [],
    static_ips: Array.isArray(data?.static_ips)
      ? data.static_ips.map(normalizeLightsailStaticIP)
      : [],
  };
}

export async function listAWSLightsailInstances(): Promise<AWSLightsailInstance[]> {
  const data = await requestCloud<Partial<AWSLightsailInstance>[]>(
    "/api/admin/cloud/aws/lightsail/instances",
  );
  return Array.isArray(data) ? data.map(normalizeLightsailInstance) : [];
}

export async function getAWSLightsailInstanceDetail(
  instanceName: string,
): Promise<AWSLightsailInstanceDetail> {
  const data = await requestCloud<Partial<AWSLightsailInstanceDetail>>(
    `/api/admin/cloud/aws/lightsail/instances/${encodeURIComponent(instanceName)}`,
  );
  return normalizeLightsailInstanceDetail(data);
}

export async function getAWSLightsailInstancePassword(
  instanceName: string,
): Promise<AWSResourcePassword> {
  const data = await requestCloud<Partial<AWSResourcePassword>>(
    `/api/admin/cloud/aws/lightsail/instances/${encodeURIComponent(instanceName)}/password`,
  );
  return normalizeResourcePassword(data);
}

export async function createAWSLightsailInstance(
  input: CreateAWSLightsailInstanceInput,
): Promise<CreateAWSLightsailInstanceResult> {
  const data = await requestCloud<{
    name?: string | null;
    status?: string | null;
    warning?: string | null;
    generated_password?: string | null;
    password_saved?: boolean;
    password_save_error?: string | null;
  }>("/api/admin/cloud/aws/lightsail/instances", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return {
    name: String(data?.name || ""),
    status: String(data?.status || ""),
    warning: String(data?.warning || ""),
    generated_password: String(data?.generated_password || ""),
    password_saved: Boolean(data?.password_saved),
    password_save_error: String(data?.password_save_error || ""),
  };
}

export async function deleteAWSLightsailInstance(instanceName: string): Promise<void> {
  await requestCloud(`/api/admin/cloud/aws/lightsail/instances/${encodeURIComponent(instanceName)}`, {
    method: "DELETE",
  });
}

export async function postAWSLightsailInstanceAction(
  instanceName: string,
  input: string | AWSLightsailInstanceActionInput,
): Promise<void> {
  await requestCloud(`/api/admin/cloud/aws/lightsail/instances/${encodeURIComponent(instanceName)}/actions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(typeof input === "string" ? { type: input } : input),
  });
}

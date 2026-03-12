import { CloudApiError, type DigitalOceanDroplet, type DigitalOceanManagedSSHKeyMaterial } from "./cloud";
import type { AWSInstanceDetail, AWSLightsailInstanceDetail } from "./cloudAws";
import type { LinodeInstanceDetail } from "./cloudLinode";

type ApiEnvelope<T> = {
  status: string;
  message: string;
  data: T;
};

export type CloudShareProvider = "digitalocean" | "linode" | "aws";
export type CloudShareResourceType = "droplet" | "instance" | "ec2" | "lightsail";

export type CloudInstanceShareRecord = {
  token: string;
  provider: CloudShareProvider;
  resource_type: CloudShareResourceType;
  resource_id: string;
  resource_name: string;
  credential_name: string;
  region: string;
  title: string;
  note: string;
  share_password: boolean;
  share_managed_ssh_key: boolean;
  can_share_password: boolean;
  can_share_managed_ssh_key: boolean;
  created_at: string;
  updated_at: string;
};

export type SaveCloudInstanceShareInput = {
  title: string;
  note: string;
  share_password: boolean;
  share_managed_ssh_key: boolean;
};

export type CloudSharedRootPassword = {
  username: string;
  password_mode: string;
  root_password: string;
  updated_at: string;
};

export type CloudPublicShareData = {
  token: string;
  provider: CloudShareProvider;
  resource_type: CloudShareResourceType;
  resource_id: string;
  resource_name: string;
  credential_name: string;
  region: string;
  title: string;
  note: string;
  share_password: boolean;
  share_managed_ssh_key: boolean;
  created_at: string;
  updated_at: string;
  detail:
    | DigitalOceanDroplet
    | LinodeInstanceDetail
    | AWSInstanceDetail
    | AWSLightsailInstanceDetail
    | null;
  root_password: CloudSharedRootPassword | null;
  managed_ssh_key: DigitalOceanManagedSSHKeyMaterial | null;
};

function normalizeShareRecord(
  share: Partial<CloudInstanceShareRecord> | null | undefined,
): CloudInstanceShareRecord {
  return {
    token: String(share?.token || ""),
    provider: (String(share?.provider || "digitalocean") as CloudShareProvider),
    resource_type: (String(share?.resource_type || "droplet") as CloudShareResourceType),
    resource_id: String(share?.resource_id || ""),
    resource_name: String(share?.resource_name || ""),
    credential_name: String(share?.credential_name || ""),
    region: String(share?.region || ""),
    title: String(share?.title || ""),
    note: String(share?.note || ""),
    share_password: Boolean(share?.share_password),
    share_managed_ssh_key: Boolean(share?.share_managed_ssh_key),
    can_share_password: Boolean(share?.can_share_password),
    can_share_managed_ssh_key: Boolean(share?.can_share_managed_ssh_key),
    created_at: String(share?.created_at || ""),
    updated_at: String(share?.updated_at || ""),
  };
}

function normalizeSharedRootPassword(
  password: Partial<CloudSharedRootPassword> | null | undefined,
): CloudSharedRootPassword | null {
  if (!password) return null;
  const rootPassword = String(password.root_password || "");
  const username = String(password.username || "");
  const passwordMode = String(password.password_mode || "");
  const updatedAt = String(password.updated_at || "");
  if (!rootPassword && !username && !passwordMode && !updatedAt) return null;
  return {
    username: username || "root",
    password_mode: passwordMode,
    root_password: rootPassword,
    updated_at: updatedAt,
  };
}

function normalizeManagedSSHKey(
  key: Partial<DigitalOceanManagedSSHKeyMaterial> | null | undefined,
): DigitalOceanManagedSSHKeyMaterial | null {
  if (!key) return null;
  const privateKey = String(key.private_key || "");
  const publicKey = String(key.public_key || "");
  if (!privateKey && !publicKey) return null;
  return {
    token_id: String(key.token_id || ""),
    token_name: String(key.token_name || ""),
    key_id: Number(key.key_id || 0),
    name: String(key.name || ""),
    fingerprint: String(key.fingerprint || ""),
    public_key: publicKey,
    private_key: privateKey,
  };
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
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

export function buildCloudInstanceShareUrl(token: string) {
  return `${window.location.origin}/cloud/share/${token}`;
}

export async function getCloudInstanceShare(
  provider: CloudShareProvider,
  resourceType: CloudShareResourceType,
  resourceId: string,
): Promise<CloudInstanceShareRecord> {
  const data = await requestJson<Partial<CloudInstanceShareRecord>>(
    `/api/admin/cloud/shares/${provider}/${resourceType}/${encodeURIComponent(resourceId)}`,
  );
  return normalizeShareRecord(data);
}

export async function saveCloudInstanceShare(
  provider: CloudShareProvider,
  resourceType: CloudShareResourceType,
  resourceId: string,
  input: SaveCloudInstanceShareInput,
): Promise<CloudInstanceShareRecord> {
  const data = await requestJson<Partial<CloudInstanceShareRecord>>(
    `/api/admin/cloud/shares/${provider}/${resourceType}/${encodeURIComponent(resourceId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
  return normalizeShareRecord(data);
}

export async function deleteCloudInstanceShare(
  provider: CloudShareProvider,
  resourceType: CloudShareResourceType,
  resourceId: string,
): Promise<void> {
  await requestJson(
    `/api/admin/cloud/shares/${provider}/${resourceType}/${encodeURIComponent(resourceId)}`,
    {
      method: "DELETE",
    },
  );
}

export async function getPublicCloudInstanceShare(token: string): Promise<CloudPublicShareData> {
  const data = await requestJson<Partial<CloudPublicShareData>>(
    `/api/public/cloud/shares/${encodeURIComponent(token)}`,
  );

  return {
    token: String(data?.token || ""),
    provider: (String(data?.provider || "digitalocean") as CloudShareProvider),
    resource_type: (String(data?.resource_type || "droplet") as CloudShareResourceType),
    resource_id: String(data?.resource_id || ""),
    resource_name: String(data?.resource_name || ""),
    credential_name: String(data?.credential_name || ""),
    region: String(data?.region || ""),
    title: String(data?.title || ""),
    note: String(data?.note || ""),
    share_password: Boolean(data?.share_password),
    share_managed_ssh_key: Boolean(data?.share_managed_ssh_key),
    created_at: String(data?.created_at || ""),
    updated_at: String(data?.updated_at || ""),
    detail: (data?.detail || null) as CloudPublicShareData["detail"],
    root_password: normalizeSharedRootPassword(data?.root_password),
    managed_ssh_key: normalizeManagedSSHKey(data?.managed_ssh_key),
  };
}

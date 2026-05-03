import type {
  AWSAccount,
  AWSCredentialInput,
  AWSCredentialPool,
  AWSCredentialRecord,
  AWSTag,
} from "@/lib/cloudAws";

export const DEFAULT_AWS_REGION = "us-east-1";

type StatusTone = "gray" | "red" | "amber" | "green" | "blue";

export function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

export function hasActiveCredential(pool: AWSCredentialPool | null) {
  return Boolean(pool?.active_credential_id);
}

export function getActiveCredential(pool: AWSCredentialPool | null) {
  return (
    pool?.credentials.find(
      (credential) => credential.id === pool.active_credential_id,
    ) || null
  );
}

export function getDefaultAutoConnectGroup(
  provider: string,
  credentialName: string,
) {
  const normalizedProvider = provider.trim().toLowerCase() || "cloud";
  const normalizedCredentialName = credentialName.trim() || "default";
  return `${normalizedProvider}/${normalizedCredentialName}`;
}

function isLikelyAWSAccessKeyId(value: string) {
  const normalized = value.trim().toUpperCase();
  return /^(AKIA|ASIA)[A-Z0-9]{12,}$/.test(normalized);
}

function buildDefaultCredentialName(accessKeyId: string) {
  const normalized = accessKeyId.trim();
  const suffix = normalized.slice(-6).toLowerCase() || "default";
  return `aws-${suffix}`;
}

function findImportSeparator(line: string) {
  for (const separator of ["|", ",", "\t"]) {
    if (line.includes(separator)) {
      return separator;
    }
  }
  return "";
}

function splitCredentialImportParts(line: string) {
  const separator = findImportSeparator(line);
  if (separator) {
    return line
      .split(separator)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return line
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseCredentialImports(
  text: string,
  fallbackRegion = DEFAULT_AWS_REGION,
): AWSCredentialInput[] {
  const lines = text.split(/\r?\n/);
  const credentials: AWSCredentialInput[] = [];
  const seen = new Set<string>();
  const normalizedFallbackRegion = fallbackRegion.trim() || DEFAULT_AWS_REGION;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const parts = splitCredentialImportParts(line);
    if (parts.length < 2) continue;

    let name = "";
    let accessKeyId = "";
    let secretAccessKey = "";
    let defaultRegion = "";
    let sessionToken = "";

    if (parts.length === 2) {
      [accessKeyId, secretAccessKey] = parts;
    } else if (parts.length === 3) {
      if (isLikelyAWSAccessKeyId(parts[0])) {
        [accessKeyId, secretAccessKey, defaultRegion] = parts;
      } else {
        [name, accessKeyId, secretAccessKey] = parts;
      }
    } else if (isLikelyAWSAccessKeyId(parts[0])) {
      [accessKeyId, secretAccessKey, defaultRegion] = parts;
      sessionToken = parts.slice(3).join(" ").trim();
    } else {
      [name, accessKeyId, secretAccessKey, defaultRegion] = parts;
      sessionToken = parts.slice(4).join(" ").trim();
    }

    const resolvedAccessKeyId = accessKeyId.trim();
    const resolvedSecretAccessKey = secretAccessKey.trim();
    const resolvedDefaultRegion =
      defaultRegion.trim() || normalizedFallbackRegion;
    const resolvedName =
      name.trim() || buildDefaultCredentialName(resolvedAccessKeyId);
    const key = resolvedAccessKeyId;
    if (!resolvedAccessKeyId || !resolvedSecretAccessKey || seen.has(key)) continue;
    seen.add(key);

    credentials.push({
      name: resolvedName,
      access_key_id: resolvedAccessKeyId,
      secret_access_key: resolvedSecretAccessKey,
      default_region: resolvedDefaultRegion,
      session_token: sessionToken || "",
    });
  }

  return credentials;
}

export function parseTags(tagsText: string): AWSTag[] {
  return tagsText
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const index = entry.indexOf("=");
      if (index === -1) return null;
      const key = entry.slice(0, index).trim();
      const value = entry.slice(index + 1).trim();
      if (!key || !value) return null;
      return { key, value };
    })
    .filter((tag): tag is AWSTag => Boolean(tag));
}

export function parseResourceIds(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/\r?\n|,/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

export function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function getCredentialStatusColor(status: string): StatusTone {
  switch (status) {
    case "healthy":
      return "green";
    case "error":
      return "red";
    default:
      return "gray";
  }
}

export function getInstanceStateColor(state: string): StatusTone {
  switch (state) {
    case "running":
      return "green";
    case "stopped":
      return "amber";
    case "pending":
      return "blue";
    case "terminated":
      return "red";
    default:
      return "gray";
  }
}

export function getFollowUpStatusColor(status: string): StatusTone {
  switch (status) {
    case "pending":
      return "blue";
    case "failed":
      return "red";
    case "success":
      return "green";
    case "cancelled":
    case "skipped":
    default:
      return "gray";
  }
}

export function buildAWSAccountFromCredential(
  credential: AWSCredentialRecord | null | undefined,
  region: string,
): AWSAccount | null {
  if (!credential) {
    return null;
  }

  return {
    account_id: credential.account_id || "",
    arn: credential.arn || "",
    user_id: credential.user_id || "",
    region: region || credential.default_region || DEFAULT_AWS_REGION,
    ec2_quota: credential.ec2_quota || null,
    // Credential health checks may cache an old quota warning. The panel-level
    // banner should only reflect the latest on-demand account read.
    ec2_quota_error: "",
  };
}

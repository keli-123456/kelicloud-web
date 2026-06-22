export type FailoverV2ProbeDisplay = {
  status?: string | null;
  stale?: boolean;
  consecutive_failures?: number;
};

export type FailoverV2MemberDisplay = {
  failure_threshold?: number;
  probe?: FailoverV2ProbeDisplay | null;
};

export type FailoverV2ExecutionDisplay = {
  id?: number | null;
  status?: string | null;
} | null;

export type FailoverV2MemberTaskStatusSource = "probe" | "execution" | "empty";

export function normalizeFailoverV2DisplayToken(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function getFailoverV2ProbeAlertStatus(member: FailoverV2MemberDisplay | null | undefined) {
  const probe = member?.probe;
  if (!probe) {
    return null;
  }
  if (probe.stale) {
    return "stale";
  }

  const status = normalizeFailoverV2DisplayToken(probe.status);
  switch (status) {
    case "blocked_suspected":
    case "blocked":
    case "degraded":
    case "failed":
    case "failure":
    case "error":
      return status;
    default:
      return null;
  }
}

export function getFailoverV2MemberTaskStatusSource(
  member: FailoverV2MemberDisplay | null | undefined,
  execution: FailoverV2ExecutionDisplay,
): FailoverV2MemberTaskStatusSource {
  if (getFailoverV2ProbeAlertStatus(member)) {
    return "probe";
  }
  if (execution && Number(execution.id || 0) > 0) {
    return "execution";
  }
  return "empty";
}

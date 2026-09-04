import type { TFunction } from "i18next";

export type FailoverIssueKind =
  | "replacement_exhausted"
  | "provider_timeout"
  | "provider_unavailable"
  | "candidate_health"
  | "agent_timeout"
  | "dns"
  | "script"
  | "cleanup"
  | "configuration"
  | "unknown";

export type FailoverIssue = {
  kind: FailoverIssueKind;
  rawMessage: string;
  candidateCount: number;
  requestedCandidates: number | null;
  provisionedCandidates: number | null;
  providerIssueCount: number;
  healthIssueCount: number;
  timeoutCount: number;
};

const ANSI_ESCAPE_SEQUENCE_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, "g");

const ISSUE_COPY: Record<FailoverIssueKind, {
  titleKey: string;
  title: string;
  summaryKey: string;
  summary: string;
  actionKey: string;
  action: string;
}> = {
  replacement_exhausted: {
    titleKey: "failover.issue.replacement_exhausted.title",
    title: "No usable replacement was found",
    summaryKey: "failover.issue.replacement_exhausted.summary",
    summary: "The replacement pool was exhausted before a candidate passed every check.",
    actionKey: "failover.issue.replacement_exhausted.action",
    action: "Check credential availability and candidate health, then retry the execution.",
  },
  provider_timeout: {
    titleKey: "failover.issue.provider_timeout.title",
    title: "Cloud provider request timed out",
    summaryKey: "failover.issue.provider_timeout.summary",
    summary: "The cloud provider did not finish the request within the allowed time.",
    actionKey: "failover.issue.provider_timeout.action",
    action: "Confirm the provider API is reachable and retry after the credential cooldown ends.",
  },
  provider_unavailable: {
    titleKey: "failover.issue.provider_unavailable.title",
    title: "No cloud credential is currently available",
    summaryKey: "failover.issue.provider_unavailable.summary",
    summary: "The selected credentials are reserved, cooling down, invalid, or out of quota.",
    actionKey: "failover.issue.provider_unavailable.action",
    action: "Check token validity and quota, or add another credential to the selected pool.",
  },
  candidate_health: {
    titleKey: "failover.issue.candidate_health.title",
    title: "The new instance failed its health check",
    summaryKey: "failover.issue.candidate_health.summary",
    summary: "The instance started, but its connectivity result was blocked or degraded.",
    actionKey: "failover.issue.candidate_health.action",
    action: "Review the connectivity probes and retry with more candidates if necessary.",
  },
  agent_timeout: {
    titleKey: "failover.issue.agent_timeout.title",
    title: "Timed out waiting for Agent",
    summaryKey: "failover.issue.agent_timeout.summary",
    summary: "The instance was created, but Agent did not become healthy before the deadline.",
    actionKey: "failover.issue.agent_timeout.action",
    action: "Check the bootstrap script, Agent endpoint, firewall, and instance network.",
  },
  dns: {
    titleKey: "failover.issue.dns.title",
    title: "DNS synchronization failed",
    summaryKey: "failover.issue.dns.summary",
    summary: "The replacement instance is ready, but one or more DNS records were not updated.",
    actionKey: "failover.issue.dns.action",
    action: "Verify the DNS credential and record target, then retry only the DNS step.",
  },
  script: {
    titleKey: "failover.issue.script.title",
    title: "Post-provision script failed",
    summaryKey: "failover.issue.script.summary",
    summary: "The new instance was retained, but its deployment script returned an error.",
    actionKey: "failover.issue.script.action",
    action: "Inspect the script output and fix the failing command before retrying.",
  },
  cleanup: {
    titleKey: "failover.issue.cleanup.title",
    title: "Old instance cleanup failed",
    summaryKey: "failover.issue.cleanup.summary",
    summary: "The replacement completed, but an old or extra cloud instance still needs cleanup.",
    actionKey: "failover.issue.cleanup.action",
    action: "Verify the saved cloud reference, then retry the cleanup step.",
  },
  configuration: {
    titleKey: "failover.issue.configuration.title",
    title: "Failover configuration is incomplete",
    summaryKey: "failover.issue.configuration.summary",
    summary: "A required provider, DNS, script, or target setting is missing or invalid.",
    actionKey: "failover.issue.configuration.action",
    action: "Open the task configuration, complete the highlighted fields, and try again.",
  },
  unknown: {
    titleKey: "failover.issue.unknown.title",
    title: "Failover execution failed",
    summaryKey: "failover.issue.unknown.summary",
    summary: "The execution stopped before all required stages completed.",
    actionKey: "failover.issue.unknown.action",
    action: "Open the technical details, resolve the reported cause, and retry.",
  },
};

function countMatches(value: string, pattern: RegExp) {
  return Array.from(value.matchAll(pattern)).length;
}

function extractInteger(value: string, pattern: RegExp) {
  const match = value.match(pattern);
  if (!match?.[1]) {
    return null;
  }
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeFailoverIssueMessage(message: string | null | undefined) {
  return String(message || "")
    .replace(ANSI_ESCAPE_SEQUENCE_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function analyzeFailoverIssue(message: string | null | undefined): FailoverIssue {
  const rawMessage = normalizeFailoverIssueMessage(message);
  const normalized = rawMessage.toLowerCase();
  const candidateIDs = new Set(
    Array.from(normalized.matchAll(/candidate\s+(\d+)/g), (match) => match[1]),
  );
  const requestedCandidates = extractInteger(normalized, /requested\s+(\d+)\s+candidates?/i);
  const provisionedCandidates = extractInteger(normalized, /provisioned\s+(\d+)/i);
  const providerIssueCount = countMatches(
    normalized,
    /no provider entry|reserved by another|cooldown|cooling down|quota|rate.?limit|credential|token.*(?:invalid|expired)|no healthy (?:token|credential)|token group.*no healthy|context deadline exceeded/g,
  );
  const healthIssueCount = countMatches(
    normalized,
    /blocked_suspected|blocked suspected|degraded|connectivity (?:probe|validation) failed|healthy .*report/g,
  );
  const timeoutCount = countMatches(normalized, /timed out|timeout|context deadline exceeded/g);

  let kind: FailoverIssueKind = "unknown";
  if (/all replacement candidates failed|requested\s+\d+\s+candidates?.*provisioned/i.test(normalized)) {
    kind = "replacement_exhausted";
  } else if (/script exited|script.*(?:failed|error)|exit code|command not found|脚本/.test(normalized)) {
    kind = "script";
  } else if (/dns|domain record|record update|解析|域名/.test(normalized)) {
    kind = "dns";
  } else if (/cleanup|delete|deletion|remove old|old instance|旧实例|清理/.test(normalized)) {
    kind = "cleanup";
  } else if (/context deadline exceeded|provider.*timed out|api.*(?:timed out|timeout)/.test(normalized)) {
    kind = "provider_timeout";
  } else if (/no provider entry|reserved by another|cooldown|cooling down|quota|rate.?limit|credential|token.*(?:invalid|expired)|no healthy (?:token|credential)|token group.*no healthy/.test(normalized)) {
    kind = "provider_unavailable";
  } else if (/waiting for .*agent|agent.*(?:offline|timeout|timed out)|wait.*healthy .*report/.test(normalized)) {
    kind = "agent_timeout";
  } else if (/blocked_suspected|blocked suspected|degraded|connectivity (?:probe|validation) failed|health check/.test(normalized)) {
    kind = "candidate_health";
  } else if (/not configured|missing|required|invalid configuration|配置.*(?:缺失|无效)|未配置/.test(normalized)) {
    kind = "configuration";
  }

  return {
    kind,
    rawMessage,
    candidateCount: candidateIDs.size || requestedCandidates || 0,
    requestedCandidates,
    provisionedCandidates,
    providerIssueCount,
    healthIssueCount,
    timeoutCount,
  };
}

export function areFailoverIssueMessagesEquivalent(
  first: string | null | undefined,
  second: string | null | undefined,
) {
  const firstMessage = normalizeFailoverIssueMessage(first).toLowerCase();
  const secondMessage = normalizeFailoverIssueMessage(second).toLowerCase();
  if (!firstMessage || !secondMessage) {
    return false;
  }
  return firstMessage === secondMessage
    || firstMessage.includes(secondMessage)
    || secondMessage.includes(firstMessage);
}

export function getFailoverIssueTitle(t: TFunction, issue: FailoverIssue) {
  const copy = ISSUE_COPY[issue.kind];
  return t(copy.titleKey, { defaultValue: copy.title });
}

export function getFailoverIssueSummary(t: TFunction, issue: FailoverIssue) {
  if (
    issue.kind === "replacement_exhausted"
    && issue.requestedCandidates !== null
    && issue.provisionedCandidates !== null
  ) {
    return t("failover.issue.replacement_exhausted.progress", {
      defaultValue: "Requested {{requested}} candidates and created {{provisioned}}, but none passed every check.",
      requested: issue.requestedCandidates,
      provisioned: issue.provisionedCandidates,
    });
  }
  const copy = ISSUE_COPY[issue.kind];
  return t(copy.summaryKey, { defaultValue: copy.summary });
}

export function getFailoverIssueAction(t: TFunction, issue: FailoverIssue) {
  const copy = ISSUE_COPY[issue.kind];
  return t(copy.actionKey, { defaultValue: copy.action });
}

export function getFailoverIssueCompactText(t: TFunction, message: string | null | undefined) {
  const issue = analyzeFailoverIssue(message);
  const title = getFailoverIssueTitle(t, issue);
  if (issue.requestedCandidates !== null && issue.provisionedCandidates !== null) {
    return `${title} (${issue.provisionedCandidates}/${issue.requestedCandidates})`;
  }
  return title;
}

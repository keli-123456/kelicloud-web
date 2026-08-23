type ExecutionCandidateLike = {
  selected?: boolean;
};

export type FailoverExecutionDisplayLike = {
  status?: string | null;
  script_status?: string | null;
  dns_status?: string | null;
  dns_provider?: string | null;
  cleanup_result?: unknown;
  error_message?: string | null;
  new_instance_ref?: unknown;
  candidates?: ExecutionCandidateLike[] | null;
};

const ANSI_ESCAPE_SEQUENCE_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/g;
const RETAINED_SCRIPT_FAILURE_SUFFIX = /;\s*healthy new instance retained because DNS switching is disabled\s*$/i;

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalized(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function stripTerminalControlSequences(value: unknown) {
  return String(value ?? "").replace(ANSI_ESCAPE_SEQUENCE_PATTERN, "").trim();
}

export function isRetainedScriptWarningExecution(execution: FailoverExecutionDisplayLike | null | undefined) {
  if (!execution) {
    return false;
  }

  const cleanupClassification = normalized(asRecord(execution.cleanup_result)?.classification);
  if (cleanupClassification === "script_failed_instance_retained") {
    return true;
  }

  const hasRetainedInstance = Boolean(
    asRecord(execution.new_instance_ref)
    || execution.candidates?.some((candidate) => candidate.selected),
  );
  const errorMessage = normalized(stripTerminalControlSequences(execution.error_message));

  return (
    normalized(execution.status) === "failed"
    && normalized(execution.script_status) === "failed"
    && normalized(execution.dns_status) === "skipped"
    && normalized(execution.dns_provider) === ""
    && hasRetainedInstance
    && errorMessage.includes("healthy new instance retained because dns switching is disabled")
  );
}

export function getRetainedScriptFailureMessage(execution: FailoverExecutionDisplayLike | null | undefined) {
  const cleanupError = asRecord(execution?.cleanup_result)?.error_message;
  const rawMessage = cleanupError || execution?.error_message || "";
  return stripTerminalControlSequences(rawMessage).replace(RETAINED_SCRIPT_FAILURE_SUFFIX, "").trim();
}

export function shouldShowRetryDNSGuidance(execution: FailoverExecutionDisplayLike | null | undefined) {
  if (!execution || normalized(execution.dns_provider) === "") {
    return false;
  }
  const dnsStatus = normalized(execution.dns_status);
  return dnsStatus === "failed" || dnsStatus === "pending" || dnsStatus === "skipped";
}

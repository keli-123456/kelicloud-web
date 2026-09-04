type ExecutionCandidateLike = {
  selected?: boolean;
};

export type FailoverExecutionDisplayLike = {
  status?: string | null;
  script_status?: string | null;
  script_exit_code?: number | null;
  script_output?: string | null;
  dns_status?: string | null;
  dns_provider?: string | null;
  cleanup_status?: string | null;
  cleanup_result?: unknown;
  error_message?: string | null;
  new_instance_ref?: unknown;
  candidates?: ExecutionCandidateLike[] | null;
};

const ANSI_ESCAPE_SEQUENCE_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, "g");
const RETAINED_SCRIPT_FAILURE_SUFFIX = /;\s*healthy new instance retained because DNS switching is disabled\s*$/i;
const GENERIC_SCRIPT_NOTICE_PATTERN = /^(?:important notice|重要提示)\s*[:：]?$/i;
const GENERIC_SCRIPT_FAILURE_SUFFIX_PATTERN = /(?:^|:\s*)(?:important notice|重要提示)\s*[:：]?\s*$/i;

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

export function getScriptOutputFailureExcerpt(value: unknown) {
  const lines = stripTerminalControlSequences(value).split(/\r?\n/);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index].trim();
    if (
      !line
      || line === "... output truncated; final lines preserved ..."
      || GENERIC_SCRIPT_NOTICE_PATTERN.test(line)
    ) {
      continue;
    }
    return line.length > 240 ? line.slice(0, 237) + "..." : line;
  }
  return "";
}

export function getRetainedScriptFailureMessage(execution: FailoverExecutionDisplayLike | null | undefined) {
  const cleanupError = asRecord(execution?.cleanup_result)?.error_message;
  const rawMessage = cleanupError || execution?.error_message || "";
  const message = stripTerminalControlSequences(rawMessage).replace(RETAINED_SCRIPT_FAILURE_SUFFIX, "").trim();
  const outputExcerpt = getScriptOutputFailureExcerpt(execution?.script_output);

  if (outputExcerpt && (!message || GENERIC_SCRIPT_FAILURE_SUFFIX_PATTERN.test(message))) {
    const exitCode = Number.isInteger(execution?.script_exit_code) ? execution?.script_exit_code : 1;
    return "script exited with code " + exitCode + ": " + outputExcerpt;
  }
  return message || outputExcerpt;
}

export function shouldShowRetryDNSGuidance(execution: FailoverExecutionDisplayLike | null | undefined) {
  if (!execution || normalized(execution.dns_provider) === "") {
    return false;
  }
  const dnsStatus = normalized(execution.dns_status);
  return dnsStatus === "failed" || dnsStatus === "pending" || dnsStatus === "skipped";
}

export function shouldShowRetryCleanupGuidance(execution: FailoverExecutionDisplayLike | null | undefined) {
  const cleanupStatus = normalized(execution?.cleanup_status);
  const classification = normalized(asRecord(execution?.cleanup_result)?.classification);
  if (classification === "script_failed_instance_retained") {
    return false;
  }
  return (
    cleanupStatus === "pending"
    || cleanupStatus === "failed"
    || cleanupStatus === "warning"
    || ["provider_entry_missing", "provider_entry_unhealthy", "cleanup_status_unknown"].includes(classification)
  );
}

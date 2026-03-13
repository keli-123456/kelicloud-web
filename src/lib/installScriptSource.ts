const DEFAULT_AGENT_INSTALL_SCRIPT_BASE =
  "https://raw.githubusercontent.com/komari-monitor/komari-agent/refs/heads/main";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function splitPath(pathname: string) {
  return pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function normalizeGitHubRepositoryURLToRawBase(parsed: URL) {
  const parts = splitPath(parsed.pathname);
  if (parts.length < 2) {
    return "";
  }

  const owner = parts[0];
  const repo = parts[1];
  let branch = "main";
  let subpath = "";

  if (parts.length >= 4 && (parts[2] === "tree" || parts[2] === "blob")) {
    branch = parts[3];
    if (parts.length > 4) {
      subpath = parts.slice(4).join("/");
    }
  }

  if (subpath.endsWith("install.sh") || subpath.endsWith("install.ps1")) {
    const idx = subpath.lastIndexOf("/");
    subpath = idx >= 0 ? subpath.slice(0, idx) : "";
  }

  const base = `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/${branch}`;
  return subpath ? `${base}/${subpath.replace(/^\/+|\/+$/g, "")}` : base;
}

function normalizeRawGitHubURLToBase(parsed: URL) {
  const parts = splitPath(parsed.pathname);
  if (parts.length < 3) {
    return "";
  }

  const baseParts =
    parts[parts.length - 1] === "install.sh" || parts[parts.length - 1] === "install.ps1"
      ? parts.slice(0, -1)
      : parts;

  return `https://raw.githubusercontent.com/${baseParts.join("/")}`;
}

export function normalizeAgentInstallScriptBase(baseScriptsUrl?: string) {
  const raw = String(baseScriptsUrl || "").trim();
  if (!raw) {
    return DEFAULT_AGENT_INSTALL_SCRIPT_BASE;
  }

  let candidate = raw;
  if (!candidate.includes("://") && candidate.startsWith("github.com/")) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    const host = parsed.hostname.toLowerCase();
    if (host === "github.com" || host === "www.github.com") {
      const normalized = normalizeGitHubRepositoryURLToRawBase(parsed);
      if (normalized) {
        return normalized;
      }
    }
    if (host === "raw.githubusercontent.com") {
      const normalized = normalizeRawGitHubURLToBase(parsed);
      if (normalized) {
        return normalized;
      }
    }
  } catch {
    // Fall through to generic normalization below.
  }

  if (candidate.endsWith("/install.sh") || candidate.endsWith("/install.ps1")) {
    candidate = candidate.slice(0, candidate.lastIndexOf("/"));
  }

  if (!candidate.includes("://")) {
    candidate = `https://${candidate}`;
  }

  return trimTrailingSlash(candidate);
}

export function buildAgentInstallScriptURL(
  baseScriptsUrl: string | undefined,
  scriptFile: string
) {
  const base = normalizeAgentInstallScriptBase(baseScriptsUrl);
  const file = String(scriptFile || "install.sh").replace(/^\/+/, "");
  return `${trimTrailingSlash(base)}/${file}`;
}

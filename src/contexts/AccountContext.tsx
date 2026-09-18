import React from "react";
import { formatApiErrorMessage, getReadableErrorMessage } from "@/lib/apiErrorMessage";
import { getAccountScopeKey } from "@/lib/accountScope";

export type AccountFeature =
  | "clients"
  | "records"
  | "tasks"
  | "ping"
  | "notifications"
  | "cloud"
  | "cloud_digitalocean"
  | "cloud_linode"
  | "cloud_vultr"
  | "cloud_azure"
  | "cloud_aws"
  | "cloud_dns"
  | "cloud_failover"
  | "cloud_failover_v1"
  | "cloud_failover_v2"
  | "clipboard"
  | "logs"
  | "cn_connectivity";

export type Account = {
  logged_in: boolean;
  role?: string;
  sso_id?: string;
  sso_type?: string;
  username: string;
  uuid?: string;
  "2fa_enabled"?: boolean;
  server_quota?: number;
  allowed_features?: AccountFeature[];
  available_features?: AccountFeature[];
  plan_name?: string;
  plan_expires_at?: string;
  plan_note?: string;
  account_disabled?: boolean;
  access_status?: "active" | "expired" | "disabled" | string;
};

export function isPlatformAdminAccount(account: Account | null) {
  return Boolean(account?.logged_in && !account.account_disabled &&
    (!account.access_status || account.access_status === "active") &&
    (account.role || "").toLowerCase() === "admin");
}

const defaultGrantedAccountFeatures = new Set<AccountFeature>();

const legacyCloudAccountFeatures: AccountFeature[] = [
  "cloud_digitalocean",
  "cloud_linode",
  "cloud_vultr",
  "cloud_azure",
  "cloud_aws",
  "cloud_dns",
  "cloud_failover_v1",
  "cloud_failover_v2",
];

export function isDefaultGrantedAccountFeature(feature: AccountFeature) {
  if (feature === "cloud") {
    return legacyCloudAccountFeatures.some((item) =>
      defaultGrantedAccountFeatures.has(item),
    );
  }
  return defaultGrantedAccountFeatures.has(feature);
}

export function isAccountFeatureAllowed(
  account: Account | null,
  feature: AccountFeature,
) {
  if (!account?.logged_in || account.account_disabled ||
      (account.access_status && account.access_status !== "active")) return false;
  if (isPlatformAdminAccount(account)) {
    return true;
  }

  const allowed = account?.allowed_features || [];
  if (allowed.length === 0) {
    return isDefaultGrantedAccountFeature(feature);
  }

  if (feature === "cloud") {
    return (
      allowed.includes("cloud") ||
      legacyCloudAccountFeatures.some((item) => allowed.includes(item))
    );
  }
  if (feature === "cloud_failover_v1" || feature === "cloud_failover_v2") {
    return allowed.includes(feature) || allowed.includes("cloud_failover");
  }
  if (feature === "cloud_failover") {
    return (
      allowed.includes("cloud_failover") ||
      allowed.includes("cloud_failover_v1") ||
      allowed.includes("cloud_failover_v2")
    );
  }

  return allowed.includes(feature);
}

export function isAnyAccountFeatureAllowed(
  account: Account | null,
  features: AccountFeature[],
) {
  return features.some((feature) => isAccountFeatureAllowed(account, feature));
}

export function getDefaultAdminPath(account: Account | null) {
  if (!account?.logged_in) {
    return "/admin";
  }
  if (isPlatformAdminAccount(account)) {
    return "/admin";
  }
  if (
    isAnyAccountFeatureAllowed(account, [
      "cloud_digitalocean",
      "cloud_linode",
      "cloud_vultr",
      "cloud_azure",
      "cloud_aws",
    ])
  ) {
    return "/admin/cloud";
  }
  if (isAccountFeatureAllowed(account, "cloud_dns")) {
    return "/admin/dns";
  }
  if (isAccountFeatureAllowed(account, "cloud_failover_v1")) {
    return "/admin/failover";
  }
  if (isAccountFeatureAllowed(account, "cloud_failover_v2")) {
    return "/admin/failover-v2";
  }
  if (isAccountFeatureAllowed(account, "notifications")) {
    return "/admin/notification";
  }
  if (isAccountFeatureAllowed(account, "clipboard")) {
    return "/admin/exec";
  }
  if (isAccountFeatureAllowed(account, "logs")) {
    return "/admin/audit?tab=logs";
  }
  return "/admin/billing";
}

interface AccountContextType {
  account: Account | null;
  loading: boolean;
  platformAdmin: boolean;
  error: Error | null;
  refresh: () => Promise<Account | null>;
  hasFeature: (feature: AccountFeature) => boolean;
}

const AccountContext = React.createContext<AccountContextType | undefined>(
  undefined,
);

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [account, setAccount] = React.useState<Account | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const requestRef = React.useRef<AbortController | null>(null);
  const pendingRef = React.useRef<Promise<Account | null> | null>(null);
  const scopeRef = React.useRef("anonymous");
  const acceptAccount = React.useCallback((next: Account) => {
    const scope = getAccountScopeKey(next);
    if (scopeRef.current !== scope) {
      scopeRef.current = scope;
      window.dispatchEvent(new Event("kelicloud:account-scope-change"));
    }
    setAccount((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
  }, []);
  const platformAdmin = React.useMemo(
    () => isPlatformAdminAccount(account),
    [account],
  );
  const hasFeature = React.useCallback(
    (feature: AccountFeature) => isAccountFeatureAllowed(account, feature),
    [account],
  );

  const refresh = React.useCallback((): Promise<Account | null> => {
    if (pendingRef.current) return pendingRef.current;
    const controller = new AbortController();
    requestRef.current = controller;
    setError(null);
    const request = (async () => {
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch("/api/me", { cache: "no-store", signal: controller.signal });
      if (response.status === 401 || response.status === 403) {
        if (requestRef.current === controller) acceptAccount({ logged_in: false, username: "" });
        return null;
      }
      if (!response.ok) {
        throw new Error(formatApiErrorMessage("Failed to fetch account data", { status: response.status }));
      }
      const data: Account = await response.json();
      if (requestRef.current !== controller || controller.signal.aborted) return null;
      const nextAccount = {
        ...data,
        allowed_features: Array.isArray(data.allowed_features)
          ? data.allowed_features
          : [],
        available_features: Array.isArray(data.available_features)
          ? data.available_features
          : [],
      };
      acceptAccount(nextAccount);
      return nextAccount;
    } catch (err) {
      if (requestRef.current === controller) setError(new Error(getReadableErrorMessage(err)));
      return null;
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current === controller) {
        setLoading(false);
        requestRef.current = null;
        pendingRef.current = null;
      }
    }
    })();
    pendingRef.current = request;
    return request;
  }, [acceptAccount]);

  React.useEffect(() => {
    void refresh();
    const refreshVisibleAccount = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(refreshVisibleAccount, 30_000);
    window.addEventListener("focus", refreshVisibleAccount);
    window.addEventListener("pageshow", refreshVisibleAccount);
    document.addEventListener("visibilitychange", refreshVisibleAccount);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshVisibleAccount);
      window.removeEventListener("pageshow", refreshVisibleAccount);
      document.removeEventListener("visibilitychange", refreshVisibleAccount);
      requestRef.current?.abort();
      requestRef.current = null;
      pendingRef.current = null;
    };
  }, [refresh]);

  const value = React.useMemo(
    () => ({
      account,
      loading,
      platformAdmin,
      error,
      refresh,
      hasFeature,
    }),
    [account, loading, platformAdmin, error, refresh, hasFeature],
  );

  return (
    <AccountContext.Provider value={value}>
      <React.Fragment key={getAccountScopeKey(account)}>{children}</React.Fragment>
    </AccountContext.Provider>
  );
};

export const useAccount = () => {
  const context = React.useContext(AccountContext);
  if (!context) {
    throw new Error("useAccount must be used within an AccountProvider");
  }
  return context;
};

import React from "react";

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
};

export function isPlatformAdminAccount(account: Account | null) {
  return (account?.role || "").toLowerCase() === "admin";
}

const defaultGrantedAccountFeatures = new Set<AccountFeature>([
  "clients",
  "records",
  "tasks",
  "ping",
  "notifications",
  "cloud_digitalocean",
  "cloud_linode",
  "cloud_vultr",
  "cloud_azure",
  "cloud_aws",
  "cloud_dns",
  "cloud_failover",
  "clipboard",
  "logs",
]);

const legacyCloudAccountFeatures: AccountFeature[] = [
  "cloud_digitalocean",
  "cloud_linode",
  "cloud_vultr",
  "cloud_azure",
  "cloud_aws",
  "cloud_dns",
  "cloud_failover",
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
  if (isAccountFeatureAllowed(account, "clients")) {
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
  if (
    isAccountFeatureAllowed(account, "cloud_failover") &&
    isAccountFeatureAllowed(account, "cn_connectivity")
  ) {
    return "/admin/failover";
  }
  if (isAccountFeatureAllowed(account, "notifications")) {
    return "/admin/notification";
  }
  if (isAccountFeatureAllowed(account, "tasks")) {
    return "/admin/exec";
  }
  if (isAccountFeatureAllowed(account, "clipboard")) {
    return "/admin/scripts";
  }
  if (isAccountFeatureAllowed(account, "ping")) {
    return "/admin/ping";
  }
  if (isAccountFeatureAllowed(account, "logs")) {
    return "/admin/logs";
  }
  return "/admin/account";
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
  const platformAdmin = React.useMemo(
    () => isPlatformAdminAccount(account),
    [account],
  );
  const hasFeature = React.useCallback(
    (feature: AccountFeature) => isAccountFeatureAllowed(account, feature),
    [account],
  );

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/me");
      if (!response.ok) {
        throw new Error("Failed to fetch account data");
      }
      const data: Account = await response.json();
      const nextAccount = {
        ...data,
        allowed_features: Array.isArray(data.allowed_features)
          ? data.allowed_features
          : [],
        available_features: Array.isArray(data.available_features)
          ? data.available_features
          : [],
      };
      setAccount(nextAccount);
      return nextAccount;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
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
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
};

export const useAccount = () => {
  const context = React.useContext(AccountContext);
  if (!context) {
    throw new Error("useAccount must be used within an AccountProvider");
  }
  return context;
};

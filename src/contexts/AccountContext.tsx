import React from "react";
import { TENANT_SWITCH_EVENT } from "@/lib/api";

export type TenantSummary = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  is_default: boolean;
  role: string;
};

export type Account = {
  logged_in: boolean;
  sso_id: string;
  sso_type: string;
  username: string;
  uuid: string;
  "2fa_enabled": boolean;
  tenants: TenantSummary[];
  current_tenant: TenantSummary | null;
};

const tenantRoleRanks = {
    viewer: 0,
    operator: 1,
    admin: 2,
    owner: 3,
} as const;

export function isTenantRoleAtLeast(role: string | null | undefined, minimum: keyof typeof tenantRoleRanks) {
    const current = tenantRoleRanks[(role || "").toLowerCase() as keyof typeof tenantRoleRanks] ?? -1;
    return current >= tenantRoleRanks[minimum];
}

export function isPlatformAdminAccount(account: Account | null) {
    const defaultTenant = account?.tenants?.find((tenant) => tenant.is_default);
    return isTenantRoleAtLeast(defaultTenant?.role, "admin");
}

interface AccountContextType{
    account: Account | null;
    loading: boolean;
    switchingTenant: boolean;
    platformAdmin: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
    switchTenant: (tenantId: string) => Promise<void>;
}

const AccountContext = React.createContext<AccountContextType | undefined>(undefined);

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [account, setAccount] = React.useState<Account | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [switchingTenant, setSwitchingTenant] = React.useState(false);
    const [error, setError] = React.useState<Error | null>(null);
    const platformAdmin = React.useMemo(() => isPlatformAdminAccount(account), [account]);
    
    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
        const response = await fetch("/api/me");
        if (!response.ok) {
            throw new Error("Failed to fetch account data");
        }
        const data: Account = await response.json();
        setAccount(data);
        } catch (err) {
        setError(err as Error);
        } finally {
        setLoading(false);
        }
    };

    const switchTenant = async (tenantId: string) => {
        if (!tenantId || !account?.logged_in || account.current_tenant?.id === tenantId) {
            return;
        }

        setSwitchingTenant(true);
        try {
            const response = await fetch("/api/admin/tenants/current", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ tenant_id: tenantId }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data?.message || "Failed to switch tenant");
            }

            await refresh();
            window.dispatchEvent(
                new CustomEvent(TENANT_SWITCH_EVENT, {
                    detail: { tenantId },
                })
            );
        } finally {
            setSwitchingTenant(false);
        }
    };
    
    React.useEffect(() => {
        void refresh();
    }, []);
    
    return (
        <AccountContext.Provider value={{ account, loading, switchingTenant, platformAdmin, error, refresh, switchTenant }}>
        {children}
        </AccountContext.Provider>
    );
}

export const useAccount = () => {
    const context = React.useContext(AccountContext);
    if (!context) {
        throw new Error("useAccount must be used within an AccountProvider");
    }
    return context;
}

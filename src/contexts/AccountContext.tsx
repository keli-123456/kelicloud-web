import React from "react";

export type Account = {
  logged_in: boolean;
  role?: string;
  sso_id?: string;
  sso_type?: string;
  username: string;
  uuid?: string;
  "2fa_enabled"?: boolean;
};

export function isPlatformAdminAccount(account: Account | null) {
    return (account?.role || "").toLowerCase() === "admin";
}

interface AccountContextType{
    account: Account | null;
    loading: boolean;
    platformAdmin: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
}

const AccountContext = React.createContext<AccountContextType | undefined>(undefined);

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [account, setAccount] = React.useState<Account | null>(null);
    const [loading, setLoading] = React.useState(true);
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

    React.useEffect(() => {
        void refresh();
    }, []);
    
    return (
        <AccountContext.Provider value={{ account, loading, platformAdmin, error, refresh }}>
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

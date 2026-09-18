type AccountScope = {
  logged_in: boolean;
  uuid?: string;
  username: string;
  role?: string;
  allowed_features?: string[];
  account_disabled?: boolean;
  access_status?: string;
};

// Only identity and effective access changes reset page-local data and drafts.
export function getAccountScopeKey(account: AccountScope | null) {
  if (!account?.logged_in) return "anonymous";
  return JSON.stringify([
    account.uuid || account.username,
    account.role || "",
    [...new Set(account.allowed_features || [])].sort(),
    Boolean(account.account_disabled),
    account.access_status || "active",
  ]);
}

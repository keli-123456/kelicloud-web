import * as React from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AdminPageShell, AdminSurface } from "@/components/admin/AdminPageShell";
import { PlatformAdminNotice } from "@/components/admin/PlatformAdminNotice";
import { Badge, Button, Checkbox, Dialog, Select } from "@/components/admin/admin-ui";
import Loading from "@/components/loading";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type AccountFeature,
  useAccount,
} from "@/contexts/AccountContext";

type UserRole = "admin" | "user";

type ManagedUser = {
  uuid: string;
  username: string;
  role?: string;
  sso_id?: string;
  sso_type?: string;
  two_factor?: string;
  created_at?: string;
  updated_at?: string;
  server_quota?: number;
  allowed_features?: AccountFeature[];
  client_count?: number;
};

type UsersResponse = {
  items?: ManagedUser[];
  available_features?: AccountFeature[];
};

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

type CreateUserForm = {
  username: string;
  password: string;
  role: UserRole;
  serverQuota: string;
  allowedFeatures: AccountFeature[];
};

type PolicyForm = {
  serverQuota: string;
  allowedFeatures: AccountFeature[];
};

const FEATURE_ORDER: AccountFeature[] = [
  "clients",
  "records",
  "tasks",
  "ping",
  "notifications",
  "cloud",
  "clipboard",
  "logs",
];

const normalizeRole = (role?: string): UserRole =>
  String(role || "").toLowerCase() === "user" ? "user" : "admin";

const normalizeFeatures = (
  features?: string[] | null,
  availableFeatures?: AccountFeature[],
) => {
  const allowList = new Set(availableFeatures?.length ? availableFeatures : FEATURE_ORDER);
  const normalized = Array.from(
    new Set(
      (features || [])
        .map((feature) => String(feature || "").trim().toLowerCase())
        .filter((feature): feature is AccountFeature => allowList.has(feature as AccountFeature)),
    ),
  );
  normalized.sort(
    (left, right) =>
      FEATURE_ORDER.indexOf(left as AccountFeature) -
      FEATURE_ORDER.indexOf(right as AccountFeature),
  );
  return normalized as AccountFeature[];
};

const parseServerQuota = (value?: string) => {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
};

const formatDateTime = (value?: string) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "-";
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return normalized;
  return date.toLocaleString();
};

const getFeatureLabel = (
  feature: AccountFeature,
  t: TFunction,
) => {
  switch (feature) {
    case "clients":
      return t("admin.users.feature_clients", "Servers");
    case "records":
      return t("admin.users.feature_records", "Records");
    case "tasks":
      return t("admin.users.feature_tasks", "Tasks");
    case "ping":
      return t("admin.users.feature_ping", "Ping");
    case "notifications":
      return t("admin.users.feature_notifications", "Notifications");
    case "cloud":
      return t("admin.users.feature_cloud", "Cloud");
    case "clipboard":
      return t("admin.users.feature_clipboard", "Scripts");
    case "logs":
      return t("admin.users.feature_logs", "Logs");
    default:
      return feature;
  }
};

const createDefaultForm = (): CreateUserForm => ({
  username: "",
  password: "",
  role: "user",
  serverQuota: "0",
  allowedFeatures: [],
});

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const { account, platformAdmin, loading: accountLoading } = useAccount();
  const [users, setUsers] = React.useState<ManagedUser[]>([]);
  const [availableFeatures, setAvailableFeatures] = React.useState<AccountFeature[]>(FEATURE_ORDER);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createSubmitting, setCreateSubmitting] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<CreateUserForm>(createDefaultForm);
  const [policyUser, setPolicyUser] = React.useState<ManagedUser | null>(null);
  const [policyForm, setPolicyForm] = React.useState<PolicyForm>({
    serverQuota: "0",
    allowedFeatures: [],
  });
  const [policySubmitting, setPolicySubmitting] = React.useState(false);
  const [updatingRoleUUID, setUpdatingRoleUUID] = React.useState<string | null>(null);
  const [deletingUUID, setDeletingUUID] = React.useState<string | null>(null);

  const loadUsers = React.useCallback(async () => {
    if (!platformAdmin) {
      setUsers([]);
      setAvailableFeatures(FEATURE_ORDER);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users");
      const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<UsersResponse>;
      if (!response.ok || payload.status === "error") {
        throw new Error(payload.message || t("admin.users.load_failed"));
      }
      const nextAvailableFeatures = normalizeFeatures(
        payload.data?.available_features,
        FEATURE_ORDER,
      );
      setAvailableFeatures(
        nextAvailableFeatures.length > 0 ? nextAvailableFeatures : FEATURE_ORDER,
      );
      const items = payload.data?.items || [];
      setUsers(
        items.map((item) => ({
          ...item,
          role: normalizeRole(item.role),
          server_quota: Number(item.server_quota || 0),
          allowed_features: normalizeFeatures(
            item.allowed_features,
            nextAvailableFeatures.length > 0 ? nextAvailableFeatures : FEATURE_ORDER,
          ),
          client_count: Number(item.client_count || 0),
        })),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("admin.users.load_failed"),
      );
    } finally {
      setLoading(false);
    }
  }, [platformAdmin, t]);

  React.useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const totalUsers = users.length;
  const totalAdmins = users.filter((user) => normalizeRole(user.role) === "admin").length;
  const totalRegularUsers = totalUsers - totalAdmins;

  const toggleFeature = React.useCallback(
    (
      current: AccountFeature[],
      feature: AccountFeature,
      checked: boolean,
    ) => {
      if (checked) {
        return normalizeFeatures([...current, feature], availableFeatures);
      }
      return current.filter((item) => item !== feature);
    },
    [availableFeatures],
  );

  const openPolicyEditor = (user: ManagedUser) => {
    setPolicyUser(user);
    setPolicyForm({
      serverQuota: String(Number(user.server_quota || 0)),
      allowedFeatures: normalizeFeatures(user.allowed_features, availableFeatures),
    });
  };

  const closePolicyEditor = () => {
    setPolicyUser(null);
    setPolicyForm({
      serverQuota: "0",
      allowedFeatures: [],
    });
  };

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateSubmitting(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: createForm.username.trim(),
          password: createForm.password,
          role: createForm.role,
          server_quota: parseServerQuota(createForm.serverQuota),
          allowed_features: createForm.allowedFeatures,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<ManagedUser>;
      if (!response.ok || payload.status === "error") {
        throw new Error(payload.message || t("admin.users.create_failed"));
      }
      toast.success(t("common.created_successfully"));
      setCreateForm(createDefaultForm());
      setCreateOpen(false);
      await loadUsers();
    } catch (createError) {
      toast.error(
        createError instanceof Error
          ? createError.message
          : t("admin.users.create_failed"),
      );
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleRoleChange = async (userUUID: string, role: UserRole) => {
    setUpdatingRoleUUID(userUUID);
    try {
      const response = await fetch("/api/admin/update/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uuid: userUUID,
          role,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<{
        uuid?: string;
      }>;
      if (!response.ok || payload.status === "error") {
        throw new Error(payload.message || t("admin.users.update_failed"));
      }
      setUsers((current) =>
        current.map((user) =>
          user.uuid === userUUID ? { ...user, role } : user,
        ),
      );
      toast.success(t("common.updated_successfully"));
    } catch (updateError) {
      toast.error(
        updateError instanceof Error
          ? updateError.message
          : t("admin.users.update_failed"),
      );
      await loadUsers();
    } finally {
      setUpdatingRoleUUID(null);
    }
  };

  const handleSavePolicy = async () => {
    if (!policyUser) return;
    setPolicySubmitting(true);
    try {
      const response = await fetch("/api/admin/update/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uuid: policyUser.uuid,
          server_quota: parseServerQuota(policyForm.serverQuota),
          allowed_features: policyForm.allowedFeatures,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<{
        uuid?: string;
      }>;
      if (!response.ok || payload.status === "error") {
        throw new Error(payload.message || t("admin.users.update_failed"));
      }
      setUsers((current) =>
        current.map((user) =>
          user.uuid === policyUser.uuid
            ? {
                ...user,
                server_quota: parseServerQuota(policyForm.serverQuota),
                allowed_features: normalizeFeatures(
                  policyForm.allowedFeatures,
                  availableFeatures,
                ),
              }
            : user,
        ),
      );
      toast.success(t("common.updated_successfully"));
      closePolicyEditor();
    } catch (updateError) {
      toast.error(
        updateError instanceof Error
          ? updateError.message
          : t("admin.users.update_failed"),
      );
      await loadUsers();
    } finally {
      setPolicySubmitting(false);
    }
  };

  const handleDeleteUser = async (user: ManagedUser) => {
    const confirmed = window.confirm(
      t("admin.users.delete_confirm", { username: user.username }),
    );
    if (!confirmed) return;

    setDeletingUUID(user.uuid);
    try {
      const response = await fetch(`/api/admin/users/${user.uuid}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<{
        uuid?: string;
      }>;
      if (!response.ok || payload.status === "error") {
        throw new Error(payload.message || t("admin.users.delete_failed"));
      }
      setUsers((current) => current.filter((item) => item.uuid !== user.uuid));
      toast.success(t("common.deleted_successfully"));
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : t("admin.users.delete_failed"),
      );
    } finally {
      setDeletingUUID(null);
    }
  };

  if (accountLoading || loading) {
    return <Loading />;
  }

  if (!platformAdmin) {
    return <PlatformAdminNotice />;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <AdminPageShell
      eyebrow={t("common.admin_console")}
      title={t("admin.users.title")}
      description={t("admin.users.description")}
      actions={
        <>
          <Button variant="outline" onClick={() => void loadUsers()}>
            {t("common.refresh")}
          </Button>
          <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
            <Dialog.Trigger asChild>
              <Button>{t("common.add")}</Button>
            </Dialog.Trigger>
            <Dialog.Content maxWidth={640}>
              <Dialog.Title>{t("admin.users.create_title")}</Dialog.Title>
              <form className="mt-4 flex flex-col gap-4" onSubmit={handleCreateUser}>
                <label className="space-y-2">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {t("login.username")}
                  </div>
                  <Input
                    value={createForm.username}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        username: event.target.value,
                      }))
                    }
                    placeholder="alice"
                    minLength={3}
                    required
                  />
                </label>
                <label className="space-y-2">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {t("login.password")}
                  </div>
                  <Input
                    type="password"
                    value={createForm.password}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    minLength={6}
                    required
                  />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {t("admin.users.role")}
                    </div>
                    <Select.Root
                      value={createForm.role}
                      onValueChange={(value) =>
                        setCreateForm((current) => ({
                          ...current,
                          role: value as UserRole,
                        }))
                      }
                    >
                      <Select.Trigger />
                      <Select.Content>
                        <Select.Item value="user">{t("admin.users.role_user")}</Select.Item>
                        <Select.Item value="admin">{t("admin.users.role_admin")}</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </label>
                  <label className="space-y-2">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {t("admin.users.server_quota", "Server quota")}
                    </div>
                    <Input
                      type="number"
                      min={0}
                      value={createForm.serverQuota}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          serverQuota: event.target.value,
                        }))
                      }
                    />
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t("admin.users.server_quota_hint", "Set to 0 for unlimited.")}
                    </div>
                  </label>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {t("admin.users.allowed_features", "Allowed features")}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t(
                        "admin.users.allowed_features_hint",
                        "Leave all unchecked to allow every feature.",
                      )}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {availableFeatures.map((feature) => {
                      const checked = createForm.allowedFeatures.includes(feature);
                      return (
                        <label
                          key={feature}
                          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) =>
                              setCreateForm((current) => ({
                                ...current,
                                allowedFeatures: toggleFeature(
                                  current.allowedFeatures,
                                  feature,
                                  Boolean(next),
                                ),
                              }))
                            }
                          />
                          <span>{getFeatureLabel(feature, t)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Dialog.Close asChild>
                    <Button variant="outline" type="button">
                      {t("common.cancel")}
                    </Button>
                  </Dialog.Close>
                  <Button type="submit" disabled={createSubmitting}>
                    {createSubmitting ? t("loading") : t("common.create")}
                  </Button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Root>
        </>
      }
      stats={[
        {
          label: t("admin.users.total"),
          value: totalUsers,
          tone: "blue",
        },
        {
          label: t("admin.users.admins"),
          value: totalAdmins,
          tone: "emerald",
        },
        {
          label: t("admin.users.standard"),
          value: totalRegularUsers,
          tone: "slate",
        },
      ]}
      statsVariant="cards"
    >
      <AdminSurface>
        <Dialog.Root open={Boolean(policyUser)} onOpenChange={(open) => !open && closePolicyEditor()}>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("login.username")}</TableHead>
                  <TableHead>{t("admin.users.role")}</TableHead>
                  <TableHead>{t("admin.users.server_quota", "Server quota")}</TableHead>
                  <TableHead>{t("admin.users.allowed_features", "Allowed features")}</TableHead>
                  <TableHead>{t("admin.users.auth")}</TableHead>
                  <TableHead>{t("admin.users.created_at")}</TableHead>
                  <TableHead className="text-right">{t("common.action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const isSelf = user.uuid === account?.uuid;
                  const role = normalizeRole(user.role);
                  const hasSSO = Boolean(String(user.sso_id || "").trim());
                  const has2FA = Boolean(String(user.two_factor || "").trim());
                  const quota = Number(user.server_quota || 0);
                  const clientCount = Number(user.client_count || 0);
                  const allowedFeatures = normalizeFeatures(
                    user.allowed_features,
                    availableFeatures,
                  );

                  return (
                    <TableRow key={user.uuid}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {user.username}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {user.uuid}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select.Root
                          value={role}
                          disabled={isSelf || updatingRoleUUID === user.uuid}
                          onValueChange={(value) =>
                            void handleRoleChange(user.uuid, value as UserRole)
                          }
                        >
                          <Select.Trigger className="max-w-[160px]" />
                          <Select.Content>
                            <Select.Item value="user">{t("admin.users.role_user")}</Select.Item>
                            <Select.Item value="admin">{t("admin.users.role_admin")}</Select.Item>
                          </Select.Content>
                        </Select.Root>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {clientCount} / {quota > 0 ? quota : t("admin.users.quota_unlimited", "Unlimited")}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {t("admin.users.server_usage", "Servers in use")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {allowedFeatures.length === 0 ? (
                            <Badge color="green" variant="soft">
                              {t("admin.users.all_features", "All features")}
                            </Badge>
                          ) : (
                            allowedFeatures.map((feature) => (
                              <Badge key={feature} color="blue" variant="soft">
                                {getFeatureLabel(feature, t)}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Badge color={hasSSO ? "blue" : "gray"} variant="soft">
                            {hasSSO
                              ? t("admin.users.sso_bound")
                              : t("admin.users.sso_none")}
                          </Badge>
                          <Badge color={has2FA ? "green" : "gray"} variant="soft">
                            {has2FA
                              ? t("admin.users.mfa_enabled")
                              : t("admin.users.mfa_disabled")}
                          </Badge>
                          {isSelf ? (
                            <Badge color="amber" variant="soft">
                              {t("admin.users.current")}
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{formatDateTime(user.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => openPolicyEditor(user)}
                          >
                            {t("admin.users.edit_access", "Edit access")}
                          </Button>
                          <Button
                            variant="outline"
                            className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                            disabled={isSelf || deletingUUID === user.uuid}
                            onClick={() => void handleDeleteUser(user)}
                          >
                            {deletingUUID === user.uuid ? t("loading") : t("common.delete")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Dialog.Content maxWidth={640}>
            <Dialog.Title>{t("admin.users.access_title", "Edit user access")}</Dialog.Title>
            {policyUser ? (
              <div className="mt-4 flex flex-col gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {policyUser.username}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {policyUser.uuid}
                  </div>
                </div>
                <label className="space-y-2">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {t("admin.users.server_quota", "Server quota")}
                  </div>
                  <Input
                    type="number"
                    min={0}
                    value={policyForm.serverQuota}
                    onChange={(event) =>
                      setPolicyForm((current) => ({
                        ...current,
                        serverQuota: event.target.value,
                      }))
                    }
                  />
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t("admin.users.server_quota_hint", "Set to 0 for unlimited.")}
                  </div>
                </label>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {t("admin.users.allowed_features", "Allowed features")}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t(
                        "admin.users.allowed_features_hint",
                        "Leave all unchecked to allow every feature.",
                      )}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {availableFeatures.map((feature) => {
                      const checked = policyForm.allowedFeatures.includes(feature);
                      return (
                        <label
                          key={feature}
                          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) =>
                              setPolicyForm((current) => ({
                                ...current,
                                allowedFeatures: toggleFeature(
                                  current.allowedFeatures,
                                  feature,
                                  Boolean(next),
                                ),
                              }))
                            }
                          />
                          <span>{getFeatureLabel(feature, t)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Dialog.Close asChild>
                    <Button variant="outline" type="button" onClick={closePolicyEditor}>
                      {t("common.cancel")}
                    </Button>
                  </Dialog.Close>
                  <Button onClick={() => void handleSavePolicy()} disabled={policySubmitting}>
                    {policySubmitting ? t("loading") : t("common.save")}
                  </Button>
                </div>
              </div>
            ) : null}
          </Dialog.Content>
        </Dialog.Root>
      </AdminSurface>
    </AdminPageShell>
  );
}

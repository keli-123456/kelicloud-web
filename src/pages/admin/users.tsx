import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AdminPageShell, AdminSurface } from "@/components/admin/AdminPageShell";
import { PlatformAdminNotice } from "@/components/admin/PlatformAdminNotice";
import { Badge, Button, Dialog, Select } from "@/components/admin/admin-ui";
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
import { useAccount } from "@/contexts/AccountContext";

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
};

const normalizeRole = (role?: string): UserRole =>
  String(role || "").toLowerCase() === "user" ? "user" : "admin";

const formatDateTime = (value?: string) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "-";
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return normalized;
  return date.toLocaleString();
};

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const { account, platformAdmin, loading: accountLoading } = useAccount();
  const [users, setUsers] = React.useState<ManagedUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createSubmitting, setCreateSubmitting] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<CreateUserForm>({
    username: "",
    password: "",
    role: "user",
  });
  const [updatingRoleUUID, setUpdatingRoleUUID] = React.useState<string | null>(null);
  const [deletingUUID, setDeletingUUID] = React.useState<string | null>(null);

  const loadUsers = React.useCallback(async () => {
    if (!platformAdmin) {
      setUsers([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users");
      const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<{
        items?: ManagedUser[];
      }>;
      if (!response.ok || payload.status === "error") {
        throw new Error(payload.message || t("admin.users.load_failed"));
      }
      const items = payload.data?.items || [];
      setUsers(
        items.map((item) => ({
          ...item,
          role: normalizeRole(item.role),
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
    loadUsers().catch(() => undefined);
  }, [loadUsers]);

  const totalUsers = users.length;
  const totalAdmins = users.filter((user) => normalizeRole(user.role) === "admin").length;
  const totalRegularUsers = totalUsers - totalAdmins;

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateSubmitting(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createForm),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<ManagedUser>;
      if (!response.ok || payload.status === "error") {
        throw new Error(payload.message || t("admin.users.create_failed"));
      }
      toast.success(t("common.created_successfully"));
      setCreateForm({
        username: "",
        password: "",
        role: "user",
      });
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
            <Dialog.Content maxWidth={520}>
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
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("login.username")}</TableHead>
                <TableHead>{t("admin.users.role")}</TableHead>
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
                      <Button
                        variant="outline"
                        className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                        disabled={isSelf || deletingUUID === user.uuid}
                        onClick={() => void handleDeleteUser(user)}
                      >
                        {deletingUUID === user.uuid ? t("loading") : t("common.delete")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </AdminSurface>
    </AdminPageShell>
  );
}

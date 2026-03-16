import { useEffect, useMemo, useState } from "react";
import { Building2, Plus, RefreshCcw, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  AdminPageShell,
  AdminSurface,
} from "@/components/admin/AdminPageShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useWarningDialog } from "@/components/ui/warning-dialog";
import {
  isTenantRoleAtLeast,
  useAccount,
  type TenantSummary,
} from "@/contexts/AccountContext";

type TenantMember = {
  tenant_id: string;
  user_uuid: string;
  username: string;
  role: string;
  created_at?: string;
  updated_at?: string;
};

const tenantRoles = ["owner", "admin", "operator", "viewer"] as const;

const readResponse = async (response: Response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.status === "error") {
    throw new Error(data?.message || `HTTP ${response.status}`);
  }
  return data?.data ?? data;
};

const isLikelyUUID = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );

const formatTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const roleBadgeVariant = (role: string) => {
  switch (role) {
    case "owner":
      return "info" as const;
    case "admin":
      return "success" as const;
    case "operator":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
};

const getTenantTone = (tenant: TenantSummary | null) => {
  if (!tenant) return "slate" as const;
  if (tenant.is_default) return "blue" as const;
  if (tenant.role === "owner") return "emerald" as const;
  return "amber" as const;
};

export default function TenantsPage() {
  const { t } = useTranslation();
  const { account, loading: accountLoading, refresh, switchTenant } = useAccount();
  const { confirm, dialog } = useWarningDialog();
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [switchingTenantId, setSwitchingTenantId] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [memberIdentity, setMemberIdentity] = useState("");
  const [memberRole, setMemberRole] =
    useState<(typeof tenantRoles)[number]>("viewer");

  const currentTenant = account?.current_tenant ?? null;
  const accessibleTenants = account?.tenants ?? [];
  const canManageMembers = isTenantRoleAtLeast(currentTenant?.role, "admin");
  const isTenantOwner = currentTenant?.role === "owner";

  const ownerCount = useMemo(
    () => members.filter((member) => member.role === "owner").length,
    [members]
  );

  const loadMembers = async () => {
    if (!currentTenant?.id) {
      setMembers([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/tenants/current/members");
      const data = await readResponse(response);
      setMembers(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMembers();
  }, [currentTenant?.id]);

  const handleCreateTenant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createName.trim()) {
      toast.error(t("common.empty_error"));
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: createName.trim(),
          slug: createSlug.trim(),
          description: createDescription.trim(),
        }),
      });
      const tenant = await readResponse(response);
      toast.success(t("tenants.create_success"));
      setCreateOpen(false);
      setCreateName("");
      setCreateSlug("");
      setCreateDescription("");
      await refresh();
      if (tenant?.id) {
        await switchTenant(tenant.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setCreating(false);
    }
  };

  const handleAddMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const identity = memberIdentity.trim();
    if (!identity) {
      toast.error(t("common.empty_error"));
      return;
    }

    setAdding(true);
    try {
      const payload = isLikelyUUID(identity)
        ? { user_uuid: identity, role: memberRole }
        : { username: identity, role: memberRole };
      const response = await fetch("/api/admin/tenants/current/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      await readResponse(response);
      toast.success(t("tenants.member_added"));
      setAddOpen(false);
      setMemberIdentity("");
      setMemberRole("viewer");
      await loadMembers();
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (member: TenantMember, role: string) => {
    if (role === member.role) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/tenants/current/members/${member.user_uuid}/role`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role }),
        }
      );
      await readResponse(response);
      toast.success(t("tenants.member_role_updated"));
      await loadMembers();
      if (member.user_uuid === account?.uuid) {
        await refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleRemoveMember = async (member: TenantMember) => {
    const confirmed = await confirm({
      title: t("tenants.remove_confirm_title"),
      description: t("tenants.remove_confirm_description", {
        username: member.username,
      }),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      tone: "destructive",
    });

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/admin/tenants/current/members/${member.user_uuid}`,
        {
          method: "DELETE",
        }
      );
      await readResponse(response);
      toast.success(t("tenants.member_removed"));
      await loadMembers();
      if (member.user_uuid === account?.uuid) {
        await refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleSwitchTenant = async (tenantId: string) => {
    if (!tenantId || tenantId === currentTenant?.id) {
      return;
    }

    setSwitchingTenantId(tenantId);
    try {
      await switchTenant(tenantId);
      toast.success(t("tenants.switch_success"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSwitchingTenantId(null);
    }
  };

  if (accountLoading) {
    return (
      <div className="px-1 py-1 text-sm text-muted-foreground">{t("loading")}</div>
    );
  }

  return (
    <>
      <AdminPageShell
        eyebrow={t("tenants.title")}
        title={currentTenant?.name || t("tenants.title")}
        description={t("tenants.description")}
        actions={
          <>
            <Button variant="outline" onClick={() => void loadMembers()}>
              <RefreshCcw className="mr-2 size-4" />
              {t("common.update")}
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Building2 className="mr-2 size-4" />
                  {t("tenants.create")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("tenants.create_dialog_title")}</DialogTitle>
                  <DialogDescription>
                    {t("tenants.create_dialog_description")}
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleCreateTenant}>
                  <div className="space-y-2">
                    <Label htmlFor="tenant-name">{t("tenants.fields.name")}</Label>
                    <Input
                      id="tenant-name"
                      value={createName}
                      onChange={(event) => setCreateName(event.target.value)}
                      placeholder={t("tenants.name_placeholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tenant-slug">{t("tenants.fields.slug")}</Label>
                    <Input
                      id="tenant-slug"
                      value={createSlug}
                      onChange={(event) => setCreateSlug(event.target.value)}
                      placeholder={t("tenants.slug_placeholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tenant-description">
                      {t("tenants.fields.description")}
                    </Label>
                    <Textarea
                      id="tenant-description"
                      value={createDescription}
                      onChange={(event) =>
                        setCreateDescription(event.target.value)
                      }
                      placeholder={t("tenants.description_placeholder")}
                      rows={4}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateOpen(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? t("loading") : t("common.confirm")}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button disabled={!canManageMembers || !currentTenant}>
                  <Plus className="mr-2 size-4" />
                  {t("tenants.add_member")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("tenants.add_member_dialog_title")}</DialogTitle>
                  <DialogDescription>
                    {t("tenants.add_member_dialog_description")}
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleAddMember}>
                  <div className="space-y-2">
                    <Label htmlFor="member-identity">
                      {t("tenants.fields.username_or_uuid")}
                    </Label>
                    <Input
                      id="member-identity"
                      value={memberIdentity}
                      onChange={(event) => setMemberIdentity(event.target.value)}
                      placeholder={t("tenants.username_or_uuid_placeholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("tenants.fields.role")}</Label>
                    <Select
                      value={memberRole}
                      onValueChange={(value) =>
                        setMemberRole(value as (typeof tenantRoles)[number])
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tenantRoles
                          .filter((role) => isTenantOwner || role !== "owner")
                          .map((role) => (
                          <SelectItem key={role} value={role}>
                            {t(`tenants.roles.${role}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAddOpen(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit" disabled={adding}>
                      {adding ? t("loading") : t("common.confirm")}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
        stats={[
          {
            label: t("tenants.stats.current_role"),
            value: currentTenant ? t(`tenants.roles.${currentTenant.role}`) : "-",
            hint: currentTenant?.slug || "-",
            tone: getTenantTone(currentTenant),
          },
          {
            label: t("tenants.stats.members"),
            value: members.length,
            hint: t("tenants.stats.members_hint", { count: ownerCount }),
            tone: "emerald",
          },
          {
            label: t("tenants.stats.accessible"),
            value: account?.tenants?.length || 0,
            hint: t("tenants.stats.current_workspace_hint"),
            tone: "amber",
          },
        ]}
      >
        {!currentTenant ? (
          <Alert className="border-destructive/30 bg-destructive/5">
            <Shield className="text-destructive" />
            <AlertTitle>{t("tenants.no_current_tenant_title")}</AlertTitle>
            <AlertDescription>
              {t("tenants.no_current_tenant_description")}
            </AlertDescription>
          </Alert>
        ) : null}

        {!canManageMembers && currentTenant ? (
          <Alert className="border-sky-200 bg-sky-50/80 dark:border-sky-900/50 dark:bg-sky-950/30">
            <Shield className="text-sky-700 dark:text-sky-300" />
            <AlertTitle>{t("tenants.read_only_title")}</AlertTitle>
            <AlertDescription>
              {t("tenants.read_only_description")}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
          <AdminSurface>
            <div className="flex flex-col gap-4">
              <Card className="gap-0">
                <CardHeader className="border-b">
                  <CardTitle>{t("tenants.current_workspace")}</CardTitle>
                  <CardDescription>
                    {t("tenants.current_workspace_description")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={currentTenant?.is_default ? "info" : "outline"}>
                      {currentTenant?.is_default
                        ? t("tenants.default_badge")
                        : t("tenants.custom_badge")}
                    </Badge>
                    {currentTenant ? (
                      <Badge variant={roleBadgeVariant(currentTenant.role)}>
                        {t(`tenants.roles.${currentTenant.role}`)}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-foreground">
                      {currentTenant?.name || "-"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {currentTenant?.description ||
                        t("tenants.no_description")}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {t("tenants.fields.slug")}
                      </div>
                      <div className="mt-2 font-medium text-foreground">
                        {currentTenant?.slug || "-"}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {t("tenants.fields.id")}
                      </div>
                      <div className="mt-2 break-all font-mono text-xs text-foreground">
                        {currentTenant?.id || "-"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="gap-0">
                <CardHeader className="border-b">
                  <CardTitle>{t("tenants.accessible_title")}</CardTitle>
                  <CardDescription>
                    {t("tenants.accessible_description")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-6">
                  {accessibleTenants.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/80 px-4 py-6 text-sm text-muted-foreground">
                      {t("tenants.accessible_empty")}
                    </div>
                  ) : (
                    accessibleTenants.map((tenant) => {
                      const isCurrent = tenant.id === currentTenant?.id;
                      return (
                        <div
                          key={tenant.id}
                          className="rounded-xl border border-border/70 bg-muted/20 px-4 py-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="truncate text-sm font-semibold text-foreground">
                                  {tenant.name}
                                </div>
                                {isCurrent ? (
                                  <Badge variant="success">
                                    {t("tenants.current_badge")}
                                  </Badge>
                                ) : null}
                                <Badge variant={tenant.is_default ? "info" : "outline"}>
                                  {tenant.is_default
                                    ? t("tenants.default_badge")
                                    : t("tenants.custom_badge")}
                                </Badge>
                                <Badge variant={roleBadgeVariant(tenant.role)}>
                                  {t(`tenants.roles.${tenant.role}`)}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {tenant.description || t("tenants.no_description")}
                              </div>
                              <div className="font-mono text-xs text-muted-foreground">
                                {tenant.slug}
                              </div>
                            </div>
                            <Button
                              variant={isCurrent ? "secondary" : "outline"}
                              size="sm"
                              disabled={isCurrent || switchingTenantId === tenant.id}
                              onClick={() => void handleSwitchTenant(tenant.id)}
                            >
                              {isCurrent
                                ? t("tenants.current_badge")
                                : switchingTenantId === tenant.id
                                  ? t("loading")
                                  : t("tenants.switch_action")}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </AdminSurface>

          <AdminSurface>
            <Card className="gap-0">
              <CardHeader className="border-b">
                <CardTitle>{t("tenants.members_title")}</CardTitle>
                <CardDescription>
                  {t("tenants.members_description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="text-sm text-muted-foreground">
                    {t("loading")}
                  </div>
                ) : error ? (
                  <Alert className="border-destructive/30 bg-destructive/5">
                    <Shield className="text-destructive" />
                    <AlertTitle>{t("common.error")}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : members.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/80 px-4 py-6 text-sm text-muted-foreground">
                    {t("tenants.empty")}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("tenants.fields.username")}</TableHead>
                        <TableHead>{t("tenants.fields.role")}</TableHead>
                        <TableHead>{t("tenants.fields.joined_at")}</TableHead>
                        <TableHead className="w-[180px]">{t("common.action")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.user_uuid}>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="font-medium text-foreground">
                                {member.username}
                              </div>
                              <div className="font-mono text-xs text-muted-foreground">
                                {member.user_uuid}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={roleBadgeVariant(member.role)}>
                              {t(`tenants.roles.${member.role}`)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatTime(member.created_at)}</TableCell>
                          <TableCell>
                            {(() => {
                              const canManageRow =
                                canManageMembers &&
                                (isTenantOwner || member.role !== "owner");

                              return (
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={member.role}
                                    onValueChange={(value) =>
                                      void handleRoleChange(member, value)
                                    }
                                    disabled={!canManageRow}
                                  >
                                    <SelectTrigger className="h-8 w-[116px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {tenantRoles
                                        .filter(
                                          (role) => isTenantOwner || role !== "owner"
                                        )
                                        .map((role) => (
                                          <SelectItem key={role} value={role}>
                                            {t(`tenants.roles.${role}`)}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={
                                      !canManageRow ||
                                      (member.user_uuid === account?.uuid &&
                                        member.role === "owner" &&
                                        ownerCount <= 1)
                                    }
                                    onClick={() => void handleRemoveMember(member)}
                                  >
                                    {t("common.delete")}
                                  </Button>
                                </div>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </AdminSurface>
        </div>
      </AdminPageShell>
      {dialog}
    </>
  );
}

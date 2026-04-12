import * as React from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AdminPageShell, AdminSurface } from "@/components/admin/AdminPageShell";
import { DataTableShell } from "@/components/admin/DataTableShell";
import { PlatformAdminNotice } from "@/components/admin/PlatformAdminNotice";
import Loading from "@/components/loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  FormActions,
  FormErrorText,
  FormField,
  FormHelpText,
  FormSection,
  FormShell,
} from "@/components/ui/form-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWarningDialog } from "@/components/ui/warning-dialog";
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
  isDefaultGrantedAccountFeature,
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

type CreateUserFormErrors = Partial<{
  username: string;
  password: string;
  serverQuota: string;
  form: string;
}>;

type PolicyForm = {
  serverQuota: string;
  allowedFeatures: AccountFeature[];
};

type PolicyFormErrors = Partial<{
  serverQuota: string;
  form: string;
}>;

type FeatureGroup = {
  titleKey: string;
  defaultTitle: string;
  descriptionKey: string;
  defaultDescription: string;
  features: AccountFeature[];
};

type FeatureDependencyMap = Partial<Record<AccountFeature, AccountFeature[]>>;

const FEATURE_ORDER: AccountFeature[] = [
  "clients",
  "records",
  "tasks",
  "ping",
  "notifications",
  "cloud_digitalocean",
  "cloud_linode",
  "cloud_azure",
  "cloud_aws",
  "cloud_dns",
  "cloud_failover",
  "clipboard",
  "logs",
  "cn_connectivity",
];

const LEGACY_CLOUD_FEATURES: AccountFeature[] = [
  "cloud_digitalocean",
  "cloud_linode",
  "cloud_azure",
  "cloud_aws",
  "cloud_dns",
  "cloud_failover",
];

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    titleKey: "admin.users.group_standard",
    defaultTitle: "Core access",
    descriptionKey: "admin.users.group_standard_description",
    defaultDescription: "Common day-to-day admin capabilities.",
    features: [
      "clients",
      "records",
      "tasks",
      "ping",
      "notifications",
      "clipboard",
      "logs",
    ],
  },
  {
    titleKey: "admin.users.group_cloud",
    defaultTitle: "Cloud access",
    descriptionKey: "admin.users.group_cloud_description",
    defaultDescription: "Control each cloud provider, DNS, and failover separately.",
    features: [
      "cloud_digitalocean",
      "cloud_linode",
      "cloud_azure",
      "cloud_aws",
      "cloud_dns",
      "cloud_failover",
    ],
  },
  {
    titleKey: "admin.users.group_sensitive",
    defaultTitle: "Additional probes",
    descriptionKey: "admin.users.group_sensitive_description",
    defaultDescription: "Low-frequency features with extra dependencies.",
    features: ["cn_connectivity"],
  },
];

const FEATURE_DEPENDENCIES: FeatureDependencyMap = {
  cloud_failover: ["cn_connectivity"],
};

const normalizeRole = (role?: string): UserRole =>
  String(role || "").toLowerCase() === "user" ? "user" : "admin";

const normalizeFeatures = (
  features?: string[] | null,
  availableFeatures?: AccountFeature[],
) => {
  const source = availableFeatures?.length ? availableFeatures : FEATURE_ORDER;
  const allowList = new Set<AccountFeature>(source);
  const rawFeatures = (features || []).flatMap((feature) => {
    const value = String(feature || "").trim().toLowerCase();
    if (value === "cloud") {
      return LEGACY_CLOUD_FEATURES;
    }
    return [value];
  });
  const normalized = Array.from(
    new Set(
      rawFeatures.filter(
        (feature): feature is AccountFeature => allowList.has(feature as AccountFeature),
      ),
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
    case "cloud_digitalocean":
      return t("admin.users.feature_cloud_digitalocean", "DigitalOcean");
    case "cloud_linode":
      return t("admin.users.feature_cloud_linode", "Linode");
    case "cloud_azure":
      return t("admin.users.feature_cloud_azure", "Azure");
    case "cloud_aws":
      return t("admin.users.feature_cloud_aws", "AWS");
    case "cloud_dns":
      return t("admin.users.feature_cloud_dns", "DNS providers");
    case "cloud_failover":
      return t("admin.users.feature_cloud_failover", "Failover");
    case "clipboard":
      return t("admin.users.feature_clipboard", "Scripts");
    case "logs":
      return t("admin.users.feature_logs", "Logs");
    case "cn_connectivity":
      return t(
        "admin.users.feature_cn_connectivity",
        "CN connectivity probe",
      );
    default:
      return feature;
  }
};

const getImplicitStandardFeaturesLabel = (t: TFunction) =>
  t("admin.users.default_features", "Default access");

const getDefaultSelectedFeatures = (availableFeatures: AccountFeature[]) =>
  availableFeatures.filter((feature) => isDefaultGrantedAccountFeature(feature));

const collapseFeaturesForSave = (
  selectedFeatures: AccountFeature[],
  availableFeatures: AccountFeature[],
) => {
  const normalizedSelected = normalizeFeatures(selectedFeatures, availableFeatures);
  const defaultSelected = normalizeFeatures(
    getDefaultSelectedFeatures(availableFeatures),
    availableFeatures,
  );

  if (
    normalizedSelected.length === defaultSelected.length &&
    normalizedSelected.every((feature, index) => feature === defaultSelected[index])
  ) {
    return [] as AccountFeature[];
  }

  return normalizedSelected;
};

const getDependentFeatures = (
  feature: AccountFeature,
  availableFeatures: AccountFeature[],
) =>
  Object.entries(FEATURE_DEPENDENCIES)
    .filter(([dependent, requirements]) =>
      availableFeatures.includes(dependent as AccountFeature) &&
      requirements.includes(feature),
    )
    .map(([dependent]) => dependent as AccountFeature);

const applyFeatureSelection = (
  current: AccountFeature[],
  feature: AccountFeature,
  checked: boolean,
  availableFeatures: AccountFeature[],
) => {
  const availableSet = new Set(availableFeatures);
  let next = checked
    ? normalizeFeatures([...current, feature], availableFeatures)
    : current.filter((item) => item !== feature);

  if (feature === "cloud_failover" && checked && availableSet.has("cn_connectivity")) {
    next = normalizeFeatures([...next, "cn_connectivity"], availableFeatures);
  }

  if (feature === "cn_connectivity" && !checked) {
    next = next.filter((item) => item !== "cloud_failover");
  }

  return next;
};

function FeatureAccessEditor({
  availableFeatures,
  selectedFeatures,
  onChange,
  t,
}: {
  availableFeatures: AccountFeature[];
  selectedFeatures: AccountFeature[];
  onChange: (next: AccountFeature[]) => void;
  t: TFunction;
}) {
  const availableSet = React.useMemo(
    () => new Set(availableFeatures),
    [availableFeatures],
  );

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {t("admin.users.allowed_features", "Allowed features")}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {t(
            "admin.users.allowed_features_hint_v2",
            "Leave everything unchecked to use default access. Selecting failover will also enable the CN connectivity probe dependency.",
          )}
        </div>
      </div>
      <div className="space-y-4">
        {FEATURE_GROUPS.map((group) => {
          const groupFeatures = group.features.filter((feature) =>
            availableFeatures.includes(feature),
          );
          if (groupFeatures.length === 0) {
            return null;
          }

          return (
            <div
              key={group.titleKey}
              className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
            >
              <div className="mb-3">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {t(group.titleKey, group.defaultTitle)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {t(group.descriptionKey, group.defaultDescription)}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {groupFeatures.map((feature) => {
                  const checked = selectedFeatures.includes(feature);
                  const dependencies = (FEATURE_DEPENDENCIES[feature] || []).filter((dependency) =>
                    availableSet.has(dependency),
                  );
                  const dependents = getDependentFeatures(feature, availableFeatures).filter(
                    (dependent) => selectedFeatures.includes(dependent),
                  );
                  const locked = dependents.length > 0;

                  return (
                    <label
                      key={feature}
                      className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
                    >
                      <Checkbox
                        checked={checked}
                        disabled={locked}
                        onCheckedChange={(next) =>
                          onChange(
                            applyFeatureSelection(
                              selectedFeatures,
                              feature,
                              Boolean(next),
                              availableFeatures,
                            ),
                          )
                        }
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="text-sm text-slate-900 dark:text-slate-100">
                          {getFeatureLabel(feature, t)}
                        </div>
                        {dependencies.length > 0 || dependents.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {dependencies.map((dependency) => (
                              <Badge key={`${feature}-${dependency}`} variant="warning">
                                {t("admin.users.feature_requires", {
                                  feature: getFeatureLabel(dependency, t),
                                  defaultValue: `Requires ${getFeatureLabel(dependency, t)}`,
                                })}
                              </Badge>
                            ))}
                            {dependents.map((dependent) => (
                              <Badge key={`${feature}-${dependent}-dependent`} variant="info">
                                {t("admin.users.feature_required_by", {
                                  feature: getFeatureLabel(dependent, t),
                                  defaultValue: `Required by ${getFeatureLabel(dependent, t)}`,
                                })}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const createDefaultForm = (availableFeatures: AccountFeature[]): CreateUserForm => ({
  username: "",
  password: "",
  role: "user",
  serverQuota: "0",
  allowedFeatures: getDefaultSelectedFeatures(availableFeatures),
});

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const { account, platformAdmin, loading: accountLoading } = useAccount();
  const [users, setUsers] = React.useState<ManagedUser[]>([]);
  const [availableFeatures, setAvailableFeatures] = React.useState<AccountFeature[]>(FEATURE_ORDER);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchDraft, setSearchDraft] = React.useState("");
  const [searchKeyword, setSearchKeyword] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<"all" | UserRole>("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [selectedUUIDs, setSelectedUUIDs] = React.useState<string[]>([]);
  const [batchDeleting, setBatchDeleting] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createSubmitting, setCreateSubmitting] = React.useState(false);
  const [createErrors, setCreateErrors] = React.useState<CreateUserFormErrors>({});
  const [createForm, setCreateForm] = React.useState<CreateUserForm>(() =>
    createDefaultForm(FEATURE_ORDER),
  );
  const [policyUser, setPolicyUser] = React.useState<ManagedUser | null>(null);
  const [policyForm, setPolicyForm] = React.useState<PolicyForm>({
    serverQuota: "0",
    allowedFeatures: [],
  });
  const [policySubmitting, setPolicySubmitting] = React.useState(false);
  const [policyErrors, setPolicyErrors] = React.useState<PolicyFormErrors>({});
  const [updatingRoleUUID, setUpdatingRoleUUID] = React.useState<string | null>(null);
  const [deletingUUID, setDeletingUUID] = React.useState<string | null>(null);
  const { confirm, dialog: warningDialog } = useWarningDialog();

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

  const filteredUsers = React.useMemo(() => {
    const normalizedKeyword = searchKeyword.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "all" && normalizeRole(user.role) !== roleFilter) {
        return false;
      }
      if (!normalizedKeyword) {
        return true;
      }
      return [
        user.username,
        user.uuid,
        user.sso_id,
        user.sso_type,
      ].some((value) => String(value || "").toLowerCase().includes(normalizedKeyword));
    });
  }, [roleFilter, searchKeyword, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pageUsers = React.useMemo(() => {
    const start = (clampedPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [clampedPage, filteredUsers, pageSize]);

  React.useEffect(() => {
    if (page !== clampedPage) {
      setPage(clampedPage);
    }
  }, [clampedPage, page]);

  React.useEffect(() => {
    setSelectedUUIDs((current) =>
      current.filter((uuid) => filteredUsers.some((user) => user.uuid === uuid)),
    );
  }, [filteredUsers]);

  const selectablePageUsers = pageUsers.filter((user) => user.uuid !== account?.uuid);
  const selectedOnCurrentPage = selectablePageUsers.filter((user) =>
    selectedUUIDs.includes(user.uuid),
  ).length;
  const allCurrentPageSelected =
    selectablePageUsers.length > 0 && selectedOnCurrentPage === selectablePageUsers.length;

  const totalUsers = users.length;
  const totalAdmins = users.filter((user) => normalizeRole(user.role) === "admin").length;
  const totalRegularUsers = totalUsers - totalAdmins;

  const openPolicyEditor = (user: ManagedUser) => {
    const normalizedAllowedFeatures = normalizeFeatures(
      user.allowed_features,
      availableFeatures,
    );
    setPolicyUser(user);
    setPolicyForm({
      serverQuota: String(Number(user.server_quota || 0)),
      allowedFeatures:
        normalizedAllowedFeatures.length > 0
          ? normalizedAllowedFeatures
          : getDefaultSelectedFeatures(availableFeatures),
    });
    setPolicyErrors({});
  };

  const closePolicyEditor = () => {
    setPolicyUser(null);
    setPolicyForm({
      serverQuota: "0",
      allowedFeatures: [],
    });
    setPolicyErrors({});
  };

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: CreateUserFormErrors = {};
    if (!createForm.username.trim()) {
      nextErrors.username = t("admin.users.validation.username_required", {
        defaultValue: "Username is required.",
      });
    } else if (createForm.username.trim().length < 3) {
      nextErrors.username = t("admin.users.validation.username_min", {
        defaultValue: "Username must be at least 3 characters.",
      });
    }
    if (!createForm.password) {
      nextErrors.password = t("admin.users.validation.password_required", {
        defaultValue: "Password is required.",
      });
    } else if (createForm.password.length < 6) {
      nextErrors.password = t("admin.users.validation.password_min", {
        defaultValue: "Password must be at least 6 characters.",
      });
    }
    const serverQuota = Number.parseInt(createForm.serverQuota, 10);
    if (
      createForm.serverQuota.trim() !== "" &&
      (!Number.isFinite(serverQuota) || serverQuota < 0)
    ) {
      nextErrors.serverQuota = t("admin.users.validation.server_quota", {
        defaultValue: "Server quota must be 0 or a positive integer.",
      });
    }
    setCreateErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

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
          allowed_features: collapseFeaturesForSave(
            createForm.allowedFeatures,
            availableFeatures,
          ),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<ManagedUser>;
      if (!response.ok || payload.status === "error") {
        throw new Error(payload.message || t("admin.users.create_failed"));
      }
      toast.success(t("common.created_successfully"));
      setCreateForm(createDefaultForm(availableFeatures));
      setCreateErrors({});
      setCreateOpen(false);
      await loadUsers();
    } catch (createError) {
      const message = createError instanceof Error
        ? createError.message
        : t("admin.users.create_failed");
      setCreateErrors((current) => ({ ...current, form: message }));
      toast.error(message);
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

  const handleSavePolicy = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!policyUser) return;
    const nextErrors: PolicyFormErrors = {};
    const parsedServerQuota = Number.parseInt(policyForm.serverQuota, 10);
    if (
      policyForm.serverQuota.trim() !== "" &&
      (!Number.isFinite(parsedServerQuota) || parsedServerQuota < 0)
    ) {
      nextErrors.serverQuota = t("admin.users.validation.server_quota", {
        defaultValue: "Server quota must be 0 or a positive integer.",
      });
    }
    setPolicyErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
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
          allowed_features: collapseFeaturesForSave(
            policyForm.allowedFeatures,
            availableFeatures,
          ),
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
                allowed_features: collapseFeaturesForSave(
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
      const message =
        updateError instanceof Error
          ? updateError.message
          : t("admin.users.update_failed");
      setPolicyErrors((current) => ({ ...current, form: message }));
      toast.error(
        message,
      );
      await loadUsers();
    } finally {
      setPolicySubmitting(false);
    }
  };

  const handleDeleteUser = async (user: ManagedUser) => {
    const confirmed = await confirm({
      tone: "destructive",
      title: t("admin.users.delete_title", "Delete user"),
      description: t("admin.users.delete_confirm", { username: user.username }),
      confirmLabel: t("common.delete", "Delete"),
      cancelLabel: t("common.cancel", "Cancel"),
    });
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

  const handleToggleAllOnPage = (checked: boolean) => {
    const targetUUIDs = selectablePageUsers.map((user) => user.uuid);
    if (checked) {
      setSelectedUUIDs((current) => Array.from(new Set([...current, ...targetUUIDs])));
      return;
    }
    setSelectedUUIDs((current) => current.filter((uuid) => !targetUUIDs.includes(uuid)));
  };

  const handleBatchDelete = async () => {
    const targetUsers = filteredUsers.filter(
      (user) => selectedUUIDs.includes(user.uuid) && user.uuid !== account?.uuid,
    );
    if (targetUsers.length === 0) {
      return;
    }

    const confirmed = await confirm({
      tone: "destructive",
      title: t("admin.users.batch_delete_title", {
        defaultValue: "Delete selected users",
      }),
      description: t("admin.users.batch_delete_confirm", {
        count: targetUsers.length,
        defaultValue: `Delete ${targetUsers.length} selected users? This cannot be undone.`,
      }),
      confirmLabel: t("common.delete", "Delete"),
      cancelLabel: t("common.cancel", "Cancel"),
    });
    if (!confirmed) return;

    setBatchDeleting(true);
    const failed: string[] = [];
    const deletedUUIDs: string[] = [];

    for (const user of targetUsers) {
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
        deletedUUIDs.push(user.uuid);
      } catch {
        failed.push(user.username || user.uuid);
      }
    }

    if (deletedUUIDs.length > 0) {
      setUsers((current) => current.filter((item) => !deletedUUIDs.includes(item.uuid)));
      setSelectedUUIDs((current) => current.filter((uuid) => !deletedUUIDs.includes(uuid)));
      toast.success(
        t("admin.users.batch_delete_success", {
          count: deletedUUIDs.length,
          defaultValue: `Deleted ${deletedUUIDs.length} users`,
        }),
      );
    }

    if (failed.length > 0) {
      toast.error(
        t("admin.users.batch_delete_partial_failed", {
          count: failed.length,
          detail: failed.slice(0, 3).join(", "),
          defaultValue: `${failed.length} users failed to delete: ${failed.slice(0, 3).join(", ")}`,
        }),
      );
    }

    setBatchDeleting(false);
  };

  if (accountLoading) {
    return <Loading />;
  }

  if (!platformAdmin) {
    return <PlatformAdminNotice />;
  }

  return (
    <AdminPageShell
      eyebrow={t("common.admin_console")}
      title={t("admin.users.title")}
      description={t("admin.users.description")}
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
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (open) {
            setCreateForm(createDefaultForm(availableFeatures));
            setCreateErrors({});
          }
        }}
      >
        <DialogContent className="sm:max-w-[640px]">
          <DialogTitle>{t("admin.users.create_title")}</DialogTitle>
          <form className="mt-4 space-y-4" onSubmit={handleCreateUser}>
            <FormShell>
              <FormSection
                title={t("admin.users.create_basic", {
                  defaultValue: "Basic account info",
                })}
              >
                <FormField
                  label={t("login.username")}
                  htmlFor="create-username"
                  required
                  error={createErrors.username}
                >
                  <Input
                    id="create-username"
                    value={createForm.username}
                    onChange={(event) => {
                      setCreateErrors((current) => ({
                        ...current,
                        username: undefined,
                        form: undefined,
                      }));
                      setCreateForm((current) => ({
                        ...current,
                        username: event.target.value,
                      }));
                    }}
                    placeholder="alice"
                    minLength={3}
                    required
                  />
                </FormField>

                <FormField
                  label={t("login.password")}
                  htmlFor="create-password"
                  required
                  error={createErrors.password}
                >
                  <Input
                    id="create-password"
                    type="password"
                    value={createForm.password}
                    onChange={(event) => {
                      setCreateErrors((current) => ({
                        ...current,
                        password: undefined,
                        form: undefined,
                      }));
                      setCreateForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }));
                    }}
                    minLength={6}
                    required
                  />
                </FormField>
              </FormSection>

              <FormSection
                advanced
                title={t("admin.users.create_advanced", {
                  defaultValue: "Advanced settings",
                })}
                toggleLabel={t("common.advanced", { defaultValue: "Advanced options" })}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label={t("admin.users.role")} htmlFor="create-role">
                    <Select
                      value={createForm.role}
                      onValueChange={(value) =>
                        setCreateForm((current) => ({
                          ...current,
                          role: value as UserRole,
                        }))
                      }
                    >
                      <SelectTrigger id="create-role" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">{t("admin.users.role_user")}</SelectItem>
                        <SelectItem value="admin">{t("admin.users.role_admin")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField
                    label={t("admin.users.server_quota", "Server quota")}
                    htmlFor="create-server-quota"
                    error={createErrors.serverQuota}
                  >
                    <Input
                      id="create-server-quota"
                      type="number"
                      min={0}
                      value={createForm.serverQuota}
                      onChange={(event) => {
                        setCreateErrors((current) => ({
                          ...current,
                          serverQuota: undefined,
                          form: undefined,
                        }));
                        setCreateForm((current) => ({
                          ...current,
                          serverQuota: event.target.value,
                        }));
                      }}
                    />
                    <FormHelpText>
                      {t("admin.users.server_quota_hint", "Set to 0 for unlimited.")}
                    </FormHelpText>
                  </FormField>
                </div>

                <FeatureAccessEditor
                  availableFeatures={availableFeatures}
                  selectedFeatures={createForm.allowedFeatures}
                  onChange={(allowedFeatures) =>
                    setCreateForm((current) => ({ ...current, allowedFeatures }))
                  }
                  t={t}
                />
              </FormSection>
            </FormShell>

            {createErrors.form ? <FormErrorText>{createErrors.form}</FormErrorText> : null}

            <FormActions>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  {t("common.cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={createSubmitting}>
                {createSubmitting ? t("loading") : t("common.create")}
              </Button>
            </FormActions>
          </form>
        </DialogContent>
      </Dialog>

      <AdminSurface>
        <Dialog open={Boolean(policyUser)} onOpenChange={(open) => !open && closePolicyEditor()}>
          <DataTableShell
            search={(
              <form
                className="min-w-0"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSearchKeyword(searchDraft.trim());
                }}
              >
                <Input
                  value={searchDraft}
                  onChange={(event) => {
                    const next = event.target.value;
                    setSearchDraft(next);
                    if (!next.trim()) {
                      setSearchKeyword("");
                    }
                  }}
                  placeholder={t("common.search", { defaultValue: "Search" })}
                  aria-label={t("common.search", { defaultValue: "Search" })}
                />
              </form>
            )}
            filters={(
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Select
                  value={roleFilter}
                  onValueChange={(value) => {
                    setRoleFilter(value as "all" | UserRole);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("admin.users.filter_all_roles", { defaultValue: "All roles" })}
                    </SelectItem>
                    <SelectItem value="admin">{t("admin.users.role_admin")}</SelectItem>
                    <SelectItem value="user">{t("admin.users.role_user")}</SelectItem>
                  </SelectContent>
                </Select>
                <span className="truncate text-xs text-muted-foreground">
                  {t("admin.users.filter_summary", {
                    visible: filteredUsers.length,
                    total: totalUsers,
                    defaultValue: `Showing ${filteredUsers.length} / ${totalUsers}`,
                  })}
                </span>
              </div>
            )}
            actions={(
              <>
                <Button variant="outline" onClick={() => void loadUsers()}>
                  {t("common.refresh")}
                </Button>
                <DialogTrigger asChild>
                  <Button>{t("common.add")}</Button>
                </DialogTrigger>
              </>
            )}
            batchActions={selectedUUIDs.length > 0 ? (
              <>
                <Badge variant="secondary">
                  {t("admin.users.selected_count", {
                    count: selectedUUIDs.length,
                    defaultValue: `${selectedUUIDs.length} selected`,
                  })}
                </Badge>
                <Button
                  variant="destructive"
                  disabled={batchDeleting || deletingUUID !== null || createSubmitting}
                  onClick={() => void handleBatchDelete()}
                >
                  {batchDeleting ? t("loading") : t("common.delete", "Delete")}
                </Button>
              </>
            ) : null}
            advancedFilters={(
              <div className="flex items-center gap-2 text-sm">
                <label htmlFor="users-page-size" className="text-muted-foreground">
                  {t("common.page_size", { defaultValue: "Page size" })}
                </label>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="users-page-size" className="h-9 w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            advancedFiltersLabel={t("common.more_filters", { defaultValue: "More filters" })}
            loading={loading}
            error={error}
            onRetry={() => void loadUsers()}
            retryLabel={t("common.retry", { defaultValue: "Retry" })}
            empty={filteredUsers.length === 0}
            emptyTitle={t("admin.users.empty", { defaultValue: "No users found" })}
            emptyDescription={t("admin.users.empty_desc", {
              defaultValue: "Try changing search keywords or role filter.",
            })}
            pagination={(
              <div className="flex items-center gap-2 text-sm">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={clampedPage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  {t("common.previous", { defaultValue: "Previous" })}
                </Button>
                <span className="text-muted-foreground">
                  {t("common.page_of", {
                    current: clampedPage,
                    total: totalPages,
                    defaultValue: `${clampedPage} / ${totalPages}`,
                  })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={clampedPage >= totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                >
                  {t("common.next", { defaultValue: "Next" })}
                </Button>
              </div>
            )}
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allCurrentPageSelected}
                      onCheckedChange={(checked) => handleToggleAllOnPage(Boolean(checked))}
                      disabled={selectablePageUsers.length === 0 || batchDeleting}
                      aria-label={t("admin.users.select_all", {
                        defaultValue: "Select all users on this page",
                      })}
                    />
                  </TableHead>
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
                {pageUsers.map((user) => {
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
                        <Checkbox
                          checked={selectedUUIDs.includes(user.uuid)}
                          disabled={isSelf || batchDeleting}
                          onCheckedChange={(checked) => {
                            const next = Boolean(checked);
                            setSelectedUUIDs((current) =>
                              next
                                ? Array.from(new Set([...current, user.uuid]))
                                : current.filter((uuid) => uuid !== user.uuid),
                            );
                          }}
                          aria-label={t("admin.users.select_one", {
                            defaultValue: "Select this user",
                          })}
                        />
                      </TableCell>
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
                        <Select
                          value={role}
                          disabled={isSelf || updatingRoleUUID === user.uuid}
                          onValueChange={(value) =>
                            void handleRoleChange(user.uuid, value as UserRole)
                          }
                        >
                          <SelectTrigger className="w-full max-w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">{t("admin.users.role_user")}</SelectItem>
                            <SelectItem value="admin">{t("admin.users.role_admin")}</SelectItem>
                          </SelectContent>
                        </Select>
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
                            <Badge variant="success">
                              {getImplicitStandardFeaturesLabel(t)}
                            </Badge>
                          ) : (
                            allowedFeatures.map((feature) => (
                              <Badge key={feature} variant="info">
                                {getFeatureLabel(feature, t)}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={hasSSO ? "info" : "secondary"}>
                            {hasSSO
                              ? t("admin.users.sso_bound")
                              : t("admin.users.sso_none")}
                          </Badge>
                          <Badge variant={has2FA ? "success" : "secondary"}>
                            {has2FA
                              ? t("admin.users.mfa_enabled")
                              : t("admin.users.mfa_disabled")}
                          </Badge>
                          {isSelf ? (
                            <Badge variant="warning">
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
                            variant="destructive"
                            disabled={isSelf || deletingUUID === user.uuid || batchDeleting}
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
          </DataTableShell>
          <DialogContent className="sm:max-w-[640px]">
            <DialogTitle>{t("admin.users.access_title", "Edit user access")}</DialogTitle>
            {policyUser ? (
              <form className="mt-4 space-y-4" onSubmit={(event) => void handleSavePolicy(event)}>
                <FormShell>
                  <FormSection title={t("admin.users.access_scope", "Access scope")}>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/60">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {policyUser.username}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {policyUser.uuid}
                      </div>
                    </div>
                    <FormField
                      label={t("admin.users.server_quota", "Server quota")}
                      htmlFor="policy-server-quota"
                      error={policyErrors.serverQuota}
                      description={t("admin.users.server_quota_hint", "Set to 0 for unlimited.")}
                    >
                      <Input
                        id="policy-server-quota"
                        type="number"
                        min={0}
                        value={policyForm.serverQuota}
                        onChange={(event) => {
                          setPolicyErrors((current) => ({
                            ...current,
                            serverQuota: undefined,
                            form: undefined,
                          }));
                          setPolicyForm((current) => ({
                            ...current,
                            serverQuota: event.target.value,
                          }));
                        }}
                      />
                    </FormField>
                  </FormSection>

                  <FormSection
                    advanced
                    title={t("admin.users.allowed_features", "Allowed features")}
                    toggleLabel={t("common.advanced", { defaultValue: "Advanced" })}
                  >
                    <FeatureAccessEditor
                      availableFeatures={availableFeatures}
                      selectedFeatures={policyForm.allowedFeatures}
                      onChange={(allowedFeatures) =>
                        setPolicyForm((current) => ({ ...current, allowedFeatures }))
                      }
                      t={t}
                    />
                  </FormSection>
                </FormShell>

                {policyErrors.form ? <FormErrorText>{policyErrors.form}</FormErrorText> : null}

                <FormActions>
                  <DialogClose asChild>
                    <Button variant="outline" type="button" onClick={closePolicyEditor}>
                      {t("common.cancel")}
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={policySubmitting}>
                    {policySubmitting ? t("loading") : t("common.save")}
                  </Button>
                </FormActions>
              </form>
            ) : null}
          </DialogContent>
        </Dialog>
      </AdminSurface>
      {warningDialog}
    </AdminPageShell>
  );
}

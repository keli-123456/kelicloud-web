import * as React from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  AdminPageShell,
  AdminSurface,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
import {
  ADMIN_FORM_DIALOG_CLASS,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_GRID_2_CLASS,
  ADMIN_FORM_SCROLL_CLASS,
  ADMIN_FORM_TOGGLE_CLASS,
} from "@/components/admin/AdminFormStyles";
import { PlatformAdminNotice } from "@/components/admin/PlatformAdminNotice";
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  Select,
  Switch,
} from "@/components/admin/admin-ui";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
  plan_name?: string;
  plan_expires_at?: string;
  plan_note?: string;
  account_disabled?: boolean;
  access_status?: "active" | "disabled" | "expired" | string;
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
  planName: string;
  planExpiresAt: string;
  planNote: string;
  accountDisabled: boolean;
};

type PolicyForm = {
  serverQuota: string;
  allowedFeatures: AccountFeature[];
  planName: string;
  planExpiresAt: string;
  planNote: string;
  accountDisabled: boolean;
};

type FeatureGroup = {
  titleKey: string;
  defaultTitle: string;
  descriptionKey: string;
  defaultDescription: string;
  features: AccountFeature[];
};

type FeatureDependencyMap = Partial<Record<AccountFeature, AccountFeature[]>>;

type PlanPreset = {
  id: "starter" | "ops" | "business";
  titleKey: string;
  defaultTitle: string;
  descriptionKey: string;
  defaultDescription: string;
  planName: string;
  serverQuota: string;
  features: AccountFeature[];
};

type QuotaUsageTone = "green" | "amber" | "red" | "blue";

type QuotaUsageState = {
  percent: number;
  tone: QuotaUsageTone;
  barClassName: string;
  labelKey: string;
  defaultLabel: string;
};

const EXPIRING_SOON_DAYS = 14;

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

const PLAN_PRESETS: PlanPreset[] = [
  {
    id: "starter",
    titleKey: "admin.users.plan_starter",
    defaultTitle: "Starter",
    descriptionKey: "admin.users.plan_starter_desc",
    defaultDescription: "Monitoring, records, and audit visibility for a small private fleet.",
    planName: "Starter",
    serverQuota: "3",
    features: ["clients", "records", "logs"],
  },
  {
    id: "ops",
    titleKey: "admin.users.plan_ops",
    defaultTitle: "Ops",
    descriptionKey: "admin.users.plan_ops_desc",
    defaultDescription: "Daily operations with scripts, tasks, notifications, and ping checks.",
    planName: "Ops",
    serverQuota: "10",
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
    id: "business",
    titleKey: "admin.users.plan_business",
    defaultTitle: "Business",
    descriptionKey: "admin.users.plan_business_desc",
    defaultDescription: "Unlimited quota with cloud providers, DNS, and failover enabled.",
    planName: "Business",
    serverQuota: "0",
    features: FEATURE_ORDER,
  },
];

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

const normalizeTextInput = (value?: string) => String(value || "").trim();

const formatDateInput = (value?: string) => {
  const normalized = normalizeTextInput(value);
  if (!normalized) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const getExpirationDaysRemaining = (value?: string) => {
  const normalized = formatDateInput(value);
  if (!normalized) return null;
  const expiresAt = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(expiresAt.getTime())) return null;
  expiresAt.setDate(expiresAt.getDate() + 1);
  const now = new Date();
  return Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000);
};

const getQuotaUsageState = (
  clientCount: number,
  quota: number,
): QuotaUsageState => {
  if (quota <= 0) {
    return {
      percent: 100,
      tone: "blue",
      barClassName: "bg-blue-500 dark:bg-blue-400",
      labelKey: "admin.users.quota_unlimited",
      defaultLabel: "Unlimited",
    };
  }

  const ratio = clientCount / quota;
  const percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));
  if (clientCount >= quota) {
    return {
      percent,
      tone: "red",
      barClassName: "bg-red-500 dark:bg-red-400",
      labelKey: "admin.users.quota_at_limit",
      defaultLabel: "At limit",
    };
  }
  if (ratio >= 0.8) {
    return {
      percent,
      tone: "amber",
      barClassName: "bg-amber-500 dark:bg-amber-400",
      labelKey: "admin.users.quota_near_limit",
      defaultLabel: "Near limit",
    };
  }
  return {
    percent,
    tone: "green",
    barClassName: "bg-emerald-500 dark:bg-emerald-400",
    labelKey: "admin.users.quota_available",
    defaultLabel: "Available",
  };
};

const getAccessStatusTone = (status?: string): "red" | "amber" | "green" => {
  switch (status) {
    case "disabled":
      return "red";
    case "expired":
      return "amber";
    default:
      return "green";
  }
};

const getAccessStatusLabel = (status: string | undefined, t: TFunction) => {
  switch (status) {
    case "disabled":
      return t("admin.users.access_disabled", "Disabled");
    case "expired":
      return t("admin.users.access_expired", "Expired");
    default:
      return t("admin.users.access_active", "Active");
  }
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
              className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
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
                              <Badge key={`${feature}-${dependency}`} color="amber" variant="soft">
                                {t("admin.users.feature_requires", {
                                  feature: getFeatureLabel(dependency, t),
                                  defaultValue: `Requires ${getFeatureLabel(dependency, t)}`,
                                })}
                              </Badge>
                            ))}
                            {dependents.map((dependent) => (
                              <Badge key={`${feature}-${dependent}-dependent`} color="blue" variant="soft">
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

function PlanPresetSelector({
  availableFeatures,
  onApply,
  t,
}: {
  availableFeatures: AccountFeature[];
  onApply: (
    planName: string,
    serverQuota: string,
    allowedFeatures: AccountFeature[],
  ) => void;
  t: TFunction;
}) {
  return (
    <div className={ADMIN_FORM_FIELD_CLASS}>
      <div>
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {t("admin.users.plan_presets", "Plan presets")}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {t(
            "admin.users.plan_presets_hint",
            "Apply a commercial tier template, then fine tune quota and feature access if needed.",
          )}
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {PLAN_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50/60 dark:border-slate-800 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
            onClick={() =>
              onApply(
                preset.planName,
                preset.serverQuota,
                normalizeFeatures(preset.features, availableFeatures),
              )
            }
          >
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t(preset.titleKey, preset.defaultTitle)}
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {t(preset.descriptionKey, preset.defaultDescription)}
            </div>
          </button>
        ))}
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
  planName: "",
  planExpiresAt: "",
  planNote: "",
  accountDisabled: false,
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
  const [createForm, setCreateForm] = React.useState<CreateUserForm>(() =>
    createDefaultForm(FEATURE_ORDER),
  );
  const [policyUser, setPolicyUser] = React.useState<ManagedUser | null>(null);
  const [policyForm, setPolicyForm] = React.useState<PolicyForm>({
    serverQuota: "0",
    allowedFeatures: [],
    planName: "",
    planExpiresAt: "",
    planNote: "",
    accountDisabled: false,
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
          plan_name: normalizeTextInput(item.plan_name),
          plan_expires_at: normalizeTextInput(item.plan_expires_at),
          plan_note: normalizeTextInput(item.plan_note),
          account_disabled: Boolean(item.account_disabled),
          access_status: normalizeTextInput(item.access_status) || "active",
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
  const activeUsers = users.filter(
    (user) => normalizeTextInput(user.access_status) === "active",
  ).length;
  const blockedUsers = users.filter((user) => {
    const status = normalizeTextInput(user.access_status);
    return status === "disabled" || status === "expired";
  }).length;
  const expiringSoonUsers = users.filter((user) => {
    if (normalizeTextInput(user.access_status) !== "active") return false;
    const daysRemaining = getExpirationDaysRemaining(user.plan_expires_at);
    return daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= EXPIRING_SOON_DAYS;
  }).length;

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
      planName: normalizeTextInput(user.plan_name),
      planExpiresAt: formatDateInput(user.plan_expires_at),
      planNote: normalizeTextInput(user.plan_note),
      accountDisabled: Boolean(user.account_disabled),
    });
  };

  const closePolicyEditor = () => {
    setPolicyUser(null);
    setPolicyForm({
      serverQuota: "0",
      allowedFeatures: [],
      planName: "",
      planExpiresAt: "",
      planNote: "",
      accountDisabled: false,
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
          allowed_features: collapseFeaturesForSave(
            createForm.allowedFeatures,
            availableFeatures,
          ),
          plan_name: normalizeTextInput(createForm.planName),
          plan_expires_at: formatDateInput(createForm.planExpiresAt),
          plan_note: normalizeTextInput(createForm.planNote),
          account_disabled: createForm.accountDisabled,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<ManagedUser>;
      if (!response.ok || payload.status === "error") {
        throw new Error(payload.message || t("admin.users.create_failed"));
      }
      toast.success(t("common.created_successfully"));
      setCreateForm(createDefaultForm(availableFeatures));
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
          allowed_features: collapseFeaturesForSave(
            policyForm.allowedFeatures,
            availableFeatures,
          ),
          plan_name: normalizeTextInput(policyForm.planName),
          plan_expires_at: formatDateInput(policyForm.planExpiresAt),
          plan_note: normalizeTextInput(policyForm.planNote),
          account_disabled: policyForm.accountDisabled,
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
                plan_name: normalizeTextInput(policyForm.planName),
                plan_expires_at: formatDateInput(policyForm.planExpiresAt),
                plan_note: normalizeTextInput(policyForm.planNote),
                account_disabled: policyForm.accountDisabled,
                access_status: policyForm.accountDisabled
                  ? "disabled"
                  : formatDateInput(policyForm.planExpiresAt) &&
                      new Date(formatDateInput(policyForm.planExpiresAt)).getTime() + 86400000 <=
                        Date.now()
                    ? "expired"
                    : "active",
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
    return (
      <AdminPageShell
        eyebrow={t("common.admin_console")}
        title={t("admin.users.title")}
        description={t("admin.users.description")}
        actions={
          <>
            <Button variant="outline" disabled>
              {t("common.refresh")}
            </Button>
            <Button disabled>{t("common.add")}</Button>
          </>
        }
        statsVariant="cards"
        stats={[
          {
            label: t("admin.users.stats_total", "Total users"),
            value: <Skeleton className="h-7 w-12" />,
            tone: "blue",
          },
          {
            label: t("admin.users.stats_active", "Active"),
            value: <Skeleton className="h-7 w-12" />,
            tone: "emerald",
          },
          {
            label: t("admin.users.stats_expiring", "Expiring soon"),
            value: <Skeleton className="h-7 w-12" />,
            tone: "amber",
          },
          {
            label: t("admin.users.stats_blocked", "Blocked"),
            value: <Skeleton className="h-7 w-12" />,
            tone: "rose",
          },
        ]}
      >
        <AdminSurface className="overflow-hidden p-0">
          <AdminTableSkeleton columns={8} rows={6} className="rounded-none border-0 shadow-none" />
        </AdminSurface>
      </AdminPageShell>
    );
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
          <Dialog.Root
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (open) {
                setCreateForm(createDefaultForm(availableFeatures));
              }
            }}
          >
            <Dialog.Trigger asChild>
              <Button>{t("common.add")}</Button>
            </Dialog.Trigger>
            <Dialog.Content className={ADMIN_FORM_DIALOG_CLASS} maxWidth={720}>
              <Dialog.Title>{t("admin.users.create_title")}</Dialog.Title>
              <form className={`${ADMIN_FORM_SCROLL_CLASS} mt-4 space-y-4`} onSubmit={handleCreateUser}>
                <label className={ADMIN_FORM_FIELD_CLASS}>
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
                <label className={ADMIN_FORM_FIELD_CLASS}>
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
                <PlanPresetSelector
                  availableFeatures={availableFeatures}
                  onApply={(planName, serverQuota, allowedFeatures) =>
                    setCreateForm((current) => ({
                      ...current,
                      role: "user",
                      planName,
                      serverQuota,
                      allowedFeatures,
                    }))
                  }
                  t={t}
                />
                <div className={ADMIN_FORM_GRID_2_CLASS}>
                  <label className={ADMIN_FORM_FIELD_CLASS}>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {t("admin.users.plan_name", "Plan")}
                    </div>
                    <Input
                      value={createForm.planName}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          planName: event.target.value,
                        }))
                      }
                      placeholder={t("admin.users.plan_name_placeholder", "Business")}
                      maxLength={64}
                    />
                  </label>
                  <label className={ADMIN_FORM_FIELD_CLASS}>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {t("admin.users.plan_expires_at", "Expires")}
                    </div>
                    <Input
                      type="date"
                      value={createForm.planExpiresAt}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          planExpiresAt: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <label className={ADMIN_FORM_FIELD_CLASS}>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {t("admin.users.plan_note", "Internal note")}
                  </div>
                  <Textarea
                    value={createForm.planNote}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        planNote: event.target.value,
                      }))
                    }
                    placeholder={t("admin.users.plan_note_placeholder", "Renewal note, source, or billing remark")}
                    maxLength={512}
                  />
                </label>
                <label className={ADMIN_FORM_TOGGLE_CLASS}>
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {t("admin.users.account_disabled", "Disable account")}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t("admin.users.account_disabled_hint", "Disabled or expired users cannot log in or use admin APIs.")}
                    </div>
                  </div>
                  <Switch
                    checked={createForm.accountDisabled}
                    onCheckedChange={(checked) =>
                      setCreateForm((current) => ({
                        ...current,
                        accountDisabled: checked,
                      }))
                    }
                  />
                </label>
                <div className={ADMIN_FORM_GRID_2_CLASS}>
                  <label className={ADMIN_FORM_FIELD_CLASS}>
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
                  <label className={ADMIN_FORM_FIELD_CLASS}>
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
                <FeatureAccessEditor
                  availableFeatures={availableFeatures}
                  selectedFeatures={createForm.allowedFeatures}
                  onChange={(allowedFeatures) =>
                    setCreateForm((current) => ({ ...current, allowedFeatures }))
                  }
                  t={t}
                />
                <div className="flex justify-end gap-2 border-t border-slate-200/70 pt-4 dark:border-slate-800/70">
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
          hint: t("admin.users.stats_role_mix", {
            admins: totalAdmins,
            users: totalRegularUsers,
            defaultValue: "{{admins}} admins / {{users}} users",
          }),
        },
        {
          label: t("admin.users.stats_active", "Active"),
          value: activeUsers,
          tone: "emerald",
        },
        {
          label: t("admin.users.stats_expiring", "Expiring soon"),
          value: expiringSoonUsers,
          hint: t("admin.users.stats_expiring_hint", {
            days: EXPIRING_SOON_DAYS,
            defaultValue: "Within {{days}} days",
          }),
          tone: "amber",
        },
        {
          label: t("admin.users.stats_blocked", "Blocked"),
          value: blockedUsers,
          tone: "rose",
        },
      ]}
      statsVariant="cards"
    >
      <AdminSurface>
        <Dialog.Root open={Boolean(policyUser)} onOpenChange={(open) => !open && closePolicyEditor()}>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("login.username")}</TableHead>
                  <TableHead>{t("admin.users.role")}</TableHead>
                  <TableHead>{t("admin.users.plan_name", "Plan")}</TableHead>
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
                  const quotaUsage = getQuotaUsageState(clientCount, quota);
                  const accessStatus = normalizeTextInput(user.access_status) || "active";
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
                        <div className="min-w-[150px] space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {normalizeTextInput(user.plan_name) ||
                                t("admin.users.plan_none", "No plan")}
                            </span>
                            <Badge
                              color={getAccessStatusTone(accessStatus)}
                              variant="soft"
                            >
                              {getAccessStatusLabel(accessStatus, t)}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {formatDateInput(user.plan_expires_at)
                              ? t("admin.users.expires_on", {
                                  date: formatDateInput(user.plan_expires_at),
                                  defaultValue: "Expires {{date}}",
                                })
                              : t("admin.users.no_expiration", "No expiration")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-[180px] space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {clientCount} /{" "}
                              {quota > 0
                                ? quota
                                : t("admin.users.quota_unlimited", "Unlimited")}
                            </span>
                            <Badge
                              color={quotaUsage.tone}
                              variant="soft"
                              className="shrink-0"
                            >
                              {t(quotaUsage.labelKey, quotaUsage.defaultLabel)}
                            </Badge>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className={`h-full rounded-full transition-[width] ${quotaUsage.barClassName}`}
                              style={{ width: `${quotaUsage.percent}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {t("admin.users.server_usage", "Servers in use")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {allowedFeatures.length === 0 ? (
                            <Badge color="green" variant="soft">
                              {getImplicitStandardFeaturesLabel(t)}
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
                        <div className="flex justify-end gap-2 border-t border-slate-200/70 pt-4 dark:border-slate-800/70">
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
          <Dialog.Content className={ADMIN_FORM_DIALOG_CLASS} maxWidth={720}>
            <Dialog.Title>{t("admin.users.access_title", "Edit user access")}</Dialog.Title>
            {policyUser ? (
              <div className={`${ADMIN_FORM_SCROLL_CLASS} mt-4 space-y-4`}>
                <div className="rounded-lg border border-dashed border-slate-300 bg-muted/20 px-4 py-3 text-sm dark:border-slate-700">
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {policyUser.username}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {policyUser.uuid}
                  </div>
                </div>
                <PlanPresetSelector
                  availableFeatures={availableFeatures}
                  onApply={(planName, serverQuota, allowedFeatures) =>
                    setPolicyForm((current) => ({
                      ...current,
                      planName,
                      serverQuota,
                      allowedFeatures,
                    }))
                  }
                  t={t}
                />
                <div className={ADMIN_FORM_GRID_2_CLASS}>
                  <label className={ADMIN_FORM_FIELD_CLASS}>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {t("admin.users.plan_name", "Plan")}
                    </div>
                    <Input
                      value={policyForm.planName}
                      onChange={(event) =>
                        setPolicyForm((current) => ({
                          ...current,
                          planName: event.target.value,
                        }))
                      }
                      placeholder={t("admin.users.plan_name_placeholder", "Business")}
                      maxLength={64}
                    />
                  </label>
                  <label className={ADMIN_FORM_FIELD_CLASS}>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {t("admin.users.plan_expires_at", "Expires")}
                    </div>
                    <Input
                      type="date"
                      value={policyForm.planExpiresAt}
                      onChange={(event) =>
                        setPolicyForm((current) => ({
                          ...current,
                          planExpiresAt: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <label className={ADMIN_FORM_FIELD_CLASS}>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {t("admin.users.plan_note", "Internal note")}
                  </div>
                  <Textarea
                    value={policyForm.planNote}
                    onChange={(event) =>
                      setPolicyForm((current) => ({
                        ...current,
                        planNote: event.target.value,
                      }))
                    }
                    placeholder={t("admin.users.plan_note_placeholder", "Renewal note, source, or billing remark")}
                    maxLength={512}
                  />
                </label>
                <label className={ADMIN_FORM_TOGGLE_CLASS}>
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {t("admin.users.account_disabled", "Disable account")}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t("admin.users.account_disabled_hint", "Disabled or expired users cannot log in or use admin APIs.")}
                    </div>
                  </div>
                  <Switch
                    checked={policyForm.accountDisabled}
                    onCheckedChange={(checked) =>
                      setPolicyForm((current) => ({
                        ...current,
                        accountDisabled: checked,
                      }))
                    }
                  />
                </label>
                <label className={ADMIN_FORM_FIELD_CLASS}>
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
                <FeatureAccessEditor
                  availableFeatures={availableFeatures}
                  selectedFeatures={policyForm.allowedFeatures}
                  onChange={(allowedFeatures) =>
                    setPolicyForm((current) => ({ ...current, allowedFeatures }))
                  }
                  t={t}
                />
                <div className="flex justify-end gap-2 border-t border-slate-200/70 pt-4 dark:border-slate-800/70">
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

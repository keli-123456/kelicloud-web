import * as React from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Archive,
  CheckCircle2,
  CreditCard,
  PackagePlus,
  Pencil,
  Plus,
  QrCode,
  ReceiptText,
  RefreshCw,
  XCircle,
} from "lucide-react";

import {
  AdminEmptyState,
  AdminPageShell,
  AdminSurface,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
import {
  ADMIN_FORM_DIALOG_CLASS,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_GRID_2_CLASS,
  ADMIN_FORM_SCROLL_CLASS,
  ADMIN_FORM_SECTION_CLASS,
  ADMIN_FORM_SELECT_TRIGGER_CLASS,
  ADMIN_FORM_TOGGLE_CLASS,
} from "@/components/admin/AdminFormStyles";
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  Select,
  Switch,
  Tabs,
  TextArea,
  TextField,
} from "@/components/admin/admin-ui";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AccountFeature } from "@/contexts/AccountContext";
import { useAccount } from "@/contexts/AccountContext";
import { cn } from "@/lib/utils";

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

type BillingPlan = {
  id: number;
  code: string;
  name: string;
  description?: string;
  price_cents: number;
  currency: string;
  duration_days: number;
  server_quota: number;
  allowed_features?: AccountFeature[];
  sort_order: number;
  active: boolean;
  public: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type PaymentMethod = {
  id: number;
  code: string;
  name: string;
  type: string;
  instructions?: string;
  payment_url?: string;
  qr_image_url?: string;
  enabled: boolean;
  sort_order: number;
};

type BillingOrderStatus = "pending" | "paid" | "fulfilled" | "cancelled" | string;

type BillingOrder = {
  id: number;
  order_no: string;
  user_uuid: string;
  username?: string;
  plan_id: number;
  payment_method_id: number;
  status: BillingOrderStatus;
  plan_code: string;
  plan_name: string;
  amount_cents: number;
  currency: string;
  duration_days: number;
  server_quota: number;
  allowed_features?: AccountFeature[];
  payment_code?: string;
  payment_name?: string;
  payment_reference?: string;
  admin_note?: string;
  paid_at?: string | null;
  fulfilled_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type UserPolicy = {
  server_quota?: number;
  allowed_features?: AccountFeature[];
  plan_name?: string;
  plan_expires_at?: string;
  plan_note?: string;
  account_disabled?: boolean;
  access_status?: string;
};

type BillingCatalog = {
  plans?: BillingPlan[];
  payment_methods?: PaymentMethod[];
  policy?: UserPolicy;
  available_features?: AccountFeature[];
};

type ListResponse<T> = {
  items?: T[];
  available_features?: AccountFeature[];
};

type PlanFormState = {
  id?: number;
  code: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  durationDays: string;
  serverQuota: string;
  allowedFeatures: AccountFeature[];
  sortOrder: string;
  active: boolean;
  public: boolean;
};

type PaymentFormState = {
  id?: number;
  code: string;
  name: string;
  type: string;
  instructions: string;
  paymentURL: string;
  qrImageURL: string;
  sortOrder: string;
  enabled: boolean;
};

const FEATURE_ORDER: AccountFeature[] = [
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
  "cn_connectivity",
];

const FEATURE_META: Record<
  AccountFeature,
  { key: string; defaultValue: string }
> = {
  clients: { key: "billing.features.clients", defaultValue: "服务器" },
  records: { key: "billing.features.records", defaultValue: "监控记录" },
  tasks: { key: "billing.features.tasks", defaultValue: "执行任务" },
  ping: { key: "billing.features.ping", defaultValue: "延迟检测" },
  notifications: { key: "billing.features.notifications", defaultValue: "通知" },
  cloud: { key: "billing.features.cloud", defaultValue: "云资源" },
  cloud_digitalocean: { key: "billing.features.cloud_digitalocean", defaultValue: "DO" },
  cloud_linode: { key: "billing.features.cloud_linode", defaultValue: "Linode" },
  cloud_vultr: { key: "billing.features.cloud_vultr", defaultValue: "Vultr" },
  cloud_azure: { key: "billing.features.cloud_azure", defaultValue: "Azure" },
  cloud_aws: { key: "billing.features.cloud_aws", defaultValue: "AWS" },
  cloud_dns: { key: "billing.features.cloud_dns", defaultValue: "DNS" },
  cloud_failover: { key: "billing.features.cloud_failover", defaultValue: "故障切换" },
  clipboard: { key: "billing.features.clipboard", defaultValue: "脚本库" },
  logs: { key: "billing.features.logs", defaultValue: "日志" },
  cn_connectivity: { key: "billing.features.cn_connectivity", defaultValue: "国内连通性" },
};

const emptyPlanForm: PlanFormState = {
  code: "",
  name: "",
  description: "",
  price: "0",
  currency: "CNY",
  durationDays: "30",
  serverQuota: "0",
  allowedFeatures: ["clients", "records", "logs"],
  sortOrder: "10",
  active: true,
  public: true,
};

const emptyPaymentForm: PaymentFormState = {
  code: "",
  name: "",
  type: "manual",
  instructions: "",
  paymentURL: "",
  qrImageURL: "",
  sortOrder: "10",
  enabled: true,
};

const billingRequest = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok) {
    throw new Error(payload.message || `HTTP ${response.status}`);
  }
  return (payload.data ?? payload) as T;
};

const formatMoney = (cents = 0, currency = "CNY") => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "CNY",
      maximumFractionDigits: 2,
    }).format(Number(cents || 0) / 100);
  } catch {
    return `${currency || "CNY"} ${(Number(cents || 0) / 100).toFixed(2)}`;
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const formatDays = (days?: number) => {
  const value = Number(days || 0);
  return value > 0 ? `${value}d` : "∞";
};

const normalizeFeatureList = (
  features?: AccountFeature[] | null,
  availableFeatures?: AccountFeature[],
) => {
  const available = new Set(availableFeatures?.length ? availableFeatures : FEATURE_ORDER);
  return Array.from(
    new Set(
      (features || []).filter((feature): feature is AccountFeature =>
        available.has(feature as AccountFeature),
      ),
    ),
  );
};

const planToForm = (plan?: BillingPlan): PlanFormState => {
  if (!plan) return { ...emptyPlanForm, allowedFeatures: [...emptyPlanForm.allowedFeatures] };
  return {
    id: plan.id,
    code: plan.code || "",
    name: plan.name || "",
    description: plan.description || "",
    price: (Number(plan.price_cents || 0) / 100).toString(),
    currency: plan.currency || "CNY",
    durationDays: String(plan.duration_days ?? 30),
    serverQuota: String(plan.server_quota ?? 0),
    allowedFeatures: [...(plan.allowed_features || [])],
    sortOrder: String(plan.sort_order ?? 0),
    active: Boolean(plan.active),
    public: Boolean(plan.public),
  };
};

const paymentToForm = (method?: PaymentMethod): PaymentFormState => {
  if (!method) {
    return { ...emptyPaymentForm };
  }
  return {
    id: method.id,
    code: method.code || "",
    name: method.name || "",
    type: method.type || "manual",
    instructions: method.instructions || "",
    paymentURL: method.payment_url || "",
    qrImageURL: method.qr_image_url || "",
    sortOrder: String(method.sort_order ?? 0),
    enabled: Boolean(method.enabled),
  };
};

const statusTone = (status: BillingOrderStatus) => {
  if (status === "fulfilled") return "green";
  if (status === "paid") return "blue";
  if (status === "cancelled") return "red";
  return "amber";
};

export default function BillingPage() {
  const [t] = useTranslation();
  const { platformAdmin } = useAccount();
  const [activeTab, setActiveTab] = React.useState(platformAdmin ? "shop" : "shop");
  const [catalog, setCatalog] = React.useState<BillingCatalog>({});
  const [plans, setPlans] = React.useState<BillingPlan[]>([]);
  const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethod[]>([]);
  const [orders, setOrders] = React.useState<BillingOrder[]>([]);
  const [myOrders, setMyOrders] = React.useState<BillingOrder[]>([]);
  const [availableFeatures, setAvailableFeatures] = React.useState<AccountFeature[]>(FEATURE_ORDER);
  const [loadingCatalog, setLoadingCatalog] = React.useState(true);
  const [loadingAdmin, setLoadingAdmin] = React.useState(platformAdmin);
  const [selectedPlanID, setSelectedPlanID] = React.useState("");
  const [selectedPaymentID, setSelectedPaymentID] = React.useState("");
  const [planDialogOpen, setPlanDialogOpen] = React.useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [planForm, setPlanForm] = React.useState<PlanFormState>(() => planToForm());
  const [paymentForm, setPaymentForm] = React.useState<PaymentFormState>(() => paymentToForm());
  const [paidOrder, setPaidOrder] = React.useState<BillingOrder | null>(null);
  const [paymentReference, setPaymentReference] = React.useState("");
  const [adminNote, setAdminNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const featureOptions = React.useMemo(() => {
    const source = availableFeatures.length ? availableFeatures : FEATURE_ORDER;
    const ordered = [
      ...FEATURE_ORDER.filter((feature) => source.includes(feature)),
      ...source.filter((feature) => !FEATURE_ORDER.includes(feature)),
    ];
    return ordered.map((feature) => ({
      value: feature,
      label: t(FEATURE_META[feature]?.key || `billing.features.${feature}`, {
        defaultValue: FEATURE_META[feature]?.defaultValue || feature,
      }),
    }));
  }, [availableFeatures, t]);

  const loadCatalog = React.useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const [catalogData, myOrderData] = await Promise.all([
        billingRequest<BillingCatalog>("/api/admin/billing/catalog"),
        billingRequest<ListResponse<BillingOrder>>("/api/admin/billing/my-orders"),
      ]);
      setCatalog(catalogData);
      setMyOrders(myOrderData.items || []);
      setAvailableFeatures(catalogData.available_features?.length ? catalogData.available_features : FEATURE_ORDER);
      if (!selectedPlanID && catalogData.plans?.[0]?.id) {
        setSelectedPlanID(String(catalogData.plans[0].id));
      }
      if (!selectedPaymentID && catalogData.payment_methods?.[0]?.id) {
        setSelectedPaymentID(String(catalogData.payment_methods[0].id));
      }
    } catch (error) {
      toast.error(`${t("billing.load_failed")}: ${error}`);
    } finally {
      setLoadingCatalog(false);
    }
  }, [selectedPaymentID, selectedPlanID, t]);

  const loadAdminData = React.useCallback(async () => {
    if (!platformAdmin) {
      setLoadingAdmin(false);
      return;
    }
    setLoadingAdmin(true);
    try {
      const [plansData, methodsData, ordersData] = await Promise.all([
        billingRequest<ListResponse<BillingPlan>>("/api/admin/billing/plans"),
        billingRequest<ListResponse<PaymentMethod>>("/api/admin/billing/payment-methods"),
        billingRequest<ListResponse<BillingOrder>>("/api/admin/billing/orders"),
      ]);
      setPlans(plansData.items || []);
      setPaymentMethods(methodsData.items || []);
      setOrders(ordersData.items || []);
      if (plansData.available_features?.length) {
        setAvailableFeatures(plansData.available_features);
      }
    } catch (error) {
      toast.error(`${t("billing.load_failed")}: ${error}`);
    } finally {
      setLoadingAdmin(false);
    }
  }, [platformAdmin, t]);

  const refreshAll = React.useCallback(async () => {
    await Promise.all([loadCatalog(), loadAdminData()]);
  }, [loadAdminData, loadCatalog]);

  React.useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const catalogPlans = catalog.plans || [];
  const catalogMethods = catalog.payment_methods || [];
  const selectedPlan = catalogPlans.find((plan) => String(plan.id) === selectedPlanID) || null;
  const selectedPayment = catalogMethods.find((method) => String(method.id) === selectedPaymentID) || null;

  const savePlan = async () => {
    setSubmitting(true);
    try {
      const payload = {
        id: planForm.id || 0,
        code: planForm.code,
        name: planForm.name,
        description: planForm.description,
        price_cents: Math.round(Number(planForm.price || 0) * 100),
        currency: planForm.currency,
        duration_days: Number(planForm.durationDays || 0),
        server_quota: Number(planForm.serverQuota || 0),
        allowed_features: normalizeFeatureList(planForm.allowedFeatures, availableFeatures),
        sort_order: Number(planForm.sortOrder || 0),
        active: planForm.active,
        public: planForm.public,
      };
      await billingRequest<BillingPlan>("/api/admin/billing/plans", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success(t("billing.plan_saved"));
      setPlanDialogOpen(false);
      await refreshAll();
    } catch (error) {
      toast.error(`${t("billing.save_failed")}: ${error}`);
    } finally {
      setSubmitting(false);
    }
  };

  const archivePlan = async (plan: BillingPlan) => {
    setSubmitting(true);
    try {
      await billingRequest(`/api/admin/billing/plans/${plan.id}/archive`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast.success(t("billing.plan_archived"));
      await refreshAll();
    } catch (error) {
      toast.error(`${t("billing.save_failed")}: ${error}`);
    } finally {
      setSubmitting(false);
    }
  };

  const savePaymentMethod = async () => {
    setSubmitting(true);
    try {
      await billingRequest<PaymentMethod>("/api/admin/billing/payment-methods", {
        method: "POST",
        body: JSON.stringify({
          id: paymentForm.id || 0,
          code: paymentForm.code,
          name: paymentForm.name,
          type: paymentForm.type,
          instructions: paymentForm.instructions,
          payment_url: paymentForm.paymentURL,
          qr_image_url: paymentForm.qrImageURL,
          sort_order: Number(paymentForm.sortOrder || 0),
          enabled: paymentForm.enabled,
        }),
      });
      toast.success(t("billing.payment_saved"));
      setPaymentDialogOpen(false);
      await refreshAll();
    } catch (error) {
      toast.error(`${t("billing.save_failed")}: ${error}`);
    } finally {
      setSubmitting(false);
    }
  };

  const disablePaymentMethod = async (method: PaymentMethod) => {
    setSubmitting(true);
    try {
      await billingRequest(`/api/admin/billing/payment-methods/${method.id}/disable`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast.success(t("billing.payment_disabled"));
      await refreshAll();
    } catch (error) {
      toast.error(`${t("billing.save_failed")}: ${error}`);
    } finally {
      setSubmitting(false);
    }
  };

  const createOrder = async () => {
    if (!selectedPlan || !selectedPayment) {
      toast.error(t("billing.select_plan_and_payment"));
      return;
    }
    setSubmitting(true);
    try {
      await billingRequest<BillingOrder>("/api/admin/billing/orders", {
        method: "POST",
        body: JSON.stringify({
          plan_id: selectedPlan.id,
          payment_method_id: selectedPayment.id,
        }),
      });
      toast.success(t("billing.order_created"));
      await refreshAll();
      setActiveTab("orders");
    } catch (error) {
      toast.error(`${t("billing.order_failed")}: ${error}`);
    } finally {
      setSubmitting(false);
    }
  };

  const markPaid = async () => {
    if (!paidOrder) return;
    setSubmitting(true);
    try {
      await billingRequest(`/api/admin/billing/orders/${paidOrder.id}/paid`, {
        method: "POST",
        body: JSON.stringify({
          payment_reference: paymentReference,
          admin_note: adminNote,
        }),
      });
      toast.success(t("billing.order_fulfilled"));
      setPaidOrder(null);
      setPaymentReference("");
      setAdminNote("");
      await refreshAll();
    } catch (error) {
      toast.error(`${t("billing.save_failed")}: ${error}`);
    } finally {
      setSubmitting(false);
    }
  };

  const cancelOrder = async (order: BillingOrder) => {
    setSubmitting(true);
    try {
      await billingRequest(`/api/admin/billing/orders/${order.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ admin_note: t("billing.cancelled_by_admin") }),
      });
      toast.success(t("billing.order_cancelled"));
      await refreshAll();
    } catch (error) {
      toast.error(`${t("billing.save_failed")}: ${error}`);
    } finally {
      setSubmitting(false);
    }
  };

  const openPlanDialog = (plan?: BillingPlan) => {
    setPlanForm(planToForm(plan));
    setPlanDialogOpen(true);
  };

  const openPaymentDialog = (method?: PaymentMethod) => {
    setPaymentForm(paymentToForm(method));
    setPaymentDialogOpen(true);
  };

  return (
    <AdminPageShell
      title={t("billing.title")}
      actions={
        <Button variant="outline" size="sm" onClick={refreshAll} disabled={loadingCatalog || loadingAdmin}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("common.refresh")}
        </Button>
      }
    >
      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <Tabs.List>
          <Tabs.Trigger value="shop">{t("billing.tabs.shop")}</Tabs.Trigger>
          <Tabs.Trigger value="orders">{t("billing.tabs.my_orders")}</Tabs.Trigger>
          {platformAdmin ? <Tabs.Trigger value="plans">{t("billing.tabs.plans")}</Tabs.Trigger> : null}
          {platformAdmin ? <Tabs.Trigger value="payments">{t("billing.tabs.payments")}</Tabs.Trigger> : null}
          {platformAdmin ? <Tabs.Trigger value="admin_orders">{t("billing.tabs.orders")}</Tabs.Trigger> : null}
        </Tabs.List>

        <Tabs.Content value="shop">
          <ShopPanel
            t={t}
            plans={catalogPlans}
            methods={catalogMethods}
            loading={loadingCatalog}
            selectedPlanID={selectedPlanID}
            selectedPaymentID={selectedPaymentID}
            selectedPayment={selectedPayment}
            submitting={submitting}
            setSelectedPlanID={setSelectedPlanID}
            setSelectedPaymentID={setSelectedPaymentID}
            createOrder={createOrder}
            featureOptions={featureOptions}
          />
        </Tabs.Content>

        <Tabs.Content value="orders">
          <OrdersTable
            t={t}
            orders={myOrders}
            loading={loadingCatalog}
            emptyTitle={t("billing.no_my_orders")}
          />
        </Tabs.Content>

        {platformAdmin ? (
          <Tabs.Content value="plans">
            <PlansPanel
              t={t}
              plans={plans}
              loading={loadingAdmin}
              submitting={submitting}
              openPlanDialog={openPlanDialog}
              archivePlan={archivePlan}
              featureOptions={featureOptions}
            />
          </Tabs.Content>
        ) : null}

        {platformAdmin ? (
          <Tabs.Content value="payments">
            <PaymentsPanel
              t={t}
              methods={paymentMethods}
              loading={loadingAdmin}
              submitting={submitting}
              openPaymentDialog={openPaymentDialog}
              disablePaymentMethod={disablePaymentMethod}
            />
          </Tabs.Content>
        ) : null}

        {platformAdmin ? (
          <Tabs.Content value="admin_orders">
            <OrdersTable
              t={t}
              orders={orders}
              loading={loadingAdmin}
              emptyTitle={t("billing.no_orders")}
              admin
              submitting={submitting}
              onMarkPaid={(order) => {
                setPaidOrder(order);
                setPaymentReference(order.payment_reference || "");
                setAdminNote(order.admin_note || "");
              }}
              onCancel={cancelOrder}
            />
          </Tabs.Content>
        ) : null}
      </Tabs.Root>

      <PlanDialog
        t={t}
        open={planDialogOpen}
        submitting={submitting}
        form={planForm}
        setForm={setPlanForm}
        onOpenChange={setPlanDialogOpen}
        onSave={savePlan}
        featureOptions={featureOptions}
      />

      <PaymentDialog
        t={t}
        open={paymentDialogOpen}
        submitting={submitting}
        form={paymentForm}
        setForm={setPaymentForm}
        onOpenChange={setPaymentDialogOpen}
        onSave={savePaymentMethod}
      />

      <Dialog.Root open={Boolean(paidOrder)} onOpenChange={(open) => !open && setPaidOrder(null)}>
        <Dialog.Content className={ADMIN_FORM_DIALOG_CLASS} maxWidth="36rem">
          <Dialog.Title className="text-lg font-semibold">
            {t("billing.mark_paid_title")}
          </Dialog.Title>
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/40">
              <div className="font-medium">{paidOrder?.order_no}</div>
              <div className="text-muted-foreground">
                {paidOrder?.username || paidOrder?.user_uuid} · {paidOrder?.plan_name}
              </div>
            </div>
            <Field label={t("billing.payment_reference")}>
              <Input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} />
            </Field>
            <Field label={t("billing.admin_note")}>
              <TextArea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} rows={4} />
            </Field>
            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              <Button variant="outline" onClick={() => setPaidOrder(null)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={markPaid} disabled={submitting}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t("billing.mark_paid")}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </AdminPageShell>
  );
}

function ShopPanel({
  t,
  plans,
  methods,
  loading,
  selectedPlanID,
  selectedPaymentID,
  selectedPayment,
  submitting,
  setSelectedPlanID,
  setSelectedPaymentID,
  createOrder,
  featureOptions,
}: {
  t: TFunction;
  plans: BillingPlan[];
  methods: PaymentMethod[];
  loading: boolean;
  selectedPlanID: string;
  selectedPaymentID: string;
  selectedPayment: PaymentMethod | null;
  submitting: boolean;
  setSelectedPlanID: (value: string) => void;
  setSelectedPaymentID: (value: string) => void;
  createOrder: () => void;
  featureOptions: Array<{ value: AccountFeature; label: string }>;
}) {
  if (loading && plans.length === 0) {
    return <AdminTableSkeleton columns={4} rows={4} />;
  }

  if (plans.length === 0) {
    return (
      <AdminEmptyState
        icon={<PackagePlus className="h-5 w-5" />}
        title={t("billing.no_public_plans")}
        description={t("billing.no_public_plans_desc")}
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid gap-3 lg:grid-cols-3">
        {plans.map((plan) => {
          const selected = String(plan.id) === selectedPlanID;
          return (
            <button
              type="button"
              key={plan.id}
              className={cn(
                "flex min-h-52 flex-col rounded-lg border bg-white p-4 text-left shadow-none transition-colors dark:bg-slate-950",
                selected
                  ? "border-blue-500 ring-2 ring-blue-500/15 dark:border-blue-400"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700",
              )}
              onClick={() => setSelectedPlanID(String(plan.id))}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-foreground">
                    {plan.name}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {plan.description || t("billing.no_description")}
                  </div>
                </div>
                {selected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600" /> : null}
              </div>
              <div className="mt-4 text-2xl font-semibold tracking-normal">
                {formatMoney(plan.price_cents, plan.currency)}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {formatDays(plan.duration_days)} · {plan.server_quota > 0 ? t("billing.quota_count", { count: plan.server_quota }) : t("billing.unlimited_quota")}
              </div>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                {(plan.allowed_features || []).slice(0, 5).map((feature) => (
                  <Badge key={feature} color="gray" variant="soft">
                    {featureOptions.find((item) => item.value === feature)?.label || feature}
                  </Badge>
                ))}
                {(plan.allowed_features || []).length > 5 ? (
                  <Badge color="blue" variant="soft">+{(plan.allowed_features || []).length - 5}</Badge>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <AdminSurface className="rounded-lg border border-slate-200 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-2 text-base font-semibold">
          <CreditCard className="h-4 w-4" />
          {t("billing.checkout")}
        </div>
        <div className="mt-4 space-y-4">
          <Field label={t("billing.payment_method")}>
            <Select.Root value={selectedPaymentID} onValueChange={setSelectedPaymentID}>
              <Select.Trigger className={ADMIN_FORM_SELECT_TRIGGER_CLASS} placeholder={t("billing.select_payment")} />
              <Select.Content>
                {methods.map((method) => (
                  <Select.Item key={method.id} value={String(method.id)}>
                    {method.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Field>
          {selectedPayment ? (
            <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/40">
              <div className="font-medium">{selectedPayment.name}</div>
              {selectedPayment.instructions ? (
                <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                  {selectedPayment.instructions}
                </p>
              ) : null}
              {selectedPayment.payment_url ? (
                <a
                  className="mt-3 inline-flex text-blue-600 hover:underline dark:text-blue-400"
                  href={selectedPayment.payment_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("billing.open_payment_link")}
                </a>
              ) : null}
              {selectedPayment.qr_image_url ? (
                <div className="mt-3 flex items-center gap-3">
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                  <a
                    className="text-blue-600 hover:underline dark:text-blue-400"
                    href={selectedPayment.qr_image_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("billing.open_qr")}
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}
          <Button className="w-full" onClick={createOrder} disabled={submitting || methods.length === 0}>
            <ReceiptText className="mr-2 h-4 w-4" />
            {t("billing.create_order")}
          </Button>
        </div>
      </AdminSurface>
    </div>
  );
}

function PlansPanel({
  t,
  plans,
  loading,
  submitting,
  openPlanDialog,
  archivePlan,
  featureOptions,
}: {
  t: TFunction;
  plans: BillingPlan[];
  loading: boolean;
  submitting: boolean;
  openPlanDialog: (plan?: BillingPlan) => void;
  archivePlan: (plan: BillingPlan) => void;
  featureOptions: Array<{ value: AccountFeature; label: string }>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => openPlanDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          {t("billing.new_plan")}
        </Button>
      </div>
      {loading && plans.length === 0 ? (
        <AdminTableSkeleton columns={7} rows={5} />
      ) : (
        <DataTable>
          <TableHeader>
            <TableRow>
              <TableHead>{t("billing.plan")}</TableHead>
              <TableHead>{t("billing.price")}</TableHead>
              <TableHead>{t("billing.duration")}</TableHead>
              <TableHead>{t("billing.server_quota")}</TableHead>
              <TableHead>{t("billing.features_label")}</TableHead>
              <TableHead>{t("billing.status")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>
                  <div className="font-medium">{plan.name}</div>
                  <div className="text-xs text-muted-foreground">{plan.code}</div>
                </TableCell>
                <TableCell>{formatMoney(plan.price_cents, plan.currency)}</TableCell>
                <TableCell>{formatDays(plan.duration_days)}</TableCell>
                <TableCell>{plan.server_quota > 0 ? plan.server_quota : t("billing.unlimited")}</TableCell>
                <TableCell>
                  <div className="flex max-w-md flex-wrap gap-1">
                    {(plan.allowed_features || []).slice(0, 4).map((feature) => (
                      <Badge key={feature} color="gray" variant="soft">
                        {featureOptions.find((item) => item.value === feature)?.label || feature}
                      </Badge>
                    ))}
                    {(plan.allowed_features || []).length > 4 ? (
                      <Badge color="blue" variant="soft">+{(plan.allowed_features || []).length - 4}</Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Badge color={plan.active ? "green" : "red"} variant="soft">
                      {plan.active ? t("billing.active") : t("billing.inactive")}
                    </Badge>
                    <Badge color={plan.public ? "blue" : "gray"} variant="soft">
                      {plan.public ? t("billing.public") : t("billing.private")}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => openPlanDialog(plan)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      {t("common.edit")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => archivePlan(plan)} disabled={submitting}>
                      <Archive className="mr-2 h-4 w-4" />
                      {t("billing.archive")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}
    </div>
  );
}

function PaymentsPanel({
  t,
  methods,
  loading,
  submitting,
  openPaymentDialog,
  disablePaymentMethod,
}: {
  t: TFunction;
  methods: PaymentMethod[];
  loading: boolean;
  submitting: boolean;
  openPaymentDialog: (method?: PaymentMethod) => void;
  disablePaymentMethod: (method: PaymentMethod) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => openPaymentDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          {t("billing.new_payment")}
        </Button>
      </div>
      {loading && methods.length === 0 ? (
        <AdminTableSkeleton columns={6} rows={5} />
      ) : (
        <DataTable>
          <TableHeader>
            <TableRow>
              <TableHead>{t("billing.payment_method")}</TableHead>
              <TableHead>{t("billing.type")}</TableHead>
              <TableHead>{t("billing.instructions")}</TableHead>
              <TableHead>{t("billing.status")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {methods.map((method) => (
              <TableRow key={method.id}>
                <TableCell>
                  <div className="font-medium">{method.name}</div>
                  <div className="text-xs text-muted-foreground">{method.code}</div>
                </TableCell>
                <TableCell>{method.type}</TableCell>
                <TableCell>
                  <div className="max-w-xl truncate text-sm text-muted-foreground">
                    {method.instructions || method.payment_url || method.qr_image_url || "-"}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge color={method.enabled ? "green" : "red"} variant="soft">
                    {method.enabled ? t("billing.enabled") : t("billing.disabled")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => openPaymentDialog(method)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      {t("common.edit")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => disablePaymentMethod(method)} disabled={submitting}>
                      <XCircle className="mr-2 h-4 w-4" />
                      {t("billing.disable")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}
    </div>
  );
}

function OrdersTable({
  t,
  orders,
  loading,
  emptyTitle,
  admin,
  submitting,
  onMarkPaid,
  onCancel,
}: {
  t: TFunction;
  orders: BillingOrder[];
  loading: boolean;
  emptyTitle: string;
  admin?: boolean;
  submitting?: boolean;
  onMarkPaid?: (order: BillingOrder) => void;
  onCancel?: (order: BillingOrder) => void;
}) {
  if (loading && orders.length === 0) {
    return <AdminTableSkeleton columns={admin ? 8 : 6} rows={6} />;
  }
  if (orders.length === 0) {
    return <AdminEmptyState icon={<ReceiptText className="h-5 w-5" />} title={emptyTitle} />;
  }
  return (
    <DataTable>
      <TableHeader>
        <TableRow>
          <TableHead>{t("billing.order_no")}</TableHead>
          {admin ? <TableHead>{t("billing.user")}</TableHead> : null}
          <TableHead>{t("billing.plan")}</TableHead>
          <TableHead>{t("billing.amount")}</TableHead>
          <TableHead>{t("billing.payment_method")}</TableHead>
          <TableHead>{t("billing.status")}</TableHead>
          <TableHead>{t("billing.created_at")}</TableHead>
          {admin ? <TableHead className="text-right">{t("common.actions")}</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell>
              <div className="font-mono text-xs">{order.order_no}</div>
              {order.payment_reference ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  {order.payment_reference}
                </div>
              ) : null}
            </TableCell>
            {admin ? (
              <TableCell>
                <div className="font-medium">{order.username || "-"}</div>
                <div className="text-xs text-muted-foreground">{order.user_uuid}</div>
              </TableCell>
            ) : null}
            <TableCell>
              <div className="font-medium">{order.plan_name}</div>
              <div className="text-xs text-muted-foreground">{formatDays(order.duration_days)}</div>
            </TableCell>
            <TableCell>{formatMoney(order.amount_cents, order.currency)}</TableCell>
            <TableCell>{order.payment_name || order.payment_code || "-"}</TableCell>
            <TableCell>
              <Badge color={statusTone(order.status)} variant="soft">
                {t(`billing.status_${order.status}`, { defaultValue: order.status })}
              </Badge>
            </TableCell>
            <TableCell>{formatDateTime(order.created_at)}</TableCell>
            {admin ? (
              <TableCell>
                <div className="flex justify-end gap-2">
                  {order.status === "pending" || order.status === "paid" ? (
                    <Button variant="outline" size="sm" onClick={() => onMarkPaid?.(order)} disabled={submitting}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {t("billing.mark_paid")}
                    </Button>
                  ) : null}
                  {order.status === "pending" ? (
                    <Button variant="outline" size="sm" onClick={() => onCancel?.(order)} disabled={submitting}>
                      <XCircle className="mr-2 h-4 w-4" />
                      {t("billing.cancel_order")}
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </DataTable>
  );
}

function PlanDialog({
  t,
  open,
  submitting,
  form,
  setForm,
  onOpenChange,
  onSave,
  featureOptions,
}: {
  t: TFunction;
  open: boolean;
  submitting: boolean;
  form: PlanFormState;
  setForm: React.Dispatch<React.SetStateAction<PlanFormState>>;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  featureOptions: Array<{ value: AccountFeature; label: string }>;
}) {
  const toggleFeature = (feature: AccountFeature, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      allowedFeatures: checked
        ? Array.from(new Set([...prev.allowedFeatures, feature]))
        : prev.allowedFeatures.filter((item) => item !== feature),
    }));
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className={ADMIN_FORM_DIALOG_CLASS} maxWidth="52rem">
        <Dialog.Title className="text-lg font-semibold">
          {form.id ? t("billing.edit_plan") : t("billing.new_plan")}
        </Dialog.Title>
        <div className={cn("space-y-5 pt-2", ADMIN_FORM_SCROLL_CLASS)}>
          <section className={ADMIN_FORM_SECTION_CLASS}>
            <div className={ADMIN_FORM_GRID_2_CLASS}>
              <Field label={t("billing.plan_code")} required>
                <TextField.Root value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} placeholder="business" />
              </Field>
              <Field label={t("billing.plan_name")} required>
                <TextField.Root value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Business" />
              </Field>
              <Field label={t("billing.price")}>
                <TextField.Root value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} type="number" min="0" step="0.01" />
              </Field>
              <Field label={t("billing.currency")}>
                <TextField.Root value={form.currency} onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))} placeholder="CNY" />
              </Field>
              <Field label={t("billing.duration_days")}>
                <TextField.Root value={form.durationDays} onChange={(event) => setForm((prev) => ({ ...prev, durationDays: event.target.value }))} type="number" min="0" />
              </Field>
              <Field label={t("billing.server_quota")}>
                <TextField.Root value={form.serverQuota} onChange={(event) => setForm((prev) => ({ ...prev, serverQuota: event.target.value }))} type="number" min="0" />
              </Field>
            </div>
            <Field className="mt-3" label={t("billing.description")}>
              <TextArea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} rows={3} />
            </Field>
          </section>

          <section className={ADMIN_FORM_SECTION_CLASS}>
            <div className="mb-3 text-sm font-medium">{t("billing.features_label")}</div>
            <div className="grid gap-2 md:grid-cols-2">
              {featureOptions.map((feature) => (
                <label key={feature.value} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                  <Checkbox
                    checked={form.allowedFeatures.includes(feature.value)}
                    onCheckedChange={(checked) => toggleFeature(feature.value, checked === true)}
                  />
                  <span>{feature.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className={ADMIN_FORM_SECTION_CLASS}>
            <div className={ADMIN_FORM_TOGGLE_CLASS}>
              <div>
                <div className="text-sm font-medium">{t("billing.active")}</div>
                <div className="text-sm text-muted-foreground">{t("billing.active_desc")}</div>
              </div>
              <Switch checked={form.active} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, active: checked }))} />
            </div>
            <div className={ADMIN_FORM_TOGGLE_CLASS}>
              <div>
                <div className="text-sm font-medium">{t("billing.public")}</div>
                <div className="text-sm text-muted-foreground">{t("billing.public_desc")}</div>
              </div>
              <Switch checked={form.public} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, public: checked }))} />
            </div>
            <Field className="mt-3" label={t("billing.sort_order")}>
              <TextField.Root value={form.sortOrder} onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))} type="number" />
            </Field>
          </section>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onSave} disabled={submitting}>
            {t("common.save")}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function PaymentDialog({
  t,
  open,
  submitting,
  form,
  setForm,
  onOpenChange,
  onSave,
}: {
  t: TFunction;
  open: boolean;
  submitting: boolean;
  form: PaymentFormState;
  setForm: React.Dispatch<React.SetStateAction<PaymentFormState>>;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className={ADMIN_FORM_DIALOG_CLASS} maxWidth="48rem">
        <Dialog.Title className="text-lg font-semibold">
          {form.id ? t("billing.edit_payment") : t("billing.new_payment")}
        </Dialog.Title>
        <div className={cn("space-y-5 pt-2", ADMIN_FORM_SCROLL_CLASS)}>
          <section className={ADMIN_FORM_SECTION_CLASS}>
            <div className={ADMIN_FORM_GRID_2_CLASS}>
              <Field label={t("billing.payment_code")} required>
                <TextField.Root value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} placeholder="manual" />
              </Field>
              <Field label={t("billing.payment_name")} required>
                <TextField.Root value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Manual payment" />
              </Field>
              <Field label={t("billing.type")}>
                <Select.Root value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value }))}>
                  <Select.Trigger className={ADMIN_FORM_SELECT_TRIGGER_CLASS} />
                  <Select.Content>
                    <Select.Item value="manual">{t("billing.payment_type_manual")}</Select.Item>
                    <Select.Item value="alipay">{t("billing.payment_type_alipay")}</Select.Item>
                    <Select.Item value="wechat">{t("billing.payment_type_wechat")}</Select.Item>
                    <Select.Item value="stripe">{t("billing.payment_type_stripe")}</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Field>
              <Field label={t("billing.sort_order")}>
                <TextField.Root value={form.sortOrder} onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))} type="number" />
              </Field>
              <Field label={t("billing.payment_url")}>
                <TextField.Root value={form.paymentURL} onChange={(event) => setForm((prev) => ({ ...prev, paymentURL: event.target.value }))} placeholder="https://" />
              </Field>
              <Field label={t("billing.qr_image_url")}>
                <TextField.Root value={form.qrImageURL} onChange={(event) => setForm((prev) => ({ ...prev, qrImageURL: event.target.value }))} placeholder="https://" />
              </Field>
            </div>
            <Field className="mt-3" label={t("billing.instructions")}>
              <TextArea value={form.instructions} onChange={(event) => setForm((prev) => ({ ...prev, instructions: event.target.value }))} rows={5} />
            </Field>
          </section>
          <section className={ADMIN_FORM_SECTION_CLASS}>
            <div className={ADMIN_FORM_TOGGLE_CLASS}>
              <div>
                <div className="text-sm font-medium">{t("billing.enabled")}</div>
                <div className="text-sm text-muted-foreground">{t("billing.payment_enabled_desc")}</div>
              </div>
              <Switch checked={form.enabled} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))} />
            </div>
          </section>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onSave} disabled={submitting}>
            {t("common.save")}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn(ADMIN_FORM_FIELD_CLASS, className)}>
      <span data-slot="label" className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-none dark:border-slate-800/90 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <Table>{children}</Table>
      </div>
    </div>
  );
}

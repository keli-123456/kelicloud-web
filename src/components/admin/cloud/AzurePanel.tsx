import React from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronDown,
  Eye,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

import {
  AdminDataTable,
  AdminDataTableCell,
  AdminDataTableHead,
  AdminDataTableHeadRow,
  AdminDataTableRow,
  AdminDataTableScroll,
} from "@/components/admin/AdminDataTable";
import {
  AdminPageShell,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
import {
  AdminPagination,
  useClientPagination,
} from "@/components/admin/AdminPagination";
import {
  AzureCredentialImportDialog,
  AzureCredentialGroupDialog,
  AzureCredentialSecretDialog,
  AzureSavedPasswordDialog,
} from "@/components/admin/cloud/AzureCredentialDialogs";
import { AzureCreateDialog } from "@/components/admin/cloud/AzureCreateDialog";
import { AzureInstanceDetailDialog } from "@/components/admin/cloud/AzureInstanceDetailDialog";
import { AzureInstancesSection } from "@/components/admin/cloud/AzureInstancesSection";
import { CloudOnboardingPanel } from "@/components/admin/cloud/CloudOnboardingPanel";
import CloudInstanceScriptDialog, { type CloudInstanceScriptTarget } from "@/components/admin/cloud/CloudInstanceScriptDialog";
import {
  Badge,
  Button,
  CloudProviderHeader,
  Select,
  TextField,
  cloudLongTextClassName,
  cloudPanelBodyTextClassName,
  cloudPanelCardClassName,
  cloudPanelDescriptionClassName,
  cloudPanelFieldLabelClassName,
  cloudPanelHeaderClassName,
  cloudPanelTitleClassName,
} from "@/components/admin/cloud/cloud-ui";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import { WarningAlert } from "@/components/ui/warning-alert";
import { useWarningDialog } from "@/components/ui/warning-dialog";
import {
  azureImagePresets,
  buildScriptTarget,
  buildCreateFormFromPreset,
  formatAzureLocationOption,
  formatAzureSizeOption,
  getActiveCredential,
  getDefaultAzureSize,
  getLocationLabel,
  toErrorMessage,
  type AzureCreateFormState,
} from "./azurePanelUtils";
import { buildStaticAzureCatalog } from "./cloudStaticCatalogs";
import {
  saveAzureCredentials,
  type AzureAccount,
  type AzureCatalog,
  type AzureCredentialPool,
  type AzureCredentialRecord,
} from "@/lib/cloudAzure";
import { getCloudStatusLabel } from "@/lib/cloudStatus";
import { useAzureCreateInstance } from "./useAzureCreateInstance";
import { useAzureCredentialActivation } from "./useAzureCredentialActivation";
import { useAzureCredentialDeletion } from "./useAzureCredentialDeletion";
import { useAzureCredentialHealth } from "./useAzureCredentialHealth";
import { useAzureCredentialImport } from "./useAzureCredentialImport";
import { useAzureCredentialSecret } from "./useAzureCredentialSecret";
import { useAzureInstanceActions } from "./useAzureInstanceActions";
import { useAzureInstancePasswords } from "./useAzureInstancePasswords";
import { useAzureLocationSelection } from "./useAzureLocationSelection";
import { useAzurePanelResources } from "./useAzurePanelResources";

export default function AzurePanel() {
  const { t } = useTranslation();
  const { confirm, dialog: warningDialog } = useWarningDialog();

  const {
    loading,
    resourceLoading,
    loadError,
    credentialPool,
    setCredentialPool,
    account,
    setAccount,
    catalog,
    setCatalog,
    instances,
    loadResources,
    loadAll,
    clearResourceData,
  } = useAzurePanelResources();
  const [scriptTarget, setScriptTarget] = React.useState<CloudInstanceScriptTarget | null>(null);
  const [credentialGroupEditorCredential, setCredentialGroupEditorCredential] = React.useState<AzureCredentialRecord | null>(null);
  const [credentialGroupEditorValue, setCredentialGroupEditorValue] = React.useState("");
  const [credentialGroupSaving, setCredentialGroupSaving] = React.useState(false);
  const passwordStorageEnabled = Boolean(credentialPool?.password_storage_enabled);

  const activeCredential = React.useMemo(
    () => getActiveCredential(credentialPool),
    [credentialPool],
  );
  const credentialCount = credentialPool?.credentials.length || 0;
  const showOnboardingPanel = credentialCount === 0;
  const effectiveCatalog = React.useMemo(() => {
    const activeLocation =
      account?.active_location
      || credentialPool?.active_location
      || activeCredential?.default_location
      || catalog?.active_location
      || "";
    if (catalog?.locations.length && catalog?.sizes.length) {
      return {
        ...catalog,
        active_location: activeLocation || catalog.active_location,
      };
    }
    return buildStaticAzureCatalog(activeLocation);
  }, [
    account?.active_location,
    activeCredential?.default_location,
    catalog,
    credentialPool?.active_location,
  ]);

  React.useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleCopy = React.useCallback(async (text: string, successMessage: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  }, []);

  const {
    credentialImportOpen,
    setCredentialImportOpen,
    credentialImportText,
    setCredentialImportText,
    credentialImportGroup,
    setCredentialImportGroup,
    savingCredentials,
    handleImportCredentials,
  } = useAzureCredentialImport({
    t,
    setCredentialPool,
    loadAll,
    clearResourceData,
  });
  const {
    checkingCredentialsState,
    handleCheckCredentials,
  } = useAzureCredentialHealth({
    t,
    setCredentialPool,
    loadResources,
  });
  const {
    handleSelectCredential,
  } = useAzureCredentialActivation({
    setCredentialPool,
    loadAll,
  });
  const {
    handleDeleteCredential,
  } = useAzureCredentialDeletion({
    t,
    confirm,
    setCredentialPool,
    loadAll,
    clearResourceData,
  });
  const {
    credentialSecret,
    setCredentialSecret,
    handleViewCredential,
  } = useAzureCredentialSecret();
  const {
    locationUpdating,
    handleSetLocation,
  } = useAzureLocationSelection({
    t,
    setCredentialPool,
    setCatalog,
    setAccount,
  });
  const {
    workingInstanceId,
    detailInstance,
    setDetailInstance,
    detailData,
    setDetailData,
    detailLoading,
    handleOpenDetail,
    handleInstanceAction,
    handleReplaceInstanceIP,
    handleDeleteInstance,
  } = useAzureInstanceActions({
    t,
    confirm,
    loadResources,
  });
  const {
    createOpen,
    setCreateOpen,
    createSubmitting,
    createForm,
    setCreateForm,
    handleCreateInstance,
  } = useAzureCreateInstance({
    t,
    catalog: effectiveCatalog,
    loadResources,
  });
  const {
    savedPassword,
    setSavedPassword,
    passwordLoading,
    handleViewPassword,
  } = useAzureInstancePasswords();

  const openCredentialGroupEditor = React.useCallback((credential: AzureCredentialRecord) => {
    setCredentialGroupEditorCredential(credential);
    setCredentialGroupEditorValue(credential.group || "");
  }, []);

  const handleSaveCredentialGroup = React.useCallback(async () => {
    if (!credentialGroupEditorCredential || !credentialPool) {
      return;
    }

    setCredentialGroupSaving(true);
    try {
      const nextPool = await saveAzureCredentials({
        credentials: [{
          id: credentialGroupEditorCredential.id,
          name: credentialGroupEditorCredential.name,
          group: credentialGroupEditorValue.trim(),
          tenant_id: "",
          client_id: "",
          client_secret: "",
          subscription_id: "",
          default_location: credentialGroupEditorCredential.default_location,
        }],
        active_credential_id: credentialPool.active_credential_id || undefined,
        active_location: credentialPool.active_location || undefined,
      });
      setCredentialPool(nextPool);
      setCredentialGroupEditorCredential(null);
      setCredentialGroupEditorValue("");
      toast.success(t("cloud.tokens.group_save_success", "令牌分组已更新"));
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setCredentialGroupSaving(false);
    }
  }, [
    credentialGroupEditorCredential,
    credentialGroupEditorValue,
    credentialPool,
    setCredentialPool,
    t,
  ]);

  if (loading) {
    return (
      <AdminPageShell
        eyebrow={t("cloud.title", "云平台")}
        title={t("cloud.providers.azure.title", "Azure")}
        description={t(
          "cloud.providers.azure.description",
          "Manage multiple Azure service principal credentials, inspect the active subscription, and operate virtual machines from one panel.",
        )}
      >
        <AdminTableSkeleton columns={6} rows={5} />
      </AdminPageShell>
    );
  }

  return (
    <>
      <AdminPageShell
        title={t("cloud.providers.azure.title", "Azure")}
        hideHeader
      >
        <CloudProviderHeader
          title={t("cloud.providers.azure.title", "Azure")}
        />

        {loadError ? (
          <WarningAlert
            tone="destructive"
            title={t("cloud.providers.azure.load_error_title", "加载 Azure 资源失败")}
            description={loadError}
          />
        ) : null}

        {showOnboardingPanel ? (
          <CloudOnboardingPanel
            t={t}
            providerName={t("cloud.providers.azure.title", "Azure")}
            credentialDone={credentialCount > 0}
            contextReady={Boolean(activeCredential)}
            resourcesLoaded={Boolean(activeCredential)}
            canLoadResources={false}
            canCreate={Boolean(activeCredential)}
            credentialTitle={t("cloud.providers.azure.onboarding_credential_title", "导入服务主体凭据")}
            credentialDescription={t(
              "cloud.providers.azure.onboarding_credential_description",
              "添加 Azure 应用凭据后，选择当前订阅并设置默认区域。",
            )}
            resourceTitle={t("cloud.providers.azure.onboarding_context_title", "确认订阅与区域")}
            resourceDescription={t(
              "cloud.providers.azure.onboarding_context_description",
              "当前订阅和区域会决定虚拟机列表、规格目录以及创建默认值。",
            )}
            createTitle={t("cloud.providers.azure.onboarding_create_title", "创建或管理虚拟机")}
            createDescription={t(
              "cloud.providers.azure.onboarding_create_description",
              "订阅就绪后，可以创建 VM，也可以在表格里查看网络、磁盘和运行状态。",
            )}
            importLabel={t("cloud.providers.azure.import", "导入凭证")}
            createLabel={t("cloud.providers.azure.create", "创建虚拟机")}
            onImportCredential={() => setCredentialImportOpen(true)}
            onCreate={() => setCreateOpen(true)}
          />
        ) : null}

        <div className="grid min-w-0 items-stretch gap-4 xl:grid-cols-[minmax(340px,0.9fr)_minmax(380px,1.1fr)]">
          <AzureInlineCreatePanel
            t={t}
            catalog={effectiveCatalog}
            account={account}
            activeCredential={activeCredential}
            form={createForm}
            setForm={setCreateForm}
            submitting={createSubmitting}
            locationUpdating={locationUpdating}
            onOpenAdvanced={() => setCreateOpen(true)}
            onSetLocation={handleSetLocation}
            onCreate={handleCreateInstance}
          />
          <AzureCredentialContextStrip
            t={t}
            credentialPool={credentialPool}
            catalog={effectiveCatalog}
            activeCredential={activeCredential}
            checkingCredentialsState={checkingCredentialsState}
            resourceLoading={resourceLoading}
            onImportCredentials={() => setCredentialImportOpen(true)}
            onViewInstances={loadResources}
            onCheckCredentials={handleCheckCredentials}
            onSelectCredential={handleSelectCredential}
            onOpenGroupEditor={openCredentialGroupEditor}
            onViewCredential={handleViewCredential}
            onDeleteCredential={handleDeleteCredential}
          />
        </div>

        <AzureInstancesSection
          t={t}
          catalog={effectiveCatalog}
          account={account}
          activeCredential={activeCredential}
          instances={instances}
          locationUpdating={locationUpdating}
          resourceLoading={resourceLoading}
          passwordStorageEnabled={passwordStorageEnabled}
          passwordLoading={passwordLoading}
          workingInstanceId={workingInstanceId}
          onSetLocation={handleSetLocation}
          onOpenDetail={handleOpenDetail}
          onOpenScript={(instance) => {
            if (!activeCredential) return;
            setScriptTarget(buildScriptTarget(t, instance, activeCredential.name));
          }}
          onViewPassword={handleViewPassword}
          onInstanceAction={handleInstanceAction}
          onReplaceInstanceIP={handleReplaceInstanceIP}
          onDeleteInstance={handleDeleteInstance}
        />
      </AdminPageShell>

      <AzureCreateDialog
        t={t}
        open={createOpen}
        onOpenChange={setCreateOpen}
        catalog={effectiveCatalog}
        account={account}
        activeCredential={activeCredential}
        createForm={createForm}
        setCreateForm={setCreateForm}
        submitting={createSubmitting}
        locationUpdating={locationUpdating}
        onSetLocation={handleSetLocation}
        onCreate={handleCreateInstance}
      />

      <AzureCredentialImportDialog
        t={t}
        open={credentialImportOpen}
        onOpenChange={setCredentialImportOpen}
        importText={credentialImportText}
        setImportText={setCredentialImportText}
        importGroup={credentialImportGroup}
        setImportGroup={setCredentialImportGroup}
        saving={savingCredentials}
        onImport={handleImportCredentials}
      />

      <AzureCredentialGroupDialog
        t={t}
        open={Boolean(credentialGroupEditorCredential)}
        onOpenChange={(open) => {
          if (!open) {
            setCredentialGroupEditorCredential(null);
            setCredentialGroupEditorValue("");
          }
        }}
        value={credentialGroupEditorValue}
        onValueChange={setCredentialGroupEditorValue}
        saving={credentialGroupSaving}
        onSave={handleSaveCredentialGroup}
      />

      <AzureCredentialSecretDialog
        t={t}
        credentialSecret={credentialSecret}
        onClose={() => setCredentialSecret(null)}
        onCopy={handleCopy}
      />

      <AzureSavedPasswordDialog
        t={t}
        savedPassword={savedPassword}
        onClose={() => setSavedPassword(null)}
        onCopy={handleCopy}
      />

      <AzureInstanceDetailDialog
        t={t}
        catalog={effectiveCatalog}
        activeCredential={activeCredential}
        detailInstance={detailInstance}
        detailData={detailData}
        detailLoading={detailLoading}
        passwordStorageEnabled={passwordStorageEnabled}
        passwordLoading={passwordLoading}
        workingInstanceId={workingInstanceId}
        onClose={() => {
          setDetailInstance(null);
          setDetailData(null);
        }}
        onViewPassword={handleViewPassword}
        onInstanceAction={handleInstanceAction}
        onReplaceInstanceIP={handleReplaceInstanceIP}
        onDeleteInstance={handleDeleteInstance}
        onOpenScript={(instance) => {
          if (!activeCredential) return;
          setScriptTarget(buildScriptTarget(t, instance, activeCredential.name));
        }}
      />

      <CloudInstanceScriptDialog
        open={Boolean(scriptTarget)}
        target={scriptTarget}
        onOpenChange={(open) => !open && setScriptTarget(null)}
      />

      {warningDialog}
    </>
  );
}

type AzureCredentialContextStripProps = {
  t: TFunction;
  credentialPool: AzureCredentialPool | null;
  catalog: AzureCatalog | null;
  activeCredential: AzureCredentialRecord | null;
  checkingCredentialsState: boolean;
  resourceLoading: boolean;
  onImportCredentials: () => void;
  onViewInstances: () => void | Promise<void>;
  onCheckCredentials: () => void | Promise<void>;
  onSelectCredential: (credential: AzureCredentialRecord) => void | Promise<void>;
  onOpenGroupEditor: (credential: AzureCredentialRecord) => void;
  onViewCredential: (credential: AzureCredentialRecord) => void | Promise<void>;
  onDeleteCredential: (credential: AzureCredentialRecord) => void | Promise<void>;
};

type AzureInlineCreatePanelProps = {
  t: TFunction;
  catalog: AzureCatalog | null;
  account: AzureAccount | null;
  activeCredential: AzureCredentialRecord | null;
  form: AzureCreateFormState;
  setForm: React.Dispatch<React.SetStateAction<AzureCreateFormState>>;
  submitting: boolean;
  locationUpdating: boolean;
  onOpenAdvanced: () => void;
  onSetLocation: (location: string) => void | Promise<void>;
  onCreate: () => void | Promise<void>;
};

function AzureInlineCreatePanel({
  t,
  catalog,
  account,
  activeCredential,
  form,
  setForm,
  submitting,
  locationUpdating,
  onOpenAdvanced,
  onSetLocation,
  onCreate,
}: AzureInlineCreatePanelProps) {
  const activeLocation = catalog?.active_location || account?.active_location || activeCredential?.default_location || "";
  const activeLocationLabel = getLocationLabel(catalog, activeLocation);
  const locationOptions = catalog?.locations ?? [];

  return (
    <section className={`${cloudPanelCardClassName} flex h-full min-h-[520px] flex-col`}>
      <div className={cloudPanelHeaderClassName}>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className={cloudPanelTitleClassName}>
                {t("cloud.providers.azure.create", "创建虚拟机")}
              </div>
              <Badge color={activeCredential ? "green" : "amber"}>
                {activeCredential ? t("common.active", "已激活") : t("cloud.no_active", "未激活")}
              </Badge>
            </div>
            <div className={cloudPanelDescriptionClassName}>
              {t("cloud.providers.azure.create_location_hint", {
                location: activeLocationLabel,
                defaultValue: `Active location: ${activeLocationLabel}`,
              })}
            </div>
          </div>
          <Button variant="outline" size="1" onClick={onOpenAdvanced} disabled={!activeCredential}>
            {t("cloud.advanced_options", "高级")}
          </Button>
        </div>
      </div>
      <div className="grid gap-3 p-4">
        <div>
          <label className={cloudPanelFieldLabelClassName}>{t("cloud.table.name", "名称")}</label>
          <TextField.Root
            value={form.name}
            disabled={!activeCredential}
            placeholder={t("cloud.providers.azure.create_name_placeholder", "留空将自动生成虚拟机名称")}
            onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
          />
        </div>
        <div>
          <label className={cloudPanelFieldLabelClassName}>{t("cloud.form.region", "地区")}</label>
          <Select.Root
            value={activeLocation}
            disabled={!activeCredential || locationUpdating || locationOptions.length === 0}
            onValueChange={(value) => {
              void onSetLocation(value);
            }}
          >
            <Select.Trigger placeholder={t("cloud.form.region_placeholder", "选择地区")} />
            <Select.Content>
              {locationOptions.map((location) => (
                <Select.Item key={location.name} value={location.name}>
                  {formatAzureLocationOption(location)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
        <div>
          <label className={cloudPanelFieldLabelClassName}>{t("cloud.form.image", "镜像")}</label>
          <Select.Root
            value={form.image_preset}
            disabled={!activeCredential}
            onValueChange={(value) => setForm((previous) => buildCreateFormFromPreset(value, previous))}
          >
            <Select.Trigger placeholder={t("cloud.form.image_placeholder", "选择镜像")} />
            <Select.Content>
              {azureImagePresets.map((preset) => (
                <Select.Item key={preset.id} value={preset.id}>
                  {preset.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
        <div>
          <label className={cloudPanelFieldLabelClassName}>{t("cloud.form.size", "规格")}</label>
          <Select.Root
            value={form.size || getDefaultAzureSize(catalog)}
            disabled={!activeCredential}
            onValueChange={(value) => setForm((previous) => ({ ...previous, size: value }))}
          >
            <Select.Trigger placeholder={t("cloud.form.size_placeholder", "选择规格")} />
            <Select.Content>
              {(catalog?.sizes || []).map((size) => (
                <Select.Item key={size.name} value={size.name}>
                  {formatAzureSizeOption(size)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
        <div>
          <label className={cloudPanelFieldLabelClassName}>{t("cloud.form.root_password", "Root Password")}</label>
          <TextField.Root
            value={form.admin_password || ""}
            disabled={!activeCredential}
            type="password"
            placeholder={t("cloud.form.root_password_placeholder", "输入 root 密码（留空随机）")}
            onChange={(event) => setForm((previous) => ({ ...previous, admin_password: event.target.value }))}
          />
        </div>
      </div>
      <div className="mt-auto flex items-center justify-end gap-2 border-t border-border px-4 py-3">
        <Button
          onClick={() => { void onCreate(); }}
          disabled={submitting || !activeCredential || !form.size}
        >
          {submitting ? t("cloud.creating", "正在创建...") : t("cloud.providers.azure.create", "创建虚拟机")}
        </Button>
      </div>
    </section>
  );
}

function AzureCredentialContextStrip({
  t,
  credentialPool,
  catalog,
  activeCredential,
  checkingCredentialsState,
  resourceLoading,
  onImportCredentials,
  onViewInstances,
  onCheckCredentials,
  onSelectCredential,
  onOpenGroupEditor,
  onViewCredential,
  onDeleteCredential,
}: AzureCredentialContextStripProps) {
  const credentials = credentialPool?.credentials ?? [];
  const credentialPagination = useClientPagination(credentials, {
    initialPageSize: 5,
  });
  const visibleCredentials = credentialPagination.pageItems;
  const [poolOpen, setPoolOpen] = React.useState(true);
  const activeLocation =
    credentialPool?.active_location || activeCredential?.default_location || catalog?.active_location || "";
  const subscriptionLabel =
    activeCredential?.subscription_display_name || activeCredential?.subscription_id || "-";

  return (
    <section className={`${cloudPanelCardClassName} flex h-full min-h-[520px] flex-col`}>
      <div className={cloudPanelHeaderClassName}>
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className={cloudPanelTitleClassName}>
                {t("cloud.providers.azure.subscription_context", "订阅上下文")}
              </div>
              <Badge color={activeCredential ? "green" : "amber"}>
                {activeCredential ? t("common.active", "已激活") : t("cloud.no_active", "未激活")}
              </Badge>
              <Badge color="gray">
                {t("cloud.providers.azure.credential_count", {
                  count: credentials.length,
                  defaultValue: "{{count}} credentials",
                })}
              </Badge>
            </div>
            <div className="mt-1 min-w-0 truncate text-xs leading-5 text-muted-foreground">
              {activeCredential
                ? `${subscriptionLabel} · ${activeLocation ? getLocationLabel(catalog, activeLocation) : "-"}`
                : t("cloud.providers.azure.subscription_context_description", "当前服务主体、订阅和默认区域会决定 VM 列表与创建默认值。")}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button size="1" onClick={onImportCredentials}>
              <Plus className="mr-2 h-4 w-4" />
              {t("cloud.providers.azure.import", "导入凭证")}
            </Button>
            <Button
              variant="outline"
              size="1"
              onClick={() => {
                void onViewInstances();
              }}
              disabled={!activeCredential || resourceLoading}
            >
              {resourceLoading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              {t("cloud.providers.azure.view_instances", "查看实例")}
            </Button>
            <Button
              variant="outline"
              size="1"
              onClick={() => setPoolOpen((open) => !open)}
            >
              <ChevronDown className={`mr-2 h-4 w-4 transition-transform ${poolOpen ? "rotate-180" : ""}`} />
              {poolOpen ? t("common.collapse", "收起") : t("cloud.tokens.manage", "管理")}
            </Button>
            <Button
              variant="outline"
              size="1"
              onClick={() => {
                void onCheckCredentials();
              }}
              disabled={credentials.length === 0 || checkingCredentialsState}
            >
              <RefreshCw className={`mr-2 h-4 w-4${checkingCredentialsState ? " animate-spin" : ""}`} />
              {t("cloud.credentials.check", "检查")}
            </Button>
          </div>
        </div>
      </div>

      {poolOpen ? (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-gutter:stable]">
            {visibleCredentials.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <AdminDataTableScroll>
                  <AdminDataTable minWidth={500} className="[&_td]:px-2 [&_th]:px-2">
                  <thead>
                    <AdminDataTableHeadRow>
                      <AdminDataTableHead>{t("cloud.tokens.table.name", "名称")}</AdminDataTableHead>
                      <AdminDataTableHead>{t("cloud.tokens.group", "分组")}</AdminDataTableHead>
                      <AdminDataTableHead>{t("cloud.providers.azure.subscription_state", "Subscription state")}</AdminDataTableHead>
                      <AdminDataTableHead>{t("cloud.tokens.table.status", "状态")}</AdminDataTableHead>
                      <AdminDataTableHead align="right" sticky="right">{t("common.action", "操作")}</AdminDataTableHead>
                    </AdminDataTableHeadRow>
                  </thead>
                  <tbody>
                    {visibleCredentials.map((credential) => (
                      <AdminDataTableRow key={credential.id}>
                        <AdminDataTableCell className={`font-semibold text-foreground ${cloudLongTextClassName}`}>
                          <span className="block max-w-44 truncate">
                            {credential.name || "-"}
                          </span>
                        </AdminDataTableCell>
                        <AdminDataTableCell className={`text-xs text-muted-foreground ${cloudLongTextClassName}`}>
                          <span className="block max-w-36 truncate">
                            {credential.group || t("cloud.tokens.no_group", "未分组")}
                          </span>
                        </AdminDataTableCell>
                        <AdminDataTableCell className={`text-xs text-muted-foreground ${cloudLongTextClassName}`}>
                          {credential.subscription_state || "-"}
                        </AdminDataTableCell>
                        <AdminDataTableCell>
                          <Badge color={credential.is_active ? "green" : "gray"}>
                            {credential.is_active
                              ? t("common.active", "已激活")
                              : getCloudStatusLabel(credential.last_status, t)}
                          </Badge>
                        </AdminDataTableCell>
                        <AdminDataTableCell align="right" sticky="right">
                          <AdminRowActions
                            label={t("common.action", "操作")}
                            actions={[
                              {
                                label: t("common.select", "选择"),
                                icon: <CheckCircle2 className="h-4 w-4" />,
                                hidden: credential.is_active,
                                onSelect: () => {
                                  void onSelectCredential(credential);
                                },
                              },
                              {
                                label: t("cloud.tokens.group_action", "分组"),
                                icon: <PencilLine className="h-4 w-4" />,
                                onSelect: () => onOpenGroupEditor(credential),
                              },
                              {
                                label: t("cloud.view", "查看"),
                                icon: <Eye className="h-4 w-4" />,
                                onSelect: () => {
                                  void onViewCredential(credential);
                                },
                              },
                              {
                                label: t("delete", "删除"),
                                icon: <Trash2 className="h-4 w-4" />,
                                destructive: true,
                                onSelect: () => {
                                  void onDeleteCredential(credential);
                                },
                              },
                            ]}
                          />
                        </AdminDataTableCell>
                      </AdminDataTableRow>
                    ))}
                  </tbody>
                  </AdminDataTable>
                </AdminDataTableScroll>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200/80 bg-slate-50 px-4 py-8 text-center dark:border-slate-800 dark:bg-slate-900/35">
                <p className={cloudPanelBodyTextClassName}>
                {t("cloud.providers.azure.no_credentials", "尚未导入 Azure 服务主体凭据。")}
                </p>
              </div>
            )}
          </div>
          <AdminPagination
            page={credentialPagination.page}
            totalPages={credentialPagination.totalPages}
            total={credentialPagination.total}
            pageSize={credentialPagination.pageSize}
            visibleStart={credentialPagination.visibleStart}
            visibleEnd={credentialPagination.visibleEnd}
            onPageChange={credentialPagination.setPage}
            onPageSizeChange={credentialPagination.setPageSize}
            pageSizeOptions={[5, 10, 20]}
            itemLabel={t("admin.pagination.credentials", { defaultValue: "credentials" })}
            compact
          />
        </>
      ) : null}
    </section>
  );
}

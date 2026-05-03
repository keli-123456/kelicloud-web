import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Plus,
  RefreshCw,
} from "lucide-react";

import {
  AdminCardGridSkeleton,
  AdminPageShell,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
import {
  AzureCredentialImportDialog,
  AzureCredentialGroupDialog,
  AzureCredentialSecretDialog,
  AzureSavedPasswordDialog,
} from "@/components/admin/cloud/AzureCredentialDialogs";
import { AzureCredentialsSection } from "@/components/admin/cloud/AzureCredentialsSection";
import { AzureCreateDialog } from "@/components/admin/cloud/AzureCreateDialog";
import { AzureInstanceDetailDialog } from "@/components/admin/cloud/AzureInstanceDetailDialog";
import { AzureInstancesSection } from "@/components/admin/cloud/AzureInstancesSection";
import { CloudOnboardingPanel } from "@/components/admin/cloud/CloudOnboardingPanel";
import CloudInstanceScriptDialog, { type CloudInstanceScriptTarget } from "@/components/admin/cloud/CloudInstanceScriptDialog";
import {
  Button,
} from "@/components/admin/cloud/cloud-ui";
import { WarningAlert } from "@/components/ui/warning-alert";
import { useWarningDialog } from "@/components/ui/warning-dialog";
import {
  buildScriptTarget,
  getActiveCredential,
  toErrorMessage,
} from "./azurePanelUtils";
import {
  saveAzureCredentials,
  type AzureCredentialRecord,
} from "@/lib/cloudAzure";
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
  const showOnboardingPanel = !activeCredential || instances.length === 0;

  const stats = React.useMemo(() => {
    const runningCount = instances.filter((instance) => instance.power_state.trim().toLowerCase() === "running").length;
    const withPublicIP = instances.filter((instance) => instance.public_ips.length > 0).length;
    return [
      {
        label: t("cloud.providers.azure.credentials_label", "Credentials"),
        value: credentialPool?.credentials.length || 0,
        tone: "slate" as const,
      },
      {
        label: t("cloud.providers.azure.instances_label", "Virtual Machines"),
        value: instances.length,
        tone: "blue" as const,
      },
      {
        label: t("cloud.providers.azure.running_label", "Running"),
        value: runningCount,
        tone: "emerald" as const,
      },
      {
        label: t("cloud.providers.azure.public_ip_label", "With Public IP"),
        value: withPublicIP,
        tone: "amber" as const,
      },
    ];
  }, [credentialPool, instances, t]);

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
    catalog,
    setDetailInstance,
    setDetailData,
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
      toast.success(t("cloud.tokens.group_save_success", "Token group updated"));
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
        eyebrow={t("cloud.title", "Cloud")}
        title={t("cloud.providers.azure.title", "Azure")}
        description={t(
          "cloud.providers.azure.description",
          "Manage multiple Azure service principal credentials, inspect the active subscription, and operate virtual machines from one panel.",
        )}
      >
        <AdminCardGridSkeleton cards={4} />
        <AdminTableSkeleton columns={6} rows={5} />
      </AdminPageShell>
    );
  }

  return (
    <>
      <AdminPageShell
        eyebrow={t("cloud.title", "Cloud")}
        title={t("cloud.providers.azure.title", "Azure")}
        description={t(
          "cloud.providers.azure.description",
          "Manage multiple Azure service principal credentials, inspect the active subscription, and operate virtual machines from one panel.",
        )}
        stats={stats}
        statsVariant="cards"
        actions={(
          <>
            <Button variant="outline" onClick={() => void loadAll()} disabled={resourceLoading}>
              <RefreshCw className={`mr-2 h-4 w-4${resourceLoading ? " animate-spin" : ""}`} />
              {t("cloud.refresh", "Refresh")}
            </Button>
            <Button onClick={() => setCreateOpen(true)} disabled={!activeCredential}>
              <Plus className="mr-2 h-4 w-4" />
              {t("cloud.providers.azure.create", "Create VM")}
            </Button>
            <Button onClick={() => setCredentialImportOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("cloud.providers.azure.import", "Import Credentials")}
            </Button>
          </>
        )}
      >
        {loadError ? (
          <WarningAlert
            tone="destructive"
            title={t("cloud.providers.azure.load_error_title", "Failed to load Azure resources")}
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
            importLabel={t("cloud.providers.azure.import", "Import Credentials")}
            createLabel={t("cloud.providers.azure.create", "Create VM")}
            onImportCredential={() => setCredentialImportOpen(true)}
            onCreate={() => setCreateOpen(true)}
          />
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <AzureCredentialsSection
            t={t}
            credentialPool={credentialPool}
            catalog={catalog}
            checkingCredentialsState={checkingCredentialsState}
            onImportCredentials={() => setCredentialImportOpen(true)}
            onCheckCredentials={handleCheckCredentials}
            onSelectCredential={handleSelectCredential}
            onOpenGroupEditor={openCredentialGroupEditor}
            onViewCredential={handleViewCredential}
            onDeleteCredential={handleDeleteCredential}
          />
        </div>

        <AzureInstancesSection
          t={t}
          catalog={catalog}
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
        catalog={catalog}
        account={account}
        activeCredential={activeCredential}
        createForm={createForm}
        setCreateForm={setCreateForm}
        submitting={createSubmitting}
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
        catalog={catalog}
        activeCredential={activeCredential}
        detailInstance={detailInstance}
        detailData={detailData}
        detailLoading={detailLoading}
        passwordStorageEnabled={passwordStorageEnabled}
        passwordLoading={passwordLoading}
        workingInstanceId={workingInstanceId}
        onClose={() => setDetailInstance(null)}
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

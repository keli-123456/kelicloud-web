import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

import {
  AdminCardGridSkeleton,
  AdminPageShell,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
import { AWSBackgroundTasksDialog } from "@/components/admin/cloud/AWSBackgroundTasksDialog";
import {
  AWSCreatedPasswordDialog,
  AWSCredentialSecretDialog,
  AWSSavedPasswordDialog,
} from "@/components/admin/cloud/AWSCredentialDialogs";
import {
  AWSCredentialCheckDialog,
  AWSCredentialGroupDialog,
  AWSCredentialImportDialog,
} from "@/components/admin/cloud/AWSCredentialManagementDialogs";
import {
  AWSEC2CreateDialog,
  AWSLightsailCreateDialog,
} from "@/components/admin/cloud/AWSCreateDialogs";
import { AWSEC2DetailDialog } from "@/components/admin/cloud/AWSEC2DetailDialog";
import { AWSLightsailDetailDialog } from "@/components/admin/cloud/AWSLightsailDetailDialog";
import {
  AWSComputeSection,
  AWSCredentialsSection,
} from "@/components/admin/cloud/AWSPanelSections";
import { CloudOnboardingPanel } from "@/components/admin/cloud/CloudOnboardingPanel";
import CloudInstanceShareDialog from "@/components/admin/cloud/CloudInstanceShareDialog";
import CloudInstanceScriptDialog from "@/components/admin/cloud/CloudInstanceScriptDialog";
import { Button } from "@/components/admin/cloud/cloud-ui";
import { WarningAlert } from "@/components/ui/warning-alert";
import { useWarningDialog } from "@/components/ui/warning-dialog";
import {
  getAWSCredentials,
  type AWSCredentialPool,
} from "@/lib/cloudAws";
import {
  hasActiveCredential,
  toErrorMessage,
} from "./awsPanelUtils";
import {
  type CreatedPasswordState,
} from "./awsPanelState";
import { useAWSCredentialActions } from "./useAWSCredentialActions";
import { useAWSCreateInstances } from "./useAWSCreateInstances";
import { useAWSInstanceActions } from "./useAWSInstanceActions";
import { useAWSInstanceTargetActions } from "./useAWSInstanceTargetActions";
import { useAWSPanelContext } from "./useAWSPanelContext";
import { useAWSPanelResources } from "./useAWSPanelResources";
import { useAWSResourcePasswords } from "./useAWSResourcePasswords";
import { useCloudInstanceShare } from "./useCloudInstanceShare";
import { useAWSBackgroundTasks } from "./useAWSBackgroundTasks";

export default function AWSPanel() {
  const { t } = useTranslation();
  const { confirm, dialog } = useWarningDialog();
  const {
    backgroundTasksOpen,
    setBackgroundTasksOpen,
    backgroundTasksLoading,
    backgroundTasks,
    filteredBackgroundTasks,
    backgroundTaskCredentialFilter,
    setBackgroundTaskCredentialFilter,
    backgroundTaskCredentialOptions,
    backgroundTaskRegionFilter,
    setBackgroundTaskRegionFilter,
    backgroundTaskRegionOptions,
    backgroundTaskStatusFilter,
    setBackgroundTaskStatusFilter,
    backgroundTaskRetryingId,
    backgroundTaskClearing,
    pendingBackgroundTaskCount,
    failedBackgroundTaskCount,
    cancelledBackgroundTaskCount,
    skippedBackgroundTaskCount,
    terminalBackgroundTaskCount,
    loadBackgroundTasks,
    handleRetryBackgroundTask,
    handleClearTerminalBackgroundTasks,
  } = useAWSBackgroundTasks({ t, confirm });

  const [instanceView, setInstanceView] = React.useState<"ec2" | "lightsail">("ec2");
  const [regionSelectionRequired, setRegionSelectionRequired] = React.useState(false);
  const [credentialPool, setCredentialPool] = React.useState<AWSCredentialPool | null>(null);
  const [createdPassword, setCreatedPassword] = React.useState<CreatedPasswordState | null>(null);
  const {
    initializing,
    setInitializing,
    panelLoading,
    account,
    setAccount,
    catalog,
    instances,
    setInstances,
    lightsailInstances,
    error,
    setError,
    lightsailError,
    resourcesLoaded,
    loadLightsailData,
    loadPanelData,
    clearResourceData,
  } = useAWSPanelResources();
  const {
    activeCredential,
    activeCredentialName,
    passwordStorageEnabled,
    activeRegion,
    activeContextReady,
    activeQuota,
    activeQuotaError,
    activeQuotaWarningMessage,
    standardVCPUQuotaReached,
    runningInstanceLimitReached,
    regionOptions,
    regionSearchPlaceholder,
    regionSearchEmpty,
  } = useAWSPanelContext({
    t,
    credentialPool,
    account,
    catalog,
    regionSelectionRequired,
  });

  const {
    detailInstance,
    detailData,
    detailLoading,
    detailActionLoading,
    detailActionForm,
    setDetailActionForm,
    detailTargetElasticAddress,
    lightsailDetailInstance,
    lightsailDetailData,
    lightsailDetailLoading,
    lightsailActionLoading,
    lightsailDetailActionForm,
    setLightsailDetailActionForm,
    currentLightsailStaticIP,
    clearResourceDetailData,
    closeEC2Detail,
    closeLightsailDetail,
    handleInstanceAction,
    loadInstanceDetail,
    handleDetailedEc2Action,
    handleAllowAllEc2Traffic,
    handleReplaceEc2Address,
    handleQuickReplaceEc2Address,
    handleLightsailInstanceAction,
    loadLightsailDetail,
    handleDetailedLightsailAction,
    handleAllowAllLightsailTraffic,
    handleReplaceLightsailStaticIP,
    handleQuickReplaceLightsailStaticIP,
    handleDeleteInstance,
    handleDeleteLightsailInstance,
  } = useAWSInstanceActions({
    t,
    confirm,
    loadPanelData,
  });

  const clearPanelState = React.useCallback(() => {
    clearResourceData();
    clearResourceDetailData();
  }, [clearResourceData, clearResourceDetailData]);

  const copyText = React.useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t("copy_success", "Copied!"));
      } catch (copyError) {
        toast.error(toErrorMessage(copyError));
      }
    },
    [t],
  );
  const {
    savedPassword,
    setSavedPassword,
    passwordLoading,
    handleViewInstancePassword,
    handleViewLightsailPassword,
  } = useAWSResourcePasswords();
  const {
    shareOpen,
    shareTarget,
    shareRecord,
    shareLoading,
    shareSaving,
    shareDeleting,
    shareTitle,
    setShareTitle,
    shareNote,
    setShareNote,
    shareAccessPolicy,
    setShareAccessPolicy,
    shareExpiresAt,
    setShareExpiresAt,
    shareUrl,
    handleShareOpenChange,
    openShareDialog,
    handleSaveShare,
    handleDeleteShare,
    handleCopyShareLink,
  } = useCloudInstanceShare({ t, confirm, copyText });
  const {
    scriptTarget,
    setScriptTarget,
    openEC2ScriptDialog,
    openLightsailScriptDialog,
    openEC2ShareDialog,
    openLightsailShareDialog,
  } = useAWSInstanceTargetActions({
    t,
    activeCredentialName,
    activeRegion,
    passwordStorageEnabled,
    openShareDialog,
  });
  const {
    credentialSaving,
    credentialChecking,
    credentialImportOpen,
    setCredentialImportOpen,
    credentialImportText,
    setCredentialImportText,
    credentialImportGroup,
    setCredentialImportGroup,
    credentialCheckDialogOpen,
    setCredentialCheckDialogOpen,
    credentialCheckRegion,
    setCredentialCheckRegion,
    credentialSecret,
    setCredentialSecret,
    credentialSecretLoading,
    selectedCredentialIds,
    selectedCredentials,
    credentialRows,
    allCredentialsSelected,
    someCredentialsSelected,
    credentialGroupEditorOpen,
    setCredentialGroupEditorOpen,
    credentialGroupEditorValue,
    setCredentialGroupEditorValue,
    credentialGroupEditorIds,
    handleSelectAllCredentials,
    toggleCredentialSelection,
    openCredentialGroupEditor,
    openSelectedCredentialGroupEditor,
    openCredentialCheckDialog,
    handleImportCredentials,
    handleSaveCredentialGroup,
    handleCheckCredentials,
    handleSubmitCredentialCheck,
    handleSelectCredential,
    handleDeleteCredential,
    handleDeleteSelectedCredentials,
    handleViewCredentialSecret,
    handleRegionChange,
  } = useAWSCredentialActions({
    t,
    confirm,
    credentialPool,
    setCredentialPool,
    activeRegion,
    regionSelectionRequired,
    setRegionSelectionRequired,
    resourcesLoaded,
    setAccount,
    clearPanelState,
    loadBackgroundTasks,
  });

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const nextPool = await getAWSCredentials();
        if (cancelled) return;
        setCredentialPool(nextPool);
        const needsRegionSelection = Boolean(nextPool.active_credential_id && !nextPool.active_region);
        setRegionSelectionRequired(needsRegionSelection);
        clearPanelState();
      } catch (bootstrapError) {
        if (!cancelled) {
          setError(toErrorMessage(bootstrapError));
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearPanelState, setError, setInitializing]);

  const {
    createOpen,
    setCreateOpen,
    createForm,
    setCreateForm,
    createSubmitting,
    resolvedCreateRegion,
    selectedCreateRegionOption,
    selectedImagePreset,
    selectedInstanceTypePreset,
    selectedImageArchitecture,
    selectedInstanceArchitecture,
    ec2ArchitectureMismatch,
    ec2CoreSummary,
    ec2NetworkSummary,
    ec2BootstrapSummary,
    lightsailCreateOpen,
    setLightsailCreateOpen,
    lightsailCreateForm,
    setLightsailCreateForm,
    lightsailCreateSubmitting,
    resolvedLightsailCreateRegion,
    selectedLightsailCreateRegionOption,
    selectedLightsailBlueprintPreset,
    selectedLightsailBundlePreset,
    lightsailPlatformMismatch,
    lightsailCoreSummary,
    lightsailAccessSummary,
    lightsailBootstrapSummary,
    handleCreateDialogRegionChange,
    handleLightsailDialogRegionChange,
    handleCreateInstance,
    handleCreateLightsailInstance,
    handleOpenCreateDialog,
    handleOpenLightsailCreateDialog,
  } = useAWSCreateInstances({
    t,
    activeCredential,
    activeCredentialName,
    activeRegion,
    activeContextReady,
    resourcesLoaded,
    regionOptions,
    setInstances,
    setCreatedPassword,
    loadLightsailData,
    loadBackgroundTasks,
  });
  const handleLoadResources = async () => {
    if (!activeContextReady) {
      return;
    }
    await loadPanelData();
  };
  const showOnboardingPanel =
    credentialRows.length === 0 || !activeContextReady || !resourcesLoaded;

  if (initializing) {
    return (
      <AdminPageShell
        eyebrow={t("cloud.title", "Cloud")}
        title="AWS"
        description={t(
          "cloud.providers.aws.description",
          "Manage AWS credentials, regional context, EC2 and Lightsail resources from one panel.",
        )}
      >
        <AdminCardGridSkeleton cards={4} />
        <AdminTableSkeleton columns={6} rows={5} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      eyebrow={t("cloud.title", "Cloud")}
      title="AWS"
      description={t(
        "cloud.providers.aws.description",
        "Manage AWS credentials, regional context, EC2 and Lightsail resources from one panel.",
      )}
      actions={
        <Button
          variant="outline"
          size="1"
          onClick={() => {
            window.location.reload();
          }}
          disabled={panelLoading || credentialChecking}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("cloud.refresh", "Refresh")}
        </Button>
      }
    >
      {error ? (
        <WarningAlert tone="warning" description={error} />
      ) : null}

      {activeQuotaError ? (
        <WarningAlert
          tone="warning"
          description={activeQuotaWarningMessage}
        />
      ) : null}

      {standardVCPUQuotaReached ? (
        <WarningAlert
          tone="warning"
          description={t("cloud.providers.aws.standard_vcpu_quota_reached", {
            used: activeQuota?.running_standard_vcpus || 0,
            limit: activeQuota?.max_standard_vcpus || 0,
            defaultValue: `Running standard On-Demand vCPU usage has reached the current regional limit (${activeQuota?.running_standard_vcpus || 0}/${activeQuota?.max_standard_vcpus || 0}). Launching a new EC2 instance may fail until capacity is freed or the quota is raised.`,
          })}
        />
      ) : null}

      {runningInstanceLimitReached ? (
        <WarningAlert
          tone="warning"
          description={t("cloud.providers.aws.instance_quota_reached", {
            running: activeQuota?.running_instances || 0,
            limit: activeQuota?.max_instances || 0,
            defaultValue: `Running instances have reached the current regional limit (${activeQuota?.running_instances || 0}/${activeQuota?.max_instances || 0}). New launches may fail until capacity is freed or the quota is raised.`,
          })}
        />
      ) : null}

      {showOnboardingPanel ? (
        <CloudOnboardingPanel
          t={t}
          providerName="AWS"
          credentialDone={credentialRows.length > 0}
          contextReady={activeContextReady}
          resourcesLoaded={resourcesLoaded}
          resourceLoading={panelLoading}
          canLoadResources={activeContextReady}
          canCreate={Boolean(activeCredential)}
          credentialTitle={t("cloud.providers.aws.onboarding_credential_title", "导入访问密钥")}
          credentialDescription={t(
            "cloud.providers.aws.onboarding_credential_description",
            "添加 AWS Access Key 后，选择当前凭据和默认区域。",
          )}
          resourceTitle={t("cloud.providers.aws.onboarding_resource_title", "选择区域并加载资源")}
          resourceDescription={t(
            "cloud.providers.aws.onboarding_resource_description",
            "EC2 和 Lightsail 按区域管理，先确认区域再按需拉取云资源。",
          )}
          createTitle={t("cloud.providers.aws.onboarding_create_title", "创建或管理计算实例")}
          createDescription={t(
            "cloud.providers.aws.onboarding_create_description",
            "资源加载后，可以启动 EC2 或 Lightsail，也可以在表格里处理电源、IP 和共享。",
          )}
          importLabel={t("cloud.providers.aws.import", "Import Credentials")}
          createLabel={t("cloud.providers.aws.create", "Launch EC2")}
          onImportCredential={() => setCredentialImportOpen(true)}
          onLoadResources={handleLoadResources}
          onCreate={handleOpenCreateDialog}
        />
      ) : null}

      <AWSCredentialsSection
        t={t}
        activeRegion={activeRegion}
        regionOptions={regionOptions}
        regionSearchPlaceholder={regionSearchPlaceholder}
        regionSearchEmpty={regionSearchEmpty}
        credentialRows={credentialRows}
        selectedCredentialIds={selectedCredentialIds}
        selectedCredentialCount={selectedCredentials.length}
        allCredentialsSelected={allCredentialsSelected}
        someCredentialsSelected={someCredentialsSelected}
        activeContextReady={activeContextReady}
        credentialChecking={credentialChecking}
        credentialSecretLoading={credentialSecretLoading}
        pendingBackgroundTaskCount={pendingBackgroundTaskCount}
        onRegionChange={handleRegionChange}
        onCheckCurrentCredential={() => {
          if (!activeCredential) {
            return;
          }
          return handleCheckCredentials([activeCredential.id]);
        }}
        onCheckAllCredentials={openCredentialCheckDialog}
        onImportCredentials={() => setCredentialImportOpen(true)}
        onOpenBackgroundTasks={() => setBackgroundTasksOpen(true)}
        onOpenSelectedGroupEditor={openSelectedCredentialGroupEditor}
        onDeleteSelectedCredentials={handleDeleteSelectedCredentials}
        onSelectAllCredentials={handleSelectAllCredentials}
        onToggleCredential={toggleCredentialSelection}
        onSelectCredential={handleSelectCredential}
        onOpenGroupEditor={openCredentialGroupEditor}
        onViewCredentialSecret={handleViewCredentialSecret}
        onDeleteCredential={handleDeleteCredential}
      />

      <AWSComputeSection
        t={t}
        instanceView={instanceView}
        instances={instances}
        lightsailInstances={lightsailInstances}
        panelLoading={panelLoading}
        error={error}
        lightsailError={lightsailError}
        hasCredential={hasActiveCredential(credentialPool)}
        activeContextReady={activeContextReady}
        resourcesLoaded={resourcesLoaded}
        passwordStorageEnabled={passwordStorageEnabled}
        passwordLoading={passwordLoading}
        canCreate={Boolean(activeCredential)}
        onInstanceViewChange={setInstanceView}
        onLoadResources={handleLoadResources}
        onOpenEC2Create={handleOpenCreateDialog}
        onOpenLightsailCreate={handleOpenLightsailCreateDialog}
        onLoadEC2Detail={loadInstanceDetail}
        onViewEC2Password={handleViewInstancePassword}
        onEC2PowerAction={handleInstanceAction}
        onEC2Reboot={(instance) => handleInstanceAction(instance, "reboot")}
        onEC2ReplaceIP={handleQuickReplaceEc2Address}
        onRunEC2Script={openEC2ScriptDialog}
        onShareEC2={openEC2ShareDialog}
        onDeleteEC2={handleDeleteInstance}
        onLoadLightsailDetail={loadLightsailDetail}
        onViewLightsailPassword={handleViewLightsailPassword}
        onLightsailPowerAction={handleLightsailInstanceAction}
        onLightsailReboot={(instance) => handleLightsailInstanceAction(instance, "reboot")}
        onLightsailReplaceIP={handleQuickReplaceLightsailStaticIP}
        onRunLightsailScript={openLightsailScriptDialog}
        onShareLightsail={openLightsailShareDialog}
        onDeleteLightsail={handleDeleteLightsailInstance}
      />

      <AWSCredentialImportDialog
        open={credentialImportOpen}
        onOpenChange={setCredentialImportOpen}
        t={t}
        group={credentialImportGroup}
        onGroupChange={setCredentialImportGroup}
        text={credentialImportText}
        onTextChange={setCredentialImportText}
        saving={credentialSaving}
        onImport={handleImportCredentials}
      />
      <AWSCredentialGroupDialog
        open={credentialGroupEditorOpen}
        onOpenChange={setCredentialGroupEditorOpen}
        t={t}
        selectedCount={credentialGroupEditorIds.length}
        value={credentialGroupEditorValue}
        onValueChange={setCredentialGroupEditorValue}
        saving={credentialSaving}
        onSave={handleSaveCredentialGroup}
      />
      <AWSCredentialCheckDialog
        open={credentialCheckDialogOpen}
        onOpenChange={setCredentialCheckDialogOpen}
        t={t}
        region={credentialCheckRegion}
        onRegionChange={setCredentialCheckRegion}
        regionOptions={regionOptions}
        searchPlaceholder={regionSearchPlaceholder}
        emptyLabel={regionSearchEmpty}
        checking={credentialChecking}
        onSubmit={handleSubmitCredentialCheck}
      />

      <AWSEC2CreateDialog
        t={t}
        open={createOpen}
        onOpenChange={setCreateOpen}
        form={createForm}
        setForm={setCreateForm}
        submitting={createSubmitting}
        resolvedRegion={resolvedCreateRegion}
        selectedRegionOption={selectedCreateRegionOption}
        imageLabel={selectedImagePreset ? selectedImagePreset.label : createForm.image_id}
        instanceTypeLabel={selectedInstanceTypePreset ? selectedInstanceTypePreset.label : createForm.instance_type}
        coreSummary={ec2CoreSummary}
        networkSummary={ec2NetworkSummary}
        bootstrapSummary={ec2BootstrapSummary}
        architectureMismatch={ec2ArchitectureMismatch}
        selectedImageArchitecture={selectedImageArchitecture}
        selectedInstanceArchitecture={selectedInstanceArchitecture}
        regionOptions={regionOptions}
        regionSearchPlaceholder={regionSearchPlaceholder}
        regionSearchEmpty={regionSearchEmpty}
        onRegionChange={handleCreateDialogRegionChange}
        onCreate={handleCreateInstance}
      />

      <AWSLightsailCreateDialog
        t={t}
        open={lightsailCreateOpen}
        onOpenChange={setLightsailCreateOpen}
        form={lightsailCreateForm}
        setForm={setLightsailCreateForm}
        submitting={lightsailCreateSubmitting}
        resolvedRegion={resolvedLightsailCreateRegion}
        selectedRegionOption={selectedLightsailCreateRegionOption}
        selectedBlueprintPreset={selectedLightsailBlueprintPreset}
        selectedBundlePreset={selectedLightsailBundlePreset}
        coreSummary={lightsailCoreSummary}
        accessSummary={lightsailAccessSummary}
        bootstrapSummary={lightsailBootstrapSummary}
        platformMismatch={lightsailPlatformMismatch}
        regionOptions={regionOptions}
        regionSearchPlaceholder={regionSearchPlaceholder}
        regionSearchEmpty={regionSearchEmpty}
        onRegionChange={handleLightsailDialogRegionChange}
        onCreate={handleCreateLightsailInstance}
      />

      <AWSEC2DetailDialog
        t={t}
        detailInstance={detailInstance}
        detailData={detailData}
        detailLoading={detailLoading}
        detailActionLoading={detailActionLoading}
        detailActionForm={detailActionForm}
        setDetailActionForm={setDetailActionForm}
        catalog={catalog}
        canReplaceAddress={Boolean(detailTargetElasticAddress)}
        passwordStorageEnabled={passwordStorageEnabled}
        passwordLoading={passwordLoading}
        onOpenChange={(open) => {
          if (open) return;
          closeEC2Detail();
        }}
        onAction={handleDetailedEc2Action}
        onAllowAllTraffic={handleAllowAllEc2Traffic}
        onReplaceAddress={handleReplaceEc2Address}
        onDeleteInstance={handleDeleteInstance}
        onRunScript={(data) => openEC2ScriptDialog(data.instance)}
        onShareInstance={(data) => openEC2ShareDialog(data.instance)}
        onViewInstancePassword={handleViewInstancePassword}
      />

      <AWSLightsailDetailDialog
        t={t}
        detailInstance={lightsailDetailInstance}
        detailData={lightsailDetailData}
        detailLoading={lightsailDetailLoading}
        actionLoading={lightsailActionLoading}
        actionForm={lightsailDetailActionForm}
        setActionForm={setLightsailDetailActionForm}
        currentStaticIP={currentLightsailStaticIP}
        passwordStorageEnabled={passwordStorageEnabled}
        passwordLoading={passwordLoading}
        onOpenChange={(open) => {
          if (open) return;
          closeLightsailDetail();
        }}
        onAction={handleDetailedLightsailAction}
        onAllowAllTraffic={handleAllowAllLightsailTraffic}
        onReplaceStaticIP={handleReplaceLightsailStaticIP}
        onDeleteInstance={handleDeleteLightsailInstance}
        onRunScript={(data) => openLightsailScriptDialog(data.instance)}
        onShareInstance={(data) => openLightsailShareDialog(data.instance)}
        onViewInstancePassword={handleViewLightsailPassword}
      />

      <CloudInstanceShareDialog
        open={shareOpen}
        onOpenChange={handleShareOpenChange}
        target={shareTarget}
        share={shareRecord}
        loading={shareLoading}
        saving={shareSaving}
        deleting={shareDeleting}
        title={shareTitle}
        note={shareNote}
        accessPolicy={shareAccessPolicy}
        expiresAt={shareExpiresAt}
        sharePassword={false}
        shareManagedSSHKey={false}
        shareUrl={shareUrl}
        onTitleChange={setShareTitle}
        onNoteChange={setShareNote}
        onAccessPolicyChange={setShareAccessPolicy}
        onExpiresAtChange={setShareExpiresAt}
        onSharePasswordChange={() => {}}
        onShareManagedSSHKeyChange={() => {}}
        onCopyLink={handleCopyShareLink}
        onSave={() => {
          void handleSaveShare();
        }}
        onDelete={() => {
          void handleDeleteShare();
        }}
      />

      <CloudInstanceScriptDialog
        open={Boolean(scriptTarget)}
        target={scriptTarget}
        onOpenChange={(open) => {
          if (open) return;
          setScriptTarget(null);
        }}
      />

      <AWSBackgroundTasksDialog
        open={backgroundTasksOpen}
        onOpenChange={setBackgroundTasksOpen}
        t={t}
        tasks={backgroundTasks}
        filteredTasks={filteredBackgroundTasks}
        loading={backgroundTasksLoading}
        clearing={backgroundTaskClearing}
        retryingId={backgroundTaskRetryingId}
        pendingCount={pendingBackgroundTaskCount}
        failedCount={failedBackgroundTaskCount}
        cancelledCount={cancelledBackgroundTaskCount}
        skippedCount={skippedBackgroundTaskCount}
        terminalCount={terminalBackgroundTaskCount}
        credentialFilter={backgroundTaskCredentialFilter}
        onCredentialFilterChange={setBackgroundTaskCredentialFilter}
        credentialOptions={backgroundTaskCredentialOptions}
        regionFilter={backgroundTaskRegionFilter}
        onRegionFilterChange={setBackgroundTaskRegionFilter}
        regionOptions={backgroundTaskRegionOptions}
        statusFilter={backgroundTaskStatusFilter}
        onStatusFilterChange={setBackgroundTaskStatusFilter}
        onClearTerminalTasks={handleClearTerminalBackgroundTasks}
        onRefresh={() => {
          void loadBackgroundTasks();
        }}
        onRetryTask={handleRetryBackgroundTask}
      />

      <AWSCredentialSecretDialog
        credentialSecret={credentialSecret}
        t={t}
        onClose={() => setCredentialSecret(null)}
        onCopyText={copyText}
      />
      <AWSSavedPasswordDialog
        savedPassword={savedPassword}
        t={t}
        onClose={() => setSavedPassword(null)}
        onCopyText={copyText}
      />
      <AWSCreatedPasswordDialog
        createdPassword={createdPassword}
        t={t}
        onClose={() => setCreatedPassword(null)}
        onCopyText={copyText}
      />
      {dialog}
    </AdminPageShell>
  );
}

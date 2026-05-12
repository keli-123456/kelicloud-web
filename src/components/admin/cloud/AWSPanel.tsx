import React from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ChevronDown, Eye, KeyRound, RefreshCw, RotateCcw, Server, ShieldCheck, Trash2 } from "lucide-react";

import {
  AdminPageShell,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
import {
  AdminPagination,
  useClientPagination,
} from "@/components/admin/AdminPagination";
import {
  AdminDataTable,
  AdminDataTableCell,
  AdminDataTableHead,
  AdminDataTableHeadRow,
  AdminDataTableRow,
  AdminDataTableScroll,
} from "@/components/admin/AdminDataTable";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
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
import { EC2CreateCoreSection } from "@/components/admin/cloud/AWSEC2CreateSections";
import { LightsailCreateCoreSection } from "@/components/admin/cloud/AWSLightsailCreateSections";
import {
  AWSComputeSection,
} from "@/components/admin/cloud/AWSPanelSections";
import { AWSRegionSelect } from "@/components/admin/cloud/AWSRegionSelect";
import { CloudOnboardingPanel } from "@/components/admin/cloud/CloudOnboardingPanel";
import CloudInstanceShareDialog from "@/components/admin/cloud/CloudInstanceShareDialog";
import CloudInstanceScriptDialog from "@/components/admin/cloud/CloudInstanceScriptDialog";
import {
  Badge,
  Button,
  CloudProviderHeader,
  cloudLongTextClassName,
  cloudPanelBodyTextClassName,
  cloudPanelCardClassName,
  cloudPanelDescriptionClassName,
  cloudPanelHeaderClassName,
  cloudPanelSubcardClassName,
  cloudPanelTitleClassName,
} from "@/components/admin/cloud/cloud-ui";
import { WarningAlert } from "@/components/ui/warning-alert";
import { useWarningDialog } from "@/components/ui/warning-dialog";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  getAWSCredentials,
  type AWSEC2Quota,
  type AWSCredentialRecord,
  type AWSCredentialPool,
  type AWSFollowUpTask,
} from "@/lib/cloudAws";
import {
  hasActiveCredential,
  toErrorMessage,
} from "./awsPanelUtils";
import type {
  AWSRegionOption,
  StaticLightsailBlueprintPreset,
  StaticLightsailBundlePreset,
} from "./awsPanelCatalog";
import {
  type CreatedPasswordState,
  type CreateFormState,
  type LightsailCreateFormState,
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
  const [createService, setCreateService] = React.useState<AWSCreateService>("ec2");
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
        toast.success(t("copy_success", "已复制！"));
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
    credentialRows,
    credentialGroupEditorOpen,
    setCredentialGroupEditorOpen,
    credentialGroupEditorValue,
    setCredentialGroupEditorValue,
    credentialGroupEditorIds,
    openCredentialCheckDialog,
    handleImportCredentials,
    handleSaveCredentialGroup,
    handleCheckCredentials,
    handleSubmitCredentialCheck,
    handleSelectCredential,
    handleDeleteCredential,
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
  const showOnboardingPanel = credentialRows.length === 0;

  if (initializing) {
    return (
      <AdminPageShell
        eyebrow={t("cloud.title", "云平台")}
        title="AWS"
        description={t(
          "cloud.providers.aws.description",
          "Manage AWS credentials, regional context, EC2 and Lightsail resources from one panel.",
        )}
      >
        <AdminTableSkeleton columns={6} rows={5} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="AWS"
      hideHeader
    >
      <CloudProviderHeader
        title="AWS"
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
            {t("cloud.refresh", "刷新")}
          </Button>
        }
      />

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
          importLabel={t("cloud.providers.aws.import", "导入凭证")}
          createLabel={t("cloud.providers.aws.create", "创建 EC2")}
          onImportCredential={() => setCredentialImportOpen(true)}
          onLoadResources={handleLoadResources}
          onCreate={handleOpenCreateDialog}
        />
      ) : null}

      <div className="grid min-w-0 items-stretch gap-4 xl:grid-cols-[minmax(340px,0.9fr)_minmax(380px,1.1fr)]">
        <AWSInlineCreatePanel
          t={t}
          service={createService}
          onServiceChange={setCreateService}
          activeCredential={activeCredential}
          regionOptions={regionOptions}
          regionSearchPlaceholder={regionSearchPlaceholder}
          regionSearchEmpty={regionSearchEmpty}
          ec2Form={createForm}
          setEc2Form={setCreateForm}
          ec2Submitting={createSubmitting}
          ec2ResolvedRegion={resolvedCreateRegion}
          ec2Summary={ec2CoreSummary}
          ec2ArchitectureMismatch={ec2ArchitectureMismatch}
          onEc2RegionChange={handleCreateDialogRegionChange}
          onOpenEc2Advanced={handleOpenCreateDialog}
          onCreateEc2={handleCreateInstance}
          lightsailForm={lightsailCreateForm}
          setLightsailForm={setLightsailCreateForm}
          lightsailSubmitting={lightsailCreateSubmitting}
          lightsailResolvedRegion={resolvedLightsailCreateRegion}
          lightsailSummary={lightsailCoreSummary}
          lightsailBlueprintPreset={selectedLightsailBlueprintPreset}
          lightsailBundlePreset={selectedLightsailBundlePreset}
          lightsailPlatformMismatch={lightsailPlatformMismatch}
          onLightsailRegionChange={handleLightsailDialogRegionChange}
          onOpenLightsailAdvanced={handleOpenLightsailCreateDialog}
          onCreateLightsail={handleCreateLightsailInstance}
        />
        <AWSCredentialRail
          t={t}
          activeRegion={activeRegion}
          regionOptions={regionOptions}
          regionSearchPlaceholder={regionSearchPlaceholder}
          regionSearchEmpty={regionSearchEmpty}
          credentialRows={credentialRows}
          activeCredential={activeCredential}
          activeCredentialName={activeCredentialName}
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
          onSelectCredential={handleSelectCredential}
          onViewCredentialSecret={handleViewCredentialSecret}
          onDeleteCredential={handleDeleteCredential}
        />
      </div>

      <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
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
          <AWSQuotaStrip t={t} quota={activeQuota} activeRegion={activeRegion} />
        </div>
        <AWSFollowUpSummaryPanel
          t={t}
          tasks={backgroundTasks}
          loading={backgroundTasksLoading}
          retryingId={backgroundTaskRetryingId}
          pendingCount={pendingBackgroundTaskCount}
          failedCount={failedBackgroundTaskCount}
          onOpenAll={() => setBackgroundTasksOpen(true)}
          onRefresh={() => {
            void loadBackgroundTasks();
          }}
          onRetry={(task) => {
            void handleRetryBackgroundTask(task);
          }}
        />
      </div>

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

type AWSCredentialRailProps = {
  t: TFunction;
  activeRegion: string;
  regionOptions: AWSRegionOption[];
  regionSearchPlaceholder: string;
  regionSearchEmpty: string;
  credentialRows: AWSCredentialRecord[];
  activeCredential: AWSCredentialRecord | null;
  activeCredentialName: string;
  activeContextReady: boolean;
  credentialChecking: boolean;
  credentialSecretLoading: boolean;
  pendingBackgroundTaskCount: number;
  onRegionChange: (region: string) => void | Promise<void>;
  onCheckCurrentCredential: () => void | Promise<void>;
  onCheckAllCredentials: () => void;
  onImportCredentials: () => void;
  onOpenBackgroundTasks: () => void;
  onSelectCredential: (credential: AWSCredentialRecord) => void | Promise<void>;
  onViewCredentialSecret: (credential: AWSCredentialRecord) => void | Promise<void>;
  onDeleteCredential: (credential: AWSCredentialRecord) => void | Promise<void>;
};

type AWSCreateService = "ec2" | "lightsail";

type AWSInlineCreatePanelProps = {
  t: TFunction;
  service: AWSCreateService;
  onServiceChange: (service: AWSCreateService) => void;
  activeCredential: AWSCredentialRecord | null;
  regionOptions: AWSRegionOption[];
  regionSearchPlaceholder: string;
  regionSearchEmpty: string;
  ec2Form: CreateFormState;
  setEc2Form: React.Dispatch<React.SetStateAction<CreateFormState>>;
  ec2Submitting: boolean;
  ec2ResolvedRegion: string;
  ec2Summary: string;
  ec2ArchitectureMismatch: boolean;
  onEc2RegionChange: (region: string) => void;
  onOpenEc2Advanced: () => void | Promise<void>;
  onCreateEc2: () => void | Promise<void>;
  lightsailForm: LightsailCreateFormState;
  setLightsailForm: React.Dispatch<React.SetStateAction<LightsailCreateFormState>>;
  lightsailSubmitting: boolean;
  lightsailResolvedRegion: string;
  lightsailSummary: string;
  lightsailBlueprintPreset: StaticLightsailBlueprintPreset | null;
  lightsailBundlePreset: StaticLightsailBundlePreset | null;
  lightsailPlatformMismatch: boolean;
  onLightsailRegionChange: (region: string) => void;
  onOpenLightsailAdvanced: () => void | Promise<void>;
  onCreateLightsail: () => void | Promise<void>;
};

function AWSInlineCreatePanel({
  t,
  service,
  onServiceChange,
  activeCredential,
  regionOptions,
  regionSearchPlaceholder,
  regionSearchEmpty,
  ec2Form,
  setEc2Form,
  ec2Submitting,
  ec2ResolvedRegion,
  ec2Summary,
  ec2ArchitectureMismatch,
  onEc2RegionChange,
  onOpenEc2Advanced,
  onCreateEc2,
  lightsailForm,
  setLightsailForm,
  lightsailSubmitting,
  lightsailResolvedRegion,
  lightsailSummary,
  lightsailBlueprintPreset,
  lightsailBundlePreset,
  lightsailPlatformMismatch,
  onLightsailRegionChange,
  onOpenLightsailAdvanced,
  onCreateLightsail,
}: AWSInlineCreatePanelProps) {
  const isEC2 = service === "ec2";
  const submitting = isEC2 ? ec2Submitting : lightsailSubmitting;
  const advancedHandler = isEC2 ? onOpenEc2Advanced : onOpenLightsailAdvanced;
  const createHandler = isEC2 ? onCreateEc2 : onCreateLightsail;
  const createLabel = isEC2
    ? t("cloud.providers.aws.create", "创建 EC2")
    : t("cloud.providers.aws.lightsail_create", "创建 Lightsail");
  const disabled = isEC2
    ? submitting ||
      !activeCredential ||
      !ec2Form.image_id ||
      !ec2Form.instance_type ||
      (ec2Form.root_password_mode === "custom" && !(ec2Form.root_password || "").trim()) ||
      ec2ArchitectureMismatch
    : submitting ||
      !activeCredential ||
      !lightsailForm.availability_zone ||
      !lightsailForm.blueprint_id ||
      !lightsailForm.bundle_id ||
      (lightsailForm.root_password_mode === "custom" && !(lightsailForm.root_password || "").trim()) ||
      lightsailPlatformMismatch;

  return (
    <section className={`${cloudPanelCardClassName} flex h-full min-h-[520px] flex-col`}>
      <div className={cloudPanelHeaderClassName}>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className={cloudPanelTitleClassName}>
                {createLabel}
              </div>
              <Badge color={activeCredential ? "green" : "amber"}>
                {activeCredential ? t("common.active", "已激活") : t("cloud.no_active", "未激活")}
              </Badge>
            </div>
            <div className={cloudPanelDescriptionClassName}>
              {t("cloud.providers.aws.inline_create_description", "当前可直接选择 EC2 或 Lightsail；核心字段默认展开，完整高级配置留在完整创建向导。")}
            </div>
          </div>
          <Button variant="outline" size="1" onClick={() => { void advancedHandler(); }} disabled={!activeCredential}>
            {t("cloud.advanced_options", "高级")}
          </Button>
        </div>
      </div>
      <div className="grid gap-4 p-4">
        <SegmentedControl.Root
          value={service}
          onValueChange={(value) => onServiceChange(value as AWSCreateService)}
          size="1"
          className="w-full justify-start"
        >
          <SegmentedControl.Item value="ec2">
            {t("cloud.providers.aws.ec2_short", "EC2")}
          </SegmentedControl.Item>
          <SegmentedControl.Item value="lightsail">
            {t("cloud.providers.aws.lightsail_short", "Lightsail")}
          </SegmentedControl.Item>
        </SegmentedControl.Root>

        {isEC2 ? (
          <>
            <EC2CreateCoreSection
              t={t}
              form={ec2Form}
              setForm={setEc2Form}
              summary={ec2Summary}
              resolvedRegion={ec2ResolvedRegion}
              regionOptions={regionOptions}
              regionSearchPlaceholder={regionSearchPlaceholder}
              regionSearchEmpty={regionSearchEmpty}
              onRegionChange={onEc2RegionChange}
              singleColumn
            />
            {ec2ArchitectureMismatch ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                {t("cloud.providers.aws.ec2_architecture_inline_warning", "选择的 AMI 架构与实例类型不匹配，请调整后再试。")}
              </div>
            ) : null}
          </>
        ) : (
          <LightsailCreateCoreSection
            t={t}
            form={lightsailForm}
            setForm={setLightsailForm}
            summary={lightsailSummary}
            resolvedRegion={lightsailResolvedRegion}
            regionOptions={regionOptions}
            regionSearchPlaceholder={regionSearchPlaceholder}
            regionSearchEmpty={regionSearchEmpty}
            onRegionChange={onLightsailRegionChange}
            selectedBlueprintPreset={lightsailBlueprintPreset}
            selectedBundlePreset={lightsailBundlePreset}
            platformMismatch={lightsailPlatformMismatch}
            singleColumn
          />
        )}
      </div>
      <div className="mt-auto flex items-center justify-end gap-2 border-t border-border px-4 py-3">
        <Button
          onClick={() => { void createHandler(); }}
          disabled={disabled}
        >
          {submitting ? t("cloud.creating", "正在创建...") : createLabel}
        </Button>
      </div>
    </section>
  );
}

function AWSCredentialRail({
  t,
  activeRegion,
  regionOptions,
  regionSearchPlaceholder,
  regionSearchEmpty,
  credentialRows,
  activeCredential,
  activeCredentialName,
  activeContextReady,
  credentialChecking,
  credentialSecretLoading,
  pendingBackgroundTaskCount,
  onRegionChange,
  onCheckCurrentCredential,
  onCheckAllCredentials,
  onImportCredentials,
  onOpenBackgroundTasks,
  onSelectCredential,
  onViewCredentialSecret,
  onDeleteCredential,
}: AWSCredentialRailProps) {
  const credentialPagination = useClientPagination(credentialRows, {
    initialPageSize: 5,
  });
  const visibleCredentialRows = credentialPagination.pageItems;
  const [credentialPoolOpen, setCredentialPoolOpen] = React.useState(true);

  return (
    <aside className={`min-w-0 ${cloudPanelCardClassName} flex h-full min-h-[520px] flex-col`}>
      <div className={cloudPanelHeaderClassName}>
        <div className={cloudPanelTitleClassName}>
          {t("cloud.providers.aws.credentials", "凭证")}
        </div>
        <div className={cloudPanelDescriptionClassName}>
          {t(
            "cloud.providers.aws.credentials_description",
            "Save AWS access keys here. Pick one credential first, then switch region and operate EC2 or Lightsail from the active context below.",
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <div className={cloudPanelSubcardClassName}>
          <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            {t("cloud.providers.aws.active_credential_label", "当前凭证")}
          </div>
          <div className={`mt-1 text-sm font-semibold text-foreground ${cloudLongTextClassName}`}>
            {activeCredentialName || "-"}
          </div>
          {activeCredential ? (
            <div className="mt-2 flex flex-wrap gap-2">
               <Badge color={activeCredential.last_status === "healthy" ? "green" : activeCredential.last_status === "failed" ? "red" : "amber"}>
                {activeCredential.last_status || "unknown"}
              </Badge>
              {activeCredential.account_id ? (
                <Badge color="blue">{activeCredential.account_id}</Badge>
              ) : null}
            </div>
          ) : null}
        </div>

        <AWSRegionSelect
          value={activeRegion || undefined}
          options={regionOptions}
          placeholder={t("cloud.providers.aws.active_region", "当前区域")}
          searchPlaceholder={regionSearchPlaceholder}
          emptyLabel={regionSearchEmpty}
          onValueChange={(value) => {
            void onRegionChange(value);
          }}
        />

        <div className="grid gap-2">
          <Button
            size="1"
            className="w-full justify-center"
            onClick={() => {
              void onCheckCurrentCredential();
            }}
            disabled={!activeContextReady || credentialChecking}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            {t("cloud.providers.aws.check_current", "检查当前")}
          </Button>
          <Button
            variant="outline"
            size="1"
            className="w-full justify-center"
            onClick={onImportCredentials}
          >
            <KeyRound className="mr-2 h-4 w-4" />
            {t("cloud.providers.aws.import", "导入凭证")}
          </Button>
          <Button
            variant="outline"
            size="1"
            className="w-full justify-center"
            onClick={onOpenBackgroundTasks}
          >
            <Eye className="mr-2 h-4 w-4" />
            {t("cloud.providers.aws.background_tasks", "后台任务")}
            {pendingBackgroundTaskCount > 0 ? ` (${pendingBackgroundTaskCount})` : ""}
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-muted/20 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                {t("cloud.providers.aws.credential_pool", "凭证池")}
              </div>
              <div className="mt-1 truncate text-sm font-semibold text-foreground">
                {t("cloud.providers.aws.credential_count", {
                  count: credentialRows.length,
                  defaultValue: "{{count}} credentials",
                })}
              </div>
            </div>
            <Button
              variant="outline"
              size="1"
              onClick={() => setCredentialPoolOpen((open) => !open)}
            >
              <ChevronDown className={`mr-1.5 h-3.5 w-3.5 transition-transform ${credentialPoolOpen ? "rotate-180" : ""}`} />
              {credentialPoolOpen ? t("common.collapse", "Collapse") : t("cloud.tokens.manage", "管理")}
            </Button>
          </div>

          {credentialPoolOpen ? (
            <div className="mt-3 flex min-h-0 flex-1 flex-col border-t border-border pt-3">
              <Button
                variant="ghost"
                size="1"
                className="w-full justify-center"
                onClick={onCheckAllCredentials}
                disabled={credentialChecking || !credentialRows.length}
              >
                {t("cloud.tokens.check_all", "检查全部凭证")}
              </Button>
              <div className="mt-2 min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
                {credentialRows.length ? (
                  <AdminDataTableScroll className="rounded-lg border border-border">
                    <AdminDataTable minWidth={700}>
                      <thead>
                        <AdminDataTableHeadRow>
                          <AdminDataTableHead>{t("cloud.tokens.table.name", "名称")}</AdminDataTableHead>
                          <AdminDataTableHead>{t("cloud.tokens.group", "分组")}</AdminDataTableHead>
                          <AdminDataTableHead>{t("cloud.tokens.quota", "配额")}</AdminDataTableHead>
                          <AdminDataTableHead>{t("cloud.tokens.table.status", "状态")}</AdminDataTableHead>
                          <AdminDataTableHead align="right" sticky="right">
                            {t("common.action", "操作")}
                          </AdminDataTableHead>
                        </AdminDataTableHeadRow>
                      </thead>
                      <tbody>
                        {visibleCredentialRows.map((credential) => (
                          <AdminDataTableRow key={credential.id}>
                            <AdminDataTableCell className={`font-semibold text-foreground ${cloudLongTextClassName}`}>
                              <span className="block max-w-44 truncate">{credential.name}</span>
                            </AdminDataTableCell>
                            <AdminDataTableCell className={`text-xs text-muted-foreground ${cloudLongTextClassName}`}>
                              <span className="block max-w-36 truncate">
                                {credential.group || t("cloud.tokens.no_group", "未分组")}
                              </span>
                            </AdminDataTableCell>
                            <AdminDataTableCell className={`text-xs text-muted-foreground ${cloudLongTextClassName}`}>
                              {formatAwsCredentialQuota(credential)}
                            </AdminDataTableCell>
                            <AdminDataTableCell>
                              <Badge color={credential.is_active ? "blue" : credential.last_status === "healthy" ? "green" : credential.last_status === "failed" ? "red" : "gray"}>
                                {credential.is_active ? t("cloud.tokens.active", "已激活") : credential.last_status || "-"}
                              </Badge>
                            </AdminDataTableCell>
                            <AdminDataTableCell align="right" sticky="right">
                              <AdminRowActions
                                contentClassName="min-w-44"
                                actions={[
                                  {
                                    label: credential.is_active
                                      ? t("cloud.tokens.current", "当前")
                                      : t("cloud.tokens.use", "使用"),
                                    icon: <Server className="h-4 w-4" />,
                                    disabled: credential.is_active,
                                    onSelect: () => {
                                      void onSelectCredential(credential);
                                    },
                                  },
                                  {
                                    label: t("cloud.view", "查看"),
                                    icon: <Eye className="h-4 w-4" />,
                                    disabled: credentialSecretLoading,
                                    onSelect: () => {
                                      void onViewCredentialSecret(credential);
                                    },
                                  },
                                  {
                                    label: t("cloud.delete", "删除"),
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
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                    {t("cloud.providers.aws.credentials_empty", "还没有保存 AWS 凭证")}
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
                itemLabel={t("admin.pagination.credentials", { defaultValue: "凭证" })}
                compact
                className="-mx-3 mt-2 rounded-b-lg"
              />
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

type AWSFollowUpSummaryPanelProps = {
  t: TFunction;
  tasks: AWSFollowUpTask[];
  loading: boolean;
  retryingId: number | null;
  pendingCount: number;
  failedCount: number;
  onOpenAll: () => void;
  onRefresh: () => void;
  onRetry: (task: AWSFollowUpTask) => void;
};

function AWSFollowUpSummaryPanel({
  t,
  tasks,
  loading,
  retryingId,
  pendingCount,
  failedCount,
  onOpenAll,
  onRefresh,
  onRetry,
}: AWSFollowUpSummaryPanelProps) {
  const visibleTasks = tasks.slice(0, 5);

  return (
    <aside className={`min-w-0 self-start ${cloudPanelCardClassName}`}>
      <div className={cloudPanelHeaderClassName}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={cloudPanelTitleClassName}>
              {t("cloud.providers.aws.follow_up_tasks_label", "后续任务")}
            </div>
            <div className={cloudPanelDescriptionClassName}>
              {t(
                "cloud.providers.aws.follow_up_tasks_description",
                "Lightsail 密码、静态 IP、脚本安装和失败重试都在这里作为一等状态展示。",
              )}
            </div>
          </div>
          <Badge color={failedCount > 0 ? "red" : pendingCount > 0 ? "amber" : "green"}>
            {failedCount > 0
              ? t("cloud.providers.aws.failed_tasks_hint", {
                count: failedCount,
                defaultValue: "{{count}} failed",
              })
              : t("cloud.providers.aws.pending_tasks_hint", {
                count: pendingCount,
                defaultValue: "{{count}} pending",
              })}
          </Badge>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <AWSMiniMetric
            label={t("cloud.providers.aws.pending", "待处理")}
            value={pendingCount}
            tone={pendingCount > 0 ? "amber" : "slate"}
          />
          <AWSMiniMetric
            label={t("cloud.providers.aws.failed", "失败")}
            value={failedCount}
            tone={failedCount > 0 ? "red" : "slate"}
          />
        </div>

        {visibleTasks.length > 0 ? (
          <div className="space-y-2">
            {visibleTasks.map((task) => (
              <div key={task.id} className={cloudPanelSubcardClassName}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`text-sm font-semibold text-foreground ${cloudLongTextClassName}`}>
                      #{task.id} · {task.task_type || "-"}
                    </div>
                    <div className={`mt-1 text-xs text-muted-foreground ${cloudLongTextClassName}`}>
                      {task.resource_id || "-"} · {task.region || "-"}
                    </div>
                  </div>
                  <Badge color={getAwsTaskTone(task.status)}>{task.status || "-"}</Badge>
                </div>
                {task.last_error ? (
                  <div className={`mt-2 rounded-md bg-red-50 px-2 py-1 text-xs leading-5 text-red-700 dark:bg-red-950/30 dark:text-red-300 ${cloudLongTextClassName}`}>
                    {task.last_error}
                  </div>
                ) : null}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {task.attempts}/{task.max_attempts || "-"} · {formatAwsPanelDate(task.next_run_at || task.created_at)}
                  </span>
                  {task.status === "failed" || task.status === "retryable" ? (
                    <Button
                      variant="outline"
                      size="1"
                      disabled={retryingId === task.id}
                      onClick={() => onRetry(task)}
                    >
                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
                      {t("cloud.providers.aws.retry_task", "重试")}
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
            <div className="text-sm font-semibold text-foreground">
              {loading
                ? t("cloud.loading", "正在加载云资源...")
                : t("cloud.providers.aws.no_follow_up_tasks", "暂无后续任务")}
            </div>
            <p className={cloudPanelBodyTextClassName}>
              {t(
                "cloud.providers.aws.no_follow_up_tasks_description",
                "创建实例、获取密码或安装 Agent 后，有等待和重试的任务会显示在这里。",
              )}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="1" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4${loading ? " animate-spin" : ""}`} />
            {t("cloud.refresh", "刷新")}
          </Button>
          <Button size="1" onClick={onOpenAll}>
            {t("cloud.providers.aws.view_all_tasks", "查看全部")}
          </Button>
        </div>
      </div>
    </aside>
  );
}

function AWSQuotaStrip({
  t,
  quota,
  activeRegion,
}: {
  t: TFunction;
  quota: AWSEC2Quota | null;
  activeRegion: string;
}) {
  if (!quota) {
    return null;
  }

  return (
    <section className={cloudPanelCardClassName}>
      <div className={cloudPanelHeaderClassName}>
        <div className={cloudPanelTitleClassName}>
          {t("cloud.providers.aws.quota_summary", "配额使用")}
        </div>
        <div className={cloudPanelDescriptionClassName}>
          {activeRegion || quota.region || "-"}
        </div>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
        <AWSQuotaMeter
          label={t("cloud.providers.aws.running_vcpu", "vCPU 运行中")}
          value={quota.running_standard_vcpus}
          max={quota.max_standard_vcpus}
        />
        <AWSQuotaMeter
          label={t("cloud.providers.aws.running_instances", "运行实例")}
          value={quota.running_instances}
          max={quota.max_instances}
        />
        <AWSQuotaMeter
          label={t("cloud.providers.aws.elastic_ips", "弹性 IP")}
          value={quota.associated_elastic_ips}
          max={quota.max_elastic_ips}
        />
        <AWSQuotaMeter
          label={t("cloud.providers.aws.total_instances", "实例总数")}
          value={quota.total_instances}
          max={quota.max_instances}
        />
      </div>
    </section>
  );
}

function AWSQuotaMeter({
  label,
  value,
  max,
}: {
  label: React.ReactNode;
  value: number;
  max: number;
}) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div className="rounded-lg border border-border bg-muted/25 px-3 py-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground tabular-nums">{value}/{max || "-"}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-blue-600"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function AWSMiniMetric({
  label,
  value,
  tone,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  tone: "amber" | "red" | "slate";
}) {
  const toneClassName =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
        : "border-border bg-muted/30 text-foreground";

  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClassName}`}>
      <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold leading-6 tabular-nums">{value}</div>
    </div>
  );
}

function getAwsTaskTone(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "failed" || normalized === "error") return "red";
  if (normalized === "pending" || normalized === "retryable") return "amber";
  if (normalized === "completed" || normalized === "success") return "green";
  return "gray";
}

function formatAwsCredentialQuota(credential: AWSCredentialRecord) {
  const quota = credential.ec2_quota;
  if (!quota) {
    return "-";
  }

  return `${quota.running_instances}/${quota.max_instances || "-"} instances · ${quota.running_standard_vcpus}/${quota.max_standard_vcpus || "-"} vCPU`;
}

function formatAwsPanelDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

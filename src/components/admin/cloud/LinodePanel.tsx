import React from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Eye,
  Plus,
  RefreshCw,
} from "lucide-react";

import {
  AdminPageShell,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
import { CloudOnboardingPanel } from "@/components/admin/cloud/CloudOnboardingPanel";
import CloudInstanceShareDialog from "@/components/admin/cloud/CloudInstanceShareDialog";
import CloudInstanceScriptDialog, { type CloudInstanceScriptTarget } from "@/components/admin/cloud/CloudInstanceScriptDialog";
import { LinodeCreateDialog } from "@/components/admin/cloud/LinodeCreateDialog";
import {
  LinodeCreatedPasswordDialog,
  LinodeSavedPasswordDialog,
  LinodeTokenSecretDialog,
} from "@/components/admin/cloud/LinodeCredentialDialogs";
import { LinodeInstanceDetailDialog } from "@/components/admin/cloud/LinodeInstanceDetailDialog";
import { LinodePromoDialog } from "@/components/admin/cloud/LinodePromoDialog";
import {
  LinodeTokenGroupDialog,
  LinodeTokenImportDialog,
} from "@/components/admin/cloud/LinodeTokenDialogs";
import { LinodeInstancesSection } from "@/components/admin/cloud/LinodeInstancesSection";
import { LinodeTokensSection } from "@/components/admin/cloud/LinodeTokensSection";
import {
  Badge,
  Button,
  CloudProviderHeader,
  Select,
  TextField,
  cloudPanelCardClassName,
  cloudPanelDescriptionClassName,
  cloudPanelFieldLabelClassName,
  cloudPanelHeaderClassName,
  cloudPanelTitleClassName,
} from "@/components/admin/cloud/cloud-ui";
import { WarningAlert } from "@/components/ui/warning-alert";
import { useWarningDialog } from "@/components/ui/warning-dialog";
import {
  getLinodeTokens,
  type LinodeCatalog,
  type LinodeInstance,
  type LinodeTokenPool,
  type LinodeTokenRecord,
} from "@/lib/cloudLinode";
import {
  getActiveToken,
  getDefaultAutoConnectGroup,
  getLinodeRegionOptionLabel,
  getLinodeTypeOptionLabel,
  hasActiveToken,
  toErrorMessage,
  type CreatedPasswordState,
  type CreateFormState,
} from "./linodePanelUtils";
import { useLinodeCreateInstance } from "./useLinodeCreateInstance";
import { useLinodeInstanceActions } from "./useLinodeInstanceActions";
import { useLinodeInstancePasswords } from "./useLinodeInstancePasswords";
import { useLinodeInstanceShare } from "./useLinodeInstanceShare";
import { useLinodePanelResources } from "./useLinodePanelResources";
import { useLinodePromoCode } from "./useLinodePromoCode";
import { useLinodeTokenActivation } from "./useLinodeTokenActivation";
import { useLinodeTokenDeletion } from "./useLinodeTokenDeletion";
import { useLinodeTokenGroupSave } from "./useLinodeTokenGroupSave";
import { useLinodeTokenHealth } from "./useLinodeTokenHealth";
import { useLinodeTokenImport } from "./useLinodeTokenImport";
import { useLinodeTokenSecret } from "./useLinodeTokenSecret";
import { useLinodeTokenSelection } from "./useLinodeTokenSelection";

export default function LinodePanel() {
  const { t } = useTranslation();
  const { confirm, dialog } = useWarningDialog();

  const [tokenPool, setTokenPool] = React.useState<LinodeTokenPool | null>(null);
  const {
    initializing,
    setInitializing,
    panelLoading,
    account,
    setAccount,
    catalog,
    instances,
    error,
    setError,
    resourcesLoaded,
    loadPanelData,
    clearResourceData,
  } = useLinodePanelResources();
  const [scriptTarget, setScriptTarget] = React.useState<CloudInstanceScriptTarget | null>(null);
  const [createdPassword, setCreatedPassword] = React.useState<CreatedPasswordState | null>(null);
  const activeToken = React.useMemo(() => getActiveToken(tokenPool), [tokenPool]);
  const defaultCreateGroup = React.useMemo(
    () => getDefaultAutoConnectGroup("linode", activeToken?.name || ""),
    [activeToken?.name],
  );
  const {
    selectedTokenIds,
    setSelectedTokenIds,
    selectedTokens,
    tokenRows,
    existingTokenGroups,
    allTokensSelected,
    someTokensSelected,
    tokenGroupEditorOpen,
    setTokenGroupEditorOpen,
    tokenGroupEditorValue,
    setTokenGroupEditorValue,
    tokenGroupEditorIds,
    setTokenGroupEditorIds,
    removeTokenSelection,
    toggleTokenSelection,
    openTokenGroupEditor,
  } = useLinodeTokenSelection(tokenPool);
  const {
    tokenSecret,
    setTokenSecret,
    tokenSecretLoading,
    handleViewTokenSecret,
  } = useLinodeTokenSecret();
  const {
    savedPassword,
    setSavedPassword,
    passwordLoading,
    handleViewPassword,
  } = useLinodeInstancePasswords();

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
    sharePassword,
    setSharePassword,
    shareUrl,
    handleShareOpenChange,
    handleOpenShareDialog,
    handleSaveShare,
    handleDeleteShare,
    handleCopyShareLink,
  } = useLinodeInstanceShare({
    t,
    confirm,
    activeToken,
    copyText,
  });
  const {
    promoOpen,
    setPromoOpen,
    promoCode,
    setPromoCode,
    promoSubmitting,
    handlePromoOpenChange,
    handleRedeemPromoCode,
  } = useLinodePromoCode({
    t,
    setAccount,
    setError,
  });

  const {
    createOpen,
    setCreateOpen,
    createSubmitting,
    createCatalogLoading,
    createForm,
    setCreateForm,
    prepareCreateForm,
    handleCreateInstance,
    handleOpenCreateDialog,
  } = useLinodeCreateInstance({
    t,
    catalog,
    activeToken,
    defaultCreateGroup,
    setCreatedPassword,
    loadPanelData,
  });
  const {
    detailInstance,
    detailData,
    detailLoading,
    detailActionLoading,
    resizeTargetType,
    setResizeTargetType,
    detailPasswordState,
    setDetailPasswordState,
    rebuildImage,
    setRebuildImage,
    rebuildUserData,
    setRebuildUserData,
    rebuildBooted,
    setRebuildBooted,
    clearInstanceDetailData,
    closeInstanceDetail,
    loadInstanceDetail,
    handleInstanceAction,
    handleDetailInstanceAction,
    handleDeleteInstance,
  } = useLinodeInstanceActions({
    t,
    confirm,
    catalogImages: catalog?.images,
    setCreatedPassword,
    loadPanelData,
  });

  const clearPanelState = React.useCallback(() => {
    clearResourceData();
    clearInstanceDetailData();
  }, [clearInstanceDetailData, clearResourceData]);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const nextPool = await getLinodeTokens();
        if (cancelled) return;
        setTokenPool(nextPool);
        if (!hasActiveToken(nextPool)) {
          clearPanelState();
        } else {
          setError("");
        }
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
  }, [clearPanelState, loadPanelData, setError, setInitializing]);

  const passwordStorageEnabled = Boolean(tokenPool?.password_storage_enabled);
  const typePriceMap = React.useMemo(
    () => new Map((catalog?.types || []).map((type) => [type.id, type])),
    [catalog?.types],
  );

  const shouldPreserveLoadedResources = React.useCallback(
    (nextPool: LinodeTokenPool) =>
      resourcesLoaded && Boolean(activeToken?.id) && nextPool.active_token_id === activeToken?.id,
    [activeToken?.id, resourcesLoaded],
  );

  const syncTokenPoolAfterDelete = React.useCallback((
    nextPool: LinodeTokenPool,
    removedTokenIds: string[],
  ) => {
    setTokenPool(nextPool);
    removeTokenSelection(removedTokenIds);
    if (!hasActiveToken(nextPool) || !shouldPreserveLoadedResources(nextPool)) {
      clearPanelState();
    }
  }, [clearPanelState, removeTokenSelection, shouldPreserveLoadedResources]);
  const {
    tokenImportOpen,
    setTokenImportOpen,
    tokenImportText,
    setTokenImportText,
    tokenImportGroup,
    setTokenImportGroup,
    tokenImportSaving,
    handleImportTokens,
  } = useLinodeTokenImport({
    t,
    tokenPool,
    setTokenPool,
    shouldPreserveLoadedResources,
    clearPanelState,
  });
  const {
    tokenGroupSaving,
    handleSaveTokenGroup,
  } = useLinodeTokenGroupSave({
    t,
    tokenPool,
    setTokenPool,
    tokenRows,
    tokenGroupEditorIds,
    setTokenGroupEditorOpen,
    tokenGroupEditorValue,
    setTokenGroupEditorValue,
    setTokenGroupEditorIds,
  });
  const {
    tokenChecking,
    handleCheckTokens,
  } = useLinodeTokenHealth({
    t,
    setTokenPool,
    shouldPreserveLoadedResources,
    clearPanelState,
  });
  const {
    handleSelectToken,
  } = useLinodeTokenActivation({
    t,
    setTokenPool,
    loadPanelData,
    clearPanelState,
  });
  const {
    handleDeleteToken,
    handleDeleteSelectedTokens,
  } = useLinodeTokenDeletion({
    t,
    confirm,
    selectedTokens,
    setSelectedTokenIds,
    syncTokenPoolAfterDelete,
  });
  const tokenSaving = tokenImportSaving || tokenGroupSaving;

  const handleOpenScriptDialog = React.useCallback((instance: LinodeInstance) => {
    setScriptTarget({
      providerLabel: t("cloud.providers.linode.title", "Linode"),
      instanceName: instance.label || String(instance.id),
      instanceIdentifier: String(instance.id),
      addresses: [...instance.ipv4, instance.ipv6].filter(Boolean),
      groupHint: getDefaultAutoConnectGroup("linode", activeToken?.name || ""),
    });
  }, [activeToken?.name, t]);
  const showOnboardingPanel = tokenRows.length === 0;

  const handleLoadResources = async () => {
    if (!activeToken) {
      return;
    }
    await loadPanelData();
  };

  if (initializing) {
    return (
      <AdminPageShell
        eyebrow={t("cloud.title", "Cloud")}
        title={t("cloud.providers.linode.title", "Linode")}
        description={t(
          "cloud.providers.linode.description",
          "Manage Linode access tokens, inspect instance inventory, and operate compute resources from one panel.",
        )}
      >
        <AdminTableSkeleton columns={6} rows={5} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
        title={t("cloud.providers.linode.title", "Linode")}
        hideHeader
      >
      <CloudProviderHeader
        title={t("cloud.providers.linode.title", "Linode")}
        actions={
          <>
            <Button
              variant="outline"
              size="1"
              onClick={() => {
                window.location.reload();
              }}
              disabled={panelLoading || tokenChecking}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("cloud.refresh", "Refresh")}
            </Button>
            <Button
              variant="outline"
              size="1"
              onClick={() => {
                void handleLoadResources();
              }}
              disabled={!activeToken || panelLoading}
            >
              <Eye className="mr-2 h-4 w-4" />
              {t("cloud.view", "View")}
            </Button>
            <Button
              size="1"
              onClick={() => {
                void handleOpenCreateDialog();
              }}
              disabled={!activeToken}
              aria-busy={createCatalogLoading}
            >
              {createCatalogLoading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {t("cloud.providers.linode.create", "Create Instance")}
            </Button>
          </>
        }
      />

      {error ? (
        <WarningAlert tone="warning" description={error} />
      ) : null}

      {account?.restricted ? (
        <WarningAlert
          tone="destructive"
          description={t(
            "cloud.providers.linode.restricted_account_help",
            "This Linode account is currently restricted. New health checks and instance operations may continue to fail until Linode removes the restriction.",
          )}
        />
      ) : null}

      {!passwordStorageEnabled ? (
        <WarningAlert
          tone="info"
          description={t(
            "cloud.password.storage_disabled_help",
            "Set KOMARI_CLOUD_SECRET_KEY on the server to save root passwords for later viewing in the instance list.",
          )}
        />
      ) : null}

      {showOnboardingPanel ? (
        <CloudOnboardingPanel
          t={t}
          providerName={t("cloud.providers.linode.title", "Linode")}
          credentialDone={tokenRows.length > 0}
          contextReady={Boolean(activeToken)}
          resourcesLoaded={resourcesLoaded}
          resourceLoading={panelLoading}
          createLoading={createCatalogLoading}
          canLoadResources={Boolean(activeToken)}
          canCreate={Boolean(activeToken)}
          credentialTitle={t("cloud.onboarding.token_title", "导入 API 令牌")}
          credentialDescription={t(
            "cloud.providers.linode.onboarding_token_description",
            "先添加一个或多个 Linode 个人访问令牌，再选择当前用于操作的账户。",
          )}
          resourceDescription={t(
            "cloud.providers.linode.onboarding_resource_description",
            "按需拉取 Linode 实例和账号信息，切换令牌时页面会更快、更可控。",
          )}
          createTitle={t("cloud.providers.linode.onboarding_create_title", "创建或管理 Linode 实例")}
          createLabel={t("cloud.providers.linode.create", "Create Instance")}
          importLabel={t("cloud.tokens.import", "Import Tokens")}
          onImportCredential={() => setTokenImportOpen(true)}
          onLoadResources={() => {
            void handleLoadResources();
          }}
          onCreate={() => {
            void handleOpenCreateDialog();
          }}
        />
      ) : null}

      <div className="grid min-w-0 items-stretch gap-4 xl:grid-cols-[minmax(340px,0.9fr)_minmax(380px,1.1fr)]">
        <LinodeInlineCreatePanel
          t={t}
          activeToken={activeToken}
          catalog={catalog}
          form={createForm}
          setForm={setCreateForm}
          submitting={createSubmitting}
          catalogLoading={createCatalogLoading}
          onPrepare={prepareCreateForm}
          onOpenAdvanced={handleOpenCreateDialog}
          onCreate={handleCreateInstance}
        />

        <LinodeTokensSection
          t={t}
          tokenPool={tokenPool}
          tokenRows={tokenRows}
          selectedTokenIds={selectedTokenIds}
          setSelectedTokenIds={setSelectedTokenIds}
          selectedTokens={selectedTokens}
          allTokensSelected={allTokensSelected}
          someTokensSelected={someTokensSelected}
          tokenChecking={tokenChecking}
          tokenSecretLoading={tokenSecretLoading}
          promoSubmitting={promoSubmitting}
          promoDisabled={!activeToken || panelLoading || promoSubmitting || Boolean(account?.restricted)}
          onOpenPromo={() => setPromoOpen(true)}
          onCheckTokens={handleCheckTokens}
          onOpenTokenGroupEditor={openTokenGroupEditor}
          onDeleteSelectedTokens={handleDeleteSelectedTokens}
          onOpenTokenImport={() => setTokenImportOpen(true)}
          onToggleTokenSelection={toggleTokenSelection}
          onSelectToken={handleSelectToken}
          onViewTokenSecret={handleViewTokenSecret}
          onDeleteToken={handleDeleteToken}
        />
      </div>

      <LinodeInstancesSection
        t={t}
        instances={instances}
        panelLoading={panelLoading}
        error={error}
        tokenPool={tokenPool}
        resourcesLoaded={resourcesLoaded}
        typePriceMap={typePriceMap}
        passwordStorageEnabled={passwordStorageEnabled}
        passwordLoading={passwordLoading}
        onLoadInstanceDetail={loadInstanceDetail}
        onViewPassword={handleViewPassword}
        onInstanceAction={handleInstanceAction}
        onOpenScriptDialog={handleOpenScriptDialog}
        onOpenShareDialog={handleOpenShareDialog}
        onDeleteInstance={handleDeleteInstance}
      />

      <LinodeTokenImportDialog
        t={t}
        open={tokenImportOpen}
        onOpenChange={setTokenImportOpen}
        tokenImportGroup={tokenImportGroup}
        setTokenImportGroup={setTokenImportGroup}
        tokenImportText={tokenImportText}
        setTokenImportText={setTokenImportText}
        existingTokenGroups={existingTokenGroups}
        saving={tokenSaving}
        onImport={handleImportTokens}
      />

      <LinodeTokenGroupDialog
        t={t}
        open={tokenGroupEditorOpen}
        onOpenChange={setTokenGroupEditorOpen}
        tokenGroupEditorValue={tokenGroupEditorValue}
        setTokenGroupEditorValue={setTokenGroupEditorValue}
        tokenGroupEditorIds={tokenGroupEditorIds}
        existingTokenGroups={existingTokenGroups}
        saving={tokenSaving}
        onSave={handleSaveTokenGroup}
      />

      <LinodeCreateDialog
        t={t}
        open={createOpen}
        onOpenChange={setCreateOpen}
        catalog={catalog}
        form={createForm}
        setForm={setCreateForm}
        submitting={createSubmitting}
        onCreate={handleCreateInstance}
      />

      <LinodePromoDialog
        t={t}
        open={promoOpen}
        onOpenChange={handlePromoOpenChange}
        promoCode={promoCode}
        onPromoCodeChange={setPromoCode}
        submitting={promoSubmitting}
        onRedeem={handleRedeemPromoCode}
      />

      <LinodeInstanceDetailDialog
        t={t}
        instance={detailInstance}
        detailData={detailData}
        loading={detailLoading}
        actionLoading={detailActionLoading}
        catalog={catalog}
        passwordStorageEnabled={passwordStorageEnabled}
        passwordLoading={passwordLoading}
        resizeTargetType={resizeTargetType}
        setResizeTargetType={setResizeTargetType}
        detailPasswordState={detailPasswordState}
        setDetailPasswordState={setDetailPasswordState}
        rebuildImage={rebuildImage}
        setRebuildImage={setRebuildImage}
        rebuildUserData={rebuildUserData}
        setRebuildUserData={setRebuildUserData}
        rebuildBooted={rebuildBooted}
        setRebuildBooted={setRebuildBooted}
        onClose={closeInstanceDetail}
        onViewPassword={handleViewPassword}
        onAction={handleDetailInstanceAction}
      />

      <LinodeTokenSecretDialog
        t={t}
        tokenSecret={tokenSecret}
        onClose={() => setTokenSecret(null)}
        copyText={copyText}
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
        sharePassword={sharePassword}
        shareManagedSSHKey={false}
        shareUrl={shareUrl}
        onTitleChange={setShareTitle}
        onNoteChange={setShareNote}
        onAccessPolicyChange={setShareAccessPolicy}
        onExpiresAtChange={setShareExpiresAt}
        onSharePasswordChange={setSharePassword}
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

      <LinodeSavedPasswordDialog
        t={t}
        savedPassword={savedPassword}
        onClose={() => setSavedPassword(null)}
        copyText={copyText}
      />

      <LinodeCreatedPasswordDialog
        t={t}
        createdPassword={createdPassword}
        onClose={() => setCreatedPassword(null)}
        copyText={copyText}
      />
      {dialog}
    </AdminPageShell>
  );
}

type LinodeInlineCreatePanelProps = {
  t: TFunction;
  activeToken: LinodeTokenRecord | null;
  catalog: LinodeCatalog | null;
  form: CreateFormState;
  setForm: React.Dispatch<React.SetStateAction<CreateFormState>>;
  submitting: boolean;
  catalogLoading: boolean;
  onPrepare: () => Promise<LinodeCatalog | null>;
  onOpenAdvanced: () => void | Promise<void>;
  onCreate: () => void | Promise<void>;
};

function LinodeInlineCreatePanel({
  t,
  activeToken,
  catalog,
  form,
  setForm,
  submitting,
  catalogLoading,
  onPrepare,
  onOpenAdvanced,
  onCreate,
}: LinodeInlineCreatePanelProps) {
  React.useEffect(() => {
    if (!activeToken) return;
    void onPrepare();
  }, [activeToken, onPrepare]);

  const disabled = !activeToken || catalogLoading;

  return (
    <section className={`${cloudPanelCardClassName} flex h-full min-h-[520px] flex-col`}>
      <div className={cloudPanelHeaderClassName}>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className={cloudPanelTitleClassName}>
                {t("cloud.providers.linode.create", "Create Instance")}
              </div>
              <Badge color={activeToken ? "green" : "amber"}>
                {activeToken ? t("cloud.tokens.active", "Active") : t("cloud.no_active", "No active")}
              </Badge>
            </div>
            <div className={cloudPanelDescriptionClassName}>
              {t("cloud.create_inline_description", "Core creation fields stay open here. Use advanced options only when you need extra network or bootstrap details.")}
            </div>
          </div>
          <Button variant="outline" size="1" onClick={() => { void onOpenAdvanced(); }} disabled={!activeToken}>
            {t("cloud.advanced_options", "Advanced")}
          </Button>
        </div>
      </div>
      <div className="grid gap-3 p-4">
        <div>
          <label className={cloudPanelFieldLabelClassName}>{t("cloud.form.region", "Region")}</label>
          <Select.Root
            value={form.region}
            disabled={disabled}
            onValueChange={(value) => setForm((previous) => ({ ...previous, region: value }))}
          >
            <Select.Trigger placeholder={catalogLoading ? t("common.loading", "Loading") : t("cloud.form.region_placeholder", "Select a region")} />
            <Select.Content>
              {(catalog?.regions || []).map((region) => (
                <Select.Item key={region.id} value={region.id}>
                  {getLinodeRegionOptionLabel(region, t)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
        <div>
          <label className={cloudPanelFieldLabelClassName}>{t("cloud.form.size", "Size")}</label>
          <Select.Root
            value={form.type}
            disabled={disabled}
            onValueChange={(value) => setForm((previous) => ({ ...previous, type: value }))}
          >
            <Select.Trigger placeholder={catalogLoading ? t("common.loading", "Loading") : t("cloud.form.size_placeholder", "Select a size")} />
            <Select.Content>
              {(catalog?.types || []).map((type) => (
                <Select.Item key={type.id} value={type.id}>
                  {getLinodeTypeOptionLabel(type)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
        <div>
          <label className={cloudPanelFieldLabelClassName}>{t("cloud.form.image", "Image")}</label>
          <Select.Root
            value={form.image}
            disabled={disabled}
            onValueChange={(value) => setForm((previous) => ({ ...previous, image: value }))}
          >
            <Select.Trigger placeholder={catalogLoading ? t("common.loading", "Loading") : t("cloud.form.image_placeholder", "Select an image")} />
            <Select.Content>
              {(catalog?.images || []).map((image) => (
                <Select.Item key={image.id} value={image.id}>
                  {image.vendor ? `${image.vendor} / ` : ""}{image.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
        <div>
          <label className={cloudPanelFieldLabelClassName}>{t("cloud.form.root_password", "Root Password")}</label>
          <TextField.Root
            type="password"
            value={form.root_password}
            disabled={disabled}
            placeholder={t("cloud.form.root_password_random", "Random if empty")}
            onChange={(event) => setForm((previous) => ({ ...previous, root_password: event.target.value }))}
          />
        </div>
      </div>
      <div className="mt-auto flex items-center justify-end gap-2 border-t border-border px-4 py-3">
        <Button
          onClick={() => { void onCreate(); }}
          disabled={submitting || disabled || !form.region || !form.type || !form.image}
        >
          {submitting ? t("cloud.creating", "Creating...") : t("cloud.providers.linode.create", "Create Instance")}
        </Button>
      </div>
    </section>
  );
}

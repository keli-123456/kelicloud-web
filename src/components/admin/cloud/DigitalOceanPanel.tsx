import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Eye,
  Plus,
  RefreshCw,
} from "lucide-react";

import {
  AdminCardGridSkeleton,
  AdminPageShell,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
import { CloudOnboardingPanel } from "@/components/admin/cloud/CloudOnboardingPanel";
import CloudInstanceShareDialog from "@/components/admin/cloud/CloudInstanceShareDialog";
import CloudInstanceScriptDialog, { type CloudInstanceScriptTarget } from "@/components/admin/cloud/CloudInstanceScriptDialog";
import { DigitalOceanCreateDialog } from "@/components/admin/cloud/DigitalOceanCreateDialog";
import {
  DigitalOceanAccessSecretsDialog,
  DigitalOceanManagedKeyDialog,
  DigitalOceanSavedPasswordDialog,
  DigitalOceanTokenSecretDialog,
} from "@/components/admin/cloud/DigitalOceanCredentialDialogs";
import { DigitalOceanDropletDetailDialog } from "@/components/admin/cloud/DigitalOceanDropletDetailDialog";
import { DigitalOceanDropletsSection } from "@/components/admin/cloud/DigitalOceanDropletsSection";
import {
  DigitalOceanTokenGroupDialog,
  DigitalOceanTokenImportDialog,
} from "@/components/admin/cloud/DigitalOceanTokenDialogs";
import { DigitalOceanTokensSection } from "@/components/admin/cloud/DigitalOceanTokensSection";
import {
  Button,
} from "@/components/admin/cloud/cloud-ui";
import { WarningAlert } from "@/components/ui/warning-alert";
import { useWarningDialog } from "@/components/ui/warning-dialog";
import {
  getDigitalOceanTokens,
  type DigitalOceanDroplet,
  type DigitalOceanTokenPool,
  type DigitalOceanTokenRecord,
} from "@/lib/cloud";
import { useDigitalOceanCreateDroplet } from "./useDigitalOceanCreateDroplet";
import { useDigitalOceanDropletActions } from "./useDigitalOceanDropletActions";
import { useDigitalOceanPanelResources } from "./useDigitalOceanPanelResources";
import { useDigitalOceanDropletPasswords } from "./useDigitalOceanDropletPasswords";
import { useDigitalOceanInstanceShare } from "./useDigitalOceanInstanceShare";
import { useDigitalOceanManagedKey } from "./useDigitalOceanManagedKey";
import { useDigitalOceanTokenActivation } from "./useDigitalOceanTokenActivation";
import { useDigitalOceanTokenDeletion } from "./useDigitalOceanTokenDeletion";
import { useDigitalOceanTokenGroupSave } from "./useDigitalOceanTokenGroupSave";
import { useDigitalOceanTokenHealth } from "./useDigitalOceanTokenHealth";
import { useDigitalOceanTokenImport } from "./useDigitalOceanTokenImport";
import { useDigitalOceanTokenSecret } from "./useDigitalOceanTokenSecret";
import { useDigitalOceanTokenSelection } from "./useDigitalOceanTokenSelection";
import {
  formatDateTime,
  formatList,
  formatMonthlyPrice,
  getActiveToken,
  getDefaultAutoConnectGroup,
  getDigitalOceanStatusSummary,
  getDropletMatchAddresses,
  getDropletPrimaryIp,
  getDropletStatusColor,
  getImageLabel,
  getImageValue,
  getRegionOptionLabel,
  getTokenStatusColor,
  hasActiveToken,
  toErrorMessage,
  type DropletAccessSecrets,
} from "./digitalOceanPanelUtils";

export default function DigitalOceanPanel() {
  const { t } = useTranslation();
  const { confirm, dialog } = useWarningDialog();

  const [tokenPool, setTokenPool] = React.useState<DigitalOceanTokenPool | null>(null);
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
  } = useDigitalOceanTokenSelection(tokenPool);
  const {
    initializing,
    setInitializing,
    panelLoading,
    account,
    catalog,
    setCatalog,
    droplets,
    error,
    setError,
    resourcesLoaded,
    loadPanelData,
    clearResourceData,
  } = useDigitalOceanPanelResources();
  const [accessSecrets, setAccessSecrets] = React.useState<DropletAccessSecrets | null>(null);
  const [scriptTarget, setScriptTarget] = React.useState<CloudInstanceScriptTarget | null>(null);

  const clearPanelState = React.useCallback(() => {
    clearResourceData();
  }, [clearResourceData]);

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

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const nextPool = await getDigitalOceanTokens();
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

  const activeToken = getActiveToken(tokenPool);
  const defaultCreateGroup = getDefaultAutoConnectGroup("digitalocean", activeToken?.name || "");
  const passwordStorageEnabled = Boolean(tokenPool?.password_storage_enabled);
  const accountStatusSummary = getDigitalOceanStatusSummary(
    account?.status || "",
    account?.status_message || "",
    t,
  );

  const shouldPreserveLoadedResources = React.useCallback(
    (nextPool: DigitalOceanTokenPool) =>
      resourcesLoaded && Boolean(activeToken?.id) && nextPool.active_token_id === activeToken?.id,
    [activeToken?.id, resourcesLoaded],
  );

  const syncTokenPoolAfterDelete = React.useCallback((
    nextPool: DigitalOceanTokenPool,
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
  } = useDigitalOceanTokenImport({
    t,
    tokenPool,
    setTokenPool,
    shouldPreserveLoadedResources,
    clearPanelState,
  });
  const {
    tokenGroupSaving,
    handleSaveTokenGroup,
  } = useDigitalOceanTokenGroupSave({
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
  } = useDigitalOceanTokenHealth({
    t,
    setTokenPool,
    shouldPreserveLoadedResources,
    clearPanelState,
  });
  const {
    handleSelectToken,
  } = useDigitalOceanTokenActivation({
    t,
    setTokenPool,
    loadPanelData,
    clearPanelState,
  });
  const {
    handleDeleteToken,
    handleDeleteSelectedTokens,
  } = useDigitalOceanTokenDeletion({
    t,
    confirm,
    selectedTokens,
    setSelectedTokenIds,
    syncTokenPoolAfterDelete,
  });
  const {
    tokenSecret,
    setTokenSecret,
    tokenSecretLoading,
    handleViewTokenSecret,
  } = useDigitalOceanTokenSecret();
  const {
    managedKeyMaterial,
    setManagedKeyMaterial,
    managedKeyLoading,
    handleViewManagedKey,
  } = useDigitalOceanManagedKey();
  const {
    savedDropletPassword,
    setSavedDropletPassword,
    dropletPasswordLoading,
    handleViewDropletPassword,
  } = useDigitalOceanDropletPasswords();
  const tokenSaving = tokenImportSaving || tokenGroupSaving;

  const handleOpenDropletsForToken = async (token: DigitalOceanTokenRecord) => {
    await handleSelectToken(token, {
      loadResources: true,
    });
  };

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
    shareManagedSSHKey,
    setShareManagedSSHKey,
    shareUrl,
    handleShareOpenChange,
    handleOpenShareDialog,
    handleSaveShare,
    handleDeleteShare,
    handleCopyShareLink,
  } = useDigitalOceanInstanceShare({
    t,
    confirm,
    activeToken,
    copyText,
  });
  const {
    createOpen,
    setCreateOpen,
    createSubmitting,
    createCatalogLoading,
    createForm,
    setCreateForm,
    handleCreateDroplet,
    handleOpenCreateDialog,
  } = useDigitalOceanCreateDroplet({
    t,
    catalog,
    setCatalog,
    setError,
    activeToken,
    defaultCreateGroup,
    setAccessSecrets,
    loadPanelData,
  });
  const {
    detailDroplet,
    setDetailDroplet,
    handleDropletAction,
    handleDeleteDroplet,
  } = useDigitalOceanDropletActions({
    t,
    confirm,
    loadPanelData,
  });

  const handleOpenScriptDialog = React.useCallback((droplet: DigitalOceanDroplet) => {
    setScriptTarget({
      providerLabel: t("cloud.providers.digitalocean.title", "DigitalOcean"),
      instanceName: droplet.name || String(droplet.id),
      instanceIdentifier: String(droplet.id),
      addresses: getDropletMatchAddresses(droplet),
      groupHint: getDefaultAutoConnectGroup("digitalocean", activeToken?.name || ""),
    });
  }, [activeToken?.name, t]);

  const regions = catalog?.regions ?? [];
  const sizes = catalog?.sizes ?? [];
  const images = catalog?.images ?? [];
  const showOnboardingPanel =
    tokenRows.length === 0 || !activeToken || !resourcesLoaded;

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
        title={t("cloud.providers.digitalocean.title", "DigitalOcean")}
        description={t(
          "cloud.providers.digitalocean.description",
          "Manage API tokens, inspect Droplet inventory, and create or operate DigitalOcean instances from one panel.",
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
        title={t("cloud.providers.digitalocean.title", "DigitalOcean")}
        description={t(
          "cloud.providers.digitalocean.description",
          "Manage API tokens, inspect Droplet inventory, and create or operate DigitalOcean instances from one panel.",
        )}
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
              {t("cloud.create", "Create Droplet")}
            </Button>
          </>
        }
      >
      {error ? (
        <WarningAlert tone="warning" description={error} />
      ) : null}

      {accountStatusSummary ? (
        <WarningAlert
          tone="warning"
          description={
            <span title={account?.status_message || accountStatusSummary}>
              {t(
                "cloud.providers.digitalocean.locked_account_help",
                "This DigitalOcean account is locked. Health checks and Droplet operations may continue to fail.",
              )}
            </span>
          }
        />
      ) : null}

      {tokenPool && !passwordStorageEnabled ? (
        <WarningAlert
          tone="info"
          description={t(
            "cloud.password.storage_disabled_help",
            "Set KOMARI_CLOUD_SECRET_KEY on the server to save root passwords for later viewing in the Droplet list.",
          )}
        />
      ) : null}

      {showOnboardingPanel ? (
        <CloudOnboardingPanel
          t={t}
          providerName={t("cloud.providers.digitalocean.title", "DigitalOcean")}
          credentialDone={tokenRows.length > 0}
          contextReady={Boolean(activeToken)}
          resourcesLoaded={resourcesLoaded}
          resourceLoading={panelLoading}
          createLoading={createCatalogLoading}
          canLoadResources={Boolean(activeToken)}
          canCreate={Boolean(activeToken)}
          credentialTitle={t("cloud.onboarding.token_title", "导入 API 令牌")}
          credentialDescription={t(
            "cloud.onboarding.token_description",
            "先添加一个或多个 DigitalOcean 令牌，再选择当前用于操作的账户。",
          )}
          resourceDescription={t(
            "cloud.onboarding.resource_description",
            "按需拉取 Droplet 资源，切换账户时页面会更快、更可控。",
          )}
          createTitle={t("cloud.onboarding.create_title", "创建或管理 Droplet")}
          createLabel={t("cloud.create", "Create Droplet")}
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

      <DigitalOceanDropletsSection
        t={t}
        droplets={droplets}
        panelLoading={panelLoading}
        error={error}
        hasActiveToken={hasActiveToken(tokenPool)}
        resourcesLoaded={resourcesLoaded}
        passwordStorageEnabled={passwordStorageEnabled}
        dropletPasswordLoading={dropletPasswordLoading}
        getDropletStatusColor={getDropletStatusColor}
        getRegionOptionLabel={getRegionOptionLabel}
        getDropletPrimaryIp={getDropletPrimaryIp}
        getImageLabel={getImageLabel}
        formatMonthlyPrice={formatMonthlyPrice}
        formatDateTime={formatDateTime}
        onOpenDetail={setDetailDroplet}
        onViewPassword={handleViewDropletPassword}
        onDropletAction={handleDropletAction}
        onOpenScriptDialog={handleOpenScriptDialog}
        onOpenShareDialog={handleOpenShareDialog}
        onDeleteDroplet={handleDeleteDroplet}
      />

      <DigitalOceanTokensSection
        t={t}
        tokenRows={tokenRows}
        selectedTokenIds={selectedTokenIds}
        setSelectedTokenIds={setSelectedTokenIds}
        selectedTokens={selectedTokens}
        allTokensSelected={allTokensSelected}
        someTokensSelected={someTokensSelected}
        tokenChecking={tokenChecking}
        tokenSecretLoading={tokenSecretLoading}
        managedKeyLoading={managedKeyLoading}
        getTokenStatusColor={getTokenStatusColor}
        getDigitalOceanStatusSummary={getDigitalOceanStatusSummary}
        formatDateTime={formatDateTime}
        onCheckTokens={handleCheckTokens}
        onOpenTokenGroupEditor={openTokenGroupEditor}
        onDeleteSelectedTokens={handleDeleteSelectedTokens}
        onOpenTokenImport={() => setTokenImportOpen(true)}
        onToggleTokenSelection={toggleTokenSelection}
        onSelectToken={handleSelectToken}
        onOpenDropletsForToken={handleOpenDropletsForToken}
        onViewTokenSecret={handleViewTokenSecret}
        onViewManagedKey={handleViewManagedKey}
        onDeleteToken={handleDeleteToken}
      />

      <DigitalOceanTokenImportDialog
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

      <DigitalOceanTokenGroupDialog
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

      <DigitalOceanCreateDialog
        t={t}
        open={createOpen}
        onOpenChange={setCreateOpen}
        regions={regions}
        sizes={sizes}
        images={images}
        form={createForm}
        setForm={setCreateForm}
        submitting={createSubmitting}
        getRegionOptionLabel={getRegionOptionLabel}
        getImageValue={getImageValue}
        getImageLabel={getImageLabel}
        onCreate={handleCreateDroplet}
      />

      <DigitalOceanDropletDetailDialog
        t={t}
        droplet={detailDroplet}
        passwordStorageEnabled={passwordStorageEnabled}
        dropletPasswordLoading={dropletPasswordLoading}
        onClose={() => setDetailDroplet(null)}
        onViewPassword={handleViewDropletPassword}
        getRegionOptionLabel={getRegionOptionLabel}
        getDropletPrimaryIp={getDropletPrimaryIp}
        getImageLabel={getImageLabel}
        formatDateTime={formatDateTime}
        formatList={formatList}
      />

      <DigitalOceanTokenSecretDialog
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
        shareManagedSSHKey={shareManagedSSHKey}
        shareUrl={shareUrl}
        onTitleChange={setShareTitle}
        onNoteChange={setShareNote}
        onAccessPolicyChange={setShareAccessPolicy}
        onExpiresAtChange={setShareExpiresAt}
        onSharePasswordChange={setSharePassword}
        onShareManagedSSHKeyChange={setShareManagedSSHKey}
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

      <DigitalOceanManagedKeyDialog
        t={t}
        managedKeyMaterial={managedKeyMaterial}
        onClose={() => setManagedKeyMaterial(null)}
        copyText={copyText}
      />

      <DigitalOceanSavedPasswordDialog
        t={t}
        savedDropletPassword={savedDropletPassword}
        onClose={() => setSavedDropletPassword(null)}
        copyText={copyText}
        getDropletPrimaryIp={getDropletPrimaryIp}
        formatDateTime={formatDateTime}
      />

      <DigitalOceanAccessSecretsDialog
        t={t}
        accessSecrets={accessSecrets}
        onClose={() => setAccessSecrets(null)}
        copyText={copyText}
        getDropletPrimaryIp={getDropletPrimaryIp}
      />
      </AdminPageShell>
      {dialog}
    </>
  );
}

import React from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

import {
  AdminEmptyState,
  AdminPageShell,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
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
  getDigitalOceanTokens,
  type DigitalOceanCatalog,
  type DigitalOceanDroplet,
  type DigitalOceanImage,
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
  type CreateDropletFormState,
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
    prepareCreateForm,
    handleCreateDroplet,
    handleOpenCreateDialog,
  } = useDigitalOceanCreateDroplet({
    t,
    catalog,
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
    handleBatchDeleteDroplets,
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
        <AdminTableSkeleton columns={6} rows={5} />
      </AdminPageShell>
    );
  }

  return (
    <>
      <AdminPageShell
        title={t("cloud.providers.digitalocean.title", "DigitalOcean")}
        hideHeader
      >
      <CloudProviderHeader
        title={t("cloud.providers.digitalocean.title", "DigitalOcean")}
      />
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

      <div className="grid min-w-0 items-stretch gap-4 xl:grid-cols-[minmax(340px,0.9fr)_minmax(380px,1.1fr)]">
        <DigitalOceanInlineCreatePanel
          t={t}
          activeToken={activeToken}
          regions={regions}
          sizes={sizes}
          images={images}
          form={createForm}
          setForm={setCreateForm}
          submitting={createSubmitting}
          catalogLoading={createCatalogLoading}
          getRegionOptionLabel={getRegionOptionLabel}
          getImageValue={getImageValue}
          getImageLabel={getImageLabel}
          onPrepare={prepareCreateForm}
          onOpenAdvanced={handleOpenCreateDialog}
          onOpenTokenImport={() => setTokenImportOpen(true)}
          onCreate={handleCreateDroplet}
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
      </div>

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
        onBatchDeleteDroplets={handleBatchDeleteDroplets}
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

type DigitalOceanInlineCreatePanelProps = {
  t: TFunction;
  activeToken: DigitalOceanTokenRecord | null;
  regions: DigitalOceanCatalog["regions"];
  sizes: DigitalOceanCatalog["sizes"];
  images: DigitalOceanCatalog["images"];
  form: CreateDropletFormState;
  setForm: React.Dispatch<React.SetStateAction<CreateDropletFormState>>;
  submitting: boolean;
  catalogLoading: boolean;
  getRegionOptionLabel: (region: DigitalOceanCatalog["regions"][number], t: TFunction) => string;
  getImageValue: (image: DigitalOceanImage) => string;
  getImageLabel: (image: DigitalOceanImage) => string;
  onPrepare: () => Promise<DigitalOceanCatalog | null>;
  onOpenAdvanced: () => void | Promise<void>;
  onOpenTokenImport: () => void;
  onCreate: () => void | Promise<void>;
};

function DigitalOceanInlineCreatePanel({
  t,
  activeToken,
  regions,
  sizes,
  images,
  form,
  setForm,
  submitting,
  catalogLoading,
  getRegionOptionLabel,
  getImageValue,
  getImageLabel,
  onPrepare,
  onOpenAdvanced,
  onOpenTokenImport,
  onCreate,
}: DigitalOceanInlineCreatePanelProps) {
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
                {t("cloud.create", "创建 Droplet")}
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
      {!activeToken ? (
        <div className="p-4">
          <AdminEmptyState
            icon={<KeyRound className="h-5 w-5" />}
            title={t("cloud.no_active_token", "请选择一个当前操作令牌，再加载 DigitalOcean 资源")}
            description={t("cloud.no_active_token_description", "请先在下方令牌池选择或导入令牌，然后再加载云资源。")}
            actions={(
              <Button size="1" onClick={onOpenTokenImport}>
                <KeyRound className="mr-2 h-4 w-4" />
                {t("cloud.tokens.import", "导入令牌")}
              </Button>
            )}
            className="min-h-28 border-solid border-border/70 bg-transparent"
          />
        </div>
      ) : (
        <>
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
              {regions.map((region) => (
                <Select.Item key={region.slug} value={region.slug}>
                  {getRegionOptionLabel(region, t)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
        <div>
          <label className={cloudPanelFieldLabelClassName}>{t("cloud.form.size", "Size")}</label>
          <Select.Root
            value={form.size}
            disabled={disabled}
            onValueChange={(value) => setForm((previous) => ({ ...previous, size: value }))}
          >
            <Select.Trigger placeholder={catalogLoading ? t("common.loading", "Loading") : t("cloud.form.size_placeholder", "Select a size")} />
            <Select.Content>
              {sizes.map((size) => (
                <Select.Item key={size.slug} value={size.slug}>
                  {size.slug} / {size.vcpus} vCPU / {(size.memory / 1024).toFixed(0)} GB / ${size.price_monthly.toFixed(2)}
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
              {images.map((image) => (
                <Select.Item key={`${image.id}-${image.slug}`} value={getImageValue(image)}>
                  {getImageLabel(image)}
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
          disabled={submitting || disabled || !form.region || !form.size || !form.image}
        >
          {submitting ? t("cloud.creating", "创建中...") : t("cloud.create", "创建 Droplet")}
        </Button>
      </div>
        </>
      )}
    </section>
  );
}

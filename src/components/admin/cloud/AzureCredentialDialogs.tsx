import type { TFunction } from "i18next";

import {
  Button,
  CloudCodeTextarea,
  CloudCopyBlock,
  CloudDetailItem,
  CloudReadonlyCodeBlock,
  cloudDialogContentClassName,
  cloudPanelFieldLabelClassName,
  Dialog,
  Flex,
  TextField,
} from "@/components/admin/cloud/cloud-ui";
import {
  formatDateTime,
  type CredentialSecretState,
  type SavedPasswordState,
} from "./azurePanelUtils";

type MaybePromise<T> = T | Promise<T>;

type AzureCredentialImportDialogProps = {
  t: TFunction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importText: string;
  setImportText: (value: string) => void;
  importGroup: string;
  setImportGroup: (value: string) => void;
  saving: boolean;
  onImport: () => MaybePromise<void>;
};

type AzureCredentialGroupDialogProps = {
  t: TFunction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
  saving: boolean;
  onSave: () => MaybePromise<void>;
};

type AzureCredentialSecretDialogProps = {
  t: TFunction;
  credentialSecret: CredentialSecretState | null;
  onClose: () => void;
  onCopy: (text: string, successMessage: string) => MaybePromise<void>;
};

type AzureSavedPasswordDialogProps = {
  t: TFunction;
  savedPassword: SavedPasswordState | null;
  onClose: () => void;
  onCopy: (text: string, successMessage: string) => MaybePromise<void>;
};

export function AzureCredentialImportDialog({
  t,
  open,
  onOpenChange,
  importText,
  setImportText,
  importGroup,
  setImportGroup,
  saving,
  onImport,
}: AzureCredentialImportDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className={cloudDialogContentClassName}>
        <Dialog.Title>{t("cloud.providers.azure.import_dialog_title", "Batch Import Azure Credentials")}</Dialog.Title>
        <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
          {t(
            "cloud.providers.azure.import_dialog_description",
            "One credential per line (CSV/pipe/tab) or paste JSON object/array. Common JSON keys: login_user, subscription_id, appId, password, tenant.",
          )}
        </Dialog.Description>
        <div className="mt-4 space-y-2">
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.tokens.group", "Group")}
          </label>
          <TextField.Root
            value={importGroup}
            placeholder={t("cloud.tokens.group_placeholder", "Optional token group")}
            onChange={(event) => setImportGroup(event.target.value)}
          />
        </div>
        <CloudCodeTextarea
          className="mt-4"
          minHeightClassName="min-h-48"
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          placeholder='{"login_user":"team-a","subscription_id":"...","appId":"...","password":"...","tenant":"..."}'
        />
        <Flex justify="end" gap="2" className="mt-4">
          <Dialog.Close>
            <Button variant="outline">{t("common.cancel", "Cancel")}</Button>
          </Dialog.Close>
          <Button onClick={() => { void onImport(); }} disabled={saving}>
            {saving
              ? t("cloud.providers.azure.importing", "Importing...")
              : t("cloud.providers.azure.import", "Import Credentials")}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export function AzureCredentialGroupDialog({
  t,
  open,
  onOpenChange,
  value,
  onValueChange,
  saving,
  onSave,
}: AzureCredentialGroupDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className={cloudDialogContentClassName}>
        <Dialog.Title>{t("cloud.tokens.set_group", "Set Group")}</Dialog.Title>
        <Dialog.Description>
          {t("cloud.tokens.set_group_description", {
            count: 1,
            defaultValue: "Update the group for 1 selected credential. Leave empty to remove the group.",
          })}
        </Dialog.Description>

        <div className="mt-4 flex flex-col gap-4">
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.tokens.group", "Group")}
          </label>
          <TextField.Root
            value={value}
            placeholder={t("cloud.tokens.group_placeholder", "Optional token group")}
            onChange={(event) => onValueChange(event.target.value)}
          />
          <Flex justify="end" gap="2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button onClick={() => { void onSave(); }} disabled={saving}>
              {saving ? t("common.saving", "Saving...") : t("common.save", "Save")}
            </Button>
          </Flex>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export function AzureCredentialSecretDialog({
  t,
  credentialSecret,
  onClose,
  onCopy,
}: AzureCredentialSecretDialogProps) {
  return (
    <Dialog.Root open={Boolean(credentialSecret)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content className={cloudDialogContentClassName}>
        <Dialog.Title>{t("cloud.providers.azure.credential_dialog_title", "Credential Details")}</Dialog.Title>
        <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
          {t(
            "cloud.providers.azure.credential_dialog_description",
            "View the full Azure app credential only when you need to copy or verify it.",
          )}
        </Dialog.Description>
        {credentialSecret ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <CloudDetailItem label={t("cloud.table.name", "Name")} value={credentialSecret.secret.credential_name || "-"} />
              <CloudDetailItem label={t("cloud.providers.azure.subscription", "Subscription")} value={credentialSecret.secret.subscription_display_name || credentialSecret.secret.subscription_id || "-"} />
              <CloudDetailItem label={t("cloud.providers.azure.tenant_id", "Tenant ID")} value={credentialSecret.secret.tenant_id || "-"} />
              <CloudDetailItem label={t("cloud.providers.azure.default_location", "Default Location")} value={credentialSecret.secret.default_location || "-"} />
            </div>

            <CloudCopyBlock
              title={t("cloud.providers.azure.client_id", "Client ID")}
              copyLabel={t("common.copy", "Copy")}
              onCopy={() => void onCopy(credentialSecret.secret.client_id, t("cloud.providers.azure.copy_client_id", "Client ID copied"))}
            >
              <CloudReadonlyCodeBlock value={credentialSecret.secret.client_id || "-"} />
            </CloudCopyBlock>

            <CloudCopyBlock
              title={t("cloud.providers.azure.client_secret", "Client Secret")}
              copyLabel={t("common.copy", "Copy")}
              onCopy={() => void onCopy(credentialSecret.secret.client_secret, t("cloud.providers.azure.copy_client_secret", "Client secret copied"))}
            >
              <CloudReadonlyCodeBlock value={credentialSecret.secret.client_secret || "-"} />
            </CloudCopyBlock>
          </div>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
}

export function AzureSavedPasswordDialog({
  t,
  savedPassword,
  onClose,
  onCopy,
}: AzureSavedPasswordDialogProps) {
  return (
    <Dialog.Root open={Boolean(savedPassword)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content className={cloudDialogContentClassName}>
        <Dialog.Title>{t("cloud.password.view", "View Password")}</Dialog.Title>
        <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
          {t(
            "cloud.providers.azure.password_dialog_description",
            "View the saved root password for this Azure VM from the current active credential.",
          )}
        </Dialog.Description>
        {savedPassword ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <CloudDetailItem label={t("cloud.table.name", "Name")} value={savedPassword.instance.name || "-"} />
              <CloudDetailItem label={t("cloud.providers.azure.resource_group", "Resource Group")} value={savedPassword.instance.resource_group || "-"} />
              <CloudDetailItem label={t("cloud.providers.azure.admin_username", "Admin Username")} value={savedPassword.credential.username || "-"} />
              <CloudDetailItem label={t("cloud.providers.azure.checked_at", "Last Checked")} value={formatDateTime(savedPassword.credential.updated_at)} />
            </div>
            <CloudCopyBlock
              title={t("cloud.password.root_password", "Root Password")}
              copyLabel={t("common.copy", "Copy")}
              onCopy={() => void onCopy(savedPassword.credential.root_password, t("cloud.password.copy_success", "Root password copied"))}
            >
              <CloudReadonlyCodeBlock value={savedPassword.credential.root_password || "-"} />
            </CloudCopyBlock>
          </div>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
}

import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { KeyRound, LockKeyhole, ShieldCheck, Tags, Upload } from "lucide-react";

import {
  Badge,
  Button,
  CloudCodeTextarea,
  CloudDetailItem,
  CloudSecretValueBlock,
  CloudSensitiveDialogContent,
  CloudStatusNotice,
  Dialog,
  Flex,
  TextField,
  cloudPanelFieldLabelClassName,
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

function SecretSidePanel({
  t,
  title,
  description,
  children,
}: {
  t: TFunction;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck className="size-4 text-blue-600" />
          {title}
        </div>
        <div className="mt-2 text-xs leading-5 text-muted-foreground">
          {description}
        </div>
      </div>
      {children}
      <CloudStatusNotice tone="blue">
        {t(
          "cloud.secret.copy_hint",
          "Copy sensitive values only when needed, then close this dialog when you are done.",
        )}
      </CloudStatusNotice>
    </div>
  );
}

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
      <CloudSensitiveDialogContent
        title={t("cloud.providers.azure.import_dialog_title", "Batch Import Azure Credentials")}
        description={t(
          "cloud.providers.azure.import_dialog_description",
          "One credential per line (CSV/pipe/tab) or paste JSON object/array. Azure CLI service principal JSON is supported; subscription_id is optional.",
        )}
        icon={<Upload className="size-4" />}
        badge={<Badge color="blue">{t("cloud.providers.azure.name", "Azure")}</Badge>}
        side={(
          <SecretSidePanel
            t={t}
            title={t("cloud.providers.azure.import_format", "Import Format")}
            description={t(
              "cloud.providers.azure.import_format_description",
              "Use CSV, pipe, tab, JSON object, or JSON array. appId/password/tenant/displayName are recognized, and group is optional.",
            )}
          >
            <CloudStatusNotice tone="gray">
              {t(
                "cloud.providers.azure.import_secret_hint",
                "Imported client secrets are stored by the backend; review the pasted text before submitting.",
              )}
            </CloudStatusNotice>
          </SecretSidePanel>
        )}
      >
        <div className="space-y-2">
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
          minHeightClassName="min-h-56"
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          placeholder='{"appId":"...","displayName":"azure-cli-...","password":"...","tenant":"..."}'
        />
        <Flex justify="end" gap="2">
          <Dialog.Close>
            <Button variant="outline">{t("common.cancel", "Cancel")}</Button>
          </Dialog.Close>
          <Button onClick={() => { void onImport(); }} disabled={saving}>
            {saving
              ? t("cloud.providers.azure.importing", "Importing...")
              : t("cloud.providers.azure.import", "Import Credentials")}
          </Button>
        </Flex>
      </CloudSensitiveDialogContent>
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
      <CloudSensitiveDialogContent
        title={t("cloud.tokens.set_group", "Set Group")}
        description={t("cloud.tokens.set_group_description", {
          count: 1,
          defaultValue: "Update the group for 1 selected credential. Leave empty to remove the group.",
        })}
        icon={<Tags className="size-4" />}
        badge={<Badge color="blue">{t("cloud.providers.azure.name", "Azure")}</Badge>}
        side={(
          <CloudStatusNotice tone="gray">
            {t(
              "cloud.tokens.group_dialog_hint",
              "Groups only affect organization and filtering. They do not change the credential itself.",
            )}
          </CloudStatusNotice>
        )}
      >
        <div className="space-y-2">
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.tokens.group", "Group")}
          </label>
          <TextField.Root
            value={value}
            placeholder={t("cloud.tokens.group_placeholder", "Optional token group")}
            onChange={(event) => onValueChange(event.target.value)}
          />
        </div>
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
      </CloudSensitiveDialogContent>
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
      {credentialSecret ? (
        <CloudSensitiveDialogContent
          title={t("cloud.providers.azure.credential_dialog_title", "Credential Details")}
          description={t(
            "cloud.providers.azure.credential_dialog_description",
            "View the full Azure app credential only when you need to copy or verify it.",
          )}
          icon={<KeyRound className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.azure.name", "Azure")}</Badge>
              <Badge color="amber">{t("cloud.providers.azure.app_credential", "App Credential")}</Badge>
            </>
          )}
          side={(
            <SecretSidePanel
              t={t}
              title={t("cloud.secret.scope", "Access Scope")}
              description={t(
                "cloud.secret.token_scope_hint",
                "This credential can manage cloud resources through the provider API.",
              )}
            >
              <CloudDetailItem
                label={t("cloud.providers.azure.default_location", "Default Location")}
                value={credentialSecret.secret.default_location || "-"}
                className="bg-card"
              />
            </SecretSidePanel>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CloudDetailItem label={t("cloud.table.name", "Name")} value={credentialSecret.secret.credential_name || "-"} className="bg-card" />
            <CloudDetailItem label={t("cloud.providers.azure.subscription", "Subscription")} value={credentialSecret.secret.subscription_display_name || credentialSecret.secret.subscription_id || "-"} className="bg-card" />
            <CloudDetailItem label={t("cloud.providers.azure.tenant_id", "Tenant ID")} value={credentialSecret.secret.tenant_id || "-"} className="bg-card" />
          </div>

          <CloudSecretValueBlock
            title={t("cloud.providers.azure.client_id", "Client ID")}
            copyLabel={t("common.copy", "Copy")}
            onCopy={() => void onCopy(credentialSecret.secret.client_id, t("cloud.providers.azure.copy_client_id", "Client ID copied"))}
            value={credentialSecret.secret.client_id || "-"}
          />

          <CloudSecretValueBlock
            title={t("cloud.providers.azure.client_secret", "Client Secret")}
            copyLabel={t("common.copy", "Copy")}
            onCopy={() => void onCopy(credentialSecret.secret.client_secret, t("cloud.providers.azure.copy_client_secret", "Client secret copied"))}
            value={credentialSecret.secret.client_secret || "-"}
          />
        </CloudSensitiveDialogContent>
      ) : null}
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
      {savedPassword ? (
        <CloudSensitiveDialogContent
          title={t("cloud.password.view", "View Password")}
          description={t(
            "cloud.providers.azure.password_dialog_description",
            "View the saved root password for this Azure VM from the current active credential.",
          )}
          icon={<LockKeyhole className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.azure.name", "Azure")}</Badge>
              <Badge color="green">{t("cloud.password.saved", "Saved")}</Badge>
            </>
          )}
          side={(
            <SecretSidePanel
              t={t}
              title={t("cloud.password.login_context", "Login Context")}
              description={t(
                "cloud.password.login_context_description",
                "Use the username and password together when connecting to this instance.",
              )}
            >
              <CloudDetailItem
                label={t("cloud.providers.azure.checked_at", "Last Checked")}
                value={formatDateTime(savedPassword.credential.updated_at)}
                className="bg-card"
              />
            </SecretSidePanel>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CloudDetailItem label={t("cloud.table.name", "Name")} value={savedPassword.instance.name || "-"} className="bg-card" />
            <CloudDetailItem label={t("cloud.providers.azure.resource_group", "Resource Group")} value={savedPassword.instance.resource_group || "-"} className="bg-card" />
            <CloudDetailItem label={t("cloud.password.username", "登录用户")} value={savedPassword.credential.username || "-"} className="bg-card" />
          </div>
          <CloudSecretValueBlock
            title={t("cloud.password.root_password", "Root Password")}
            copyLabel={t("common.copy", "Copy")}
            onCopy={() => void onCopy(savedPassword.credential.root_password, t("cloud.password.copy_success", "Root password copied"))}
            value={savedPassword.credential.root_password || "-"}
          />
        </CloudSensitiveDialogContent>
      ) : null}
    </Dialog.Root>
  );
}

import type { TFunction } from "i18next";

import {
  CompactCredentialCopyBlock,
  CompactCredentialRow,
  PlainDetailItem,
} from "@/components/admin/cloud/AWSPanelDetailComponents";
import { AWSQuotaSummary } from "@/components/admin/cloud/AWSQuotaSummary";
import {
  CloudCopyBlock,
  CloudReadonlyCodeBlock,
  cloudDetailListClassName,
  cloudDetailListItemClassName,
  cloudDialogContentClassName,
  cloudLongTextClassName,
  cloudPanelSectionClassName,
  Dialog,
} from "@/components/admin/cloud/cloud-ui";
import { getRootPasswordModeLabel } from "./awsPanelSummaries";
import type {
  CredentialSecretState,
  CreatedPasswordState,
  SavedPasswordState,
} from "./awsPanelState";
import { formatDateTime } from "./awsPanelUtils";

type CopyTextHandler = (value: string) => void | Promise<void>;

type CredentialSecretDialogProps = {
  credentialSecret: CredentialSecretState | null;
  t: TFunction;
  onClose: () => void;
  onCopyText: CopyTextHandler;
};

export function AWSCredentialSecretDialog({
  credentialSecret,
  t,
  onClose,
  onCopyText,
}: CredentialSecretDialogProps) {
  return (
    <Dialog.Root open={Boolean(credentialSecret)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content className={cloudDialogContentClassName}>
        <Dialog.Title>{t("cloud.providers.aws.credential_dialog_title", "Credential Details")}</Dialog.Title>
        <Dialog.Description>
          {t(
            "cloud.providers.aws.credential_dialog_description",
            "View the full AWS credentials only when you need to copy or verify them.",
          )}
        </Dialog.Description>

        {credentialSecret ? (
          <div className="mt-4 flex flex-col gap-3">
            <div className={cloudPanelSectionClassName}>
              <div className="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
                {t("cloud.providers.aws.credentials", "Credentials")}
              </div>
              <div className="mt-2">
                <CompactCredentialRow
                  label={t("cloud.tokens.table.name", "Name")}
                  value={credentialSecret.secret.credential_name}
                />
                <CompactCredentialRow
                  label={t("cloud.providers.aws.access_key", "Access Key")}
                  value={credentialSecret.secret.access_key_id || "-"}
                />
              </div>
            </div>
            {(credentialSecret.secret.ec2_quota || credentialSecret.secret.ec2_quota_error) ? (
              <div className={cloudPanelSectionClassName}>
                <div className="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
                  {t("cloud.providers.aws.ec2_quota", "EC2 Quota")}
                </div>
                <div className="mt-2">
                  <AWSQuotaSummary
                    quota={credentialSecret.secret.ec2_quota}
                    error={credentialSecret.secret.ec2_quota_error}
                    t={t}
                  />
                </div>
              </div>
            ) : null}
            <CompactCredentialCopyBlock
              title={t("cloud.providers.aws.secret_access_key", "Secret Access Key")}
              copyLabel={t("copy", "Copy")}
              onCopy={() => {
                void onCopyText(credentialSecret.secret.secret_access_key);
              }}
              value={credentialSecret.secret.secret_access_key}
            />
            {credentialSecret.secret.session_token ? (
              <CompactCredentialCopyBlock
                title={t("cloud.providers.aws.session_token", "Session Token")}
                copyLabel={t("copy", "Copy")}
                onCopy={() => {
                  void onCopyText(credentialSecret.secret.session_token);
                }}
                value={credentialSecret.secret.session_token}
              />
            ) : null}
          </div>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
}

type SavedPasswordDialogProps = {
  savedPassword: SavedPasswordState | null;
  t: TFunction;
  onClose: () => void;
  onCopyText: CopyTextHandler;
};

export function AWSSavedPasswordDialog({
  savedPassword,
  t,
  onClose,
  onCopyText,
}: SavedPasswordDialogProps) {
  return (
    <Dialog.Root open={Boolean(savedPassword)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content className={cloudDialogContentClassName}>
        <Dialog.Title>{t("cloud.password.dialog_title", "Saved Root Password")}</Dialog.Title>
        <Dialog.Description>
          {t(
            "cloud.providers.aws.password_dialog_description",
            "View the saved root password for this AWS instance from the current active credential and region.",
          )}
        </Dialog.Description>

        {savedPassword ? (
          <div className="mt-4 flex flex-col gap-4">
            <PlainDetailItem label={t("cloud.table.name", "Name")} value={savedPassword.resourceName} />
            <PlainDetailItem
              label={t("common.type", "Type")}
              value={
                savedPassword.resourceKind === "lightsail"
                  ? t("cloud.providers.aws.lightsail_label", "AWS Lightsail")
                  : t("cloud.providers.aws.ec2_label", "AWS EC2")
              }
            />
            <PlainDetailItem
              label={t("cloud.password.username", "Username")}
              value={savedPassword.credential.username || "root"}
            />
            <PlainDetailItem
              label={t("cloud.password.mode", "Password Mode")}
              value={savedPassword.credential.password_mode || "-"}
            />
            <PlainDetailItem
              label={t("cloud.password.saved_at", "Saved At")}
              value={formatDateTime(savedPassword.credential.updated_at)}
            />
            <CloudCopyBlock
              title={t("cloud.form.root_password", "Root Password")}
              copyLabel={t("copy", "Copy")}
              onCopy={() => {
                void onCopyText(savedPassword.credential.root_password);
              }}
            >
              <CloudReadonlyCodeBlock value={savedPassword.credential.root_password} />
            </CloudCopyBlock>
          </div>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
}

type CreatedPasswordDialogProps = {
  createdPassword: CreatedPasswordState | null;
  t: TFunction;
  onClose: () => void;
  onCopyText: CopyTextHandler;
};

export function AWSCreatedPasswordDialog({
  createdPassword,
  t,
  onClose,
  onCopyText,
}: CreatedPasswordDialogProps) {
  return (
    <Dialog.Root open={Boolean(createdPassword)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content className={cloudDialogContentClassName}>
        <Dialog.Title>{t("cloud.access.dialog_title", "Connection Details")}</Dialog.Title>
        <Dialog.Description>
          {t(
            "cloud.providers.aws.create_credentials_description",
            "Store this root password now. You can reopen it later only if vault storage is enabled and the save succeeded.",
          )}
        </Dialog.Description>

        {createdPassword ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className={cloudDetailListClassName}>
              <div className={cloudDetailListItemClassName}>
                <PlainDetailItem label={t("cloud.table.name", "Name")} value={createdPassword.resourceName} />
                <PlainDetailItem
                  label={t("cloud.password.mode", "Password Mode")}
                  value={getRootPasswordModeLabel(createdPassword.passwordMode, t)}
                />
                <PlainDetailItem
                  label={t("common.type", "Type")}
                  value={
                    createdPassword.resourceKind === "lightsail"
                      ? t("cloud.providers.aws.lightsail_label", "AWS Lightsail")
                      : t("cloud.providers.aws.ec2_label", "AWS EC2")
                  }
                />
              </div>
            </div>

            <div className={`rounded-lg px-4 py-3 text-sm ${createdPassword.passwordSaved ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300" : "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"}`}>
              <div className={cloudLongTextClassName}>
                {createdPassword.passwordSaved
                  ? t("cloud.password.create_saved", "This root password has been encrypted and saved. You can reopen it later from the instance list.")
                  : createdPassword.passwordSaveError
                    ? t("cloud.password.create_unsaved_reason", {
                        reason: createdPassword.passwordSaveError,
                        defaultValue: `Password save failed: ${createdPassword.passwordSaveError}`,
                      })
                    : t("cloud.password.create_unsaved", "This root password was not saved on the server. Save it now if you still need it later.")}
              </div>
            </div>

            <CloudCopyBlock
              title={t("cloud.access.root_password", "Root Password")}
              copyLabel={t("copy", "Copy")}
              onCopy={() => {
                void onCopyText(createdPassword.rootPassword);
              }}
            >
              <CloudReadonlyCodeBlock value={createdPassword.rootPassword} />
            </CloudCopyBlock>
          </div>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
}

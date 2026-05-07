import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";

import { AWSQuotaSummary } from "@/components/admin/cloud/AWSQuotaSummary";
import {
  Badge,
  CloudDetailItem,
  CloudSecretValueBlock,
  CloudSensitiveDialogContent,
  CloudStatusNotice,
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

type SavedPasswordDialogProps = {
  savedPassword: SavedPasswordState | null;
  t: TFunction;
  onClose: () => void;
  onCopyText: CopyTextHandler;
};

type CreatedPasswordDialogProps = {
  createdPassword: CreatedPasswordState | null;
  t: TFunction;
  onClose: () => void;
  onCopyText: CopyTextHandler;
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

function getAWSResourceLabel(resourceKind: "ec2" | "lightsail", t: TFunction) {
  return resourceKind === "lightsail"
    ? t("cloud.providers.aws.lightsail_label", "AWS Lightsail")
    : t("cloud.providers.aws.ec2_label", "AWS EC2");
}

export function AWSCredentialSecretDialog({
  credentialSecret,
  t,
  onClose,
  onCopyText,
}: CredentialSecretDialogProps) {
  return (
    <Dialog.Root open={Boolean(credentialSecret)} onOpenChange={(open) => !open && onClose()}>
      {credentialSecret ? (
        <CloudSensitiveDialogContent
          title={t("cloud.providers.aws.credential_dialog_title", "Credential Details")}
          description={t(
            "cloud.providers.aws.credential_dialog_description",
            "View the full AWS credentials only when you need to copy or verify them.",
          )}
          icon={<KeyRound className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.aws.name", "AWS")}</Badge>
              <Badge color="amber">{t("cloud.providers.aws.credentials", "Credentials")}</Badge>
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
              {(credentialSecret.secret.ec2_quota || credentialSecret.secret.ec2_quota_error) ? (
                <div className="rounded-lg border border-border bg-card px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    {t("cloud.providers.aws.ec2_quota", "EC2 Quota")}
                  </div>
                  <div className="mt-3">
                    <AWSQuotaSummary
                      quota={credentialSecret.secret.ec2_quota}
                      error={credentialSecret.secret.ec2_quota_error}
                      t={t}
                    />
                  </div>
                </div>
              ) : null}
            </SecretSidePanel>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CloudDetailItem
              label={t("cloud.tokens.table.name", "Name")}
              value={credentialSecret.secret.credential_name}
              className="bg-card"
            />
            <CloudDetailItem
              label={t("cloud.providers.aws.access_key", "Access Key")}
              value={credentialSecret.secret.access_key_id || "-"}
              className="bg-card"
            />
          </div>
          <CloudSecretValueBlock
            title={t("cloud.providers.aws.secret_access_key", "Secret Access Key")}
            copyLabel={t("copy", "Copy")}
            onCopy={() => {
              void onCopyText(credentialSecret.secret.secret_access_key);
            }}
            value={credentialSecret.secret.secret_access_key}
          />
          {credentialSecret.secret.session_token ? (
            <CloudSecretValueBlock
              title={t("cloud.providers.aws.session_token", "Session Token")}
              copyLabel={t("copy", "Copy")}
              onCopy={() => {
                void onCopyText(credentialSecret.secret.session_token);
              }}
              value={credentialSecret.secret.session_token}
              minHeightClassName="min-h-32"
              maxHeightClassName="max-h-64"
            />
          ) : null}
        </CloudSensitiveDialogContent>
      ) : null}
    </Dialog.Root>
  );
}

export function AWSSavedPasswordDialog({
  savedPassword,
  t,
  onClose,
  onCopyText,
}: SavedPasswordDialogProps) {
  return (
    <Dialog.Root open={Boolean(savedPassword)} onOpenChange={(open) => !open && onClose()}>
      {savedPassword ? (
        <CloudSensitiveDialogContent
          title={t("cloud.password.dialog_title", "Saved Root Password")}
          description={t(
            "cloud.providers.aws.password_dialog_description",
            "View the saved root password for this AWS instance from the current active credential and region.",
          )}
          icon={<LockKeyhole className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{getAWSResourceLabel(savedPassword.resourceKind, t)}</Badge>
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
                label={t("cloud.password.saved_at", "Saved At")}
                value={formatDateTime(savedPassword.credential.updated_at)}
                className="bg-card"
              />
            </SecretSidePanel>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CloudDetailItem label={t("cloud.table.name", "Name")} value={savedPassword.resourceName} className="bg-card" />
            <CloudDetailItem label={t("common.type", "Type")} value={getAWSResourceLabel(savedPassword.resourceKind, t)} className="bg-card" />
            <CloudDetailItem
              label={t("cloud.password.username", "Username")}
              value={savedPassword.credential.username || "root"}
              className="bg-card"
            />
            <CloudDetailItem
              label={t("cloud.password.mode", "Password Mode")}
              value={savedPassword.credential.password_mode || "-"}
              className="bg-card"
            />
          </div>
          <CloudSecretValueBlock
            title={t("cloud.form.root_password", "Root Password")}
            copyLabel={t("copy", "Copy")}
            onCopy={() => {
              void onCopyText(savedPassword.credential.root_password);
            }}
            value={savedPassword.credential.root_password}
          />
        </CloudSensitiveDialogContent>
      ) : null}
    </Dialog.Root>
  );
}

export function AWSCreatedPasswordDialog({
  createdPassword,
  t,
  onClose,
  onCopyText,
}: CreatedPasswordDialogProps) {
  return (
    <Dialog.Root open={Boolean(createdPassword)} onOpenChange={(open) => !open && onClose()}>
      {createdPassword ? (
        <CloudSensitiveDialogContent
          title={t("cloud.access.dialog_title", "Connection Details")}
          description={t(
            "cloud.providers.aws.create_credentials_description",
            "Store this root password now. You can reopen it later only if vault storage is enabled and the save succeeded.",
          )}
          icon={<LockKeyhole className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{getAWSResourceLabel(createdPassword.resourceKind, t)}</Badge>
              <Badge color={createdPassword.passwordSaved ? "green" : "amber"}>
                {createdPassword.passwordSaved
                  ? t("cloud.password.saved", "Saved")
                  : t("cloud.password.not_saved", "Not Saved")}
              </Badge>
            </>
          )}
          side={(
            <SecretSidePanel
              t={t}
              title={t("cloud.password.storage_status", "Storage Status")}
              description={t(
                "cloud.password.storage_status_description",
                "The generated password is shown here so you can copy it immediately.",
              )}
            >
              <CloudStatusNotice tone={createdPassword.passwordSaved ? "green" : "amber"}>
                {createdPassword.passwordSaved
                  ? t("cloud.password.create_saved", "This root password has been encrypted and saved. You can reopen it later from the instance list.")
                  : createdPassword.passwordSaveError
                    ? t("cloud.password.create_unsaved_reason", {
                        reason: createdPassword.passwordSaveError,
                        defaultValue: `Password save failed: ${createdPassword.passwordSaveError}`,
                      })
                    : t("cloud.password.create_unsaved", "This root password was not saved on the server. Save it now if you still need it later.")}
              </CloudStatusNotice>
            </SecretSidePanel>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CloudDetailItem label={t("cloud.table.name", "Name")} value={createdPassword.resourceName} className="bg-card" />
            <CloudDetailItem label={t("common.type", "Type")} value={getAWSResourceLabel(createdPassword.resourceKind, t)} className="bg-card" />
            <CloudDetailItem
              label={t("cloud.password.mode", "Password Mode")}
              value={getRootPasswordModeLabel(createdPassword.passwordMode, t)}
              className="bg-card"
            />
          </div>
          <CloudSecretValueBlock
            title={t("cloud.access.root_password", "Root Password")}
            copyLabel={t("copy", "Copy")}
            onCopy={() => {
              void onCopyText(createdPassword.rootPassword);
            }}
            value={createdPassword.rootPassword}
          />
        </CloudSensitiveDialogContent>
      ) : null}
    </Dialog.Root>
  );
}

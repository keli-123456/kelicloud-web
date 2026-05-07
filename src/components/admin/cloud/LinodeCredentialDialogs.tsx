import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";

import {
  Badge,
  CloudDetailItem,
  CloudSecretValueBlock,
  CloudSensitiveDialogContent,
  CloudStatusNotice,
  Dialog,
} from "@/components/admin/cloud/cloud-ui";
import {
  formatDateTime,
  type CreatedPasswordState,
  type SavedPasswordState,
  type TokenSecretState,
} from "./linodePanelUtils";

type MaybePromise<T> = T | Promise<T>;

type CopyText = (text: string) => MaybePromise<void>;

type LinodeTokenSecretDialogProps = {
  t: TFunction;
  tokenSecret: TokenSecretState | null;
  onClose: () => void;
  copyText: CopyText;
};

type LinodeSavedPasswordDialogProps = {
  t: TFunction;
  savedPassword: SavedPasswordState | null;
  onClose: () => void;
  copyText: CopyText;
};

type LinodeCreatedPasswordDialogProps = {
  t: TFunction;
  createdPassword: CreatedPasswordState | null;
  onClose: () => void;
  copyText: CopyText;
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

export function LinodeTokenSecretDialog({
  t,
  tokenSecret,
  onClose,
  copyText,
}: LinodeTokenSecretDialogProps) {
  return (
    <Dialog.Root open={Boolean(tokenSecret)} onOpenChange={(open) => !open && onClose()}>
      {tokenSecret ? (
        <CloudSensitiveDialogContent
          title={t("cloud.tokens.token_dialog_title", "Token Details")}
          description={t(
            "cloud.providers.linode.token_dialog_description",
            "View the full Linode token only when you need to copy or verify it.",
          )}
          icon={<KeyRound className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.linode.name", "Linode")}</Badge>
              <Badge color="amber">{t("cloud.tokens.token", "Token")}</Badge>
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
                label={t("cloud.tokens.masked_token", "Masked Token")}
                value={tokenSecret.secret.masked_token || "-"}
                className="bg-card"
              />
            </SecretSidePanel>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CloudDetailItem
              label={t("cloud.tokens.table.name", "Name")}
              value={tokenSecret.secret.token_name}
              className="bg-card"
            />
            <CloudDetailItem
              label={t("cloud.tokens.table.account", "Account")}
              value={tokenSecret.secret.profile_email || tokenSecret.secret.profile_username || "-"}
              className="bg-card"
            />
          </div>
          <CloudSecretValueBlock
            title={t("cloud.tokens.full_token", "Full Token")}
            copyLabel={t("copy", "Copy")}
            onCopy={() => { void copyText(tokenSecret.secret.token); }}
            value={tokenSecret.secret.token}
          />
        </CloudSensitiveDialogContent>
      ) : null}
    </Dialog.Root>
  );
}

export function LinodeSavedPasswordDialog({
  t,
  savedPassword,
  onClose,
  copyText,
}: LinodeSavedPasswordDialogProps) {
  return (
    <Dialog.Root open={Boolean(savedPassword)} onOpenChange={(open) => !open && onClose()}>
      {savedPassword ? (
        <CloudSensitiveDialogContent
          title={t("cloud.password.dialog_title", "Saved Root Password")}
          description={t(
            "cloud.providers.linode.password_dialog_description",
            "View the saved root password for this Linode instance from the current active token.",
          )}
          icon={<LockKeyhole className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.linode.name", "Linode")}</Badge>
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
            <CloudDetailItem label={t("cloud.table.name", "Name")} value={savedPassword.instance.label} className="bg-card" />
            <CloudDetailItem label={t("cloud.password.username", "Username")} value={savedPassword.credential.username} className="bg-card" />
            <CloudDetailItem label={t("cloud.password.mode", "Password Mode")} value={savedPassword.credential.password_mode || "-"} className="bg-card" />
          </div>
          <CloudSecretValueBlock
            title={t("cloud.form.root_password", "Root Password")}
            copyLabel={t("copy", "Copy")}
            onCopy={() => { void copyText(savedPassword.credential.root_password); }}
            value={savedPassword.credential.root_password}
          />
        </CloudSensitiveDialogContent>
      ) : null}
    </Dialog.Root>
  );
}

export function LinodeCreatedPasswordDialog({
  t,
  createdPassword,
  onClose,
  copyText,
}: LinodeCreatedPasswordDialogProps) {
  return (
    <Dialog.Root open={Boolean(createdPassword)} onOpenChange={(open) => !open && onClose()}>
      {createdPassword ? (
        <CloudSensitiveDialogContent
          title={t("cloud.providers.linode.create_credentials_title", "Root Access Credentials")}
          description={t(
            "cloud.providers.linode.create_credentials_description",
            "Store this root password now. You can reopen it later only if password vault storage is enabled and the save succeeded.",
          )}
          icon={<LockKeyhole className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.linode.name", "Linode")}</Badge>
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
            <CloudDetailItem label={t("cloud.table.name", "Name")} value={createdPassword.instance.label} className="bg-card" />
            <CloudDetailItem label={t("cloud.password.mode", "Password Mode")} value={createdPassword.passwordMode} className="bg-card" />
          </div>
          <CloudSecretValueBlock
            title={t("cloud.form.root_password", "Root Password")}
            copyLabel={t("copy", "Copy")}
            onCopy={() => { void copyText(createdPassword.rootPassword); }}
            value={createdPassword.rootPassword}
          />
        </CloudSensitiveDialogContent>
      ) : null}
    </Dialog.Root>
  );
}

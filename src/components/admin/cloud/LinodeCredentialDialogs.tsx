import type { TFunction } from "i18next";

import {
  CloudCopyBlock,
  CloudDetailItem,
  CloudReadonlyCodeBlock,
  cloudDialogContentClassName,
  cloudLongTextClassName,
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

const DetailItem = CloudDetailItem;

export function LinodeTokenSecretDialog({
  t,
  tokenSecret,
  onClose,
  copyText,
}: LinodeTokenSecretDialogProps) {
  return (
    <Dialog.Root open={Boolean(tokenSecret)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content className={cloudDialogContentClassName}>
        <Dialog.Title>{t("cloud.tokens.token_dialog_title", "Token Details")}</Dialog.Title>
        <Dialog.Description>
          {t(
            "cloud.providers.linode.token_dialog_description",
            "View the full Linode token only when you need to copy or verify it.",
          )}
        </Dialog.Description>

        {tokenSecret ? (
          <div className="mt-4 flex flex-col gap-4">
            <DetailItem label={t("cloud.tokens.table.name", "Name")} value={tokenSecret.secret.token_name} />
            <DetailItem label={t("cloud.tokens.table.account", "Account")} value={tokenSecret.secret.profile_email || tokenSecret.secret.profile_username || "-"} />
            <DetailItem label={t("cloud.tokens.masked_token", "Masked Token")} value={tokenSecret.secret.masked_token || "-"} />
            <CloudCopyBlock
              title={t("cloud.tokens.full_token", "Full Token")}
              copyLabel={t("copy", "Copy")}
              onCopy={() => { void copyText(tokenSecret.secret.token); }}
            >
              <CloudReadonlyCodeBlock value={tokenSecret.secret.token} />
            </CloudCopyBlock>
          </div>
        ) : null}
      </Dialog.Content>
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
      <Dialog.Content className={cloudDialogContentClassName}>
        <Dialog.Title>{t("cloud.password.dialog_title", "Saved Root Password")}</Dialog.Title>
        <Dialog.Description>
          {t(
            "cloud.providers.linode.password_dialog_description",
            "View the saved root password for this Linode instance from the current active token.",
          )}
        </Dialog.Description>

        {savedPassword ? (
          <div className="mt-4 flex flex-col gap-4">
            <DetailItem label={t("cloud.table.name", "Name")} value={savedPassword.instance.label} />
            <DetailItem label={t("cloud.password.username", "Username")} value={savedPassword.credential.username} />
            <DetailItem label={t("cloud.password.mode", "Password Mode")} value={savedPassword.credential.password_mode || "-"} />
            <DetailItem label={t("cloud.password.saved_at", "Saved At")} value={formatDateTime(savedPassword.credential.updated_at)} />
            <CloudCopyBlock
              title={t("cloud.form.root_password", "Root Password")}
              copyLabel={t("copy", "Copy")}
              onCopy={() => { void copyText(savedPassword.credential.root_password); }}
            >
              <CloudReadonlyCodeBlock value={savedPassword.credential.root_password} />
            </CloudCopyBlock>
          </div>
        ) : null}
      </Dialog.Content>
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
      <Dialog.Content className={cloudDialogContentClassName}>
        <Dialog.Title>{t("cloud.providers.linode.create_credentials_title", "Root Access Credentials")}</Dialog.Title>
        <Dialog.Description>
          {t(
            "cloud.providers.linode.create_credentials_description",
            "Store this root password now. You can reopen it later only if password vault storage is enabled and the save succeeded.",
          )}
        </Dialog.Description>

        {createdPassword ? (
          <div className="mt-4 flex flex-col gap-4">
            <DetailItem label={t("cloud.table.name", "Name")} value={createdPassword.instance.label} />
            <DetailItem label={t("cloud.password.mode", "Password Mode")} value={createdPassword.passwordMode} />
            <CloudCopyBlock
              title={t("cloud.form.root_password", "Root Password")}
              copyLabel={t("copy", "Copy")}
              onCopy={() => { void copyText(createdPassword.rootPassword); }}
            >
              <CloudReadonlyCodeBlock value={createdPassword.rootPassword} />
            </CloudCopyBlock>
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
          </div>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
}

import type { TFunction } from "i18next";

import type {
  DigitalOceanDroplet,
  DigitalOceanDropletPassword,
  DigitalOceanManagedSSHKeyMaterial,
  DigitalOceanTokenSecret,
} from "@/lib/cloud";
import {
  CloudCopyBlock,
  CloudDetailItem,
  CloudReadonlyCodeBlock,
  cloudDialogContentClassName,
  cloudLongTextClassName,
  Dialog,
} from "@/components/admin/cloud/cloud-ui";

type MaybePromise<T> = T | Promise<T>;

type TokenSecretState = {
  secret: DigitalOceanTokenSecret;
};

type SavedDropletPasswordState = {
  droplet: DigitalOceanDroplet;
  credential: DigitalOceanDropletPassword;
};

type DropletAccessSecrets = {
  droplet: DigitalOceanDroplet;
  rootPassword: string;
  passwordMode: "custom" | "random";
  managedSSHKey: DigitalOceanManagedSSHKeyMaterial | null;
  passwordSaved: boolean;
  passwordSaveError: string;
};

type CopyText = (text: string) => MaybePromise<void>;

type DigitalOceanTokenSecretDialogProps = {
  t: TFunction;
  tokenSecret: TokenSecretState | null;
  onClose: () => void;
  copyText: CopyText;
};

type DigitalOceanManagedKeyDialogProps = {
  t: TFunction;
  managedKeyMaterial: DigitalOceanManagedSSHKeyMaterial | null;
  onClose: () => void;
  copyText: CopyText;
};

type DigitalOceanSavedPasswordDialogProps = {
  t: TFunction;
  savedDropletPassword: SavedDropletPasswordState | null;
  onClose: () => void;
  copyText: CopyText;
  getDropletPrimaryIp: (droplet: DigitalOceanDroplet) => string;
  formatDateTime: (value: string) => string;
};

type DigitalOceanAccessSecretsDialogProps = {
  t: TFunction;
  accessSecrets: DropletAccessSecrets | null;
  onClose: () => void;
  copyText: CopyText;
  getDropletPrimaryIp: (droplet: DigitalOceanDroplet) => string;
};

const DetailItem = CloudDetailItem;

export function DigitalOceanTokenSecretDialog({
  t,
  tokenSecret,
  onClose,
  copyText,
}: DigitalOceanTokenSecretDialogProps) {
  return (
    <Dialog.Root open={Boolean(tokenSecret)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content className={cloudDialogContentClassName}>
        <Dialog.Title>{t("cloud.tokens.token_dialog_title", "Token Details")}</Dialog.Title>
        <Dialog.Description>
          {t(
            "cloud.tokens.token_dialog_description",
            "View the full DigitalOcean token only when you need to copy or verify it.",
          )}
        </Dialog.Description>

        {tokenSecret ? (
          <div className="mt-4 flex flex-col gap-4">
            <DetailItem label={t("cloud.tokens.table.name", "Name")} value={tokenSecret.secret.token_name} />
            <DetailItem
              label={t("cloud.tokens.table.account", "Account")}
              value={tokenSecret.secret.account_email || "-"}
            />
            <DetailItem
              label={t("cloud.tokens.masked_token", "Masked Token")}
              value={tokenSecret.secret.masked_token || "-"}
            />
            <CloudCopyBlock
              title={t("cloud.tokens.full_token", "Full Token")}
              copyLabel={t("copy", "Copy")}
              onCopy={() => {
                void copyText(tokenSecret.secret.token);
              }}
            >
              <CloudReadonlyCodeBlock value={tokenSecret.secret.token} />
            </CloudCopyBlock>
          </div>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
}

export function DigitalOceanManagedKeyDialog({
  t,
  managedKeyMaterial,
  onClose,
  copyText,
}: DigitalOceanManagedKeyDialogProps) {
  return (
    <Dialog.Root open={Boolean(managedKeyMaterial)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content className={cloudDialogContentClassName}>
        <Dialog.Title>{t("cloud.tokens.managed_key_dialog_title", "Managed SSH Key")}</Dialog.Title>
        <Dialog.Description>
          {t(
            "cloud.tokens.managed_key_dialog_description",
            "This is the shared managed SSH key Komari reuses as a fallback when creating DigitalOcean Droplets with root password mode.",
          )}
        </Dialog.Description>

        {managedKeyMaterial ? (
          <div className="mt-4 flex flex-col gap-4">
            <DetailItem label={t("cloud.tokens.table.name", "Name")} value={managedKeyMaterial.token_name} />
            <DetailItem label={t("cloud.tokens.managed_key_name", "Key Name")} value={managedKeyMaterial.name} />
            <DetailItem
              label={t("cloud.tokens.managed_key_registration", "Account Registration")}
              value={managedKeyMaterial.key_id > 0
                ? t("cloud.tokens.managed_key_registered", {
                  keyId: managedKeyMaterial.key_id,
                  defaultValue: `Registered for this account as key #${managedKeyMaterial.key_id}`,
                })
                : t(
                  "cloud.tokens.managed_key_pending_registration",
                  "Not registered for this account yet. Komari will register the shared public key the first time this credential creates a Droplet with root password mode.",
                )}
            />
            <DetailItem
              label={t("cloud.tokens.managed_key_fingerprint", "Fingerprint")}
              value={managedKeyMaterial.fingerprint || "-"}
            />
            <CloudCopyBlock
              title={t("cloud.tokens.public_key", "Public Key")}
              copyLabel={t("copy", "Copy")}
              onCopy={() => {
                void copyText(managedKeyMaterial.public_key);
              }}
            >
              <CloudReadonlyCodeBlock value={managedKeyMaterial.public_key} />
            </CloudCopyBlock>
            <CloudCopyBlock
              title={t("cloud.tokens.private_key", "Private Key")}
              copyLabel={t("copy", "Copy")}
              onCopy={() => {
                void copyText(managedKeyMaterial.private_key);
              }}
            >
              <CloudReadonlyCodeBlock value={managedKeyMaterial.private_key} minHeightClassName="min-h-40" />
            </CloudCopyBlock>
          </div>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
}

export function DigitalOceanSavedPasswordDialog({
  t,
  savedDropletPassword,
  onClose,
  copyText,
  getDropletPrimaryIp,
  formatDateTime,
}: DigitalOceanSavedPasswordDialogProps) {
  return (
    <Dialog.Root open={Boolean(savedDropletPassword)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content className={cloudDialogContentClassName}>
        <Dialog.Title>{t("cloud.password.dialog_title", "Saved Root Password")}</Dialog.Title>
        <Dialog.Description>
          {t(
            "cloud.password.dialog_description",
            "View the saved root password for this Droplet from the current active token.",
          )}
        </Dialog.Description>

        {savedDropletPassword ? (
          <div className="mt-4 flex flex-col gap-4">
            <DetailItem label={t("cloud.table.name", "Name")} value={savedDropletPassword.droplet.name} />
            <DetailItem
              label={t("cloud.table.ip", "Public IP")}
              value={getDropletPrimaryIp(savedDropletPassword.droplet)}
            />
            <DetailItem
              label={t("cloud.password.username", "Username")}
              value={savedDropletPassword.credential.username || "root"}
            />
            <DetailItem
              label={t("cloud.password.mode", "Password Mode")}
              value={
                savedDropletPassword.credential.password_mode
                  ? t(
                      `cloud.form.root_access_modes.${savedDropletPassword.credential.password_mode}`,
                      savedDropletPassword.credential.password_mode,
                    )
                  : "-"
              }
            />
            <DetailItem
              label={t("cloud.password.saved_at", "Saved At")}
              value={formatDateTime(savedDropletPassword.credential.updated_at)}
            />
            <CloudCopyBlock
              title={t("cloud.access.root_password", "Root Password")}
              copyLabel={t("copy", "Copy")}
              onCopy={() => {
                void copyText(savedDropletPassword.credential.root_password);
              }}
            >
              <CloudReadonlyCodeBlock value={savedDropletPassword.credential.root_password} />
            </CloudCopyBlock>
          </div>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
}

export function DigitalOceanAccessSecretsDialog({
  t,
  accessSecrets,
  onClose,
  copyText,
  getDropletPrimaryIp,
}: DigitalOceanAccessSecretsDialogProps) {
  return (
    <Dialog.Root open={Boolean(accessSecrets)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content className={cloudDialogContentClassName}>
        <Dialog.Title>{t("cloud.access.title", "Access Details")}</Dialog.Title>
        <Dialog.Description>
          {t(
            "cloud.access.description",
            "Save these credentials now. The generated password is only shown here once, and the managed SSH key is your fallback access method.",
          )}
        </Dialog.Description>

        {accessSecrets ? (
          <div className="mt-4 flex flex-col gap-4">
            {accessSecrets.passwordSaved ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                {t(
                  "cloud.password.create_saved",
                  "This root password has been encrypted and saved. You can reopen it later from the Droplet list.",
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                <div className={cloudLongTextClassName}>
                  {t(
                    "cloud.password.create_unsaved",
                    "This root password was not saved on the server. Save it now if you still need it later.",
                  )}
                </div>
                {accessSecrets.passwordSaveError ? (
                  <div className={`mt-2 ${cloudLongTextClassName}`}>
                    {t("cloud.password.create_unsaved_reason", {
                      reason: accessSecrets.passwordSaveError,
                      defaultValue: `Password save failed: ${accessSecrets.passwordSaveError}`,
                    })}
                  </div>
                ) : null}
              </div>
            )}
            <DetailItem label={t("cloud.table.name", "Name")} value={accessSecrets.droplet.name} />
            <DetailItem label={t("cloud.table.ip", "Public IP")} value={getDropletPrimaryIp(accessSecrets.droplet)} />

            <CloudCopyBlock
              title={t("cloud.access.root_password", "Root Password")}
              copyLabel={t("copy", "Copy")}
              onCopy={() => {
                void copyText(accessSecrets.rootPassword);
              }}
            >
              <CloudReadonlyCodeBlock value={accessSecrets.rootPassword} />
            </CloudCopyBlock>

            {accessSecrets.managedSSHKey ? (
              <>
                <CloudCopyBlock
                  title={t("cloud.access.private_key", "Managed Private Key")}
                  copyLabel={t("copy", "Copy")}
                  onCopy={() => {
                    void copyText(accessSecrets.managedSSHKey?.private_key || "");
                  }}
                >
                  <CloudReadonlyCodeBlock value={accessSecrets.managedSSHKey.private_key} minHeightClassName="min-h-40" />
                </CloudCopyBlock>
                <DetailItem
                  label={t("cloud.access.ssh_hint", "SSH Login Example")}
                  value={`ssh -i ./id_ed25519 root@${getDropletPrimaryIp(accessSecrets.droplet)}`}
                />
              </>
            ) : null}
          </div>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
}

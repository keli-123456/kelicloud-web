import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { KeyRound, LockKeyhole, ShieldCheck, Terminal } from "lucide-react";

import type {
  DigitalOceanDroplet,
  DigitalOceanDropletPassword,
  DigitalOceanManagedSSHKeyMaterial,
  DigitalOceanTokenSecret,
} from "@/lib/cloud";
import {
  Badge,
  CloudDetailItem,
  CloudSecretValueBlock,
  CloudSensitiveDialogContent,
  CloudStatusNotice,
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

export function DigitalOceanTokenSecretDialog({
  t,
  tokenSecret,
  onClose,
  copyText,
}: DigitalOceanTokenSecretDialogProps) {
  return (
    <Dialog.Root open={Boolean(tokenSecret)} onOpenChange={(open) => !open && onClose()}>
      {tokenSecret ? (
        <CloudSensitiveDialogContent
          title={t("cloud.tokens.token_dialog_title", "Token Details")}
          description={t(
            "cloud.tokens.token_dialog_description",
            "View the full DigitalOcean token only when you need to copy or verify it.",
          )}
          icon={<KeyRound className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.digitalocean.name", "DigitalOcean")}</Badge>
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
            <CloudDetailItem label={t("cloud.tokens.table.name", "Name")} value={tokenSecret.secret.token_name} className="bg-card" />
            <CloudDetailItem
              label={t("cloud.tokens.table.account", "Account")}
              value={tokenSecret.secret.account_email || "-"}
              className="bg-card"
            />
          </div>
          <CloudSecretValueBlock
            title={t("cloud.tokens.full_token", "Full Token")}
            copyLabel={t("copy", "Copy")}
            onCopy={() => {
              void copyText(tokenSecret.secret.token);
            }}
            value={tokenSecret.secret.token}
          />
        </CloudSensitiveDialogContent>
      ) : null}
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
      {managedKeyMaterial ? (
        <CloudSensitiveDialogContent
          title={t("cloud.tokens.managed_key_dialog_title", "Managed SSH Key")}
          description={t(
            "cloud.tokens.managed_key_dialog_description",
            "This is the shared managed SSH key kelicloud reuses as a fallback when creating DigitalOcean Droplets with root password mode.",
          )}
          icon={<KeyRound className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.digitalocean.name", "DigitalOcean")}</Badge>
              <Badge color={managedKeyMaterial.key_id > 0 ? "green" : "amber"}>
                {managedKeyMaterial.key_id > 0
                  ? t("cloud.tokens.managed_key_registered_short", "Registered")
                  : t("cloud.tokens.managed_key_pending_short", "Pending")}
              </Badge>
            </>
          )}
          side={(
            <SecretSidePanel
              t={t}
              title={t("cloud.tokens.managed_key_registration", "Account Registration")}
              description={
                managedKeyMaterial.key_id > 0
                  ? t("cloud.tokens.managed_key_registered", {
                      keyId: managedKeyMaterial.key_id,
                      defaultValue: `Registered for this account as key #${managedKeyMaterial.key_id}`,
                    })
                  : t(
                      "cloud.tokens.managed_key_pending_registration",
                      "Not registered for this account yet. kelicloud will register the shared public key the first time this credential creates a Droplet with root password mode.",
                    )
              }
            >
              <CloudDetailItem
                label={t("cloud.tokens.managed_key_fingerprint", "Fingerprint")}
                value={managedKeyMaterial.fingerprint || "-"}
                className="bg-card"
              />
            </SecretSidePanel>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CloudDetailItem label={t("cloud.tokens.table.name", "Name")} value={managedKeyMaterial.token_name} className="bg-card" />
            <CloudDetailItem label={t("cloud.tokens.managed_key_name", "Key Name")} value={managedKeyMaterial.name} className="bg-card" />
          </div>
          <CloudSecretValueBlock
            title={t("cloud.tokens.public_key", "Public Key")}
            copyLabel={t("copy", "Copy")}
            onCopy={() => {
              void copyText(managedKeyMaterial.public_key);
            }}
            value={managedKeyMaterial.public_key}
          />
          <CloudSecretValueBlock
            title={t("cloud.tokens.private_key", "Private Key")}
            copyLabel={t("copy", "Copy")}
            onCopy={() => {
              void copyText(managedKeyMaterial.private_key);
            }}
            value={managedKeyMaterial.private_key}
            minHeightClassName="min-h-40"
            maxHeightClassName="max-h-72"
          />
        </CloudSensitiveDialogContent>
      ) : null}
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
      {savedDropletPassword ? (
        <CloudSensitiveDialogContent
          title={t("cloud.password.dialog_title", "Saved Root Password")}
          description={t(
            "cloud.password.dialog_description",
            "View the saved root password for this Droplet from the current active token.",
          )}
          icon={<LockKeyhole className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.digitalocean.name", "DigitalOcean")}</Badge>
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
                value={formatDateTime(savedDropletPassword.credential.updated_at)}
                className="bg-card"
              />
            </SecretSidePanel>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CloudDetailItem label={t("cloud.table.name", "Name")} value={savedDropletPassword.droplet.name} className="bg-card" />
            <CloudDetailItem label={t("cloud.table.ip", "Public IP")} value={getDropletPrimaryIp(savedDropletPassword.droplet)} className="bg-card" />
            <CloudDetailItem
              label={t("cloud.password.username", "Username")}
              value={savedDropletPassword.credential.username || "root"}
              className="bg-card"
            />
            <CloudDetailItem
              label={t("cloud.password.mode", "Password Mode")}
              value={
                savedDropletPassword.credential.password_mode
                  ? t(
                      `cloud.form.root_access_modes.${savedDropletPassword.credential.password_mode}`,
                      savedDropletPassword.credential.password_mode,
                    )
                  : "-"
              }
              className="bg-card"
            />
          </div>
          <CloudSecretValueBlock
            title={t("cloud.access.root_password", "Root Password")}
            copyLabel={t("copy", "Copy")}
            onCopy={() => {
              void copyText(savedDropletPassword.credential.root_password);
            }}
            value={savedDropletPassword.credential.root_password}
          />
        </CloudSensitiveDialogContent>
      ) : null}
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
      {accessSecrets ? (
        <CloudSensitiveDialogContent
          title={t("cloud.access.title", "Access Details")}
          description={t(
            "cloud.access.description",
            "Save these credentials now. The generated password is only shown here once, and the managed SSH key is your fallback access method.",
          )}
          icon={<Terminal className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.digitalocean.name", "DigitalOcean")}</Badge>
              <Badge color={accessSecrets.passwordSaved ? "green" : "amber"}>
                {accessSecrets.passwordSaved
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
              <CloudStatusNotice tone={accessSecrets.passwordSaved ? "green" : "amber"}>
                {accessSecrets.passwordSaved
                  ? t(
                      "cloud.password.create_saved",
                      "This root password has been encrypted and saved. You can reopen it later from the Droplet list.",
                    )
                  : accessSecrets.passwordSaveError
                    ? t("cloud.password.create_unsaved_reason", {
                        reason: accessSecrets.passwordSaveError,
                        defaultValue: `Password save failed: ${accessSecrets.passwordSaveError}`,
                      })
                    : t(
                        "cloud.password.create_unsaved",
                        "This root password was not saved on the server. Save it now if you still need it later.",
                      )}
              </CloudStatusNotice>
            </SecretSidePanel>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CloudDetailItem label={t("cloud.table.name", "Name")} value={accessSecrets.droplet.name} className="bg-card" />
            <CloudDetailItem label={t("cloud.table.ip", "Public IP")} value={getDropletPrimaryIp(accessSecrets.droplet)} className="bg-card" />
            <CloudDetailItem
              label={t("cloud.password.mode", "Password Mode")}
              value={accessSecrets.passwordMode}
              className="bg-card"
            />
          </div>

          <CloudSecretValueBlock
            title={t("cloud.access.root_password", "Root Password")}
            copyLabel={t("copy", "Copy")}
            onCopy={() => {
              void copyText(accessSecrets.rootPassword);
            }}
            value={accessSecrets.rootPassword}
          />

          {accessSecrets.managedSSHKey ? (
            <>
              <CloudSecretValueBlock
                title={t("cloud.access.private_key", "Managed Private Key")}
                copyLabel={t("copy", "Copy")}
                onCopy={() => {
                  void copyText(accessSecrets.managedSSHKey?.private_key || "");
                }}
                value={accessSecrets.managedSSHKey.private_key}
                minHeightClassName="min-h-40"
                maxHeightClassName="max-h-72"
              />
              <CloudDetailItem
                label={t("cloud.access.ssh_hint", "SSH Login Example")}
                value={`ssh -i ./id_ed25519 root@${getDropletPrimaryIp(accessSecrets.droplet)}`}
                className="bg-card"
              />
            </>
          ) : null}
        </CloudSensitiveDialogContent>
      ) : null}
    </Dialog.Root>
  );
}

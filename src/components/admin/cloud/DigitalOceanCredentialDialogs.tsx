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
      <div className="border-y border-slate-200/80 bg-transparent py-3 shadow-none dark:border-slate-800">
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
          "只在需要时复制敏感值，使用完成后请关闭弹窗。",
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
          title={t("cloud.tokens.token_dialog_title", "令牌详情")}
          description={t(
            "cloud.tokens.token_dialog_description",
            "仅在需要复制或核对时查看完整 DigitalOcean 令牌。",
          )}
          icon={<KeyRound className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.digitalocean.name", "DigitalOcean")}</Badge>
              <Badge color="amber">{t("cloud.tokens.token", "令牌")}</Badge>
            </>
          )}
          side={(
            <SecretSidePanel
              t={t}
              title={t("cloud.secret.scope", "访问范围")}
              description={t(
                "cloud.secret.token_scope_hint",
                "这个凭证可以通过云厂商 API 管理云资源。",
              )}
            >
              <CloudDetailItem
                label={t("cloud.tokens.masked_token", "脱敏令牌")}
                value={tokenSecret.secret.masked_token || "-"}
                className="bg-card"
              />
            </SecretSidePanel>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CloudDetailItem label={t("cloud.tokens.table.name", "名称")} value={tokenSecret.secret.token_name} className="bg-card" />
            <CloudDetailItem
              label={t("cloud.tokens.table.account", "账户")}
              value={tokenSecret.secret.account_email || "-"}
              className="bg-card"
            />
          </div>
          <CloudSecretValueBlock
            title={t("cloud.tokens.full_token", "完整令牌")}
            copyLabel={t("copy", "复制")}
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
          title={t("cloud.tokens.managed_key_dialog_title", "托管 SSH 密钥")}
          description={t(
            "cloud.tokens.managed_key_dialog_description",
            "这是 kelicloud 在 Root 密码模式创建 DigitalOcean Droplet 时复用的托管 SSH 密钥。",
          )}
          icon={<KeyRound className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.digitalocean.name", "DigitalOcean")}</Badge>
              <Badge color={managedKeyMaterial.key_id > 0 ? "green" : "amber"}>
                {managedKeyMaterial.key_id > 0
                  ? t("cloud.tokens.managed_key_registered_short", "已注册")
                  : t("cloud.tokens.managed_key_pending_short", "待注册")}
              </Badge>
            </>
          )}
          side={(
            <SecretSidePanel
              t={t}
              title={t("cloud.tokens.managed_key_registration", "账号注册状态")}
              description={
                managedKeyMaterial.key_id > 0
                  ? t("cloud.tokens.managed_key_registered", {
                      keyId: managedKeyMaterial.key_id,
                      defaultValue: `已为当前账号注册为密钥 #${managedKeyMaterial.key_id}`,
                    })
                  : t(
                      "cloud.tokens.managed_key_pending_registration",
                      "当前账号还没有注册这个密钥。kelicloud 会在此凭证首次以 Root 密码模式创建 Droplet 时自动注册共享公钥。",
                    )
              }
            >
              <CloudDetailItem
                label={t("cloud.tokens.managed_key_fingerprint", "指纹")}
                value={managedKeyMaterial.fingerprint || "-"}
                className="bg-card"
              />
            </SecretSidePanel>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CloudDetailItem label={t("cloud.tokens.table.name", "名称")} value={managedKeyMaterial.token_name} className="bg-card" />
            <CloudDetailItem label={t("cloud.tokens.managed_key_name", "密钥名称")} value={managedKeyMaterial.name} className="bg-card" />
          </div>
          <CloudSecretValueBlock
            title={t("cloud.tokens.public_key", "公钥")}
            copyLabel={t("copy", "复制")}
            onCopy={() => {
              void copyText(managedKeyMaterial.public_key);
            }}
            value={managedKeyMaterial.public_key}
          />
          <CloudSecretValueBlock
            title={t("cloud.tokens.private_key", "私钥")}
            copyLabel={t("copy", "复制")}
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
          title={t("cloud.password.dialog_title", "已保存 Root 密码")}
          description={t(
            "cloud.password.dialog_description",
            "查看当前活动令牌下这个 Droplet 保存的 Root 密码。",
          )}
          icon={<LockKeyhole className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.digitalocean.name", "DigitalOcean")}</Badge>
              <Badge color="green">{t("cloud.password.saved", "已保存")}</Badge>
            </>
          )}
          side={(
            <SecretSidePanel
              t={t}
              title={t("cloud.password.login_context", "登录信息")}
              description={t(
                "cloud.password.login_context_description",
                "连接这个实例时请同时使用用户名和密码。",
              )}
            >
              <CloudDetailItem
                label={t("cloud.password.saved_at", "保存时间")}
                value={formatDateTime(savedDropletPassword.credential.updated_at)}
                className="bg-card"
              />
            </SecretSidePanel>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CloudDetailItem label={t("cloud.table.name", "名称")} value={savedDropletPassword.droplet.name} className="bg-card" />
            <CloudDetailItem label={t("cloud.table.ip", "公网 IP")} value={getDropletPrimaryIp(savedDropletPassword.droplet)} className="bg-card" />
            <CloudDetailItem
              label={t("cloud.password.username", "用户名")}
              value={savedDropletPassword.credential.username || "root"}
              className="bg-card"
            />
            <CloudDetailItem
              label={t("cloud.password.mode", "密码模式")}
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
            title={t("cloud.access.root_password", "Root 密码")}
            copyLabel={t("copy", "复制")}
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
          title={t("cloud.access.title", "访问详情")}
          description={t(
            "cloud.access.description",
            "请现在保存这些凭证。生成的密码只会在这里展示一次，托管 SSH 密钥是兜底登录方式。",
          )}
          icon={<Terminal className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.digitalocean.name", "DigitalOcean")}</Badge>
              <Badge color={accessSecrets.passwordSaved ? "green" : "amber"}>
                {accessSecrets.passwordSaved
                  ? t("cloud.password.saved", "已保存")
                  : t("cloud.password.not_saved", "未保存")}
              </Badge>
            </>
          )}
          side={(
            <SecretSidePanel
              t={t}
              title={t("cloud.password.storage_status", "保存状态")}
              description={t(
                "cloud.password.storage_status_description",
                "这里会显示生成的密码，方便你立即复制。",
              )}
            >
              <CloudStatusNotice tone={accessSecrets.passwordSaved ? "green" : "amber"}>
                {accessSecrets.passwordSaved
                  ? t(
                      "cloud.password.create_saved",
                      "这个 Root 密码已经加密保存，后续可以从 Droplet 列表重新查看。",
                    )
                  : accessSecrets.passwordSaveError
                    ? t("cloud.password.create_unsaved_reason", {
                        reason: accessSecrets.passwordSaveError,
                        defaultValue: `密码保存失败：${accessSecrets.passwordSaveError}`,
                      })
                    : t(
                        "cloud.password.create_unsaved",
                        "这个 Root 密码没有保存到服务端。如果后续还需要，请现在保存。",
                      )}
              </CloudStatusNotice>
            </SecretSidePanel>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CloudDetailItem label={t("cloud.table.name", "名称")} value={accessSecrets.droplet.name} className="bg-card" />
            <CloudDetailItem label={t("cloud.table.ip", "公网 IP")} value={getDropletPrimaryIp(accessSecrets.droplet)} className="bg-card" />
            <CloudDetailItem
              label={t("cloud.password.mode", "密码模式")}
              value={accessSecrets.passwordMode}
              className="bg-card"
            />
          </div>

          <CloudSecretValueBlock
            title={t("cloud.access.root_password", "Root 密码")}
            copyLabel={t("copy", "复制")}
            onCopy={() => {
              void copyText(accessSecrets.rootPassword);
            }}
            value={accessSecrets.rootPassword}
          />

          {accessSecrets.managedSSHKey ? (
            <>
              <CloudSecretValueBlock
                title={t("cloud.access.private_key", "托管私钥")}
                copyLabel={t("copy", "复制")}
                onCopy={() => {
                  void copyText(accessSecrets.managedSSHKey?.private_key || "");
                }}
                value={accessSecrets.managedSSHKey.private_key}
                minHeightClassName="min-h-40"
                maxHeightClassName="max-h-72"
              />
              <CloudDetailItem
                label={t("cloud.access.ssh_hint", "SSH 登录示例")}
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

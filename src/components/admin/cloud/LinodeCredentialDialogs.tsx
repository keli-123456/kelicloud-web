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
          title={t("cloud.tokens.token_dialog_title", "令牌详情")}
          description={t(
            "cloud.providers.linode.token_dialog_description",
            "仅在需要复制或核对时查看完整 Linode 令牌。",
          )}
          icon={<KeyRound className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.linode.name", "Linode")}</Badge>
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
            <CloudDetailItem
              label={t("cloud.tokens.table.name", "名称")}
              value={tokenSecret.secret.token_name}
              className="bg-card"
            />
            <CloudDetailItem
              label={t("cloud.tokens.table.account", "账户")}
              value={tokenSecret.secret.profile_email || tokenSecret.secret.profile_username || "-"}
              className="bg-card"
            />
          </div>
          <CloudSecretValueBlock
            title={t("cloud.tokens.full_token", "完整令牌")}
            copyLabel={t("copy", "复制")}
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
          title={t("cloud.password.dialog_title", "已保存 Root 密码")}
          description={t(
            "cloud.providers.linode.password_dialog_description",
            "查看当前活动令牌下这台 Linode 实例保存的 Root 密码。",
          )}
          icon={<LockKeyhole className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.linode.name", "Linode")}</Badge>
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
                value={formatDateTime(savedPassword.credential.updated_at)}
                className="bg-card"
              />
            </SecretSidePanel>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CloudDetailItem label={t("cloud.table.name", "名称")} value={savedPassword.instance.label} className="bg-card" />
            <CloudDetailItem label={t("cloud.password.username", "用户名")} value={savedPassword.credential.username} className="bg-card" />
            <CloudDetailItem label={t("cloud.password.mode", "密码模式")} value={savedPassword.credential.password_mode || "-"} className="bg-card" />
          </div>
          <CloudSecretValueBlock
            title={t("cloud.form.root_password", "Root 密码")}
            copyLabel={t("copy", "复制")}
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
          title={t("cloud.providers.linode.create_credentials_title", "Root 访问凭证")}
          description={t(
            "cloud.providers.linode.create_credentials_description",
            "请现在保存这个 Root 密码。只有启用密码库并保存成功后，后续才能再次查看。",
          )}
          icon={<LockKeyhole className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.linode.name", "Linode")}</Badge>
              <Badge color={createdPassword.passwordSaved ? "green" : "amber"}>
                {createdPassword.passwordSaved
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
              <CloudStatusNotice tone={createdPassword.passwordSaved ? "green" : "amber"}>
                {createdPassword.passwordSaved
                  ? t("cloud.password.create_saved", "这个 Root 密码已经加密保存，后续可以从实例列表重新查看。")
                  : createdPassword.passwordSaveError
                    ? t("cloud.password.create_unsaved_reason", {
                        reason: createdPassword.passwordSaveError,
                        defaultValue: `密码保存失败：${createdPassword.passwordSaveError}`,
                      })
                    : t("cloud.password.create_unsaved", "这个 Root 密码没有保存到服务端。如果后续还需要，请现在保存。")}
              </CloudStatusNotice>
            </SecretSidePanel>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CloudDetailItem label={t("cloud.table.name", "名称")} value={createdPassword.instance.label} className="bg-card" />
            <CloudDetailItem label={t("cloud.password.mode", "密码模式")} value={createdPassword.passwordMode} className="bg-card" />
          </div>
          <CloudSecretValueBlock
            title={t("cloud.form.root_password", "Root 密码")}
            copyLabel={t("copy", "复制")}
            onCopy={() => { void copyText(createdPassword.rootPassword); }}
            value={createdPassword.rootPassword}
          />
        </CloudSensitiveDialogContent>
      ) : null}
    </Dialog.Root>
  );
}

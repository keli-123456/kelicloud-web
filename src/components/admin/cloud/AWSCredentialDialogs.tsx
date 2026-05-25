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
          title={t("cloud.providers.aws.credential_dialog_title", "凭证详情")}
          description={t(
            "cloud.providers.aws.credential_dialog_description",
            "仅在需要复制或核对时查看完整 AWS 凭证。",
          )}
          icon={<KeyRound className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.aws.name", "AWS")}</Badge>
              <Badge color="amber">{t("cloud.providers.aws.credentials", "凭证")}</Badge>
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
              {(credentialSecret.secret.ec2_quota || credentialSecret.secret.ec2_quota_error) ? (
                <div className="border-y border-slate-200/80 bg-transparent py-3 shadow-none dark:border-slate-800">
                  <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    {t("cloud.providers.aws.ec2_quota", "EC2 配额")}
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
              label={t("cloud.tokens.table.name", "名称")}
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
            copyLabel={t("copy", "复制")}
            onCopy={() => {
              void onCopyText(credentialSecret.secret.secret_access_key);
            }}
            value={credentialSecret.secret.secret_access_key}
          />
          {credentialSecret.secret.session_token ? (
            <CloudSecretValueBlock
              title={t("cloud.providers.aws.session_token", "Session Token")}
              copyLabel={t("copy", "复制")}
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
          title={t("cloud.password.dialog_title", "已保存 Root 密码")}
          description={t(
            "cloud.providers.aws.password_dialog_description",
            "查看当前凭证与区域下这个 AWS 实例保存的 Root 密码。",
          )}
          icon={<LockKeyhole className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{getAWSResourceLabel(savedPassword.resourceKind, t)}</Badge>
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
            <CloudDetailItem label={t("cloud.table.name", "名称")} value={savedPassword.resourceName} className="bg-card" />
            <CloudDetailItem label={t("common.type", "类型")} value={getAWSResourceLabel(savedPassword.resourceKind, t)} className="bg-card" />
            <CloudDetailItem
              label={t("cloud.password.username", "用户名")}
              value={savedPassword.credential.username || "root"}
              className="bg-card"
            />
            <CloudDetailItem
              label={t("cloud.password.mode", "密码模式")}
              value={savedPassword.credential.password_mode || "-"}
              className="bg-card"
            />
          </div>
          <CloudSecretValueBlock
            title={t("cloud.form.root_password", "Root 密码")}
            copyLabel={t("copy", "复制")}
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
          title={t("cloud.access.dialog_title", "连接信息")}
          description={t(
            "cloud.providers.aws.create_credentials_description",
            "请现在保存这个 Root 密码。只有启用密码库并保存成功后，后续才能再次查看。",
          )}
          icon={<LockKeyhole className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{getAWSResourceLabel(createdPassword.resourceKind, t)}</Badge>
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
            <CloudDetailItem label={t("cloud.table.name", "名称")} value={createdPassword.resourceName} className="bg-card" />
            <CloudDetailItem label={t("common.type", "类型")} value={getAWSResourceLabel(createdPassword.resourceKind, t)} className="bg-card" />
            <CloudDetailItem
              label={t("cloud.password.mode", "密码模式")}
              value={getRootPasswordModeLabel(createdPassword.passwordMode, t)}
              className="bg-card"
            />
          </div>
          <CloudSecretValueBlock
            title={t("cloud.access.root_password", "Root 密码")}
            copyLabel={t("copy", "复制")}
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

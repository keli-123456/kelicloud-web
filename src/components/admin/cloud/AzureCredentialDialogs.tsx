import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { KeyRound, LockKeyhole, ShieldCheck, Tags, Upload } from "lucide-react";

import {
  Badge,
  Button,
  CloudDetailItem,
  CloudCodeTextarea,
  CloudImportFormSection,
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
        title={t("cloud.providers.azure.import_dialog_title", "批量导入 Azure 凭证")}
        description={t(
          "cloud.providers.azure.import_dialog_description",
          "每行一个凭证（CSV/竖线/Tab），或直接粘贴 JSON 对象/数组。支持 Azure CLI 服务主体 JSON；subscription_id 可选。",
        )}
        icon={<Upload className="size-4" />}
        badge={<Badge color="blue">{t("cloud.providers.azure.name", "Azure")}</Badge>}
        maxWidth="52rem"
        footer={(
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("common.cancel", "取消")}
            </Button>
            <Button onClick={() => { void onImport(); }} disabled={saving}>
              {saving
                ? t("cloud.providers.azure.importing", "导入中...")
                : t("cloud.providers.azure.import", "导入凭证")}
            </Button>
          </>
        )}
      >
        <CloudImportFormSection
          groupLabel={t("cloud.tokens.group", "分组")}
          groupControl={(
            <TextField.Root
              className="min-w-0"
              value={importGroup}
              placeholder={t("cloud.tokens.group_placeholder", "可选的凭证分组")}
              onChange={(event) => setImportGroup(event.target.value)}
            />
          )}
          editorLabel={t("cloud.providers.azure.credential_content", "凭证内容")}
          editor={(
            <CloudCodeTextarea
              minHeightClassName="min-h-[clamp(220px,32vh,280px)]"
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder='{"appId":"...","displayName":"azure-cli-...","password":"...","tenant":"..."}'
            />
          )}
        />
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
        title={t("cloud.tokens.set_group", "设置分组")}
        description={t("cloud.tokens.set_group_description", {
          count: 1,
          defaultValue: "为已选 1 个凭证设置分组。留空则清除分组。",
        })}
        icon={<Tags className="size-4" />}
        badge={<Badge color="blue">{t("cloud.providers.azure.name", "Azure")}</Badge>}
        side={(
          <CloudStatusNotice tone="gray">
            {t(
              "cloud.tokens.group_dialog_hint",
              "分组只影响组织和筛选，不会修改凭证本身。",
            )}
          </CloudStatusNotice>
        )}
      >
        <div className="space-y-2">
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.tokens.group", "分组")}
          </label>
          <TextField.Root
            value={value}
            placeholder={t("cloud.tokens.group_placeholder", "可选的凭证分组")}
            onChange={(event) => onValueChange(event.target.value)}
          />
        </div>
        <Flex justify="end" gap="2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("common.cancel", "取消")}
          </Button>
          <Button onClick={() => { void onSave(); }} disabled={saving}>
            {saving ? t("common.saving", "保存中...") : t("common.save", "保存")}
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
          title={t("cloud.providers.azure.credential_dialog_title", "凭证详情")}
          description={t(
            "cloud.providers.azure.credential_dialog_description",
            "仅在需要复制或核对时查看完整 Azure 应用凭证。",
          )}
          icon={<KeyRound className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.azure.name", "Azure")}</Badge>
              <Badge color="amber">{t("cloud.providers.azure.app_credential", "应用凭证")}</Badge>
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
                label={t("cloud.providers.azure.default_location", "默认区域")}
                value={credentialSecret.secret.default_location || "-"}
                className="bg-card"
              />
            </SecretSidePanel>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CloudDetailItem label={t("cloud.table.name", "名称")} value={credentialSecret.secret.credential_name || "-"} className="bg-card" />
            <CloudDetailItem label={t("cloud.providers.azure.subscription", "订阅")} value={credentialSecret.secret.subscription_display_name || credentialSecret.secret.subscription_id || "-"} className="bg-card" />
            <CloudDetailItem label={t("cloud.providers.azure.tenant_id", "Tenant ID")} value={credentialSecret.secret.tenant_id || "-"} className="bg-card" />
          </div>

          <CloudSecretValueBlock
            title={t("cloud.providers.azure.client_id", "Client ID")}
            copyLabel={t("common.copy", "复制")}
            onCopy={() => void onCopy(credentialSecret.secret.client_id, t("cloud.providers.azure.copy_client_id", "客户端 ID 已复制"))}
            value={credentialSecret.secret.client_id || "-"}
          />

          <CloudSecretValueBlock
            title={t("cloud.providers.azure.client_secret", "Client Secret")}
            copyLabel={t("common.copy", "复制")}
            onCopy={() => void onCopy(credentialSecret.secret.client_secret, t("cloud.providers.azure.copy_client_secret", "客户端密钥已复制"))}
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
          title={t("cloud.password.view", "查看密码")}
          description={t(
            "cloud.providers.azure.password_dialog_description",
            "查看当前活动凭证下这台 Azure VM 保存的 Root 密码。",
          )}
          icon={<LockKeyhole className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.azure.name", "Azure")}</Badge>
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
                label={t("cloud.providers.azure.checked_at", "最近检查")}
                value={formatDateTime(savedPassword.credential.updated_at)}
                className="bg-card"
              />
            </SecretSidePanel>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CloudDetailItem label={t("cloud.table.name", "名称")} value={savedPassword.instance.name || "-"} className="bg-card" />
            <CloudDetailItem label={t("cloud.password.username", "登录用户")} value={savedPassword.credential.username || "-"} className="bg-card" />
          </div>
          <CloudSecretValueBlock
            title={t("cloud.password.root_password", "Root 密码")}
            copyLabel={t("common.copy", "复制")}
            onCopy={() => void onCopy(savedPassword.credential.root_password, t("cloud.password.copy_success", "Root 密码已复制"))}
            value={savedPassword.credential.root_password || "-"}
          />
        </CloudSensitiveDialogContent>
      ) : null}
    </Dialog.Root>
  );
}

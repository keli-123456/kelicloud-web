import type { TFunction } from "i18next";
import { CheckCircle2, ShieldCheck, Tags, Upload } from "lucide-react";

import { AWSRegionSelect } from "@/components/admin/cloud/AWSRegionSelect";
import {
  Badge,
  Button,
  CloudCodeTextarea,
  CloudImportFormSection,
  CloudSensitiveDialogContent,
  CloudStatusNotice,
  cloudPanelFieldLabelClassName,
  Dialog,
  Flex,
  TextField,
} from "@/components/admin/cloud/cloud-ui";
import type { AWSRegionOption } from "./awsPanelCatalog";

type AsyncAction = () => void | Promise<void>;

type AWSCredentialImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: TFunction;
  group: string;
  onGroupChange: (value: string) => void;
  text: string;
  onTextChange: (value: string) => void;
  saving: boolean;
  onImport: AsyncAction;
};

export function AWSCredentialImportDialog({
  open,
  onOpenChange,
  t,
  group,
  onGroupChange,
  text,
  onTextChange,
  saving,
  onImport,
}: AWSCredentialImportDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <CloudSensitiveDialogContent
        title={t("cloud.providers.aws.import_dialog_title", "批量导入 AWS 凭证")}
        description={t(
          "cloud.providers.aws.import_dialog_description",
          "每行一个凭证。支持 accessKeyId,secretAccessKey、accessKeyId,secretAccessKey,region，或 name,accessKeyId,secretAccessKey[,region[,sessionToken]]。区域可选，只作为初始兜底。",
        )}
        icon={<Upload className="size-4" />}
        badge={<Badge color="blue">{t("cloud.providers.aws.name", "AWS")}</Badge>}
        className="sm:max-w-[56rem]"
      >
        <CloudImportFormSection
          groupLabel={t("cloud.tokens.group", "分组")}
          groupControl={(
            <TextField.Root
              className="min-w-0"
              value={group}
              placeholder={t("cloud.tokens.group_placeholder", "可选的凭证分组")}
              onChange={(event) => onGroupChange(event.target.value)}
            />
          )}
          editorLabel={t("cloud.providers.aws.credential_content", "凭证内容")}
          editor={(
            <CloudCodeTextarea
              value={text}
              minHeightClassName="min-h-72"
              placeholder={"AKIA...,secret...\nAKIA... secret...\nprod,AKIA...,secret...,ap-southeast-1\nbackup|AKIA...|secret...|ap-southeast-1|session-token"}
              onChange={(event) => onTextChange(event.target.value)}
            />
          )}
          footer={(
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                {t("common.cancel", "取消")}
              </Button>
              <Button onClick={() => { void onImport(); }} disabled={saving}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {saving
                  ? t("cloud.tokens.importing", "导入中...")
                  : t("cloud.providers.aws.import", "导入凭证")}
              </Button>
            </>
          )}
        />
      </CloudSensitiveDialogContent>
    </Dialog.Root>
  );
}

type AWSCredentialGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: TFunction;
  selectedCount: number;
  value: string;
  onValueChange: (value: string) => void;
  saving: boolean;
  onSave: AsyncAction;
};

export function AWSCredentialGroupDialog({
  open,
  onOpenChange,
  t,
  selectedCount,
  value,
  onValueChange,
  saving,
  onSave,
}: AWSCredentialGroupDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <CloudSensitiveDialogContent
        title={t("cloud.tokens.set_group", "设置分组")}
        description={t("cloud.tokens.set_group_description", {
          count: selectedCount,
          defaultValue: `为已选 ${selectedCount} 个凭证设置分组。留空则清除分组。`,
        })}
        icon={<Tags className="size-4" />}
        badge={<Badge color="blue">{t("cloud.providers.aws.name", "AWS")}</Badge>}
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

type AWSCredentialCheckDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: TFunction;
  region: string;
  onRegionChange: (value: string) => void;
  regionOptions: AWSRegionOption[];
  searchPlaceholder: string;
  emptyLabel: string;
  checking: boolean;
  onSubmit: AsyncAction;
};

export function AWSCredentialCheckDialog({
  open,
  onOpenChange,
  t,
  region,
  onRegionChange,
  regionOptions,
  searchPlaceholder,
  emptyLabel,
  checking,
  onSubmit,
}: AWSCredentialCheckDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <CloudSensitiveDialogContent
        title={t("cloud.providers.aws.check_dialog_title", "批量检测 AWS 凭证")}
        description={t(
          "cloud.providers.aws.check_dialog_description",
          "先选择本次批量测活使用的 AWS 区域，然后 kelicloud 会验证所选凭证。",
        )}
        icon={<ShieldCheck className="size-4" />}
        badge={<Badge color="blue">{t("cloud.providers.aws.name", "AWS")}</Badge>}
        side={(
          <CloudStatusNotice tone="blue">
            {t(
              "cloud.providers.aws.check_dialog_hint",
              "所选区域会用于验证请求和配额相关检查。",
            )}
          </CloudStatusNotice>
        )}
      >
        <div className="space-y-2">
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.providers.aws.region", "区域")}
          </label>
          <AWSRegionSelect
            value={region}
            options={regionOptions}
            placeholder={t("cloud.providers.aws.region", "区域")}
            searchPlaceholder={searchPlaceholder}
            emptyLabel={emptyLabel}
            onValueChange={onRegionChange}
          />
        </div>
        <Flex justify="end" gap="2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={checking}
          >
            {t("common.cancel", "取消")}
          </Button>
          <Button
            onClick={() => {
              void onSubmit();
            }}
            disabled={checking || !region}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            {t("cloud.tokens.check_all", "批量测活")}
          </Button>
        </Flex>
      </CloudSensitiveDialogContent>
    </Dialog.Root>
  );
}

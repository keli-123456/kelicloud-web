import type { TFunction } from "i18next";
import { CheckCircle2, ShieldCheck, Tags, Upload } from "lucide-react";

import { AWSRegionSelect } from "@/components/admin/cloud/AWSRegionSelect";
import {
  Badge,
  Button,
  CloudImportFormSection,
  CloudSensitiveDialogContent,
  CloudStatusNotice,
  cloudPanelFieldLabelClassName,
  Dialog,
  Flex,
  TextArea,
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
        title={t("cloud.providers.aws.import_dialog_title", "Batch Import AWS Credentials")}
        description={t(
          "cloud.providers.aws.import_dialog_description",
          "One line per credential. Supported formats: accessKeyId,secretAccessKey; accessKeyId,secretAccessKey,region; or name,accessKeyId,secretAccessKey[,region[,sessionToken]]. Region is optional and only used as an initial fallback.",
        )}
        icon={<Upload className="size-4" />}
        badge={<Badge color="blue">{t("cloud.providers.aws.name", "AWS")}</Badge>}
        className="sm:max-w-3xl"
      >
        <CloudImportFormSection
          groupLabel={t("cloud.tokens.group", "Group")}
          groupControl={(
            <TextField.Root
              className="sm:max-w-xs"
              value={group}
              placeholder={t("cloud.tokens.group_placeholder", "Optional token group")}
              onChange={(event) => onGroupChange(event.target.value)}
            />
          )}
          editorLabel={t("cloud.providers.aws.credential_content", "Credential Content")}
          editor={(
            <TextArea
              value={text}
              rows={10}
              resize="vertical"
              className="min-h-56 font-mono text-sm leading-6"
              placeholder={"AKIA...,secret...\nAKIA... secret...\nprod,AKIA...,secret...,ap-southeast-1\nbackup|AKIA...|secret...|ap-southeast-1|session-token"}
              onChange={(event) => onTextChange(event.target.value)}
            />
          )}
          footer={(
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button onClick={() => { void onImport(); }} disabled={saving}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {saving
                  ? t("cloud.tokens.importing", "Importing...")
                  : t("cloud.providers.aws.import", "Import Credentials")}
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
        title={t("cloud.tokens.set_group", "Set Group")}
        description={t("cloud.tokens.set_group_description", {
          count: selectedCount,
          defaultValue: `Update the group for ${selectedCount} selected credential(s). Leave empty to remove the group.`,
        })}
        icon={<Tags className="size-4" />}
        badge={<Badge color="blue">{t("cloud.providers.aws.name", "AWS")}</Badge>}
        side={(
          <CloudStatusNotice tone="gray">
            {t(
              "cloud.tokens.group_dialog_hint",
              "Groups only affect organization and filtering. They do not change the credential itself.",
            )}
          </CloudStatusNotice>
        )}
      >
        <div className="space-y-2">
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.tokens.group", "Group")}
          </label>
          <TextField.Root
            value={value}
            placeholder={t("cloud.tokens.group_placeholder", "Optional token group")}
            onChange={(event) => onValueChange(event.target.value)}
          />
        </div>
        <Flex justify="end" gap="2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={() => { void onSave(); }} disabled={saving}>
            {saving ? t("common.saving", "Saving...") : t("common.save", "Save")}
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
        title={t("cloud.providers.aws.check_dialog_title", "Batch Check AWS Credentials")}
        description={t(
          "cloud.providers.aws.check_dialog_description",
          "Choose the AWS region used for this batch health check before Komari validates the selected credentials.",
        )}
        icon={<ShieldCheck className="size-4" />}
        badge={<Badge color="blue">{t("cloud.providers.aws.name", "AWS")}</Badge>}
        side={(
          <CloudStatusNotice tone="blue">
            {t(
              "cloud.providers.aws.check_dialog_hint",
              "The selected region is used for the validation request and quota-related checks.",
            )}
          </CloudStatusNotice>
        )}
      >
        <div className="space-y-2">
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.providers.aws.region", "Region")}
          </label>
          <AWSRegionSelect
            value={region}
            options={regionOptions}
            placeholder={t("cloud.providers.aws.region", "Region")}
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
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={() => {
              void onSubmit();
            }}
            disabled={checking || !region}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            {t("cloud.tokens.check_all", "Check All Tokens")}
          </Button>
        </Flex>
      </CloudSensitiveDialogContent>
    </Dialog.Root>
  );
}

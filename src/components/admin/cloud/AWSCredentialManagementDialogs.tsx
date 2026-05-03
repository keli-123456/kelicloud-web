import { CheckCircle2, ShieldCheck } from "lucide-react";
import type { TFunction } from "i18next";

import { AWSRegionSelect } from "@/components/admin/cloud/AWSRegionSelect";
import {
  Button,
  CloudCodeTextarea,
  cloudDialogContentClassName,
  cloudPanelBodyTextClassName,
  cloudPanelFieldLabelClassName,
  Dialog,
  Flex,
  TextField,
} from "@/components/admin/cloud/cloud-ui";
import type { AWSRegionOption } from "./awsPanelCatalog";
import { DEFAULT_AWS_REGION } from "./awsPanelUtils";

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
      <Dialog.Content className={cloudDialogContentClassName}>
        <Dialog.Title>{t("cloud.providers.aws.import_dialog_title", "Batch Import AWS Credentials")}</Dialog.Title>
        <Dialog.Description>
          {t(
            "cloud.providers.aws.import_dialog_description",
            "One line per credential. Supported formats: accessKeyId,secretAccessKey; accessKeyId,secretAccessKey,region; or name,accessKeyId,secretAccessKey[,region[,sessionToken]]. Region is optional and only used as an initial fallback.",
          )}
        </Dialog.Description>

        <div className="mt-4 flex flex-col gap-4">
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.tokens.group", "Group")}
          </label>
          <TextField.Root
            value={group}
            placeholder={t("cloud.tokens.group_placeholder", "Optional token group")}
            onChange={(event) => onGroupChange(event.target.value)}
          />
          <CloudCodeTextarea
            value={text}
            placeholder={"AKIA...,secret...\nAKIA... secret...\nprod,AKIA...,secret...,ap-southeast-1\nbackup|AKIA...|secret...|ap-southeast-1|session-token"}
            onChange={(event) => onTextChange(event.target.value)}
          />
          <div className={cloudPanelBodyTextClassName}>
            {t(
              "cloud.providers.aws.import_dialog_hint",
              `If name is omitted, Komari will generate one from the access key. If region is omitted, ${DEFAULT_AWS_REGION} is used as the initial fallback and you can switch region after selecting the credential.`,
            )}
          </div>
          <Flex justify="end" gap="2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button onClick={() => { void onImport(); }} disabled={saving}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {saving
                ? t("cloud.tokens.importing", "Importing...")
                : t("cloud.providers.aws.import", "Import Credentials")}
            </Button>
          </Flex>
        </div>
      </Dialog.Content>
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
      <Dialog.Content className={cloudDialogContentClassName}>
        <Dialog.Title>{t("cloud.tokens.set_group", "Set Group")}</Dialog.Title>
        <Dialog.Description>
          {t("cloud.tokens.set_group_description", {
            count: selectedCount,
            defaultValue: `Update the group for ${selectedCount} selected credential(s). Leave empty to remove the group.`,
          })}
        </Dialog.Description>

        <div className="mt-4 flex flex-col gap-4">
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.tokens.group", "Group")}
          </label>
          <TextField.Root
            value={value}
            placeholder={t("cloud.tokens.group_placeholder", "Optional token group")}
            onChange={(event) => onValueChange(event.target.value)}
          />
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
        </div>
      </Dialog.Content>
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
      <Dialog.Content className={cloudDialogContentClassName}>
        <Dialog.Title>{t("cloud.providers.aws.check_dialog_title", "Batch Check AWS Credentials")}</Dialog.Title>
        <Dialog.Description>
          {t(
            "cloud.providers.aws.check_dialog_description",
            "Choose the AWS region used for this batch health check before Komari validates the selected credentials.",
          )}
        </Dialog.Description>

        <div className="mt-4 flex flex-col gap-4">
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
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

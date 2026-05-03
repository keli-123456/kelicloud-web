import type { TFunction } from "i18next";
import { CheckCircle2 } from "lucide-react";

import {
  Button,
  CloudCodeTextarea,
  cloudDialogContentClassName,
  cloudPanelFieldLabelClassName,
  Dialog,
  Flex,
  TextField,
} from "@/components/admin/cloud/cloud-ui";

type MaybePromise<T> = T | Promise<T>;

type DigitalOceanTokenImportDialogProps = {
  t: TFunction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokenImportGroup: string;
  setTokenImportGroup: (value: string) => void;
  tokenImportText: string;
  setTokenImportText: (value: string) => void;
  existingTokenGroups: string[];
  saving: boolean;
  onImport: () => MaybePromise<void>;
};

type DigitalOceanTokenGroupDialogProps = {
  t: TFunction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokenGroupEditorValue: string;
  setTokenGroupEditorValue: (value: string) => void;
  tokenGroupEditorIds: string[];
  existingTokenGroups: string[];
  saving: boolean;
  onSave: () => MaybePromise<void>;
};

export function DigitalOceanTokenImportDialog({
  t,
  open,
  onOpenChange,
  tokenImportGroup,
  setTokenImportGroup,
  tokenImportText,
  setTokenImportText,
  existingTokenGroups,
  saving,
  onImport,
}: DigitalOceanTokenImportDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className={cloudDialogContentClassName}>
        <Dialog.Title>{t("cloud.tokens.import_dialog_title", "Batch Import Tokens")}</Dialog.Title>
        <Dialog.Description>
          {t(
            "cloud.tokens.import_dialog_description",
            "One line per token. Supported formats: name,token ; name|token ; or token only.",
          )}
        </Dialog.Description>

        <div className="mt-4 flex flex-col gap-4">
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.tokens.group", "Group")}
          </label>
          <TextField.Root
            value={tokenImportGroup}
            placeholder={t("cloud.tokens.group_placeholder", "Optional token group")}
            onChange={(event) => setTokenImportGroup(event.target.value)}
          />
          {existingTokenGroups.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {existingTokenGroups.map((group) => (
                <Button
                  key={group}
                  variant={tokenImportGroup.trim() === group ? "solid" : "outline"}
                  size="1"
                  type="button"
                  onClick={() => setTokenImportGroup(group)}
                >
                  {group}
                </Button>
              ))}
            </div>
          ) : null}
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.tokens.import_label", "Batch Import")}
          </label>
          <CloudCodeTextarea
            value={tokenImportText}
            placeholder={t(
              "cloud.tokens.import_placeholder",
              "prod-account,dop_v1_xxx\nbackup-account|dop_v1_yyy\ndop_v1_zzz",
            )}
            onChange={(event) => setTokenImportText(event.target.value)}
          />
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {t(
              "cloud.tokens.import_hint",
              "One line per token. Supported formats: name,token ; name|token ; or token only.",
            )}
          </div>
          <Flex justify="end" gap="2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button onClick={() => { void onImport(); }} disabled={saving}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {saving ? t("cloud.tokens.importing", "Importing...") : t("cloud.tokens.import", "Import Tokens")}
            </Button>
          </Flex>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export function DigitalOceanTokenGroupDialog({
  t,
  open,
  onOpenChange,
  tokenGroupEditorValue,
  setTokenGroupEditorValue,
  tokenGroupEditorIds,
  existingTokenGroups,
  saving,
  onSave,
}: DigitalOceanTokenGroupDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className={cloudDialogContentClassName}>
        <Dialog.Title>{t("cloud.tokens.set_group", "Set Group")}</Dialog.Title>
        <Dialog.Description>
          {t("cloud.tokens.set_group_description", {
            count: tokenGroupEditorIds.length,
            defaultValue: `Update the group for ${tokenGroupEditorIds.length} selected token(s). Leave empty to remove the group.`,
          })}
        </Dialog.Description>

        <div className="mt-4 flex flex-col gap-4">
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.tokens.group", "Group")}
          </label>
          <TextField.Root
            value={tokenGroupEditorValue}
            placeholder={t("cloud.tokens.group_placeholder", "Optional token group")}
            onChange={(event) => setTokenGroupEditorValue(event.target.value)}
          />
          {existingTokenGroups.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {existingTokenGroups.map((group) => (
                <Button
                  key={group}
                  variant={tokenGroupEditorValue.trim() === group ? "solid" : "outline"}
                  size="1"
                  type="button"
                  onClick={() => setTokenGroupEditorValue(group)}
                >
                  {group}
                </Button>
              ))}
            </div>
          ) : null}
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

import type { TFunction } from "i18next";
import { CheckCircle2, Tags, Upload } from "lucide-react";

import {
  Badge,
  Button,
  CloudImportFormSection,
  CloudSensitiveDialogContent,
  CloudStatusNotice,
  cloudPanelFieldLabelClassName,
  Dialog,
  Flex,
  Select,
  TextArea,
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

function GroupPresetButtons({
  groups,
  value,
  onChange,
}: {
  groups: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (!groups.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((group) => (
        <Button
          key={group}
          variant={value.trim() === group ? "solid" : "outline"}
          size="1"
          type="button"
          onClick={() => onChange(group)}
        >
          {group}
        </Button>
      ))}
    </div>
  );
}

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
      <CloudSensitiveDialogContent
        title={t("cloud.tokens.import_dialog_title", "Batch Import Tokens")}
        description={t(
          "cloud.tokens.import_dialog_description",
          "One line per token. Supported formats: name,token ; name|token ; or token only.",
        )}
        icon={<Upload className="size-4" />}
        badge={<Badge color="blue">{t("cloud.providers.digitalocean.name", "DigitalOcean")}</Badge>}
        className="sm:max-w-3xl"
      >
        <CloudImportFormSection
          groupLabel={t("cloud.tokens.group", "Group")}
          groupControl={(
            <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center">
              <TextField.Root
                className="lg:max-w-xs"
                value={tokenImportGroup}
                placeholder={t("cloud.tokens.group_placeholder", "Optional token group")}
                onChange={(event) => setTokenImportGroup(event.target.value)}
              />
              {existingTokenGroups.length ? (
                <Select.Root
                  value={existingTokenGroups.includes(tokenImportGroup.trim()) ? tokenImportGroup.trim() : ""}
                  onValueChange={setTokenImportGroup}
                >
                  <Select.Trigger
                    className="w-full lg:w-40"
                    placeholder={t("cloud.tokens.pick_existing_group", "选择已有分组")}
                  />
                  <Select.Content>
                    {existingTokenGroups.map((group) => (
                      <Select.Item key={group} value={group}>
                        {group}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              ) : null}
            </div>
          )}
          editorLabel={t("cloud.tokens.import_content", "Token Content")}
          editor={(
            <TextArea
              value={tokenImportText}
              rows={10}
              resize="vertical"
              className="min-h-56 font-mono text-sm leading-6"
              placeholder={t(
                "cloud.tokens.import_placeholder",
                "prod-account,dop_v1_xxx\nbackup-account|dop_v1_yyy\ndop_v1_zzz",
              )}
              onChange={(event) => setTokenImportText(event.target.value)}
            />
          )}
          footer={(
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button onClick={() => { void onImport(); }} disabled={saving}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {saving ? t("cloud.tokens.importing", "Importing...") : t("cloud.tokens.import", "Import Tokens")}
              </Button>
            </>
          )}
        />
      </CloudSensitiveDialogContent>
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
      <CloudSensitiveDialogContent
        title={t("cloud.tokens.set_group", "Set Group")}
        description={t("cloud.tokens.set_group_description", {
          count: tokenGroupEditorIds.length,
          defaultValue: `Update the group for ${tokenGroupEditorIds.length} selected token(s). Leave empty to remove the group.`,
        })}
        icon={<Tags className="size-4" />}
        badge={<Badge color="blue">{t("cloud.providers.digitalocean.name", "DigitalOcean")}</Badge>}
        side={(
          <div className="space-y-4">
            <CloudStatusNotice tone="gray">
              {t(
                "cloud.tokens.group_dialog_hint",
                "Groups only affect organization and filtering. They do not change the credential itself.",
              )}
            </CloudStatusNotice>
            {existingTokenGroups.length ? (
              <div className="rounded-lg border border-border bg-card px-4 py-3">
                <div className="text-sm font-semibold text-foreground">
                  {t("cloud.tokens.existing_groups", "Existing Groups")}
                </div>
                <div className="mt-3">
                  <GroupPresetButtons
                    groups={existingTokenGroups}
                    value={tokenGroupEditorValue}
                    onChange={setTokenGroupEditorValue}
                  />
                </div>
              </div>
            ) : null}
          </div>
        )}
      >
        <div className="space-y-2">
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.tokens.group", "Group")}
          </label>
          <TextField.Root
            value={tokenGroupEditorValue}
            placeholder={t("cloud.tokens.group_placeholder", "Optional token group")}
            onChange={(event) => setTokenGroupEditorValue(event.target.value)}
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

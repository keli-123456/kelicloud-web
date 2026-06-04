import type { TFunction } from "i18next";
import { CheckCircle2, Tags } from "lucide-react";

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
  Select,
  TextField,
} from "@/components/admin/cloud/cloud-ui";

type MaybePromise<T> = T | Promise<T>;

type LinodeTokenImportDialogProps = {
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

type LinodeTokenGroupDialogProps = {
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

export function LinodeTokenImportDialog({
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
}: LinodeTokenImportDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <CloudSensitiveDialogContent
        title={t("cloud.tokens.import_dialog_title", "批量导入令牌")}
        description={t(
          "cloud.tokens.import_dialog_description",
          "每行一个令牌。支持 name,token、name|token，或只填 token。",
        )}
        badge={<Badge color="blue">{t("cloud.providers.linode.name", "Linode")}</Badge>}
        maxWidth="40rem"
        headerClassName="px-4 py-3 sm:px-4"
        bodyClassName="space-y-3 px-4 py-3 sm:px-4 sm:py-3"
        footerClassName="px-4 py-3 sm:px-4"
        footer={(
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("common.cancel", "取消")}
            </Button>
            <Button onClick={() => { void onImport(); }} disabled={saving}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {saving ? t("cloud.tokens.importing", "导入中...") : t("cloud.tokens.import", "导入令牌")}
            </Button>
          </>
        )}
      >
        <CloudImportFormSection
          groupLabel={t("cloud.tokens.group", "分组")}
          groupControl={(
            <div
              className={
                existingTokenGroups.length
                  ? "grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center"
                  : "min-w-0"
              }
            >
              <TextField.Root
                className="min-w-0"
                value={tokenImportGroup}
                placeholder={t("cloud.tokens.group_placeholder", "可选的令牌池分组")}
                onChange={(event) => setTokenImportGroup(event.target.value)}
              />
              {existingTokenGroups.length ? (
                <Select.Root
                  value={existingTokenGroups.includes(tokenImportGroup.trim()) ? tokenImportGroup.trim() : ""}
                  onValueChange={setTokenImportGroup}
                >
                  <Select.Trigger
                    className="w-full"
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
          editorLabel={t("cloud.tokens.import_content", "令牌内容")}
          editor={(
            <CloudCodeTextarea
              value={tokenImportText}
              showLineNumbers={false}
              minHeightClassName="min-h-[clamp(170px,24vh,210px)]"
              placeholder={t(
                "cloud.tokens.import_placeholder",
                "prod-account,dop_v1_xxx\nbackup-account|dop_v1_yyy\ndop_v1_zzz",
              )}
              onChange={(event) => setTokenImportText(event.target.value)}
            />
          )}
        />
      </CloudSensitiveDialogContent>
    </Dialog.Root>
  );
}

export function LinodeTokenGroupDialog({
  t,
  open,
  onOpenChange,
  tokenGroupEditorValue,
  setTokenGroupEditorValue,
  tokenGroupEditorIds,
  existingTokenGroups,
  saving,
  onSave,
}: LinodeTokenGroupDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <CloudSensitiveDialogContent
        title={t("cloud.tokens.set_group", "设置分组")}
        description={t("cloud.tokens.set_group_description", {
          count: tokenGroupEditorIds.length,
          defaultValue: `为已选 ${tokenGroupEditorIds.length} 个令牌设置分组。留空则清除分组。`,
        })}
        icon={<Tags className="size-4" />}
        badge={<Badge color="blue">{t("cloud.providers.linode.name", "Linode")}</Badge>}
        side={(
          <div className="space-y-4">
            <CloudStatusNotice tone="gray">
              {t(
                "cloud.tokens.group_dialog_hint",
                "分组只影响组织和筛选，不会修改凭证本身。",
              )}
            </CloudStatusNotice>
            {existingTokenGroups.length ? (
              <div className="border-y border-slate-200/80 bg-transparent py-3 shadow-none dark:border-slate-800">
                <div className="text-sm font-semibold text-foreground">
                  {t("cloud.tokens.existing_groups", "已有分组")}
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
            {t("cloud.tokens.group", "分组")}
          </label>
          <TextField.Root
            value={tokenGroupEditorValue}
            placeholder={t("cloud.tokens.group_placeholder", "可选的令牌池分组")}
            onChange={(event) => setTokenGroupEditorValue(event.target.value)}
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

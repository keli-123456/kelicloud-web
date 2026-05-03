import type { TFunction } from "i18next";

import {
  CloudCodeTextarea,
  cloudPanelFieldLabelClassName,
} from "@/components/admin/cloud/cloud-ui";

type AWSBootstrapFieldsProps = {
  t: TFunction;
  tagsText: string;
  userData: string;
  onTagsTextChange: (value: string) => void;
  onUserDataChange: (value: string) => void;
};

export function AWSBootstrapFields({
  t,
  tagsText,
  userData,
  onTagsTextChange,
  onUserDataChange,
}: AWSBootstrapFieldsProps) {
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div>
        <label className={cloudPanelFieldLabelClassName}>
          {t("cloud.form.tags", "Tags")}
        </label>
        <CloudCodeTextarea
          minHeightClassName="min-h-28"
          value={tagsText}
          onChange={(event) => onTagsTextChange(event.target.value)}
        />
      </div>
      <div>
        <label className={cloudPanelFieldLabelClassName}>
          {t("cloud.form.user_data", "Cloud-Init / User Data")}
        </label>
        <CloudCodeTextarea
          minHeightClassName="min-h-28"
          value={userData}
          onChange={(event) => onUserDataChange(event.target.value)}
        />
      </div>
    </div>
  );
}

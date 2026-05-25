import type { Dispatch, SetStateAction } from "react";
import type { TFunction } from "i18next";

import { AWSBootstrapFields } from "@/components/admin/cloud/AWSBootstrapFields";
import { CompactDetailSection } from "@/components/admin/cloud/AWSPanelDetailComponents";
import { AWSRegionSelect } from "@/components/admin/cloud/AWSRegionSelect";
import { AWSRootAccessFields } from "@/components/admin/cloud/AWSRootAccessFields";
import {
  Checkbox,
  CloudCodeTextarea,
  cloudPanelBodyTextClassName,
  cloudPanelFieldLabelClassName,
  Select,
  TextField,
} from "@/components/admin/cloud/cloud-ui";
import {
  STATIC_EC2_IMAGE_PRESETS,
  STATIC_EC2_INSTANCE_TYPE_PRESETS,
  getStaticEC2ImagePresetLabel,
  getStaticEC2InstanceTypePresetLabel,
  type AWSRegionOption,
} from "./awsPanelCatalog";
import type { CreateFormState } from "./awsPanelState";
import { parseResourceIds } from "./awsPanelUtils";
import { cn } from "@/lib/utils";

type EC2CreateSectionProps = {
  t: TFunction;
  form: CreateFormState;
  setForm: Dispatch<SetStateAction<CreateFormState>>;
};

type EC2CreateCoreSectionProps = EC2CreateSectionProps & {
  summary: string;
  resolvedRegion: string;
  regionOptions: AWSRegionOption[];
  regionSearchPlaceholder: string;
  regionSearchEmpty: string;
  onRegionChange: (region: string) => void;
  singleColumn?: boolean;
};

export function EC2CreateCoreSection({
  t,
  form,
  setForm,
  summary,
  resolvedRegion,
  regionOptions,
  regionSearchPlaceholder,
  regionSearchEmpty,
  onRegionChange,
  singleColumn = false,
}: EC2CreateCoreSectionProps) {
  return (
    <CompactDetailSection
      title={t("cloud.providers.aws.create_core", "Core")}
      summary={summary || "-"}
      defaultOpen
      hideSummary
    >
      <div className={cn("grid gap-4", !singleColumn && "sm:grid-cols-2")}>
        <div>
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.providers.aws.region", "Region")}
          </label>
          <AWSRegionSelect
            value={resolvedRegion || undefined}
            options={regionOptions}
            placeholder={t("cloud.providers.aws.region", "Region")}
            searchPlaceholder={regionSearchPlaceholder}
            emptyLabel={regionSearchEmpty}
            onValueChange={(value) => {
              void onRegionChange(value);
            }}
          />
          <div className={`mt-2 text-xs ${cloudPanelBodyTextClassName}`}>
            {t(
              "cloud.providers.aws.ec2_create_region_hint",
              "Switching region only updates this dialog. Built-in presets stay available without loading AWS catalog data.",
            )}
          </div>
        </div>
        <div>
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.providers.aws.instance_type", "Instance Type")}
          </label>
          <Select.Root
            value={form.instance_type}
            onValueChange={(value) => setForm((previous) => ({ ...previous, instance_type: value }))}
          >
            <Select.Trigger placeholder={t("cloud.form.size_placeholder", "Select a size")} />
            <Select.Content>
              {STATIC_EC2_INSTANCE_TYPE_PRESETS.map((instanceType) => (
                <Select.Item key={instanceType.value} value={instanceType.value}>
                  {getStaticEC2InstanceTypePresetLabel(instanceType)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      <div className="mt-4">
        <label className={cloudPanelFieldLabelClassName}>
          {t("cloud.providers.aws.ami", "AMI")}
        </label>
        <Select.Root
          value={form.image_id}
          onValueChange={(value) => setForm((previous) => ({ ...previous, image_id: value }))}
        >
          <Select.Trigger placeholder={t("cloud.form.image_placeholder", "Select an image")} />
          <Select.Content>
            {STATIC_EC2_IMAGE_PRESETS.map((image) => (
              <Select.Item key={image.value} value={image.value}>
                {getStaticEC2ImagePresetLabel(image)}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </div>
    </CompactDetailSection>
  );
}

type EC2CreateNetworkSectionProps = EC2CreateSectionProps & {
  summary: string;
};

export function EC2CreateNetworkSection({
  t,
  form,
  setForm,
  summary,
}: EC2CreateNetworkSectionProps) {
  return (
    <CompactDetailSection
      title={t("cloud.providers.aws.create_network", "Network & Access")}
      summary={summary || "-"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.providers.aws.key_pair", "Key Pair")}
          </label>
          <TextField.Root
            value={form.key_name}
            placeholder={t("cloud.providers.aws.key_pair_manual_placeholder", "可选密钥对名称")}
            onChange={(event) => setForm((previous) => ({ ...previous, key_name: event.target.value }))}
          />
        </div>
      </div>

      <div className="mt-4">
        <div className={cloudPanelFieldLabelClassName}>
          {t("cloud.providers.aws.security_groups", "Security Groups")}
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t(
            "cloud.providers.aws.security_group_manual_hint",
            "Enter one or more security group IDs separated by commas or new lines. Leave empty to let kelicloud keep the default security group on the automatically selected default subnet.",
          )}
        </div>
        <CloudCodeTextarea
          className="mt-3"
          minHeightClassName="min-h-24"
          value={form.security_group_ids.join("\n")}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              security_group_ids: parseResourceIds(event.target.value),
            }))
          }
        />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
          <Checkbox
            checked={form.assign_public_ip}
            onCheckedChange={(checked) =>
              setForm((previous) => ({ ...previous, assign_public_ip: Boolean(checked) }))
            }
          />
          {t("cloud.providers.aws.assign_public_ip", "Assign public IPv4 when subnet configuration allows it")}
        </label>
        <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
          <Checkbox
            checked={form.assign_ipv6}
            onCheckedChange={(checked) =>
              setForm((previous) => ({ ...previous, assign_ipv6: Boolean(checked) }))
            }
          />
          {t("cloud.providers.aws.enable_ipv6", "Enable IPv6")}
        </label>
        <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
          <Checkbox
            checked={form.allow_all_traffic}
            onCheckedChange={(checked) =>
              setForm((previous) => ({ ...previous, allow_all_traffic: Boolean(checked) }))
            }
          />
          {t("cloud.providers.aws.allow_all_traffic_on_create", "After launch, allow all IPv4 and IPv6 traffic")}
        </label>
      </div>
    </CompactDetailSection>
  );
}

type EC2CreateBootstrapSectionProps = EC2CreateSectionProps & {
  summary: string;
};

export function EC2CreateBootstrapSection({
  t,
  form,
  setForm,
  summary,
}: EC2CreateBootstrapSectionProps) {
  return (
    <CompactDetailSection
      title={t("cloud.providers.aws.create_bootstrap", "Bootstrap")}
      summary={summary || "-"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.form.name", "Name")}
          </label>
          <TextField.Root
            value={form.name}
            placeholder={t("cloud.providers.aws.auto_name", "Auto name")}
            onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
          />
        </div>
        <div>
          <label className={`mb-2 flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
            <Checkbox
              checked={form.auto_connect}
              onCheckedChange={(checked) =>
                setForm((previous) => ({ ...previous, auto_connect: Boolean(checked) }))
              }
            />
            {t("cloud.providers.aws.auto_connect_toggle", "创建后自动接入平台")}
          </label>
          {form.auto_connect ? (
            <>
              <label className={cloudPanelFieldLabelClassName}>
                {t("cloud.form.auto_connect_group", "Auto-connect group")}
              </label>
              <TextField.Root
                value={form.auto_connect_group || ""}
                placeholder={t("cloud.form.auto_connect_group_placeholder", "Generated from the active credential by default")}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, auto_connect_group: event.target.value }))
                }
              />
            </>
          ) : null}
        </div>
      </div>

      <AWSRootAccessFields
        t={t}
        mode={form.root_password_mode || "none"}
        password={form.root_password || ""}
        onModeChange={(mode) =>
          setForm((previous) => ({
            ...previous,
            root_password_mode: mode,
            root_password:
              mode === "custom"
                ? previous.root_password
                : "",
          }))
        }
        onPasswordChange={(password) =>
          setForm((previous) => ({ ...previous, root_password: password }))
        }
      />

      <AWSBootstrapFields
        t={t}
        tagsText={form.tagsText}
        userData={form.user_data}
        onTagsTextChange={(tagsText) =>
          setForm((previous) => ({ ...previous, tagsText }))
        }
        onUserDataChange={(userData) =>
          setForm((previous) => ({ ...previous, user_data: userData }))
        }
      />
    </CompactDetailSection>
  );
}

import type { Dispatch, SetStateAction } from "react";
import type { TFunction } from "i18next";
import { Server } from "lucide-react";

import {
  type AzureAccount,
  type AzureCatalog,
  type AzureCredentialRecord,
} from "@/lib/cloudAzure";
import {
  Badge,
  Button,
  Checkbox,
  CloudCodeTextarea,
  CloudFormActions,
  CloudFormField,
  CloudFormStack,
  CloudSensitiveDialogContent,
  cloudPanelBodyTextClassName,
  Dialog,
  Select,
  TextField,
} from "@/components/admin/cloud/cloud-ui";
import { WarningAlert } from "@/components/ui/warning-alert";
import {
  azureImagePresets,
  buildCreateFormFromPreset,
  formatAzureLocationOption,
  formatAzureSizeOption,
  getDefaultAzureSize,
  getCreateRootPasswordMode,
  getLocationLabel,
  type AzureCreateFormState,
} from "./azurePanelUtils";

type MaybePromise<T> = T | Promise<T>;

type AzureCreateDialogProps = {
  t: TFunction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: AzureCatalog | null;
  account: AzureAccount | null;
  activeCredential: AzureCredentialRecord | null;
  createForm: AzureCreateFormState;
  setCreateForm: Dispatch<SetStateAction<AzureCreateFormState>>;
  submitting: boolean;
  locationUpdating: boolean;
  onSetLocation: (location: string) => MaybePromise<void>;
  onCreate: () => MaybePromise<void>;
};

export function AzureCreateDialog({
  t,
  open,
  onOpenChange,
  catalog,
  account,
  activeCredential,
  createForm,
  setCreateForm,
  submitting,
  locationUpdating,
  onSetLocation,
  onCreate,
}: AzureCreateDialogProps) {
  const activeLocation = catalog?.active_location || account?.active_location || activeCredential?.default_location || "";
  const activeLocationLabel = getLocationLabel(catalog, activeLocation);
  const locationOptions = catalog?.locations ?? [];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <CloudSensitiveDialogContent
        title={t("cloud.providers.azure.create", "创建虚拟机")}
        description={t(
            "cloud.providers.azure.create_description",
            "Create a Linux VM in the current active Azure location. kelicloud will automatically prepare the network stack and bootstrap agent auto-connect.",
          )}
        icon={<Server className="size-4" />}
        badge={<Badge color="blue">{t("cloud.providers.azure.name", "Azure")}</Badge>}
        className="sm:max-w-5xl"
      >

        <CloudFormStack>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
            {t("cloud.providers.azure.create_location_hint", {
              location: activeLocationLabel,
              defaultValue: `Active location: ${activeLocationLabel}`,
            })}
          </div>

          <CloudFormField label={t("cloud.form.region", "Region")}>
          <Select.Root
            value={activeLocation}
            disabled={!activeCredential || locationUpdating || locationOptions.length === 0}
            onValueChange={(value) => {
              void onSetLocation(value);
            }}
          >
            <Select.Trigger placeholder={t("cloud.form.region_placeholder", "Select a region")} />
            <Select.Content>
              {locationOptions.map((location) => (
                <Select.Item key={location.name} value={location.name}>
                  {formatAzureLocationOption(location)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          </CloudFormField>

          <CloudFormField label={t("cloud.table.name", "名称")}>
          <TextField.Root
            value={createForm.name}
            placeholder={t("cloud.providers.azure.create_name_placeholder", "留空时自动生成虚拟机名称")}
            onChange={(event) => setCreateForm((previous) => ({ ...previous, name: event.target.value }))}
          />
          </CloudFormField>

          <CloudFormField label={t("cloud.form.image", "镜像")}>
          <Select.Root
            value={createForm.image_preset}
            onValueChange={(value) => setCreateForm((previous) => buildCreateFormFromPreset(value, previous))}
          >
            <Select.Trigger placeholder={t("cloud.form.image_placeholder", "选择镜像")} />
            <Select.Content>
              {azureImagePresets.map((preset) => (
                <Select.Item key={preset.id} value={preset.id}>
                  {preset.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          </CloudFormField>

          <CloudFormField label={t("cloud.form.size", "Size")}>
          <Select.Root
            value={createForm.size || getDefaultAzureSize(catalog)}
            onValueChange={(value) => setCreateForm((previous) => ({ ...previous, size: value }))}
          >
            <Select.Trigger placeholder={t("cloud.form.size_placeholder", "Select a size")} />
            <Select.Content>
              {(catalog?.sizes || []).map((size) => (
                <Select.Item key={size.name} value={size.name}>
                  {formatAzureSizeOption(size)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          </CloudFormField>

          <CloudFormField label={t("cloud.form.root_password", "Root Password")}>
          <TextField.Root
            type="password"
            value={createForm.admin_password || ""}
            placeholder={t("cloud.form.root_password_placeholder", "输入 root 密码")}
            onChange={(event) => setCreateForm((previous) => ({ ...previous, admin_password: event.target.value }))}
          />
          </CloudFormField>
          <WarningAlert
            tone="info"
            description={
              getCreateRootPasswordMode(createForm.admin_password || "") === "random"
                ? t("cloud.form.root_password_random_help", "系统会在后端随机生成一个 root 密码，并在创建成功后只展示一次。")
                : t(
                    "cloud.providers.azure.admin_password_help",
                    "Create the VM with this root password.",
                  )
            }
          />

          <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
            <Checkbox
              checked={createForm.auto_connect}
              onCheckedChange={(checked) =>
                setCreateForm((previous) => ({ ...previous, auto_connect: Boolean(checked) }))
              }
            />
            {t("cloud.providers.azure.auto_connect_toggle", "Bootstrap kelicloud agent auto-connect")}
          </label>

          {createForm.auto_connect ? (
            <CloudFormField label={t("cloud.providers.azure.auto_connect_group", "自动接入分组")}>
              <TextField.Root
                value={createForm.auto_connect_group || ""}
                placeholder={t("cloud.providers.azure.auto_connect_group_placeholder", "可选，留空则使用默认分组")}
                onChange={(event) =>
                  setCreateForm((previous) => ({ ...previous, auto_connect_group: event.target.value }))
                }
              />
            </CloudFormField>
          ) : null}

          <CloudFormField label={t("cloud.providers.azure.user_data", "Cloud-init 用户数据")}>
            <CloudCodeTextarea
              minHeightClassName="min-h-28"
              value={createForm.user_data || ""}
              placeholder="#cloud-config"
              onChange={(event) => setCreateForm((previous) => ({ ...previous, user_data: event.target.value }))}
            />
          </CloudFormField>

          <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
            <Checkbox
              checked={createForm.public_ip}
              onCheckedChange={(checked) =>
                setCreateForm((previous) => ({ ...previous, public_ip: Boolean(checked) }))
              }
            />
            {t("cloud.providers.azure.public_ip_toggle", "分配公网 IPv4，并默认放通入站流量")}
          </label>

          <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
            <Checkbox
              checked={createForm.assign_ipv6}
              onCheckedChange={(checked) =>
                setCreateForm((previous) => ({ ...previous, assign_ipv6: Boolean(checked) }))
              }
            />
            {t(
              "cloud.providers.azure.assign_ipv6_toggle",
              "启用 IPv6。kelicloud 会自动准备双栈 VNet/NIC；如果同时启用公网 IP，也会附加公网 IPv6 地址。",
            )}
          </label>

          <CloudFormActions>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t("common.cancel", "取消")}
            </Button>
            <Button
              onClick={() => {
                void onCreate();
              }}
              disabled={
                submitting
                || !createForm.size
                || !createForm.image_preset
              }
            >
              {submitting
                ? t("cloud.creating", "创建中...")
                : t("cloud.providers.azure.create", "创建虚拟机")}
            </Button>
          </CloudFormActions>
        </CloudFormStack>
      </CloudSensitiveDialogContent>
    </Dialog.Root>
  );
}

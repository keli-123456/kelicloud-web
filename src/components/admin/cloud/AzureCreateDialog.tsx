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
  CloudSensitiveDialogContent,
  cloudPanelBodyTextClassName,
  cloudPanelFieldLabelClassName,
  Dialog,
  Flex,
  Select,
  TextField,
} from "@/components/admin/cloud/cloud-ui";
import {
  azureImagePresets,
  buildCreateFormFromPreset,
  formatAzureSizeOption,
  getDefaultAzureSize,
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
  onCreate,
}: AzureCreateDialogProps) {
  const activeLocation = catalog?.active_location || account?.active_location || activeCredential?.default_location || "";
  const activeLocationLabel = getLocationLabel(catalog, activeLocation);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <CloudSensitiveDialogContent
        title={t("cloud.providers.azure.create", "Create VM")}
        description={t(
            "cloud.providers.azure.create_description",
            "Create a Linux VM in the current active Azure location. Komari will automatically prepare the resource group network stack and bootstrap agent auto-connect.",
          )}
        icon={<Server className="size-4" />}
        badge={<Badge color="blue">{t("cloud.providers.azure.name", "Azure")}</Badge>}
        className="sm:max-w-5xl"
      >

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
            {t("cloud.providers.azure.create_location_hint", {
              location: activeLocationLabel,
              defaultValue: `Active location: ${activeLocationLabel}`,
            })}
          </div>

          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.table.name", "Name")}
          </label>
          <TextField.Root
            value={createForm.name}
            placeholder={t("cloud.providers.azure.create_name_placeholder", "Leave empty to auto-generate a VM name")}
            onChange={(event) => setCreateForm((previous) => ({ ...previous, name: event.target.value }))}
          />

          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.providers.azure.resource_group", "Resource Group")}
          </label>
          <TextField.Root
            value={createForm.resource_group || ""}
            placeholder={t("cloud.providers.azure.resource_group_placeholder", "Optional. Leave empty to auto-create a dedicated resource group")}
            onChange={(event) => setCreateForm((previous) => ({ ...previous, resource_group: event.target.value }))}
          />

          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.form.image", "Image")}
          </label>
          <Select.Root
            value={createForm.image_preset}
            onValueChange={(value) => setCreateForm((previous) => buildCreateFormFromPreset(value, previous))}
          >
            <Select.Trigger placeholder={t("cloud.form.image_placeholder", "Select an image")} />
            <Select.Content>
              {azureImagePresets.map((preset) => (
                <Select.Item key={preset.id} value={preset.id}>
                  {preset.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={cloudPanelFieldLabelClassName}>
                {t("cloud.providers.azure.image_publisher", "Publisher")}
              </label>
              <TextField.Root
                value={createForm.image_publisher}
                onChange={(event) => setCreateForm((previous) => ({ ...previous, image_publisher: event.target.value }))}
              />
            </div>
            <div>
              <label className={cloudPanelFieldLabelClassName}>
                {t("cloud.providers.azure.image_offer", "Offer")}
              </label>
              <TextField.Root
                value={createForm.image_offer}
                onChange={(event) => setCreateForm((previous) => ({ ...previous, image_offer: event.target.value }))}
              />
            </div>
            <div>
              <label className={cloudPanelFieldLabelClassName}>
                {t("cloud.providers.azure.image_sku", "SKU")}
              </label>
              <TextField.Root
                value={createForm.image_sku}
                onChange={(event) => setCreateForm((previous) => ({ ...previous, image_sku: event.target.value }))}
              />
            </div>
            <div>
              <label className={cloudPanelFieldLabelClassName}>
                {t("cloud.providers.azure.image_version", "Version")}
              </label>
              <TextField.Root
                value={createForm.image_version || ""}
                placeholder="latest"
                onChange={(event) => setCreateForm((previous) => ({ ...previous, image_version: event.target.value }))}
              />
            </div>
          </div>

          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.form.size", "Size")}
          </label>
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
          <TextField.Root
            value={createForm.size}
            placeholder={t("cloud.providers.azure.size_manual_placeholder", "Or enter an Azure VM size manually")}
            onChange={(event) => setCreateForm((previous) => ({ ...previous, size: event.target.value }))}
          />

          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.providers.azure.admin_username", "Admin Username")}
          </label>
          <TextField.Root
            value={createForm.admin_username || ""}
            placeholder="azureuser"
            onChange={(event) => setCreateForm((previous) => ({ ...previous, admin_username: event.target.value }))}
          />

          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.providers.azure.auth_mode", "Authentication")}
          </label>
          <Select.Root
            value={createForm.auth_mode}
            onValueChange={(value) =>
              setCreateForm((previous) => ({
                ...previous,
                auth_mode: value === "ssh" ? "ssh" : "password",
              }))
            }
          >
            <Select.Trigger placeholder={t("cloud.providers.azure.auth_mode", "Authentication")} />
            <Select.Content>
              <Select.Item value="password">{t("cloud.providers.azure.auth_password", "Password")}</Select.Item>
              <Select.Item value="ssh">{t("cloud.providers.azure.auth_ssh", "SSH Public Key")}</Select.Item>
            </Select.Content>
          </Select.Root>

          {createForm.auth_mode === "password" ? (
            <>
              <label className={cloudPanelFieldLabelClassName}>
                {t("cloud.providers.azure.admin_password", "Admin Password")}
              </label>
              <TextField.Root
                type="password"
                value={createForm.admin_password || ""}
                placeholder={t("cloud.providers.azure.admin_password_placeholder", "Use a strong password that meets Azure complexity requirements")}
                onChange={(event) => setCreateForm((previous) => ({ ...previous, admin_password: event.target.value }))}
              />
            </>
          ) : (
            <>
              <label className={cloudPanelFieldLabelClassName}>
                {t("cloud.providers.azure.ssh_public_key", "SSH Public Key")}
              </label>
              <CloudCodeTextarea
                minHeightClassName="min-h-28"
                value={createForm.ssh_public_key || ""}
                placeholder="ssh-ed25519 AAAA..."
                onChange={(event) => setCreateForm((previous) => ({ ...previous, ssh_public_key: event.target.value }))}
              />
            </>
          )}

          <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
            <Checkbox
              checked={createForm.auto_connect}
              onCheckedChange={(checked) =>
                setCreateForm((previous) => ({ ...previous, auto_connect: Boolean(checked) }))
              }
            />
            {t("cloud.providers.azure.auto_connect_toggle", "Bootstrap Komari agent auto-connect")}
          </label>

          {createForm.auto_connect ? (
            <div>
              <label className={cloudPanelFieldLabelClassName}>
                {t("cloud.providers.azure.auto_connect_group", "Auto-connect Group")}
              </label>
              <TextField.Root
                value={createForm.auto_connect_group || ""}
                placeholder={t("cloud.providers.azure.auto_connect_group_placeholder", "Optional. Leave empty to use the default group")}
                onChange={(event) =>
                  setCreateForm((previous) => ({ ...previous, auto_connect_group: event.target.value }))
                }
              />
            </div>
          ) : null}

          <div>
            <label className={cloudPanelFieldLabelClassName}>
              {t("cloud.providers.azure.user_data", "Cloud-init User Data")}
            </label>
            <CloudCodeTextarea
              minHeightClassName="min-h-28"
              value={createForm.user_data || ""}
              placeholder="#cloud-config"
              onChange={(event) => setCreateForm((previous) => ({ ...previous, user_data: event.target.value }))}
            />
          </div>

          <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
            <Checkbox
              checked={createForm.public_ip}
              onCheckedChange={(checked) =>
                setCreateForm((previous) => ({ ...previous, public_ip: Boolean(checked) }))
              }
            />
            {t("cloud.providers.azure.public_ip_toggle", "Allocate a public IPv4 address and open inbound traffic by default")}
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
              "Enable IPv6. Komari will prepare a dual-stack VNet/NIC and attach a public IPv6 address when public IP is also enabled",
            )}
          </label>

          <Flex justify="end" gap="2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={() => {
                void onCreate();
              }}
              disabled={
                submitting
                || !createForm.size
                || !createForm.image_publisher
                || !createForm.image_offer
                || !createForm.image_sku
                || (createForm.auth_mode === "password" ? !createForm.admin_password : !createForm.ssh_public_key)
              }
            >
              {submitting
                ? t("cloud.creating", "Creating...")
                : t("cloud.providers.azure.create", "Create VM")}
            </Button>
          </Flex>
        </div>
      </CloudSensitiveDialogContent>
    </Dialog.Root>
  );
}

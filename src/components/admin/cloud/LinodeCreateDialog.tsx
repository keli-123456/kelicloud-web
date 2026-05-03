import type { Dispatch, SetStateAction } from "react";
import type { TFunction } from "i18next";

import type { LinodeCatalog } from "@/lib/cloudLinode";
import {
  Button,
  Checkbox,
  cloudDialogContentClassName,
  cloudPanelBodyTextClassName,
  cloudPanelFieldLabelClassName,
  cloudPanelSectionClassName,
  cloudPanelSubcardClassName,
  Dialog,
  Flex,
  Select,
  TextField,
} from "@/components/admin/cloud/cloud-ui";
import { WarningAlert } from "@/components/ui/warning-alert";
import {
  getLinodeRegionOptionLabel,
  getLinodeTypeOptionLabel,
  type CreateFormState,
} from "./linodePanelUtils";

type MaybePromise<T> = T | Promise<T>;

type LinodeCreateDialogProps = {
  t: TFunction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: LinodeCatalog | null;
  form: CreateFormState;
  setForm: Dispatch<SetStateAction<CreateFormState>>;
  submitting: boolean;
  onCreate: () => MaybePromise<void>;
};

export function LinodeCreateDialog({
  t,
  open,
  onOpenChange,
  catalog,
  form,
  setForm,
  submitting,
  onCreate,
}: LinodeCreateDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className={cloudDialogContentClassName}>
        <Dialog.Title>{t("cloud.providers.linode.create", "Create Instance")}</Dialog.Title>
        <Dialog.Description>
          {t(
            "cloud.providers.linode.create_description",
            "Choose the region, plan, image, and root password mode for the new Linode instance.",
          )}
        </Dialog.Description>

        <div className="mt-4 flex flex-col gap-4">
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.form.region", "Region")}
          </label>
          <Select.Root
            value={form.region}
            onValueChange={(value) => setForm((previous) => ({ ...previous, region: value }))}
          >
            <Select.Trigger placeholder={t("cloud.form.region_placeholder", "Select a region")} />
            <Select.Content>
              {(catalog?.regions || []).map((region) => (
                <Select.Item key={region.id} value={region.id}>
                  {getLinodeRegionOptionLabel(region, t)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>

          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.form.size", "Size")}
          </label>
          <Select.Root
            value={form.type}
            onValueChange={(value) => setForm((previous) => ({ ...previous, type: value }))}
          >
            <Select.Trigger placeholder={t("cloud.form.size_placeholder", "Select a size")} />
            <Select.Content>
              {(catalog?.types || []).map((type) => (
                <Select.Item key={type.id} value={type.id}>
                  {getLinodeTypeOptionLabel(type)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>

          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.form.image", "Image")}
          </label>
          <Select.Root
            value={form.image}
            onValueChange={(value) => setForm((previous) => ({ ...previous, image: value }))}
          >
            <Select.Trigger placeholder={t("cloud.form.image_placeholder", "Select an image")} />
            <Select.Content>
              {(catalog?.images || []).map((image) => (
                <Select.Item key={image.id} value={image.id}>
                  {image.vendor ? `${image.vendor} / ` : ""}{image.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>

          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.form.root_password", "Root Password")}
          </label>
          <TextField.Root
            type="password"
            value={form.root_password}
            placeholder={t("cloud.form.root_password_placeholder", "Enter a root password")}
            onChange={(event) => setForm((previous) => ({ ...previous, root_password: event.target.value }))}
          />
          <WarningAlert
            tone="info"
            description={t(
              "cloud.providers.linode.root_access_help",
              "Linode can create the instance directly with a root password. SSH keys are optional and only add extra login methods.",
            )}
          />
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            {t(
              "cloud.form.root_password_random_help",
              "A random root password will be generated on the server and shown once after creation succeeds.",
            )}
          </div>

          <div className={cloudPanelSectionClassName}>
            <div className={cloudPanelFieldLabelClassName}>
              {t("cloud.form.options", "Options")}
            </div>
            <div className="mt-3 flex flex-col gap-3">
              <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
                <Checkbox
                  checked={form.backups_enabled}
                  onCheckedChange={(checked) => setForm((previous) => ({ ...previous, backups_enabled: Boolean(checked) }))}
                />
                {t("cloud.form.backups", "Enable backups")}
              </label>
              <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
                <Checkbox
                  checked={form.booted}
                  onCheckedChange={(checked) => setForm((previous) => ({ ...previous, booted: Boolean(checked) }))}
                />
                {t("cloud.providers.linode.booted", "Boot after creation")}
              </label>
            </div>
          </div>

          <div className={cloudPanelSubcardClassName}>
            <div className={cloudPanelFieldLabelClassName}>
              {t("cloud.providers.linode.ssh_keys_optional", "SSH Keys (Optional)")}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t(
                "cloud.providers.linode.ssh_keys_optional_description",
                "You can leave this empty. The selected keys are only attached as additional login methods.",
              )}
            </div>
            <div className="mt-3 flex max-h-48 flex-col gap-2 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
              {(catalog?.ssh_keys || []).length ? (
                catalog?.ssh_keys.map((sshKey) => {
                  const checked = form.authorized_keys.includes(sshKey.ssh_key);
                  return (
                    <label
                      key={sshKey.label}
                      className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(nextChecked) =>
                          setForm((previous) => ({
                            ...previous,
                            authorized_keys: nextChecked === true
                              ? [...previous.authorized_keys, sshKey.ssh_key]
                              : previous.authorized_keys.filter((value) => value !== sshKey.ssh_key),
                          }))
                        }
                      />
                      <span className="min-w-0">
                        <span className="block font-medium text-slate-900 dark:text-slate-100">{sshKey.label}</span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{sshKey.ssh_key}</span>
                      </span>
                    </label>
                  );
                })
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {t("cloud.form.ssh_keys_empty", "No SSH keys found in this account")}
                </div>
              )}
            </div>
          </div>

          <Flex justify="end" gap="2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={() => {
                void onCreate();
              }}
              disabled={
                submitting ||
                !form.region ||
                !form.type ||
                !form.image
              }
            >
              {submitting
                ? t("cloud.creating", "Creating...")
                : t("cloud.providers.linode.create", "Create Instance")}
            </Button>
          </Flex>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

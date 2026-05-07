import type { Dispatch, SetStateAction } from "react";
import type { TFunction } from "i18next";
import { Server } from "lucide-react";

import type { DigitalOceanCatalog, DigitalOceanImage } from "@/lib/cloud";
import {
  Badge,
  Button,
  Checkbox,
  CloudSensitiveDialogContent,
  cloudPanelBodyTextClassName,
  cloudPanelFieldLabelClassName,
  cloudPanelSectionClassName,
  Dialog,
  Flex,
  Select,
  TextField,
} from "@/components/admin/cloud/cloud-ui";
import { WarningAlert } from "@/components/ui/warning-alert";

type MaybePromise<T> = T | Promise<T>;

type CreateDropletFormState = {
  name?: string;
  region: string;
  size: string;
  image: string;
  backups: boolean;
  ipv6: boolean;
  monitoring: boolean;
  user_data: string;
  vpc_uuid: string;
  root_password: string;
  auto_connect: boolean;
  auto_connect_group: string;
  tagsText: string;
};

type DigitalOceanCreateDialogProps = {
  t: TFunction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regions: DigitalOceanCatalog["regions"];
  sizes: DigitalOceanCatalog["sizes"];
  images: DigitalOceanCatalog["images"];
  form: CreateDropletFormState;
  setForm: Dispatch<SetStateAction<CreateDropletFormState>>;
  submitting: boolean;
  getRegionOptionLabel: (region: DigitalOceanCatalog["regions"][number], t: TFunction) => string;
  getImageValue: (image: DigitalOceanImage) => string;
  getImageLabel: (image: DigitalOceanImage) => string;
  onCreate: () => MaybePromise<void>;
};

export function DigitalOceanCreateDialog({
  t,
  open,
  onOpenChange,
  regions,
  sizes,
  images,
  form,
  setForm,
  submitting,
  getRegionOptionLabel,
  getImageValue,
  getImageLabel,
  onCreate,
}: DigitalOceanCreateDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <CloudSensitiveDialogContent
        title={t("cloud.create", "Create Droplet")}
        description={t(
            "cloud.create_description",
            "Select a region, size, and image to provision a new Droplet.",
          )}
        icon={<Server className="size-4" />}
        badge={<Badge color="blue">{t("cloud.providers.digitalocean.name", "DigitalOcean")}</Badge>}
      >

        <div className="flex flex-col gap-4">
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.form.region", "Region")}
          </label>
          <Select.Root
            value={form.region}
            onValueChange={(value) =>
              setForm((previous) => ({ ...previous, region: value }))
            }
          >
            <Select.Trigger
              placeholder={t("cloud.form.region_placeholder", "Select a region")}
            />
            <Select.Content>
              {regions.map((region) => (
                <Select.Item key={region.slug} value={region.slug}>
                  {getRegionOptionLabel(region, t)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>

          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.form.size", "Size")}
          </label>
          <Select.Root
            value={form.size}
            onValueChange={(value) =>
              setForm((previous) => ({ ...previous, size: value }))
            }
          >
            <Select.Trigger
              placeholder={t("cloud.form.size_placeholder", "Select a size")}
            />
            <Select.Content>
              {sizes.map((size) => (
                <Select.Item key={size.slug} value={size.slug}>
                  {size.slug} / {size.vcpus} vCPU / {(size.memory / 1024).toFixed(0)} GB / $
                  {size.price_monthly.toFixed(2)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>

          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.form.image", "Image")}
          </label>
          <Select.Root
            value={form.image}
            onValueChange={(value) =>
              setForm((previous) => ({ ...previous, image: value }))
            }
          >
            <Select.Trigger
              placeholder={t("cloud.form.image_placeholder", "Select an image")}
            />
            <Select.Content>
              {images.map((image) => (
                <Select.Item key={`${image.id}-${image.slug}`} value={getImageValue(image)}>
                  {getImageLabel(image)}
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
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                root_password: event.target.value,
              }))
            }
          />
          <WarningAlert
            tone="info"
            description={t(
              "cloud.form.root_access_password_help",
              "Komari will ensure a managed SSH key exists for this token, attach it to the Droplet, and run a startup script to set the root password and enable password login.",
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
                  checked={form.backups}
                  onCheckedChange={(checked) =>
                    setForm((previous) => ({
                      ...previous,
                      backups: Boolean(checked),
                    }))
                  }
                />
                {t("cloud.form.backups", "Enable backups")}
              </label>
              <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
                <Checkbox
                  checked={form.ipv6}
                  onCheckedChange={(checked) =>
                    setForm((previous) => ({
                      ...previous,
                      ipv6: Boolean(checked),
                    }))
                  }
                />
                {t("cloud.form.ipv6", "Enable IPv6")}
              </label>
              <label className={`flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
                <Checkbox
                  checked={form.monitoring}
                  onCheckedChange={(checked) =>
                    setForm((previous) => ({
                      ...previous,
                      monitoring: Boolean(checked),
                    }))
                  }
                />
                {t("cloud.form.monitoring", "Enable monitoring")}
              </label>
            </div>
          </div>

          <Flex justify="end" gap="2" className="mt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={() => {
                void onCreate();
              }}
              disabled={
                submitting ||
                !form.region ||
                !form.size ||
                !form.image
              }
            >
              {submitting
                ? t("cloud.creating", "Creating...")
                : t("cloud.create", "Create Droplet")}
            </Button>
          </Flex>
        </div>
      </CloudSensitiveDialogContent>
    </Dialog.Root>
  );
}

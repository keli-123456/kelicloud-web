import type { TFunction } from "i18next";
import { KeyRound, Server } from "lucide-react";

import type { DigitalOceanDroplet } from "@/lib/cloud";
import { getCloudStatusLabel } from "@/lib/cloudStatus";
import {
  Badge,
  Button,
  CloudDetailItem,
  CloudSensitiveDialogContent,
  cloudDetailListClassName,
  cloudDetailListItemClassName,
  cloudDetailLabelClassName,
  cloudDetailSectionClassName,
  cloudDetailValueClassName,
  cloudLongTextClassName,
  Dialog,
} from "@/components/admin/cloud/cloud-ui";

type MaybePromise<T> = T | Promise<T>;

type DigitalOceanDropletDetailDialogProps = {
  t: TFunction;
  droplet: DigitalOceanDroplet | null;
  passwordStorageEnabled: boolean;
  dropletPasswordLoading: boolean;
  onClose: () => void;
  onViewPassword: (droplet: DigitalOceanDroplet) => MaybePromise<void>;
  getRegionOptionLabel: (region: DigitalOceanDroplet["region"], t: TFunction) => string;
  getDropletPrimaryIp: (droplet: DigitalOceanDroplet) => string;
  getImageLabel: (image: DigitalOceanDroplet["image"]) => string;
  formatDateTime: (value: string) => string;
  formatList: (values: Array<string | number>) => string;
};

const DetailItem = CloudDetailItem;

export function DigitalOceanDropletDetailDialog({
  t,
  droplet,
  passwordStorageEnabled,
  dropletPasswordLoading,
  onClose,
  onViewPassword,
  getRegionOptionLabel,
  getDropletPrimaryIp,
  getImageLabel,
  formatDateTime,
  formatList,
}: DigitalOceanDropletDetailDialogProps) {
  return (
    <Dialog.Root
      open={Boolean(droplet)}
      onOpenChange={(open) => {
        if (open) return;
        onClose();
      }}
    >
      {droplet ? (
        <CloudSensitiveDialogContent
          title={droplet.name || t("cloud.detail.title", "Droplet Details")}
          description={t(
            "cloud.detail.description",
            "View the selected DigitalOcean Droplet details from the current active token.",
          )}
          icon={<Server className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.digitalocean.name", "DigitalOcean")}</Badge>
              <Badge color={droplet.status === "active" ? "green" : "amber"}>
                {getCloudStatusLabel(droplet.status, t)}
              </Badge>
            </>
          )}
          className="sm:max-w-5xl"
        >
          <div className="flex flex-col gap-4">
            <section className="pt-0">
              <div className={cloudDetailLabelClassName}>
                {t("cloud.detail.summary", "Summary")}
              </div>
              <div className="mt-2 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
                <DetailItem variant="plain" label={t("cloud.detail.id", "Droplet ID")} value={droplet.id} />
                <DetailItem
                  variant="plain"
                  label={t("cloud.table.status", "Status")}
                  value={getCloudStatusLabel(droplet.status, t)}
                />
                <DetailItem
                  variant="plain"
                  label={t("cloud.table.region", "Region")}
                  value={getRegionOptionLabel(droplet.region, t)}
                />
                <DetailItem variant="plain" label={t("cloud.table.ip", "Public IP")} value={getDropletPrimaryIp(droplet)} />
                <DetailItem
                  variant="plain"
                  label={t("cloud.table.size", "Size")}
                  value={droplet.size_slug || droplet.size?.slug || "-"}
                />
                <DetailItem variant="plain" label={t("cloud.table.image", "Image")} value={getImageLabel(droplet.image)} />
                <DetailItem variant="plain" label={t("cloud.table.created_at", "Created")} value={formatDateTime(droplet.created_at)} />
                <DetailItem variant="plain" label={t("cloud.detail.memory", "Memory")} value={`${droplet.memory} MB`} />
                <DetailItem variant="plain" label={t("cloud.detail.vcpus", "vCPUs")} value={droplet.vcpus} />
                <DetailItem variant="plain" label={t("cloud.detail.disk", "Disk")} value={`${droplet.disk} GB`} />
                <DetailItem variant="plain" label={t("cloud.detail.vpc_uuid", "VPC UUID")} value={droplet.vpc_uuid || "-"} />
                <DetailItem variant="plain" label={t("cloud.detail.tags", "Tags")} value={formatList(droplet.tags)} />
              </div>
            </section>

            <section className={cloudDetailSectionClassName}>
              <div className={cloudDetailLabelClassName}>
                {t("cloud.detail.access", "Access")}
              </div>
              <div className="mt-2 grid gap-x-6 sm:grid-cols-2">
                <DetailItem
                  variant="plain"
                  label={t("cloud.table.password", "Root Password")}
                  value={
                    droplet.saved_root_password ? (
                      <Button
                        variant="soft"
                        size="1"
                        disabled={!passwordStorageEnabled || dropletPasswordLoading}
                        onClick={() => {
                          void onViewPassword(droplet);
                        }}
                      >
                        <KeyRound className="mr-1 h-3.5 w-3.5" />
                        {t("cloud.password.view", "View Password")}
                      </Button>
                    ) : (
                      t("cloud.password.not_saved", "Not saved")
                    )
                  }
                />
                <DetailItem
                  variant="plain"
                  label={t("cloud.detail.features", "Features")}
                  value={formatList(droplet.features)}
                />
              </div>
            </section>

            <section className={cloudDetailSectionClassName}>
              <div className={cloudDetailLabelClassName}>
                {t("cloud.detail.resources", "Resources")}
              </div>
              <div className="mt-2 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
                <DetailItem
                  variant="plain"
                  label={t("cloud.detail.backup_ids", "Backup IDs")}
                  value={formatList(droplet.backup_ids)}
                />
                <DetailItem
                  variant="plain"
                  label={t("cloud.detail.snapshot_ids", "Snapshot IDs")}
                  value={formatList(droplet.snapshot_ids)}
                />
                <DetailItem
                  variant="plain"
                  label={t("cloud.detail.volume_ids", "Volume IDs")}
                  value={formatList(droplet.volume_ids)}
                />
              </div>
            </section>

            <section className={cloudDetailSectionClassName}>
              <div className={cloudDetailLabelClassName}>
                {t("cloud.detail.network", "Network")}
              </div>
              <div className={`mt-2 ${cloudDetailListClassName}`}>
                <div className={cloudDetailListItemClassName}>
                  <div className={cloudDetailLabelClassName}>
                    {t("cloud.detail.ipv4", "IPv4 Networks")}
                  </div>
                  <div className={`mt-1 ${cloudDetailValueClassName} ${cloudLongTextClassName}`}>
                    {droplet.networks.v4.length
                      ? droplet.networks.v4.map((network) => `${network.type}: ${network.ip_address}`).join(" | ")
                      : "-"}
                  </div>
                </div>
                <div className={cloudDetailListItemClassName}>
                  <div className={cloudDetailLabelClassName}>
                    {t("cloud.detail.ipv6", "IPv6 Networks")}
                  </div>
                  <div className={`mt-1 ${cloudDetailValueClassName} ${cloudLongTextClassName}`}>
                    {droplet.networks.v6.length
                      ? droplet.networks.v6.map((network) => `${network.type}: ${network.ip_address}`).join(" | ")
                      : "-"}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </CloudSensitiveDialogContent>
      ) : null}
    </Dialog.Root>
  );
}

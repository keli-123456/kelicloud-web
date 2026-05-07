import type { TFunction } from "i18next";
import {
  KeyRound,
  MoreHorizontal,
  Power,
  PowerOff,
  RefreshCw,
  RotateCcw,
  Server,
  Terminal,
  Trash2,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type {
  AzureCatalog,
  AzureCredentialRecord,
  AzureInstance,
  AzureInstanceDetail,
} from "@/lib/cloudAzure";
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
  cloudPanelBodyTextClassName,
  cloudPanelTitleClassName,
  Dialog,
  Flex,
} from "@/components/admin/cloud/cloud-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatList,
  getLocationLabel,
} from "./azurePanelUtils";

type MaybePromise<T> = T | Promise<T>;

type AzureInstanceDetailDialogProps = {
  t: TFunction;
  catalog: AzureCatalog | null;
  activeCredential: AzureCredentialRecord | null;
  detailInstance: AzureInstance | null;
  detailData: AzureInstanceDetail | null;
  detailLoading: boolean;
  passwordStorageEnabled: boolean;
  passwordLoading: boolean;
  workingInstanceId: string | null;
  onClose: () => void;
  onViewPassword: (instance: AzureInstance) => MaybePromise<void>;
  onInstanceAction: (
    instance: AzureInstance,
    type: "start" | "deallocate" | "restart" | "replace_public_ip",
  ) => MaybePromise<void>;
  onReplaceInstanceIP: (instance: AzureInstance) => MaybePromise<void>;
  onDeleteInstance: (instance: AzureInstance) => MaybePromise<void>;
  onOpenScript: (instance: AzureInstance) => void;
};

export function AzureInstanceDetailDialog({
  t,
  catalog,
  activeCredential,
  detailInstance,
  detailData,
  detailLoading,
  passwordStorageEnabled,
  passwordLoading,
  workingInstanceId,
  onClose,
  onViewPassword,
  onInstanceAction,
  onReplaceInstanceIP,
  onDeleteInstance,
  onOpenScript,
}: AzureInstanceDetailDialogProps) {
  return (
    <Dialog.Root open={Boolean(detailInstance)} onOpenChange={(open) => !open && onClose()}>
      {detailInstance ? (
        <CloudSensitiveDialogContent
          title={detailInstance.name || t("cloud.providers.azure.title", "Azure")}
          description={t(
            "cloud.providers.azure.detail_description",
            "View the selected Azure virtual machine details from the current active credential.",
          )}
          icon={<Server className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.azure.name", "Azure")}</Badge>
              <Badge color={(detailInstance.power_state || "").includes("running") ? "green" : "amber"}>
                {getCloudStatusLabel(detailInstance.power_state || detailInstance.provisioning_state, t)}
              </Badge>
            </>
          )}
          className="sm:max-w-6xl"
        >
        {detailLoading ? (
          <AzureInstanceDetailSkeleton />
        ) : detailData ? (
          <div className="space-y-4">
            <section className="pt-0">
              <div className={cloudDetailLabelClassName}>
                {t("cloud.detail.summary", "Summary")}
              </div>
              <div className="mt-2 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
                <CloudDetailItem variant="plain" label={t("cloud.table.name", "Name")} value={detailData.instance.name || "-"} />
                <CloudDetailItem variant="plain" label={t("cloud.providers.azure.resource_group", "Resource Group")} value={detailData.instance.resource_group || "-"} />
                <CloudDetailItem variant="plain" label={t("cloud.table.region", "Region")} value={getLocationLabel(catalog, detailData.instance.location)} />
                <CloudDetailItem variant="plain" label={t("cloud.table.status", "Status")} value={getCloudStatusLabel(detailData.instance.power_state || detailData.instance.provisioning_state, t)} />
                <CloudDetailItem variant="plain" label={t("cloud.table.size", "Size")} value={detailData.instance.size || "-"} />
                <CloudDetailItem variant="plain" label={t("cloud.providers.azure.os_type", "OS Type")} value={detailData.instance.os_type || "-"} />
                <CloudDetailItem variant="plain" label={t("cloud.providers.azure.computer_name", "Computer Name")} value={detailData.instance.computer_name || "-"} />
                <CloudDetailItem variant="plain" label={t("cloud.providers.azure.vm_id", "VM ID")} value={detailData.vm_id || "-"} />
                <CloudDetailItem variant="plain" label={t("cloud.providers.azure.image", "Image")} value={detailData.instance.image || "-"} />
                <CloudDetailItem variant="plain" label={t("cloud.table.ip", "Public IP")} value={formatList(detailData.instance.public_ips)} />
                <CloudDetailItem variant="plain" label={t("cloud.providers.azure.private_ip", "Private IP")} value={formatList(detailData.instance.private_ips)} />
                <CloudDetailItem variant="plain" label={t("cloud.providers.azure.zones", "Zones")} value={formatList(detailData.zones)} />
              </div>
            </section>

            <section className={cloudDetailSectionClassName}>
              <Flex justify="between" align="center" wrap="wrap" gap="2">
                <div className={cloudPanelTitleClassName}>
                  {t("cloud.providers.azure.actions", "Actions")}
                </div>
                {activeCredential ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenScript(detailData.instance)}
                  >
                    <Terminal className="mr-1 h-3.5 w-3.5" />
                    {t("cloud.script.action", "Run Script")}
                  </Button>
                ) : null}
              </Flex>
              <Flex wrap="nowrap" gap="2" className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!detailData.instance.saved_root_password || !passwordStorageEnabled || passwordLoading}
                  onClick={() => void onViewPassword(detailData.instance)}
                >
                  <KeyRound className="mr-1 h-3.5 w-3.5" />
                  {t("cloud.password.view", "View Password")}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={t("common.action", "Action")}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-44">
                    <DropdownMenuItem
                      disabled={workingInstanceId === detailData.instance.instance_id}
                      onSelect={() => void onInstanceAction(detailData.instance, "start")}
                    >
                      <Power className="h-4 w-4" />
                      {t("cloud.power_on", "Power On")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={workingInstanceId === detailData.instance.instance_id}
                      onSelect={() => void onInstanceAction(detailData.instance, "deallocate")}
                    >
                      <PowerOff className="h-4 w-4" />
                      {t("cloud.power_off", "Power Off")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={workingInstanceId === detailData.instance.instance_id}
                      onSelect={() => void onInstanceAction(detailData.instance, "restart")}
                    >
                      <RotateCcw className="h-4 w-4" />
                      {t("cloud.reboot", "Reboot")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={workingInstanceId === detailData.instance.instance_id}
                      onSelect={() => void onReplaceInstanceIP(detailData.instance)}
                    >
                      <RefreshCw className="h-4 w-4" />
                      {t("cloud.providers.azure.replace_ip", "Replace IP")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={workingInstanceId === detailData.instance.instance_id}
                      onSelect={() => void onDeleteInstance(detailData.instance)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("cloud.delete", "Delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Flex>
            </section>

            <section className={cloudDetailSectionClassName}>
              <div className={cloudPanelTitleClassName}>
                {t("cloud.providers.azure.network_interfaces", "Network Interfaces")}
              </div>
              <div className={`mt-3 ${cloudDetailListClassName}`}>
                {detailData.network_interfaces.length ? detailData.network_interfaces.map((networkInterface) => (
                  <div key={networkInterface.id || networkInterface.name} className={cloudDetailListItemClassName}>
                    <div className={`${cloudDetailValueClassName} ${cloudLongTextClassName}`}>
                      {networkInterface.name || networkInterface.id || "-"}
                    </div>
                    <div className="mt-2 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-4">
                      <CloudDetailItem variant="plain" label={t("cloud.providers.azure.primary", "Primary")} value={networkInterface.primary ? t("common.yes", "Yes") : t("common.no", "No")} />
                      <CloudDetailItem variant="plain" label={t("cloud.providers.azure.private_ip", "Private IP")} value={formatList(networkInterface.private_ips)} />
                      <CloudDetailItem variant="plain" label={t("cloud.table.ip", "Public IP")} value={formatList(networkInterface.public_ips)} />
                      <CloudDetailItem variant="plain" label={t("cloud.providers.azure.nsg", "NSG")} value={networkInterface.network_security_group_id || "-"} />
                    </div>
                  </div>
                )) : (
                  <div className={cloudPanelBodyTextClassName}>
                    {t("cloud.providers.azure.network_interfaces_empty", "No network interfaces found")}
                  </div>
                )}
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-2">
              <section className={cloudDetailSectionClassName}>
                <div className={cloudPanelTitleClassName}>
                  {t("cloud.providers.azure.os_disk", "OS Disk")}
                </div>
                <div className="mt-3">
                  {detailData.os_disk ? (
                    <div className="grid gap-x-6 sm:grid-cols-2">
                      <CloudDetailItem variant="plain" label={t("cloud.table.name", "Name")} value={detailData.os_disk.name || "-"} />
                      <CloudDetailItem variant="plain" label={t("cloud.providers.azure.disk_size", "Disk Size")} value={detailData.os_disk.size_gb ? `${detailData.os_disk.size_gb} GiB` : "-"} />
                      <CloudDetailItem variant="plain" label={t("cloud.providers.azure.disk_type", "Disk Type")} value={detailData.os_disk.storage_account_type || "-"} />
                      <CloudDetailItem variant="plain" label={t("cloud.providers.azure.create_option", "Create Option")} value={detailData.os_disk.create_option || "-"} />
                    </div>
                  ) : (
                    <div className={cloudPanelBodyTextClassName}>
                      {t("cloud.providers.azure.os_disk_empty", "OS disk details unavailable")}
                    </div>
                  )}
                </div>
              </section>

              <section className={cloudDetailSectionClassName}>
                <div className={cloudPanelTitleClassName}>
                  {t("cloud.providers.azure.data_disks", "Data Disks")}
                </div>
                <div className={`mt-3 ${cloudDetailListClassName}`}>
                  {detailData.data_disks.length ? detailData.data_disks.map((disk) => (
                    <div key={`${disk.id}-${disk.lun}`} className={cloudDetailListItemClassName}>
                      <div className={`${cloudDetailValueClassName} ${cloudLongTextClassName}`}>
                        {disk.name || disk.id || "-"}
                      </div>
                      <div className="mt-2 grid gap-x-6 sm:grid-cols-2">
                        <CloudDetailItem variant="plain" label={t("cloud.providers.azure.lun", "LUN")} value={disk.lun} />
                        <CloudDetailItem variant="plain" label={t("cloud.providers.azure.disk_size", "Disk Size")} value={disk.size_gb ? `${disk.size_gb} GiB` : "-"} />
                        <CloudDetailItem variant="plain" label={t("cloud.providers.azure.disk_type", "Disk Type")} value={disk.storage_account_type || "-"} />
                        <CloudDetailItem variant="plain" label={t("cloud.providers.azure.create_option", "Create Option")} value={disk.create_option || "-"} />
                      </div>
                    </div>
                  )) : (
                    <div className={cloudPanelBodyTextClassName}>
                      {t("cloud.providers.azure.data_disks_empty", "No data disks attached")}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <section className={cloudDetailSectionClassName}>
              <div className={cloudPanelTitleClassName}>
                {t("cloud.providers.azure.tags", "Tags")}
              </div>
              <div className="mt-3">
                {Object.keys(detailData.instance.tags || {}).length ? (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {Object.entries(detailData.instance.tags).map(([key, value]) => (
                      <div key={key} className="border-b border-border py-3 last:border-b-0">
                        <div className={cloudDetailLabelClassName}>
                          {key}
                        </div>
                        <div className={`mt-1 ${cloudDetailValueClassName} ${cloudLongTextClassName}`}>
                          {value || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={cloudPanelBodyTextClassName}>
                    {t("cloud.providers.azure.tags_empty", "No tags configured")}
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className={cloudPanelBodyTextClassName}>
            {t("cloud.providers.azure.detail_empty", "Unable to load Azure VM details")}
          </div>
        )}
        </CloudSensitiveDialogContent>
      ) : null}
    </Dialog.Root>
  );
}

function AzureInstanceDetailSkeleton() {
  return (
    <div className="mt-4 space-y-5">
      <section className="pt-0">
        <Skeleton className="h-3 w-24" />
        <div className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div
              key={index}
              className="border-b border-border py-3"
            >
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-4 w-4/5" />
            </div>
          ))}
        </div>
      </section>

      <section className={cloudDetailSectionClassName}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-24" />
          ))}
        </div>
      </section>

      <section className={cloudDetailSectionClassName}>
        <Skeleton className="h-4 w-36" />
        <div className={`mt-3 ${cloudDetailListClassName}`}>
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className={cloudDetailListItemClassName}>
              <Skeleton className="h-4 w-1/2" />
              <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((__, itemIndex) => (
                  <div key={itemIndex} className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

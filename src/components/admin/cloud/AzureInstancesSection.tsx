import type { TFunction } from "i18next";
import {
  Eye,
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

import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import type {
  AzureAccount,
  AzureCatalog,
  AzureCredentialRecord,
  AzureInstance,
} from "@/lib/cloudAzure";
import { getCloudStatusLabel } from "@/lib/cloudStatus";
import {
  Badge,
  Button,
  CloudTableSkeletonRows,
  cloudLongTextClassName,
  cloudPanelCardClassName,
  cloudPanelDescriptionClassName,
  cloudPanelHeaderClassName,
  cloudPanelTitleClassName,
  Flex,
  Select,
} from "@/components/admin/cloud/cloud-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDateTime,
  formatList,
  getInstanceStateColor,
  getLocationLabel,
} from "./azurePanelUtils";

type MaybePromise<T> = T | Promise<T>;

type AzureInstancesSectionProps = {
  t: TFunction;
  catalog: AzureCatalog | null;
  account: AzureAccount | null;
  activeCredential: AzureCredentialRecord | null;
  instances: AzureInstance[];
  locationUpdating: boolean;
  resourceLoading: boolean;
  passwordStorageEnabled: boolean;
  passwordLoading: boolean;
  workingInstanceId: string | null;
  onSetLocation: (location: string) => MaybePromise<void>;
  onOpenDetail: (instance: AzureInstance) => MaybePromise<void>;
  onOpenScript: (instance: AzureInstance) => void;
  onViewPassword: (instance: AzureInstance) => MaybePromise<void>;
  onInstanceAction: (
    instance: AzureInstance,
    type: "start" | "deallocate" | "restart" | "replace_public_ip",
  ) => MaybePromise<void>;
  onReplaceInstanceIP: (instance: AzureInstance) => MaybePromise<void>;
  onDeleteInstance: (instance: AzureInstance) => MaybePromise<void>;
};

export function AzureInstancesSection({
  t,
  catalog,
  account,
  activeCredential,
  instances,
  locationUpdating,
  resourceLoading,
  passwordStorageEnabled,
  passwordLoading,
  workingInstanceId,
  onSetLocation,
  onOpenDetail,
  onOpenScript,
  onViewPassword,
  onInstanceAction,
  onReplaceInstanceIP,
  onDeleteInstance,
}: AzureInstancesSectionProps) {
  return (
    <section className={cloudPanelCardClassName}>
      <div className={cloudPanelHeaderClassName}>
        <Flex justify="between" align="center" wrap="wrap" gap="2">
          <div>
            <div className={cloudPanelTitleClassName}>
              {t("cloud.providers.azure.instance_list", "Virtual Machines")}
            </div>
            <div className={cloudPanelDescriptionClassName}>
              {t(
                "cloud.providers.azure.instance_list_description",
                "Lists all VMs under the current subscription. Open details to inspect network interfaces, disks, and runtime state.",
              )}
            </div>
          </div>
          <Flex align="center" wrap="wrap" gap="2">
            {catalog?.locations.length ? (
              <div className="w-full sm:w-72">
                <Select.Root
                  value={catalog.active_location || account?.active_location || activeCredential?.default_location || ""}
                  onValueChange={(value) => void onSetLocation(value)}
                  disabled={locationUpdating}
                >
                  <Select.Trigger placeholder={t("cloud.providers.azure.active_location", "Active Location")} />
                  <Select.Content>
                    {catalog.locations.map((location) => (
                      <Select.Item key={location.name} value={location.name}>
                        {location.regionalDisplayName || location.displayName || location.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
            ) : null}
            <Badge color="blue">{instances.length}</Badge>
          </Flex>
        </Flex>
      </div>
      <div className="p-5">
        {!activeCredential ? (
          <AdminEmptyState
            icon={<KeyRound className="h-5 w-5" />}
            title={t("cloud.providers.azure.no_active_credential", "Select an active Azure credential first")}
            description={t(
              "cloud.providers.azure.no_active_credential_description",
              "Import credentials or select an existing subscription before loading virtual machines.",
            )}
            className="min-h-36 border-0 bg-slate-50/70 shadow-none dark:bg-slate-900/30"
          />
        ) : resourceLoading ? (
          <div className="overflow-x-auto">
            <Table className="min-w-[1180px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("cloud.table.name", "Name")}</TableHead>
                  <TableHead>{t("cloud.providers.azure.resource_group", "Resource Group")}</TableHead>
                  <TableHead>{t("cloud.table.region", "Region")}</TableHead>
                  <TableHead>{t("cloud.table.status", "Status")}</TableHead>
                  <TableHead>{t("cloud.table.size", "Size")}</TableHead>
                  <TableHead>{t("cloud.table.ip", "Public IP")}</TableHead>
                  <TableHead>{t("cloud.providers.azure.private_ip", "Private IP")}</TableHead>
                  <TableHead>{t("cloud.table.password", "Root Password")}</TableHead>
                  <TableHead className="text-right">{t("common.actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <CloudTableSkeletonRows columns={9} />
              </TableBody>
            </Table>
          </div>
        ) : !instances.length ? (
          <AdminEmptyState
            icon={<Server className="h-5 w-5" />}
            title={t("cloud.providers.azure.instances_empty", "No Azure virtual machines found")}
            description={t(
              "cloud.providers.azure.instances_empty_description",
              "Create a VM in the active subscription or switch to another credential/location with existing machines.",
            )}
            className="min-h-36 border-0 bg-slate-50/70 shadow-none dark:bg-slate-900/30"
          />
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[1180px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("cloud.table.name", "Name")}</TableHead>
                  <TableHead>{t("cloud.providers.azure.resource_group", "Resource Group")}</TableHead>
                  <TableHead>{t("cloud.table.region", "Region")}</TableHead>
                  <TableHead>{t("cloud.table.status", "Status")}</TableHead>
                  <TableHead>{t("cloud.table.size", "Size")}</TableHead>
                  <TableHead>{t("cloud.table.ip", "Public IP")}</TableHead>
                  <TableHead>{t("cloud.providers.azure.private_ip", "Private IP")}</TableHead>
                  <TableHead>{t("cloud.table.password", "Root Password")}</TableHead>
                  <TableHead className="text-right">{t("common.actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instances.map((instance) => (
                  <TableRow key={instance.instance_id}>
                    <TableCell className="align-top">
                      <div className={`font-medium ${cloudLongTextClassName}`}>
                        {instance.name || "-"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {instance.os_type || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">{instance.resource_group || "-"}</TableCell>
                    <TableCell className="align-top">{getLocationLabel(catalog, instance.location)}</TableCell>
                    <TableCell className="align-top">
                      <Badge color={getInstanceStateColor(instance)}>
                        {getCloudStatusLabel(instance.power_state || instance.provisioning_state, t)}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top">{instance.size || "-"}</TableCell>
                    <TableCell className="align-top">{formatList(instance.public_ips)}</TableCell>
                    <TableCell className="align-top">{formatList(instance.private_ips)}</TableCell>
                    <TableCell className="align-top">
                      {instance.saved_root_password ? (
                        <div className="space-y-1">
                          <Badge color={passwordStorageEnabled ? "green" : "amber"}>
                            {passwordStorageEnabled
                              ? t("cloud.password.saved", "Saved")
                              : t("cloud.password.locked", "Locked")}
                          </Badge>
                          {instance.saved_root_password_updated_at ? (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {formatDateTime(instance.saved_root_password_updated_at)}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">
                          {passwordStorageEnabled
                            ? t("cloud.password.not_saved", "Not saved")
                            : t("cloud.password.disabled_short", "Vault off")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => void onOpenDetail(instance)}>
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          {t("cloud.view", "View")}
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
                          <DropdownMenuContent align="end" className="min-w-44">
                            <DropdownMenuItem onSelect={() => onOpenScript(instance)}>
                              <Terminal className="h-4 w-4" />
                              {t("cloud.script.action", "Run Script")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={!instance.saved_root_password || !passwordStorageEnabled || passwordLoading}
                              onSelect={() => void onViewPassword(instance)}
                            >
                              <KeyRound className="h-4 w-4" />
                              {t("cloud.password.view", "View Password")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={workingInstanceId === instance.instance_id}
                              onSelect={() => void onInstanceAction(instance, "start")}
                            >
                              <Power className="h-4 w-4" />
                              {t("cloud.power_on", "Power On")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={workingInstanceId === instance.instance_id}
                              onSelect={() => void onInstanceAction(instance, "deallocate")}
                            >
                              <PowerOff className="h-4 w-4" />
                              {t("cloud.power_off", "Power Off")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={workingInstanceId === instance.instance_id}
                              onSelect={() => void onInstanceAction(instance, "restart")}
                            >
                              <RotateCcw className="h-4 w-4" />
                              {t("cloud.reboot", "Reboot")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={workingInstanceId === instance.instance_id}
                              onSelect={() => void onReplaceInstanceIP(instance)}
                            >
                              <RefreshCw className="h-4 w-4" />
                              {t("cloud.providers.azure.replace_ip", "Replace IP")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={workingInstanceId === instance.instance_id}
                              onSelect={() => void onDeleteInstance(instance)}
                            >
                              <Trash2 className="h-4 w-4" />
                              {t("cloud.delete", "Delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  );
}

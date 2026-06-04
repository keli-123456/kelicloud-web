import { useCallback } from "react";
import type { TFunction } from "i18next";
import {
  Eye,
  KeyRound,
  Power,
  PowerOff,
  RefreshCw,
  RotateCcw,
  Server,
  Terminal,
  Trash2,
} from "lucide-react";

import {
  AdminDataTable,
  AdminDataTableCell,
  AdminDataTableHead,
  AdminDataTableHeadRow,
  AdminDataTableRow,
  AdminDataTableScroll,
} from "@/components/admin/AdminDataTable";
import {
  AdminPagination,
  useClientPagination,
} from "@/components/admin/AdminPagination";
import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import {
  CloudBulkDeleteToolbar,
  CloudBulkSelectCheckbox,
  useCloudBulkSelection,
} from "@/components/admin/cloud/CloudBulkActions";
import type {
  AzureAccount,
  AzureCatalog,
  AzureCredentialRecord,
  AzureInstance,
} from "@/lib/cloudAzure";
import { getCloudStatusLabel } from "@/lib/cloudStatus";
import {
  Badge,
  CloudTableSkeletonRows,
  cloudLongTextClassName,
  cloudPanelCardClassName,
  cloudPanelDescriptionClassName,
  cloudPanelHeaderClassName,
  cloudPanelTitleClassName,
  cloudTableEmptyStateClassName,
  cloudTableMutedTextClassName,
  cloudTableNameButtonClassName,
  cloudTableSecondaryTextClassName,
  Flex,
  Select,
} from "@/components/admin/cloud/cloud-ui";
import {
  formatDateTime,
  formatAzureLocationOption,
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
  onBatchDeleteInstances: (instances: AzureInstance[]) => MaybePromise<boolean>;
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
  onBatchDeleteInstances,
}: AzureInstancesSectionProps) {
  const instancePagination = useClientPagination(instances, {
    initialPageSize: 10,
  });
  const paginatedInstances = instancePagination.pageItems;
  const getSelectionKey = useCallback((instance: AzureInstance) => instance.instance_id, []);
  const bulkSelection = useCloudBulkSelection(instances, getSelectionKey);
  const batchDeleting = workingInstanceId === "__batch_delete__";
  const handleBatchDelete = async () => {
    const completed = await onBatchDeleteInstances(bulkSelection.selectedItems);
    if (completed) {
      bulkSelection.clearSelection();
    }
  };

  return (
    <section className={cloudPanelCardClassName}>
      <div className={cloudPanelHeaderClassName}>
        <Flex justify="between" align="center" wrap="wrap" gap="2">
          <div>
            <div className={cloudPanelTitleClassName}>
              {t("cloud.providers.azure.instance_list", "虚拟机")}
            </div>
            <div className={cloudPanelDescriptionClassName}>
              {t(
                "cloud.providers.azure.instance_list_description",
                "Click a VM name to inspect details, while power and script actions stay in the row.",
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
                  <Select.Trigger placeholder={t("cloud.providers.azure.active_location", "当前地区")} />
                  <Select.Content>
                    {catalog.locations.map((location) => (
                      <Select.Item key={location.name} value={location.name}>
                        {formatAzureLocationOption(location)}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
            ) : null}
            <CloudBulkDeleteToolbar
              t={t}
              selectedCount={bulkSelection.selectedCount}
              totalCount={instances.length}
              deleting={batchDeleting}
              onClear={bulkSelection.clearSelection}
              onDelete={() => {
                void handleBatchDelete();
              }}
            />
          </Flex>
        </Flex>
      </div>
      <div className="p-5">
        {!activeCredential ? (
          <AdminEmptyState
            icon={<KeyRound className="h-5 w-5" />}
            title={t("cloud.providers.azure.no_active_credential", "请先选择已激活的 Azure 凭证")}
            description={t(
              "cloud.providers.azure.no_active_credential_description",
              "加载虚拟机前，请先导入凭证或选择已有订阅。",
            )}
            className={cloudTableEmptyStateClassName}
          />
        ) : resourceLoading ? (
          <AdminDataTableScroll>
            <AdminDataTable minWidth={1040}>
              <thead>
                <AdminDataTableHeadRow>
                  <AdminDataTableHead>{t("cloud.table.name", "名称")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.table.region", "地区")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.table.status", "状态")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.table.size", "规格")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.table.ip", "公网 IP")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.providers.azure.private_ip", "内网 IP")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.table.password", "登录密码")}</AdminDataTableHead>
                  <AdminDataTableHead align="right" sticky="right">
                    {t("common.actions", "操作")}
                  </AdminDataTableHead>
                </AdminDataTableHeadRow>
              </thead>
              <tbody>
                <CloudTableSkeletonRows columns={8} />
              </tbody>
            </AdminDataTable>
          </AdminDataTableScroll>
        ) : !instances.length ? (
          <AdminEmptyState
            icon={<Server className="h-5 w-5" />}
            title={t("cloud.providers.azure.instances_empty", "未找到 Azure 虚拟机")}
            description={t(
              "cloud.providers.azure.instances_empty_description",
              "可以在当前订阅创建虚拟机，或切换到已有机器的凭证和地区。",
            )}
            className={cloudTableEmptyStateClassName}
          />
        ) : (
          <>
          <AdminDataTableScroll>
            <AdminDataTable minWidth={1040}>
              <thead>
                <AdminDataTableHeadRow>
                  <AdminDataTableHead className="w-10">
                    <CloudBulkSelectCheckbox
                        label={t("cloud.bulk.select_all", "选择全部实例")}
                        checked={bulkSelection.allSelected ? true : bulkSelection.someSelected ? "indeterminate" : false}
                        disabled={instances.length === 0 || resourceLoading || batchDeleting}
                        onCheckedChange={bulkSelection.toggleAll}
                      />
                  </AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.table.name", "名称")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.table.region", "地区")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.table.status", "状态")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.table.size", "规格")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.table.ip", "公网 IP")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.providers.azure.private_ip", "内网 IP")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.table.password", "登录密码")}</AdminDataTableHead>
                  <AdminDataTableHead align="right" sticky="right">
                    {t("common.actions", "操作")}
                  </AdminDataTableHead>
                </AdminDataTableHeadRow>
              </thead>
              <tbody>
                {paginatedInstances.map((instance) => (
                  <AdminDataTableRow key={instance.instance_id} selected={bulkSelection.isSelected(instance)}>
                    <AdminDataTableCell className="w-10 align-top">
                      <CloudBulkSelectCheckbox
                        label={t("cloud.bulk.select_instance", {
                          name: instance.name || instance.instance_id,
                          defaultValue: `选择 ${instance.name || instance.instance_id}`,
                        })}
                        checked={bulkSelection.isSelected(instance)}
                        disabled={batchDeleting}
                        onCheckedChange={(checked) => bulkSelection.toggleItem(instance, checked)}
                      />
                    </AdminDataTableCell>
                    <AdminDataTableCell className="align-top">
                      <button
                        type="button"
                        className={`${cloudTableNameButtonClassName} ${cloudLongTextClassName}`}
                        onClick={() => {
                          void onOpenDetail(instance);
                        }}
                      >
                        {instance.name || "-"}
                      </button>
                      <div className={`mt-1 ${cloudTableSecondaryTextClassName}`}>
                        {instance.os_type || "-"}
                      </div>
                    </AdminDataTableCell>
                    <AdminDataTableCell className="align-top">{getLocationLabel(catalog, instance.location)}</AdminDataTableCell>
                    <AdminDataTableCell className="align-top">
                      <Badge color={getInstanceStateColor(instance)}>
                        {getCloudStatusLabel(instance.power_state || instance.provisioning_state, t)}
                      </Badge>
                    </AdminDataTableCell>
                    <AdminDataTableCell className="align-top">{instance.size || "-"}</AdminDataTableCell>
                    <AdminDataTableCell className="align-top">{formatList(instance.public_ips)}</AdminDataTableCell>
                    <AdminDataTableCell className="align-top">{formatList(instance.private_ips)}</AdminDataTableCell>
                    <AdminDataTableCell className="align-top">
                      {instance.saved_root_password ? (
                        <div className="space-y-1">
                          <Badge color={passwordStorageEnabled ? "green" : "amber"}>
                            {passwordStorageEnabled
                              ? t("cloud.password.saved", "已保存")
                              : t("cloud.password.locked", "已锁定")}
                          </Badge>
                          {instance.saved_root_password_updated_at ? (
                            <div className={cloudTableSecondaryTextClassName}>
                              {formatDateTime(instance.saved_root_password_updated_at)}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className={cloudTableMutedTextClassName}>
                          {passwordStorageEnabled
                            ? t("cloud.password.not_saved", "未保存")
                            : t("cloud.password.disabled_short", "密库未启用")}
                        </span>
                      )}
                    </AdminDataTableCell>
                    <AdminDataTableCell align="right" className="align-top" sticky="right">
                      <AdminRowActions
                        contentClassName="min-w-44"
                        actions={[
                          {
                            label: t("cloud.view", "查看"),
                            icon: <Eye className="h-4 w-4" />,
                            onSelect: () => {
                              void onOpenDetail(instance);
                            },
                          },
                          {
                            label: t("cloud.script.action", "执行脚本"),
                            icon: <Terminal className="h-4 w-4" />,
                            onSelect: () => onOpenScript(instance),
                          },
                          {
                            label: t("cloud.password.view", "查看密码"),
                            icon: <KeyRound className="h-4 w-4" />,
                            disabled: !instance.saved_root_password || !passwordStorageEnabled || passwordLoading,
                            onSelect: () => {
                              void onViewPassword(instance);
                            },
                          },
                          {
                            label: t("cloud.power_on", "开机"),
                            icon: <Power className="h-4 w-4" />,
                            disabled: workingInstanceId === instance.instance_id,
                            onSelect: () => {
                              void onInstanceAction(instance, "start");
                            },
                          },
                          {
                            label: t("cloud.power_off", "关机"),
                            icon: <PowerOff className="h-4 w-4" />,
                            disabled: workingInstanceId === instance.instance_id,
                            onSelect: () => {
                              void onInstanceAction(instance, "deallocate");
                            },
                          },
                          {
                            label: t("cloud.reboot", "重启"),
                            icon: <RotateCcw className="h-4 w-4" />,
                            disabled: workingInstanceId === instance.instance_id,
                            onSelect: () => {
                              void onInstanceAction(instance, "restart");
                            },
                          },
                          {
                            label: t("cloud.providers.azure.replace_ip", "更换 IP"),
                            icon: <RefreshCw className="h-4 w-4" />,
                            disabled: workingInstanceId === instance.instance_id,
                            onSelect: () => {
                              void onReplaceInstanceIP(instance);
                            },
                          },
                          {
                            label: t("cloud.delete", "删除"),
                            icon: <Trash2 className="h-4 w-4" />,
                            destructive: true,
                            disabled: workingInstanceId === instance.instance_id,
                            onSelect: () => {
                              void onDeleteInstance(instance);
                            },
                          },
                        ]}
                      />
                    </AdminDataTableCell>
                  </AdminDataTableRow>
                ))}
              </tbody>
            </AdminDataTable>
          </AdminDataTableScroll>
          <AdminPagination
            page={instancePagination.page}
            totalPages={instancePagination.totalPages}
            total={instancePagination.total}
            pageSize={instancePagination.pageSize}
            visibleStart={instancePagination.visibleStart}
            visibleEnd={instancePagination.visibleEnd}
            onPageChange={instancePagination.setPage}
            onPageSizeChange={instancePagination.setPageSize}
            pageSizeOptions={[10, 20, 50]}
            itemLabel={t("admin.pagination.instances", { defaultValue: "instances" })}
            compact
          />
          </>
        )}
      </div>
    </section>
  );
}

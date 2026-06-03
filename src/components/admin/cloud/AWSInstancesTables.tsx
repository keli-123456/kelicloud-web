import * as React from "react";
import type { TFunction } from "i18next";
import { Eye, Server } from "lucide-react";

import {
  AdminDataTable,
  AdminDataTableCell,
  AdminDataTableEmptyRow,
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
import { AWSInstanceRowActions } from "@/components/admin/cloud/AWSInstanceRowActions";
import {
  CloudBulkDeleteToolbar,
  CloudBulkSelectCheckbox,
  useCloudBulkSelection,
} from "@/components/admin/cloud/CloudBulkActions";
import {
  Badge,
  Button,
  CloudTableSkeletonRows,
  cloudTableEmptyStateClassName,
  cloudTableMutedTextClassName,
  cloudTableNameButtonClassName,
  cloudTablePrimaryTextClassName,
  cloudTableSecondaryTextClassName,
} from "@/components/admin/cloud/cloud-ui";
import type {
  AWSInstance,
  AWSLightsailInstance,
} from "@/lib/cloudAws";
import { getCloudStatusLabel } from "@/lib/cloudStatus";
import { formatAddressList } from "./awsPanelSummaries";
import {
  getEC2InstanceTypeDisplay,
  getLightsailBundleDisplay,
} from "./awsPanelCatalog";
import {
  formatDateTime,
  getInstanceStateColor,
} from "./awsPanelUtils";

type MaybePromise<T> = T | Promise<T>;

type SharedInstancesTableProps = {
  t: TFunction;
  panelLoading: boolean;
  error: string;
  hasCredential: boolean;
  activeContextReady: boolean;
  resourcesLoaded: boolean;
  passwordStorageEnabled: boolean;
  passwordLoading: boolean;
  canCreate: boolean;
  onLoadResources: () => MaybePromise<void>;
};

type AWSEC2InstancesTableProps = SharedInstancesTableProps & {
  instances: AWSInstance[];
  onLoadDetail: (instance: AWSInstance) => MaybePromise<void>;
  onViewPassword: (instance: AWSInstance) => MaybePromise<void>;
  onPowerAction: (instance: AWSInstance, action: "start" | "stop") => MaybePromise<void>;
  onReboot: (instance: AWSInstance) => MaybePromise<void>;
  onReplaceIP: (instance: AWSInstance) => MaybePromise<void>;
  onRunScript: (instance: AWSInstance) => void;
  onShare: (instance: AWSInstance) => MaybePromise<void>;
  onDelete: (instance: AWSInstance) => MaybePromise<void>;
  onBatchDelete: (instances: AWSInstance[]) => MaybePromise<boolean>;
};

export function AWSEC2InstancesTable({
  t,
  instances,
  panelLoading,
  error,
  hasCredential,
  activeContextReady,
  resourcesLoaded,
  passwordStorageEnabled,
  passwordLoading,
  onLoadResources,
  onLoadDetail,
  onViewPassword,
  onPowerAction,
  onReboot,
  onReplaceIP,
  onRunScript,
  onShare,
  onDelete,
  onBatchDelete,
}: AWSEC2InstancesTableProps) {
  const instancePagination = useClientPagination(instances, {
    initialPageSize: 10,
  });
  const visibleInstances = instancePagination.pageItems;
  const selectableInstances = React.useMemo(
    () => instances.filter((instance) => instance.state !== "terminated"),
    [instances],
  );
  const getSelectionKey = React.useCallback((instance: AWSInstance) => instance.instance_id, []);
  const bulkSelection = useCloudBulkSelection(selectableInstances, getSelectionKey);
  const handleBatchDelete = async () => {
    const completed = await onBatchDelete(bulkSelection.selectedItems);
    if (completed) {
      bulkSelection.clearSelection();
    }
  };
  const emptyTitle = panelLoading
    ? t("cloud.loading", "正在加载云资源...")
    : error
      ? t("cloud.load_failed", "无法加载云资源，请先处理上方提示后重试。")
      : !hasCredential
        ? t("cloud.providers.aws.no_active_credential", "请先选择一个激活的 AWS 凭证")
        : !activeContextReady
          ? t("cloud.providers.aws.select_region_to_load", "请先选择区域，再加载该 AWS 账户的资源。")
          : !resourcesLoaded
            ? t("cloud.load_resources_prompt", "点击查看，按需加载云资源。")
            : t("cloud.providers.aws.empty", "当前区域没有 EC2 实例");
  const emptyDescription = panelLoading
    ? t("cloud.loading_description", "云厂商 API 可达时，通常几秒内即可完成加载。")
    : error
      ? t("cloud.load_failed_description", "修复上方警告后，可以刷新页面或重新加载资源。")
      : !hasCredential
        ? t("cloud.providers.aws.no_active_credential_description", "导入凭证并选择当前 AWS 账户后，才能加载计算资源。")
        : !activeContextReady
          ? t("cloud.providers.aws.select_region_to_load_description", "在凭证管理区选择区域；EC2 和 Lightsail 资源都会按区域筛选。")
          : !resourcesLoaded
            ? t("cloud.load_resources_description", "云资源按需加载，可以避免多账户场景下页面一打开就发起大量请求。")
            : t("cloud.providers.aws.empty_description", "可以新建 EC2 实例，或切换到已有资源的账户和区域。");
  const emptyActions =
    activeContextReady && !resourcesLoaded ? (
      <Button
        variant="outline"
        size="1"
        onClick={() => {
          void onLoadResources();
        }}
        disabled={panelLoading}
      >
        <Eye className="mr-2 h-4 w-4" />
        {t("cloud.view", "查看")}
      </Button>
    ) : null;

  return (
    <>
    {bulkSelection.selectedCount > 0 ? (
      <div className="border-b border-border bg-muted/20 px-4 py-2">
        <CloudBulkDeleteToolbar
          t={t}
          selectedCount={bulkSelection.selectedCount}
          totalCount={selectableInstances.length}
          hideWhenEmpty
          onClear={bulkSelection.clearSelection}
          onDelete={() => {
            void handleBatchDelete();
          }}
        />
      </div>
    ) : null}
    <AdminDataTableScroll>
    <AdminDataTable minWidth={1220}>
      <thead>
        <AdminDataTableHeadRow>
          <AdminDataTableHead className="w-10">
            <CloudBulkSelectCheckbox
              label={t("cloud.bulk.select_all", "选择全部实例")}
              checked={bulkSelection.allSelected ? true : bulkSelection.someSelected ? "indeterminate" : false}
              disabled={selectableInstances.length === 0 || panelLoading}
              onCheckedChange={bulkSelection.toggleAll}
            />
          </AdminDataTableHead>
          <AdminDataTableHead>{t("cloud.table.name", "名称")}</AdminDataTableHead>
          <AdminDataTableHead>{t("cloud.table.status", "状态")}</AdminDataTableHead>
          <AdminDataTableHead>{t("cloud.providers.aws.az", "可用区")}</AdminDataTableHead>
          <AdminDataTableHead>{t("cloud.table.ip", "公网 IP")}</AdminDataTableHead>
          <AdminDataTableHead>{t("cloud.detail.ipv6", "IPv6 网络")}</AdminDataTableHead>
          <AdminDataTableHead>{t("cloud.table.size", "规格")}</AdminDataTableHead>
          <AdminDataTableHead>{t("cloud.table.image", "镜像")}</AdminDataTableHead>
          <AdminDataTableHead>{t("cloud.table.password", "Root Password")}</AdminDataTableHead>
          <AdminDataTableHead>{t("cloud.table.created_at", "创建时间")}</AdminDataTableHead>
          <AdminDataTableHead align="right" sticky="right">
            {t("common.action", "操作")}
          </AdminDataTableHead>
        </AdminDataTableHeadRow>
      </thead>
      <tbody>
        {panelLoading ? (
          <CloudTableSkeletonRows columns={11} />
        ) : instances.length === 0 ? (
          <AdminDataTableEmptyRow colSpan={11} className="p-5">
              <AdminEmptyState
                icon={<Server className="h-5 w-5" />}
                title={emptyTitle}
                description={emptyDescription}
                actions={emptyActions}
                className={cloudTableEmptyStateClassName}
              />
          </AdminDataTableEmptyRow>
        ) : (
          visibleInstances.map((instance) => (
            <AdminDataTableRow key={instance.instance_id} selected={bulkSelection.isSelected(instance)}>
              <AdminDataTableCell className="w-10">
                <CloudBulkSelectCheckbox
                  label={t("cloud.bulk.select_instance", {
                    name: instance.name || instance.instance_id,
                    defaultValue: `选择 ${instance.name || instance.instance_id}`,
                  })}
                  checked={bulkSelection.isSelected(instance)}
                  disabled={instance.state === "terminated"}
                  onCheckedChange={(checked) => bulkSelection.toggleItem(instance, checked)}
                />
              </AdminDataTableCell>
              <AdminDataTableCell className={cloudTablePrimaryTextClassName}>
                <button
                  type="button"
                  className={cloudTableNameButtonClassName}
                  onClick={() => {
                    void onLoadDetail(instance);
                  }}
                >
                  {instance.name || instance.instance_id}
                </button>
              </AdminDataTableCell>
              <AdminDataTableCell>
                <Badge color={getInstanceStateColor(instance.state)}>
                  {getCloudStatusLabel(instance.state, t)}
                </Badge>
              </AdminDataTableCell>
              <AdminDataTableCell>{instance.availability_zone || "-"}</AdminDataTableCell>
              <AdminDataTableCell>{instance.public_ip || instance.private_ip || "-"}</AdminDataTableCell>
              <AdminDataTableCell>{formatAddressList(instance.ipv6_addresses)}</AdminDataTableCell>
              <AdminDataTableCell>{getEC2InstanceTypeDisplay(instance.instance_type)}</AdminDataTableCell>
              <AdminDataTableCell>{instance.image_id || "-"}</AdminDataTableCell>
              <AdminDataTableCell>
                <AWSInstancePasswordState
                  t={t}
                  saved={instance.saved_root_password}
                  updatedAt={instance.saved_root_password_updated_at}
                  passwordStorageEnabled={passwordStorageEnabled}
                />
              </AdminDataTableCell>
              <AdminDataTableCell>{formatDateTime(instance.launch_time)}</AdminDataTableCell>
              <AdminDataTableCell align="right" sticky="right">
                <AWSInstanceRowActions
                  t={t}
                  state={instance.state}
                  savedRootPassword={instance.saved_root_password}
                  passwordStorageEnabled={passwordStorageEnabled}
                  passwordLoading={passwordLoading}
                  disableStart={instance.state === "terminated"}
                  disableReboot={instance.state === "terminated"}
                  disableReplaceIP={instance.state === "terminated"}
                  disableDelete={instance.state === "terminated"}
                  onViewPassword={() => onViewPassword(instance)}
                  onPowerAction={(action) => onPowerAction(instance, action)}
                  onReboot={() => onReboot(instance)}
                  onReplaceIP={() => onReplaceIP(instance)}
                  onRunScript={() => onRunScript(instance)}
                  onShare={() => onShare(instance)}
                  onDelete={() => onDelete(instance)}
                />
              </AdminDataTableCell>
            </AdminDataTableRow>
          ))
        )}
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
      itemLabel={t("admin.pagination.instances", { defaultValue: "实例" })}
      compact
    />
    </>
  );
}

type AWSLightsailInstancesTableProps = SharedInstancesTableProps & {
  instances: AWSLightsailInstance[];
  lightsailError: string;
  onLoadDetail: (instance: AWSLightsailInstance) => MaybePromise<void>;
  onViewPassword: (instance: AWSLightsailInstance) => MaybePromise<void>;
  onPowerAction: (instance: AWSLightsailInstance, action: "start" | "stop") => MaybePromise<void>;
  onReboot: (instance: AWSLightsailInstance) => MaybePromise<void>;
  onReplaceIP: (instance: AWSLightsailInstance) => MaybePromise<void>;
  onRunScript: (instance: AWSLightsailInstance) => void;
  onShare: (instance: AWSLightsailInstance) => MaybePromise<void>;
  onDelete: (instance: AWSLightsailInstance) => MaybePromise<void>;
  onBatchDelete: (instances: AWSLightsailInstance[]) => MaybePromise<boolean>;
};

export function AWSLightsailInstancesTable({
  t,
  instances,
  panelLoading,
  error,
  lightsailError,
  hasCredential,
  activeContextReady,
  resourcesLoaded,
  passwordStorageEnabled,
  passwordLoading,
  onLoadResources,
  onLoadDetail,
  onViewPassword,
  onPowerAction,
  onReboot,
  onReplaceIP,
  onRunScript,
  onShare,
  onDelete,
  onBatchDelete,
}: AWSLightsailInstancesTableProps) {
  const instancePagination = useClientPagination(instances, {
    initialPageSize: 10,
  });
  const visibleInstances = instancePagination.pageItems;
  const getSelectionKey = React.useCallback((instance: AWSLightsailInstance) => instance.name, []);
  const bulkSelection = useCloudBulkSelection(instances, getSelectionKey);
  const handleBatchDelete = async () => {
    const completed = await onBatchDelete(bulkSelection.selectedItems);
    if (completed) {
      bulkSelection.clearSelection();
    }
  };
  const emptyTitle = panelLoading
    ? t("cloud.loading", "正在加载云资源...")
    : lightsailError || error
      ? t("cloud.load_failed", "无法加载云资源，请先处理上方提示后重试。")
      : !hasCredential
        ? t("cloud.providers.aws.no_active_credential", "请先选择一个激活的 AWS 凭证")
        : !activeContextReady
          ? t("cloud.providers.aws.select_region_to_load", "请先选择区域，再加载该 AWS 账户的资源。")
          : !resourcesLoaded
            ? t("cloud.load_resources_prompt", "点击查看，按需加载云资源。")
            : t("cloud.providers.aws.lightsail_empty", "当前区域没有 Lightsail 实例");
  const emptyDescription = panelLoading
    ? t("cloud.loading_description", "云厂商 API 可达时，通常几秒内即可完成加载。")
    : lightsailError || error
      ? t("cloud.load_failed_description", "修复上方警告后，可以刷新页面或重新加载资源。")
      : !hasCredential
        ? t("cloud.providers.aws.no_active_credential_description", "导入凭证并选择当前 AWS 账户后，才能加载计算资源。")
        : !activeContextReady
          ? t("cloud.providers.aws.select_region_to_load_description", "在凭证管理区选择区域；EC2 和 Lightsail 资源都会按区域筛选。")
          : !resourcesLoaded
            ? t("cloud.load_resources_description", "云资源按需加载，可以避免多账户场景下页面一打开就发起大量请求。")
            : t("cloud.providers.aws.lightsail_empty_description", "可以新建 Lightsail 实例，或切换到已有资源的账户和区域。");
  const emptyActions =
    activeContextReady && !resourcesLoaded ? (
      <Button
        variant="outline"
        size="1"
        onClick={() => {
          void onLoadResources();
        }}
        disabled={panelLoading}
      >
        <Eye className="mr-2 h-4 w-4" />
        {t("cloud.view", "查看")}
      </Button>
    ) : null;

  return (
    <>
    {bulkSelection.selectedCount > 0 ? (
      <div className="border-b border-border bg-muted/20 px-4 py-2">
        <CloudBulkDeleteToolbar
          t={t}
          selectedCount={bulkSelection.selectedCount}
          totalCount={instances.length}
          hideWhenEmpty
          onClear={bulkSelection.clearSelection}
          onDelete={() => {
            void handleBatchDelete();
          }}
        />
      </div>
    ) : null}
    <AdminDataTableScroll>
    <AdminDataTable minWidth={1160}>
      <thead>
        <AdminDataTableHeadRow>
          <AdminDataTableHead className="w-10">
            <CloudBulkSelectCheckbox
              label={t("cloud.bulk.select_all", "选择全部实例")}
              checked={bulkSelection.allSelected ? true : bulkSelection.someSelected ? "indeterminate" : false}
              disabled={instances.length === 0 || panelLoading}
              onCheckedChange={bulkSelection.toggleAll}
            />
          </AdminDataTableHead>
          <AdminDataTableHead>{t("cloud.table.name", "名称")}</AdminDataTableHead>
          <AdminDataTableHead>{t("cloud.table.status", "状态")}</AdminDataTableHead>
          <AdminDataTableHead>{t("cloud.providers.aws.az", "可用区")}</AdminDataTableHead>
          <AdminDataTableHead>{t("cloud.table.ip", "公网 IP")}</AdminDataTableHead>
          <AdminDataTableHead>{t("cloud.table.size", "规格")}</AdminDataTableHead>
          <AdminDataTableHead>{t("cloud.table.image", "镜像")}</AdminDataTableHead>
          <AdminDataTableHead>{t("cloud.providers.aws.static_ip", "静态 IP")}</AdminDataTableHead>
          <AdminDataTableHead>{t("cloud.table.password", "Root Password")}</AdminDataTableHead>
          <AdminDataTableHead>{t("cloud.table.created_at", "创建时间")}</AdminDataTableHead>
          <AdminDataTableHead align="right" sticky="right">
            {t("common.action", "操作")}
          </AdminDataTableHead>
        </AdminDataTableHeadRow>
      </thead>
      <tbody>
        {panelLoading ? (
          <CloudTableSkeletonRows columns={11} />
        ) : instances.length === 0 ? (
          <AdminDataTableEmptyRow colSpan={11} className="p-5">
              <AdminEmptyState
                icon={<Server className="h-5 w-5" />}
                title={emptyTitle}
                description={emptyDescription}
                actions={emptyActions}
                className={cloudTableEmptyStateClassName}
              />
          </AdminDataTableEmptyRow>
        ) : (
          visibleInstances.map((instance) => (
            <AdminDataTableRow key={instance.name} selected={bulkSelection.isSelected(instance)}>
              <AdminDataTableCell className="w-10">
                <CloudBulkSelectCheckbox
                  label={t("cloud.bulk.select_instance", {
                    name: instance.name,
                    defaultValue: `选择 ${instance.name}`,
                  })}
                  checked={bulkSelection.isSelected(instance)}
                  onCheckedChange={(checked) => bulkSelection.toggleItem(instance, checked)}
                />
              </AdminDataTableCell>
              <AdminDataTableCell className={cloudTablePrimaryTextClassName}>
                <button
                  type="button"
                  className={cloudTableNameButtonClassName}
                  onClick={() => {
                    void onLoadDetail(instance);
                  }}
                >
                  {instance.name}
                </button>
              </AdminDataTableCell>
              <AdminDataTableCell>
                <Badge color={getInstanceStateColor(instance.state)}>
                  {getCloudStatusLabel(instance.state, t)}
                </Badge>
              </AdminDataTableCell>
              <AdminDataTableCell>{instance.availability_zone || "-"}</AdminDataTableCell>
              <AdminDataTableCell>{instance.public_ip || instance.private_ip || "-"}</AdminDataTableCell>
              <AdminDataTableCell>{getLightsailBundleDisplay(instance.bundle_id)}</AdminDataTableCell>
              <AdminDataTableCell>{instance.blueprint_name || instance.blueprint_id || "-"}</AdminDataTableCell>
              <AdminDataTableCell>{instance.is_static_ip ? t("common.yes", "是") : "-"}</AdminDataTableCell>
              <AdminDataTableCell>
                <AWSInstancePasswordState
                  t={t}
                  saved={instance.saved_root_password}
                  updatedAt={instance.saved_root_password_updated_at}
                  passwordStorageEnabled={passwordStorageEnabled}
                />
              </AdminDataTableCell>
              <AdminDataTableCell>{formatDateTime(instance.created_at)}</AdminDataTableCell>
              <AdminDataTableCell align="right" sticky="right">
                <AWSInstanceRowActions
                  t={t}
                  state={instance.state}
                  savedRootPassword={instance.saved_root_password}
                  passwordStorageEnabled={passwordStorageEnabled}
                  passwordLoading={passwordLoading}
                  onViewPassword={() => onViewPassword(instance)}
                  onPowerAction={(action) => onPowerAction(instance, action)}
                  onReboot={() => onReboot(instance)}
                  onReplaceIP={() => onReplaceIP(instance)}
                  onRunScript={() => onRunScript(instance)}
                  onShare={() => onShare(instance)}
                  onDelete={() => onDelete(instance)}
                />
              </AdminDataTableCell>
            </AdminDataTableRow>
          ))
        )}
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
      itemLabel={t("admin.pagination.instances", { defaultValue: "实例" })}
      compact
    />
    </>
  );
}

type AWSInstancePasswordStateProps = {
  t: TFunction;
  saved: boolean;
  updatedAt: string;
  passwordStorageEnabled: boolean;
};

function AWSInstancePasswordState({
  t,
  saved,
  updatedAt,
  passwordStorageEnabled,
}: AWSInstancePasswordStateProps) {
  if (!saved) {
    return (
      <span className={cloudTableMutedTextClassName}>
        {passwordStorageEnabled
        ? t("cloud.password.not_saved", "未保存")
          : t("cloud.password.disabled_short", "密库未启用")}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <Badge color={passwordStorageEnabled ? "green" : "amber"}>
        {passwordStorageEnabled
          ? t("cloud.password.saved", "已保存")
          : t("cloud.password.locked", "已锁定")}
      </Badge>
      {updatedAt ? (
        <div className={cloudTableSecondaryTextClassName}>
          {formatDateTime(updatedAt)}
        </div>
      ) : null}
    </div>
  );
}

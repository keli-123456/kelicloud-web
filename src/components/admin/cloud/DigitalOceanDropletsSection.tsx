import { useCallback, type ComponentProps } from "react";
import type { TFunction } from "i18next";
import {
  KeyRound,
  Power,
  PowerOff,
  RotateCcw,
  Server,
  Share2,
  Terminal,
  Trash2,
} from "lucide-react";

import type { DigitalOceanDroplet } from "@/lib/cloud";
import { getCloudStatusLabel } from "@/lib/cloudStatus";
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
import {
  Badge,
  cloudPanelCardClassName,
  cloudPanelDescriptionClassName,
  cloudPanelHeaderClassName,
  cloudPanelTitleClassName,
  cloudTableEmptyStateClassName,
  cloudTableMutedTextClassName,
  cloudTableNameButtonClassName,
  cloudTablePrimaryTextClassName,
  cloudTableSecondaryTextClassName,
} from "@/components/admin/cloud/cloud-ui";

type MaybePromise<T> = T | Promise<T>;
type BadgeColor = ComponentProps<typeof Badge>["color"];

type DigitalOceanDropletsSectionProps = {
  t: TFunction;
  droplets: DigitalOceanDroplet[];
  panelLoading: boolean;
  error: string;
  hasActiveToken: boolean;
  resourcesLoaded: boolean;
  passwordStorageEnabled: boolean;
  dropletPasswordLoading: boolean;
  getDropletStatusColor: (status: string) => BadgeColor;
  getRegionOptionLabel: (region: DigitalOceanDroplet["region"], t: TFunction) => string;
  getDropletPrimaryIp: (droplet: DigitalOceanDroplet) => string;
  getImageLabel: (image: DigitalOceanDroplet["image"]) => string;
  formatMonthlyPrice: (droplet: DigitalOceanDroplet) => string;
  formatDateTime: (value: string) => string;
  onOpenDetail: (droplet: DigitalOceanDroplet) => void;
  onViewPassword: (droplet: DigitalOceanDroplet) => MaybePromise<void>;
  onDropletAction: (dropletId: number, type: string) => MaybePromise<void>;
  onOpenScriptDialog: (droplet: DigitalOceanDroplet) => void;
  onOpenShareDialog: (droplet: DigitalOceanDroplet) => MaybePromise<void>;
  onDeleteDroplet: (droplet: DigitalOceanDroplet) => MaybePromise<void>;
  onBatchDeleteDroplets: (droplets: DigitalOceanDroplet[]) => MaybePromise<boolean>;
};

export function DigitalOceanDropletsSection({
  t,
  droplets,
  panelLoading,
  error,
  hasActiveToken,
  resourcesLoaded,
  passwordStorageEnabled,
  dropletPasswordLoading,
  getDropletStatusColor,
  getRegionOptionLabel,
  getDropletPrimaryIp,
  getImageLabel,
  formatMonthlyPrice,
  formatDateTime,
  onOpenDetail,
  onViewPassword,
  onDropletAction,
  onOpenScriptDialog,
  onOpenShareDialog,
  onDeleteDroplet,
  onBatchDeleteDroplets,
}: DigitalOceanDropletsSectionProps) {
  const dropletPagination = useClientPagination(droplets, {
    initialPageSize: 10,
  });
  const paginatedDroplets = dropletPagination.pageItems;
  const getSelectionKey = useCallback((droplet: DigitalOceanDroplet) => String(droplet.id), []);
  const bulkSelection = useCloudBulkSelection(droplets, getSelectionKey);
  const handleBatchDelete = async () => {
    const completed = await onBatchDeleteDroplets(bulkSelection.selectedItems);
    if (completed) {
      bulkSelection.clearSelection();
    }
  };
  const hasDroplets = droplets.length > 0;
  const emptyTitle = panelLoading
    ? t("cloud.loading", "正在加载云资源...")
    : error
      ? t("cloud.load_failed", "无法加载云资源，请检查上方提示后重试。")
      : !hasActiveToken
        ? t("cloud.no_active_token", "请选择一个激活令牌后再加载 DigitalOcean 资源")
        : !resourcesLoaded
          ? t("cloud.load_resources_prompt", "点击查看，按需加载云资源。")
          : t("cloud.empty", "没有找到 Droplet");
  const emptyDescription = !hasActiveToken
    ? t(
      "cloud.no_active_token_description",
      "请先在下方令牌池选择或导入令牌，然后再加载云资源。",
    )
    : !resourcesLoaded
      ? t(
        "cloud.load_resources_prompt_description",
        "资源采用按需加载，切换账户时状态会更清楚，也不会自动发起多余请求。",
      )
      : error
        ? t("cloud.load_failed_description", "请先处理上方警告，再刷新或再次加载资源。")
        : t(
          "cloud.empty_description",
          "当前账户还没有 Droplet。需要开机器时，可以点击创建 Droplet。",
        );

  const visibleEmptyDescription = panelLoading
    ? t("cloud.loading_description", "Provider APIs usually respond within a few seconds.")
    : error
      ? t("cloud.load_failed_description", "Resolve the warning above, then refresh or load resources again.")
      : emptyDescription;

  return (
    <div className={`order-2 ${cloudPanelCardClassName}`}>
      <div className={cloudPanelHeaderClassName}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className={cloudPanelTitleClassName}>
              {t("cloud.droplet_list", "实例列表")}
            </div>
            <div className={cloudPanelDescriptionClassName}>
              {t(
                "cloud.droplet_list_description",
                "Click a Droplet name to view details, and use the current active token to perform lifecycle actions.",
              )}
            </div>
          </div>
          <CloudBulkDeleteToolbar
            t={t}
            selectedCount={bulkSelection.selectedCount}
            totalCount={droplets.length}
            hideWhenEmpty={!hasDroplets}
            onClear={bulkSelection.clearSelection}
            onDelete={() => {
              void handleBatchDelete();
            }}
          />
        </div>
      </div>

      {hasDroplets ? (
        <>
          <AdminDataTableScroll>
            <AdminDataTable minWidth={1120}>
          <thead>
            <AdminDataTableHeadRow>
              <AdminDataTableHead className="w-10">
                <CloudBulkSelectCheckbox
                  label={t("cloud.bulk.select_all", "选择全部实例")}
                  checked={bulkSelection.allSelected ? true : bulkSelection.someSelected ? "indeterminate" : false}
                  disabled={droplets.length === 0 || panelLoading}
                  onCheckedChange={bulkSelection.toggleAll}
                />
              </AdminDataTableHead>
              <AdminDataTableHead>{t("cloud.table.name", "名称")}</AdminDataTableHead>
              <AdminDataTableHead>{t("cloud.table.status", "状态")}</AdminDataTableHead>
              <AdminDataTableHead>{t("cloud.table.region", "地区")}</AdminDataTableHead>
              <AdminDataTableHead>{t("cloud.table.ip", "公网 IP")}</AdminDataTableHead>
              <AdminDataTableHead>{t("cloud.table.size", "规格")}</AdminDataTableHead>
              <AdminDataTableHead>{t("cloud.table.image", "镜像")}</AdminDataTableHead>
              <AdminDataTableHead>{t("cloud.table.price", "月费")}</AdminDataTableHead>
              <AdminDataTableHead>{t("cloud.table.password", "登录密码")}</AdminDataTableHead>
              <AdminDataTableHead>{t("cloud.table.created_at", "创建时间")}</AdminDataTableHead>
              <AdminDataTableHead sticky="right" align="right" className="w-[72px]">
                {t("common.action", "操作")}
              </AdminDataTableHead>
            </AdminDataTableHeadRow>
          </thead>
          <tbody>
            {paginatedDroplets.map((droplet) => (
                <AdminDataTableRow key={droplet.id} selected={bulkSelection.isSelected(droplet)}>
                  <AdminDataTableCell className="w-10">
                    <CloudBulkSelectCheckbox
                      label={t("cloud.bulk.select_instance", {
                        name: droplet.name,
                        defaultValue: `选择 ${droplet.name}`,
                      })}
                      checked={bulkSelection.isSelected(droplet)}
                      onCheckedChange={(checked) => bulkSelection.toggleItem(droplet, checked)}
                    />
                  </AdminDataTableCell>
                  <AdminDataTableCell className={cloudTablePrimaryTextClassName}>
                    <button
                      type="button"
                      className={cloudTableNameButtonClassName}
                      onClick={() => onOpenDetail(droplet)}
                    >
                      {droplet.name}
                    </button>
                  </AdminDataTableCell>
                <AdminDataTableCell>
                  <Badge color={getDropletStatusColor(droplet.status)}>
                    {getCloudStatusLabel(droplet.status, t)}
                  </Badge>
                </AdminDataTableCell>
                <AdminDataTableCell>{getRegionOptionLabel(droplet.region, t)}</AdminDataTableCell>
                <AdminDataTableCell>{getDropletPrimaryIp(droplet)}</AdminDataTableCell>
                <AdminDataTableCell>{droplet.size_slug || droplet.size?.slug || "-"}</AdminDataTableCell>
                <AdminDataTableCell>{getImageLabel(droplet.image)}</AdminDataTableCell>
                <AdminDataTableCell>{formatMonthlyPrice(droplet)}</AdminDataTableCell>
                <AdminDataTableCell>
                  {droplet.saved_root_password ? (
                    <div className="space-y-1">
                      <Badge color={passwordStorageEnabled ? "green" : "amber"}>
                        {passwordStorageEnabled
                          ? t("cloud.password.saved", "已保存")
                          : t("cloud.password.locked", "已锁定")}
                      </Badge>
                      {droplet.saved_root_password_updated_at ? (
                        <div className={cloudTableSecondaryTextClassName}>
                          {formatDateTime(droplet.saved_root_password_updated_at)}
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
                <AdminDataTableCell>{formatDateTime(droplet.created_at)}</AdminDataTableCell>
                <AdminDataTableCell sticky="right" align="right">
                  <AdminRowActions
                    actions={[
                      {
                        label: t("cloud.password.view", "查看密码"),
                        icon: <KeyRound className="h-4 w-4" />,
                        disabled: !droplet.saved_root_password || !passwordStorageEnabled || dropletPasswordLoading,
                        onSelect: () => {
                          void onViewPassword(droplet);
                        },
                      },
                      droplet.status === "active"
                        ? {
                          label: t("cloud.power_off", "关机"),
                          icon: <PowerOff className="h-4 w-4" />,
                          onSelect: () => {
                            void onDropletAction(droplet.id, "power_off");
                          },
                        }
                        : {
                          label: t("cloud.power_on", "开机"),
                          icon: <Power className="h-4 w-4" />,
                          onSelect: () => {
                            void onDropletAction(droplet.id, "power_on");
                          },
                        },
                      {
                        label: t("cloud.reboot", "重启"),
                        icon: <RotateCcw className="h-4 w-4" />,
                        onSelect: () => {
                          void onDropletAction(droplet.id, "reboot");
                        },
                      },
                      {
                        label: t("cloud.script.action", "执行脚本"),
                        icon: <Terminal className="h-4 w-4" />,
                        onSelect: () => onOpenScriptDialog(droplet),
                      },
                      {
                        label: t("cloud.share.action", "分享"),
                        icon: <Share2 className="h-4 w-4" />,
                        onSelect: () => {
                          void onOpenShareDialog(droplet);
                        },
                      },
                      {
                        label: t("cloud.delete", "删除"),
                        icon: <Trash2 className="h-4 w-4" />,
                        destructive: true,
                        onSelect: () => {
                          void onDeleteDroplet(droplet);
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
            page={dropletPagination.page}
            totalPages={dropletPagination.totalPages}
            total={dropletPagination.total}
            pageSize={dropletPagination.pageSize}
            visibleStart={dropletPagination.visibleStart}
            visibleEnd={dropletPagination.visibleEnd}
            onPageChange={dropletPagination.setPage}
            onPageSizeChange={dropletPagination.setPageSize}
            pageSizeOptions={[10, 20, 50]}
            itemLabel={t("admin.pagination.instances", { defaultValue: "instances" })}
            compact
          />
        </>
      ) : (
        <div className="p-3">
          <AdminEmptyState
            icon={<Server className="h-5 w-5" />}
            title={emptyTitle}
            description={visibleEmptyDescription}
            className={cloudTableEmptyStateClassName}
          />
        </div>
      )}
    </div>
  );
}

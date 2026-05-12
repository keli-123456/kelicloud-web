import { useMemo, useState, type ComponentProps } from "react";
import type { TFunction } from "i18next";
import {
  KeyRound,
  Power,
  PowerOff,
  RotateCcw,
  Search,
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
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import {
  Badge,
  CloudTableSkeletonRows,
  Select,
  TextField,
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
}: DigitalOceanDropletsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("__all__");
  const statusOptions = useMemo(
    () => Array.from(new Set(droplets.map((droplet) => droplet.status).filter(Boolean))),
    [droplets],
  );
  const visibleDroplets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return droplets.filter((droplet) => {
      const statusMatched = statusFilter === "__all__" || droplet.status === statusFilter;
      if (!statusMatched) return false;
      if (!query) return true;
      return [
        droplet.name,
        String(droplet.id),
        droplet.status,
        getDropletPrimaryIp(droplet),
        droplet.size_slug || droplet.size?.slug || "",
        getImageLabel(droplet.image),
        getRegionOptionLabel(droplet.region, t),
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [
    droplets,
    getDropletPrimaryIp,
    getImageLabel,
    getRegionOptionLabel,
    searchQuery,
    statusFilter,
    t,
  ]);
  const dropletPagination = useClientPagination(visibleDroplets, {
    initialPageSize: 10,
    resetKey: `${searchQuery.trim().toLowerCase()}:${statusFilter}`,
  });
  const paginatedDroplets = dropletPagination.pageItems;

  return (
    <div className={`order-2 ${cloudPanelCardClassName}`}>
      <div className={cloudPanelHeaderClassName}>
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
      </div>

      <div className="flex min-w-0 flex-col gap-3 border-b border-border bg-muted/20 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1 md:max-w-sm">
          <TextField.Root
            size="1"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("cloud.search_resources", "搜索名称 / IP / 地区...")}
          >
            <TextField.Slot>
              <Search className="h-4 w-4" />
            </TextField.Slot>
          </TextField.Root>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="w-40">
            <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
              <Select.Trigger placeholder={t("cloud.table.status", "状态")} />
              <Select.Content>
                <Select.Item value="__all__">{t("cloud.all_statuses", "全部状态")}</Select.Item>
                {statusOptions.map((status) => (
                  <Select.Item key={status} value={status}>
                    {getCloudStatusLabel(status, t)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>
          <Badge color="blue">{visibleDroplets.length}</Badge>
        </div>
      </div>

      <AdminDataTableScroll>
        <AdminDataTable minWidth={1120}>
          <thead>
            <AdminDataTableHeadRow>
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
            {panelLoading ? (
              <CloudTableSkeletonRows columns={10} />
            ) : droplets.length === 0 ? (
              <AdminDataTableEmptyRow colSpan={10} className="p-4">
                <AdminEmptyState
                  icon={<Server className="h-5 w-5" />}
                  title={
                    panelLoading
                      ? t("cloud.loading", "正在加载云资源...")
                      : error
                        ? t("cloud.load_failed", "无法加载云资源，请检查上方提示后重试。")
                        : !hasActiveToken
                          ? t("cloud.no_active_token", "请选择一个激活令牌后再加载 DigitalOcean 资源")
                          : !resourcesLoaded
                            ? t("cloud.load_resources_prompt", "点击查看，按需加载云资源。")
                            : t("cloud.empty", "没有找到 Droplet")
                  }
                  description={
                    !hasActiveToken
                      ? t(
                        "cloud.no_active_token_description",
                        "请先在下方令牌池选择或导入令牌，然后再加载云资源。",
                      )
                      : !resourcesLoaded
                        ? t(
                          "cloud.load_resources_prompt_description",
                          "资源采用按需加载，切换账户时状态会更清楚，也不会自动发起多余请求。",
                        )
                        : t(
                          "cloud.empty_description",
                          "当前账户还没有 Droplet。需要开机器时，可以点击创建 Droplet。",
                        )
                  }
                  className={cloudTableEmptyStateClassName}
                />
              </AdminDataTableEmptyRow>
            ) : (
              visibleDroplets.length === 0 ? (
                <AdminDataTableEmptyRow colSpan={10} className="p-4">
                  <AdminEmptyState
                    icon={<Search className="h-5 w-5" />}
                    title={t("cloud.no_matching_resources", "没有匹配的资源")}
                    description={t("cloud.no_matching_resources_description", "调整搜索关键词或状态筛选后再看。")}
                    className={cloudTableEmptyStateClassName}
                  />
                </AdminDataTableEmptyRow>
              ) : paginatedDroplets.map((droplet) => (
                <AdminDataTableRow key={droplet.id}>
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
            ))
            )}
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
    </div>
  );
}

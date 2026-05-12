import { useMemo, useState } from "react";
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

import {
  AdminDataTable,
  AdminDataTableCell,
  AdminDataTableEmptyRow,
  AdminDataTableHead,
  AdminDataTableHeadRow,
  AdminDataTableRow,
  AdminDataTableScroll,
} from "@/components/admin/AdminDataTable";
import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import {
  AdminPagination,
  useClientPagination,
} from "@/components/admin/AdminPagination";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import type { LinodeInstance, LinodeTokenPool } from "@/lib/cloudLinode";
import { getCloudStatusLabel } from "@/lib/cloudStatus";
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
import {
  formatDateTime,
  getStatusColor,
  hasActiveToken,
} from "./linodePanelUtils";

type MaybePromise<T> = T | Promise<T>;

type LinodeTypePrice = {
  price: {
    monthly: number;
  };
};

type LinodeInstancesSectionProps = {
  t: TFunction;
  instances: LinodeInstance[];
  panelLoading: boolean;
  error: string;
  tokenPool: LinodeTokenPool | null;
  resourcesLoaded: boolean;
  typePriceMap: Map<string, LinodeTypePrice>;
  passwordStorageEnabled: boolean;
  passwordLoading: boolean;
  onLoadInstanceDetail: (instance: LinodeInstance) => MaybePromise<void>;
  onViewPassword: (instance: LinodeInstance) => MaybePromise<void>;
  onInstanceAction: (instance: LinodeInstance, type: string) => MaybePromise<void>;
  onOpenScriptDialog: (instance: LinodeInstance) => void;
  onOpenShareDialog: (instance: LinodeInstance) => MaybePromise<void>;
  onDeleteInstance: (instance: LinodeInstance) => MaybePromise<void>;
};

export function LinodeInstancesSection({
  t,
  instances,
  panelLoading,
  error,
  tokenPool,
  resourcesLoaded,
  typePriceMap,
  passwordStorageEnabled,
  passwordLoading,
  onLoadInstanceDetail,
  onViewPassword,
  onInstanceAction,
  onOpenScriptDialog,
  onOpenShareDialog,
  onDeleteInstance,
}: LinodeInstancesSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("__all__");
  const statusOptions = useMemo(
    () => Array.from(new Set(instances.map((instance) => instance.status).filter(Boolean))),
    [instances],
  );
  const visibleInstances = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return instances.filter((instance) => {
      const statusMatched = statusFilter === "__all__" || instance.status === statusFilter;
      if (!statusMatched) return false;
      if (!query) return true;
      return [
        instance.label,
        String(instance.id),
        instance.status,
        instance.region,
        instance.type,
        instance.image,
        instance.ipv4[0] || "",
        instance.ipv6 || "",
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [instances, searchQuery, statusFilter]);
  const instancePagination = useClientPagination(visibleInstances, {
    initialPageSize: 10,
    resetKey: `${searchQuery.trim().toLowerCase()}:${statusFilter}`,
  });
  const paginatedInstances = instancePagination.pageItems;
  const emptyTitle = panelLoading
    ? t("cloud.loading", "正在加载云资源...")
    : error
      ? t("cloud.load_failed", "无法加载云资源，请先处理上方提示后再试。")
      : !hasActiveToken(tokenPool)
        ? t("cloud.providers.linode.no_active_token", "请先选择已激活的 Linode 令牌")
        : !resourcesLoaded
          ? t("cloud.load_resources_prompt", "点击查看按需加载资源。")
          : t("cloud.providers.linode.instance_empty", "未找到 Linode 实例");
  const emptyDescription = panelLoading
    ? t("cloud.loading_description", "供应商 API 可达时通常需要几秒。")
    : error
      ? t("cloud.load_failed_description", "请先处理上方警告，再刷新或再次加载资源。")
      : !hasActiveToken(tokenPool)
        ? t("cloud.providers.linode.no_active_token_description", "管理 Linode 实例前请先导入令牌并设置为当前。")
        : !resourcesLoaded
          ? t("cloud.load_resources_description", "云资源按需加载，可避免多账号场景下页面卡顿。")
          : t("cloud.providers.linode.instance_empty_description", "创建 Linode 实例，或切换到已有资源的令牌。");

  return (
    <div className={`order-2 ${cloudPanelCardClassName}`}>
      <div className={cloudPanelHeaderClassName}>
        <div>
          <div className={cloudPanelTitleClassName}>
            {t("cloud.providers.linode.instance_list", "实例列表")}
          </div>
          <div className={cloudPanelDescriptionClassName}>
            {t(
              "cloud.providers.linode.instance_list_description",
              "Click an instance label to inspect details and use the current token to manage its power state.",
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
          <Badge color="blue">{visibleInstances.length}</Badge>
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
            <AdminDataTableHead align="right" sticky="right">
              {t("common.action", "操作")}
            </AdminDataTableHead>
          </AdminDataTableHeadRow>
        </thead>
        <tbody>
          {panelLoading ? (
            <CloudTableSkeletonRows columns={10} />
          ) : instances.length === 0 ? (
            <AdminDataTableEmptyRow colSpan={10} className="p-4">
                <AdminEmptyState
                  icon={<Server className="h-5 w-5" />}
                  title={emptyTitle}
                  description={emptyDescription}
                  className={cloudTableEmptyStateClassName}
                />
            </AdminDataTableEmptyRow>
          ) : visibleInstances.length === 0 ? (
            <AdminDataTableEmptyRow colSpan={10} className="p-4">
                <AdminEmptyState
                  icon={<Search className="h-5 w-5" />}
                  title={t("cloud.no_matching_resources", "没有匹配的资源")}
                  description={t("cloud.no_matching_resources_description", "调整搜索关键词或状态筛选后再看。")}
                  className={cloudTableEmptyStateClassName}
                />
            </AdminDataTableEmptyRow>
          ) : (
            paginatedInstances.map((instance) => {
              const typeInfo = typePriceMap.get(instance.type);
              return (
                <AdminDataTableRow key={instance.id}>
                  <AdminDataTableCell className={cloudTablePrimaryTextClassName}>
                    <button
                      type="button"
                      className={cloudTableNameButtonClassName}
                      onClick={() => {
                        void onLoadInstanceDetail(instance);
                      }}
                    >
                      {instance.label}
                    </button>
                  </AdminDataTableCell>
                  <AdminDataTableCell>
                    <Badge color={getStatusColor(instance.status)}>
                      {getCloudStatusLabel(instance.status, t)}
                    </Badge>
                  </AdminDataTableCell>
                  <AdminDataTableCell>{instance.region || "-"}</AdminDataTableCell>
                  <AdminDataTableCell>{instance.ipv4[0] || instance.ipv6 || "-"}</AdminDataTableCell>
                  <AdminDataTableCell>{instance.type || "-"}</AdminDataTableCell>
                  <AdminDataTableCell>{instance.image || "-"}</AdminDataTableCell>
                  <AdminDataTableCell>
                    {typeInfo ? `$${typeInfo.price.monthly.toFixed(2)}` : "-"}
                  </AdminDataTableCell>
                  <AdminDataTableCell>
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
                  <AdminDataTableCell>{formatDateTime(instance.created)}</AdminDataTableCell>
                  <AdminDataTableCell align="right" sticky="right">
                    <AdminRowActions
                      contentClassName="min-w-44"
                      actions={[
                        {
                          label: t("cloud.password.view", "查看密码"),
                          icon: <KeyRound className="h-4 w-4" />,
                          disabled: !instance.saved_root_password || !passwordStorageEnabled || passwordLoading,
                          onSelect: () => {
                            void onViewPassword(instance);
                          },
                        },
                        instance.status === "running"
                          ? {
                              label: t("cloud.power_off", "关机"),
                              icon: <PowerOff className="h-4 w-4" />,
                              onSelect: () => {
                                void onInstanceAction(instance, "shutdown");
                              },
                            }
                          : {
                              label: t("cloud.power_on", "开机"),
                              icon: <Power className="h-4 w-4" />,
                              onSelect: () => {
                                void onInstanceAction(instance, "boot");
                              },
                            },
                        {
                          label: t("cloud.reboot", "重启"),
                          icon: <RotateCcw className="h-4 w-4" />,
                          onSelect: () => {
                            void onInstanceAction(instance, "reboot");
                          },
                        },
                        {
                          label: t("cloud.script.action", "执行脚本"),
                          icon: <Terminal className="h-4 w-4" />,
                          onSelect: () => onOpenScriptDialog(instance),
                        },
                        {
                          label: t("cloud.share.action", "分享"),
                          icon: <Share2 className="h-4 w-4" />,
                          onSelect: () => {
                            void onOpenShareDialog(instance);
                          },
                        },
                        {
                          label: t("cloud.delete", "删除"),
                          icon: <Trash2 className="h-4 w-4" />,
                          destructive: true,
                          onSelect: () => {
                            void onDeleteInstance(instance);
                          },
                        },
                      ]}
                    />
                  </AdminDataTableCell>
                </AdminDataTableRow>
              );
            })
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
        itemLabel={t("admin.pagination.instances", { defaultValue: "instances" })}
        compact
      />
    </div>
  );
}

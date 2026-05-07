import { useMemo, useState, type ComponentProps } from "react";
import type { TFunction } from "i18next";
import {
  KeyRound,
  MoreHorizontal,
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
  AdminPagination,
  useClientPagination,
} from "@/components/admin/AdminPagination";
import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import {
  Badge,
  Button,
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
  cloudTableScrollClassName,
  cloudTableSecondaryTextClassName,
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
            {t("cloud.droplet_list", "Droplet List")}
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
            placeholder={t("cloud.search_resources", "Search name / IP / region...")}
          >
            <TextField.Slot>
              <Search className="h-4 w-4" />
            </TextField.Slot>
          </TextField.Root>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="w-40">
            <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
              <Select.Trigger placeholder={t("cloud.table.status", "Status")} />
              <Select.Content>
                <Select.Item value="__all__">{t("cloud.all_statuses", "All statuses")}</Select.Item>
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

      <div className={cloudTableScrollClassName}>
        <Table className="min-w-[1120px]">
          <TableHeader>
            <TableRow>
              <TableHead>{t("cloud.table.name", "Name")}</TableHead>
              <TableHead>{t("cloud.table.status", "Status")}</TableHead>
              <TableHead>{t("cloud.table.region", "Region")}</TableHead>
              <TableHead>{t("cloud.table.ip", "Public IP")}</TableHead>
              <TableHead>{t("cloud.table.size", "Size")}</TableHead>
              <TableHead>{t("cloud.table.image", "Image")}</TableHead>
              <TableHead>{t("cloud.table.price", "Monthly")}</TableHead>
              <TableHead>{t("cloud.table.password", "Root Password")}</TableHead>
              <TableHead>{t("cloud.table.created_at", "Created")}</TableHead>
              <TableHead className="text-right">
                {t("common.action", "Action")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {panelLoading ? (
              <CloudTableSkeletonRows columns={10} />
            ) : droplets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="p-4">
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
                </TableCell>
              </TableRow>
            ) : (
              visibleDroplets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="p-4">
                    <AdminEmptyState
                      icon={<Search className="h-5 w-5" />}
                      title={t("cloud.no_matching_resources", "没有匹配的资源")}
                      description={t("cloud.no_matching_resources_description", "调整搜索关键词或状态筛选后再看。")}
                      className={cloudTableEmptyStateClassName}
                    />
                  </TableCell>
                </TableRow>
              ) : paginatedDroplets.map((droplet) => (
                <TableRow key={droplet.id}>
                  <TableCell className={cloudTablePrimaryTextClassName}>
                    <button
                      type="button"
                      className={cloudTableNameButtonClassName}
                      onClick={() => onOpenDetail(droplet)}
                    >
                      {droplet.name}
                    </button>
                  </TableCell>
                <TableCell>
                  <Badge color={getDropletStatusColor(droplet.status)}>
                    {getCloudStatusLabel(droplet.status, t)}
                  </Badge>
                </TableCell>
                <TableCell>{getRegionOptionLabel(droplet.region, t)}</TableCell>
                <TableCell>{getDropletPrimaryIp(droplet)}</TableCell>
                <TableCell>{droplet.size_slug || droplet.size?.slug || "-"}</TableCell>
                <TableCell>{getImageLabel(droplet.image)}</TableCell>
                <TableCell>{formatMonthlyPrice(droplet)}</TableCell>
                <TableCell>
                  {droplet.saved_root_password ? (
                    <div className="space-y-1">
                      <Badge color={passwordStorageEnabled ? "green" : "amber"}>
                        {passwordStorageEnabled
                          ? t("cloud.password.saved", "Saved")
                          : t("cloud.password.locked", "Locked")}
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
                        ? t("cloud.password.not_saved", "Not saved")
                        : t("cloud.password.disabled_short", "Vault off")}
                    </span>
                  )}
                </TableCell>
                <TableCell>{formatDateTime(droplet.created_at)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="soft"
                      size="1"
                      disabled={!droplet.saved_root_password || !passwordStorageEnabled || dropletPasswordLoading}
                      onClick={() => {
                        void onViewPassword(droplet);
                      }}
                    >
                      <KeyRound className="mr-1 h-3.5 w-3.5" />
                      {t("cloud.password.view", "View Password")}
                    </Button>
                    {droplet.status === "active" ? (
                      <Button
                        variant="soft"
                        size="1"
                        color="amber"
                        onClick={() => {
                          void onDropletAction(droplet.id, "power_off");
                        }}
                      >
                        <PowerOff className="mr-1 h-3.5 w-3.5" />
                        {t("cloud.power_off", "Power Off")}
                      </Button>
                    ) : (
                      <Button
                        variant="soft"
                        size="1"
                        color="green"
                        onClick={() => {
                          void onDropletAction(droplet.id, "power_on");
                        }}
                      >
                        <Power className="mr-1 h-3.5 w-3.5" />
                        {t("cloud.power_on", "Power On")}
                      </Button>
                    )}
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
                        <DropdownMenuItem
                          onSelect={() => {
                            void onDropletAction(droplet.id, "reboot");
                          }}
                        >
                          <RotateCcw className="h-4 w-4" />
                          {t("cloud.reboot", "Reboot")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onOpenScriptDialog(droplet)}>
                          <Terminal className="h-4 w-4" />
                          {t("cloud.script.action", "Run Script")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            void onOpenShareDialog(droplet);
                          }}
                        >
                          <Share2 className="h-4 w-4" />
                          {t("cloud.share.action", "Share")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => {
                            void onDeleteDroplet(droplet);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t("cloud.delete", "Delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))
            )}
          </TableBody>
        </Table>
      </div>
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

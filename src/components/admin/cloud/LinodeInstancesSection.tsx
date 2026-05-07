import { useMemo, useState } from "react";
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

import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import {
  AdminPagination,
  useClientPagination,
} from "@/components/admin/AdminPagination";
import type { LinodeInstance, LinodeTokenPool } from "@/lib/cloudLinode";
import { getCloudStatusLabel } from "@/lib/cloudStatus";
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
    ? t("cloud.loading", "Loading cloud resources...")
    : error
      ? t("cloud.load_failed", "Unable to load cloud resources. Check the warning above and try again.")
      : !hasActiveToken(tokenPool)
        ? t("cloud.providers.linode.no_active_token", "Select an active Linode token first")
        : !resourcesLoaded
          ? t("cloud.load_resources_prompt", "Click View to load cloud resources on demand.")
          : t("cloud.providers.linode.instance_empty", "No Linode instances found");
  const emptyDescription = panelLoading
    ? t("cloud.loading_description", "This usually takes a few seconds when the provider API is reachable.")
    : error
      ? t("cloud.load_failed_description", "Resolve the warning above, then refresh or load resources again.")
      : !hasActiveToken(tokenPool)
        ? t("cloud.providers.linode.no_active_token_description", "Import a token and set it as current before managing Linode instances.")
        : !resourcesLoaded
          ? t("cloud.load_resources_description", "Cloud resources are loaded on demand so the page stays responsive with multiple accounts.")
          : t("cloud.providers.linode.instance_empty_description", "Create a Linode instance or switch to a token that already owns resources.");

  return (
    <div className={`order-2 ${cloudPanelCardClassName}`}>
      <div className={cloudPanelHeaderClassName}>
        <div>
          <div className={cloudPanelTitleClassName}>
            {t("cloud.providers.linode.instance_list", "Instance List")}
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
          <Badge color="blue">{visibleInstances.length}</Badge>
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
            <TableHead className="text-right">{t("common.action", "Action")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {panelLoading ? (
            <CloudTableSkeletonRows columns={10} />
          ) : instances.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="p-4">
                <AdminEmptyState
                  icon={<Server className="h-5 w-5" />}
                  title={emptyTitle}
                  description={emptyDescription}
                  className={cloudTableEmptyStateClassName}
                />
              </TableCell>
            </TableRow>
          ) : visibleInstances.length === 0 ? (
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
          ) : (
            paginatedInstances.map((instance) => {
              const typeInfo = typePriceMap.get(instance.type);
              return (
                <TableRow key={instance.id}>
                  <TableCell className={cloudTablePrimaryTextClassName}>
                    <button
                      type="button"
                      className={cloudTableNameButtonClassName}
                      onClick={() => {
                        void onLoadInstanceDetail(instance);
                      }}
                    >
                      {instance.label}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge color={getStatusColor(instance.status)}>
                      {getCloudStatusLabel(instance.status, t)}
                    </Badge>
                  </TableCell>
                  <TableCell>{instance.region || "-"}</TableCell>
                  <TableCell>{instance.ipv4[0] || instance.ipv6 || "-"}</TableCell>
                  <TableCell>{instance.type || "-"}</TableCell>
                  <TableCell>{instance.image || "-"}</TableCell>
                  <TableCell>
                    {typeInfo ? `$${typeInfo.price.monthly.toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell>
                    {instance.saved_root_password ? (
                      <div className="space-y-1">
                        <Badge color={passwordStorageEnabled ? "green" : "amber"}>
                          {passwordStorageEnabled
                            ? t("cloud.password.saved", "Saved")
                            : t("cloud.password.locked", "Locked")}
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
                          ? t("cloud.password.not_saved", "Not saved")
                          : t("cloud.password.disabled_short", "Vault off")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{formatDateTime(instance.created)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="soft"
                        size="1"
                        disabled={!instance.saved_root_password || !passwordStorageEnabled || passwordLoading}
                        onClick={() => {
                          void onViewPassword(instance);
                        }}
                      >
                        <KeyRound className="mr-1 h-3.5 w-3.5" />
                        {t("cloud.password.view", "View Password")}
                      </Button>
                      {instance.status === "running" ? (
                        <Button
                          variant="soft"
                          size="1"
                          color="amber"
                          onClick={() => {
                            void onInstanceAction(instance, "shutdown");
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
                            void onInstanceAction(instance, "boot");
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
                              void onInstanceAction(instance, "reboot");
                            }}
                          >
                            <RotateCcw className="h-4 w-4" />
                            {t("cloud.reboot", "Reboot")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onOpenScriptDialog(instance)}>
                            <Terminal className="h-4 w-4" />
                            {t("cloud.script.action", "Run Script")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              void onOpenShareDialog(instance);
                            }}
                          >
                            <Share2 className="h-4 w-4" />
                            {t("cloud.share.action", "Share")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => {
                              void onDeleteInstance(instance);
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
              );
            })
          )}
        </TableBody>
      </Table>
      </div>
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

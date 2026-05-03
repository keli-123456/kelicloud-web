import type { TFunction } from "i18next";
import {
  KeyRound,
  MoreHorizontal,
  Power,
  PowerOff,
  RotateCcw,
  Server,
  Share2,
  Terminal,
  Trash2,
} from "lucide-react";

import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import type { LinodeInstance, LinodeTokenPool } from "@/lib/cloudLinode";
import { getCloudStatusLabel } from "@/lib/cloudStatus";
import {
  Badge,
  Button,
  CloudTableSkeletonRows,
  cloudPanelCardClassName,
  cloudPanelDescriptionClassName,
  cloudPanelHeaderClassName,
  cloudPanelTitleClassName,
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

      <div className="overflow-x-auto">
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
              <TableCell colSpan={10} className="p-5">
                <AdminEmptyState
                  icon={<Server className="h-5 w-5" />}
                  title={emptyTitle}
                  description={emptyDescription}
                  className="min-h-36 border-0 bg-slate-50/70 shadow-none dark:bg-slate-900/30"
                />
              </TableCell>
            </TableRow>
          ) : (
            instances.map((instance) => {
              const typeInfo = typePriceMap.get(instance.type);
              return (
                <TableRow key={instance.id}>
                  <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                    <button
                      type="button"
                      className="text-left text-blue-700 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
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
                          <div className="text-xs text-slate-500">
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
    </div>
  );
}

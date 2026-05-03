import type { TFunction } from "i18next";
import { Eye, Plus, Server } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { AWSInstanceRowActions } from "@/components/admin/cloud/AWSInstanceRowActions";
import {
  Badge,
  Button,
  CloudTableSkeletonRows,
} from "@/components/admin/cloud/cloud-ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AWSInstance,
  AWSLightsailInstance,
} from "@/lib/cloudAws";
import { getCloudStatusLabel } from "@/lib/cloudStatus";
import { formatAddressList } from "./awsPanelSummaries";
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
  onOpenCreate: () => MaybePromise<void>;
  onLoadDetail: (instance: AWSInstance) => MaybePromise<void>;
  onViewPassword: (instance: AWSInstance) => MaybePromise<void>;
  onPowerAction: (instance: AWSInstance, action: "start" | "stop") => MaybePromise<void>;
  onReboot: (instance: AWSInstance) => MaybePromise<void>;
  onReplaceIP: (instance: AWSInstance) => MaybePromise<void>;
  onRunScript: (instance: AWSInstance) => void;
  onShare: (instance: AWSInstance) => MaybePromise<void>;
  onDelete: (instance: AWSInstance) => MaybePromise<void>;
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
  canCreate,
  onLoadResources,
  onOpenCreate,
  onLoadDetail,
  onViewPassword,
  onPowerAction,
  onReboot,
  onReplaceIP,
  onRunScript,
  onShare,
  onDelete,
}: AWSEC2InstancesTableProps) {
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
    ) : resourcesLoaded && canCreate ? (
      <Button
        size="1"
        onClick={() => {
          void onOpenCreate();
        }}
      >
        <Plus className="mr-2 h-4 w-4" />
        {t("cloud.providers.aws.create", "创建 EC2")}
      </Button>
    ) : null;

  return (
    <Table className="min-w-[1180px]">
      <TableHeader>
        <TableRow>
          <TableHead>{t("cloud.table.name", "Name")}</TableHead>
          <TableHead>{t("cloud.table.status", "Status")}</TableHead>
          <TableHead>{t("cloud.providers.aws.az", "AZ")}</TableHead>
          <TableHead>{t("cloud.table.ip", "Public IP")}</TableHead>
          <TableHead>{t("cloud.detail.ipv6", "IPv6 Networks")}</TableHead>
          <TableHead>{t("cloud.table.size", "Size")}</TableHead>
          <TableHead>{t("cloud.table.image", "Image")}</TableHead>
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
                actions={emptyActions}
                className="min-h-36 border-0 bg-slate-50/70 shadow-none dark:bg-slate-900/30"
              />
            </TableCell>
          </TableRow>
        ) : (
          instances.map((instance) => (
            <TableRow key={instance.instance_id}>
              <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                <button
                  type="button"
                  className="text-left text-blue-700 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                  onClick={() => {
                    void onLoadDetail(instance);
                  }}
                >
                  {instance.name || instance.instance_id}
                </button>
              </TableCell>
              <TableCell>
                <Badge color={getInstanceStateColor(instance.state)}>
                  {getCloudStatusLabel(instance.state, t)}
                </Badge>
              </TableCell>
              <TableCell>{instance.availability_zone || "-"}</TableCell>
              <TableCell>{instance.public_ip || instance.private_ip || "-"}</TableCell>
              <TableCell>{formatAddressList(instance.ipv6_addresses)}</TableCell>
              <TableCell>{instance.instance_type || "-"}</TableCell>
              <TableCell>{instance.image_id || "-"}</TableCell>
              <TableCell>
                <AWSInstancePasswordState
                  t={t}
                  saved={instance.saved_root_password}
                  updatedAt={instance.saved_root_password_updated_at}
                  passwordStorageEnabled={passwordStorageEnabled}
                />
              </TableCell>
              <TableCell>{formatDateTime(instance.launch_time)}</TableCell>
              <TableCell className="text-right">
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
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

type AWSLightsailInstancesTableProps = SharedInstancesTableProps & {
  instances: AWSLightsailInstance[];
  lightsailError: string;
  onOpenCreate: () => MaybePromise<void>;
  onLoadDetail: (instance: AWSLightsailInstance) => MaybePromise<void>;
  onViewPassword: (instance: AWSLightsailInstance) => MaybePromise<void>;
  onPowerAction: (instance: AWSLightsailInstance, action: "start" | "stop") => MaybePromise<void>;
  onReboot: (instance: AWSLightsailInstance) => MaybePromise<void>;
  onReplaceIP: (instance: AWSLightsailInstance) => MaybePromise<void>;
  onRunScript: (instance: AWSLightsailInstance) => void;
  onShare: (instance: AWSLightsailInstance) => MaybePromise<void>;
  onDelete: (instance: AWSLightsailInstance) => MaybePromise<void>;
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
  canCreate,
  onLoadResources,
  onOpenCreate,
  onLoadDetail,
  onViewPassword,
  onPowerAction,
  onReboot,
  onReplaceIP,
  onRunScript,
  onShare,
  onDelete,
}: AWSLightsailInstancesTableProps) {
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
    ) : resourcesLoaded && canCreate ? (
      <Button
        size="1"
        onClick={() => {
          void onOpenCreate();
        }}
      >
        <Plus className="mr-2 h-4 w-4" />
        {t("cloud.providers.aws.lightsail_create", "创建 Lightsail")}
      </Button>
    ) : null;

  return (
    <Table className="min-w-[1120px]">
      <TableHeader>
        <TableRow>
          <TableHead>{t("cloud.table.name", "Name")}</TableHead>
          <TableHead>{t("cloud.table.status", "Status")}</TableHead>
          <TableHead>{t("cloud.providers.aws.az", "AZ")}</TableHead>
          <TableHead>{t("cloud.table.ip", "Public IP")}</TableHead>
          <TableHead>{t("cloud.table.size", "Size")}</TableHead>
          <TableHead>{t("cloud.table.image", "Image")}</TableHead>
          <TableHead>{t("cloud.providers.aws.static_ip", "Static IP")}</TableHead>
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
                actions={emptyActions}
                className="min-h-36 border-0 bg-slate-50/70 shadow-none dark:bg-slate-900/30"
              />
            </TableCell>
          </TableRow>
        ) : (
          instances.map((instance) => (
            <TableRow key={instance.name}>
              <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                <button
                  type="button"
                  className="text-left text-blue-700 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                  onClick={() => {
                    void onLoadDetail(instance);
                  }}
                >
                  {instance.name}
                </button>
              </TableCell>
              <TableCell>
                <Badge color={getInstanceStateColor(instance.state)}>
                  {getCloudStatusLabel(instance.state, t)}
                </Badge>
              </TableCell>
              <TableCell>{instance.availability_zone || "-"}</TableCell>
              <TableCell>{instance.public_ip || instance.private_ip || "-"}</TableCell>
              <TableCell>{instance.bundle_id || "-"}</TableCell>
              <TableCell>{instance.blueprint_name || instance.blueprint_id || "-"}</TableCell>
              <TableCell>{instance.is_static_ip ? t("common.yes", "Yes") : "-"}</TableCell>
              <TableCell>
                <AWSInstancePasswordState
                  t={t}
                  saved={instance.saved_root_password}
                  updatedAt={instance.saved_root_password_updated_at}
                  passwordStorageEnabled={passwordStorageEnabled}
                />
              </TableCell>
              <TableCell>{formatDateTime(instance.created_at)}</TableCell>
              <TableCell className="text-right">
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
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
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
      <span className="text-sm text-slate-400">
        {passwordStorageEnabled
          ? t("cloud.password.not_saved", "Not saved")
          : t("cloud.password.disabled_short", "Vault off")}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <Badge color={passwordStorageEnabled ? "green" : "amber"}>
        {passwordStorageEnabled
          ? t("cloud.password.saved", "Saved")
          : t("cloud.password.locked", "Locked")}
      </Badge>
      {updatedAt ? (
        <div className="text-xs text-slate-500">
          {formatDateTime(updatedAt)}
        </div>
      ) : null}
    </div>
  );
}

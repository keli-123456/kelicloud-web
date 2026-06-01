import React from "react";
import type { TFunction } from "i18next";
import {
  CheckCircle2,
  Eye,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { AWSCredentialTable } from "@/components/admin/cloud/AWSCredentialTable";
import {
  AWSEC2InstancesTable,
  AWSLightsailInstancesTable,
} from "@/components/admin/cloud/AWSInstancesTables";
import { AWSRegionSelect } from "@/components/admin/cloud/AWSRegionSelect";
import {
  Badge,
  Button,
  cloudPanelCardClassName,
  cloudPanelDescriptionClassName,
  cloudPanelHeaderClassName,
  cloudPanelTitleClassName,
  Flex,
  Tabs,
  TextField,
} from "@/components/admin/cloud/cloud-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  AWSCredentialRecord,
  AWSInstance,
  AWSLightsailInstance,
} from "@/lib/cloudAws";
import type { AWSRegionOption } from "./awsPanelCatalog";

type MaybePromise<T> = T | Promise<T>;

type AWSCredentialsSectionProps = {
  t: TFunction;
  activeRegion: string;
  regionOptions: AWSRegionOption[];
  regionSearchPlaceholder: string;
  regionSearchEmpty: string;
  credentialRows: AWSCredentialRecord[];
  selectedCredentialIds: string[];
  selectedCredentialCount: number;
  allCredentialsSelected: boolean;
  someCredentialsSelected: boolean;
  activeContextReady: boolean;
  credentialChecking: boolean;
  credentialSecretLoading: boolean;
  pendingBackgroundTaskCount: number;
  onRegionChange: (region: string) => MaybePromise<void>;
  onCheckCurrentCredential: () => MaybePromise<void>;
  onCheckAllCredentials: () => void;
  onImportCredentials: () => void;
  onOpenBackgroundTasks: () => void;
  onOpenSelectedGroupEditor: () => void;
  onDeleteSelectedCredentials: () => MaybePromise<void>;
  onSelectAllCredentials: (checked: boolean) => void;
  onToggleCredential: (credentialId: string, checked: boolean) => void;
  onSelectCredential: (credential: AWSCredentialRecord) => MaybePromise<void>;
  onOpenGroupEditor: (credentials: AWSCredentialRecord[]) => void;
  onViewCredentialSecret: (credential: AWSCredentialRecord) => MaybePromise<void>;
  onDeleteCredential: (credential: AWSCredentialRecord) => MaybePromise<void>;
};

export function AWSCredentialsSection({
  t,
  activeRegion,
  regionOptions,
  regionSearchPlaceholder,
  regionSearchEmpty,
  credentialRows,
  selectedCredentialIds,
  selectedCredentialCount,
  allCredentialsSelected,
  someCredentialsSelected,
  activeContextReady,
  credentialChecking,
  credentialSecretLoading,
  pendingBackgroundTaskCount,
  onRegionChange,
  onCheckCurrentCredential,
  onCheckAllCredentials,
  onImportCredentials,
  onOpenBackgroundTasks,
  onOpenSelectedGroupEditor,
  onDeleteSelectedCredentials,
  onSelectAllCredentials,
  onToggleCredential,
  onSelectCredential,
  onOpenGroupEditor,
  onViewCredentialSecret,
  onDeleteCredential,
}: AWSCredentialsSectionProps) {
  const selectedActionsDisabled = selectedCredentialCount === 0;

  return (
    <div className={`order-1 ${cloudPanelCardClassName}`}>
      <div className={cloudPanelHeaderClassName}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className={cloudPanelTitleClassName}>
              {t("cloud.providers.aws.credentials", "凭证")}
            </div>
            <div className={cloudPanelDescriptionClassName}>
              {t(
                "cloud.providers.aws.credentials_description",
                "在这里保存 AWS 访问密钥。先选择一个凭证，再切换区域并操作 EC2 或 Lightsail。",
              )}
            </div>
          </div>
          <Flex gap="2" wrap="wrap" align="center">
            <div className="w-full sm:w-72">
              <AWSRegionSelect
                value={activeRegion || undefined}
                options={regionOptions}
                placeholder={t("cloud.providers.aws.active_region", "当前区域")}
                searchPlaceholder={regionSearchPlaceholder}
                emptyLabel={regionSearchEmpty}
                onValueChange={(value) => {
                  void onRegionChange(value);
                }}
              />
            </div>
            <Button
              variant="outline"
              size="1"
              onClick={() => {
                void onCheckCurrentCredential();
              }}
              disabled={!activeContextReady || credentialChecking}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              {t("cloud.providers.aws.check_current", "检查当前")}
            </Button>
            <Button
              variant="outline"
              size="1"
              onClick={onCheckAllCredentials}
              disabled={credentialChecking || !credentialRows.length}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              {t("cloud.tokens.check_all", "批量测活")}
            </Button>
            <Button size="1" onClick={onImportCredentials}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t("cloud.providers.aws.import", "导入凭证")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="1"
                  aria-label={t("cloud.providers.aws.more_actions", "更多操作")}
                >
                  <MoreHorizontal className="mr-2 h-4 w-4" />
                  {t("cloud.providers.aws.more_actions", "更多操作")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuItem onSelect={onOpenBackgroundTasks}>
                  {t("cloud.providers.aws.background_tasks", "后台任务")}
                  {pendingBackgroundTaskCount > 0 ? ` (${pendingBackgroundTaskCount})` : ""}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={selectedActionsDisabled}
                  onSelect={onOpenSelectedGroupEditor}
                >
                  {t("cloud.tokens.set_group", "设置分组")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={selectedActionsDisabled}
                  onSelect={() => {
                    void onDeleteSelectedCredentials();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("cloud.tokens.delete_selected", {
                    count: selectedCredentialCount,
                    defaultValue: "删除已选",
                  })}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Flex>
        </div>
      </div>

      <AWSCredentialTable
        t={t}
        credentials={credentialRows}
        selectedCredentialIds={selectedCredentialIds}
        allCredentialsSelected={allCredentialsSelected}
        someCredentialsSelected={someCredentialsSelected}
        credentialSecretLoading={credentialSecretLoading}
        onSelectAll={onSelectAllCredentials}
        onToggleCredential={onToggleCredential}
        onSelectCredential={onSelectCredential}
        onImportCredentials={onImportCredentials}
        onOpenGroupEditor={onOpenGroupEditor}
        onViewCredentialSecret={onViewCredentialSecret}
        onDeleteCredential={onDeleteCredential}
      />
    </div>
  );
}

type AWSComputeSectionProps = {
  t: TFunction;
  instanceView: "ec2" | "lightsail";
  instances: AWSInstance[];
  lightsailInstances: AWSLightsailInstance[];
  panelLoading: boolean;
  error: string;
  lightsailError: string;
  hasCredential: boolean;
  activeContextReady: boolean;
  resourcesLoaded: boolean;
  passwordStorageEnabled: boolean;
  passwordLoading: boolean;
  canCreate: boolean;
  onInstanceViewChange: (value: "ec2" | "lightsail") => void;
  onLoadResources: () => MaybePromise<void>;
  onOpenEC2Create: () => MaybePromise<void>;
  onOpenLightsailCreate: () => void;
  onLoadEC2Detail: (instance: AWSInstance) => MaybePromise<void>;
  onViewEC2Password: (instance: AWSInstance) => MaybePromise<void>;
  onEC2PowerAction: (instance: AWSInstance, action: "start" | "stop") => MaybePromise<void>;
  onEC2Reboot: (instance: AWSInstance) => MaybePromise<void>;
  onEC2ReplaceIP: (instance: AWSInstance) => MaybePromise<void>;
  onRunEC2Script: (instance: AWSInstance) => void;
  onShareEC2: (instance: AWSInstance) => MaybePromise<void>;
  onDeleteEC2: (instance: AWSInstance) => MaybePromise<void>;
  onBatchDeleteEC2: (instances: AWSInstance[]) => MaybePromise<boolean>;
  onLoadLightsailDetail: (instance: AWSLightsailInstance) => MaybePromise<void>;
  onViewLightsailPassword: (instance: AWSLightsailInstance) => MaybePromise<void>;
  onLightsailPowerAction: (instance: AWSLightsailInstance, action: "start" | "stop") => MaybePromise<void>;
  onLightsailReboot: (instance: AWSLightsailInstance) => MaybePromise<void>;
  onLightsailReplaceIP: (instance: AWSLightsailInstance) => MaybePromise<void>;
  onRunLightsailScript: (instance: AWSLightsailInstance) => void;
  onShareLightsail: (instance: AWSLightsailInstance) => MaybePromise<void>;
  onDeleteLightsail: (instance: AWSLightsailInstance) => MaybePromise<void>;
  onBatchDeleteLightsail: (instances: AWSLightsailInstance[]) => MaybePromise<boolean>;
};

export function AWSComputeSection({
  t,
  instanceView,
  instances,
  lightsailInstances,
  panelLoading,
  error,
  lightsailError,
  hasCredential,
  activeContextReady,
  resourcesLoaded,
  passwordStorageEnabled,
  passwordLoading,
  canCreate,
  onInstanceViewChange,
  onLoadResources,
  onOpenEC2Create,
  onOpenLightsailCreate,
  onLoadEC2Detail,
  onViewEC2Password,
  onEC2PowerAction,
  onEC2Reboot,
  onEC2ReplaceIP,
  onRunEC2Script,
  onShareEC2,
  onDeleteEC2,
  onBatchDeleteEC2,
  onLoadLightsailDetail,
  onViewLightsailPassword,
  onLightsailPowerAction,
  onLightsailReboot,
  onLightsailReplaceIP,
  onRunLightsailScript,
  onShareLightsail,
  onDeleteLightsail,
  onBatchDeleteLightsail,
}: AWSComputeSectionProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const visibleEC2Instances = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return instances;
    return instances.filter((instance) => [
      instance.name,
      instance.instance_id,
      instance.state,
      instance.availability_zone,
      instance.public_ip || "",
      instance.private_ip || "",
      instance.instance_type,
      instance.image_id,
    ].some((value) => (value || "").toLowerCase().includes(query)));
  }, [instances, searchQuery]);
  const visibleLightsailInstances = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return lightsailInstances;
    return lightsailInstances.filter((instance) => [
      instance.name,
      instance.state,
      instance.availability_zone,
      instance.public_ip || "",
      instance.private_ip || "",
      instance.bundle_id,
      instance.blueprint_name || instance.blueprint_id || "",
    ].some((value) => (value || "").toLowerCase().includes(query)));
  }, [lightsailInstances, searchQuery]);

  return (
    <div className="order-2">
      <Tabs.Root value={instanceView} onValueChange={(value) => onInstanceViewChange(value as "ec2" | "lightsail")}>
        <div className={cloudPanelCardClassName}>
          <div className={cloudPanelHeaderClassName}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className={cloudPanelTitleClassName}>
                  {t("cloud.providers.aws.compute", "计算实例")}
                </div>
                <div className={cloudPanelDescriptionClassName}>
                  {t(
                    "cloud.providers.aws.instance_list_description",
                    "实例列表按当前凭证和当前区域筛选，点击查看后才会加载云端资源。",
                  )}
                </div>
              </div>
              <Flex gap="2" wrap="wrap" align="center">
                <Tabs.List>
                  <Tabs.Trigger value="ec2">
                    {t("cloud.providers.aws.instance_list", "EC2 实例")} ({instances.length})
                  </Tabs.Trigger>
                  <Tabs.Trigger value="lightsail">
                    {t("cloud.providers.aws.lightsail_instances", "Lightsail")} ({lightsailInstances.length})
                  </Tabs.Trigger>
                </Tabs.List>
                <Button
                  variant="outline"
                  size="1"
                  onClick={() => {
                    void onLoadResources();
                  }}
                  disabled={!activeContextReady || panelLoading}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {t("cloud.view", "查看")}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="1" disabled={!canCreate}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t("common.create", "创建")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-44">
                    <DropdownMenuItem
                      disabled={!canCreate}
                      onSelect={() => {
                        onInstanceViewChange("ec2");
                        void onOpenEC2Create();
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      {t("cloud.providers.aws.create", "启动 EC2")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!canCreate}
                      onSelect={() => {
                        onInstanceViewChange("lightsail");
                        onOpenLightsailCreate();
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      {t("cloud.providers.aws.lightsail_create", "创建 Lightsail")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Flex>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3 border-b border-border bg-muted/20 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1 md:max-w-sm">
              <TextField.Root
                size="1"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t("cloud.search_resources", "搜索名称 / IP / 区域...")}
              >
                <TextField.Slot>
                  <Search className="h-4 w-4" />
                </TextField.Slot>
              </TextField.Root>
            </div>
            <Badge color="blue">
              {instanceView === "ec2" ? visibleEC2Instances.length : visibleLightsailInstances.length}
            </Badge>
          </div>

          <Tabs.Content value="ec2">
            <AWSEC2InstancesTable
              t={t}
              instances={visibleEC2Instances}
              panelLoading={panelLoading}
              error={error}
              hasCredential={hasCredential}
              activeContextReady={activeContextReady}
              resourcesLoaded={resourcesLoaded}
              passwordStorageEnabled={passwordStorageEnabled}
              passwordLoading={passwordLoading}
              canCreate={canCreate}
              onLoadResources={onLoadResources}
              onOpenCreate={onOpenEC2Create}
              onLoadDetail={onLoadEC2Detail}
              onViewPassword={onViewEC2Password}
              onPowerAction={onEC2PowerAction}
              onReboot={onEC2Reboot}
              onReplaceIP={onEC2ReplaceIP}
              onRunScript={onRunEC2Script}
              onShare={onShareEC2}
              onDelete={onDeleteEC2}
              onBatchDelete={onBatchDeleteEC2}
            />
          </Tabs.Content>

          <Tabs.Content value="lightsail">
            {lightsailError ? (
              <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                {lightsailError}
              </div>
            ) : null}
            <AWSLightsailInstancesTable
              t={t}
              instances={visibleLightsailInstances}
              panelLoading={panelLoading}
              error={error}
              lightsailError={lightsailError}
              hasCredential={hasCredential}
              activeContextReady={activeContextReady}
              resourcesLoaded={resourcesLoaded}
              passwordStorageEnabled={passwordStorageEnabled}
              passwordLoading={passwordLoading}
              canCreate={canCreate}
              onLoadResources={onLoadResources}
              onOpenCreate={onOpenLightsailCreate}
              onLoadDetail={onLoadLightsailDetail}
              onViewPassword={onViewLightsailPassword}
              onPowerAction={onLightsailPowerAction}
              onReboot={onLightsailReboot}
              onReplaceIP={onLightsailReplaceIP}
              onRunScript={onRunLightsailScript}
              onShare={onShareLightsail}
              onDelete={onDeleteLightsail}
              onBatchDelete={onBatchDeleteLightsail}
            />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}

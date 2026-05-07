import type { Dispatch, SetStateAction } from "react";
import type { TFunction } from "i18next";
import {
  KeyRound,
  MoreHorizontal,
  Power,
  PowerOff,
  RotateCcw,
  Server,
  Share2,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import {
  CompactDetailSection,
  CompactSummaryMetric,
  PlainDetailItem,
} from "@/components/admin/cloud/AWSPanelDetailComponents";
import {
  Badge,
  Button,
  Checkbox,
  CloudCodeTextarea,
  CloudDetailDialogSkeleton,
  CloudReadonlyCodeBlock,
  CloudSensitiveDialogContent,
  cloudDetailListClassName,
  cloudDetailListItemClassName,
  cloudDetailMutedTextClassName,
  cloudDetailValueClassName,
  cloudPanelBodyTextClassName,
  cloudPanelTitleClassName,
  Dialog,
  Flex,
  Select,
  TextField,
} from "@/components/admin/cloud/cloud-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  AWSCatalog,
  AWSInstance,
  AWSInstanceDetail,
  CreateAWSInstanceActionInput,
} from "@/lib/cloudAws";
import { getCloudStatusLabel } from "@/lib/cloudStatus";
import { SELECT_NONE } from "./awsPanelCatalog";
import type { Ec2DetailActionFormState } from "./awsPanelState";
import {
  formatAddressList,
  formatElasticAddress,
  getConsoleOutputSummary,
  getEntryCountSummary,
  getInstanceControlsSummary,
  getMachineImageSummary,
  getVolumeSummary,
} from "./awsPanelSummaries";
import {
  formatDateTime,
  getInstanceStateColor,
  parseTags,
} from "./awsPanelUtils";

type MaybePromise<T> = T | Promise<T>;

type AWSEC2DetailDialogProps = {
  t: TFunction;
  detailInstance: AWSInstance | null;
  detailData: AWSInstanceDetail | null;
  detailLoading: boolean;
  detailActionLoading: boolean;
  detailActionForm: Ec2DetailActionFormState;
  setDetailActionForm: Dispatch<SetStateAction<Ec2DetailActionFormState>>;
  catalog: AWSCatalog | null;
  canReplaceAddress: boolean;
  passwordStorageEnabled: boolean;
  passwordLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (input: CreateAWSInstanceActionInput) => MaybePromise<void>;
  onAllowAllTraffic: () => MaybePromise<void>;
  onReplaceAddress: () => MaybePromise<void>;
  onDeleteInstance: (instance: AWSInstance) => MaybePromise<void>;
  onRunScript: (detail: AWSInstanceDetail) => void;
  onShareInstance: (detail: AWSInstanceDetail) => MaybePromise<void>;
  onViewInstancePassword: (instance: AWSInstance) => MaybePromise<void>;
};

export function AWSEC2DetailDialog({
  t,
  detailInstance,
  detailData,
  detailLoading,
  detailActionLoading,
  detailActionForm,
  setDetailActionForm,
  catalog,
  canReplaceAddress,
  passwordStorageEnabled,
  passwordLoading,
  onOpenChange,
  onAction,
  onAllowAllTraffic,
  onReplaceAddress,
  onDeleteInstance,
  onRunScript,
  onShareInstance,
  onViewInstancePassword,
}: AWSEC2DetailDialogProps) {
  return (
    <Dialog.Root open={Boolean(detailInstance)} onOpenChange={onOpenChange}>
      {detailInstance ? (
        <CloudSensitiveDialogContent
          title={detailInstance.name || detailInstance.instance_id || t("cloud.providers.aws.ec2_label", "AWS EC2")}
          description={t(
            "cloud.providers.aws.detail_description",
            "Current EC2 details and actions.",
          )}
          icon={<Server className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.aws.ec2_label", "AWS EC2")}</Badge>
              <Badge color={getInstanceStateColor(detailInstance.state)}>
                {getCloudStatusLabel(detailInstance.state, t)}
              </Badge>
            </>
          )}
          className="sm:max-w-5xl"
        >

        {detailLoading ? (
          <CloudDetailDialogSkeleton rows={12} />
        ) : detailData ? (
          <div className="flex flex-col gap-4">
            <section className="pt-0">
              <div className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  <CompactSummaryMetric
                    label={t("cloud.table.status", "Status")}
                    value={
                      <Badge color={getInstanceStateColor(detailData.instance.state)}>
                        {getCloudStatusLabel(detailData.instance.state, t)}
                      </Badge>
                    }
                  />
                  <CompactSummaryMetric
                    label={t("cloud.table.ip", "Public IP")}
                    value={detailData.instance.public_ip || detailData.instance.private_ip || "-"}
                  />
                  <CompactSummaryMetric
                    label={t("cloud.providers.aws.az", "AZ")}
                    value={detailData.instance.availability_zone || "-"}
                  />
                  <CompactSummaryMetric
                    label={t("cloud.table.size", "Size")}
                    value={detailData.instance.instance_type || "-"}
                  />
                </div>
                <Flex gap="2" wrap="wrap">
                  {detailData.instance.state === "running" ? (
                    <Button
                      variant="soft"
                      size="1"
                      color="amber"
                      disabled={detailActionLoading}
                      onClick={() => {
                        void onAction({ type: "stop" });
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
                      disabled={detailActionLoading || detailData.instance.state === "terminated"}
                      onClick={() => {
                        void onAction({ type: "start" });
                      }}
                    >
                      <Power className="mr-1 h-3.5 w-3.5" />
                      {t("cloud.power_on", "Power On")}
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="1"
                        aria-label={t("common.action", "Action")}
                      >
                        <MoreHorizontal className="mr-2 h-4 w-4" />
                        {t("cloud.providers.aws.more_actions", "More actions")}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-44">
                      <DropdownMenuItem
                        disabled={detailActionLoading || detailData.instance.state === "terminated"}
                        onSelect={() => {
                          void onAction({ type: "reboot" });
                        }}
                      >
                        <RotateCcw className="h-4 w-4" />
                        {t("cloud.reboot", "Reboot")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onRunScript(detailData)}>
                        {t("cloud.script.action", "Run Script")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => {
                          void onShareInstance(detailData);
                        }}
                      >
                        <Share2 className="h-4 w-4" />
                        {t("cloud.share.action", "Share")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={detailActionLoading || detailData.instance.state === "terminated"}
                        onSelect={() => {
                          void onDeleteInstance(detailData.instance);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("cloud.delete", "Delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Flex>
              </div>
              <div className="mt-4 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
                <PlainDetailItem
                  label={t("cloud.providers.aws.instance_id", "EC2 Instance ID")}
                  value={detailData.instance.instance_id}
                />
                <PlainDetailItem label={t("cloud.table.image", "Image")} value={detailData.instance.image_id || "-"} />
                <PlainDetailItem label={t("cloud.providers.aws.key_pair", "Key Pair")} value={detailData.instance.key_name || "-"} />
                <PlainDetailItem label={t("cloud.detail.ipv6", "IPv6 Networks")} value={formatAddressList(detailData.instance.ipv6_addresses)} />
                <PlainDetailItem
                  label={t("cloud.table.password", "Root Password")}
                  value={
                    detailData.instance.saved_root_password ? (
                      <Button
                        variant="soft"
                        size="1"
                        disabled={!passwordStorageEnabled || passwordLoading}
                        onClick={() => {
                          void onViewInstancePassword(detailData.instance);
                        }}
                      >
                        <KeyRound className="mr-1 h-3.5 w-3.5" />
                        {t("cloud.password.view", "View Password")}
                      </Button>
                    ) : (
                      t("cloud.password.not_saved", "Not saved")
                    )
                  }
                />
                <PlainDetailItem label={t("cloud.table.created_at", "Created")} value={formatDateTime(detailData.instance.launch_time)} />
                <PlainDetailItem label={t("cloud.providers.aws.vpc", "VPC")} value={detailData.vpc_id || "-"} />
                <PlainDetailItem label={t("cloud.providers.aws.subnet", "Subnet")} value={detailData.subnet_id || "-"} />
                <PlainDetailItem
                  label={t("cloud.providers.aws.monitoring", "Monitoring")}
                  value={getCloudStatusLabel(detailData.monitoring_state, t)}
                />
                <PlainDetailItem label={t("cloud.providers.aws.architecture", "Architecture")} value={detailData.architecture || "-"} />
                <PlainDetailItem label={t("cloud.providers.aws.public_dns", "Public DNS")} value={detailData.public_dns_name || "-"} />
                <PlainDetailItem label={t("cloud.providers.aws.private_dns", "Private DNS")} value={detailData.private_dns_name || "-"} />
              </div>
            </section>

            <CompactDetailSection
              title={t("cloud.detail.tags", "Tags")}
              summary={getEntryCountSummary(Object.keys(detailData.instance.tags || {}).length, t)}
            >
              <CloudCodeTextarea
                minHeightClassName="min-h-28"
                value={detailActionForm.tagsText}
                onChange={(event) =>
                  setDetailActionForm((previous) => ({ ...previous, tagsText: event.target.value }))
                }
              />
              <Flex justify="end" gap="2" className="mt-3">
                <Button
                  size="1"
                  disabled={detailActionLoading}
                  onClick={() => {
                    void onAction({
                      type: "sync_tags",
                      tags: parseTags(detailActionForm.tagsText),
                    });
                  }}
                >
                  {t("cloud.providers.aws.sync_tags", "Sync Tags")}
                </Button>
              </Flex>
            </CompactDetailSection>

            <CompactDetailSection
              title={t("cloud.providers.aws.storage", "Volumes")}
              summary={getVolumeSummary(detailData.volumes, t)}
            >
              <div className={cloudDetailListClassName}>
                {detailData.volumes.length ? detailData.volumes.map((volume) => (
                  <div key={volume.volume_id} className={cloudDetailListItemClassName}>
                    <div className={cloudDetailValueClassName}>{volume.device_name || volume.volume_id}</div>
                    <div className={`mt-1 ${cloudDetailMutedTextClassName}`}>
                      {volume.size_gib} GiB / {volume.volume_type} / {volume.state}
                    </div>
                  </div>
                )) : (
                  <div className={cloudDetailMutedTextClassName}>-</div>
                )}
              </div>
              <Flex justify="end" gap="2" className="mt-3">
                <Button
                  size="1"
                  disabled={detailActionLoading || !detailData.volumes.length}
                  onClick={() => {
                    void onAction({
                      type: "create_snapshots",
                      description: `Snapshots for ${detailData.instance.instance_id}`,
                    });
                  }}
                >
                  {t("cloud.providers.aws.create_snapshots", "Create Snapshots")}
                </Button>
              </Flex>
            </CompactDetailSection>

            <CompactDetailSection
              title={t("cloud.providers.aws.instance_controls", "Instance Controls")}
              summary={getInstanceControlsSummary(
                detailActionForm.instanceType || detailData.instance.instance_type || "",
                detailData.monitoring_state,
                t,
              )}
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <div className={cloudPanelTitleClassName}>
                    {t("cloud.providers.aws.change_type", "Change Instance Type")}
                  </div>
                  <Select.Root
                    value={detailActionForm.instanceType || SELECT_NONE}
                    onValueChange={(value) =>
                      setDetailActionForm((previous) => ({
                        ...previous,
                        instanceType: value === SELECT_NONE ? "" : value,
                      }))
                    }
                  >
                    <Select.Trigger className="mt-3" placeholder={t("cloud.providers.aws.instance_type", "Instance Type")} />
                    <Select.Content>
                      <Select.Item value={SELECT_NONE}>{t("cloud.providers.aws.none", "None")}</Select.Item>
                      {(catalog?.instance_types || []).map((instanceType) => (
                        <Select.Item key={instanceType.name} value={instanceType.name}>
                          {instanceType.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                  <Flex justify="end" gap="2" className="mt-3">
                    <Button
                      size="1"
                      disabled={detailActionLoading || !detailActionForm.instanceType}
                      onClick={() => {
                        void onAction({
                          type: "change_type",
                          instance_type: detailActionForm.instanceType,
                        });
                      }}
                    >
                      {t("cloud.providers.aws.change_type", "Change Instance Type")}
                    </Button>
                  </Flex>
                </div>

                <div>
                  <div className={cloudPanelTitleClassName}>
                    {t("cloud.providers.aws.monitoring", "Monitoring")}
                  </div>
                  <div className={`mt-2 ${cloudDetailMutedTextClassName}`}>
                    {getCloudStatusLabel(detailData.monitoring_state, t)}
                  </div>
                  <Flex justify="end" gap="2" className="mt-3">
                    <Button
                      size="1"
                      disabled={detailActionLoading}
                      onClick={() => {
                        void onAction({
                          type: detailData.monitoring_state === "enabled" ? "disable_monitoring" : "enable_monitoring",
                        });
                      }}
                    >
                      {detailData.monitoring_state === "enabled"
                        ? t("cloud.providers.aws.disable_monitoring", "Disable Monitoring")
                        : t("cloud.providers.aws.enable_monitoring", "Enable Monitoring")}
                    </Button>
                  </Flex>
                </div>
              </div>
            </CompactDetailSection>

            <CompactDetailSection
              title={t("cloud.providers.aws.machine_image", "Machine Image")}
              summary={getMachineImageSummary(detailActionForm.imageName, t)}
            >
              <TextField.Root
                value={detailActionForm.imageName}
                placeholder="komari-ami"
                onChange={(event) =>
                  setDetailActionForm((previous) => ({ ...previous, imageName: event.target.value }))
                }
              />
              <TextField.Root
                className="mt-3"
                value={detailActionForm.imageDescription}
                placeholder={t("cloud.providers.aws.description_optional", "Description")}
                onChange={(event) =>
                  setDetailActionForm((previous) => ({ ...previous, imageDescription: event.target.value }))
                }
              />
              <label className={`mt-3 flex items-center gap-2 ${cloudPanelBodyTextClassName}`}>
                <Checkbox
                  checked={detailActionForm.noReboot}
                  onCheckedChange={(checked) =>
                    setDetailActionForm((previous) => ({ ...previous, noReboot: Boolean(checked) }))
                  }
                />
                {t("cloud.providers.aws.no_reboot", "Create image without reboot")}
              </label>
              <Flex justify="end" gap="2" className="mt-3">
                <Button
                  size="1"
                  disabled={detailActionLoading || !detailActionForm.imageName}
                  onClick={() => {
                    void onAction({
                      type: "create_image",
                      name: detailActionForm.imageName,
                      description: detailActionForm.imageDescription,
                      no_reboot: detailActionForm.noReboot,
                    });
                  }}
                >
                  {t("cloud.providers.aws.create_image", "Create AMI")}
                </Button>
              </Flex>
            </CompactDetailSection>

            <CompactDetailSection
              title={t("cloud.providers.aws.elastic_ip", "Elastic IP")}
              summary={getEntryCountSummary(detailData.addresses.length, t)}
            >
              <div className={cloudDetailListClassName}>
                {detailData.addresses.length ? detailData.addresses.map((address) => (
                  <div key={address.allocation_id || address.public_ip} className={cloudDetailListItemClassName}>
                    <div className={cloudDetailValueClassName}>{formatElasticAddress(address)}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {address.association_id ? (
                        <Button
                          variant="soft"
                          size="1"
                          disabled={detailActionLoading}
                          onClick={() => {
                            void onAction({
                              type: "disassociate_address",
                              association_id: address.association_id,
                            });
                          }}
                        >
                          {t("cloud.providers.aws.disassociate", "Disassociate")}
                        </Button>
                      ) : null}
                      {address.allocation_id ? (
                        <Button
                          variant="soft"
                          size="1"
                          color="red"
                          disabled={detailActionLoading}
                          onClick={() => {
                            void onAction({
                              type: "release_address",
                              allocation_id: address.allocation_id,
                            });
                          }}
                        >
                          {t("cloud.providers.aws.release", "Release")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )) : (
                  <div className={cloudDetailMutedTextClassName}>-</div>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Select.Root
                  value={detailActionForm.allocationId || SELECT_NONE}
                  onValueChange={(value) =>
                    setDetailActionForm((previous) => ({
                      ...previous,
                      allocationId: value === SELECT_NONE ? "" : value,
                    }))
                  }
                >
                  <Select.Trigger placeholder={t("cloud.providers.aws.elastic_ip_existing", "Existing Elastic IP")} />
                  <Select.Content>
                    <Select.Item value={SELECT_NONE}>{t("cloud.providers.aws.none", "None")}</Select.Item>
                    {(catalog?.elastic_addresses || [])
                      .filter((address) => !address.association_id)
                      .map((address) => (
                        <Select.Item key={address.allocation_id} value={address.allocation_id}>
                          {formatElasticAddress(address)}
                        </Select.Item>
                      ))}
                  </Select.Content>
                </Select.Root>
                <TextField.Root
                  value={detailActionForm.privateIp}
                  placeholder={t("cloud.providers.aws.private_ip_optional", "Optional private IP")}
                  onChange={(event) =>
                    setDetailActionForm((previous) => ({ ...previous, privateIp: event.target.value }))
                  }
                />
              </div>
              <Flex justify="end" gap="2" className="mt-3">
                <Button
                  size="1"
                  disabled={detailActionLoading}
                  onClick={() => {
                    void onAction({
                      type: "allocate_address",
                      private_ip: detailActionForm.privateIp,
                    });
                  }}
                >
                  {t("cloud.providers.aws.allocate_attach", "Allocate and Attach")}
                </Button>
                <Button
                  size="1"
                  variant="outline"
                  disabled={detailActionLoading || !detailActionForm.allocationId}
                  onClick={() => {
                    void onAction({
                      type: "associate_address",
                      allocation_id: detailActionForm.allocationId,
                      private_ip: detailActionForm.privateIp,
                    });
                  }}
                >
                  {t("cloud.providers.aws.attach_existing", "Attach Existing")}
                </Button>
                <Button
                  size="1"
                  variant="outline"
                  disabled={detailActionLoading || !canReplaceAddress}
                  onClick={() => {
                    void onReplaceAddress();
                  }}
                >
                  {t("cloud.providers.aws.replace_ip", "Replace IP")}
                </Button>
              </Flex>
            </CompactDetailSection>

            {detailData.security_groups.length ? (
              <CompactDetailSection
                title={t("cloud.providers.aws.security_groups", "Security Groups")}
                summary={getEntryCountSummary(detailData.security_groups.length, t)}
              >
                <div className={cloudDetailListClassName}>
                  {detailData.security_groups.map((group) => (
                    <div key={group.group_id} className={cloudDetailListItemClassName}>
                      <div className={cloudDetailValueClassName}>{group.group_name || group.group_id}</div>
                      <div className={`mt-1 ${cloudDetailMutedTextClassName}`}>{group.group_id}</div>
                    </div>
                  ))}
                </div>
                <Flex justify="end" gap="2" className="mt-3">
                  <Button
                    size="1"
                    color="amber"
                    disabled={detailActionLoading || !detailData.security_groups.length}
                    onClick={() => {
                      void onAllowAllTraffic();
                    }}
                  >
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                    {t("cloud.providers.aws.allow_all_traffic", "Allow All Traffic")}
                  </Button>
                </Flex>
              </CompactDetailSection>
            ) : null}

            {detailData.console_output ? (
              <CompactDetailSection
                title={t("cloud.providers.aws.console_output", "Console Output")}
                summary={getConsoleOutputSummary(detailData.console_output, t)}
              >
                <CloudReadonlyCodeBlock value={detailData.console_output} minHeightClassName="min-h-40" />
              </CompactDetailSection>
            ) : null}
          </div>
        ) : null}
        </CloudSensitiveDialogContent>
      ) : null}
    </Dialog.Root>
  );
}

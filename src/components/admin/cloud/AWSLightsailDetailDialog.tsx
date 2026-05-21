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
  CloudDetailDialogSkeleton,
  CloudSensitiveDialogContent,
  cloudDetailListClassName,
  cloudDetailListItemClassName,
  cloudDetailMutedTextClassName,
  cloudDetailValueClassName,
  Dialog,
  Flex,
  TextField,
} from "@/components/admin/cloud/cloud-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  AWSLightsailInstance,
  AWSLightsailInstanceActionInput,
  AWSLightsailInstanceDetail,
  AWSLightsailStaticIP,
} from "@/lib/cloudAws";
import { getCloudStatusLabel } from "@/lib/cloudStatus";
import type { LightsailDetailActionFormState } from "./awsPanelState";
import {
  getEntryCountSummary,
  getStaticIPSummary,
} from "./awsPanelSummaries";
import {
  formatDateTime,
  getInstanceStateColor,
} from "./awsPanelUtils";

type MaybePromise<T> = T | Promise<T>;

type AWSLightsailDetailDialogProps = {
  t: TFunction;
  detailInstance: AWSLightsailInstance | null;
  detailData: AWSLightsailInstanceDetail | null;
  detailLoading: boolean;
  actionLoading: boolean;
  actionForm: LightsailDetailActionFormState;
  setActionForm: Dispatch<SetStateAction<LightsailDetailActionFormState>>;
  currentStaticIP: AWSLightsailStaticIP | null;
  passwordStorageEnabled: boolean;
  passwordLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (input: AWSLightsailInstanceActionInput) => MaybePromise<void>;
  onAllowAllTraffic: () => MaybePromise<void>;
  onReplaceStaticIP: () => MaybePromise<void>;
  onDeleteInstance: (instance: AWSLightsailInstance) => MaybePromise<void>;
  onRunScript: (detail: AWSLightsailInstanceDetail) => void;
  onShareInstance: (detail: AWSLightsailInstanceDetail) => MaybePromise<void>;
  onViewInstancePassword: (instance: AWSLightsailInstance) => MaybePromise<void>;
};

export function AWSLightsailDetailDialog({
  t,
  detailInstance,
  detailData,
  detailLoading,
  actionLoading,
  actionForm,
  setActionForm,
  currentStaticIP,
  passwordStorageEnabled,
  passwordLoading,
  onOpenChange,
  onAction,
  onAllowAllTraffic,
  onReplaceStaticIP,
  onDeleteInstance,
  onRunScript,
  onShareInstance,
  onViewInstancePassword,
}: AWSLightsailDetailDialogProps) {
  return (
    <Dialog.Root open={Boolean(detailInstance)} onOpenChange={onOpenChange}>
      {detailInstance ? (
        <CloudSensitiveDialogContent
          title={detailInstance.name || t("cloud.providers.aws.lightsail_label", "AWS Lightsail")}
          description={t(
            "cloud.providers.aws.lightsail_detail_description",
            "Current Lightsail details and actions.",
          )}
          icon={<Server className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.aws.lightsail_label", "AWS Lightsail")}</Badge>
              <Badge color={getInstanceStateColor(detailInstance.state)}>
                {getCloudStatusLabel(detailInstance.state, t)}
              </Badge>
            </>
          )}
          className="sm:max-w-5xl"
        >

        {detailLoading ? (
          <CloudDetailDialogSkeleton rows={5} />
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
                    value={detailData.instance.bundle_id || "-"}
                  />
                </div>
                <Flex gap="2" wrap="wrap">
                  {detailData.instance.state === "running" ? (
                    <Button
                      variant="soft"
                      size="1"
                      color="amber"
                      disabled={actionLoading}
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
                      disabled={actionLoading}
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
                        disabled={actionLoading}
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
                        disabled={actionLoading}
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
                <PlainDetailItem label={t("cloud.table.image", "Image")} value={detailData.instance.blueprint_name || detailData.instance.blueprint_id || "-"} />
                <PlainDetailItem label={t("cloud.providers.aws.key_pair", "Key Pair")} value={detailData.instance.ssh_key_name || "-"} />
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
                        {t("cloud.password.view", "查看密码")}
                      </Button>
                    ) : (
                      t("cloud.password.not_saved", "Not saved")
                    )
                  }
                />
                <PlainDetailItem label={t("cloud.table.created_at", "Created")} value={formatDateTime(detailData.instance.created_at)} />
                <PlainDetailItem
                  label={t("cloud.providers.aws.static_ip", "Static IP")}
                  value={
                    detailData.static_ips.find((staticIP) => staticIP.attached_to === detailData.instance.name)?.ip_address ||
                    "-"
                  }
                />
              </div>
            </section>

            <CompactDetailSection
              title={t("cloud.providers.aws.ports", "Firewall Ports")}
              summary={getEntryCountSummary(detailData.ports.length, t)}
            >
              <div className={cloudDetailListClassName}>
                {detailData.ports.length ? detailData.ports.map((port) => (
                  <div key={`${port.protocol}-${port.from_port}-${port.to_port}`} className={cloudDetailListItemClassName}>
                    <div className={cloudDetailValueClassName}>
                      {port.common_name || `${port.protocol}:${port.from_port}-${port.to_port}`}
                    </div>
                    <div className={`mt-1 ${cloudDetailMutedTextClassName}`}>
                      {port.access_type || "-"} / {port.access_from || "-"} / {(port.cidrs || []).join(", ") || "-"}
                    </div>
                  </div>
                )) : (
                  <div className={cloudDetailMutedTextClassName}>-</div>
                )}
              </div>
              <Flex justify="end" gap="2" className="mt-3">
                <Button
                  size="1"
                  color="amber"
                  disabled={actionLoading}
                  onClick={() => {
                    void onAllowAllTraffic();
                  }}
                >
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                  {t("cloud.providers.aws.allow_all_traffic", "Allow All Traffic")}
                </Button>
              </Flex>
            </CompactDetailSection>

            <CompactDetailSection
              title={t("cloud.providers.aws.static_ip", "Static IP")}
              summary={getStaticIPSummary(detailData.static_ips, detailData.instance.name, t)}
            >
              <div className={cloudDetailListClassName}>
                {detailData.static_ips.length ? detailData.static_ips.map((staticIP) => (
                  <div key={staticIP.name} className={cloudDetailListItemClassName}>
                    <div className={cloudDetailValueClassName}>{staticIP.name}</div>
                    <div className={`mt-1 ${cloudDetailMutedTextClassName}`}>
                      {staticIP.ip_address || "-"} / {staticIP.attached_to || "-"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {staticIP.attached_to === detailData.instance.name ? (
                        <Button
                          variant="soft"
                          size="1"
                          disabled={actionLoading}
                          onClick={() => {
                            void onAction({
                              type: "detach_static_ip",
                              static_ip_name: staticIP.name,
                            });
                          }}
                        >
                          {t("cloud.providers.aws.disassociate", "Disassociate")}
                        </Button>
                      ) : !staticIP.is_attached ? (
                        <Button
                          variant="soft"
                          size="1"
                          disabled={actionLoading}
                          onClick={() => {
                            void onAction({
                              type: "attach_static_ip",
                              static_ip_name: staticIP.name,
                            });
                          }}
                        >
                          {t("cloud.providers.aws.attach_existing", "Attach Existing")}
                        </Button>
                      ) : null}
                      {!staticIP.is_attached ? (
                        <Button
                          variant="soft"
                          size="1"
                          color="red"
                          disabled={actionLoading}
                          onClick={() => {
                            void onAction({
                              type: "release_static_ip",
                              static_ip_name: staticIP.name,
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
              <TextField.Root
                className="mt-3"
                value={actionForm.staticIpName}
                placeholder={t("cloud.providers.aws.static_ip_name", "Static IP name")}
                onChange={(event) =>
                  setActionForm((previous) => ({
                    ...previous,
                    staticIpName: event.target.value,
                  }))
                }
              />
              <Flex justify="end" gap="2" className="mt-3">
                <Button
                  size="1"
                  disabled={actionLoading || !actionForm.staticIpName}
                  onClick={() => {
                    void onAction({
                      type: "allocate_static_ip",
                      static_ip_name: actionForm.staticIpName,
                    });
                  }}
                >
                  {t("cloud.providers.aws.allocate_static_ip", "Allocate Static IP")}
                </Button>
                <Button
                  size="1"
                  variant="outline"
                  disabled={
                    actionLoading
                    || !currentStaticIP
                    || !actionForm.staticIpName.trim()
                    || actionForm.staticIpName.trim() === (currentStaticIP?.name || "")
                  }
                  onClick={() => {
                    void onReplaceStaticIP();
                  }}
                >
                  {t("cloud.providers.aws.replace_ip", "Replace IP")}
                </Button>
              </Flex>
            </CompactDetailSection>

            <CompactDetailSection
              title={t("cloud.providers.aws.snapshots", "Snapshots")}
              summary={getEntryCountSummary(detailData.snapshots.length, t)}
            >
              <div className={cloudDetailListClassName}>
                {detailData.snapshots.length ? detailData.snapshots.map((snapshot) => (
                  <div key={snapshot.name} className={cloudDetailListItemClassName}>
                    <div className={cloudDetailValueClassName}>{snapshot.name}</div>
                    <div className={`mt-1 ${cloudDetailMutedTextClassName}`}>
                      {snapshot.state || "-"} / {snapshot.size_in_gb} GB / {formatDateTime(snapshot.created_at)}
                    </div>
                  </div>
                )) : (
                  <div className={cloudDetailMutedTextClassName}>-</div>
                )}
              </div>
              <TextField.Root
                className="mt-3"
                value={actionForm.snapshotName}
                placeholder={t("cloud.providers.aws.snapshot_name", "Snapshot name")}
                onChange={(event) =>
                  setActionForm((previous) => ({
                    ...previous,
                    snapshotName: event.target.value,
                  }))
                }
              />
              <Flex justify="end" gap="2" className="mt-3">
                <Button
                  size="1"
                  disabled={actionLoading || !actionForm.snapshotName}
                  onClick={() => {
                    void onAction({
                      type: "create_snapshot",
                      snapshot_name: actionForm.snapshotName,
                    });
                  }}
                >
                  {t("cloud.providers.aws.create_snapshot", "Create Snapshot")}
                </Button>
              </Flex>
            </CompactDetailSection>
          </div>
        ) : null}
        </CloudSensitiveDialogContent>
      ) : null}
    </Dialog.Root>
  );
}

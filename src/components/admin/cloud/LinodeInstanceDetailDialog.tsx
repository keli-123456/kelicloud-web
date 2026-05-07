import type { Dispatch, SetStateAction } from "react";
import type { TFunction } from "i18next";
import { KeyRound, Server } from "lucide-react";

import {
  type LinodeCatalog,
  type LinodeInstance,
  type LinodeInstanceActionInput,
  type LinodeInstanceDetail,
} from "@/lib/cloudLinode";
import { getCloudStatusLabel } from "@/lib/cloudStatus";
import {
  Badge,
  Button,
  Checkbox,
  CloudCodeTextarea,
  CloudDetailDialogSkeleton,
  CloudDetailItem,
  CloudSensitiveDialogContent,
  cloudDetailListClassName,
  cloudDetailListItemClassName,
  cloudDetailLabelClassName,
  cloudDetailMutedTextClassName,
  cloudDetailSectionClassName,
  cloudDetailValueClassName,
  Dialog,
  Flex,
  Select,
  TextField,
} from "@/components/admin/cloud/cloud-ui";
import {
  SELECT_NONE,
  formatDateTime,
  formatList,
  getLinodeTypeOptionLabel,
  type DetailActionPasswordState,
} from "./linodePanelUtils";

type MaybePromise<T> = T | Promise<T>;

type LinodeInstanceDetailDialogProps = {
  t: TFunction;
  instance: LinodeInstance | null;
  detailData: LinodeInstanceDetail | null;
  loading: boolean;
  actionLoading: boolean;
  catalog: LinodeCatalog | null;
  passwordStorageEnabled: boolean;
  passwordLoading: boolean;
  resizeTargetType: string;
  setResizeTargetType: Dispatch<SetStateAction<string>>;
  detailPasswordState: DetailActionPasswordState;
  setDetailPasswordState: Dispatch<SetStateAction<DetailActionPasswordState>>;
  rebuildImage: string;
  setRebuildImage: Dispatch<SetStateAction<string>>;
  rebuildUserData: string;
  setRebuildUserData: Dispatch<SetStateAction<string>>;
  rebuildBooted: boolean;
  setRebuildBooted: Dispatch<SetStateAction<boolean>>;
  onClose: () => void;
  onViewPassword: (instance: LinodeInstance) => MaybePromise<void>;
  onAction: (input: LinodeInstanceActionInput) => MaybePromise<void>;
};

const DetailItem = CloudDetailItem;

export function LinodeInstanceDetailDialog({
  t,
  instance,
  detailData,
  loading,
  actionLoading,
  catalog,
  passwordStorageEnabled,
  passwordLoading,
  resizeTargetType,
  setResizeTargetType,
  detailPasswordState,
  setDetailPasswordState,
  rebuildImage,
  setRebuildImage,
  rebuildUserData,
  setRebuildUserData,
  rebuildBooted,
  setRebuildBooted,
  onClose,
  onViewPassword,
  onAction,
}: LinodeInstanceDetailDialogProps) {
  return (
    <Dialog.Root
      open={Boolean(instance)}
      onOpenChange={(open) => {
        if (open) return;
        onClose();
      }}
    >
      {instance ? (
        <CloudSensitiveDialogContent
          title={instance.label || t("cloud.providers.linode.detail_title", "Linode Details")}
          description={t(
            "cloud.providers.linode.detail_description",
            "View the selected Linode instance details from the current active token.",
          )}
          icon={<Server className="size-4" />}
          badge={(
            <>
              <Badge color="blue">{t("cloud.providers.linode.name", "Linode")}</Badge>
              <Badge color={instance.status === "running" ? "green" : "amber"}>
                {getCloudStatusLabel(instance.status, t)}
              </Badge>
            </>
          )}
          className="sm:max-w-5xl"
        >
        {loading ? (
          <CloudDetailDialogSkeleton rows={12} />
        ) : detailData ? (
          <div className="flex flex-col gap-4">
            <section className="pt-0">
              <div className={cloudDetailLabelClassName}>
                {t("cloud.detail.summary", "Summary")}
              </div>
              <div className="mt-2 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
                <DetailItem
                  variant="plain"
                  label={t("cloud.providers.linode.instance_id", "Linode ID")}
                  value={detailData.instance.id}
                />
                <DetailItem
                  variant="plain"
                  label={t("cloud.table.status", "Status")}
                  value={getCloudStatusLabel(detailData.instance.status, t)}
                />
                <DetailItem variant="plain" label={t("cloud.table.region", "Region")} value={detailData.instance.region || "-"} />
                <DetailItem variant="plain" label={t("cloud.table.ip", "Public IP")} value={detailData.instance.ipv4[0] || detailData.instance.ipv6 || "-"} />
                <DetailItem variant="plain" label={t("cloud.table.size", "Size")} value={detailData.instance.type || "-"} />
                <DetailItem variant="plain" label={t("cloud.table.image", "Image")} value={detailData.instance.image || "-"} />
                <DetailItem variant="plain" label={t("cloud.table.created_at", "Created")} value={formatDateTime(detailData.instance.created)} />
                <DetailItem variant="plain" label={t("cloud.detail.memory", "Memory")} value={`${detailData.instance.specs.memory} MB`} />
                <DetailItem variant="plain" label={t("cloud.detail.vcpus", "vCPUs")} value={detailData.instance.specs.vcpus} />
                <DetailItem variant="plain" label={t("cloud.detail.disk", "Disk")} value={`${detailData.instance.specs.disk} GB`} />
                <DetailItem variant="plain" label={t("cloud.detail.tags", "Tags")} value={formatList(detailData.instance.tags)} />
                <DetailItem
                  variant="plain"
                  label={t("cloud.table.password", "Root Password")}
                  value={
                    detailData.instance.saved_root_password ? (
                      <Button
                        variant="soft"
                        size="1"
                        disabled={!passwordStorageEnabled || passwordLoading}
                        onClick={() => {
                          void onViewPassword(detailData.instance);
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
              </div>
            </section>

            <section className={cloudDetailSectionClassName}>
              <div className={cloudDetailLabelClassName}>
                {t("cloud.providers.linode.disks", "Disks")}
              </div>
              {detailData.disks.length ? (
                <div className={`mt-2 ${cloudDetailListClassName}`}>
                  {detailData.disks.map((disk) => (
                    <div key={disk.id} className={cloudDetailListItemClassName}>
                      <div className={cloudDetailValueClassName}>{disk.label || `Disk ${disk.id}`}</div>
                      <div className={`mt-1 ${cloudDetailMutedTextClassName}`}>
                        {disk.size} MB / {disk.filesystem || "-"} / {disk.status || "-"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`mt-2 ${cloudDetailMutedTextClassName}`}>-</div>
              )}
            </section>

            <section className={cloudDetailSectionClassName}>
              <div className={cloudDetailLabelClassName}>
                {t("cloud.providers.linode.configs", "Configs")}
              </div>
              {detailData.configs.length ? (
                <div className={`mt-2 ${cloudDetailListClassName}`}>
                  {detailData.configs.map((config) => (
                    <div key={config.id} className={cloudDetailListItemClassName}>
                      <div className={cloudDetailValueClassName}>{config.label || `Config ${config.id}`}</div>
                      <div className={`mt-1 ${cloudDetailMutedTextClassName}`}>
                        {config.kernel || "-"} / {config.root_device || "-"} / {config.run_level || "-"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`mt-2 ${cloudDetailMutedTextClassName}`}>-</div>
              )}
            </section>

            <section className={cloudDetailSectionClassName}>
              <Flex justify="between" align="center" wrap="wrap" gap="2">
                <div className={cloudDetailLabelClassName}>
                  {t("cloud.providers.linode.backups", "Backups")}
                </div>
                <Button
                  size="1"
                  disabled={actionLoading}
                  onClick={() => {
                    void onAction({ type: "snapshot" });
                  }}
                >
                  {t("cloud.providers.linode.create_snapshot", "Create Snapshot")}
                </Button>
              </Flex>
              {detailData.backups ? (
                <div className="mt-2 grid gap-x-6 sm:grid-cols-2">
                  <DetailItem
                    variant="plain"
                    label={t("cloud.form.backups", "Enable backups")}
                    value={detailData.backups.enabled ? t("common.yes", "Yes") : t("common.no", "No")}
                  />
                  <DetailItem
                    variant="plain"
                    label={t("cloud.providers.linode.last_successful", "Last Successful")}
                    value={formatDateTime(detailData.backups.last_successful)}
                  />
                  <DetailItem
                    variant="plain"
                    label={t("cloud.providers.linode.backup_schedule", "Schedule")}
                    value={`${detailData.backups.schedule.day || "-"} / ${detailData.backups.schedule.window || "-"}`}
                  />
                  <DetailItem
                    variant="plain"
                    label={t("cloud.providers.linode.backup_automatic", "Automatic")}
                    value={detailData.backups.automatic.length}
                  />
                </div>
              ) : (
                <div className={`mt-2 ${cloudDetailMutedTextClassName}`}>-</div>
              )}
            </section>

            <section className={cloudDetailSectionClassName}>
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <div className={cloudDetailLabelClassName}>
                    {t("cloud.providers.linode.resize", "Resize")}
                  </div>
                  <Select.Root value={resizeTargetType || SELECT_NONE} onValueChange={(value) => setResizeTargetType(value === SELECT_NONE ? "" : value)}>
                    <Select.Trigger className="mt-3" placeholder={t("cloud.form.size_placeholder", "Select a size")} />
                    <Select.Content>
                      <Select.Item value={SELECT_NONE}>{t("cloud.providers.aws.none", "None")}</Select.Item>
                      {(catalog?.types || []).map((type) => (
                        <Select.Item key={type.id} value={type.id}>
                          {getLinodeTypeOptionLabel(type)}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                  <Flex justify="end" gap="2" className="mt-3">
                    <Button
                      size="1"
                      disabled={actionLoading || !resizeTargetType}
                      onClick={() => {
                        void onAction({
                          type: "resize",
                          target_type: resizeTargetType,
                        });
                      }}
                    >
                      {t("cloud.providers.linode.resize", "Resize")}
                    </Button>
                  </Flex>
                </div>

                <div>
                  <div className={cloudDetailLabelClassName}>
                    {t("cloud.providers.linode.reset_password", "Reset Root Password")}
                  </div>
                  <Select.Root
                    value={detailPasswordState.mode}
                    onValueChange={(value) =>
                      setDetailPasswordState((previous) => ({
                        ...previous,
                        mode: value as "custom" | "random",
                        password: value === "custom" ? previous.password : "",
                      }))
                    }
                  >
                    <Select.Trigger className="mt-3" placeholder={t("cloud.form.root_access_placeholder", "Select access mode")} />
                    <Select.Content>
                      <Select.Item value="custom">
                        {t("cloud.form.root_access_modes.custom", "Custom root password")}
                      </Select.Item>
                      <Select.Item value="random">
                        {t("cloud.form.root_access_modes.random", "Random root password")}
                      </Select.Item>
                    </Select.Content>
                  </Select.Root>
                  {detailPasswordState.mode === "custom" ? (
                    <TextField.Root
                      className="mt-3"
                      type="password"
                      value={detailPasswordState.password}
                      placeholder={t("cloud.form.root_password_placeholder", "Enter a root password")}
                      onChange={(event) =>
                        setDetailPasswordState((previous) => ({
                          ...previous,
                          password: event.target.value,
                        }))
                      }
                    />
                  ) : null}
                  <Flex justify="end" gap="2" className="mt-3">
                    <Button
                      size="1"
                      disabled={actionLoading || (detailPasswordState.mode === "custom" && !detailPasswordState.password)}
                      onClick={() => {
                        void onAction({
                          type: "reset_root_password",
                          root_password_mode: detailPasswordState.mode,
                          root_password: detailPasswordState.password,
                        });
                      }}
                    >
                      {t("cloud.providers.linode.reset_password", "Reset Root Password")}
                    </Button>
                  </Flex>
                </div>
              </div>
            </section>

            <section className={cloudDetailSectionClassName}>
              <div className={cloudDetailLabelClassName}>
                {t("cloud.providers.linode.rebuild", "Rebuild")}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Select.Root value={rebuildImage || SELECT_NONE} onValueChange={(value) => setRebuildImage(value === SELECT_NONE ? "" : value)}>
                  <Select.Trigger placeholder={t("cloud.form.image_placeholder", "Select an image")} />
                  <Select.Content>
                    <Select.Item value={SELECT_NONE}>{t("cloud.providers.aws.none", "None")}</Select.Item>
                    {(catalog?.images || []).map((image) => (
                      <Select.Item key={image.id} value={image.id}>
                        {image.vendor ? `${image.vendor} / ` : ""}{image.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                <Select.Root
                  value={detailPasswordState.mode}
                  onValueChange={(value) =>
                    setDetailPasswordState((previous) => ({
                      ...previous,
                      mode: value as "custom" | "random",
                      password: value === "custom" ? previous.password : "",
                    }))
                  }
                >
                  <Select.Trigger placeholder={t("cloud.form.root_access_placeholder", "Select access mode")} />
                  <Select.Content>
                    <Select.Item value="custom">
                      {t("cloud.form.root_access_modes.custom", "Custom root password")}
                    </Select.Item>
                    <Select.Item value="random">
                      {t("cloud.form.root_access_modes.random", "Random root password")}
                    </Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
              {detailPasswordState.mode === "custom" ? (
                <TextField.Root
                  className="mt-3"
                  type="password"
                  value={detailPasswordState.password}
                  placeholder={t("cloud.form.root_password_placeholder", "Enter a root password")}
                  onChange={(event) =>
                    setDetailPasswordState((previous) => ({
                      ...previous,
                      password: event.target.value,
                    }))
                  }
                />
              ) : null}
              <CloudCodeTextarea
                className="mt-3"
                minHeightClassName="min-h-28"
                value={rebuildUserData}
                placeholder="#!/bin/bash"
                onChange={(event) => setRebuildUserData(event.target.value)}
              />
              <label className={`mt-3 flex items-center gap-2 ${cloudDetailMutedTextClassName}`}>
                <Checkbox checked={rebuildBooted} onCheckedChange={(checked) => setRebuildBooted(Boolean(checked))} />
                {t("cloud.providers.linode.booted", "Boot after creation")}
              </label>
              <Flex justify="end" gap="2" className="mt-3">
                <Button
                  size="1"
                  disabled={actionLoading || !rebuildImage || (detailPasswordState.mode === "custom" && !detailPasswordState.password)}
                  onClick={() => {
                    void onAction({
                      type: "rebuild",
                      image: rebuildImage,
                      root_password_mode: detailPasswordState.mode,
                      root_password: detailPasswordState.password,
                      booted: rebuildBooted,
                      user_data: rebuildUserData,
                    });
                  }}
                >
                  {t("cloud.providers.linode.rebuild", "Rebuild")}
                </Button>
              </Flex>
            </section>
          </div>
        ) : null}
        </CloudSensitiveDialogContent>
      ) : null}
    </Dialog.Root>
  );
}

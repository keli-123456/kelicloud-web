import React from "react";
import { useTranslation } from "react-i18next";
import { Copy, Share2, Trash2 } from "lucide-react";

import { Button, Checkbox, Dialog, Flex, TextArea, TextField } from "@/components/ui/compat";
import type { CloudInstanceShareRecord, CloudShareProvider, CloudShareResourceType } from "@/lib/cloudShare";

export type CloudInstanceShareTarget = {
  provider: CloudShareProvider;
  resourceType: CloudShareResourceType;
  resourceId: string;
  resourceName: string;
  providerLabel: string;
  credentialName?: string;
  region?: string;
  primaryAddress?: string;
  canSharePassword: boolean;
  canShareManagedSSHKey: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: CloudInstanceShareTarget | null;
  share: CloudInstanceShareRecord | null;
  loading: boolean;
  saving: boolean;
  deleting: boolean;
  title: string;
  note: string;
  sharePassword: boolean;
  shareManagedSSHKey: boolean;
  shareUrl: string;
  onTitleChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSharePasswordChange: (value: boolean) => void;
  onShareManagedSSHKeyChange: (value: boolean) => void;
  onCopyLink: () => void;
  onSave: () => void;
  onDelete: () => void;
};

function MetaItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 break-all text-sm text-slate-900">
        {value === undefined || value === null || value === "" ? "-" : value}
      </div>
    </div>
  );
}

export default function CloudInstanceShareDialog({
  open,
  onOpenChange,
  target,
  share,
  loading,
  saving,
  deleting,
  title,
  note,
  sharePassword,
  shareManagedSSHKey,
  shareUrl,
  onTitleChange,
  onNoteChange,
  onSharePasswordChange,
  onShareManagedSSHKeyChange,
  onCopyLink,
  onSave,
  onDelete,
}: Props) {
  const { t } = useTranslation();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="max-h-[85vh] overflow-y-auto">
        <Dialog.Title>{t("cloud.share.dialog_title", "Share Instance")}</Dialog.Title>
        <Dialog.Description>
          {t(
            "cloud.share.dialog_description",
            "Generate a read-only public link for one instance. You can choose whether to include the saved root password or managed SSH key.",
          )}
        </Dialog.Description>

        {loading ? (
          <div className="mt-4 text-sm text-slate-500">
            {t("cloud.loading", "Loading cloud resources...")}
          </div>
        ) : target ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetaItem label={t("cloud.share.instance", "Instance")} value={target.resourceName} />
              <MetaItem label={t("cloud.share.provider", "Provider")} value={target.providerLabel} />
              <MetaItem label={t("cloud.tokens.table.account", "Account")} value={target.credentialName || "-"} />
              <MetaItem label={t("cloud.table.region", "Region")} value={target.region || "-"} />
              <MetaItem label={t("cloud.table.ip", "Public IP")} value={target.primaryAddress || "-"} />
              <MetaItem label={t("cloud.share.status", "Share Status")} value={share?.token ? t("cloud.share.enabled", "Enabled") : t("cloud.share.disabled", "Not Shared")} />
            </div>

            {share?.token ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <div className="text-sm font-medium text-emerald-900">
                  {t("cloud.share.link_ready", "Share link is ready")}
                </div>
                <TextField.Root className="mt-3" readOnly value={shareUrl} />
                <Flex justify="end" gap="2" className="mt-3">
                  <Button variant="outline" size="1" onClick={onCopyLink}>
                    <Copy className="mr-2 h-4 w-4" />
                    {t("common.copy", "Copy")}
                  </Button>
                </Flex>
              </div>
            ) : null}

            <label className="text-sm font-medium text-slate-800">
              {t("cloud.share.custom_title", "Custom Title")}
            </label>
            <TextField.Root
              value={title}
              placeholder={target.resourceName}
              onChange={(event) => onTitleChange(event.target.value)}
            />

            <label className="text-sm font-medium text-slate-800">
              {t("cloud.share.note", "Share Note")}
            </label>
            <TextArea
              className="min-h-28"
              value={note}
              placeholder={t("cloud.share.note_placeholder", "Optional note shown on the public share page")}
              onChange={(event) => onNoteChange(event.target.value)}
            />

            {target.canSharePassword ? (
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <Checkbox checked={sharePassword} onCheckedChange={(checked) => onSharePasswordChange(Boolean(checked))} />
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {t("cloud.share.include_password", "Include saved root password")}
                  </div>
                  <div className="text-xs text-slate-500">
                    {t("cloud.share.include_password_description", "Anyone with the link will be able to view the stored root password.")}
                  </div>
                </div>
              </label>
            ) : null}

            {target.canShareManagedSSHKey ? (
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <Checkbox checked={shareManagedSSHKey} onCheckedChange={(checked) => onShareManagedSSHKeyChange(Boolean(checked))} />
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {t("cloud.share.include_managed_key", "Include managed SSH key")}
                  </div>
                  <div className="text-xs text-slate-500">
                    {t("cloud.share.include_managed_key_description", "Expose the managed SSH private key so the recipient can log in with the shared key pair.")}
                  </div>
                </div>
              </label>
            ) : null}

            <Flex justify="end" gap="2">
              {share?.token ? (
                <Button variant="soft" color="red" onClick={onDelete} disabled={deleting || saving}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleting
                    ? t("cloud.share.revoking", "Revoking...")
                    : t("cloud.share.revoke", "Revoke Link")}
                </Button>
              ) : null}
              <Button onClick={onSave} disabled={saving || deleting}>
                <Share2 className="mr-2 h-4 w-4" />
                {saving
                  ? t("cloud.share.saving", "Saving...")
                  : share?.token
                    ? t("cloud.share.update", "Update Share")
                    : t("cloud.share.create", "Create Share")}
              </Button>
            </Flex>
          </div>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
}

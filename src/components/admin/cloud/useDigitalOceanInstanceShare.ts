import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import type { CloudInstanceShareTarget } from "@/components/admin/cloud/CloudInstanceShareDialog";
import type { ConfirmDialogOptions } from "@/components/ui/warning-dialog";
import {
  buildCloudInstanceShareUrl,
  deleteCloudInstanceShare,
  fromCloudShareDateTimeLocalValue,
  getCloudInstanceShare,
  saveCloudInstanceShare,
  toCloudShareDateTimeLocalValue,
  type CloudInstanceShareRecord,
  type CloudShareAccessPolicy,
} from "@/lib/cloudShare";
import type {
  DigitalOceanDroplet,
  DigitalOceanTokenRecord,
} from "@/lib/cloud";
import {
  getDropletPrimaryIp,
  getRegionOptionLabel,
  toErrorMessage,
} from "./digitalOceanPanelUtils";

type ConfirmDialog = (options: ConfirmDialogOptions) => Promise<boolean>;

type UseDigitalOceanInstanceShareOptions = {
  t: TFunction;
  confirm: ConfirmDialog;
  activeToken: DigitalOceanTokenRecord | null;
  copyText: (text: string) => void | Promise<void>;
};

export function useDigitalOceanInstanceShare({
  t,
  confirm,
  activeToken,
  copyText,
}: UseDigitalOceanInstanceShareOptions) {
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareTarget, setShareTarget] = React.useState<CloudInstanceShareTarget | null>(null);
  const [shareRecord, setShareRecord] = React.useState<CloudInstanceShareRecord | null>(null);
  const [shareLoading, setShareLoading] = React.useState(false);
  const [shareSaving, setShareSaving] = React.useState(false);
  const [shareDeleting, setShareDeleting] = React.useState(false);
  const [shareTitle, setShareTitle] = React.useState("");
  const [shareNote, setShareNote] = React.useState("");
  const [shareAccessPolicy, setShareAccessPolicy] = React.useState<CloudShareAccessPolicy>("public");
  const [shareExpiresAt, setShareExpiresAt] = React.useState("");
  const [sharePassword, setSharePassword] = React.useState(false);
  const [shareManagedSSHKey, setShareManagedSSHKey] = React.useState(false);

  const shareUrl = React.useMemo(
    () => (shareRecord?.token ? buildCloudInstanceShareUrl(shareRecord.token) : ""),
    [shareRecord?.token],
  );

  const handleShareOpenChange = React.useCallback((open: boolean) => {
    setShareOpen(open);
    if (!open) {
      setShareTarget(null);
      setShareRecord(null);
      setShareLoading(false);
      setShareSaving(false);
      setShareDeleting(false);
      setShareAccessPolicy("public");
      setShareExpiresAt("");
      setSharePassword(false);
      setShareManagedSSHKey(false);
    }
  }, []);

  const handleOpenShareDialog = async (droplet: DigitalOceanDroplet) => {
    const nextTarget: CloudInstanceShareTarget = {
      provider: "digitalocean",
      resourceType: "droplet",
      resourceId: String(droplet.id),
      resourceName: droplet.name || String(droplet.id),
      providerLabel: t("cloud.providers.digitalocean.title", "DigitalOcean"),
      credentialName: activeToken?.name || activeToken?.account_email || "",
      region: getRegionOptionLabel(droplet.region, t),
      primaryAddress: getDropletPrimaryIp(droplet),
      canSharePassword: Boolean(droplet.saved_root_password),
      canShareManagedSSHKey: Boolean(activeToken?.managed_ssh_key_ready),
    };

    setShareTarget(nextTarget);
    setShareRecord(null);
    setShareTitle(droplet.name || "");
    setShareNote("");
    setShareAccessPolicy("public");
    setShareExpiresAt("");
    setSharePassword(false);
    setShareManagedSSHKey(false);
    setShareOpen(true);
    setShareLoading(true);

    try {
      const nextShare = await getCloudInstanceShare("digitalocean", "droplet", String(droplet.id));
      setShareRecord(nextShare.token ? nextShare : null);
      setShareTitle(nextShare.title || droplet.name || "");
      setShareNote(nextShare.note || "");
      setShareAccessPolicy(nextShare.access_policy || "public");
      setShareExpiresAt(toCloudShareDateTimeLocalValue(nextShare.expires_at));
      setSharePassword(Boolean(nextShare.share_password && nextTarget.canSharePassword));
      setShareManagedSSHKey(Boolean(nextShare.share_managed_ssh_key && nextTarget.canShareManagedSSHKey));
    } catch (shareError) {
      toast.error(toErrorMessage(shareError));
    } finally {
      setShareLoading(false);
    }
  };

  const handleSaveShare = async () => {
    if (!shareTarget) return;

    setShareSaving(true);
    try {
      const nextShare = await saveCloudInstanceShare(
        shareTarget.provider,
        shareTarget.resourceType,
        shareTarget.resourceId,
        {
          title: shareTitle,
          note: shareNote,
          access_policy: shareAccessPolicy,
          expires_at: fromCloudShareDateTimeLocalValue(shareExpiresAt),
          share_password: sharePassword,
          share_managed_ssh_key: shareManagedSSHKey,
        },
      );
      setShareRecord(nextShare);
      setShareTitle(nextShare.title || shareTarget.resourceName);
      setShareNote(nextShare.note || "");
      setShareAccessPolicy(nextShare.access_policy || "public");
      setShareExpiresAt(toCloudShareDateTimeLocalValue(nextShare.expires_at));
      setSharePassword(Boolean(nextShare.share_password));
      setShareManagedSSHKey(Boolean(nextShare.share_managed_ssh_key));
      toast.success(t("cloud.share.save_success", "Share link saved"));
    } catch (shareError) {
      toast.error(toErrorMessage(shareError));
    } finally {
      setShareSaving(false);
    }
  };

  const handleDeleteShare = async () => {
    if (!shareTarget) return;

    const confirmed = await confirm({
      title: t("cloud.share.delete", "Revoke share link"),
      description: t("cloud.share.delete_confirm", {
        name: shareTarget.resourceName,
        defaultValue: `Revoke the share link for "${shareTarget.resourceName}"?`,
      }),
      confirmLabel: t("cloud.share.delete", "Revoke link"),
      tone: "warning",
    });
    if (!confirmed) return;

    setShareDeleting(true);
    try {
      await deleteCloudInstanceShare(
        shareTarget.provider,
        shareTarget.resourceType,
        shareTarget.resourceId,
      );
      setShareRecord(null);
      setShareNote("");
      setShareAccessPolicy("public");
      setShareExpiresAt("");
      setSharePassword(false);
      setShareManagedSSHKey(false);
      toast.success(t("cloud.share.delete_success", "Share link revoked"));
    } catch (shareError) {
      toast.error(toErrorMessage(shareError));
    } finally {
      setShareDeleting(false);
    }
  };

  const handleCopyShareLink = React.useCallback(() => {
    if (!shareUrl) return;
    void copyText(shareUrl);
  }, [copyText, shareUrl]);

  return {
    shareOpen,
    shareTarget,
    shareRecord,
    shareLoading,
    shareSaving,
    shareDeleting,
    shareTitle,
    setShareTitle,
    shareNote,
    setShareNote,
    shareAccessPolicy,
    setShareAccessPolicy,
    shareExpiresAt,
    setShareExpiresAt,
    sharePassword,
    setSharePassword,
    shareManagedSSHKey,
    setShareManagedSSHKey,
    shareUrl,
    handleShareOpenChange,
    handleOpenShareDialog,
    handleSaveShare,
    handleDeleteShare,
    handleCopyShareLink,
  };
}

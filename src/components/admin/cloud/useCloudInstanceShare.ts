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
  type CloudShareAccessPolicy,
  type CloudInstanceShareRecord,
} from "@/lib/cloudShare";
import { toErrorMessage } from "./awsPanelUtils";

type ConfirmDialog = (options: ConfirmDialogOptions) => Promise<boolean>;

type UseCloudInstanceShareOptions = {
  t: TFunction;
  confirm: ConfirmDialog;
  copyText: (text: string) => void | Promise<void>;
};

export function useCloudInstanceShare({
  t,
  confirm,
  copyText,
}: UseCloudInstanceShareOptions) {
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

  const shareUrl = React.useMemo(
    () => (shareRecord?.token ? buildCloudInstanceShareUrl(shareRecord.token) : ""),
    [shareRecord?.token],
  );

  const resetShareState = React.useCallback(() => {
    setShareTarget(null);
    setShareRecord(null);
    setShareLoading(false);
    setShareSaving(false);
    setShareDeleting(false);
    setShareAccessPolicy("public");
    setShareExpiresAt("");
  }, []);

  const handleShareOpenChange = React.useCallback(
    (open: boolean) => {
      setShareOpen(open);
      if (!open) {
        resetShareState();
      }
    },
    [resetShareState],
  );

  const openShareDialog = React.useCallback(
    async (target: CloudInstanceShareTarget) => {
      setShareTarget(target);
      setShareRecord(null);
      setShareTitle(target.resourceName);
      setShareNote("");
      setShareAccessPolicy("public");
      setShareExpiresAt("");
      setShareOpen(true);
      setShareLoading(true);

      try {
        const nextShare = await getCloudInstanceShare(
          target.provider,
          target.resourceType,
          target.resourceId,
        );
        setShareRecord(nextShare.token ? nextShare : null);
        setShareTitle(nextShare.title || target.resourceName);
        setShareNote(nextShare.note || "");
        setShareAccessPolicy(nextShare.access_policy || "public");
        setShareExpiresAt(toCloudShareDateTimeLocalValue(nextShare.expires_at));
      } catch (shareError) {
        toast.error(toErrorMessage(shareError));
      } finally {
        setShareLoading(false);
      }
    },
    [],
  );

  const handleSaveShare = React.useCallback(
    async () => {
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
            share_password: false,
            share_managed_ssh_key: false,
          },
        );
        setShareRecord(nextShare);
        setShareTitle(nextShare.title || shareTarget.resourceName);
        setShareNote(nextShare.note || "");
        setShareAccessPolicy(nextShare.access_policy || "public");
        setShareExpiresAt(toCloudShareDateTimeLocalValue(nextShare.expires_at));
        toast.success(t("cloud.share.save_success", "Share link saved"));
      } catch (shareError) {
        toast.error(toErrorMessage(shareError));
      } finally {
        setShareSaving(false);
      }
    },
    [shareAccessPolicy, shareExpiresAt, shareNote, shareTarget, shareTitle, t],
  );

  const handleDeleteShare = React.useCallback(
    async () => {
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
        toast.success(t("cloud.share.delete_success", "Share link revoked"));
      } catch (shareError) {
        toast.error(toErrorMessage(shareError));
      } finally {
        setShareDeleting(false);
      }
    },
    [confirm, shareTarget, t],
  );

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
    shareUrl,
    handleShareOpenChange,
    openShareDialog,
    handleSaveShare,
    handleDeleteShare,
    handleCopyShareLink,
  };
}

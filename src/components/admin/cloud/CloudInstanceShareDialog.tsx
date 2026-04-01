import { useTranslation } from "react-i18next";
import { Share2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CloudCopyBlock,
  CloudDetailItem,
  cloudDialogContentClassName,
  cloudLongTextClassName,
  cloudSecretTextareaClassName,
} from "@/components/admin/cloud/cloud-ui";
import {
  type CloudInstanceShareRecord,
  type CloudShareAccessPolicy,
  type CloudShareProvider,
  type CloudShareResourceType,
} from "@/lib/cloudShare";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  accessPolicy: CloudShareAccessPolicy;
  expiresAt: string;
  sharePassword: boolean;
  shareManagedSSHKey: boolean;
  shareUrl: string;
  onTitleChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onAccessPolicyChange: (value: CloudShareAccessPolicy) => void;
  onExpiresAtChange: (value: string) => void;
  onSharePasswordChange: (value: boolean) => void;
  onShareManagedSSHKeyChange: (value: boolean) => void;
  onCopyLink: () => void;
  onSave: () => void;
  onDelete: () => void;
};

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
  accessPolicy,
  expiresAt,
  sharePassword,
  shareManagedSSHKey,
  shareUrl,
  onTitleChange,
  onNoteChange,
  onAccessPolicyChange,
  onExpiresAtChange,
  onSharePasswordChange,
  onShareManagedSSHKeyChange,
  onCopyLink,
  onSave,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const shareStatus = share?.status || (share?.token ? "active" : "not_shared");
  const shareBannerClassName = shareStatus === "active"
    ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 dark:border-emerald-900/40 dark:bg-emerald-950/30"
    : "rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-900/40 dark:bg-amber-950/30";
  const shareBannerTitleClassName = shareStatus === "active"
    ? "text-sm font-medium text-emerald-900 dark:text-emerald-100"
    : "text-sm font-medium text-amber-900 dark:text-amber-100";
  const shareBannerCopyClassName = shareStatus === "active"
    ? "mt-3 border-emerald-200 bg-white/80"
    : "mt-3 border-amber-200 bg-white/80";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${cloudDialogContentClassName} max-h-[85vh] overflow-y-auto`}
      >
        <DialogHeader>
          <DialogTitle>{t("cloud.share.dialog_title", "Share Instance")}</DialogTitle>
          <DialogDescription>
            {t(
              "cloud.share.dialog_description",
              "Generate a read-only public link for one instance. You can choose whether to include the saved root password or managed SSH key.",
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-sm text-slate-500">
            {t("cloud.loading", "Loading cloud resources...")}
          </div>
        ) : target ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <CloudDetailItem label={t("cloud.share.instance", "Instance")} value={target.resourceName} />
              <CloudDetailItem label={t("cloud.share.provider", "Provider")} value={target.providerLabel} />
              <CloudDetailItem label={t("cloud.tokens.table.account", "Account")} value={target.credentialName || "-"} />
              <CloudDetailItem label={t("cloud.table.region", "Region")} value={target.region || "-"} />
              <CloudDetailItem label={t("cloud.table.ip", "Public IP")} value={target.primaryAddress || "-"} />
              <CloudDetailItem
                label={t("cloud.share.status", "Share Status")}
                value={share?.status
                  ? t(`cloud.share.status_${share.status}`, share.status)
                  : share?.token
                    ? t("cloud.share.enabled", "Enabled")
                    : t("cloud.share.status_not_shared", "Not Shared")}
              />
              <CloudDetailItem
                label={t("cloud.share.access_policy", "Access Policy")}
                value={accessPolicy === "single_use"
                  ? t("cloud.share.policy_single_use", "Single Use")
                  : t("cloud.share.policy_public", "Public")}
              />
              <CloudDetailItem
                label={t("cloud.share.expires_at", "Expires At")}
                value={share?.expires_at
                  ? new Date(share.expires_at).toLocaleString()
                  : t("cloud.share.never_expires", "Never")}
              />
            </div>

            {share?.token ? (
              <div className={shareBannerClassName}>
                <div className={shareBannerTitleClassName}>
                  {shareStatus === "active"
                    ? t("cloud.share.link_ready", "Share link is ready")
                    : t(`cloud.share.status_${shareStatus}`, shareStatus)}
                </div>
                <CloudCopyBlock
                  className={shareBannerCopyClassName}
                  title={t("cloud.share.public_link", "Public Link")}
                  copyLabel={t("common.copy", "Copy")}
                  onCopy={onCopyLink}
                >
                  <Textarea
                    className={cloudSecretTextareaClassName}
                    readOnly
                    rows={3}
                    value={shareUrl}
                  />
                </CloudCopyBlock>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <CloudDetailItem
                    label={t("cloud.share.access_count", "Access Count")}
                    value={String(share.access_count || 0)}
                    className="border-emerald-200 bg-white/80"
                  />
                  <CloudDetailItem
                    label={t("cloud.share.last_accessed_at", "Last Accessed")}
                    value={share.last_accessed_at ? new Date(share.last_accessed_at).toLocaleString() : "-"}
                    className="border-emerald-200 bg-white/80"
                  />
                  <CloudDetailItem
                    label={t("cloud.share.consumed_at", "Consumed At")}
                    value={share.consumed_at ? new Date(share.consumed_at).toLocaleString() : "-"}
                    className="border-emerald-200 bg-white/80"
                  />
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {t("cloud.share.custom_title", "Custom Title")}
              </label>
              <Input
                value={title}
                placeholder={target.resourceName}
                onChange={(event) => onTitleChange(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {t("cloud.share.access_policy", "Access Policy")}
              </label>
              <Select value={accessPolicy} onValueChange={(value) => onAccessPolicyChange(value as CloudShareAccessPolicy)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("cloud.share.access_policy", "Access Policy")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">{t("cloud.share.policy_public", "Public")}</SelectItem>
                  <SelectItem value="single_use">{t("cloud.share.policy_single_use", "Single Use")}</SelectItem>
                </SelectContent>
              </Select>
              <div className={`text-xs text-slate-500 dark:text-slate-400 ${cloudLongTextClassName}`}>
                {accessPolicy === "single_use"
                  ? t("cloud.share.policy_single_use_description", "The first successful visit can open the share. Later visits will be rejected.")
                  : t("cloud.share.policy_public_description", "Anyone with the link can open it until you revoke it or it expires.")}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {t("cloud.share.expires_at", "Expires At")}
              </label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => onExpiresAtChange(event.target.value)}
              />
              <div className={`text-xs text-slate-500 dark:text-slate-400 ${cloudLongTextClassName}`}>
                {t("cloud.share.expires_at_description", "Leave empty to keep the link valid until you revoke it manually.")}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {t("cloud.share.note", "Share Note")}
              </label>
              <Textarea
                className="min-h-28"
                value={note}
                placeholder={t("cloud.share.note_placeholder", "Optional note shown on the public share page")}
                onChange={(event) => onNoteChange(event.target.value)}
              />
            </div>

            {target.canSharePassword ? (
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                <Checkbox checked={sharePassword} onCheckedChange={(checked) => onSharePasswordChange(Boolean(checked))} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {t("cloud.share.include_password", "Include saved root password")}
                  </div>
                  <div className={`text-xs text-slate-500 dark:text-slate-400 ${cloudLongTextClassName}`}>
                    {t("cloud.share.include_password_description", "Anyone with the link will be able to view the stored root password.")}
                  </div>
                </div>
              </label>
            ) : null}

            {target.canShareManagedSSHKey ? (
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                <Checkbox checked={shareManagedSSHKey} onCheckedChange={(checked) => onShareManagedSSHKeyChange(Boolean(checked))} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {t("cloud.share.include_managed_key", "Include managed SSH key")}
                  </div>
                  <div className={`text-xs text-slate-500 dark:text-slate-400 ${cloudLongTextClassName}`}>
                    {t("cloud.share.include_managed_key_description", "Expose the managed SSH private key so the recipient can log in with the shared key pair.")}
                  </div>
                </div>
              </label>
            ) : null}

            <DialogFooter>
              {share?.token ? (
                <Button
                  variant="destructive"
                  onClick={onDelete}
                  disabled={deleting || saving}
                >
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
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

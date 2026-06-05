import { useTranslation } from "react-i18next";
import {
  Clock3,
  Copy,
  Globe2,
  KeyRound,
  Link2,
  LockKeyhole,
  Share2,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { AdminDialogLayout } from "@/components/admin/AdminForm";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Badge,
  CloudDetailDialogSkeleton,
  CloudDetailItem,
  cloudLongTextClassName,
} from "@/components/admin/cloud/cloud-ui";
import {
  type CloudInstanceShareRecord,
  type CloudShareAccessPolicy,
  type CloudShareProvider,
  type CloudShareResourceType,
  type CloudShareStatus,
} from "@/lib/cloudShare";
import { cn } from "@/lib/utils";

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

function formatShareDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function getShareStatusTone(status: CloudShareStatus | "not_shared") {
  if (status === "active") return "green";
  if (status === "expired" || status === "consumed") return "amber";
  return "gray";
}

function getSharePanelClassName(status: CloudShareStatus | "not_shared") {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/25";
  }

  if (status === "expired" || status === "consumed") {
    return "border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/25";
  }

  return "border-border bg-muted/35";
}

function PolicyOption({
  active,
  title,
  description,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-0 flex-1 items-start gap-3 border-l-2 px-3 py-2.5 text-left transition-colors",
        active
          ? "border-blue-500 bg-blue-50/70 text-blue-950 shadow-none dark:border-blue-500 dark:bg-blue-950/20 dark:text-blue-50"
          : "border-slate-200 bg-transparent text-foreground hover:bg-muted/40 dark:border-slate-800",
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md",
          active
            ? "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300"
            : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className={cn("mt-1 block text-xs leading-5 text-muted-foreground", cloudLongTextClassName)}>
          {description}
        </span>
      </span>
    </button>
  );
}

function ShareOptionRow({
  checked,
  disabled,
  title,
  description,
  icon,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  title: string;
  description: string;
  icon: React.ReactNode;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex min-w-0 items-start gap-3 border-l-2 px-3 py-2.5 transition-colors",
        disabled
          ? "border-slate-200 bg-muted/20 text-muted-foreground dark:border-slate-800"
          : checked
            ? "border-blue-500 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/20"
            : "border-slate-200 bg-transparent hover:bg-muted/40 dark:border-slate-800",
      )}
    >
      <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-muted-foreground dark:bg-slate-900/55">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className={cn("mt-1 block text-xs leading-5 text-muted-foreground", cloudLongTextClassName)}>
          {description}
        </span>
      </span>
      <Checkbox
        className="mt-1 shrink-0"
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange(Boolean(value))}
      />
    </label>
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
  const shareStatus: CloudShareStatus | "not_shared" = share?.status || (share?.token ? "active" : "not_shared");
  const shareStatusLabel = share?.status
    ? t(`cloud.share.status_${share.status}`, share.status)
    : share?.token
      ? t("cloud.share.enabled", "Enabled")
      : t("cloud.share.status_not_shared", "Not Shared");
  const hasLink = Boolean(share?.token && shareUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AdminDialogLayout
        title={t("cloud.share.dialog_title", "Share Instance")}
        description={t(
          "cloud.share.dialog_description",
          "Generate a read-only public link for one instance. You can choose whether to include the saved root password or managed SSH key.",
        )}
        descriptionClassName={cloudLongTextClassName}
        badge={
          target ? (
            <>
              <Badge color="blue" className="max-w-48 truncate">
                {target.providerLabel}
              </Badge>
              <Badge color={getShareStatusTone(shareStatus)}>{shareStatusLabel}</Badge>
            </>
          ) : null
        }
        wide
        className="sm:max-w-5xl"
        bodyClassName="p-0"
        footer={
          target && !loading ? (
            <>
              {share?.token ? (
                <Button
                  variant="destructive"
                  onClick={onDelete}
                  disabled={deleting || saving}
                  className="mr-auto"
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
                  ? t("cloud.share.saving", "保存中...")
                  : share?.token
                    ? t("cloud.share.update", "Update Share")
                    : t("cloud.share.create", "Create Share")}
              </Button>
            </>
          ) : null
        }
      >
        {loading ? (
          <div className="px-5 py-5">
            <CloudDetailDialogSkeleton rows={8} />
          </div>
        ) : target ? (
          <>
            <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0 space-y-5 overflow-y-auto px-5 py-5">
                <div className="border-b border-slate-200/80 pb-4 dark:border-slate-800">
                  <div className="flex min-w-0 items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                        {t("cloud.share.instance", "Instance")}
                      </div>
                      <div className={cn("mt-1 text-lg font-semibold text-foreground", cloudLongTextClassName)}>
                        {target.resourceName}
                      </div>
                    </div>
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-none">
                      <Share2 className="size-4" />
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <CloudDetailItem
                      label={t("cloud.tokens.table.account", "Account")}
                      value={target.credentialName || "-"}
                    />
                    <CloudDetailItem
                      label={t("cloud.table.region", "Region")}
                      value={target.region || "-"}
                    />
                    <CloudDetailItem
                      label={t("cloud.table.ip", "Public IP")}
                      value={target.primaryAddress || "-"}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">
                      {t("cloud.share.custom_title", "Custom Title")}
                    </label>
                    <Input
                      value={title}
                      placeholder={target.resourceName}
                      onChange={(event) => onTitleChange(event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">
                      {t("cloud.share.expires_at", "Expires At")}
                    </label>
                    <Input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(event) => onExpiresAtChange(event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {t("cloud.share.access_policy", "Access Policy")}
                    </div>
                    <div className={cn("mt-1 text-xs leading-5 text-muted-foreground", cloudLongTextClassName)}>
                      {t("cloud.share.access_policy_hint", "Choose how the recipient can open this public link.")}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <PolicyOption
                      active={accessPolicy === "public"}
                      title={t("cloud.share.policy_public", "Public")}
                      description={t(
                        "cloud.share.policy_public_description",
                        "Anyone with the link can open it until you revoke it or it expires.",
                      )}
                      icon={<Globe2 className="size-4" />}
                      onClick={() => onAccessPolicyChange("public")}
                    />
                    <PolicyOption
                      active={accessPolicy === "single_use"}
                      title={t("cloud.share.policy_single_use", "Single Use")}
                      description={t(
                        "cloud.share.policy_single_use_description",
                        "The first successful visit can open the share. Later visits will be rejected.",
                      )}
                      icon={<ShieldCheck className="size-4" />}
                      onClick={() => onAccessPolicyChange("single_use")}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-semibold text-foreground">
                    {t("cloud.share.exposure", "Included Secrets")}
                  </div>
                  <ShareOptionRow
                    checked={sharePassword}
                    disabled={!target.canSharePassword}
                    title={t("cloud.share.include_password", "Include saved root password")}
                    description={
                      target.canSharePassword
                        ? t(
                            "cloud.share.include_password_description",
                            "Anyone with the link will be able to view the stored root password.",
                          )
                        : t("cloud.share.password_unavailable", "No saved root password is available for this instance.")
                    }
                    icon={<KeyRound className="size-4" />}
                    onChange={onSharePasswordChange}
                  />
                  <ShareOptionRow
                    checked={shareManagedSSHKey}
                    disabled={!target.canShareManagedSSHKey}
                    title={t("cloud.share.include_managed_key", "Include managed SSH key")}
                    description={
                      target.canShareManagedSSHKey
                        ? t(
                            "cloud.share.include_managed_key_description",
                            "Expose the managed SSH private key so the recipient can log in with the shared key pair.",
                          )
                        : t("cloud.share.managed_key_unavailable", "No managed SSH key is available for this instance.")
                    }
                    icon={<LockKeyhole className="size-4" />}
                    onChange={onShareManagedSSHKeyChange}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">
                    {t("cloud.share.note", "Share Note")}
                  </label>
                  <Textarea
                    className="min-h-24"
                    value={note}
                    placeholder={t("cloud.share.note_placeholder", "可选，显示在公开分享页的备注")}
                    onChange={(event) => onNoteChange(event.target.value)}
                  />
                </div>
              </div>

              <aside className="min-w-0 border-t border-border bg-transparent px-5 py-5 lg:border-l lg:border-t-0">
                <div className={cn("border-l-2 px-3 py-2.5", getSharePanelClassName(shareStatus))}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        {hasLink
                          ? t("cloud.share.link_ready", "Share link is ready")
                          : t("cloud.share.link_not_created", "Share link not created")}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {shareStatusLabel}
                      </div>
                    </div>
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-white text-muted-foreground dark:bg-slate-950">
                      <Link2 className="size-4" />
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                      {t("cloud.share.public_link", "Public Link")}
                    </div>
                    <div className="flex min-w-0 gap-2">
                      <Input
                        readOnly
                        value={hasLink ? shareUrl : ""}
                        placeholder={t("cloud.share.link_placeholder", "Create the share to generate a public link")}
                        className="min-w-0 font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={!hasLink}
                        onClick={onCopyLink}
                        aria-label={t("common.copy", "复制")}
                        title={t("common.copy", "复制")}
                      >
                        <Copy className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <CloudDetailItem
                    label={t("cloud.share.access_count", "Access Count")}
                    value={String(share?.access_count || 0)}
                  />
                  <CloudDetailItem
                    label={t("cloud.share.last_accessed_at", "Last Accessed")}
                    value={formatShareDate(share?.last_accessed_at)}
                  />
                  <CloudDetailItem
                    label={t("cloud.share.consumed_at", "Consumed At")}
                    value={formatShareDate(share?.consumed_at)}
                  />
                  <CloudDetailItem
                    label={t("cloud.share.expires_at", "Expires At")}
                    value={share?.expires_at
                      ? formatShareDate(share.expires_at)
                      : t("cloud.share.never_expires", "Never")}
                  />
                </div>

                <div className="mt-4 border-t border-slate-200/80 pt-3 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Clock3 className="size-4 text-muted-foreground" />
                    {t("cloud.share.lifecycle", "Lifecycle")}
                  </div>
                  <div className={cn("mt-2 text-xs leading-5 text-muted-foreground", cloudLongTextClassName)}>
                    {expiresAt
                      ? t("cloud.share.lifecycle_with_expiry", "The share will stop working at the selected expiry time unless you revoke it first.")
                      : t("cloud.share.expires_at_description", "Leave empty to keep the link valid until you revoke it manually.")}
                  </div>
                </div>
              </aside>
            </div>
          </>
        ) : null}
      </AdminDialogLayout>
    </Dialog>
  );
}

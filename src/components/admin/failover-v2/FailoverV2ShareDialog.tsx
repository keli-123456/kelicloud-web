import React from "react";
import { useTranslation } from "react-i18next";
import { Clock3, Copy, Link2, Share2, ShieldCheck, Trash2 } from "lucide-react";

import { AdminDialogLayout } from "@/components/admin/AdminForm";
import { Badge } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  FailoverV2Service,
  FailoverV2ShareAccessPolicy,
  FailoverV2ShareRecord,
  FailoverV2ShareStatus,
} from "@/lib/failoverV2";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: FailoverV2Service | null;
  share: FailoverV2ShareRecord | null;
  loading: boolean;
  saving: boolean;
  deleting: boolean;
  title: string;
  note: string;
  accessPolicy: FailoverV2ShareAccessPolicy;
  expiresAt: string;
  shareUrl: string;
  onTitleChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onAccessPolicyChange: (value: FailoverV2ShareAccessPolicy) => void;
  onExpiresAtChange: (value: string) => void;
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

function getShareStatusTone(status: FailoverV2ShareStatus | "not_shared") {
  if (status === "active") return "green";
  if (status === "expired" || status === "consumed") return "amber";
  return "gray";
}

function PolicyButton({
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
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );
}

export default function FailoverV2ShareDialog({
  open,
  onOpenChange,
  service,
  share,
  loading,
  saving,
  deleting,
  title,
  note,
  accessPolicy,
  expiresAt,
  shareUrl,
  onTitleChange,
  onNoteChange,
  onAccessPolicyChange,
  onExpiresAtChange,
  onCopyLink,
  onSave,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const status: FailoverV2ShareStatus | "not_shared" = share?.status || (share?.token ? "active" : "not_shared");
  const statusLabel = share?.status
    ? t(`failover_v2.share.status_${share.status}`, { defaultValue: share.status })
    : share?.token
      ? t("failover_v2.share.enabled", { defaultValue: "已启用" })
      : t("failover_v2.share.status_not_shared", { defaultValue: "未分享" });
  const hasLink = Boolean(share?.token && shareUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AdminDialogLayout
        title={t("failover_v2.share.dialog_title", { defaultValue: "分享故障切换任务" })}
        description={t("failover_v2.share.dialog_description", {
          defaultValue: "生成一个只读公开链接，访问者只能查看任务状态、成员状态和最近执行记录。",
        })}
        badge={
          service ? (
            <>
              <Badge color="blue" className="max-w-48 truncate">
                {service.name}
              </Badge>
              <Badge color={getShareStatusTone(status)}>{statusLabel}</Badge>
            </>
          ) : null
        }
        wide
        className="sm:max-w-4xl"
        bodyClassName="space-y-5 py-5"
        footer={
          <>
            {share?.token ? (
              <Button
                type="button"
                variant="outline"
                onClick={onDelete}
                disabled={deleting || saving}
                className="mr-auto"
              >
                {deleting ? <Clock3 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                {t("failover_v2.share.revoke", { defaultValue: "撤销分享" })}
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel", { defaultValue: "取消" })}
            </Button>
            <Button type="button" onClick={onSave} disabled={saving || loading}>
              {saving ? <Clock3 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
              {share?.token
                ? t("common.update", { defaultValue: "更新" })
                : t("failover_v2.share.generate", { defaultValue: "生成链接" })}
            </Button>
          </>
        }
      >
          {loading ? (
            <div className="space-y-3">
              <div className="h-16 animate-pulse rounded-lg bg-muted" />
              <div className="h-36 animate-pulse rounded-lg bg-muted" />
              <div className="h-24 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : (
            <>
              <div className="grid gap-x-6 gap-y-3 border-b border-border pb-4 sm:grid-cols-3">
                <div className="px-1 py-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    {t("failover_v2.share.target_task", { defaultValue: "任务" })}
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-foreground">
                    {service?.name || "-"}
                  </div>
                </div>
                <div className="px-1 py-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    {t("failover_v2.share.member_scope", { defaultValue: "成员范围" })}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {service ? `${service.enabled_member_count} / ${service.member_count}` : "-"}
                  </div>
                </div>
                <div className="px-1 py-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    {t("failover_v2.share.access_count", { defaultValue: "访问次数" })}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {share?.access_count ?? 0}
                  </div>
                </div>
              </div>

              {hasLink ? (
                <div className="border-l-2 border-blue-500 bg-blue-50/70 px-3 py-2.5 dark:border-blue-500 dark:bg-blue-950/20">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-950 dark:text-blue-100">
                    <Link2 className="size-4" />
                    {t("failover_v2.share.public_link", { defaultValue: "公开只读链接" })}
                  </div>
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                    <Input className="font-mono text-xs" value={shareUrl} readOnly />
                    <Button type="button" onClick={onCopyLink}>
                      <Copy className="size-4" />
                      {t("common.copy", { defaultValue: "复制" })}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-y border-dashed border-border bg-transparent py-3 text-sm text-muted-foreground">
                  {t("failover_v2.share.no_link", { defaultValue: "保存后会生成只读分享链接。" })}
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="failover-v2-share-title">
                      {t("failover_v2.share.title_label", { defaultValue: "分享标题" })}
                    </Label>
                    <Input
                      id="failover-v2-share-title"
                      value={title}
                      onChange={(event) => onTitleChange(event.target.value)}
                      placeholder={service?.name || t("failover_v2.share.title_placeholder", { defaultValue: "默认使用任务名" })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("failover_v2.share.access_policy", { defaultValue: "访问策略" })}</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <PolicyButton
                        active={accessPolicy === "public"}
                        title={t("failover_v2.share.policy_public", { defaultValue: "公开只读" })}
                        description={t("failover_v2.share.policy_public_hint", {
                          defaultValue: "链接有效期内可多次查看，不允许编辑和操作。",
                        })}
                        icon={<ShieldCheck className="size-4" />}
                        onClick={() => onAccessPolicyChange("public")}
                      />
                      <PolicyButton
                        active={accessPolicy === "single_use"}
                        title={t("failover_v2.share.policy_single_use", { defaultValue: "一次性查看" })}
                        description={t("failover_v2.share.policy_single_use_hint", {
                          defaultValue: "首次访问后自动失效，适合临时排查。",
                        })}
                        icon={<Share2 className="size-4" />}
                        onClick={() => onAccessPolicyChange("single_use")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="failover-v2-share-note">
                      {t("failover_v2.share.note_label", { defaultValue: "备注" })}
                    </Label>
                    <Textarea
                      id="failover-v2-share-note"
                      className="min-h-24 resize-y"
                      value={note}
                      onChange={(event) => onNoteChange(event.target.value)}
                      placeholder={t("failover_v2.share.note_placeholder", { defaultValue: "给查看者补充一段说明，可留空。" })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="failover-v2-share-expires">
                      {t("failover_v2.share.expires_at", { defaultValue: "过期时间" })}
                    </Label>
                    <Input
                      id="failover-v2-share-expires"
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(event) => onExpiresAtChange(event.target.value)}
                    />
                    <div className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                      <Clock3 className="mt-0.5 size-3.5 shrink-0" />
                      <span>
                        {t("failover_v2.share.expires_hint", { defaultValue: "留空表示不过期。已过期或已消费的链接再次保存会换新链接。" })}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-200/80 pt-4 text-sm dark:border-slate-800">
                    <div className="font-semibold text-foreground">
                      {t("failover_v2.share.audit_info", { defaultValue: "分享状态" })}
                    </div>
                    <dl className="mt-3 space-y-2 text-xs text-muted-foreground">
                      <div className="flex justify-between gap-3">
                        <dt>{t("failover_v2.share.created_at", { defaultValue: "创建" })}</dt>
                        <dd className="text-right text-foreground">{formatShareDate(share?.created_at)}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt>{t("failover_v2.share.last_accessed_at", { defaultValue: "最近访问" })}</dt>
                        <dd className="text-right text-foreground">{formatShareDate(share?.last_accessed_at)}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt>{t("failover_v2.share.consumed_at", { defaultValue: "一次性消费" })}</dt>
                        <dd className="text-right text-foreground">{formatShareDate(share?.consumed_at)}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </>
          )}
      </AdminDialogLayout>
    </Dialog>
  );
}

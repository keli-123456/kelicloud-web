import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AdminSettingsSkeleton } from "@/components/admin/AdminPageShell";
import {
  SettingCardButton,
  SettingCardCollapse,
  SettingCardIconButton,
  SettingCardLabel,
  SettingCardShortTextInput,
} from "@/components/admin/SettingCard";
import UploadDialog from "@/components/UploadDialog";
import { useAccount } from "@/contexts/AccountContext";
import { PlatformAdminNotice } from "@/components/admin/PlatformAdminNotice";
import { updateSettingsWithToast, useSettings } from "@/lib/api";
import { formatApiErrorMessage, getReadableErrorMessage } from "@/lib/apiErrorMessage";
import { ADMIN_FORM_DIALOG_CLASS } from "@/components/admin/AdminFormStyles";

export default function SiteSettings() {
  const { t } = useTranslation();
  const { platformAdmin, loading: accountLoading } = useAccount();
  const { settings, loading, error } = useSettings("system", {
    enabled: platformAdmin,
  });

  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreXhr, setRestoreXhr] = useState<XMLHttpRequest | null>(null);

  const uploadBackup = async (file: File) => {
    if (!file.name.endsWith(".zip")) {
      toast.error(
        t(
          "theme.invalid_file_type",
          "Invalid file type, only .zip files are supported",
        ),
      );
      return;
    }

    setRestoring(true);
    setRestoreProgress(0);
    const formData = new FormData();
    formData.append("backup", file);

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      setRestoreXhr(xhr);

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percent = (event.loaded / event.total) * 100;
          setRestoreProgress(Math.round(percent));
        }
      });

      xhr.addEventListener("load", () => {
        try {
          const ok = xhr.status >= 200 && xhr.status < 300;
          const data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
          if (!ok || (data?.status && data.status !== "success")) {
            const message = formatApiErrorMessage(
              data?.message ||
                t("settings.site.backup_restore_error", "Restore backup failed"),
              { status: xhr.status },
            );
            toast.error(message);
            reject(new Error(message));
            return;
          }

          toast.success(t("account_settings.upload_success", "Upload success"));
          setRestoreOpen(false);
          setRestoreProgress(0);
          resolve();
        } catch (error) {
          toast.error(
            t("settings.site.backup_restore_error", "Restore backup failed"),
          );
          reject(error as Error);
        } finally {
          setRestoring(false);
          setRestoreXhr(null);
        }
      });

      xhr.addEventListener("error", () => {
        toast.error(
          t("settings.site.backup_restore_error", "Restore backup failed"),
        );
        setRestoring(false);
        setRestoreProgress(0);
        setRestoreXhr(null);
        reject(new Error(formatApiErrorMessage("Network error")));
      });

      xhr.addEventListener("abort", () => {
        toast.error(
          t(
            "settings.site.backup_restore_cancelled",
            "Backup restore cancelled",
          ),
        );
        setRestoring(false);
        setRestoreProgress(0);
        setRestoreXhr(null);
        reject(new Error(formatApiErrorMessage("Upload cancelled")));
      });

      xhr.open("POST", "/api/admin/upload/backup");
      xhr.send(formData);
    });
  };

  const cancelRestore = () => {
    restoreXhr?.abort();
  };

  if (accountLoading || loading) {
    return <AdminSettingsSkeleton sections={6} />;
  }

  if (!platformAdmin) {
    return <PlatformAdminNotice />;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <>
      <SettingCardLabel>{t("settings.site.title")}</SettingCardLabel>
      <SettingCardShortTextInput
        title={t("settings.site.name")}
        description={t("settings.site.name_description")}
        defaultValue={settings.sitename || ""}
        OnSave={async (value) => {
          await updateSettingsWithToast({ sitename: value }, t, "system");
        }}
      />
      <SettingCardShortTextInput
        title={t("settings.site.description")}
        description={t("settings.site.description_description")}
        defaultValue={settings.description || ""}
        OnSave={async (value) => {
          await updateSettingsWithToast({ description: value }, t, "system");
        }}
      />
      <SettingCardShortTextInput
        title={t("settings.site.subtitle")}
        description={t("settings.site.subtitle_description")}
        defaultValue={settings.site_subtitle || ""}
        OnSave={async (value) => {
          await updateSettingsWithToast({ site_subtitle: value }, t, "system");
        }}
      />
      <SettingCardShortTextInput
        title={t("settings.site.github_url")}
        description={t("settings.site.github_url_description")}
        defaultValue={settings.github_url || ""}
        OnSave={async (value) => {
          await updateSettingsWithToast({ github_url: value }, t, "system");
        }}
      />

      <SettingCardLabel>{t("settings.platform_tools_title")}</SettingCardLabel>
      <label className="-mt-4 text-sm text-muted-foreground">
        {t("settings.platform_tools_description")}
      </label>
      <SettingCardCollapse
        title={t("settings.custom.favicon", "Customize Favicon")}
        description={t(
          "settings.custom.favicon_description",
          "Icons displayed in browser tabs",
        )}
        defaultOpen
      >
        <div className="flex w-full flex-col items-start gap-2">
          <div className="flex items-center gap-2">
            {t("settings.custom.favicon_current", "Current Favicon")}
            <img
              src="/favicon.ico"
              alt={t("settings.custom.favicon", "Customize Favicon")}
              style={{ width: 32, height: 32 }}
            />
          </div>
          <label className="text-sm text-muted-foreground">
            {t(
              "settings.custom.favicon_note",
              "Favicon icons can be slow to update and it is often necessary to clear your browser's cache to see the changes.",
            )}
          </label>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-950/60"
                >
                  {t("settings.custom.favicon_default", "Restore Default")}
                </Button>
              </DialogTrigger>
              <DialogContent className={`${ADMIN_FORM_DIALOG_CLASS} sm:max-w-md`}>
                <DialogTitle>
                  {t("settings.custom.favicon_default", "Restore Default")}
                </DialogTitle>
                <DialogDescription>
                  {t(
                    "settings.custom.favicon_default_description",
                    "This will restore the default favicon icon. Do you want to continue?",
                  )}
                </DialogDescription>
                <DialogFooter className="border-t border-slate-200/70 pt-4 dark:border-slate-800/70">
                  <DialogClose asChild>
                    <Button variant="outline">{t("common.cancel", "Cancel")}</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        try {
                          const response = await fetch("/api/admin/update/favicon", {
                            method: "POST",
                          });
                          const data = await response.json();
                          if (data.status === "success") {
                            toast.success(
                              t(
                                "settings.custom.favicon_default_success",
                                "Default favicon has been restored",
                              ),
                            );
                            return;
                          }
                          toast.error(
                            data.message
                              ? formatApiErrorMessage(data.message)
                              : t(
                                "settings.custom.favicon_default_failed",
                                "Failed to restore default favicon",
                              ),
                          );
                        } catch (error) {
                          toast.error(getReadableErrorMessage(error));
                        }
                      }}
                    >
                      {t("settings.custom.favicon_confirm", "Confirm")}
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = async (event) => {
                  const file = (event.target as HTMLInputElement).files?.[0];
                  if (!file) return;

                  try {
                    const response = await fetch("/api/admin/update/favicon", {
                      method: "PUT",
                      body: file,
                      headers: {
                        "Content-Type": "application/octet-stream",
                      },
                    });
                    const data = await response.json();
                    if (data.status === "success") {
                      toast.success(
                        t(
                          "settings.custom.favicon_update_success",
                          "Favicon updated",
                        ),
                      );
                      return;
                    }
                    toast.error(
                      data.message
                        ? formatApiErrorMessage(data.message)
                        : t(
                          "settings.custom.favicon_update_failed",
                          "Failed to update favicon",
                        ),
                    );
                  } catch (error) {
                    toast.error(getReadableErrorMessage(error));
                  }
                };
                input.click();
              }}
            >
              {t("settings.custom.favicon_change", "Update Favicon")}
            </Button>
          </div>
        </div>
      </SettingCardCollapse>
      <SettingCardLabel>{t("settings.site.backup")}</SettingCardLabel>
      <SettingCardIconButton
        title={t("settings.site.backup_download")}
        description={t("settings.site.backup_download_description")}
        onClick={() => {
          window.open("/api/admin/download/backup", "_blank");
        }}
      >
        <DownloadIcon size={16} />
      </SettingCardIconButton>
      <SettingCardButton
        title={t("settings.site.backup_restore")}
        description={t("settings.site.backup_restore_description")}
        onClick={() => setRestoreOpen(true)}
      >
        {t("common.select")}
      </SettingCardButton>

      <UploadDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        title={t("settings.site.backup_restore")}
        description={t("settings.site.backup_restore_description")}
        accept=".zip"
        dragDropText={t("theme.drag_drop")}
        clickToBrowseText={t("theme.or_click_to_browse")}
        hintText={t("theme.zip_files_only")}
        uploading={restoring}
        progress={restoreProgress}
        cancelUploadLabel={t("common.cancel")}
        onCancelUpload={cancelRestore}
        onFileSelected={(file) => uploadBackup(file)}
        closeLabel={t("common.cancel")}
      />
    </>
  );
}

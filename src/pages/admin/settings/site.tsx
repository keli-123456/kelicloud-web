import { useTranslation } from "react-i18next";
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
import { updateSettingsWithToast, useSettings } from "@/lib/api";
import {
  SettingCardButton,
  SettingCardCollapse,
  SettingCardIconButton,
  SettingCardLabel,
  SettingCardLongTextInput,
  SettingCardShortTextInput,
  SettingCardSwitch,
} from "@/components/admin/SettingCard";
import { toast } from "sonner";
import Loading from "@/components/loading";
import { DownloadIcon } from "lucide-react";
import { useState } from "react";
import UploadDialog from "@/components/UploadDialog";
import { useAccount } from "@/contexts/AccountContext";
import { PlatformAdminNotice } from "@/components/admin/PlatformAdminNotice";

export default function SiteSettings() {
  const { t } = useTranslation();
  const { platformAdmin, loading: accountLoading } = useAccount();
  const { settings, loading, error, refetch } = useSettings("tenant");
  const [shareHours, setShareHours] = useState(1);

  // Restore backup dialog and upload state.
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreXhr, setRestoreXhr] = useState<XMLHttpRequest | null>(null);

  const uploadBackup = async (file: File) => {
    if (!file.name.endsWith(".zip")) {
      toast.error(
        t("theme.invalid_file_type", "Invalid file type, only .zip files are supported"),
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

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 100;
          setRestoreProgress(Math.round(percent));
        }
      });

      xhr.addEventListener("load", () => {
        try {
          const ok = xhr.status >= 200 && xhr.status < 300;
          const data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
          if (ok) {
            if (data && data.status && data.status !== "success") {
              // The server returned a non-success status.
              const msg =
                data.message ||
                t("settings.site.backup_restore_error", "Restore backup failed");
              toast.error(msg);
              reject(new Error(msg));
            } else {
              toast.success(t("account_settings.upload_success", "Upload success"));
              setRestoreOpen(false);
              setRestoreProgress(0);
              resolve();
            }
          } else {
            const msg =
              (data && data.message) ||
              t("settings.site.backup_restore_error", "Restore backup failed");
            toast.error(msg);
            reject(new Error(msg));
          }
        } catch (err) {
          toast.error(
            t("settings.site.backup_restore_error", "Restore backup failed"),
          );
          reject(err as Error);
        } finally {
          setRestoring(false);
          setRestoreXhr(null);
        }
      });

      xhr.addEventListener("error", () => {
        toast.error(t("settings.site.backup_restore_error", "Restore backup failed"));
        setRestoring(false);
        setRestoreProgress(0);
        setRestoreXhr(null);
        reject(new Error("Network error"));
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
        reject(new Error("Upload cancelled"));
      });

      xhr.open("POST", "/api/admin/upload/backup");
      xhr.send(formData);
    });
  };

  const cancelRestore = () => {
    if (restoreXhr) restoreXhr.abort();
  };

  if (accountLoading || loading) {
    return <Loading />;
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
        OnSave={async (data) => {
          await updateSettingsWithToast({ sitename: data }, t);
        }}
      />
      <SettingCardLongTextInput
        title={t("settings.site.description")}
        description={t("settings.site.description_description")}
        defaultValue={settings.description || ""}
        OnSave={async (data) => {
          await updateSettingsWithToast({ description: data }, t);
        }}
      />
      <SettingCardSwitch
        title={t("settings.site.send_ip_addr_to_guest")}
        description={t("settings.site.send_ip_addr_to_guest_description")}
        defaultChecked={settings.send_ip_addr_to_guest}
        onChange={async (checked) => {
          await updateSettingsWithToast({ send_ip_addr_to_guest: checked }, t);
        }}
      />
      <SettingCardShortTextInput
        title={t("settings.site.script_domain")}
        description={t("settings.site.script_domain_description")}
        placeholder={`${window.location.origin}`}
        defaultValue={settings.script_domain || ""}
        OnSave={async (data) => {
          await updateSettingsWithToast({ script_domain: data }, t);
        }}
      />
      <SettingCardShortTextInput
        title={t("settings.site.base_scripts_url", "Agent script source")}
        description={t(
          "settings.site.base_scripts_url_description",
          "Install script source used by one-click commands and auto-connect. Supports a GitHub repo URL, tree/blob URL, or raw URL. Leave empty to use the official repository.",
        )}
        placeholder="https://github.com/your-name/komari-agent"
        defaultValue={settings.base_scripts_url || ""}
        OnSave={async (data) => {
          await updateSettingsWithToast({ base_scripts_url: data }, t);
        }}
      />
      <SettingCardLabel>{t("settings.site.private_site")}</SettingCardLabel>
      <SettingCardSwitch
        title={t("settings.site.private_site")}
        description={t("settings.site.private_site_description")}
        defaultChecked={settings.private_site}
        onChange={async (checked) => {
          await updateSettingsWithToast({ private_site: checked }, t);
        }}
      />
      <SettingCardCollapse
        title={t("settings.site.tempory_share")}
        description={t("settings.site.tempory_share_description")}
      >
        <div className="flex w-full flex-col gap-2">
          <SettingCardShortTextInput
            title={t("settings.site.tempory_share_current_link")}
            value={
              settings.tempory_share_token
                ? `${window.location.origin}/?temp_key=${settings.tempory_share_token}`
                : ""
            }
            showSaveButton={false}
            description={`${t("admin.nodeTable.expiredAt")}: ${new Date((settings.tempory_share_token_expire_at || 0) * 1000).toLocaleString()}`}
            disabled
            bordless
          >
            <Button
              onClick={() => {
                if (!settings.tempory_share_token) return;
                navigator.clipboard.writeText(
                  `${window.location.origin}/?temp_key=${settings.tempory_share_token}`,
                );
                toast.success(t("copy"));
              }}
            >
              {t("copy")}
            </Button>
          </SettingCardShortTextInput>
          <SettingCardShortTextInput
            title={t("settings.site.tempory_share_hours")}
            bordless
            showSaveButton={false}
            value={shareHours}
            type="number"
            onChange={(e) => {
              try {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) {
                  setShareHours(val);
                }
              } catch {
                // ignore
              }
            }}
          ></SettingCardShortTextInput>
          <div className="flex flex-row w-full gap-2">
            <Button
              onClick={async () => {
                const chars =
                  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
                let key = "";
                for (let i = 0; i < 8; i++) {
                  key += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                await updateSettingsWithToast(
                  {
                    tempory_share_token: key,
                    tempory_share_token_expire_at:
                      Math.floor(Date.now() / 1000) + shareHours * 3600,
                  },
                  t,
                );
                await refetch();
              }}
            >
              {t("common.generate")}
            </Button>
            <Button
              variant="outline"
              className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
              onClick={async () => {
                await updateSettingsWithToast(
                  { tempory_share_token: "", tempory_share_token_expire_at: 0 },
                  t,
                );
                await refetch();
              }}
            >
              {t("settings.site.tempory_share_revoke")}
            </Button>
          </div>
        </div>
      </SettingCardCollapse>
      <SettingCardLabel>{t("settings.site.custom")}</SettingCardLabel>
      <label className="text-sm text-muted-foreground -mt-4">
        {t("settings.custom.note")}
      </label>
      <SettingCardLongTextInput
        title={t("settings.custom.header")}
        description={t("settings.custom.header_description")}
        defaultValue={settings.custom_head || ""}
        OnSave={async (data) => {
          await updateSettingsWithToast({ custom_head: data }, t);
        }}
      />
      <SettingCardLongTextInput
        title={t("settings.custom.body", "Custom Body")}
        description={t(
          "settings.custom.body_description",
          "Add custom content to the bottom of the page",
        )}
        defaultValue={settings.custom_body || ""}
        OnSave={async (data) => {
          await updateSettingsWithToast({ custom_body: data }, t);
        }}
      />
      {platformAdmin ? (
        <>
          <SettingCardLabel>{t("settings.platform_tools_title")}</SettingCardLabel>
          <label className="text-sm text-muted-foreground -mt-4">
            {t("settings.platform_tools_description")}
          </label>
          <SettingCardCollapse
            title={t("settings.custom.favicon", "Customize Favicon")}
            description={t(
              "settings.custom.favicon_description",
              "Icons displayed in browser tabs",
            )}
            defaultOpen={true}
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
                  <DialogContent>
                    <DialogTitle>
                      {t("settings.custom.favicon_default", "Restore Default")}
                    </DialogTitle>
                    <DialogDescription>
                      {t(
                        "settings.custom.favicon_default_description",
                        "This will restore the default favicon icon. Do you want to continue?",
                      )}
                    </DialogDescription>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">{t("common.cancel", "Cancel")}</Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button
                          variant="destructive"
                          onClick={async () => {
                            fetch("/api/admin/update/favicon", {
                              method: "POST",
                            })
                              .then((response) => {
                                return response.json();
                              })
                              .then((data) => {
                                if (data.status === "success") {
                                  toast.success(
                                    t(
                                      "settings.custom.favicon_default_success",
                                      "Default favicon has been restored",
                                    ),
                                  );
                                } else {
                                  toast.error(
                                    data.message ||
                                      t(
                                        "settings.custom.favicon_default_failed",
                                        "Failed to restore default favicon",
                                      ),
                                  );
                                }
                              })
                              .catch((error) => {
                                toast.error("" + error);
                              });
                          }}
                        >
                          {t("settings.custom.favicon_confirm", "Confirm")}
                        </Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button
                  onClick={async () => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        try {
                          const response = await fetch(
                            "/api/admin/update/favicon",
                            {
                              method: "PUT",
                              body: file,
                              headers: {
                                "Content-Type": "application/octet-stream",
                              },
                            },
                          );
                          const data = await response.json();
                          if (data.status === "success") {
                            toast.success(
                              t(
                                "settings.custom.favicon_update_success",
                                "Favicon updated",
                              ),
                            );
                          } else {
                            toast.error(
                              data.message ||
                                t(
                                  "settings.custom.favicon_update_failed",
                                  "Failed to update favicon",
                                ),
                            );
                          }
                        } catch (error) {
                          toast.error("" + error);
                        }
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
        </>
      ) : (
        <PlatformAdminNotice
          title={t("settings.platform_tools_title")}
          description={t("settings.platform_tools_restricted_description")}
        />
      )}

      {/* Backup upload dialog. */}
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

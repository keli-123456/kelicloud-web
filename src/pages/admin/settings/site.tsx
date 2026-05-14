import { useTranslation } from "react-i18next";
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
  SettingCardCollapse,
  SettingCardLabel,
  SettingCardShortTextInput,
} from "@/components/admin/SettingCard";
import { useAccount } from "@/contexts/AccountContext";
import { PlatformAdminNotice } from "@/components/admin/PlatformAdminNotice";
import { updateSettingsWithToast, useSettings } from "@/lib/api";
import {
  formatApiErrorMessage,
  getReadableErrorMessage,
} from "@/lib/apiErrorMessage";
import { ADMIN_FORM_DIALOG_CLASS } from "@/components/admin/AdminFormStyles";

const settingsPanelClass =
  "overflow-hidden rounded-lg border border-border bg-card px-4 py-2 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950";

export default function SiteSettings() {
  const { t } = useTranslation();
  const { platformAdmin, loading: accountLoading } = useAccount();
  const { settings, loading, error } = useSettings("system", {
    enabled: platformAdmin,
  });

  if (accountLoading || loading) {
    return <AdminSettingsSkeleton sections={4} />;
  }

  if (!platformAdmin) {
    return <PlatformAdminNotice />;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="grid gap-4">
      <section className={settingsPanelClass}>
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
      </section>
      <section className={settingsPanelClass}>
        <SettingCardLabel>{t("settings.platform_tools_title")}</SettingCardLabel>
        <div className="-mt-1 px-0 pb-1 text-sm text-muted-foreground">
          {t("settings.platform_tools_description")}
        </div>
        <SettingCardCollapse
          title={t("settings.custom.favicon", "Customize Favicon")}
          description={t(
            "settings.custom.favicon_description",
            "Icons displayed in browser tabs",
          )}
          defaultOpen
        >
          <div className="flex w-full flex-col items-start gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/25 px-3 py-2 text-sm">
              <img
                src="/favicon.ico"
                alt={t("settings.custom.favicon", "Customize Favicon")}
                className="h-8 w-8 rounded-md"
              />
              <span className="font-medium text-foreground">
                {t("settings.custom.favicon_current", "Current Favicon")}
              </span>
            </div>
            <label className="text-sm text-muted-foreground">
              {t(
                "settings.custom.favicon_note",
                "Favicon icons can be slow to update and it is often necessary to clear your browser's cache to see the changes.",
              )}
            </label>
            <div className="flex flex-wrap items-center gap-2">
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
      </section>
    </div>
  );
}

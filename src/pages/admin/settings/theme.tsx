import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Download,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  Settings,
  SquareArrowOutUpRight,
  Upload,
} from "lucide-react";

import Loading from "@/components/loading";
import UploadDialog from "@/components/UploadDialog";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { useSettings } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface Theme {
  id: string;
  name: string;
  short: string;
  description: string;
  author: string;
  version: string;
  preview?: string;
  url?: string;
  active: boolean;
  createdAt: string;
  configuration?: {
    data?: unknown[];
  } | null;
}

const ThemePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { publicInfo } = usePublicInfo();
  const {
    settings,
    loading: settingsLoading,
    refetch: refetchSettings,
  } = useSettings();

  const [themes, setThemes] = useState<Theme[]>([]);
  const [themesLoading, setThemesLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadXhr, setUploadXhr] = useState<XMLHttpRequest | null>(null);
  const [settingTheme, setSettingTheme] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState<Theme | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [themeToUpdate, setThemeToUpdate] = useState<Theme | null>(null);
  const [updating, setUpdating] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importChecking, setImportChecking] = useState(false);
  const [importInstalling, setImportInstalling] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    theme: Omit<Theme, "id" | "active" | "createdAt">;
    exists: boolean;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [activeThemeHasConfig, setActiveThemeHasConfig] = useState(false);

  const currentTheme = settings?.theme;
  const loading = themesLoading || settingsLoading || !currentTheme;

  const resetImportState = () => {
    setImportUrl("");
    setImportPreview(null);
    setImportError(null);
  };

  const openPreview = (theme: Theme) => {
    setSelectedTheme(theme);
    setPreviewDialogOpen(true);
  };

  const fetchThemes = async () => {
    try {
      const response = await fetch("/api/admin/theme/list");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const themeList = data.data || [];

      setThemes(
        themeList.map((theme: Theme) => ({
          ...theme,
          active: theme.short === currentTheme,
        })),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch themes");
    } finally {
      setThemesLoading(false);
    }
  };

  const uploadTheme = async (file: File) => {
    if (!file.name.endsWith(".zip")) {
      toast.error(t("theme.invalid_file_type"));
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append("file", file);

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      setUploadXhr(xhr);

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      xhr.addEventListener("load", async () => {
        if (xhr.status === 413) {
          toast.error(t("theme.uploda_413_content_too_large"));
          setUploading(false);
          setUploadProgress(0);
          setUploadXhr(null);
          return;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            JSON.parse(xhr.responseText);
            toast.success(t("theme.upload_success"));
            setUploadDialogOpen(false);
            setUploadProgress(0);
            await fetchThemes();
            resolve();
          } catch (err) {
            toast.error(`${t("theme.upload_failed")}: Parse error`);
            reject(err);
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            throw new Error(errorData.message || "Upload failed");
          } catch (err) {
            toast.error(
              `${t("theme.upload_failed")}: ${err instanceof Error ? err.message : "Unknown error"}`,
            );
            reject(err);
          }
        }

        setUploading(false);
        setUploadXhr(null);
      });

      xhr.addEventListener("error", () => {
        toast.error(`${t("theme.upload_failed")}: Network error`);
        setUploading(false);
        setUploadProgress(0);
        setUploadXhr(null);
        reject(new Error("Network error"));
      });

      xhr.addEventListener("abort", () => {
        toast.error(`${t("theme.upload_failed")}: Upload cancelled`);
        setUploading(false);
        setUploadProgress(0);
        setUploadXhr(null);
        reject(new Error("Upload cancelled"));
      });

      xhr.open("PUT", "/api/admin/theme/upload");
      xhr.send(formData);
    });
  };

  const cancelUpload = () => {
    if (uploadXhr) {
      uploadXhr.abort();
    }
  };

  const setActiveTheme = async (themeShort: string) => {
    try {
      setSettingTheme(themeShort);

      const response = await fetch(`/api/admin/theme/set?theme=${themeShort}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await refetchSettings();

      setThemes((prevThemes) =>
        prevThemes.map((theme) => ({
          ...theme,
          active: theme.short === themeShort,
        })),
      );

      const theme = themes.find((item) => item.short === themeShort);
      if (theme?.configuration?.data) {
        window.location.reload();
      }

      toast.success(t("theme.set_success"));
    } catch (err) {
      toast.error(
        `${t("theme.set_failed")}: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setSettingTheme(null);
    }
  };

  const updateTheme = async (themeShort: string) => {
    try {
      setUpdating(true);

      const response = await fetch("/api/admin/theme/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ short: themeShort, useOriginalUrl: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Update failed");
      }

      await fetchThemes();
      setUpdateDialogOpen(false);
      setPreviewDialogOpen(false);
      toast.success(t("theme.update_success"));
    } catch (err) {
      toast.error(
        `${t("theme.update_failed")}: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setUpdating(false);
    }
  };

  const deleteTheme = async (themeShort: string) => {
    try {
      if (themeShort === currentTheme) {
        await setActiveTheme("default");
        await refetchSettings();
      }

      const response = await fetch("/api/admin/theme/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ short: themeShort }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Delete failed");
      }

      await fetchThemes();
      setDeleteDialogOpen(false);
      setPreviewDialogOpen(false);
      toast.success(t("theme.delete_success"));
    } catch (err) {
      toast.error(
        `${t("theme.delete_failed")}: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  const previewImportTheme = async () => {
    if (!importUrl.trim()) return;

    setImportChecking(true);
    setImportPreview(null);
    setImportError(null);

    try {
      const response = await fetch("/api/admin/theme/import?preview=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const data = await response.json();

      if (!response.ok || data.status === "error") {
        setImportError(data.message || t("theme.import_failed"));
        return;
      }

      setImportPreview(data.data);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : t("theme.import_failed"),
      );
    } finally {
      setImportChecking(false);
    }
  };

  const confirmImportTheme = async () => {
    if (!importUrl.trim()) return;

    setImportInstalling(true);
    try {
      const response = await fetch("/api/admin/theme/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const data = await response.json();

      if (!response.ok || data.status === "error") {
        toast.error(data.message || t("theme.import_failed"));
        return;
      }

      toast.success(data.message || t("theme.import_success"));
      setImportDialogOpen(false);
      resetImportState();
      await fetchThemes();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("theme.import_failed"),
      );
    } finally {
      setImportInstalling(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const themeShort = currentTheme || publicInfo?.theme;
      if (!themeShort) {
        setActiveThemeHasConfig(false);
        return;
      }

      try {
        const response = await fetch(`/themes/${themeShort}/komari-theme.json`, {
          cache: "no-cache",
        });

        if (!response.ok) {
          setActiveThemeHasConfig(false);
          return;
        }

        const data = await response.json().catch(() => null);
        if (
          !cancelled &&
          data &&
          data.configuration &&
          Array.isArray(data.configuration.data) &&
          data.configuration.data.length > 0
        ) {
          setActiveThemeHasConfig(true);
        } else if (!cancelled) {
          setActiveThemeHasConfig(false);
        }
      } catch {
        if (!cancelled) {
          setActiveThemeHasConfig(false);
        }
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [currentTheme, publicInfo?.theme]);

  useEffect(() => {
    void fetchThemes();
  }, [currentTheme]);

  useEffect(() => {
    if (!settingsLoading && themes.length > 0) {
      setThemes((prevThemes) =>
        prevThemes.map((theme) => ({
          ...theme,
          active: theme.short === currentTheme,
        })),
      );
    }
  }, [currentTheme, settingsLoading, themes.length]);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <section className="flex flex-col gap-4 rounded-2xl border bg-card/70 p-5 shadow-sm lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-3)] text-[var(--accent-11)]">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {t("theme.title")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t(
                  "theme.upload_description",
                  "Upload, preview, update and switch storefront themes from one place.",
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{themes.length}</Badge>
            <span>{t("theme.no_themes", { defaultValue: "themes" })}</span>
            <span className="hidden text-border sm:inline">/</span>
            <span>
              {t("theme.active")}: {themes.find((theme) => theme.active)?.name || currentTheme}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeThemeHasConfig ? (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate("/admin/theme_managed")}
            >
              <Settings className="h-4 w-4" />
              {`${currentTheme}设置`}
            </Button>
          ) : null}
          <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            {t("theme.upload")}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              setImportDialogOpen(true);
              resetImportState();
            }}
          >
            <Download className="h-4 w-4" />
            {t("theme.import")}
          </Button>
        </div>
      </section>

      {themes.length === 0 ? (
        <Card className="border-dashed py-10">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-medium">{t("theme.no_themes")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("theme.upload_first_theme")}
              </p>
            </div>
            <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              {t("theme.upload")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {themes.map((theme) => {
            const isSetting = settingTheme === theme.short;

            return (
              <Card
                key={theme.id}
                className="overflow-hidden border-border/60 py-0 transition-all hover:border-[var(--accent-7)] hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => openPreview(theme)}
                  className="group relative aspect-video w-full overflow-hidden bg-gradient-to-br from-[var(--accent-3)] via-background to-[var(--accent-2)] text-left"
                >
                  {theme.preview ? (
                    <img
                      src={`/themes/${theme.short}/${theme.preview}`}
                      alt={theme.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                        event.currentTarget.nextElementSibling?.classList.remove(
                          "hidden",
                        );
                      }}
                    />
                  ) : null}
                  <div
                    className={`absolute inset-0 flex items-center justify-center ${
                      theme.preview ? "hidden" : ""
                    }`}
                  >
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent px-4 py-3 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {t("common.preview", "Preview")}
                  </div>
                  {theme.active ? (
                    <Badge
                      variant="success"
                      className="absolute right-3 top-3 rounded-full px-2.5 py-1"
                    >
                      {t("theme.active")}
                    </Badge>
                  ) : null}
                </button>

                <CardHeader className="space-y-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{theme.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {theme.description || t("theme.description")}
                    </CardDescription>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="truncate">by {theme.author}</span>
                    <Badge variant="outline">v{theme.version}</Badge>
                  </div>
                </CardHeader>

                <CardFooter className="justify-between gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPreview(theme)}
                  >
                    {t("common.preview", "Preview")}
                  </Button>
                  {theme.active ? (
                    <Button size="sm" disabled>
                      {t("theme.active")}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setActiveTheme(theme.short)}
                      disabled={isSetting}
                    >
                      {isSetting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Settings className="h-4 w-4" />
                      )}
                      {t("theme.set_active")}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        title={t("theme.upload_theme")}
        description={t("theme.upload_description")}
        accept=".zip"
        dragDropText={t("theme.drag_drop")}
        clickToBrowseText={t("theme.or_click_to_browse")}
        hintText={t("theme.zip_files_only")}
        uploading={uploading}
        progress={uploadProgress}
        uploadingText={t("theme.uploading")}
        cancelUploadLabel={t("common.cancel")}
        onCancelUpload={cancelUpload}
        onFileSelected={(file) => uploadTheme(file)}
        closeLabel={t("common.cancel")}
      />

      <Dialog
        open={previewDialogOpen}
        onOpenChange={(open) => {
          setPreviewDialogOpen(open);
          if (!open) {
            setSelectedTheme(null);
          }
        }}
      >
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-4xl">
          {selectedTheme ? (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <DialogTitle>{selectedTheme.name}</DialogTitle>
                      <Badge variant={selectedTheme.active ? "success" : "outline"}>
                        {selectedTheme.active
                          ? t("theme.active")
                          : `v${selectedTheme.version}`}
                      </Badge>
                    </div>
                    <DialogDescription>
                      {selectedTheme.description || t("theme.upload_description")}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
                <div className="overflow-hidden rounded-2xl border bg-muted/30">
                  <div className="aspect-video overflow-hidden bg-gradient-to-br from-[var(--accent-3)] via-background to-[var(--accent-2)]">
                    {selectedTheme.preview ? (
                      <img
                        src={`/themes/${selectedTheme.short}/${selectedTheme.preview}`}
                        alt={selectedTheme.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-14 w-14 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>

                <Card className="gap-4">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-base">
                      {t("theme.title")}
                    </CardTitle>
                    <CardDescription>
                      {t(
                        "theme.update_description",
                        "Review the package source, author and version before switching production traffic.",
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <div className="rounded-xl border bg-muted/30 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          {t("theme.author")}
                        </div>
                        <div className="mt-1 font-medium">{selectedTheme.author}</div>
                      </div>
                      <div className="rounded-xl border bg-muted/30 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          {t("theme.version")}
                        </div>
                        <div className="mt-1 font-medium">{selectedTheme.version}</div>
                      </div>
                    </div>

                    {selectedTheme.url ? (
                      <div className="rounded-xl border bg-muted/30 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          URL
                        </div>
                        <div className="mt-2 break-all text-sm text-muted-foreground">
                          {selectedTheme.url}
                        </div>
                        <Button asChild variant="outline" size="sm" className="mt-3 gap-2">
                          <a
                            href={selectedTheme.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <SquareArrowOutUpRight className="h-4 w-4" />
                            {t("theme.theme_link")}
                          </a>
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t("common.close")}</Button>
                </DialogClose>
                {!selectedTheme.active ? (
                  <Button
                    onClick={() => {
                      void setActiveTheme(selectedTheme.short);
                      setPreviewDialogOpen(false);
                    }}
                  >
                    {t("theme.set_active")}
                  </Button>
                ) : null}
                {selectedTheme.short !== "default" ? (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      setThemeToUpdate(selectedTheme);
                      setUpdateDialogOpen(true);
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t("theme.update")}
                  </Button>
                ) : null}
                {selectedTheme.short !== "default" ? (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setThemeToDelete(selectedTheme);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    {t("common.delete")}
                  </Button>
                ) : null}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("theme.confirm_delete")}</DialogTitle>
            <DialogDescription>
              {t("theme.delete_warning", { themeName: themeToDelete?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("common.cancel")}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={async () => {
                if (themeToDelete) {
                  await deleteTheme(themeToDelete.short);
                  setDeleteDialogOpen(false);
                  setThemeToDelete(null);
                }
              }}
            >
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("theme.update_theme")}</DialogTitle>
            <DialogDescription>
              {t("theme.update_description")}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
            {t("theme.update_mode_auto_description")}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("common.cancel")}</Button>
            </DialogClose>
            <Button
              disabled={updating}
              onClick={async () => {
                if (themeToUpdate) {
                  await updateTheme(themeToUpdate.short);
                  setUpdateDialogOpen(false);
                  setThemeToUpdate(null);
                }
              }}
            >
              {updating ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              {t("theme.update")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          setImportDialogOpen(open);
          if (!open) {
            resetImportState();
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("theme.import_title")}</DialogTitle>
            <DialogDescription>
              {t("theme.import_description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="https://github.com/owner/repo"
                value={importUrl}
                onChange={(event) => setImportUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !importChecking) {
                    void previewImportTheme();
                  }
                }}
                disabled={importChecking || importInstalling}
              />
              <Button
                onClick={previewImportTheme}
                disabled={!importUrl.trim() || importChecking || importInstalling}
                className="gap-2"
              >
                {importChecking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {t("theme.import_check")}
              </Button>
            </div>

            {importError ? (
              <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{importError}</span>
              </div>
            ) : null}

            {importPreview ? (
              <div className="space-y-4">
                <Separator />
                <Card>
                  <CardHeader className="gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">
                        {importPreview.theme.name}
                      </CardTitle>
                      <Badge variant={importPreview.exists ? "warning" : "info"}>
                        {importPreview.exists
                          ? t("theme.import_exists_warning")
                          : t("theme.import_check")}
                      </Badge>
                    </div>
                    <CardDescription>
                      {importPreview.theme.description || t("theme.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-xl border bg-muted/30 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {t("theme.author")}
                      </div>
                      <div className="mt-1 font-medium">
                        {importPreview.theme.author}
                      </div>
                    </div>
                    <div className="rounded-xl border bg-muted/30 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {t("theme.version")}
                      </div>
                      <div className="mt-1 font-medium">
                        {importPreview.theme.version}
                      </div>
                    </div>
                  </CardContent>
                  {importPreview.exists ? (
                    <CardFooter className="border-t pt-4">
                      <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{t("theme.import_exists_warning")}</span>
                      </div>
                    </CardFooter>
                  ) : null}
                </Card>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("common.cancel")}</Button>
            </DialogClose>
            {importPreview ? (
              <Button
                onClick={confirmImportTheme}
                disabled={importInstalling}
                className="gap-2"
              >
                {importInstalling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {t("theme.import_confirm")}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="text-sm text-muted-foreground">
        {t("theme.find_more")}
        <a
          href="https://komari-document.pages.dev/community/theme.html"
          target="_blank"
          rel="noreferrer"
          className="ml-1 font-medium text-[var(--accent-11)] hover:underline"
        >
          {t("theme.theme_link")}
        </a>
      </p>
    </div>
  );
};

export default ThemePage;

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleFadingArrowUp,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import LanguageSwitch from "../Language";
import ThemeSwitch from "../ThemeSwitch";
import LoginDialog from "../Login";
import Tips from "../ui/tips";
import {
  isAnyAccountFeatureAllowed,
  useAccount,
} from "@/contexts/AccountContext";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { useRPC2Call } from "@/contexts/RPC2Context";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { iconMap } from "@/utils/iconHelper";
import { cn } from "@/lib/utils";
import type { MenuItem } from "@/types/menu";
import menuConfig from "@/config/menuConfig.json";

const baseMenuItems = (menuConfig as { menu: MenuItem[] }).menu;
const SIDEBAR_COLLAPSED_STORAGE_KEY = "komari_admin_sidebar_collapsed";

interface ExtendedMenuItem extends MenuItem {
  rawLabel?: string;
}

interface AdminPanelBarProps {
  content: ReactNode;
}

interface GithubReleaseInfo {
  tag_name: string;
  name?: string;
  body?: string;
  html_url: string;
  published_at?: string;
  draft?: boolean;
  prerelease?: boolean;
}

interface MenuEntry {
  item: ExtendedMenuItem;
  active: boolean;
  activeChild: MenuItem | null;
}

const isExternalPath = (target: string) =>
  target.startsWith("http://") || target.startsWith("https://");

const normalizePath = (pathname: string) => {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
};

const hasMatchingSearchParams = (
  expected: URLSearchParams,
  actual: URLSearchParams,
) => {
  for (const [key, value] of expected.entries()) {
    if (actual.get(key) !== value) {
      return false;
    }
  }
  return true;
};

const isPathActive = (target: string, pathname: string, search = "") => {
  if (!target || isExternalPath(target)) {
    return false;
  }

  const currentUrl = new URL(
    `${normalizePath(pathname)}${search || ""}`,
    "https://komari.local",
  );
  const targetUrl = new URL(target, "https://komari.local");
  const currentPath = normalizePath(currentUrl.pathname);
  const targetPath = normalizePath(targetUrl.pathname);

  if (targetUrl.search) {
    return (
      currentPath === targetPath &&
      hasMatchingSearchParams(targetUrl.searchParams, currentUrl.searchParams)
    );
  }

  if (targetPath === "/admin") {
    return currentPath === "/admin";
  }

  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
};

const parseSemver = (input?: string | null): number[] | null => {
  if (!input) return null;
  const normalized = String(input).trim().replace(/^v/i, "");
  const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

const isNewerVersion = (latest?: string | null, current?: string | null) => {
  const left = parseSemver(latest);
  const right = parseSemver(current);
  if (!left || !right) return false;
  for (let index = 0; index < 3; index += 1) {
    if (left[index] > right[index]) return true;
    if (left[index] < right[index]) return false;
  }
  return false;
};

const getActiveChild = (
  item: ExtendedMenuItem,
  pathname: string,
  search: string,
) =>
  item.children?.find((child) => isPathActive(child.path, pathname, search)) ||
  null;

const getRequiredFeatureForPath = (target: string) => {
  if (!target || isExternalPath(target)) {
    return null;
  }

  const targetUrl = new URL(target, "https://komari.local");
  const normalizedPath = normalizePath(targetUrl.pathname);

  if (normalizedPath === "/admin/failover-v2" || normalizedPath.startsWith("/admin/failover-v2/")) {
    return "cloud_failover";
  }
  if (normalizedPath === "/admin/failover" || normalizedPath.startsWith("/admin/failover/")) {
    return "cloud_failover";
  }
  if (normalizedPath === "/admin/dns" || normalizedPath.startsWith("/admin/dns/")) {
    return "cloud_dns";
  }
  if (normalizedPath === "/admin/cloud") {
    const provider = targetUrl.searchParams.get("provider");
    if (provider === "digitalocean") {
      return "cloud_digitalocean";
    }
    if (provider === "linode") {
      return "cloud_linode";
    }
    if (provider === "azure") {
      return "cloud_azure";
    }
    if (provider === "aws") {
      return "cloud_aws";
    }
    return null;
  }
  if (normalizedPath.startsWith("/admin/notification")) {
    return "notifications";
  }
  if (normalizedPath.startsWith("/admin/exec")) {
    return "tasks";
  }
  if (normalizedPath.startsWith("/admin/scripts")) {
    return "clipboard";
  }
  if (normalizedPath.startsWith("/admin/ping")) {
    return "ping";
  }
  if (normalizedPath.startsWith("/admin/logs")) {
    return "logs";
  }
  if (normalizedPath === "/admin") {
    return "clients";
  }

  return null;
};

export default function AdminPanelBar({ content }: AdminPanelBarProps) {
  const { call } = useRPC2Call();
  const { account, hasFeature, platformAdmin } = useAccount();
  const { publicInfo } = usePublicInfo();
  const location = useLocation();
  const navigate = useNavigate();
  const ishttps = window.location.protocol === "https:";
  const [t] = useTranslation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [versionInfo, setVersionInfo] = useState<{
    hash: string;
    version: string;
  } | null>(null);
  const [latestRelease, setLatestRelease] = useState<GithubReleaseInfo | null>(
    null,
  );
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [releasesSince, setReleasesSince] = useState<GithubReleaseInfo[]>([]);
  const appName = publicInfo?.sitename?.trim() || "Komari";

  useEffect(() => {
    const fetchVersionInfo = async () => {
      try {
        const data = await call("common:getVersion");
        setVersionInfo({
          hash: data.hash?.slice(0, 7),
          version: data.version,
        });
      } catch (error) {
        console.error("Failed to fetch version info:", error);
      }
    };

    fetchVersionInfo();
  }, [call]);

  useEffect(() => {
    let ignore = false;
    const currentVersion = (publicInfo as any)?.version || versionInfo?.version;
    if (!currentVersion) return;

    async function loadReleases() {
      try {
        const response = await fetch(
          "https://api.github.com/repos/keli-123456/kelicloud/releases?per_page=100",
          {
            headers: {
              Accept: "application/vnd.github+json",
            },
            cache: "no-cache",
          },
        );
        if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
        const data: GithubReleaseInfo[] = await response.json();
        if (ignore) return;

        const valid = (data || [])
          .filter((release) => !release.draft && !release.prerelease)
          .filter((release) =>
            isNewerVersion(release?.tag_name || release?.name, currentVersion),
          );

        setReleasesSince(valid);
        setLatestRelease(valid.length ? valid[0] : null);
        setUpdateAvailable(valid.length > 0);
      } catch (error) {
        console.warn("加载 GitHub 最新发布失败:", error);
        if (!ignore) {
          setLatestRelease(null);
          setReleasesSince([]);
          setUpdateAvailable(false);
        }
      }
    }

    loadReleases();
    return () => {
      ignore = true;
    };
  }, [publicInfo, versionInfo]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore persistence failures
      }
      return next;
    });
  }, []);

  const getMenuLabel = (item: ExtendedMenuItem | MenuItem) =>
    (item as ExtendedMenuItem).rawLabel || t(item.labelKey);

  const isPlatformOnlyPath = useCallback((target: string) => {
    if (!target || isExternalPath(target)) {
      return false;
    }

    const targetUrl = new URL(target, "https://komari.local");
    return [
      "/admin/settings/site",
      "/admin/settings/custom",
      "/admin/settings/sign-on",
      "/admin/settings/notification",
      "/admin/notification/general",
      "/admin/users",
    ].includes(normalizePath(targetUrl.pathname));
  }, []);

  const isFeatureAllowedPath = useCallback(
    (target: string) => {
      if (!target || isExternalPath(target)) {
        return true;
      }
      const targetUrl = new URL(target, "https://komari.local");
      const normalizedPath = normalizePath(targetUrl.pathname);
      if (normalizedPath === "/admin/cloud") {
        const provider = targetUrl.searchParams.get("provider");
        if (!provider) {
          return isAnyAccountFeatureAllowed(account, [
            "cloud_digitalocean",
            "cloud_linode",
            "cloud_azure",
            "cloud_aws",
          ]);
        }
      }
      if (
        normalizedPath === "/admin/failover-v2"
        || normalizedPath.startsWith("/admin/failover-v2/")
        || normalizedPath === "/admin/failover"
        || normalizedPath.startsWith("/admin/failover/")
      ) {
        return hasFeature("cloud_failover") && hasFeature("cn_connectivity");
      }
      const feature = getRequiredFeatureForPath(target);
      if (!feature) {
        return true;
      }
      return hasFeature(feature);
    },
    [account, hasFeature],
  );

  const combinedMenuItems = useMemo<ExtendedMenuItem[]>(
    () =>
      baseMenuItems
        .map((item) => ({
          ...item,
          children: item.children?.filter(
            (child) =>
              (platformAdmin || !isPlatformOnlyPath(child.path)) &&
              isFeatureAllowedPath(child.path),
          ),
        }))
        .filter((item) => {
          if (platformAdmin || !isPlatformOnlyPath(item.path)) {
            return isFeatureAllowedPath(item.path) || Boolean(item.children?.length);
          }
          return false;
        }),
    [isFeatureAllowedPath, isPlatformOnlyPath, platformAdmin],
  );

  const primaryMenuItems = useMemo(
    () =>
      combinedMenuItems.filter(
        (item) =>
          !item.newTab &&
          !isExternalPath(String(item.path || "")),
      ),
    [combinedMenuItems],
  );

  const primaryMenuEntries = useMemo<MenuEntry[]>(
    () =>
      primaryMenuItems.map((item) => {
        const activeChild = getActiveChild(
          item,
          location.pathname,
          location.search,
        );
        const active =
          Boolean(activeChild) ||
          isPathActive(item.path, location.pathname, location.search);

        return {
          item,
          active,
          activeChild,
        };
      }),
    [location.pathname, location.search, primaryMenuItems],
  );

  const activeTopEntry = useMemo(
    () => primaryMenuEntries.find((entry) => entry.active) || primaryMenuEntries[0] || null,
    [primaryMenuEntries],
  );
  const activeTopItem = activeTopEntry?.item || null;
  const activeChildItem = activeTopEntry?.activeChild || null;
  const currentPageTitle =
    activeChildItem
      ? getMenuLabel(activeChildItem)
      : activeTopItem
        ? getMenuLabel(activeTopItem)
        : "Komari";
  useEffect(() => {
    setOpenMenus((prev) => {
      let changed = false;
      const next = { ...prev };

      primaryMenuItems.forEach((item) => {
        if (!item.children?.length || next[item.path] !== undefined) {
          return;
        }
        next[item.path] = true;
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [primaryMenuItems]);

  const setMenuOpen = (menuKey: string, open: boolean) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuKey]: open,
    }));
  };

  const logout = () => {
    window.open("/api/logout", "_self");
  };

  const renderMenuIcon = (
    icon: string,
    label: string,
    active = false,
    sizeClass = "h-4 w-4",
  ) => {
    const isLink = /^(https?:\/\/|\/|\.\/|\.\.\/)/.test(icon);
    if (isLink) {
      return (
        <img
          src={icon}
          alt={label}
          className={cn(sizeClass, "shrink-0 object-contain")}
          style={{ opacity: active ? 1 : 0.72 }}
          loading="lazy"
        />
      );
    }

    const IconComponent = iconMap[icon];
    if (!IconComponent) {
      return (
        <span
          className={cn(sizeClass, "inline-block shrink-0 rounded-[4px]")}
          style={{
            background: active ? "currentColor" : "var(--accent-6)",
            opacity: active ? 0.95 : 0.75,
          }}
        />
      );
    }

    return <IconComponent className={cn(sizeClass, "shrink-0")} />;
  };

  const renderMenuLeadingIcon = (
    icon: string,
    label: string,
    active = false,
    sizeClass = "size-5",
  ) => (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
      {renderMenuIcon(icon, label, active, sizeClass)}
    </span>
  );

  const navItemClass = (active = false, collapsed = false) =>
    cn(
      "flex min-h-9 items-center gap-2.5 rounded-md px-2.5 text-[14px] font-medium leading-5 text-foreground/80 transition-colors hover:bg-muted/60 hover:text-foreground",
      collapsed && "md:justify-center md:px-2",
      active && "bg-primary/10 font-semibold text-primary",
    );

  const subNavItemClass = (active = false) =>
    cn(
      "flex min-h-8 items-center gap-2 rounded-md px-2.5 py-1 text-[14px] leading-5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
      active && "bg-primary/10 font-medium text-primary",
    );

  const renderUpdateTrigger =
    updateAvailable && latestRelease && releasesSince.length > 0 ? (
      <Tips
        mode="dialog"
        trigger={
          <Button variant="outline" size="sm" className="h-7 rounded-md px-2 text-xs shadow-none">
            <CircleFadingArrowUp className="h-3.5 w-3.5" />
            {t("common.update_available")}
          </Button>
        }
      >
        <div className="flex max-w-[80vw] flex-col gap-2 md:max-w-[720px]">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Release
          </div>
          <label className="text-lg font-semibold tracking-tight">
            {t("common.update_available")}
          </label>
          <div className="text-sm text-muted-foreground">
            <span style={{ marginRight: 8 }}>
              {(publicInfo as any)?.version || versionInfo?.version}
            </span>
            <span>{"> "}</span>
            <span>{(latestRelease?.tag_name || latestRelease?.name) ?? ""}</span>
          </div>

          <div className="max-h-80 overflow-auto overscroll-contain rounded-md p-2 [scrollbar-gutter:stable]">
            <div className="flex flex-col gap-4 text-sm">
              {releasesSince.map((release) => (
                <div key={release.html_url} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {release.name || release.tag_name}
                    </div>
                    {release.published_at && (
                      <div className="text-[13px] text-muted-foreground">
                        {new Date(release.published_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap break-words">
                    {release.body || ""}
                  </div>
                  <div
                    style={{
                      height: 1,
                      background: "var(--accent-5)",
                      opacity: 0.5,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-slate-200 bg-white shadow-none hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900"
            >
              <a
                href={latestRelease.html_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Github
              </a>
            </Button>
          </div>
        </div>
      </Tips>
    ) : null;

  return (
    <div className="relative flex h-[100dvh] min-h-[100dvh] overflow-hidden bg-background">
      {mobileMenuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/20 md:hidden"
          aria-label={t("common.collapse_sidebar", "Collapse sidebar")}
          onClick={() => setMobileMenuOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border/80 bg-card shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none md:static md:inset-0 md:translate-x-0 md:transition-[width]",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed && "md:w-[72px]",
        )}
      >
        <div
          className={cn(
            "grid h-16 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border/70 px-5",
            sidebarCollapsed && "md:px-2",
          )}
        >
          <div />
          <Link
            to="/admin"
            className="justify-self-center text-lg font-semibold text-foreground"
          >
            <span className={cn(sidebarCollapsed && "md:hidden")}>{appName}</span>
            {sidebarCollapsed ? (
              <span className="hidden md:inline">
                {(appName || "K").trim().slice(0, 1).toUpperCase()}
              </span>
            ) : null}
          </Link>
          <div className="justify-self-end">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <nav
          className={cn(
            "flex-1 overflow-y-auto px-2.5 py-2.5",
            sidebarCollapsed && "md:px-2",
          )}
        >
          <div className="flex flex-col gap-0.5">
            {primaryMenuEntries.map((entry) => {
              const { item, active } = entry;
              const label = getMenuLabel(item);
              const menuKey = item.path;

              if (item.children?.length) {
                const isOpen = Boolean(openMenus[menuKey]);

                return (
                  <div key={item.path} className="space-y-0.5">
                    {sidebarCollapsed ? (
                      <div className="hidden md:block">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(navItemClass(active, true), "!flex !h-9 !w-full !rounded-md !p-0")}
                              title={label}
                              aria-label={label}
                            >
                              {renderMenuLeadingIcon(item.icon, label, active)}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            side="right"
                            align="start"
                            className="min-w-[240px]"
                          >
                            <DropdownMenuLabel>{label}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {item.children.map((child) => {
                              const childLabel = getMenuLabel(child);
                              const childActive = isPathActive(
                                child.path,
                                location.pathname,
                                location.search,
                              );

                              return (
                                <DropdownMenuItem
                                  key={child.path}
                                  className={cn(
                                    "cursor-pointer",
                                    childActive && "bg-accent text-accent-foreground",
                                  )}
                                  onSelect={() => navigate(child.path)}
                                >
                                  {renderMenuIcon(
                                    child.icon,
                                    childLabel,
                                    childActive,
                                    "h-4 w-4",
                                  )}
                                  <span className="truncate">{childLabel}</span>
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ) : null}

                    <Collapsible
                      open={isOpen}
                      onOpenChange={(open) => setMenuOpen(menuKey, open)}
                      className={cn(sidebarCollapsed && "md:hidden")}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            navItemClass(active),
                            "h-9 w-full justify-between px-2.5",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            {renderMenuLeadingIcon(item.icon, label, active)}
                            <span className="truncate">{label}</span>
                          </span>
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center text-slate-400 dark:text-slate-500">
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </span>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-0.5 pl-4 pt-0.5">
                        {item.children.map((child) => {
                          const childLabel = getMenuLabel(child);
                          const childActive = isPathActive(
                            child.path,
                            location.pathname,
                            location.search,
                          );

                          return (
                            <Link
                              key={child.path}
                              to={child.path}
                              onClick={() => setMobileMenuOpen(false)}
                              className={subNavItemClass(childActive)}
                            >
                              {renderMenuIcon(
                                child.icon,
                                childLabel,
                                childActive,
                                "h-4 w-4",
                              )}
                              <span className="truncate">{childLabel}</span>
                            </Link>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  title={label}
                  className={navItemClass(active, sidebarCollapsed)}
                >
                  {renderMenuLeadingIcon(item.icon, label, active)}
                  <span className={cn(sidebarCollapsed && "md:hidden")}>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="hidden border-t border-border/70 p-2 md:block">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="w-full"
            onClick={toggleSidebarCollapsed}
            title={t(
              sidebarCollapsed ? "common.expand_sidebar" : "common.collapse_sidebar",
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar",
            )}
            aria-label={t(
              sidebarCollapsed ? "common.expand_sidebar" : "common.collapse_sidebar",
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar",
            )}
          >
            {sidebarCollapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border/70 bg-background px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <div className="truncate text-base font-semibold text-foreground md:text-lg">
                  {currentPageTitle}
                </div>
                {renderUpdateTrigger}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {account && !account.logged_in && (
              <LoginDialog
                autoOpen
                showSettings={false}
                onLoginSuccess={() => window.location.reload()}
              />
            )}
            <ThemeSwitch />
            <LanguageSwitch />
            <Separator orientation="vertical" className="h-5" />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-background">
          <div className="mx-auto flex min-h-full w-full max-w-[1680px] min-w-0 flex-col">
            {!ishttps && (
              <div className="px-4 pt-4 md:px-6 md:pt-6">
                <Alert>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="currentColor"
                      d="M10.03 3.659c.856-1.548 3.081-1.548 3.937 0l7.746 14.001c.83 1.5-.255 3.34-1.969 3.34H4.254c-1.715 0-2.8-1.84-1.97-3.34zM12.997 17A.999.999 0 1 0 11 17a.999.999 0 0 0 1.997 0m-.259-7.853a.75.75 0 0 0-1.493.103l.004 4.501l.007.102a.75.75 0 0 0 1.493-.103l-.004-4.502z"
                    />
                  </svg>
                  <AlertTitle>{t("warn_https")}</AlertTitle>
                  <AlertDescription>
                    HTTP is currently in use. Switch the admin console to HTTPS to
                    avoid mixed security expectations.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {content}
          </div>
        </main>
      </div>
    </div>
  );
}

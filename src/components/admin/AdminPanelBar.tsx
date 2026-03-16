import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleFadingArrowUp,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import ColorSwitch from "../ColorSwitch";
import LanguageSwitch from "../Language";
import ThemeSwitch from "../ThemeSwitch";
import LoginDialog from "../Login";
import Tips from "../ui/tips";
import { useAccount } from "@/contexts/AccountContext";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { useRPC2Call } from "@/contexts/RPC2Context";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const footerMenuPaths = new Set<string>();

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

export default function AdminPanelBar({ content }: AdminPanelBarProps) {
  const { call } = useRPC2Call();
  const { account, platformAdmin, switchTenant, switchingTenant } = useAccount();
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
      "/admin/settings/sign-on",
      "/admin/settings/notification",
      "/admin/notification/general",
    ].includes(normalizePath(targetUrl.pathname));
  }, []);

  const combinedMenuItems = useMemo<ExtendedMenuItem[]>(
    () =>
      baseMenuItems
        .filter((item) => platformAdmin || !isPlatformOnlyPath(item.path))
        .map((item) => ({
          ...item,
          children: item.children?.filter(
            (child) => platformAdmin || !isPlatformOnlyPath(child.path),
          ),
        })),
    [isPlatformOnlyPath, platformAdmin],
  );

  const primaryMenuItems = useMemo(
    () =>
      combinedMenuItems.filter(
        (item) =>
          !footerMenuPaths.has(item.path) &&
          !item.newTab &&
          !isExternalPath(String(item.path || "")),
      ),
    [combinedMenuItems],
  );

  const footerMenuItems = useMemo(
    () => combinedMenuItems.filter((item) => footerMenuPaths.has(item.path)),
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
  const currentSectionTitle =
    activeChildItem && activeTopItem
      ? getMenuLabel(activeTopItem)
      : t("common.admin_console", "Admin Console");
  const versionLabel =
    (publicInfo as any)?.version ||
    (versionInfo && `${versionInfo.version} (${versionInfo.hash})`) ||
    null;
  const currentTenant = account?.current_tenant ?? null;
  const availableTenants = account?.tenants ?? [];

  useEffect(() => {
    if (!activeTopItem?.children?.length) return;
    setOpenMenus((prev) =>
      prev[activeTopItem.path]
        ? prev
        : {
            ...prev,
            [activeTopItem.path]: true,
          },
    );
  }, [activeTopItem]);

  const setMenuOpen = (menuKey: string, open: boolean) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuKey]: open,
    }));
  };

  const logout = () => {
    window.open("/api/logout", "_self");
  };

  const handleTenantChange = useCallback(
    async (tenantId: string) => {
      if (!tenantId || tenantId === currentTenant?.id) {
        return;
      }

      try {
        await switchTenant(tenantId);
        window.location.reload();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t("common.switch_tenant_failed", "Failed to switch tenant"),
        );
      }
    },
    [currentTenant?.id, switchTenant, t],
  );

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

  const renderUpdateTrigger =
    updateAvailable && latestRelease && releasesSince.length > 0 ? (
      <Tips
        mode="dialog"
        trigger={<CircleFadingArrowUp color="#FB4141" size="16" />}
      >
        <div className="flex max-w-[80vw] flex-col gap-2 md:max-w-[720px]">
          <label className="font-bold">{t("common.update_available")}</label>
          <div className="text-sm text-muted-foreground">
            <span style={{ marginRight: 8 }}>
              {(publicInfo as any)?.version || versionInfo?.version}
            </span>
            <span>{"> "}</span>
            <span>{(latestRelease?.tag_name || latestRelease?.name) ?? ""}</span>
          </div>

          <div className="max-h-80 overflow-auto rounded-md p-2">
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
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.12),_transparent_38%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.10),_transparent_35%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]">
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200/80 bg-white/95 shadow-sm transition-[transform,width] duration-200 ease-in-out md:static md:inset-0 md:translate-x-0 dark:border-slate-800/80 dark:bg-slate-950/90",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed && "md:w-[76px]",
        )}
      >
        <div
          className={cn(
            "grid h-16 grid-cols-[1fr_auto_1fr] items-center border-b border-slate-200/80 px-4 dark:border-slate-800/80",
            sidebarCollapsed && "md:px-2",
          )}
        >
          <div />
          <Link
            to="/admin"
            className="justify-self-center flex items-center gap-2 text-slate-900 dark:text-slate-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
              {appName.slice(0, 1).toUpperCase()}
            </span>
            <span
              className={cn(
                "truncate text-sm font-semibold tracking-tight",
                sidebarCollapsed && "md:hidden",
              )}
            >
              {appName}
            </span>
          </Link>
          <div className="justify-self-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <nav
          className={cn(
            "flex-1 space-y-1 overflow-y-auto px-3 py-4",
            sidebarCollapsed && "md:px-2",
          )}
        >
          {primaryMenuEntries.map((entry) => {
            const { item, active } = entry;
            const label = getMenuLabel(item);
            const menuKey = item.path;

            if (item.children?.length) {
              const isOpen = Boolean(openMenus[menuKey]);

              return (
                <div key={item.path} className="space-y-1">
                  {sidebarCollapsed ? (
                    <div className="hidden md:block">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-9 w-full rounded-md text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100",
                              active && "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
                            )}
                            title={label}
                            aria-label={label}
                          >
                            {renderMenuIcon(item.icon, label, active, "h-5 w-5")}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          side="right"
                          align="start"
                          className="min-w-[220px]"
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
                                  childActive && "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
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
                          "h-10 w-full justify-between rounded-md px-3 text-sm font-normal text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100",
                          active && "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          {renderMenuIcon(item.icon, label, active, "h-5 w-5")}
                          <span className="truncate">{label}</span>
                        </span>
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 pl-4 pt-1">
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
                            className={cn(
                              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                              childActive
                                ? "bg-slate-100 text-slate-900 font-medium dark:bg-slate-800 dark:text-slate-100"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100",
                            )}
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
                className={cn(
                  "flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  sidebarCollapsed && "md:justify-center md:px-2",
                  active
                    ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100",
                )}
              >
                {renderMenuIcon(item.icon, label, active, "h-5 w-5")}
                <span className={cn(sidebarCollapsed && "md:hidden")}>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div
          className={cn(
            "border-t border-slate-200/80 px-3 py-3 dark:border-slate-800/80",
            sidebarCollapsed && "md:px-2",
          )}
        >
          {!sidebarCollapsed && versionLabel ? (
            <div className="mb-3 px-1 text-xs text-slate-500 dark:text-slate-400">{versionLabel}</div>
          ) : null}
          <div className="space-y-1">
            {footerMenuItems.map((item) => {
              const label = getMenuLabel(item);
              const active = isPathActive(
                item.path,
                location.pathname,
                location.search,
              );

              return (
                <FooterNavItem
                  key={item.path}
                  item={item}
                  label={label}
                  icon={renderMenuIcon(item.icon, label, active, "h-4 w-4")}
                  collapsed={sidebarCollapsed}
                  active={active}
                />
              );
            })}
          </div>
        </div>

        <div className="hidden border-t border-slate-200/80 p-2 dark:border-slate-800/80 md:block">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-full rounded-md"
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

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur md:px-6 dark:border-slate-800/80 dark:bg-slate-950/75">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 md:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <div className="truncate text-base font-semibold text-slate-900 dark:text-slate-50 md:text-lg">
                  {currentPageTitle}
                </div>
                {renderUpdateTrigger}
              </div>
              <div className="truncate text-xs text-slate-500 dark:text-slate-400 md:text-sm">
                {currentSectionTitle}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {account?.logged_in && availableTenants.length > 0 ? (
              <Select
                value={currentTenant?.id ?? undefined}
                onValueChange={(tenantId) => {
                  void handleTenantChange(tenantId);
                }}
                disabled={switchingTenant}
              >
                <SelectTrigger
                  size="sm"
                  className="min-w-[180px] max-w-[240px]"
                  aria-label={t("common.tenant", "Tenant")}
                >
                  <SelectValue
                    placeholder={t("loading", "Loading...")}
                  />
                </SelectTrigger>
                <SelectContent align="end">
                  {availableTenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {account && !account.logged_in && (
              <LoginDialog
                autoOpen
                showSettings={false}
                onLoginSuccess={() => window.location.reload()}
              />
            )}
            <ThemeSwitch />
            <ColorSwitch />
            <LanguageSwitch />
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

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
            {!ishttps && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 shadow-sm dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  viewBox="0 0 24 24"
                  className="mt-0.5 shrink-0"
                >
                  <path
                    fill="currentColor"
                    d="M10.03 3.659c.856-1.548 3.081-1.548 3.937 0l7.746 14.001c.83 1.5-.255 3.34-1.969 3.34H4.254c-1.715 0-2.8-1.84-1.97-3.34zM12.997 17A.999.999 0 1 0 11 17a.999.999 0 0 0 1.997 0m-.259-7.853a.75.75 0 0 0-1.493.103l.004 4.501l.007.102a.75.75 0 0 0 1.493-.103l-.004-4.502z"
                  />
                </svg>
                <span className="text-sm font-medium">{t("warn_https")}</span>
              </div>
            )}

            {content}
          </div>
        </main>
      </div>
    </div>
  );
}

function FooterNavItem({
  item,
  label,
  icon,
  collapsed = false,
  active = false,
}: {
  item: MenuItem;
  label: string;
  icon: ReactNode;
  collapsed?: boolean;
  active?: boolean;
}) {
  const className = cn(
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
    collapsed && "justify-center px-2",
    active
      ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100",
  );

  if (item.newTab) {
    return (
      <a
        href={item.path}
        target="_blank"
        rel="noopener noreferrer"
        title={label}
        className={className}
      >
        {icon}
        {!collapsed && <span className="truncate">{label}</span>}
        {!collapsed && <ExternalLink className="ml-auto h-3.5 w-3.5" />}
      </a>
    );
  }

  return (
    <Link to={item.path} title={label} className={className}>
      {icon}
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

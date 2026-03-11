import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
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
import { resolveI18nText } from "@/utils/i18nText";
import { iconMap } from "@/utils/iconHelper";
import { cn } from "@/lib/utils";
import type { MenuItem } from "@/types/menu";
import menuConfig from "@/config/menuConfig.json";

const baseMenuItems = (menuConfig as { menu: MenuItem[] }).menu;

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

const hiddenAdminMenuPaths = new Set([
  "/admin/about",
  "/",
  "https://komari-document.pages.dev/",
]);

const isPathActive = (target: string, pathname: string) => {
  if (!target || target.startsWith("http://") || target.startsWith("https://")) {
    return false;
  }
  if (target === "/admin") {
    return pathname === "/admin";
  }
  return pathname === target || pathname.startsWith(`${target}/`);
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

export default function AdminPanelBar({ content }: AdminPanelBarProps) {
  const { call } = useRPC2Call();
  const { account } = useAccount();
  const { publicInfo } = usePublicInfo();
  const location = useLocation();
  const ishttps = window.location.protocol === "https:";
  const [t, i18n] = useTranslation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<Record<string, boolean>>(
    {},
  );
  const [versionInfo, setVersionInfo] = useState<{
    hash: string;
    version: string;
  } | null>(null);
  const [extraMenuItems, setExtraMenuItems] = useState<ExtendedMenuItem[]>([]);
  const [latestRelease, setLatestRelease] = useState<GithubReleaseInfo | null>(
    null,
  );
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [releasesSince, setReleasesSince] = useState<GithubReleaseInfo[]>([]);

  const currentLanguage =
    i18n.resolvedLanguage ||
    i18n.language ||
    (typeof navigator !== "undefined" ? navigator.language : "");
  const currentTheme = publicInfo?.theme;

  useEffect(() => {
    let ignore = false;

    async function loadThemeMenu() {
      if (!currentTheme) {
        setExtraMenuItems([]);
        return;
      }

      try {
        const response = await fetch(`/themes/${currentTheme}/komari-theme.json`, {
          cache: "no-cache",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (ignore) return;

        const config = data?.configuration;
        if (!config) {
          setExtraMenuItems([]);
          return;
        }

        const rawLabel =
          resolveI18nText(config.name, currentLanguage) ??
          t("theme.manage_with_name", {
            name: currentTheme === "default" ? "" : currentTheme,
          });

        setExtraMenuItems([
          {
            labelKey: rawLabel,
            rawLabel,
            path: "/admin/theme_managed",
            icon: config.icon || "Palette",
          },
        ]);
      } catch (error) {
        console.warn("加载主题配置失败，将不扩展主题菜单:", error);
        if (!ignore) setExtraMenuItems([]);
      }
    }

    loadThemeMenu();
    return () => {
      ignore = true;
    };
  }, [currentLanguage, currentTheme, t]);

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
          "https://api.github.com/repos/komari-monitor/komari/releases?per_page=100",
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

  const combinedMenuItems = useMemo<ExtendedMenuItem[]>(
    () => [...baseMenuItems, ...extraMenuItems],
    [extraMenuItems],
  );

  const visibleMenuItems = useMemo(
    () =>
      combinedMenuItems.filter((item) => !hiddenAdminMenuPaths.has(item.path)),
    [combinedMenuItems],
  );

  const internalTopItems = useMemo(
    () =>
      visibleMenuItems.filter(
        (item) =>
          !item.newTab &&
          !String(item.path || "").startsWith("http://") &&
          !String(item.path || "").startsWith("https://"),
      ),
    [visibleMenuItems],
  );

  const activeTopItem = useMemo(() => {
    const active = internalTopItems.find((item) => {
      if (item.children?.length) {
        return item.children.some((child) =>
          isPathActive(child.path, location.pathname),
        );
      }
      return isPathActive(item.path, location.pathname);
    });
    return active || internalTopItems[0] || null;
  }, [internalTopItems, location.pathname]);

  const currentSubmenuItems = activeTopItem?.children || [];

  useEffect(() => {
    if (!activeTopItem?.path || !activeTopItem.children?.length) return;
    setMobileExpanded((prev) => ({
      ...prev,
      [activeTopItem.path]: true,
    }));
  }, [activeTopItem]);

  const logout = () => {
    window.open("/api/logout", "_self");
  };

  const getMenuLabel = (item: ExtendedMenuItem | MenuItem) =>
    (item as ExtendedMenuItem).rawLabel || t(item.labelKey);

  const renderMenuIcon = (
    icon: string,
    labelKey: string,
    active = false,
    className?: string,
  ) => {
    const isLink = /^(https?:\/\/|\/|\.\/|\.\.\/)/.test(icon);
    if (isLink) {
      return (
        <img
          src={icon}
          alt={t(labelKey)}
          className={className}
          style={{
            width: 16,
            height: 16,
            objectFit: "contain",
            opacity: active ? 1 : 0.7,
          }}
          loading="lazy"
        />
      );
    }

    const IconComponent = iconMap[icon];
    if (!IconComponent) {
      return (
        <span
          className={className}
          style={{
            width: 16,
            height: 16,
            display: "inline-block",
            borderRadius: 4,
            background: "var(--accent-8)",
          }}
        />
      );
    }

    return (
      <IconComponent
        className={className}
        style={{
          color: active ? "var(--accent-10)" : "var(--gray-11)",
        }}
      />
    );
  };

  const renderUpdateTrigger = updateAvailable &&
    latestRelease &&
    releasesSince.length > 0 && (
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
                      <div className="text-xs text-muted-foreground">
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
              className="border-slate-200 bg-white shadow-none hover:bg-slate-50"
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
    );

  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen flex-col px-3 md:px-6">
        <header className="border-b border-slate-200/80 bg-white py-3 md:py-4">
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu size={18} />
              </Button>
              <a href="/" target="_blank" rel="noopener noreferrer">
                <span className="text-xl font-semibold tracking-tight text-slate-900">
                  Komari
                </span>
              </a>
              {renderUpdateTrigger}
              <span className="hidden text-sm text-muted-foreground xl:block">
                {(publicInfo as any)?.version ||
                  (versionInfo &&
                    `${versionInfo.version} (${versionInfo.hash})`)}
              </span>
            </div>

            <nav className="hidden min-w-0 flex-1 items-center gap-4 overflow-x-auto px-3 md:flex">
              {internalTopItems.map((item) => {
                const active =
                  item.children?.some((child) =>
                    isPathActive(child.path, location.pathname),
                  ) || isPathActive(item.path, location.pathname);

                return (
                  <TopNavItem
                    key={item.path}
                    href={item.path}
                    active={active}
                    label={getMenuLabel(item)}
                    icon={renderMenuIcon(item.icon, item.labelKey, active)}
                  />
                );
              })}
            </nav>

            <div className="ml-auto flex items-center gap-2 overflow-x-auto">
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
                variant="outline"
                size="icon"
                className="h-8 w-8 border-slate-200 bg-white text-slate-600 shadow-none hover:bg-slate-50"
                onClick={logout}
              >
                <LogOut size={16} />
              </Button>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 gap-6 py-5">
          {currentSubmenuItems.length > 0 && (
            <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200/80 pr-5 md:flex">
              <nav className="flex flex-col gap-1 py-1">
                {currentSubmenuItems.map((item) => (
                  <SubmenuItem
                    key={item.path}
                    href={item.path}
                    active={isPathActive(item.path, location.pathname)}
                    label={getMenuLabel(item)}
                    icon={renderMenuIcon(
                      item.icon,
                      item.labelKey,
                      isPathActive(item.path, location.pathname),
                    )}
                    newTab={item.newTab}
                  />
                ))}
              </nav>
            </aside>
          )}

          <main className="min-w-0 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto py-1 md:py-2">
              {!ishttps && (
                <div className="mb-3 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
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

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 flex w-[88vw] max-w-[360px] flex-col border-r border-slate-200 bg-white"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-4">
                <div>
                  <div className="text-lg font-semibold tracking-tight text-slate-900">
                    Komari
                  </div>
                  <div className="block text-xs text-slate-500">
                    管理后台导航
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X size={18} />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-3">
                <div className="flex flex-col gap-2">
                  {internalTopItems.map((item) => {
                    const active =
                      item.children?.some((child) =>
                        isPathActive(child.path, location.pathname),
                      ) || isPathActive(item.path, location.pathname);
                    const expanded = Boolean(mobileExpanded[item.path]);

                    if (!item.children?.length) {
                      return (
                        <TopNavItem
                          key={item.path}
                          href={item.path}
                          active={active}
                          label={getMenuLabel(item)}
                          icon={renderMenuIcon(item.icon, item.labelKey, active)}
                          mobile
                          onNavigate={() => setMobileMenuOpen(false)}
                        />
                      );
                    }

                    return (
                      <div key={item.path} className="overflow-hidden border-b border-slate-200/70">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between px-4 py-3 text-left"
                          onClick={() =>
                            setMobileExpanded((prev) => ({
                              ...prev,
                              [item.path]: !prev[item.path],
                            }))
                          }
                        >
                          <div className="flex items-center gap-3">
                            {renderMenuIcon(item.icon, item.labelKey, active)}
                            <span className="font-medium text-slate-900">
                              {getMenuLabel(item)}
                            </span>
                          </div>
                          {expanded ? (
                            <ChevronDown size={16} className="text-slate-500" />
                          ) : (
                            <ChevronRight size={16} className="text-slate-500" />
                          )}
                        </button>
                        <AnimatePresence initial={false}>
                          {expanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-slate-200/70 px-2 py-2">
                                {item.children.map((child) => (
                                  <SubmenuItem
                                    key={child.path}
                                    href={child.path}
                                    active={isPathActive(child.path, location.pathname)}
                                    label={getMenuLabel(child)}
                                    icon={renderMenuIcon(
                                      child.icon,
                                      child.labelKey,
                                      isPathActive(child.path, location.pathname),
                                    )}
                                    newTab={child.newTab}
                                    onNavigate={() => setMobileMenuOpen(false)}
                                  />
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function TopNavItem({
  href,
  label,
  icon,
  active,
  mobile = false,
  onNavigate,
}: {
  href: string;
  label: ReactNode;
  icon: ReactNode;
  active: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      to={href}
      onClick={onNavigate}
      className={cn(
        "inline-flex items-center gap-2 border-b-2 px-1 py-2 text-sm font-medium transition-colors",
        mobile
          ? "w-full border-b border-transparent px-4 py-3 text-slate-700"
          : "shrink-0",
        active
          ? "border-slate-900 text-slate-900"
          : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900",
      )}
    >
      <span className="flex h-4 w-4 items-center justify-center">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function SubmenuItem({
  href,
  label,
  icon,
  active,
  newTab,
  onNavigate,
}: {
  href: string;
  label: ReactNode;
  icon: ReactNode;
  active: boolean;
  newTab?: boolean;
  onNavigate?: () => void;
}) {
  const className = cn(
    "flex items-center gap-3 border-l-2 px-3 py-2 text-sm transition-colors",
    active
      ? "border-slate-900 text-slate-900"
      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900",
  );

  if (newTab) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onNavigate}
      >
        <span className="flex h-4 w-4 items-center justify-center">{icon}</span>
        <span className="flex-1">{label}</span>
        <ExternalLink size={14} />
      </a>
    );
  }

  return (
    <Link to={href} onClick={onNavigate} className={className}>
      <span className="flex h-4 w-4 items-center justify-center">{icon}</span>
      <span className="flex-1">{label}</span>
    </Link>
  );
}

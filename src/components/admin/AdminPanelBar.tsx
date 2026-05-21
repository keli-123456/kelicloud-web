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
  type Account,
  type AccountFeature,
  useAccount,
} from "@/contexts/AccountContext";
import {
  AdminPageTitleProvider,
  useCurrentAdminPageHeader,
} from "@/contexts/AdminPageTitleContext";
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
import { Separator } from "@/components/ui/separator";
import { iconMap } from "@/utils/iconHelper";
import { cn } from "@/lib/utils";
import type { MenuItem } from "@/types/menu";
import menuConfig from "@/config/menuConfig.json";

const baseMenuItems = (menuConfig as { menu: MenuItem[] }).menu;
const SIDEBAR_COLLAPSED_STORAGE_KEY = "komari_admin_sidebar_collapsed";
const HTTPS_NOTICE_DISMISSED_STORAGE_KEY = "komari_admin_https_notice_dismissed";

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

interface MenuGroup {
  key: "overview" | "infrastructure" | "operations" | "governance";
  labelKey: string;
  defaultLabel: string;
  entries: MenuEntry[];
}

const NAV_GROUP_ORDER: MenuGroup["key"][] = [
  "overview",
  "infrastructure",
  "operations",
  "governance",
];

const NAV_GROUP_META: Record<
  MenuGroup["key"],
  { labelKey: string; defaultLabel: string }
> = {
  overview: {
    labelKey: "admin.nav.groups.overview",
    defaultLabel: "Home",
  },
  infrastructure: {
    labelKey: "admin.nav.groups.infrastructure",
    defaultLabel: "Infrastructure",
  },
  operations: {
    labelKey: "admin.nav.groups.operations",
    defaultLabel: "Operations",
  },
  governance: {
    labelKey: "admin.nav.groups.governance",
    defaultLabel: "Governance",
  },
};

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
    return "cloud_failover_v2";
  }
  if (normalizedPath === "/admin/failover" || normalizedPath.startsWith("/admin/failover/")) {
    return "cloud_failover_v1";
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
    if (provider === "vultr") {
      return "cloud_vultr";
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
  if (normalizedPath.startsWith("/admin/logs")) {
    return "logs";
  }
  if (normalizedPath === "/admin" || normalizedPath === "/admin/client") {
    return "clients";
  }

  return null;
};

const getMenuGroupKey = (target: string): MenuGroup["key"] => {
  if (!target || isExternalPath(target)) {
    return "governance";
  }

  const targetUrl = new URL(target, "https://komari.local");
  const normalizedPath = normalizePath(targetUrl.pathname);

  if (normalizedPath === "/admin") {
    return "overview";
  }

  if (
    normalizedPath === "/admin/client" ||
    normalizedPath === "/admin/cloud" ||
    normalizedPath.startsWith("/admin/failover") ||
    normalizedPath === "/admin/dns" ||
    normalizedPath === "/admin/proxy"
  ) {
    return "infrastructure";
  }

  if (
    normalizedPath.startsWith("/admin/exec") ||
    normalizedPath.startsWith("/admin/scripts") ||
    normalizedPath.startsWith("/admin/audit") ||
    normalizedPath.startsWith("/admin/sessions")
  ) {
    return "operations";
  }

  return "governance";
};

const isCloudMenuParent = (item: MenuItem) => {
  if (!item.path || isExternalPath(item.path)) {
    return false;
  }

  const targetUrl = new URL(item.path, "https://komari.local");
  return normalizePath(targetUrl.pathname) === "/admin/cloud" && !targetUrl.search;
};

const formatAccountPlanExpiry = (account: Account | null, fallback: string) => {
  const value = account?.plan_expires_at?.trim();
  if (!value) {
    return fallback;
  }
  const parsed = new Date(value.includes("T") ? value : `${value}T23:59:59`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString();
};

const getAccountStatusDotClass = (status?: string) => {
  if (status === "disabled") {
    return "bg-red-500 shadow-red-500/30";
  }
  if (status === "expired") {
    return "bg-amber-500 shadow-amber-500/30";
  }
  return "bg-emerald-500 shadow-emerald-500/30";
};

export default function AdminPanelBar(props: AdminPanelBarProps) {
  return (
    <AdminPageTitleProvider>
      <AdminPanelBarContent {...props} />
    </AdminPageTitleProvider>
  );
}

function AdminPanelBarContent({ content }: AdminPanelBarProps) {
  const { call } = useRPC2Call();
  const { account, hasFeature, platformAdmin } = useAccount();
  const { publicInfo } = usePublicInfo();
  const location = useLocation();
  const navigate = useNavigate();
  const ishttps = window.location.protocol === "https:";
  const [t] = useTranslation();
  const registeredPageHeader = useCurrentAdminPageHeader();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [httpsNoticeDismissed, setHttpsNoticeDismissed] = useState(() => {
    try {
      return localStorage.getItem(HTTPS_NOTICE_DISMISSED_STORAGE_KEY) === "1";
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
  const appName = publicInfo?.sitename?.trim() || "kelicloud";
  const accountAccessStatus = account?.access_status || "active";
  const accountPlanLabel = platformAdmin
    ? t("billing.platform_admin", { defaultValue: "平台管理员" })
    : account?.plan_name?.trim() || t("billing.free_access", { defaultValue: "默认权限" });
  const accountStatusLabel = t(`billing.access_status_${accountAccessStatus}`, {
    defaultValue:
      accountAccessStatus === "disabled"
        ? "Disabled"
        : accountAccessStatus === "expired"
          ? "Expired"
          : "Active",
  });
  const accountExpiryLabel = formatAccountPlanExpiry(
    account,
    t("billing.no_expiry", { defaultValue: "长期有效" }),
  );
  const accountPlanTitle = `${accountPlanLabel} · ${accountStatusLabel} · ${accountExpiryLabel}`;

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

  const getMenuLabel = (item: ExtendedMenuItem | MenuItem) => {
    const label = (item as ExtendedMenuItem).rawLabel || t(item.labelKey);
    return label.trim().toLowerCase() === "aws" ? "AWS" : label;
  };

  const getSidebarMenuLabel = (item: ExtendedMenuItem | MenuItem) => {
    const targetUrl = new URL(item.path, "https://komari.local");
    const normalizedPath = normalizePath(targetUrl.pathname);
    const provider = targetUrl.searchParams.get("provider");

    if (normalizedPath === "/admin") {
      return t("admin.nav.short.dashboard", { defaultValue: "Dashboard" });
    }
    if (normalizedPath === "/admin/client") {
      return t("admin.nav.short.servers", { defaultValue: "Servers" });
    }
    if (normalizedPath === "/admin/cloud") {
      if (provider === "digitalocean") return "DigitalOcean";
      if (provider === "aws") return "AWS";
      if (provider === "linode") return "Linode";
      if (provider === "vultr") return "Vultr";
      if (provider === "azure") return "Azure";
      return t("admin.nav.short.cloud", { defaultValue: "Cloud" });
    }

    if (normalizedPath === "/admin/failover") {
      return t("admin.nav.short.failover", { defaultValue: "Failover" });
    }
    if (normalizedPath === "/admin/failover-v2") {
      return t("admin.nav.short.failover_v2", { defaultValue: "Failover V2" });
    }
    if (normalizedPath === "/admin/dns") {
      return t("admin.nav.short.dns", { defaultValue: "DNS" });
    }
    if (normalizedPath === "/admin/settings") {
      return t("admin.nav.short.settings", { defaultValue: "Settings" });
    }
    if (normalizedPath === "/admin/exec") {
      return t("admin.nav.short.exec", { defaultValue: "Exec" });
    }
    if (normalizedPath === "/admin/scripts") {
      return t("admin.nav.short.scripts", { defaultValue: "Scripts" });
    }
    if (normalizedPath === "/admin/audit") {
      return t("admin.nav.short.audit", { defaultValue: "Audit" });
    }
    if (normalizedPath === "/admin/sessions") {
      return t("admin.nav.short.sessions", { defaultValue: "Sessions" });
    }
    if (normalizedPath === "/admin/billing") {
      return t("admin.nav.short.billing", { defaultValue: "Billing" });
    }
    if (normalizedPath === "/admin/proxy") {
      return t("admin.nav.short.proxy", { defaultValue: "Proxy" });
    }
    if (normalizedPath === "/admin/notification") {
      return t("admin.nav.short.notifications", { defaultValue: "Notifications" });
    }
    if (normalizedPath === "/admin/account") {
      return t("admin.nav.short.account", { defaultValue: "Account" });
    }

    return getMenuLabel(item);
  };

  const isPlatformOnlyPath = useCallback((target: string) => {
    if (!target || isExternalPath(target)) {
      return false;
    }

    const targetUrl = new URL(target, "https://komari.local");
    return [
      "/admin/settings/site",
      "/admin/notification/general",
      "/admin/proxy",
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
            "cloud_vultr",
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
        const feature: AccountFeature = normalizedPath.startsWith("/admin/failover-v2")
          ? "cloud_failover_v2"
          : "cloud_failover_v1";
        return hasFeature(feature);
      }
      if (normalizedPath === "/admin/exec") {
        if (targetUrl.searchParams.get("view") === "scripts") {
          return hasFeature("clipboard");
        }
        return hasFeature("tasks") || hasFeature("clipboard");
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

  const primaryMenuItems = useMemo<ExtendedMenuItem[]>(
    () =>
      combinedMenuItems
        .flatMap((item) => {
          if (isCloudMenuParent(item) && item.children?.length) {
            return item.children.map((child) => ({ ...child }));
          }

          return [item];
        })
        .filter(
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
  const groupedMenuEntries = useMemo<MenuGroup[]>(() => {
    const groups = new Map<MenuGroup["key"], MenuEntry[]>();

    primaryMenuEntries.forEach((entry) => {
      const key = getMenuGroupKey(entry.item.path);
      groups.set(key, [...(groups.get(key) || []), entry]);
    });

    return NAV_GROUP_ORDER
      .map((key) => {
        const meta = NAV_GROUP_META[key];
        return {
          key,
          labelKey: meta.labelKey,
          defaultLabel: meta.defaultLabel,
          entries: groups.get(key) || [],
        };
      })
      .filter((group) => group.entries.length > 0);
  }, [primaryMenuEntries]);

  const activeTopEntry = useMemo(
    () => primaryMenuEntries.find((entry) => entry.active) || null,
    [primaryMenuEntries],
  );
  const activeTopItem = activeTopEntry?.item || null;
  const activeChildItem = activeTopEntry?.activeChild || null;
  const fallbackPageTitle = useMemo(() => {
    const normalizedPath = normalizePath(location.pathname);
    if (normalizedPath === "/admin/about") {
      return t("about.title", { defaultValue: "关于" });
    }
    return appName;
  }, [appName, location.pathname, t]);
  const menuPageTitle =
    activeChildItem
      ? getMenuLabel(activeChildItem)
      : activeTopItem
        ? getMenuLabel(activeTopItem)
        : fallbackPageTitle;
  const currentPageTitle = registeredPageHeader.title ?? menuPageTitle;
  const currentPageDescription = registeredPageHeader.description;
  const currentSectionTitle =
    activeChildItem && activeTopItem
      ? getMenuLabel(activeTopItem)
      : null;
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

  const handleEnableHttps = useCallback(() => {
    navigate("/admin/settings/site");
  }, [navigate]);

  const handleHttpsLearnMore = useCallback(() => {
    window.open("https://komari-document.pages.dev/", "_blank", "noopener,noreferrer");
  }, []);

  const handleHttpsLater = useCallback(() => {
    setHttpsNoticeDismissed(true);
    try {
      localStorage.setItem(HTTPS_NOTICE_DISMISSED_STORAGE_KEY, "1");
    } catch {
      // ignore persistence failures
    }
  }, []);

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
    sizeClass = "size-[18px]",
  ) => (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors",
        active
          ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-950/15 dark:border-blue-500 dark:bg-blue-500 dark:text-white"
          : "border-slate-200/75 bg-white text-slate-500 group-hover:border-slate-300 group-hover:text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:group-hover:border-slate-700 dark:group-hover:text-slate-200",
      )}
    >
      {renderMenuIcon(icon, label, active, sizeClass)}
    </span>
  );

  const navItemClass = (active = false, collapsed = false) =>
    cn(
      "group relative flex min-h-10 items-center gap-2 rounded-xl border border-transparent px-2.5 text-sm font-medium leading-5 tracking-normal text-slate-600 transition-colors before:absolute before:left-1 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-blue-600 before:opacity-0 before:transition-opacity hover:bg-white hover:text-slate-950 hover:shadow-sm dark:text-slate-300 dark:before:bg-blue-400 dark:hover:bg-slate-900/80 dark:hover:text-white",
      collapsed && "md:justify-center md:px-2",
      active && "border-slate-200/85 bg-white font-semibold text-slate-950 shadow-[0_14px_28px_-22px_rgba(37,99,235,0.85)] before:opacity-100 hover:bg-white hover:text-slate-950 dark:border-blue-900/50 dark:bg-blue-950/35 dark:text-white dark:hover:bg-blue-950/35 dark:hover:text-white",
    );

  const subNavItemClass = (active = false) =>
    cn(
      "group relative flex min-h-8 items-center gap-2 rounded-lg px-2 py-1 text-sm leading-5 tracking-normal text-slate-500 transition-colors before:absolute before:left-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-blue-600 before:opacity-0 before:transition-opacity hover:bg-white hover:text-slate-950 dark:text-slate-400 dark:before:bg-blue-400 dark:hover:bg-slate-900/80 dark:hover:text-white",
      active && "bg-white font-medium text-slate-950 shadow-sm before:opacity-100 hover:bg-white hover:text-slate-950 dark:bg-blue-950/30 dark:text-white dark:hover:bg-blue-950/30 dark:hover:text-white",
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
          <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
            Release
          </div>
          <label className="text-lg font-semibold tracking-normal">
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
                      <div className="text-sm text-muted-foreground">
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
        </div>
      </Tips>
    ) : null;

  return (
    <div className="relative flex h-[100dvh] min-h-[100dvh] overflow-hidden bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
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
          "fixed inset-y-0 left-0 z-50 flex w-[224px] flex-col border-r border-slate-200/80 bg-slate-50/95 shadow-[12px_0_35px_-30px_rgba(15,23,42,0.75)] transition-transform duration-200 ease-out motion-reduce:transition-none dark:border-slate-800 dark:bg-slate-950 md:static md:inset-0 md:translate-x-0 md:transition-[width]",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed && "md:w-16",
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/70 px-4 dark:border-slate-800 dark:bg-slate-950/60",
            sidebarCollapsed && "md:px-2",
          )}
        >
          <Link
            to="/admin"
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-xl px-1 py-1 text-slate-950 transition-colors hover:bg-slate-100 dark:text-slate-50 dark:hover:bg-slate-900/70",
              sidebarCollapsed && "md:w-full md:justify-center md:px-0",
            )}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_24px_-18px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900">
              <img
                src="/favicon.ico"
                alt={appName}
                className="h-7 w-7 object-contain"
              />
            </span>
            <span className={cn("min-w-0", sidebarCollapsed && "md:hidden")}>
              <span className="block truncate text-[15px] font-semibold leading-5 tracking-normal">
                {appName}
              </span>
              <span className="block truncate text-[12px] font-medium tracking-normal text-slate-400 dark:text-slate-500">
                {t("admin.nav.console", { defaultValue: "Console" })}
              </span>
            </span>
          </Link>
          <div>
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
            "flex-1 overflow-y-auto px-3 py-3",
            sidebarCollapsed && "md:px-2",
          )}
        >
          <div className="flex flex-col gap-4">
            {groupedMenuEntries.map((group) => (
              <section key={group.key} className="min-w-0 space-y-1">
                <div
                  className={cn(
                    "px-2 text-[11px] font-bold leading-4 tracking-normal text-slate-400 dark:text-slate-500",
                    sidebarCollapsed && "md:hidden",
                  )}
                >
                  {t(group.labelKey, { defaultValue: group.defaultLabel })}
                </div>
                {sidebarCollapsed ? (
                  <div className="mx-auto hidden h-px w-8 bg-slate-200 dark:bg-slate-800 md:block" />
                ) : null}
                <div className="space-y-1">
            {group.entries.map((entry) => {
              const { item, active } = entry;
              const label = getMenuLabel(item);
              const sidebarLabel = getSidebarMenuLabel(item);
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
                            "h-10 w-full justify-between px-2.5",
                          )}
                        >
                          <span className="flex min-w-0 flex-1 items-center gap-2.5">
                            {renderMenuLeadingIcon(item.icon, label, active)}
                            <span className="min-w-0 flex-1 truncate text-left">{sidebarLabel}</span>
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
                      <CollapsibleContent className="ml-4 space-y-0.5 border-l border-slate-200/70 pl-3 pt-1 dark:border-slate-800">
                        {item.children.map((child) => {
                          const childLabel = getMenuLabel(child);
                          const childSidebarLabel = getSidebarMenuLabel(child);
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
                              title={childLabel}
                              aria-label={childLabel}
                              className={subNavItemClass(childActive)}
                            >
                              {renderMenuIcon(
                                child.icon,
                                childLabel,
                                childActive,
                                "h-4 w-4",
                              )}
                              <span className="min-w-0 flex-1 truncate text-left">{childSidebarLabel}</span>
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
                  aria-label={label}
                  className={navItemClass(active, sidebarCollapsed)}
                >
                  {renderMenuLeadingIcon(item.icon, label, active)}
                  <span className={cn("min-w-0 flex-1 truncate text-left", sidebarCollapsed && "md:hidden")}>
                    {sidebarLabel}
                  </span>
                </Link>
              );
            })}
                </div>
              </section>
            ))}
          </div>
        </nav>

        <div
          className={cn(
            "hidden border-t border-slate-200/80 bg-white/70 p-2 dark:border-slate-800 dark:bg-slate-950/60 md:flex md:items-center md:gap-2",
            sidebarCollapsed && "md:justify-center",
          )}
        >
          <div className={cn("min-w-0 flex-1 px-2", sidebarCollapsed && "md:hidden")}>
            <div className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              {versionInfo?.version ? `v${versionInfo.version}` : appName}
            </div>
            {versionInfo?.hash ? (
              <div className="truncate text-xs text-slate-400 dark:text-slate-500">
                {versionInfo.hash}
              </div>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-md"
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
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-3 shadow-[0_10px_30px_-28px_rgba(15,23,42,0.75)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-5">
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
                {currentSectionTitle ? (
                  <span className="hidden min-w-0 items-center gap-2 text-sm text-slate-500 sm:flex dark:text-slate-400">
                    <span className="truncate">{currentSectionTitle}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  </span>
                ) : null}
                <div className="truncate text-lg font-semibold leading-6 tracking-normal text-slate-950 dark:text-slate-50 md:text-[19px]">
                  {currentPageTitle}
                </div>
                {renderUpdateTrigger}
              </div>
              {currentPageDescription ? (
                <div className="mt-0.5 hidden max-w-[min(64vw,760px)] truncate text-xs leading-4 text-slate-500 dark:text-slate-400 lg:block">
                  {currentPageDescription}
                </div>
              ) : currentSectionTitle ? (
                <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400 sm:hidden">
                  {currentSectionTitle}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50 px-1.5 py-1 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950">
            {account && !account.logged_in && (
              <LoginDialog
                autoOpen
                showSettings={false}
                onLoginSuccess={() => window.location.reload()}
              />
            )}
            {account?.logged_in ? (
              <Link
                to="/admin/billing"
                className="hidden h-9 max-w-[260px] items-center gap-2 rounded-md px-2 text-sm transition-colors hover:bg-muted dark:hover:bg-slate-900/70 sm:flex"
                title={accountPlanTitle}
                aria-label={accountPlanTitle}
              >
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full shadow-[0_0_0_4px]",
                    getAccountStatusDotClass(accountAccessStatus),
                  )}
                />
                <span className="hidden min-w-0 max-w-[120px] truncate text-xs font-semibold text-foreground lg:block">
                  {accountPlanLabel}
                </span>
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  {accountStatusLabel}
                </span>
                <span className="hidden shrink-0 text-xs text-muted-foreground xl:block">
                  {accountExpiryLabel}
                </span>
              </Link>
            ) : null}
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

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-slate-100 dark:bg-slate-950">
          <div className="flex min-h-full w-full min-w-0 flex-col">
            {!ishttps && !httpsNoticeDismissed && (
              <div className="px-3 pt-1.5 sm:px-4">
                <div className="flex min-h-9 flex-col gap-2 rounded-md border border-amber-200/70 bg-amber-50/25 px-3 py-1.5 text-amber-950 shadow-none dark:border-amber-900/50 dark:bg-amber-950/15 dark:text-amber-100 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          fill="currentColor"
                          d="M10.03 3.659c.856-1.548 3.081-1.548 3.937 0l7.746 14.001c.83 1.5-.255 3.34-1.969 3.34H4.254c-1.715 0-2.8-1.84-1.97-3.34zM12.997 17A.999.999 0 1 0 11 17a.999.999 0 0 0 1.997 0m-.259-7.853a.75.75 0 0 0-1.493.103l.004 4.501l.007.102a.75.75 0 0 0 1.493-.103l-.004-4.502z"
                        />
                      </svg>
                    </span>
                    <div className="min-w-0 md:flex md:items-center md:gap-2">
                      <div className="truncate text-sm font-medium leading-5">
                        {t("admin.httpsNotice.title", {
                          defaultValue: "当前正在使用 HTTP，建议尽快启用 HTTPS",
                        })}
                      </div>
                      <p className="hidden max-w-4xl truncate text-xs leading-5 text-amber-900/70 dark:text-amber-100/65 xl:block">
                        {t("admin.httpsNotice.description", {
                          defaultValue:
                            "未加密连接可能暴露登录凭据和管理指令，生产环境建议切换到 HTTPS。",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <Button size="sm" className="h-6 px-2 text-xs" onClick={handleEnableHttps}>
                      {t("admin.httpsNotice.configure", {
                        defaultValue: "去配置",
                      })}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs text-amber-900 hover:bg-amber-100/70 dark:text-amber-100 dark:hover:bg-amber-900/40"
                      onClick={handleHttpsLearnMore}
                    >
                      {t("admin.httpsNotice.learnMore", {
                        defaultValue: "了解更多",
                      })}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-amber-900 hover:bg-amber-100/70 dark:text-amber-100 dark:hover:bg-amber-900/40"
                      onClick={handleHttpsLater}
                      title={t("admin.httpsNotice.later", {
                        defaultValue: "稍后处理",
                      })}
                      aria-label={t("admin.httpsNotice.later", {
                        defaultValue: "稍后处理",
                      })}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {content}
          </div>
        </main>
      </div>
    </div>
  );
}

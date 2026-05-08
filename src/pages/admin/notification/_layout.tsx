import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { AdminPageShell, AdminSubnav } from "@/components/admin/AdminPageShell";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/contexts/AccountContext";
import { cn } from "@/lib/utils";

const navItems = [
  {
    path: "/admin/notification/offline",
    labelKey: "notification.offline.title",
  },
  {
    path: "/admin/notification/load",
    labelKey: "notification.load.title",
  },
  {
    path: "/admin/notification/general",
    labelKey: "settings.general.title",
    platformOnly: true,
  },
] as const;

export default function NotificationLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const { platformAdmin } = useAccount();
  const visibleItems = navItems.filter(
    (item) => platformAdmin || !("platformOnly" in item && item.platformOnly),
  );

  return (
    <AdminPageShell
      className="mx-auto w-full max-w-5xl"
      title={t("notification.title", {
        defaultValue: "通知",
      })}
      description={t("notification.page_description", {
        defaultValue: "集中配置离线、负载和通用通知策略，避免告警规则分散在不同页面。",
      })}
      subnav={(
        <AdminSubnav>
          {visibleItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                asChild
                variant={active ? "default" : "outline"}
                size="sm"
                className={cn(
                  "rounded-md",
                  !active
                    && "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900",
                )}
              >
                <Link to={item.path}>{t(item.labelKey)}</Link>
              </Button>
            );
          })}
        </AdminSubnav>
      )}
    >
      <Outlet />
    </AdminPageShell>
  );
}

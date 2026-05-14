import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { AdminPageShell, AdminSubnav } from "@/components/admin/AdminPageShell";
import { Button } from "@/components/ui/button";
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
  },
] as const;

export default function NotificationLayout() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <AdminPageShell
      className="mx-auto w-full max-w-6xl"
      title={t("notification.title", {
        defaultValue: "通知",
      })}
      description={t("notification.page_description", {
        defaultValue: "集中配置离线、负载和通用通知策略，避免告警规则分散在不同页面。",
      })}
      subnav={(
        <AdminSubnav className="border-slate-200/80 bg-slate-50/70 p-1 dark:border-slate-800 dark:bg-slate-900/30">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                asChild
                variant={active ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 rounded-md px-3 shadow-none",
                  !active
                    && "border-transparent bg-transparent text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-950 dark:hover:text-white",
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

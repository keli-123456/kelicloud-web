import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { AdminSubnav } from "@/components/admin/AdminPageShell";
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
    <section className="flex flex-col gap-2 px-1 py-1">
      <AdminSubnav>
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Button
              key={item.path}
              asChild
              variant={active ? "default" : "outline"}
              size="sm"
              className={cn(
                "rounded-full",
                !active
                  && "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900",
              )}
            >
              <Link to={item.path}>{t(item.labelKey)}</Link>
            </Button>
          );
        })}
      </AdminSubnav>
      <Outlet />
    </section>
  );
}

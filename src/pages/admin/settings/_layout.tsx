import { Link, Outlet, useLocation } from "react-router-dom";

import { AdminSubnav } from "@/components/admin/AdminPageShell";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/contexts/AccountContext";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const navItems = [
  {
    path: "/admin/settings/site",
    labelKey: "settings.site.title",
    platformOnly: true,
  },
  {
    path: "/admin/settings/custom",
    labelKey: "settings.custom.header",
    platformOnly: true,
  },
  {
    path: "/admin/settings/general",
    labelKey: "settings.general.title",
    platformOnly: false,
  },
  {
    path: "/admin/settings/proxy",
    labelKey: "settings.proxy.title",
    platformOnly: true,
  },
  {
    path: "/admin/settings/sign-on",
    labelKey: "settings.sign_on.title",
    platformOnly: true,
  },
  {
    path: "/admin/settings/notification",
    labelKey: "settings.notification.title",
    platformOnly: true,
  },
] as const;

export default function SettingLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const { platformAdmin } = useAccount();
  const visibleItems = navItems.filter(
    (item) => platformAdmin || !item.platformOnly
  );

  return (
    <section className="flex flex-col gap-2 px-1 py-1">
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
                "rounded-full",
                !active &&
                  "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
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

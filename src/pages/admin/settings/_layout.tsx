import { Link, Outlet, useLocation } from "react-router-dom";

import {
  AdminPageShell,
  AdminSubnav,
} from "@/components/admin/AdminPageShell";
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
    path: "/admin/settings/general",
    labelKey: "settings.general.title",
    platformOnly: false,
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
    <AdminPageShell
      className="mx-auto w-full max-w-6xl"
      title={t("settings.title", { defaultValue: "设置" })}
      description={t("settings.page_description", {
        defaultValue: "集中管理站点、节点脚本和系统配置。",
      })}
      subnav={(
        <AdminSubnav className="border-slate-200/80 bg-slate-50/70 p-1 dark:border-slate-800 dark:bg-slate-900/30">
          {visibleItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                asChild
                variant={active ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 rounded-md px-3 shadow-none",
                  !active &&
                    "border-transparent bg-transparent text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-950 dark:hover:text-white"
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

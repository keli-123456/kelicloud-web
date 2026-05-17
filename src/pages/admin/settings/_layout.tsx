import { Outlet, useLocation } from "react-router-dom";
import { Globe2, SlidersHorizontal } from "lucide-react";

import {
  AdminPageShell,
  AdminSideNav,
  AdminSideNavLink,
  AdminSplitLayout,
} from "@/components/admin/AdminPageShell";
import { useAccount } from "@/contexts/AccountContext";
import { useTranslation } from "react-i18next";

const navItems = [
  {
    path: "/admin/settings/site",
    labelKey: "settings.site.title",
    descriptionKey: "settings.site.description",
    icon: Globe2,
    platformOnly: true,
  },
  {
    path: "/admin/settings/general",
    labelKey: "settings.general.title",
    descriptionKey: "settings.general.description",
    icon: SlidersHorizontal,
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
      className="w-full"
      title={t("settings.title", { defaultValue: "设置" })}
      description={t("settings.page_description", {
        defaultValue: "集中管理站点、节点脚本和系统配置。",
      })}
    >
      <AdminSplitLayout
        sidebar={(
          <AdminSideNav aria-label={t("settings.title", { defaultValue: "设置" })}>
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <AdminSideNavLink
                  key={item.path}
                  to={item.path}
                  active={location.pathname === item.path}
                  icon={<Icon className="h-4 w-4" />}
                  label={t(item.labelKey)}
                  description={t(item.descriptionKey, { defaultValue: "" })}
                />
              );
            })}
          </AdminSideNav>
        )}
      >
        <Outlet />
      </AdminSplitLayout>
    </AdminPageShell>
  );
}

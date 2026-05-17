import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, BellOff, Gauge } from "lucide-react";

import {
  AdminPageShell,
  AdminSideNav,
  AdminSideNavLink,
  AdminSplitLayout,
} from "@/components/admin/AdminPageShell";

const navItems = [
  {
    path: "/admin/notification/offline",
    labelKey: "notification.offline.title",
    descriptionKey: "notification.offline.description",
    descriptionDefault: "节点离线告警",
    icon: BellOff,
  },
  {
    path: "/admin/notification/load",
    labelKey: "notification.load.title",
    descriptionKey: "notification.load.description",
    descriptionDefault: "负载阈值告警",
    icon: Gauge,
  },
  {
    path: "/admin/notification/general",
    labelKey: "settings.general.title",
    descriptionKey: "notification.general.description",
    descriptionDefault: "通知渠道与绑定",
    icon: Bell,
  },
] as const;

export default function NotificationLayout() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <AdminPageShell
      className="w-full"
      title={t("notification.title", {
        defaultValue: "通知",
      })}
      description={t("notification.page_description", {
        defaultValue: "集中配置离线、负载和通用通知策略，避免告警规则分散在不同页面。",
      })}
    >
      <AdminSplitLayout
        sidebar={(
          <AdminSideNav aria-label={t("notification.title", { defaultValue: "通知" })}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <AdminSideNavLink
                  key={item.path}
                  to={item.path}
                  active={location.pathname === item.path}
                  icon={<Icon className="h-4 w-4" />}
                  label={t(item.labelKey)}
                  description={t(item.descriptionKey, {
                    defaultValue: item.descriptionDefault,
                  })}
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

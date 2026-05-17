import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, Gauge } from "lucide-react";

import {
  AdminPageShell,
  AdminSideNav,
  AdminSideNavLink,
  AdminSplitLayout,
} from "@/components/admin/AdminPageShell";

const navItems = [
  {
    path: "/admin/notification/general",
    labelKey: "notification.general.title",
    labelDefault: "通知通道",
    descriptionKey: "notification.general.description",
    descriptionDefault: "套餐到期、故障切换和系统事件",
    icon: Bell,
  },
  {
    path: "/admin/notification/load",
    labelKey: "notification.load.title",
    labelDefault: "负载告警",
    descriptionKey: "notification.load.description",
    descriptionDefault: "负载阈值告警",
    icon: Gauge,
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
        defaultValue: "集中配置套餐到期、故障切换、负载和流量等通知策略。",
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
                  label={t(item.labelKey, {
                    defaultValue: item.labelDefault,
                  })}
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

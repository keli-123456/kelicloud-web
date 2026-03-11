import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { AdminPageShell } from "@/components/admin/AdminPageShell";

const settingsSections = [
  {
    path: "/admin/settings/site",
    labelKey: "settings.site.title",
    description: "管理站点名称、访问策略、备份恢复和临时分享配置。",
  },
  {
    path: "/admin/settings/theme",
    labelKey: "theme.title",
    description: "统一主题包、界面资源与前端展示风格。",
  },
  {
    path: "/admin/settings/sign-on",
    labelKey: "settings.sign_on.title",
    description: "配置第三方登录入口与认证方式。",
  },
  {
    path: "/admin/settings/notification",
    labelKey: "settings.notification.title",
    description: "调整消息通道、发送器与通知行为。",
  },
  {
    path: "/admin/settings/general",
    labelKey: "settings.general.title",
    description: "维护 GeoIP、记录保留、兼容模式等全局参数。",
  },
];

export default function SettingLayout() {
  const location = useLocation();
  const { t } = useTranslation();
  const currentSection =
    settingsSections.find((section) => location.pathname === section.path) ||
    settingsSections[0];

  return (
    <AdminPageShell
      eyebrow={t("settings.title", { defaultValue: "系统设置" })}
      title={t(currentSection.labelKey)}
      description={currentSection.description}
      stats={[
        {
          label: "配置分区",
          value: `${settingsSections.length}`,
          hint: "站点、主题、认证、通知与全局配置统一集中管理。",
          tone: "blue",
        },
        {
          label: "当前栏目",
          value: t(currentSection.labelKey),
          hint: "左侧二级菜单会根据当前设置分区自动切换。",
          tone: "emerald",
        },
        {
          label: "编辑模式",
          value: "实时生效",
          hint: "大多数配置保存后会立即提交到后台。",
          tone: "amber",
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <Outlet />
      </div>
    </AdminPageShell>
  );
}

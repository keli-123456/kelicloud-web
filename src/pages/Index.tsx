import LoginDialog from "@/components/Login";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { Activity, Cloud, LockKeyhole, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getSiteName,
  getSiteSubtitle,
} from "@/constants/siteBrand";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { publicInfo } = usePublicInfo();
  const { t } = useTranslation();
  const siteName = getSiteName(publicInfo?.sitename);
  const siteSubtitle = getSiteSubtitle(publicInfo?.site_subtitle, t("site.subtitle"));
  const siteDescription =
    String(publicInfo?.description || "").trim() || t("site.description");
  const statusCards = [
    {
      icon: Server,
      label: t("nodeCard.status", { defaultValue: "状态" }),
      value: t("nodeCard.online", { defaultValue: "在线" }),
      hint: t("site.gateway_status_hint", {
        defaultValue: "节点健康、负载、流量与在线时间统一收拢在一个控制台。",
      }),
    },
    {
      icon: Cloud,
      label: t("cloud.title", { defaultValue: "Cloud" }),
      value: t("common.admin_console", { defaultValue: "管理控制台" }),
      hint: t("site.gateway_cloud_hint", {
        defaultValue: "云厂商、DNS、账单与故障切换都放在后台权限之后。",
      }),
    },
    {
      icon: LockKeyhole,
      label: t("login.title", { defaultValue: "登录" }),
      value: t("login.password_login", { defaultValue: "密码登录" }),
      hint: t("site.gateway_security_hint", {
        defaultValue: "使用管理员账号密码进入后台控制台。",
      }),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 md:px-6 md:py-8">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <Card className="overflow-hidden">
          <CardHeader className="gap-4 border-b border-border bg-card px-5 py-5 md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 text-white shadow-sm shadow-blue-950/15">
                  <Activity className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <CardTitle className="truncate text-2xl font-semibold tracking-normal md:text-3xl">
                    {siteName}
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm leading-6">
                    {siteSubtitle}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="info">
                {t("common.admin_console", { defaultValue: "管理控制台" })}
              </Badge>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {siteDescription}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-3 md:grid-cols-3">
              {statusCards.map((item) => (
                <div
                  key={String(item.label)}
                  className="flex min-h-[132px] flex-col justify-between rounded-lg border border-border bg-muted/35 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[12px] font-semibold text-muted-foreground">
                      {item.label}
                    </div>
                    <item.icon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold tracking-normal text-foreground">
                      {item.value}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-muted-foreground">
                      {item.hint}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <LoginDialog
          inline
          showSettings={false}
          redirectAuthenticatedTo="/admin"
          info={t("login.gateway_notice", {
            defaultValue:
              "使用现有管理员账号继续。",
          })}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default Index;

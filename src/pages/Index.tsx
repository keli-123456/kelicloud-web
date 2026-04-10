import LoginDialog from "@/components/Login";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 md:px-6 md:py-8">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="rounded-xl border-border/70 shadow-none">
          <CardHeader className="gap-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {siteSubtitle}
            </div>
            <div className="space-y-2">
              <CardTitle className="max-w-3xl text-2xl tracking-tight md:text-3xl">
                {siteName}
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                {siteDescription}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  label: t("login.title"),
                  value: t("common.admin_console", { defaultValue: "Admin Console" }),
                  hint: "One focused entry point for sign-in and admin access.",
                },
                {
                  label: t("common.settings", { defaultValue: "Settings" }),
                  value: t("site.badge"),
                  hint: "Site, account, and node operations now share one visual shell.",
                },
                {
                  label: t("nodeCard.status"),
                  value: t("nodeCard.online"),
                  hint: "Data views stay readable instead of behaving like a landing page.",
                },
              ].map((item) => (
                <Card key={item.label} className="rounded-lg border-border/70 shadow-none">
                  <CardContent className="flex min-h-[120px] flex-col justify-between p-4">
                    <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {item.label}
                    </div>
                    <div className="text-lg font-semibold tracking-tight text-foreground">
                      {item.value}
                    </div>
                    <div className="text-xs leading-5 text-muted-foreground">{item.hint}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Separator />

            <Alert>
              <AlertDescription>
                The public entry now reads like a restrained console gateway instead
                of a separate landing page.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <LoginDialog
          inline
          showSettings={false}
          redirectAuthenticatedTo="/admin"
          info="Use your existing account to continue. Password and OAuth login stay in one place."
          className="w-full border-border/70 shadow-none"
        />
      </div>
    </div>
  );
};

export default Index;

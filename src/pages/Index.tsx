import LoginDialog from "@/components/Login";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { publicInfo } = usePublicInfo();
  const { t } = useTranslation();
  const siteName = String(publicInfo?.sitename || "Komari").trim() || "Komari";

  return (
    <div className="mx-4 pb-8 pt-6">
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl items-center justify-center">
        <div className="w-full max-w-md space-y-5">
          <div className="text-center">
            <div className="text-3xl font-semibold tracking-tight text-foreground">
              {siteName}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {t(
                "login.subtitle",
                "Sign in to enter the admin console directly.",
              )}
            </div>
          </div>
          <LoginDialog
            inline
            showSettings={false}
            redirectAuthenticatedTo="/admin"
            className="w-full border-border/60 bg-background/95 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.45)]"
          />
        </div>
      </div>
    </div>
  );
};

export default Index;

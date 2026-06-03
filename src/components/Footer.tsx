import { useTranslation } from "react-i18next";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import {
  getSiteName,
  getSiteSubtitle,
} from "@/constants/siteBrand";

const Footer = () => {
  const { t } = useTranslation();
  const { publicInfo } = usePublicInfo();
  const siteName = getSiteName(publicInfo?.sitename);
  const siteSubtitle = getSiteSubtitle(publicInfo?.site_subtitle, t("site.subtitle"));

  return (
    <footer className="mt-auto border-t border-border/80 bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-4 text-center md:px-6">
        <div className="min-w-0 space-y-1 text-center">
          <div className="text-sm font-semibold tracking-tight text-foreground">
            {siteName}
          </div>
          <div className="text-xs text-muted-foreground">{siteSubtitle}</div>
          <div className="text-sm text-muted-foreground">
            {t("site.powered_by", { siteName })}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

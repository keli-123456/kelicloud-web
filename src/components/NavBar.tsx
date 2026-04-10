import { Github } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import ColorSwitch from "./ColorSwitch";
import LanguageSwitch from "./Language";
import LoginDialog from "./Login";
import ThemeSwitch from "./ThemeSwitch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import {
  getSiteGithubUrl,
  getSiteInitial,
  getSiteName,
  getSiteSubtitle,
} from "@/constants/siteBrand";

const NavBar = () => {
  const { publicInfo } = usePublicInfo();
  const { t } = useTranslation();
  const siteName = getSiteName(publicInfo?.sitename);
  const siteInitial = getSiteInitial(publicInfo?.sitename);
  const siteSubtitle = getSiteSubtitle(publicInfo?.site_subtitle, t("site.subtitle"));
  const siteGithubUrl = getSiteGithubUrl(publicInfo?.github_url);

  return (
    <nav className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-card text-sm font-semibold text-foreground">
            {siteInitial}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight text-foreground">
              {siteName}
            </div>
            <p className="truncate text-xs text-muted-foreground">{siteSubtitle}</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border/70 bg-card p-1 shadow-none">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    window.open(siteGithubUrl, "_blank", "noopener,noreferrer");
                  }}
                  aria-label={t("site.github")}
                  className="h-8 w-8 rounded-md"
                >
                  <Github size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("site.github")}</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <ThemeSwitch />
            <ColorSwitch />
            <LanguageSwitch />
            <LoginDialog />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;

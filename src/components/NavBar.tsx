import ColorSwitch from "./ColorSwitch";
import LanguageSwitch from "./Language";
import LoginDialog from "./Login";
import ThemeSwitch from "./ThemeSwitch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { Github } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const NavBar = () => {
  const { publicInfo } = usePublicInfo();
  const { t } = useTranslation();
  const isPrivate = publicInfo?.private_site && !document.cookie.includes("temp_key");

  return (
    <nav className="sticky top-0 z-30 mb-3 px-1 pt-1">
      <div className="nav-bar flex min-w-full items-center gap-3 rounded-2xl border border-border/70 bg-background/75 px-4 py-3 shadow-sm backdrop-blur-xl">
        <div className="mr-auto flex min-w-0 items-center gap-3">
          <Link to="/" className="min-w-0">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[clamp(1.15rem,4vw,1.75rem)] font-semibold leading-tight">
                {publicInfo?.sitename}
              </span>
              <span className="truncate text-xs text-muted-foreground md:text-sm">
                Komari Monitor
              </span>
            </div>
          </Link>
          {isPrivate ? (
            <>
              <Separator orientation="vertical" className="hidden h-8 md:block" />
              <Badge
                variant="warning"
                className="hidden rounded-full px-2.5 py-1 md:inline-flex"
              >
                {t("common.private_site")}
              </Badge>
            </>
          ) : null}
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-muted/60 p-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => {
                  window.open("https://github.com/keli-123456", "_blank");
                }}
                aria-label="GitHub"
              >
                <Github size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>GitHub</TooltipContent>
          </Tooltip>
          <ThemeSwitch />
          <ColorSwitch />
          <LanguageSwitch />
          {isPrivate ? (
            <LoginDialog
              autoOpen={isPrivate}
              info={t("common.private_site")}
              onLoginSuccess={() => {
                window.location.reload();
              }}
            />
          ) : (
            <LoginDialog />
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;

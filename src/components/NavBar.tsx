import { Github } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

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

const NavBar = () => {
  const { publicInfo } = usePublicInfo();
  const { t } = useTranslation();
  const isPrivate = publicInfo?.private_site && !document.cookie.includes("temp_key");
  const siteInitial = String(publicInfo?.sitename || "K")
    .trim()
    .slice(0, 1)
    .toUpperCase();

  return (
    <nav className="sticky top-0 z-30 mb-4 px-2 pt-2">
      <div className="relative overflow-hidden rounded-[28px] border border-border/60 bg-background/85 px-4 py-4 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.55)] backdrop-blur-xl">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-48 opacity-40"
          style={{
            background:
              "radial-gradient(circle at top right, var(--accent-a8), transparent 62%)",
          }}
        />
        <div
          className="pointer-events-none absolute -left-14 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full blur-3xl"
          style={{ backgroundColor: "var(--accent-a4)" }}
        />

        <div className="relative flex min-w-full flex-wrap items-center gap-3 md:flex-nowrap">
          <div className="mr-auto flex min-w-0 items-center gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-[var(--accent-3)] text-[var(--accent-11)] shadow-inner">
              <span className="text-lg font-semibold">{siteInitial}</span>
            </div>

            <Link to="/" className="min-w-0">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate text-[clamp(1.2rem,4vw,1.85rem)] font-semibold leading-tight tracking-tight">
                    {publicInfo?.sitename}
                  </span>
                  <Badge
                    variant={isPrivate ? "warning" : "info"}
                    className="rounded-full px-2.5 py-1"
                  >
                    {isPrivate ? t("common.private_site") : "Live Fleet"}
                  </Badge>
                </div>
                <span className="truncate text-[11px] uppercase tracking-[0.28em] text-muted-foreground md:text-xs">
                  Komari Monitor
                </span>
                <span className="truncate text-xs text-muted-foreground md:text-sm">
                  Realtime node health, traffic, and region coverage in one surface.
                </span>
              </div>
            </Link>

            {isPrivate ? (
              <>
                <Separator orientation="vertical" className="hidden h-10 md:block" />
                <div className="hidden rounded-2xl border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-sm text-amber-700 md:block">
                  {t("common.private_site")}
                </div>
              </>
            ) : null}
          </div>

          <div className="flex flex-shrink-0 flex-wrap items-center gap-2 rounded-full border border-border/60 bg-background/75 p-1.5 shadow-sm">
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
      </div>
    </nav>
  );
};

export default NavBar;

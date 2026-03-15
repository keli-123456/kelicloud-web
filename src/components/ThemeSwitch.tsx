import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeContext } from "@/contexts/ThemeContext";
import { useSystemTheme } from "@/hooks/useSystemTheme";
import { Laptop2, MoonStar, SunMedium } from "lucide-react";
import { useContext, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface ThemeSwitchProps {
  icon?: ReactNode;
}

const ThemeSwitch = ({ icon }: ThemeSwitchProps = {}) => {
  const { appearance, setAppearance } = useContext(ThemeContext);
  const resolvedAppearance = useSystemTheme(appearance);
  const [t] = useTranslation();

  const activeIcon =
    appearance === "system" ? (
      <Laptop2 size={16} />
    ) : resolvedAppearance === "dark" ? (
      <MoonStar size={16} />
    ) : (
      <SunMedium size={16} />
    );

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("theme.label", "Theme")}
              className="rounded-full border-border/60 bg-background/70 shadow-none hover:bg-muted"
            >
              {icon ?? activeIcon}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("theme.label", "Theme")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent className="min-w-44">
        <DropdownMenuLabel>{t("theme.label", "Theme")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={appearance === "light"}
          onSelect={() => setAppearance("light")}
        >
          {t("theme.light", "Light")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={appearance === "dark"}
          onSelect={() => setAppearance("dark")}
        >
          {t("theme.dark", "Dark")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={appearance === "system"}
          onSelect={() => setAppearance("system")}
        >
          {t("theme.system", "System")}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeSwitch;

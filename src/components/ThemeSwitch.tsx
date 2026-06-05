import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeContext } from "@/contexts/ThemeContext";
import { useSystemTheme } from "@/hooks/useSystemTheme";
import { MoonStar, SunMedium } from "lucide-react";
import { useContext, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface ThemeSwitchProps {
  icon?: ReactNode;
}

const ThemeSwitch = ({ icon }: ThemeSwitchProps = {}) => {
  const { appearance, setAppearance } = useContext(ThemeContext);
  const resolvedAppearance = useSystemTheme(appearance);
  const [t] = useTranslation();
  const nextAppearance = resolvedAppearance === "dark" ? "light" : "dark";
  const nextAppearanceLabel = nextAppearance === "dark"
    ? t("theme.dark", "Dark")
    : t("theme.light", "Light");
  const toggleLabel = t("theme.toggle", {
    mode: nextAppearanceLabel,
    defaultValue: "切换到{{mode}}",
  });

  const activeIcon = resolvedAppearance === "dark"
    ? (
      <MoonStar size={16} />
    )
    : (
      <SunMedium size={16} />
    );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={toggleLabel}
          className="rounded-full border-border/60 bg-background/70 shadow-none hover:bg-muted"
          onClick={() => setAppearance(nextAppearance)}
        >
          {icon ?? activeIcon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{toggleLabel}</TooltipContent>
    </Tooltip>
  );
};

export default ThemeSwitch;

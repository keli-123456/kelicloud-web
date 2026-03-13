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
import { ThemeContext, allowedColors } from "@/contexts/ThemeContext";
import { Palette } from "lucide-react";
import { useContext, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface ColorSwitchProps {
  icon?: ReactNode;
}

const ColorSwitch = ({ icon }: ColorSwitchProps = {}) => {
  const { color, setColor } = useContext(ThemeContext);
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("color.iris", "Accent")}
              className="relative rounded-full border-border/60 bg-background/70 shadow-none hover:bg-muted"
            >
              {icon ?? (
                <>
                <Palette size={16} />
                <span
                  className="absolute bottom-1 right-1 size-2 rounded-full border border-white/70"
                  style={{ backgroundColor: `var(--${color}-9)` }}
                />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Accent</TooltipContent>
      </Tooltip>
      <DropdownMenuContent className="max-h-80 min-w-52 overflow-y-auto">
        <DropdownMenuLabel>Accent</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allowedColors.map((item) => (
          <DropdownMenuCheckboxItem
            key={item}
            checked={item === color}
            onSelect={() => setColor(item)}
          >
            <span
              className="mr-2 inline-block size-2.5 rounded-full"
              style={{ backgroundColor: `var(--${item}-9)` }}
            />
            <span style={{ color: `var(--${item}-11)` }}>{t(`color.${item}`)}</span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ColorSwitch;

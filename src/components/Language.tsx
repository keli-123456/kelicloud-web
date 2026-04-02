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
import { Languages } from "lucide-react";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  availableLanguages,
  changeLanguage,
  resolveCanonicalLanguage,
} from "../i18n/config";

interface LanguageSwitchProps {
  icon?: ReactNode;
}

const LanguageSwitch = ({ icon }: LanguageSwitchProps = {}) => {
  const { i18n, t } = useTranslation();
  const currentLanguageCode = resolveCanonicalLanguage(i18n.language);
  const currentLanguage = availableLanguages.find(
    (lang) => lang.code === currentLanguageCode,
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
              aria-label={t("common.language", "Language")}
              className="rounded-full border-border/60 bg-background/70 shadow-none hover:bg-muted"
            >
              {icon ?? (
                <Languages size={16} />
              )}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{currentLanguage?.name ?? "Language"}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent className="min-w-52">
        <DropdownMenuLabel>{t("common.language", "Language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableLanguages.map((lang) => (
          <DropdownMenuCheckboxItem
            key={lang.code}
            checked={lang.code === currentLanguageCode}
            onSelect={() => {
              void changeLanguage(lang.code);
            }}
          >
            {lang.name}
            <span className="ml-auto text-xs uppercase text-muted-foreground">
              {lang.code.slice(0, 2)}
            </span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitch;

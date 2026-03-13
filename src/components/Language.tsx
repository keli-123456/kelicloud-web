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
import { resources } from "../i18n/config";

interface LanguageSwitchProps {
  icon?: ReactNode;
}

const languages: { code: string; name: string }[] = Object.entries(resources)
  .filter(
    ([, res]) =>
      typeof res === "object" &&
      res !== null &&
      "name" in res &&
      typeof (res as { name?: unknown }).name === "string",
  )
  .map(([code, res]) => ({
    code,
    name: (res as { name: string }).name,
  }))
  .sort((a, b) => a.code.localeCompare(b.code));

const LanguageSwitch = ({ icon }: LanguageSwitchProps = {}) => {
  const { i18n, t } = useTranslation();
  const currentLanguage = languages.find((lang) => lang.code === i18n.language);

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
        {languages.map((lang) => (
          <DropdownMenuCheckboxItem
            key={lang.code}
            checked={lang.code === i18n.language}
            onSelect={() => i18n.changeLanguage(lang.code)}
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

import { ThemeContext as AppThemeContext } from "@/contexts/ThemeContext";
import { useSystemTheme } from "@/hooks/useSystemTheme";
import * as React from "react";
import { ThemeShell } from "@/components/ui/theme-shell";

export function ThemePortal({
  children,
  forceAppearance,
}: {
  children: React.ReactNode;
  forceAppearance?: "light" | "dark";
}) {
  const { appearance, color } = React.useContext(AppThemeContext);
  const resolvedAppearance = useSystemTheme(appearance);

  return (
    <ThemeShell
      appearance={forceAppearance ?? resolvedAppearance}
      accentColor={color}
    >
      {children}
    </ThemeShell>
  );
}

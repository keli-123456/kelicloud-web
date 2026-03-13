import * as React from "react";

import type { Colors } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

type ThemeAppearance = "light" | "dark";
type ThemeGrayColor = "auto" | "gray" | "mauve" | "slate" | "sage" | "olive" | "sand";
type ThemePanelBackground = "solid" | "translucent";
type ThemeRadius = "none" | "small" | "medium" | "large" | "full";
type ThemeScaling = "90%" | "95%" | "100%" | "105%" | "110%";

function getMatchingGrayColor(color: Colors): Exclude<ThemeGrayColor, "auto"> {
  switch (color) {
    case "tomato":
    case "red":
    case "ruby":
    case "crimson":
    case "pink":
    case "plum":
    case "purple":
    case "violet":
      return "mauve";
    case "iris":
    case "indigo":
    case "blue":
    case "sky":
    case "cyan":
      return "slate";
    case "teal":
    case "jade":
    case "mint":
    case "green":
      return "sage";
    case "grass":
    case "lime":
      return "olive";
    case "yellow":
    case "amber":
    case "orange":
    case "brown":
    case "gold":
    case "bronze":
      return "sand";
    case "gray":
    default:
      return "gray";
  }
}

interface ThemeShellProps extends React.HTMLAttributes<HTMLDivElement> {
  accentColor?: Colors;
  appearance?: ThemeAppearance;
  grayColor?: ThemeGrayColor;
  hasBackground?: boolean;
  isRoot?: boolean;
  panelBackground?: ThemePanelBackground;
  radius?: ThemeRadius;
  scaling?: ThemeScaling;
}

export function ThemeShell({
  accentColor = "iris",
  appearance = "light",
  children,
  className,
  grayColor = "auto",
  hasBackground,
  isRoot = false,
  panelBackground = "translucent",
  radius = "medium",
  scaling = "100%",
  ...props
}: ThemeShellProps) {
  const resolvedGrayColor =
    grayColor === "auto" ? getMatchingGrayColor(accentColor) : grayColor;
  const resolvedHasBackground = hasBackground ?? isRoot;

  return (
    <div
      data-accent-color={accentColor}
      data-gray-color={resolvedGrayColor}
      data-has-background={resolvedHasBackground ? "true" : "false"}
      data-is-root-theme={isRoot ? "true" : "false"}
      data-panel-background={panelBackground}
      data-radius={radius}
      data-scaling={scaling}
      className={cn("radix-themes", appearance, className)}
      {...props}
    >
      {children}
    </div>
  );
}

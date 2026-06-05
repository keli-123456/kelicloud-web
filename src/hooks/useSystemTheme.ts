import * as React from "react";
import type { Appearance } from '../contexts/ThemeContext';

export const useSystemTheme = (appearance: Appearance): "light" | "dark" => {
  return React.useMemo(() => appearance, [appearance]);
};

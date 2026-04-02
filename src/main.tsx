import React, { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import "./global.css";
import "./styles/vendor/radix-theme-tokens.css";
import "./styles/vendor/radix-layout-tokens.css";
import {
  ThemeContext,
  THEME_DEFAULTS,
  type Appearance,
  type Colors,
} from "./contexts/ThemeContext";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useSystemTheme } from "./hooks/useSystemTheme";
import { BrowserRouter } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { Suspense } from "react";
import { useRoutes } from "react-router-dom";
import { routes } from "./routes";
import Loading from "./components/loading";
import { PublicInfoProvider } from "./contexts/PublicInfoContext";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { RPC2Provider } from "./contexts/RPC2Context";
import { ThemeShell } from "./components/ui/theme-shell";
import { initI18n } from "./i18n/config";

const SW_RECOVERY_VERSION = "2026-03-30-pagination-recovery-1";

const App = () => {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator) || !("caches" in window)) return;
    if (window.localStorage.getItem("komari-sw-recovery") === SW_RECOVERY_VERSION) return;

    void (async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));

        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key).catch(() => false)));

        window.localStorage.setItem("komari-sw-recovery", SW_RECOVERY_VERSION);
      } catch {
        // Ignore cleanup failures. The app can still continue without the recovery marker.
      }
    })();
  }, []);

  const [appearance, setAppearance] = useLocalStorage<Appearance>(
    "appearance",
    THEME_DEFAULTS.appearance,
  );
  const [color, setColor] = useLocalStorage<Colors>(
    "color",
    THEME_DEFAULTS.color,
  );

  // Use the system theme hook to resolve "system" to actual theme
  const resolvedAppearance = useSystemTheme(appearance);

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedAppearance === "dark");
    root.style.colorScheme = resolvedAppearance;
  }, [resolvedAppearance]);

  const themeContextValue = useMemo(
    () => ({
      appearance,
      setAppearance,
      color,
      setColor,
    }),
    [appearance, setAppearance, color, setColor],
  );
  const routing = useRoutes(routes);
  return (
    <Suspense fallback={<Loading />}>
      <ThemeContext.Provider value={themeContextValue}>
        <ThemeShell
          appearance={resolvedAppearance}
          accentColor={color}
          scaling="110%"
          isRoot
          className="theme-root"
          style={{
            backgroundColor: "transparent",
            minHeight: "100vh",
          }}
        >
          <RPC2Provider>
            <PublicInfoProvider>
              <TooltipProvider>
                <Toaster />
                <OfflineIndicator />
                {routing}
                <PWAInstallPrompt />
                <PWAUpdatePrompt />
              </TooltipProvider>
            </PublicInfoProvider>
          </RPC2Provider>
        </ThemeShell>
      </ThemeContext.Provider>
    </Suspense>
  );
};

async function bootstrap() {
  try {
    await initI18n();
  } catch (error) {
    console.error("Failed to initialize i18n resources:", error);
  }

  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StrictMode>
    </ErrorBoundary>,
  );
}

void bootstrap();

import { useTranslation } from "react-i18next";
import { Apache2_LICENSE, MIT_LICENSE } from "@/utils/field";
import { SettingCardCollapse } from "@/components/admin/SettingCard";

const openSourceLicenses = {
  "Apache-2.0 License": [
    "github.com/coreos/go-oidc/v3",
    "github.com/pquerna/otp",
    "github.com/spf13/cobra",
    "google.golang.org/grpc",
    "typescript",
    "github.com/prometheus-community/pro-bing",
  ],
  "BSD-2-Clause License": ["github.com/gorilla/websocket", "dotenv"],
  "BSD-3-Clause License": [
    "github.com/google/uuid",
    "google.golang.org/protobuf",
    "golang.org/x/net",
    "golang.org/x/crypto",
    "golang.org/x/sys",
    "github.com/shirou/gopsutil/v4",
  ],
  "MIT License": [
    "github.com/gin-gonic/gin",
    "github.com/patrickmn/go-cache",
    "github.com/stretchr/testify",
    "gorm.io/driver/mysql",
    "gorm.io/driver/sqlite",
    "gorm.io/gorm",
    "@dnd-kit/core",
    "@dnd-kit/modifiers",
    "@dnd-kit/sortable",
    "@radix-ui/react-checkbox",
    "@radix-ui/react-dialog",
    "@radix-ui/react-dropdown-menu",
    "@radix-ui/react-icons",
    "@radix-ui/react-label",
    "@radix-ui/react-slot",
    "@radix-ui/themes (vendored tokens)",
    "@tanstack/react-table",
    "@types/uuid",
    "class-variance-authority",
    "clsx",
    "github-markdown-css",
    "http-proxy-middleware",
    "i18next",
    "i18next-browser-languagedetector",
    "motion",
    "next-themes",
    "react",
    "react-dom",
    "react-i18next",
    "react-markdown",
    "react-toastify",
    "recharts",
    "remark-gfm",
    "sonner",
    "tailwind-merge",
    "tailwindcss",
    "@tailwindcss/vite",
    "twemoji",
    "uuid",
    "vaul",
    "xterm",
    "xterm-addon-fit",
    "xterm-addon-search",
    "xterm-addon-web-links",
    "@eslint/js",
    "@types/lodash",
    "@types/react",
    "@types/react-dom",
    "@vitejs/plugin-react",
    "eslint",
    "eslint-plugin-react-hooks",
    "eslint-plugin-react-refresh",
    "globals",
    "react-router-dom",
    "rollup-plugin-visualizer",
    "tw-animate-css",
    "typescript-eslint",
    "vite",
    "vite-plugin-pages",
    "vite-plugin-pwa",
    "github.com/UserExistsError/conpty",
    "github.com/blang/semver",
    "github.com/creack/pty",
    "github.com/go-ole/go-ole",
    "github.com/klauspost/cpuid/v2",
    "github.com/rhysd/go-github-selfupdate",
    "gopkg.in/toast.v1",
  ],
  "ISC License": ["github.com/oschwald/maxminddb-golang", "lucide-react"],
  "CC-BY-4.0 License": [
    "License: https://creativecommons.org/licenses/by/4.0/",
    "twemoji | Twemoji © Twitter, Inc. and other contributors | Not modified | https://github.com/twitter/twemoji",
  ],
};

const sortedLicenses = Object.entries(openSourceLicenses).sort(([left], [right]) =>
  left.localeCompare(right),
);

export default function OpenSourceSection() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <div className="text-foreground flex flex-col gap-4">
        <SettingCardCollapse
          title="MIT License"
          description={t(
            "about.license_cards.mit_description",
            "Copyright (C) 2025 Komari Monitor",
          )}
        >
          <pre className="text-wrap">{MIT_LICENSE}</pre>
        </SettingCardCollapse>
        <SettingCardCollapse
          title="Apache License"
          description={t(
            "about.license_cards.apache_description",
            "Version 2.0, January 2004",
          )}
        >
          <pre className="text-wrap">{Apache2_LICENSE}</pre>
        </SettingCardCollapse>
      </div>
      <div className="border-t border-slate-200/80 pt-4 dark:border-slate-800/80">
        <h2 className="text-xl font-semibold text-foreground">
          {t("about.open_source")}
        </h2>
        <div className="copyright mt-4 text-sm text-gray-500 dark:text-gray-400">
          {sortedLicenses.map(([license, libs]) => (
            <div key={license} className="mb-3">
              <h3 className="font-black text-lg text-foreground">
                {license}
              </h3>
              <ul className="list-disc list-inside">
                {[...libs].sort().map((lib) => (
                  <li key={lib}>{lib}</li>
                ))}
              </ul>
            </div>
          ))}
          {t("about.ai")}
        </div>
      </div>
    </div>
  );
}

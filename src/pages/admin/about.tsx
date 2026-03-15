import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "github-markdown-css/github-markdown.css";
import Loading from "@/components/loading";
import { useTranslation } from "react-i18next";
import { SquareArrowOutUpRight } from "lucide-react";
import { SegmentedControl } from "@/components/admin/admin-ui";
import { Apache2_LICENSE, Eula, MIT_LICENSE } from "@/utils/field";
import { SettingCardCollapse } from "@/components/admin/SettingCard";
import {
  AdminPageShell,
  AdminSurface,
} from "@/components/admin/AdminPageShell";

export default function AboutPage() {
  const [markdown, setMarkdown] = useState("");
  const { t } = useTranslation();
  const [view, setView] = useState("open_source");
  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/keli-123456/kelicloud/refs/heads/main/README.md"
    )
      .then((res) => res.text())
      .then(setMarkdown);
  }, []);

  const open_source_licenses = {
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

  const sortedLicenses = Object.entries(open_source_licenses).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <AdminPageShell
      eyebrow={t("about.title")}
      title={t("about.page_title", "About Komari")}
      description={t(
        "about.description",
        "Review open-source licenses, legal statements, and the project README.",
      )}
      stats={[
        {
          label: t("about.stats.sections_label", "Sections"),
          value: "3",
          hint: t(
            "about.stats.sections_hint",
            "Includes open-source licenses, legal notice, and the README.",
          ),
          tone: "blue",
        },
        {
          label: t("about.stats.licenses_label", "License groups"),
          value: `${sortedLicenses.length}`,
          hint: t(
            "about.stats.licenses_hint",
            "Third-party dependencies are grouped by license type.",
          ),
          tone: "emerald",
        },
      ]}
    >
      <AdminSurface className="flex flex-col gap-4">
        <SegmentedControl.Root value={view} onValueChange={setView}>
          <SegmentedControl.Item value="open_source">
            {t("about.open_source_title")}
          </SegmentedControl.Item>
          <SegmentedControl.Item value="eula">
            {t("about.eula_title", "Legal & Compliance")}
          </SegmentedControl.Item>
          <SegmentedControl.Item value="readme">
            {t("about.readme_title", "README")}
          </SegmentedControl.Item>
        </SegmentedControl.Root>

        {(() => {
          switch (view) {
            case "eula":
              return (
                <div className="license-text border-l-2 border-slate-200 pl-4 dark:border-slate-800">
                  <pre className="text-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
                    {Eula}
                  </pre>
                </div>
              );
            case "open_source":
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
                            {libs.sort().map((lib) => (
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
            case "readme":
              return (
                <div className="flex flex-col gap-4">
                  <div className="markdown-body border-t border-slate-200/80 pt-4 !bg-transparent dark:border-slate-800/80 dark:!bg-transparent dark:text-slate-200">
                    {markdown ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        children={markdown}
                      />
                    ) : (
                      <Loading />
                    )}
                  </div>
                  <a
                    href="https://github.com/keli-123456/kelicloud/blob/main/README.md"
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-row items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
                  >
                    {t("about.readme_open_in_new_tab")}
                    <SquareArrowOutUpRight size="16" />
                  </a>
                </div>
              );
          }
        })()}
      </AdminSurface>
    </AdminPageShell>
  );
}

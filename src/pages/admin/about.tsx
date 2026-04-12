import * as React from "react";
import Loading from "@/components/loading";
import { useTranslation } from "react-i18next";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  AdminPageShell,
  AdminSurface,
} from "@/components/admin/AdminPageShell";

const OpenSourceSection = React.lazy(() => import("./about/OpenSourceSection"));
const LegalSection = React.lazy(() => import("./about/LegalSection"));
const ReadmeSection = React.lazy(() => import("./about/ReadmeSection"));
const LICENSE_GROUP_COUNT = 5;

export default function AboutPage() {
  const { t } = useTranslation();
  const [view, setView] = React.useState("open_source");

  const currentSection = (() => {
    switch (view) {
      case "eula":
        return <LegalSection />;
      case "readme":
        return <ReadmeSection />;
      case "open_source":
      default:
        return <OpenSourceSection />;
    }
  })();

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
          value: `${LICENSE_GROUP_COUNT}`,
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

        <React.Suspense fallback={<Loading />}>
          {currentSection}
        </React.Suspense>
      </AdminSurface>
    </AdminPageShell>
  );
}

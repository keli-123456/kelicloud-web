import * as React from "react";
import { useTranslation } from "react-i18next";
import { SegmentedControl } from "@/components/admin/admin-ui";
import {
  AdminPageShell,
  AdminSettingsSkeleton,
  AdminSurface,
} from "@/components/admin/AdminPageShell";

const OpenSourceSection = React.lazy(() => import("./about/OpenSourceSection"));
const LegalSection = React.lazy(() => import("./about/LegalSection"));
const ReadmeSection = React.lazy(() => import("./about/ReadmeSection"));

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
      title={t("about.page_title", "About kelicloud")}
      description={t(
        "about.description",
        "Review open-source licenses, legal statements, and the project README.",
      )}
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

        <React.Suspense fallback={<AdminSettingsSkeleton sections={3} />}>
          {currentSection}
        </React.Suspense>
      </AdminSurface>
    </AdminPageShell>
  );
}

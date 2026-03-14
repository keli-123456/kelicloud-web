import { useTranslation } from "react-i18next";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import CloudDnsProviderSection from "@/components/admin/cloud/CloudDnsProviderSection";

export default function CloudDnsPage() {
  const { t } = useTranslation();

  return (
    <AdminPageShell
      eyebrow={t("cloud.title", "Cloud")}
      title={t("cloud.dns.title", "DNS Provider")}
      description={t(
        "cloud.dns.page_description",
        "Manage DNS service credentials separately from compute instances so domain automation stays isolated from cloud server operations.",
      )}
    >
      <CloudDnsProviderSection />
    </AdminPageShell>
  );
}

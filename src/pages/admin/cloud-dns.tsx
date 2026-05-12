import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AdminPageShell,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
import CloudDnsProviderSection from "@/components/admin/cloud/CloudDnsProviderSection";
import { getDefaultAdminPath, useAccount } from "@/contexts/AccountContext";

export default function CloudDnsPage() {
  const { account, hasFeature, loading } = useAccount();
  const { t } = useTranslation();

  if (loading) {
    return (
      <AdminPageShell
        title={t("cloud.dns.title", { defaultValue: "DNS" })}
        description={t("cloud.dns.description", {
          defaultValue:
            "集中管理云 DNS 服务商凭据和解析能力，为故障切换、云资源和自动化脚本提供统一入口。",
        })}
      >
        <AdminTableSkeleton columns={4} rows={4} />
      </AdminPageShell>
    );
  }

  if (!hasFeature("cloud_dns")) {
    return <Navigate to={getDefaultAdminPath(account)} replace />;
  }

  return (
    <AdminPageShell
      title={t("cloud.dns.title", { defaultValue: "DNS" })}
      description={t("cloud.dns.description", {
        defaultValue:
          "集中管理云 DNS 服务商凭据和解析能力，为故障切换、云资源和自动化脚本提供统一入口。",
      })}
    >
      <CloudDnsProviderSection />
    </AdminPageShell>
  );
}

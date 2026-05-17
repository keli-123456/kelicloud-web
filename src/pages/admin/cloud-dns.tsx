import { Navigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { KeyRound, ListChecks } from "lucide-react";
import {
  AdminPageShell,
  AdminSideNav,
  AdminSideNavButton,
  AdminSplitLayout,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
import CloudDnsProviderSection from "@/components/admin/cloud/CloudDnsProviderSection";
import CloudDnsSchedulerSection from "@/components/admin/cloud/CloudDnsSchedulerSection";
import { getDefaultAdminPath, useAccount } from "@/contexts/AccountContext";

export default function CloudDnsPage() {
  const { account, hasFeature, loading } = useAccount();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "scheduler" ? "scheduler" : "credentials";

  const setTab = (next: "credentials" | "scheduler") => {
    const params = new URLSearchParams(searchParams);
    if (next === "scheduler") {
      params.set("tab", "scheduler");
    } else {
      params.delete("tab");
    }
    setSearchParams(params, { replace: true });
  };

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
      <AdminSplitLayout
        sidebar={
          <AdminSideNav aria-label={t("cloud.dns.title", { defaultValue: "DNS" })}>
            <AdminSideNavButton
              active={tab === "credentials"}
              icon={<KeyRound className="h-4 w-4" />}
              label={t("cloud.dns.credentials_tab", { defaultValue: "凭证池" })}
              description={t("cloud.dns.credentials_tab_description", { defaultValue: "DNS API 凭据" })}
              onClick={() => setTab("credentials")}
            />
            <AdminSideNavButton
              active={tab === "scheduler"}
              icon={<ListChecks className="h-4 w-4" />}
              label={t("cloud.dns.scheduler.tab", { defaultValue: "调度中心" })}
              description={t("cloud.dns.scheduler.tab_description", { defaultValue: "DDNS 队列状态" })}
              onClick={() => setTab("scheduler")}
            />
          </AdminSideNav>
        }
      >
        {tab === "scheduler" ? <CloudDnsSchedulerSection /> : <CloudDnsProviderSection />}
      </AdminSplitLayout>
    </AdminPageShell>
  );
}

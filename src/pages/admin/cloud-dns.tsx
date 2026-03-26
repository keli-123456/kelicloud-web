import { Navigate } from "react-router-dom";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import CloudDnsProviderSection from "@/components/admin/cloud/CloudDnsProviderSection";
import Loading from "@/components/loading";
import { getDefaultAdminPath, useAccount } from "@/contexts/AccountContext";

export default function CloudDnsPage() {
  const { account, hasFeature, loading } = useAccount();

  if (loading) {
    return <Loading />;
  }

  if (!hasFeature("cloud_dns")) {
    return <Navigate to={getDefaultAdminPath(account)} replace />;
  }

  return (
    <AdminPageShell>
      <CloudDnsProviderSection />
    </AdminPageShell>
  );
}

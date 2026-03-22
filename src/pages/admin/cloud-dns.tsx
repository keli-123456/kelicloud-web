import { AdminPageShell } from "@/components/admin/AdminPageShell";
import CloudDnsProviderSection from "@/components/admin/cloud/CloudDnsProviderSection";

export default function CloudDnsPage() {
  return (
    <AdminPageShell>
      <CloudDnsProviderSection />
    </AdminPageShell>
  );
}

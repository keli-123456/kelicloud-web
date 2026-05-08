import { Navigate } from "react-router-dom";

import { getDefaultAdminPath, useAccount } from "@/contexts/AccountContext";

export default function NotificationIndexPage() {
  const { account, hasFeature, loading } = useAccount();

  if (loading) {
    return null;
  }

  if (!hasFeature("notifications")) {
    return <Navigate to={getDefaultAdminPath(account)} replace />;
  }

  return (
    <Navigate to="/admin/notification/general" replace />
  );
}

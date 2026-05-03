import { Suspense, lazy } from "react";

import {
  AdminCardGridSkeleton,
  AdminPageShell,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";

const FailoverV1Page = lazy(() => import("./failover/FailoverV1Page"));

export default function FailoverPageRoute() {
  return (
    <Suspense
      fallback={
        <AdminPageShell>
          <AdminCardGridSkeleton cards={4} />
          <AdminTableSkeleton rows={6} columns={6} />
        </AdminPageShell>
      }
    >
      <FailoverV1Page />
    </Suspense>
  );
}

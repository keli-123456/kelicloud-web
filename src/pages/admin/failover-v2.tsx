import { Suspense } from "react";
import { lazyWithRecovery as lazy } from "@/lib/lazyWithRecovery";

import {
  AdminPageShell,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";

const FailoverV2Page = lazy(() => import("./failover-v2/FailoverV2Page"));

export default function FailoverV2PageRoute() {
  return (
    <Suspense
      fallback={
        <AdminPageShell>
          <AdminTableSkeleton rows={6} columns={6} />
        </AdminPageShell>
      }
    >
      <FailoverV2Page />
    </Suspense>
  );
}

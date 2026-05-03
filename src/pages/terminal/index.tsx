import { Suspense, lazy } from "react";

import { Skeleton } from "@/components/ui/skeleton";

const TerminalClient = lazy(() => import("./TerminalClient"));

export default function TerminalRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen gap-2 bg-black p-4">
          <Skeleton className="h-full flex-1 bg-white/10" />
          <Skeleton className="hidden h-full w-80 bg-white/10 md:block" />
        </div>
      }
    >
      <TerminalClient />
    </Suspense>
  );
}

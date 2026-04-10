import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function UpDownStack({
  up,
  down,
  className,
  align = "start",
}: {
  up: ReactNode;
  down: ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
}) {
  const alignClass = {
    start: "items-start text-left",
    center: "items-center text-center",
    end: "items-end text-right",
  }[align];

  return (
    <div
      className={cn(
        "panel-muted flex min-h-[96px] flex-col justify-between px-4 py-4",
        alignClass,
        className,
      )}
    >
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {up}
      </div>
      <div className="mt-3 whitespace-pre-line text-sm font-semibold leading-6 text-foreground">
        {down}
      </div>
    </div>
  );
}

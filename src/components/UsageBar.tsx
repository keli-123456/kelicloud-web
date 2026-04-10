import React from "react";
import { cn } from "@/lib/utils";

interface UsageBarProps {
  value: number; // Utilization percentage (0–100)
  label: string; // Label for the bar (e.g., "CPU", "Memory", "Disk")
  compact?: boolean; // Whether to show in compact mode (for tables)
  max?: number; // Maximum value for the bar (e.g., total RAM, total disk space)
}

const UsageBar = React.memo(
  ({ value, label, compact = false, max = 100 }: UsageBarProps) => {
    const clampedValue = Math.min(Math.max(value, 0), max);
    const getColor = (val: number) => {
      if (val >= 80) return "bg-[color:var(--destructive)]";
      if (val >= 60) return "bg-amber-500";
      return "bg-[var(--accent-9)]";
    };

    const barColor = getColor(clampedValue);

    if (compact) {
      return (
        <div className="w-full">
          <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-muted/90">
            <div
              className={cn("h-full rounded-full transition-[width] duration-500 ease-out", barColor)}
              style={{
                width: `${clampedValue}%`,
              }}
            />
          </div>
          <span className="text-[13px] text-muted-foreground">
            {clampedValue.toFixed(1)}%
          </span>
        </div>
      );
    }

    return (
      <div className="flex w-full flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-sm font-medium">{clampedValue.toFixed(1)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted/90">
          <div
            className={cn("h-full rounded-full transition-[width] duration-500 ease-out", barColor)}
            style={{
              width: `${clampedValue}%`,
            }}
          />
        </div>
      </div>
    );
  },
);

export default UsageBar;

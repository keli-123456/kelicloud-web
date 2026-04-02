import React, {
  Suspense,
  lazy,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const MiniPingChart = lazy(() => import("./MiniPingChart"));

interface FloatMiniPingChartProps {
  uuid: string;
  trigger: React.ReactNode; 
  chartWidth?: string | number; 
  chartHeight?: string | number;
  hours?: number;
}

const MiniPingChartFloat: React.FC<FloatMiniPingChartProps> = ({
  uuid,
  trigger,
  chartWidth = 400, 
  chartHeight = 200, 
  hours = 12,
}) => {
  const [open, setOpen] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = window.setTimeout(() => {
      setOpen(true);
    }, 3000);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 200); 
  }, []);

  const handleClick = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setOpen((prev) => !prev);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          style={{ cursor: "pointer" }}
          className="flex items-center justify-center"
        >
          {trigger}
        </span>
      </PopoverTrigger>
      <PopoverContent
        sideOffset={5}
        onMouseEnter={handleMouseEnter} // Keep open on mouse enter popover content
        onMouseLeave={handleMouseLeave} // Close on mouse leave popover content
        style={{
          padding: 0,
          border: "none",
          boxShadow: "hsl(206 22% 7% / 35%) 0px 10px 38px -10px, hsl(206 22% 7% / 20%) 0px 10px 20px -15px", // Subtle shadow
          borderRadius: "var(--radius-3)",
          zIndex: 5,
        }}
      >
        {open ? (
          <Suspense
            fallback={
              <div
                className="flex items-center justify-center text-sm text-muted-foreground"
                style={{ width: chartWidth, height: chartHeight }}
              >
                Loading...
              </div>
            }
          >
            <MiniPingChart
              hours={hours}
              uuid={uuid}
              width={chartWidth}
              height={chartHeight}
            />
          </Suspense>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};

export default MiniPingChartFloat;

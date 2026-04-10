import React, { useState } from "react";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";

interface TipsProps {
  size?: string;
  color?: string;
  children?: React.ReactNode;
  trigger?: React.ReactNode;
  mode?: "popup" | "dialog" | "auto";
  side?: "top" | "right" | "bottom" | "left";
}

const Tips: React.FC<TipsProps & React.HTMLAttributes<HTMLDivElement>> = ({
  size = "16",
  color = "gray",
  trigger,
  children,
  side = "bottom",
  mode = "popup",
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const isDialog = mode === "dialog" || (mode === "auto" && isMobile);
  const iconSize = Number(size) || 16;
  const triggerNode = trigger ?? <Info color={color} size={iconSize} />;
  const triggerButton = (
    <button
      type="button"
      className="inline-flex min-h-6 min-w-6 cursor-pointer items-center justify-center rounded-full border border-transparent bg-transparent font-bold text-muted-foreground transition-all hover:border-border/60 hover:bg-background/70 hover:text-foreground"
      onMouseEnter={!isDialog && !isMobile ? () => setIsOpen(true) : undefined}
      onMouseLeave={!isDialog && !isMobile ? () => setIsOpen(false) : undefined}
      aria-label="Open tips"
    >
      {triggerNode}
    </button>
  );

  return (
    <div className="relative inline-block" {...props}>
      {isDialog ? (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>{triggerButton}</DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <div className="flex flex-col gap-2 text-sm">
              <div>{children}</div>
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
          <PopoverContent
            side={side}
            sideOffset={5}
            onMouseEnter={!isMobile ? () => setIsOpen(true) : undefined}
            onMouseLeave={!isMobile ? () => setIsOpen(false) : undefined}
            className="min-w-48 text-sm"
          >
            <div className="relative">{children}</div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default Tips;

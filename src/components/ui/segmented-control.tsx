import * as React from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

type SegmentedControlSize = "1" | "2" | "3";
type SegmentedControlRadius = "md" | "lg" | "full";

type SegmentedControlRootProps = Omit<
  React.ComponentProps<typeof ToggleGroup>,
  | "type"
  | "variant"
  | "value"
  | "defaultValue"
  | "onValueChange"
  | "spacing"
  | "size"
> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  radius?: SegmentedControlRadius;
  size?: SegmentedControlSize;
};

type SegmentedControlItemProps = React.ComponentProps<typeof ToggleGroupItem>;

const sizeClasses: Record<SegmentedControlSize, string> = {
  "1": "[&_[data-slot=toggle-group-item]]:h-8 [&_[data-slot=toggle-group-item]]:px-3 [&_[data-slot=toggle-group-item]]:text-sm",
  "2": "[&_[data-slot=toggle-group-item]]:h-9 [&_[data-slot=toggle-group-item]]:px-3.5 [&_[data-slot=toggle-group-item]]:text-sm",
  "3": "[&_[data-slot=toggle-group-item]]:h-10 [&_[data-slot=toggle-group-item]]:px-4 [&_[data-slot=toggle-group-item]]:text-base",
};

const radiusClasses: Record<SegmentedControlRadius, string> = {
  md: "rounded-lg [&_[data-slot=toggle-group-item]]:rounded-md",
  lg: "rounded-lg [&_[data-slot=toggle-group-item]]:rounded-md",
  full: "rounded-full [&_[data-slot=toggle-group-item]]:rounded-full",
};

function SegmentedControlRoot({
  className,
  children,
  value,
  defaultValue,
  onValueChange,
  radius = "lg",
  size = "2",
  ...props
}: SegmentedControlRootProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const currentValue = value ?? internalValue;

  return (
    <ToggleGroup
      type="single"
      value={currentValue}
      spacing={1}
      variant="default"
      className={cn(
        "inline-flex w-auto items-center bg-muted/50 p-1 shadow-none",
        radiusClasses[radius],
        sizeClasses[size],
        className,
      )}
      onValueChange={(nextValue) => {
        if (!nextValue) return;
        if (value === undefined) {
          setInternalValue(nextValue);
        }
        onValueChange?.(nextValue);
      }}
      {...props}
    >
      {children}
    </ToggleGroup>
  );
}

function SegmentedControlItem({
  className,
  children,
  ...props
}: SegmentedControlItemProps) {
  return (
    <ToggleGroupItem
      className={cn(
        "border-0 bg-transparent font-medium text-muted-foreground shadow-none hover:bg-background/70 hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-none",
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupItem>
  );
}

const SegmentedControl = {
  Root: SegmentedControlRoot,
  Item: SegmentedControlItem,
};

export {
  SegmentedControl,
  SegmentedControlItem,
  SegmentedControlRoot,
  type SegmentedControlItemProps,
  type SegmentedControlRootProps,
};

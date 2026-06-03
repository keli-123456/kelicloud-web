import * as React from "react";

import { Badge as ShadBadge } from "@/components/ui/badge";
import { Button as ShadButton } from "@/components/ui/button";
import { Checkbox as ShadCheckbox } from "@/components/ui/checkbox";
import { Card as ShadCard } from "@/components/ui/card";
import {
  Dialog as ShadDialog,
  DialogClose as ShadDialogClose,
  DialogContent as ShadDialogContent,
  DialogDescription as ShadDialogDescription,
  DialogTitle as ShadDialogTitle,
  DialogTrigger as ShadDialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select as ShadSelect,
  SelectContent as ShadSelectContent,
  SelectItem as ShadSelectItem,
  SelectTrigger as ShadSelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs as ShadTabs,
  TabsContent as ShadTabsContent,
  TabsList as ShadTabsList,
  TabsTrigger as ShadTabsTrigger,
} from "@/components/ui/tabs";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch as ShadSwitch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Tone = "gray" | "red" | "amber" | "green" | "blue";
type LegacyButtonVariant = "solid" | "soft" | "outline";
type LegacyButtonSize = "1" | "2" | "3";

const softToneClasses: Record<Tone, string> = {
  gray: "border-border bg-[var(--surface-subtle)] text-foreground hover:bg-[var(--surface-hover)]",
  red: "border-red-200 bg-red-50/80 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200 dark:hover:bg-red-950/55",
  amber:
    "border-amber-200 bg-amber-50/80 text-amber-700 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-200 dark:hover:bg-amber-950/55",
  green:
    "border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-200 dark:hover:bg-emerald-950/55",
  blue: "border-blue-200 bg-blue-50/80 text-blue-700 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/35 dark:text-blue-200 dark:hover:bg-blue-950/55",
};

const solidToneClasses: Partial<Record<Tone, string>> = {
  amber:
    "border-amber-500 bg-amber-500 text-white hover:bg-amber-600 dark:border-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500",
  green:
    "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500",
  blue: "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
};

const flexDirectionClasses = {
  row: "flex-row",
  column: "flex-col",
} as const;

const justifyClasses = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
} as const;

const alignClasses = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
} as const;

const wrapClasses = {
  nowrap: "flex-nowrap",
  wrap: "flex-wrap",
} as const;

const gapClasses = {
  "1": "gap-1",
  "2": "gap-2",
  "3": "gap-3",
  "4": "gap-4",
  "5": "gap-5",
  "6": "gap-6",
} as const;

function mapButtonSize(size?: LegacyButtonSize) {
  if (size === "1") return "sm" as const;
  if (size === "3") return "lg" as const;
  return "default" as const;
}

function mapButtonVariant(variant?: LegacyButtonVariant, color?: Tone) {
  if (variant === "outline") {
    return { variant: "outline" as const, className: "" };
  }

  if (variant === "soft") {
    return {
      variant: "outline" as const,
      className: softToneClasses[color || "gray"],
    };
  }

  if (color === "red") {
    return { variant: "destructive" as const, className: "" };
  }

  if (color && solidToneClasses[color]) {
    return {
      variant: "default" as const,
      className: solidToneClasses[color],
    };
  }

  return { variant: "default" as const, className: "" };
}

type ButtonProps = Omit<
  React.ComponentProps<typeof ShadButton>,
  "size" | "variant"
> & {
  color?: Tone;
  size?: LegacyButtonSize | "sm" | "default" | "lg" | "icon";
  variant?:
    | LegacyButtonVariant
    | "default"
    | "destructive"
    | "secondary"
    | "ghost"
    | "link";
};

function Button({
  color,
  size,
  variant,
  className,
  ...props
}: ButtonProps) {
  const mapped =
    variant === "default"
      ? { variant: "default" as const, className: "" }
      : variant === "destructive"
        ? { variant: "destructive" as const, className: "" }
        : variant === "secondary"
          ? { variant: "secondary" as const, className: "" }
          : variant === "ghost"
            ? { variant: "ghost" as const, className: "" }
            : variant === "link"
              ? { variant: "link" as const, className: "" }
              : mapButtonVariant(
                  variant as LegacyButtonVariant | undefined,
                  color,
                );

  const resolvedSize =
    size === "sm" || size === "default" || size === "lg" || size === "icon"
      ? size
      : mapButtonSize(size as LegacyButtonSize | undefined);

  return (
    <ShadButton
      variant={mapped.variant}
      size={resolvedSize}
      className={cn(mapped.className, className)}
      {...props}
    />
  );
}

function IconButton({
  className,
  size,
  ...props
}: Omit<ButtonProps, "size"> & { size?: LegacyButtonSize | "icon" }) {
  return (
    <Button
      size={size === "1" ? "icon" : size || "icon"}
      className={cn("h-8 w-8 p-0", className)}
      {...props}
    />
  );
}

type BadgeProps = Omit<React.ComponentProps<typeof ShadBadge>, "variant"> & {
  color?: Tone;
  variant?: "soft" | "solid";
};

function Badge({ color = "gray", variant, ...props }: BadgeProps) {
  const resolvedVariant =
    color === "green"
      ? "success"
      : color === "amber"
        ? "warning"
        : color === "blue"
          ? "info"
          : color === "red"
            ? "destructive"
            : "secondary";
  const className =
    variant === "solid"
      ? color === "green"
        ? "border-transparent bg-emerald-600 text-white dark:bg-emerald-600"
        : color === "amber"
          ? "border-transparent bg-amber-500 text-white dark:bg-amber-500"
          : color === "blue"
            ? "border-transparent bg-blue-600 text-white dark:bg-blue-600"
            : color === "red"
              ? "border-transparent bg-red-600 text-white dark:bg-red-600"
              : "border-transparent bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
      : "";

  return (
    <ShadBadge
      variant={resolvedVariant}
      className={cn(className, props.className)}
      {...props}
    />
  );
}

type FlexProps = React.ComponentProps<"div"> & {
  direction?: keyof typeof flexDirectionClasses;
  justify?: keyof typeof justifyClasses;
  align?: keyof typeof alignClasses;
  wrap?: keyof typeof wrapClasses;
  gap?: keyof typeof gapClasses;
};

function Flex({
  direction = "row",
  justify,
  align,
  wrap,
  gap,
  className,
  ...props
}: FlexProps) {
  return (
    <div
      className={cn(
        "flex",
        flexDirectionClasses[direction],
        justify ? justifyClasses[justify] : "",
        align ? alignClasses[align] : "",
        wrap ? wrapClasses[wrap] : "",
        gap ? gapClasses[gap] : "",
        className,
      )}
      {...props}
    />
  );
}

type CheckboxProps = React.ComponentProps<typeof ShadCheckbox> & {
  size?: LegacyButtonSize;
};

function Checkbox({ size, className, ...props }: CheckboxProps) {
  return (
    <ShadCheckbox
      className={cn(size === "1" ? "size-4" : "", className)}
      {...props}
    />
  );
}

const TextArea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<typeof Textarea> & {
    resize?: "none" | "vertical" | "horizontal" | "both";
  }
>(({ className, resize, ...props }, ref) => {
  return (
    <Textarea
      ref={ref}
      className={cn(
        resize === "none"
          ? "resize-none"
          : resize === "horizontal"
            ? "resize-x"
            : resize === "both"
              ? "resize"
              : resize === "vertical"
                ? "resize-y"
                : "",
        className,
      )}
      {...props}
    />
  );
});
TextArea.displayName = "AdminTextArea";

function Text({
  size,
  className,
  ...props
}: React.ComponentProps<"span"> & {
  size?: "1" | "2" | "3" | "4" | "5" | "6";
}) {
  return (
    <span
      className={cn(
        size === "1"
          ? "text-sm"
          : size === "2"
            ? "text-base"
            : size === "3"
              ? "text-lg"
              : size === "4"
                ? "text-xl"
                : size === "5"
                  ? "text-2xl"
                  : size === "6"
                    ? "text-3xl"
                    : "",
        className,
      )}
      {...props}
    />
  );
}

type TextFieldSlotProps = React.ComponentProps<"div"> & {
  side?: "left" | "right";
};

function TextFieldSlot({
  side = "left",
  className,
  ...props
}: TextFieldSlotProps) {
  return <div data-side={side} className={className} {...props} />;
}

const TextFieldRoot = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<typeof Input>, "size"> & {
    size?: "1" | "2" | "3";
    children?: React.ReactNode;
  }
>(({ className, size = "2", children, ...props }, ref) => {
  const childArray = React.Children.toArray(children);
  const slotChildren = childArray.filter(
    (child): child is React.ReactElement<TextFieldSlotProps> =>
      React.isValidElement<TextFieldSlotProps>(child) &&
      child.type === TextFieldSlot,
  );
  const leftSlot = slotChildren.find((child) => child.props.side !== "right");
  const rightSlot = slotChildren.find((child) => child.props.side === "right");

  const input = (
    <Input
      ref={ref}
      className={cn(
        size === "1"
          ? "h-8 text-sm"
          : size === "3"
            ? "h-11 text-base"
            : "",
        leftSlot ? "pl-10" : "",
        rightSlot ? "pr-12" : "",
        className,
      )}
      {...props}
    />
  );

  if (!leftSlot && !rightSlot) {
    return input;
  }

  return (
    <div className="relative w-full">
      {leftSlot && (
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground [&>*]:pointer-events-auto">
          {leftSlot.props.children}
        </div>
      )}
      {input}
      {rightSlot && (
        <div className="absolute inset-y-0 right-2 flex items-center text-muted-foreground">
          {rightSlot.props.children}
        </div>
      )}
    </div>
  );
});
TextFieldRoot.displayName = "AdminTextFieldRoot";

const TextField = {
  Root: TextFieldRoot,
  Slot: TextFieldSlot,
};

function DialogTrigger({
  children,
  ...props
}: React.ComponentProps<typeof ShadDialogTrigger>) {
  if (React.isValidElement(children)) {
    return (
      <ShadDialogTrigger asChild {...props}>
        {children}
      </ShadDialogTrigger>
    );
  }

  return <ShadDialogTrigger {...props}>{children}</ShadDialogTrigger>;
}

function DialogClose({
  children,
  ...props
}: React.ComponentProps<typeof ShadDialogClose>) {
  if (React.isValidElement(children)) {
    return (
      <ShadDialogClose asChild {...props}>
        {children}
      </ShadDialogClose>
    );
  }

  return <ShadDialogClose {...props}>{children}</ShadDialogClose>;
}

function DialogContent({
  className,
  style,
  maxWidth,
  ...props
}: React.ComponentProps<typeof ShadDialogContent> & {
  maxWidth?: string | number;
}) {
  return (
    <ShadDialogContent
      className={cn("min-h-0", className)}
      style={{ ...style, maxWidth }}
      {...props}
    />
  );
}

const Dialog = {
  Root: ShadDialog,
  Trigger: DialogTrigger,
  Close: DialogClose,
  Content: DialogContent,
  Title: ShadDialogTitle,
  Description: ShadDialogDescription,
};

type SelectTriggerProps = React.ComponentProps<typeof ShadSelectTrigger> & {
  placeholder?: string;
};

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, placeholder, ...props }, ref) => {
    return (
      <ShadSelectTrigger
        ref={ref}
        className={cn("w-full justify-between", className)}
        {...props}
      >
        {children || <SelectValue placeholder={placeholder} />}
      </ShadSelectTrigger>
    );
  },
);
SelectTrigger.displayName = "AdminSelectTrigger";

const Select = {
  Root: ShadSelect,
  Trigger: SelectTrigger,
  Content: ShadSelectContent,
  Item: ShadSelectItem,
};

const Tabs = {
  Root: ShadTabs,
  List: ShadTabsList,
  Trigger: ShadTabsTrigger,
  Content: ShadTabsContent,
};

function Card({
  className,
  ...props
}: React.ComponentProps<typeof ShadCard>) {
  return <ShadCard className={cn("py-0", className)} {...props} />;
}

const Switch = ShadSwitch;

export {
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  Flex,
  IconButton,
  SegmentedControl,
  Select,
  Switch,
  Tabs,
  Text,
  TextArea,
  TextField,
};

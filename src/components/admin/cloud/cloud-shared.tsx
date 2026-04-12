import * as React from "react";
import { Copy } from "lucide-react";

import { Badge as ShadBadge } from "@/components/ui/badge";
import { Button as ShadButton } from "@/components/ui/button";
import { Checkbox as ShadCheckbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import {
  semanticToBadgeVariant,
  type StatusSemantic,
} from "@/lib/status-semantic";
import { cn } from "@/lib/utils";

type Tone = "gray" | "red" | "amber" | "green" | "blue";
type LegacyButtonVariant = "solid" | "soft" | "outline";
type LegacyButtonSize = "1" | "2" | "3";

const softToneClasses: Record<Tone, string> = {
  gray: "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800",
  red: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60",
  amber:
    "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60",
  green:
    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/60",
  blue: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950/60",
};

const solidToneClasses: Partial<Record<Tone, string>> = {
  amber:
    "border-amber-500 bg-amber-500 text-white hover:bg-amber-600 dark:border-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500",
  green:
    "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500",
  blue: "border-blue-600 bg-blue-600 text-white hover:bg-blue-700 dark:border-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500",
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

type BadgeProps = Omit<React.ComponentProps<typeof ShadBadge>, "variant"> & {
  color?: Tone;
  variant?: "soft" | "solid";
  semantic?: StatusSemantic;
};

function Badge({
  color = "gray",
  variant,
  semantic,
  ...props
}: BadgeProps) {
  const resolvedVariant = semantic
    ? semanticToBadgeVariant(semantic)
    : color === "green"
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
TextArea.displayName = "CloudTextArea";

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
      {leftSlot ? (
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground [&>*]:pointer-events-auto">
          {leftSlot.props.children}
        </div>
      ) : null}
      {input}
      {rightSlot ? (
        <div className="absolute inset-y-0 right-2 flex items-center text-muted-foreground">
          {rightSlot.props.children}
        </div>
      ) : null}
    </div>
  );
});
TextFieldRoot.displayName = "CloudTextFieldRoot";

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
SelectTrigger.displayName = "CloudSelectTrigger";

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

const cloudDialogContentClassName =
  "w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] min-w-0 overflow-x-hidden overscroll-contain [scrollbar-gutter:stable] sm:max-w-3xl";

const cloudDialogWideContentClassName =
  "w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] min-w-0 overflow-x-hidden overscroll-contain [scrollbar-gutter:stable] sm:max-w-5xl";

const cloudLongTextClassName =
  "min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]";

const cloudSecretTextareaClassName =
  "mt-3 min-h-24 max-w-full resize-y font-mono text-xs [overflow-wrap:anywhere]";

const cloudTallSecretTextareaClassName =
  "mt-3 min-h-40 max-w-full resize-y font-mono text-xs [overflow-wrap:anywhere]";

const cloudPanelCardClassName =
  "overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40";

const cloudPanelHeaderClassName =
  "border-b border-slate-200 px-5 py-4 dark:border-slate-800";

const cloudPanelTitleClassName =
  "text-sm font-medium text-slate-900 dark:text-slate-100";

const cloudPanelDescriptionClassName =
  "mt-1 text-sm text-slate-500 dark:text-slate-400";

const cloudPanelSectionClassName =
  "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50";

const cloudPanelSubcardClassName =
  "rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50";

const cloudPanelFieldLabelClassName =
  "text-sm font-medium text-slate-800 dark:text-slate-100";

const cloudPanelBodyTextClassName =
  "text-sm text-slate-700 dark:text-slate-300";

const cloudDetailSectionClassName =
  "border-t border-slate-200 pt-4 dark:border-slate-800";

const cloudDetailListClassName =
  "overflow-hidden rounded-lg border border-slate-200/80 dark:border-slate-800";

const cloudDetailListItemClassName =
  "border-t border-slate-200 px-4 py-3 first:border-t-0 dark:border-slate-800";

type CloudDetailItemProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
  valueClassName?: string;
  variant?: "card" | "plain";
};

function CloudDetailItem({
  label,
  value,
  className,
  valueClassName,
  variant = "card",
}: CloudDetailItemProps) {
  return (
    <div
      className={cn(
        variant === "plain"
          ? "min-w-0 border-b border-slate-200 py-3 last:border-b-0 dark:border-slate-800"
          : "min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60",
        className,
      )}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 min-w-0 text-sm text-slate-900 dark:text-slate-100",
          cloudLongTextClassName,
          valueClassName,
        )}
      >
        {value === undefined || value === null || value === "" ? "-" : value}
      </div>
    </div>
  );
}

type CloudCopyBlockProps = {
  title: React.ReactNode;
  onCopy: () => void;
  copyLabel?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
};

function CloudCopyBlock({
  title,
  onCopy,
  copyLabel = "Copy",
  className,
  titleClassName,
  contentClassName,
  children,
}: CloudCopyBlockProps) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className={cn(
            "min-w-0 text-sm font-medium text-slate-800 dark:text-slate-100",
            cloudLongTextClassName,
            titleClassName,
          )}
        >
          {title}
        </div>
        <Button
          variant="outline"
          size="1"
          className="shrink-0 self-start sm:self-auto"
          onClick={onCopy}
        >
          <Copy className="mr-1 h-3.5 w-3.5" />
          {copyLabel}
        </Button>
      </div>
      <div className={cn("mt-3 min-w-0", contentClassName)}>{children}</div>
    </div>
  );
}

export {
  Badge,
  Button,
  Checkbox,
  CloudCopyBlock,
  CloudDetailItem,
  Dialog,
  Flex,
  Select,
  Tabs,
  TextArea,
  TextField,
  cloudPanelBodyTextClassName,
  cloudDialogContentClassName,
  cloudPanelCardClassName,
  cloudPanelDescriptionClassName,
  cloudPanelFieldLabelClassName,
  cloudPanelHeaderClassName,
  cloudPanelSectionClassName,
  cloudPanelSubcardClassName,
  cloudPanelTitleClassName,
  cloudDetailSectionClassName,
  cloudDetailListClassName,
  cloudDetailListItemClassName,
  cloudDialogWideContentClassName,
  cloudLongTextClassName,
  cloudSecretTextareaClassName,
  cloudTallSecretTextareaClassName,
};

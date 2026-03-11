import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ChevronDown } from "lucide-react"

import { Badge as ShadBadge } from "@/components/ui/badge"
import { Button as ShadButton } from "@/components/ui/button"
import { Checkbox as ShadCheckbox } from "@/components/ui/checkbox"
import {
  DropdownMenu as BaseDropdownMenuRoot,
  DropdownMenuContent as BaseDropdownMenuContent,
  DropdownMenuItem as BaseDropdownMenuItem,
  DropdownMenuTrigger as BaseDropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type Space = string | number | undefined

type SpacingProps = {
  gap?: Space
  rowGap?: Space
  columnGap?: Space
  p?: Space
  px?: Space
  py?: Space
  pt?: Space
  pr?: Space
  pb?: Space
  pl?: Space
  m?: Space
  mx?: Space
  my?: Space
  mt?: Space
  mr?: Space
  mb?: Space
  ml?: Space
  width?: string | number
  height?: string | number
  maxWidth?: string | number
  minWidth?: string | number
}

const SPACE_SCALE: Record<string, string> = {
  "0": "0",
  "1": "0.25rem",
  "2": "0.5rem",
  "3": "0.75rem",
  "4": "1rem",
  "5": "1.25rem",
  "6": "1.5rem",
  "7": "2rem",
  "8": "2.5rem",
  "9": "3rem",
}

function toCssUnit(value: string | number | undefined) {
  if (value === undefined || value === null) return undefined
  if (typeof value === "number") return `${value}px`
  if (SPACE_SCALE[value]) return SPACE_SCALE[value]
  return value
}

function spacingStyle(props: SpacingProps, style?: React.CSSProperties) {
  return {
    ...style,
    gap: toCssUnit(props.gap),
    rowGap: toCssUnit(props.rowGap),
    columnGap: toCssUnit(props.columnGap),
    padding: toCssUnit(props.p),
    paddingLeft: toCssUnit(props.pl ?? props.px),
    paddingRight: toCssUnit(props.pr ?? props.px),
    paddingTop: toCssUnit(props.pt ?? props.py),
    paddingBottom: toCssUnit(props.pb ?? props.py),
    margin: toCssUnit(props.m),
    marginLeft: toCssUnit(props.ml ?? props.mx),
    marginRight: toCssUnit(props.mr ?? props.mx),
    marginTop: toCssUnit(props.mt ?? props.my),
    marginBottom: toCssUnit(props.mb ?? props.my),
    width: toCssUnit(props.width),
    height: toCssUnit(props.height),
    maxWidth: toCssUnit(props.maxWidth),
    minWidth: toCssUnit(props.minWidth),
  }
}

function colorStyle(color?: string, scale = "11") {
  if (!color) return undefined
  return { color: `var(--${color}-${scale})` }
}

function toneClasses(color?: string) {
  switch (color) {
    case "red":
    case "ruby":
    case "crimson":
      return {
        soft:
          "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200",
        solid:
          "border-red-600 bg-red-600 text-white hover:bg-red-700",
      }
    case "orange":
    case "amber":
    case "yellow":
      return {
        soft:
          "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200",
        solid:
          "border-amber-500 bg-amber-500 text-white hover:bg-amber-600",
      }
    case "green":
    case "grass":
    case "jade":
      return {
        soft:
          "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200",
        solid:
          "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700",
      }
    case "blue":
    case "cyan":
    case "sky":
    case "indigo":
      return {
        soft:
          "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-200",
        solid:
          "border-blue-600 bg-blue-600 text-white hover:bg-blue-700",
      }
    default:
      return {
        soft:
          "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
        solid:
          "border-slate-900 bg-slate-900 text-white hover:bg-slate-800 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900",
      }
  }
}

function mapButtonVariant(variant?: string) {
  switch (variant) {
    case "outline":
      return "outline" as const
    case "ghost":
      return "ghost" as const
    case "soft":
      return "outline" as const
    default:
      return "default" as const
  }
}

function mapButtonSize(size?: string | number) {
  if (size === "1" || size === 1) return "sm" as const
  if (size === "3" || size === 3) return "lg" as const
  return "default" as const
}

function mapTextSize(size?: string | number) {
  switch (String(size ?? "")) {
    case "1":
      return "text-[13px]"
    case "2":
      return "text-sm"
    case "3":
      return "text-[15px]"
    case "4":
      return "text-lg"
    case "5":
      return "text-xl"
    default:
      return ""
  }
}

function mapTextWeight(weight?: string) {
  switch (weight) {
    case "bold":
      return "font-semibold"
    case "medium":
      return "font-medium"
    case "light":
      return "font-light"
    default:
      return ""
  }
}

const Flex = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> &
    SpacingProps & {
      direction?: "row" | "column" | "row-reverse" | "column-reverse"
      align?: "start" | "center" | "end" | "baseline" | "stretch"
      justify?: "start" | "center" | "end" | "between" | "around" | "evenly"
      wrap?: "nowrap" | "wrap" | "wrap-reverse"
    }
>(
  (
    {
      className,
      direction = "row",
      align,
      justify,
      wrap,
      style,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn("flex", className)}
      style={spacingStyle(
        props,
        {
          ...style,
          flexDirection: direction,
          alignItems:
            align === "start"
              ? "flex-start"
              : align === "end"
                ? "flex-end"
                : align,
          justifyContent:
            justify === "between"
              ? "space-between"
              : justify === "around"
                ? "space-around"
                : justify === "evenly"
                  ? "space-evenly"
                  : justify === "start"
                    ? "flex-start"
                    : justify === "end"
                      ? "flex-end"
                      : justify,
          flexWrap: wrap,
        },
      )}
      {...props}
    />
  ),
)
Flex.displayName = "Flex"

function Box({
  as: Comp = "div",
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLElement> &
  SpacingProps & {
    as?: React.ElementType
  }) {
  return (
    <Comp
      className={className}
      style={spacingStyle(props, style)}
      {...props}
    />
  )
}

function Text({
  as: Comp = "span",
  className,
  style,
  size,
  weight,
  color,
  wrap,
  ...props
}: React.HTMLAttributes<HTMLElement> &
  SpacingProps & {
    as?: React.ElementType
    size?: string | number
    weight?: "light" | "medium" | "bold"
    color?: string
    wrap?: "wrap" | "nowrap"
  }) {
  return (
    <Comp
      className={cn(
        mapTextSize(size),
        mapTextWeight(weight),
        wrap === "nowrap" && "whitespace-nowrap",
        className,
      )}
      style={spacingStyle(props, { ...style, ...colorStyle(color) })}
      {...props}
    />
  )
}

function Heading({
  as: Comp = "h2",
  className,
  size = "4",
  style,
  ...props
}: React.HTMLAttributes<HTMLElement> &
  SpacingProps & {
    as?: React.ElementType
    size?: string | number
  }) {
  const sizeClass =
    String(size) === "2"
      ? "text-xl"
      : String(size) === "3"
        ? "text-lg"
        : String(size) === "5"
          ? "text-3xl"
          : "text-2xl"
  return (
    <Comp
      className={cn("font-semibold tracking-tight text-slate-900", sizeClass, className)}
      style={spacingStyle(props, style)}
      {...props}
    />
  )
}

function Card({
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & SpacingProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-white shadow-sm",
        className,
      )}
      style={spacingStyle(props, style)}
      {...props}
    />
  )
}

function Skeleton({
  className,
  width,
  height,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> &
  SpacingProps & {
    width?: string | number
    height?: string | number
  }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200/70", className)}
      style={spacingStyle({ width, height }, style)}
      {...props}
    />
  )
}

function Grid({
  className,
  columns,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> &
  SpacingProps & {
    columns?:
      | string
      | number
      | Partial<Record<"initial" | "sm" | "md" | "lg", string | number>>
  }) {
  const columnClass = (() => {
    if (!columns || typeof columns === "number" || typeof columns === "string") {
      return ""
    }
    const entries = Object.entries(columns)
    return entries
      .map(([bp, value]) => {
        const prefix =
          bp === "initial" ? "" : bp === "sm" ? "sm:" : bp === "md" ? "md:" : "lg:"
        const val = String(value)
        if (["1", "2", "3", "4"].includes(val)) {
          return `${prefix}grid-cols-${val}`
        }
        return ""
      })
      .filter(Boolean)
      .join(" ")
  })()

  const inlineColumns =
    columns && typeof columns !== "object"
      ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
      : undefined

  return (
    <div
      className={cn("grid", columnClass, className)}
      style={spacingStyle(props, { ...inlineColumns, ...style })}
      {...props}
    />
  )
}

function Button({
  className,
  variant = "solid",
  size,
  color,
  radius,
  style,
  ...props
}: Omit<React.ComponentProps<typeof ShadButton>, "variant" | "size"> & {
  variant?: "solid" | "soft" | "outline" | "ghost"
  size?: string | number
  color?: string
  radius?: "full" | string
}) {
  const tones = toneClasses(color)
  return (
    <ShadButton
      className={cn(
        "shadow-none",
        radius === "full" && "rounded-full",
        variant === "soft" ? tones.soft : undefined,
        variant === "solid" ? tones.solid : undefined,
        className,
      )}
      variant={mapButtonVariant(variant)}
      size={mapButtonSize(size as string | number)}
      style={style}
      {...props}
    />
  )
}

function IconButton({
  className,
  variant = "solid",
  size,
  color,
  radius,
  ...props
}: Omit<React.ComponentProps<typeof ShadButton>, "variant" | "size"> & {
  variant?: "solid" | "soft" | "outline" | "ghost"
  size?: string | number
  color?: string
  radius?: "full" | string
}) {
  return (
    <Button
      className={cn("h-9 w-9 p-0", className)}
      variant={variant}
      color={color}
      radius={radius}
      size={size}
      {...props}
    />
  )
}

type TextFieldSlotProps = React.HTMLAttributes<HTMLSpanElement> & {
  side?: "left" | "right"
}

const TextFieldSlot = ({
  className,
  side = "left",
  ...props
}: TextFieldSlotProps) => (
  <span
    data-side={side}
    className={cn(
      "flex shrink-0 items-center text-slate-400 [&_svg]:size-4",
      side === "right" ? "pl-2" : "pr-2",
      className,
    )}
    {...props}
  />
)

const TextFieldRoot = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "size"> & {
    size?: string | number
    children?: React.ReactNode
  }
>(({ className, children, style, size, ...props }, ref) => {
  const childNodes = React.Children.toArray(children)
  const leftSlots = childNodes.filter(
    (child) =>
      React.isValidElement<TextFieldSlotProps>(child) &&
      child.type === TextFieldSlot &&
      (child.props.side ?? "left") !== "right",
  )
  const rightSlots = childNodes.filter(
    (child) =>
      React.isValidElement<TextFieldSlotProps>(child) &&
      child.type === TextFieldSlot &&
      child.props.side === "right",
  )
  const heightClass =
    String(size) === "1" ? "h-8" : String(size) === "3" ? "h-10" : "h-9"

  return (
    <div
      className={cn(
        "flex w-full items-center rounded-md border border-slate-200 bg-white px-3 text-sm shadow-none focus-within:ring-2 focus-within:ring-slate-200",
        heightClass,
        className,
      )}
      style={style}
    >
      {leftSlots}
      <input
        ref={ref}
        className="w-full min-w-0 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-slate-400"
        {...props}
      />
      {rightSlots}
    </div>
  )
})
TextFieldRoot.displayName = "TextFieldRoot"

const TextField = {
  Root: TextFieldRoot,
  Slot: TextFieldSlot,
}

const TextArea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<typeof Textarea> & {
    resize?: "none" | "vertical" | "horizontal" | "both"
  }
>(({ className, resize, style, ...props }, ref) => (
  <Textarea
    ref={ref}
    className={cn("border-slate-200 bg-white text-sm shadow-none focus-visible:ring-slate-200", className)}
    style={{ ...style, resize }}
    {...props}
  />
))
TextArea.displayName = "TextArea"

const Switch = React.forwardRef<
  HTMLButtonElement,
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
    checked?: boolean
    defaultChecked?: boolean
    onCheckedChange?: (checked: boolean) => void
  }
>(({ checked, defaultChecked, onCheckedChange, className, disabled, ...props }, ref) => {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked ?? false)
  const resolvedChecked = checked ?? internalChecked

  const toggle = () => {
    if (disabled) return
    const next = !resolvedChecked
    if (checked === undefined) {
      setInternalChecked(next)
    }
    onCheckedChange?.(next)
  }

  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={resolvedChecked}
      disabled={disabled}
      onClick={toggle}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-slate-300 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        resolvedChecked && "bg-slate-900",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          resolvedChecked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  )
})
Switch.displayName = "Switch"

function Checkbox({
  size: _size,
  ...props
}: React.ComponentProps<typeof ShadCheckbox> & {
  size?: string | number
}) {
  return <ShadCheckbox {...props} />
}

function Badge({
  className,
  color,
  variant = "soft",
  style,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  color?: string
  variant?: "solid" | "soft" | "outline"
}) {
  if (color) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium [&_svg]:size-3.5",
          className,
        )}
        style={{
          ...style,
          borderColor: `var(--${color}-6)`,
          backgroundColor: variant === "solid" ? `var(--${color}-9)` : `var(--${color}-3)`,
          color: variant === "solid" ? `var(--${color}-12)` : `var(--${color}-11)`,
        }}
        {...props}
      />
    )
  }

  return (
    <ShadBadge
      className={className}
      variant={variant === "outline" ? "outline" : "secondary"}
      style={style}
      {...props}
    />
  )
}

const DialogRoot = DialogPrimitive.Root

function DialogTrigger({
  children,
  asChild,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  const resolvedAsChild = asChild ?? React.isValidElement(children)
  return (
    <DialogPrimitive.Trigger asChild={resolvedAsChild} {...props}>
      {children}
    </DialogPrimitive.Trigger>
  )
}

function DialogClose({
  children,
  asChild,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  const resolvedAsChild = asChild ?? React.isValidElement(children)
  return (
    <DialogPrimitive.Close asChild={resolvedAsChild} {...props}>
      {children}
    </DialogPrimitive.Close>
  )
}

function DialogContent({
  className,
  children,
  maxWidth,
  style,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  maxWidth?: string | number
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-xl",
          className,
        )}
        style={{ ...style, maxWidth: toCssUnit(maxWidth) ?? style?.maxWidth }}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-base font-semibold tracking-tight text-slate-900", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  style,
  size: _size,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description> &
  SpacingProps & {
    size?: string | number
  }) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm leading-6 text-slate-500", className)}
      style={spacingStyle(props, style)}
      {...props}
    />
  )
}

const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
}

type PopoverContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null)

function PopoverRoot({
  open,
  defaultOpen,
  onOpenChange,
  children,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false)
  const resolvedOpen = open ?? internalOpen
  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (open === undefined) {
        setInternalOpen(nextOpen)
      }
      onOpenChange?.(nextOpen)
    },
    [onOpenChange, open],
  )

  return (
    <PopoverContext.Provider value={{ open: resolvedOpen, setOpen }}>
      {children}
    </PopoverContext.Provider>
  )
}

function PopoverTrigger({
  children,
  asChild,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean
}) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, props)
  }
  return <div {...props}>{children}</div>
}

function PopoverContent({
  className,
  side = "bottom",
  sideOffset = 4,
  children,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  side?: "top" | "right" | "bottom" | "left"
  sideOffset?: number
}) {
  const context = React.useContext(PopoverContext)
  if (!context?.open) return null

  const positionClass =
    side === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 -translate-y-1"
      : side === "right"
        ? "left-full top-1/2 -translate-y-1/2 translate-x-1"
        : side === "left"
          ? "right-full top-1/2 -translate-y-1/2 -translate-x-1"
          : "top-full left-1/2 -translate-x-1/2 translate-y-1"

  return (
    <div
      className={cn(
        "absolute z-50 rounded-md border border-slate-200 bg-white p-3 shadow-lg",
        positionClass,
        className,
      )}
      style={{ ...style, marginTop: side === "bottom" ? sideOffset : undefined }}
      {...props}
    >
      {children}
    </div>
  )
}

const Popover = {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Content: PopoverContent,
}

function DropdownMenuTrigger({
  children,
  asChild,
  ...props
}: React.ComponentProps<typeof BaseDropdownMenuTrigger>) {
  const resolvedAsChild = asChild ?? React.isValidElement(children)
  return (
    <BaseDropdownMenuTrigger asChild={resolvedAsChild} {...props}>
      {children}
    </BaseDropdownMenuTrigger>
  )
}

function DropdownMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof BaseDropdownMenuContent>) {
  return (
    <BaseDropdownMenuContent
      className={cn("border-slate-200 bg-white shadow-lg", className)}
      {...props}
    />
  )
}

const DropdownMenu = {
  Root: BaseDropdownMenuRoot,
  Trigger: DropdownMenuTrigger,
  Content: DropdownMenuContent,
  Item: BaseDropdownMenuItem,
  TriggerIcon: () => <ChevronDown className="size-3.5 opacity-70" />,
}

function Separator({
  className,
  style,
  size: _size,
  ...props
}: React.HTMLAttributes<HTMLDivElement> &
  SpacingProps & {
    size?: string | number
  }) {
  return (
    <div
      className={cn("h-px w-full bg-slate-200/80", className)}
      style={spacingStyle(props, style)}
      {...props}
    />
  )
}

function CalloutRoot({
  className,
  color,
  style,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  color?: string
  size?: string | number
}) {
  const tones = toneClasses(color)
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3 py-2 text-sm",
        color ? tones.soft : "border-slate-200 bg-slate-50 text-slate-700",
        className,
      )}
      style={style}
      {...props}
    >
      {children}
    </div>
  )
}

function CalloutIcon({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-0.5 shrink-0", className)} {...props} />
}

function CalloutText({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex-1", className)} {...props} />
}

const Callout = {
  Root: CalloutRoot,
  Icon: CalloutIcon,
  Text: CalloutText,
}

function Code({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <code
      className={cn(
        "rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-700",
        className,
      )}
      {...props}
    />
  )
}

type TabsContextValue = {
  value: string
  setValue: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useControllableValue({
  value,
  defaultValue,
  onValueChange,
}: {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "")
  const resolvedValue = value ?? internalValue
  const setValue = React.useCallback(
    (nextValue: string) => {
      if (value === undefined) {
        setInternalValue(nextValue)
      }
      onValueChange?.(nextValue)
    },
    [onValueChange, value],
  )
  return [resolvedValue, setValue] as const
}

function TabsRoot({
  value,
  defaultValue,
  onValueChange,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
  const [resolvedValue, setValue] = useControllableValue({
    value,
    defaultValue,
    onValueChange,
  })
  return (
    <TabsContext.Provider value={{ value: resolvedValue, setValue }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

function TabsList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1",
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  value,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string
}) {
  const context = React.useContext(TabsContext)
  const active = context?.value === value
  return (
    <button
      type="button"
      className={cn(
        "rounded-md px-3 py-1.5 text-sm transition-colors",
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900",
        className,
      )}
      onClick={() => context?.setValue(value)}
      {...props}
    />
  )
}

function TabsContent({
  value,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value: string
}) {
  const context = React.useContext(TabsContext)
  if (context?.value !== value) return null
  return <div {...props}>{children}</div>
}

const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
}

const SegmentedControlContext = React.createContext<TabsContextValue | null>(null)

function SegmentedControlRoot({
  value,
  defaultValue,
  onValueChange,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
  const [resolvedValue, setValue] = useControllableValue({
    value,
    defaultValue,
    onValueChange,
  })
  return (
    <SegmentedControlContext.Provider value={{ value: resolvedValue, setValue }}>
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SegmentedControlContext.Provider>
  )
}

function SegmentedControlItem({
  value,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string
}) {
  const context = React.useContext(SegmentedControlContext)
  const active = context?.value === value
  return (
    <button
      type="button"
      className={cn(
        "rounded-md px-3 py-1.5 text-sm transition-colors",
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900",
        className,
      )}
      onClick={() => context?.setValue(value)}
      {...props}
    >
      {children}
    </button>
  )
}

const SegmentedControl = {
  Root: SegmentedControlRoot,
  Item: SegmentedControlItem,
}

type SelectItemOption = {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

const SelectContext = React.createContext<{
  value: string
  setValue: (value: string) => void
  options: SelectItemOption[]
  disabled?: boolean
} | null>(null)

function SelectItem(_props: {
  value: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return null
}

function collectSelectItems(children: React.ReactNode): SelectItemOption[] {
  const items: SelectItemOption[] = []
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    const element = child as React.ReactElement<{
      value: string
      disabled?: boolean
      children?: React.ReactNode
    }>
    if (element.type === SelectItem) {
      items.push({
        value: element.props.value,
        disabled: element.props.disabled,
        label: element.props.children,
      })
      return
    }
    if (element.props.children) {
      items.push(...collectSelectItems(element.props.children))
    }
  })
  return items
}

function SelectRoot({
  value,
  defaultValue,
  onValueChange,
  children,
  disabled,
}: {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  disabled?: boolean
}) {
  const options = React.useMemo(() => collectSelectItems(children), [children])
  const [resolvedValue, setValue] = useControllableValue({
    value,
    defaultValue,
    onValueChange,
  })

  return (
    <SelectContext.Provider
      value={{ value: resolvedValue, setValue, options, disabled }}
    >
      {children}
    </SelectContext.Provider>
  )
}

function SelectTrigger({
  className,
  placeholder,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  placeholder?: string
}) {
  const context = React.useContext(SelectContext)
  return (
    <select
      className={cn(
        "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-none outline-none focus:ring-2 focus:ring-slate-200",
        className,
      )}
      disabled={context?.disabled ?? props.disabled}
      value={context?.value ?? ""}
      onChange={(event) => context?.setValue(event.target.value)}
      {...props}
    >
      {!context?.value && placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {context?.options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {typeof option.label === "string" ? option.label : option.value}
        </option>
      ))}
    </select>
  )
}

function SelectContent({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

const Select = {
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Content: SelectContent,
  Item: SelectItem,
}

export {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Checkbox,
  Code,
  Dialog,
  DropdownMenu,
  Flex,
  Grid,
  Heading,
  IconButton,
  Popover,
  SegmentedControl,
  Select,
  Separator,
  Skeleton,
  Switch,
  Tabs,
  Text,
  TextArea,
  TextField,
}

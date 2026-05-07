import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold leading-5 tracking-normal transition-[background-color,color,border-color,box-shadow,transform] disabled:pointer-events-none disabled:opacity-50 active:translate-y-px motion-reduce:transition-none motion-reduce:active:translate-y-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm shadow-blue-950/10 hover:bg-blue-700 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-400",
        destructive:
          "bg-destructive text-white shadow-none hover:bg-red-700 focus-visible:ring-destructive/20 dark:bg-red-600 dark:hover:bg-red-500 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-border bg-card shadow-sm shadow-slate-900/5 hover:bg-muted hover:text-foreground",
        secondary:
          "border border-border bg-secondary text-secondary-foreground shadow-none hover:bg-muted dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700",
        ghost:
          "hover:bg-muted hover:text-foreground",
        link: "text-blue-700 underline-offset-4 hover:underline dark:text-blue-400",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
